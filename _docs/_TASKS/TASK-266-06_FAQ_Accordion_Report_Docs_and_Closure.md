# TASK-266-06: FAQ Accordion Report Docs and Closure

# FileName: TASK-266-06_FAQ_Accordion_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-266-01, TASK-266-02, TASK-266-03, TASK-266-04, TASK-266-05
**Status:** To Do

---

## Overview

Close the TASK-266 FAQ Accordion product follow-up family after implementation
leaves land.

This closure leaf refreshes the dedicated FAQ Accordion Playwright report,
widget docs, task board, changelog, and final validation evidence. It must not
mark TASK-256-owned rows fixed unless the TASK-256 implementation and report
evidence are already present.

## Scope Boundary

In scope:

- final fixed/deferred status for TASK-266 rows only;
- explicit references to TASK-256 for shared-contract rows;
- `_docs/_WIDGETS/FAQ.md` synchronization;
- `_docs/_TASKS/README.md` status/statistics synchronization;
- final changelog entry and `_docs/_CHANGELOG/README.md` update.

Out of scope:

- closing TASK-256;
- changing unrelated widget reports;
- committing Playwright PNG screenshots.

## Sub-Tasks

- [ ] Re-run or refresh the FAQ Accordion report evidence after TASK-266 leaves
  land.
- [ ] Mark each FAQ report row as fixed, TASK-256-owned, deferred, or future
  scope.
- [ ] Record exact admin/frontend evidence for runtime-facing changes.
- [ ] Update `_docs/_WIDGETS/FAQ.md` with the final data/editor/runtime/SEO
  contract.
- [ ] Move TASK-266 task files and `_docs/_TASKS/README.md` rows to `Done` only
  after implementation and validation are complete.
- [ ] Add a changelog entry listing TASK-266 and every completed leaf.
- [ ] Keep screenshot filenames as textual evidence only; do not commit PNG
  artifacts from `_docs/PLAYWRIGHT/`.

## Files to Change

| File group | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` | Add final fixed/deferred/TASK-256-owned evidence for each report row. |
| `_docs/_WIDGETS/FAQ.md` | Update final widget contract. |
| `_docs/_TASKS/TASK-266*.md` | Update status, dates, validation evidence, and any deferrals. |
| `_docs/_TASKS/README.md` | Move TASK-266 rows and update statistics. |
| `_docs/_CHANGELOG/*.md`, `_docs/_CHANGELOG/README.md` | Add final family changelog entry. |

## Implementation Pseudocode

Report closure table:

```md
## Final TASK-266 Evidence

| Finding | Status | Owner | Validation evidence | Notes |
|---|---|---|---|---|
| W9 SEO JSON-LD | fixed | TASK-266-03 | `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx` | JSON-LD enabled/disabled cases covered. |
| C1 single-open | TASK-256-owned | TASK-256-06-03 | <TASK-256 evidence> | Not duplicated by TASK-266. |
```

Closure helper shape:

```ts
type FaqReportStatus = "fixed" | "task-256-owned" | "deferred" | "future-scope";

function classifyFaqClosureRow(row: FaqReportFinding): FaqReportStatus {
  if (implementedByTask266(row)) return "fixed";
  if (ownedByTask256(row)) return "task-256-owned";
  if (hasPhysicalFutureTask(row)) return "future-scope";
  return "deferred";
}
```

Error handling:

- Do not close TASK-266 while any TASK-266 child remains To Do/In Progress.
- Do not claim TASK-256 rows fixed without matching TASK-256 report/test
  evidence.
- If broad repo gates fail for unrelated reasons, isolate and record the exact
  blocker, then rerun before final closure when feasible.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Stage only TASK-266 files, FAQ docs/report files, changelog files, and
  `_docs/_TASKS/README.md`.
- If `_docs/_TASKS/README.md` contains concurrent task rows from other agents,
  preserve them and recompute statistics.

## Security Contract

No API routes are added by this closure task.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must verify validator coverage for leaves
  that changed schema.
- Anti-abuse: final report snippets must not include secrets, tokens, private
  URLs, raw privileged payloads, or committed screenshots.
- Secret handling: redact any copied logs before committing.

## Testing Requirements

- Run every targeted suite listed in completed TASK-266 leaves.
- Run final closure gate:
  - `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/validator.test.ts` if schema changed
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`
- For docs-only status updates before implementation, run `git diff --check`.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md`
- `_docs/_WIDGETS/FAQ.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and the new changelog entry
- `_docs/WIDGETS.md` only if implementation intentionally changes shared
  widget docs.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-266 and
  `_docs/_CHANGELOG/README.md` is updated.

## Acceptance Criteria

- Every row from the FAQ Accordion report has a final owner and status.
- TASK-266 fixed rows have matching code, tests, docs, and textual
  admin/frontend evidence where applicable.
- TASK-256-owned rows are not duplicated or mislabeled as TASK-266 fixes.
- Changelog, task board, task files, widget docs, and validation evidence are
  synchronized.
