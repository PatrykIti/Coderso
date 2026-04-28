# 588. TASK-170-01 action family contracts

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-01, TASK-170-01-01, TASK-170-01-02, TASK-170-01-03

## Key Changes

### Assistant Contracts
- Added a typed `LLM Guide` action family contract registry for planned future action families:
  - `entry.*`
  - `menu.*`
  - `seo.*`
  - `media.*`
  - `form.automation.upsert`
  - `page.widget.patch`
  - `listing-query.filters.patch`
  - `listing-template.card.patch`
- Kept these new families contract-only: they are documented and typed, but not accepted by strict executable action plans until preview/execute adapters land.

### Security
- Documented intended schema owners, RBAC permissions, anti-abuse expectations, public form hardening reuse, and secret-handling rules for the new action families.
- Confirmed strict plan schema and provider draft adaptation still reject contract-only action types.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts`
