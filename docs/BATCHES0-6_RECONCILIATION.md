# PharmaNetwork Batches 0–6 Reconciliation

## Purpose

This document re-baselines the stabilization program against the actual repository implementation. Branch names and historical week labels are not treated as evidence that a batch is complete.

Repository: `radahpeter-hue/PharmaNetwork`  
Reconciliation branch: `stabilization/batches0-6-reconciliation`  
Starting checkpoint: `97c0e093bd4cb681360f0490e2a535b4c5ecb240`

Production hosting, custom domains and production deployment remain out of scope until stabilization, testing and beta-readiness gates are satisfied.

## Current batch assessment

| Batch | Status | Evidence present | Remaining work / verification |
|---|---|---|---|
| 0 — Baseline, architecture and stabilization preparation | Substantially complete | `BASELINE_AUDIT.md`, `ARCHITECTURE.md`, `DEVELOPMENT_PLAN.md`, stabilization branch history, CI | Keep documentation synchronized with actual batch state |
| 1 — Authentication and privileged-access security | Partial / needs closure review | Firebase Auth context uses custom claims for platform and authority privilege; rules prohibit normal self-activation and protect privileged collections; demo/backdoor controls are documented as removed | No versioned trusted provisioning mechanism or runbook for assigning/revoking custom claims is present in the repository. Re-audit all privileged entry points and legacy admin paths before declaring complete |
| 2 — Professional Authority model and administration | Partial | `professionalAuthorities` and `professionalAuthorityAdmins` rules/models exist; scoped cadres and roles exist; authority console exists; authority writes require platform-admin authorization | Verify lifecycle for creating/disabling authorities and staff, claim provisioning/revocation, role-scope changes, read-only reviewer behaviour and negative tests for cross-authority access |
| 3 — Professional verification, activation and compliance | Partial / advanced | Professional lifecycle enums exist; verification evidence collection exists; verification officers and compliance officers have separate rule permissions; authority console supports approve/reject/more-information/compliance/suspension/reactivation paths | Verify every lifecycle transition against rules and UI; verify evidence resubmission; verify invalid transition denial; verify annual compliance edge cases and audit requirements |
| 4 — Member-only access enforcement | Partial, now under active hardening | `ProtectedRoute` requires active account status for member routes; Firestore member reads are gated; pending professionals cannot browse member profiles | Backend `isActiveMember()` previously checked only `isActive`. Reconciliation work now also requires `accountStatus == 'ACTIVE'`, with a regression test for status/flag drift. Continue collection-by-collection review including Storage |
| 5 — Profiles and directories | Partial / needs focused review | Professional and organisation edit pages exist; completeness calculation exists; photo/CV workflows exist; professional directory queries `isDirectoryVisible == true` and completeness >= 60; profile rules protect verification fields | Verify multi-organisation editing and directory rendering, profile privacy boundaries, Storage rules, directory visibility invariants, verified identity-field edits, filtering/index behaviour and representative end-to-end flows |
| 6 — Jobs, availability and business listings | Implementation advanced; operational closure pending | Transactional quota slots, ownership enforcement, expiry/renewal logic, deterministic interest events, business public/private split, Storage protections, migration tooling and emulator tests exist | Run controlled legacy migration against development data, synchronize rules/indexes to development Firebase, manually inspect migrated records and complete AI Studio/mobile visual regression |

## Confirmed reconciliation finding: Batch 4 backend invariant

The product contract says member-network access requires an authenticated and ACTIVE account.

Before this reconciliation branch, `isActiveMember()` authorized based on `users/{uid}.isActive == true` alone. The frontend `ProtectedRoute` also checked `accountStatus == 'ACTIVE'`, but backend authorization must not depend on frontend consistency.

The reconciliation branch therefore strengthens the Firestore member predicate to require both:

- `isActive == true`
- `accountStatus == 'ACTIVE'`

A negative emulator test covers a deliberately inconsistent record with `isActive: true` and `accountStatus: 'SUSPENDED_BY_AUTHORITY'` and requires member-directory access to fail.

## Immediate sequence

1. Get the new Batch 4 invariant green in CI.
2. Complete Batch 1 privileged-access closure review, especially trusted custom-claim provisioning/revocation.
3. Complete Batch 2 authority administration and cross-authority permission review.
4. Exercise all Batch 3 lifecycle transitions and add missing negative tests.
5. Review every member-only Firestore/Storage collection for the strengthened ACTIVE-member invariant.
6. Complete Batch 5 profile/directory privacy and multi-organisation review.
7. Re-run the full CI suite.
8. Only after Batches 0–5 are accounted for, return to the remaining Batch 6 operational migration/synchronization checks.

## Frozen decisions

- GitHub is the technical source of truth.
- Privileged roles are backend-controlled.
- Professional verification and standing cannot be self-assigned.
- Only ACTIVE professionals access the member network or appear in the professional directory.
- Production hosting and domain work are deferred.
- Do not start Batch 7 until reconciliation and unresolved Batch 6 operational checks are complete.
