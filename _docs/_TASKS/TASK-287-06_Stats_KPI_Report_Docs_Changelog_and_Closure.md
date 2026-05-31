# TASK-287-06: Stats KPI Report Docs Changelog and Closure

# FileName: TASK-287-06_Stats_KPI_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Stats KPI + Documentation + Playwright QA
**Estimated Effort:** Medium
**Dependencies:** TASK-287-01, TASK-287-02, TASK-287-03, TASK-287-04, TASK-287-05, TASK-256-08
**Status:** Done (2026-05-22)

---

## Overview

Close the Stats KPI product follow-up family after the implementation leaves
land. Refresh the Playwright report, widget docs, task board, changelog, and
validation evidence. Explicitly classify any remaining Stats KPI report item as
fixed, TASK-256-owned, rejected, or deferred with a reason.

This leaf is the only TASK-287 leaf allowed to close report-only residuals such
as count-up animation policy. It must not claim TASK-287 is complete while any
implementation leaf or required validation lane remains open.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:248-263` - priority summary that
  must be reconciled before closure.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:267-321` - suggested fixes for
  divider/grid/ARIA/Wizard. Divider/grid/ARIA remain shared-owner scope
  (`TASK-256`, `TASK-331`), while current-branch Wizard content parity is now
  owned by `TASK-287-03`.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:74,263` - W12 count-up animation,
  which should remain rejected/deferred unless a later accessibility/performance
  task approves it.
- `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md:11` - research rejects animated
  counters by default.
- `_docs/_TASKS/TASK-287_Stats_KPI_Widget_Playwright_Product_Followups.md` -
  umbrella owner for final classification.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` | Add fixed/deferred/TASK-256-owned notes for every report finding and refresh evidence after implementation. Do not commit PNG files. |
| `_docs/_WIDGETS/STATS_KPI.md` | Document final Stats KPI schema/editor/runtime contract after the leaves land. |
| `_docs/WIDGETS.md` | Update only if Stats KPI changes a global widget contract; otherwise leave shared text to TASK-256. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Stats KPI pack readiness/completeness changes. |
| `_docs/_TASKS/TASK-287*.md` | Move completed leaves and umbrella to `Done` with dates only after validation is green. |
| `_docs/_TASKS/README.md` | Move TASK-287 rows from To Do to Done and recompute statistics at closure. |
| `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-287-stats-kpi-widget-followups.md` | Add final changelog entry listing TASK-287 and completed leaves. |
| `_docs/_CHANGELOG/README.md` | Add the changelog entry with correct numbering/order. |

## Implementation Pseudocode

```md
## TASK-287 Closure Notes

| Finding | Status | Evidence |
|---|---|---|
| W1 value size | Fixed by TASK-287-01 | tests + code refs |
| W12 count-up | Deferred | rejected by research matrix until perf/a11y task approves |
| C1 divider truthfulness | TASK-256-owned | TASK-256-06-01 refs |
| C3 Wizard content parity | Fixed by TASK-287-03 | tests + code refs |
| W11/R6 split secondary grid | Shared TASK-331 | report + owner-task refs |
```

Closure data flow:

- Read the final report and all TASK-287 leaf statuses.
- Map each report finding to one of: fixed by TASK-287, fixed/owned by TASK-256,
  rejected, deferred, or still open.
- Only move rows to `Done` after source files, tests, docs, report notes,
  changelog, and board state all agree.
- Keep screenshot filenames as local labels only; do not add PNG files to the
  repo.

Error handling:

- If any implementation leaf fails validation, keep that leaf and umbrella open.
- If shared divider/grid/ARIA/color findings still belong to `TASK-256` or the
  split-secondary-grid residual belongs to `TASK-331`, record those rows under
  the shared owner rather than claiming TASK-287 fixed them.
- If `bun test:full` or DB-backed lanes are unavailable, state the blocker and
  rerun required focused lanes before closure where applicable.
- If `_docs/_TASKS/README.md` conflicts with another agent's rows, preserve both
  families and recompute statistics from the visible table.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: closure must confirm every new persisted field from
  TASK-287 leaves has schema/validator coverage.
- Anti-abuse: closure must confirm metric links and user-authored text/icons do
  not allow raw HTML, scripts, unsafe protocols, inline handlers, or unbounded
  classes.
- Secret handling: changelog/report/docs must not include secrets, private URLs,
  provider keys, or privileged settings.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if any TASK-287
  renderer changes touched shared render assumptions.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if any
  TASK-287 style/token changes touched clear/none behavior.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults changed.
- `bun test tests/unit/widgets/registry.test.ts` if widget definition metadata or
  variants changed.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md`
- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/WIDGETS.md` only for global widget-contract changes.
- `_docs/WIDGET_PACK_MATRIX.md` only for pack readiness/completeness changes.
- `_docs/_TASKS/TASK-287*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-287-stats-kpi-widget-followups.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Every Stats KPI Playwright report finding is classified with exact evidence.
- TASK-287 does not claim ownership of shared-contract fixes that belong to
  `TASK-256` or `TASK-331`.
- Widget docs, report notes, task statuses, board statistics, and changelog all
  agree.
- Required focused tests, lint/typecheck, gates, security scan, and precommit
  are green or a concrete blocker is recorded without moving the family to Done.
