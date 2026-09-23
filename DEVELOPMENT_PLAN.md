# PharmaNetwork Development Plan

## Current phase

The current priority is stabilization and product completion, not production deployment.

Priority order:

1. Security
2. Authentication and authorization
3. Data integrity
4. Architecture
5. Privacy
6. Feature completion
7. Testing
8. Auditability
9. Code quality
10. Production infrastructure

Do not add major new features while critical security or architectural defects remain unresolved.

## Development batches

### Batch 0 - Baseline, architecture and stabilization preparation
Confirm repository state, record architecture decisions, establish the stabilization branch and document the remediation baseline.

### Batch 1 - Authentication and privileged-access security
Remove demo/admin backdoors, remove hard-coded privileged identities, establish backend-controlled privilege assignment and harden authentication/authorization.

### Batch 2 - Professional Authority model and administration
Introduce professional-authority entities, scoped authority staff roles and cadre/authority mappings.

### Batch 3 - Professional verification, activation and compliance
Implement professional verification, activation, information requests, annual compliance, authority suspension and reactivation.

### Batch 4 - Member-only access enforcement
Enforce ACTIVE-member access at routes and backend rules. Remove public member-network access.

### Batch 5 - Profiles and directories
Complete professional and organisation editing, profile completeness, photo/CV workflows, directory rules, filters and multi-organisation handling.

### Batch 6 - Jobs, availability and business listings
Harden ownership, expiry, renewal, interest events, limits and business marketplace workflows.

### Batch 7 - Messaging, privacy, moderation and audit
Harden participant/message rules, separate sensitive data, implement moderation controls and audit logging.

### Batch 8 - B2B Product Marketplace
Add approved suppliers, product listings, search, supplier discovery and enquiry/quotation/order-request workflows.

### Batch 9 - Updates and Events timeline
Add authority-authored professional updates, notices, CPD and events.

### Batch 10 - Infrastructure, rules, CI and testing
Add versioned Firebase configuration, indexes, Storage rules, rules tests, CI and automated application tests.

### Batch 11 - Regression testing and beta readiness
Complete regression testing, security validation, mobile QA, staging and controlled beta-readiness checks.

## Development workflow

For every meaningful code change:

1. Inspect the current repository state.
2. Define the exact change.
3. Implement it on the appropriate branch.
4. Review the diff.
5. Run type checking/lint.
6. Run the build.
7. Test affected workflows.
8. Test relevant permissions/security behaviour.
9. Commit changes logically.
10. Push to GitHub.
11. Record results.
12. Synchronize Google AI Studio from GitHub.
13. Perform visual/functional confirmation.

A change is not complete until the authoritative version is in GitHub and the synchronized AI Studio application has been checked.

## Definition of done

A batch is complete only when implementation is complete, relevant code has been reviewed, type checking and build pass, affected workflows are tested, security behaviour is checked where applicable, blocking regressions are addressed, changes are committed and pushed, AI Studio is synchronized, visual confirmation is performed and remaining issues are documented.

## Continuation between chats

At the end of every substantial development conversation, create a PharmaNetwork Development Continuation Prompt containing:

- Repository
- Current branch
- Current commit/checkpoint
- Current batch
- Work completed
- Files changed
- Tests/checks performed
- What passed
- Known unresolved issues
- Frozen decisions
- Exact next actions
- Important warnings

The next chat must inspect GitHub and confirm the stated repository state before continuing.
