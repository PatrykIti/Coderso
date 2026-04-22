# TASK-195-04-02: Block Inserter Media Grouping and Category Search Regression
# FileName: TASK-195-04-02_Block_Inserter_Media_Grouping_and_Category_Search_Regression.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-195-04
**Status:** To Do

---

## Overview

Clean up the existing Posts block-inserter catalog so the Media tab reflects
actual media content and lock category-scoped search with explicit regression
tests.

Current code shows both sides of the problem:

- `core/admin/ui/posts/editor/blocks/blockCatalog.ts:72-105` puts
  `separator` under `media` and `embed` under `interactive`.
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx:62-149` already routes
  search through `searchPostBlockCatalog(query, { category })`.

That means the QA report is partly about catalog semantics and partly about
trust. This leaf should fix the Media grouping and add regression coverage for
the category-scoped search path that already exists in code.
The same report also mentions broader media inventory expectations
(`video/gallery/audio/file`), but those are not already-shipped block
contracts in this repo. This leaf must not invent them under a polish task.
If QA replay still proves new media block types are required after regrouping
the current catalog, open a separate capability-expansion task instead of
stretching this leaf.

Owner boundary:

- `blockCatalog.ts` owns block category assignment and
  `searchPostBlockCatalog()` semantics.
- `BlockInserter.tsx` owns query input, rendering, focus, and keyboard
  interaction over that catalog contract.
- This leaf must repair those existing seams, not create a second search path or
  parallel category registry.
- If a separate follow-up later adds brand-new media block types, those owners
  are explicit:
  - block contract/schema/defaults: `core/services/posts/editor/postBlockDocument.ts`
    plus its normalizer owners,
  - editor/admin affordances: `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
    and related inspectors,
  - runtime/public rendering: `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
    and adjacent runtime mappers.
  `blockCatalog.ts` alone is not the owner of new media capabilities.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/blocks/blockCatalog.ts:72-105`
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx:62-149`
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx`
  only if helper text must explain category-scoped search
- `tests/vitest/ui/post-block-inserter-wave.test.tsx`
- `tests/vitest/ui-integration/post-block-inserter.test.tsx`
- `tests/vitest/posts/post-block-catalog-search.test.ts`

## Implementation Notes

- Reclassify `embed` into the Media-facing experience.
- Move `separator` from `media` to `text` so the category contract is explicit
  and deterministic.
- Keep the fix inside current block types only; do not add new post block types
  or runtime renderers in this leaf.
- Do not fork a second search implementation; keep `searchPostBlockCatalog()`
  as the single owner and lock it with tests.
- If QA replay still says Media needs `video`, `gallery`, `audio`, or `file`,
  open a dedicated linked follow-up task with the contract/editor/runtime owners
  named above instead of stretching this catalog leaf.

## Security Contract

- Visibility: internal admin editor UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - regrouping must remain deterministic and keyboard accessible,
  - search results must stay scoped to the chosen category when a category is
    active,
  - helper text must not advertise unsupported block types.

## Testing Requirements

- `tests/vitest/ui/post-block-inserter-wave.test.tsx`
  - category buttons filter visible results,
  - the Media tab exposes only current media-facing existing blocks after the
    regrouping and `Separator` no longer appears there,
  - search stays scoped to the active category,
  - keyboard navigation still works after regrouping.
- `tests/vitest/ui-integration/post-block-inserter.test.tsx`
  - rendered category labels/items match the updated catalog expectations.
- `tests/vitest/posts/post-block-catalog-search.test.ts`
  - `searchPostBlockCatalog()` keeps category-scoped filtering,
  - regrouped catalog order and explicit `separator -> text` assignment remain
    deterministic at the owner layer.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The Media tab exposes only current media-facing existing blocks and no longer
   misclassifies `Separator` as media; `Separator` belongs to the Text
   category.
2. Category-scoped search is regression-covered and deterministic.
3. Inserter keyboard navigation and item selection remain intact.
4. Any broader request for new media block types is tracked as a separate,
   linked capability-expansion follow-up with named contract/editor/runtime
   owners rather than being smuggled into this leaf.
