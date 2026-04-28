# 684. TASK-184-13 tools safety live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-13

## Key Changes

### Assistant/QA

- Added an OpenAI/OpenRouter live matrix for Tools, Redirects, Backups, and Import/Export safety prompts.
- The live matrix verifies global search, SEO auto-fix, backup restore, import, and unsafe redirect prompts do not produce executable action plans without strict typed contracts.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/assistant-live/toolsSafetyLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
