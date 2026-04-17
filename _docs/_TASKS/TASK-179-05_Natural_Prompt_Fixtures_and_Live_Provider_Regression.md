# TASK-179-05: Natural Prompt Fixtures and Live Provider Regression
# FileName: TASK-179-05_Natural_Prompt_Fixtures_and_Live_Provider_Regression.md

**Priority:** High
**Category:** QA/Assistant + Provider Integration
**Estimated Effort:** Large
**Dependencies:** TASK-179-01, TASK-179-02, TASK-179-03, TASK-179-04
**Status:** To Do

---

## Overview

Add fixture and live provider tests for natural user prompts that do not use exact system terminology.

Target prompts:

- `czy mozesz mi sprawdzic jakie ekrany customowe istnieja w admin ui?`
- `no a jakies sa opublikowane w sekcji 'Screens'?`
- `sprawdz menu Screens czy cos tam jest`
- English equivalents using `custom screens`, `admin UI`, `Screens section`, `visible`, `published`.

## Sub-Tasks

No child task files.

## Architecture

Tests should cover:

- local planner fallback,
- fake provider structured output,
- OpenRouter live provider,
- OpenAI live provider,
- UI interaction copy.

Live tests must remain opt-in and use only:

- `TEST_OPENROUTER_API_KEY`
- `TEST_OPENROUTER_MODEL`
- `TEST_OPENAI_API_KEY`
- `TEST_OPENAI_MODEL`

## Integration with Current Code

- Extend `tests/vitest/assistant/fixtures/cmsOperationFixtures.ts`.
- Extend `tests/vitest/assistant/provider-planner-fixtures.test.ts`.
- Extend live integration tests:
  - `assistant-openrouter-live.test.ts`
  - `assistant-openai-live.test.ts`
- Extend UI tests for inspection wording.
- Keep production provider settings/connectors untouched.

## Files to Change

- `tests/vitest/assistant/fixtures/cmsOperationFixtures.ts`
- `tests/vitest/assistant/cms-operation-fixtures.test.ts`
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`
- `tests/integration/routes/assistant-openrouter-live.test.ts`
- `tests/integration/routes/assistant-openai-live.test.ts`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`

## Acceptance Criteria

1. The three Polish prompts above return custom-screen candidates in local/fake-provider tests.
2. OpenAI live smoke covers at least one natural prompt with `Screens` as surface hint.
3. OpenRouter live smoke covers at least one natural prompt with `Screens` as surface hint.
4. Tests prove `Screens` is not treated as resource target name.
5. Tests prove `opublikowane` maps correctly for custom screens.

## Security Contract

- Visibility: test-only.
- Auth model: no route mutation in live smokes; service-level provider injection.
- RBAC: route tests still cover permission behavior separately.
- CSRF: not applicable to service-level live tests.
- Rate-limit bucket: external provider limits only for opt-in live tests.
- Reject-unknown validation: provider output still passes strict schema.
- Anti-abuse: live tests do not dry-run or execute mutations.
- Secret handling: test API keys must not be serialized into plan output or logs.

## Testing Requirements

- Vitest local/fake-provider tests.
- Bun live provider smokes with env vars.
- UI interaction tests.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
