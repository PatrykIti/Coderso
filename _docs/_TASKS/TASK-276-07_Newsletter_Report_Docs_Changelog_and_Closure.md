# TASK-276-07: Newsletter Report, Docs, Changelog, and Closure

# FileName: TASK-276-07_Newsletter_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation + Changelog + Playwright Evidence
**Estimated Effort:** Medium
**Dependencies:** TASK-276-01, TASK-276-02, TASK-276-03, TASK-276-04, TASK-276-05, TASK-276-06
**Status:** To Do

---

## Overview

Close the Newsletter Playwright follow-up family only after implementation,
tests, report evidence, docs, changelog, and task board state agree.

This leaf is the explicit final audit for
`_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`. It must not mark the family done
while any report finding is only implicitly handled.

## Scope Boundary

This leaf owns:

- Final fixed/deferred/not-reproducible rows for every Newsletter report
  finding.
- `_docs/_WIDGETS/NEWSLETTER.md` source-of-truth updates.
- `_docs/WIDGETS.md` and `_docs/WIDGET_PACK_MATRIX.md` only where contracts
  changed.
- Changelog entry and `_docs/_CHANGELOG/README.md`.
- TASK-276 file statuses and `_docs/_TASKS/README.md` board/statistics sync.
- Final validation evidence and skipped-suite explanation.

This leaf does not own:

- New implementation beyond small docs/report fixes needed to accurately record
  completed behavior.
- Broad TASK-256 closure.
- Committing Playwright PNG screenshot artifacts.

## Sub-Tasks

- [ ] Build a finding-by-finding matrix from
  `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`.
- [ ] Mark each row as `fixed`, `TASK-256 shared scope`, `deferred to future
  physical task`, `not reproducible`, or `needs-refresh`.
- [ ] Verify every fixed row has matching code/test evidence, not just task
  prose.
- [ ] Update `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` with final textual
  evidence. Keep PNG screenshot names as labels only; do not commit PNGs.
- [ ] Update `_docs/_WIDGETS/NEWSLETTER.md` with final schema/editor/runtime
  behavior.
- [ ] Update `_docs/WIDGETS.md` or `_docs/WIDGET_PACK_MATRIX.md` only if final
  behavior changes those global contracts.
- [ ] Add a changelog entry and update `_docs/_CHANGELOG/README.md`.
- [ ] Move TASK-276 task files and `_docs/_TASKS/README.md` rows to `Done`
  with dates.
- [ ] Run final targeted validation, `bun run gates:coderso`,
  `bun run scan:security:strict`, and `bun run precommit` unless a blocker is
  explicitly recorded and accepted before closure.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` | Add final textual fixed/deferred/not-reproducible evidence and validation notes. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Update schema/editor/runtime/security contract. |
| `_docs/WIDGETS.md` | Update only if global widget behavior changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Newsletter pack readiness/completeness changed. |
| `_docs/_TASKS/TASK-276*.md` | Update status, dates, validation evidence, and remaining follow-ups. |
| `_docs/_TASKS/README.md` | Move rows and synchronize statistics. |
| `_docs/_CHANGELOG/*.md` | Add final TASK-276 changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add changelog index row. |

## Implementation Pseudocode

```md
## Final TASK-276 Evidence

| Finding | Status | Owner | Evidence | Notes |
|---|---|---|---|---|
| BUG-01 email input missing name | fixed | TASK-276-01 | `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx` | email name/id/label covered |
| BF-14 analytics integration | deferred | TASK-276-02 | n/a | deferred to a named physical follow-up if not implemented |
```

Closure helper shape:

```ts
type NewsletterFindingStatus =
  | "fixed"
  | "task-256-shared-scope"
  | "future-task"
  | "not-reproducible"
  | "needs-refresh";

function classifyNewsletterFinding(finding: ReportFinding, evidence: EvidenceMap) {
  if (evidence.has(finding.id)) return "fixed";
  if (finding.owner === "TASK-256") return "task-256-shared-scope";
  if (finding.requiresProductExpansion) return "future-task";
  return "needs-refresh";
}
```

Error handling:

- Do not mark any report row fixed without direct code/test or
  non-reproducible evidence.
- If broad gates fail for unrelated reasons, isolate the failure and keep the
  exact command output in closure notes.
- If DB-backed public-write tests cannot run because `DATABASE_URL` is
  unavailable, record the blocker and do not mark public-write closure complete
  until rerun or accepted.
- If another agent changed `_docs/_TASKS/README.md`, rebase/merge and reconcile
  only TASK-276 rows and statistics.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must verify schema/route tests for leaves
  that changed schema or public submit behavior.
- Anti-abuse: final report evidence must confirm nonce/CAPTCHA/rate-limit
  behavior for any Coderso-owned public write path.
- Secret handling: closure notes and reports must not include secrets, tokens,
  private URLs, nonce values, provider keys, raw submissions, or privileged
  debug payloads.

## Testing Requirements

- Run every targeted suite listed in completed TASK-276 leaves.
- At minimum for code closure:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
    style/clear/default adjacency changed
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults changed
  - Forms/public-write Bun and security suites when public submit behavior
    changed
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`
- Docs-only closure corrections before implementation lands: `git diff --check`
  is sufficient only when task statuses remain `To Do`.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/WIDGETS.md` only if global behavior changed.
- `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness changed.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New `_docs/_CHANGELOG/<next>-<date>-task-276-newsletter-widget-playwright-followups.md`

## Changelog Policy

- TASK-276 cannot move to `Done` until this leaf adds a changelog entry and
  updates `_docs/_CHANGELOG/README.md`.
- If implementation lands as multiple commits, the final changelog entry must
  list every completed TASK-276 leaf.

## Acceptance Criteria

- Every Newsletter report finding is fixed, excluded as TASK-256 shared scope,
  not reproducible with evidence, or deferred to a named future physical task.
- Final report evidence maps directly to code/test proof.
- Newsletter docs reflect final schema/editor/runtime/security behavior.
- Board rows, task statuses, changelog, and validation evidence are synchronized.
- No Playwright PNG artifacts or unrelated task/report edits are committed.
