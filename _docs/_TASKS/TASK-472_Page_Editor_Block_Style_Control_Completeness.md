# TASK-472: Page Editor Block Style Control Completeness
# FileName: TASK-472_Page_Editor_Block_Style_Control_Completeness.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Controls
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Two block-frame style controls are incomplete in the floating panel (quick-win
fixes surfaced during the TASK-471 discovery):

1. **Margins** are registered in the control registry and already painted by the
   renderer, but do not appear in the Spacing panel — a schema↔UI desync.
2. **Border** exposes only a color control while the renderer hardcodes
   `1px solid`; there is no width or style control.

Both are "wire existing/missing block-frame style controls end-to-end". Additive
and backward-compatible: legacy documents render identically.

---

## Scope & Sub-Tasks

| ID | Title | Priority | Effort | Summary |
|----|-------|----------|--------|---------|
| TASK-472-01 | Surface Block Margin Controls | High | Small | Make the registered `block.style.margin.*` controls render in the Spacing panel (reproduce-first; fix the panel filter/desync). |
| TASK-472-02 | Block Border Width & Style Controls | High | Small | Add `borderWidth` + `borderStyle` to the block style schema/controls and stop the renderer hardcoding `1px solid`. |

---

## Security Contract (task-level)

- No new API endpoints; rides the existing pages save/draft routes (admin
  session, `pages:write`, existing CSRF).
- New inputs are schema-owned: numeric clamps for `borderWidth`, enum
  reject-unknown for `borderStyle`. No color/CSS injection surface added.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts`
- `bun --cwd core lint` / `bun --cwd core lint:types`
- Closure: live `playwright-cli` smoke (margins editable in panel; border
  width/style change the painted output).

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (border width/style fields).
- `_docs/_TASKS/README.md` (board + statistics), `_docs/_CHANGELOG/` on
  completion.
