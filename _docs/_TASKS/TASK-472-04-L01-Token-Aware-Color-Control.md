# TASK-472-04-L01: Token-Aware Color Control
# FileName: TASK-472-04-L01-Token-Aware-Color-Control.md

**Parent Subtask:** TASK-472-04
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Controls
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Add a token-aware color control: the author picks a site design token (stored as
`var(--color-<token>)`) or a raw value. The renderer already resolves
`var(--color-*)` on the front, so token-bound colors re-theme automatically.

## Current State (verified)

- Color controls use a swatch/color input (`pageEditorControlRegistry.ts:375-392,
  442-450`); values are raw strings sanitized by `sanitizeAuthoringCssColor`.
- Tokens in `core/services/theme/tokenTypes.ts`; emitted `--color-*` by
  `core/ui/theme/tokenCss.ts`; admin canvas re-paints them inline.
- `sanitizeAuthoringCssColor` is the single color sink (confirm/extend it to
  accept `var(--color-<known>)` and reject arbitrary `var()`).

## Sub-Tasks

- [ ] Extend the color swatch control with a token palette (name + live preview)
      drawn from active site tokens, alongside the raw input ("token | custom").
- [ ] Store `var(--color-<token>)` for token-bound colors; raw for custom;
      normalize both through the color sink.
- [ ] Confirm/extend `sanitizeAuthoringCssColor` to allow only
      `var(--color-<knownToken>)` (allowlist of emitted token names) and still
      reject arbitrary `var()`/`url()`/`expression()`.
- [ ] Resolve gracefully when a referenced token was removed (safe default; no
      broken color).
- [ ] Apply consistently across textColor/background/borderColor; coordinate with
      TASK-471-03 marks + TASK-471-04 badge colors.
- [ ] Coverage: token bind round-trips; unknown token rejected; removed token
      falls back; raw values still work.

## Implementation Pseudocode

```ts
type ColorValue = string;                 // "#0d9488" | "var(--color-primary)"
const knownColorTokens = ["primary","secondary","accent","bg","surface","text","border"] as const; // mirror tokenCss.ts --color-* emitters

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
- "Primary" stores `var(--color-primary)` and paints the theme color.
- `var(--color-bogus)` / arbitrary `var(--x)` rejected; raw hex accepted.
- A removed token falls back to a safe default.

## Security Contract

- No new endpoints. Token references allowlisted to `var(--color-<knownToken>)`;
  all other `var()`/`url()`/`expression()` rejected. Raw values keep going
  through `sanitizeAuthoringCssColor`. No CSS-injection surface added.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun run test:vitest` (control registry + editor flow)
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` (token color binding), `_docs/SECURITY_SPEC.md`
  (token allowlist sink).
- `_docs/_TASKS/TASK-472-04*.md` status; changelog rolled up by TASK-472-06.
