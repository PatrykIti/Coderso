# 800 - TASK-190 provider sanitization and collection-link conflict closure

**Date:** 2026-05-07
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-02-02, TASK-190-05-01, TASK-190-05-02, TASK-190-07-01

## Key Changes

### Provider and planner trust boundary closure

- `sanitizeAssistantPlanningContext()` now removes caller-supplied
  `resourceCatalog` data unless the reviewed `includeResourceCatalog` flag is
  present.
- The provider entry path now reuses the sanitized context even on early
  broad-destructive fallbacks instead of reopening the old planner/provider
  catalog leak.

### Collection-link conflict hardening

- Supporting-page `collectionLink` resolution now accepts reviewed
  `listingQueryName` / `listingTemplateSlug` locators and resolves them into
  persisted ids when they match the requested collection.
- If explicit collection locators disagree with listing-resource ownership, the
  executor now fails closed with `assistant_action_dependency_conflict`
  instead of persisting mixed ids.

### Validation evidence

- Added provider prompt packaging evidence for ignored untrusted catalogs.
- Added route-level coverage for provider-backed local composed plans and
  catalog-backed LLM unavailability gating.
- Expanded media trust regression tests to cover `https`, `data`, `blob`, and
  `file` raw media sources, while proving non-media URL fields stay allowed.

## Validation

- `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts` - passed.
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/blueprint-page-section-library.test.ts` - passed.
