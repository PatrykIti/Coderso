# 320 - TASK-063-10 post editor stitch template and focus mode

Date: 2026-02-24  
Version: Unreleased  
Tasks: TASK-063-10, TASK-063-10-01, TASK-063-10-02, TASK-063-10-03, TASK-063-10-04, TASK-063-10-05

## Key Changes

### Stitch-like editor shell migration
- Updated posts editor shell composition toward the reference layout from `_docs/UI/admin_panel/46-post-editor/code.html`:
  - left outline rail,
  - center writing canvas,
  - right details inspector.
- Desktop sidebars now use tighter widths aligned with the new visual model (`w-64` left, `w-80` right).
- Details panel opens by default in posts editor to match the reference workflow.

### Focus mode (full-width writing)
- Added `focusMode` state to `usePostEditorLayout` reducer and public hook API.
- Added header `Focus mode` toggle.
- Enabling focus mode now:
  - closes secondary/details sidebars,
  - hides side panels in layout,
  - keeps center canvas full-width.
- Focus mode preference is persisted locally (`nextless.posts.editor.focusMode`).

### Floating plus appender
- Reworked in-canvas appender UI from text button to floating `+` affordance on divider line.
- Appender still uses shared insert flow (`appender` source + deterministic `index` target), preserving parity with sidebar/slash insert logic.

### Sidebar and canvas visual cleanup
- `PostListViewSidebar` moved to `Document Outline` framing with `Outline` as default tab.
- Removed extra inner card/header shell from center canvas for a cleaner writing surface.
- Kept editing/runtime behavior intact (save/autosave/revisions/preview/publish flows unchanged).

### Tests and quality gates
- Updated and extended tests for new layout/labels/focus-mode behavior:
  - `tests/unit/posts/post-editor-layout-state.test.ts`
  - `tests/integration/ui/post-editor-header-workflow.test.tsx`
  - `tests/integration/ui/post-editor-layout-responsive.test.tsx`
  - `tests/integration/ui/post-editor-canvas-shared.test.tsx`
  - `tests/integration/ui/post-editor-listview-outline.test.tsx`
  - `tests/integration/ui/post-editor-smoke-regression.test.tsx`
  - `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
  - `tests/integration/ui/post-autosave-flow.test.tsx`
- Quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`

## Documentation
- Updated `_docs/ARCHITECTURE.md` (TASK-063-10 shell/focus mode notes).
- Updated `_docs/CMS_API.md` (header flow naming + focus mode contract + appender wording).
- Updated `_docs/CODERSO_MODULES.md` (063-10 completion notes and terminology alignment).
- Updated `_docs/_TASKS/README.md` and TASK-063-10 task/subtask statuses.
