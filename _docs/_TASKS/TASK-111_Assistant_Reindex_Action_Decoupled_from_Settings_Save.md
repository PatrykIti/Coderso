# TASK-111: Assistant Reindex Action Decoupled from Settings Save
# FileName: TASK-111_Assistant_Reindex_Action_Decoupled_from_Settings_Save.md

**Priority:** Medium  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-110  
**Status:** Done (2026-03-20)

---

## Overview

Rozdzielic akcję `Run reindex` od `Save changes` w `Assistant Settings`, tak aby reindex seedował dokumentację do DB bez implicit save flow formularza.

---

## Sub-Tasks

1. Usunąć `save-first` zachowanie z przycisku `Run reindex`.
2. Oprzeć reindex na już zapisanym stanie settings po stronie backendu.
3. Dodać test zabezpieczający, że klik `Run reindex` nie wywołuje `onSave`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/ui/assistant-settings.test.tsx tests/vitest/admin/assistantClient.test.ts`

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/SETTINGS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-20)

- `Run reindex` no longer performs an implicit settings save.
- The button now triggers only assistant DB reindex/seeding against already persisted settings.
- Added an interaction test verifying that `Run reindex` does not call `onSave`.
