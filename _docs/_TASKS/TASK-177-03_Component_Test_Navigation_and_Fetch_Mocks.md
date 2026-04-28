# TASK-177-03: Component Test Navigation and Fetch Mocks
# FileName: TASK-177-03_Component_Test_Navigation_and_Fetch_Mocks.md

**Priority:** High
**Category:** QA + Admin UI Tests
**Estimated Effort:** Large
**Dependencies:** TASK-177-01, TASK-177-02
**Status:** Done (2026-04-15)

---

## Overview

Fix the component tests and/or components identified in `TASK-177-01` so they do not start real happy-dom navigation or fetches to `localhost:3000`.

## Sub-Tasks

No child task files.

## Files to Change

- noisy test files identified by `TASK-177-01`
- possibly `tests/setup/vitest.ts`
- possibly small test-only helper utilities
- production components only if they trigger unsafe default navigation in real UI

## Security Contract

- Visibility: test/admin UI behavior only.
- Auth model: no production auth changes unless a component bug is found.
- RBAC: no change.
- CSRF: no change.
- Rate-limit bucket: no change.
- Reject-unknown validation: no change.
- Anti-abuse:
  - component tests must mock network and navigation,
  - no test should require a live localhost dev server,
  - no broad catch-all suppression of navigation errors.
- Idempotency: tests must be deterministic and isolated.
- Secret handling: mocks use fake values only.

## Testing Requirements

- Targeted noisy suites pass without happy-dom navigation/fetch logs.
- Full `bun run test:vitest` pass remains green.
- Run:
  - targeted affected Vitest files,
  - `bun --cwd core lint`,
  - `bun --cwd core lint:types`.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- changelog entry on completion.

## Acceptance Criteria

1. No targeted suite emits `AsyncTaskManager has been aborted`.
2. No targeted suite emits `ECONNREFUSED 127.0.0.1:3000`.
3. Tests explicitly assert navigation/fetch behavior when it matters.

## Progress Notes

- 2026-04-15: Component test navigation/fetch side effects are controlled through the shared Vitest setup instead of individual broad suppressions. Iframe preview URLs still render as attributes for assertions, but happy-dom no longer performs real network navigation for those browser-managed requests.
- 2026-04-15: Targeted `tests/vitest/ui/post-editor-canvas-wave.test.tsx` now passes without `AsyncTaskManager` or `ECONNREFUSED` noise.
