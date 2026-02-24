# TASK-063-11-04: Right Sidebar Post/Block Tabs and Context
# FileName: TASK-063-11-04_Right_Sidebar_Post_Block_Tabs_and_Context.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-07-01, TASK-063-11-03  
**Status:** To Do

---

## Overview
Domknac prawy panel jako dwa stabilne taby:
- `Post` (ustawienia calego posta),
- `Block` (ustawienia zaznaczonego bloku).

Zachowanie ma byc kontekstowe i przewidywalne dla nietechnicznego usera.

---

## Scope
1. Standaryzacja nazewnictwa tabow (`Post`, `Block`).
2. Gdy brak selekcji bloku, `Block` pokazuje jasny empty/help state.
3. Klik w canvas block/placeholder automatycznie przełącza na `Block`.
4. Klik na root/document context wraca do `Post`.

---

## Security Contract
- **Visibility:** internal.
- **Auth model:** admin session/API key.
- **Rate-limit:** tylko ewentualny `user-settings` write/read.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`

---

## Pseudocode
```ts
if (selectedBlockId) {
  setDetailsTab("block");
} else {
  setDetailsTab("post");
}
```

---

## Acceptance Criteria
1. Prawy panel ma dwa taby: `Post` i `Block`.
2. Kontekst przełącza się automatycznie zgodnie z selekcją.
3. Empty state `Block` jest czytelny (co zrobić dalej).

---

## Testing Requirements
- Integration: tab switch + selection-driven context transitions.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
