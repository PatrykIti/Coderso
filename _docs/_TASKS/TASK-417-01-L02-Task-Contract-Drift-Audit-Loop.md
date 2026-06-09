# TASK-417-01-L02: Task Contract Drift Audit Loop
# FileName: TASK-417-01-L02-Task-Contract-Drift-Audit-Loop.md

**Parent Subtask:** TASK-417-01
**Priority:** High
**Category:** Process / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-417-01-L01
**Status:** ⏳ To Do

---

## Overview

Run repeated read-only audits over the TASK-417 task contract and docs until the
family is implementable without known task drift. This is required before code
implementation starts because external-agent consultation was explicitly
approved and the task changes multiple architecture boundaries.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** not applicable.
- **RBAC:** not applicable.
- **CSRF:** not applicable.
- **Rate-limit bucket:** not applicable.
- **Validation:** audit must verify every API-touching descendant has a
  Security Contract and validation lane.
- **Anti-abuse controls:** audit must verify no public write endpoint is planned
  without nonce/signature/HMAC controls.

---

## Sub-Tasks

- [ ] Run Claude and subagent read-only audits against the task tree and docs.
- [ ] Fix any real high/medium/low drift in task files before implementation.
- [ ] Rerun audits after task contract changes.
- [ ] Record audit summaries in TASK-417 and close this leaf only after no
  unresolved drift remains or follow-up tasks explicitly own it.

---

## Implementation Pseudocode

```text
for each drift_audit_pass:
  collect HEAD, git status, changed task/doc files
  ask auditors to compare AGENTS.md, task tree, docs, code, tests
  require findings ordered by severity with concrete file/line references
  if finding is real:
    update task contract or split follow-up
    rerun audit
  else:
    record why it is non-blocking
```

Expected data flow:

- Audit prompts include repo path, HEAD, dirty-worktree context, task IDs, and
  "do not edit files".
- Audit prompts require findings ordered by severity with concrete file/line
  references.
- Findings are verified against local files before task files are changed.

Error handling:

- If auditors disagree, keep the stricter task requirement unless local source
  inspection proves it is unnecessary.
- If a finding changes source-of-truth docs or validation contracts, mark the
  prior audit obsolete and rerun.

Regression-test shape:

- `git diff --check`
- `rg "TASK-417" _docs/_TASKS/README.md _docs/_TASKS/TASK-417*`

---

## Testing Requirements

- `git diff --check`
- Read-only Claude/subagent drift pass after each refinement.

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-417*`
- `_docs/_TASKS/README.md`
