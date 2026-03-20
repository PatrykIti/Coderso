# TASK-114-01: Legacy Assistant Settings and Data Migration to DB-Only docs
# FileName: TASK-114-01_Legacy_Assistant_Settings_and_Data_Migration_to_DB_Only_docs.md

**Priority:** High  
**Category:** Core/Settings + Core/DB  
**Estimated Effort:** Medium  
**Dependencies:** TASK-114  
**Status:** To Do

---

## Overview

Wymusic migracje zapisanych legacy assistant settings tak, aby stare wartosci
`_docs` / `filesystem` nie mogly dalej kontrolowac runtime assistant docs.

---

## Scope

1. Zidentyfikowac legacy settings shape:
   - `assistant.docs.backend=filesystem`
   - `assistant.docs.sourceRoot=_docs/_internal`
   - `assistant.docs.paths=["_docs"]`
2. Dolozyc migration/normalization path do nowego modelu:
   - `assistant.docs.backend=db`
   - `assistant.docs.sourceRoot=docs`
   - `assistant.docs.paths=["docs"]`
3. Upewnic sie, ze runtime nie moze pozostac na legacy wartosciach po upgrade.

---

## Sub-Tasks

1. Zdecydowac, czy migracja ma byc jednorazowa, lazy-on-read, czy enforced-on-write.
2. Dolozyc testy na legacy->new normalization.
3. Zweryfikowac, ze po migracji operator nie zostaje na starym corpus path.

---

## Files

- `core/services/settings/settingsService.ts`
- `tests/unit/settings/settingsService.test.ts`

---

## Testing Requirements

- targeted settings service tests for legacy normalization

---

## Documentation Updates Required

- `_docs/SETTINGS.md`
