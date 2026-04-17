# TASK-178-07-01: OpenRouter Live Planner Smoke
# FileName: TASK-178-07-01_OpenRouter_Live_Planner_Smoke.md

**Priority:** High
**Category:** QA/Assistant + LLM Provider Integration
**Estimated Effort:** Small
**Dependencies:** TASK-178-07, TASK-178-03
**Status:** Done (2026-04-17)

---

## Overview

Add an opt-in live OpenRouter integration smoke test for the `LLM Guide` planner.

The test uses only test-scoped environment variables:

- `TEST_OPENROUTER_API_KEY`
- `TEST_OPENROUTER_MODEL`

Production Assistant configuration remains owned by Settings/Integrations connectors and encrypted runtime settings.

## Sub-Tasks

No child task files.

## Architecture

The live smoke test calls the real OpenRouter chat completion endpoint through the existing `createOpenRouterProvider` adapter, then runs the response through `planAssistantActionsWithProviderDraft`.

The test asserts final planner behavior:

- provider metadata is present,
- provider draft was used,
- the output is a read-only CMS inspection plan,
- candidates come from the trusted test resource catalog,
- the API key does not appear in the serialized plan.

The test is skipped unless both test env vars are set.

## Integration with Current Code

- Reuse `core/services/assistant/providers/openRouterProvider.ts`.
- Reuse `planAssistantActionsWithProviderDraft`.
- Keep production provider resolution untouched.
- Adjust OpenRouter provider prompt formatting so planning calls with `snippets: []` send the raw planner prompt instead of the RAG snippet wrapper.

## Files to Change

- `core/services/assistant/providers/openRouterProvider.ts`
- `tests/integration/routes/assistant-openrouter-live.test.ts`
- `tests/vitest/assistant/openRouterProvider.test.ts`
- `tests/vitest/assistant/fixtures/providerPlannerFixtures.ts`
- `.env.example`

## Acceptance Criteria

1. The live test is skipped when either test env var is missing.
2. The live test uses only `TEST_OPENROUTER_API_KEY` and `TEST_OPENROUTER_MODEL`.
3. The test does not use production settings/connectors.
4. The provider prompt path supports planner calls without RAG snippets.
5. The serialized plan never contains the test API key.

## Security Contract

- Visibility: test-only integration path.
- Auth model: no admin session; direct service-level test provider injection.
- RBAC: not applicable; no route mutation or production settings access.
- CSRF: not applicable; no HTTP route mutation.
- Rate-limit bucket: external OpenRouter account limits apply; test is opt-in and should not run in default CI without env.
- Reject-unknown validation: provider output still passes strict CMS operation draft/action plan validation.
- Anti-abuse: no execute/dry-run call; only planning/inspection.
- Secret handling: API key is read from test env only, not logged, not serialized into plan, and not added to production settings.

## Testing Requirements

- Vitest OpenRouter provider unit coverage for raw planner prompt formatting.
- Bun integration live smoke:
  - `set -a && source .env && set +a && bun test tests/integration/routes/assistant-openrouter-live.test.ts`

## Documentation Updates Required

- `.env.example`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-04-17)

- Added the opt-in live OpenRouter planner smoke test.
- Added `.env.example` documentation for test-only OpenRouter vars.
- Adjusted OpenRouter provider planning calls so empty-snippet requests send raw planner prompts instead of RAG snippet wrappers.
- Added safe operation-draft repair for common small-model JSON shape drift (`optional targetQuery`, extra filter/return fields) while still rejecting secret-like keys.
- Local live smoke passed after both `TEST_OPENROUTER_API_KEY` and `TEST_OPENROUTER_MODEL` were present.
