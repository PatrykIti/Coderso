# 414. TASK-105 Posts List And Classic Shell Jump

**Date:** 2026-03-11  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Posts
- Extended `PostsListPage` coverage around tag-based filtering, ignoring unrelated cache-bus events, cancelled delete flow, and create-without-editor-navigation when the open-after-create preference is off.
- Added a dedicated `happy-dom` shell wave for `PostClassicEditorShell` covering cached hydration, remote refresh, draft save, publish-or-update split, preview success/failure, metadata save validation, and remote-update conflict handling.
- Kept the larger jump inside the posts shell boundary instead of immediately expanding into `PostEditorCanvas`, so the coverage gain stays focused and reviewable.

### Coverage Progress
- Previous canonical full-lane snapshot after `413`: `62.00%` stmts / `52.60%` branch / `66.84%` funcs / `64.95%` lines
- Current canonical full-lane snapshot after this jump: `62.53%` stmts / `52.99%` branch / `67.18%` funcs / `65.54%` lines
- `core/admin/ui/posts/PostsListPage.tsx` moved to `79.54%` lines / `47.61%` branches
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx` moved to `91.00%` lines / `74.43%` branches

### Remaining Focus
- The next highest-value `TASK-105-05` posts work is now the heavier canvas and richtext internals: `PostEditorCanvas.tsx`, `PostRichTextAdapter.tsx`, and then the inspector stack.
- Outside the posts slice, `TASK-105-05` still has useful follow-ups in `PageTable` and the remaining page-builder panels.
