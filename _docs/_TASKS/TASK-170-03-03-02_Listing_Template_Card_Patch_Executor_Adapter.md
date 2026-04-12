# TASK-170-03-03-02: Listing Template Card Patch Executor Adapter
# FileName: TASK-170-03-03-02_Listing_Template_Card_Patch_Executor_Adapter.md

**Priority:** High  
**Category:** Core/Assistant + Listings  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-03-03-01  
**Status:** To Do

---

## Overview

Promote `listing-template.card.patch` from contract-only to executable. This adapter should patch card-related template config without replacing unrelated template settings.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
const template = await deps.findListingTemplateBySlug(input.listingTemplateSlug);
const nextConfig = {
  ...template.config,
  card: normalizeCardPatch(input.card),
};
await deps.updateListingTemplate(template.id, { config: nextConfig });
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- `tests/vitest/assistant/action-plan-schema.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: `content:read` for plan/dry-run and `content:write` for execute.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: card patch must be an object and unknown top-level fields are rejected.
- Anti-abuse: no public write endpoint.
- Idempotency: repeated patch must noop when card config already matches.
- Secret handling: card config must not carry secret-like values.

## Testing Requirements

- Vitest:
  - strict schema accepts valid card patch,
  - unknown top-level fields reject.
- Bun:
  - dry-run update/noop,
  - execute delegates to `updateListingTemplate`.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Acceptance Criteria

1. Card config patch preserves unrelated template config.
2. Re-execution noops when card config already matches.
3. Action uses existing listing template service.
