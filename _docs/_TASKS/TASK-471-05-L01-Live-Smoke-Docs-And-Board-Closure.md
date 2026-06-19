# TASK-471-05-L01: Live Smoke, Docs, And Board Closure
# FileName: TASK-471-05-L01-Live-Smoke-Docs-And-Board-Closure.md

**Parent Subtask:** TASK-471-05
**Priority:** High
**Category:** Pages / Page Editor V2 / Closure
**Estimated Effort:** Small
**Dependencies:** TASK-471-01, TASK-471-02, TASK-471-03, TASK-471-04
**Status:** ⏳ To Do

---

## Overview

Execute family validation + closure for TASK-471.

## Sub-Tasks

- [ ] Run the full validation lanes (below); record results.
- [ ] Live `coderso-dev-core-host` + `playwright-cli` smoke on a throwaway page:
      x-small/xx-small text (471-01); a text block, a button, and an image
      self-center via `align:center` (471-02); a hero header with 2+ colors via
      fragment selection (471-03); a badge with custom color/size/shape/icon
      (471-04). Publish, verify the public runtime, delete the page.
- [ ] Update docs: `PAGE_MODEL.md`, `DESIGN_TOKENS.md`, `WIDGETS.md`,
      `WIDGET_PACK_MATRIX.md`, `_WIDGETS/BADGE.md`, `SECURITY_SPEC.md`.
- [ ] Sync `_docs/_TASKS/README.md` (move TASK-471 + descendants to Done; update
      statistics) and add a `_docs/_CHANGELOG/` entry (next number) +
      `_docs/_CHANGELOG/README.md`.
- [ ] Fresh post-implementation read-only drift pass (task contract, parent/child
      statuses, changelog/index, validation evidence, code boundaries, security
      invariants, the 471-02 align reproduction, the 471-03 Posts-reuse
      decision). Fix real drift; repeat until clean or split into follow-ups.
- [ ] Record the deferred decisions (post scope / full-width+center / Posts mark
      sharing / badge module).

## Testing Requirements

- `bun run test:vitest`
- `bun --cwd core lint` / `bun --cwd core lint:types` / `bun run check:admin-boundary`
- Targeted suites from 471-01..04 (renderer, control registry, inline-edit
  contract, XSS guards, badge widget + editor-wave).
- Live `playwright-cli` smoke (above). State any skipped lane/DB/live step.

## Documentation Updates Required

- All docs above; `_docs/_TASKS/README.md`; `_docs/_CHANGELOG/` + its `README.md`.
