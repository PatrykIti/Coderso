# TASK-342-01: Evidence Reconciliation for the 27-05-2026 Report Wave

# FileName: TASK-342-01_Evidence_Reconciliation_for_the_27_05_2026_Report_Wave.md

**Priority:** High
**Category:** QA + Playwright + Widgets + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-341
**Status:** To Do

---

## Overview

Reconcile the conflict between the older `TASK-336-19` final smoke evidence and
the 2026-05-27 current-state rerun before implementation starts.

This leaf exists to prevent cargo-cult fixes. The current repo evidence says
both "all seven widgets passed" and "seven widgets are still outliers",
depending on which evidence set is treated as authoritative. The family cannot
start implementation honestly until that conflict is classified widget by
widget.

## Source Findings

- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-full-rerun-2026-05-26-final5.md`
  records `fixtureGaps=0` and `metadataGaps=0`.
- `_docs/PLAYWRIGHT/27-05-2026/README.md` records `fixtureGaps=3` and
  `metadataGaps=4`.
- The four metadata-gap widgets are functional in the clean rerun and only fail
  the strict control-ownership contract.
- The three commerce widgets already have populated runtime proof in unit/UI
  tests, so their current outlier status may be fixture-data drift rather than a
  renderer regression.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `TASK-342_Widget_Playwright_Gap_Closure_After_TASK-341.md` | Update the umbrella evidence matrix and scope notes with the reconciled classification. |
| `TASK-342-02_Metadata_Gap_Admin_Contract_Wave.md` | Update the metadata branch if reconciliation shrinks or expands the admin wave. |
| `TASK-342-03_Commerce_Populated_Fixture_Wave.md` | Update the commerce branch if reconciliation proves a shared fixture/bootstrap owner. |
| `_docs/PLAYWRIGHT/27-05-2026/README.md` | Add a dated note if the reconciliation proves the current interpretation changed. |
| `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` | Touch only if the reconciliation proves that fixture expectation metadata is wrong today. |
| `scripts/playwright-widget-contract-smoke.ts` | Touch only if the reconciliation proves a harness-classification drift. |
| `tests/unit/playwright-widget-contract-smoke.test.ts` | Cover any harness or inventory expectation change. |

## Implementation Pseudocode

```ts
1. Diff these exact evidence artifacts:
   - `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-full-rerun-2026-05-26-final5.{md,json}`
   - `.tmp/widget-contract-smoke-2026-05-27-clean.{md,json}`
   - `_docs/PLAYWRIGHT/27-05-2026/README.md`
2. For each of the 7 widgets, classify the delta as:
   - real repo regression
   - harness drift
   - fixture-data drift
3. Build an owner matrix:
   - widget/editor files
   - shared harness/inventory files
   - exact tests to rerun
4. Update TASK-342 and its branch tasks so implementation starts from the
   reconciled truth, not from the raw first-pass report.
```

Data flow:

- Use the two smoke artifacts plus the current 27-05 per-widget reports as the
  primary evidence.
- Use current source files and tests only to explain ownership, not to override
  the smoke evidence without proof.

Error handling:

- If evidence is still ambiguous after direct artifact comparison, mark the
  affected widget as `needs shared spike` rather than guessing a widget-local
  bug.
- Do not mark any widget "fixed by planning" in this leaf.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `git diff --check`
- Re-run or inspect both smoke evidence sets referenced in this leaf
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts` only if the
  reconciliation changes harness/inventory behavior

## Documentation Updates Required

- Update the TASK-342 family docs with the reconciled classification matrix.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Every one of the seven outliers is explicitly classified before implementation
  starts.
- TASK-342 no longer mixes unresolved regression, harness, and fixture-data
  theories in one flat scope.
- The implementation leaves inherit an exact owner/test matrix rather than a
  speculative one.
