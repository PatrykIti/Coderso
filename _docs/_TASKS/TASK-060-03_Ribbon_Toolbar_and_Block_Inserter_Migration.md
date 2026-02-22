# TASK-060-03: Ribbon Toolbar and Block Inserter Migration
# FileName: TASK-060-03_Ribbon_Toolbar_and_Block_Inserter_Migration.md

**Priority:** High  
**Category:** Admin/UI UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-060-02  
**Status:** Done (2026-02-22)

---

## Overview
Przeniesc glowne akcje edytora do ribbona i wycofac staly lewy panel insertera, zachowujac te same mozliwosci operacyjne.

## Scope
1. Ribbon sections:
   - Save draft / Publish,
   - Undo / Redo,
   - Revisions / Runtime preview,
   - Outline toggle / Details,
   - Insert block actions (quick + searchable popover).
2. Migracja `BlockInserter` do komponentu otwieranego z ribbona.
3. Zachowanie slash command jako szybkiej metody insertu inline.
4. Usuniecie stalego lewego panelu w `EditorShell` dla posts.

## Files to Create / Change
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx`
- `core/admin/ui/posts/editor/blocks/SlashCommandMenu.tsx`
- `core/admin/ui/layouts/EditorShell.tsx` (only if new optional panel mode is needed)
- `tests/integration/ui/post-editor-ribbon.test.tsx` (new)
- `tests/unit/ui/post-block-editor-shell.test.tsx`

## Pseudocode
```ts
ribbon.insert.open = () => setInsertMenuOpen(true)

onInsert(type):
  insertBlock(type)
  focusBlockEditor(newBlockId)

editorShell.posts = {
  leftPanel: null,
  rightPanel: detailsSheetOnly
}

slashCommand.onSelect(type):
  insertBlockAfterCurrent(type)
```

## Acceptance Criteria
1. Brak stalego lewego panelu insertera w post editorze.
2. Wszystkie kluczowe akcje sa osiagalne z ribbona.
3. Inserter z ribbona ma feature parity (search/categories/insert).
4. Slash command nadal dziala.

## Testing Requirements
- Unit:
  - ribbon action callbacks,
  - insert popover state and command dispatch.
- Integration:
  - insert from ribbon,
  - insert from slash,
  - undo/redo/revisions/preview actions.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md` (posts editor UX section)
- `_docs/_TASKS/README.md`
