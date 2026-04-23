# TASK-204-03: Block Inserter Search and Media Capability Follow-up
# FileName: TASK-204-03_Block_Inserter_Search_and_Media_Capability_Followup.md

**Priority:** Medium
**Category:** CMS/Posts + Block Editor + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-204, TASK-195-04
**Status:** Done (2026-04-23)

---

## Overview

Close the remaining block inserter observations from the 2026-04-23 Posts
replay:

- `UX-7`: active-category search behavior needs explicit UI copy and regression
  proof.
- `UX-4`: the Media tab improved from `Image + Separator` to `Image + Embed`,
  but the report still asks for `Video`, `Gallery`, `Audio`, and `File`.

These are different sizes of work. Category-scoped search is a small UI/test
follow-up. New media blocks are a product capability expansion and must be
handled across the full block contract or left explicitly open.

## Sub-Tasks

- `TASK-204-03-01_Category_Scoped_Search_Copy_and_Regression_Proof.md`
- `TASK-204-03-02_Media_Block_Capability_Contract_for_Video_Gallery_Audio_File.md`

## Scope

- Make active-category search obvious in `BlockInserter`.
- Add tests that prove `Text`, `Media`, and `Interactive` search scope.
- Decide the media block capability contract:
  - implement accepted block types end to end, or
  - keep them explicitly open with named owners and source-report status.

Out of scope:

- catalog-only fake entries that create unsupported block types;
- moving `Separator` back to Media;
- adding runtime-unsafe embeds or file links without validation/sanitization;
- changing the writing-canvas contract without normalizer/runtime tests.

## Files to Change

- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx:62-64`
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx:130-148`
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts:22-107`
- `core/services/posts/editor/postBlockDocument.ts:3-18`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `tests/vitest/posts/post-block-catalog-search.test.ts`
- `tests/vitest/ui/post-block-inserter-wave.test.tsx`
- `tests/vitest/ui-integration/post-block-inserter.test.tsx`
- `tests/vitest/posts/postBlockDocument.test.ts`
- `tests/vitest/posts/post-block-runtime-renderer.test.tsx`

## Security Contract

- Visibility: internal admin block inserter plus public read-only runtime
  rendering if new blocks are accepted.
- Auth model: unchanged internal admin session/API-key path for editing.
- RBAC: unchanged `content:write` for post edits and public read-only runtime
  for published posts.
- CSRF: unchanged for post mutations.
- Rate-limit buckets: unchanged `admin_write` and `public_read`.
- Reject-unknown validation: new block types, if any, must be strict typed
  values in `POST_BLOCK_TYPES` and normalized through the existing document
  normalizer.
- Anti-abuse:
  - no unsupported catalog labels,
  - no unsafe iframe/file URL rendering,
  - media references must stay bounded to allowed MIME/runtime contracts,
  - public runtime output must be sanitized and deterministic.

## Testing Requirements

- For search copy/scope:
  - `tests/vitest/posts/post-block-catalog-search.test.ts`
  - `tests/vitest/ui/post-block-inserter-wave.test.tsx`
  - `tests/vitest/ui-integration/post-block-inserter.test.tsx`
- For new media block capabilities, if accepted:
  - `tests/vitest/posts/postBlockDocument.test.ts`
  - `tests/vitest/posts/post-block-normalizer-writing-canvas.test.ts`
  - `tests/vitest/posts/post-block-runtime-renderer.test.tsx`
  - `tests/vitest/posts/post-block-transforms.test.ts`
  - relevant editor canvas/inserter suites
- Manual Playwright:
  - search placeholder reflects active category,
  - searching inside Media does not show Text/Interactive blocks,
  - accepted media blocks can be inserted and rendered or the report is updated
    to show the capability remains open.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` if block capability changes
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Active-category search scope is clear in UI copy and covered by tests.
2. Media tab does not advertise unsupported capabilities.
3. `Video`, `Gallery`, `Audio`, and `File` are either implemented across the
   full Posts block contract or remain explicitly open in the source report with
   named owners.
