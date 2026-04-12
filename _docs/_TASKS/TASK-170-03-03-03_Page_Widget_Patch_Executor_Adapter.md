# TASK-170-03-03-03: Page Widget Patch Executor Adapter
# FileName: TASK-170-03-03-03_Page_Widget_Patch_Executor_Adapter.md

**Priority:** High  
**Category:** Core/Assistant + Pages + Widgets  
**Estimated Effort:** Large  
**Dependencies:** TASK-170-03-03-01, TASK-170-03-03-02  
**Status:** To Do

---

## Overview

Promote `page.widget.patch` only after page block patch semantics are explicit. This action must preserve unknown legacy blocks and reject unsupported widget types.

## Sub-Tasks

No child task files yet. Split by patch operation if insert/update semantics diverge.

## Pseudocode

```ts
const page = await deps.getPageBySlug(input.pageSlug);
const blocks = readBlocks(page.currentData);
const nextBlocks = applyWidgetPatch(blocks, input.patch);
await deps.updatePage(page.id, { data: { ...page.currentData, blocks: nextBlocks } });
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- widget contract modules that own schemas/defaults
- `tests/vitest/assistant/*` for pure patch helpers if extracted
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: `content:read` for plan/dry-run and `content:write` plus `content:publish` if publication changes.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: unsupported widget types and patch operations are rejected.
- Anti-abuse: no public write endpoint.
- Idempotency: patch operations must be deterministic and no-duplicate.
- Secret handling: widget data must not include provider keys, sessions, or secret-like settings.

## Testing Requirements

- Vitest:
  - pure page patch helper coverage if extracted,
  - unsupported widget/operation rejection.
- Bun:
  - dry-run update/noop,
  - execute delegates to `updatePage`,
  - public runtime acceptance if output changes user-visible blocks.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/WIDGET_PACK_MATRIX.md` if readiness changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Acceptance Criteria

1. Page widget patches preserve unrelated blocks.
2. Unsupported widget data is rejected.
3. Runtime-facing changes are covered.
