# 595. TASK-170-03-03-02 listing template card action executor

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-03, TASK-170-03-03, TASK-170-03-03-02

## Key Changes

### Assistant Actions
- Promoted `listing-template.card.patch` from contract-only to executable `LLM Guide` action.
- Added strict input normalization for:
  - `listingTemplateSlug`
  - `card`
- Added dry-run and execute adapter logic through existing listing template services:
  - `listListingTemplates`
  - `updateListingTemplate`

### Safety
- The action patches only `config.card` and preserves unrelated listing template configuration.
- Re-execution noops when the card config already matches.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
