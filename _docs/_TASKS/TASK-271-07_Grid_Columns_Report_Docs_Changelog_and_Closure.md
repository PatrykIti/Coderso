# TASK-271-07: Grid Columns Report, Docs, Changelog, and Closure

# FileName: TASK-271-07_Grid_Columns_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Grid Columns + Documentation + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-271-01, TASK-271-02, TASK-271-03, TASK-271-04, TASK-271-05, TASK-271-06
**Status:** Done (2026-05-19)

---

## Overview

Close the Grid Columns product follow-up family after all implementation leaves
land. This leaf owns report reconciliation, docs, changelog, task-board sync, and
the explicit accepted/deferred/rejected matrix for report items that are not
implemented in TASK-271.

## Scope

- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` with textual evidence
  for fixed, current-state verified, deferred, or rejected findings.
- Update `_docs/_WIDGETS/GRID_COLUMNS.md` for final schema/editor/runtime
  behavior.
- Update `_docs/_TASKS/TASK-271*` statuses and `_docs/_TASKS/README.md` board
  counts.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md`.
- Record exact validation commands and results.
- Decide the W8 custom CSS class request explicitly.

## Sub-Tasks

- [x] Build a finding-by-finding closure matrix for the Grid Columns report.
- [x] Update Grid Columns widget docs and any pack matrix entry if readiness changes.
- [x] Move TASK-271 task files and `_docs/_TASKS/README.md` through final statuses.
- [x] Add the TASK-271 changelog entry and changelog index row.
- [x] Record exact validation output and any blocked Playwright replay note.
- [x] Explicitly reject or defer W8 custom classes unless a safe class policy exists.

## Required Report Classification

| Report item | Required closure result |
|---|---|
| TASK-256 exclusions from TASK-271 umbrella | Mark fixed by TASK-256, deferred to TASK-256, rerouted to TASK-325, or still open under TASK-256. Do not claim TASK-271 fixed them. |
| TASK-325 shared structural exclusions C2/C4/C5/U3/U4/P3/asymmetric truthfulness | Mark routed to TASK-325 or fixed there later. Do not claim TASK-271 fixed them. |
| C3, U2, U5, U8 | Fixed/deferred by TASK-271-01 with screenshots or textual DOM/editor evidence. |
| W7 | Fixed/deferred by TASK-271-02 with editor reorder evidence. |
| W3, W4, W6 | Fixed/deferred by TASK-271-03 with runtime class/DOM evidence. |
| W1, W9 | Fixed/deferred by TASK-271-04 with editor/runtime style evidence. |
| W2, W5, P4 | Fixed/deferred by TASK-271-05 with runtime class/DOM evidence. |
| U1, W10 | Fixed/current-state/deferred by TASK-271-06. Must mention current code already has separate `gapX` and `gapY`. |
| W8 custom CSS class per column | Reject or defer unless a safe class registry/global policy exists; do not add arbitrary raw class strings as a Grid Columns-only fix. |
| Page Preview vs Canvas Preview discovery | Current-state/no Grid Columns fix, or route to a future shared admin preview UX task. |

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Add final fixed/deferred/rejected evidence. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Reflect final Grid Columns schema/editor/runtime behavior. |
| `_docs/_TASKS/TASK-271*.md` | Update statuses and closure notes. |
| `_docs/_TASKS/README.md` | Move TASK-271 rows through board state and update statistics. |
| `_docs/_CHANGELOG/<next>-<completion-date>-task-271-grid-columns-widget-followups.md` | New changelog entry when the family is complete. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index entry. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Grid Columns pack readiness/completeness changes. |

## Implementation Pseudocode

Closure matrix:

```md
| Report ID | Source section | Resolution | Evidence | Owner task |
|---|---|---|---|---|
| W3 | 3.2 | Fixed | `data-grid-columns-reverse-mobile="true"` plus mobile class output | TASK-271-03 |
| W8 | 3.2 | Rejected | Raw class strings conflict with strict schema/security policy | TASK-271-07 |
```

Validation capture:

```md
## Validation

- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx` - passed
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx` - passed
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx` - passed,
  including schema rejection coverage when TASK-271 changed persisted fields
- `bun run scan:security:strict` - passed
- `bun run precommit` - passed
```

Error handling:

- If broad suites fail for unrelated reasons, record the unrelated failure and
  still keep targeted Grid Columns proof complete.
- If Playwright rerun is unavailable, use textual DOM/runtime evidence and state
  the blocker clearly.
- Do not mark TASK-271 `Done` until board stats, changelog index, task statuses,
  and report evidence agree.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: final docs must list every new schema field and
  the tests that reject unknown fields.
- Anti-abuse: closure must confirm no arbitrary class strings, raw HTML/scripts,
  or public write behavior were introduced.
- Secret handling: no secrets in reports, diagnostics, screenshots, or widget
  docs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  when the closure evidence depends on page-builder preview/inspector proof for
  W7 or other block-settings-owned Grid Columns interactions.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  integration changed.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  style token behavior changed.
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx` when
  schema/defaults changed.
- `bun test tests/unit/widgets/registry.test.ts` if registry/default wiring
  changed.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md`.
- Update `_docs/_WIDGETS/GRID_COLUMNS.md`.
- Update `_docs/_TASKS/README.md`.
- Add/update `_docs/_CHANGELOG/*`.
- Update `_docs/WIDGET_PACK_MATRIX.md` only when readiness changes.

## Acceptance Criteria

- Every source report finding has exactly one final classification: TASK-256,
  TASK-325, fixed by TASK-271, current-state verified, deferred, or rejected.
- TASK-271 does not claim to fix TASK-256-owned or TASK-325-owned shared-contract drift.
- Changelog, board stats, task statuses, and docs agree.
- Final validation includes exact commands and results.
- W8 is not silently implemented as raw arbitrary classes.

## Progress Notes

- 2026-05-19: the Playwright report is now rewritten as a closure matrix and
  `_docs/_WIDGETS/GRID_COLUMNS.md` matches the shipped owner contract.
- 2026-05-19: a post-closeout agent audit found and fixed additional local drift:
  no-slot runtime rendering truncated configured columns, per-column overflow
  was still coupled to local card shells, Advanced missed the `masonry-lite`
  lock/context truthfulness, and the remaining `config` copy was still user-facing drift.
- 2026-05-19: scoped Grid Columns validation is green again after that repair;
  broad Bun/Vitest lanes still surface unrelated repo noise under the shared DB
  workload, and the user explicitly accepted scoped closeout for this worktree.

## Validation

- `git diff --check`
  - passed
- `bun run lint`
  - passed
- `bun run test:vitest`
  - started, surfaced an unrelated early failure in
    `tests/vitest/ui/feature-grid-editor-wave.test.tsx`, then was stopped after
    the user redirected closeout to scoped validation only
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  - passed (`3` files, `37` tests)
- `bun run scan:security:strict`
  - passed (`0` blocking findings)
- `bun run precommit`
  - passed
- `bun run test:bun`
  - failed outside the Grid Columns owner surface with `14` unrelated failures
    clustered in `solution kits`, `listing templates`, `detail-page/content-route`,
    and `assistantHouseProjectsCatalogPublicSite`
  - the earlier assistant DB failure from the previous note did not reproduce in
    this run
- `bun --cwd core lint`
  - passed again during the 2026-05-21 audit rerun
- `bun --cwd core lint:types`
  - passed again during the 2026-05-21 audit rerun
- `bun run gates:coderso`
  - passed during the 2026-05-21 audit rerun

## Completion Notes

- 2026-05-19: report closure matrix, widget docs, task family docs, board rows,
  and changelog are synchronized.
- 2026-05-19: TASK-271 is closed for task scope with scoped Grid Columns proof
  green. Remaining red signals are broad-lane repo noise outside the
  Grid Columns owner files, and the user accepted closing this worktree on the
  scoped pass instead of reopening unrelated families.
