# TASK-319-03: Newsletter Responsive Variant Docs and Closure

# FileName: TASK-319-03_Newsletter_Responsive_Variant_Docs_and_Closure.md

**Priority:** Medium
**Category:** Documentation + QA + Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-319-01
**Status:** Done (2026-05-21)

---

## Overview

Close the Newsletter responsive-variant follow-up after the product decision and
any approved implementation land.

This leaf owns final report/docs/task/changelog reconciliation. If
`TASK-319-01` rejects the feature, this leaf records that explicit rejection.

## Final Outcome

- 2026-05-21: BF-15 is closed as current-state sufficient.
- Newsletter keeps the scalar `variant` contract because the shipped
  `inline`/`minimal` layouts already stack on mobile and switch to a row only
  from `sm` upward.
- Report, widget docs, task files, board state, and changelog now all point to
  that explicit decision.

## Sub-Tasks

- None. This is an execution-ready closure leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` | Record the final BF-15 result: fixed, rejected, or current-state sufficient. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Reflect the final product decision and shipped behavior. |
| `_docs/_TASKS/TASK-319*.md` | Update statuses, validation notes, and routing. |
| `_docs/_TASKS/README.md` | Move `TASK-319*` rows through final board state and update statistics. |
| `_docs/_CHANGELOG/891-2026-05-21-task-319-newsletter-responsive-variant-decision.md` | Add a changelog entry when the family closes. |
| `_docs/_CHANGELOG/README.md` | Register the changelog entry. |

## Implementation Pseudocode

```md
| Finding | Result | Evidence | Owner |
|---|---|---|---|
| BF-15 | rejected | current mobile guidance is already truthful | TASK-319-01 / TASK-319-03 |
```

## Data Flow

1. Re-read the decision from `TASK-319-01`.
2. If `TASK-319-02` landed, reconcile docs/report against the shipped contract.
3. If the decision was rejection/current-state OK, document that explicitly with
   evidence instead of leaving an implicit backlog note.
4. Close board/changelog/task statuses only after docs and evidence agree.

Error handling:

- Do not mark the family done while the decision or implementation owner is
  ambiguous.
- If implementation did not land, closure must record explicit rejection or
  defer reason rather than implying a shipped feature.

Regression-test shape:

```md
- Record the exact validation commands and evidence used for the final BF-15 decision.
```

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: closure must confirm no unapproved responsive
  fields were added.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_TASKS/TASK-319*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/891-2026-05-21-task-319-newsletter-responsive-variant-decision.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- BF-15 has one final explicit outcome with evidence.
- Parent `TASK-319` no longer mixes decision, implementation, and closure work
  in one leaf.
- Board/docs/changelog match the shipped result.


## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx` - passed
  (`13` tests)
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx` -
  passed (`6` tests)
- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `bun run gates:coderso` - passed
- `git diff --check` - passed
- `bun run precommit` - passed
- `bun run scan:security:strict` - could not complete in the local environment
  because `semgrep`, `trivy`, and `gitleaks` were not installed in `PATH`;
  `bun audit` ran successfully inside the same command

## Completion Notes

- 2026-05-21: the Newsletter report, widget contract doc, task-board rows, and
  changelog now all reflect the explicit current-state-sufficient BF-15
  decision.
