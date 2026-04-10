# TASK-101-09-01-01: Docs Assistant Mode Guardrails and Backward Compatibility
# FileName: TASK-101-09-01-01_Docs_Assistant_Mode_Guardrails_and_Backward_Compatibility.md

**Priority:** High  
**Category:** Core/Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-101-09-01  
**Status:** To Do

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
