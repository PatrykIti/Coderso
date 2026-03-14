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
- deeper drag-state and drop-fallback coverage for `PostListViewPanel`
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
- direct hook coverage for `usePostEditorLayout`
- direct `VisualPanel` coverage for variant fallback, variant descriptions, generic variant button routing, and visual callback forwarding
- direct `EntryBulkActionsBar` coverage for disabled/applying state plus apply/clear callback forwarding
- direct `EntryTable` coverage for empty state, title render variants, selection styling, author/date fallbacks, and checkbox callbacks
- direct `PostEditorLayout` coverage for `viewportMode="auto"`, mobile close handlers, and compact desktop sidebars
- direct `PostDocumentOutline` coverage for warning labels, outline checks, active selection styling, and empty fallback
- direct `inspectorSchemas` coverage for option catalogs, block style scope, and normalization helpers
- deeper command engine coverage for list-root wrapping, unsupported command fallback, and list-to-heading conversion
- direct `PostEditorPage` coverage for async settings-mode resolution, query override fetch skip, and block fallback on settings failure
- direct `PageSettingsDrawer` coverage for auto-slug generation, slug-touch preservation, dirty-close autosave, save skip-autosave, and custom template fallback
- deeper `PageEditor` coverage for path-derived page id, generic load/preview failures, and template/revision fetch failures
- deeper `PostBlockEditorShell` coverage for loading render, secondary/details reopen paths, and cancelled trash flow
- deeper `PostEditorCanvas` coverage for direct-url media skip, unresolved lookup fallback, bare media patching, generic picker load failure, and focus/scroll side-effects
- deeper `PostRichTextAdapter` coverage for image upload count/result fallbacks, mixed-content slash selection, directive forwarding on insert fallback, and generic upload failures
- deeper `usePostEditorState` coverage for revision drawer toggles and generic restore/upload/delete failure handling
- direct `DeviceSwitcher` coverage for controlled and uncontrolled state transitions
- direct `PageRowActions` coverage for publish/unpublish/delete availability and callback routing
- direct `PostListViewSidebar` coverage for tab switching, insert catalog routing, and child callback forwarding
- direct `PostRichTextToolbar` coverage for writing-canvas/heading profile groups and advanced formatting toggles
- direct `BlockInserter` coverage for most-used rendering, category filtering, disabled insertion, and keyboard insertion
- deeper `PageSettingsDrawer` coverage for default section layout controls, background media URL state, and additional local drawer branches
- deeper `PostRichTextAdapter` coverage for paste-hint timeout clearing, image layout selection via keyboard, and additional slash/image cleanup behavior

Current `2026-03-14` snapshot after the latest follow-up slice:
- `core/admin/ui/entries/EntryList.tsx` -> `94.21%` lines / `75.17%` branches
- `core/admin/ui/entries/FieldRenderer.tsx` -> `94.73%` lines / `83.33%` branches
- `core/admin/ui/entries/EntryTable.tsx` -> `94.11%` lines / `92.00%` branches
- `core/admin/ui/entries/EntryBulkActionsBar.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/pages/PageListPage.tsx` -> `95.45%` lines / `78.57%` branches
- `core/admin/ui/pages/PagePreview.tsx` -> `88.88%` lines / `91.66%` branches
- `core/admin/ui/pages/PageEditor.tsx` -> `74.54%` lines / `58.29%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `73.33%` lines / `70.23%` branches
- `core/admin/ui/pages/builder/BlockList.tsx` -> `90.80%` lines / `74.32%` branches
- `core/admin/ui/pages/builder/VisualPanel.tsx` -> `100.00%` lines / `92.30%` branches
- `core/admin/ui/pages/builder/WizardPanel.tsx` -> `100%` lines / `100%` branches
- `core/admin/ui/pages/builder/WidgetPicker.tsx` -> `100%` lines / `100%` branches
- `core/admin/ui/posts/PostsListPage.tsx` -> `94.69%` lines / `73.01%` branches
- `core/admin/ui/posts/PostEditorPage.tsx` -> `72.72%` lines / `60.00%` branches
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx` -> `92.06%` lines / `78.19%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `75.96%` lines / `58.09%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `85.29%` lines / `70.09%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `86.47%` lines / `66.66%` branches
- `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts` -> `90.55%` lines / `79.41%` branches
- `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx` -> `100%` lines / `94.59%` branches
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx` -> `98.50%` lines / `93.44%` branches
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx` -> `100%` lines / `100%` branches
- `core/admin/ui/posts/editor/inspector/PostDetailsSidebar.tsx` -> `100%` lines / `100%` branches
- `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx` -> `100.00%` lines / `94.23%` branches
- `core/admin/ui/posts/editor/outline/PostDocumentOutline.tsx` -> `100.00%` lines / `91.30%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `90.10%` lines / `74.33%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts` -> `100%` lines / `96.07%` branches
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts` -> `98.27%` lines / `67.92%` branches

Remaining slices:
- page-builder follow-up has moved off `VisualPanel`; the remaining builder work is concentrated in `BlockList` support and broader `PageEditor` / `PageSettingsDrawer` shells
- entries follow-up should now focus on any remaining editor-shell header/table support (`EntryEditorHeader`, residual `EntryEditor`, `EntryChecklist`)
- posts follow-up should focus on `PostBlockEditorShell`, `PostEditorPage`, `PostEditorCanvas`, `PostRichTextAdapter`, and `usePostEditorState`
- broader `PageEditor` / `PageSettingsDrawer` state coverage still sits inside this wave even though the first list/table/page slices already landed

Current `2026-03-14` snapshot after the deeper editor shell/canvas/state slice:
- `core/admin/ui/pages/PageEditor.tsx` -> `78.78%` lines / `63.67%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `82.22%` lines / `79.76%` branches
- `core/admin/ui/posts/PostEditorPage.tsx` -> `100.00%` lines / `85.00%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `82.94%` lines / `63.80%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `89.33%` lines / `72.50%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `87.26%` lines / `68.47%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `91.66%` lines / `76.54%` branches

Updated remaining slices:
- pages follow-up is now led by the remaining `PageEditor` and `PageSettingsDrawer` failure/mobile/state branches
- posts follow-up is now concentrated in `PostBlockEditorShell`, `PostEditorCanvas`, `PostRichTextAdapter`, and the remaining async/service edges in `usePostEditorState`

Current `2026-03-14` snapshot after the page leaf / sidebar / toolbar / inserter slice:
- `core/admin/ui/pages/DeviceSwitcher.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/pages/PageRowActions.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx` -> `100.00%` lines / `85.71%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `86.48%` lines / `84.21%` branches
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` -> `85.50%` lines / `76.27%` branches
- `core/admin/ui/pages/PageEditor.tsx` -> `82.12%` lines / `64.12%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `82.22%` lines / `82.14%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `86.82%` lines / `69.52%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `90.07%` lines / `76.13%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `88.20%` lines / `70.10%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `79.20%` branches

Updated remaining slices after this follow-up:
- pages follow-up is now led by `PageEditor` and `PageSettingsDrawer`, while `DeviceSwitcher` and `PageRowActions` are effectively closed
- posts follow-up is now concentrated in `PostRichTextToolbar`, `BlockInserter`, `PostBlockEditorShell`, `PostRichTextAdapter`, and the remaining higher-order branches in `PostEditorCanvas` / `usePostEditorState`

Current `2026-03-14` snapshot after the latest page-settings and adapter follow-up:
- `core/admin/ui/pages/PageEditor.tsx` -> `83.03%` lines / `65.47%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `96.66%` lines / `86.90%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `83.80%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `89.46%` lines / `70.83%` branches

Updated remaining slices after this follow-up:
- page-owned work is now much more concentrated in `PageEditor.tsx`; `PageSettingsDrawer.tsx` is close to closure
- editor chrome still has the best remaining ROI in `PostRichTextToolbar.tsx`, `BlockInserter.tsx`, and residual `PostRichTextAdapter.tsx` branches

Current `2026-03-14` snapshot after the latest page-editor and adapter micro-follow-up:
- `core/admin/ui/pages/PageEditor.tsx` -> `84.84%` lines / `67.71%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `96.66%` lines / `86.90%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `83.80%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `90.09%` lines / `72.28%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `86.48%` lines / `84.21%` branches

Updated remaining slices after this micro-follow-up:
- page-owned work remains led by `PageEditor.tsx`
- editor chrome is still concentrated in `PostRichTextToolbar.tsx`, `BlockInserter.tsx`, and the remaining `PostRichTextAdapter.tsx` branches

Current `2026-03-14` snapshot after the latest page-editor, toolbar, inserter, and adapter follow-up:
- `core/admin/ui/pages/PageEditor.tsx` -> `84.84%` lines / `67.71%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `96.66%` lines / `86.90%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `83.80%` branches
- `core/admin/ui.posts/editor.richtext.PostRichTextAdapter.tsx` -> `90.09%` lines / `72.28%` branches
- `core/admin/ui.posts.editor.richtext.PostRichTextToolbar.tsx` -> `86.48%` lines / `84.21%` branches
- `core/admin/ui.posts.editor.blocks.BlockInserter.tsx` -> `89.85%` lines / `76.27%` branches

Updated remaining slices after this micro-follow-up:
- page-owned work remains led by `PageEditor.tsx`
- editor chrome still concentrates on `PostRichTextToolbar.tsx`, `BlockInserter.tsx`, and the remaining `PostRichTextAdapter.tsx` branches

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
