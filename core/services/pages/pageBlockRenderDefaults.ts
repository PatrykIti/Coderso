import {
  pageHeadingLevels,
  type PageBlockType,
  type PageBlockV2,
  type PageBlockWidth,
  type PageTypographyFontFamily,
  type PageTypographyFontSize,
  type PageTypographyFontWeight,
} from "./pageDocumentV2";

/**
 * Effective render defaults for UNSET block fields (TASK-449 owner finding #9,
 * round 3). When a document stores no value for a field, the renderer
 * (`pageRendererV2.tsx`) still paints something — baked Tailwind utility
 * classes on the text nodes, the grid's own item placement for the frame.
 * Round 2 displayed "no active option" for those fields; the owner overrode
 * that: the floating-panel controls must DISPLAY the effective rendered
 * default as the active value. This module is the single owner of that table.
 *
 * Display-only contract: nothing here is written into documents. Writes stay
 * explicit — selecting the displayed default pins it as an explicit value
 * through the normal commit path. Because no schema field changes, there is
 * no `pageResponsiveCss` impact (decision: not applicable — no new stored
 * field; the table only mirrors what the renderer already paints).
 *
 * Derivation notes (each entry cites the renderer source it mirrors):
 *
 * FRAME (all block types, `toPageBlockRenderProps`):
 * - `width`: `pageBlockWidthClass(undefined)` emits NO class. The block frame
 *   is an item of the section content grid (`grid w-full`), and the CSS grid
 *   default `justify-self: stretch` spans the frame across the full column —
 *   the same painted box as the explicit "full" (`w-full`). Hand-verified:
 *   hero/cta section templates add `place-items-center`, which centers
 *   unset-width frames contextually; the table is per block type and
 *   context-free, so it records the renderer's intrinsic default ("full").
 * - `align`: `pageBlockAlignmentClass(undefined)` emits no `justify-self-*`
 *   class and `toPageBlockLayoutStyle` leaves `textAlign` undefined, so the
 *   frame stretches and its content text flows from the left edge. "left" is
 *   the rendered-equivalent token. Hand-verified nuance: an explicit "left"
 *   additionally writes `justify-self-start` (fit-content frame), which the
 *   unset state does not — the text reading ("left") is identical.
 *
 * TEXT NODES (typography-capable types, baked classes in `pageRendererV2`):
 * - `textAlign` (heading/text `props.align`):
 *   `pageTextAlignClass(undefined) === "text-left"`.
 * - `fontFamily`: no renderer text node carries a `font-sans`/`font-display`
 *   class; text inherits the page base font, which is the `sans` token stack
 *   (`--font-sans`, painted by the front token stylesheet and mirrored by the
 *   editor canvas frame). Hand-verified: inheritance, not a class.
 * - heading: `font-semibold leading-tight` + per-level size class
 *   (`text-5xl` h1, `text-4xl` h2, `text-2xl` h3-h6) =>
 *   weight "semibold", lineHeight 1.25 (leading-tight is the unitless 1.25),
 *   size per {@link pageHeadingLevelFontSizeRenderDefaults}.
 * - text: `text-base leading-7` => size "md" (1rem), weight "normal" (no
 *   weight class), lineHeight 1.75. Hand-verified: leading-7 is 1.75rem
 *   (28px), a 1.75 ratio at the baked 16px size.
 * - button: anchor `text-sm font-semibold` => size "sm", weight "semibold".
 *   lineHeight omitted: text-sm's own baked line-height (1.25rem / 0.875rem
 *   ~= 1.43) is not expressible by the 0.05-step unitless control.
 * - list: `ul`/`ol` carry no size/weight/leading classes => size "md" and
 *   weight "normal" by page-base inheritance (hand-verified); lineHeight
 *   omitted (inherited, no baked class).
 * - card: TWO text nodes with different baked scales (`text-lg
 *   font-semibold` title, `text-sm leading-6` body) => no single effective
 *   size/weight/lineHeight exists; those entries are deliberately omitted
 *   (the control honestly shows no active option).
 * - statistic: THREE divergent nodes (`text-3xl font-semibold`, `text-sm
 *   font-medium`, `text-sm`) => same multi-node omission.
 * - quote: blockquote `text-lg leading-8` => size "lg", weight "normal".
 *   lineHeight omitted: leading-8 (2rem) over 1.125rem ~= 1.78 is not
 *   expressible by the 0.05-step control (and the nested cite differs).
 * - `letterSpacing`: no renderer text node sets a `tracking-*` class => the
 *   CSS default `normal` = 0px (this matches the registry fallback 0).
 *
 * Fields whose unset state is already render-equivalent to a schema default
 * (opacity/radius/shadow/backgroundType/padding/margin/visibility) stay owned
 * by the registry `fallback` in `pageEditorControlRegistry.ts` — this table
 * deliberately does not duplicate them.
 */

export type PageHeadingLevel = (typeof pageHeadingLevels)[number];
export type PageBlockRenderTextAlign = NonNullable<NonNullable<PageBlockV2["style"]>["align"]>;

export type PageBlockTypographyRenderDefaults = {
  fontFamily?: PageTypographyFontFamily;
  /** Omitted for heading (per-level) and multi-node types (card, statistic). */
  fontSize?: PageTypographyFontSize;
  fontWeight?: PageTypographyFontWeight;
  /** Unitless ratio; omitted where the baked value is not control-expressible. */
  lineHeight?: number;
  /** Px; all baked text nodes set no tracking, so 0 everywhere. */
  letterSpacing?: number;
};

export type PageBlockRenderDefaults = {
  width: PageBlockWidth;
  align: PageBlockRenderTextAlign;
  /** heading/text `props.align` (`pageTextAlignClass(undefined)`). */
  textAlign?: PageBlockRenderTextAlign;
  typography?: PageBlockTypographyRenderDefaults;
};

/**
 * Per-heading-level effective font-size tokens, mirroring the renderHeading
 * class ternary in `pageRendererV2.tsx` exactly: h1 `text-5xl`, h2 `text-4xl`,
 * every other level `text-2xl`. The token CSS values
 * (`pageTypographyFontSizeCssValues`) match the Tailwind sizes 1:1
 * (5xl = 3rem, 4xl = 2.25rem, 2xl = 1.5rem).
 */
export const pageHeadingLevelFontSizeRenderDefaults = {
  h1: "5xl",
  h2: "4xl",
  h3: "2xl",
  h4: "2xl",
  h5: "2xl",
  h6: "2xl",
} as const satisfies Record<PageHeadingLevel, PageTypographyFontSize>;

/**
 * Effective font size of a heading whose `style.fontSize` is unset, resolved
 * from the (possibly unset) `props.level` with the renderer's own fallbacks:
 * `readText(props.level, "h2")`, unknown tokens take the `text-2xl` branch.
 */
export const getPageHeadingRenderFontSize = (level: unknown): PageTypographyFontSize => {
  const token = typeof level === "string" && level.trim().length > 0 ? level.trim() : "h2";
  return (
    (pageHeadingLevelFontSizeRenderDefaults as Record<string, PageTypographyFontSize>)[token] ??
    "2xl"
  );
};

/** Frame defaults shared by every block type (see derivation notes above). */
const frameRenderDefaults = {
  width: "full",
  align: "left",
} as const satisfies Pick<PageBlockRenderDefaults, "width" | "align">;

export const pageBlockRenderDefaults: Record<PageBlockType, PageBlockRenderDefaults> = {
  heading: {
    ...frameRenderDefaults,
    textAlign: "left",
    // fontSize is per heading level: pageHeadingLevelFontSizeRenderDefaults.
    typography: { fontFamily: "sans", fontWeight: "semibold", lineHeight: 1.25, letterSpacing: 0 },
  },
  text: {
    ...frameRenderDefaults,
    textAlign: "left",
    typography: {
      fontFamily: "sans",
      fontSize: "md",
      fontWeight: "normal",
      lineHeight: 1.75,
      letterSpacing: 0,
    },
  },
  badge: { ...frameRenderDefaults },
  button: {
    ...frameRenderDefaults,
    typography: { fontFamily: "sans", fontSize: "sm", fontWeight: "semibold", letterSpacing: 0 },
  },
  list: {
    ...frameRenderDefaults,
    typography: { fontFamily: "sans", fontSize: "md", fontWeight: "normal", letterSpacing: 0 },
  },
  card: {
    ...frameRenderDefaults,
    // Multi-node: title (lg/semibold) and body (sm/normal) diverge.
    typography: { fontFamily: "sans", letterSpacing: 0 },
  },
  statistic: {
    ...frameRenderDefaults,
    // Multi-node: value (3xl/semibold), label (sm/medium), caption (sm).
    typography: { fontFamily: "sans", letterSpacing: 0 },
  },
  quote: {
    ...frameRenderDefaults,
    typography: { fontFamily: "sans", fontSize: "lg", fontWeight: "normal", letterSpacing: 0 },
  },
  image: { ...frameRenderDefaults },
  video: { ...frameRenderDefaults },
  gallery: { ...frameRenderDefaults },
  form: { ...frameRenderDefaults },
  collection: { ...frameRenderDefaults },
  filters: { ...frameRenderDefaults },
  embed: { ...frameRenderDefaults },
  divider: { ...frameRenderDefaults },
  spacer: { ...frameRenderDefaults },
  icon: { ...frameRenderDefaults },
  container: { ...frameRenderDefaults },
  columns: { ...frameRenderDefaults },
  group: { ...frameRenderDefaults },
  // TASK-522-01-L01: the custom-SVG block is a neutral inline decorative node
  // with no baked typography — mirror the icon/divider frame defaults.
  customSvg: { ...frameRenderDefaults },
};

/**
 * Effective render default for one registry control path of a block, used by
 * the floating-panel display path when the stored value is unset (undefined
 * or the explicit typography `null`). Returns undefined when the renderer has
 * no single effective value for the field — the control then falls back to
 * the registry `fallback` or the honest empty state.
 */
export const getPageBlockRenderDefault = (
  block: Pick<PageBlockV2, "type"> & { props?: Record<string, unknown> },
  path: readonly string[]
): string | number | undefined => {
  if (path.length !== 2) return undefined;
  const defaults = pageBlockRenderDefaults[block.type];
  if (!defaults) return undefined;
  const [group, key] = path;
  if (group === "props") {
    return key === "align" ? defaults.textAlign : undefined;
  }
  if (group !== "style") return undefined;
  if (key === "width") return defaults.width;
  if (key === "align") return defaults.align;
  const typography = defaults.typography;
  if (!typography) return undefined;
  if (key === "fontFamily") return typography.fontFamily;
  if (key === "fontSize") {
    return block.type === "heading"
      ? getPageHeadingRenderFontSize(block.props?.level)
      : typography.fontSize;
  }
  if (key === "fontWeight") return typography.fontWeight;
  if (key === "lineHeight") return typography.lineHeight;
  if (key === "letterSpacing") return typography.letterSpacing;
  return undefined;
};
