# TASK-195-04-02: Block Inserter Media Grouping and Category Search Regression
# FileName: TASK-195-04-02_Block_Inserter_Media_Grouping_and_Category_Search_Regression.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-195-04
**Status:** To Do

---

## Overview

Clean up the Posts block-inserter catalog so the Media tab reflects actual media
content and lock category-scoped search with explicit regression tests.

Current code shows both sides of the problem:

- `core/admin/ui/posts/editor/blocks/blockCatalog.ts:72-105` puts
  `separator` under `media` and `embed` under `interactive`.
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx:62-149` already routes
  search through `searchPostBlockCatalog(query, { category })`.

That means the QA report is partly about catalog semantics and partly about
trust. This leaf should fix the Media grouping and add regression coverage for
the category-scoped search path that already exists in code.

Owner boundary:

- `blockCatalog.ts` owns block category assignment and
  `searchPostBlockCatalog()` semantics.
- `BlockInserter.tsx` owns query input, rendering, focus, and keyboard
  interaction over that catalog contract.
- This leaf must repair those existing seams, not create a second search path or
  parallel category registry.

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
- Move `separator` out of Media if that yields a more intuitive catalog.
- Do not fork a second search implementation; keep `searchPostBlockCatalog()`
  as the single owner and lock it with tests.

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
  - search stays scoped to the active category,
  - keyboard navigation still works after regrouping.
- `tests/vitest/ui-integration/post-block-inserter.test.tsx`
  - rendered category labels/items match the updated catalog expectations.
- `tests/vitest/posts/post-block-catalog-search.test.ts`
  - `searchPostBlockCatalog()` keeps category-scoped filtering,
  - regrouped catalog order remains deterministic at the owner layer.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The Media tab feels media-focused rather than a mixed bucket.
2. Category-scoped search is regression-covered and deterministic.
3. Inserter keyboard navigation and item selection remain intact.
