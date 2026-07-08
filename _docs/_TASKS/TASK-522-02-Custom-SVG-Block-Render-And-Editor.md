# TASK-522-02: Custom-SVG Block — Sanitized Render + Draw-In + Editor

# FileName: TASK-522-02-Custom-SVG-Block-Render-And-Editor.md

**Parent Task:** TASK-522
**Priority:** High
**Category:** Site Render / Admin UI / Security / Accessibility
**Estimated Effort:** Medium
**Status:** ✅ Done
**Depends on:** TASK-522-01 (block type + sanitizer + CSS resolvers landed).

---

## Scope

Renders + authors the new `customSvg` block. Owns DISJOINT seam regions only:
`pageRendererV2.tsx` block-content `case "customSvg"` (a NEW switch case, disjoint
from 521-04's `case "icon"` `:1959`); `pageEditorControlRegistry.ts`
`pageBlockControlRegistry.customSvg` (enriching the 522-01-L01 `customSvg:[]` stub);
`pageEditorOptions.ts` `blockOptionCopy.customSvg` (enriching the 522-01-L01 stub).
Renders the SANITIZED SVG (defence-in-depth re-sanitize before
`dangerouslySetInnerHTML`) + the optional draw-in class from
`pageCompositionEffects` (522-01-L04).

## Leaves

- **522-02-L01** — renderer `case "customSvg"` (re-sanitize + draw-in class + a11y).
- **522-02-L02** — editor controls (SVG paste textarea + sanitized preview + drawIn
  toggle + drawSpeed) + palette copy.
- **522-02-L03** — render + editor tests, incl. XSS sanitization vectors at the
  render boundary.

## Hard Invariants (subtask)

1. Render re-sanitizes (never trust stored value blindly) before injecting.
2. A tripwire-failing SVG renders the neutral fallback (no partial markup).
3. Draw-in gated by `prefers-reduced-motion: no-preference` (static SVG for reduce).
4. Insertable + rendered on front AND canvas; present-only.

## Definition of done

`customSvg` block insertable, renders sanitized SVG with optional draw-in, XSS
vectors neutralized at render; palette + controls present; tests green.
</content>
