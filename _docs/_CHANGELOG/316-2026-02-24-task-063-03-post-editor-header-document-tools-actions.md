# 316 - TASK-063-03 post editor header document tools and actions

Date: 2026-02-24  
Version: Unreleased  
Tasks: TASK-063-03, TASK-063-03-01, TASK-063-03-02, TASK-063-03-03

## Key Changes

### Header modularization
- Replaced topbar monolith with modular header components:
  - `PostEditorHeader`,
  - `PostEditorDocumentTools`,
  - `PostEditorActionCluster`.
- `PostEditorTopBar` now acts as a thin wrapper around `PostEditorHeader`.

### Document tools cluster
- Added Gutenberg-like document tools actions in one cluster:
  - `Add` (inserter toggle),
  - `Undo`,
  - `Redo`,
  - `Document overview` (list-view toggle).
- Added explicit a11y labels and shortcut hints (`title` attributes) for editor actions.

### Save/preview/publish action cluster
- Added dedicated workflow cluster with:
  - document status badge (`Draft/Published/...`),
  - sync badge (`Saving...`, `Unsaved changes`, `Autosaved at ...`, `Published`),
  - actions: `Save draft`, `Runtime preview`, `Publish`/`Update`.
- Kept existing internal posts API contract and silent save strategy (no new endpoints).

### Integration and regression coverage
- Integrated new header into `PostBlockEditorShell` layout header region.
- Added regression coverage for header rendering and state behavior.
- Updated existing post editor UI tests to match new header contracts.

### QA
- Quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test`

## Documentation
- Updated `_docs/ARCHITECTURE.md` with TASK-063-03 header workflow ownership.
- Updated `_docs/CMS_API.md` with posts editor header action flow notes.
- Updated `_docs/CODERSO_MODULES.md` with TASK-063-03 progress entry.
- Updated `_docs/_TASKS/README.md` and TASK-063-03 task statuses.
