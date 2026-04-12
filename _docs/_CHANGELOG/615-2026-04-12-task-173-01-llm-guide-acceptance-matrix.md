# 615. TASK-173-01 LLM Guide acceptance matrix

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-173, TASK-173-01, TASK-173-01-01, TASK-173-01-02

## Key Changes

### QA Matrix
- Added `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`.
- The matrix records:
  - executable action families,
  - executable and gated business blueprint packs,
  - negative contracts,
  - known gaps,
  - Vitest/Bun lane ownership.

### Tests
- Added docs-only non-mutation regression in the assistant service suite.
- Added route regression for unsupported action types mapping to `assistant_action_plan_invalid`.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts`
