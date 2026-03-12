# TASK-105-05: Entries, Pages, and Posts Editor Wave
# FileName: TASK-105-05_Entries_Pages_Posts_Editor_Wave.md

**Priority:** High  
**Category:** QA + Editor UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-01  
**Status:** In Progress (2026-03-11)

---

## Overview

Drive deeper coverage across the heavy editor surfaces that still have large uncovered blocks.

## Priority Clusters

- `core/admin/ui/entries/*`
- `core/admin/ui/pages/*`
- `core/admin/ui/posts/*`

## Target Behaviors

- editor shell states
- drawers and inspector branches
- cached vs empty vs populated render states
- action clusters and settings flows

## Pseudocode

```ts
renderEditorShell();
renderWithSelection();
renderWithEmptyData();
assertInspectorAndDrawerStates();
```

## Acceptance Criteria

1. Major editor shells cover their real branch states.
2. Large uncovered editor modules materially drop in uncovered lines.

## Progress Notes

Completed slices:
- direct `happy-dom` shell coverage for `EntryList`
- direct query/close coverage for `PagePreview`
- deeper interaction coverage for `BlockList`
- direct Vitest coverage for `blockTransforms`
- deeper direct Vitest coverage for `FieldRenderer`
- direct `happy-dom` branch coverage for `PageTable`
- direct interactive coverage for `BlockSettings`
- direct helper-export coverage for `PostRichTextAdapter`
- richer helper-export coverage for `PostRichTextAdapter` clipboard image fallbacks, custom layout html, and remaining paste-mode branches
- direct interaction coverage for `PostRichTextToolbar`
- direct DOM interaction coverage for `PostRichTextAdapter` toolbar fallback callbacks, slash insert flow, rich-text paste directives, and clipboard image upload/unavailable states
- deeper selection, formatting, and image-layout interaction coverage for `PostRichTextAdapter`
- direct `happy-dom` branch coverage for `PostsTable`
- direct interaction coverage for `PostEditorCanvas`
- direct hook lifecycle and editor callback coverage for `usePostEditorState`
- deeper `PageListPage` coverage for filters, cache refresh, and create-without-open flow
- deeper `PostsListPage` coverage for tag filters, cancelled deletes, and create-without-open flow
- direct `happy-dom` shell coverage for `PostClassicEditorShell`

Current `2026-03-12` snapshot after the latest TASK-105-05 follow-up:
- `core/admin/ui/entries/EntryList.tsx` -> `94.21%` lines / `75.17%` branches
- `core/admin/ui/entries/FieldRenderer.tsx` -> `94.73%` lines / `83.33%` branches
- `core/admin/ui/pages/PageListPage.tsx` -> `78.78%` lines / `51.78%` branches
- `core/admin/ui/pages/PagePreview.tsx` -> `88.88%` lines / `91.66%` branches
- `core/admin/ui/pages/builder/BlockList.tsx` -> `71.26%` lines / `63.51%` branches
- `core/admin/ui/posts/PostsListPage.tsx` -> `79.54%` lines / `47.61%` branches
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx` -> `91.00%` lines / `74.43%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `80.97%` lines / `61.41%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `90.10%` lines / `74.33%` branches
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts` -> `98.27%` lines / `67.92%` branches

Remaining slices:
- `PageTable` and the remaining page-builder panels
- posts editor internals (`PostEditorCanvas`, `PostRichTextAdapter`) plus deeper classic-shell cleanup
- block/document inspector flows and related schema branches

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
