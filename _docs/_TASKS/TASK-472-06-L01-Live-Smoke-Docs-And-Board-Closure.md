# TASK-472-06-L01: Live Smoke, Docs, And Board Closure
# FileName: TASK-472-06-L01-Live-Smoke-Docs-And-Board-Closure.md

**Parent Subtask:** TASK-472-06
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Closure
**Estimated Effort:** Small
**Dependencies:** TASK-472-01, TASK-472-02, TASK-472-03, TASK-472-04, TASK-472-05
**Status:** ⏳ To Do

---

## Overview

Execute family validation + closure for TASK-472.

## Sub-Tasks

- [ ] Run the full validation lanes (below); record results.
- [ ] Live `coderso-dev-core-host` + `playwright-cli` smoke on a throwaway page:
      block margins editable + border width/style painted (472-01); a composed
      gradient + a block background image render (472-02); undo a delete + copy a
      section into another page (472-03); a token-bound color re-themes (472-04);
      a fragment with bold/link/highlight renders (472-05). Publish, verify the
      front, delete the page.
- [ ] Update docs: `PAGE_MODEL.md`, `DESIGN_TOKENS.md`, `SECURITY_SPEC.md`, editor
      docs.
- [ ] Sync `_docs/_TASKS/README.md` (move TASK-472 + descendants to Done; update
      statistics) and add a `_docs/_CHANGELOG/` entry (next number) +
      `_docs/_CHANGELOG/README.md`.
- [ ] Fresh post-implementation read-only drift pass (task contract, parent/child
      statuses, changelog/index, validation evidence, code boundaries, security
      invariants — clipboard paste re-normalization, token/url/color sinks). Fix
      real drift; repeat until clean or split into follow-ups.

## Testing Requirements

- `bun run test:vitest`
- `bun --cwd core lint` / `bun --cwd core lint:types` / `bun run check:admin-boundary`
- Targeted suites from 472-01..05 (renderer, control registry, XSS guards,
  editor flow, inline-edit contract).
- Live `playwright-cli` smoke (above). State any skipped lane/DB/live step.

## Documentation Updates Required

- All docs above; `_docs/_TASKS/README.md`; `_docs/_CHANGELOG/` + its `README.md`.
