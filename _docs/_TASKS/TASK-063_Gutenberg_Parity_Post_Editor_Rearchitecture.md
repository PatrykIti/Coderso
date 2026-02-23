# TASK-063: Gutenberg Parity Post Editor Rearchitecture
# FileName: TASK-063_Gutenberg_Parity_Post_Editor_Rearchitecture.md

**Priority:** High  
**Category:** Admin/UI + CMS/Posts  
**Estimated Effort:** Large  
**Dependencies:** TASK-060, TASK-061, TASK-062  
**Status:** To Do

---

## Overview
Przebudowac UI/UX edytora postow w Nextless tak, aby byl bliski mental modelowi Gutenberg:
- shell z regionami (`header`, `content`, `secondary sidebar`, `details sidebar`, `footer`),
- toolbar "Document tools" + akcje save/preview/publish,
- lewy inserter/list view jako zamykane sidebary,
- outline/statystyki dokumentu,
- lepszy focus/accessibility i workflow dla nietechnicznych userow.

Referencja funkcjonalna i UX:
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/editor-interface/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/header/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/document-tools/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/inserter-sidebar/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/list-view-sidebar/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/table-of-contents/panel.js`

---

## Goals
1. Upodobnic interakcje edytora do Gutenberga bez kopiowania kodu 1:1.
2. Zachowac obecny model danych postow i runtime parity (bez dead code).
3. Uporzadkowac layout i odpowiedzialnosci komponentow (clean architecture).
4. Domknac a11y i keyboard workflow.
5. Dowozic zmiany etapowo (small safe increments + testy regresyjne).

---

## Non-Goals
1. Import/Vendor calego Gutenberga do runtime Nextless.
2. Przepisanie backendu posts API.
3. Zmiana architektury strony pages editor (zakres dotyczy posts editor).

---

## Architecture Notes
1. Reuzywamy obecny `PostBlockDocument`, `postEditorStore`, `postsService`, `postsRoutes`.
2. Warstwa UI ma byc modularna:
   - `layout/*` (skeleton i regiony),
   - `header/*` (document tools + actions),
   - `sidebars/*` (inserter/list view/details),
   - `canvas/*` (writing flow),
   - `hooks/*` (focus, shortcuts, layout state).
3. Wszystkie endpointy pozostaja internal (`/admin/api/posts/*`), bez nowych public route.
4. Integrujemy sie z taskami TOC (`TASK-062`) zamiast tworzyc drugi mechanizm outline/anchors.

---

## Sub-Tasks
1. `TASK-063-01` - Gutenberg reference audit and gap matrix.
2. `TASK-063-02` - Editor shell composition (interface skeleton + regions).
3. `TASK-063-03` - Header/document tools/save-publish parity.
4. `TASK-063-04` - Inserter sidebar and block library parity.
5. `TASK-063-05` - List view, outline, and document stats.
6. `TASK-063-06` - Writing canvas flow (+ appender/slash/paste parity hardening).
7. `TASK-063-07` - Details inspector tabs and preference persistence.
8. `TASK-063-08` - Keyboard shortcuts, focus management, and accessibility.
9. `TASK-063-09` - QA, docs, changelog, and closure.

---

## Implementation Order
1. Najpierw analiza i matrix (`063-01`), zeby nie robic losowych zmian.
2. Potem shell/layout (`063-02`) i header/actions (`063-03`).
3. Nastepnie sidebary (`063-04`, `063-05`).
4. Potem canvas behavior (`063-06`) i details/preferences (`063-07`).
5. Na koniec a11y/shortcuts (`063-08`) i full closure (`063-09`).

---

## Acceptance Criteria
1. Posts editor ma workflow bliski Gutenberg (header tools, sidebary, outline, details).
2. Brak regresji save/autosave/preview/publish/revisions.
3. Brak dublowania logiki i dead code po migracji.
4. Wszystkie zmiany pokryte testami unit/integration UI.

---

## Testing Requirements
- Unit: layout state, outline selectors, preference state, shortcut handlers.
- Integration UI: shell regions, toggles sidebars, focus return, save/publish flow.
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`

