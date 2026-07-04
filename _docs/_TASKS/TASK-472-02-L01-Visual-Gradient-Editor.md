# TASK-472-02-L01: Visual Gradient Editor
# FileName: TASK-472-02-L01-Visual-Gradient-Editor.md

**Parent Subtask:** TASK-472-02
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Background
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Overview

Replace raw-CSS gradient entry with a visual composer (color stops +
direction/angle) that produces a sanitized gradient, stored in the existing
`style.background` field so the renderer is unchanged.

## Current State (verified)

- `core/services/pages/pageEditorControlRegistry.ts:384-404` — block background is
  `block.style.background` (`color`) + `block.style.backgroundType` (select,
  default `none`). No gradient composer.
- `core/services/pages/pageRendererV2.tsx:458-459` — when
  `backgroundType === "gradient"`, `backgroundImage: toGradientBackground(style.background)`.
- Sanitizer owner: `toGradientBackground` + `escapeAuthoringCssString`.

## Sub-Tasks

- [x] Reproduce the `toGradientBackground` accepted-string contract first.
- [x] Add a gradient composer control (kind + angle + ordered stops); each stop
      color via the safe-color helper.
- [x] Compose a sanitized `linear-gradient(...)`/`radial-gradient(...)` into
      `style.background` when `backgroundType === "gradient"` (no schema/renderer
      churn); offer a few preset gradients.
- [x] Keep a raw-CSS fallback only behind the existing gradient sanitizer.
- [x] Render + sanitizer coverage.

## Implementation Pseudocode

```ts
type GradientStop = { color: string; pos: number };           // pos 0..100
type GradientModel = { kind: "linear"|"radial"; angle: number; stops: GradientStop[] };

function composeGradientCss(m: GradientModel): string | null {
  const stops = m.stops
    .map((s) => ({ color: sanitizeAuthoringCssColor(s.color), pos: clampInt(s.pos, 0, 100) }))
    .filter((s) => s.color);
  if (stops.length < 2) return null;
  const body = stops.map((s) => `${s.color} ${s.pos}%`).join(", ");
  const css = m.kind === "linear"
    ? `linear-gradient(${clampInt(m.angle, 0, 360)}deg, ${body})`
    : `radial-gradient(${body})`;
  return toGradientBackground(css) ? css : null;              // re-validate via owner
}
// Commit composeGradientCss(model) → style.background; renderer unchanged.
```

Regression-test shape:
- 2-stop linear gradient composes + paints via `toGradientBackground`.
- A stop with `url(x)`/`expression(...)`/`;`-injection is dropped → fails closed.
- Existing raw-string gradients still render (backward compatible).

## Security Contract

- No new endpoints. Every stop color passes `sanitizeAuthoringCssColor`; composed
  string re-validated through `toGradientBackground` before storage. No `url()`,
  `expression()`, or arbitrary CSS; no new raw sink (reuse the gradient owner).

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types` / `bun run check:admin-boundary`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`, `_docs/SECURITY_SPEC.md` (gradient sink).
- `_docs/_TASKS/TASK-472-02*.md` status; changelog rolled up by TASK-472-06.
