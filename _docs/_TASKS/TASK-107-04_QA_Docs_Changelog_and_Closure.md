# TASK-107-04: QA, Docs, Changelog, and Closure
# FileName: TASK-107-04_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA/Docs  
**Estimated Effort:** Small  
**Dependencies:** TASK-107-01, TASK-107-02, TASK-107-03, TASK-107-05, TASK-107-06  
**Status:** To Do

---

## Overview

Domknac follow-up UX dla assistant topbar/drawera przez walidacje, docs i board/changelog sync.

---

## Scope

1. Uruchomic trafione lint/types/tests.
2. Uaktualnic docs source-of-truth dla topbar icon gating i minimalistycznego drawera.
3. Dodac changelog i zsynchronizowac task board.

---

## Sub-Tasks

1. Zweryfikowac assistant UI suites i ewentualne admin-shell assertions.
2. Uaktualnic docs po wdrozeniu.
3. Dodac changelog entry i domknac board.

---

## Files

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
- Additional targeted admin-shell / launcher suite when the floating entrypoint changes.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
