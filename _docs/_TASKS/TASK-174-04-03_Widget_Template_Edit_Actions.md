# TASK-174-04-03: Widget Template Edit Actions
# FileName: TASK-174-04-03_Widget_Template_Edit_Actions.md

**Priority:** High
**Category:** Assistant/Edit + Widget Templates
**Estimated Effort:** Large
**Dependencies:** TASK-174-02, TASK-174-04, TASK-174-05
**Status:** Done (2026-04-14)

---

## Overview

Add typed edit actions for reusable widget templates and their nested blocks.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/widgets/widgetTemplateService.ts`
- `tests/vitest/assistant/*`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: dry-run requires `widgets:read`; execute requires `widgets:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict template/block patch schema.
- Anti-abuse: assistant must distinguish reusable template edit from page-instance edit.
- Idempotency: execute requires idempotency key.
- Secret handling: no raw secret-like template settings in provider/UI/audit.

## Testing Requirements

- Vitest:
  - target resolution for active template,
  - ambiguity prompt for page instance vs reusable template,
  - schema rejection.
- Bun:
  - executor updates template metadata/settings/blocks via domain service,
  - preserves unrelated blocks/settings,
  - route permissions.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can edit reusable widget template metadata/settings/blocks after review.
2. Page-instance vs reusable-template ambiguity is handled explicitly.
3. Existing widget template service owns persistence.

## Completion Notes

- Added executable `widget-template.update`.
- Added executable `widget-template.block.patch`.
- Planner resolves metadata/settings edits and selected block patches from active widget template context.
- Planner returns explicit `needs_input` when a reusable template edit is requested outside reusable template context.
- Executor updates metadata/settings/blocks through `widgetTemplateService.updateWidgetTemplate`.
- Block patching reuses selected-block `dataPath[]` semantics and preserves unrelated blocks/settings.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx`
- `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
