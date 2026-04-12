# TASK-170-03-02: Menu, SEO, and Media Action Executor Adapters
# FileName: TASK-170-03-02_Menu_SEO_Media_Action_Executor_Adapters.md

**Priority:** High  
**Category:** Core/Assistant + Menus + SEO + Media  
**Estimated Effort:** Large  
**Dependencies:** TASK-170-03, TASK-170-01-02, TASK-170-03-01  
**Status:** In Progress (2026-04-12)

---

## Overview

Implement executor adapters for navigation, SEO, and existing media reference actions after the first entry adapter proves the pattern.

## Sub-Tasks

- `TASK-170-03-02-01_Menu_Item_Upsert_Executor_Adapter.md`
- `TASK-170-03-02-02_SEO_Document_Upsert_Executor_Adapter.md`
- `TASK-170-03-02-03_Media_Reference_Attach_Executor_Adapter.md`
- `TASK-170-03-02-04_Menu_SEO_Media_Adapters_Docs_Tests_and_Closure.md`

## Pseudocode

```ts
if (action.type === "menu.item.upsert") {
  assertSafeRelativeHref(action.input.href);
  return deps.upsertMenuItem(action.input);
}

if (action.type === "seo.document.upsert") {
  assertKnownSeoTarget(action.input.targetType, action.input.targetId);
  return deps.upsertSeoDocument(action.input);
}

if (action.type === "media.reference.attach") {
  assertExistingMedia(action.input.mediaId);
  return deps.patchTargetMediaReference(action.input);
}
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/menus/menuService.ts` only if a reusable upsert helper is missing
- `core/services/seo/seoService.ts` only if a reusable upsert helper is missing
- `core/services/media/mediaService.ts` only if reference lookup helpers are missing
- relevant Vitest/Bun tests for touched helpers and executor behavior

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: `menus:read/write`, `content:read/write`, `media:read` plus target resource write permission as applicable.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: unsafe hrefs, unknown targets, raw upload bytes, and extra fields are rejected.
- Anti-abuse: no public write endpoint and no upload transport through assistant actions.
- Idempotency: menu and SEO upserts must avoid duplicate records.
- Secret handling: no signed media URLs, private storage paths, credentials, or secret-like metadata in previews/results.

## Testing Requirements

- Vitest:
  - safe href helper coverage if extracted,
  - target/media reference validation helpers if Bun-free.
- Bun:
  - executor adapter tests for menu/SEO/media actions,
  - runtime smoke for generated navigation where applicable.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Acceptance Criteria

1. Menu/SEO/media writes reuse existing domain services.
2. Unsafe hrefs and raw media upload payloads are rejected.
3. Preview/execute results remain redacted and idempotent.

## Progress Notes

- 2026-04-12: Split menu, SEO, and media adapters into separate implementation leaves because media reference attachment needs target-specific patch semantics.
