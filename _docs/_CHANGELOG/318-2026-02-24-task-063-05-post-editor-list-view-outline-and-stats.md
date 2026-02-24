# 318 - TASK-063-05 post editor list view, outline, and stats

Date: 2026-02-24  
Version: Unreleased  
Tasks: TASK-063-05, TASK-063-05-01, TASK-063-05-02, TASK-063-05-03

## Key Changes

### Document stats selectors
- Added `buildPostDocumentStats` for deterministic post editor metrics:
  - `words`,
  - `characters`,
  - `readingTimeMinutes`,
  - `headings`,
  - `paragraphs`,
  - `blocks`.
- Stats include text from heading/paragraph/list/writing-canvas nodes and selected metadata fields (for example button labels and image alt/caption).

### Outline builder with validation
- Added `buildPostDocumentOutline` for heading outline derived from:
  - `heading` blocks,
  - `writing-canvas` heading nodes.
- Added heading hierarchy warnings:
  - `empty_heading`,
  - `skipped_heading_level`,
  - `multiple_h1`.
- Added shared stable anchor helpers (`resolvePostStableAnchorId`) and reused them in runtime mapper to keep editor outline and runtime TOC anchor behavior aligned.

### Document Overview sidebar UI
- Added `PostListViewSidebar` to replace plain list-only secondary sidebar mode.
- Sidebar now provides:
  - `List view` tab (existing block order/reorder panel),
  - `Outline` tab (heading navigation + warning indicators),
  - always-visible stats section.
- Integrated sidebar into `PostBlockEditorShell` list-view mode.

### QA
- Added/updated tests:
  - `tests/unit/posts/post-document-stats.test.ts`,
  - `tests/unit/posts/post-document-outline.test.ts`,
  - `tests/integration/ui/post-editor-listview-outline.test.tsx`,
  - runtime regression coverage remains green (`post-block-runtime-renderer`).
- Quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test`

## Documentation
- Updated `_docs/ARCHITECTURE.md` with TASK-063-05 selector/sidebar ownership.
- Updated `_docs/CMS_API.md` with document overview selector and outline contract.
- Updated `_docs/CODERSO_MODULES.md` with TASK-063-05 progression entry.
- Updated `_docs/_TASKS/README.md` and TASK-063-05 task statuses.
