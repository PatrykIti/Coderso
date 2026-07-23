# TASK-545-04-L02: Reconstruct Truthful Historical Parents

# FileName: TASK-545-04-L02-Reconstruct-Truthful-Historical-Parents.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-04
**Priority:** Medium
**Category:** Task Graph / Historical Reconstruction
**Estimated Effort:** Small
**Dependencies:** TASK-545-04-L01
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Exclusive ownership

Create exactly one new board-parent `_docs/_TASKS/TASK-###_Short_Title.md` for
each of TASK-528, TASK-529, and TASK-530. Derive final slugs from the existing
board title; do not create child/leaf files or edit board/indexes here.

## Evidence sources

- TASK-528: board row,
  `_docs/_CHANGELOG/1241-2026-07-08-task-528-whole-card-tilt-frame-node.md`,
  `_docs/_workflows/task-528-full.mjs`, and implementing commit/diff.
- TASK-529: board row,
  `_docs/_CHANGELOG/1240-2026-07-08-task-529-spotlight-viewport-coords-fix.md`,
  `_docs/_workflows/task-529-full.mjs`, and implementing commit/diff.
- TASK-530: board row,
  `_docs/_CHANGELOG/1242-2026-07-08-task-530-page-editor-slider-fine-step-1.md`,
  `_docs/_workflows/task-530-full.mjs`, and implementing commit/diff.

The files currently have no physical parent; do not infer facts from workflow
prompts where changelog/git evidence disagrees.

## Implementation Pseudocode

```text
for taskId in 528, 529, 530:
  read current board row, actual changelog file, implementing commit and diff
  create canonical board-level filename/H1/FileName with no Parent Task field
  set Status exactly Done and record actual Completed date
  state this is a historical reconstruction under TASK-545, not a new contract
  summarize only shipped source behavior, actual validation, actual changelog,
  compatibility/security facts evidenced by the changelog/diff
  explicitly state: no physical children were authored historically
  do not add retroactive implementation pseudocode, acceptance promises, smoke,
  branch, or gate evidence that did not exist
```

These reconstructed parents are exceptions to current execution-ready authoring
because implementation predates the missing metadata repair; truthfulness is the
purpose. They remain Done and do not create open descendants.

## Error/compatibility flow

If board/changelog/commit disagree materially, stop that reconstruction and
report the conflict. Do not overwrite history or renumber changelogs.

## Regression-test handoff

TASK-545-04-L03 solely owns `tests/unit/workflows/taskGraphIntegrity.test.ts`. It must
assert exactly one canonical parent for TASK-528/529/530, no parent field, terminal Done
plus evidence-backed Completed/changelog metadata, and the explicit historical exception
that these three parents have no physical descendants. This leaf does not edit tests.

## Validation

```bash
for id in 528 529 530; do
  rg -n '^# TASK-|^# FileName:|^\*\*Status:|^\*\*Completed:|Changelog' \
    _docs/_TASKS/TASK-${id}_*.md
done
git diff --check
```
