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
- empty-slot guidance should include a visible CTA, not only passive copy,
- slot CTA should reuse the existing widget insert surface instead of adding a
  Pages-only inserter,
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
- `core/admin/ui/pages/PageEditor.tsx`
  - own slot CTA state/selection if the existing insert dialog is opened from
    the Pages builder.
- `core/admin/ui/pages/builder/BlockList.tsx:252-276`
  - replace bare `Empty slot.` placeholder with actionable copy and CTA trigger.
- `core/admin/ui/pages/builder/WidgetPicker.tsx:31-45`
  - group widgets by category instead of one flat filtered list.
- `core/admin/ui/pages/builder/WidgetPicker.tsx:59-90`
  - render category sections, keep search results stable, and preserve slot
  compatibility filtering if slot-scoped insertion is wired in this wave.
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
  - reuse the existing insert surface if slot CTA opens a dialog.
- `core/admin/ui/widgets/widgetInsertUtils.ts`
  - reuse the existing slot-target filtering/count logic instead of cloning it
    inside Pages.
- `core/widgets/types.ts:3-8`
  - reuse `WidgetCategory` as the source of truth; do not invent new category ids.
- `core/admin/ui/widgets/WidgetLibraryPage.tsx:116-139`
  - reuse existing category label/icon map where possible.
- `tests/vitest/pageBuilder/wizardPanel.test.tsx`
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `tests/vitest/pageBuilder/blockList.test.tsx:298-322`
- `tests/vitest/pageBuilder/blockList.test.tsx:373-415`
- `tests/vitest/pageBuilder/pickers.test.tsx:320-355`
- `tests/vitest/ui/dialogs.test.tsx` if slot CTA reuses `WidgetInsertDialog`
  and needs slot-aware assertions there

## New Files to Create

- `tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`
  - add this focused suite if no existing unmocked Pages builder test can prove
    `BlockList` CTA -> `PageEditor` wiring -> existing insert surface behavior.

## Implementation Direction

- Reuse current `WidgetCategory` values: `layout`, `content`, `forms`,
  `navigation`, `media`.
- Reuse category label/icon metadata from `WidgetLibraryPage` if practical, or
  extract a small shared helper instead of duplicating mappings.
- Keep owner responsibilities explicit:
  - `WizardPanel.tsx` owns the post-wizard transition copy,
  - `BlockSettings.tsx` owns slot contract guidance,
  - `BlockList.tsx` owns the visible empty-slot CTA,
  - `PageEditor.tsx` owns builder-specific dialog target state,
  - `WidgetInsertDialog.tsx` / `widgetInsertUtils.ts` own insert-surface
    filtering semantics.
- For wizard completion, prefer explanatory copy over a silent mode switch, for
  example:
  - button: `Continue to layout and styling`
  - helper: `Next you can fine-tune layout, styling, and advanced settings.`
- For empty slots, include both capability and action:
  - `Drop or insert a widget into Hero Content. Recommended: text, buttons, and media-supported widgets.`
- Copy-only empty states are not enough for this leaf.
- Clicking the slot CTA should open the existing insert surface scoped to
  widgets that fit the slot contract.
- If that wiring does not fit inside this leaf after repo-grounded inspection,
  split an explicit follow-up dependency before implementation; do not close
  this leaf on copy-only state.

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
  - slot guidance renders when slots exist and describes the next action.
- `tests/vitest/pageBuilder/blockList.test.tsx`
  - empty-slot placeholder is actionable and exposes a real CTA control.
- `tests/vitest/pageBuilder/pickers.test.tsx`
  - picker groups widgets by category and still filters correctly,
  - slot-scoped filtering remains deterministic if enabled.
- one real Pages builder flow (`tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`
  or an equivalent unmocked suite) must prove that slot CTA reuses the existing
  insert surface and keeps slot filtering truthful.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/WIDGETS.md` if category grouping becomes documented contract
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Wizard completion clearly communicates the next editing step.
2. Empty slots explain what the user can do there and expose a visible CTA that
   routes into the existing slot-aware insert surface.
3. The widget picker groups items by existing widget categories without adding a
   new taxonomy.
4. The leaf does not introduce a Pages-only insert dialog or duplicate category
   mapping.
