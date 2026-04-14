# TASK-174-04-04: Custom Screen Edit Actions
# FileName: TASK-174-04-04_Custom_Screen_Edit_Actions.md

**Priority:** High
**Category:** Assistant/Edit + Custom Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02, TASK-174-04
**Status:** Done (2026-04-14)

---

## Overview

Add typed edit actions for custom screen metadata, sidebar visibility, bindings, and selected screen widget blocks.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/customScreens/customScreenService.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: dry-run requires `content:read`; execute requires `content:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict schema for metadata/bindings/block patch.
- Anti-abuse: active screen/catalog target resolution only.
- Idempotency: execute requires idempotency key.
- Secret handling: no raw entry values; bindings/config redacted.

## Testing Requirements

- Vitest:
  - active screen target resolution,
  - schema rejection,
  - unsupported binding/config path handling.
- Bun:
  - executor updates via custom screen service,
  - preserves unrelated blocks/bindings,
  - route permissions.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can edit selected custom screen properties after review.
2. Binding and block patches preserve unrelated screen config.
3. No raw entry data leaks.

## Completion Notes

- Added executable `custom-screen.update`.
- Added executable `custom-screen.widget.patch`.
- Planner resolves metadata/sidebar edits and selected block patches from active custom screen context.
- `custom-screen.update` supports name, status, sidebar visibility/label, and binding mode patch by `widgetId + propPath + field`.
- `custom-screen.widget.patch` reuses selected-block `dataPath[]` semantics and preserves unrelated blocks/bindings.
- Executor delegates persistence to `customScreenService.updateCustomScreen`.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
- `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
