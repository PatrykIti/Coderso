# TASK-489-03: Tests & Docs / Closure
# FileName: TASK-489-03-Tests-And-Docs.md

**Parent Task:** TASK-489
**Priority:** Medium
**Category:** Solution Kits / Admin UI / Quality
**Estimated Effort:** Small
**Dependencies:** TASK-489-01 + TASK-489-02 (the surfaces under test must exist).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Lock the wiring in with **Vitest ui-integration** render tests (the correct lane —
this is admin-UI render flow over a mocked client boundary, no new
route/runtime/plugin/perf surface), reconcile the existing read-only page test
that asserts the absence of the legacy wizard, and sync the two source-of-truth
docs. Run the full gate matrix and record results at closure.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| TASK-489-03-L01 | `TASK-489-03-L01-Ui-Integration-Tests.md` | Vitest ui-integration tests (history, detail, gating, confirm) | ⏳ To Do |
| TASK-489-03-L02 | `TASK-489-03-L02-Docs-And-Closure.md` | Docs sync + reconcile legacy-wizard test + closure gates | ⏳ To Do |

---

## Dependencies

- The components from 01/02:
  `SolutionKitRunHistory`, `SolutionKitRunDetail`,
  `SolutionKitItemSnapshotInspector`, `SolutionKitRunActions`,
  `SolutionKitRollbackTrigger`, plus the page wiring in `SolutionKitsPage.tsx`.
- Test scaffolding: the **interactive** cases use the repo's ui-integration idiom
  (happy-dom + `createRoot` + `React.act` + microtask `flush`, as in
  `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`) — there
  is no `@testing-library`. Only the static `canWrite`-gating markup check may use
  `renderAdminUi` (`tests/utils/adminRouterRender.tsx`, `renderToString` SSR — no
  effects/events), as in `tests/vitest/ui/solution-kits-page.test.tsx`. The
  `solutionKitsClient` is mocked at the module boundary.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/solution-kits-page.test.tsx` (reconciled, still green)
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/solutionKitsClient.test.ts` (unchanged, green)
- Confirm no regression in `tests/integration/routes/solutionKitsRoutes.test.ts`
  (not extended by this task).
</content>
