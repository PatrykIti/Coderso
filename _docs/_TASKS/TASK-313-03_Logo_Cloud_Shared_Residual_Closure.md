# TASK-313-03: Logo Cloud Shared Residual Closure

# FileName: TASK-313-03_Logo_Cloud_Shared_Residual_Closure.md

**Priority:** Medium
**Category:** Widgets + Logo Cloud + QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-313-01, TASK-313-02
**Status:** Done (2026-05-19)

---

## Overview

Close the reopened Logo Cloud shared-contract residual family with a
finding-by-finding evidence pass against the live checkout, source report,
widget docs, changelog, and board state.

This leaf is not allowed to mark `TASK-313` complete from proxy evidence alone.
It must verify every reopened shared row against concrete code, tests, docs, or
an explicit current-state note.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Add fixed/current-state/deferred evidence for the reopened shared rows. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Ensure shared mode ownership and runtime baseline match code. |
| `_docs/_TASKS/TASK-313*.md` | Update statuses and final validation notes. |
| `_docs/_TASKS/README.md` | Move `TASK-313*` rows to the correct board state and update statistics. |
| `_docs/_CHANGELOG/*.md` | Add a numbered changelog entry for the completed family. |
| `_docs/_CHANGELOG/README.md` | Register the new changelog entry. |

## Closure Checklist

Source report coverage:

- `UX-07` is fixed or explicitly current-state-verified under `TASK-313-01`.
- `BF-10` shared link-input feedback is fixed or explicitly current-state
  verified under `TASK-313-01`.
- `BUG-02`, `BF-09`, and `BUG-05` are fixed or explicitly current-state
  verified under `TASK-313-02`.
- Shared rows that already landed under `TASK-256-06-02` remain distinguished
  from the reopened `TASK-313` scope.

Code and docs consistency:

- `core/widgets/core/logoCloud.tsx` owns the shared runtime semantics repaired
  by `TASK-313-02`.
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` reflects the settled
  shared editor-mode ownership from `TASK-313-01`.
- `tests/vitest/widgets/logoCloud.test.tsx`,
  `tests/vitest/widgets/renderer.test.tsx`,
  `tests/vitest/widgets/styleNoneTokens.test.tsx`, and
  `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` cover the repaired shared
  contract.
- `_docs/_WIDGETS/LOGO_CLOUD.md` matches current code and does not describe
  future `TASK-274` product fields as already shipped.

## Implementation Pseudocode

```ts
type SharedCoverageStatus =
  | "task-313-fixed"
  | "task-256-fixed"
  | "current-state-ok"
  | "deferred";

type SharedCoverageRow = {
  finding: string;
  status: SharedCoverageStatus;
  evidence: string[];
};

function assertSharedCoverage(rows: SharedCoverageRow[]) {
  const uncovered = rows.filter((row) => row.evidence.length === 0 && row.status !== "deferred");
  if (uncovered.length > 0) {
    throw new Error(
      `Missing Logo Cloud shared residual coverage: ${uncovered.map((row) => row.finding).join(", ")}`
    );
  }
}
```

## Sub-Tasks

- None. This is the closure and evidence leaf for the `TASK-313` family.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must confirm no product-only `TASK-274`
  fields were added while fixing the shared reopen.
- Anti-abuse: closure must confirm safe-href behavior remains covered before
  marking link-input shared rows fixed.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if any
  shared helper behavior changes
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- A numbered `_docs/_CHANGELOG/*task-313-logo-cloud-shared-residuals*.md` entry.

## Acceptance Criteria

- `TASK-313` does not overclaim `TASK-274` product findings as shared fixes.
- Every reopened shared row has concrete evidence or an explicit current-state
  note.
- Task files, board statistics, widget docs, report, and changelog are in sync.

## Completion Notes

- 2026-05-19: `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`,
  `_docs/_WIDGETS/LOGO_CLOUD.md`, `_docs/_TASKS/README.md`, and the new
  changelog entry now all record the reopened shared residual closure before
  `TASK-274` product implementation proceeds.
- Validation:
  - `git diff --check`
  - `bun run precommit`
