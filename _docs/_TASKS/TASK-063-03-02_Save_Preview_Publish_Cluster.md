# TASK-063-03-02: Save Preview Publish Cluster
# FileName: TASK-063-03-02_Save_Preview_Publish_Cluster.md

**Priority:** High  
**Category:** Admin/UI + Workflow  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-03-01  
**Status:** Done (2026-02-24)

---

## Overview
Zaimplementowac prawy cluster akcji dokumentu: saved-state, preview, publish.

---

## Scope
1. Wydzielic `PostEditorActionCluster`.
2. Spiac `saveDraft`, `preview`, `publish`, `status` z `usePostEditorState`.
3. Pokazac czytelne stany: saving, unsaved, published, preview loading.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`

---

## Pseudocode
```ts
if dirty => show Unsaved
preview() => optional silent save then open modal
publish() => save/publish chain with error mapping
```

---

## Acceptance Criteria
1. Save/Preview/Publish dzialaja bez reloadowania calosci edytora.
2. Status badges sa spójne z backend state.

---

## Testing Requirements
- Integration: draft->preview->publish scenarios.

---

## Documentation Updates Required
- `_docs/CMS_API.md`
