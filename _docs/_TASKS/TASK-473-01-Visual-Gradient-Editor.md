# TASK-473-01: Visual Gradient Editor
# FileName: TASK-473-01-Visual-Gradient-Editor.md

**Parent Task:** TASK-473
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Background
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

When `backgroundType: "gradient"`, the author currently pastes a raw CSS gradient
string into the Background control. Replace that with a visual composer (color
stops + direction/angle) that produces a sanitized gradient, keeping the stored
representation compatible with the existing renderer.

---

## Current State (verified)

- `core/services/pages/pageEditorControlRegistry.ts:384-404` — block background
  is `block.style.background` (input `color`) + `block.style.backgroundType`
  (select over `pageBackgroundTypes`, default `none`). No gradient composer.
- `core/services/pages/pageRendererV2.tsx:458-459` — when
  `backgroundType === "gradient"`, `backgroundImage: toGradientBackground(style.background)`
  turns the stored `background` string into the painted gradient.
- Gradient/CSS sanitization owner: `toGradientBackground` +
  `escapeAuthoringCssString` (authoring sanitizers).

---

## Sub-Tasks

- [ ] Reproduce the current `toGradientBackground` contract (what string shapes
      it accepts/sanitizes) so the composer emits only accepted output.
- [ ] Add a gradient composer control (type + angle/direction + ordered color
      stops with positions); each stop color goes through the safe-color helper.
- [ ] Compose a sanitized `linear-gradient(...)` / `radial-gradient(...)` string
      and store it in the existing `style.background` field (no schema/renderer
      churn) when `backgroundType === "gradient"`.
- [ ] Keep a raw-CSS fallback path **only** behind the existing gradient
      sanitizer (no new raw sink); offer a small set of preset gradients.
- [ ] Add render + sanitizer coverage (valid gradient composes/paints; unsafe
      stop colors and `url()`/`expression()` fail closed).

---

## Implementation Pseudocode

```ts
// New control UI model 'gradient' → composes into the existing string field.
type GradientStop = { color: string; pos: number };           // pos 0..100
type GradientModel = { kind: "linear" | "radial"; angle: number; stops: GradientStop[] };

function composeGradientCss(model: GradientModel): string | null {
  const stops = model.stops
    .map((s) => ({ color: sanitizeAuthoringCssColor(s.color), pos: clampInt(s.pos, 0, 100) }))
    .filter((s) => s.color);                                   // drop unsafe
  if (stops.length < 2) return null;
  const body = stops.map((s) => `${s.color} ${s.pos}%`).join(", ");
  const css = model.kind === "linear"
    ? `linear-gradient(${clampInt(model.angle, 0, 360)}deg, ${body})`
    : `radial-gradient(${body})`;
  return toGradientBackground(css) ? css : null;               // re-validate via owner
}
// Commit composeGradientCss(model) into style.background; renderer unchanged.
```

Regression-test shape:
- A 2-stop linear gradient composes and paints via `toGradientBackground`.
- A stop with `url(x)` / `expression(...)` / `;`-injection is dropped → fails
  closed (no painted gradient if <2 safe stops).
- Existing raw-string gradients still render (backward compatible).

---

## Security Contract

- No new endpoints. Every stop color passes `sanitizeAuthoringCssColor`; the
  composed string is re-validated through `toGradientBackground` before storage.
  No `url()`, `expression()`, or arbitrary CSS; no new raw sink. Reuse the
  existing gradient sanitizer owner — do not add a second.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun run check:admin-boundary` (if sanitizer helpers move)

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`, `_docs/SECURITY_SPEC.md` (gradient sink).
- `_docs/_TASKS/TASK-473*.md` (status), `_docs/_CHANGELOG/` on task closure.
