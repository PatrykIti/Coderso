# TASK-545-01: All-Results Guard and Static Workflow Contract

# FileName: TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md

**Parent Task:** TASK-545
**Priority:** High
**Category:** Workflow Infrastructure / False-Clean Prevention / Static Tests
**Estimated Effort:** Medium
**Dependencies:** TASK-545-01-L02 (terminal leaf; it requires TASK-545-02-L02, so this parent completes only after the 545-02 line lands)
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Create one pure all-results/identity guard and a static enforcement suite for every tracked
canonical workflow. Missing/null results, count mismatches, and wrong/duplicate/reordered job
identities must abort before findings
are flattened, logged as clean, or passed to fixers. Static policy also provides
the gate used by TASK-545-02/03 for round, reconcile, post-audit, commit, pin, and
smoke rules.

## Sub-Tasks

| ID | Title | Exclusive ownership | Status |
|---|---|---|---|
| TASK-545-01-L01 | Add `requireAllResults` helper | identity-aware helper plus focused unit test | ⏳ To Do |
| TASK-545-01-L02 | Statically enforce workflow contracts | additive whole-inventory live-tree static test after the two driver behavior suites and TASK-545-02 migrations | ⏳ To Do |

The executable order deliberately interleaves technical subtasks without concurrent
writers: `545-01-L01 → 545-02-L01 → 545-02-L02 → 545-01-L02`. The live-tree
static test cannot land before the violations it asserts are removed. TASK-545-01
remains open until L02 passes; TASK-545-02 depends only on the landed helper L01,
not on the unfinished TASK-545-01 parent. TASK-545-02-L01/L02 each lands its own
synthetic driver suite before migrating scripts; the final static leaf reruns those suites
read-only and owns only additive live-tree enforcement.

## Current baseline

The original 58/61 finding inventory came from owner-local scripts removed and
ignored by `5facaf32`; it is not reproducible in a fresh clone. Current
`git ls-files` exposes six executable entries (`task-522-author.mjs`,
`task-543-implement.mjs`, and the four TASK-554 entries) plus the
`task-522-findings-prompt.mjs` helper. `task-522-author.mjs:169` has the
confirmed unsafe agent-result filter. TASK-543 has three unrelated
`.filter(Boolean)` expressions for URL/port parsing inside browser/process
helpers. The completion invariant is therefore semantic: every tracked
agent-result collection uses the canonical guard before classification, while
valid domain-data filtering remains untouched.

## Security Contract

No product/API surface. Helpers accept in-memory structured agent results only
and never log prompts, credentials, `.env`, private keys, raw logs, or user data.
No scanner allowlist or exception.

## Testing Requirements

- Run the focused helper and static-contract unit suites owned by L01/L02.
- Parse every tracked canonical workflow with `node --check` after TASK-545-02 lands.
- Require the final live-tree scans to report zero unsafe result filtering or
  workflow-contract exceptions; do not baseline a remaining violation.
- Prove the scanned inventory came from `git ls-files`; ignored owner-local
  scripts are out-of-scope diagnostics, never closure evidence.
- Run `git diff --check` for every leaf and the combined subtask.

## Documentation Updates Required

- Keep this child table synchronized with the physical L01/L02 statuses.
- Record implementation evidence only through the TASK-545 family changelog
  1257 and final board closure owned by TASK-545-04-L03.
