# TASK-278-08: Pricing Plans Report, Docs, Changelog, and Closure

# FileName: TASK-278-08_Pricing_Plans_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Pricing Plans + Documentation + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-278, TASK-278-01, TASK-278-02, TASK-278-03, TASK-278-04, TASK-278-05, TASK-278-06, TASK-278-07, TASK-256-08
**Status:** To Do

---

## Overview

Close the Pricing Plans widget-specific Playwright follow-up family after all
implementation leaves are complete or explicitly deferred.

This leaf owns the final report evidence, widget docs, task-board state,
changelog entry, and validation matrix for TASK-278. It must not mark TASK-256
shared findings fixed unless the TASK-256 implementation and evidence have
landed.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:437-482` - source report
  priority matrix and statistics.
- `_docs/_TASKS/TASK-278_Pricing_Plans_Widget_Playwright_Product_Followups.md` -
  TASK-256 exclusion and TASK-278 scope matrices.
- `_docs/_TASKS/README.md` - board/statistics owner.
- `_docs/_CHANGELOG/README.md` - changelog numbering/index owner.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` | Add final textual status for each TASK-278-owned finding: fixed, deferred, or moved to TASK-256. Do not commit PNG files. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Synchronize final schema/editor/runtime behavior. |
| `_docs/WIDGETS.md` | Update only if global widget inventory or contract text changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack readiness/completeness changed. |
| `_docs/_TASKS/TASK-278*.md` | Mark completed leaves and umbrella `Done` with dates, or record explicit deferrals. |
| `_docs/_TASKS/README.md` | Move completed TASK-278 rows from To Do to Done and update statistics. |
| `_docs/_CHANGELOG/{N}-2026-05-16-task-278-pricing-plans-widget-followups.md` | Add final user-facing changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the new changelog index row with the next unused number. |

## Implementation Pseudocode

```md
## Final TASK-278 Status

| Report item | Status | Evidence |
|---|---|---|
| BUG-06 | Fixed by TASK-278-01 | tests + commit |
| BUG-03 | TASK-256 | shared contract evidence |
| BF-06 | Fixed by TASK-278-04 or deferred there | tests + commit or owner/reason |
| A1/A4 | No action | report marked existing labels OK |
```

Data flow:

- Read the final TASK-278 scope matrix and each implementation leaf status.
- Update the source report with one textual status row per finding:
  TASK-256 exclusion, TASK-278 fixed evidence, TASK-278 deferral, or no action.
- Synchronize widget docs, changelog entry, and task-board rows after report
  evidence is complete.
- Record the exact validation commands and commit SHAs in the closure leaf.

Error handling:

- If a TASK-278 leaf remains intentionally deferred, keep the umbrella open or
  mark only that leaf To Do with an explicit reason. Do not move the umbrella to
  Done while unresolved owned findings remain.
- If a TASK-256 shared finding is still open, keep it classified as TASK-256 and
  do not claim it in the Pricing Plans closure report.
- If broad validation fails for unrelated legacy reasons, record exact command
  output and run the targeted Pricing Plans suites before deciding closure.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: closure must reference the exact validator tests
  that cover new schema fields.
- Anti-abuse: closure must confirm no raw HTML/script, unsafe link, arbitrary
  class-name, or secret-bearing browser payload was introduced.

## Testing Requirements

Before marking TASK-278 `Done`, run and record:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer or
  registry output changed.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if token
  adjacency changed.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults changed.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration changed.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

Docs-only closure validation:

- `git diff --check`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md`
- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/WIDGETS.md` if global inventory changed
- `_docs/WIDGET_PACK_MATRIX.md` if pack readiness changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entry under `_docs/_CHANGELOG/`

## Acceptance Criteria

- Every report finding is mapped to fixed evidence, a TASK-256 exclusion, or a
  documented TASK-278 deferral with owner and reason.
- TASK-278 task statuses, board rows/statistics, docs, report, and changelog are
  synchronized.
- Validation output proves the changed Pricing Plans contracts, not just generic
  repository health.
- No screenshots or generated binary Playwright artifacts are committed.
