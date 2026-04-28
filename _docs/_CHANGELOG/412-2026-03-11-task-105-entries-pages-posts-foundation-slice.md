# 412. TASK-105 Entries Pages Posts Foundation Slice

**Date:** 2026-03-11  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor Coverage
- Added a new `happy-dom` shell wave for `EntryList` covering cached hydration, forced refresh, filter state, selection, bulk actions, create flows, navigation, and cache-bus refreshes.
- Extended page-side coverage with direct `PagePreview` query parsing and close-preview behavior plus deeper `BlockList` interaction coverage for keyboard selection, drag/drop token guards, and slot insert or move flows.
- Added a direct Vitest suite for post `blockTransforms` so the pure transform contract now contributes to the shipped Vitest lane instead of relying only on the older Bun unit coverage.

### Coverage Progress
- Previous canonical full-lane snapshot after `411`: `60.90%` stmts / `51.47%` branch / `65.56%` funcs / `63.81%` lines
- Current canonical full-lane snapshot after this slice: `61.76%` stmts / `52.25%` branch / `66.57%` funcs / `64.70%` lines
- `core/admin/ui/entries/EntryList.tsx` moved to `94.21%` lines / `75.17%` branches
- `core/admin/ui/pages/PagePreview.tsx` moved to `88.88%` lines / `91.66%` branches
- `core/admin/ui/pages/builder/BlockList.tsx` moved to `71.26%` lines / `63.51%` branches
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts` moved to `98.27%` lines / `67.92%` branches

### Remaining Focus
- The next highest-value `TASK-105-05` work remains in heavier editor internals: `FieldRenderer`, page list or builder panels, and the posts editor shells (`PostClassicEditorShell`, `PostEditorCanvas`, `PostRichTextAdapter`) plus inspector flows.
- `TASK-105` still has larger non-wave backlog outside this slice, but `entries/pages/posts` is now active instead of still being only a planned lane.
