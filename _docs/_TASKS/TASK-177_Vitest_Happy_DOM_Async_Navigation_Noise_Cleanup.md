# TASK-177: Vitest Happy-DOM Async Navigation Noise Cleanup
# FileName: TASK-177_Vitest_Happy_DOM_Async_Navigation_Noise_Cleanup.md

**Priority:** High
**Category:** QA + Test Infrastructure
**Estimated Effort:** Large
**Dependencies:** TASK-176
**Status:** Done (2026-04-15)

---

## Overview

Make `bun run test:vitest` fail-clean and log-clean by removing uncontrolled happy-dom navigation/fetch side effects.

Current observed noise from a green full Vitest run:
- `Failed to execute 'startTask()' on 'AsyncTaskManager': The asynchronous task manager has been aborted.`
- `ECONNREFUSED 127.0.0.1:3000`

These logs indicate browser-like async navigation/fetch tasks are being started outside the asserted test flow. The suite currently exits green, but the harness should not allow hidden browser side effects to pass silently.

## Sub-Tasks

- `TASK-177-01_Identify_Happy_DOM_Navigation_Noise_Sources.md`
- `TASK-177-02_Test_Harness_Unhandled_Browser_Error_Guard.md`
- `TASK-177-03_Component_Test_Navigation_and_Fetch_Mocks.md`
- `TASK-177-04_Full_Vitest_Log_Clean_Closure.md`

## Architecture

Target architecture:
- component tests do not start real navigation to `localhost:3000`,
- link clicks and form submits in happy-dom are controlled,
- programmatic navigation (`window.location.assign`, `window.open`, anchor default navigation) is mocked or asserted,
- unexpected console errors/unhandled rejections fail tests,
- full Vitest output is clean enough that new errors are visible.

Existing context:
- `tests/setup/vitest.ts` already installs click/submit guards for `a[href]` and forms.
- Remaining noise suggests programmatic navigation, post-unmount async browser tasks, or missing fetch/location mocks in specific suites.

## Security Contract

- Visibility: test infrastructure only.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - tests must not perform real network requests to localhost or external origins unless explicitly integration-owned,
  - tests must not hide console errors globally without assertions,
  - harness guards must be precise enough to avoid masking real failures.
- Idempotency: test runs should be reproducible and not depend on local dev server state.
- Secret handling:
  - test logs must not include real tokens/cookies/CSRF values,
  - mocks must use fake values only.

## Testing Requirements

- Reproduce current noisy output and identify source suite(s).
- Add targeted tests/guards for the noisy pattern.
- Run:
  - `bun run test:vitest`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- The final `bun run test:vitest` must pass without happy-dom async navigation/fetch errors or `ECONNREFUSED localhost:3000` noise.

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entries per completed leaf.

## Acceptance Criteria

1. Full Vitest run is green and log-clean for happy-dom async navigation/fetch errors.
2. Unexpected browser async errors, unhandled rejections, and console errors fail tests unless explicitly asserted.
3. No component test depends on a local dev server.
4. Test harness behavior is documented.

## Progress Notes

- 2026-04-15: Completed `TASK-177-01`; identified happy-dom iframe preview navigation in `post-editor-canvas-wave` as the reproducible source of `AsyncTaskManager` noise.
- 2026-04-15: Completed `TASK-177-02`; shared Vitest setup now waits for happy-dom async tasks, intercepts browser-managed HTTP(S) requests in component tests, and fails on unexpected browser/console errors.
- 2026-04-15: Completed `TASK-177-03`; targeted noisy suite runs clean without hidden localhost/dev-server dependency.
- 2026-04-15: Completed `TASK-177-04`; full `bun run test:vitest` passes log-clean with 494 files and 1968 tests.
