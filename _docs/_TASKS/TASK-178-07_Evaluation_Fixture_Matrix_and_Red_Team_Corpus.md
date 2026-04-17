# TASK-178-07: Evaluation Fixture Matrix and Red-Team Corpus
# FileName: TASK-178-07_Evaluation_Fixture_Matrix_and_Red_Team_Corpus.md

**Priority:** High
**Category:** QA/Assistant + Security
**Estimated Effort:** Large
**Dependencies:** TASK-178-01, TASK-178-02, TASK-178-03, TASK-178-04, TASK-178-05, TASK-178-06
**Status:** Done (2026-04-17)

---

## Overview

Build an evaluation matrix that proves `LLM Guide` can handle generic CMS prompts without per-case keyword patches.

The matrix must include normal prompts, ambiguous prompts, destructive prompts, provider malformed output, prompt injection attempts, and Polish/English mixed language requests.

This task also owns provider/model-family evaluation. Structured-output behavior must be selected through a provider/model capability strategy, not through provider-specific hardcode inside the planner.

## Sub-Tasks

- `TASK-178-07-01_OpenRouter_Live_Planner_Smoke.md`
- `TASK-178-07-02_Model_Capability_Driven_Structured_Output_Strategy.md`

## Architecture

Create fixtures grouped by resource family and operation:

- pages: find, update, delete, publish/unpublish,
- entries: find, update, delete,
- content types: find, guarded delete,
- custom screens: find, update, delete,
- forms: find, update, archive/delete,
- listings: find, query/template update/delete,
- widgets/templates: find, patch, update/delete,
- menus: find, item update/delete,
- SEO: find, update/delete,
- media: find/attach where supported,
- settings: configure only where safe.

Each fixture records:

- prompt,
- context/resource catalog,
- expected operation draft,
- expected target resolution,
- expected action plan or needs-input/read-only outcome,
- security notes.

## Integration with Current Code

- Fixture runner must exercise the same planner functions used by `/assistant/actions/plan`.
- Provider fixtures must use fake providers through existing provider interfaces, not live network calls.
- Route/security fixtures must use existing `tests/integration/routes/assistant.test.ts` conventions.
- Results should update `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` instead of creating a separate hidden capability list.

## Files to Change

- `tests/vitest/assistant/cms-operation-fixtures.test.ts` (new)
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/integration/routes/assistant.test.ts`
- `tests/integration/routes/assistant-openrouter-live.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts` for mapped executable smoke cases
- `core/services/assistant/__fixtures__/cmsOperationFixtures.ts` (new, or colocated under tests)
- `core/services/assistant/modelCapabilities.ts` (when structured output strategy lands)
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`

## Acceptance Criteria

1. Fixture matrix covers at least 10 CMS resource families and inspect/update/delete-style prompts.
2. Fixtures include Polish, English, and mixed prompts.
3. Unsafe provider drafts and prompt injection attempts fail closed.
4. Broad destructive prompts return candidates/needs-input, not executable plans.
5. Known unsupported gaps are documented separately from regressions.
6. Structured output strategy is resolved by model/provider capability profile, not by planner hardcode.

## Security Contract

- Visibility: test-only fixtures and internal CI artifacts.
- Auth model: not applicable to pure fixtures; route fixtures use existing admin session test harness.
- RBAC: route/e2e fixtures must assert per-action read/write permissions.
- CSRF: route fixtures keep CSRF behavior.
- Rate-limit bucket: assistant route tests keep assistant bucket assertions where applicable.
- Reject-unknown validation: malformed provider and malicious draft fixtures must fail closed.
- Anti-abuse:
  - prompt injection fixtures cannot create arbitrary actions,
  - broad delete/update fixtures return candidate/needs-input,
  - unsafe public write requests remain gated.
- Secret handling: red-team fixtures include fake secret markers and assert redaction.

## Testing Requirements

- Vitest fixture runner for planner and provider draft repair.
- Bun route tests for permission and validation failures.
- Security tests for redaction and prompt injection recovery.
- Document known unsupported gaps separately from failures.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md` if lane ownership changes
- task/changelog entries on completion

## Progress Notes

- 2026-04-17: Completed `TASK-178-07-01`; opt-in OpenRouter live planner smoke exists and is skipped unless `TEST_OPENROUTER_API_KEY` plus `TEST_OPENROUTER_MODEL` are set.
- 2026-04-17: Added `TASK-178-07-02` to cover provider/model-family structured output strategy before this evaluation wave can close.
- 2026-04-17: Completed `TASK-178-07-02`; structured output is capability-driven and OpenRouter live smoke passes with test env vars.

## Completion Notes (2026-04-17)

- Added `cmsOperationFixtures` and a matrix runner covering pages, entries, content types, custom screens, forms, listings, widget templates, menu items, SEO documents, media unsupported gaps, and prompt-injection/provider-unsafe drafts.
- Matrix uses the same local/provider planner functions used by `/assistant/actions/plan`.
- Provider/model-family structured output strategy is covered by unit tests and opt-in OpenRouter/OpenAI live smokes.
- Known unsupported media mutation remains documented as `needs_input`.
