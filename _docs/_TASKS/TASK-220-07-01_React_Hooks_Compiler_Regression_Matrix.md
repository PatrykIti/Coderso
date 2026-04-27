# TASK-220-07-01: React Hooks Compiler Regression Matrix
# FileName: TASK-220-07-01_React_Hooks_Compiler_Regression_Matrix.md

**Priority:** Medium
**Category:** QA + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-220-02, TASK-220-03, TASK-220-04, TASK-220-05, TASK-220-06
**Status:** To Do

---

## Overview

Build and run the regression matrix for the broad admin UI cleanup. The matrix
should map each changed surface to its focused Vitest lane and then run the
shared lint/type gates.

## Sub-Tasks

- [ ] List every changed file and assign the nearest existing Vitest suite.
- [ ] Add focused tests for behavior-sensitive files that lack coverage.
- [ ] Run grouped suites in logical waves: bootstrap/loaders, cache/list,
  editors/dirty-state, dialogs/forms, widgets/resources.
- [ ] Run the final shared lint/type gates.

## Files to Change

- `tests/vitest/ui/**`
- `tests/vitest/ui-integration/**`
- `tests/vitest/admin/**`
- `_docs/_TASKS/TASK-220-07_Validation_Docs_and_Closure.md`
- `_docs/_TASKS/README.md`

## Security Contract

- Visibility: local/CI validation.
- Auth model: test fixtures only; no auth model change.
- RBAC: fixtures must preserve current permission assumptions.
- CSRF: admin write tests should keep existing CSRF/test client behavior.
- Rate-limit bucket: not applicable to local tests.
- Reject-unknown validation: unchanged.
- Anti-abuse: tests must cover request count/refresh behavior where refactors
  touch cache/list loaders.
- Secret handling: do not load real provider secrets into Vitest fixtures.

## Pseudocode

```bash
bun --cwd core lint
bun --cwd core lint:types
bun run lint:repo

./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/admin/cacheRefresh.test.ts \
  tests/vitest/ui/post-editor-state-hook-wave.test.tsx \
  tests/vitest/ui-integration/post-autosave-flow.test.tsx
```

## Testing Requirements

- Every implementation leaf records focused validation.
- `bun run test:vitest` if shared cache/list helpers changed.
- `git diff --check`

## Documentation Updates Required

- TASK-220 closure notes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Every changed behavior-sensitive surface has targeted test evidence.
2. Shared lint/type gates pass.
3. Any skipped broad suite is documented with a concrete blocker and targeted
   substitute evidence.
