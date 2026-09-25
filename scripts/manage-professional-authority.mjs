#!/usr/bin/env node

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [k, ...rest] = arg.replace(/^--/, '').split('=');
  return [k, rest.join('=') || true];
}));

const required = name => {
  const value = args[name];
  if (!value || value === true) throw new Error(`Missing required --${name}=...`);
  return String(value);
};

const action = required('action');
const authorityId = required('authority-id');
const actor = required('actor');
if (!['create', 'update', 'enable', 'disable'].includes(action)) {
  throw new Error('--action must be create, update, enable or disable');
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) throw new Error('Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT.');
const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';

const app = initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(app, databaseId);
const ref = db.collection('professionalAuthorities').doc(authorityId);
const snap = await ref.get();
const current = snap.exists ? snap.data() : null;

const cadres = value => String(value || '').split(',').map(v => v.trim()).filter(Boolean);
const audit = payload => db.collection('privilegeAuditLogs').add({
  ...payload, actor, authorityId, projectId, databaseId, timestamp: FieldValue.serverTimestamp()
});

if (action === 'create') {
  if (snap.exists) throw new Error('Authority already exists.');
  const name = required('name').trim();
  const governedCadres = cadres(required('governed-cadres'));
  if (!name || governedCadres.length === 0) throw new Error('Name and at least one governed cadre are required.');
  const shortName = String(args['short-name'] || '').trim();
  await ref.set({
    id: authorityId, name, ...(shortName ? { shortName } : {}),
    governedCadres, isActive: true,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
  });
  await audit({ action: 'CREATE_PROFESSIONAL_AUTHORITY', name, governedCadres });
  console.log(`Created authority ${authorityId}.`);
  process.exit(0);
}

if (!snap.exists) throw new Error('Authority does not exist.');

if (action === 'enable' || action === 'disable') {
  const isActive = action === 'enable';
  if (current.isActive === isActive) {
    console.log('No change required.');
    process.exit(0);
  }
  await ref.set({ isActive, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await audit({
    action: isActive ? 'ENABLE_PROFESSIONAL_AUTHORITY' : 'DISABLE_PROFESSIONAL_AUTHORITY',
    previousIsActive: current.isActive === true, nextIsActive: isActive
  });
  console.log(`${isActive ? 'Enabled' : 'Disabled'} authority ${authorityId}.`);
  process.exit(0);
}

const nextName = args.name === undefined ? current.name : String(args.name).trim();
const nextCadres = args['governed-cadres'] === undefined
  ? (current.governedCadres || [])
  : cadres(args['governed-cadres']);
if (!nextName || nextCadres.length === 0) throw new Error('Authority must retain a name and at least one governed cadre.');

const activeStaff = await db.collection('professionalAuthorityAdmins')
  .where('authorityId', '==', authorityId)
  .where('isActive', '==', true)
  .get();
const allowed = new Set(nextCadres);
const conflicts = activeStaff.docs
  .map(d => ({ uid: d.id, outside: (d.data().scopedCadres || []).filter(c => !allowed.has(c)) }))
  .filter(x => x.outside.length);

if (conflicts.length) {
  throw new Error('Refusing cadre reduction; active staff scopes conflict: ' +
    conflicts.map(x => `${x.uid}[${x.outside.join(',')}]`).join(';'));
}

const shortName = args['short-name'] === undefined ? current.shortName : String(args['short-name']).trim();
await ref.set({
  name: nextName,
  ...(shortName ? { shortName } : {}),
  governedCadres: nextCadres,
  updatedAt: FieldValue.serverTimestamp()
}, { merge: true });

await audit({
  action: 'UPDATE_PROFESSIONAL_AUTHORITY',
  previousGovernedCadres: current.governedCadres || [],
  nextGovernedCadres: nextCadres
});
console.log(`Updated authority ${authorityId}.`);
