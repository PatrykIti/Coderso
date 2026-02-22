# TASK-060: Post Editor Unified Canvas and Ribbon UX
# FileName: TASK-060_Post_Editor_Unified_Canvas_and_Ribbon_UX.md

**Priority:** High  
**Category:** Admin/UI UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-057, TASK-059  
**Status:** Done (2026-02-22)

---

## Overview
Przebudowac block editor wpisow tak, aby byl bardziej Word-like: jeden wspolny canvas dokumentu, kompaktowy list view (outline) i ribbon na gorze zamiast oddzielnego lewego insertera.

## Goals
1. Edycja wpisu odbywa sie w jednym widoku dokumentu, bez odseparowanych paneli „edytuj tylko wybrany blok”.
2. Ribbon przejmuje role glownego miejsca akcji (insert, formatting, transforms, undo/redo, revisions, preview).
3. List view zostaje jako szybka nawigacja/reorder, ale ma mniejsza szerokosc (ok. 1/5).
4. Details panel pozostaje kontekstowy i otwierany na zadanie.
5. Runtime preview sluzy tylko do finalnej walidacji renderu theme.

## Scope
1. Usuniecie stalego lewego panelu insertera z `EditorShell` dla post editora.
2. Wspolny canvas z renderem wszystkich blokow i inline editing per blok.
3. Ribbon-like top controls (w sekcjach/liniach) dla akcji edycyjnych.
4. List view tylko z nazwami blokow + reorder + szybkie przejscie do bloku.
5. Responsywnosc (desktop/mobile) bez degradacji flow.
6. Regresja testowa + docs/changelog/kanban closure.

## Out of Scope
1. Zmiana modelu danych blokow (`PostBlockDocument`) i backend API.
2. Przebudowa runtime renderera postow.
3. Dodawanie nowych typow blokow.

## Sub-Tasks
- `TASK-060-01`: Unified Canvas UX Contract and Interaction Model
- `TASK-060-02`: Shared Canvas Rendering and Inline Editing
- `TASK-060-03`: Ribbon Toolbar and Block Inserter Migration
- `TASK-060-04`: Compact List View Layout and Navigation
- `TASK-060-05`: Details Panel and Responsive Behavior
- `TASK-060-06`: Regression Tests, Docs, Changelog, and Closure

## Implementation Order
1. `060-01` UX contract i finalny mapping zachowan.
2. `060-02` wspolny canvas i inline editing wszystkich blokow.
3. `060-03` ribbon + migracja insertera/slash/transform controls.
4. `060-04` kompaktowy list view i ratio/layout.
5. `060-05` details/responsive/hotspoty interakcji.
6. `060-06` pelna regresja, dokumentacja i domkniecie.

## Acceptance Criteria
1. Uzytkownik edytuje tresc we wspolnym canvasie i widzi wszystkie bloki razem.
2. Brak stalego lewego panelu insertera; inserter jest dostepny przez ribbon (oraz slash dla rich text).
3. List view jest wyraznie wezszy (target ~20%, min/max constraints) i pokazuje tylko nazwy blokow.
4. Details panel dziala kontekstowo i responsywnie.
5. Runtime preview nie jest wymagany do codziennej edycji ukladu tresci.

## Testing Requirements
- Unit:
  - ribbon action handlers,
  - list view layout helpers,
  - shared-canvas state mapping.
- Integration UI:
  - insert/edit/reorder/select flow na wspolnym canvasie,
  - details panel behavior,
  - runtime preview invocation.
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test`

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/ADMIN_CACHE.md` (jesli zmieni sie zachowanie prefetch/cache dla post editora)

## Closure Notes
- Completed through `TASK-060-01..060-06`.
- Posts editor now uses shared-canvas authoring with ribbon-first actions and compact outline/details workflow.
