# TASK-063-02: Editor Shell Composition and Regions
# FileName: TASK-063-02_Editor_Shell_Composition_and_Regions.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-01  
**Status:** Done (2026-02-23)

---

## Overview
Wdrozyc layout posts editora wzorowany na `InterfaceSkeleton`:
- region `header`,
- region `content`,
- region `secondarySidebar` (inserter/list view),
- region `sidebar` (details),
- region `footer` (breadcrumbs/status).

---

## Scope
1. Rozdzielic obecny shell na warstwy layoutu i regionow.
2. Dodac centralny state dla otwartych paneli i aktywnych regionow.
3. Zachowac responsywnosc mobile/desktop bez duplikacji kodu.
4. Usunac lokalne "ad-hoc" toggles z wielu komponentow.

---

## Detailed Sub-Tasks
- `TASK-063-02-01_Layout_State_Model_and_Hooks.md`
- `TASK-063-02-02_Region_Components_and_Composition.md`
- `TASK-063-02-03_Responsive_Region_Behavior.md`

---

## Files to Create / Change
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx` (new)
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx` (new)
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts` (new)
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/integration/ui/post-editor-layout-shell.test.tsx` (new)

---

## Pseudocode
```ts
type RegionState = {
  inserterOpen: boolean;
  listViewOpen: boolean;
  detailsOpen: boolean;
  activeDetailsTab: "document" | "block";
};

function PostEditorLayout(props) {
  return (
    <Layout
      header={props.header}
      content={props.content}
      secondarySidebar={props.secondarySidebar}
      sidebar={props.sidebar}
      footer={props.footer}
    />
  );
}
```

---

## Acceptance Criteria
1. Layout post editora ma stale, przewidywalne regiony jak w Gutenberg.
2. Sidebary otwieraja/zamykaja sie przez centralny state.
3. Mobile fallback dziala bez layout glitches.

---

## Testing Requirements
- Integration UI:
  - render regionow,
  - toggling paneli,
  - zachowanie przy zmianie viewport.
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (posts editor layout layers)
- `_docs/CODERSO_MODULES.md` (posts editor UX shell)
