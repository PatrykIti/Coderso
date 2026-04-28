# TASK-063-15-04: Section Toolbar Grouping Heading List Code and A11y
# FileName: TASK-063-15-04_Section_Toolbar_Grouping_Heading_List_Code_and_A11y.md

**Priority:** High  
**Category:** Admin/UI + UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-15-03  
**Status:** Done (2026-03-02)

---

## Overview
Przeorganizowac toolbar dla `Section` na grupy akcji, zgodnie z oczekiwanym UX:
1. Grupa `Heading`: `Paragraph` + `H1..H6` z jednego przycisku/menu.
2. Grupa `List`: `Bullet` + `Ordered` z jednego przycisku/grupy.
3. Grupa `Code`: `Inline code` + `Code block` z jednego przycisku/grupy.

---

## Scope
1. Wprowadzic grouped controls w `PostRichTextToolbar` dla profilu `writing-canvas`.
2. Utrzymac selection-safe interaction (`onMouseDown` preventDefault) i a11y (`aria-expanded`, keyboard nav, labels).
3. Zachowac compatibility z profile matrix i istniejacym dispatch `onCommand`.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
   - dodac grouped UI actions:
     - heading dropdown (radio-like selection),
     - list grouped action,
     - code grouped action.
   - zachowac aktywne stany ikon/labeli i backward compatibility z `primaryActions/advancedActions`.
2. `core/admin/components/ui/dropdown-menu.tsx` (reuse only)
   - wykorzystac istniejacy primitive; bez nowego komponentu framework-level, o ile niepotrzebny.
3. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - bez zmiany kontraktu profilu; ewentualne doprecyzowanie przekazywania active states.

---

## Acceptance Criteria
1. `Paragraph/H1..H6` sa dostepne z jednego grouped control.
2. `Bullet/Ordered` sa dostepne z jednego grouped control.
3. `Inline code/Code block` sa dostepne z jednego grouped control.
4. Klikniecia grouped controls nie zrywaja aktywnej selekcji.
5. Keyboard i screen-reader a11y sa zachowane.

---

## Testing Requirements (Target)
- Unit:
  - `tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx`
    - grouped actions widoczne tylko tam, gdzie dozwolone.
  - `tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
    - grouped action dispatch mapuje do poprawnych command IDs.
- Integration:
  - `tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx` (new)
    - otwieranie heading/list/code group i wybor akcji.
    - `aria-expanded` + focus navigation.
    - click dispatch -> adapter command execution.
  - `tests/integration/ui/post-richtext-toolbar.test.tsx`
    - update existing smoke assertions pod nowy grouped UX.

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` (toolbar IA notes)

---

## Closure Note (2026-03-02)
Toolbar dla profilu `writing-canvas` zostal przeorganizowany na grouped controls (`Headings`, `List`, `Code`) na bazie `DropdownMenu`, z pokryciem testami integration/unit dla visibility i dispatch.
