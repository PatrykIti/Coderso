# TASK-190-08-01: Composition Fixture Matrix and Red-Team Corpus
# FileName: TASK-190-08-01_Composition_Fixture_Matrix_and_Red_Team_Corpus.md

**Priority:** High
**Category:** QA + Assistant Evaluation
**Estimated Effort:** Medium
**Dependencies:** TASK-190-07
**Status:** To Do

---

## Overview

Add fixture and red-team coverage for mixed blueprint composition.

## Sub-Tasks

No child task files.

## Files to Change

- Add `tests/vitest/assistant/fixtures/blueprintCompositionFixtures.ts`
- Add `tests/vitest/assistant/blueprint-composition-fixtures.test.ts`
- Add `tests/integration/assistant-live/blueprintCompositionLiveMatrix.test.ts`

## Fixture Categories

- single primary only,
- primary + lead capture,
- primary + portfolio proof,
- primary + editorial hub,
- primary + gated booking,
- primary + multiple adjuncts,
- conflict cases,
- provider injection cases.

## Pseudocode

```ts
test.each(blueprintCompositionFixtures)(fixture.name, async () => {
  const plan = planAssistantActions(fixture.input);
  expect(plan.status).toBe(fixture.expected.status);
  expect(plan.actions.map((action) => action.type)).toEqual(fixture.expected.actions);
});
```

## Security Contract

- Visibility: tests only.
- Auth model: no runtime changes.
- RBAC: fixtures assert permission requirements where relevant.
- CSRF: no route changes.
- Rate-limit bucket: no route changes.
- Reject-unknown validation: red-team provider drafts reject unknown payloads.
- Anti-abuse: test provider action injection and duplicate resource spam.
- Secret handling: no secrets in fixture data.

## Testing Requirements

- Vitest fixtures.
- Bun live matrix with OpenAI/OpenRouter when env is configured.
- Red-team prompts:
  - provider action array,
  - SQL/path injection,
  - secret field request,
  - destructive mixed prompt,
  - duplicate slug request.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
