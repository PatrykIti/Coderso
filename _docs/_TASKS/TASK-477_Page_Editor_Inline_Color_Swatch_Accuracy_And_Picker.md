# TASK-477: Page Editor Inline Color Swatch Accuracy And Picker
# FileName: TASK-477_Page_Editor_Inline_Color_Swatch_Accuracy_And_Picker.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-471-03 (color marks), TASK-475/476 (inline mark toolbar)
**Status:** ✅ Done
**Started:** 2026-06-26
**Completed:** 2026-06-27

---

## Business Goal (umbrella)

Two owner-reported issues with the canvas color swatches:

1. **Swatch preview ≠ applied color.** The inline toolbar token swatches display
   `DEFAULT_TOKENS` colors but apply `var(--color-*)` resolved against the live
   site theme, so they lie when the theme differs. Live-confirmed on the Home
   page: accent shows orange but applies near-white, bg shows white but applies
   near-black; only primary/secondary/border happen to match the default. → fixed
   in `TASK-477-01` for the inline toolbar.
2. **No way to pick an arbitrary color** on the inline bar — only the 6 token
   swatches. The block-level panel control (`ColorSwatchControl`) already has a
   native `<input type="color">`; the inline toolbar lacks it. → added in
   `TASK-477-01`.

The same preview mismatch exists on the block-level panel swatches (background,
border, text color) which use the DEFAULT-token palette through deeply-nested
registry rendering; fixing that needs live-token threading and is tracked
separately in `TASK-477-02`.

## Children

| Child | Title | Status |
|-------|-------|--------|
| TASK-477-01 | Inline Swatch Preview Accuracy And Custom Color Picker | ✅ Done |
| TASK-477-02 | Block-Level Panel Swatch Preview Accuracy | ✅ Done |

## Success criteria

- Inline color/highlight swatches display the exact color they apply (live theme).
- The inline toolbar offers a native color picker that applies any sanitized hex.
- (477-02) Block-level panel swatches also preview the live token colors.

## References

- Live evidence: per-token probe on the Home hero
  (`var(--color-accent)` → `rgb(241,245,249)` while the swatch showed
  `rgb(245,158,11)`).
