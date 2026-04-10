# TASK-101-09-05-03: House Projects Catalog End-to-End Acceptance Flow
# FileName: TASK-101-09-05-03_House_Projects_Catalog_End_to_End_Acceptance_Flow.md

**Priority:** High  
**Category:** Product UX + QA + Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-05-02  
**Status:** To Do

---

## Overview

Ten leaf jest business acceptance anchor dla calego programu.

Prompt:
- "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog"

Expected final state after confirm/execute:
- istnieje content type dla projektow domow,
- istnieje schema z odpowiednimi polami,
- istnieje surface do zarzadzania rekordami:
  - `Entries` i/lub `Custom Screen`,
- istnieje listing query i listing template,
- istnieje strona katalogu,
- opcjonalnie istnieje formularz zapytania jesli user tego potrzebuje albo `llm-guide` zapyta o to w follow-up,
- user dostaje working setup, a nie tylko poradę.

## Files to Change

- `core/services/assistant/blueprints/projectsCatalogBlueprint.ts` (update, ~60-100 LOC)
- `core/services/assistant/actionPlannerService.ts` (update, ~40-80 LOC)
- `core/services/assistant/actionExecutorService.ts` (update, ~40-80 LOC)
- `tests/integration/routes/assistant-actions.test.ts` (update/new, ~180-280 LOC)
- `tests/vitest/assistant/house-projects-catalog-flow.test.ts` (new, ~140-220 LOC)

## Pseudocode

```ts
const prompt = "potrzebuje strony ... projekty domow ... caly katalog";
const plan = await planAssistantActions(prompt, { mode: "llm-guide" });
expect(plan.actions).toContainAction("content-type.upsert");
expect(plan.actions).toContainAction("listing-query.upsert");
expect(plan.actions).toContainAction("page.upsert");
```

## Sub-Tasks

1. Define acceptance plan shape for the house-projects prompt.
2. Verify dry-run contains all expected resource groups.
3. Verify execute creates a working admin/runtime setup.
4. Verify follow-up prompts can refine the setup instead of rebuilding from scratch.

## Testing Requirements

- Vitest unit for deterministic plan shape.
- Bun integration for plan/dry-run/execute against assistant action routes.
- UI coverage for review/confirm of this scenario.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
