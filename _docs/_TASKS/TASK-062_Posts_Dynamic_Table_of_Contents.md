# TASK-062: Posts Dynamic Table of Contents (TOC)
# FileName: TASK-062_Posts_Dynamic_Table_of_Contents.md

**Priority:** High  
**Category:** CMS/Posts + Runtime + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-061  
**Status:** To Do

---

## Overview
Wdrozyc WordPress-like, dynamiczny spis tresci dla postow:
1. TOC ma byc generowany z realnych naglowkow dokumentu, nie z wklejonego statycznego HTML.
2. Naglowki maja dostawac stabilne `anchorId`, aby linkowanie dzialalo deterministycznie.
3. Wklejony z Worda "spis tresci" ma byc wykrywany i zamieniany na dynamiczny TOC.

---

## Sub-Tasks
1. `TASK-062-01` - Dynamic TOC generation from heading index.
2. `TASK-062-02` - Stable heading anchor IDs and linking contract.
3. `TASK-062-03` - Word TOC detection and replacement with dynamic TOC block.
4. `TASK-062-04` - QA/docs/changelog/kanban closure.

---

## Architecture Notes
- Dynamic TOC ma byc source-of-truth opartym o aktualny document state (draft/published), a nie kopiowanym tekstem.
- TOC ma pozostac w modelu posts jako struktura dynamiczna (`toc` block), aby autor kontrolowal pozycje TOC w dokumencie.
- Runtime preview i public runtime musza renderowac ten sam TOC contract.

---

## Implementation Order
1. Najpierw runtime kontrakt TOC + indeks naglowkow (`062-01`), aby miec stabilny model renderowania.
2. Potem anchor IDs (`062-02`), bo TOC musi linkowac do stabilnych targetow.
3. Na koncu replacement Word TOC (`062-03`), juz na gotowym kontrakcie.
4. Finalnie QA i docs (`062-04`).

---

## Acceptance Criteria
1. Autor moze umiescic dynamiczny TOC w dowolnym miejscu posta.
2. Linki TOC przewijaja do poprawnych naglowkow na preview/public.
3. TOC aktualizuje sie automatycznie po zmianie naglowkow (dodanie/usuniecie/zmiana tekstu/poziomu).
4. Wklejenie Word TOC nie zostawia martwych linkow `#_Toc...`; system zastępuje je dynamicznym TOC.

---

## Testing Requirements
- Unit: index builder, anchor generator, TOC replacement parser.
- Integration UI: post editor TOC flow + paste flow.
- Runtime integration: preview/public parity.
- Full gates: `lint`, `lint:types`, `bun test`.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`

