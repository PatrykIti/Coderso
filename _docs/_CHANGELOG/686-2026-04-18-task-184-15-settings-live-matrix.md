# 686. TASK-184-15 settings live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-15

## Key Changes

### Assistant/QA

- Added an OpenAI/OpenRouter live matrix for Settings surfaces.
- The live matrix verifies General, Assistant, Site, Security, API Keys, Webhooks, Email, Storage, and Integrations prompts remain non-executable without strict typed contracts and do not expose concrete token/key/session markers.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/assistant-live/settingsSecurityLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
