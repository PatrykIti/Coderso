# TASK-114-04: QA, Docs, Changelog, and Closure
# FileName: TASK-114-04_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA/Docs  
**Estimated Effort:** Small  
**Dependencies:** TASK-114-02, TASK-114-03  
**Status:** Done (2026-03-20)

---

## Overview

Domknac usuniecie legacy assistant docs path przez walidacje, finalne docs sync i
board/changelog closure.

---

## Sub-Tasks

1. Uruchomic trafione lint/types/tests.
2. Potwierdzic, ze source-of-truth docs nie opisują juz starego modelu jako aktywnie wspieranego.
3. Dodac changelog i zsynchronizowac task board.

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
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-20)

- Validation completed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/admin/assistantClient.test.ts tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`
  - `bun run vitest run tests/vitest/assistant/docsIngestService.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/openRouterProvider.test.ts`
  - `bun test tests/unit/assistant/assistantService.test.ts tests/unit/settings/settingsService.test.ts tests/integration/routes/assistant.test.ts`
- Synced docs, task board, and changelog for the DB-only enforcement rollout.
