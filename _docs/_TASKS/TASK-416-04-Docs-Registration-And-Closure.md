# TASK-416-04: Docs, Registration, And Closure
# FileName: TASK-416-04-Docs-Registration-And-Closure.md

**Parent Task:** TASK-416
**Priority:** High
**Category:** CMS Widgets / Timeline / Docs / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-416-01, TASK-416-02, TASK-416-03
**Status:** ✅ Done
**Started:** 2026-06-07
**Completed:** 2026-06-07

---

## Overview

Verify registration wiring, rewrite the timeline documentation to the v2 contract,
add the changelog entry, run the validation lanes plus the real browser smoke, and
close the TASK-416 family on the board.

## Sub-Tasks

- [ ] Verify `core/widgets/core/index.ts` still wires
      `createTimelineWidget(editors.timeline)` and the `timeline` metadata block;
      adjust the `EditorBundle<TimelineData>` type only if the data type export
      changed.
- [ ] Rewrite `_docs/_WIDGETS/TIMELINE.md` to v2 (preset model, capability table,
      axis/opposite/dot-variant/tone, token-alias note, new data-model JSON, new
      editor IA, renamed `data-timeline-*` attributes, clear controls).
- [ ] Update `_docs/WIDGETS.md` timeline specifics if the editor IA section names
      changed (keep the Wizard/Visual/Advanced model description).
- [ ] Add `_docs/_CHANGELOG/1137-2026-06-07-task-416-timeline-preset-rewrite.md`
      (verify 1137 is the next free number) and the index row in
      `_docs/_CHANGELOG/README.md`. Note the clean break (no re-seed needed), the
      renamed diagnostic attributes (Playwright inventory impact), and the
      success/warning/info token aliasing decision.
- [ ] Confirm no `core/widgets/modulePackMatrix.ts` change is needed (timeline is
      absent); optionally touch the prose at `_docs/WIDGET_PACK_MATRIX.md`.
- [ ] Run validation lanes + playwright-cli smoke; record evidence.
- [ ] Update `_docs/_TASKS/README.md`: move TASK-416 family to Done with notes and
      update Statistics. Add Completion Notes + Validation Evidence to TASK-416.

## Implementation Pseudocode

```text
verify index.ts wiring -> rewrite TIMELINE.md -> update WIDGETS.md ->
add changelog 1137 + README row -> run lanes -> playwright smoke -> board closure
```

Error handling: if the changelog number 1137 is taken, allocate the next free
number and update both the file name and the index row. If playwright smoke cannot
run, state the gap explicitly in the changelog and board notes.

Regression-test shape: documentation-only validation uses `git diff --check`; the
code lanes are owned by TASK-416-01..03.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/ui/timeline-editor-wave.test.tsx`
- `git diff --check`
- Start the dev host with **`coderso-dev-core-host`** and run a **playwright-cli**
  smoke: add a Timeline block, cycle all six presets, and confirm canvas + admin
  preview + public front parity for every visible option, opposite content, axis
  position, and dot tones.

## Documentation Updates Required

- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/1137-2026-06-07-task-416-timeline-preset-rewrite.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
