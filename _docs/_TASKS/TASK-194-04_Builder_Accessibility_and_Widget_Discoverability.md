# TASK-194-04: Builder Accessibility and Widget Discoverability
# FileName: TASK-194-04_Builder_Accessibility_and_Widget_Discoverability.md

**Priority:** High
**Category:** CMS/Pages + Builder + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-194, TASK-061
**Status:** Done (2026-04-22)

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
- Improve empty-slot guidance and CTA by reusing the existing Pages builder
  insert surface (`LibraryPanel` + `WidgetPicker`) instead of introducing a
  second Pages-only picker flow.
- Group picker items by existing widget categories.

Out of scope:

- a new widget registry contract,
- changes to widget runtime rendering,
- a new slot schema or drag-and-drop system.

## Files to Change

- `core/admin/ui/pages/builder/BlockToolbar.tsx`
- `core/admin/ui/pages/builder/BlockList.tsx`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/builder/LibraryPanel.tsx`
- `core/admin/ui/pages/builder/WizardPanel.tsx`
- `core/admin/ui/pages/PageEditor.tsx` if slot CTA wiring needs owner-level state
- `core/admin/ui/pages/builder/WidgetPicker.tsx`
- `core/admin/ui/widgets/widgetInsertUtils.ts` only if a small pure
  slot-compatibility helper is extracted for reuse; do not make
  `WidgetInsertDialog.tsx` the primary Pages owner
- `core/widgets/types.ts`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx` for category label/icon reuse
- `tests/vitest/pageBuilder/blockToolbar.test.tsx` if the real toolbar gets its
  own focused accessibility suite
- `tests/vitest/pageBuilder/blockList.test.tsx`
- `tests/vitest/pageBuilder/blockSettings.test.tsx`
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
  - wizard transition copy on the real `WizardPanel` owner,
  - slot guidance on the real `BlockSettings` owner,
  - empty-slot CTA plus guidance,
  - category-grouped widget picker behavior,
  - at least one real slot-CTA path that reuses the existing Pages builder
    insert surface (`PageEditor -> LibraryPanel -> WidgetPicker`) instead of
    closing on copy-only assertions or redirecting the fix into an unrelated
    widget-library dialog.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/WIDGETS.md` if picker grouping/help text becomes part of the contract
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Widget-card action buttons are screen-reader-usable and self-describing.
2. Wizard completion and empty-slot behavior are understandable without
   guesswork and stay on the existing Pages builder owner path.
3. The widget picker groups widgets by existing category metadata.
