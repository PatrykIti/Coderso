# 688. TASK-184 live CMS matrix closure

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184, TASK-184-17

## Key Changes

### Assistant/QA

- Added `test:assistant:live:cms` command family for the full live Admin UI assistant matrix.
- Updated the LLM Guide acceptance matrix and testing strategy with live CMS matrix ownership and command usage.
- Closed TASK-184 after live coverage map, DB-backed live suites, gated safety suites, and route coverage guard were in place.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/live-cms-harness.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/ui/settings-sidebar.test.tsx`
- `set -a && source .env && set +a && bun run test:assistant:live:cms`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
