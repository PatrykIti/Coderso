# TASK-194-04-02: Wizard Transition Slot Guidance and Widget Category Groups
# FileName: TASK-194-04-02_Wizard_Transition_Slot_Guidance_and_Widget_Category_Groups.md

**Priority:** High
**Category:** CMS/Pages + Builder + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-194-04
**Status:** To Do

---

## Overview

Make the builder readable for a first-time Pages user:

- `Complete setup` must explain that the user is moving from the guided wizard
  into the next editing mode,
- empty slots such as `Hero Content` must explain what can be inserted and how,
- the widget picker must stop presenting 30+ widgets as one flat list when the
  repo already has `WidgetCategory` metadata.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/builder/WizardPanel.tsx:13-46`
  - clarify the button label and post-wizard explanation.
- `core/admin/ui/pages/builder/BlockSettings.tsx:95-103`
  - clarify the wizard handoff when `wizardCompleted` flips.
- `core/admin/ui/pages/builder/BlockSettings.tsx:106-189`
  - improve slot helper text and repeatable-slot guidance.
- `core/admin/ui/pages/builder/BlockList.tsx:252-276`
  - replace bare `Empty slot.` placeholder with actionable copy.
- `core/admin/ui/pages/builder/WidgetPicker.tsx:31-45`
  - group widgets by category instead of one flat filtered list.
- `core/admin/ui/pages/builder/WidgetPicker.tsx:59-90`
  - render category sections and keep search results stable.
- `core/widgets/types.ts:3-8`
  - reuse `WidgetCategory` as the source of truth; do not invent new category ids.
- `core/admin/ui/widgets/WidgetLibraryPage.tsx:116-139`
  - reuse existing category label/icon map where possible.
- `tests/vitest/pageBuilder/wizardPanel.test.tsx`
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `tests/vitest/pageBuilder/blockList.test.tsx:298-322`
- `tests/vitest/pageBuilder/blockList.test.tsx:373-415`
- `tests/vitest/pageBuilder/pickers.test.tsx:320-355`

## Implementation Direction

- Reuse current `WidgetCategory` values: `layout`, `content`, `forms`,
  `navigation`, `media`.
- Reuse category label/icon metadata from `WidgetLibraryPage` if practical, or
  extract a small shared helper instead of duplicating mappings.
- For wizard completion, prefer explanatory copy over a silent mode switch, for
  example:
  - button: `Continue to layout and styling`
  - helper: `Next you can fine-tune layout, styling, and advanced settings.`
- For empty slots, include both capability and action:
  - `Drop or insert a widget into Hero Content. Recommended: text, buttons, and media-supported widgets.`

## Implementation Sketch

```ts
const groups = groupBy(filteredWidgets, (widget) => widget.category);

for (const category of orderedCategories) {
  renderCategorySection(categoryMeta[category].label, groups[category] ?? []);
}
```

## Security Contract

- Visibility: internal admin builder only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - helper copy must stay truthful to slot/category constraints,
  - no new implicit widget insertion path is introduced here.

## Testing Requirements

- `tests/vitest/pageBuilder/wizardPanel.test.tsx`
  - wizard completion copy is explicit.
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  - slot guidance renders when slots exist.
- `tests/vitest/pageBuilder/blockList.test.tsx`
  - empty-slot placeholder is actionable.
- `tests/vitest/pageBuilder/pickers.test.tsx`
  - picker groups widgets by category and still filters correctly.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/WIDGETS.md` if category grouping becomes documented contract
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Wizard completion clearly communicates the next editing step.
2. Empty slots explain what the user can do there.
3. The widget picker groups items by existing widget categories without adding a
   new taxonomy.
