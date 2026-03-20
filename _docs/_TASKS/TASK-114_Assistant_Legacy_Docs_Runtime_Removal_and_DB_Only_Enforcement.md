# TASK-114: Assistant Legacy Docs Runtime Removal and DB-Only Enforcement
# FileName: TASK-114_Assistant_Legacy_Docs_Runtime_Removal_and_DB_Only_Enforcement.md

**Priority:** High  
**Category:** Assistant + Core/DB + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-109  
**Status:** Done (2026-03-20)

---

## Overview

Usunac legacy podejscie assistant docs oparte o `_docs` i `filesystem`, tak aby
system wspieral juz tylko nowy kontrakt:

- official corpus w root `docs/`,
- DB-seeded knowledge base,
- brak runtime fallbacku do filesystem,
- brak aktywnego wspierania starego modelu przez settings, UI i operator flows.

To jest task porzadkujacy po `TASK-109`, bo nowy model jest wdrozony, ale
nalezy twardo odciac wspieranie starego podejscia.

---

## Product / Runtime Contract

1. Assistant docs source-of-truth = `docs/`.
2. Assistant official runtime = DB-seeded corpus only.
3. Brak wspierania `_docs` jako active assistant corpus.
4. Brak wspierania `filesystem` jako official assistant retrieval mode.
5. Brak operator-facing mozliwosci utrzymywania starego modelu przez UI.
6. Gdy DB corpus nie jest gotowy:
   - assistant jest `not ready`,
   - system nie wraca do `_docs` ani filesystem index jako planu awaryjnego.

---

## Sub-Tasks

1. `TASK-114-01` - legacy assistant settings/data migration to DB-only `docs/`.
2. `TASK-114-02` - runtime and API enforcement for DB-only assistant docs.
3. `TASK-114-03` - admin/settings UX cleanup removing legacy docs mode choices.
4. `TASK-114-04` - QA, docs, changelog, and closure.

---

## Files to Change

- `core/services/settings/settingsService.ts`
- `core/services/assistant/assistantService.ts`
- `core/services/assistant/docsIndexService.ts`
- `core/services/assistant/docsIngestService.ts`
- `core/admin/ui/settings/AssistantSettingsPage.tsx`
- `core/admin/ui/settings/AssistantSettingsCard.tsx`
- `tests/unit/settings/settingsService.test.ts`
- `tests/unit/assistant/assistantService.test.ts`
- `tests/vitest/ui/assistant-settings.test.tsx`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SETTINGS.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`

---

## Acceptance Criteria

1. Saved legacy settings cannot keep assistant runtime on `_docs` or `filesystem`.
2. Operator-facing assistant settings no longer imply that `filesystem` is a supported official mode.
3. Runtime/API contract is unambiguous: no DB corpus means `not ready`, not filesystem fallback.
4. Source-of-truth docs no longer describe legacy `_docs/filesystem` as an active supported assistant path.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted assistant runtime/settings/UI suites

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SETTINGS.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-20)

- Enforced `docs -> DB seeded corpus` as the only active official assistant docs runtime path.
- Normalized legacy assistant docs settings so saved `_docs/filesystem` values no longer control runtime behavior.
- Removed active filesystem retrieval/reindex branches from assistant runtime and aligned client/UI expectations to `db`.
