# 687. TASK-184-16 live coverage map

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-16

## Key Changes

### Assistant/QA

- Added `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` as the source-of-truth mapping from Admin UI navigation routes to live assistant coverage state.
- Added a static Vitest guard that checks sidebar, Coderso module, and Settings sidebar routes are represented in the matrix.
- Planned/disabled Coderso modules are tracked as `not-applicable` instead of being silently omitted.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/ui/settings-sidebar.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
