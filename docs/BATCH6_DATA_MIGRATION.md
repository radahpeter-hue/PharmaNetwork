# Batch 6 legacy data migration

This migration closes two development-data gaps introduced by Batch 6 hardening:

1. legacy active job, availability and business documents may not have authoritative quota-slot records;
2. prototype business-listing documents may still contain seller contact, exact location, licence details or confidential photo metadata in the public document.

The migration script is `scripts/migrate-batch6-marketplace-data.mjs`. It is **dry-run by default** and uses the Firebase Admin SDK because client security rules intentionally prevent these privileged cleanup writes.

## What the script changes

For active and unexpired records it assigns authoritative fixed quota slots:

- jobs: maximum 5 active slots per organisation;
- availability: maximum 1 active slot per professional;
- business listings: maximum 3 active slots per seller.

It writes `quotaSlot` on the posting and the matching nested document under `postingQuotaSlots/{ownerUid}/slots/{type_slot}`. Existing valid assignments are preserved. Stale slots for an owner/type being migrated are removed. If an owner currently exceeds a limit, or active documents collide on the same slot, the script reports a conflict and applies **nothing**.

For business listings it copies known protected legacy fields into `businessListingPrivate/{listingId}` and removes them from the public `businessListings/{listingId}` document. The protected fields are `locationDescription`, `ndaLicenceStatus`, `contactMethod`, `contactDetail` and `contactName`. Photo URLs are mirrored to the private document; confidential listings have public `photoUrls` cleared.

## Controlled execution

Run this only against the intended development Firebase project. Do not point it at production as part of Batch 6 stabilization.

1. Take a Firestore backup/export or otherwise preserve the development dataset.
2. Install the Admin SDK temporarily without changing the repository lockfile:

   `npm install --no-save --package-lock=false firebase-admin`

3. Authenticate with Application Default Credentials, normally by setting `GOOGLE_APPLICATION_CREDENTIALS` to an approved service-account credential file.
4. Set `FIREBASE_PROJECT_ID`. If PharmaNetwork uses a non-default Firestore database, also set `FIRESTORE_DATABASE_ID`.
5. Run the dry run:

   `node scripts/migrate-batch6-marketplace-data.mjs`

6. Review the report. Any quota conflict must be resolved manually before continuing.
7. Apply:

   `node scripts/migrate-batch6-marketplace-data.mjs --apply`

8. Run the dry run again. The expected result is `plannedOperations: 0` with no conflicts.
9. Manually inspect representative public/private business documents and quota-slot documents in Firestore before treating the migration as complete.

## Operational warning

Do not run the apply step while users are actively creating or renewing postings. The migration is designed for a controlled stabilization window. New application writes are already transactional, but mixing a bulk legacy cleanup with concurrent marketplace activity makes verification unnecessarily difficult.

This script does not deploy rules, indexes, hosting or application code. Those remain separate controlled steps.
