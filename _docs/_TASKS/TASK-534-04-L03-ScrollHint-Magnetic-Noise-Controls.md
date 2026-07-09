# TASK-534-04-L03: ScrollHint Controls + Universal Magnetic Toggle + Section/Page Noise-Overlay Toggle

# FileName: TASK-534-04-L03-ScrollHint-Magnetic-Noise-Controls.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-04
**Priority:** Medium
**Category:** Admin UI / Content (Pages)
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds (all in labelled `// ── TASK-534 ──` regions): the
`pageBlockControlRegistry.scrollHint` per-type controls (`glyph`/`label`), a SINGLE
universal `block.style.magnetic` toggle appended to `pageUniversalBlockControls`
(`:449`), a section `style.noiseOverlay` toggle appended to
`pageUniversalSectionControls`, and the page-level `settings.effects.noiseOverlay`
toggle in the compact Effects panel (`PageEditor.tsx`, beside `cursorSpotlight`).
Disjoint from L01/L02. **NOTE:** the `blockOptionCopy.switcher`/`.scrollHint` palette copy
(`pageEditorOptions.ts:85`) is NO LONGER owned here — it MOVED to the 534-01-L01 atomic
model land, because `blockOptionCopy` is a NON-Partial exhaustive `Record<PageBlockType,…>`
that would break root `tsc` the moment 534-01 lands (534-04 is the LAST subtask). See
534-01-L01.

## Grounded anchors

- `pageBlockControlRegistry` `:947` (per-type add); `pageUniversalBlockControls`
  `:449` (universal block-style controls; `input:"switch"` precedent `:374`);
  `pageUniversalSectionControls` (grep it — the section universal controls array;
  `fullBleed` boolean is the precedent for `noiseOverlay`).
- Compact Effects panel: `PageEditor.tsx` `updateEffects` `:2283-2307` (the
  `cursorSpotlight`/`spotlightColor`/`spotlightSize` toggles; add `noiseOverlay`
  beside them, cleaned into the present-only `PageEffectsV2` via the same
  `cleaned` object `:2287-2292`). `PageEffectsV2` imported `:104`.
- `scrollHintGlyphs` from 534-01-L01 (import read-only).

## Implementation pseudocode

```ts
// ── TASK-534 ── scrollHint per-type controls (pageBlockControlRegistry.scrollHint)
scrollHint: [
  blockPropControl("scrollHint", "glyph", {
    label: "Indicator", input: "segmented", panel: "style", options: scrollHintGlyphs,
  }),
  blockPropControl("scrollHint", "label", {
    label: "Accessible label", input: "text", panel: "content",
  }),
],

// ── TASK-534 ── universal magnetic toggle (append to pageUniversalBlockControls:449)
control({
  id: "block.style.magnetic", panel: "style", target: "block",
  label: "Magnetic hover", path: ["style", "magnetic"], input: "switch",
}),

// ── TASK-534 ── section noise toggle (append to pageUniversalSectionControls)
control({
  id: "section.style.noiseOverlay", panel: "style", target: "section",
  label: "Grain overlay", path: ["style", "noiseOverlay"], input: "switch",
}),

// ── TASK-534 ── page Effects panel toggle (PageEditor.tsx, beside cursorSpotlight)
// in the Effects section:  <Switch checked={effects.noiseOverlay} onChange={v => updateEffects({ noiseOverlay: v })} />
// in updateEffects cleaned{}:  if (next.noiseOverlay) cleaned.noiseOverlay = true;

// NOTE: blockOptionCopy.switcher/.scrollHint palette copy is NOT here — it moved to
// 534-01-L01 (blockOptionCopy is a non-Partial exhaustive Record<PageBlockType,…>).
```

**Present-only:** `magnetic`/`noiseOverlay` toggles WRITE `true` only when on;
off ⇒ the key is omitted (534-01-L02 normalizer), preserving byte-identity. The
page Effects `updateEffects` `cleaned` object already drops falsey keys (`:2287`).

## Security note

Boolean/enum controls only; values re-normalized on save (`normalizeEnum`
fail-closed for `glyph`, `readBoolean` for `magnetic`/`noiseOverlay`). No color or
free-CSS input added here (the noise overlay is a static author-free literal;
`scrollHint.label` is escaped `sr-only` text at render). No normalization bypass.

## Test lane

**Vitest** (`page-editor-control-registry.test.ts` + any PageEditor effects test) —
534-04-L04: `scrollHint` resolves `glyph`/`label` controls; `pageUniversalBlockControls`
gains exactly ONE `block.style.magnetic` switch; `pageUniversalSectionControls`
gains the `noiseOverlay` switch; the Effects panel `updateEffects` cleans
`noiseOverlay` present-only.

## Regression / owned-breaking-test notes

- **Owned:** `pageUniversalBlockControls` / `pageUniversalSectionControls` count or
  snapshot assertions (`tests/vitest/pages/*`) OWN a `+1` update each — update in
  this commit. (The block-palette option-count test and the `blockOptionCopy` palette
  additions are OWNED by 534-01-L01, where the palette copy now lands — NOT here.)

## Hard Invariants

1. Present-only toggles (off ⇒ omitted; defaults not seeded).
2. Exactly ONE universal `magnetic` control + ONE section `noiseOverlay` control +
   ONE page Effects `noiseOverlay` toggle (no duplication across surfaces).
3. Values re-normalized on save; no color/free-CSS surface added.
