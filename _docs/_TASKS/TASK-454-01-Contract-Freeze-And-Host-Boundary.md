# TASK-454-01: Contract Freeze And Host Boundary
# FileName: TASK-454-01-Contract-Freeze-And-Host-Boundary.md

**Parent Task:** TASK-454
**Priority:** High
**Category:** Pages / Page Editor V2 / Contract
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-06-17

---

## Overview

Freeze the corrected TASK-454 implementation contract before source edits. This
subtask reconciles the 2026-06-17 read-only audits with current HEAD and locks
the page-only versus host-neutral ownership boundaries.

Key decisions to preserve:

- Autosave recovery uses an explicit restore/discard prompt; no silent
  promote-on-open.
- Existing `listPageRevisions(id)` is filtered client-side; no new revision
  query API.
- Mount revalidation and dirty-navigation guard are host-neutral Page Editor
  behavior.
- Autosave recovery is Pages-only because Page Templates and Menu Design do not
  expose revisions/autosave in the host contract.

## Sub-Tasks

- [x] TASK-454-01-L01: Contract Corrections And Fresh Drift Pass

## Files To Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-454_Page_Editor_Draft_Recovery_And_Cache_Trust_Hardening.md` | Keep corrected parent contract and audit evidence. |
| `_docs/_TASKS/TASK-454-*.md` | Keep child/leaf scope execution-ready and dependency ordered. |

## Implementation Pseudocode

```text
1. Inspect current HEAD, dirty status, parent TASK-454, all child files,
   PageEditor/PageEditorHost/pagesClient/router/revision code, and tests.
2. Verify the corrected decisions still match source code.
3. If drift exists, fix task files before implementation.
4. Rerun a fresh read-only audit after any contract correction.
```

Data flow: this subtask changes only task contracts and audit evidence; no
runtime data path changes.

Error handling: any contradictory audit finding blocks implementation until the
task files are corrected and re-audited.

Regression-test shape: docs-only validation uses `git diff --check`; source
tests start in later implementation subtasks.

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** no schema changes.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `git diff --check`
- Fresh read-only drift pass against the corrected task tree before
  implementation.

## Documentation Updates Required

- `_docs/_TASKS/README.md` only if task statuses or board rows change.

## Acceptance Criteria

1. TASK-454 no longer references nonexistent `{ revalidate: true }`,
   nonexistent revision-list query options, or nonexistent navigation hooks.
2. The shared host blast radius is explicit.
3. A fresh read-only audit reports no unresolved drift before implementation.
