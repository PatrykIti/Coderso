# TASK-539-06-L02: Prove Responsive CSS Parity

# FileName: TASK-539-06-L02-Prove-Responsive-Css-Parity.md

**Parent Subtask:** TASK-539-06
**Priority:** High
**Category:** Pages / Vitest / Responsive Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-539-06-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Own only additive cross-device/property cases in
`tests/vitest/pages/page-responsive-css.test.ts`. TASK-539-06-L01 has already updated
and gated compatibility expectations; do not re-baseline them.

## Implementation Pseudocode

### Test Shape

- Base layer `{y,z,anchor}` plus tablet `{x}` emits tablet x while retaining effective
  base y/z and matches `resolvePageBlockForBreakpoint`; explicit reset values remain
  present.
- `fontSizeCustom` emits sanitized `font-size`; `textTransform:"none"` resets a base
  transform; non-typography targets diagnose and emit nothing.
- Responsive spans target the renderer's actual grid-item hook for default and
  template-wrapper paths. Per-column/media-split paths diagnose and emit no inert rule.
- Full-bleed background/radius/shadow/glow selectors target section root while capped
  sections target content. Layout/max-width/spacing remain on content.
- Gradient stacks and optional final colors emit separate image/color declarations for
  sections and blocks; invalid values diagnose, never leak raw text, and reset safely.
- Tilt+layer wrapper targeting remains correct.
- Unrelated/no-override CSS and diagnostic output remain byte-identical; media blocks
  and declaration order are deterministic.

Compare effective preview resolver objects to emitted public declarations in shared
fixtures; do not assert editor state alone.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/page-responsive-css.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Rerun this file alone on failure.
