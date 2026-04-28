# TASK-061-06: Editor UI Integration (Ribbon + Canvas + List View)
# FileName: TASK-061-06_Editor_UI_Integration_Ribbon_Canvas_List_View.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-061-01, TASK-061-02, TASK-061-03, TASK-061-05  
**Status:** Done (2026-02-22)

---

## Overview
Spiac writing canvas i smart paste z obecnym shell/ribbon/list-view tak, aby flow byl prosty dla nietechnicznego usera.

## Scope
1. Domyslny dokument posta startuje od `writing-canvas`.
2. Ribbon `Insert` pokazuje writing-first akcje.
3. List view pokazuje logiczne sekcje (np. `Writing canvas`, `CTA`, `Embed`) zamiast technicznych detali.
4. Details panel pokazuje kontekst writing node / image wrap controls.
5. Zachowane autosave/revisions/status badges.

## Files to Create / Change
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx` (new)
- `tests/unit/ui/post-editor-page.test.tsx` (extend)

## Pseudocode
```ts
if post.document.blocks is empty:
  create [{ type: "writing-canvas", content: emptyWritingDoc }]

insertActions = [
  "Add writing section",
  "Add CTA block",
  "Add embed block"
]

onPasteLargeDocument:
  normalize -> merge into active writing-canvas block
```

## Acceptance Criteria
1. Edycja posta jest writing-first i intuicyjna.
2. List view zostaje informacyjny i szybki nawigacyjnie.
3. Brak regresji w autosave/revisions/publish.

## Testing Requirements
- Integration UI flow end-to-end.
- Regression istniejących testow post editora.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`

## Validation Executed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`
  - Result: `1384 pass`, `149 skip`, `0 fail`

## Closure Notes
- Writing-first default state:
  - empty post documents now initialize with a `writing-canvas` block (`block-1`) instead of `paragraph`,
  - reducer fallback after deleting all blocks also restores `writing-canvas`.
- Ribbon insert flow updated to non-technical quick actions:
  - `Add writing section`,
  - `Add CTA block`,
  - `Add embed block`,
  - `Add image block`.
- Canvas/list/details integration:
  - `writing-canvas` block is editable inline through `PostRichTextAdapter`,
  - list view labels are user-facing (`Writing canvas`, `CTA block`, `Embed block`),
  - block inspector includes writing-canvas guidance and keeps image wrap controls for image blocks.
- Added/updated tests:
  - new `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`,
  - updated post editor shell/page/smoke tests,
  - updated store/canvas/inspector tests for writing-first defaults and labels.
