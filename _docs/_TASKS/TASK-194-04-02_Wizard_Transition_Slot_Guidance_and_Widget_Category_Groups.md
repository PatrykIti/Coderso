# TASK-194-04-02: Wizard Transition Slot Guidance and Widget Category Groups
# FileName: TASK-194-04-02_Wizard_Transition_Slot_Guidance_and_Widget_Category_Groups.md

**Priority:** High
**Category:** CMS/Pages + Builder + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-194-04
**Status:** Done (2026-04-22)

---

## Overview

Make the builder readable for a first-time Pages user:

- `Complete setup` must explain that the user is moving from the guided wizard
  into the next editing mode,
- empty slots such as `Hero Content` must explain what can be inserted and how,
- empty-slot guidance should include a visible CTA, not only passive copy,
- slot CTA should reuse the existing Pages builder insert surface
  (`LibraryPanel` + `WidgetPicker`) instead of adding a Pages-only inserter or
  redirecting the fix into a separate widget-library dialog flow,
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
- `core/admin/ui/pages/builder/LibraryPanel.tsx`
  - keep the existing Pages insert surface on the correct tab/state when a slot
    CTA routes into it.
- `core/admin/ui/pages/PageEditor.tsx`
  - own pending slot-target state and route slot CTA actions into the existing
    Pages builder insert surface.
- `core/admin/ui/pages/builder/BlockList.tsx:252-276`
  - replace bare `Empty slot.` placeholder with actionable copy and CTA trigger.
- `core/admin/ui/pages/builder/WidgetPicker.tsx:31-45`
  - group widgets by category instead of one flat filtered list.
- `core/admin/ui/pages/builder/WidgetPicker.tsx:59-90`
  - render category sections, keep search results stable, and preserve slot
  compatibility filtering if slot-scoped insertion is wired in this wave.
- `core/admin/ui/widgets/widgetInsertUtils.ts` only if a small pure
  slot-compatibility helper is extracted for reuse; do not make
  `WidgetInsertDialog.tsx` the primary UI owner for Pages.
- `core/widgets/types.ts:3-8`
  - reuse `WidgetCategory` as the source of truth; do not invent new category ids.
- `core/admin/ui/widgets/WidgetLibraryPage.tsx:116-139`
  - reuse existing category label/icon map where possible.
- `tests/vitest/pageBuilder/wizardPanel.test.tsx`
- `tests/vitest/pageBuilder/blockSettings.test.tsx`
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `tests/vitest/pageBuilder/blockList.test.tsx:298-322`
- `tests/vitest/pageBuilder/blockList.test.tsx:373-415`
- `tests/vitest/pageBuilder/pickers.test.tsx:320-355`

## New Files to Create

- `tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`
  - add this focused suite if no existing unmocked Pages builder test can prove
    `BlockList` CTA -> `PageEditor` wiring -> existing insert surface behavior.

## Implementation Direction

- Reuse current `WidgetCategory` values: `layout`, `content`, `forms`,
  `navigation`, `media`.
- Reuse category label/icon metadata from `WidgetLibraryPage` if practical, or
  extract a small shared helper instead of duplicating mappings.
- Reuse the existing Pages builder insert surface first:
  `PageEditor.tsx` already owns the builder shell, `LibraryPanel.tsx` already
  owns the widgets/templates/forms tabs, and `WidgetPicker.tsx` already owns
  widget selection. This leaf should route slot CTA into that path rather than
  inventing a new dialog.
- Keep owner responsibilities explicit:
  - `WizardPanel.tsx` owns the post-wizard transition copy,
  - `BlockSettings.tsx` owns slot contract guidance,
  - `BlockList.tsx` owns the visible empty-slot CTA,
  - `PageEditor.tsx` owns pending slot-target state plus desktop/mobile builder
    surface routing,
  - `LibraryPanel.tsx` owns the tab-level insert surface for Pages,
  - `WidgetPicker.tsx` owns grouped rendering and slot-aware widget filtering,
  - widget-library helpers may be reused only as pure shared logic, not as a
    second visible Pages UI.
- For wizard completion, prefer explanatory copy over a silent mode switch, for
  example:
  - button: `Continue to layout and styling`
  - helper: `Next you can fine-tune layout, styling, and advanced settings.`
- For empty slots, include both capability and action:
  - `Drop or insert a widget into Hero Content. Recommended: text, buttons, and media-supported widgets.`
- Copy-only empty states are not enough for this leaf.
- Clicking the slot CTA should route into the existing Pages widget library
  surface (desktop left panel or the already-wired mobile sheet) with a pending
  slot target and truthful widget filtering.
- If that wiring does not fit inside this leaf after repo-grounded inspection,
  split an explicit follow-up dependency before implementation rather than
  introducing a Pages-only dialog; do not close this leaf on copy-only state.

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
- `tests/vitest/pageBuilder/blockSettings.test.tsx`
  - real owner proof for slot guidance and slot-availability wording.
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  - mode orchestration stays coherent when `wizardCompleted` flips, but this
    mocked suite is not the sole owner proof for slot guidance copy.
- `tests/vitest/pageBuilder/blockList.test.tsx`
  - empty-slot placeholder is actionable and exposes a real CTA control.
- `tests/vitest/pageBuilder/pickers.test.tsx`
  - picker groups widgets by category and still filters correctly,
  - slot-scoped filtering remains deterministic if enabled.
- one real Pages builder flow (`tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`
  or an equivalent unmocked suite) must prove that slot CTA reuses the existing
  Pages builder insert surface (`PageEditor -> LibraryPanel -> WidgetPicker`)
  and keeps slot filtering truthful.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/WIDGETS.md` if category grouping becomes documented contract
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Wizard completion clearly communicates the next editing step.
2. Empty slots explain what the user can do there and expose a visible CTA that
   routes into the existing Pages builder widget-library surface.
3. The widget picker groups items by existing widget categories without adding a
   new taxonomy.
4. The leaf does not introduce a Pages-only insert dialog, duplicate category
   mapping, or a second slot-filtering contract.
