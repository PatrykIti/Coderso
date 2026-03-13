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
- deeper drag-state, toolbar, and slot-interaction coverage for `BlockList`
- direct interaction coverage for `WizardPanel`
- direct interaction coverage for `WidgetPicker`
- direct Vitest coverage for `blockTransforms`
- deeper direct Vitest coverage for `FieldRenderer`
- direct `happy-dom` branch coverage for `PageTable`
- direct interactive coverage for `BlockSettings`
- direct helper-export coverage for `PostRichTextAdapter`
- richer helper-export coverage for `PostRichTextAdapter` clipboard image fallbacks, custom layout html, and remaining paste-mode branches
- direct interaction coverage for `PostRichTextToolbar`
- direct DOM interaction coverage for `PostRichTextAdapter` toolbar fallback callbacks, slash insert flow, rich-text paste directives, and clipboard image upload/unavailable states
- deeper selection, formatting, and image-layout interaction coverage for `PostRichTextAdapter`
- deeper command engine, link flow, and slash-close coverage for `PostRichTextAdapter`
- direct DOM coverage for `postRichTextCommandEngine`
- direct `happy-dom` branch coverage for `PostsTable`
- direct interaction coverage for `PostEditorCanvas`
- deeper preview, adapter-callback, and image-picker coverage for `PostEditorCanvas`
- direct hook lifecycle and editor callback coverage for `usePostEditorState`
- deeper `PageListPage` coverage for filters, cache refresh, and create-without-open flow
- deeper `PageListPage` lifecycle, refresh, and action-error coverage
- deeper `PostsListPage` coverage for tag filters, cancelled deletes, and create-without-open flow
- deeper `PostsListPage` lifecycle, refresh, and action-error coverage
- direct `happy-dom` shell coverage for `PostClassicEditorShell`
- deeper preview, no-id, and classic-shell error coverage for `PostClassicEditorShell`
- direct interaction coverage for `DocumentInspector`
- direct interaction coverage for `BlockInspector`
- direct interaction coverage for `PostDetailsSidebar`

Current `2026-03-13` snapshot after the latest TASK-105-05 follow-up:
- `core/admin/ui/entries/EntryList.tsx` -> `94.21%` lines / `75.17%` branches
- `core/admin/ui/entries/FieldRenderer.tsx` -> `94.73%` lines / `83.33%` branches
- `core/admin/ui/pages/PageListPage.tsx` -> `95.45%` lines / `78.57%` branches
- `core/admin/ui/pages/PagePreview.tsx` -> `88.88%` lines / `91.66%` branches
- `core/admin/ui/pages/builder/BlockList.tsx` -> `90.80%` lines / `74.32%` branches
- `core/admin/ui/pages/builder/WizardPanel.tsx` -> `100%` lines / `100%` branches
- `core/admin/ui/pages/builder/WidgetPicker.tsx` -> `100%` lines / `100%` branches
- `core/admin/ui/posts/PostsListPage.tsx` -> `94.69%` lines / `73.01%` branches
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx` -> `92.06%` lines / `78.19%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `85.29%` lines / `70.09%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `86.47%` lines / `66.66%` branches
- `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts` -> `81.66%` lines / `72.05%` branches
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx` -> `98.50%` lines / `93.44%` branches
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx` -> `100%` lines / `100%` branches
- `core/admin/ui/posts/editor/inspector/PostDetailsSidebar.tsx` -> `100%` lines / `100%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `90.10%` lines / `74.33%` branches
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts` -> `98.27%` lines / `67.92%` branches

Remaining slices:
- `PageTable` and the remaining page-builder panels
- posts editor internals (`PostEditorCanvas`, `PostRichTextAdapter`) plus deeper classic-shell cleanup
- block/document inspector flows and related schema branches

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
