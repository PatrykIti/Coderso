# TASK-257-05: Accordion Report Docs and Closure

# FileName: TASK-257-05_Accordion_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Documentation + Playwright QA + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-257-01, TASK-257-02, TASK-257-03, TASK-257-04
**Status:** To Do

---

## Overview

Close the TASK-257 Accordion-specific follow-up family with report evidence,
source-of-truth docs, task-board sync, changelog, and final validation.

This closure leaf must keep TASK-257 separate from TASK-256: shared-contract
rows stay attributed to TASK-256, FAQ rows and FAQ portions of mixed rows stay
attributed to FAQ ownership, and only Accordion product-scope rows are marked
fixed by TASK-257.

## Sub-Tasks

- [ ] Refresh `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` with fixed/deferred
  statuses for every TASK-257-owned row.
- [ ] Remove or rewrite stale historical priority/fix sections in the report so
  the current owner matrix does not conflict with resolved TASK-256 scope.
- [ ] Record the exact task owner for excluded rows:
  - TASK-256 for shared-contract rows;
  - TASK-256-06-03 or future FAQ task for FAQ rows;
  - TASK-293 for the shared repeatable-slot sync/reorder blocker on U5/U6.
- [ ] Update `_docs/_WIDGETS/ACCORDION.md` with final data/editor/runtime
  behavior.
- [ ] Update `_docs/_TASKS/README.md` statuses and statistics when the family
  moves to `Done`.
- [ ] Add a changelog entry in `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md`.
- [ ] Run final targeted validation and record skipped gates or blockers.

## Final Evidence Matrix

| Row | Expected status | Evidence required |
|---|---|---|
| W11 | fixed by TASK-257-01 or deferred with reason | Normalizer/editor/runtime test names plus manual or rendered evidence. |
| W3, W5, W6, Accordion part of W7, Accordion part of W12, U8 | fixed by TASK-257-02 or deferred with reason | Schema/editor/runtime tests and docs update. |
| W2, U3 | fixed by TASK-257-03 or deferred with reason | Item editor/runtime tests and updated editor copy evidence. |
| U5, U6 | deferred to TASK-293 unless the shared owner lands first | Shared slot-contract blocker note and follow-up task link. |
| Accordion part of W1, Accordion part of U4 | fixed by TASK-257-04 or deferred with reason | Motion/preview tests and reduced-motion note. |
| TASK-256-owned rows | excluded | Link to TASK-256 child owner and do not mark as fixed by TASK-257. |
| FAQ rows and FAQ portions of W1/W7/W12/U4/C4/R2-R4 | excluded | Link to FAQ owner and do not mark as fixed by TASK-257. |

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` | Add final TASK-257 evidence and routing notes. |
| `_docs/_WIDGETS/ACCORDION.md` | Final source-of-truth contract update. |
| `_docs/_TASKS/TASK-257*.md` | Move statuses and validation evidence to Done. |
| `_docs/_TASKS/README.md` | Move TASK-257 rows from To Do/In Progress to Done and update statistics. |
| `_docs/_CHANGELOG/*.md` | Add TASK-257 changelog entry. |
| `_docs/_CHANGELOG/README.md` | Index the TASK-257 changelog entry. |

## Implementation Pseudocode

```md
### TASK-257 Closeout Evidence

| Finding | Status | Owner | Evidence |
|---|---|---|---|
| W11 | Fixed | TASK-257-01 | `bun run test:vitest -- ...` |
| C1 | Excluded | TASK-256-05-04 | Shared-contract row, not TASK-257 scope |
```

Closure status flow:

```text
To Do -> In Progress on implementation start
In Progress -> Done only after docs, changelog, board, and validation are synced
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must confirm validator coverage for any
  new fields added by implementation leaves.
- Anti-abuse: Playwright reports must not include secrets, local tokens, or
  committed PNG artifacts.
- Secret handling: no secrets in docs or changelog.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  if TASK-257-03 changes page-builder slot controls
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` if
  TASK-257-03 changes slot-control rendering
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults changed
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md`
- `_docs/_WIDGETS/ACCORDION.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- A new `_docs/_CHANGELOG/*.md` entry

## Changelog Policy

- This leaf owns the final TASK-257 changelog entry unless an earlier leaf
  already created a changelog that explicitly lists all TASK-257 task IDs.

## Acceptance Criteria

- TASK-257 rows are Done only after validation and changelog evidence exists.
- The report clearly separates TASK-257 fixes from TASK-256 shared-contract
  fixes, FAQ ownership, and TASK-293 shared slot blockers.
- No PNG screenshots or temporary Playwright artifacts are committed.
