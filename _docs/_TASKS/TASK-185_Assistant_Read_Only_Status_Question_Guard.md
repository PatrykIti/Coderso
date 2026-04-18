# TASK-185: Assistant Read-Only Status Question Guard
# FileName: TASK-185_Assistant_Read_Only_Status_Question_Guard.md

**Priority:** High
**Category:** Assistant/Core + Live Provider Safety
**Estimated Effort:** Small
**Dependencies:** TASK-184
**Status:** Done (2026-04-18)

---

## Overview

Fix live-provider drift for status/visibility questions such as:

`czy formularz Lead Form jest publiczny?`

OpenAI can occasionally turn this read-only question into an executable action plan. The provider path must route clear status/visibility questions through deterministic local inspection before model inference.

## Sub-Tasks

No child task files.

## Files Changed

- `core/services/assistant/actionPlannerService.ts`

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: unchanged; inspection only reads authorized resource summaries.
- CSRF: no runtime route change.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: provider output remains untrusted and local strict schemas remain authoritative.
- Anti-abuse: status/visibility questions must not produce mutation controls.
- Secret handling: no provider keys, cookies, CSRF tokens, form submissions, or privileged settings in prompt/result metadata.

## Testing Requirements

- Live OpenAI/OpenRouter prompt matrix:
  - `tests/integration/routes/assistant-openai-live.test.ts`
  - `tests/integration/routes/assistant-openrouter-live.test.ts`
- Targeted planner regression:
  - `tests/vitest/assistant/actionPlannerService.test.ts`
- Validation:
  - `bun run test:assistant:live:openai`
  - `bun run test:assistant:live:openrouter`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- changelog entry

## Completion Notes (2026-04-18)

- Provider path now routes clear form status/visibility questions through deterministic local inspection before model inference.
- Local-first provider metadata is preserved so live smoke assertions remain consistent.

## Validation

- `set -a && source .env && set +a && bun run test:assistant:live:openai`
- `set -a && source .env && set +a && bun run test:assistant:live:openrouter`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
