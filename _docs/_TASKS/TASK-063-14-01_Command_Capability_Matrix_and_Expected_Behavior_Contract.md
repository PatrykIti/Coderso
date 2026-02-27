# TASK-063-14-01: Command Capability Matrix and Expected Behavior Contract
# FileName: TASK-063-14-01_Command_Capability_Matrix_and_Expected_Behavior_Contract.md

**Priority:** High  
**Category:** Admin/UI + UX Contract  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-14  
**Status:** To Do

---

## Overview
Przygotowac jawny kontrakt: ktore komendy sa dostepne dla ktorego bloku i co dokladnie robia.

---

## Scope
1. Zdefiniowac matrix `blockType -> allowed toolbar commands`.
2. Zdefiniowac semantyke komend (`Paragraph`, `Quote`, `List`, `Align`, `Heading levels`).
3. Zdefiniowac zasady fallbackow i no-op (kiedy nie ma aktywnej selekcji).

---

## Detailed File-Level Plan
1. `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
   - dodac sekcje "Formatting command capability matrix".
2. `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
   - dodac kontrakt propsow `profile` i mapowanie visible actions.
3. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - przekazywac profil toolbara zaleznie od typu bloku.
4. `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
   - oznaczyc pola do usuniecia z duplikacji (do 063-14-05).

---

## Pseudocode
```ts
type ToolbarProfile = "writing-canvas" | "paragraph" | "heading" | "quote";

const COMMAND_MATRIX: Record<ToolbarProfile, PostRichTextCommand[]> = {
  "writing-canvas": [...],
  "paragraph": [...],
  "heading": [...],
  "quote": [...],
};
```

---

## Acceptance Criteria
1. Mamy zatwierdzony matrix komend per block type.
2. Dla kazdej komendy jest opisany expected behavior i edge-cases.
3. Matrix jest referencja dla implementacji i testow kolejnych subtaskow.

---

## Testing Requirements
- Unit (new):
  - `tests/unit/ui/post-editor-richtext-toolbar-profiles.test.ts`
    - profile expose only allowed commands.
    - heading profile has reduced command set.

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/CODERSO_MODULES.md`
