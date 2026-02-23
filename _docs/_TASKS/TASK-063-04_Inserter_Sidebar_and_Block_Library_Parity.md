# TASK-063-04: Inserter Sidebar and Block Library Parity
# FileName: TASK-063-04_Inserter_Sidebar_and_Block_Library_Parity.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-02, TASK-063-03  
**Status:** To Do

---

## Overview
Przeniesc inserter do dedykowanego sidebaru jak w Gutenberg:
- otwierany przez `Add`,
- zamykany `Esc` i przyciskiem close,
- zawiera searchable block library,
- przygotowany pod przyszle rozszerzenia pluginowe.

---

## Scope
1. Wydzielic `PostInserterSidebar`.
2. Spiac sidebar z block catalog i search.
3. Dodac focus return na toggle button po zamknieciu.
4. Zachowac slash command jako szybka sciezke inline.

---

## Detailed Sub-Tasks
- `TASK-063-04-01_Inserter_Sidebar_Shell.md`
- `TASK-063-04-02_Block_Library_Search_and_Categories.md`
- `TASK-063-04-03_Inserter_Focus_and_A11y_Contracts.md`

---

## Files to Create / Change
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx`
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx` (new)
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts`
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- `tests/integration/ui/post-editor-inserter-sidebar.test.tsx` (new)

---

## Pseudocode
```ts
if (!layout.inserterOpen) return null;

return (
  <Sidebar onClose={closeInserter} onEscape={closeInserter}>
    <BlockSearch />
    <BlockCategoryTabs />
    <BlockList onInsert={insertBlockAfterSelection} />
  </Sidebar>
);
```

---

## Acceptance Criteria
1. Inserter nie jest stale widoczny; otwiera sie przez `Add`.
2. `Esc` zamyka sidebar i oddaje focus do przycisku otwierajacego.
3. Wstawienie bloku dziala przewidywalnie wzgledem zaznaczenia.

---

## Testing Requirements
- Integration UI:
  - open/close sidebar,
  - search + insert,
  - focus return behavior.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md` (posts editor inserter UX)
- `_docs/ARCHITECTURE.md` (sidebar ownership)

