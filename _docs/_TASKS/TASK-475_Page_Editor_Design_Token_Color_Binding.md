# TASK-475: Page Editor Design-Token Color Binding
# FileName: TASK-475_Page_Editor_Design_Token_Color_Binding.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Controls
**Estimated Effort:** Medium
**Dependencies:** None (complements TASK-471-03 / TASK-471-04 color sinks)
**Status:** ⏳ To Do

---

## Overview

All page color controls (`textColor`, `background`, `borderColor`, and the new
TASK-471 fragment-marks / badge colors) accept only raw hex/rgb values. There is
no affordance to bind a color to a **site design token** (primary / secondary /
accent / surface / …), so brand/theme changes don't propagate and authors mix
raw values with tokens inconsistently.

Add a token-aware color control: the author picks a site token (stored as a
validated token reference, e.g. `var(--color-primary)`) **or** a raw value. The
renderer already resolves `var(--color-*)` on the front, so token-bound colors
re-theme automatically.

---

## Current State (verified)

- Color controls use a swatch/color input (`pageEditorControlRegistry.ts:375-392,
  442-450`); values are raw strings sanitized by `sanitizeAuthoringCssColor`.
- Site tokens are defined in the theme (`DesignTokens` /
  `core/services/theme/tokenTypes.ts`) and emitted as `--color-*` CSS vars on the
  front (`core/ui/theme/tokenCss.ts`); the admin canvas re-paints them inline.
- `sanitizeAuthoringCssColor` is the single color sink (must be confirmed to
  accept `var(--color-<known>)` and reject arbitrary `var()`).

---

## Sub-Tasks

- [ ] Extend the color swatch control with a **token palette** (token name +
      live color preview) drawn from the active site tokens, alongside the raw
      input — a single control with "token | custom" affordance.
- [ ] Store a token reference for token-bound colors (`var(--color-<token>)`),
      keeping raw values for custom; normalize both through the color sink.
- [ ] Confirm/extend `sanitizeAuthoringCssColor` to allow **only**
      `var(--color-<knownToken>)` (allowlist of emitted token names) and still
      reject arbitrary `var()` / `url()` / `expression()`.
- [ ] Resolve gracefully when a referenced token was removed from the theme
      (fall back to a safe default, surface no broken color).
- [ ] Apply consistently across the color controls (textColor / background /
      borderColor); coordinate the same picker for TASK-471-03 marks and
      TASK-471-04 badge colors.
- [ ] Add coverage (token bind round-trips; unknown token rejected; removed
      token falls back; raw values still work).

---

## Implementation Pseudocode

```ts
// Color control value space: raw string OR token reference.
type ColorValue = string;                 // "#0d9488" | "var(--color-primary)"

const knownColorTokens = ["primary","secondary","accent","surface","bg","text"] as const;

export function sanitizeColorOrToken(input: unknown): string | null {
  const v = String(input ?? "").trim();
  const m = /^var\(--color-([a-z-]+)\)$/.exec(v);
  if (m) return (knownColorTokens as readonly string[]).includes(m[1]) ? v : null;  // allowlist
  return sanitizeAuthoringCssColor(v);    // raw path unchanged
}
// Control UI: tokenPalette = themeTokens.color → swatches committing
// `var(--color-${name})`; custom tab commits a raw sanitized value.
```

Regression-test shape:
- Picking "Primary" stores `var(--color-primary)` and paints the theme color.
- `var(--color-bogus)` / arbitrary `var(--x)` rejected; raw hex still accepted.
- A removed token falls back to a safe default (no broken/blank color).

---

## Security Contract

- No new endpoints. Token references are allowlisted to
  `var(--color-<knownToken>)`; all other `var()`/`url()`/`expression()` rejected.
  Raw values keep going through `sanitizeAuthoringCssColor`. No CSS-injection
  surface added. Admin session + existing perms/CSRF.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun run test:vitest` (control registry + editor flow)
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` (token color binding), `_docs/SECURITY_SPEC.md`
  (token allowlist sink).
- `_docs/_TASKS/README.md` (board + statistics), `_docs/_CHANGELOG/` on
  completion.
