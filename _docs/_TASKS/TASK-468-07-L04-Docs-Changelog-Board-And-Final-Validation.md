# TASK-468-07-L04: Docs Changelog Board And Final Validation
# FileName: TASK-468-07-L04-Docs-Changelog-Board-And-Final-Validation.md

**Parent Subtask:** TASK-468-07
**Priority:** High
**Category:** Documentation / Validation / Task Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-468-07-L03
**Status:** ⏳ To Do

---

## Overview

Close the TASK-468 family with documentation, changelog, board synchronization,
and final validation. This leaf must not mark parents done until every physical
descendant is done, superseded, or cancelled.

## Sub-Tasks

- [ ] Update architecture, CMS, API, data model, widget, assistant, cache, and
  task docs touched by the family.
- [ ] Add `_docs/_CHANGELOG/` entry listing TASK-468 and every closed child/leaf
  covered by the family changelog.
- [ ] Update `_docs/_CHANGELOG/README.md` and `_docs/_TASKS/README.md` status
  tables/statistics.
- [ ] Run final validation commands and record any skipped lanes with reasons.
- [ ] Run final drift pass on the committed HEAD when external audit was part of
  the implementation workflow.

## Files To Change

| File | Required change |
|---|---|
| `_docs/ARCHITECTURE.md` | Final Custom Screens V4 architecture summary. |
| `_docs/CMS_SPEC.md` | Final product/admin behavior. |
| `_docs/CMS_API.md` | Final API contract. |
| `_docs/DATA_MODEL.md` | Final schema contract. |
| `_docs/WIDGETS.md` | Retired legacy screen widget docs. |
| `_docs/ASSISTANT_SITE_BUILDER.md` | Assistant V4 action/active-surface summary if applicable. |
| `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` | Cache ownership updates if changed. |
| `_docs/_CHANGELOG/*` | New family changelog entry. |
| `_docs/_CHANGELOG/README.md` | Changelog index update. |
| `_docs/_TASKS/README.md` | Board/status/statistics sync. |
| `_docs/_TASKS/TASK-468*` | Final status/evidence updates. |

## Implementation Pseudocode

```ts
type ClosureChecklist = {
  descendantsClosed: boolean;
  changelogListsAllClosedTasks: boolean;
  boardStatsMatchRows: boolean;
  validationEvidenceRecorded: boolean;
  finalDriftPassClean: boolean;
};

function canCloseTask468(checklist: ClosureChecklist) {
  return Object.values(checklist).every(Boolean);
}
```

Data flow:

- Collect validation output and implementation evidence from all TASK-468 leaves.
- Update source-of-truth docs and changelog.
- Move task statuses in dependency order from leaves to children to parent.
- Run final drift/audit pass if external audit was used during implementation.

Error handling:

- If any child remains open, keep parent open and split explicit follow-up work.
- If validation cannot run, record the command, blocker, and follow-up owner.
- If drift pass reports real drift, fix docs/contracts and rerun before closure.

Regression-test shape:

```ts
test("task board statistics match table rows", () => {
  const board = parseTaskBoard("_docs/_TASKS/README.md");
  expect(board.statistics.todo).toBe(board.rows.todo.length);
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** docs must describe the final strict V4
  validation contract without weakening it.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** changelog/task closeout must not include secrets, raw
  provider keys, cookies, CSRF tokens, or sensitive logs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun run gates:coderso`
- Targeted TASK-468 Vitest/Bun/DB suites from closed leaves.
- Security scanner lanes from `_docs/SECURITY_SPEC.md` if auth, public-write,
  secret-handling, sanitizer, or scanner behavior changed.
- `git diff --check`
- `bun run precommit` before manual commit.

## Documentation Updates Required

- All files listed in `Files To Change`.

## Acceptance Criteria

1. All TASK-468 descendants are terminal before parent closure.
2. Changelog and task board counts are synchronized.
3. Final validation evidence and any skipped lanes are recorded.
4. Final drift pass is clean or every remaining item is split into explicit
   non-blocking follow-up tasks with rationale.
