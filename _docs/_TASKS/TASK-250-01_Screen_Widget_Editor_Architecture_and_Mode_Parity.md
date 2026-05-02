# TASK-250-01: Screen Widget Editor Architecture and Mode Parity
# FileName: TASK-250-01_Screen_Widget_Editor_Architecture_and_Mode_Parity.md

**Priority:** High
**Category:** Coderso Custom Screens + Widget Editors
**Estimated Effort:** Large
**Dependencies:** TASK-250
**Status:** To Do

---

## Overview

Bring the `screen-*` widget editor layer closer to the maturity of the shared
widget editor model used by `Hero` and other public widgets.

Today the `screen-*` family technically participates in the shared
`wizard/visual/advanced` bundle contract, but in practice all three modes alias
the same editor implementation. This task makes those modes meaningful.

## Sub-Tasks

- [ ] TASK-250-01-01: Distinct Wizard, Visual, and Advanced Flows for `screen-*`
- [ ] TASK-250-01-02: Binding-Aware Editor Controls for `screen-record-header` and `screen-field-value`

## Files to Change

- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/widgets/core/index.ts`
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- new `tests/vitest/widgets/screenEditors*.test.tsx` suites as needed

## Architecture Requirements

- Screen widgets remain on the shared widget foundation; do not create a second
  screen-only editor framework.
- `wizard`, `visual`, and `advanced` must become meaningfully different editing
  experiences where the widget warrants it.
- Any newly introduced screen-widget helper must still feed the shared widget
  schema/defaults/normalizer/render contract.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC: screen widget configuration writes still require `content:write`.
- CSRF: unchanged current CSRF-backed screen save path.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation:
  - widget extensions continue through shared widget schema validation,
  - no ad-hoc unvalidated editor-only payload is introduced.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- Run the focused suites required by TASK-250-01-01 and TASK-250-01-02.
- Ensure each touched `screen-*` widget has dedicated editor assertions for the
  relevant modes, not only style-clear regressions.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. `screen-*` widgets no longer expose one identical form under all editor
   modes.
2. The shared widget system remains the owner of schemas/defaults/renderers.
