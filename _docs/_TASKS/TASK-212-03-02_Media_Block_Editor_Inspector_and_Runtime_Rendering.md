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

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/blocks/blockCatalog.ts`
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `tests/vitest/ui/post-block-inserter-wave.test.tsx`
- `tests/vitest/ui/block-inserter-wave.test.tsx`
- `tests/vitest/posts/post-block-runtime-renderer.test.tsx`

## Implementation Direction

For each accepted type:

- Catalog:
  - add label, category `media`, description, and keywords.
- Canvas:
  - render a stable placeholder when empty;
  - render selected media preview when resolvable;
  - keep dimensions stable so inserting/selecting does not shift layout.
- Inspector:
  - expose only controls backed by normalized attrs;
  - use existing media picker APIs and MIME filters where possible.
- Runtime:
  - map media ids through the runtime media resolver;
  - omit unsafe or unresolved media with a non-breaking placeholder when needed;
  - never render raw active HTML.

## Security Contract

- Visibility:
  - editor controls are internal admin;
  - runtime output is public read-only for published posts.
- Auth/RBAC/CSRF/rate-limit:
  - unchanged for admin post edits and media reads;
  - public runtime keeps existing read constraints.
- Reject-unknown validation:
  - UI cannot bypass the normalizer by injecting attrs outside the accepted
    schema.
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
