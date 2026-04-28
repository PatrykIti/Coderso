# 672. TASK-184-01 live CMS matrix harness

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-01

## Key Changes

### Assistant/QA

- Added a shared live CMS assistant test harness for OpenAI/OpenRouter provider setup.
- Added disposable `llm-live-*` prefix helpers and reverse-order cleanup stack support.
- Added lazy dry-run/execute helpers so pure harness tests can run without `DATABASE_URL`.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/live-cms-harness.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
