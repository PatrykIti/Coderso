# TASK-057-04: Block Inserter, Slash Command, List View, and Transforms
# FileName: TASK-057-04_Block_Inserter_Slash_Command_List_View_and_Transforms.md

**Priority:** High  
**Category:** Editor UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-057-03  
**Status:** In Progress (2026-02-21)

---

## Goal
Dostarczyc kluczowe mechanizmy Gutenberg-like: inserter, slash command, list view, transformacje i DnD blokow.

## Scope
1. Globalny inserter blokow z wyszukiwaniem i kategoriami.
2. Slash command (`/`) w blokach tekstowych.
3. List view (outline blokow) z wyborem/scroll-to-block.
4. Transformacje blokow (np. paragraph -> heading, list -> quote).
5. Drag & drop do zmiany kolejnosci blokow.

## Files to Create / Change
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` (new)
- `core/admin/ui/posts/editor/blocks/SlashCommandMenu.tsx` (new)
- `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx` (new)
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts` (new)
- `core/admin/ui/posts/editor/blocks/blockDnD.ts` (new)
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `tests/unit/posts/block-transforms.test.ts` (new)
- `tests/integration/ui/post-block-inserter.test.tsx` (new)
- `tests/integration/ui/post-block-dnd.test.tsx` (new)

## Pseudocode
```ts
onSlashCommand(query, cursorContext):
  options = searchAllowedBlocks(query)
  if userSelects(option):
    replaceCurrentBlockOrInsertAfter(option.defaultPayload)

transformBlock(block, targetType):
  assert canTransform(block.type, targetType)
  return transformWithMapping(block, targetType)

moveBlock(sourceIndex, targetIndex):
  nextBlocks = reorder(blocks, sourceIndex, targetIndex)
  commit(nextBlocks)
```

## Acceptance Criteria
1. Dodanie bloku jest mozliwe przez inserter i slash command.
2. List view zawsze odzwierciedla realna strukture dokumentu.
3. Transformacje nie gubia tresci, gdy sa semantycznie kompatybilne.
4. DnD dziala myszka i klawiatura (accessibility fallback).
