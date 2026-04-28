# TASK-101-09-01-01: Docs Assistant Mode Guardrails and Backward Compatibility
# FileName: TASK-101-09-01-01_Docs_Assistant_Mode_Guardrails_and_Backward_Compatibility.md

**Priority:** High  
**Category:** Core/Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-101-09-01  
**Status:** Done (2026-04-12)

---

## Overview

Zamrozic `docs-only` jako strictly read-only mode i dodac kompatybilnosc dla historycznego `llm-rag`
bez psucia obecnych ustawien.

## Files to Change

- `core/services/assistant/assistantService.ts` (update, ~40-80 LOC)
- `core/services/settings/settingsService.ts` (update, ~20-40 LOC)
- `core/services/settings/userSettingsService.ts` (update, ~20-40 LOC)
- `tests/vitest/assistant/assistant-mode-normalization.test.ts` (new, ~80-140 LOC)

## Pseudocode

```ts
if (mode === "docs-only") {
  assert(request.actionIntent == null);
  return answerDocsQuestionOnly(input);
}
```

## Sub-Tasks

1. Alias `llm-rag` to `llm-guide` in runtime reads.
2. Keep stored legacy values readable during migration.
3. Reject action-planning flow from `docs-only`.

## Testing Requirements

- Vitest unit for alias migration.
- Vitest unit for docs-only guard path.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`

## Audit Notes (2026-04-11)

- `docs-only` path remains read-only in current assistant flow.
- Action planning/execution is only triggered from the LLM guide path in the floating assistant panel.
- Historical gap before closure: `llm-rag -> llm-guide` canonical alias/migration.

## Completion Notes (2026-04-12)

- `docs-only` remains read-only.
- Legacy `llm-rag` input is normalized to canonical `llm-guide`.
- Stored legacy global/user assistant mode values migrate to `llm-guide` on read.

## Validation (2026-04-12)

- `bun test tests/unit/assistant/assistantService.test.ts`
- `bun test tests/unit/settings/settingsService.test.ts tests/unit/settings/userSettingsService.test.ts`
