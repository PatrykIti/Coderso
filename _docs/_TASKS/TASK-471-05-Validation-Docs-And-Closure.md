# TASK-471-05: Validation, Docs, And Closure
# FileName: TASK-471-05-Validation-Docs-And-Closure.md

**Parent Task:** TASK-471
**Priority:** High
**Estimated Effort:** Small
**Category:** Pages / Page Editor V2 / Closure
**Dependencies:** TASK-471-01, TASK-471-02, TASK-471-03, TASK-471-04
**Status:** ⏳ To Do

---

## Overview

Family closure: prove all four features work end-to-end on a live page, sync
docs/board/changelog, and run the AGENTS.md drift passes. Closes TASK-471 only
when 01–04 are `✅ Done` (or explicitly superseded/cancelled).

---

## Sub-Tasks

- [ ] Run the full validation lanes (below) and record results.
- [ ] Live `coderso-dev-core-host` + `playwright-cli` smoke on a throwaway page:
      - x-small / xx-small text renders (471-01),
      - a text block, a button, and an image self-center via `align:center`
        (471-02),
      - a hero header carries 2+ colors via fragment selection (471-03),
      - a badge with custom color/size/shape/icon renders on canvas + front
        (471-04),
      then publish, verify the public runtime, and delete the page.
- [ ] Update docs: `_docs/PAGE_MODEL.md`, `_docs/DESIGN_TOKENS.md`,
      `_docs/WIDGETS.md`, `_docs/WIDGET_PACK_MATRIX.md`, `_docs/_WIDGETS/BADGE.md`,
      `_docs/SECURITY_SPEC.md` (color-mark/badge sinks, if extended).
- [ ] Sync `_docs/_TASKS/README.md` (move TASK-471 + children to Done; update
      statistics) and add a `_docs/_CHANGELOG/` entry (next available number) +
      update `_docs/_CHANGELOG/README.md`.
- [ ] Run a fresh post-implementation read-only drift pass (task contract,
      parent/child statuses, changelog/index, validation evidence, code
      boundaries, security invariants, the align-reproduction findings, and the
      Posts inline-marks reuse decision). Fix any real drift and repeat until
      clean or split into explicit follow-ups.
- [ ] Confirm/record the deferred decisions: post-block scope (471-01),
      full-width+center UX (471-02), Posts mark-model sharing (471-03), badge
      module placement (471-04).

---

## Testing Requirements

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`
- Targeted suites from 471-01..04 (renderer, control registry, inline-edit
  contract, XSS guards, badge widget + editor-wave).
- Live `playwright-cli` smoke (above). If any lane/DB/live step is skipped,
  state it explicitly in the closure.

## Documentation Updates Required

- All docs listed above; `_docs/_TASKS/README.md`; `_docs/_CHANGELOG/` + its
  `README.md`. Reconcile the parent's "Adjacent gaps" list into explicit
  follow-up tasks if the owner promotes any.
