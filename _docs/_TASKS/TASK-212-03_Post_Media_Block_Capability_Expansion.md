# TASK-212-03: Post Media Block Capability Expansion
# FileName: TASK-212-03_Post_Media_Block_Capability_Expansion.md

**Priority:** Medium
**Category:** CMS/Posts + Block Editor + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-212, TASK-204-03-02, TASK-063
**Status:** To Do

---

## Overview

Close or explicitly re-scope `UX-4` from the 2026-04-25 Posts replay. The Media
tab currently exposes `Image` and `Embed`, while the report still expects
`Video`, `Gallery`, `Audio`, and `File`.

`TASK-204-03-02` correctly prevented fake catalog labels. This task is the
implementation path if the product decision is to make the missing media blocks
real.

## Sub-Tasks

- `TASK-212-03-01_Media_Block_Schema_Defaults_and_Normalization.md`
- `TASK-212-03-02_Media_Block_Editor_Inspector_and_Runtime_Rendering.md`

## Scope

- Add accepted media block types to the block document contract.
- Add deterministic defaults and normalizers.
- Add editor insertion, canvas placeholders, media picker/filter behavior, and
  inspector controls.
- Add safe public runtime mapping/rendering.
- Add tests across catalog, document, normalizer, editor, and runtime.
- Treat new `POST_BLOCK_TYPES` entries as release-atomic with editor and runtime
  support. The Posts API schema imports this enum directly, so no branch/PR may
  expose a newly accepted block type before the matching editor, normalizer,
  public runtime renderer, and regression tests are present.

Out of scope:

- catalog-only labels without runtime/editor support;
- arbitrary iframe/file rendering;
- media upload pipeline changes unless current picker APIs cannot select the
  required existing media assets;
- changing `Image` or `Embed` behavior except where shared media helpers become
  necessary.

## Files to Change

- `core/services/posts/editor/postBlockDocument.ts`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/admin/ui/posts/editor/postEditorStore.ts`
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts`
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `tests/vitest/posts/postBlockDocument.test.ts`
- `tests/vitest/posts/post-block-normalizer-writing-canvas.test.ts`
- `tests/vitest/posts/post-block-runtime-renderer.test.tsx`
- `tests/vitest/posts/post-block-transforms.test.ts`
- `tests/vitest/ui/post-block-inserter-wave.test.tsx`
- `tests/vitest/ui/block-inserter-wave.test.tsx`

## Security Contract

- Visibility:
  - insertion/editing is internal admin only;
  - rendered published media blocks are public read-only.
- Auth model:
  - editing uses existing admin auth;
  - runtime reads use existing public post rendering.
- RBAC:
  - `content:write` for editing post block documents;
  - existing media-library read permissions for admin picker data;
  - public runtime only renders media references already allowed by the runtime
    media contract.
- CSRF:
  - unchanged for post mutations;
  - no public write endpoints.
- Rate-limit bucket:
  - existing admin write/read and public read buckets.
- Reject-unknown validation:
  - block type additions must be explicit in `POST_BLOCK_TYPES`;
  - enum additions must land in the same closure slice as editor/runtime
    support, because the route validation schema accepts the enum immediately;
  - attrs/content must be normalized with clamped values and unknown unsafe
    fields dropped or rejected by existing normalizer rules.
- Anti-abuse:
  - no arbitrary script/HTML/object/embed payloads;
  - video/audio/file URLs must come from trusted media references or the
    existing safe embed-provider path;
  - file blocks must avoid executing active content and render safe links only;
  - gallery item count and captions must be bounded.

## Testing Requirements

- Pure/domain Vitest:
  - new block types accepted by `isPostBlockType`;
  - defaults are deterministic;
  - attrs/content normalize unknown and unsafe values safely.
- UI Vitest:
  - Media tab lists only supported media blocks;
  - each accepted block inserts and can be selected;
  - inspector controls update attrs without corrupting other block types.
- Runtime Vitest:
  - video/audio/file/gallery render safe deterministic markup;
  - unsafe URLs/providers are sanitized or omitted.
- API/schema guard:
  - when `POST_BLOCK_TYPES` changes, verify that persisted Posts payloads with
    every newly accepted type have matching runtime mapping/rendering coverage
    before closing this parent.
- Manual Playwright:
  - Media tab shows supported blocks;
  - each block can be inserted and does not break publish/update.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/CMS_API.md` if block document examples/contracts change
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Media tab no longer has a capability gap for the accepted scope.
2. Every visible Media block type is backed by schema/defaults, editor,
   normalizer, runtime, and tests.
3. If the product defers any requested media type, the source report says so
   explicitly and no unsupported label is shown.
4. No new block type is accepted by the Posts API without same-scope editor and
   runtime rendering proof.
