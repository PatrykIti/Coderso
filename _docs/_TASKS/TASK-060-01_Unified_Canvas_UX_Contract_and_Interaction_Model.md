# TASK-060-01: Unified Canvas UX Contract and Interaction Model
# FileName: TASK-060-01_Unified_Canvas_UX_Contract_and_Interaction_Model.md

**Priority:** High  
**Category:** Product UX / Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-060  
**Status:** To Do

---

## Overview
Zamknac finalny kontrakt UX dla post editora przed implementacja: jeden canvas, ribbon, list view, details i zachowania na desktop/mobile.

## Scope
1. Zdefiniowac sekcje ribbona i ich kolejnosc.
2. Zdefiniowac zachowanie list view (widocznosc, szerokosc, selekcja, reorder).
3. Zdefiniowac zachowanie details panelu (desktop/mobile).
4. Zdefiniowac interakcje selekcji bloku i focusu edytora.
5. Zdefiniowac fallback UX dla pustego dokumentu.

## Files to Create / Change
- `_docs/_TASKS/TASK-060_Post_Editor_Unified_Canvas_and_Ribbon_UX.md`
- `_docs/ARCHITECTURE.md`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` (contract comments + TODO anchors)
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx` (ribbon contract markers)

## Pseudocode
```ts
ribbonSections = [
  [saveDraft, publish],
  [undo, redo],
  [revisions, runtimePreview],
  [toggleOutline, openDetails],
  [insertBlockQuickActions]
];

layout.desktop = {
  outline: { width: "20%", min: 220, max: 320 },
  canvas: "remaining"
};

selectionFlow:
  clickBlock => select(blockId)
  select(blockId) => sync(outline, details, ribbonContext)
```

## Acceptance Criteria
1. Jest jednoznaczna specyfikacja UX bez konfliktu miedzy panelami.
2. Kazda akcja ma jedno miejsce w UI (brak duplikatow panel vs ribbon).
3. Kontrakt obejmuje desktop i mobile.

## Testing Requirements
- Unit:
  - brak (task kontraktowy).
- Verification:
  - checklist review przeciwko aktualnej implementacji,
  - potwierdzenie przez product/UX owner przed `060-02`.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (sekcja posts editor UX contract)
- `_docs/_TASKS/README.md` (status taska)
