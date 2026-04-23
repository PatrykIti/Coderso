# TASK-204-03-02: Media Block Capability Contract for Video Gallery Audio File
# FileName: TASK-204-03-02_Media_Block_Capability_Contract_for_Video_Gallery_Audio_File.md

**Priority:** Medium
**Category:** CMS/Posts + Block Editor + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-204-03, TASK-204-03-01
**Status:** Done (2026-04-23)

---

## Overview

The replay says the Media tab is improved but still lacks `Video`, `Gallery`,
`Audio`, and `File`.

This is not a catalog-only tweak. A media block type is a product/runtime
surface. It must ship with strict type support, defaults, normalization,
editor affordances, runtime rendering, and tests before the source report can
mark `UX-4` fully fixed.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/posts/editor/postBlockDocument.ts:3-18`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts:72-106`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx` if accepted block
  types need block-specific controls
- `core/admin/ui/media/MediaPicker.tsx` only if media MIME filtering needs an
  existing prop extension
- `tests/vitest/posts/postBlockDocument.test.ts`
- `tests/vitest/posts/post-block-normalizer-writing-canvas.test.ts`
- `tests/vitest/posts/post-block-runtime-renderer.test.tsx`
- `tests/vitest/posts/post-block-transforms.test.ts`
- `tests/vitest/ui-integration/post-block-inserter.test.tsx`

## Implementation Notes

Before coding, decide the product contract for each requested type:

- `Video`: external embed URL only, uploaded media asset only, or both.
- `Gallery`: ordered image media IDs plus captions, limits, and empty state.
- `Audio`: uploaded audio media asset, external URL, or both.
- `File`: download card with media ID, label, size/type display, and safe public
  URL resolution.

If the accepted scope is smaller than all four types, update
`_docs/PLAYWRIGHT/SUMMARY-POSTS.md` to leave the remaining capability open with
the exact owner and reason. Do not mark `UX-4` fixed by adding unsupported labels.

This leaf must preserve the scoped-search contract from `TASK-204-03-01`.
Media work may extend the current catalog and editor/runtime contracts, but it
must not fork `BlockInserter`, add a second catalog search helper, or create
labels that normalize into unsupported block types.

## Security Contract

- Visibility: internal admin editor and public read-only post runtime.
- Auth/RBAC: unchanged admin post editing permissions.
- CSRF: unchanged for post mutations.
- Rate-limit buckets: unchanged.
- Reject-unknown validation:
  - every accepted type must be in `POST_BLOCK_TYPES`,
  - attrs/content are normalized through existing document normalizers,
  - unknown attrs are either stripped or explicitly preserved according to the
    current block contract.
- Anti-abuse:
  - block rendering must sanitize URLs and rich content,
  - external embeds must stay provider/URL bounded,
  - file/audio/video rendering must not expose private media or signed secrets,
  - gallery limits must prevent unbounded payload/rendering cost.

## Testing Requirements

- Contract:
  - accepted types are valid `PostBlockType` values,
  - invalid/legacy payloads normalize deterministically,
  - defaults are stable.
- Editor:
  - accepted media types appear in Media tab,
  - insert flow creates valid blocks,
  - inspector/canvas empty states are user-readable.
- Runtime:
  - published post renderer outputs safe deterministic HTML,
  - unsupported or invalid media references degrade safely.
- Manual Playwright:
  - accepted media block can be inserted and inspected,
  - report status records exactly which requested capabilities remain open.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The Media tab does not contain fake unsupported block labels.
2. Any accepted media block type works from catalog to editor to runtime.
3. Any deferred media capability remains explicitly open in the Playwright
   summary with named owners.
