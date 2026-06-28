# TASK-489-01: Install-Run History & Run-Item Detail (read surface)
# FileName: TASK-489-01-Install-Run-History-And-Run-Item-Detail.md

**Parent Task:** TASK-489
**Priority:** Medium
**Category:** Solution Kits / Admin UI
**Estimated Effort:** Small–Medium
**Dependencies:** None new. Consumes `core/admin/ui/kits/hooks/useSolutionKitRuns.ts`, `core/admin/services/solutionKitsClient.ts`, and the existing read routes `GET /solution-kits/runs` + `GET /solution-kits/runs/:runId`.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Deliver the **read-only** half of TASK-489: mount the already-built, currently
dead `useSolutionKitRuns` hook in `SolutionKitsPage.tsx` and render (a) the
install-run **history list** and (b) the run-item **detail drill-down** for the
selected run. No write actions in this subtask — those land in TASK-489-02.

The hook is keyed on a single `SolutionKitId | null`; the page already resolves
`effectiveSelectedId` (`selectedId ?? items[0]?.id ?? null`). This subtask wires
`useSolutionKitRuns(effectiveSelectedId)` so history follows the selected kit and
re-fetches when the user changes kits.

The hook already exposes everything needed:
`runs`, `isLoading`, `error`, `selectedRunId`, `setSelectedRunId`, `selectedRun`
(`{ run, items }`), `isDetailLoading`, `detailError`, `refreshRuns`. Leaves
**consume** these — they must not refetch or re-cache independently.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| TASK-489-01-L01 | `TASK-489-01-L01-Run-History-List-Panel.md` | Run history list panel (mount hook, render runs, select run) | ⏳ To Do |
| TASK-489-01-L02 | `TASK-489-01-L02-Run-Item-Detail-Drilldown.md` | Run-item detail drill-down (operations, snapshots, errors) | ⏳ To Do |

---

## Dependencies

- `useSolutionKitRuns` (`core/admin/ui/kits/hooks/useSolutionKitRuns.ts`) — verified
  to exist and to be imported nowhere else (dead).
- `solutionKitsClient.ts` run types: `SolutionKitInstallRunRecord`,
  `SolutionKitInstallItemRecord`, `SolutionKitRunDetail`,
  `SolutionKitInstallSummary`, `SolutionKitInstallMode`,
  `SolutionKitInstallStatus` (run status; drives L01 `runStatusBadgeVariant`),
  `SolutionKitInstallItemOperation`, `SolutionKitInstallItemStatus`.
- Existing admin primitives already imported by the page: `Card*`, `Badge`,
  `Alert*`, `Button` (`@/components/ui/*`).
- L02 depends on L01 (the selected run drives the detail panel).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest ui-integration coverage authored in TASK-489-03-L01
  (`tests/vitest/ui-integration/solution-kits-runs.test.tsx`): asserts the history
  list renders the mocked runs, selecting a run loads its items, and
  loading/empty/error states render. The existing
  `tests/vitest/ui/solution-kits-page.test.tsx` must stay green (reconciled in
  03-L02).
</content>
