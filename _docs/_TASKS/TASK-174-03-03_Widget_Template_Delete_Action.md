# TASK-174-03-03: Widget Template Delete Action
# FileName: TASK-174-03-03_Widget_Template_Delete_Action.md

**Priority:** High
**Category:** Assistant/Delete + Widget Templates
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02, TASK-174-03
**Status:** Done (2026-04-13)

---

## Overview

Add `widget-template.delete` for user-requested deletion of reusable widget templates resolved from active template context or widget template catalog.

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
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/integration/routes/assistant.test.ts`

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: dry-run requires `widgets:read`; execute requires `widgets:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict schema rejects unknown fields.
- Anti-abuse: template id must come from active context/catalog; warn when template is referenced by pages if reference data is available.
- Idempotency: execute requires idempotency key.
- Secret handling: no raw template snapshots or secret-like config in UI/audit.

## Testing Requirements

- Vitest:
  - active template prompt resolves delete,
  - ambiguous template name returns `needs_input`.
- Bun:
  - executor calls widget template domain delete,
  - route permissions include `widgets:write`.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can delete exact widget templates after dry-run/review.
2. Reusable template blast radius is shown before execute.
3. Existing widget template domain service owns deletion.

## Completion Notes (2026-04-13)

- Added executable `widget-template.delete`.
- Planner can build a reviewed widget template delete plan from active widget template context.
- Planner returns `needs_input` when widget template deletion is requested without active template context.
- Dry-run emits `delete` operation plus reusable-template blast-radius warnings.
- Execute rechecks template id/name/status/category before calling `widgetTemplateService.deleteWidgetTemplate`.
- Route per-action permissions include `widgets:read` and `widgets:write` for widget template deletion.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
