# 610. TASK-172-04 product inquiry catalog pack

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-172, TASK-172-04

## Key Changes

### Assistant Blueprints
- Added `Product Inquiry Catalog` blueprint.
- Product catalog prompts that include inquiry/form language now generate:
  - product catalog surfaces,
  - a public product inquiry form,
  - catalog page form embed.

### Scope
- Checkout/payment prompts now return typed `needs_input` instead of implying unsupported checkout setup.
- No commerce checkout/payment services were changed.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
