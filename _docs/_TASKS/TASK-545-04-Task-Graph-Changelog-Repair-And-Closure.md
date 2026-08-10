# TASK-545-04: Task Graph, Changelog Repair, and Closure

# FileName: TASK-545-04-Task-Graph-Changelog-Repair-And-Closure.md

**Parent Task:** TASK-545
**Priority:** High
**Category:** Task Metadata / Changelog / Historical Integrity / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-545-01, TASK-545-02, TASK-545-03
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Correct the enumerated stale task metadata, reconstruct only three missing
historical parent files from evidence, then reconcile fresh board/changelog
indexes/statistics and close TASK-545. Product implementation and statuses of
completed TASK-495–535 families are not reopened.

## Sub-Tasks

| ID | Title | Exclusive ownership | Status |
|---|---|---|---|
| TASK-545-04-L01 | Correct existing task metadata | enumerated existing task files only | ⏳ To Do |
| TASK-545-04-L02 | Reconstruct truthful historical parents | new TASK-528/529/530 parent files only | ⏳ To Do |
| TASK-545-04-L04 | Normalize historical statuses and changelog evidence | scoped TASK-495–535 metadata, TASK-532 tags, changelogs 1244–1247 | ⏳ To Do |
| TASK-545-04-L03 | Reconcile board/changelog and close program | indexes, statistics, changelog 1257, TASK-545 closure | ⏳ To Do |

## Historical boundaries

Land `L01 → L02 → L04 → L03`; L03 remains the final closure writer even though
the newly allocated historical-cleanup leaf is L04.

- TASK-511 stays To Do and is described as tracked/no-extra-worktree with an
  obsolete pre-audit; its blocked product contract is not fixed here.
- TASK-528/529/530 parent files are historical evidence summaries, not invented
  execution plans. No retroactive children, leaves, pseudocode, or smoke claims.
- TASK-492–494 and all product source are out of scope.
- No completed family is moved back to To Do/In Progress.
- The audited 35 noncanonical Done status fields become canonical without changing
  terminal meaning; TASK-532 transcript tags and 1244–1247 evidence drift are
  repaired by L04 before final index reconciliation.

## Security Contract

Documentation/workflow metadata only. Do not copy exploit payloads, secrets,
credentials, raw logs, or user data. No scanner allowlist, API, DB, auth, CSRF,
rate-limit, nonce, or captcha change.

## Testing Requirements

- Run the focused task-graph integrity suite after L01, L02, and L04 land.
- Recount board buckets and compare every TASK-545 descendant, reconstructed
  historical parent, and changelog reference against physical files.
- Run all TASK-545 workflow/evidence suites, repository gates, strict security
  scan, and `git diff --check` before closure.
- Block closure on any open descendant, stale statistic, missing evidence, or
  non-allowlisted delta.

## Documentation Updates Required

- L03 is the sole final writer for `_docs/_TASKS/README.md`,
  `_docs/_CHANGELOG/README.md`, changelog 1257, and TASK-545 completion fields.
- L01/L02/L04 may edit only their explicitly enumerated historical metadata and
  evidence files; they do not close the family.
