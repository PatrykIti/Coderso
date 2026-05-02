# TASK-250-02: Screen Layout Widget Surface Expansion
# FileName: TASK-250-02_Screen_Layout_Widget_Surface_Expansion.md

**Priority:** High
**Category:** Coderso Custom Screens + Widget Surface Design
**Estimated Effort:** Large
**Dependencies:** TASK-250-01
**Status:** To Do

---

## Overview

Expand the configuration surface and in-editor interaction model for
`screen-field-group` and `screen-two-column`, and formalize selected-element
editing in the record canvas.

## Sub-Tasks

- [ ] TASK-250-02-01: `screen-field-group` and `screen-two-column` Configuration Parity
- [ ] TASK-250-02-02: Selected Element Interaction and Element-Scoped Editing Flow

## Files to Change

- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- `tests/vitest/ui/custom-screen-records.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC:
  - screen definition / widget configuration writes require `content:write`,
  - inline record edits in the dedicated editor continue to require
    `content:write`,
  - no new publish action is introduced by this leaf.
- CSRF: unchanged current admin client path.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: all widget surface expansion must remain within
  shared widget schemas and normalized data.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- Run the focused suites required by TASK-250-02-01 and TASK-250-02-02.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Layout-oriented screen widgets expose richer, product-appropriate
   configuration.
2. The dedicated record editor has a stronger selected-element editing flow.
