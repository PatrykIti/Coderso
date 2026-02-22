# TASK-060-05: Details Panel and Responsive Behavior
# FileName: TASK-060-05_Details_Panel_and_Responsive_Behavior.md

**Priority:** High  
**Category:** Admin/UI Responsive UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-060-03, TASK-060-04  
**Status:** To Do

---

## Overview
Ujednolicic dzialanie panelu `Details` w nowym modelu (ribbon + shared canvas) i utrzymac czytelny flow na mobile/tablet/desktop.

## Scope
1. `Details` otwierany przez ribbon przycisk (sheet/drawer behavior).
2. Kontekst panelu:
   - gdy blok zaznaczony -> `Block` settings,
   - gdy brak zaznaczenia -> `Document` settings.
3. Mobile:
   - pelnoekranowy sheet,
   - szybki powrot do canvasa bez utraty selekcji.
4. Desktop:
   - panel jako prawy sheet lub inline drawer (wg kontraktu 060-01),
   - brak konfliktu z outline i canvas.

## Files to Create / Change
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `tests/integration/ui/post-block-inspector.test.tsx`
- `tests/integration/ui/post-document-inspector.test.tsx`
- `tests/integration/ui/post-editor-responsive-panels.test.tsx` (new)

## Pseudocode
```ts
onOpenDetails():
  setDetailsOpen(true)

detailsMode = selectedBlockId ? "block" : "document"

if mobile:
  render Sheet(fullscreen=true)
else:
  render Sheet(width="380px")

onCloseDetails():
  preserveSelectionAndScrollState()
```

## Acceptance Criteria
1. `Details` dziala spójnie na wszystkich breakpointach.
2. Zmiana selekcji bloku aktualizuje panel bez migania/resetu.
3. Zamkniecie panelu nie resetuje focusu i pozycji w canvasie.

## Testing Requirements
- Unit:
  - details mode resolution (`block` vs `document`).
- Integration:
  - responsive open/close flow,
  - selection sync and persistence.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
