# TASK-063-07-02: Inspector Refactor Document vs Block
# FileName: TASK-063-07-02_Inspector_Refactor_Document_vs_Block.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-07-01  
**Status:** Done (2026-03-02)

---

## Overview
Uporzadkowac sekcje DocumentInspector i BlockInspector, usuwajac duplikacje.

---

## Scope
1. Wydzielic shared helpery/controls.
2. Uporzadkowac kolejnosc kart i opisy user-friendly.
3. Ujednolicic walidacje inputow.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
- `tests/integration/ui/post-editor-details-tabs.test.tsx`

---

## Pseudocode
```ts
extract shared input fields to helper components
normalize labels/descriptions across tabs
wire onChange to central update actions
```

---

## Acceptance Criteria
1. Inspektory sa czytelne i spójne.
2. Mniej couplingu i powtarzalnego kodu.

---

## Testing Requirements
- Integration: metadata + block settings edits.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
