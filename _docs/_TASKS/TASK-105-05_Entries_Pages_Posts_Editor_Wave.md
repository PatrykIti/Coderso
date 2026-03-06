# TASK-105-05: Entries, Pages, and Posts Editor Wave
# FileName: TASK-105-05_Entries_Pages_Posts_Editor_Wave.md

**Priority:** High  
**Category:** QA + Editor UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-01  
**Status:** To Do

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

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
