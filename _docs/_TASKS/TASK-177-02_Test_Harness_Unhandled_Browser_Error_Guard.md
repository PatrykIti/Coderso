# TASK-177-02: Test Harness Unhandled Browser Error Guard
# FileName: TASK-177-02_Test_Harness_Unhandled_Browser_Error_Guard.md

**Priority:** High
**Category:** QA + Test Infrastructure
**Estimated Effort:** Medium
**Dependencies:** TASK-177-01
**Status:** Done (2026-04-15)

---

## Overview

Update Vitest setup so unexpected browser async errors, unhandled rejections, and console errors fail the relevant test run instead of being printed as noise while the suite exits green.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/setup/vitest.ts`
- targeted harness tests if needed
- `_docs/TESTING_STRATEGY.md`

## Security Contract

- Visibility: test infrastructure only.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not globally silence console errors,
  - allow explicit opt-in assertions for expected error logging,
  - fail on unexpected localhost/external fetches in component tests.
- Idempotency: guards must reset after each test.
- Secret handling: guard output must not include secret-bearing payloads.

## Testing Requirements

- Add harness behavior test or targeted reproduction proving:
  - unexpected console error fails,
  - unhandled rejection fails,
  - expected error can be asserted/mocked without leaking to output.
- Run:
  - `bun run test:vitest` targeted subset
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Unexpected happy-dom/browser async errors fail tests.
2. Existing tests that intentionally assert errors use explicit mocks/helpers.
3. Harness cleanup does not leak state between tests.

## Progress Notes

- 2026-04-15: Updated `tests/setup/vitest.ts` to wait for happy-dom async tasks, intercept browser-managed HTTP(S) fetches from component tests with a local empty response, and fail on unexpected `console.error`, `window error`, or `unhandledrejection` output.
- 2026-04-15: The guard remains environment-safe for node-owned tests where `window` is undefined.
