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
| 1 — Authentication and privileged-access security | Partial / closure work active | Firebase Auth context uses custom claims; normal self-activation is blocked; privileged collections are protected; demo/backdoor controls are removed; a versioned Admin SDK provisioning/revocation script and runbook now exist; privilege audit logs are client-immutable | Complete privileged-entry-point review and controlled environment execution test before declaring complete |
| 2 — Professional Authority model and administration | Partial / hardening active | `professionalAuthorities` and `professionalAuthorityAdmins` rules/models exist; scoped cadres and roles exist; authority console exists; trusted staff claim provisioning/revocation now exists; disabled authorities now invalidate staff access; cross-authority and reviewer negative tests were added | Add/verify authority-entity lifecycle administration, role-scope changes and controlled provisioning execution before declaring complete |
| 3 — Professional verification, activation and compliance | Partial / advanced | Professional lifecycle enums exist; verification evidence collection exists; verification officers and compliance officers have separate rule permissions; authority console supports approve/reject/more-information/compliance/suspension/reactivation paths | Verify every lifecycle transition against rules and UI; verify evidence resubmission; verify invalid transition denial; verify annual compliance edge cases and audit requirements |
| 4 — Member-only access enforcement | Partial / substantially hardened | `ProtectedRoute`, Firestore and Storage now require the ACTIVE lifecycle state for member access; pending/status-drift professionals are denied; platform deactivation sets `DEACTIVATED_BY_PLATFORM` and hides professional directory visibility | Continue collection-by-collection review and resolve organisation-directory deactivation/visibility semantics |
| 5 — Profiles and directories | Partial / needs focused review | Professional and organisation edit pages exist; completeness calculation exists; photo/CV workflows exist; professional directory queries `isDirectoryVisible == true` and completeness >= 60; profile rules protect verification fields | Verify multi-organisation editing and directory rendering, profile privacy boundaries, Storage rules, directory visibility invariants, verified identity-field edits, filtering/index behaviour and representative end-to-end flows |
| 6 — Jobs, availability and business listings | Implementation advanced; operational closure pending | Transactional quota slots, ownership enforcement, expiry/renewal logic, deterministic interest events, business public/private split, Storage protections, migration tooling and emulator tests exist | Run controlled legacy migration against development data, synchronize rules/indexes to development Firebase, manually inspect migrated records and complete AI Studio/mobile visual regression |

## Confirmed reconciliation findings

### Batch 1 — privileged provisioning and platform deactivation

A trusted Admin SDK script and runbook now provide explicit grant/revoke workflows for platform admins and authority staff. Authority staff grants validate authority existence, active status, role and cadre scope. Privilege operations create server-side audit records that clients cannot mutate.

The legacy platform-admin UI also had a generic active/inactive toggle. That could reactivate a professional without re-establishing authority-controlled professional standing and deactivation changed only `isActive`. The UI now performs one-way platform deactivation by setting `accountStatus = DEACTIVATED_BY_PLATFORM`, `isActive = false`, and hiding a professional from the directory. Generic UI reactivation was removed.

### Batch 2 — authority status and scope

Authority staff access now requires the parent professional authority itself to remain active. Negative tests cover inactive authorities, cross-authority access and reviewer inability to alter verification/compliance standing.

### Batch 3/5 — directory visibility lifecycle

Professional self-edits may enable directory visibility only when both `isActive == true` and `accountStatus == ACTIVE`. Verification officers cannot expose a professional during verification. Compliance updates bind directory visibility to the post-transaction account state, allowing atomic activation while preventing visibility for inactive states.

### Batch 4 backend invariant

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
