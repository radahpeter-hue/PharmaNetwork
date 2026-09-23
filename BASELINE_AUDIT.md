# PharmaNetwork Stabilization Baseline

## Baseline checkpoint

Repository: `radahpeter-hue/PharmaNetwork`  
Baseline branch: `main`  
Baseline commit: `43d8268ea0e51bbcfa69bed7dd729294938652c8`  
Stabilization branch: `stabilization/pharmanetwork-v2`

## Current assessment

The repository contains a substantial prototype, but it is not production-ready.

The current stabilization program is driven by the following known categories of risk:

- hard-coded privileged identities and demo-account provisioning
- frontend-controlled or weakly protected privileged actions
- Firestore authorization gaps
- professional verification fields that are not adequately protected
- member/public access contradictions
- incomplete profile-editing and directory workflows
- weak ownership enforcement for jobs and availability posts
- incomplete business-listing implementation
- messaging-rule weaknesses
- client-controlled aggregate statistics
- missing Firebase deployment/index/storage configuration
- missing automated tests and CI
- schema and enum drift
- unfinished routes and prototype-only UI behaviours

## Frozen product decisions

- PharmaNetwork is a member-only professional network.
- Professionals self-register.
- Professional authorities verify and activate professionals.
- Professional authorities manage professional standing and annual compliance.
- Inactive professionals lose member-network access and directory visibility but retain their data.
- Platform admins and professional-authority staff receive privileges only through trusted backend processes.
- External professional-body system integrations are deferred.
- A B2B product marketplace will be added later in the sequence.
- Professional-authority updates, events and CPD publishing will be added later in the sequence.
- GitHub is the technical source of truth.
- Google AI Studio is used for synchronization and visual/functional confirmation.
- Production hosting and domains are deferred until stabilization and beta readiness are complete.

## Immediate next batch

Batch 1 will focus on authentication and privileged-access security before new feature work begins.
