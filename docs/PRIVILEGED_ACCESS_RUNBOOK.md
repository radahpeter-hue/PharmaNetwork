# Trusted Privileged Access Provisioning Runbook

## Purpose

Platform-admin and professional-authority privileges must never be assigned by frontend code. This runbook defines the current trusted administrative process for granting and revoking Firebase custom claims and the matching authority metadata.

The script is intentionally operator-run. It is not exposed through the PharmaNetwork UI.

Script: `scripts/manage-privileged-access.mjs`

## Preconditions

1. Work only against an approved development or controlled administration environment.
2. Use an approved service account or Application Default Credentials with Firebase Admin permissions.
3. Confirm the target Firebase project explicitly:
   - `FIREBASE_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT`
   - optional `FIRESTORE_DATABASE_ID` for a named Firestore database
4. Install Firebase Admin without changing the project lockfile if it is not already available:
   `npm install --no-save --package-lock=false firebase-admin`
5. Obtain the exact Firebase Auth UID of the account. Do not provision privileges by email string matching alone.
6. Record the human/operator identity in `--actor`.

## Platform admin grant

```bash
node scripts/manage-privileged-access.mjs \
  --action=grant \
  --kind=platform-admin \
  --uid=<AUTH_UID> \
  --actor=<OPERATOR_IDENTIFIER>
```

The script refuses to combine platform-admin and authority-staff privilege on one account.

## Platform admin revoke

```bash
node scripts/manage-privileged-access.mjs \
  --action=revoke \
  --kind=platform-admin \
  --uid=<AUTH_UID> \
  --actor=<OPERATOR_IDENTIFIER>
```

The script refuses to remove the last known platform admin unless the operator explicitly supplies `--allow-last-platform-admin-revoke`. That override is for controlled recovery only.

## Authority staff grant

The professional authority document must already exist and be active. Scoped cadres must be a subset of that authority's `governedCadres`.

```bash
node scripts/manage-privileged-access.mjs \
  --action=grant \
  --kind=authority-staff \
  --uid=<AUTH_UID> \
  --authority-id=<AUTHORITY_DOC_ID> \
  --role=verification_officer \
  --scoped-cadres=pharmacist,pharmacy_technician \
  --actor=<OPERATOR_IDENTIFIER>
```

Allowed roles:

- `authority_super_admin`
- `verification_officer`
- `compliance_officer`
- `communications_officer`
- `reviewer`

Optional `--full-name` and `--email` may be supplied when the Firebase Auth user record does not contain them.

Granting authority staff performs both sides of the security contract:

- sets the Firebase custom claim `authority_admin: true`
- creates or updates `professionalAuthorityAdmins/{uid}` with authority, role and cadre scope

Both must be valid for Firestore authority access to succeed.

## Authority staff revoke

```bash
node scripts/manage-privileged-access.mjs \
  --action=revoke \
  --kind=authority-staff \
  --uid=<AUTH_UID> \
  --authority-id=<AUTHORITY_DOC_ID> \
  --actor=<OPERATOR_IDENTIFIER>
```

Revocation removes the `authority_admin` custom claim and marks the matching authority-admin record inactive.

## Audit trail

Every successful privilege grant or revocation creates a record in `privilegeAuditLogs` containing:

- action
- operator identifier
- target UID
- privilege
- authority context where applicable
- project/database context
- server timestamp

This audit collection is written only through trusted Admin SDK execution and is not a client privilege mechanism.

## Token refresh

Firebase custom-claim changes do not rewrite an already-issued ID token. The affected account must refresh its token or sign out and sign in again before the new privilege state is reflected in the application.

## Prohibited practices

Do not:

- hard-code administrator emails in React
- create privileged accounts from registration screens
- let a client write custom claims
- treat a Firestore metadata document alone as proof of privilege
- provision authority staff outside their authority's governed cadres
- grant the same account both platform-admin and authority-staff roles
- use this script against production until the production administration procedure has been separately approved
