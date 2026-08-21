import type { CSSProperties } from "react";

import {
  isPageTypographyCapableBlockType,
  pageTypographyFontFamilyCssValues,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
  type PageBlockV2,
} from "./pageDocumentV2Types";
import { composeGlowBoxShadow, mergeShadows } from "./pageGlow";
import {
  escapeAuthoringCssString,
  isSafeAuthoringCssBackgroundLayers,
  isSafeAuthoringCssGradient,
  parseAuthoringCssBackgroundPaint,
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringMediaUrl,
} from "./pageAuthoringSanitizers";
import {
  PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE,
  type PageReplicaIdentityContext,
} from "./pageRendererReplicaIdentity";
import {
  PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE,
  resolveBlockCompositionAttrs,
} from "./pageCompositionEffects";
import {
  isPageBlockVisualElementType,
  PAGE_BLOCK_ELEMENT_ATTRIBUTE,
  PAGE_BLOCK_ID_ATTRIBUTE,
  PAGE_BLOCK_TEXT_ATTRIBUTE,
} from "./pageResponsiveCss";
import type { PageBlockGridPlacementTarget } from "./pageBlockGridPlacement";
import { PAGE_BLOCK_GRID_ITEM_ATTRIBUTE } from "./pageBlockGridPlacement";
import {
  joinPageRenderClasses,
  type PageBlockRenderProps,
  type PageBlockStyle,
  type PageBlockStyleProperties,
} from "./pageRendererV2Contract";

export const pageTextAlignClass = (value: unknown) => {
  if (value === "center") return "text-center";
  if (value === "right") return "text-right";
  return "text-left";
};

export const pageBlockWidthClass = (width: PageBlockStyle["width"] | undefined) => {
  if (width === "full") return "w-full";
  if (width === "auto") return "w-fit";
  return undefined;
};

export const isPageBlockSelfAligned = (align: PageBlockStyle["align"] | undefined) =>
  align === "center" || align === "right";

export const pageBlockEffectiveWidthClass = (style: PageBlockStyle | undefined) =>
  isPageBlockSelfAligned(style?.align) ? "w-fit" : pageBlockWidthClass(style?.width);

export const pageBlockAlignmentClass = (align: PageBlockStyle["align"] | undefined) => {
  if (align === "center") return "justify-self-center mx-auto";
  if (align === "right") return "justify-self-end ml-auto";
  if (align === "left") return "justify-self-start";
  return undefined;
};

const toPageBlockSelfAlignmentStyle = (
  align: PageBlockStyle["align"] | undefined
): PageBlockStyleProperties => {
  if (align === "center") return { marginLeft: "auto", marginRight: "auto" };
  if (align === "right") return { marginLeft: "auto" };
  return {};
};

const toPageBlockMarginStyle = (style: PageBlockStyle): PageBlockStyleProperties => {
  const selfAlignment = toPageBlockSelfAlignmentStyle(style.align);
  if (!style.margin) return selfAlignment;
  if (Object.keys(selfAlignment).length === 0) {
    return { margin: toBoxSpacingValue(style.margin) };
  }
  return {
    marginTop: `${style.margin.top ?? 0}px`,
    marginRight: `${style.margin.right ?? 0}px`,
    marginBottom: `${style.margin.bottom ?? 0}px`,
    marginLeft: `${style.margin.left ?? 0}px`,
    ...selfAlignment,
  };
};

const toPageShadowValue = (shadow: PageBlockStyle["shadow"]) => {
  if (shadow === "sm") return "0 6px 20px rgba(15, 23, 42, 0.08)";
  if (shadow === "md") return "0 14px 40px rgba(15, 23, 42, 0.12)";
  if (shadow === "lg") return "0 22px 60px rgba(15, 23, 42, 0.16)";
  return undefined;
};

export const toBoxSpacingValue = (spacing: PageBlockStyle["padding"] | PageBlockStyle["margin"]) =>
  spacing
    ? `${spacing.top ?? 0}px ${spacing.right ?? 0}px ${spacing.bottom ?? 0}px ${
        spacing.left ?? 0
      }px`
    : undefined;

export const toGradientBackground = (value: string | null | undefined) => {
  if (!value) return undefined;
  const safe = sanitizeAuthoringCssBackground(value);
  // ── TASK-531: relax the render-side re-gate. The write sanitizer (531-01-L01)
  // now ACCEPTS a safe multi-layer background (glow-over-gradient), but the old
  // `isSafeAuthoringCssGradient` re-check requires a SINGLE layer, so without this
  // the relaxed sanitizer never PAINTS multi-layer on block OR section. Trust the
  // already-allowlisted sanitizer return: accept single OR safe multi-layer.
  // `isSafeAuthoringCssBackgroundLayers` carries the whole-value tripwire + cap.
  return safe && (isSafeAuthoringCssGradient(safe) || isSafeAuthoringCssBackgroundLayers(safe))
    ? safe
    : undefined;
};

const toPageBlockVisualStyle = (block: PageBlockV2): PageBlockStyleProperties => {
  const style = block.style ?? {};
  // ── TASK-539-05-L01 — ONE canonical paint parse. After the write-time model
  // sanitization, `parseAuthoringCssBackgroundPaint` splits the authored
  // `background` value into its gradient image-layer stack and optional final
  // canonical color; the renderer emits ONLY `paint.image` to
  // `background-image` and ONLY `paint.color` to `background-color`. A
  // combined representation is never re-rebuilt from an unparsed whole author
  // string. The explicit `backgroundType:"none"` clear/reset and the separate
  // `backgroundType:"image"` URL field keep their existing semantics.
  const backgroundPaint =
    style.backgroundType === "color" || style.backgroundType === "gradient"
      ? parseAuthoringCssBackgroundPaint(style.background)
      : null;
  const backgroundColor = backgroundPaint?.color ?? undefined;
  const backgroundImageUrl =
    style.backgroundType === "image" ? sanitizeAuthoringMediaUrl(style.backgroundImage) : null;
  const textColor = sanitizeAuthoringCssColor(style.textColor);
  const borderColor = sanitizeAuthoringCssColor(style.borderColor);
  const borderStyle = style.borderStyle ?? (borderColor ? "solid" : undefined);
  const borderWidth =
    typeof style.borderWidth === "number" && Number.isFinite(style.borderWidth)
      ? style.borderWidth
      : borderColor
        ? 1
        : 0;
  const hasBorder = borderStyle !== "none" && (Boolean(borderColor) || borderWidth > 0);
  return {
    "--coderso-block-text": textColor ?? undefined,
    "--coderso-block-surface": backgroundColor ?? undefined,
    backgroundColor: backgroundColor ?? undefined,
    backgroundImage: backgroundImageUrl
      ? `url("${escapeAuthoringCssString(backgroundImageUrl)}")`
      : (backgroundPaint?.image ?? undefined),
    backgroundSize: backgroundImageUrl ? "cover" : undefined,
    backgroundPosition: backgroundImageUrl ? "center" : undefined,
    color: textColor ?? undefined,
    opacity: style.opacity,
    borderRadius: style.radius !== undefined ? `${style.radius}px` : undefined,
    // ── TASK-531: append the glow after the enum shadow (comma list = two stacked).
    boxShadow: mergeShadows(toPageShadowValue(style.shadow), composeGlowBoxShadow(style.glow)),
    borderColor: borderColor ?? undefined,
    borderStyle: hasBorder ? borderStyle : undefined,
    borderWidth: hasBorder ? `${borderWidth}px` : undefined,
  };
};

/**
 * Typography style surface of `PageBlockStyleV2` (TASK-424). It paints on the
 * exact text node(s) a block renders (the `<h1>`/`<p>`/`<blockquote>`/list/
 * statistic/card text elements) — NOT on the block frame — because the baked
 * utility classes on those nodes (`text-5xl`, `font-semibold`, `leading-7`)
 * would beat any value that only arrives via inheritance. Inline values on
 * the node itself always beat its classes, so an explicit token visually
 * wins. Unset/null fields emit nothing, keeping pre-TASK-424 documents
 * pixel-identical. For {@link isPageBlockVisualElementType} text blocks (the
 * button) the same surface merges into the inner visual element style.
 */
export const toPageBlockTypographyStyle = (block: PageBlockV2): PageBlockStyleProperties => {
  if (!isPageTypographyCapableBlockType(block.type)) return {};
  const style = block.style ?? {};
  const result: PageBlockStyleProperties = {};
  if (style.fontFamily) result.fontFamily = pageTypographyFontFamilyCssValues[style.fontFamily];
  // ── TASK-532 fluid font-size (Bundle B): custom WINS over the discrete token ──
  // `fontSizeCustom` is already grammar-sanitized at the write boundary (L01
  // `sanitizeAuthoringCssFontSize`), so it is assigned inline verbatim; the
  // discrete token remains the fallback/unset path.
  if (style.fontSizeCustom) {
    result.fontSize = style.fontSizeCustom;
  } else if (style.fontSize) {
    result.fontSize = pageTypographyFontSizeCssValues[style.fontSize];
  }
  if (style.fontWeight) result.fontWeight = pageTypographyFontWeightCssValues[style.fontWeight];
  // ── TASK-532 text-transform (Bundle B): fail-closed enum keyword ──
  if (style.textTransform) result.textTransform = style.textTransform;
  if (typeof style.lineHeight === "number" && Number.isFinite(style.lineHeight)) {
    result.lineHeight = style.lineHeight;
  }
  if (typeof style.letterSpacing === "number" && Number.isFinite(style.letterSpacing)) {
    result.letterSpacing = `${style.letterSpacing}px`;
  }
  return result;
};

/**
 * Stable hook for the responsive CSS contract: every typography-painted text
 * node carries it so tablet/mobile typography overrides can target the same
 * node the desktop base paints inline.
 */
export const pageBlockTextDataAttributes = {
  [PAGE_BLOCK_TEXT_ATTRIBUTE]: "true",
} as const;

/** Layout-affecting style surface that always stays on the block frame. */
const toPageBlockLayoutStyle = (block: PageBlockV2): PageBlockStyleProperties => {
  const style: PageBlockStyle = block.style ?? {};
  return {
    padding: toBoxSpacingValue(style.padding),
    ...toPageBlockMarginStyle(style),
    textAlign: style.align,
  };
};

/**
 * Inline style for the inner visual element of re-routed block types, carrying
 * the stable {@link PAGE_BLOCK_ELEMENT_ATTRIBUTE} hook. Inline values beat the
 * element's variant utility classes (e.g. the button accent background), so
 * explicit block style always visually wins. A valid gradient additionally
 * clears `background-color` (mirroring the responsive CSS builder) so variant
 * background classes cannot bleed through translucent gradient stops.
 */
export const toPageBlockElementStyle = (block: PageBlockV2): PageBlockStyleProperties => {
  const visual = toPageBlockVisualStyle(block);
  if (visual.backgroundImage && visual.backgroundColor === undefined) {
    visual.backgroundColor = "transparent";
  }
  // Text-bearing re-routed types (the button) paint text on the visual
  // element itself, so the typography surface merges here; non-text types
  // (the image) skip it inside toPageBlockTypographyStyle.
  return { ...visual, ...toPageBlockTypographyStyle(block) };
};

export const toPageButtonElementStyle = (
  block: PageBlockV2,
  variant: string
): PageBlockStyleProperties => {
  const style = toPageBlockElementStyle(block);
  const definedStyle = Object.fromEntries(
    Object.entries(style).filter(([, value]) => value !== undefined)
  ) as PageBlockStyleProperties;
  const accentColor = "var(--coderso-section-accent,#0d9488)";

  if (variant === "primary") {
    return {
      backgroundColor: accentColor,
      color: "var(--coderso-block-text,#ffffff)",
      ...definedStyle,
    };
  }

  if (variant === "secondary") {
    return {
      backgroundColor: "transparent",
      borderColor: accentColor,
      color: accentColor,
      ...definedStyle,
    };
  }

  if (variant === "ghost" || variant === "link") {
    return {
      backgroundColor: "transparent",
      color: accentColor,
      ...definedStyle,
    };
  }

  return definedStyle;
};

export const pageBlockElementDataAttributes = {
  [PAGE_BLOCK_ELEMENT_ATTRIBUTE]: "true",
} as const;

export const toPageBlockStyle = (block: PageBlockV2): PageBlockStyleProperties =>
  isPageBlockVisualElementType(block.type)
    ? toPageBlockLayoutStyle(block)
    : { ...toPageBlockVisualStyle(block), ...toPageBlockLayoutStyle(block) };

/**
 * TASK-522-03-L01 — split the 522-01-L04 composition resolver output into
 * FRAME-level attrs/vars (ride the real `[data-block-id]` frame via
 * {@link toPageBlockRenderProps}, on BOTH the front `PageBlockFrame` and the
 * canvas `renderBlockFrame` paths) vs the INNER effect-wrapper attrs/vars (a
 * child node that animates its OWN transform).
 *
 * WHY the split: the layer-anchor CSS writes `transform` on the layered child
 * (`[data-layer-anchor]`), and EVERY transform-writing effect (tilt / the
 * float|drift|pulse|orbit decorations / lift|scale hovers) ALSO writes
 * `transform`. On ONE node the effect transform overwrites the anchor translate
 * (the reference floating chip loses its corner offset). `pageResponsiveCss`
 * emits per-device `--layer-*` on `[data-block-id]` (the frame) and custom props
 * inherit DOWNWARD, so layer positioning MUST stay on the frame. FIX: keep layer
 * positioning + anchor ON THE FRAME and move the transform-writing effect to an
 * INNER descendant — frame transform = anchor translate, inner transform =
 * effect, no clash; `data-deco="radiate"` (box-shadow, not transform) stays on
 * the frame with no inner wrapper. Pure + present-only (empty in → empty out).
 */
export const splitBlockComposition = (style?: PageBlockStyle) => {
  const comp = resolveBlockCompositionAttrs(style);
  // 524-01-L02 co-location: after 524-01-L01 moved the anchor self-offset onto the
  // free `translate:` property, a transform-writing DECORATION (float/drift/pulse/
  // orbit) or HOVER (lift/lift-glow/scale) can live on the SAME node as data-surface
  // + data-layer without clobbering the anchor offset — so the glass surface floats
  // WITH the effect.
  //
  // TASK-528 whole-card tilt: TILT now ALSO lives on the FRAME (co-located with
  // data-surface / border-radius / the anchor `translate:` property). The tilt
  // transform must be on the SAME node as the glass surface so the ENTIRE card
  // tilts on hover (was: tilt on an inner descendant → only the inner content
  // tilted while the glass card stayed flat). CSS `perspective` must sit on an
  // ANCESTOR of the transformed node, so renderPageBlockWithFrame wraps the frame
  // in a `[data-tilt-parent]` ancestor (see `tiltParent` below) instead of
  // stamping data-tilt-parent on the frame itself. The tilt runtime binds
  // [data-block-tilt] pointermove → the whole frame now tilts; the anchor uses the
  // `translate:` property (524-01) so it composes with the tilt `transform`.
  // KNOWN rare combo: a block with BOTH tilt AND a transform-decoration
  // (float/drift) would contend on `transform` on the frame — the reference never
  // combines them (chips float, card tilts).
  //
  // TASK-535 tilt + layer containing-block: when a block authors BOTH tilt AND
  // style.layer, the [data-tilt-parent] perspective WRAPPER (see
  // renderPageBlockWithFrame) is an in-flow ANCESTOR of the frame — and a
  // non-`none` `perspective` establishes a CONTAINING BLOCK for absolutely
  // positioned descendants. The layer CSS is
  // `[data-composition="layered"] [data-layer]{position:absolute;left:var(--layer-x)…}`;
  // with the layer placement on the FRAME the frame goes absolute but resolves
  // its offsets against the WRAPPER (the perspective containing block) instead of
  // the `.cx-layered-canvas`, and the wrapper itself stays at its in-flow origin —
  // so the layered chip lands at the wrong place (regression of TASK-522-05-L02).
  // FIX: hoist the LAYER PLACEMENT (data-layer + data-layer-anchor + --layer-x/y/z)
  // onto the wrapper so the WRAPPER is the absolutely-positioned layered child
  // (offsets resolve against the canvas; the anchor `translate:` rides the wrapper),
  // while the TILT transform + everything else stay on the inner frame. Custom
  // props inherit DOWNWARD, so the base --layer-* MUST sit on the wrapper (the
  // consumer) — a value declared on the child frame never reaches the parent
  // wrapper. The SAME downward-only rule means the PER-DEVICE --layer-* override
  // must ALSO target the wrapper for a tilt+layer block: pageResponsiveCss retargets
  // it at `[data-tilt-parent-for="<id>"]` (the renderer stamps that id on the wrapper
  // here) instead of `[data-block-id]` (the frame). Present-only: the split fires
  // only when tilt AND layer are BOTH authored; every other combo keeps the layer
  // placement on the frame, byte-identical to pre-535 (finding-4 co-location; the
  // per-device --layer-* on [data-block-id] for the layer-ONLY case; the tilt-only
  // + anchor+deco/hover paths).
  const effectToInner = new Set<string>();
  // (deco + hover + tilt now stay on the frame, co-located with data-surface)
  const INNER_VAR_KEYS: string[] = []; // decoration timing vars now seed the frame (which carries data-deco)
  // Layer-placement keys hoisted to the tilt wrapper ONLY when tilt is also
  // authored (see the block comment above). These are the attrs/vars the layered
  // canvas CSS consumes to place + offset the absolutely-positioned child.
  const LAYER_ATTR_KEYS = ["data-layer", "data-layer-anchor"];
  const LAYER_VAR_KEYS = ["--layer-x", "--layer-y", "--layer-z"];
  // tilt needs a perspective PARENT: an ancestor wrapper of the frame carries it.
  const tiltParent = comp.perspectiveParent;
  // `data-layer` is a PRESENCE attr (value ""), so test key presence, not truthiness.
  const hoistLayerToWrapper = tiltParent && "data-layer" in comp.dataAttrs;
  const frameAttrs: Record<string, string> = {};
  const frameVars: Record<string, string> = {};
  const innerAttrs: Record<string, string> = {};
  const innerVars: Record<string, string> = {};
  const wrapperAttrs: Record<string, string> = {};
  const wrapperVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(comp.dataAttrs)) {
    if (hoistLayerToWrapper && LAYER_ATTR_KEYS.includes(k)) {
      wrapperAttrs[k] = v;
      continue;
    }
    (effectToInner.has(k) ? innerAttrs : frameAttrs)[k] = v;
  }
  for (const [k, v] of Object.entries(comp.cssVars)) {
    if (hoistLayerToWrapper && LAYER_VAR_KEYS.includes(k)) {
      wrapperVars[k] = v;
      continue;
    }
    (INNER_VAR_KEYS.includes(k) ? innerVars : frameVars)[k] = v;
  }
  const needsInner = effectToInner.size > 0 || comp.glare || comp.ambientOrbs;
  return {
    frameAttrs,
    frameVars,
    innerAttrs,
    innerVars,
    wrapperAttrs,
    wrapperVars,
    needsInner,
    tiltParent,
    glare: comp.glare,
    ambientOrbs: comp.ambientOrbs,
  };
};

export const toPageBlockRenderProps = (
  block: PageBlockV2,
  options?: {
    suppressSpan?: boolean;
    // TASK-539-05-L01 — the section boundary computes the REAL placement for
    // this block and passes it here; the span/grid-item hook may only exist on
    // the outer authored frame (see PAGE_BLOCK_GRID_ITEM_ATTRIBUTE comment).
    spanTarget?: PageBlockGridPlacementTarget;
    // TASK-539-05-L01 — a block under a revealing section receives the
    // transform host attribute so its reveal composes through the ONE
    // transform formula; ambient-orb spans stamp it too (renderer-owned).
    transformHost?: boolean;
    // TASK-539-05-L01 — marquee replica descendants replace their id attribute
    // with the style-scope id so the replicated node participates in the
    // marquee group's style scope (runtime `[data-page-block]` queries still
    // resolve inside the group).
    replicaIdentity?: PageReplicaIdentityContext;
  }
): PageBlockRenderProps => {
  const s = splitBlockComposition(block.style);
  // TASK-525-02-L02: present-only `--reveal-delay` (bounded ms, clamped at the
  // write boundary) is stamped INLINE on this block's OWN frame; the revealing
  // section's per-block reveal transition (PAGE_REVEAL_MOTION_CSS) staggers each
  // frame by its own delay. Empty object when unauthored → byte-identical frame.
  //
  // TASK-535 — SCOPE (intended + documented): `revealDelay` is a STAGGER *within a
  // revealing section*, NOT an independent per-block reveal trigger. The stagger is
  // driven by the SECTION's `data-revealed` (the 521 runtime observes SECTION
  // `[data-page-effect="reveal-*"]` nodes only) and consumed by PAGE_REVEAL_MOTION_CSS,
  // which is scoped under `[data-page-effect^="reveal"]` AND emitted only when some
  // section authors a `scrollEffect` (`hasSectionEffect`). So a block whose ONLY
  // authored motion is `revealDelay` — inside a section with NO `scrollEffect` — is
  // INERT BY DESIGN: the var is stamped but nothing hides/reveals/transitions it, and
  // no runtime observes the block. That is the correct model (the editor exposes
  // `revealDelay` alongside the section's reveal effect); widening it to make a lone
  // block self-reveal would require the runtime to observe blocks (new attr + new IO),
  // which this task does not add. INHERITANCE is handled in PAGE_REVEAL_MOTION_CSS: a
  // nested child with no delay of its own no longer inherits an ancestor's stamped
  // `--reveal-delay` (the rule resets it to 0ms; the authored inline var still wins).
  const revealDelay = block.style?.revealDelay;
  const revealVar: Record<string, string> =
    typeof revealDelay === "number" ? { "--reveal-delay": `${revealDelay}ms` } : {};
  // ── TASK-533-01: block grid span on the frame (present-only). colSpan/rowSpan
  // are already bounded ints from the normalizer (Math.trunc + PAGE_BLOCK_SPAN_CLAMP),
  // so `span ${n}` is a fixed literal — no raw author value reaches CSS. Empty object
  // when unset ⇒ no gridColumn/gridRow keys ⇒ byte-identical to post-530.
  //
  // TASK-533-01 (audit remediation): the span is emitted ONLY on the auto-flow path,
  // where the block frame is a DIRECT child of the section content grid. When
  // `options.suppressSpan` is set (the block is inside a per-column composition
  // wrapper — a SINGLE-column grid), the span would be inert/misleading:
  // `grid-column: span N` is a no-op (one column) and `grid-row: span N` spans the
  // wrapper's own auto-rows (whitespace), not the block relative to grid siblings. So
  // span and per-column `column` assignment are mutually exclusive — the span is
  // dropped here so the emitted CSS matches the real layout (no ghost rule).
  //
  // ── TASK-539-05-L01 — the legacy default (spanTarget undefined, e.g. direct
  // `toPageBlockRenderProps` calls) keeps the pre-539 span behavior; the L05
  // section boundary always passes the real computed target. The span emits only
  // when it is BOTH the computed grid target AND not nested (replica/column
  // wrappers pass `"none"`).
  const suppressSpan = options?.suppressSpan === true;
  const emitSpan =
    (options?.spanTarget === undefined || options?.spanTarget === "block-frame") && !suppressSpan;
  const colSpan = emitSpan ? block.style?.colSpan : undefined;
  const rowSpan = emitSpan ? block.style?.rowSpan : undefined;
  const spanStyle: CSSProperties = {
    ...(typeof colSpan === "number" ? { gridColumn: `span ${colSpan}` } : {}),
    ...(typeof rowSpan === "number" ? { gridRow: `span ${rowSpan}` } : {}),
  };
  const hasAnySpan = [
    block.style,
    block.responsive?.tablet?.style,
    block.responsive?.mobile?.style,
  ].some((style) => style?.colSpan !== undefined || style?.rowSpan !== undefined);
  const isGridItem = options?.spanTarget === "block-frame" && hasAnySpan && !options?.suppressSpan;
  // TASK-539-05-L01 — reveal-only blocks get the host from the renderer option;
  // blocks with their own transform effect already carry it inside frameAttrs
  // (04 composition resolution) and their spread below wins with the same value.
  const revealHost = options?.transformHost === true;
  const replica = options?.replicaIdentity;
  return {
    className: joinPageRenderClasses(
      "max-w-full",
      pageBlockEffectiveWidthClass(block.style),
      pageBlockAlignmentClass(block.style?.align)
    ),
    // FRAME-level composition CSS vars (layer positioning, surface/deco glow,
    // marquee speed) merge onto the real [data-block-id] frame. Present-only:
    // empty when unstyled → byte-identical to the pre-522 output.
    style: {
      ...toPageBlockStyle(block),
      ...(s.frameVars as CSSProperties),
      ...(revealVar as CSSProperties),
      // ── TASK-533-01: present-only grid span (empty when unset).
      ...spanStyle,
    },
    dataAttributes: {
      "data-page-block": block.type,
      // ── TASK-539-05-L01 — replica descendants never expose their own
      // `data-block-id` (the runtime must NOT let a duplicated block take over
      // its own id from the canonical node); the STYLE-SCOPE id replaces it and
      // routes every replicated node to the outer group's style-scoped group.
      ...(replica
        ? { [PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE]: block.id }
        : { [PAGE_BLOCK_ID_ATTRIBUTE]: block.id }),
      ...(isGridItem ? { [PAGE_BLOCK_GRID_ITEM_ATTRIBUTE]: block.id } : {}),
      ...(revealHost ? { [PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE]: "" } : {}),
      ...s.frameAttrs,
    },
  };
};

/**
 * Wraps the painted text node with the admin inline-edit renderer when one is
 * provided by the context; runtime rendering returns the raw text unchanged.
 */
