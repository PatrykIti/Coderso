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

Current `2026-03-11` snapshot after the first TASK-105-05 slice:
- `core/admin/ui/entries/EntryList.tsx` -> `94.21%` lines / `75.17%` branches
- `core/admin/ui/pages/PagePreview.tsx` -> `88.88%` lines / `91.66%` branches
- `core/admin/ui/pages/builder/BlockList.tsx` -> `71.26%` lines / `63.51%` branches
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts` -> `98.27%` lines / `67.92%` branches

Remaining slices:
- `FieldRenderer`, `PageListPage`, `PageTable`, and the remaining page-builder panels
- posts editor shells and internals (`PostClassicEditorShell`, `PostEditorCanvas`, `PostRichTextAdapter`)
- block/document inspector flows and related schema branches

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
