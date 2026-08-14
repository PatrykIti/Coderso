# TASK-545-04-L03: Reconcile Board, Changelog, and Close Program

# FileName: TASK-545-04-L03-Reconcile-Board-Changelog-And-Close-Program.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-04
**Priority:** High
**Category:** Task Graph / Changelog / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-545-04-L01, TASK-545-04-L02, TASK-545-04-L04
**Status:** ✅ Done
**Completed:** 2026-08-14
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Run the final graph/evidence reconciliation and act as the sole writer for the
TASK-545 board, changelog, and terminal status transition.

## Sub-Tasks

None; this is the executable closure leaf with the exclusive ownership below.

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
- Add TASK-545 descendants and the final Done row only after every non-closure
  descendant has a current validated completion receipt. L03 is the sole status
  writer and therefore must not require its own status transition as an entry
  precondition.
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
  require explicit owner review/stage result for report/manifest/screenshots/checkpoint only
  enter the closure-only resume branch and require --audit-directory --require-tracked
if any contradiction remains: do not create closure state; return exact file:line
derive ClosureMetadataMutationPlanV1 from checkpoint-frozen before bytes,
  closureIdentity, current exact own rows/statistics, and strict closure receipts
require per-path beforeSha256, exact ordered allowed field/row operations, and
  deterministic expectedAfterSha256; reject ambiguous/missing/extra targets
otherwise create pinned 1257 changelog; mark receipt-complete non-closure leaves
Done, then their physical parents; mark L03 Done, then TASK-545-04 Done, then
TASK-545 Done; only after those transitions synchronize the scoped final board
row/pointer/statistics from the same freshly parsed bytes
for every resumed UI closure:
  compare against the frozen runtime snapshot and allow only that task family,
    task index, exact pinned/date-resolved changelog, and changelog index
  return closureMetadataRevision + sorted allowed changed paths in the owner handoff
  reread bytes and require every after hash equals the exact plan; path membership
    without exact semantic-operation and hash equality is failure
  rerun after any parent status edit; no file may change after the final pass
```

The graph audit must explicitly assert TASK-511 remains To Do and TASK-495–535
completed families were not reopened. It must not require retroactive children
for the three truthful reconstructed parents.

## Error/compatibility flow

Any missing physical result, invalid evidence hash, absent/wrong/stale owner-stage checkpoint,
untracked evidence, non-metadata delta, unplanned prose/dependency/scenario/row/statistic
mutation inside an allowed path, expected-after-hash mismatch, post-validation mutation, open descendant, duplicate
changelog, stale statistic, or workflow static violation blocks closure. Do not
mark Done while reporting a deferred gate/smoke.

### Manual closeout (isolated closure-automation failure only)

If every product evidence, cleanup, documentation, and full-gate requirement above is
verified complete and the only remaining failure is an isolated defect in the task-local
closure automation itself (the workflow script, checkpoint/resume harness, or metadata
planner), the repository owner, not an agent, may record a bounded manual closeout in
the owner-controlled phase. It (a) documents the automation defect and its exact
limitation, (b) manually revalidates the exact closure receipts and evidence paths
listed above, (c) writes the same pinned changelog 1257 plus the scoped board and
statistics bytes through the same ordered metadata plan, and (d) keeps task, board, and
changelog state synchronized. Evidence-hash and checkpoint guarantees remain required
wherever automation ran successfully; the manual path never fabricates hashes and never
replays unrun phases. It returns an `owner_action_required` result rather than an
agent-completed one, and the owner-only review/stage rules above still apply.

## Testing Requirements

```bash
git ls-files -z -- '_docs/_workflows/*.mjs' '_docs/_workflows/lib/*.mjs' |
  xargs -0 -r -n1 node --check
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

Append the canonical baseline-through-final NUL-safe line-count gate over every
added/modified human-authored production or test file in this leaf's write set,
including the new `tests/unit/workflows/taskGraphIntegrity.test.ts`, its
test-only parser/fixture helpers, and untracked files. The pinned pre-family
baseline spans intermediate commits and staging; neither can narrow the
measured scope. A file that exceeded the limit in any intermediate commit is
counted even if later restored below 1,000 before the final tree; restore is
not a valid narrowing. The counter is `awk 'END { print NR }'` (NUL-safe over the
`-z`/`read -r -d ''` path stream, `.ts/.tsx/.js/.jsx/.mjs/.cjs/.mts/.cts`
included, generated files excluded) and counts a final line without a trailing
newline as one physical line; the test-only fixture helpers pin that
unterminated-final-line regression so a newline-only count can never replace
the gate. Any result above 1,000 exits nonzero:

```bash
TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
failed=0
while IFS= read -r -d '' f; do
  lines=$(awk 'END { print NR }' "$f")
  if [ "$lines" -gt 1000 ]; then
    printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
    failed=1
  fi
done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|js|mjs|mts|cts)$' | sort -zu)
exit "$failed"
```

Rerun named failures once. Replace `{YYYY-MM-DD}` with the actual UTC closure date and
create exactly changelog 1257. For UI evidence, the owner-only review/stage checkpoint
occurs before tracked-evidence validation; it is not a commit and agents never perform it.
Only bounded closure metadata may differ from the frozen runtime revision, and the final
metadata-delta result is a structured handoff rather than a file edited after validation.
The graph suite must mutate each allowed file outside its exact planned field/row,
including another board row and an acceptance/scenario line, and prove the
metadata validator fails despite path allowlist membership.
The repository owner, not an agent workflow, creates the final commit after all closure
validation.

## Documentation Updates Required

- Update `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/README.md`, changelog 1257,
  and TASK-545 family completion fields only after all closure gates pass.
- Record exact commands/results and preserve the pinned changelog identity.
