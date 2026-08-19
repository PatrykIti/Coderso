# TASK-105-05: Entries, Pages, and Posts Editor Wave
# FileName: TASK-105-05_Entries_Pages_Posts_Editor_Wave.md

**Priority:** High  
**Category:** QA + Editor UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-01  
**Status:** ✅ Done (2026-08-19 closure; 2026-08-19 rebaseline)

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
- deeper `PageEditor` coverage for page-default mobile insert flows, slot insertion/move behavior, publish cleanup without refreshed data, unload warnings, and API-specific shell errors across page/settings/revision flows
- deeper `PostRichTextToolbar` coverage for default writing-canvas fallback, partial typography controls, and disabled grouped-control behavior
- deeper `BlockInserter` coverage for wrapped keyboard navigation, category reset behavior, empty-result no-op handling, and disabled keyboard guards
- deeper `PostRichTextAdapter` coverage for non-list Enter insertion, collapsed inline wrapper range resolution from element/trailing offsets, clipboard `files` fallback uploads, and invalid selected-image layout normalization
- deeper `PostEditorCanvas` coverage for delete/replace-image flows, mixed list preview rendering, and provider-specific embed URL fallbacks
- deeper `PostRichTextToolbar` coverage for base-text-scale-only controls and mouse-down focus-guard behavior
- deeper `PostRichTextAdapter` coverage for loose-root list wrapping, native list fallback without selection, slash-close when slash syntax is removed, and cancelled link-prompt no-op behavior
- stabilized `bun run test:coverage` by stopping the coverage wrapper from double-cleaning the reports directory after the wrapper already recreates `coverage/vitest/.tmp`
- deeper `PostBlockEditorShell` coverage for focus-restore layout persistence and shell-driven list-view close behavior with outline focus return
- deeper `usePostEditorState` coverage for writing-flow normalization helpers, decoded route-id parsing, and draft-sync guard helpers
- deeper `PostEditorCanvas` coverage for selected callout typography/profile routing, custom TOC preview copy, direct-url image preview metadata, and styled button preview behavior
- deeper `usePostEditorState` coverage for in-flight delete guarding, invalid selected-block no-ops, and attribute patching when block attrs are not records
- deeper `PostRichTextAdapter` helper coverage for clipboard image extraction, default insert HTML escaping, and paste-mode resolution helpers
- deeper `PostRichTextAdapter` coverage for multi-warning paste-hint suffixes, default non-Error upload failure messaging, and typography-class mapping across serif/mono scales
- deeper `PageEditor` coverage for wrapper image fallback, empty-block initial selection null, refresh fallback to `defaultBlocks`, and settings save/autosave payload fallback when `currentData` is missing

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

Current `2026-03-14` snapshot after the latest page-editor reorder and shell-error follow-up:
- `core/admin/ui/pages/PageEditor.tsx` -> `85.45%` lines / `68.60%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `96.66%` lines / `86.90%` branches
- `core/admin/ui.posts.editor.PostBlockEditorShell.tsx` -> `95.34%` lines / `83.80%` branches
- `core/admin/ui.posts.editor.richtext.PostRichTextAdapter.tsx` -> `90.09%` lines / `72.28%` branches
- `core/admin/ui.posts.editor.richtext.PostRichTextToolbar.tsx` -> `86.48%` lines / `84.21%` branches
- `core/admin/ui.posts.editor.blocks.BlockInserter.tsx` -> `89.85%` lines / `76.27%` branches

Updated remaining slices after this micro-follow-up:
- page-owned work is still led by `PageEditor.tsx`, but its remaining shell-state backlog is smaller after reordering and error-path coverage
- editor chrome still concentrates on `PostRichTextToolbar.tsx`, `BlockInserter.tsx`, and the remaining `PostRichTextAdapter.tsx` branches

Current `2026-03-14` snapshot after the latest page-editor state and editor chrome input follow-up:
- `core/admin/ui/pages/PageEditor.tsx` -> `95.15%` lines / `77.57%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `96.66%` lines / `86.90%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `83.80%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `90.07%` lines / `76.13%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `92.45%` lines / `75.18%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `86.48%` lines / `85.96%` branches
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` -> `98.55%` lines / `81.35%` branches

Updated remaining slices after this follow-up:
- page-owned shell work is no longer centered on a large `PageEditor.tsx` gap; the remaining page-side residue is mostly narrower shell/load edges plus any residual `BlockList` support branches
- posts/editor chrome now gets the best ROI from `PostRichTextToolbar.tsx`, `PostRichTextAdapter.tsx`, `PostEditorCanvas.tsx`, and smaller residual `PostBlockEditorShell.tsx` / `usePostEditorState.ts` async edges

Current `2026-03-14` snapshot after the latest editor canvas, adapter, and toolbar follow-up:
- `% Stmts`: `69.01`
- `% Branch`: `59.75`
- `% Funcs`: `72.51`
- `% Lines`: `72.19`
- `458` Vitest files / `1691` tests
- `core/admin/ui/pages/PageEditor.tsx` -> `95.15%` lines / `77.57%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `79.45%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `83.80%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `76.63%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `90.54%` lines / `87.71%` branches
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` -> `98.55%` lines / `81.35%` branches

Updated remaining slices after this follow-up:
- editor-shell ROI is now mostly concentrated in smaller `PageEditor.tsx` residue, `PostBlockEditorShell.tsx`, `usePostEditorState.ts`, and any remaining `PostEditorCanvas.tsx` higher-order preview/media edges
- editor chrome follow-up is no longer centered on `BlockInserter.tsx`; the most relevant remaining chrome work is the residual `PostRichTextAdapter.tsx` / `PostRichTextToolbar.tsx` branches while the broader program tail is increasingly dominated by low-line admin surfaces outside this wave

Current `2026-03-14` snapshot after the latest shell/state/canvas branch-hardening follow-up:
- `% Stmts`: `69.01`
- `% Branch`: `59.91`
- `% Funcs`: `72.51`
- `% Lines`: `72.19`
- `458` Vitest files / `1691` tests
- `core/admin/ui/pages/PageEditor.tsx` -> `95.15%` lines / `77.57%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `88.57%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `85.49%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `80.08%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `76.63%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `90.54%` lines / `87.71%` branches

Updated remaining slices after this follow-up:
- current `TASK-105-05` ROI is no longer in broad shell gaps; it is mostly residual async/media/preview branches across `PageEditor.tsx`, `PostEditorCanvas.tsx`, `usePostEditorState.ts`, `PostRichTextAdapter.tsx`, and `PostRichTextToolbar.tsx`
- the overall program tail is now increasingly shaped by broader low-line admin backlog outside this editor-focused wave rather than by any single large editor surface

Current `2026-03-14` snapshot after the latest hook/helper follow-up:
- `% Stmts`: `69.03`
- `% Branch`: `59.95`
- `% Funcs`: `72.51`
- `% Lines`: `72.19`
- `458` Vitest files / `1698` tests
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `88.57%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `85.49%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `80.56%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `76.63%` branches

Updated remaining slices after this follow-up:
- the next `TASK-105-05` ROI is now concentrated in residual async/media/preview edges rather than in helper-export coverage; the helper-owning surfaces are no longer the best leverage point
- broader low-line admin backlog still dominates the overall program tail once the current editor wave is squeezed further

Current `2026-03-14` snapshot after the latest adapter paste and typography follow-up:
- `% Stmts`: `69.03`
- `% Branch`: `60.00`
- `% Funcs`: `72.51`
- `% Lines`: `72.19`
- `458` Vitest files / `1698` tests
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `85.49%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `80.56%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `78.44%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `90.54%` lines / `87.71%` branches

Updated remaining slices after this follow-up:
- current `TASK-105-05` ROI is concentrated in residual adapter/media/preview edges and smaller async shell residue rather than broad component gaps
- once these last editor-specific branches flatten further, the next meaningful gains will likely come from shifting focus to broader low-line admin backlog or back to `TASK-105-04`

Current `2026-03-14` snapshot after the latest page-editor fallback follow-up:
- `% Stmts`: `69.05`
- `% Branch`: `60.09`
- `% Funcs`: `72.52`
- `% Lines`: `72.21`
- `459` Vitest files / `1705` tests
- `core/admin/ui/pages/PageEditor.tsx` -> `95.45%` lines / `82.51%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `88.57%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `85.49%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `80.56%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `78.44%` branches

Updated remaining slices after this follow-up:
- `PageEditor.tsx` is no longer a large branch outlier, so the next `TASK-105-05` ROI is concentrated in residual adapter/media/async edges rather than broad page-shell behavior
- broader low-line admin backlog keeps getting relatively more important as the editor wave compresses


## Current authoritative rebaseline (2026-08-19, HEAD 3c470092, FINAL closure state)

All numbers below come from the final canonical full-lane run generated TODAY
at this HEAD plus the TASK-105-05 test wave (`bun scripts/run-vitest-coverage.ts`,
artifact `coverage/vitest/coverage-summary.json`, regenerated at closure from
the final working tree). Aggregates are weighted
(`sum covered / sum total`), the same method the artifact `total` entry uses.
Percentages are rendered as `floor(100 * covered / total) / 100` (truncation),
matching the artifact `pct` fields and the report `All files` row.
Lane totals: `81.54` stmts / `73.30` branch / `81.18` funcs / `84.59` lines.

Every `2026-03-14` snapshot above is HISTORICAL. Since then `PageEditor.tsx`
was rewritten (Page Editor V2, commit `ddc85ca4` 2026-06-14; latest change
`6cc44880` 2026-07-09; now `5204` physical lines) and
`PageSettingsDrawer.tsx` was DELETED in that same V2 commit. All references
to `PageSettingsDrawer.tsx` in the historical progress notes above are
history only: its settings surface now lives inline inside `PageEditor.tsx`
(`pageSettingsPanelOpen` compact side-inspector panel). No current slice may
target the deleted file. The historical `95.45% / 82.51%` claim for
`PageEditor.tsx` was superseded by the `84.47% / 74.13%` rebaseline regression
and recovered to the FINAL state below within this wave. New in-scope surfaces
also appeared: `core/admin/ui/pages/editor/*`,
`core/admin/ui/pages/editorControls/*`, and
`core/admin/ui/pages/templates/*`.

Cluster aggregates (weighted, lines / branches):

- `core/admin/ui/entries/*` -> `93.76%` lines / `83.56%` branches, `31` files (`1264/1348` lines, `1022/1223` branches)
- `core/admin/ui/pages/*` -> `94.50%` lines / `82.29%` branches, `48` files (`2890/3058` lines, `2492/3028` branches)
- `core/admin/ui/posts/*` -> `96.72%` lines / `84.81%` branches, `44` files (`4130/4270` lines, `3168/3735` branches)

Per-file snapshot (`lines% / branches%`, covered/total):

Entries (31):

- `entries/EntryBulkActionsBar.tsx` -> `100.00 / 71.42` (`3/3`, `10/14`)
- `entries/EntryCreateDrawer.tsx` -> `96.38 / 91.48` (`80/83`, `43/47`)
- `entries/EntryDeleteDialog.tsx` -> `50.00 / 75.00` (`1/2`, `3/4`)
- `entries/EntryEditor.tsx` -> `90.03 / 80.00` (`298/331`, `192/240`)
- `entries/EntryEditorHeader.tsx` -> `100.00 / 100.00` (`1/1`, `10/10`)
- `entries/EntryFieldSections.tsx` -> `100.00 / 55.00` (`8/8`, `11/20`)
- `entries/EntryFieldsPlaceholder.tsx` -> `100.00 / 100.00` (`3/3`, `2/2`)
- `entries/EntryFilters.tsx` -> `75.00 / 100.00` (`6/8`, `4/4`)
- `entries/EntryGrid.tsx` -> `94.44 / 88.88` (`17/18`, `16/18`)
- `entries/EntryList.tsx` -> `93.72 / 75.00` (`224/239`, `129/172`)
- `entries/EntryMetadataPanel.tsx` -> `90.24 / 86.36` (`111/123`, `133/154`)
- `entries/EntryRevisionDrawer.tsx` -> `100.00 / 83.82` (`47/47`, `57/68`)
- `entries/EntryTable.tsx` -> `96.29 / 81.81` (`26/27`, `36/44`)
- `entries/EntryTitleSlugFields.tsx` -> `75.00 / 100.00` (`3/4`, `0/0`)
- `entries/EntryTypeSidebar.tsx` -> `96.96 / 76.92` (`32/33`, `30/39`)
- `entries/FieldRenderer.tsx` -> `99.04 / 92.16` (`104/105`, `153/166`)
- `entries/contentTypeLabels.ts` -> `100.00 / 100.00` (`4/4`, `4/4`)
- `entries/entryChecklist.ts` -> `95.12 / 93.33` (`39/41`, `56/60`)
- `entries/entryEditorVisit.ts` -> `100.00 / 77.77` (`30/30`, `14/18`)
- `entries/entryFieldGroups.ts` -> `100.00 / 77.27` (`25/25`, `17/22`)
- `entries/entryLinkedFields.ts` -> `100.00 / 100.00` (`3/3`, `0/0`)
- `entries/entryMetadataUpdate.ts` -> `91.66 / 92.85` (`11/12`, `26/28`)
- `entries/entrySlug.ts` -> `100.00 / 100.00` (`1/1`, `0/0`)
- `entries/entryValueMapping.ts` -> `84.37 / 71.42` (`27/32`, `20/28`)
- `entries/useEntryEditTracker.ts` -> `100.00 / 100.00` (`35/35`, `13/13`)
- `entries/useEntryRelationTargets.ts` -> `96.15 / 100.00` (`25/26`, `8/8`)
- `entries/useEntryRevisions.ts` -> `100.00 / 95.83` (`38/38`, `23/24`)
- `entries/useEntryRuntimePreview.ts` -> `100.00 / 100.00` (`22/22`, `6/6`)
- `entries/useEntrySnapshotAuthority.ts` -> `100.00 / 100.00` (`11/11`, `0/0`)
- `entries/useEntryTaxonomyIntent.ts` -> `100.00 / 100.00` (`17/17`, `0/0`)
- `entries/useEntryTaxonomyTermCreate.ts` -> `75.00 / 60.00` (`12/16`, `6/10`)

Pages (48):

- `pages/DeviceSwitcher.tsx` -> `100.00 / 100.00` (`11/11`, `8/8`)
- `pages/PageBulkActionsBar.tsx` -> `100.00 / 71.42` (`3/3`, `10/14`)
- `pages/PageCreateDrawer.tsx` -> `86.95 / 81.48` (`20/23`, `22/27`)
- `pages/PageEditor.tsx` -> `91.06 / 79.31` (`1243/1365`, `1070/1349`)
- `pages/PageEditorPage.tsx` -> `100.00 / 100.00` (`1/1`, `0/0`)
- `pages/PageFilters.tsx` -> `100.00 / 100.00` (`3/3`, `2/2`)
- `pages/PageList.tsx` -> `100.00 / 100.00` (`1/1`, `0/0`)
- `pages/PageListPage.tsx` -> `95.40 / 79.59` (`187/196`, `78/98`)
- `pages/PagePreview.tsx` -> `88.88 / 91.66` (`8/9`, `11/12`)
- `pages/PageRevisionDrawer.tsx` -> `100.00 / 71.73` (`24/24`, `33/46`)
- `pages/PageRowActions.tsx` -> `100.00 / 100.00` (`4/4`, `2/2`)
- `pages/PageTable.tsx` -> `100.00 / 90.00` (`25/25`, `18/20`)
- `pages/builder/AdminWidgetPreviewRuntimeBridge.tsx` -> `92.85 / 50.00` (`13/14`, `3/6`)
- `pages/builder/AdvancedPanel.tsx` -> `100.00 / 100.00` (`11/11`, `9/9`)
- `pages/builder/BlockList.tsx` -> `91.39 / 77.52` (`85/93`, `69/89`)
- `pages/builder/BlockSettings.tsx` -> `97.22 / 80.52` (`105/108`, `153/190`)
- `pages/builder/BlockToolbar.tsx` -> `100.00 / 100.00` (`1/1`, `0/0`)
- `pages/builder/FormPicker.tsx` -> `100.00 / 94.11` (`13/13`, `16/17`)
- `pages/builder/LayoutPanel.tsx` -> `100.00 / 83.33` (`23/23`, `5/6`)
- `pages/builder/LibraryPanel.tsx` -> `100.00 / 100.00` (`3/3`, `3/3`)
- `pages/builder/VisualPanel.tsx` -> `96.55 / 87.30` (`28/29`, `55/63`)
- `pages/builder/WidgetPicker.tsx` -> `92.85 / 95.23` (`26/28`, `20/21`)
- `pages/builder/WizardPanel.tsx` -> `100.00 / 100.00` (`6/6`, `7/7`)
- `pages/builder/blockUtils.ts` -> `99.12 / 85.89` (`226/228`, `201/234`)
- `pages/builder/bookingFlowContext.ts` -> `100.00 / 66.66` (`6/6`, `4/6`)
- `pages/builder/types.ts` -> `0.00 / 0.00` (`0/0`, `0/0`)
- `pages/builder/widgetRegistry.ts` -> `100.00 / 100.00` (`1/1`, `0/0`)
- `pages/editor/FloatingEditorToolbar.tsx` -> `100.00 / 87.50` (`4/4`, `7/8`)
- `pages/editor/PageAuthoringCanvas.tsx` -> `99.27 / 86.43` (`274/276`, `223/258`)
- `pages/editor/PageEditorCommandPalette.tsx` -> `100.00 / 100.00` (`15/15`, `14/14`)
- `pages/editor/PageEditorLayers.tsx` -> `95.00 / 93.10` (`19/20`, `27/29`)
- `pages/editor/pageEditorHostContract.ts` -> `100.00 / 100.00` (`10/10`, `10/10`)
- `pages/editor/pageEditorLabels.ts` -> `100.00 / 86.66` (`14/14`, `13/15`)
- `pages/editor/pageEditorOptions.ts` -> `100.00 / 93.75` (`20/20`, `15/16`)
- `pages/editorControls/ColorSwatchControl.tsx` -> `100.00 / 87.75` (`31/31`, `43/49`)
- `pages/editorControls/ComboboxControl.tsx` -> `92.20 / 89.09` (`71/77`, `98/110`)
- `pages/editorControls/FacetListControl.tsx` -> `98.82 / 78.08` (`84/85`, `57/73`)
- `pages/editorControls/ListItemsControl.tsx` -> `95.23 / 82.35` (`20/21`, `14/17`)
- `pages/editorControls/MediaPickerControl.tsx` -> `100.00 / 80.00` (`3/3`, `4/5`)
- `pages/editorControls/SegmentedControl.tsx` -> `96.15 / 91.42` (`25/26`, `32/35`)
- `pages/editorControls/SliderControl.tsx` -> `100.00 / 83.33` (`9/9`, `5/6`)
- `pages/editorControls/SliderStepperControl.tsx` -> `100.00 / 100.00` (`11/11`, `8/8`)
- `pages/editorControls/ToggleSwitch.tsx` -> `100.00 / 90.90` (`4/4`, `10/11`)
- `pages/editorControls/controlChrome.ts` -> `100.00 / 100.00` (`42/42`, `12/12`)
- `pages/editorControls/index.ts` -> `0.00 / 0.00` (`0/0`, `0/0`)
- `pages/templates/PageTemplateEditorPage.tsx` -> `100.00 / 75.00` (`58/58`, `39/52`)
- `pages/templates/PageTemplatesPage.tsx` -> `94.36 / 88.23` (`67/71`, `45/51`)
- `pages/templates/usePageTemplates.ts` -> `100.00 / 85.00` (`32/32`, `17/20`)

Posts (44):

- `posts/PostEditorPage.tsx` -> `100.00 / 85.00` (`33/33`, `17/20`)
- `posts/PostsCreateDrawer.tsx` -> `100.00 / 86.36` (`21/21`, `19/22`)
- `posts/PostsListPage.tsx` -> `99.53 / 79.04` (`214/215`, `83/105`)
- `posts/PostsTable.tsx` -> `95.23 / 95.65` (`20/21`, `22/23`)
- `posts/editor/PostBlockEditorShell.tsx` -> `91.35 / 81.55` (`243/266`, `168/206`)
- `posts/editor/PostClassicEditorShell.tsx` -> `97.52 / 78.99` (`354/363`, `252/319`)
- `posts/editor/PostEditorCanvas.tsx` -> `97.75 / 87.01` (`348/356`, `402/462`)
- `posts/editor/PostEditorTopBar.tsx` -> `100.00 / 100.00` (`1/1`, `2/2`)
- `posts/editor/PostRevisionDrawer.tsx` -> `97.87 / 73.21` (`46/47`, `41/56`)
- `posts/editor/blocks/BlockInserter.tsx` -> `98.43 / 83.58` (`63/64`, `56/67`)
- `posts/editor/blocks/PostListViewPanel.tsx` -> `100.00 / 94.59` (`51/51`, `35/37`)
- `posts/editor/blocks/SlashCommandMenu.tsx` -> `100.00 / 83.33` (`4/4`, `5/6`)
- `posts/editor/blocks/blockCatalog.ts` -> `100.00 / 94.44` (`27/27`, `17/18`)
- `posts/editor/blocks/blockDnD.ts` -> `100.00 / 96.00` (`23/23`, `24/25`)
- `posts/editor/blocks/blockTransforms.ts` -> `98.14 / 67.92` (`53/54`, `36/53`)
- `posts/editor/header/PostEditorActionCluster.tsx` -> `100.00 / 83.33` (`1/1`, `5/6`)
- `posts/editor/header/PostEditorDocumentTools.tsx` -> `100.00 / 50.00` (`1/1`, `2/4`)
- `posts/editor/header/PostEditorHeader.tsx` -> `92.30 / 95.91` (`12/13`, `47/49`)
- `posts/editor/hooks/useFocusReturn.ts` -> `96.15 / 82.14` (`25/26`, `23/28`)
- `posts/editor/hooks/usePostAutosave.ts` -> `100.00 / 90.90` (`23/23`, `10/11`)
- `posts/editor/hooks/usePostEditorLayout.ts` -> `100.00 / 96.82` (`66/66`, `61/63`)
- `posts/editor/hooks/usePostEditorPreferences.ts` -> `98.38 / 86.36` (`61/62`, `19/22`)
- `posts/editor/hooks/usePostEditorShortcuts.ts` -> `100.00 / 72.72` (`62/62`, `56/77`)
- `posts/editor/hooks/usePostEditorState.ts` -> `93.87 / 84.67` (`1043/1111`, `735/868`)
- `posts/editor/inspector/BlockInspector.tsx` -> `95.12 / 91.54` (`78/82`, `65/71`)
- `posts/editor/inspector/DocumentInspector.tsx` -> `96.42 / 78.04` (`27/28`, `32/41`)
- `posts/editor/inspector/InspectorSection.tsx` -> `100.00 / 60.00` (`3/3`, `3/5`)
- `posts/editor/inspector/PostDetailsSidebar.tsx` -> `100.00 / 100.00` (`4/4`, `6/6`)
- `posts/editor/inspector/inspectorSchemas.ts` -> `100.00 / 100.00` (`29/29`, `12/12`)
- `posts/editor/layout/PostEditorLayout.tsx` -> `100.00 / 94.73` (`25/25`, `54/57`)
- `posts/editor/layout/PostEditorRegions.tsx` -> `100.00 / 100.00` (`5/5`, `0/0`)
- `posts/editor/outline/PostDocumentOutline.tsx` -> `100.00 / 91.30` (`16/16`, `21/23`)
- `posts/editor/outline/PostDocumentStats.tsx` -> `100.00 / 100.00` (`3/3`, `0/0`)
- `posts/editor/postEditorStore.ts` -> `99.37 / 91.81` (`158/159`, `101/110`)
- `posts/editor/postExternalUpdateAuthority.ts` -> `100.00 / 100.00` (`13/13`, `7/7`)
- `posts/editor/postInsertFlow.ts` -> `89.47 / 85.71` (`17/19`, `12/14`)
- `posts/editor/postMetadataMutationPayload.ts` -> `100.00 / 89.47` (`23/23`, `34/38`)
- `posts/editor/richtext/PostRichTextAdapter.tsx` -> `98.92 / 82.74` (`644/651`, `465/562`)
- `posts/editor/richtext/PostRichTextToolbar.tsx` -> `90.54 / 88.52` (`67/74`, `54/61`)
- `posts/editor/richtext/postRichTextBlockTransforms.ts` -> `100.00 / 100.00` (`13/13`, `16/16`)
- `posts/editor/richtext/postRichTextCommandEngine.ts` -> `99.44 / 91.91` (`179/180`, `125/136`)
- `posts/editor/settings/PostEditorSettingsDialog.tsx` -> `100.00 / 50.00` (`11/11`, `2/4`)
- `posts/editor/settings/postEditorPreferences.ts` -> `93.33 / 94.11` (`14/15`, `16/17`)
- `posts/editor/sidebars/PostListViewSidebar.tsx` -> `100.00 / 100.00` (`6/6`, `6/6`)

## Wave outcome (final)

All priority targets of this wave are closed at the final canonical run:

- **PageEditor shell:** `PageEditor.tsx` (`84.47/74.13`, `212` uncovered
  lines / `349` uncovered branches) -> `91.06/79.31` (`122` uncovered lines /
  `279` uncovered branches): inline settings panel, section/block selection and
  insertion, mobile insert, unload warnings, and async load/preview/revision
  failure branches covered through the real shell.
- **Pages editor surfaces:** `PageAuthoringCanvas.tsx` (`84.42/75.58` ->
  `99.27/86.43`): inline text editing, mark-toolbar apply/restore, link
  seeding/unlink, caret placement and keyboard commit paths. Also
  `pageEditorOptions.ts` (`85.00/75.00` -> `100.00/93.75`),
  `PageEditorCommandPalette.tsx` (-> `100.00/100.00`), `WidgetPicker.tsx`
  (-> `92.85/95.23`), `LibraryPanel.tsx` (-> `100.00/100.00`),
  `bookingFlowContext.ts` (-> `100.00/66.66`), `PageListPage.tsx`
  (-> `95.40/79.59`).
- **Pages templates:** `PageTemplatesPage.tsx` (`40.85/33.33` ->
  `94.36/88.23`), `PageTemplateEditorPage.tsx` (`55.17/32.69` ->
  `100.00/75.00`), `usePageTemplates.ts` (`28.12/5.00` -> `100.00/85.00`):
  list loading/cached/error states, create/duplicate/delete flows, status
  filtering, editor save/validation/load branches, cacheBus error branches.
- **Entries:** `EntryList.tsx` (`80.33/59.30` -> `93.72/75.00`),
  `EntryRevisionDrawer.tsx` (-> `100.00/83.82`), `useEntryRevisions.ts`
  (-> `100.00/95.83`), `useEntryRuntimePreview.ts` (-> `100.00/100.00`),
  `entryMetadataUpdate.ts` (-> `91.66/92.85`), `entryChecklist.ts`
  (-> `95.12/93.33`), `FieldRenderer.tsx` (-> `99.04/92.16`).
- **Posts:** `PostBlockEditorShell.tsx` (`89.85/81.55` -> `91.35/81.55`),
  `PostClassicEditorShell.tsx` (`93.94/76.49` -> `97.52/78.99`),
  `PostEditorCanvas.tsx` (`92.70/85.71` -> `97.75/87.01`),
  `usePostEditorState.ts` (`93.07/83.41` -> `93.87/84.67`),
  `postEditorStore.ts` (`86.16/68.18` -> `99.37/91.81`),
  `postRichTextCommandEngine.ts` (`90.56/80.15` -> `99.44/91.91`),
  `PostRichTextAdapter.tsx` (`94.16/78.47` -> `98.92/82.74`),
  `PostsListPage.tsx` (`94.88/71.43` -> `99.53/79.04`).

Oversized test files were split with assertions preserved (all originals
deleted, split files <=1000 physical lines, independently runnable):
`page-editor-v2-flow` (6813 -> shell/settings/insertion/failures/builder-
chrome/columns/controls/inline-edit/panels/responsive + shared fixtures),
`post-editor-state-hook-wave` (6500 -> crud/revisions/media/normalization/
refresh-revisions + shared fixtures), `post-richtext-adapter-wave` (1893 ->
paste/slash/upload/toolbar/commands/command-engine/clear-formatting/inline-
typography/block-transform/adapter-edges + fixtures), `post-editor-canvas-wave`
(1884 -> media/blocks/embeds/canvas-panels + fixtures), `page-post-list-wave`
(1803 -> page-list-wave + post-list-wave + fixtures), `post-block-editor-shell-
wave` (1678 -> layout-wave + actions-wave + fixtures), `page-authoring-canvas`
(1138 -> selection/links-dock/branches-wave + fixtures), and the post-audit
`blockSettings-wave.test.tsx` split (see Execution notes).

Non-blocking residue (explicitly out of scope for this wave, tracked as
follow-up backlog): `EntryDeleteDialog.tsx` (`50.00 / 75.00`, 1 line gap),
`EntryFieldSections.tsx` branches (`11/20`), `EntryTitleSlugFields.tsx`
(`3/4`), `EntryFilters.tsx` (`6/8`), `useEntryTaxonomyTermCreate.ts`
(`12/16`), `AdminWidgetPreviewRuntimeBridge.tsx` (`13/14`, `3/6`),
`BlockList.tsx` (`85/93`), `PostRichTextToolbar.tsx` (`67/74`),
`useFocusReturn.ts` (`25/26`), `postInsertFlow.ts` (`17/19`), and
`PostEditorHeader.tsx` (`12/13`). These are small single-line/branch leaves;
they do not block the wave acceptance (`material drop in uncovered lines`
achieved for every priority surface).

## Execution notes

Per-slice implementation pseudocode (Vitest, happy-dom):

```ts
// render-with-state: mount the surface with service mocks seeded for the
// branch under test, then assert the VISIBLE effect (text, aria-*, disabled
// attribute), never mere control presence.
renderWithState(<PageTemplatesPage />, { templates: [], isLoading: false });
expect(screen.getByText(/no templates/i)).toBeInTheDocument();

// assert-branch: error paths seed the rejection and await the settled
// alert/retry surface; cached vs empty vs populated states seed the cache
// read explicitly (getCachedPageTemplates -> items, undefined, []).
vi.mocked(listPageTemplatesCached).mockRejectedValueOnce(apiError("templates_list_failed"));
renderWithState(<PageTemplatesPage />, {});
expect(await screen.findByRole("alert")).toHaveTextContent("load");

// callback-invoke: capture emitted handlers and drive success AND failure
// variants (confirm/deny dialogs, save -> autosave fallback, cacheBus
// revalidation), including the skipped-subscription branch for hooks with
// `skip` options.
const { result } = renderHook(() => usePageTemplates({ skip: true }));
await act(async () => { await result.current.refresh(true); });
```

Test-file split plan (>1000-line gate; each split file must stay independently
runnable in the Vitest lane, pattern: named suites + shared fixture module):

- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx` (`6500`): split by
  hook responsibility -> `usePostEditorState-crud.test.tsx`,
  `usePostEditorState-revisions.test.tsx`,
  `usePostEditorState-media.test.tsx`,
  `usePostEditorState-normalization.test.tsx`; shared builders ->
  `postEditorStateFixtures.tsx`.
- `tests/vitest/ui/page-editor-v2-flow.test.tsx` (`6813`): split by editor
  subsystem -> `page-editor-shell-flow.test.tsx`,
  `page-editor-settings-flow.test.tsx`,
  `page-editor-insertion-flow.test.tsx`,
  `page-editor-failures.test.tsx`; shared harness ->
  `pageEditorV2Fixtures.tsx`.
- `tests/vitest/ui/post-richtext-adapter-wave.test.tsx` (`1893`): split by
  adapter responsibility -> `post-richtext-paste.test.tsx`,
  `post-richtext-slash.test.tsx`, `post-richtext-upload.test.tsx`.
- `tests/vitest/ui/post-editor-canvas-wave.test.tsx` (`1884`): split by canvas
  flow -> `post-editor-canvas-media.test.tsx`,
  `post-editor-canvas-blocks.test.tsx`,
  `post-editor-canvas-embeds.test.tsx`.
- `tests/vitest/ui/page-post-list-wave.test.tsx` (`1803`): split by page
  ownership -> `page-list-wave.test.tsx`, `post-list-wave.test.tsx`
  (shared mock factory -> `pagePostListFixtures.tsx`).
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx` (`1678`): split by
  shell responsibility -> `post-block-editor-shell-layout.test.tsx`,
  `post-block-editor-shell-actions.test.tsx`.
- `tests/vitest/ui/page-authoring-canvas.test.tsx` (`1138`): split by canvas
  behavior -> `page-authoring-canvas-selection.test.tsx`,
  `page-authoring-canvas-dnd.test.tsx` (shared
  `pageAuthoringCanvasFixtures.tsx`).
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` (`1058`): split by
  behavior (executed at closure after a post-implementation drift-audit
  finding; the tests are wizard/live-preview/repeatable-slots behaviors, not
  tokens/layout as originally guessed) ->
  `blockSettings-wizard-wave.test.tsx` (`344` lines, `9` tests),
  `blockSettings-slots-wave.test.tsx` (`425` lines, `4` tests), shared
  `blockSettingsFixtures.tsx` (`324` lines); all `13` tests and assertions
  preserved, both split files green in the Vitest lane, original deleted.

**Changelog pin:** `1321` (TASK-105-05), reserved per stream plan
(`1309-1319` are reserved for S1/S3); the live
`_docs/_CHANGELOG/README.md` records the `1320/1321/1322` reservations;
`1320` consumed by TASK-105-04 closure and `1321` by this closure
(2026-08-19), `1322` stays reserved for the deferred TASK-105-06.


## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
