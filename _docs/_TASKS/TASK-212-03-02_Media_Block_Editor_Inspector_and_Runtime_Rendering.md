# TASK-212-03-02: Media Block Editor Inspector and Runtime Rendering
# FileName: TASK-212-03-02_Media_Block_Editor_Inspector_and_Runtime_Rendering.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-212-03-01
**Status:** To Do

---

## Overview

Expose accepted media block types in the editor and render them safely at
runtime.

This leaf is where `Video`, `Gallery`, `Audio`, and `File` may become visible
in the Media tab, but only after the domain contract from `TASK-212-03-01`
exists.

This leaf also finalizes acceptance of any `POST_BLOCK_TYPES` additions from
`TASK-212-03-01`. If a type is not rendered here, it must remain absent from the
visible catalog and must not be claimed as an accepted persisted Posts block.

Current editor state to account for before implementation:

- `blockCatalog.ts` exposes only `Image` and `Embed` in the Media category.
- `PostEditorCanvas.tsx` has an image-only picker flow (`Select Image`) and
  filters selectable media to images.
- `MediaPicker.tsx` is already a shared picker with `accept`, `multiple`, and
  `maxItems`; extend that shared contract only when the existing API is
  insufficient for the accepted block types.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/blocks/blockCatalog.ts`
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/media/MediaPicker.tsx` only if accepted non-image media types
  require shared picker behavior beyond current `accept`/`multiple` support
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `tests/vitest/ui/post-block-inserter-wave.test.tsx`
- `tests/vitest/ui/block-inserter-wave.test.tsx`
- `tests/vitest/ui/post-editor-canvas-wave.test.tsx`
- `tests/vitest/ui/media-picker.test.tsx` if shared picker behavior changes
- `tests/vitest/posts/post-block-runtime-renderer.test.tsx`

## Implementation Direction

For each accepted type:

- Catalog:
  - add label, category `media`, description, and keywords.
- Canvas:
  - render a stable placeholder when empty;
  - render selected media preview when resolvable;
  - replace or scope the current image-only picker title/filter so non-image
    blocks cannot open a misleading image-only flow;
  - keep dimensions stable so inserting/selecting does not shift layout.
- Inspector:
  - expose only controls backed by normalized attrs;
  - use existing media picker APIs and MIME filters where possible.
  - gallery selection must use deterministic ordering and a bounded item count.
- Runtime:
  - map media ids through the runtime media resolver;
  - omit unsafe or unresolved media with a non-breaking placeholder when needed;
  - never render raw active HTML.
- Closure:
  - verify every type accepted by `POST_BLOCK_TYPES` is covered by catalog,
    canvas/inspector, normalizer, runtime mapper, runtime renderer, and tests;
  - if any requested media type is deferred, keep it out of the enum/catalog and
    name the deferral in the source report.

## Security Contract

- Visibility:
  - editor controls are internal admin;
  - runtime output is public read-only for published posts.
- Auth/RBAC/CSRF/rate-limit:
  - unchanged for admin post edits and media reads;
  - public runtime keeps existing read constraints.
- Reject-unknown validation:
  - UI cannot bypass the normalizer by injecting attrs outside the accepted
    schema;
  - no accepted enum value may be editor-only or runtime-only.
- Anti-abuse:
  - video/audio embeds must use safe media URLs or existing provider allowlist;
  - file blocks render safe links with `rel` and no active execution;
  - gallery caps item count and avoids layout-breaking unbounded content;
  - private media URLs must not be leaked into debug payloads or toast copy.

## Testing Requirements

- Inserter:
  - Media tab includes every accepted type;
  - active-category search still scopes to Media.
- Canvas/inspector:
  - inserting each block creates the right default UI;
  - controls update normalized attrs;
  - unsupported media states render stable empty placeholders.
  - the picker accepts only the MIME families supported by the selected block
    type and does not regress existing Image behavior.
- Runtime:
  - safe deterministic markup for each block type;
  - unresolved media does not crash runtime rendering;
  - unsafe raw URLs are omitted or sanitized.
- Manual Playwright:
  - insert each accepted block and publish/update without errors.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`

## Acceptance Criteria

1. The Media tab reflects the implemented contract exactly.
2. Public runtime rendering is safe and deterministic.
3. No accepted media block is editor-only or runtime-only.
4. Any deferred `Video`, `Gallery`, `Audio`, or `File` type remains absent from
   `POST_BLOCK_TYPES` and the catalog until it has full support.
