# TASK-109-05: Solution Kits, Applied Examples, and Non-Kit Playbooks Corpus
# FileName: TASK-109-05_Solution_Kits_Applied_Examples_and_Non_Kit_Playbooks_Corpus.md

**Priority:** High  
**Category:** Docs + Product UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-109-01, TASK-109-04  
**Status:** Done (2026-03-20)

---

## Overview

Przygotowac dokumentacje zastosowan i playbooki dla `Solution Kits` oraz scenariuszy spoza gotowych kitow, tak aby assistant umial odpowiadac nie tylko na pytanie "gdzie kliknac", ale tez "jak tego uzyc sensownie".

---

## Scope

1. Dla kazdego `Solution Kit` dostarczyc:
   - overview,
   - when to use,
   - recommended modules,
   - example implementation paths,
   - customization ideas,
   - pitfalls.
2. Dolozyc playbooki poza kitami, np.:
   - custom content architecture without kit,
   - service business with forms + listings only,
   - commerce-first setup,
   - booking-first setup,
   - editorial/content-heavy setup.
3. Dolozyc examples odnoszace sie do realnych ekranow i workflow, nie abstrakcyjnych opisow.

---

## Sub-Tasks

1. Przygotowac canonical docs per kit.
2. Opracowac non-kit applied playbooks.
3. Dolozyc reusable examples / scenario prompts dla assistant corpus.

---

## Files

- `docs/solution-kits/*`
- `docs/playbooks/*`
- `docs/examples/*` (if split from playbooks)

---

## Testing Requirements

- Validate kit/playbook coverage against the matrix from `TASK-109-01`.
- No runtime tests required unless docs tooling changes.

---

## Documentation Updates Required

- `docs/solution-kits/*`
- `docs/playbooks/*`

---

## Completion Notes (2026-03-20)

- Added per-kit docs for automotive workshop, medical clinic, beauty salon, services directory, and small e-commerce.
- Added playbooks for lead generation, booking-first, commerce-first, content-first, custom manual setup, and solution kit selection.
