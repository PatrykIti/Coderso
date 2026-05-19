# TASK-274-06: Logo Cloud Report Docs and Closure

# FileName: TASK-274-06_Logo_Cloud_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Logo Cloud + QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-274-01, TASK-274-02, TASK-274-03, TASK-274-04, TASK-274-05, TASK-256-08, TASK-313-03
**Status:** To Do

---

## Overview

Close the Logo Cloud Playwright follow-up family with a finding-by-finding
coverage pass against `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`, current
code, widget docs, changelog, and task board state.

This leaf is not allowed to mark TASK-274 complete from proxy evidence alone.
It must verify every source-report finding against concrete code, tests, docs,
or an explicit TASK-256/deferred owner.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Add fixed/deferred/current-state evidence for TASK-274 findings. Do not commit PNG files. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Ensure data model, editor modes, runtime behavior, and validation lanes match code. |
| `_docs/WIDGETS.md` | Update only if global widget summary or token tables changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Logo Cloud pack readiness/completeness changed. |
| `_docs/_TASKS/TASK-274*.md` | Update statuses and final validation notes. |
| `_docs/_TASKS/README.md` | Move TASK-274 rows to the correct board state and update statistics. |
| `_docs/_CHANGELOG/*.md` | Add a numbered changelog entry for the completed family. |
| `_docs/_CHANGELOG/README.md` | Register the new changelog entry. |

## Closure Checklist

Source report coverage:

- BUG-01 through BUG-05 are either fixed by `TASK-256`, fixed by `TASK-313`,
  verified current-state OK, or explicitly linked to a remaining shared owner.
- UX-01 through UX-09 are either fixed by TASK-256, fixed by TASK-274,
  current-state verified, or deferred with a named owner.
- BF-01 through BF-11 are either fixed by TASK-274, not applicable, already OK,
  or deferred with a named owner.
- A1 through A7 are either fixed by TASK-256, already OK, fixed by TASK-274
  where product-owned, or explicitly deferred with a named owner.

Code and docs consistency:

- `core/widgets/core/logoCloud.tsx` owns all schema/default/normalizer/runtime
  fields introduced by TASK-274.
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` imports those fields from
  the widget owner instead of duplicating enum/default logic.
- `tests/vitest/widgets/logoCloud.test.tsx` and
  `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` cover the new runtime and
  editor contracts.
- `_docs/_WIDGETS/LOGO_CLOUD.md` matches current code and does not describe
  future fields as already shipped.
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` distinguishes fixed, shared
  TASK-256, deferred, and not-applicable findings.

## Implementation Pseudocode

```ts
type CoverageStatus =
  | "task-274-fixed"
  | "task-256-owned"
  | "current-state-ok"
  | "deferred"
  | "not-applicable";

type CoverageRow = {
  finding: string;
  status: CoverageStatus;
  evidence: string[];
  remainingOwner?: string;
};

function assertCoverage(rows: CoverageRow[]) {
  const uncovered = rows.filter((row) => row.evidence.length === 0 && row.status !== "deferred");
  if (uncovered.length > 0) {
    throw new Error(`Missing Logo Cloud coverage evidence: ${uncovered.map((row) => row.finding).join(", ")}`);
  }
}
```

Manual closure flow:

1. Re-read the source report and TASK-256-06-02 before changing closure docs.
2. Build a finding-by-finding coverage table in the report or closure notes.
3. Run the targeted Logo Cloud suites and required repo gates.
4. Update task statuses only after code/docs/tests are aligned.
5. Add changelog entry and update changelog index.
6. Re-run `git diff --check`, `bun run precommit`, and any targeted suites that
   changed during closure.

Closure error handling:

- If any report row lacks code, test, docs, TASK-256, deferred, or
  not-applicable evidence, keep TASK-274 open and add or repair the owner leaf
  before moving statuses.
- If shared safe-link, heading, ARIA, hoverColor, `logoHeight: "none"`, or
  Advanced-mode work has not landed, mark the affected rows with the exact
  remaining shared owner (`TASK-256-*` or `TASK-313-*`) instead of claiming a
  `TASK-274` fix.
- If validation cannot run because of database, network, or environment
  blockers, record the command, blocker, and retry requirement, and leave status
  unchanged unless the owner explicitly accepts the risk.
- If report evidence depends on Playwright screenshots, record textual runtime
  assertions and do not commit PNG files.

## Sub-Tasks

- None. This is the closure and evidence leaf for the TASK-274 family.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must confirm validator coverage exists for
  every new schema field from TASK-274.
- Anti-abuse: closure must confirm safe href/media behavior is covered through
  TASK-256 or local tests before marking link/media findings fixed.

## Testing Requirements

Minimum final family gate:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/logoCloudStyles.test.ts` if the
  family adds marquee CSS.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if any
  style/clear/none behavior changed in the family.
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when
  link target/CTA behavior consumes TASK-256 shared link attributes.
- `bun test tests/unit/widgets/validator.test.ts` only when intentionally adding
  Logo Cloud coverage to the generic Bun validator suite.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

Docs-only closure updates after implementation:

- `git diff --check`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/WIDGETS.md` only when global docs changed.
- `_docs/WIDGET_PACK_MATRIX.md` only when pack readiness changed.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- A numbered `_docs/_CHANGELOG/*task-274-logo-cloud*.md` entry.

## Acceptance Criteria

- TASK-274 does not overclaim `TASK-256` or `TASK-313` shared findings as local
  fixes.
- Every report finding has concrete evidence or a named remaining owner.
- Task files, board statistics, widget docs, report, and changelog are in sync.
- Final validation commands and any blockers are recorded before status moves to
  `Done`.
