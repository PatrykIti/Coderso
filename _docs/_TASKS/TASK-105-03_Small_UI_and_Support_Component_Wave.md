# TASK-105-03: Small UI and Support Component Wave
# FileName: TASK-105-03_Small_UI_and_Support_Component_Wave.md

**Priority:** Medium  
**Category:** QA + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-01  
**Status:** To Do

---

## Overview

Cover the remaining tiny UI files and support components that still sit at `0-20%`.

## Priority Files

- `core/admin/ui/themes/ThemeEditorPage.tsx`
- `core/admin/ui/redirects/RedirectsPage.tsx`
- `core/admin/ui/forms/FormCanvas.tsx`
- `core/admin/ui/pages/BlockLibrary.tsx`
- `core/admin/ui/themes/ThemeRoutesEditor.tsx`
- `core/admin/ui/themes/ThemeTokensEditor.tsx`
- `core/admin/ui/media/MediaDetailsPanel.tsx`
- `core/admin/ui/store/PluginFilters.tsx`

## Pseudocode

```ts
renderComponentWithMinimalProps();
assertVisibleCopyAndActions();
assertEmptyAndNonEmptyStates();
```

## Acceptance Criteria

1. Small leaf UI files no longer remain at or near `0%`.
2. Tests cover real render paths and empty/loading/copy states.

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
