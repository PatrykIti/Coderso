# TASK-283-08: Section Report Docs Changelog and Closure

# FileName: TASK-283-08_Section_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Section + Documentation + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-283, TASK-283-01, TASK-283-02, TASK-283-03, TASK-283-04, TASK-283-05, TASK-283-06, TASK-283-07, TASK-256-08, TASK-326, TASK-327
**Status:** To Do

---

## Overview

Close the Section widget-specific Playwright follow-up family after all
implementation leaves are complete or explicitly deferred.

This leaf owns the final report evidence, widget docs, task-board state,
changelog entry, and validation matrix for TASK-283. It must not mark shared
findings fixed unless the owning shared task evidence (`TASK-256`, `TASK-326`,
or `TASK-327`) has actually landed.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` - source report and final
  priority matrix.
- `_docs/_TASKS/TASK-283_Section_Widget_Playwright_Product_Followups.md` -
  TASK-256 exclusion and TASK-283 scope matrices.
- `_docs/_TASKS/README.md` - board/statistics owner.
- `_docs/_CHANGELOG/README.md` - changelog numbering/index owner.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` | Add final textual status for each Section finding: fixed, deferred, no-action, or routed to the truthful shared owner task. Do not commit PNG files. |
| `_docs/_WIDGETS/SECTION.md` | Synchronize final schema/editor/runtime behavior. |
| `_docs/WIDGETS.md` | Update only if global widget inventory or contract text changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack readiness/completeness changed. |
| `_docs/_TASKS/TASK-283*.md` | Mark completed leaves and umbrella `Done` with dates, or record explicit deferrals. |
| `_docs/_TASKS/README.md` | Move completed TASK-283 rows from To Do to Done and update statistics. |
| `_docs/_CHANGELOG/{N}-{completion-date}-task-283-section-widget-followups.md` | Add final user-facing changelog entry using the actual completion date. |
| `_docs/_CHANGELOG/README.md` | Add the new changelog index row with the next unused number. |

## Implementation Pseudocode

```md
## Final TASK-283 Status

| Report item | Status | Evidence |
|---|---|---|
| C1 | Fixed by TASK-283-01 | tests + commit |
| W10 | TASK-256 | shared structural evidence |
| B5 | Shared TASK-327 | shared color-control evidence |
| Existing section/div switch | No action | report marked current behavior OK |
| C2 background media | Fixed by TASK-283-02 | tests + report note |
```

Data flow:

- Read the final TASK-283 scope matrix and each implementation leaf status.
- Update the source report with one textual status row per finding:
  TASK-256 exclusion, TASK-283 fixed evidence, TASK-283 deferral, or no action.
- Synchronize Section docs, changelog entry, and task-board rows after report
  evidence is complete.
- Record exact validation commands and commit SHAs in the closure leaf.

Error handling:

- If a TASK-283 leaf remains intentionally deferred, keep the umbrella open or
  mark only that leaf To Do with an explicit reason. Do not move the umbrella to
  Done while unresolved owned findings remain.
- If a shared finding is still open, keep it classified under the active
  shared owner task (`TASK-256`, `TASK-326`, or `TASK-327`) and do not claim it
  in the Section closure report.
- If broad validation fails for unrelated legacy reasons, record exact command
  output and run the targeted Section suites before deciding closure.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: closure must reference the exact validator tests
  that cover new schema fields.
- Anti-abuse: closure must confirm no raw HTML/script, unsafe media/link,
  arbitrary class-name, arbitrary CSS, or secret-bearing browser payload was
  introduced.
- Secret handling: closure must confirm no secrets, provider keys, private media
  URLs, or privileged settings are persisted in Section widget data.

## Testing Requirements

Before marking TASK-283 `Done`, run and record:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer or
  registry output changed.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token-adjacent behavior changed.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults changed.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration changed.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

Docs-only closure validation:

- `git diff --check`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md`
- `_docs/_WIDGETS/SECTION.md`
- `_docs/WIDGETS.md` if global inventory changed
- `_docs/WIDGET_PACK_MATRIX.md` if pack readiness changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entry under `_docs/_CHANGELOG/`

## Acceptance Criteria

- Every report finding is mapped to fixed evidence, a truthful shared-task
  exclusion, a no-action decision, or a documented TASK-283 deferral with owner
  and reason.
- TASK-283 task statuses, board rows/statistics, docs, report, and changelog are
  synchronized.
- Validation output proves the changed Section contracts, not just generic
  repository health.
- No screenshots or generated binary Playwright artifacts are committed.
