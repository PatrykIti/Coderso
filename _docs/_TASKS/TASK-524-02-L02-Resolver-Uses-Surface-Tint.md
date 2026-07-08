# TASK-524-02-L02: `resolveBlockCompositionAttrs` Seeds Glow From `surfaceTint` (Background Fallback)

# FileName: TASK-524-02-L02-Resolver-Uses-Surface-Tint.md

**Parent Task:** TASK-524
**Parent Subtask:** TASK-524-02
**Priority:** High
**Category:** Site Render / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

One edit in `core/services/pages/pageCompositionEffects.tsx`
`resolveBlockCompositionAttrs`: seed `--surface-glow`/`--deco-ring`/`--orb-color`
from `style.surfaceTint` FIRST (already sanitized at write, 524-02-L01); fall back to
the 522 plain-color-`style.background` value ONLY when no `surfaceTint` is present.
DISJOINT region from 524-01's `PAGE_COMPOSITION_EFFECTS_CSS` string edit (same file,
different symbol) — lands after 524-01.

## Grounded anchors (RE-GREP post-523)

- **`resolveBlockCompositionAttrs`** (`pageCompositionEffects.tsx:124`). Current glow
  source (verified `:134-148`):
  ```ts
  const bg = style.background ?? undefined;
  const glow = bg && !isGradientOrUrl(bg) ? bg : undefined;   // 522: background-derived only
  const motion = style.decoration?.motion;
  const needsGlow = !!style.surfacePreset || !!style.hoverEffect ||
    motion === "radiate" || motion === "pulse" || motion === "drift" || motion === "float";
  if (glow && needsGlow) {
    cssVars["--surface-glow"] = glow;
    cssVars["--deco-ring"]   = glow;
    cssVars["--orb-color"]   = glow;
  }
  ```
- `isGradientOrUrl` (`:121`) — `/gradient|url\(/i`. `surfaceTint` is a plain color
  (sanitized to hex/rgba/hsl/var/transparent by `sanitizeAuthoringCssColor`, never a
  gradient/url), so it does NOT need the `isGradientOrUrl` guard, but applying the same
  guard defensively is harmless (a `var(--x)` tint passes it).
- `PageBlockStyleV2.surfaceTint` (524-02-L01) — imported type; `resolveBlockCompositionAttrs`
  already takes `style?: PageBlockStyleV2`, so no signature change.

## Implementation pseudocode

```ts
// pageCompositionEffects.tsx — resolveBlockCompositionAttrs glow source:
// PRECEDENCE: surfaceTint (independent, sanitized) → else 522 plain-color background fallback.
const bg = style.background ?? undefined;
const bgGlow = bg && !isGradientOrUrl(bg) ? bg : undefined;   // 522 fallback (background-derived)
// surfaceTint is sanitized at write (524-02-L01) and is a plain color; guard defensively:
const tintGlow = style.surfaceTint && !isGradientOrUrl(style.surfaceTint)
  ? style.surfaceTint : undefined;
const glow = tintGlow ?? bgGlow;                              // ← tint WINS; background only if no tint
const motion = style.decoration?.motion;
const needsGlow = !!style.surfacePreset || !!style.hoverEffect ||
  motion === "radiate" || motion === "pulse" || motion === "drift" || motion === "float";
if (glow && needsGlow) {
  cssVars["--surface-glow"] = glow;
  cssVars["--deco-ring"]   = glow;
  cssVars["--orb-color"]   = glow;
}
// RESULT: three chips with different backgrounds but the same surfaceTint → identical glow.
// A chip with a tint + no background → glows off the tint. A chip with a background + no
// tint → 522 behavior (byte-identical). The tint reaches the ANIMATING surface node because
// 524-01 co-located surface + transform effect on ONE node.
```

- NOTE the `needsGlow` gate is UNCHANGED — a tint only takes effect when a
  surface/hover/glow-emitting decoration is present (a bare `surfaceTint` with no
  surface emits nothing → present-only-neutral for a plain block).
- Do NOT touch the SECTION resolver `resolveSectionCompositionAttrs` (`:186`) — sections
  already thread their real `accent`; `surfaceTint` is a BLOCK field only.

## Security note

`surfaceTint` is read from the already-sanitized stored value (524-02-L01 ran it
through `sanitizeAuthoringCssColor` at write); the resolver injects it ONLY as the
`--surface-glow`/`--deco-ring`/`--orb-color` CSS custom properties (consumed by the
glass/orb/grid/radiate/pulse CSS with reference literals as fallbacks), never a raw
declaration. Defence-in-depth: `isGradientOrUrl` guard excludes any gradient/url (a
sanitized color never is one; the guard is belt-and-suspenders). No interpolation, no
new attribute.

## Vitest test lane

- `tests/vitest/pages/page-composition-effects.test.ts` — resolver precedence
  (tint wins; background fallback; tint-with-no-background; no-tint byte-identical to
  522). Authored in 524-02-L04.

## Regression / breaking-test ownership

- No breaking change to 522's background-derived path when `surfaceTint` is absent —
  the `?? bgGlow` fallback preserves it exactly; existing background-glow tests pass
  unchanged. 524-02-L04 adds the precedence coverage.

## Hard Invariants

1. Precedence: `surfaceTint` seeds the glow when present; else the 522 plain-color
   background fallback (byte-identical to 522 when no `surfaceTint`).
2. `needsGlow` gate unchanged (a bare tint with no surface/hover/glow-deco emits
   nothing).
3. Section resolver untouched; only the block resolver's glow source changes.
4. Reads only the sanitized stored value; injects only CSS custom properties.
</content>
