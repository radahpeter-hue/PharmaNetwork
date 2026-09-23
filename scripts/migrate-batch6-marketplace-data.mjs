#!/usr/bin/env node

/**
 * Batch 6 data migration for PharmaNetwork.
 *
 * Default mode is DRY RUN. Use --apply only after reviewing the report.
 *
 * This script deliberately uses the Firebase Admin SDK so it can repair legacy
 * development documents that client security rules correctly prevent users
 * from rewriting.
 */

const APPLY = process.argv.includes('--apply');
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT;
const databaseId = process.env.FIRESTORE_DATABASE_ID || '';

if (!projectId) {
  console.error(
    'Missing project ID. Set FIREBASE_PROJECT_ID (or GOOGLE_CLOUD_PROJECT/GCLOUD_PROJECT).'
  );
  process.exit(1);
}

let initializeApp;
let applicationDefault;
let getFirestore;
let FieldValue;
let Timestamp;

try {
  ({ initializeApp, applicationDefault } = await import('firebase-admin/app'));
  ({ getFirestore, FieldValue, Timestamp } = await import('firebase-admin/firestore'));
} catch (error) {
  console.error(
    'firebase-admin is required for this controlled migration. Install it temporarily with:\n' +
    '  npm install --no-save --package-lock=false firebase-admin'
  );
  process.exit(1);
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId
});

const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

const NOW_MILLIS = Date.now();
const MAX_BATCH_OPERATIONS = 400;

const QUOTA_SPECS = [
  {
    type: 'job',
    collection: 'jobPostings',
    ownerField: 'organisationUserId',
    limit: 5
  },
  {
    type: 'availability',
    collection: 'availabilityPosts',
    ownerField: 'individualUserId',
    limit: 1
  },
  {
    type: 'business',
    collection: 'businessListings',
    ownerField: 'sellerUserId',
    limit: 3
  }
];

const BUSINESS_PRIVATE_FIELDS = [
  'locationDescription',
  'ndaLicenceStatus',
  'contactMethod',
  'contactDetail',
  'contactName'
];

const operations = [];
const conflicts = [];
const report = {
  quota: {},
  businessPrivacy: {
    scanned: 0,
    publicDocumentsSanitized: 0,
    privateDocumentsUpserted: 0
  }
};

const toMillis = value => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const isActiveUnexpired = data =>
  data.status === 'active' && toMillis(data.expiresAt) > NOW_MILLIS;

const sameTimestamp = (left, right) =>
  toMillis(left) === toMillis(right);

const queueSet = (ref, data, options = { merge: true }) => {
  operations.push({ kind: 'set', ref, data, options });
};

const queueUpdate = (ref, data) => {
  operations.push({ kind: 'update', ref, data });
};

const queueDelete = ref => {
  operations.push({ kind: 'delete', ref });
};

const slotDocumentId = (type, slotKey) => `${type}_${slotKey}`;

const slotRefFor = (ownerUid, type, slotKey) =>
  db.collection('postingQuotaSlots')
    .doc(ownerUid)
    .collection('slots')
    .doc(slotDocumentId(type, slotKey));

const groupBy = (items, getKey) => {
  const grouped = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return grouped;
};

const sortPostingsStable = docs =>
  [...docs].sort((a, b) => {
    const createdDifference =
      toMillis(a.data().createdAt) - toMillis(b.data().createdAt);
    if (createdDifference !== 0) return createdDifference;
    return a.id.localeCompare(b.id);
  });

async function planQuotaMigration(spec) {
  const snapshot = await db.collection(spec.collection).get();
  const activeDocs = snapshot.docs.filter(docSnap =>
    isActiveUnexpired(docSnap.data())
  );

  const grouped = groupBy(
    activeDocs,
    docSnap => docSnap.data()[spec.ownerField]
  );

  const stats = {
    scanned: snapshot.size,
    activeUnexpired: activeDocs.length,
    owners: grouped.size,
    postingUpdates: 0,
    slotSets: 0,
    staleSlotDeletes: 0
  };

  for (const [ownerUid, ownerDocsUnsorted] of grouped.entries()) {
    if (!ownerUid) {
      conflicts.push({
        type: spec.type,
        reason: 'active posting missing owner UID'
      });
      continue;
    }

    const ownerDocs = sortPostingsStable(ownerDocsUnsorted);
    if (ownerDocs.length > spec.limit) {
      conflicts.push({
        type: spec.type,
        ownerUid,
        reason: `has ${ownerDocs.length} active unexpired documents; limit is ${spec.limit}`
      });
      continue;
    }

    const activeById = new Map(ownerDocs.map(docSnap => [docSnap.id, docSnap]));
    const slotCollectionRef = db
      .collection('postingQuotaSlots')
      .doc(ownerUid)
      .collection('slots');
    const slotSnapshot = await slotCollectionRef.get();
    const existingSlots = new Map(
      slotSnapshot.docs
        .filter(slotDoc => slotDoc.data().resourceType === spec.type)
        .map(slotDoc => [slotDoc.id, slotDoc])
    );

    const assignments = new Map();
    const claimedSlotKeys = new Set();
    let ownerHasConflict = false;

    for (const docSnap of ownerDocs) {
      const rawSlot = docSnap.data().quotaSlot;
      if (rawSlot === undefined || rawSlot === null) continue;

      const slotKey = String(rawSlot);
      const slotIndex = Number(slotKey);
      const validSlot =
        Number.isInteger(slotIndex) &&
        slotIndex >= 0 &&
        slotIndex < spec.limit &&
        String(slotIndex) === slotKey;

      if (!validSlot) continue;

      if (claimedSlotKeys.has(slotKey)) {
        conflicts.push({
          type: spec.type,
          ownerUid,
          reason: `multiple active documents claim quota slot ${slotKey}`
        });
        ownerHasConflict = true;
        break;
      }

      const existingSlot = existingSlots.get(slotDocumentId(spec.type, slotKey));
      if (
        existingSlot &&
        existingSlot.data().postingId !== docSnap.id &&
        activeById.has(existingSlot.data().postingId)
      ) {
        conflicts.push({
          type: spec.type,
          ownerUid,
          reason: `quota slot ${slotKey} points to a different active document`
        });
        ownerHasConflict = true;
        break;
      }

      assignments.set(docSnap.id, slotKey);
      claimedSlotKeys.add(slotKey);
    }

    if (ownerHasConflict) continue;

    for (const docSnap of ownerDocs) {
      if (assignments.has(docSnap.id)) continue;

      let chosenSlot = null;
      for (let index = 0; index < spec.limit; index += 1) {
        const candidate = String(index);
        if (!claimedSlotKeys.has(candidate)) {
          chosenSlot = candidate;
          break;
        }
      }

      if (chosenSlot === null) {
        conflicts.push({
          type: spec.type,
          ownerUid,
          reason: 'no free quota slot remained during assignment'
        });
        ownerHasConflict = true;
        break;
      }

      assignments.set(docSnap.id, chosenSlot);
      claimedSlotKeys.add(chosenSlot);
    }

    if (ownerHasConflict) continue;

    const assignedSlotIds = new Set();

    for (const docSnap of ownerDocs) {
      const data = docSnap.data();
      const slotKey = assignments.get(docSnap.id);
      const slotId = slotDocumentId(spec.type, slotKey);
      const expiresAt = data.expiresAt;
      assignedSlotIds.add(slotId);

      if (String(data.quotaSlot ?? '') !== slotKey) {
        queueUpdate(docSnap.ref, { quotaSlot: slotKey });
        stats.postingUpdates += 1;
      }

      const existingSlot = existingSlots.get(slotId);
      const existingData = existingSlot?.data();
      const slotIsCurrent =
        existingData &&
        existingData.ownerUserId === ownerUid &&
        existingData.resourceType === spec.type &&
        String(existingData.slotKey) === slotKey &&
        existingData.postingId === docSnap.id &&
        sameTimestamp(existingData.expiresAt, expiresAt);

      if (!slotIsCurrent) {
        queueSet(slotRefFor(ownerUid, spec.type, slotKey), {
          ownerUserId: ownerUid,
          resourceType: spec.type,
          slotKey,
          postingId: docSnap.id,
          expiresAt,
          updatedAt: Timestamp.now()
        });
        stats.slotSets += 1;
      }
    }

    for (const [slotId, slotDoc] of existingSlots.entries()) {
      if (!assignedSlotIds.has(slotId)) {
        queueDelete(slotDoc.ref);
        stats.staleSlotDeletes += 1;
      }
    }
  }

  report.quota[spec.type] = stats;
}

async function planBusinessPrivacyMigration() {
  const snapshot = await db.collection('businessListings').get();
  report.businessPrivacy.scanned = snapshot.size;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const publicPatch = {};
    const privatePatch = {};
    let sanitizePublic = false;
    let upsertPrivate = false;

    if (data.sellerUserId) {
      privatePatch.sellerUserId = data.sellerUserId;
    }

    for (const field of BUSINESS_PRIVATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        privatePatch[field] = data[field];
        publicPatch[field] = FieldValue.delete();
        sanitizePublic = true;
        upsertPrivate = true;
      }
    }

    if (Array.isArray(data.photoUrls)) {
      privatePatch.photoUrls = data.photoUrls;
      upsertPrivate = true;

      if (data.isConfidential === true && data.photoUrls.length > 0) {
        publicPatch.photoUrls = [];
        sanitizePublic = true;
      }
    }

    if (upsertPrivate) {
      privatePatch.updatedAt = Timestamp.now();
      queueSet(
        db.collection('businessListingPrivate').doc(docSnap.id),
        privatePatch,
        { merge: true }
      );
      report.businessPrivacy.privateDocumentsUpserted += 1;
    }

    if (sanitizePublic) {
      queueUpdate(docSnap.ref, publicPatch);
      report.businessPrivacy.publicDocumentsSanitized += 1;
    }
  }
}

async function applyOperations() {
  for (let offset = 0; offset < operations.length; offset += MAX_BATCH_OPERATIONS) {
    const chunk = operations.slice(offset, offset + MAX_BATCH_OPERATIONS);
    const batch = db.batch();

    for (const operation of chunk) {
      if (operation.kind === 'set') {
        batch.set(operation.ref, operation.data, operation.options);
      } else if (operation.kind === 'update') {
        batch.update(operation.ref, operation.data);
      } else if (operation.kind === 'delete') {
        batch.delete(operation.ref);
      }
    }

    await batch.commit();
  }
}

for (const spec of QUOTA_SPECS) {
  await planQuotaMigration(spec);
}
await planBusinessPrivacyMigration();

console.log('\nBatch 6 migration report');
console.log(JSON.stringify({
  mode: APPLY ? 'APPLY' : 'DRY_RUN',
  projectId,
  databaseId: databaseId || '(default)',
  plannedOperations: operations.length,
  ...report,
  conflicts
}, null, 2));

if (conflicts.length > 0) {
  console.error(
    '\nMigration conflicts require manual cleanup. No writes were applied.'
  );
  process.exit(2);
}

if (!APPLY) {
  console.log(
    '\nDry run only. Re-run with --apply after reviewing the report and taking a backup.'
  );
  process.exit(0);
}

await applyOperations();

console.log(
  `\nApplied ${operations.length} migration operations successfully. Run the script again without --apply; plannedOperations should be 0.`
);
