# TASK-532-01-L03: TextColor On The `text` Block (Rich-Path Render Fix)

# FileName: TASK-532-01-L03-Text-Block-TextColor-Render-Fix.md

**Parent Task:** TASK-532
**Parent Subtask:** TASK-532-01
**Priority:** Medium
**Category:** Site Render / Admin UI
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Closes the report §5 gap — the `text` block's RICH body ignores an
authored `style.textColor`. This is a SURGICAL render fix in `pageRendererV2.tsx`
(`renderTextBlock`), NOT a model/control introduction: the model field
(`PageBlockStyleV2.textColor`, `:612`), the write-boundary sanitizer
(`sanitizeAuthoringCssColor`), and the universal `block.style.textColor` control
(`pageEditorControlRegistry.ts:471`, not type-gated so already shown on `text`) all
ALREADY exist. Only the rich-path emit is missing.

## Grounding correction (verified on disk — do NOT overclaim)

- `PageBlockStyleV2.textColor?: string | null` ALREADY exists (`:612`), is normalized
  via `readOptionalSafeColor` (`normalizeBlockStyle` `:2688`), and is in
  `pageBlockStyleKeys` (`:750`). **No model change.**
- `toPageBlockVisualStyle` (`pageRendererV2.tsx:714`) ALREADY emits
  `"--coderso-block-text": textColor` + `color: textColor` on the block FRAME (`:733`,
  `:743`), with `textColor = sanitizeAuthoringCssColor(style.textColor)` (`:722`).
- The PLAIN text path (`renderTextBlock`, `:1235-1239`) renders
  `<p className="… text-[var(--coderso-block-text,#334155)]" style={typography}>` — so
  the plain body ALREADY honors `textColor` via the inherited CSS var. **No change to
  the plain path.**
- **THE GAP:** the RICH path (`:1218-1233`) renders `<div className="prose … text-[var
  (--coderso-block-text,#334155)]">` wrapping `renderSanitizedRichTextHtml(sanitizedHtml,
  style)` where `style = toPageBlockTypographyStyle(block)` — and `.prose` descendant
  selectors (Tailwind typography) set an EXPLICIT `color` on child `<p>`/`<span>` that
  BEATS the inherited `--coderso-block-text` var on the wrapper. So an authored aqua
  textColor does not paint the rich body. (Re-verify the exact class string at implement
  time; the fix is robust to the class either way.)

## Implementation pseudocode

```tsx
// pageRendererV2.tsx renderTextBlock (:1210), rich branch (:1218), inside a
// // ===== TASK-532 text-block textColor ===== fence:
const richTextColor = sanitizeAuthoringCssColor(block.style?.textColor);  // reuse frame sanitizer
if (block.props.format === "rich") {
  const sanitizedHtml = sanitizeAuthoringRichTextHtml(block.props.text);
  const richChildren = renderSanitizedRichTextHtml(sanitizedHtml, style);
  // Present-only: only set an inline color when authored + safe. `.prose` sets color on
  // DESCENDANTS, so an inline `color` on the wrapper is not enough — pass the color into
  // the wrapper AND ensure the prose color is overridden. Simplest robust fix: set the
  // wrapper `style={{ color: richTextColor ?? undefined }}` AND scope it with the
  // `[color:...]` beating the prose default by using the SAME `text-[var(--coderso-block
  // -text,…)]` mechanism the plain path uses — i.e. keep the var on the wrapper AND add
  // a `prose-p:text-[color:inherit] prose-headings:text-[color:inherit]` scoping so prose
  // children inherit the wrapper color when textColor is set. Concretely:
  return (
    <div
      className={joinPageRenderClasses(
        className,                                   // existing (:1211-1216)
        richTextColor ? "[&_*]:text-[color:inherit]" : undefined  // present-only: force prose children to inherit
      )}
      style={richTextColor ? { color: richTextColor } : undefined}  // present-only wrapper color
      {...pageBlockTextDataAttributes}               // add the stable typography hook (plain path has it; rich lacked it)
    >
      {context.renderInlineText ? context.renderInlineText({ … }) : richChildren}
    </div>
  );
}
```

Notes for the implementer (verify live, adjust minimally):
- Prefer the smallest change that makes a computed `color` on the rich body match the
  authored `textColor` in BOTH front and canvas. If a Tailwind arbitrary variant
  (`[&_*]:text-[color:inherit]`) is unavailable/undesirable, an equivalent is a scoped
  inline style block or reusing the plain path's `text-[var(--coderso-block-text,…)]`
  utility on the wrapper WITH a `prose-*:text-inherit` modifier — the CONTRACT is the
  computed body color, not the exact class.
- Do NOT alter the sanitizer flow — `richTextColor` comes ONLY from
  `sanitizeAuthoringCssColor` (no raw string reaches the DOM). Keep
  `sanitizeAuthoringRichTextHtml` for the HTML body untouched (that is the XSS boundary
  for the markup; this leaf only sets a validated `color`).

## Control confirmation (no new control)

Assert (in L06) that `getPageEditorControlsForTarget({kind:"block", type:"text"})`
includes `block.style.textColor` (it does today via the universal array — this leaf
just LOCKS that in a test so a future universal-array refactor can't silently drop it
for `text`).

## Regression-test shape (delegated to 532-01-L06, asserted here)

- **Behavioral render (Vitest `.tsx` lane):** render a `text` block with
  `format:"rich"` + `style.textColor:"#22d3ee"` via the SSR renderer; assert the rich
  body carries the authored color (an inline `color:#22d3ee` on the wrapper AND that
  prose children do not override it — assert the emitted markup contains the color and
  the inherit-forcing class). A PLAIN `text` block with the same textColor keeps its
  `--coderso-block-text` var (regression: unchanged). `textColor` unset → the rich
  wrapper has NO inline `color` and NO inherit class (byte-identical to post-530).
  `textColor:"javascript:alert(1)"` → `sanitizeAuthoringCssColor` returns `null` → no
  color emitted (fail-soft).
- **Control presence (Vitest `page-editor-control-registry.test.ts`):**
  `getPageEditorControlsForTarget` for `text` includes id `block.style.textColor`.
- **Lane:** Vitest `tests/vitest/pages/page-renderer-v2.test.tsx` (behavioral render)
  + `page-editor-control-registry.test.ts` (control presence).

## Security note

No new attacker surface: `richTextColor` is produced ONLY by the existing
`sanitizeAuthoringCssColor` write/render whitelist (hex/hex8/`rgb[a]`/`hsl[a]`/named/
`var(--color-*)`), returning `null` on anything else — so an inline `color` is always
a validated value, never a raw author string, closing CSS-injection via the color
prop. The rich HTML body remains sanitized by `sanitizeAuthoringRichTextHtml`
(unchanged); this leaf touches only the wrapper `color`, not the markup.

## Hard Invariants

1. Present-only — no inline color / no extra class when `textColor` is unset (rich
   body byte-identical to post-530).
2. No model, allowlist, schema, or control change (all pre-exist); render-only fix.
3. Color exclusively via `sanitizeAuthoringCssColor` (fail-soft to omitted).
4. Plain-text path unchanged; rich-path fix inside a labelled `TASK-532` fence.
</content>
