# 701. TASK-188-06 follow up policy

Date: 2026-04-19
Version: unreleased
Tasks: TASK-188-06

## Key Changes

### Assistant/Core

- Added policy-driven follow-up planning helpers for pronouns, count words, candidate selection, and draft creation.
- Updated planning state follow-up handling to use `assistantOperationPolicy.followUp`.
- Removed legacy first-label prefix fallback for multi-candidate follow-ups; drafts now target exact prior candidate labels.
- Added policy follow-up tests and updated planning-state coverage.

### Docs

- Documented policy-driven follow-up planning state in Architecture and Security Spec.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
