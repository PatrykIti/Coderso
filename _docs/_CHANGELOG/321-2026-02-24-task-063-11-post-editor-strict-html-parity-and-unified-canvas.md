# 321 - TASK-063-11 post editor strict HTML parity and unified canvas

Date: 2026-02-24  
Version: Unreleased  
Tasks: TASK-063-11, TASK-063-11-01, TASK-063-11-02, TASK-063-11-03, TASK-063-11-04, TASK-063-11-05, TASK-063-11-06

## Key Changes

### Strict shell parity refresh
- Reworked posts editor shell to the strict three-region contract:
  - left `Document Outline`,
  - center unified article canvas,
  - right details inspector.
- Added compact side-panel preference support in layout (`compactSidePanels`).

### Header workflow update
- Replaced previous topbar flow with right-side action contract:
  - `Preview`,
  - `Publish` / `Update`,
  - `Gear` (`Editor settings`).
- Kept operational controls (`Outline`, `Details`, `Revisions`, `Focus mode`) in the same header workflow without API changes.

### Outline-first insertion
- Added primary `+` trigger in `Document Outline` sidebar (`data-post-editor-outline-insert`).
- Insert actions now support `outline-plus` source and continue to use shared resolver (`resolvePostInsertMutation`).

### Unified article canvas
- Reworked center canvas to a single article-flow rendering model (without per-block cards/chrome).
- Added title input inside canvas (`Enter post title...`) for Gutenberg-like writing flow.
- Removed dependency on in-canvas appender as primary insertion path.

### Post/Block inspector context and media placeholders
- Right inspector tabs are now labeled `Post` / `Block`.
- Block selection switches details context to `Block`; clearing selection returns to `Post`.
- Added clickable canvas placeholders for `image`, `embed`, and `button` blocks that route users to block settings context.

### Editor settings modal and persistence
- Added `PostEditorSettingsDialog` opened from header gear.
- Persisted editor preferences locally:
  - storage key: `nextless.posts.editor.preferences.v1`,
  - options: focus on open, compact side panels, outline hints.

### Tests and quality gates
- Updated/added tests covering header, layout, outline insert, unified canvas, and settings dialog:
  - `tests/unit/posts/post-insert-flow.test.ts`
  - `tests/unit/ui/post-block-editor-shell.test.tsx`
  - `tests/unit/ui/post-editor-page.test.tsx`
  - `tests/integration/ui/post-editor-layout-shell.test.tsx`
  - `tests/integration/ui/post-editor-header-workflow.test.tsx`
  - `tests/integration/ui/post-editor-listview-outline.test.tsx`
  - `tests/integration/ui/post-editor-canvas-shared.test.tsx`
  - `tests/integration/ui/post-editor-smoke-regression.test.tsx`
  - `tests/integration/ui/post-editor-settings-dialog.test.tsx`
- Quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`

## Documentation
- Updated `_docs/ARCHITECTURE.md` with TASK-063-11 contracts.
- Updated `_docs/CMS_API.md` with header/outline-insert/details-context contracts.
- Updated `_docs/CODERSO_MODULES.md` with TASK-063-11 completion notes.
- Updated `_docs/_TASKS/README.md` and TASK-063-11 task/subtask statuses.
