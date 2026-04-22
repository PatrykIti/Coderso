# TASK-195-04: Writing Toolbar and Block Inserter Clarity
# FileName: TASK-195-04_Writing_Toolbar_and_Block_Inserter_Clarity.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-195
**Status:** Done (2026-04-22)

---

## Overview

Close the authoring-surface clarity issues from the report that live below the
editor shell:

- the typography helper copy is unclear about what the controls actually do,
- the Media tab taxonomy still feels off,
- the report observed category-search behavior that now needs a regression lock
  against the current code path.

This wave should improve the readability of the writing controls without
changing the underlying writing-canvas model or block-insertion engine.
The QA report also points at broader media-inventory expectations, but this
family only repairs the semantics of block types that already exist in the
catalog today.

## Sub-Tasks

- `TASK-195-04-01_Typography_Control_Affordance_and_Disabled_State_Clarity.md`
- `TASK-195-04-02_Block_Inserter_Media_Grouping_and_Category_Search_Regression.md`

## Scope

- Clarify typography helper copy, tooltiping, and the current disabled-state
  affordances without inventing a richer inherited/read-only state model that
  the toolbar contract does not expose today.
- Reclassify block-catalog items so the Media tab reads like actual media.
- Keep category-scoped search behavior deterministic and regression-covered.
- Keep `blockCatalog.ts` as the single owner of category assignment/search
  semantics; `BlockInserter.tsx` should stay a consumer of that contract rather
  than reimplementing it.

Out of scope:

- a new posts block taxonomy beyond the existing `text/media/interactive`
  structure,
- changing the writing-canvas command engine or supported block types,
- introducing new post block types such as `video`, `gallery`, `audio`, or
  `file` under this polish wave,
- adding new runtime block renderers beyond any minimal media-grouping move that
  reuses existing block types.

## Files to Change

- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx`
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts`
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx` only if helper
  copy needs to mirror the active category/search behavior
- `tests/vitest/ui/post-richtext-toolbar-wave.test.tsx`
- `tests/vitest/ui/post-block-inserter-wave.test.tsx`
- `tests/vitest/ui-integration/post-block-inserter.test.tsx`
- `tests/vitest/posts/post-block-catalog-search.test.ts`

## Security Contract

- Visibility: internal admin editor UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged; this wave is pure admin/UI logic.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - no new write path,
  - helper copy/tooltip changes must not imply capabilities the product does not
    support,
  - category search/regrouping must stay deterministic and keyboard-accessible.

## Testing Requirements

- Vitest:
  - typography helper copy and disabled/read-only affordances,
  - block-catalog grouping by category,
  - category-scoped search regression,
  - keyboard navigation in the inserter after regrouping.
- Direct owner test:
  - `tests/vitest/posts/post-block-catalog-search.test.ts` keeps the
    `blockCatalog.ts` search/category contract locked below the UI layer.
- No Bun coverage required unless a leaf unexpectedly changes a route or
  persisted contract.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Typography controls communicate clearly when they are active, inherited, or
   unavailable under the current toolbar contract.
2. The Media tab contains media-facing items and no longer feels like a
   catch-all bucket.
3. Category-scoped search remains deterministic and regression-covered.
