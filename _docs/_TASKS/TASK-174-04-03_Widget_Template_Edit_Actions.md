# TASK-174-04-03: Widget Template Edit Actions
# FileName: TASK-174-04-03_Widget_Template_Edit_Actions.md

**Priority:** High
**Category:** Assistant/Edit + Widget Templates
**Estimated Effort:** Large
**Dependencies:** TASK-174-02, TASK-174-04, TASK-174-05
**Status:** To Do

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
