# 685. TASK-184-14 admin security live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-14

## Key Changes

### Assistant/QA

- Added an OpenAI/OpenRouter live matrix for Users, Roles Matrix, Audit Logs, and Access Logs prompts.
- The live matrix verifies destructive/security-sensitive prompts stay non-executable and do not expose concrete token/key/session markers.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/assistant-live/adminSecurityLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
