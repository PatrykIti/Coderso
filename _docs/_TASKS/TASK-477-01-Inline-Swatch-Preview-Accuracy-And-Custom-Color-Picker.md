# TASK-477-01: Inline Swatch Preview Accuracy And Custom Color Picker
# FileName: TASK-477-01-Inline-Swatch-Preview-Accuracy-And-Custom-Color-Picker.md

**Parent Task:** TASK-477
**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-471-03 (color marks)
**Status:** ✅ Done
**Completed:** 2026-06-26

> **Completion note (2026-06-26):** Live verification surfaced one more defect
> beyond the spec: the native color dialog did not open on click. The OS color
> picker opens as the **default action of the `click` event**, but the canvas
> block-frame `<div data-page-editor-block>` `onClick` calls `preventDefault()`
> (block selection) and the picker's click bubbled into it, cancelling the dialog.
> Swatches were unaffected (their `onClick` stops propagation) and the link input
> was unaffected (text inputs focus on `mousedown`). Fixed by stopping the click on
> the picker label before it reaches the block frame (`onClick` →
> `stopPropagation`, **without** `preventDefault`). Verified live (`click`
> `defaultPrevented` flips `true`→`false`) + Vitest regression. Note: HMR/Fast
> Refresh does not apply this change live — a full reload is required.

---

## Overview

Two inline-toolbar fixes in `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx`:
(1) make the token swatch previews show the color they actually apply, and (2)
add a native color picker for arbitrary colors. No schema/route change.

## Root cause (verified live)

The inline palette is `inlineTextMarkPalette = getPageEditorColorPalette().slice(0,6)`
(`pageEditorControlUiModel.ts:225` defaults to `DEFAULT_TOKENS`). Each swatch is
drawn with `backgroundColor: swatch.previewValue ?? swatch.value` (a DEFAULT-token
hex) but applies `swatch.value` = `var(--color-X)`, which resolves against the
**live** site theme. Per-token probe inside a swatch on the Home hero:

| token | swatch shows | `var(--color-X)` applies |
|---|---|---|
| primary | rgb(29,78,216) | rgb(29,78,216) ✓ |
| secondary | rgb(15,118,110) | rgb(15,118,110) ✓ |
| accent | rgb(245,158,11) orange | rgb(241,245,249) near-white ✗ |
| bg | rgb(255,255,255) white | rgb(2,6,23) near-black ✗ |
| surface | rgb(248,250,252) | rgb(2,6,23) ✗ |
| border | rgb(226,232,240) | rgb(226,232,240) ✓ |

The probe also proved `var(--color-X)` **resolves in the swatch's own DOM context**
(the inline toolbar is inside the page-theme-scoped canvas), so previewing with the
var itself is exact.

## Implementation pseudocode

### 1. Preview the applied value (color + highlight swatches)
Change the swatch background from the DEFAULT-token preview to the applied var:
```tsx
// color swatch + highlight swatch
style={{ backgroundColor: swatch.value }}   // was: swatch.previewValue ?? swatch.value
```
Because the inline toolbar is page-theme-scoped, `var(--color-X)` resolves to the
live token — displayed === applied.

**Deeper finding + palette curation.** A live probe showed the admin canvas does
NOT define `--color-bg` / `--color-surface` / `--color-text` (it carries the
shadcn `--color-background` / `--color-foreground` / `--color-muted` instead),
while `tokenCss.ts:92-94` emits `--color-bg/-surface/-text` only on the front. So
those three palette tokens apply an **invalid** CSS variable in-editor (the text
falls back to inherited black — the owner's "white swatch → black text"); there is
no single `var()` that resolves in both the admin canvas and the front. The brand
tokens `primary/secondary/accent` and `border` resolve in both. Therefore the
inline palette is curated to those resolving tokens; neutral colors (white/black)
are reached via the custom picker (a hex, which works everywhere):
```tsx
const inlineTextMarkPalette = getPageEditorColorPalette().filter((s) =>
  ["primary", "secondary", "accent", "border"].includes(s.id)
);
```
(The full neutral-token var-name mismatch between admin canvas and front is a
broader theme-scoping concern, tracked in TASK-477-02.)

### 2. Native custom color picker (arbitrary color)
Add an `<input type="color">` to the mark toolbar (after the color swatches). It is
an `HTMLInputElement`, so the existing toolbar `onMouseDown` already (a) snapshots
the live selection before focus and (b) skips `preventDefault` so it can focus; the
`onBlur` toolbar-containment guard keeps inline edit alive (same path the link URL
input uses, TASK-475-01).
```tsx
<input
  type="color"
  aria-label="Custom text color"
  data-page-editor-text-color-picker="true"
  defaultValue="#000000"
  onChange={(event) => {
    const range = resolveActiveMarkRange();
    if (!range) return;
    applyMark({ blockId: block.id, propPath, type: "color",
                from: range.from, to: range.to, color: event.target.value });
    editableRef.current?.focus();
  }}
/>
```
The hex value flows through the existing fail-closed `sanitizeAuthoringCssColor`
(hex is allowed; `url()/expression()` rejected) on normalize/write, and through
`applyMark` (TASK-476-02) so the painted color is visible in place.

## Error handling / invariants preserved

- `if (!range) return` guards a missing selection. No throw.
- Color sanitization, mark replace/toggle (TASK-476-01), and live paint
  (TASK-476-02) are unchanged.
- Disabled state of the picker mirrors the swatches (`!selectionRange`).

## Regression-test shape

Lane: **Vitest** — `tests/vitest/ui/page-authoring-canvas.test.tsx`:
- The color swatch's inline `background-color` style equals its `value`
  (`var(--color-...)`), not the DEFAULT preview hex.
- The toolbar renders an `input[type="color"][data-page-editor-text-color-picker]`,
  and firing its `change` with a hex calls `onApplyTextMark` with
  `{type:"color", color:"#rrggbb", from, to}`.

## Validation

- `bun --cwd core lint`, `bun --cwd core lint:types`
- `bunx vitest run tests/vitest/ui/page-authoring-canvas.test.tsx` + page suites.
- Live smoke (real input): the accent swatch now shows ~white (its real applied
  color); the custom picker applies an arbitrary color (e.g. orange) to the
  selection and it is visible in place.

## Security note

No routes/auth/schema. Picked colors are sanitized by the existing authoring color
sink before persistence and render.
