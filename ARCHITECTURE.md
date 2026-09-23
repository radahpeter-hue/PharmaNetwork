# PharmaNetwork Uganda Architecture

## Product model

PharmaNetwork Uganda is a member-only professional network and opportunity platform for Uganda's pharmaceutical and wider health-professions ecosystem.

Public access is limited primarily to landing/about pages, registration, login, privacy/terms and support. The member network requires an authenticated and ACTIVE account.

## Account classes

- professional
- organisation
- professional_authority
- platform_admin

Privileged roles must never be self-assigned from frontend code. Platform-admin and professional-authority roles are granted only through trusted backend processes.

## Professional lifecycle

Professional accounts support:

- PENDING_PROFILE
- PENDING_AUTHORITY_VERIFICATION
- MORE_INFORMATION_REQUIRED
- ACTIVE
- INACTIVE_ANNUAL_COMPLIANCE
- SUSPENDED_BY_AUTHORITY
- REJECTED
- DEACTIVATED_BY_PLATFORM

Only ACTIVE professionals may access the member network or appear in professional directories.

Professionals own their credentials and personal profile. Professional authorities control verification, professional standing and annual compliance. PharmaNetwork controls platform security, moderation and platform-level suspension.

## Professional authorities

Professional authorities are institutional entities inside PharmaNetwork. They may have scoped staff roles such as:

- authority_super_admin
- verification_officer
- compliance_officer
- communications_officer
- reviewer

There is no technical integration with external professional-body systems during the current development phase. Such integrations are deferred until the platform reaches production maturity and formal partnerships exist.

## Main platform domains

1. Identity & Professional Governance
2. Professional and Organisation Directories
3. Jobs and Professional Availability
4. Businesses for Sale Marketplace
5. B2B Product Marketplace
6. Direct Messaging and Notifications
7. Professional Updates, Events and CPD
8. Platform Administration, Moderation and Audit

## B2B product marketplace scope

The initial marketplace supports supplier discovery, product listings, enquiries and quotation/order requests. Payments, logistics and full e-commerce are out of scope for the first production version.

## Updates and events

Professional authorities may publish events, CPD opportunities, professional notices, regulatory updates, deadlines and announcements to relevant members.

## Access model

PharmaNetwork uses Member-only Model B. Professional directories, organisation directories, jobs, availability, messages, marketplaces, updates and member profiles require authentication and active membership.

Inactive professionals retain their records but lose member-network access and directory visibility until eligibility is restored.

## Security principles

- Privileged roles are backend-controlled.
- No hard-coded privileged email authorization.
- No client-created admin or authority accounts.
- Professional verification status is not editable by the professional being verified.
- Sensitive information is protected by backend rules, not only hidden in the UI.
- Authorization is enforced in Firestore/backend rules as well as the frontend.
- Important privileged actions are auditable.
- Public and private data should be separated where required for secure access control.

## Source of truth

GitHub repository `radahpeter-hue/PharmaNetwork` is the technical source of truth.

Google AI Studio is used primarily for visual and functional confirmation after GitHub changes are committed and pushed.

Production hosting, final Firebase configuration and custom domains are intentionally deferred until stabilization, testing and beta-readiness are complete.
