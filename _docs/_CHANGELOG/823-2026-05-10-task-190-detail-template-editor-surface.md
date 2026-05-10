# 823 - TASK-190 detail template editor surface

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-06, TASK-190-06-03, TASK-190-06-03-02

## Key Changes

### Admin UI

- Added the Engine-owned detail-template editor route at
  `/admin/advanced/engine/:contentTypeId/collection/detail-template/:detailPageId`.
- Reused the existing page-builder surface for detail templates:
  `EditorShell`, `LibraryPanel`, `BlockList`, `BlockSettings`, shared block
  utilities, widget registry, and `RuntimePreviewDialog`.
- Added a bounded sample-entry picker backed by `entriesClient.ts` and wired
  preview to the existing `detailPagesClient.previewDetailPage(...)` lifecycle.
- Wired save, autosave, publish, unpublish, restore, and autosave discard
  through the existing detail-page admin client instead of adding route-local
  fetch helpers.
- Linked canonical detail-page rows from the collection workspace to the new
  editor with shared `AdminLink` prefetch.

### Cache and Prefetch

- Added a specific detail-template prefetch target before the generic Engine
  prefix so hover/focus warmup loads the workspace summary, detail-page record,
  content-types list, and bounded sample entries with `{ force: false }`.

### Docs and Board

- Marked `TASK-190-06-03-02` done.
- Updated architecture, CMS API, assistant builder, admin cache, admin cache
  map, and TASK-190 board notes.

## Validation

- `bun run test:vitest -- tests/vitest/ui/detail-template-editor.test.tsx tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/collection-workspace.test.tsx`
  - 4 files passed / 28 tests passed.
