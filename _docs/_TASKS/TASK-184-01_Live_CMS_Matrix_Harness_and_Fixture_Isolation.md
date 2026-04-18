# TASK-184-01: Live CMS Matrix Harness and Fixture Isolation
# FileName: TASK-184-01_Live_CMS_Matrix_Harness_and_Fixture_Isolation.md

**Priority:** High
**Category:** Assistant/QA + Test Harness
**Estimated Effort:** Large
**Dependencies:** TASK-184
**Status:** Done (2026-04-18)

---

## Overview

Create the shared live E2E harness used by all TASK-184 CMS section suites.

The harness owns provider setup, unique fixture prefixes, database readiness checks, admin actor/permission setup, dry-run/execute wrappers, cleanup, and non-secret logging. Section-specific leaves should use this harness instead of each test reinventing provider calls and cleanup.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/integration/assistant-live/*` or `tests/integration/routes/assistant-live-*`
- `tests/helpers/*` if shared Bun helpers exist
- `package.json`
- `_docs/TESTING_STRATEGY.md`
- `_docs/SECURITY_SPEC.md`

## Harness Requirements

- Load live provider env from `.env`:
  - `TEST_OPENAI_API_KEY`
  - `TEST_OPENAI_MODEL`
  - `TEST_OPENROUTER_API_KEY`
  - `TEST_OPENROUTER_MODEL`
- Skip only when provider-specific env is absent.
- Generate a unique `runId` and resource prefix per test file.
- Verify `DATABASE_URL` is reachable before DB-backed mutation tests.
- Provide provider runners:
  - `runOpenAiLiveCase`
  - `runOpenRouterLiveCase`
  - `runAllLiveProviders`
- Provide action helpers:
  - plan through `planAssistantActionsWithProviderDraft`,
  - dry-run through the same action service or route contract used by current tests,
  - execute with idempotency key,
  - verify summary/result status.
- Provide cleanup registry:
  - cleanup should run in reverse dependency order,
  - cleanup failures should be reported without hiding the original failure,
  - cleanup must not delete resources outside the test prefix.

## Security Contract

- Visibility: test-only internal harness.
- Auth model: test admin actor only.
- RBAC: harness must not bypass action-family permission checks except where existing service-level tests explicitly model route permissions separately.
- CSRF: route-level helper must use existing CSRF path when testing routes.
- Rate-limit bucket: live provider calls are opt-in and must be bounded.
- Reject-unknown validation: provider output remains untrusted and must pass local strict schemas.
- Anti-abuse: hard requirement for unique prefixes and cleanup.
- Secret handling: no env values or raw provider request/response payloads in logs, snapshots, assertions, or changelog.

## Testing Requirements

- Unit/Vitest coverage for pure helper normalization if helpers are Bun-free.
- Bun smoke proving:
  - missing env skips cleanly,
  - present env creates both provider instances,
  - cleanup registry calls cleanup in reverse order.
- Full validation when implementation is complete:
  - `set -a && source .env && set +a && bun run test:assistant:live:cms`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-04-18)

- Added `tests/integration/assistant-live/liveCmsHarness.ts`.
- Harness now provides provider availability checks, OpenAI/OpenRouter runtime creation, disposable `llm-live-*` prefixes, cleanup stack, DB reachability check, provider planning wrapper, dry-run/execute wrappers, and execution success assertions.
- Harness avoids importing DB-backed executor modules until dry-run/execute helpers are called, so pure helper tests can run without `DATABASE_URL`.
- Added Vitest coverage for provider env availability, disposable prefix validation, and reverse-order cleanup behavior.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/live-cms-harness.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
