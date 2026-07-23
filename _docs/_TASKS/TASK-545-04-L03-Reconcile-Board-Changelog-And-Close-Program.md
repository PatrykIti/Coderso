# TASK-545-04-L03: Reconcile Board, Changelog, and Close Program

# FileName: TASK-545-04-L03-Reconcile-Board-Changelog-And-Close-Program.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-04
**Priority:** High
**Category:** Task Graph / Changelog / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-545-04-L01, TASK-545-04-L02, TASK-545-04-L04
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Exclusive ownership

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/1257-{YYYY-MM-DD}-task-545-workflow-evidence-task-graph.md`
- TASK-545 parent/child/leaf status and completion fields at final closure
- new `tests/unit/workflows/taskGraphIntegrity.test.ts` and its test-only parser/
  fixture helpers

Read both indexes fresh immediately before editing. Do not touch product source,
other changelog files, or unrelated task rows.

## Required board/index corrections

- Correct TASK-533 board changelog 1245 → actual 1247.
- Replace TASK-511 board note about untracked old worktree with current tracked,
  no-extra-worktree, To Do/obsolete-audit truth.
- Add/link truthful TASK-528/529/530 physical parents without changing Done.
- Preserve corrected Done rows/statuses for TASK-498/499/502/503/504/512.
- Add TASK-545 descendants and final Done row only when every descendant is
  terminal.
- Recalculate To Do/In Progress/Done statistics from the physical/board contract;
  read the files fresh immediately before closure and never copy a previously recorded
  count or apply an assumed delta.
- Add changelog 1257 and advance the next-free pointer without changing the pinned
  1248–1256 program reservations/entries.

## Implementation Pseudocode

```text
load fresh task index, changelog index, all TASK-545 files and scoped repaired files
validate filename == FileName, H1 ID, parent linkage, canonical status, unique ID
validate closed parent has no open physical descendant
validate every scoped board row points to a physical parent or documented legacy row
validate changelog numbers/task IDs are unique and TASK-533 resolves to 1247
recalculate statistics from the same freshly parsed rows/files, compare to index values,
and fail rather than applying a blind delta when either population changes
run workflow static tests, evidence manifest/hash lifecycle tests, node --check and diff check
for any UI evidence being closed:
  require canonical-root phase-1 result and strict resume-checkpoint hash/run identity
  require explicit owner review/stage result for manifest/screenshots/checkpoint only
  enter the closure-only resume branch and require --audit-directory --require-tracked
if any contradiction remains: do not create closure state; return exact file:line
otherwise create pinned 1257 changelog, update only scoped rows/pointer/statistics,
set all TASK-545 leaves/children/parent Done with actual completion evidence
for every resumed UI closure:
  compare against the frozen runtime snapshot and allow only that task family,
    task index, exact pinned/date-resolved changelog, and changelog index
  return closureMetadataRevision + sorted allowed changed paths in the owner handoff
  rerun after any parent status edit; no file may change after the final pass
```

The graph audit must explicitly assert TASK-511 remains To Do and TASK-495–535
completed families were not reopened. It must not require retroactive children
for the three truthful reconstructed parents.

## Error/compatibility flow

Any missing physical result, invalid evidence hash, absent/wrong/stale owner-stage checkpoint,
untracked evidence, non-metadata delta, post-validation mutation, open descendant, duplicate
changelog, stale statistic, or workflow static violation blocks closure. Do not
mark Done while reporting a deferred gate/smoke.

## Validation and closure

```bash
for file in _docs/_workflows/*.mjs _docs/_workflows/lib/*.mjs; do node --check "$file"; done
bun test tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts \
  tests/unit/workflows/postAudit.test.ts \
  tests/unit/workflows/workflowStaticContract.test.ts \
  tests/unit/workflows/smokeEvidence.test.ts \
  tests/unit/workflows/taskGraphIntegrity.test.ts
git diff --check
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
```

Rerun named failures once. Replace `{YYYY-MM-DD}` with the actual UTC closure date and
create exactly changelog 1257. For UI evidence, the owner-only review/stage checkpoint
occurs before tracked-evidence validation; it is not a commit and agents never perform it.
Only bounded closure metadata may differ from the frozen runtime revision, and the final
metadata-delta result is a structured handoff rather than a file edited after validation.
The repository owner, not an agent workflow, creates the final commit after all closure
validation.
