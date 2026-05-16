# TASK-268-06: Footer Report, Docs, Changelog, and Closure

# FileName: TASK-268-06_Footer_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Documentation + Playwright QA + Release Notes
**Estimated Effort:** Medium
**Dependencies:** TASK-268-01, TASK-268-02, TASK-268-03, TASK-268-04, TASK-268-05
**Status:** To Do

---

## Overview

Close the Footer Playwright follow-up family with synchronized evidence,
documentation, changelog, board status, and validation.

This leaf does not implement new Footer behavior. It proves that every Footer
report row has a final state: fixed, explicitly TASK-256/shared scope, not
Footer scope, not reproducible against current code, or deferred to a named
future physical task with a reason.

## Scope Boundary

This leaf owns:

- Final textual evidence in `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`.
- Footer source-of-truth docs in `_docs/_WIDGETS/FOOTER.md`.
- `_docs/WIDGETS.md` only when the implementation changes general widget
  wording.
- `_docs/WIDGET_PACK_MATRIX.md` only when Footer readiness/completeness changes.
- `_docs/_TASKS/README.md` board rows/statistics.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when TASK-268 or leaves
  move to `Done`.
- Final validation matrix for Footer implementation.

This leaf does not own PNG screenshot commits. Playwright PNG files remain local
artifacts and must not be staged.

## Sub-Tasks

- [ ] Build a row-by-row closure matrix from
  `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`.
- [ ] Mark every row as `fixed`, `TASK-256/shared`, `not-footer-scope`,
  `not-reproducible`, or `deferred`.
- [ ] For every deferred Footer-specific row, create or reference a physical
  future task with concrete owner/test paths.
- [ ] Refresh `_docs/_WIDGETS/FOOTER.md` so it matches the implemented schema,
  defaults, render contract, editor modes, slots, and validation behavior.
- [ ] Update `_docs/WIDGETS.md` and `_docs/WIDGET_PACK_MATRIX.md` only when the
  final implementation changes their source-of-truth contracts.
- [ ] Add changelog entry and update changelog index when any TASK-268 task
  moves to `Done`.
- [ ] Move task statuses and board rows only after validation evidence exists.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` | Add final fixed/deferred/not-scope evidence and textual admin/frontend proof. |
| `_docs/_WIDGETS/FOOTER.md` | Match the final Footer schema, render behavior, editor modes, slots, and safety constraints. |
| `_docs/WIDGETS.md` | Update only if general widget contract wording changes. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Footer readiness/completeness changes. |
| `_docs/_TASKS/TASK-268*.md` | Update status/date/checklists when leaves close. |
| `_docs/_TASKS/README.md` | Move rows and update statistics on status changes. |
| `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-footer-widget-playwright-followups.md` | Add the final family or leaf changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row with the next unused number. |

## Implementation Pseudocode

```ts
type FooterReportClosureState =
  | "fixed"
  | "task-256-shared"
  | "not-footer-scope"
  | "not-reproducible"
  | "deferred";

type FooterReportClosureRow = {
  reportLine: string;
  finding: string;
  ownerTask: "TASK-268-01" | "TASK-268-02" | "TASK-268-03" | "TASK-268-04" | "TASK-268-05" | "TASK-256" | string;
  state: FooterReportClosureState;
  evidence: string;
  validation: string[];
};

function closeFooterFinding(row: FooterReportClosureRow) {
  if (row.state === "fixed" && row.validation.length === 0) {
    throw new Error("fixed rows require concrete validation");
  }
  if (row.state === "deferred" && !row.ownerTask.startsWith("TASK-")) {
    throw new Error("deferred rows require a physical task id");
  }
}
```

Error handling:

- Do not mark a report row fixed based only on intent or task prose.
- Do not use passing broad gates as a proxy if they do not cover the row.
- If local Playwright replay is unavailable, record the exact blocker and use
  rendered DOM/test evidence; rerun Playwright when the environment is restored.
- If broad suites fail for unrelated reasons, isolate targeted Footer suites and
  record unrelated failures separately.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure notes must cite schema tests when schema
  changed.
- Anti-abuse: closure must cite safe href/external-link/icon handling tests for
  public output rows.
- Secret handling: reports and changelog entries must not include secrets,
  private URLs, nonce values, provider keys, or privileged payloads.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when public
  renderer output changed in implementation leaves.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults changed.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`
- `_docs/_WIDGETS/FOOTER.md`
- `_docs/WIDGETS.md` only for shared wording changes.
- `_docs/WIDGET_PACK_MATRIX.md` only for pack readiness/completeness changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md`

## Changelog Policy

- This leaf is the preferred owner for the final TASK-268 family changelog entry
  when implementation leaves land as one family.
- If implementation leaves land independently, each completed leaf must be
  covered by a changelog entry before moving to `Done`.

## Acceptance Criteria

- Every row in the Footer report has a documented final state and evidence.
- Footer docs match the implemented contract.
- Task board and changelog index are synchronized with final task statuses.
- Required Footer-focused tests and repo gates are recorded with command names
  and results.
- No PNG Playwright screenshots or unrelated task/report edits are staged.
