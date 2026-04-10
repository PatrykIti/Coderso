# TASK-101-09-01: Assistant Mode Split and Runtime Contracts
# FileName: TASK-101-09-01_Assistant_Mode_Split_and_Runtime_Contracts.md

**Priority:** High  
**Category:** Core/Assistant + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-04, TASK-101-05, TASK-101-07, TASK-101-08  
**Status:** To Do

---

## Overview

Rozdzielic read-only docs assistant od nowego trybu `llm-guide`, tak aby produktowo i technicznie
nie mieszac prostego Q&A po docsach z reasoning/planning pod mutacje.

## Scope

1. Dodac canonical mode contract: `docs-only` + `llm-guide`.
2. Zachowac backward compatibility dla istniejacego `llm-rag`.
3. Rozdzielic capability flags:
   - docs answer,
   - guide planning,
   - typed action execution.
4. Uporzadkowac nazwy w settings, user settings, client contracts i UI labels.
5. Zdefiniowac plan wygaszenia starych nazw i uniknac stalego dual-maintenance `llm-rag` vs `llm-guide`.

## Existing Code to Reuse

- `core/services/settings/settingsService.ts`
- `core/services/settings/userSettingsService.ts`
- `core/services/assistant/assistantService.ts`
- `core/server/validation/assistantSchemas.ts`
- `core/admin/services/assistantClient.ts`
- `core/admin/ui/assistant/AssistantModeSwitch.tsx`
- `core/admin/ui/settings/AssistantSettingsCard.tsx`

## Legacy to Replace or Retire

- `llm-rag` remains only as transitional alias on read/migration paths.
- Product copy, UI labels, and new contracts must move to `llm-guide`.
- New work must not add more `llm-rag`-named branches or files.

## Files to Change

- `core/services/settings/settingsService.ts` (update, ~40-80 LOC)
- `core/services/settings/userSettingsService.ts` (update, ~30-60 LOC)
- `core/services/assistant/assistantService.ts` (update, ~60-120 LOC)
- `core/server/validation/assistantSchemas.ts` (update, ~20-40 LOC)
- `core/admin/services/assistantClient.ts` (update, ~40-80 LOC)
- `core/admin/services/settingsClient.ts` (update, ~20-40 LOC)
- `core/admin/services/userSettingsClient.ts` (update, ~20-40 LOC)
- `core/admin/ui/assistant/AssistantModeSwitch.tsx` (update, ~30-60 LOC)
- `core/admin/ui/settings/AssistantSettingsCard.tsx` (update, ~30-60 LOC)

## Pseudocode

```ts
type AssistantMode = "docs-only" | "llm-guide";

function normalizeAssistantMode(raw: unknown): AssistantMode {
  if (raw === "llm-rag") return "llm-guide";
  return raw === "docs-only" || raw === "llm-guide" ? raw : "docs-only";
}
```

## Sub-Tasks

- `TASK-101-09-01-01_Docs_Assistant_Mode_Guardrails_and_Backward_Compatibility.md`
- `TASK-101-09-01-02_LLM_Guide_Mode_Settings_and_Mode_Switch_UX.md`
- `TASK-101-09-01-03_Site_Builder_Contract_Convergence_and_Legacy_Route_Retirement.md`

## Testing Requirements

- Vitest unit for mode normalization and alias migration.
- Vitest unit for settings/user-settings parsing.
- Vitest UI coverage for mode labels and disabled states.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
