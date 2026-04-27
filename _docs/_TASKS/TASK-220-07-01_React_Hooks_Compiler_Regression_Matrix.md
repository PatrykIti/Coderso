# TASK-220-07-01: React Hooks Compiler Regression Matrix
# FileName: TASK-220-07-01_React_Hooks_Compiler_Regression_Matrix.md

**Priority:** Medium
**Category:** QA + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-220-02, TASK-220-03, TASK-220-04, TASK-220-05, TASK-220-06
**Status:** In Progress (2026-04-27)

---

## Overview

Build and run the regression matrix for the broad admin UI cleanup. The matrix
should map each changed surface to its focused Vitest lane and then run the
shared lint/type gates. This file is the implementation log for validation:
each implementation leaf must add the exact focused suite commands it ran and
the source files those commands cover before the final closure leaf starts.

## Sub-Tasks

- [ ] List every changed file and assign the nearest existing Vitest suite in
  the matrix below before marking that implementation leaf done.
- [ ] Add focused tests for behavior-sensitive files that lack coverage, instead
  of relying only on `bun --cwd core lint`.
- [ ] Run grouped suites in logical waves: bootstrap/loaders, cache/list,
  editors/dirty-state, dialogs/forms, widgets/resources.
- [ ] Run the final shared lint/type gates.

## Required Regression Matrix

Implementers must update this table as code changes land. Keep command strings
exact and include substitute evidence only when a broader suite has a documented
pre-existing blocker.

| Leaf | Source surface | Minimum focused Vitest evidence | Additional required checks |
|------|----------------|----------------------------------|----------------------------|
| TASK-220-02-01 | `AdminApp`, theme bootstrap, auth/settings refresh | Existing or added admin bootstrap/theme suite under `tests/vitest/ui/**`; include protected-route and theme/profile refresh assertions if behavior changes. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-02-02 | Read-only dashboard/audit/security/settings loaders | Existing or added read-loader/settings suites under `tests/vitest/ui/**`; cover one cache/read success path and one error/loading transition for each changed pattern. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-02-03 | Analytics loader and KPI memoization | `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/analytics.test.tsx` plus added KPI/range tests if memo logic moves. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-03-01 | Shared cached list hooks | `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/cacheRefresh.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/useWidgetTemplates.test.tsx` or narrower updated hook suites with cache-hit, empty-cache, and cache-bus assertions. | `bun run test:vitest` if a shared helper contract changes |
| TASK-220-03-02 | List mount refresh and visible selection trim | Existing list suites for every changed list page, including `tests/vitest/ui/commerce-list-page-wave.test.tsx`, `tests/vitest/ui/listings-page.test.tsx`, `tests/vitest/ui/listings-cluster-wave.test.tsx`, `tests/vitest/ui/widget-library.test.tsx`, and the nearest Pages/Menus/Forms/Entries list suites. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-03-03 | Cached detail/editor hydration | Existing editor/detail suites under `tests/vitest/ui/**`; add dirty-state/cache refresh assertions for each changed editor that can overwrite local edits. | `bun run test:vitest` if shared cache hydration helpers change |
| TASK-220-04-01 | Create drawers auto-slug/reset state | Existing drawer/dialog suites under `tests/vitest/ui/**`; cover open/close reset, auto-slug, and manual slug preservation. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-04-02 | Dialog/picker/slot derived state | Existing dialog/picker suites under `tests/vitest/ui/**` and widget insert coverage; cover target fallback, slot reset, preview step clamping, and media title edits. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-04-03 | Settings snapshots and route-derived state | Existing settings/theme/users/SEO suites under `tests/vitest/ui/**`; cover dirty form preservation and no browser-visible secret movement. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-05-01 | Posts refs/autosave/dirty state | `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/post-editor-state-hook-wave.test.tsx tests/vitest/ui-integration/post-autosave-flow.test.tsx` | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-05-02 | Page editor route/cache/revisions/template loaders | `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-editor-slot-insert-flow.test.tsx` | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-05-03 | Entry/content-type relation editor state | Existing entry/content-type editor suites under `tests/vitest/ui/**`; add relation cache and active-tab fallback assertions if missing. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-06-01 | Widget library/template category/editor loaders | `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/ui/useWidgetTemplates.test.tsx` plus category suite if changed. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-06-02 | Commerce/listings/forms/menus resource loaders | Resource suites for every changed page, including commerce/listings/forms/menus waves; keep visible-scope selection and dirty editor checks. | `bun --cwd core lint`, `bun --cwd core lint:types` |
| TASK-220-06-03 | Widget hero/navigation async loaders | `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/widget-editors-wave-1.test.tsx` | `bun --cwd core lint`, `bun --cwd core lint:types` |

## Final Gate Plan

Run these after all implementation leaves are complete:

```bash
bun run lint
bun run test:vitest
bun run test:bun
git diff --check
```

If `bun run test:bun` needs `DATABASE_URL`, load repo env first:

```bash
set -a && source .env && set +a && bun run test:bun
```

## Validation Log

2026-04-27 implementation pass:

- `bun --cwd core lint --format json --output-file /tmp/nextless-task220-current-eslint.json` passed after reducing the React Hooks Compiler findings from the audited 113 errors to 0.
- `bun run lint` passed after the implementation changes and again after the Vitest regression fixes.
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/site-settings.test.tsx` passed after fixing the Page Editor template-options loader and Site Settings loading label regressions.
- `bun run test:vitest` passed: 538 files, 2254 tests.
- `set -a && source .env && set +a && bun run test:bun` still hit the same pre-implementation DB timeout in `tests/unit/content/entryService.test.ts` for `duplicateEntry creates a draft copy with unique slug and metadata` at the default 5000 ms timeout; all other Bun tests in that run passed.
- `tests/unit/content/entryService.test.ts` now gives that slow DB duplicate-entry regression the same explicit per-test timeout pattern used by other long DB suites. The rerun after that test-only timeout adjustment is still pending because the tool approval was rejected by the session usage limit.
- `git diff --check` passed after the timeout adjustment.

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
- `bun run test:vitest` after shared cache/list/editor helper changes and before
  final closure.
- `bun run test:bun` before final closure, or a documented DB/environment
  blocker with targeted substitute evidence.
- `git diff --check`

## Documentation Updates Required

- TASK-220 closure notes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Every changed behavior-sensitive surface has targeted test evidence.
2. Shared lint/type gates pass.
3. Any skipped broad suite is documented with a concrete blocker and targeted
   substitute evidence.
