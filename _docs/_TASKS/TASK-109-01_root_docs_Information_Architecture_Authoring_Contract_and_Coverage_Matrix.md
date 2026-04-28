# TASK-109-01: root docs Information Architecture, Authoring Contract, and Coverage Matrix
# FileName: TASK-109-01_root_docs_Information_Architecture_Authoring_Contract_and_Coverage_Matrix.md

**Priority:** High  
**Category:** Docs/Architecture  
**Estimated Effort:** Medium  
**Dependencies:** TASK-109  
**Status:** Done (2026-03-20)

---

## Overview

Zaprojektowac docelowa strukture `docs/` oraz standard authoringu dla dokumentacji, ktorej ma uzywac assistant.

Bez tego kolejne fale tresci beda niespójne i trudno seedowalne.

---

## Scope

1. Zaprojektowac IA katalogu `docs/`, np.:
   - `docs/getting-started/`
   - `docs/screens/`
   - `docs/coderso/`
   - `docs/solution-kits/`
   - `docs/playbooks/`
2. Zdefiniowac authoring contract:
   - wymagany frontmatter,
   - wymagane sekcje,
   - styl pisania,
   - poziom szczegolowosci,
   - expectations for examples / pitfalls / cross-links.
3. Stworzyc coverage matrix:
   - lista ekranow,
   - lista modulow,
   - lista workflow i use-case’ow,
   - status coverage per dokument.
4. Przygotowac template i `docs/README.md`.

---

## Sub-Tasks

1. Okreslic canonical taxonomy dla `screens`, `modules`, `kits`, `playbooks`.
2. Ustalic stable naming/slugs/path rules dla dokumentow.
3. Przygotowac authoring template i corpus coverage matrix.

---

## Files

- `docs/README.md` (new)
- `docs/_TEMPLATE.md` or equivalent (new)
- `docs/_COVERAGE_MATRIX.md` or equivalent (new)
- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`

---

## Testing Requirements

- Validate markdown structure consistency for the new authoring template/matrix.
- No runtime tests required in this subtask.

---

## Documentation Updates Required

- `docs/README.md`
- `docs/_TEMPLATE.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/ARCHITECTURE.md`

---

## Completion Notes (2026-03-20)

- Added root `docs/README.md`, `docs/_TEMPLATE.md`, and `docs/_COVERAGE_MATRIX.md`.
- Defined the canonical directory taxonomy for core screens, Coderso modules, solution kits, and playbooks.
- Added route-family coverage mapping for the assistant corpus.
