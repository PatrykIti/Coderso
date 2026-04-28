# TASK-110: Assistant Settings Run Reindex Action
# FileName: TASK-110_Assistant_Settings_Run_Reindex_Action.md

**Priority:** Medium  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-109  
**Status:** Done (2026-03-20)

---

## Overview

Dodać do `Assistant Settings` czytelny przycisk `Run reindex`, aby seedowanie oficjalnego corpusu `docs/` do DB było dostępne bez ręcznego wywoływania endpointu.

---

## Sub-Tasks

1. Dodać CTA `Run reindex` do `AssistantSettingsPage`.
2. Upewnić się, że bieżące ustawienia są zapisywane przed uruchomieniem reindexu.
3. Dodać stany `loading`, `success`, i `error` dla samej akcji reindexu.
4. Zweryfikować render settings page i klienta assistanta po zmianie.

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

- Added `Run reindex` to Assistant Settings.
- Reindex now uses the existing assistant reindex client flow from the settings screen.
- The action persists current settings first and then runs the DB seed/reindex.
