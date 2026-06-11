# TASK-449-03: Validation Nested Slots Controls And Closure
# FileName: TASK-449-03-Validation-Nested-Slots-Controls-And-Closure.md

**Parent Task:** TASK-449
**Priority:** High
**Category:** Pages / Page Editor V2 / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-449-02, TASK-421, TASK-423
**Status:** ⏳ To Do

---

## Overview

Close the `columns` family with a live nested-slots replay of the audit method
and verify that the shared control-surface follow-up from TASK-421 also reaches
the columns inspector without regressing persistence.

---

## Implementation Pseudocode

```text
Live smoke:
1. Insert Columns.
2. Set count/gap/distribution.
3. Add child blocks into column:1 and column:2.
4. Save, reopen, publish.
5. Verify editor still shows the block and front HTML still exposes
   data-page-block="columns" with nested children.
6. Verify columns controls use dedicated TASK-421 widgets, not native selects.
```

Expected validation set:

- Vitest round-trip coverage green.
- Bun runtime page render proof green.
- Live browser smoke confirms nested children persist.

Error handling:

- If save/reopen still drops the block, keep the family open and split any
  residual issue explicitly.

Regression-test shape:

- No new production code; this subtask records the final proof.

---

## Sub-Tasks

- [ ] Run the targeted validation set and capture final evidence.
- [ ] Synchronize the owned docs, task-board rows, and changelog coverage.
- [ ] Split any residual drift into explicit follow-up tasks before closure if needed.

## Testing Requirements

- `bun run test:vitest`
- Relevant Bun runtime tests
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion

