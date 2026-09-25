#!/usr/bin/env node

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.join('=') || true];
  })
);

const required = (name) => {
  const value = args[name];
  if (!value || value === true) {
    throw new Error(`Missing required --${name}=...`);
  }
  return String(value);
};

const action = required('action');
const kind = required('kind');
const uid = required('uid');
const actor = required('actor');

if (!['grant', 'revoke'].includes(action)) {
  throw new Error('--action must be grant or revoke');
}
if (!['platform-admin', 'authority-staff'].includes(kind)) {
  throw new Error('--kind must be platform-admin or authority-staff');
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) {
  throw new Error('Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT before running this script.');
}

const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
const app = initializeApp({
  credential: applicationDefault(),
  projectId
});

const auth = getAuth(app);
const db = getFirestore(app, databaseId);

const ALLOWED_AUTHORITY_ROLES = new Set([
  'authority_super_admin',
  'verification_officer',
  'compliance_officer',
  'communications_officer',
  'reviewer'
]);

const listPlatformAdmins = async () => {
  let pageToken;
  const admins = [];

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (user.customClaims?.admin === true) admins.push(user.uid);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return admins;
};

const audit = async (payload) => {
  await db.collection('privilegeAuditLogs').add({
    ...payload,
    actor,
    targetUid: uid,
    projectId,
    databaseId,
    timestamp: FieldValue.serverTimestamp()
  });
};

const userRecord = await auth.getUser(uid);
const currentClaims = { ...(userRecord.customClaims || {}) };

if (kind === 'platform-admin') {
  if (action === 'grant') {
    if (currentClaims.authority_admin === true) {
      throw new Error('Refusing to combine platform-admin and authority-staff privilege on the same account.');
    }

    await auth.setCustomUserClaims(uid, {
      ...currentClaims,
      admin: true
    });

    await audit({
      action: 'GRANT_PLATFORM_ADMIN',
      privilege: 'admin'
    });

    console.log(`Granted platform-admin privilege to UID ${uid}.`);
  } else {
    const admins = await listPlatformAdmins();
    const otherAdmins = admins.filter(adminUid => adminUid !== uid);

    if (currentClaims.admin !== true) {
      console.log(`UID ${uid} does not currently have platform-admin privilege. No change made.`);
      process.exit(0);
    }

    if (otherAdmins.length === 0 && args['allow-last-platform-admin-revoke'] !== true) {
      throw new Error(
        'Refusing to revoke the last known platform admin. Re-run with --allow-last-platform-admin-revoke only for an intentional recovery procedure.'
      );
    }

    const nextClaims = { ...currentClaims };
    delete nextClaims.admin;
    await auth.setCustomUserClaims(uid, nextClaims);

    await audit({
      action: 'REVOKE_PLATFORM_ADMIN',
      privilege: 'admin'
    });

    console.log(`Revoked platform-admin privilege from UID ${uid}.`);
  }
} else {
  const authorityId = required('authority-id');

  if (action === 'grant') {
    if (currentClaims.admin === true) {
      throw new Error('Refusing to combine authority-staff and platform-admin privilege on the same account.');
    }

    const role = required('role');
    if (!ALLOWED_AUTHORITY_ROLES.has(role)) {
      throw new Error(`Unsupported authority role: ${role}`);
    }

    const scopedCadres = required('scoped-cadres')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);

    if (scopedCadres.length === 0) {
      throw new Error('--scoped-cadres must contain at least one cadre.');
    }

    const authorityRef = db.collection('professionalAuthorities').doc(authorityId);
    const authoritySnap = await authorityRef.get();
    if (!authoritySnap.exists) {
      throw new Error(`Professional authority ${authorityId} does not exist.`);
    }

    const authority = authoritySnap.data();
    if (authority?.isActive !== true) {
      throw new Error(`Professional authority ${authorityId} is not active.`);
    }

    const governedCadres = new Set(authority?.governedCadres || []);
    const invalidCadres = scopedCadres.filter(cadre => !governedCadres.has(cadre));
    if (invalidCadres.length > 0) {
      throw new Error(
        `Scoped cadres are outside the authority's governed cadres: ${invalidCadres.join(', ')}`
      );
    }

    const fullName = String(args['full-name'] || userRecord.displayName || '').trim();
    const email = String(args.email || userRecord.email || '').trim();

    if (!fullName) throw new Error('Provide --full-name because the Auth account has no display name.');
    if (!email) throw new Error('Provide --email because the Auth account has no email.');

    await db.collection('professionalAuthorityAdmins').doc(uid).set({
      uid,
      fullName,
      email,
      authorityId,
      authorityName: authority?.name || authority?.shortName || authorityId,
      scopedCadres,
      role,
      isActive: true,
      addedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    await auth.setCustomUserClaims(uid, {
      ...currentClaims,
      authority_admin: true
    });

    await audit({
      action: 'GRANT_AUTHORITY_STAFF',
      privilege: 'authority_admin',
      authorityId,
      authorityRole: role,
      scopedCadres
    });

    console.log(`Granted authority-staff privilege to UID ${uid} for ${authorityId} as ${role}.`);
  } else {
    const adminRef = db.collection('professionalAuthorityAdmins').doc(uid);
    const adminSnap = await adminRef.get();

    if (adminSnap.exists && adminSnap.data()?.authorityId !== authorityId) {
      throw new Error(
        `UID ${uid} belongs to authority ${adminSnap.data()?.authorityId}, not ${authorityId}.`
      );
    }

    if (adminSnap.exists) {
      await adminRef.set({
        isActive: false,
        revokedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    const nextClaims = { ...currentClaims };
    delete nextClaims.authority_admin;
    await auth.setCustomUserClaims(uid, nextClaims);

    await audit({
      action: 'REVOKE_AUTHORITY_STAFF',
      privilege: 'authority_admin',
      authorityId
    });

    console.log(`Revoked authority-staff privilege from UID ${uid} for ${authorityId}.`);
  }
}

console.log('The affected user must refresh or reauthenticate before the new custom claims are reflected in their ID token.');
