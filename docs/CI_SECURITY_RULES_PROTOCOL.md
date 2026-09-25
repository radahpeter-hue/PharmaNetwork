# CI and Security Rules Change Protocol

## Purpose

This protocol prevents avoidable red-workflow cascades during PharmaNetwork stabilization, especially when Firestore or Storage authorization rules depend on multiple documents.

## Root cause of the 25 September 2026 failure sequence

The first failing commit was `bc030a399ac8bec7bc91db58e3bf815e2828c251`
(`security: bind directory visibility to active professional status`).

That rule change strengthened compliance-related profile updates by reading the professional's
`users/{uid}` account state with `getAfter(...)`.

An older positive emulator test,
`compliance officer can update compliance fields but not verification fields`,
seeded `individualProfiles/target-professional` but did not seed the corresponding
`users/target-professional` document.

The rule therefore could not resolve the new cross-document dependency and correctly denied the
write. The later Storage, test and documentation commits inherited the already-broken branch state,
so their CI runs failed on the same Firestore test even though those commits did not introduce the
root cause.

The fixture was corrected in commit
`925ee7368065eabc7ee50e77abd40e498cec6452`, after which the complete CI pipeline passed.

## Mandatory green-head gate

Before starting a new stabilization change:

1. Confirm the current branch HEAD.
2. Confirm the latest CI run for that exact HEAD is successful.
3. If HEAD is red, stop feature/security progression.
4. Diagnose the first failing test and its originating commit.
5. Fix and re-run until the latest HEAD is green.
6. Only then begin the next change.

A later unrelated commit must never be used to "work past" a red security-rules head.

## Atomic rules-change rule

Any change to `firestore.rules` or `storage.rules` that changes an authorization contract must be
prepared together with its affected emulator tests and committed as one logical change whenever
possible.

This is especially important for rules using:

- `get()`
- `getAfter()`
- `exists()`
- `existsAfter()`
- linked user/profile/authority documents
- transactional invariants
- custom-claim plus Firestore-record checks

The tests must seed every document the rule now depends on.

## Fixture contract

Positive authorization tests must model a valid real account state, not only the document under test.

For a professional lifecycle test this normally means seeding, as applicable:

- `users/{uid}`
- `individualProfiles/{uid}`
- `verificationDocuments/{uid}`
- the governing `professionalAuthorities/{authorityId}`
- `professionalAuthorityAdmins/{staffUid}`

For authority tests, both the custom claim and the matching active authority-staff record must be
present. If the parent authority's state is relevant, that authority document must also be seeded.

Negative tests should deliberately break one invariant at a time so the reason for denial is clear.

## Failure triage order

When CI fails, inspect in this order:

1. dependency audit
2. TypeScript/type-check
3. production build
4. administrative script syntax
5. Firestore rules tests
6. Storage rules tests

For rules failures, identify the first `not ok` test and the exact rule evaluation error before making
any new change. Later denied writes in the log may be expected negative tests and are not themselves
proof of failure.

## Continuation rule

The authoritative continuation checkpoint must always be a commit whose full CI run is green.
Historical red commits remain useful evidence of what was discovered, but they are never used as the
working checkpoint.

## Current checkpoint after RCA

Branch: `stabilization/batches0-6-reconciliation`  
Green checkpoint: `925ee7368065eabc7ee50e77abd40e498cec6452`  
CI run: `36121372087` — SUCCESS
