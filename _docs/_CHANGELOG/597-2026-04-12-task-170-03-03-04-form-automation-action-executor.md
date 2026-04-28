# 597. TASK-170-03-03-04 form automation action executor

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-03, TASK-170-03-03, TASK-170-03-03-04

## Key Changes

### Assistant Actions
- Promoted `form.automation.upsert` from contract-only to executable `LLM Guide` action for safe non-webhook form actions.
- Added strict input normalization for:
  - `formId`
  - one stable-id form action
- Added dry-run and execute adapter logic through existing form action services:
  - `listFormActions`
  - `setFormActions`

### Safety
- Webhook automations remain unsupported in this adapter slice until secret handling for headers/body templates is explicit.
- Public form submission hardening remains unchanged; no public endpoint was added.
- Re-execution updates/noops by form action id instead of duplicating automation actions.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
