# TASK-063-07-01: Tabbed Details Sidebar Shell
# FileName: TASK-063-07-01_Tabbed_Details_Sidebar_Shell.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-07  
**Status:** Done (2026-03-02)

---

## Overview
Wydzielic shell prawego panelu Details z tabami Document/Block.

---

## Scope
1. Dodac `PostDetailsSidebar` z tab switching.
2. Fallback do Document tab gdy brak selected block.
3. Wystawic API dla parent shella.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/inspector/PostDetailsSidebar.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `tests/integration/ui/post-editor-details-tabs.test.tsx`

---

## Pseudocode
```ts
activeTab = selectedBlock ? state.tab : "document"
render tablist + panel content
onTabChange -> save to preferences
```

---

## Acceptance Criteria
1. Panel Details ma stabilny model tabbed.
2. Brak crashy gdy block zostanie usuniety.

---

## Testing Requirements
- Integration: tab switching + fallback.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md`
