# 596. TASK-170-03-03-03 page widget patch action executor

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-03, TASK-170-03-03, TASK-170-03-03-03

## Key Changes

### Assistant Actions
- Promoted `page.widget.patch` from contract-only to executable `LLM Guide` action for top-level `upsert-block`.
- Added strict input normalization for:
  - `pageSlug`
  - `operation=upsert-block`
  - one top-level widget `block`
- Added dry-run and execute adapter logic through existing page services:
  - `getPageBySlug`
  - `updatePage`

### Safety
- Uses runtime widget registration plus `normalizeWidgetBlock` to reject unsupported widget types and invalid widget data.
- Preserves unrelated/legacy page blocks by patching only the target top-level block id or appending a new top-level block.
- Does not publish pages.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
