# TASK-545-04-L01: Correct Existing Task Metadata

# FileName: TASK-545-04-L01-Correct-Existing-Task-Metadata.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-04
**Priority:** High
**Category:** Task Metadata / Historical Integrity
**Estimated Effort:** Small
**Dependencies:** TASK-545-03-L02
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Correct only the enumerated stale task metadata from physical child and
changelog evidence without reopening completed product work.

## Sub-Tasks

None; this is an executable leaf with the exclusive file ownership below.

## Exclusive ownership

Only these existing task files:

- `TASK-498_Custom_Screen_Data_Oriented_Builder_And_Look_Parity.md`
- `TASK-499_Menu_Items_Restyle_And_Design_Tab_MenuDocumentV2.md`
- `TASK-502_Menu_Design_Fixes_V2_Brand_Tablet_Canvas_Nesting.md`
- `TASK-503_Screens_Polish_V2_Block_Style_Labels_Entry_View.md`
- `TASK-504_Menu_Styling_Depth_Brand_And_Per_Level.md`
- `TASK-504-05-Menu-Styling-Tests-Docs-Closure.md`
- `TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md`
- `TASK-512_Media_Library_Prototype_Fidelity_And_Schema.md`
- `TASK-533_Layout_Grid_Span_Asymmetric_Border_Timeline.md`

Do not edit indexes/changelogs, TASK-528–530, product source, or statuses outside
the literal corrections.

## Grounded corrections

- Parent tables falsely show To Do although physical children are Done:
  TASK-498 `:124-127`, TASK-499 `:116-120`, TASK-502 `:452-456`,
  TASK-503 `:328-331`, TASK-512 `:92-98`.
- Remove self-parent fields: TASK-504 `:5` and TASK-512 `:5`.
- TASK-504-05 `:382`: changelog date `2026-07-02` → actual `2026-07-03`.
- TASK-533 `:41,43-46`: replace stale/dynamic 1245 language with actual closure
  changelog 1247; normalize its status to `✅ Done`, moving its embedded date/
  narrative to dedicated completion fields while preserving validation evidence.
- TASK-511 `:65-79`: old highest/worktree/HEAD narrative is obsolete. Current
  files are tracked on `feature/tasks-fixes`, no extra worktree exists, changelog
  1229 remains pinned, and the old audit is obsolete. Keep `⏳ To Do` and state
  that fresh security re-author/audit is required before implementation.

## Implementation Pseudocode

```text
for each enumerated parent table:
  compare every listed physical child canonical Status field
  replace only stale table status cells with the physical status
remove only invalid self-parent metadata from board-level parents
correct TASK-504-05 date from the actual 1213 filename/index
correct TASK-533 closure number/instructions to actual 1247
replace TASK-511 stale location/HEAD claims with current tracked/no-worktree facts
leave all canonical top-level statuses unchanged
run filename/H1/FileName/parent/status/changelog audit on touched files
```

Do not normalize unrelated historical prose or fabricate validation. Re-read git
status/HEAD immediately before edits because concurrent task authoring may have
changed line positions.

## Error/compatibility flow

If physical child status and changelog evidence conflict, stop and report rather
than choosing one. TASK-511 remains open regardless of metadata correction.

## Regression-test handoff

TASK-545-04-L03 solely owns `tests/unit/workflows/taskGraphIntegrity.test.ts`. Add
table-driven assertions for every stale child cell, both removed self-parent fields,
the TASK-504-05 date, TASK-533 changelog/status metadata, and TASK-511's unchanged To Do
state plus tracked/no-extra-worktree wording. This leaf does not edit the test.

## Testing Requirements

```bash
rg -n '^\*\*Status:|^\| TASK-|^\*\*Parent Task:|Changelog' \
  _docs/_TASKS/TASK-{498,499,502,503,504,511,512,533}*.md
git diff --check
```

## Documentation Updates Required

- Update only the enumerated task files; do not edit either index or a
  changelog in this leaf.
- TASK-545-04-L03 owns the final board and changelog 1257 reconciliation.
