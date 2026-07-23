# TASK-533-01-L02: Render Emit — Block Span on Frame + Section `columnTemplate` Inline Grid

# FileName: TASK-533-01-L02-Grid-Span-Ratio-Render-Emit.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-01
**Priority:** High
**Category:** Site Render / Security
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Emit the 533-01-L01 model fields at render, present-only, in labelled `TASK-533`
regions of `core/services/pages/pageRendererV2.tsx`:
- `block.style.colSpan`/`rowSpan` → `gridColumn:"span N"` / `gridRow:"span N"` on the
  block frame `style` (`toPageBlockRenderProps`).
- `section.style.columnTemplate` → inline `gridTemplateColumns` on the content grid
  (`toPageSectionRenderProps`), OVERRIDING the symmetric grid class when set.

Unset ⇒ zero bytes (byte-identical to post-530).

## Grounded anchors (RE-GREP at implement time)

- **`toPageBlockRenderProps`** — `pageRendererV2.tsx:933-961`. The frame `style` is
  built at `:951-955` (`...toPageBlockStyle(block)`, `...s.frameVars`,
  `...revealVar`). Append a present-only `spanStyle` to this merge (same pattern as
  `revealVar` at `:939-941,954`).
- **`toPageSectionRenderProps`** — `pageRendererV2.tsx` (returns `contentClassName`
  `:641-648` from `pageSectionGridClass(columns)`, and `style: toPageSectionStyle(section)`
  `:650`). The `columns` value comes from `getPageSectionEffectiveColumns(section)`
  `:625`. Merge a present-only `gridTemplateColumns` INTO the returned `style` (which
  is the content-grid `<div>` inline style, applied in `PageSectionContent`) so it
  beats the class's `grid-cols-N`.
- `pageSectionGridClass` — `pageRendererV2.tsx:492-498` (the symmetric class being
  overridden). Do NOT change it; the inline `gridTemplateColumns` wins by
  specificity (inline style beats the utility class).

## Implementation pseudocode

```tsx
// ── toPageBlockRenderProps (frame style merge, TASK-533 region) ──
const colSpan = block.style?.colSpan;
const rowSpan = block.style?.rowSpan;
const spanStyle: CSSProperties = {
  ...(typeof colSpan === "number" ? { gridColumn: `span ${colSpan}` } : {}),
  ...(typeof rowSpan === "number" ? { gridRow: `span ${rowSpan}` } : {}),
};
return {
  className: /* …unchanged… */,
  style: {
    ...toPageBlockStyle(block),
    ...(s.frameVars as CSSProperties),
    ...(revealVar as CSSProperties),
    ...spanStyle,                      // present-only; empty object when unset
  },
  dataAttributes: { /* …unchanged… */ },
};

// ── toPageSectionRenderProps (content-grid style, TASK-533 region) ──
const columnTemplate = section.style.columnTemplate;   // already sanitized at write
const sectionStyle = toPageSectionStyle(section);
return {
  sectionClassName: /* …unchanged… */,
  contentClassName: joinPageRenderClasses(
    "grid w-full",
    /* pageSectionGridClass(columns) stays as the fallback tracks */ ...,
  ),
  // inline gridTemplateColumns OVERRIDES the symmetric class when present-only set
  style: columnTemplate
    ? { ...sectionStyle, gridTemplateColumns: columnTemplate }
    : sectionStyle,
  dataAttributes: { /* …unchanged… */ },
};
```

- **Present-only:** `spanStyle` is `{}` when neither span is set; `columnTemplate`
  branch is skipped when unset ⇒ the returned `style` object is byte-identical to
  post-530 (no `gridColumn`/`gridRow`/`gridTemplateColumns` keys).
- `colSpan`/`rowSpan` are already bounded ints from L01 (`Math.trunc` + clamp), so
  `span ${n}` is a fixed literal. `columnTemplate` is already the sanitizer's
  restricted string.
- Keep `getPageSectionEffectiveColumns` / `pageSectionGridClass` as the fallback so a
  section WITHOUT `columnTemplate` renders exactly as before (the symmetric class).

## Security note

`colSpan`/`rowSpan` reach CSS only as `span ${n}` where `n` is a bounded integer from
L01 — no raw author value. `columnTemplate` reaches CSS as a single inline-style
`gridTemplateColumns` VALUE (not a rule), and it is ALREADY the output of
`sanitizeAuthoringGridTemplate` (strict allowlist, L01) — a rejected value never
reaches here (it was omitted at normalize). No new attacker surface in the renderer;
React inline-style values are not a rule-injection vector.

## Vitest test lane (authored in 533-01-L04)

`tests/vitest/pages/page-renderer-v2.test.tsx` — assert
`toPageBlockRenderProps(block).style.gridRow === "span 2"` for `rowSpan:2` and
`gridColumn === "span 2"` for `colSpan:2`; unset ⇒ neither key present.
`toPageSectionRenderProps(section).style.gridTemplateColumns === "1.15fr .85fr"` for
a `columnTemplate` section; unset ⇒ no `gridTemplateColumns` key (byte-identical).

## Regression / breaking-test ownership

Purely additive; existing renderer tests (no span, no `columnTemplate`) pass
unchanged. No rebaseline.

## Hard Invariants

1. Present-only: no `gridColumn`/`gridRow`/`gridTemplateColumns` emitted when unset →
   byte-identical to post-530.
2. Inline `gridTemplateColumns` OVERRIDES the symmetric grid class (inline beats
   utility class); the symmetric class stays as the unset fallback.
3. Only bounded-int `span N` literals + the pre-sanitized `columnTemplate` string
   reach CSS — no raw author value.
4. Additions in labelled `TASK-533` regions (additive merge with 533-02/03 +
   sibling bundles).
