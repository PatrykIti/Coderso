# TASK-532-01-L05: Render Emit — Fluid Size Precedence, Text-Transform, Eyebrow Divider

# FileName: TASK-532-01-L05-Typography-And-Divider-Render-Emit.md

**Parent Task:** TASK-532
**Parent Subtask:** TASK-532-01
**Priority:** High
**Category:** Site Render
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Emits the Bundle B typography fields in `pageRendererV2.tsx`, inside
labelled `TASK-532` fences: (1) `fontSizeCustom` wins over the discrete `fontSize`
token + (3) `textTransform` in `toPageBlockTypographyStyle`; (4) the eyebrow gradient
rule in `case "divider"`. (Item (5) text-block textColor is owned by L03; item (2)
weight css-map is owned by L02 and already flows through `pageTypographyFontWeightCssValues`.)

## Grounded anchors (SYMBOL names authoritative; RE-GREP at implement time)

- `toPageBlockTypographyStyle` (`:764`): `if (style.fontSize) result.fontSize =
  pageTypographyFontSizeCssValues[style.fontSize];` (`:769`), `result.fontWeight`
  (`:770`, already reads the extended `pageTypographyFontWeightCssValues`). Returns a
  `PageBlockStyleProperties`. It is the SOLE typography emitter, consumed by
  `renderHeading`/`renderTextBlock`/`renderBadgeBlock`/statistic/quote/card/button
  (`toPageBlockElementStyle` `:815` merges it for the button).
- `case "divider"` (`:2187`) renders `<hr style={{borderColor:
  pageDividerToneBorderColor(block.props.tone), borderWidth: ...px}} />`.
  `pageDividerToneBorderColor` (grep), `pageDividerTones` (`:166`), `readNumber`.
- Imports (append-only): `pageDividerAligns` (unused in render if align handled via
  style), `sanitizeAuthoringCssBackground` if wiring an author gradient color (see note).

## Implementation pseudocode

```tsx
// ── (1)+(3) toPageBlockTypographyStyle (:764) — TASK-532 fence, after the fontSize line ──
if (style.fontSizeCustom) {
  result.fontSize = style.fontSizeCustom;      // FLUID wins: overwrite the token value
} else if (style.fontSize) {
  result.fontSize = pageTypographyFontSizeCssValues[style.fontSize];   // existing token path
}
// (the existing `if (style.fontSize) result.fontSize = …token…` line is REPLACED by the
//  branch above so custom takes precedence; the token remains the fallback.)
if (style.textTransform) {
  result.textTransform = style.textTransform;   // enum keyword, safe (fail-closed at write)
}

// ── (4) case "divider" (:2187) — TASK-532 fence, present-only gradient variant ──
case "divider": {
  const tone = block.props.tone;
  const thickness = readNumber(block.props.thickness, 1);
  const gradient = block.props.gradient === true;
  const width = typeof block.props.width === "number" ? block.props.width : undefined;
  const align = block.props.align;               // "left"|"center"|"right"|undefined
  if (gradient) {
    // Slim gradient eyebrow rule (reference `.eyebrow span`:
    // width:34px; height:2px; background:linear-gradient(90deg, aqua, transparent)).
    // Use a <span> block element (a gradient <hr> is unreliable). Color = the tone's
    // border color as the gradient START, fading to transparent — a STATIC, validated
    // gradient string (no raw author input; the aqua fallback matches the reference).
    const startColor = pageDividerToneBorderColor(tone);   // whitelisted tone color
    return (
      <span
        aria-hidden="true"
        style={{
          display: "block",
          height: `${thickness}px`,
          width: width ? `${width}px` : "34px",
          background: `linear-gradient(90deg, ${startColor}, transparent)`,
          marginLeft: align === "center" ? "auto" : align === "right" ? "auto" : undefined,
          marginRight: align === "center" ? "auto" : undefined,
        }}
      />
    );
  }
  return (
    <hr style={{ borderColor: pageDividerToneBorderColor(tone), borderWidth: `${thickness}px` }} />
  );  // legacy path — byte-identical when gradient is unset
}
```

## Notes for the implementer

- **`fontSizeCustom` is already sanitized** at the write boundary (L01
  `sanitizeAuthoringCssFontSize`), so the emit assigns it inline VERBATIM — no
  re-validation needed here, but do NOT interpolate any OTHER stored string into the
  declaration. `result.fontSize = style.fontSizeCustom` is the whole change.
- **`textTransform`** is a fail-closed enum at write, so the emitted value is always one
  of `uppercase`/`lowercase`/`capitalize` (`"none"` is omitted by normalize) — a plain
  CSS keyword, safe to assign to `result.textTransform`.
- **Gradient rule color:** the eyebrow gradient uses the TONE's whitelisted border
  color as the start stop (a validated value from `pageDividerToneBorderColor`), fading
  to `transparent` — a STATIC gradient template with no raw author string. If a later
  leaf wants an AUTHOR-picked gradient color, thread the divider frame's
  `style.background` via `sanitizeAuthoringCssBackground` (whitelist) — out of this
  leaf's scope; the tone-driven gradient satisfies the reference.
- The `align` handling here is a block-level margin auto trick (the divider frame's own
  `style.align` may also apply — verify no double-application; prefer the prop `align`
  for the gradient rule only).

## Regression-test shape (delegated to 532-01-L06, asserted here)

- **Vitest (model-level emit, `page-document-v2` or a dedicated typography test):**
  `toPageBlockTypographyStyle` for a block with `fontSizeCustom:"clamp(2.6rem,5vw,4.4rem)"`
  AND `fontSize:"lg"` → `result.fontSize === "clamp(2.6rem,5vw,4.4rem)"` (custom wins);
  with ONLY `fontSize:"lg"` → the token css value (regression: token path intact); with
  `textTransform:"uppercase"` → `result.textTransform === "uppercase"`; unset → neither
  key present. `fontWeight:"black"` → `result.fontWeight === "900"`.
- **Behavioral render (Vitest `.tsx`):** a `divider` with `gradient:true`/`width:34`/
  `align:"left"` renders a `<span>` carrying a `linear-gradient(90deg, …, transparent)`
  background + `34px` width; a divider WITHOUT `gradient` renders the legacy `<hr>`
  byte-identical to post-530; a heading with `fontSizeCustom` renders inline
  `font-size:clamp(...)`.
- **Lane:** Vitest `tests/vitest/pages/page-document-v2.test.ts` (style-emit helper) +
  `tests/vitest/pages/page-renderer-v2.test.tsx` (behavioral divider/heading render).

## Security note

The emit assigns ONLY already-validated values: `fontSizeCustom` (grammar-sanitized at
L01 write), `textTransform`/`fontWeight` (fail-closed enums → fixed keywords / weight
map), and a STATIC gradient template whose only variable is the whitelisted tone color
(`pageDividerToneBorderColor`) — never a raw author string interpolated into a CSS
declaration. `readNumber` bounds `thickness`/`width`. No `dangerouslySetInnerHTML`,
no new sink. Defence in depth: even though L01 sanitized `fontSizeCustom`, the emit
does not concatenate it into a larger declaration where a smuggled value could break out.

## Hard Invariants

1. `fontSizeCustom` wins over `fontSize`; token remains fallback; unset → neither emitted
   (post-530 byte-identical).
2. `textTransform`/`fontWeight` emit fixed keywords/map values only; `divider` legacy
   `<hr>` unchanged when `gradient` unset.
3. No raw author string in any CSS declaration; gradient is a static tone-colored
   template.
4. All edits inside a labelled `TASK-532` region.
</content>
