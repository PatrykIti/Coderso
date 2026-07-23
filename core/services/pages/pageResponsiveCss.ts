/**
 * Responsive CSS emission contract (TASK-423-01).
 *
 * Converts stored Page V2 responsive deltas (`section.responsive[bp]`,
 * `block.responsive[bp]`) into deterministic, selector-scoped `@media` rules
 * so the public runtime can serve desktop-resolved base markup plus media
 * queries instead of flattening the cascade server-side.
 *
 * Contract decisions frozen here:
 * - Desktop stays the base markup; only `tablet` and `mobile` deltas emit CSS.
 * - Tablet rules are range-bounded (`min-width` AND `max-width`) because the
 *   editor cascade model makes mobile inherit DESKTOP, not tablet. A plain
 *   `max-width` tablet query would leak tablet overrides into mobile widths.
 * - Every declaration carries `!important` because the desktop base values are
 *   emitted as inline `style` attributes by `pageRendererV2.tsx`; non-important
 *   stylesheet rules can never beat inline styles.
 * - Section rules target the section content element (the node that carries
 *   the inline section style), scoped through the stable per-id attributes the
 *   renderer already emits. Section/block visibility rules target the id node
 *   itself.
 * - Only schema-clamped numbers, enum-token lookups, validated color strings,
 *   and CSS-string-escaped ids/urls reach the output. Anything else fails
 *   closed into diagnostics — never guessed CSS.
 * - `responsive[bp].props` (content overrides) are unsupported and surface as
 *   diagnostics until a dedicated content-override contract exists — with ONE
 *   explicit exception: `props.align` on heading/text blocks (the
 *   schema-enumerated text-align prop, TASK-424) maps to a `text-align` rule
 *   on the block's painted text node, because the desktop base renders it as a
 *   baked alignment class on that same node.
 * - Nodes hidden at the desktop base (or living in inactive `columns` slots)
 *   have no public markup, so their overrides are unreachable: diagnostics,
 *   no CSS. Restoring visibility at a smaller breakpoint
 *   (`visible: true` over a hidden base) therefore cannot be expressed either.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

import {
  getPageBlockActiveSlotKeys,
  isPageTypographyCapableBlockType,
  pageBlockCapabilities,
  pageTypographyFontFamilyCssValues,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
  type PageBlockV2,
  type PageBoxSpacingV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "./pageDocumentV2";
import {
  resolvePageSectionTemplate,
  resolvePageSectionTemplateColumns,
} from "./pageSectionTemplates";
import {
  escapeAuthoringCssString,
  isSafeAuthoringCssBackgroundLayers,
  isSafeAuthoringCssColor,
  isSafeAuthoringCssGradient,
  sanitizeAuthoringMediaUrl,
} from "./pageAuthoringSanitizers";
// ── TASK-531: shared pure glow-compose (Bun-free home; NEVER import the render
// inline path — this module is Vitest-lane / import-side-effect-free).
import { composeGlowBoxShadow, mergeShadows } from "./pageGlow";

/**
 * Stable per-node attribute hooks. `pageRendererV2.tsx` already emits all
 * three on public markup (`toPageSectionRenderProps`, `toPageBlockRenderProps`,
 * `PageSectionContent`); TASK-423-02 wires the renderer to these constants.
 */
export const PAGE_SECTION_ID_ATTRIBUTE = "data-section-id" as const;
export const PAGE_BLOCK_ID_ATTRIBUTE = "data-block-id" as const;
export const PAGE_SECTION_CONTENT_ATTRIBUTE = "data-page-section-content" as const;
/** Stable hook on the inner visual element of re-routed block types. */
export const PAGE_BLOCK_ELEMENT_ATTRIBUTE = "data-page-block-element" as const;
/**
 * Stable hook on the text node(s) a typography-capable block paints (the
 * `<h1>`/`<p>`/`<blockquote>`/list/statistic/card text elements). Typography
 * style must land on the text node itself because baked utility classes on
 * those nodes (e.g. `text-5xl`, `font-semibold`) would beat values inherited
 * from the block frame. The renderer emits it; this builder scopes responsive
 * typography overrides to the same node(s).
 */
export const PAGE_BLOCK_TEXT_ATTRIBUTE = "data-page-block-text" as const;

/**
 * TASK-535 — stable hook on the `[data-tilt-parent]` perspective WRAPPER that a
 * tilt+layer block hoists its layer placement onto (see `splitBlockComposition` /
 * `renderPageBlockWithFrame` in pageRendererV2). The base `--layer-x/y/z` live on
 * the wrapper (the consumer of the layered-canvas CSS), NOT the `[data-block-id]`
 * frame, and CSS custom props inherit DOWNWARD only — so a per-device `--layer-*`
 * override MUST target the wrapper, not the frame. The renderer stamps the block
 * id here ONLY when the layer placement was hoisted to the wrapper (tilt+layer);
 * `collectBlockDeclarations` retargets the responsive layer override at it.
 */
export const PAGE_TILT_PARENT_LAYER_ATTRIBUTE = "data-tilt-parent-for" as const;

/**
 * Style-target contract shared with `pageRendererV2.tsx`: block types whose
 * visual identity is an inner element (the `<a>` of a button, the `<img>` of
 * an image) carry the visual style surface (background, text color, border,
 * radius, shadow, opacity) on that element, while the block frame keeps only
 * layout-affecting style (width/align/padding/margin). The renderer emits
 * `PAGE_BLOCK_ELEMENT_ATTRIBUTE="true"` on the inner element and this builder
 * scopes the matching responsive style keys to the same element.
 */
export const pageBlockVisualElementTypes = ["button", "image"] as const;
export type PageBlockVisualElementType = (typeof pageBlockVisualElementTypes)[number];

export const isPageBlockVisualElementType = (
  type: PageBlockV2["type"]
): type is PageBlockVisualElementType =>
  (pageBlockVisualElementTypes as readonly string[]).includes(type);

export const pageResponsiveCssBreakpoints = ["tablet", "mobile"] as const;
export type PageResponsiveCssBreakpoint = (typeof pageResponsiveCssBreakpoints)[number];

/**
 * Single owned source for public media-query bounds. The bounds bracket the
 * editor canvas device widths (desktop 1080 / tablet 744 / mobile 390 from
 * `PageEditor.tsx`): desktop >= 1024, tablet 640-1023, mobile <= 639.
 */
export const pageResponsiveMediaBounds = {
  tablet: { minWidth: 640, maxWidth: 1023 },
  mobile: { maxWidth: 639 },
} as const;

export const pageResponsiveMediaQueries: Record<PageResponsiveCssBreakpoint, string> = {
  tablet: `(min-width: ${pageResponsiveMediaBounds.tablet.minWidth}px) and (max-width: ${pageResponsiveMediaBounds.tablet.maxWidth}px)`,
  mobile: `(max-width: ${pageResponsiveMediaBounds.mobile.maxWidth}px)`,
};

export type PageResponsiveCssDiagnosticReason =
  | "props_override_unsupported"
  | "not_css_expressible"
  | "unsafe_color_value"
  | "unsafe_background_value"
  | "markup_absent_at_base"
  | "unsafe_scope_id";

export type PageResponsiveCssDiagnostic = {
  scope: "section" | "block";
  id: string;
  breakpoint: PageResponsiveCssBreakpoint;
  /** Override group or field that failed closed; `*` covers the whole node. */
  key: string;
  reason: PageResponsiveCssDiagnosticReason;
};

export type PageResponsiveCssPlan = {
  css: string;
  diagnostics: PageResponsiveCssDiagnostic[];
};

type CssDeclaration = { property: string; value: string };

/**
 * Escapes a value for use inside a double-quoted CSS string (attribute
 * selector value or `url("...")`). Per CSS string grammar only `"`, `\`, and
 * control characters can terminate or alter the string. `<` and `>` are also
 * hex-escaped so the emitted stylesheet can never contain a literal
 * `</style>` sequence when injected into an HTML style element.
 */
const escapeCssString = escapeAuthoringCssString;

const sectionRootSelector = (id: string) =>
  `[${PAGE_SECTION_ID_ATTRIBUTE}="${escapeCssString(id)}"]`;

const sectionContentSelector = (id: string) =>
  `${sectionRootSelector(id)} > [${PAGE_SECTION_CONTENT_ATTRIBUTE}="true"]`;

const blockSelector = (id: string) => `[${PAGE_BLOCK_ID_ATTRIBUTE}="${escapeCssString(id)}"]`;

/**
 * TASK-535 — the `[data-tilt-parent]` wrapper carrying a tilt+layer block's
 * hoisted layer placement (base `--layer-*`). Per-device layer overrides target
 * this wrapper (custom props inherit downward, so a frame-scoped override cannot
 * reach the ancestor wrapper that consumes `var(--layer-*)`).
 */
const blockTiltLayerWrapperSelector = (id: string) =>
  `[${PAGE_TILT_PARENT_LAYER_ATTRIBUTE}="${escapeCssString(id)}"]`;

const blockElementSelector = (id: string) =>
  `${blockSelector(id)} [${PAGE_BLOCK_ELEMENT_ATTRIBUTE}="true"]`;

/**
 * Typography-capable blocks never own nested block slots, so the descendant
 * selector can only match the block's own painted text nodes.
 */
const blockTextSelector = (id: string) =>
  `${blockSelector(id)} [${PAGE_BLOCK_TEXT_ATTRIBUTE}="true"]`;

/**
 * Stored color strings are NOT format-clamped by `pageDocumentV2` (`readText`
 * accepts any non-empty string), so the builder validates them against a
 * strict grammar before they may reach the stylesheet. Unknown shapes fail
 * closed into diagnostics.
 */
const isSafeCssColor = isSafeAuthoringCssColor;

/**
 * Mirrors `pageCompositionEffects.isGradientOrUrl`: a gradient/url() tint is
 * invalid inside `radial-gradient()`'s color slot, so it must not seed the
 * `--surface-glow`/`--deco-ring`/`--orb-color` custom props (base resolver
 * leaves it out → CSS falls back to the reference literal). Kept local to avoid
 * widening the effects module's export surface.
 */
const isGradientOrUrlColor = (value: string): boolean => /gradient|url\(/i.test(value);

/**
 * Stricter than the renderer's gradient sniff (`toGradientBackground`): the
 * stylesheet context additionally requires a safe charset and balanced parens.
 *
 * SECURITY (TASK-531): this is the SINGLE-LAYER alias. Do NOT re-bind it to the
 * multi-layer validator. The multi-layer accept lives in
 * `isSafeCssBackgroundValue` below, which runs the whole-value tripwire pre-pass
 * (inside `isSafeAuthoringCssBackgroundLayers`) BEFORE allowlisting each layer —
 * that tripwire is load-bearing because this module emits values RAW (un-escaped)
 * into a `<style>` string via `dangerouslySetInnerHTML`.
 */
const isSafeCssGradient = isSafeAuthoringCssGradient;

/**
 * TASK-531 — the RAW `<style>` per-device gradient allowlist. A background value
 * is accepted only if it is a safe SINGLE-layer gradient OR passes the
 * tripwire-bearing multi-layer allowlist (`isSafeAuthoringCssBackgroundLayers`:
 * whole-value tripwire pre-pass → depth-0 comma split → per-layer safe-color /
 * safe-gradient check → `PAGE_BG_MAX_LAYERS` cap; fail-closed on anything else).
 *
 * FORBIDDEN: do NOT widen `isSafeCssGradient` directly to accept multi-layer, and
 * do NOT re-implement/bypass the whole-value tripwire here — this value is emitted
 * un-escaped into the injected `<style>`, so a `url()`/`@import`/`expression(`/
 * `</style>`-charset value MUST be rejected exactly as the write boundary rejects
 * it. Keep the multi-layer accept routed through this tripwire-bearing validator.
 */
const isSafeCssBackgroundValue = (value: string): boolean =>
  isSafeCssGradient(value) || isSafeAuthoringCssBackgroundLayers(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const pxValue = (value: unknown): string | null => (isFiniteNumber(value) ? `${value}px` : null);

/** Must stay in sync with the shadow token mapping in `pageRendererV2.tsx`. */
const shadowCssValues: Record<string, string> = {
  none: "none",
  sm: "0 6px 20px rgba(15, 23, 42, 0.08)",
  md: "0 14px 40px rgba(15, 23, 42, 0.12)",
  lg: "0 22px 60px rgba(15, 23, 42, 0.16)",
};

/**
 * TASK-535 — full-bleed predicate + content-cap width formula, mirrored from
 * `pageRendererV2.tsx` (`isPageSectionFullBleed` / `toPageSectionStyle`). The
 * renderer owns them but `pageRendererV2.tsx` imports FROM this module, so a
 * back-import would cycle; per this file's convention (see `shadowCssValues` /
 * `toBoxSpacingValue`) they are re-declared here with a MUST-stay-in-sync note.
 *
 * The 525 model DECOUPLED the bleed box from the content cap: full-bleed content
 * is ALWAYS capped/centered at `layout.maxWidth` (the pre-525 `max-width:none`
 * pin is GONE). So a full-bleed content div carries BOTH
 * `width: min(<max>, calc(100% - 2 * 20px))` AND `max-width: <max>` — which makes
 * a responsive `layout.maxWidth` override CSS-EXPRESSIBLE (it was falsely marked
 * `not_css_expressible` while the pin still existed).
 */
const isSectionFullBleed = (
  section: PageSectionV2,
  template: ReturnType<typeof resolvePageSectionTemplate>
): boolean => template.variant === "full-width" || section.style.fullBleed === true;
/** Mirrors `PAGE_SECTION_FULL_BLEED_GUTTER` (the reference `.container` side gutter). */
const SECTION_FULL_BLEED_GUTTER = "20px";
/** Mirrors the full-bleed content `width` in `toPageSectionStyle`. */
const fullBleedContentWidth = (maxWidthPx: string): string =>
  `min(${maxWidthPx}, calc(100% - 2 * ${SECTION_FULL_BLEED_GUTTER}))`;

/** Mirrors `pageSectionAlignmentClass` (Tailwind `items-*`). */
const sectionAlignItemsValues: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

/** Mirrors `pageSectionJustifyClass` (Tailwind `justify-*`). */
const sectionJustifyContentValues: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};

/** Mirrors `pageTextAlignClass`. */
const blockTextAlignValues: Record<string, string> = {
  left: "left",
  center: "center",
  right: "right",
};

/** Mirrors `pageBlockAlignmentClass` (Tailwind `justify-self-*`). */
const blockJustifySelfValues: Record<string, string> = {
  left: "start",
  center: "center",
  right: "end",
};

const isBlockSelfAligned = (align: unknown) => align === "center" || align === "right";

const blockSelfAlignmentDeclarations = (align: unknown): CssDeclaration[] => {
  if (align === "center") {
    return [
      { property: "margin-left", value: "auto" },
      { property: "margin-right", value: "auto" },
    ];
  }
  if (align === "right") {
    return [{ property: "margin-left", value: "auto" }];
  }
  return [];
};

/** Mirrors `pageBlockWidthClass` / `pageBlockEffectiveWidthClass`. */
const blockWidthValues: Record<string, string> = {
  full: "100%",
  auto: "fit-content",
};

const blockEffectiveWidthValue = (style: NonNullable<PageBlockV2["style"]>): string => {
  if (isBlockSelfAligned(style.align)) return "fit-content";
  return blockWidthValues[style.width ?? ""] ?? "auto";
};

/** Mirrors `toBoxSpacingValue` in `pageRendererV2.tsx`. */
const boxSpacingShorthand = (spacing: PageBoxSpacingV2): string | null => {
  const sides = [spacing.top ?? 0, spacing.right ?? 0, spacing.bottom ?? 0, spacing.left ?? 0];
  if (!sides.every(isFiniteNumber)) return null;
  return sides.map((side) => `${side}px`).join(" ");
};

const renderRule = (selector: string, declarations: CssDeclaration[]): string | null => {
  if (declarations.length === 0) return null;
  const body = [...declarations]
    .sort((left, right) =>
      left.property < right.property ? -1 : left.property > right.property ? 1 : 0
    )
    .map((declaration) => `${declaration.property}:${declaration.value} !important`)
    .join(";");
  return `${selector}{${body}}`;
};

type CollectorContext = {
  breakpoint: PageResponsiveCssBreakpoint;
  rules: string[];
  diagnostics: PageResponsiveCssDiagnostic[];
  /** Optional trusted ancestor selector prepended to every emitted rule. */
  selectorPrefix: string;
};

const pushRule = (
  context: CollectorContext,
  selector: string,
  declarations: CssDeclaration[]
): void => {
  const scoped = context.selectorPrefix ? `${context.selectorPrefix} ${selector}` : selector;
  const rule = renderRule(scoped, declarations);
  if (rule) context.rules.push(rule);
};

const pushDiagnostic = (
  context: CollectorContext,
  scope: "section" | "block",
  id: string,
  key: string,
  reason: PageResponsiveCssDiagnosticReason
) => {
  context.diagnostics.push({ scope, id, breakpoint: context.breakpoint, key, reason });
};

const collectSectionDeclarations = (
  section: PageSectionV2,
  override: NonNullable<PageSectionV2["responsive"]["tablet"]>,
  context: CollectorContext
): { content: CssDeclaration[]; root: CssDeclaration[] } => {
  const content: CssDeclaration[] = [];
  const root: CssDeclaration[] = [];
  const diag = (key: string, reason: PageResponsiveCssDiagnosticReason) =>
    pushDiagnostic(context, "section", section.id, key, reason);

  const layoutOverride = override.layout ?? {};
  const mergedLayout = { ...section.layout, ...layoutOverride };
  const template = resolvePageSectionTemplate(section);

  if (layoutOverride.maxWidth !== undefined) {
    const value = pxValue(mergedLayout.maxWidth);
    if (value) {
      // TASK-535 — the 525 model DECOUPLED bleed from the content cap: full-bleed
      // content is ALWAYS capped/centered at `layout.maxWidth` (the pre-525
      // `max-width:none` pin is GONE — see `toPageSectionStyle`). So a `maxWidth`
      // override IS CSS-expressible on a full-bleed section: mirror the base
      // content div, which carries BOTH `width: min(<max>, calc(100% - 40px))`
      // AND `max-width: <max>`. (The stale branch here reported
      // `not_css_expressible` under the removed pin.) Non-full-bleed keeps the
      // plain `max-width` declaration byte-identical.
      if (isSectionFullBleed(section, template)) {
        content.push({ property: "width", value: fullBleedContentWidth(value) });
      }
      content.push({ property: "max-width", value });
    }
  }
  if (layoutOverride.align !== undefined) {
    const value = sectionAlignItemsValues[mergedLayout.align];
    if (value) content.push({ property: "align-items", value });
  }
  if (layoutOverride.justify !== undefined) {
    const value = sectionJustifyContentValues[mergedLayout.justify];
    if (value) content.push({ property: "justify-content", value });
  }
  if (layoutOverride.columns !== undefined || layoutOverride.stackVertical !== undefined) {
    // Mirror the flattened editor preview: an explicit columns override forces
    // that template-floored count across the breakpoint range, replacing the
    // base `grid-cols-1 md:grid-cols-N` class pair. A merged-effective
    // `stackVertical: true` (TASK-425) wins over any column count and forces a
    // single column, exactly like `toPageSectionRenderProps`; an explicit
    // `stackVertical: false` override over a stacked base restores the
    // template-floored count. Both paths emit one deterministic
    // `grid-template-columns` declaration.
    const mergedTemplate = resolvePageSectionTemplate({ ...section, layout: mergedLayout });
    const columns =
      mergedLayout.stackVertical === true ? 1 : resolvePageSectionTemplateColumns(mergedTemplate);
    if (isFiniteNumber(columns) && columns >= 1) {
      content.push({
        property: "grid-template-columns",
        value: `repeat(${Math.trunc(columns)}, minmax(0, 1fr))`,
      });
    }
  }

  const styleOverride = override.style ?? {};
  const mergedStyle = { ...section.style, ...styleOverride };

  if (styleOverride.accent !== undefined) {
    if (typeof mergedStyle.accent === "string" && isSafeCssColor(mergedStyle.accent)) {
      content.push({ property: "--coderso-section-accent", value: mergedStyle.accent });
    } else {
      diag("style.accent", "unsafe_color_value");
    }
  }
  if (
    styleOverride.background !== undefined ||
    styleOverride.backgroundType !== undefined ||
    styleOverride.backgroundImage !== undefined
  ) {
    // Mirror `toPageSectionStyle`: `color` and `image` background types produce
    // paint, TASK-531 adds the `gradient` branch (RAW <style> boundary — gated by
    // the tripwire-bearing multi-layer allowlist), everything else clears.
    if (mergedStyle.backgroundType === "color") {
      if (typeof mergedStyle.background === "string" && isSafeCssColor(mergedStyle.background)) {
        content.push({ property: "background-color", value: mergedStyle.background });
        content.push({ property: "background-image", value: "none" });
      } else {
        diag("style.background", "unsafe_color_value");
      }
    } else if (mergedStyle.backgroundType === "gradient" && mergedStyle.background) {
      // ── TASK-531 REGION: NEW section gradient override (the section had no
      // gradient branch here — the SSR section branch is added in G-2). CSS
      // gradients paint via `background-image`; the value is emitted RAW, so it
      // MUST pass the tripwire-bearing allowlist (see `isSafeCssBackgroundValue`).
      if (
        typeof mergedStyle.background === "string" &&
        isSafeCssBackgroundValue(mergedStyle.background)
      ) {
        content.push({ property: "background-image", value: mergedStyle.background });
        content.push({ property: "background-color", value: "transparent" });
      } else {
        diag("style.background", "unsafe_background_value");
      }
      // ── END TASK-531 REGION ────────────────────────────────────────────────
    } else if (mergedStyle.backgroundType === "image" && mergedStyle.backgroundImage) {
      const safeBackgroundImage = sanitizeAuthoringMediaUrl(mergedStyle.backgroundImage);
      if (!safeBackgroundImage) {
        diag("style.backgroundImage", "unsafe_background_value");
      } else {
        content.push({ property: "background-color", value: "transparent" });
        content.push({
          property: "background-image",
          value: `url("${escapeCssString(safeBackgroundImage)}")`,
        });
      }
    } else {
      content.push({ property: "background-color", value: "transparent" });
      content.push({ property: "background-image", value: "none" });
    }
  }
  if (styleOverride.radius !== undefined) {
    const value = pxValue(mergedStyle.radius);
    if (value) content.push({ property: "border-radius", value });
  }
  // ── TASK-531 REGION: compose a per-device glow (G-3b). Fire when the device
  // overrides shadow OR glow; a device-only glow (no enum shadow) still emits.
  // `composeGlowBoxShadow` re-sanitizes the color + clamps the numbers into a
  // fixed template, so the RAW <style> glow emit is as safe as the SSR one.
  // `"none"` is treated as absent for the glow merge (parity with the SSR
  // `toPageSectionBoxShadow`); an EXPLICIT `shadow` override still resets to
  // `box-shadow: none` when no glow is present (byte-identical to pre-531).
  if (styleOverride.shadow !== undefined || styleOverride.glow !== undefined) {
    const enumShadow =
      mergedStyle.shadow && mergedStyle.shadow !== "none"
        ? shadowCssValues[mergedStyle.shadow]
        : undefined;
    const glow = composeGlowBoxShadow(mergedStyle.glow);
    const value =
      mergeShadows(enumShadow, glow) ??
      (styleOverride.shadow !== undefined ? shadowCssValues[mergedStyle.shadow] : undefined);
    if (value) content.push({ property: "box-shadow", value });
  }

  const spacingOverride = override.spacing ?? {};
  const spacingProperties = [
    ["paddingTop", "padding-top"],
    ["paddingRight", "padding-right"],
    ["paddingBottom", "padding-bottom"],
    ["paddingLeft", "padding-left"],
    ["gap", "gap"],
  ] as const;
  for (const [key, property] of spacingProperties) {
    if (spacingOverride[key] === undefined) continue;
    const value = pxValue(spacingOverride[key]);
    if (value) content.push({ property, value });
  }

  const visibilityOverride = override.visibility ?? {};
  if (visibilityOverride.visible === false) {
    root.push({ property: "display", value: "none" });
  }
  // `visible: true` over a visible base is a no-op; over a hidden base it is
  // handled by the markup-absent walk before this collector runs.
  for (const key of ["authOnly", "anchor", "startsAt", "endsAt"] as const) {
    if (visibilityOverride[key] !== undefined) {
      diag(`visibility.${key}`, "not_css_expressible");
    }
  }

  return { content, root };
};

const collectBlockDeclarations = (
  block: PageBlockV2,
  override: NonNullable<NonNullable<PageBlockV2["responsive"]>["tablet"]>,
  context: CollectorContext
): {
  frame: CssDeclaration[];
  element: CssDeclaration[];
  text: CssDeclaration[];
  wrapper: CssDeclaration[];
} => {
  const frame: CssDeclaration[] = [];
  // TASK-535 — declarations that must ride the `[data-tilt-parent]` WRAPPER rather
  // than the `[data-block-id]` frame (currently only the per-device layer offsets of
  // a tilt+layer block, whose base `--layer-*` were hoisted onto the wrapper).
  const wrapper: CssDeclaration[] = [];
  // Visual style keys follow the renderer's style-target contract: for
  // re-routed types they land on the inner visual element, otherwise on the
  // frame. Layout keys (align/width/padding/margin/display) always stay on
  // the frame.
  const visual = isPageBlockVisualElementType(block.type) ? ([] as CssDeclaration[]) : frame;
  // Typography keys follow the renderer's text-target contract: re-routed
  // types paint them on the inner visual element (the button anchor),
  // everything else on the dedicated text node(s).
  const text: CssDeclaration[] = [];
  const typography = isPageBlockVisualElementType(block.type) ? visual : text;
  const diag = (key: string, reason: PageResponsiveCssDiagnosticReason) =>
    pushDiagnostic(context, "block", block.id, key, reason);

  const propsOverride = override.props ?? {};
  const propsOverrideKeys = Object.keys(propsOverride);
  if (propsOverrideKeys.length > 0) {
    // `props.align` on heading/text is the single content key with a safe CSS
    // projection: the desktop base paints it as a baked text-align class on
    // the block's text node, so the override re-targets that node with the
    // enum-mapped value (left|center|right only — anything else fails closed).
    const alignExpressible = block.type === "heading" || block.type === "text";
    if (alignExpressible && propsOverride.align !== undefined) {
      const merged = propsOverride.align ?? block.props.align;
      const value = blockTextAlignValues[typeof merged === "string" ? merged : ""];
      if (value) {
        text.push({ property: "text-align", value });
      } else {
        diag("props.align", "not_css_expressible");
      }
    }
    // Every other content key stays diagnostics-only until a dedicated
    // content-override contract exists.
    if (propsOverrideKeys.some((key) => !(alignExpressible && key === "align"))) {
      diag("props", "props_override_unsupported");
    }
  }

  const styleOverride = override.style ?? {};
  const mergedStyle = { ...(block.style ?? {}), ...styleOverride };

  // Section-column placement (owner finding #5, round 3): `style.column`
  // re-parents the block into a different column wrapper in the BASE markup,
  // which is structural and cannot be expressed as a @media rule over the
  // desktop DOM. Per-breakpoint column overrides therefore resolve in the
  // editor/preview cascade only and fail closed into a diagnostic here;
  // `layout.stackVertical` is the supported mobile collapse.
  if (styleOverride.column !== undefined) {
    diag("style.column", "not_css_expressible");
  }

  if (styleOverride.align !== undefined) {
    const textAlign = blockTextAlignValues[mergedStyle.align ?? ""];
    const justifySelf = blockJustifySelfValues[mergedStyle.align ?? ""];
    if (textAlign) frame.push({ property: "text-align", value: textAlign });
    if (justifySelf) frame.push({ property: "justify-self", value: justifySelf });
    frame.push(...blockSelfAlignmentDeclarations(mergedStyle.align));
  }
  if (styleOverride.width !== undefined || styleOverride.align !== undefined) {
    frame.push({ property: "width", value: blockEffectiveWidthValue(mergedStyle) });
  }
  if (styleOverride.textColor !== undefined) {
    if (mergedStyle.textColor === null) {
      visual.push({ property: "color", value: "inherit" });
      visual.push({ property: "--coderso-block-text", value: "initial" });
    } else if (typeof mergedStyle.textColor === "string" && isSafeCssColor(mergedStyle.textColor)) {
      visual.push({ property: "color", value: mergedStyle.textColor });
      visual.push({ property: "--coderso-block-text", value: mergedStyle.textColor });
    } else {
      diag("style.textColor", "unsafe_color_value");
    }
  }
  if (
    styleOverride.background !== undefined ||
    styleOverride.backgroundType !== undefined ||
    styleOverride.backgroundImage !== undefined
  ) {
    // Mirror `toPageBlockStyle`: `color` paints background-color (+ surface
    // variable), `gradient` paints background-image, `image` paints a safe
    // media URL, everything else clears.
    if (mergedStyle.backgroundType === "color" && mergedStyle.background) {
      if (isSafeCssColor(mergedStyle.background)) {
        visual.push({ property: "background-color", value: mergedStyle.background });
        visual.push({ property: "--coderso-block-surface", value: mergedStyle.background });
        visual.push({ property: "background-image", value: "none" });
      } else {
        diag("style.background", "unsafe_color_value");
      }
    } else if (mergedStyle.backgroundType === "gradient" && mergedStyle.background) {
      // ── TASK-531: relax the single-layer re-gate to the tripwire-bearing
      // multi-layer allowlist (the only change to this branch) so a per-device
      // multi-layer gradient override paints. RAW <style> emit — see the FORBIDDEN
      // note on `isSafeCssBackgroundValue`; never widen `isSafeCssGradient` here.
      if (isSafeCssBackgroundValue(mergedStyle.background)) {
        visual.push({ property: "background-image", value: mergedStyle.background });
        visual.push({ property: "background-color", value: "transparent" });
        visual.push({ property: "--coderso-block-surface", value: "initial" });
      } else {
        diag("style.background", "unsafe_background_value");
      }
    } else if (mergedStyle.backgroundType === "image" && mergedStyle.backgroundImage) {
      const safeBackgroundImage = sanitizeAuthoringMediaUrl(mergedStyle.backgroundImage);
      if (safeBackgroundImage) {
        visual.push({
          property: "background-image",
          value: `url("${escapeCssString(safeBackgroundImage)}")`,
        });
        visual.push({ property: "background-size", value: "cover" });
        visual.push({ property: "background-position", value: "center" });
        visual.push({ property: "background-color", value: "transparent" });
        visual.push({ property: "--coderso-block-surface", value: "initial" });
      } else {
        diag("style.backgroundImage", "unsafe_background_value");
      }
    } else {
      visual.push({ property: "background-color", value: "transparent" });
      visual.push({ property: "background-image", value: "none" });
      visual.push({ property: "--coderso-block-surface", value: "initial" });
    }
  }
  if (styleOverride.opacity !== undefined && isFiniteNumber(mergedStyle.opacity)) {
    visual.push({ property: "opacity", value: `${mergedStyle.opacity}` });
  }
  if (styleOverride.radius !== undefined) {
    const value = pxValue(mergedStyle.radius);
    if (value) visual.push({ property: "border-radius", value });
  }
  // ── TASK-531 REGION: compose a per-device glow (G-3b), same shape as the
  // section branch — fire on shadow OR glow; a device-only glow still emits.
  // `"none"` treated as absent for the glow merge; an EXPLICIT shadow override
  // still resets to `box-shadow: none` when no glow is present (pre-531 parity).
  if (styleOverride.shadow !== undefined || styleOverride.glow !== undefined) {
    const enumShadow =
      mergedStyle.shadow && mergedStyle.shadow !== "none"
        ? shadowCssValues[mergedStyle.shadow]
        : undefined;
    const glow = composeGlowBoxShadow(mergedStyle.glow);
    const value =
      mergeShadows(enumShadow, glow) ??
      (styleOverride.shadow !== undefined ? shadowCssValues[mergedStyle.shadow ?? ""] : undefined);
    if (value) visual.push({ property: "box-shadow", value });
  }
  if (
    styleOverride.borderColor !== undefined ||
    styleOverride.borderWidth !== undefined ||
    styleOverride.borderStyle !== undefined
  ) {
    const borderWidth = isFiniteNumber(mergedStyle.borderWidth)
      ? Math.max(0, mergedStyle.borderWidth)
      : mergedStyle.borderColor
        ? 1
        : 0;
    const borderStyle =
      mergedStyle.borderStyle ?? (mergedStyle.borderColor || borderWidth > 0 ? "solid" : "none");
    if (borderStyle === "none" || borderWidth <= 0) {
      visual.push({ property: "border-style", value: "none" });
      visual.push({ property: "border-width", value: "0" });
    } else if (
      typeof mergedStyle.borderColor === "string" &&
      isSafeCssColor(mergedStyle.borderColor)
    ) {
      visual.push({ property: "border-color", value: mergedStyle.borderColor });
      visual.push({ property: "border-style", value: borderStyle });
      visual.push({ property: "border-width", value: `${borderWidth}px` });
    } else if (mergedStyle.borderColor === null || mergedStyle.borderColor === undefined) {
      visual.push({ property: "border-style", value: borderStyle });
      visual.push({ property: "border-width", value: `${borderWidth}px` });
    } else {
      diag("style.borderColor", "unsafe_color_value");
    }
  }
  // Breakpoint resolution replaces the whole padding/margin object (shallow
  // style spread), so the override box is the complete effective box.
  if (styleOverride.padding !== undefined) {
    const value = boxSpacingShorthand(styleOverride.padding ?? {});
    if (value) frame.push({ property: "padding", value });
  }
  if (styleOverride.margin !== undefined) {
    const value = boxSpacingShorthand(styleOverride.margin ?? {});
    if (value) frame.push({ property: "margin", value });
  }

  // TASK-522-05-L02 — per-device layered-canvas offsets. The 522-01-L04 frame
  // resolver emits the BASE position as inline --layer-x/y/z custom props; here we
  // retarget those props per breakpoint. They ride the SAME element that carries
  // data-layer + the base var + the media query, and every declaration is serialized
  // with !important, so the delta beats the inline base custom prop (finding-4). Only
  // x/y/z (the numeric offsets) vary per device; anchor stays base-only.
  //
  // TASK-535 — TARGET follows where the renderer put the BASE layer placement:
  //   - layer-only (no tilt): base `--layer-*` live on the `[data-block-id]` FRAME,
  //     so the override rides the FRAME (`frame`) — byte-identical to pre-535.
  //   - tilt + layer: `splitBlockComposition` HOISTED the base `--layer-*` onto the
  //     `[data-tilt-parent]` WRAPPER (a per-device value on the child frame can NEVER
  //     inherit UP to the wrapper that consumes `var(--layer-*)`), so the override
  //     must ride the WRAPPER (`wrapper`, `[data-tilt-parent-for="<id>"]`). The hoist
  //     is decided from the BASE style (tilt non-none AND base layer present) — the
  //     wrapper's `data-tilt-parent-for` exists exactly then.
  if (styleOverride.layer !== undefined) {
    const baseStyle = block.style ?? {};
    const baseTiltAndLayer =
      baseStyle.tilt != null && baseStyle.tilt !== "none" && baseStyle.layer != null;
    const layerTarget = baseTiltAndLayer ? wrapper : frame;
    if (isFiniteNumber(mergedStyle.layer?.x)) {
      layerTarget.push({ property: "--layer-x", value: `${mergedStyle.layer.x}%` });
    }
    if (isFiniteNumber(mergedStyle.layer?.y)) {
      layerTarget.push({ property: "--layer-y", value: `${mergedStyle.layer.y}%` });
    }
    if (isFiniteNumber(mergedStyle.layer?.z)) {
      layerTarget.push({ property: "--layer-z", value: String(mergedStyle.layer.z) });
    }
  }

  // TASK-524-02-L03 — per-device glass/glow TINT. The base resolver
  // (`resolveBlockCompositionAttrs`) seeds `--surface-glow`/`--deco-ring`/
  // `--orb-color` as inline custom props on the block FRAME (frameVars in
  // splitBlockComposition), gated on a plain (non-gradient/url) tint and on the
  // surface/effect actually being active (surfacePreset|hoverEffect|
  // decoration.motion in {radiate,pulse,drift,float}). We retarget those same
  // three frame custom props per breakpoint so the control's advertised
  // per-device tinting is honored: the props ride the SAME block-frame selector
  // that carries the base var + the media query, and every frame declaration is
  // serialized with !important, so the delta beats the inline base custom prop
  // (mirrors the --layer-x/y/z retarget above). Fails closed to a diagnostic on
  // an unsafe or gradient/url tint (invalid inside radial-gradient()); an
  // effect-inactive breakpoint emits nothing, matching the base gate.
  if (styleOverride.surfaceTint !== undefined) {
    const tint = mergedStyle.surfaceTint;
    const motion = mergedStyle.decoration?.motion;
    const glowActive =
      !!mergedStyle.surfacePreset ||
      !!mergedStyle.hoverEffect ||
      motion === "radiate" ||
      motion === "pulse" ||
      motion === "drift" ||
      motion === "float";
    if (typeof tint === "string" && isSafeCssColor(tint) && !isGradientOrUrlColor(tint)) {
      if (glowActive) {
        frame.push({ property: "--surface-glow", value: tint });
        frame.push({ property: "--deco-ring", value: tint });
        frame.push({ property: "--orb-color", value: tint });
      }
    } else if (tint !== null && tint !== undefined) {
      diag("style.surfaceTint", "unsafe_color_value");
    }
  }

  // Typography overrides (TASK-424). Only typography-capable blocks have a
  // painted text target; explicit `null` overrides (clear back to the baked
  // classes at one breakpoint) are not expressible against the inline base
  // values, so both cases fail closed into diagnostics.
  const typographyEnumOverrides = [
    ["fontFamily", pageTypographyFontFamilyCssValues, "font-family"],
    ["fontSize", pageTypographyFontSizeCssValues, "font-size"],
    ["fontWeight", pageTypographyFontWeightCssValues, "font-weight"],
  ] as const;
  for (const [key, cssValues, property] of typographyEnumOverrides) {
    if (styleOverride[key] === undefined) continue;
    const merged = mergedStyle[key];
    if (!isPageTypographyCapableBlockType(block.type) || merged === null || merged === undefined) {
      diag(`style.${key}`, "not_css_expressible");
      continue;
    }
    const value = (cssValues as Record<string, string>)[merged];
    if (value) typography.push({ property, value });
  }
  const typographyNumberOverrides = [
    ["lineHeight", "line-height", ""],
    ["letterSpacing", "letter-spacing", "px"],
  ] as const;
  for (const [key, property, unit] of typographyNumberOverrides) {
    if (styleOverride[key] === undefined) continue;
    const merged = mergedStyle[key];
    if (!isPageTypographyCapableBlockType(block.type) || !isFiniteNumber(merged)) {
      diag(`style.${key}`, "not_css_expressible");
      continue;
    }
    typography.push({ property, value: `${merged}${unit}` });
  }

  if (override.visibility?.visible === false) {
    frame.push({ property: "display", value: "none" });
  }

  return { frame, element: visual === frame ? [] : visual, text, wrapper };
};

const hasBlockOverride = (
  override: NonNullable<NonNullable<PageBlockV2["responsive"]>["tablet"]>
): boolean =>
  Boolean(
    (override.props && Object.keys(override.props).length > 0) ||
    (override.style && Object.keys(override.style).length > 0) ||
    (override.visibility && Object.keys(override.visibility).length > 0)
  );

const walkBlock = (block: PageBlockV2, context: CollectorContext, markupAbsent: boolean) => {
  const id = typeof block.id === "string" ? block.id.trim() : "";
  const baseVisible = block.visibility?.visible !== false;
  const absent = markupAbsent || !baseVisible;
  const override = block.responsive?.[context.breakpoint];

  if (override && hasBlockOverride(override)) {
    if (absent) {
      pushDiagnostic(context, "block", id, "*", "markup_absent_at_base");
    } else if (!id) {
      pushDiagnostic(context, "block", id, "*", "unsafe_scope_id");
    } else {
      const { frame, element, text, wrapper } = collectBlockDeclarations(block, override, context);
      pushRule(context, blockSelector(id), frame);
      pushRule(context, blockElementSelector(id), element);
      pushRule(context, blockTextSelector(id), text);
      // TASK-535 — tilt+layer per-device layer offsets ride the hoisted wrapper.
      pushRule(context, blockTiltLayerWrapperSelector(id), wrapper);
    }
  }

  const activeSlotKeys = new Set(getPageBlockActiveSlotKeys(block));
  for (const slotKey of pageBlockCapabilities[block.type].slots) {
    const children = block.slots?.[slotKey];
    if (!children || children.length === 0) continue;
    // Children in inactive slots (e.g. `column:3` when a columns block renders
    // two columns at the desktop base) have no public markup.
    const childAbsent = absent || !activeSlotKeys.has(slotKey);
    for (const child of children) walkBlock(child, context, childAbsent);
  }
};

const walkSection = (section: PageSectionV2, context: CollectorContext) => {
  const id = typeof section.id === "string" ? section.id.trim() : "";
  const baseVisible = section.visibility?.visible !== false;
  const override = section.responsive?.[context.breakpoint];
  const hasOverride = Boolean(
    override &&
    ((override.layout && Object.keys(override.layout).length > 0) ||
      (override.style && Object.keys(override.style).length > 0) ||
      (override.spacing && Object.keys(override.spacing).length > 0) ||
      (override.visibility && Object.keys(override.visibility).length > 0))
  );

  if (hasOverride && override) {
    if (!baseVisible) {
      pushDiagnostic(context, "section", id, "*", "markup_absent_at_base");
    } else if (!id) {
      pushDiagnostic(context, "section", id, "*", "unsafe_scope_id");
    } else {
      const { content, root } = collectSectionDeclarations(section, override, context);
      pushRule(context, sectionRootSelector(id), root);
      pushRule(context, sectionContentSelector(id), content);
    }
  }

  for (const block of section.blocks) {
    walkBlock(block, context, !baseVisible);
  }
};

export type PageResponsiveCssOptions = {
  /**
   * Trusted ancestor selector prepended (descendant combinator) to every
   * emitted rule so a secondary document — e.g. the site-shell footer
   * template (TASK-455) — can ride the same builder without its section/block
   * ids colliding with the page document's rules. Callers must pass an owned
   * literal; the value is validated against a conservative charset and the
   * builder throws `page_responsive_css_scope_invalid` otherwise (callers
   * already fail closed on builder errors).
   */
  scopeSelector?: string;
};

const SAFE_SCOPE_SELECTOR_PATTERN = /^[A-Za-z0-9 "'=\-_.#:[\]]+$/;

const resolveSelectorPrefix = (options?: PageResponsiveCssOptions): string => {
  const scope = options?.scopeSelector?.trim();
  if (!scope) return "";
  if (!SAFE_SCOPE_SELECTOR_PATTERN.test(scope)) {
    throw new Error("page_responsive_css_scope_invalid");
  }
  return scope;
};

export const buildPageResponsiveCssPlan = (
  document: PageDocumentV2,
  options?: PageResponsiveCssOptions
): PageResponsiveCssPlan => {
  const diagnostics: PageResponsiveCssDiagnostic[] = [];
  const mediaBlocks: string[] = [];
  const selectorPrefix = resolveSelectorPrefix(options);

  for (const breakpoint of pageResponsiveCssBreakpoints) {
    const context: CollectorContext = { breakpoint, rules: [], diagnostics, selectorPrefix };
    for (const section of document.sections) {
      walkSection(section, context);
    }
    if (context.rules.length === 0) continue;
    mediaBlocks.push(
      `@media ${pageResponsiveMediaQueries[breakpoint]}{\n${context.rules.join("\n")}\n}`
    );
  }

  return { css: mediaBlocks.join("\n"), diagnostics };
};

export const buildPageResponsiveCss = (
  document: PageDocumentV2,
  options?: PageResponsiveCssOptions
): string => buildPageResponsiveCssPlan(document, options).css;
