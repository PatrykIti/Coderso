# TASK-408: Agent Task Workflow Rule Alignment
# FileName: TASK-408_Agent_Task_Workflow_Rule_Alignment.md

**Priority:** Medium
**Category:** Docs / Process / Agent Workflow
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-04
**Completed:** 2026-06-04

---

## Overview

Align the repository agent task workflow rules with the stricter task-audit,
task-hierarchy, status, and drift-pass practices requested from the external
project, adapted to Coderso's local documentation sources of truth.

Coderso does not have `_docs/MVP.md` or `_docs/PROJECT.md`; the equivalent
local product and architecture constraints live in `README.md`,
`CONTRIBUTING.md`, `_docs/ARCHITECTURE.md`, `_docs/CMS_SPEC.md`,
`_docs/CMS_API.md`, `_docs/TESTING_STRATEGY.md`, and the relevant domain docs.

---

## Security Contract

This task changes documentation and process rules only.

- **Endpoint visibility:** No API endpoint is added or changed.
- **Auth model:** No auth model is added or changed.
- **RBAC:** No permission model is added or changed.
- **CSRF:** No admin or public mutation is added or changed.
- **Rate-limit bucket:** Not applicable.
- **Validation:** Documentation-only change; no payload schema is added.
- **Anti-abuse controls:** Not applicable.

---

## Sub-Tasks

- [x] Review the current root `AGENTS.md`, `_docs/AGENTS.md`, task board, task
      format, changelog index, architecture, and testing-strategy docs.
- [x] Run a read-only Claude consultation after explicit user approval and
      verify actionable findings against local files before editing the process
      contract.
- [x] Update `AGENTS.md` with Coderso-adapted task audit, post-implementation
      drift, physical child task, numbering, status, and closure rules.
- [x] Update `_docs/_TASKS/README.md` so the task-board source of truth matches
      the agent rules.
- [x] Replace `_docs/_TASKS/EXAMPLE_TASK.md` with a Coderso-specific template
      instead of the foreign Blender/Python/MCP example.
- [x] Add changelog evidence and close the task board entry.

---

## Review Evidence

Read-only Claude audit was run with `--permission-mode plan --effort xhigh`
against HEAD `d6d5c339e6e17f6059d45e38caf8e37bd7422780` after explicit user
approval. Actionable findings were verified locally before edits:

- Foreign `EXAMPLE_TASK.md` drift was real; the Blender/Python/MCP example was
  replaced with a Coderso Bun/React/TypeScript task template.
- Status vocabulary, implementation pseudocode, child task hierarchy, and
  changelog next-number drift were real; `AGENTS.md`, `_docs/_TASKS/README.md`,
  and `_docs/_CHANGELOG/README.md` were updated.
- Post-implementation drift review found low-only polish items around
  `EXAMPLE_TASK.md` closeout coverage, `TASK-###` placeholder consistency, and
  the template-only `TASK-000` exception; those items were fixed before final
  validation.
- Branch/worktree isolation was noted by the audit; no branch switch was made
  because the user requested the direct process-doc update and the worktree was
  otherwise clean before TASK-408 edits.

---

## Implementation Pseudocode

```text
read current docs and board
create process task
run read-only Claude audit with:
  - repo path
  - current HEAD
  - TASK-408
  - no edits allowed
  - severity-ordered findings with file/line references
verify audit findings locally
patch AGENTS.md task workflow:
  - keep Coderso source docs instead of foreign MVP/PROJECT docs
  - add optional approved Claude/subagent read-only pre-audit rules
  - add post-implementation drift-pass rules
  - add physical child file hierarchy and canonical statuses
  - keep secrets/egress warning explicit
patch _docs/_TASKS/README.md to match
add changelog 1110 and index row
mark TASK-408 and board Done
run git diff --check
```

Error handling:

- If Claude CLI is unavailable or rejects `xhigh`, record the fallback in the
  task and changelog closeout instead of weakening the local review.
- If audit findings identify real drift in the proposed process, fix the process
  contract before closing the task.
- Do not bulk-normalize historical task statuses or filenames outside a
  dedicated migration task.

Regression-test shape:

- Documentation diff review confirms `AGENTS.md` and `_docs/_TASKS/README.md`
  agree on task filenames, hierarchy, statuses, audit expectations, and closure
  rules.
- `git diff --check` confirms documentation whitespace is clean.

---

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Manual documentation review of `AGENTS.md`, `_docs/_TASKS/README.md`,
  `_docs/_TASKS/EXAMPLE_TASK.md`, and the TASK-408 changelog entry.

---

## Documentation Updates Required

- `AGENTS.md`: Coderso-adapted task workflow rules.
- `_docs/_TASKS/README.md`: matching board/task format and status rules.
- `_docs/_TASKS/EXAMPLE_TASK.md`: Coderso-specific task template.
- `_docs/_CHANGELOG/`: changelog entry after closure.
