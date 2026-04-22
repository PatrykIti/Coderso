# TASK-194-04: Builder Accessibility and Widget Discoverability
# FileName: TASK-194-04_Builder_Accessibility_and_Widget_Discoverability.md

**Priority:** High
**Category:** CMS/Pages + Builder + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-194, TASK-061
**Status:** To Do

---

## Overview

Close the builder-side usability and accessibility issues from the report:

- widget-card action buttons are unlabeled,
- wizard completion is unclear,
- empty slots do not explain what can go there,
- the widget picker is a flat ungrouped list despite existing category metadata.

## Sub-Tasks

- `TASK-194-04-01_Block_Toolbar_Accessibility_Labels_and_Action_Hints.md`
- `TASK-194-04-02_Wizard_Transition_Slot_Guidance_and_Widget_Category_Groups.md`

## Scope

- Add accessible action labels and optional title/tooltips to widget-card
  controls.
- Clarify the wizard-to-visual handoff.
- Improve empty-slot helper text.
- Group picker items by existing widget categories.

Out of scope:

- a new widget registry contract,
- changes to widget runtime rendering,
- a new slot schema or drag-and-drop system.

## Files to Change

- `core/admin/ui/pages/builder/BlockToolbar.tsx`
- `core/admin/ui/pages/builder/BlockList.tsx`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/builder/WizardPanel.tsx`
- `core/admin/ui/pages/builder/WidgetPicker.tsx`
- `core/widgets/types.ts`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx` for category label/icon reuse
- `tests/vitest/pageBuilder/blockToolbar.test.tsx` if the real toolbar gets its
  own focused accessibility suite
- `tests/vitest/pageBuilder/blockList.test.tsx`
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `tests/vitest/pageBuilder/wizardPanel.test.tsx`
- `tests/vitest/pageBuilder/pickers.test.tsx`

## Security Contract

- Visibility: internal admin builder only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: builder helper text must stay accurate to actual slot/category
  contracts; do not claim widgets are insertable into slots that the schema
  disallows.

## Testing Requirements

- Vitest coverage for:
  - action-button labels/titles on the real toolbar owner,
  - wizard transition copy,
  - empty-slot helper text,
  - category-grouped widget picker behavior.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/WIDGETS.md` if picker grouping/help text becomes part of the contract
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Widget-card action buttons are screen-reader-usable and self-describing.
2. Wizard completion and empty-slot behavior are understandable without guesswork.
3. The widget picker groups widgets by existing category metadata.
