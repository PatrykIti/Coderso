# TASK-262-05: Content List Report Docs and Closure

# FileName: TASK-262-05_Content_List_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Documentation + Playwright QA + Release Notes
**Estimated Effort:** Medium
**Dependencies:** TASK-262-01, TASK-262-02, TASK-262-03, TASK-262-04
**Status:** To Do

---

## Overview

Close the Content List Playwright follow-up family after implementation leaves
land.

This leaf owns textual evidence refresh, source-of-truth docs, changelog, board
state, and final validation. It must not implement remaining product behavior
directly; any unfixed report row must be routed to TASK-256 shared scope or a
named future task before the family can move to `Done`.

## Scope Boundary

This leaf owns closure artifacts only:

- Refresh `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` with fixed,
  deferred, or not-reproducible evidence.
- Update `_docs/_WIDGETS/CONTENT_LIST.md` and any affected source-of-truth docs.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when TASK-262
  or any implementation leaf moves to `Done`.
- Move task statuses and `_docs/_TASKS/README.md` rows/statistics in sync.
- Run final targeted validation for all touched Content List owners.

This leaf does not own new code behavior. If validation discovers a product bug,
reopen the relevant implementation leaf or create a future task.

## Sub-Tasks

- [ ] Re-read `REPORT_CONTENT_LIST_WIDGET.md` and mark each finding as fixed,
  TASK-256 shared scope, deferred future scope, or not reproducible with a
  reason.
- [ ] Verify TASK-262 implementation leaves updated all required source files,
  tests, and docs listed in their `Files to Change` tables.
- [ ] Update `_docs/_WIDGETS/CONTENT_LIST.md` to match final schema/defaults,
  editor modes, runtime behavior, and testing evidence.
- [ ] Update `_docs/WIDGETS.md` only if the final work changes general widget
  guidance.
- [ ] Update `_docs/WIDGET_PACK_MATRIX.md` only if Content List pack readiness
  changes.
- [ ] Add `_docs/_CHANGELOG/{N}-2026-05-16-task-262-content-list-widget-followups.md`
  or the current next changelog number, and update the changelog index.
- [ ] Move completed TASK-262 rows from To Do/In Progress to Done and
  recompute board statistics.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` | Add final textual evidence and fixed/deferred/not-reproducible classification. |
| `_docs/_WIDGETS/CONTENT_LIST.md` | Update Content List product/runtime/editor documentation. |
| `_docs/WIDGETS.md` | Update only for general widget behavior changed by implementation leaves. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if readiness/completeness changes. |
| `_docs/_TASKS/TASK-262*.md` | Move statuses and final validation notes. |
| `_docs/_TASKS/README.md` | Synchronize rows/statistics. |
| `_docs/_CHANGELOG/README.md` and new changelog file | Record final closure or leaf-specific completion. |

## Implementation Pseudocode

```ts
type ContentListReportClosure = {
  findingId: string;
  status: "fixed" | "task-256-shared" | "future-task" | "not-reproducible";
  evidence: string;
  validation?: string[];
  followUpTaskId?: string;
};

function closeContentListFinding(finding: ReportFinding): ContentListReportClosure {
  if (finding.isSharedClearOrTokenContract) {
    return routeToTask256(finding, "TASK-256-02");
  }
  if (finding.hasPassingValidation) return markFixed(finding);
  if (finding.needsFutureScope) return createFutureTaskReference(finding);
  return markNotReproducibleWithEvidence(finding);
}
```

Closure flow:

```text
1. Re-run targeted Content List validation.
2. Update report evidence from validation output and current code.
3. Update Content List docs and any general docs only when behavior changed.
4. Add changelog entry with task IDs and validation summary.
5. Move task statuses and board rows.
6. Run `git diff --check`, full required gates, and precommit.
```

Error handling:

- If a report row lacks evidence, keep the family open and record the missing
  validation rather than marking it fixed.
- If `_docs/_TASKS/README.md` changed in `feature/corrections`, rebase/merge
  carefully and preserve other agents' rows/statistics.
- If final broad gates fail for unrelated pre-existing reasons, isolate with
  targeted Content List lanes and record the unrelated blocker explicitly.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: final docs must reflect schema-owned validation
  and must not describe unsupported payload fields.
- Anti-abuse: report evidence must not include live nonce values, private
  tokens, privileged internal URLs, raw secrets, or screenshots with sensitive
  data.
- Secret handling: changelog and docs must use sanitized textual evidence only.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` when
  public output changed
- `bun test tests/unit/widgets/validator.test.ts` when schema changed
- `bun test tests/unit/content/listingRuntimeResolver.test.ts` when pagination
  or listing runtime behavior changed
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md`
- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/WIDGETS.md` only if general widget behavior changed.
- `_docs/WIDGET_PACK_MATRIX.md` only if readiness/completeness changed.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and one changelog entry when complete.

## Changelog Policy

- This leaf must not move to `Done` until the changelog entry lists TASK-262 and
  any completed TASK-262 leaves.

## Acceptance Criteria

- Every Content List report row is fixed, explicitly routed to TASK-256, or
  deferred to a named future task with a reason.
- Source-of-truth docs match the final code behavior.
- Board rows, statistics, changelog, and task statuses are synchronized.
- Required validation lanes pass or any unrelated blockers are clearly isolated
  with targeted Content List proof.
