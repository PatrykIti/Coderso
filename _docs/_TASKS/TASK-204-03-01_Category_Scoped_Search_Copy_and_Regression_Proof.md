# TASK-204-03-01: Category Scoped Search Copy and Regression Proof
# FileName: TASK-204-03-01_Category_Scoped_Search_Copy_and_Regression_Proof.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-204-03
**Status:** To Do

---

## Overview

The current `BlockInserter` calls `searchPostBlockCatalog(query, { category })`,
so category-scoped search is owned by the catalog/search seam. The replay still
observed generic copy (`Search blocks...`) and could not clearly verify that
search was scoped to the active tab.

This leaf aligns UI copy and regression proof with the existing behavior.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx:62-64`
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx:130-148`
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts:136-148`
- `tests/vitest/posts/post-block-catalog-search.test.ts:18`
- `tests/vitest/ui/post-block-inserter-wave.test.tsx:99`
- `tests/vitest/ui-integration/post-block-inserter.test.tsx:11`

## Implementation Notes

- Use active-category placeholder copy such as:
  - `Search blocks...` for `All`,
  - `Search Text blocks...`,
  - `Search Media blocks...`,
  - `Search Interactive blocks...`.
- Keep the `aria-label` stable or make it similarly scoped if tests and screen
  reader behavior support the change.
- Add a regression that searches for a keyword shared with a non-active category
  and proves only active-category results render.
- Keep `blockCatalog.ts` as the single search owner.

## Security Contract

- No route, auth, RBAC, CSRF, rate-limit, or validation changes.
- Anti-abuse: search stays local over the trusted block catalog and does not
  accept runtime HTML or external input.

## Testing Requirements

- `tests/vitest/posts/post-block-catalog-search.test.ts`
  - query + category filters intersect correctly.
- `tests/vitest/ui/post-block-inserter-wave.test.tsx`
  - active tab changes placeholder/scope copy,
  - search results stay within the selected category.
- `tests/vitest/ui-integration/post-block-inserter.test.tsx`
  - SSR/integration output remains coherent.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Users can tell which block category they are searching.
2. Tests prove category and query are applied together.
3. No second catalog/search path is introduced.
