# TASK-172-03: Booking Service Business Pack
# FileName: TASK-172-03_Booking_Service_Business_Pack.md

**Priority:** High  
**Category:** Assistant/Product + Booking  
**Estimated Effort:** Large  
**Dependencies:** TASK-172-01, TASK-170  
**Status:** To Do

---

## Overview

Add a booking-oriented blueprint pack only after booking domain contracts are audited for safe assistant reuse. The pack should create a service-oriented public page and connect to existing booking resources without inventing a parallel booking writer.

## Sub-Tasks

No child task files yet. Create leaves for booking resource adapters if the service audit finds multiple independent contracts.

## Pseudocode

```ts
if (!bookingDomainSupportsTypedAssistantSetup()) {
  return needsInput("Booking setup needs a supported booking service contract first.");
}

return buildBlueprintPlan(bookingServicePack, {
  actions: [bookingServiceUpsert(), bookingAvailabilityHint(), pageBookingEmbed()],
});
```

## Files to Change

- `core/services/assistant/blueprints/*`
- `core/services/assistant/actionPlannerService.ts`
- booking domain service modules after audit
- booking admin/runtime widgets only if existing contracts support embedding
- `tests/vitest/assistant/actionPlannerService.test.ts`
- booking-specific Bun tests selected by touched service contracts

## Security Contract

- Visibility: internal action endpoints for setup.
- Auth model: admin session.
- RBAC: booking read for plan/dry-run and booking write plus page write/publish for execute.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: booking service/availability payloads must use owner schemas.
- Anti-abuse: no public booking write changes unless existing booking nonce/access hardening is reused.
- Idempotency: booking resources must be upserted without duplicates.
- Secret handling: no customer reservation data, access logs, or provider secrets in previews/audit.

## Testing Requirements

- Vitest:
  - prompt classification and `needs_input` when booking contract is not ready,
  - plan shape when safe booking adapters exist.
- Bun:
  - booking service adapter tests,
  - public runtime booking page acceptance,
  - booking public-write security tests if any booking submission behavior changes.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- booking assistant docs in `docs/` if user-facing.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Pack does not ship until booking service contracts are safe to reuse.
2. No assistant-only booking write path is introduced.
3. Runtime booking surface is covered by Bun acceptance tests.
