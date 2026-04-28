# 315 - TASK-063-02 post editor shell regions

Date: 2026-02-23  
Version: Unreleased  
Tasks: TASK-063-02, TASK-063-02-01, TASK-063-02-02, TASK-063-02-03

## Key Changes

### Layout state foundation
- Added `usePostEditorLayout` as a centralized reducer-based state model for editor panels:
  - secondary sidebar modes: `list-view` / `inserter`,
  - details sidebar open/close and active tab (`document` / `block`).
- Replaced local ad-hoc panel toggles in `PostBlockEditorShell` with shared layout actions.

### Region composition
- Added regionized shell components:
  - `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`,
  - `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`.
- Posts editor now renders explicit regions:
  - `header`,
  - `content`,
  - `secondary-sidebar`,
  - `sidebar`,
  - `footer`.
- Moved list view out of `PostEditorCanvas` into secondary sidebar region and kept canvas as a single shared writing surface.

### Responsive behavior
- Added responsive region contract:
  - desktop (`lg+`): sidebars rendered as fixed asides,
  - mobile: secondary/details regions rendered as sheets with the same panel state.
- State is preserved across viewport mode changes because panel ownership stays in `usePostEditorLayout`.

### QA
- Added/updated coverage for:
  - layout reducer state transitions,
  - region shell rendering,
  - desktop/mobile responsive region behavior,
  - updated canvas/list-view split assertions.
- Quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test`

## Documentation
- Updated `_docs/ARCHITECTURE.md` with TASK-063-02 shell architecture notes.
- Updated `_docs/CODERSO_MODULES.md` with posts editor shell progression entry.
- Updated `_docs/_TASKS/README.md` and TASK-063-02 task files statuses.
