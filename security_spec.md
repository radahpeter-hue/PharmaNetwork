# Security Spec: PharmaNetwork Uganda

## Purpose

This document records the security contract for the current stabilization branch. It describes protections that are implemented now and the controls that still require automated Firebase Emulator tests.

## Privileged access

Platform-admin and professional-authority privileges are backend-controlled.

- Platform admin access is authorized only by the Firebase custom claim `admin: true`.
- Professional-authority access is authorized only by the Firebase custom claim `body_admin: true` plus an active `regulatoryBodyAdmins/{uid}` record.
- Frontend code must not create privileged Firebase Auth users, assign custom claims, or elevate a normal account.
- Hard-coded privileged email addresses and demo privileged accounts are prohibited.
- Firestore documents such as `admins` or `regulatoryBodyAdmins` are metadata and scope records; possession of a document alone must not grant platform-admin privilege.

## Member data invariants

1. A normal user may create only their own `users/{uid}` document.
2. A normal user cannot change their own `id`, `accountType`, `isActive`, or `isVerified` after account creation.
3. A professional may edit ordinary profile fields but may not edit authoritative verification/licence fields.
4. An organisation may edit only its own organisation profile.
5. Platform statistics are not client writable.
6. Member-network collections require authentication during the current stabilization phase.
7. Ownership identifiers on jobs, availability posts and business listings are immutable after creation.

## Professional verification

Authoritative verification fields are controlled by platform admins or appropriately scoped professional-authority admins.

Protected professional fields include:

- `credentialVerificationStatus`
- `credentialVerifiedAt`
- `credentialVerifiedByBody`
- `credentialVerifiedByUid`
- `credentialRejectionReason`
- `practisingLicenceStatus`
- `practisingLicenceYear`
- `licenceRenewalDate`
- `licenceExpiryDate`
- `licenceSuspensionReason`

Professionals may submit verification evidence, but submission must not by itself grant verified or active professional standing.

## Opportunities and marketplace ownership

- Jobs may be created only by the authenticated owning organisation account.
- Availability posts may be created only by the authenticated owning professional account.
- Owners may update their own postings.
- Interest-count updates are narrowly permitted so the current expression-of-interest workflow can operate without granting general write access.
- Business listing seller identity is immutable after creation.

## Messaging invariants

- A conversation contains exactly two distinct participants at creation.
- Participants cannot be replaced after conversation creation.
- Conversation updates are limited to message-preview/read-counter metadata.
- A message sender must equal the authenticated UID.
- Message body must be a non-empty string of at most 1000 characters.
- Message documents cannot be edited or deleted by normal users.

## Prototype controls removed

The stabilization branch removes:

- demo-login account provisioning
- demo platform-admin provisioning
- hard-coded privileged email authorization
- client-side professional-authority auto-provisioning
- client-controlled platform statistic writes
- client-side administrative database seeders

Test data must be created only through controlled development tooling and must never be exposed as a production admin-console capability.

## Required negative tests

Firebase Emulator rules tests must cover at minimum:

1. normal user cannot grant themselves admin/body-admin authority
2. normal user cannot change `isActive` or `isVerified`
3. professional cannot change their own verification/licence status
4. user cannot edit another user's profile
5. non-owner cannot edit or delete another owner's posting
6. business seller identity cannot be reassigned
7. conversation participants cannot be changed
8. message sender cannot impersonate another user
9. message body over 1000 characters is denied
10. authenticated normal user cannot write platform statistics

These tests are required before production readiness. Until emulator tests exist, successful TypeScript/build CI does not certify Firestore authorization behaviour.
