# 589. TASK-170-02 preview metadata expansion

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-02

## Key Changes

### Assistant Preview Metadata
- Centralized preview metadata normalization in `actionDiffService`.
- Added secret-like `key=value` redaction for preview summaries, target keys, warnings, conflict messages, and dependency identifiers.
- Added contract-only preview metadata helper so future action families can surface `assistant_action_contract_only` conflicts and permission dependencies before execute adapters land.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-diff-service.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
