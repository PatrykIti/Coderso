# 599. TASK-170-03 executor adapter closure

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-03, TASK-170-03-04

## Key Changes

### Assistant Execution
- Closed the executor adapter wave for `LLM Guide`.
- Newly executable action families now include:
  - `entry.upsert-draft`
  - `menu.item.upsert`
  - `seo.document.upsert`
  - `media.reference.attach`
  - `listing-query.filters.patch`
  - `listing-template.card.patch`
  - `page.widget.patch`
  - `form.automation.upsert` for safe non-webhook form actions

### Security
- Added route-level per-action permission enforcement for `/assistant/actions/dry-run` and `/assistant/actions/execute` using `actionFamilyContracts`.
- Kept broader future actions contract-only until separate adapter and security semantics land.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts tests/vitest/assistant/action-diff-service.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.db.test.ts`
