# Security Spec: PharmaNetwork Uganda

## Data Invariants
1. A user can only have one `user_accounts` document, keyed by their UID.
2. An `individual_profile` or `organisation_profile` must refer to a valid `user_accounts` document.
3. Users can only edit THEIR OWN profile and account data.
4. `platform_stats` are read-only for all users, updated by system (admin).
5. Identity fields (`user_id`, `id` in account) are immutable after creation.
6. `is_verified` or `is_active` in `user_accounts` cannot be changed by the user (only admin).

## Detailed Payloads & Negative Tests

### T1: Identity Spoofing (Account)
- **Actor**: User A
- **Payload**: `{ "id": "UserB", "account_type": "individual" }` to `/user_accounts/UserA`
- **Result**: `PERMISSION_DENIED` (id must match auth.uid)

### T2: Privilege Escalation (Verification)
- **Actor**: User A
- **Payload**: `{ "is_verified": true }` to `/user_accounts/UserA`
- **Result**: `PERMISSION_DENIED` (verified field is immutable for users)

### T3: Orphaned Profile
- **Actor**: User A
- **Payload**: `{ "user_id": "UserB", "full_name": "Ghost" }` to `/individual_profiles/RandomId`
- **Result**: `PERMISSION_DENIED` (user_id must match auth.uid)

### T4: Junk ID Injection
- **Actor**: Malicious User
- **Action**: Create document with ID 2KB long.
- **Result**: `PERMISSION_DENIED` (isValidId regex check)

### T5: State Lock Bypass (Stats)
- **Actor**: Authenticated User
- **Payload**: `{ "stat_value": 99999 }` to `/platform_stats/registered_pharmacists`
- **Result**: `PERMISSION_DENIED` (Only admin can write)

### T6: Large Payload Attack
- **Actor**: User A
- **Payload**: `{ "bio": "A" * 1000000 }`
- **Result**: `PERMISSION_DENIED` (Bio size limit exceeded)

### T7: Type Confusion
- **Actor**: User A
- **Payload**: `{ "profile_completeness": "ONE HUNDRED" }`
- **Result**: `PERMISSION_DENIED` (Must be number)

### T8: Creation with Shadow Fields
- **Actor**: User A
- **Payload**: `{ "full_name": "A", "user_id": "A", "primary_cadre": "A", "is_admin": true }`
- **Result**: `PERMISSION_DENIED` (Shadow field not in schema)

### T9: Illegal Update of Immutable Field
- **Actor**: User A
- **Payload**: Update `user_id` in profile from "A" to "B".
- **Result**: `PERMISSION_DENIED`

### T10: Unverified Email Write
- **Actor**: User with `email_verified: false`
- **Action**: Create profile.
- **Result**: `PERMISSION_DENIED` (Verified email required for writes)

### T11: Cross-User List Exploration
- **Actor**: User A
- **Action**: List `user_accounts`
- **Result**: `PERMISSION_DENIED` (unless restricted where resource.id == auth.uid)

### T12: Resource Exhaustion (Array Size)
- **Actor**: User A
- **Payload**: `{ "areas_of_practice": ["A"] * 1000 }`
- **Result**: `PERMISSION_DENIED` (Array size limit)
