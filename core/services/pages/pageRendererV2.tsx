import { createElement, type CSSProperties, type ReactNode } from "react";
import { Check, Heart, Shield, Sparkles, Star, Zap, type LucideIcon } from "lucide-react";

import { ContentListBlock } from "../../widgets/core/contentList";
import { FormEmbedBlock, type FormEmbedData } from "../../widgets/core/formEmbed";
import { ListingFiltersBlock } from "../../widgets/core/listingFilters";
import {
  decodeHtmlEntities,
  parseHtmlAttributes,
  tokenizeHtml,
} from "../posts/editor/postRichTextHtmlUtils";
import {
  getPageBlockActiveSlotKeys,
  isPageTypographyCapableBlockType,
  isPageTextMarkCapableBlockType,
  normalizeBlockTextMarks,
  pageBadgeIconPositions,
  pageBadgeIcons,
  pageBadgeShapes,
  pageBadgeSizes,
  pageBadgeVariants,
  pageBadgeWeights,
  PAGE_PARALLAX_INTENSITY_CLAMP,
  PAGE_SPOTLIGHT_SIZE_CLAMP,
  pageTypographyFontFamilyCssValues,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
  resolveAnimatedIconName,
  resolvePageDocumentForBreakpoint,
  ANIMATED_ICON_SIZE_CLAMP,
  ANIMATED_ICON_SPEED_CLAMP,
  type AnimatedIconAnimation,
  type PageBlockSlotKey,
  type PageSwitcherVariant,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionV2,
  type PageTextMark,
} from "./pageDocumentV2";
import { AnimatedIcon, ANIMATED_ICON_KEYFRAMES_CSS } from "./animatedIconGlyphs";
import { SCROLL_HINT_GLYPHS, INTERACTIVITY_KEYFRAMES_CSS } from "./pageInteractivityGlyphs";
import {
  resolveBlockCompositionAttrs,
  resolveDrawInAttrs,
  resolveSectionCompositionAttrs,
  PAGE_COMPOSITION_EFFECTS_CSS,
  PAGE_INTERACTIVITY_CSS,
  usesInteractivityRuntime,
} from "./pageCompositionEffects";
import { sanitizeSvg } from "./svgSanitizer";
import { PAGE_EFFECTS_RUNTIME_ID, PAGE_EFFECTS_RUNTIME_SOURCE } from "./pageEffectsRuntime";
import type { PageBlockPath } from "./pageBlockPaths";
import {
  isPageBlockVisualElementType,
  PAGE_BLOCK_ELEMENT_ATTRIBUTE,
  PAGE_BLOCK_ID_ATTRIBUTE,
  PAGE_BLOCK_TEXT_ATTRIBUTE,
  PAGE_SECTION_CONTENT_ATTRIBUTE,
  PAGE_SECTION_ID_ATTRIBUTE,
  PAGE_TILT_PARENT_LAYER_ATTRIBUTE,
} from "./pageResponsiveCss";
import {
  distributePageSectionBlocksToColumns,
  pageSectionBlocksHaveColumnAssignments,
} from "./pageSectionColumns";
import {
  getPageSectionCompositionColumns,
  getPageSectionEffectiveColumns,
  resolvePageSectionTemplate,
  type ResolvedPageSectionTemplate,
} from "./pageSectionTemplates";
import {
  mapPageFiltersBlockToListingFiltersData,
  pageEmbedAllowedTags,
  pageEmbedSelfClosingTags,
  readPageFiltersBlockLayout,
  type PageRuntimeDataBinding,
  type PageRuntimeDataByBlockId,
  type PageRuntimeFormBinding,
} from "./pageRuntimeBindingContract";
import {
  escapeAuthoringCssString,
  isSafeAuthoringCssBackgroundLayers,
  isSafeAuthoringCssGradient,
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
  sanitizeAuthoringRichTextHtml,
} from "./pageAuthoringSanitizers";
// ── TASK-531: shared pure glow-compose (also imported by pageResponsiveCss.ts). ─
import { composeGlowBoxShadow, mergeShadows } from "./pageGlow";

export type PageRenderMode = "runtime" | "admin-preview";
export type PageSectionLayoutMode = "runtime" | "canvas-device";

export type PageSectionStyleProperties = CSSProperties & {
  "--coderso-section-accent"?: string;
};

type PageBlockStyle = NonNullable<PageBlockV2["style"]>;

export type PageBlockStyleProperties = CSSProperties & {
  "--coderso-block-text"?: string;
  "--coderso-block-surface"?: string;
};

export type PageSectionDataAttributes = {
  "data-page-section": PageSectionV2["type"];
  /** Scope hook consumed by the responsive CSS contract (`pageResponsiveCss`). */
  [PAGE_SECTION_ID_ATTRIBUTE]: string;
  "data-page-variant": PageSectionV2["variant"];
  "data-page-section-template": string;
};

export type PageBlockDataAttributes = {
  "data-page-block": PageBlockV2["type"];
  /** Scope hook consumed by the responsive CSS contract (`pageResponsiveCss`). */
  [PAGE_BLOCK_ID_ATTRIBUTE]: string;
};

export type PageSectionRenderProps = {
  sectionClassName: string;
  contentClassName: string;
  style: PageSectionStyleProperties;
  dataAttributes: PageSectionDataAttributes;
};

export type PageBlockRenderProps = {
  className: string;
  style: PageBlockStyleProperties;
  dataAttributes: PageBlockDataAttributes;
};

export type PageBlockFrameRenderer = (input: {
  block: PageBlockV2;
  content: ReactNode;
  renderProps: PageBlockRenderProps;
  blockPath: PageBlockPath;
  depth: number;
  slotKey?: PageBlockSlotKey;
  parentBlock?: PageBlockV2;
}) => ReactNode;

/**
 * Admin-canvas hook (TASK-422-02): receives the exact text source a
 * text-bearing block paints (including renderer fallbacks) so the Page Editor
 * can layer inline editing on top of the same content the front renders. Rich
 * text can also pass sanitized React children for the idle canvas view while
 * keeping plain-text commit semantics; block-rich children pass `display:
 * "block"` so the canvas does not nest block elements inside inline wrappers.
 * Runtime render paths never provide it, so public output is unchanged. `propPath` follows the
 * `pageInlineEditContract` convention (`"text"`, `"label"`, `"items.0"`).
 */
export type PageInlineTextRenderer = (input: {
  block: PageBlockV2;
  propPath: string;
  text: string;
  children?: ReactNode;
  display?: "inline" | "block";
}) => ReactNode;

/**
 * Admin-canvas hook (owner finding #8): invoked once per active columns-block
 * slot AFTER the slot's children so the Page Editor can paint ghost
 * "Add block" tiles inside empty column slots (and a trailing add affordance
 * in non-empty ones). Runtime render paths never provide it, so public output
 * is unchanged — the same parity contract as {@link PageInlineTextRenderer}.
 */
export type PageColumnsSlotTrailingRenderer = (input: {
  block: PageBlockV2;
  slotKey: PageBlockSlotKey;
  ownerPath: PageBlockPath;
  childCount: number;
}) => ReactNode;

/**
 * Admin-canvas hook (owner finding #5, round 3): invoked once per SECTION
 * column wrapper AFTER the column's blocks when per-column composition is
 * active (composition columns >= 2 and at least one root block carries a
 * `style.column` assignment), so the Page Editor can paint a persistent ghost
 * "Add block" tile at the bottom of every column stack. Runtime render paths
 * never provide it, so public output is unchanged — the same parity contract
 * as {@link PageColumnsSlotTrailingRenderer}.
 */
export type PageSectionColumnTrailingRenderer = (input: {
  section: PageSectionV2;
  /** 1-based column index. */
  column: number;
  childCount: number;
}) => ReactNode;

type PageBlockRenderContext = {
  blockPath: PageBlockPath;
  depth: number;
  includeHiddenBlocks: boolean;
  renderBlockFrame?: PageBlockFrameRenderer;
  renderInlineText?: PageInlineTextRenderer;
  renderColumnsSlotTrailing?: PageColumnsSlotTrailingRenderer;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
  /**
   * Section layout mode threaded into block rendering (TASK-456) so
   * data-bound blocks can emit a canvas-safe representation (interactivity
   * disabled) in the editor. Runtime render paths keep the "runtime" default,
   * so public output is unchanged.
   */
  layoutMode?: PageSectionLayoutMode;
  slotKey?: PageBlockSlotKey;
  parentBlock?: PageBlockV2;
};

export const joinPageRenderClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const readText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const readNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toHrefTarget = (value: unknown) => (value === "blank" ? "_blank" : undefined);

const readButtonVariant = (value: unknown) =>
  value === "secondary" || value === "ghost" || value === "link" ? value : "primary";

const readButtonSize = (value: unknown) => (value === "sm" || value === "lg" ? value : "md");

const pageButtonSizeClass = (size: string, variant: string) => {
  if (variant === "link") {
    if (size === "sm") return "text-sm";
    if (size === "lg") return "text-lg";
    return "text-base";
  }
  if (size === "sm") return "px-3 py-2 text-sm";
  if (size === "lg") return "px-6 py-4 text-base";
  return "px-5 py-3 text-sm";
};

const pageButtonVariantClass = (variant: string) => {
  if (variant === "secondary") {
    return "border bg-transparent shadow-sm transition hover:opacity-90";
  }
  if (variant === "ghost") {
    return "bg-transparent shadow-none transition hover:opacity-80";
  }
  if (variant === "link") {
    return "bg-transparent underline underline-offset-4 shadow-none transition hover:opacity-80";
  }
  return "shadow-sm transition hover:opacity-90";
};

const pageBadgeIconMap: Record<(typeof pageBadgeIcons)[number], LucideIcon> = {
  check: Check,
  heart: Heart,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  zap: Zap,
};

const readBadgeOption = <T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T
): T => (typeof value === "string" && options.includes(value as T) ? (value as T) : fallback);

const readBadgeIcon = (value: unknown): (typeof pageBadgeIcons)[number] | null =>
  typeof value === "string" && pageBadgeIcons.includes(value as (typeof pageBadgeIcons)[number])
    ? (value as (typeof pageBadgeIcons)[number])
    : null;

const pageBadgeShapeClass = (shape: string) => {
  if (shape === "square") return "rounded-none";
  if (shape === "rounded") return "rounded-md";
  return "rounded-full";
};

const pageBadgeSizeClass = (size: string) => {
  if (size === "2xs") return "gap-1 px-1.5 py-0.5";
  if (size === "xs") return "gap-1 px-2 py-0.5";
  if (size === "md") return "gap-1.5 px-3 py-1";
  return "gap-1.5 px-2.5 py-0.5";
};

const pageBadgeVariantClass = (variant: string) => {
  if (variant === "outline") return "border bg-transparent";
  if (variant === "solid") return "border border-transparent";
  return "border border-transparent";
};

const pageBadgeVariantStyle = (
  variant: string,
  background: unknown,
  textColor: unknown
): PageBlockStyleProperties => {
  const safeBackground = sanitizeAuthoringCssColor(background);
  const safeTextColor = sanitizeAuthoringCssColor(textColor);
  const accent = "var(--coderso-section-accent,#0d9488)";
  if (variant === "solid") {
    return {
      backgroundColor: safeBackground ?? accent,
      borderColor: safeBackground ?? accent,
      color: safeTextColor ?? "#ffffff",
    };
  }
  if (variant === "outline") {
    return {
      backgroundColor: safeBackground ?? "transparent",
      borderColor: safeBackground ?? accent,
      color: safeTextColor ?? accent,
    };
  }
  return {
    backgroundColor: safeBackground ?? "rgba(13, 148, 136, 0.12)",
    borderColor: safeBackground ?? "rgba(13, 148, 136, 0.12)",
    color: safeTextColor ?? accent,
  };
};

const pageImageFitClass = (value: unknown) =>
  value === "contain" ? "object-contain" : "object-cover";

const pageDividerToneBorderColor = (value: unknown) => {
  if (value === "muted") return "#cbd5e1";
  if (value === "accent") return "var(--coderso-section-accent,#0d9488)";
  return "#e2e8f0";
};

const toPageShadowValue = (shadow: PageBlockStyle["shadow"]) => {
  if (shadow === "sm") return "0 6px 20px rgba(15, 23, 42, 0.08)";
  if (shadow === "md") return "0 14px 40px rgba(15, 23, 42, 0.12)";
  if (shadow === "lg") return "0 22px 60px rgba(15, 23, 42, 0.16)";
  return undefined;
};

const toBoxSpacingValue = (spacing: PageBlockStyle["padding"] | PageBlockStyle["margin"]) =>
  spacing
    ? `${spacing.top ?? 0}px ${spacing.right ?? 0}px ${spacing.bottom ?? 0}px ${
        spacing.left ?? 0
      }px`
    : undefined;

const toGradientBackground = (value: string | null | undefined) => {
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

const scalePageSectionSpacing = (value: number, scale: number, minimum: number) =>
  value <= 0 ? 0 : Math.max(minimum, Math.round(value * scale));

const toPageSectionVariantSpacing = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate
): PageSectionV2["spacing"] => {
  if (
    template.variant === "compact" &&
    (template.template === "content" ||
      template.template === "faq" ||
      template.template === "timeline")
  ) {
    return {
      ...section.spacing,
      paddingTop: scalePageSectionSpacing(section.spacing.paddingTop, 0.55, 16),
      paddingBottom: scalePageSectionSpacing(section.spacing.paddingBottom, 0.55, 16),
      paddingLeft: scalePageSectionSpacing(section.spacing.paddingLeft, 0.75, 16),
      paddingRight: scalePageSectionSpacing(section.spacing.paddingRight, 0.75, 16),
      gap: scalePageSectionSpacing(section.spacing.gap, 0.6, 8),
    };
  }
  return section.spacing;
};

/**
 * TASK-525-01-L01: a section is full-bleed when the template resolves to the
 * `full-width` variant OR the author toggled `style.fullBleed` (525-01-L02).
 * Full-bleed decouples the background box (painted edge-to-edge / 100vw) from
 * the CONTENT, which stays capped and centered at `layout.maxWidth`.
 */
const isPageSectionFullBleed = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate
): boolean => template.variant === "full-width" || section.style.fullBleed === true;

/**
 * TASK-525-01-L01 reference `.container` gutter: on viewports narrower than the
 * cap the centered content keeps a fixed 20px gutter each side (mirrors
 * `.container{width:min(var(--container),calc(100% - 40px))}` in the reference
 * `styles.css`), so full-bleed content never touches the screen edges. FIXED
 * literal — no author-controlled value.
 */
const PAGE_SECTION_FULL_BLEED_GUTTER = "20px" as const;

const toPageSectionBoxShadow = (shadow: PageSectionV2["style"]["shadow"]) =>
  shadow === "none"
    ? undefined
    : shadow === "sm"
      ? "0 6px 20px rgba(15, 23, 42, 0.08)"
      : shadow === "md"
        ? "0 14px 40px rgba(15, 23, 42, 0.12)"
        : "0 22px 60px rgba(15, 23, 42, 0.16)";

export const toPageSectionStyle = (section: PageSectionV2): PageSectionStyleProperties => {
  const template = resolvePageSectionTemplate(section);
  const spacing = toPageSectionVariantSpacing(section, template);
  const accent = sanitizeAuthoringCssColor(section.style.accent);
  const backgroundColor =
    section.style.backgroundType === "color"
      ? sanitizeAuthoringCssColor(section.style.background)
      : undefined;
  const backgroundImageUrl =
    section.style.backgroundType === "image"
      ? sanitizeAuthoringMediaUrl(section.style.backgroundImage)
      : null;
  // ── TASK-531: SECTION gradient branch (grounding correction: the BLOCK gradient
  // is already wired; the section path was missing). CSS gradients paint via
  // `background-image`; `toGradientBackground` (relaxed above) trusts the
  // allowlisted sanitizer so a safe MULTI-LAYER value survives here too.
  const backgroundGradient =
    section.style.backgroundType === "gradient"
      ? toGradientBackground(section.style.background)
      : undefined;
  const backgroundImage = backgroundImageUrl
    ? `url("${escapeAuthoringCssString(backgroundImageUrl)}")`
    : backgroundGradient;
  // ── TASK-531: append the glow after the enum shadow (comma list = two stacked).
  const boxShadow = mergeShadows(
    toPageSectionBoxShadow(section.style.shadow),
    composeGlowBoxShadow(section.style.glow)
  );
  const padding = `${spacing.paddingTop}px ${spacing.paddingRight}px ${spacing.paddingBottom}px ${spacing.paddingLeft}px`;
  const gap = `${spacing.gap}px`;
  const maxWidth = `${section.layout.maxWidth}px`;
  // TASK-525-01-L01: DECOUPLE bleed from the content cap. Full-bleed content is
  // ALWAYS capped/centered at `layout.maxWidth` (no more `maxWidth:"none"`) with
  // a min side gutter mirroring the reference `.container`; the 100vw background
  // bleed lives on the OUTER section box (see toPageSectionBleedStyle), NOT here.
  // Background/radius/shadow move to the bleed box so the paint reaches the
  // viewport edges while the content stays contained. Non-full-bleed keeps the
  // pre-525 single-node contract byte-identical (bg + cap on this content div).
  if (isPageSectionFullBleed(section, template)) {
    return {
      "--coderso-section-accent": accent ?? undefined,
      padding,
      width: `min(${maxWidth}, calc(100% - 2 * ${PAGE_SECTION_FULL_BLEED_GUTTER}))`,
      maxWidth,
      margin: "0 auto",
      gap,
    };
  }
  return {
    "--coderso-section-accent": accent ?? undefined,
    backgroundColor: backgroundColor ?? undefined,
    backgroundImage,
    borderRadius: `${section.style.radius}px`,
    boxShadow,
    padding,
    maxWidth,
    margin: "0 auto",
    gap,
  };
};

/**
 * TASK-525-01-L01: the full-bleed BACKGROUND box style, applied to the OUTER
 * `<section>` element so the background paints edge-to-edge (100vw) while the
 * content div (toPageSectionStyle) stays capped/centered at `layout.maxWidth`.
 * Returns `undefined` for non-full-bleed sections (no bleed box → the section
 * box stays byte-identical to the pre-525 output). The `100vw` bleed
 * (`width:100vw;margin-left:calc(50% - 50vw)`) is a FIXED literal; the only
 * author-derived values are the already-sanitized background color/URL and the
 * clamped radius, identical to the values `toPageSectionStyle` emitted before.
 */
export const toPageSectionBleedStyle = (
  section: PageSectionV2
): PageSectionStyleProperties | undefined => {
  const template = resolvePageSectionTemplate(section);
  if (!isPageSectionFullBleed(section, template)) return undefined;
  const backgroundColor =
    section.style.backgroundType === "color"
      ? sanitizeAuthoringCssColor(section.style.background)
      : undefined;
  const backgroundImageUrl =
    section.style.backgroundType === "image"
      ? sanitizeAuthoringMediaUrl(section.style.backgroundImage)
      : null;
  // ── TASK-531: the bleed box paints the section background/shadow, so it also
  // gains the gradient branch + glow merge so a full-bleed gradient/glow bleeds
  // edge-to-edge (mirrors toPageSectionStyle's non-bleed return).
  const backgroundGradient =
    section.style.backgroundType === "gradient"
      ? toGradientBackground(section.style.background)
      : undefined;
  const backgroundImage = backgroundImageUrl
    ? `url("${escapeAuthoringCssString(backgroundImageUrl)}")`
    : backgroundGradient;
  return {
    // FIXED-literal 100vw bleed centered on the section's own axis.
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    backgroundColor: backgroundColor ?? undefined,
    backgroundImage,
    borderRadius: `${section.style.radius}px`,
    boxShadow: mergeShadows(
      toPageSectionBoxShadow(section.style.shadow),
      composeGlowBoxShadow(section.style.glow)
    ),
  };
};

export const pageSectionGridClass = (columns: number) => {
  if (columns <= 1) return "grid-cols-1";
  if (columns === 2) return "grid-cols-1 md:grid-cols-2";
  if (columns === 3) return "grid-cols-1 md:grid-cols-3";
  return "grid-cols-1 md:grid-cols-4";
};

export const pageSectionCanvasGridClass = (columns: number) => {
  if (columns <= 1) return "grid-cols-1";
  if (columns === 2) return "grid-cols-2";
  if (columns === 3) return "grid-cols-3";
  return "grid-cols-4";
};

export const pageSectionAlignmentClass = (align: PageSectionV2["layout"]["align"]) => {
  if (align === "center") return "items-center";
  if (align === "end") return "items-end";
  if (align === "stretch") return "items-stretch";
  return "items-start";
};

export const pageSectionJustifyClass = (justify: PageSectionV2["layout"]["justify"]) => {
  if (justify === "center") return "justify-center";
  if (justify === "end") return "justify-end";
  if (justify === "between") return "justify-between";
  return "justify-start";
};

const pageSectionTemplateClass = (template: ResolvedPageSectionTemplate) => {
  const marker = `page-section-template-${template.template}-${template.variant}`;
  if (template.template === "hero" && template.variant === "split") {
    return `${marker} text-left`;
  }
  if (template.template === "hero" && template.variant === "full-width") {
    return `${marker} min-h-[420px] place-items-center text-center`;
  }
  if (template.template === "cta") {
    if (template.variant === "full-width") {
      return `${marker} min-h-[320px] place-items-center justify-items-center text-center`;
    }
    if (template.variant === "centered") {
      return `${marker} place-items-center justify-items-center text-center`;
    }
    return `${marker} items-start justify-items-start text-left`;
  }
  if (template.template === "hero") {
    return `${marker} place-items-center text-center`;
  }
  if (template.template === "timeline") {
    if (template.variant === "horizontal") return `${marker} auto-rows-fr items-start`;
    if (template.variant === "compact") return `${marker} content-start`;
    return `${marker} content-start`;
  }
  if (template.template === "gallery") {
    if (template.variant === "cards") return `${marker} auto-rows-fr items-stretch`;
    if (template.variant === "grid") return `${marker} auto-rows-fr`;
  }
  if (template.template === "testimonials") {
    if (template.variant === "cards") return `${marker} auto-rows-fr items-stretch`;
    if (template.variant === "grid") return `${marker} auto-rows-fr`;
  }
  if (template.variant === "compact") return `${marker} content-start`;
  if (template.variant === "cards") return `${marker} auto-rows-fr`;
  if (template.variant === "horizontal") return `${marker} items-center`;
  if (template.variant === "grid") return `${marker} auto-rows-fr`;
  return marker;
};

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
  if (align === "center") {
    return { marginLeft: "auto", marginRight: "auto" };
  }
  if (align === "right") {
    return { marginLeft: "auto" };
  }
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

export const toPageSectionRenderProps = (
  section: PageSectionV2,
  options?: { layoutMode?: PageSectionLayoutMode }
): PageSectionRenderProps => {
  const template = resolvePageSectionTemplate(section);
  // stackVertical contract (TASK-425): when the effective resolved value is
  // true, the section content grid collapses to a single column, beating the
  // template-floored column count. Callers pass breakpoint-resolved sections
  // (editor canvas, flattened previews), so the override cascade is already
  // merged here; the public base markup uses the desktop-resolved value and
  // pageResponsiveCss.ts emits the tablet/mobile delta.
  // `getPageSectionEffectiveColumns` owns this math so editor grid affordances
  // (ghost tiles, left/right move steps) always agree with the painted grid.
  const columns = getPageSectionEffectiveColumns(section);
  // Section scroll-reveal (TASK-521-02): append ONLY the JIT-safe standard
  // utilities (transition + the revealed-state target). The HIDE state ships
  // separately as the exported PAGE_REVEAL_MOTION_CSS static string (emitted
  // once at the page root by 521-05), scoped under the runtime-set
  // `[data-reveal-armed]` marker so content is NEVER permanently hidden in the
  // canvas / no-JS / CSP-blocked / reduced-motion / pre-arm cases.
  const scrollEffect = section.style.scrollEffect;
  const isReveal = scrollEffect === "reveal-fade" || scrollEffect === "reveal-up";
  const revealClass = isReveal
    ? "motion-safe:transition-[opacity,transform] motion-safe:duration-700 " +
      "motion-safe:data-[revealed=true]:opacity-100 motion-safe:data-[revealed=true]:translate-y-0"
    : "";
  // TASK-535 — drop the px-4 py-6 gutter for EVERY full-bleed section, not just
  // the `full-width` template variant. The style path (`toPageSectionStyle` /
  // `toPageSectionBleedStyle`) already keys the bleed box + content cap off
  // `isPageSectionFullBleed(...)` (template full-width OR the author toggling
  // `style.fullBleed`), so a `style.fullBleed`-only section got its 100vw bleed
  // box + content cap but STILL carried the utility gutter here — the class path
  // was checking only the variant. Route the className off the SAME predicate so
  // the gutter decision matches the style decision (a fullBleed-flag section
  // paints edge-to-edge with no doubled utility padding). Non-full-bleed keeps
  // `w-full px-4 py-6` byte-identical.
  const baseSectionClassName = isPageSectionFullBleed(section, template)
    ? "w-full"
    : "w-full px-4 py-6";
  return {
    sectionClassName: [baseSectionClassName, revealClass].filter(Boolean).join(" "),
    contentClassName: joinPageRenderClasses(
      "grid w-full",
      options?.layoutMode === "canvas-device"
        ? pageSectionCanvasGridClass(columns)
        : pageSectionGridClass(columns),
      pageSectionAlignmentClass(section.layout.align),
      pageSectionJustifyClass(section.layout.justify),
      pageSectionTemplateClass(template)
    ),
    style: toPageSectionStyle(section),
    dataAttributes: {
      "data-page-section": section.type,
      [PAGE_SECTION_ID_ATTRIBUTE]: section.id,
      "data-page-variant": template.variant,
      "data-page-section-template": template.template,
    },
  };
};

/**
 * Static reveal HIDE-state CSS (TASK-521-02) — the SINGLE source of the
 * before-reveal hidden state for `scrollEffect: "reveal-fade" | "reveal-up"`.
 * Scoped under BOTH `@media (prefers-reduced-motion: no-preference)` (motion-safe)
 * AND the runtime-set `[data-reveal-armed]` marker (JS-required-to-HIDE): so the
 * builder canvas, no-JS/SSR, CSP-blocked, reduced-motion, and any pre-arm
 * exception path NEVER hide content (marker absent ⇒ rule inert; content shown
 * at rest, SEO-safe). Emitted verbatim ONCE at the page root by 521-05-L03 in a
 * `<style data-page-motion-css>`; the section carries only JIT-safe standard
 * utilities (transition + `data-[revealed=true]:` revealed-state target). Once
 * the runtime arms and IntersectionObserver sets `data-revealed`, the section
 * animates to rest.
 */
export const PAGE_REVEAL_MOTION_CSS =
  "@media (prefers-reduced-motion: no-preference){" +
  // Section-level hide-state (UNCHANGED — the <section> still composes its own reveal).
  '[data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]){opacity:0}' +
  '[data-reveal-armed] [data-page-effect="reveal-up"]:not([data-revealed]){transform:translateY(1rem)}' +
  // TASK-525-02-L02 per-CHILD hide-state + reveal transition so a revealing
  // section's blocks CASCADE instead of fading as one unit. Each [data-page-block]
  // frame carries its OWN opacity/transform transition; the transition-delay reads
  // the inherited `--reveal-delay` (present-only frame var, default 0ms), so a
  // section-only delay is no longer inert — the delay applies to a transition the
  // child actually has. Keyed off the SECTION's data-revealed (the 521 runtime
  // still toggles data-revealed on the section only — no new runtime/attr). All
  // rules live INSIDE the motion-safe @media + [data-reveal-armed] gate, so under
  // reduced-motion no block is ever hidden.
  //
  // CRITICAL: the transition + transition-delay MUST live on a STATE-INDEPENDENT
  // rule (NOT gated by :not([data-revealed])). Per the CSS Transitions spec, a
  // transition is governed by the transition-* properties of the AFTER-CHANGE
  // computed style. If the transition were only on the :not([data-revealed]) rule,
  // then once the section flips data-revealed that rule stops matching, the child
  // frame's transition resets to `all 0s`, and blocks JUMP to opacity:1 with no
  // fade/delay/cascade. Keeping the transition state-agnostic means it survives
  // into the revealed style so the per-block --reveal-delay actually staggers.
  //
  // TASK-535 — `--reveal-delay` is a CSS CUSTOM PROPERTY, which INHERITS. A block
  // stamps it on its OWN frame inline (toPageBlockRenderProps), so a container that
  // authors `revealDelay` sets `--reveal-delay:<n>ms` on its frame — and a NESTED
  // CHILD block that authored NO delay of its own would INHERIT the ancestor's value
  // and cascade at the ancestor's delay instead of at 0 (all children of a delayed
  // container animate together, defeating per-block stagger). FIX: reset
  // `--reveal-delay:0ms` in this same stylesheet rule, which applies to EVERY
  // [data-page-block] frame under a revealing section. An AUTHORED block's INLINE
  // `--reveal-delay:<n>ms` beats this author-stylesheet declaration (inline wins the
  // cascade), so it keeps its own value; an UNAUTHORED descendant has no inline
  // value, so this reset wins and it uses 0ms — it no longer inherits an ancestor's
  // delay. `var(--reveal-delay,0ms)` then reads that per-frame cascaded value. Pure
  // CSS (no `@property`), so it works in every browser; the frame emit is untouched
  // (present-only inline var stays byte-identical).
  '[data-reveal-armed] [data-page-effect^="reveal"] [data-page-block]' +
  "{--reveal-delay:0ms;transition:opacity .7s,transform .7s;transition-delay:var(--reveal-delay,0ms)}" +
  // Hide-state visual values only (opacity/transform) gated by :not([data-revealed]).
  '[data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]) [data-page-block]' +
  "{opacity:0}" +
  '[data-reveal-armed] [data-page-effect="reveal-up"]:not([data-revealed]) [data-page-block]' +
  "{transform:translateY(1rem)}" +
  '[data-reveal-armed] [data-page-effect^="reveal"][data-revealed] [data-page-block]' +
  "{opacity:1;transform:none}" +
  "}";

/**
 * Visual style surface of `PageBlockStyleV2` (background, text color, border,
 * radius, shadow, opacity). For most block types it stays on the block frame;
 * for {@link isPageBlockVisualElementType} types it moves onto the inner
 * visual element so "block styles" format the element the user sees (the hero
 * button, the image) instead of painting the area around it.
 */
const toPageBlockVisualStyle = (block: PageBlockV2): PageBlockStyleProperties => {
  const style = block.style ?? {};
  const backgroundColor =
    style.backgroundType === "color" && style.background
      ? sanitizeAuthoringCssColor(style.background)
      : undefined;
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
      : style.backgroundType === "gradient"
        ? toGradientBackground(style.background)
        : undefined,
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
  if (style.fontSize) result.fontSize = pageTypographyFontSizeCssValues[style.fontSize];
  if (style.fontWeight) result.fontWeight = pageTypographyFontWeightCssValues[style.fontWeight];
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

const toPageButtonElementStyle = (
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
const splitBlockComposition = (style?: PageBlockStyle) => {
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

export const toPageBlockRenderProps = (block: PageBlockV2): PageBlockRenderProps => {
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
    },
    dataAttributes: {
      "data-page-block": block.type,
      [PAGE_BLOCK_ID_ATTRIBUTE]: block.id,
      ...s.frameAttrs,
    },
  };
};

/**
 * Wraps the painted text node with the admin inline-edit renderer when one is
 * provided by the context; runtime rendering returns the raw text unchanged.
 */
const renderBlockText = (
  block: PageBlockV2,
  propPath: string,
  text: string,
  context: PageBlockRenderContext,
  children?: ReactNode
): ReactNode =>
  context.renderInlineText
    ? context.renderInlineText({ block, propPath, text, children })
    : (children ?? text);

const textMarkRenderRank: Record<PageTextMark["type"], number> = {
  color: 0,
  highlight: 1,
  bold: 2,
  italic: 3,
  link: 4,
};

/**
 * Deterministic, token-driven styling for an inline `link` mark so a linked run
 * is visually obvious (underline + link color) on BOTH the front and the canvas.
 * Renderer-applied only — the style is not stored in the mark, so it needs no
 * schema/sanitizer change. The `--coderso-link` token follows the renderer's
 * `--coderso-*` namespace and carries a hard fallback so the affordance is
 * visible even where the var is undefined.
 */
const PAGE_TEXT_LINK_MARK_CLASS =
  "underline underline-offset-2 text-[var(--coderso-link,#2563eb)] hover:opacity-80";

const renderMarkedTextSegment = (
  text: string,
  marks: readonly PageTextMark[],
  key: string,
  isCanvas: boolean
): ReactNode => {
  const style: CSSProperties = {};
  const link = marks.find(
    (mark): mark is Extract<PageTextMark, { type: "link" }> => mark.type === "link"
  );
  const hasBold = marks.some((mark) => mark.type === "bold");
  const hasItalic = marks.some((mark) => mark.type === "italic");
  for (const mark of marks) {
    if (mark.type === "color") style.color = mark.color;
    if (mark.type === "highlight") style.backgroundColor = mark.color;
  }

  let node: ReactNode = text;
  const styleTypes = marks
    .filter((mark) => mark.type === "color" || mark.type === "highlight")
    .map((mark) => mark.type)
    .join(" ");
  if (Object.keys(style).length > 0) {
    node = (
      <span key={`${key}-style`} data-page-text-mark={styleTypes} style={style}>
        {node}
      </span>
    );
  }
  if (hasBold) {
    node = <strong key={`${key}-bold`}>{node}</strong>;
  }
  if (hasItalic) {
    node = <em key={`${key}-italic`}>{node}</em>;
  }
  if (link) {
    // In the editor canvas a linked run is painted as a NON-navigating span so a
    // click selects the fragment / sets the caret instead of opening the URL (and
    // never fires the beforeunload navigation), letting the author click-to-edit a
    // link (TASK-478-02). It keeps the same link affordance (underline + link
    // color + `data-page-text-mark="link"`) so linked runs stay visually obvious
    // and distinctly outlined. The front + preview (runtime mode) still render a
    // real, navigable `<a href>` with the security `rel`.
    node = isCanvas ? (
      <span
        key={`${key}-link`}
        className={PAGE_TEXT_LINK_MARK_CLASS}
        data-page-text-mark="link"
        data-page-editor-link-noop="true"
      >
        {node}
      </span>
    ) : (
      <a
        key={`${key}-link`}
        href={link.href}
        className={PAGE_TEXT_LINK_MARK_CLASS}
        data-page-text-mark="link"
        rel="nofollow noreferrer"
      >
        {node}
      </a>
    );
  }
  return node;
};

const renderBlockTextMarks = (
  block: PageBlockV2,
  propPath: string,
  text: string,
  context: PageBlockRenderContext
): ReactNode => {
  if (propPath !== "text" || !isPageTextMarkCapableBlockType(block.type)) {
    return renderBlockText(block, propPath, text, context);
  }
  const marks = normalizeBlockTextMarks(text, block.props.marks);
  if (marks.length === 0) return renderBlockText(block, propPath, text, context);

  const isCanvas = context.layoutMode === "canvas-device";
  const boundaries = Array.from(
    new Set([0, text.length, ...marks.flatMap((mark) => [mark.from, mark.to])])
  ).sort((left, right) => left - right);
  const children: ReactNode[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const from = boundaries[index]!;
    const to = boundaries[index + 1]!;
    if (to <= from) continue;
    const segment = text.slice(from, to);
    const activeMarks = marks
      .filter((mark) => mark.from <= from && mark.to >= to)
      .sort((left, right) => textMarkRenderRank[left.type] - textMarkRenderRank[right.type]);
    children.push(
      activeMarks.length > 0
        ? renderMarkedTextSegment(segment, activeMarks, `mark-${index}-${from}-${to}`, isCanvas)
        : segment
    );
  }
  return renderBlockText(block, propPath, text, context, children);
};

const pageRichTextAllowedTags: ReadonlySet<string> = new Set([
  "a",
  "br",
  "code",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "strong",
  "ul",
]);

const pageRichTextSelfClosingTags: ReadonlySet<string> = new Set(["br"]);

const richTextStyledElementTags: ReadonlySet<string> = new Set(["li", "ol", "p", "ul"]);

const toSanitizedRichTextElementProps = (
  tagName: string,
  rawAttrs: string,
  key: number,
  style: PageBlockStyleProperties
): Record<string, string | number | CSSProperties> => {
  const attrs = toSanitizedEmbedElementProps(tagName, rawAttrs, key);
  if (!richTextStyledElementTags.has(tagName)) return attrs;
  return {
    ...attrs,
    ...pageBlockTextDataAttributes,
    style,
  };
};

const renderRichTextRootText = (
  text: string,
  key: number,
  style: PageBlockStyleProperties
): ReactNode => (
  <span key={key} style={style} {...pageBlockTextDataAttributes}>
    {text}
  </span>
);

const createSanitizedRichTextElement = (
  frame: SanitizedEmbedElementFrame,
  style: PageBlockStyleProperties
) =>
  createElement(
    frame.tagName,
    toSanitizedRichTextElementProps(frame.tagName, frame.rawAttrs, frame.key, style),
    ...frame.children
  );

const renderSanitizedRichTextHtml = (
  sanitizedHtml: string,
  style: PageBlockStyleProperties
): ReactNode[] => {
  const roots: ReactNode[] = [];
  const stack: SanitizedEmbedElementFrame[] = [];
  let nextKey = 0;

  const appendNode = (node: ReactNode) => {
    const parent = stack.at(-1);
    if (parent) {
      parent.children.push(node);
      return;
    }
    roots.push(node);
  };

  for (const token of tokenizeHtml(sanitizedHtml)) {
    if (token.kind === "text") {
      const text = decodeHtmlEntities(token.value);
      if (stack.length > 0) {
        appendNode(text);
      } else if (text.length > 0) {
        appendNode(renderRichTextRootText(text, nextKey++, style));
      }
      continue;
    }
    if (token.kind === "comment" || !pageRichTextAllowedTags.has(token.name)) continue;

    if (token.closing) {
      const current = stack.at(-1);
      if (current?.tagName === token.name) {
        stack.pop();
        appendNode(createSanitizedRichTextElement(current, style));
      }
      continue;
    }

    if (token.selfClosing || pageRichTextSelfClosingTags.has(token.name)) {
      appendNode(
        createElement(
          token.name,
          toSanitizedRichTextElementProps(token.name, token.rawAttrs, nextKey++, style)
        )
      );
      continue;
    }

    stack.push({ tagName: token.name, rawAttrs: token.rawAttrs, children: [], key: nextKey++ });
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (current) appendNode(createSanitizedRichTextElement(current, style));
  }

  return roots;
};

const renderTextBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const className = joinPageRenderClasses(
    block.props.format === "rich"
      ? "prose max-w-none text-base leading-7 text-[var(--coderso-block-text,#334155)]"
      : "text-base leading-7 text-[var(--coderso-block-text,#334155)]",
    pageTextAlignClass(block.props.align)
  );
  const style = toPageBlockTypographyStyle(block);
  if (block.props.format === "rich") {
    const sanitizedHtml = sanitizeAuthoringRichTextHtml(block.props.text);
    const richChildren = renderSanitizedRichTextHtml(sanitizedHtml, style);
    return (
      <div className={className}>
        {context.renderInlineText
          ? context.renderInlineText({
              block,
              propPath: "text",
              text: readText(block.props.text),
              children: richChildren,
              display: "block",
            })
          : richChildren}
      </div>
    );
  }
  return (
    <p className={className} style={style} {...pageBlockTextDataAttributes}>
      {renderBlockTextMarks(block, "text", readText(block.props.text), context)}
    </p>
  );
};

const renderHeading = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const text = renderBlockTextMarks(block, "text", readText(block.props.text, "Heading"), context);
  const level = readText(block.props.level, "h2");
  // Typography contract: explicit tokens paint inline on the heading element
  // itself so they beat the baked level classes (text-5xl, font-semibold).
  const textNodeProps = {
    className: joinPageRenderClasses(
      "font-semibold leading-tight text-[var(--coderso-block-text,#020617)]",
      level === "h1" ? "text-5xl" : level === "h2" ? "text-4xl" : "text-2xl",
      pageTextAlignClass(block.props.align)
    ),
    style: toPageBlockTypographyStyle(block),
    ...pageBlockTextDataAttributes,
  };

  if (level === "h1") return <h1 {...textNodeProps}>{text}</h1>;
  if (level === "h3") return <h3 {...textNodeProps}>{text}</h3>;
  if (level === "h4") return <h4 {...textNodeProps}>{text}</h4>;
  if (level === "h5") return <h5 {...textNodeProps}>{text}</h5>;
  if (level === "h6") return <h6 {...textNodeProps}>{text}</h6>;
  return <h2 {...textNodeProps}>{text}</h2>;
};

const renderBadgeBlock = (block: PageBlockV2) => {
  const text = readText(block.props.text, "Badge");
  const variant = readBadgeOption(block.props.variant, pageBadgeVariants, "soft");
  const size = readBadgeOption(block.props.size, pageBadgeSizes, "sm");
  const shape = readBadgeOption(block.props.shape, pageBadgeShapes, "pill");
  const weight = readBadgeOption(block.props.weight, pageBadgeWeights, "semibold");
  const iconPosition = readBadgeOption(block.props.iconPosition, pageBadgeIconPositions, "start");
  const iconName = readBadgeIcon(block.props.icon);
  const Icon = iconName ? pageBadgeIconMap[iconName] : null;
  const style: PageBlockStyleProperties = {
    ...pageBadgeVariantStyle(variant, block.props.background, block.props.textColor),
    fontSize: pageTypographyFontSizeCssValues[size],
    fontWeight: pageTypographyFontWeightCssValues[weight],
  };
  const icon = Icon ? <Icon className="h-[1em] w-[1em] shrink-0" aria-hidden="true" /> : null;

  return (
    <span
      className={joinPageRenderClasses(
        "inline-flex max-w-full items-center whitespace-nowrap leading-none",
        pageBadgeVariantClass(variant),
        pageBadgeShapeClass(shape),
        pageBadgeSizeClass(size)
      )}
      data-page-badge="true"
      data-page-badge-variant={variant}
      data-page-badge-size={size}
      data-page-badge-shape={shape}
      style={style}
    >
      {icon && iconPosition === "start" ? icon : null}
      <span className="min-w-0 truncate">{text}</span>
      {icon && iconPosition === "end" ? icon : null}
    </span>
  );
};

const renderImage = (block: PageBlockV2) => {
  const src = sanitizeAuthoringMediaUrl(block.props.src) ?? "";
  const alt = readText(block.props.alt);
  const caption = readText(block.props.caption);
  // Style-target contract: radius/border/shadow must clip the picture itself,
  // not the frame around it, so the visual style surface lands on the img
  // (or its empty-state placeholder), never on the block frame.
  const elementStyle = toPageBlockElementStyle(block);
  if (!src) {
    return (
      <div
        className="flex min-h-48 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500"
        style={elementStyle}
        {...pageBlockElementDataAttributes}
      >
        Image
      </div>
    );
  }
  return (
    <figure className="space-y-2">
      <img
        className={joinPageRenderClasses("w-full rounded", pageImageFitClass(block.props.fit))}
        style={elementStyle}
        {...pageBlockElementDataAttributes}
        src={src}
        alt={alt}
        loading="lazy"
      />
      {caption ? <figcaption className="text-sm text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
};

type PageGalleryItem = {
  src: string;
  alt: string;
  caption: string;
  // ── TASK-534 ── space-joined single-token category set (present-only). This
  // render-side shape is SEPARATE from the model item shape (534-01-L01); both
  // carry the field because `toGalleryItem` rebuilds the item and drops unknown keys.
  category?: string;
};

// ── TASK-534 ── a gallery category is a SINGLE token, NO space (534-01-L01): the
// runtime filter treats `data-category` as a space-separated SET, so a space must
// not live inside one category token.
const PAGE_GALLERY_CATEGORY_TOKEN = /^[\w-]{1,48}$/;

const readGalleryItemText = (item: Record<string, unknown>, ...keys: string[]): string => {
  for (const key of keys) {
    const value = item[key];
    if (isRecord(value)) {
      const nested = readText(value.src) || readText(value.url) || readText(value.alt);
      if (nested) return nested;
      continue;
    }
    const text = readText(value);
    if (text) return text;
  }
  return "";
};

const toGalleryItem = (value: unknown): PageGalleryItem | null => {
  if (typeof value === "string") {
    const src = sanitizeAuthoringMediaUrl(value) ?? "";
    return src ? { src, alt: "", caption: "" } : null;
  }
  if (!isRecord(value)) return null;
  const src =
    sanitizeAuthoringMediaUrl(readGalleryItemText(value, "src", "url", "image", "assetUrl")) ?? "";
  const alt = readGalleryItemText(value, "alt", "title", "label", "name");
  const caption = readGalleryItemText(value, "caption", "title", "label", "name", "description");
  if (!src && !caption) return null;
  // ── TASK-534 ── re-sanitize the item category per space-split token (defence in
  // depth); keep valid single tokens, re-join with a space; undefined ⇒ no category
  // survives to the figure (present-only, so a bad/absent value never breaks out).
  const catTokens = readGalleryItemText(value, "category")
    .split(/\s+/)
    .filter((token) => PAGE_GALLERY_CATEGORY_TOKEN.test(token));
  const category = catTokens.length ? catTokens.join(" ") : undefined;
  return { src, alt, caption, ...(category ? { category } : {}) };
};

const pageGalleryGridClass = (layout: unknown) => {
  if (layout === "carousel") return "flex gap-4 overflow-x-auto";
  if (layout === "masonry") return "columns-1 gap-4 md:columns-3";
  return "grid gap-4 md:grid-cols-3";
};

const pageGalleryItemClass = (layout: unknown) =>
  layout === "carousel" ? "min-w-64 flex-1" : "break-inside-avoid";

const renderGallery = (block: PageBlockV2) => {
  const layout =
    block.props.layout === "carousel" || block.props.layout === "masonry"
      ? block.props.layout
      : "grid";
  const items = (Array.isArray(block.props.items) ? block.props.items : [])
    .map(toGalleryItem)
    .filter((item): item is PageGalleryItem => Boolean(item));

  if (items.length === 0) {
    return (
      <div
        className="rounded border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500"
        data-page-gallery-empty="true"
      >
        Empty gallery
      </div>
    );
  }

  // ── TASK-534 ── present-only filter. Re-validate at the render boundary (never
  // trust stored): `filterable` boolean; categories re-sanitized per single token
  // (NO space) so a value that bypassed the write path can never break out of the
  // `data-category`/`data-filter` attribute. Unset ⇒ byte-identical to pre-534.
  const filterable = block.props.filterable === true;
  const categories = filterable
    ? [
        ...new Set(
          (Array.isArray(block.props.filterCategories) ? block.props.filterCategories : []).filter(
            (c): c is string => typeof c === "string" && PAGE_GALLERY_CATEGORY_TOKEN.test(c)
          )
        ),
      ].slice(0, 12)
    : [];

  const grid = (
    <div
      className={pageGalleryGridClass(layout)}
      data-page-gallery="true"
      data-page-gallery-layout={layout}
    >
      {items.map((item, index) => {
        // Re-sanitize the item category at render (defence in depth). An item may
        // hold MULTIPLE space-joined single-token categories → validate PER token.
        const rawCat = typeof item.category === "string" ? item.category : "";
        const catTokens = rawCat
          .split(/\s+/)
          .filter((token) => PAGE_GALLERY_CATEGORY_TOKEN.test(token));
        const cat = catTokens.length ? catTokens.join(" ") : undefined;
        return (
          <figure
            key={`${block.id}-gallery-${index}`}
            className={joinPageRenderClasses(
              "overflow-hidden rounded border border-slate-200 bg-[var(--coderso-block-surface,#ffffff)]",
              pageGalleryItemClass(layout)
            )}
            data-page-gallery-item="true"
            {...(filterable ? { "data-filter-item": "true" } : {})}
            {...(filterable && cat ? { "data-category": cat } : {})}
          >
            {item.src ? (
              <img
                className="aspect-[4/3] w-full object-cover"
                src={item.src}
                alt={item.alt}
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500">
                {item.caption}
              </div>
            )}
            {item.caption ? (
              <figcaption className="px-4 py-3 text-sm text-[var(--coderso-block-text,#475569)]">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );

  // Present-only: no filter bar unless authored AND at least one valid category.
  if (!filterable || categories.length === 0) return grid;

  // TASK-534 accessibility (534 audit remediation): a filter chip group is a set of
  // toggle buttons, NOT a single-select tablist over one panel. It is rendered as a
  // role="toolbar" of `aria-pressed` toggle buttons (the semantically honest pattern)
  // rather than an incomplete role="tab"/tablist (which promises aria-controls +
  // tabpanel + roving-tab semantics we do not — and should not — fulfil here). The
  // toolbar carries roving tabindex (active chip = 0, rest = -1) matched by the
  // runtime's ArrowLeft/Right/Home/End handler (534-01-L03).
  return (
    <div data-gallery="true">
      <div
        role="toolbar"
        aria-label="Filter gallery"
        aria-orientation="horizontal"
        data-gallery-filter="true"
        className="cx-gallery-filter"
      >
        <button
          type="button"
          data-filter="all"
          aria-pressed="true"
          tabIndex={0}
          className="cx-filter-chip"
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            data-filter={category}
            aria-pressed="false"
            tabIndex={-1}
            className="cx-filter-chip"
          >
            {category}
          </button>
        ))}
      </div>
      {grid}
    </div>
  );
};

const renderInertDataBoundBlock = (
  type: "collection" | "filters" | "form" | "embed",
  message: string
) => (
  <div
    className="rounded border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
    data-page-block-inert={type}
  >
    {message}
  </div>
);

const getRuntimeBinding = <Kind extends PageRuntimeDataBinding["kind"]>(
  block: PageBlockV2,
  context: PageBlockRenderContext,
  kind: Kind
): Extract<PageRuntimeDataBinding, { kind: Kind }> | null => {
  const binding = context.runtimeDataByBlockId?.[block.id];
  return binding?.kind === kind
    ? (binding as Extract<PageRuntimeDataBinding, { kind: Kind }>)
    : null;
};

const renderCollectionBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const binding = getRuntimeBinding(block, context, "collection");
  const isCanvas = context.layoutMode === "canvas-device";
  if (!binding) {
    if (isCanvas) {
      // Editor canvas without preview data (TASK-457): an unset contentTypeId
      // asks the author to pick a content type; a set contentTypeId without a
      // binding yet means the editor-provided preview data is still
      // resolving. Runtime paths never reach this branch (layoutMode stays
      // "runtime").
      const contentTypeId = readText(block.props.contentTypeId);
      return renderInertDataBoundBlock(
        "collection",
        contentTypeId
          ? "Loading collection preview..."
          : "Pick a content type in the Content panel to preview entries here."
      );
    }
    return renderInertDataBoundBlock("collection", "Collection content is not available yet.");
  }
  if (binding.data.resolved?.error) {
    // Fail closed identically on canvas and runtime: dangling references
    // never render a fake listing (the Content panel marks the dangling id).
    return renderInertDataBoundBlock("collection", "Collection content is not available yet.");
  }
  // TASK-459-03: the binding resolves the listing template's cardVariant to
  // the effective list variant; absent template keeps today's grid render.
  const listing = (
    <ContentListBlock data={binding.data} variant={binding.variant ?? "grid"} blockId={block.id} />
  );
  if (isCanvas) {
    // Canvas-safe preview (TASK-457): the author sees the exact shared
    // listing markup the front renders, with pointer events off so entry
    // links and pagination affordances never navigate inside the canvas.
    return (
      <div className="pointer-events-none min-w-0" data-page-editor-collection-preview="inert">
        {listing}
      </div>
    );
  }
  return listing;
};

/**
 * Filters block renderer (TASK-459-02): reuses the shared `listing-filters`
 * facet markup on the v2 pipeline. The outer wrapper carries the SAME
 * fetch-swap hooks the collection listing markup ships
 * (`data-listing-query-id` + `data-listing-block-id`), so the runtime client
 * script swaps the result count together with the facet form. The form itself
 * is a plain GET form — without JS a submit reloads the page with `lq.*`
 * params the server already honors.
 */
const renderFiltersBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const binding = getRuntimeBinding(block, context, "filters");
  const isCanvas = context.layoutMode === "canvas-device";
  if (isCanvas) {
    const queryId = readText(block.props.queryId);
    if (!queryId) {
      return renderInertDataBoundBlock(
        "filters",
        "Pick a saved query in the Content panel to preview filters here."
      );
    }
    // Canvas-safe preview: the configured facet form renders from the block
    // props alone (no live filtering, counts stay 0) with pointer events off,
    // mirroring the collection block's inert-canvas discipline.
    return (
      <div className="pointer-events-none min-w-0" data-page-editor-filters-preview="inert">
        <ListingFiltersBlock
          data={mapPageFiltersBlockToListingFiltersData(block)}
          variant={readPageFiltersBlockLayout(block)}
          blockId={`${block.id}-form`}
          withRuntimeScript={false}
        />
      </div>
    );
  }
  if (!binding || binding.data.resolved?.error) {
    // Fail closed identically to the collection block: an unresolved or
    // dangling saved query never renders a fake filter form.
    return renderInertDataBoundBlock("filters", "Filters are not available yet.");
  }
  const listingQueryId = binding.data.listingQueryId ?? "";
  if (!listingQueryId) {
    return renderInertDataBoundBlock("filters", "Filters are not available yet.");
  }
  const showCount = readBoolean(block.props.showCount, true);
  return (
    <div
      className="min-w-0"
      data-page-filters-block="true"
      data-listing-block-id={block.id}
      data-listing-query-id={listingQueryId}
    >
      {showCount ? (
        <p
          className="px-4 text-sm font-medium text-[var(--coderso-block-text,#334155)]"
          data-page-filters-count={binding.total}
        >
          {binding.total === 1 ? "1 result" : `${binding.total} results`}
        </p>
      ) : null}
      <ListingFiltersBlock
        data={binding.data}
        variant={readPageFiltersBlockLayout(block)}
        blockId={`${block.id}-form`}
        withRuntimeScript={false}
      />
    </div>
  );
};

const mapFormBindingToEmbedData = (
  block: PageBlockV2,
  binding: PageRuntimeFormBinding
): FormEmbedData => {
  const title =
    readText(block.props.title) || binding.title || binding.resolution.formName || "Form";
  return {
    formId: binding.formId,
    title,
    description: binding.resolution.description ?? "",
    successMessage: binding.resolution.successMessage ?? undefined,
    resolved: {
      formId: binding.resolution.formId,
      formName: binding.resolution.formName,
      description: binding.resolution.description,
      status: binding.resolution.status,
      successMessage: binding.resolution.successMessage,
      successRedirectUrl: binding.resolution.successRedirectUrl,
      submissionAccess: binding.resolution.submissionAccess,
      submissionNonce: binding.resolution.submissionNonce,
      ...(binding.resolution.botProtection
        ? { botProtection: binding.resolution.botProtection }
        : {}),
      settings: {
        layoutMode: binding.resolution.settings.layoutMode,
        saveProgress: binding.resolution.settings.saveProgress,
        stepTitles: binding.resolution.settings.stepTitles,
        // TASK-516-06: present-only theme passthrough. `binding.resolution.settings`
        // IS the full FormSettings (formRuntimeContract.ts:34) and carries `theme`
        // after 516-01's normalizeFormSettings. Un-themed forms ⇒ spread is `{}` ⇒
        // byte-identical to the pre-516 markup; themed forms reach the widget so the
        // public embed can inherit the form theme (formEmbed reads it via
        // `resolved.settings.theme`, not resolveFormTheme, to preserve present-only).
        ...(binding.resolution.settings.theme ? { theme: binding.resolution.settings.theme } : {}),
      },
      fields: binding.resolution.fields,
      ...(binding.resolution.error ? { error: binding.resolution.error } : {}),
    },
  };
};

const renderFormBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const binding = getRuntimeBinding(block, context, "form");
  const isCanvas = context.layoutMode === "canvas-device";
  if (!binding) {
    if (isCanvas) {
      // Editor canvas without preview data (TASK-456): an unset formId asks
      // the author to pick a form; a set formId without a binding yet means
      // the editor-provided preview data is still resolving. Runtime paths
      // never reach this branch (layoutMode stays "runtime").
      const formId = readText(block.props.formId);
      return renderInertDataBoundBlock(
        "form",
        formId ? "Loading form preview..." : "Pick a form in the Content panel to preview it here."
      );
    }
    const title = readText(block.props.title);
    return renderInertDataBoundBlock(
      "form",
      title ? `${title} is not available yet.` : "Form is not available yet."
    );
  }
  const embed = (
    <FormEmbedBlock data={mapFormBindingToEmbedData(block, binding)} variant="standard" />
  );
  if (isCanvas) {
    // Canvas-safe preview (TASK-456): the author sees the exact shared form
    // markup the front renders, but with every control disabled and pointer
    // events off, so the canvas never submits, focuses, or navigates. The
    // editor-provided preview binding also carries no submission nonce.
    return (
      <fieldset
        disabled
        className="pointer-events-none min-w-0 border-0 p-0"
        data-page-editor-form-preview="inert"
      >
        {embed}
      </fieldset>
    );
  }
  return embed;
};

type SanitizedEmbedElementFrame = {
  tagName: string;
  rawAttrs: string;
  children: ReactNode[];
  key: number;
};

const toSanitizedEmbedElementProps = (
  tagName: string,
  rawAttrs: string,
  key: number
): Record<string, string | number> => {
  if (tagName !== "a") return { key };
  const attrs = parseHtmlAttributes(rawAttrs);
  const href = attrs.get("href");
  const rel = attrs.get("rel");
  const target = attrs.get("target");
  return {
    key,
    ...(href ? { href } : {}),
    ...(rel ? { rel } : {}),
    ...(target ? { target } : {}),
  };
};

const createSanitizedEmbedElement = (frame: SanitizedEmbedElementFrame) =>
  createElement(
    frame.tagName,
    toSanitizedEmbedElementProps(frame.tagName, frame.rawAttrs, frame.key),
    ...frame.children
  );

const renderSanitizedEmbedHtml = (sanitizedHtml: string): ReactNode[] => {
  const roots: ReactNode[] = [];
  const stack: SanitizedEmbedElementFrame[] = [];
  let nextKey = 0;

  const appendNode = (node: ReactNode) => {
    const parent = stack.at(-1);
    if (parent) {
      parent.children.push(node);
      return;
    }
    roots.push(node);
  };

  for (const token of tokenizeHtml(sanitizedHtml)) {
    if (token.kind === "text") {
      appendNode(decodeHtmlEntities(token.value));
      continue;
    }
    if (token.kind === "comment" || !pageEmbedAllowedTags.has(token.name)) continue;

    if (token.closing) {
      const current = stack.at(-1);
      if (current?.tagName === token.name) {
        stack.pop();
        appendNode(createSanitizedEmbedElement(current));
      }
      continue;
    }

    if (token.selfClosing || pageEmbedSelfClosingTags.has(token.name)) {
      appendNode(
        createElement(
          token.name,
          toSanitizedEmbedElementProps(token.name, token.rawAttrs, nextKey++)
        )
      );
      continue;
    }

    stack.push({ tagName: token.name, rawAttrs: token.rawAttrs, children: [], key: nextKey++ });
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (current) appendNode(createSanitizedEmbedElement(current));
  }

  return roots;
};

const renderEmbedBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const binding = getRuntimeBinding(block, context, "embed");
  if (!binding) {
    return renderInertDataBoundBlock("embed", "Embed content is not available yet.");
  }
  const iframeSrc = sanitizeAuthoringMediaUrl(binding.iframeSrc);
  if (iframeSrc) {
    return (
      <div
        className="overflow-hidden rounded-lg border bg-black/5"
        data-page-embed-provider="youtube"
      >
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={iframeSrc}
            loading="lazy"
            title={binding.iframeTitle}
            className="absolute inset-0 h-full w-full border-0"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }
  if (binding.sanitizedHtml) {
    return (
      <div className="prose max-w-none" data-page-embed-html="sanitized">
        {renderSanitizedEmbedHtml(binding.sanitizedHtml)}
      </div>
    );
  }
  return renderInertDataBoundBlock("embed", "Embed content is not available yet.");
};

const isListLinkItem = (value: unknown): value is { label: string; href: string } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { label?: unknown }).label === "string" &&
  typeof (value as { href?: unknown }).href === "string";

const renderList = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const items = Array.isArray(block.props.items) ? block.props.items : [];
  const children = items.map((item, index) => {
    const label = isListLinkItem(item) ? item.label : readText(item);
    const href = isListLinkItem(item) ? (sanitizeAuthoringLinkHref(item.href) ?? "") : "";
    return (
      <li key={`${block.id}-${index}`}>
        {href ? (
          <a
            className="font-medium text-[var(--coderso-block-text,#1f2937)] underline-offset-4 hover:underline"
            href={href}
          >
            {label}
          </a>
        ) : (
          // Link items stay panel-only; only plain string items expose the
          // inline-edit hook (the contract fails closed for object items).
          renderBlockText(block, `items.${index}`, label, context)
        )}
      </li>
    );
  });
  const listStyle = toPageBlockTypographyStyle(block);
  return readBoolean(block.props.ordered, false) ? (
    <ol
      className="list-decimal space-y-2 pl-6 text-[var(--coderso-block-text,#334155)]"
      style={listStyle}
      {...pageBlockTextDataAttributes}
    >
      {children}
    </ol>
  ) : (
    <ul
      className="list-disc space-y-2 pl-6 text-[var(--coderso-block-text,#334155)]"
      style={listStyle}
      {...pageBlockTextDataAttributes}
    >
      {children}
    </ul>
  );
};

const createChildBlockPath = (
  parentPath: PageBlockPath,
  slotKey: PageBlockSlotKey,
  index: number
): PageBlockPath => [...parentPath, { slotKey, index }] as PageBlockPath;

const pageColumnsSlotGridStyle = (block: PageBlockV2): CSSProperties => {
  const count = Math.max(1, Math.min(4, Math.trunc(readNumber(block.props.count, 2))));
  const distribution = block.props.distribution === "auto" ? "auto" : "equal";
  return {
    gap: `${readNumber(block.props.gap, 24)}px`,
    gridTemplateColumns:
      distribution === "auto"
        ? `repeat(${count}, minmax(0, auto))`
        : `repeat(${count}, minmax(0, 1fr))`,
  };
};

const renderPageBlockList = (
  blocks: readonly PageBlockV2[],
  context: Omit<PageBlockRenderContext, "blockPath" | "depth" | "slotKey" | "parentBlock"> & {
    parentPath: PageBlockPath;
    depth: number;
    slotKey: PageBlockSlotKey;
    parentBlock: PageBlockV2;
  }
) => {
  const visibleBlocks = context.includeHiddenBlocks
    ? blocks
    : blocks.filter((block) => block.visibility.visible);
  return visibleBlocks.map((block, index) =>
    renderPageBlockWithFrame(block, {
      blockPath: createChildBlockPath(context.parentPath, context.slotKey, index),
      depth: context.depth,
      includeHiddenBlocks: context.includeHiddenBlocks,
      renderBlockFrame: context.renderBlockFrame,
      renderInlineText: context.renderInlineText,
      renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
      runtimeDataByBlockId: context.runtimeDataByBlockId,
      layoutMode: context.layoutMode,
      slotKey: context.slotKey,
      parentBlock: context.parentBlock,
    })
  );
};

const renderSlotWrapper = ({
  block,
  slotKey,
  children,
  className,
  style,
}: {
  block: PageBlockV2;
  slotKey: PageBlockSlotKey;
  children: ReactNode;
  className: string;
  style?: CSSProperties;
}) => (
  <div
    className={className}
    style={style}
    data-page-block-slot={slotKey}
    data-page-block-slot-owner={block.id}
  >
    {children}
  </div>
);

/**
 * TASK-522-05-L04 — the seamless marquee's decorative DUPLICATE track frame. It
 * re-applies the block's VISUAL frame styling (className + style) so the ticker
 * copy looks identical, but emits NO `data-block-id` / selection chrome, so each
 * item's `data-block-id` matches exactly ONE DOM node in the builder canvas
 * (finding 3). NOTE: the leaf pseudocode passed `renderBlockFrame: undefined`
 * here, but that falls through to the runtime `PageBlockFrame`, which DOES emit
 * `data-block-id` (defeating the stated invariant); a styling-only frameless copy
 * is the faithful realization of that intent — no duplicate selection targets.
 */
const renderMarqueeCopyFrame: PageBlockFrameRenderer = ({ content, renderProps }) => (
  <div className={renderProps.className} style={renderProps.style}>
    {content}
  </div>
);

const renderPageLayoutBlockContent = (
  block: PageBlockV2,
  context: PageBlockRenderContext
): ReactNode => {
  const slotKeys = getPageBlockActiveSlotKeys(block);
  if (slotKeys.length === 0) return null;

  // Layered canvas (TASK-522-05-L02): a layout block with style.composition ===
  // "layered" becomes a positioning context (data-composition="layered" already
  // stamped on the block FRAME by the 522-03 resolver + position:relative from
  // 522-01-L04 CSS), so its slot children — each carrying data-layer +
  // --layer-x/y/z from the frame resolver — position absolutely. Render the SAME
  // slot lists through a plain (NON flex/grid) pass-through wrapper so the flow
  // track styles do not fight the absolute children. "flow"/unset falls through
  // to the byte-identical columns/group/default flow branches below.
  if (block.style?.composition === "layered") {
    return (
      <div className="cx-layered-canvas" data-page-layout-block={block.type}>
        {slotKeys.map((slotKey) => (
          <FragmentLike key={slotKey}>
            {renderSlotWrapper({
              block,
              slotKey,
              className: "cx-layered-slot",
              children: renderPageBlockList(block.slots?.[slotKey] ?? [], {
                parentPath: context.blockPath,
                depth: context.depth + 1,
                includeHiddenBlocks: context.includeHiddenBlocks,
                renderBlockFrame: context.renderBlockFrame,
                renderInlineText: context.renderInlineText,
                renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
                runtimeDataByBlockId: context.runtimeDataByBlockId,
                layoutMode: context.layoutMode,
                slotKey,
                parentBlock: block,
              }),
            })}
          </FragmentLike>
        ))}
      </div>
    );
  }

  if (block.type === "columns") {
    return (
      <div
        className="grid w-full"
        style={pageColumnsSlotGridStyle(block)}
        data-page-layout-block="columns"
        data-page-layout-columns-count={slotKeys.length}
      >
        {slotKeys.map((slotKey) => {
          const slotChildren = block.slots?.[slotKey] ?? [];
          return (
            <FragmentLike key={slotKey}>
              {renderSlotWrapper({
                block,
                slotKey,
                className: "min-w-0 space-y-4",
                children: (
                  <>
                    {renderPageBlockList(slotChildren, {
                      parentPath: context.blockPath,
                      depth: context.depth + 1,
                      includeHiddenBlocks: context.includeHiddenBlocks,
                      renderBlockFrame: context.renderBlockFrame,
                      renderInlineText: context.renderInlineText,
                      renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
                      runtimeDataByBlockId: context.runtimeDataByBlockId,
                      layoutMode: context.layoutMode,
                      slotKey,
                      parentBlock: block,
                    })}
                    {context.renderColumnsSlotTrailing?.({
                      block,
                      slotKey,
                      ownerPath: context.blockPath,
                      childCount: slotChildren.length,
                    })}
                  </>
                ),
              })}
            </FragmentLike>
          );
        })}
      </div>
    );
  }

  const slotKey = slotKeys[0]!;
  if (block.type === "group") {
    // Marquee/ticker (TASK-522-05-L04): when style.marquee is set (a speed
    // present), render the group's slot children inside a
    // .cx-marquee-viewport > .cx-marquee-track strip. The block FRAME already
    // carries data-marquee + --marquee-speed + data-marquee-dir (522-03
    // resolver); the animation binds .cx-marquee-track by CLASS (522-01-L04) so
    // the overflow:hidden viewport stays put while the track scrolls. When
    // `seamless`, a SECOND aria-hidden track is rendered WITHOUT block frames
    // (renderBlockFrame omitted) so the decorative copy carries NO
    // [data-block-id] / selection chrome in the builder canvas. No marquee ⇒
    // the flow flex branch below stays byte-identical.
    const marquee = block.style?.marquee;
    if (marquee) {
      const renderTrackChildren = (frame: boolean) =>
        renderPageBlockList(block.slots?.[slotKey] ?? [], {
          parentPath: context.blockPath,
          depth: context.depth + 1,
          includeHiddenBlocks: context.includeHiddenBlocks,
          // Primary track keeps the real (canvas or runtime) frame so items stay
          // selectable/targetable; the seamless copy uses the decorative frame
          // (styling only, NO data-block-id) so it is not a duplicate selection
          // target (finding 3).
          renderBlockFrame: frame ? context.renderBlockFrame : renderMarqueeCopyFrame,
          renderInlineText: context.renderInlineText,
          renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
          runtimeDataByBlockId: context.runtimeDataByBlockId,
          layoutMode: context.layoutMode,
          slotKey,
          parentBlock: block,
        });
      return (
        <div className="cx-marquee-viewport">
          <div className="cx-marquee-track">{renderTrackChildren(true)}</div>
          {marquee.seamless ? (
            <div className="cx-marquee-track" aria-hidden="true">
              {renderTrackChildren(false)}
            </div>
          ) : null}
        </div>
      );
    }
    const direction = block.props.direction === "row" ? "row" : "column";
    return renderSlotWrapper({
      block,
      slotKey,
      className: joinPageRenderClasses(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        readBoolean(block.props.wrap, false) ? "flex-wrap" : undefined
      ),
      style: { gap: `${readNumber(block.props.gap, 16)}px` },
      children: renderPageBlockList(block.slots?.[slotKey] ?? [], {
        parentPath: context.blockPath,
        depth: context.depth + 1,
        includeHiddenBlocks: context.includeHiddenBlocks,
        renderBlockFrame: context.renderBlockFrame,
        renderInlineText: context.renderInlineText,
        renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
        runtimeDataByBlockId: context.runtimeDataByBlockId,
        layoutMode: context.layoutMode,
        slotKey,
        parentBlock: block,
      }),
    });
  }

  return renderSlotWrapper({
    block,
    slotKey,
    className: "space-y-4",
    children: renderPageBlockList(block.slots?.[slotKey] ?? [], {
      parentPath: context.blockPath,
      depth: context.depth + 1,
      includeHiddenBlocks: context.includeHiddenBlocks,
      renderBlockFrame: context.renderBlockFrame,
      renderInlineText: context.renderInlineText,
      renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
      runtimeDataByBlockId: context.runtimeDataByBlockId,
      layoutMode: context.layoutMode,
      slotKey,
      parentBlock: block,
    }),
  });
};

export const renderPageBlockContent = (
  block: PageBlockV2,
  context: PageBlockRenderContext = {
    blockPath: [{ index: 0 }] as PageBlockPath,
    depth: 1,
    includeHiddenBlocks: false,
  }
): ReactNode => {
  if (!block.visibility.visible) return null;

  switch (block.type) {
    case "container":
    case "columns":
    case "group":
      return renderPageLayoutBlockContent(block, context);
    case "heading":
      return renderHeading(block, context);
    case "text":
      return renderTextBlock(block, context);
    case "badge":
      return renderBadgeBlock(block);
    case "button": {
      const href = sanitizeAuthoringLinkHref(block.props.href) ?? "#";
      const variant = readButtonVariant(block.props.variant);
      const size = readButtonSize(block.props.size);
      return (
        <a
          className={joinPageRenderClasses(
            "inline-flex w-fit items-center justify-center rounded font-semibold",
            pageButtonSizeClass(size, variant),
            pageButtonVariantClass(variant)
          )}
          // Style-target contract: the anchor IS the button the user styles,
          // so the visual style surface lands here, not on the block frame.
          style={toPageButtonElementStyle(block, variant)}
          {...pageBlockElementDataAttributes}
          href={href}
          target={toHrefTarget(block.props.target)}
          rel={block.props.target === "blank" ? "noreferrer" : undefined}
        >
          {renderBlockText(block, "label", readText(block.props.label, "Learn more"), context)}
        </a>
      );
    }
    case "image":
      return renderImage(block);
    case "video": {
      const src = sanitizeAuthoringMediaUrl(block.props.src) ?? "";
      const title = readText(block.props.title);
      const autoplay = readBoolean(block.props.autoplay, false);
      return src ? (
        <video
          className="w-full rounded"
          src={src}
          title={title || undefined}
          aria-label={title || undefined}
          controls
          autoPlay={autoplay || undefined}
          muted={readBoolean(block.props.muted, true) || autoplay}
          playsInline={autoplay || undefined}
        />
      ) : (
        <div className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Video
        </div>
      );
    }
    case "list":
      return renderList(block, context);
    case "card": {
      // Card paints two text nodes; only explicitly set typography fields are
      // emitted, so unset fields keep each node's own baked scale.
      const cardTypography = toPageBlockTypographyStyle(block);
      const image = sanitizeAuthoringMediaUrl(block.props.image);
      const href = sanitizeAuthoringLinkHref(block.props.href);
      const title = readText(block.props.title, "Card title");
      const titleNode = href ? (
        <a href={href} className="hover:underline">
          {title}
        </a>
      ) : (
        title
      );
      return (
        <article className="overflow-hidden rounded border border-slate-200 bg-[var(--coderso-block-surface,#ffffff)] shadow-sm">
          {image ? <img className="aspect-video w-full object-cover" src={image} alt="" /> : null}
          <div className="p-5">
            <h3
              className="text-lg font-semibold text-[var(--coderso-block-text,#020617)]"
              style={cardTypography}
              {...pageBlockTextDataAttributes}
            >
              {titleNode}
            </h3>
            <p
              className="mt-2 text-sm leading-6 text-[var(--coderso-block-text,#475569)]"
              style={cardTypography}
              {...pageBlockTextDataAttributes}
            >
              {readText(block.props.text)}
            </p>
          </div>
        </article>
      );
    }
    case "divider":
      return (
        <hr
          style={{
            borderColor: pageDividerToneBorderColor(block.props.tone),
            borderWidth: `${readNumber(block.props.thickness, 1)}px`,
          }}
        />
      );
    case "spacer":
      return <div aria-hidden="true" style={{ height: `${readNumber(block.props.size, 32)}px` }} />;
    case "statistic": {
      // Statistic paints three text nodes; explicit fields apply to all of
      // them while unset fields keep each node's own baked scale.
      const statisticTypography = toPageBlockTypographyStyle(block);
      return (
        <div className="rounded border border-slate-200 p-5">
          <div
            className="text-3xl font-semibold text-[var(--coderso-block-text,#020617)]"
            style={statisticTypography}
            {...pageBlockTextDataAttributes}
          >
            {renderBlockText(block, "value", readText(block.props.value, "0"), context)}
          </div>
          <div
            className="mt-1 text-sm font-medium text-[var(--coderso-block-text,#334155)]"
            style={statisticTypography}
            {...pageBlockTextDataAttributes}
          >
            {renderBlockText(block, "label", readText(block.props.label, "Metric"), context)}
          </div>
          <div
            className="mt-1 text-sm text-[var(--coderso-block-text,#64748b)]"
            style={statisticTypography}
            {...pageBlockTextDataAttributes}
          >
            {renderBlockText(block, "caption", readText(block.props.caption), context)}
          </div>
        </div>
      );
    }
    case "quote":
      return (
        <blockquote
          className="border-l-4 border-[var(--coderso-section-accent,#0d9488)] pl-5 text-lg leading-8 text-[var(--coderso-block-text,#334155)]"
          style={toPageBlockTypographyStyle(block)}
          {...pageBlockTextDataAttributes}
        >
          <p>{renderBlockTextMarks(block, "text", readText(block.props.text), context)}</p>
          {readText(block.props.cite) ? (
            <cite className="mt-3 block text-sm text-[var(--coderso-block-text,#64748b)]">
              {renderBlockText(block, "cite", readText(block.props.cite), context)}
            </cite>
          ) : null}
        </blockquote>
      );
    case "gallery":
      return renderGallery(block);
    case "collection":
      return renderCollectionBlock(block, context);
    case "filters":
      return renderFiltersBlock(block, context);
    case "form": {
      return renderFormBlock(block, context);
    }
    case "embed":
      return renderEmbedBlock(block, context);
    case "icon": {
      // Defence in depth — re-validate every prop at the render boundary (never
      // trust stored data): name → curated allowlist (`resolveAnimatedIconName`),
      // size/speed re-clamped, color re-sanitized (React SSR does NOT block
      // semicolon-delimited CSS injection inside a `style` value).
      const iconName = resolveAnimatedIconName(block.props.name);
      const iconAnimation = ((): AnimatedIconAnimation => {
        const value = block.props.animation;
        return typeof value === "string" &&
          (["none", "spin", "pulse", "bounce", "draw"] as readonly string[]).includes(value)
          ? (value as AnimatedIconAnimation)
          : "none";
      })();
      const iconSize = Math.max(
        ANIMATED_ICON_SIZE_CLAMP.min,
        Math.min(ANIMATED_ICON_SIZE_CLAMP.max, Math.trunc(readNumber(block.props.size, 48)))
      );
      const iconSpeed = Math.max(
        ANIMATED_ICON_SPEED_CLAMP.min,
        Math.min(ANIMATED_ICON_SPEED_CLAMP.max, Math.trunc(readNumber(block.props.speed, 1600)))
      );
      const iconColor = sanitizeAuthoringCssColor(block.props.color) ?? "var(--primary)";
      return (
        <>
          {/* Keyframe CSS rides WITH the block (block-scoped) so it is present in
              BOTH the front shell AND the builder canvas (the canvas bypasses
              PageDocumentRender). A keyed <style data-anim-icon-css> per icon block:
              React SSR duplicates are HARMLESS because the payload is a STATIC set of
              identical @keyframes/@media rules that dedupe in the browser CSSOM — no
              render-scoped Set exists on PageBlockRenderContext to force a single
              emit, and none is required. */}
          <style
            data-anim-icon-css
            dangerouslySetInnerHTML={{ __html: ANIMATED_ICON_KEYFRAMES_CSS }}
          />
          <AnimatedIcon
            name={iconName}
            animation={iconAnimation}
            size={iconSize}
            color={iconColor}
            speed={iconSpeed}
          />
        </>
      );
    }
    case "customSvg": {
      const props = block.props as {
        svg?: string;
        drawIn?: boolean;
        drawSpeed?: number;
        label?: string;
      };
      // Defence in depth: re-sanitize at render (do NOT trust the stored value
      // blindly). `sanitizeSvg` is ISOMORPHIC (TextEncoder byte count, no Node
      // `Buffer`) because this case ALSO runs in the browser builder canvas.
      let clean = sanitizeSvg(typeof props.svg === "string" ? props.svg : "");
      if (!clean) {
        // Neutral fallback (no injected markup) — a muted placeholder box.
        return (
          <span className="inline-block text-slate-400" aria-hidden="true">
            ▢
          </span>
        );
      }
      const { dataAttrs, cssVars } = resolveDrawInAttrs(props.drawIn, props.drawSpeed);
      if (props.drawIn) {
        // Length-INDEPENDENT draw-in: stamp `pathLength="1"` on every stroke shape
        // so the 522-01-L04 CSS (stroke-dasharray:1;stroke-dashoffset:1) completes
        // for ANY pasted SVG. `pathLength` is allowlisted in 522-01-L02, so this
        // survives a re-sanitize round-trip; a safe numeric-attr string inject on
        // the already-sanitized markup.
        clean = clean.replace(
          /<(path|line|polyline)\b(?![^>]*\bpathLength=)/gi,
          '<$1 pathLength="1"'
        );
      }
      return (
        <span
          role="img"
          aria-label={props.label || undefined}
          aria-hidden={props.label ? undefined : "true"}
          {...dataAttrs}
          style={cssVars as CSSProperties}
          // `clean` is allowlist-sanitized at write AND here; only SVG shape survives.
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      );
    }
    // ── TASK-534 ── segmented SWITCHER / TABS (absorbs 527). A real role="tablist"
    // with N tabs + N panels (child blocks from the panel:1..6 slots), stamping the
    // data-switcher contract the 534-01-L03 runtime binds. Progressive: no-JS ⇒ the
    // first panel is visible (resting `hidden` on the rest); the runtime toggles it.
    case "switcher": {
      // Re-validate at the render boundary (defence in depth — never trust stored):
      const tabs = Array.isArray(block.props.tabs) ? block.props.tabs : [];
      const variant: PageSwitcherVariant =
        block.props.variant === "underline" ? "underline" : "pill";
      const rawActive =
        typeof block.props.activeIndex === "number" && Number.isFinite(block.props.activeIndex)
          ? Math.trunc(block.props.activeIndex)
          : 0;
      const active = Math.max(0, Math.min(Math.max(0, tabs.length - 1), rawActive));
      const panelSlots = [
        "panel:1",
        "panel:2",
        "panel:3",
        "panel:4",
        "panel:5",
        "panel:6",
      ] as const;
      return (
        <div data-switcher="true" data-switcher-variant={variant}>
          <div
            role="tablist"
            aria-label="Content tabs"
            aria-orientation="horizontal"
            className={joinPageRenderClasses("cx-switcher-tabs", `cx-switcher-${variant}`)}
          >
            {tabs.map((tab, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                data-switcher-tab="true"
                id={`${block.id}-tab-${i}`}
                aria-controls={`${block.id}-panel-${i}`}
                aria-selected={i === active ? "true" : "false"}
                tabIndex={i === active ? 0 : -1}
                className="cx-switcher-tab"
              >
                {/* Escaped React TEXT node — an <img onerror> label is inert text. */}
                {String((tab as { label?: unknown })?.label ?? "")}
              </button>
            ))}
          </div>
          {tabs.map((_, i) => {
            const slotBlocks = block.slots?.[panelSlots[i]] ?? [];
            return (
              <div
                key={i}
                role="tabpanel"
                data-switcher-panel="true"
                id={`${block.id}-panel-${i}`}
                aria-labelledby={`${block.id}-tab-${i}`}
                data-active={i === active ? "true" : "false"}
                // TASK-534 a11y (APG Tabs): tabIndex=0 makes a panel whose authored
                // children may be entirely non-focusable (text/image/heading) reachable
                // by keyboard/SR after tab selection; harmless when it has focusable kids.
                tabIndex={0}
                hidden={i !== active}
              >
                {renderPageBlockList(slotBlocks, {
                  parentPath: context.blockPath,
                  depth: context.depth + 1,
                  includeHiddenBlocks: context.includeHiddenBlocks,
                  renderBlockFrame: context.renderBlockFrame,
                  renderInlineText: context.renderInlineText,
                  renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
                  runtimeDataByBlockId: context.runtimeDataByBlockId,
                  layoutMode: context.layoutMode,
                  slotKey: panelSlots[i],
                  parentBlock: block,
                })}
              </div>
            );
          })}
        </div>
      );
    }
    // ── TASK-534 ── hero scroll-hint indicator (CSS-keyframe dot/chevron, NO
    // runtime). Block-scoped keyframe CSS rides WITH the block (case "icon" :2287
    // pattern) so it works on BOTH the front shell AND the builder canvas. The
    // glyph is re-validated at render; the label is an escaped sr-only TEXT node.
    case "scrollHint": {
      const glyph = block.props.glyph === "chevron" ? "chevron" : "dot";
      const label = typeof block.props.label === "string" ? block.props.label : "Scroll";
      return (
        <>
          <style
            data-page-interactivity-css
            dangerouslySetInnerHTML={{ __html: INTERACTIVITY_KEYFRAMES_CSS }}
          />
          <div data-scroll-hint="true" className="cx-scroll-hint" aria-hidden="true">
            <span className="cx-hint-dot">{SCROLL_HINT_GLYPHS[glyph]}</span>
          </div>
          {label ? <span className="sr-only">{label}</span> : null}
        </>
      );
    }
    default:
      return null;
  }
};

const renderPageBlockWithFrame = (block: PageBlockV2, context: PageBlockRenderContext) => {
  if (!context.includeHiddenBlocks && !block.visibility.visible) return null;
  const s = splitBlockComposition(block.style);
  let content = renderPageBlockContent(block, context);
  if (s.needsInner) {
    // ONE inner wrapper carrying the transform-writing effect attrs (tilt/deco/
    // hover) + glare + block ambient-orbs. It is a DESCENDANT of the frame, so
    // the frame's --layer-* (incl. per-device) inherit down and the frame's
    // anchor translate stays isolated from this node's effect transform.
    content = (
      <div style={s.innerVars as CSSProperties} {...s.innerAttrs}>
        {s.glare ? <span className="cx-glare" aria-hidden="true" /> : null}
        {s.ambientOrbs ? (
          <>
            {/* ambient-orbs needs REAL child spans (glass/grid/glow self-paint
               via ::before/::after; orbs do not) — mirrors the section emit
               (522-05-L01). */}
            <span className="cx-orb cx-orb-a" aria-hidden="true" data-deco="drift" />
            <span
              className="cx-orb cx-orb-b"
              aria-hidden="true"
              data-deco="drift"
              style={{ "--deco-delay": "1500ms" } as CSSProperties}
            />
          </>
        ) : null}
        {content}
      </div>
    );
  }
  const renderProps = toPageBlockRenderProps(block);
  // TASK-528 whole-card tilt: the frame carries data-block-tilt (co-located with
  // data-surface), so CSS `perspective` must sit on an ANCESTOR — wrap the frame
  // in a [data-tilt-parent] perspective wrapper. Present-only: only when the block
  // authors tilt (`s.tiltParent`); otherwise the frame renders byte-identically.
  //
  // TASK-535 tilt + layer: when the block ALSO authors style.layer, the layer
  // placement (data-layer + data-layer-anchor + base --layer-x/y/z) is hoisted onto
  // THIS wrapper (splitBlockComposition → s.wrapperAttrs/s.wrapperVars). The
  // wrapper then IS the `[data-composition="layered"] [data-layer]` absolutely
  // positioned child, so its offsets resolve against the `.cx-layered-canvas` (not
  // the perspective containing block it would otherwise clobber), while the tilt
  // transform stays on the inner frame. Empty for every non-(tilt+layer) block →
  // the wrapper renders exactly as before.
  //
  // TASK-535 per-device layer: because the base `--layer-*` now live on the WRAPPER
  // (not the frame), and CSS custom props inherit DOWNWARD only, a per-device
  // `--layer-*` override on `[data-block-id]` (the child frame) could never reach
  // the wrapper. We stamp the block id onto the wrapper as `data-tilt-parent-for`
  // (present ONLY when the layer placement was hoisted here) so pageResponsiveCss
  // can retarget the per-device layer override at THIS wrapper. `data-block-id`
  // stays uniquely on the frame (selection chrome depends on that 1:1 mapping).
  const wrapperLayerId = "data-layer" in s.wrapperAttrs ? block.id : undefined;
  const withTiltParent = (frame: ReactNode): ReactNode =>
    s.tiltParent ? (
      <div
        data-tilt-parent=""
        {...(wrapperLayerId ? { [PAGE_TILT_PARENT_LAYER_ATTRIBUTE]: wrapperLayerId } : {})}
        style={{ perspective: "1200px", ...(s.wrapperVars as CSSProperties) }}
        {...s.wrapperAttrs}
      >
        {frame}
      </div>
    ) : (
      frame
    );
  if (context.renderBlockFrame) {
    return (
      <FragmentLike key={block.id}>
        {withTiltParent(
          context.renderBlockFrame({
            block,
            content,
            renderProps,
            blockPath: context.blockPath,
            depth: context.depth,
            slotKey: context.slotKey,
            parentBlock: context.parentBlock,
          })
        )}
      </FragmentLike>
    );
  }
  return (
    <FragmentLike key={block.id}>
      {withTiltParent(<PageBlockFrame block={block}>{content}</PageBlockFrame>)}
    </FragmentLike>
  );
};

export function PageBlockContent({ block }: { block: PageBlockV2 }) {
  return <>{renderPageBlockContent(block)}</>;
}

export function PageBlockFrame({ block, children }: { block: PageBlockV2; children: ReactNode }) {
  if (!block.visibility.visible) return null;
  const renderProps = toPageBlockRenderProps(block);
  return (
    <div
      className={renderProps.className}
      style={renderProps.style}
      {...renderProps.dataAttributes}
    >
      {children}
    </div>
  );
}

const defaultEmptySectionContent = (
  <div className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
    Empty section
  </div>
);

/** Scope hook consumed by the responsive CSS contract (`pageResponsiveCss`). */
const pageSectionContentDataAttributes = {
  [PAGE_SECTION_CONTENT_ATTRIBUTE]: "true",
} as const;

type PageSectionBlockRenderer = (block: PageBlockV2, index: number) => ReactNode;

const pageSectionMediaBlockTypes = new Set<PageBlockV2["type"]>(["image", "video", "gallery"]);

const isPageSectionMediaBlock = (block: PageBlockV2): boolean =>
  pageSectionMediaBlockTypes.has(block.type);

const renderMediaSplitPlaceholder = () => (
  <div
    className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500"
    data-page-media-split-empty="true"
  >
    Media
  </div>
);

const wrapSectionTemplateBlock = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate,
  block: PageBlockV2,
  index: number,
  rendered: ReactNode
): ReactNode => {
  if (!rendered) return rendered;

  if (template.template === "timeline") {
    return (
      <div
        key={`${section.id}-timeline-${block.id}`}
        className={joinPageRenderClasses(
          "relative min-w-0",
          template.variant === "horizontal"
            ? "grid gap-3 md:grid-rows-[auto_1fr]"
            : "grid grid-cols-[auto_minmax(0,1fr)] gap-4",
          template.variant === "compact" ? "py-2" : "py-3"
        )}
        data-page-timeline-item={index + 1}
      >
        <span
          className={joinPageRenderClasses(
            "mt-1 h-3 w-3 rounded-full ring-4 ring-white",
            template.variant === "horizontal" ? "justify-self-center" : undefined
          )}
          style={{ backgroundColor: "var(--coderso-section-accent,#0d9488)" }}
          data-page-timeline-marker="true"
        />
        <div
          className={joinPageRenderClasses(
            "min-w-0",
            template.variant === "horizontal" ? "text-center" : undefined
          )}
          data-page-timeline-content="true"
        >
          {rendered}
        </div>
      </div>
    );
  }

  if (template.template === "gallery") {
    return (
      <div
        key={`${section.id}-gallery-${block.id}`}
        className={joinPageRenderClasses(
          "min-w-0",
          template.variant === "cards"
            ? "overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            : undefined
        )}
        data-page-gallery-section-item={index + 1}
        data-page-gallery-section-variant={template.variant}
      >
        {rendered}
      </div>
    );
  }

  if (template.template === "faq") {
    return (
      <div
        key={`${section.id}-faq-${block.id}`}
        className={joinPageRenderClasses(
          "min-w-0 rounded-lg border border-slate-200 bg-white",
          template.variant === "compact" ? "px-4 py-3 shadow-none" : "p-5 shadow-sm"
        )}
        data-page-faq-item={index + 1}
        data-page-faq-variant={template.variant}
      >
        {rendered}
      </div>
    );
  }

  if (template.template === "testimonials") {
    return (
      <div
        key={`${section.id}-testimonial-${block.id}`}
        className={joinPageRenderClasses(
          "min-w-0",
          template.variant === "cards"
            ? "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            : undefined
        )}
        data-page-testimonial-item={index + 1}
        data-page-testimonial-variant={template.variant}
        {...(template.variant === "cards" ? { "data-page-testimonial-card": "true" } : {})}
      >
        {rendered}
      </div>
    );
  }

  return rendered;
};

const renderMediaSplitSectionChildren = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate,
  blocks: readonly PageBlockV2[],
  renderBlock: PageSectionBlockRenderer
): ReactNode => {
  const mediaBlocks: Array<{ block: PageBlockV2; index: number }> = [];
  const contentBlocks: Array<{ block: PageBlockV2; index: number }> = [];

  blocks.forEach((block, index) => {
    (isPageSectionMediaBlock(block) ? mediaBlocks : contentBlocks).push({ block, index });
  });

  const mediaZone = (
    <div
      key={`${section.id}-media-zone`}
      className="min-w-0 space-y-4"
      data-page-media-split-zone="media"
    >
      {mediaBlocks.length > 0
        ? mediaBlocks.map(({ block, index }) => renderBlock(block, index))
        : renderMediaSplitPlaceholder()}
    </div>
  );
  const contentZone = (
    <div
      key={`${section.id}-content-zone`}
      className={joinPageRenderClasses(
        "min-w-0 space-y-4",
        template.variant === "horizontal" ? "self-center" : undefined
      )}
      data-page-media-split-zone="content"
    >
      {contentBlocks.map(({ block, index }) => renderBlock(block, index))}
    </div>
  );

  return (
    <div
      className={joinPageRenderClasses(
        "contents",
        template.variant === "horizontal" ? "page-media-split-content-first" : undefined
      )}
      data-page-media-split={template.variant}
    >
      {template.variant === "horizontal" ? (
        <>
          {contentZone}
          {mediaZone}
        </>
      ) : (
        <>
          {mediaZone}
          {contentZone}
        </>
      )}
    </div>
  );
};

const renderTemplateSectionChildren = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate,
  blocks: readonly PageBlockV2[],
  renderBlock: PageSectionBlockRenderer,
  renderRawBlock: PageSectionBlockRenderer
): ReactNode => {
  if (template.template === "media-split" && template.variant !== "default") {
    return renderMediaSplitSectionChildren(section, template, blocks, renderRawBlock);
  }

  return blocks.map((block, index) =>
    wrapSectionTemplateBlock(section, template, block, index, renderBlock(block, index))
  );
};

export function PageSectionContent({
  section,
  emptyContent = defaultEmptySectionContent,
  renderBlockFrame,
  renderInlineText,
  renderColumnsSlotTrailing,
  renderSectionColumnTrailing,
  trailingContent,
  layoutMode = "runtime",
  includeHiddenBlocks = false,
  runtimeDataByBlockId,
}: {
  section: PageSectionV2;
  emptyContent?: ReactNode;
  renderBlockFrame?: PageBlockFrameRenderer;
  renderInlineText?: PageInlineTextRenderer;
  renderColumnsSlotTrailing?: PageColumnsSlotTrailingRenderer;
  /**
   * Admin-canvas hook (owner finding #5, round 3): per-column add affordance
   * painted at the bottom of every column wrapper stack when per-column
   * composition is active. Runtime render paths never provide it.
   */
  renderSectionColumnTrailing?: PageSectionColumnTrailingRenderer;
  /**
   * Admin-canvas hook (owner finding #5): rendered as an extra grid child
   * AFTER the last block, so in a multi-column auto-flow grid it lands in the
   * next free cell. Ignored while per-column composition is active (the
   * per-column trailing hook owns the add affordances there). Runtime render
   * paths never provide it (front parity).
   */
  trailingContent?: ReactNode;
  layoutMode?: PageSectionLayoutMode;
  includeHiddenBlocks?: boolean;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
}) {
  const renderProps = toPageSectionRenderProps(section, { layoutMode });
  const template = resolvePageSectionTemplate(section);
  const blocks = includeHiddenBlocks
    ? section.blocks
    : section.blocks.filter((block) => block.visibility.visible);
  const blockRenderContext = (index: number): PageBlockRenderContext => ({
    blockPath: [{ index }] as PageBlockPath,
    depth: 1,
    includeHiddenBlocks,
    renderBlockFrame,
    renderInlineText,
    renderColumnsSlotTrailing,
    runtimeDataByBlockId,
    layoutMode,
  });
  const renderBlockAtIndex = (block: PageBlockV2, index: number) =>
    renderPageBlockWithFrame(block, blockRenderContext(index));
  const renderWrappedBlockAtIndex = (block: PageBlockV2, index: number) =>
    wrapSectionTemplateBlock(
      section,
      template,
      block,
      index,
      renderPageBlockWithFrame(block, blockRenderContext(index))
    );
  // Per-column composition (owner finding #5, round 3): when the section
  // composes 2+ columns AND at least one rendered root block carries a
  // `style.column` assignment, blocks render inside one wrapper stack per
  // column (assigned blocks in their column, unassigned blocks in their
  // legacy auto-flow cell). When NO block is assigned, the auto-flow markup
  // below stays byte-identical to the pre-assignment contract — that is the
  // non-destructive guarantee for documents authored before this field.
  // The composition count deliberately ignores `stackVertical`: a collapsed
  // grid (stackVertical or the public `grid-cols-1` mobile class) stacks the
  // wrappers themselves, mirroring the front's media-query collapse.
  const compositionColumns = getPageSectionCompositionColumns(section);
  const columnComposition =
    compositionColumns >= 2 && blocks.length > 0 && pageSectionBlocksHaveColumnAssignments(blocks)
      ? distributePageSectionBlocksToColumns(blocks, compositionColumns)
      : null;
  return (
    <div
      className={renderProps.contentClassName}
      style={renderProps.style}
      {...pageSectionContentDataAttributes}
      data-page-section-layout-mode={layoutMode}
    >
      {columnComposition ? (
        columnComposition.map((members, columnIndex) => (
          <div
            key={`${section.id}-column-${columnIndex + 1}`}
            // One wrapper per composition column, each occupying one cell of
            // the section grid's first row. The inner grid inherits the
            // section gap (including responsive gap overrides on the content
            // element) so vertical rhythm matches the auto-flow rows, and
            // block-level `justify-self` alignment keeps working.
            className="grid min-w-0 content-start"
            style={{ gap: "inherit" }}
            data-page-section-column={columnIndex + 1}
            data-page-section-column-owner={section.id}
          >
            {members.map(({ block, index }) => renderWrappedBlockAtIndex(block, index))}
            {renderSectionColumnTrailing?.({
              section,
              column: columnIndex + 1,
              childCount: members.length,
            })}
          </div>
        ))
      ) : blocks.length > 0 ? (
        <>
          {renderTemplateSectionChildren(
            section,
            template,
            blocks,
            renderBlockAtIndex,
            renderBlockAtIndex
          )}
          {trailingContent}
        </>
      ) : (
        emptyContent
      )}
    </div>
  );
}

function FragmentLike({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function PageSectionRender({
  section,
  emptyContent,
  runtimeDataByBlockId,
}: {
  section: PageSectionV2;
  emptyContent?: ReactNode;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
}) {
  if (!section.visibility.visible) return null;
  const renderProps = toPageSectionRenderProps(section);
  // Section scroll effects (TASK-521-02): re-derive from section.style locally
  // and spread the extra data-attrs DIRECTLY on <section> (NOT through the
  // strict renderProps.dataAttributes, whose type has no index signature). The
  // 521-01 runtime (emitted once at the page root by 521-05) reads these.
  const scrollEffect = section.style.scrollEffect; // undefined | enum
  const parallax =
    scrollEffect === "parallax"
      ? Math.max(
          PAGE_PARALLAX_INTENSITY_CLAMP.min,
          Math.min(PAGE_PARALLAX_INTENSITY_CLAMP.max, section.style.parallaxIntensity ?? 20)
        )
      : undefined;
  const parallaxEnabled = parallax !== undefined;
  const effectDataAttrs: Record<string, string> = {
    ...(scrollEffect ? { "data-page-effect": scrollEffect } : {}),
    ...(parallax !== undefined ? { "data-parallax": String(parallax) } : {}),
  };
  // Section composition (TASK-522-05-L01): surface preset + layered composition
  // data-attrs + the write-validated `accent` glow retint custom props, DISJOINT
  // from 521-02's scrollEffect attrs above (additive). Present-only: empty for a
  // section with no 522 field ⇒ byte-identical to the pre-522 output.
  const sc = resolveSectionCompositionAttrs(section.style);
  // TASK-525-01-L01: full-bleed background box on the OUTER <section> (100vw
  // edge-to-edge) while the content div stays capped/centered at
  // layout.maxWidth. `undefined` for non-full-bleed → the <section> style is
  // byte-identical to the pre-525 output (composition cssVars only).
  const sectionBleedStyle = toPageSectionBleedStyle(section);
  const sectionCompositionStyle =
    Object.keys(sc.cssVars).length > 0 ? (sc.cssVars as CSSProperties) : undefined;
  const sectionStyle =
    sectionBleedStyle || sectionCompositionStyle
      ? { ...sectionBleedStyle, ...sectionCompositionStyle }
      : undefined;
  // ── TASK-534 ── present-only static grain overlay on the section surface. The
  // overlay is `inset:0` absolute, so the section must be a positioning context —
  // `[data-noise-host]{position:relative}` (INTERACTIVITY_KEYFRAMES_CSS) supplies it.
  const sectionNoise = section.style.noiseOverlay === true;
  return (
    <section
      id={section.visibility.anchor ?? undefined}
      className={renderProps.sectionClassName}
      style={sectionStyle}
      {...renderProps.dataAttributes}
      {...effectDataAttrs}
      {...sc.dataAttrs}
      {...(sectionNoise ? { "data-noise-host": "true" } : {})}
    >
      {sectionNoise ? (
        <>
          <style
            data-section-noise-css
            dangerouslySetInnerHTML={{ __html: INTERACTIVITY_KEYFRAMES_CSS }}
          />
          <div
            aria-hidden="true"
            data-noise-overlay="true"
            className="pointer-events-none absolute inset-0"
          />
        </>
      ) : null}
      {sc.ambientOrbs ? (
        <>
          <span className="cx-orb cx-orb-a" aria-hidden="true" data-deco="drift" />
          <span
            className="cx-orb cx-orb-b"
            aria-hidden="true"
            data-deco="drift"
            style={{ ["--deco-delay" as string]: "1500ms" } as CSSProperties}
          />
        </>
      ) : null}
      {parallaxEnabled ? (
        <div data-parallax-inner className="will-change-transform">
          <PageSectionContent
            section={section}
            emptyContent={emptyContent}
            runtimeDataByBlockId={runtimeDataByBlockId}
          />
        </div>
      ) : (
        <PageSectionContent
          section={section}
          emptyContent={emptyContent}
          runtimeDataByBlockId={runtimeDataByBlockId}
        />
      )}
    </section>
  );
}

const emptyDocumentContent = "This page has no content yet.";

export const resolvePageRenderTree = (
  document: PageDocumentV2,
  breakpoint: PageBreakpoint
): PageDocumentV2 => resolvePageDocumentForBreakpoint(document, breakpoint);

/**
 * TASK-521-05-L03 / TASK-523-02 — STATIC cursor-spotlight rule. Ships as a module
 * const (NOT a Tailwind arbitrary variant): the radial-gradient carries multiple
 * `var()` refs + raw commas, a fragile/unreliable JIT case we do NOT gamble on.
 * Scoped under `[data-page-spotlight]` so it is inert unless the root marker is
 * present.
 *
 * TASK-523-02 — Occlusion-proof. A NON-gated base rule lifts the overlay ABOVE
 * opaque section backgrounds and makes it ADD light without blocking
 * (`mix-blend-mode:screen` + `pointer-events:none`) — `position:fixed;inset:0`
 * pins it to the viewport. The radial-gradient (the moving glow itself) stays
 * inside the `@media (prefers-reduced-motion: no-preference)` gate so reduce users
 * get NO gradient. Reads only VALIDATED custom props off the root.
 *
 * Hard Invariant #4 / Acceptance Criteria #4: the overlay z-index is STRICTLY
 * BELOW the front sticky nav (`sticky z-40`, see navigation.tsx / widgetRenderer)
 * so screen-blend never tints the menu bar. The overlay and nav are sibling
 * children of the same root stacking context (`<Root>` forms no stacking
 * context), so `z-index:30` still paints above opaque section content but below
 * the nav. Do NOT raise this to/above 40 without owner re-approval of the
 * nav-tint tradeoff.
 *
 * Occlusion-proofing (TASK-523-02): the ONLY other author-controllable surface
 * in this same root stacking context is a layered-canvas `[data-layer]`, which
 * maps `layer.z` straight to `z-index` (pageCompositionEffects.tsx). Its bound
 * `PAGE_LAYER_Z_CLAMP.max` is capped STRICTLY BELOW 30 so no authored layer can
 * reach the overlay and hide the glow. If you change the overlay z-index, keep
 * `PAGE_LAYER_Z_CLAMP.max < overlay z-index < nav z-index (40)`.
 */
export const PAGE_SPOTLIGHT_CSS =
  "[data-page-spotlight] [data-page-spotlight-overlay]{" +
  "position:fixed;inset:0;z-index:30;" +
  "mix-blend-mode:screen;pointer-events:none}" +
  "@media (prefers-reduced-motion: no-preference){" +
  "[data-page-spotlight] [data-page-spotlight-overlay]{" +
  "background:radial-gradient(var(--spotlight-size,400px) at " +
  "var(--spotlight-x,50%) var(--spotlight-y,50%)," +
  "var(--spotlight-color,color-mix(in srgb,var(--primary) 14%,transparent))," +
  "transparent 70%)}" +
  "}";

/**
 * TASK-522-05-L01 — present-only scan for ANY authored 522 composition effect.
 * Drives the page-root composition `<style>` + widens 521-05's runtime `<script>`
 * emit predicate. A no-effect document returns false ⇒ nothing emitted ⇒
 * byte-identical to post-521 (Hard Invariant 9). Recurses through nested slots.
 */
const blockUsesCompositionEffect = (block: PageBlockV2): boolean => {
  const s = block.style;
  if (
    s &&
    (s.decoration != null ||
      (s.tilt != null && s.tilt !== "none") ||
      s.surfacePreset != null ||
      s.hoverEffect != null ||
      s.composition === "layered" ||
      s.marquee != null ||
      s.layer != null)
  ) {
    return true;
  }
  if (block.type === "customSvg" && block.props.drawIn === true) return true;
  if (block.slots) {
    for (const children of Object.values(block.slots)) {
      if (children) {
        for (const child of children) {
          if (blockUsesCompositionEffect(child)) return true;
        }
      }
    }
  }
  return false;
};

const docUsesCompositionEffects = (document: PageDocumentV2): boolean => {
  for (const section of document.sections) {
    const ss = section.style;
    if (ss && (ss.surfacePreset != null || ss.composition === "layered")) return true;
    for (const block of section.blocks) {
      if (blockUsesCompositionEffect(block)) return true;
    }
  }
  return false;
};

/**
 * TASK-535 — whether ANY section is full-bleed (template `full-width` OR the
 * author-toggled `style.fullBleed`, via the shared `isPageSectionFullBleed`
 * predicate). Full-bleed sections paint a FIXED-literal `width:100vw` bleed box
 * (`toPageSectionBleedStyle`); `100vw` counts the vertical-scrollbar gutter, so
 * on a scrolling page it is a few px WIDER than the content area and pushes a
 * spurious HORIZONTAL scrollbar. Present-only: gates an `overflow-x:clip` guard
 * on the page root so the 100vw bleed can never cause horizontal scroll. Empty
 * for a page with no full-bleed section ⇒ the root style stays byte-identical.
 */
const docHasFullBleedSection = (sections: readonly PageSectionV2[]): boolean =>
  sections.some((section) => isPageSectionFullBleed(section, resolvePageSectionTemplate(section)));

/**
 * Whether ANY block authors a mouse-tilt (`style.tilt !== "none"`). The 522
 * block-tilt binding is APPENDED INTO 521-05's single runtime source string, so a
 * tilt has no runtime unless that ONE emit fires — this OR-widens 521-05's emit
 * predicate rather than adding a second `<script>` (which would double-run
 * reveal/parallax/spotlight). Recurses through nested slots.
 */
const blockUsesCompositionTilt = (block: PageBlockV2): boolean => {
  if (block.style?.tilt != null && block.style.tilt !== "none") return true;
  if (block.slots) {
    for (const children of Object.values(block.slots)) {
      if (children) {
        for (const child of children) {
          if (blockUsesCompositionTilt(child)) return true;
        }
      }
    }
  }
  return false;
};

const usesCompositionTilt = (document: PageDocumentV2): boolean => {
  for (const section of document.sections) {
    for (const block of section.blocks) {
      if (blockUsesCompositionTilt(block)) return true;
    }
  }
  return false;
};

/**
 * TASK-535 — whether a document authors the cursor spotlight
 * (`settings.effects.cursorSpotlight`). Exported so the site shell can thread the
 * SIBLING document's spotlight need into `PageDocumentRender`'s `peerSpotlightOn`,
 * de-duplicating the single viewport-fixed spotlight overlay DIV across the
 * `<main>` (primary) and footer (secondary) documents.
 */
export const documentUsesSpotlight = (document: PageDocumentV2): boolean =>
  !!document.settings?.effects?.cursorSpotlight;

export function PageDocumentRender({
  document,
  breakpoint = "desktop",
  emptyContent = emptyDocumentContent,
  runtimeDataByBlockId,
  rootTag = "main",
  rootClassName,
  documentRole = "primary",
  peerSpotlightOn = false,
}: {
  document: PageDocumentV2;
  breakpoint?: PageBreakpoint;
  emptyContent?: ReactNode;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
  /**
   * Wrapper element for the rendered document. Pages keep the default
   * `main`; secondary documents (e.g. the TASK-455 site-shell footer
   * template) pass `div` so the page's unique `<main>` landmark stays valid.
   */
  rootTag?: "main" | "div";
  rootClassName?: string;
  /**
   * TASK-535 — a page renders TWO documents: the `<main>` page (primary) and the
   * site-shell footer template (secondary), each authored independently in the same
   * editor, so BOTH can author motion. The once-per-PAGE nodes split into two classes:
   *
   *  - Idempotent STYLESHEETS (reveal CSS + its noscript, spotlight CSS, composition
   *    CSS): the selectors are document-agnostic, so a duplicate copy is HARMLESS
   *    (same rules, no visual doubling). These stay PER-DOCUMENT / present-only —
   *    emitted whenever THIS document authors the effect — so a FOOTER-ONLY effect
   *    (main authors none, footer authors glass/reveal/spotlight) is still styled.
   *    Gating them to the primary (as an earlier 535 pass did) suppressed them on
   *    BOTH documents for footer-only effects ⇒ unstyled footer surfaces.
   *
   *  - The viewport-fixed SPOTLIGHT OVERLAY DIV is the ONLY true page-global singleton
   *    that DOUBLE-STACKS (two `fixed inset-0` `mix-blend:screen` gradients ⇒ double
   *    brightness). It is emitted EXACTLY ONCE per page: the primary emits it when
   *    EITHER document authors spotlight (`spotlightOn || peerSpotlightOn`); the
   *    secondary emits it only when the primary does NOT (footer-only spotlight).
   *
   * The runtime `<script>` is NOT suppressed on secondary (a footer-only-motion page
   * still needs it); it self-guards on a window flag (`PAGE_EFFECTS_RUNTIME_INIT_FLAG`)
   * so a second copy is a total no-op — one set of listeners/observers, no re-arm.
   */
  documentRole?: "primary" | "secondary";
  /**
   * TASK-535 — whether the PRIMARY (`<main>`) page document authors a cursor
   * spotlight. Consulted ONLY on the secondary (footer) render: the footer suppresses
   * ITS copy of the single viewport-fixed overlay DIV when the primary already owns
   * one, yet still emits one for a footer-only spotlight (see `documentRole`).
   * Defaults `false` (a stand-alone render — preview, tests — has no sibling document).
   */
  peerSpotlightOn?: boolean;
}) {
  const resolved = resolvePageRenderTree(document, breakpoint);
  const Root = rootTag;

  if (resolved.sections.length === 0) {
    return (
      <Root
        className={
          rootClassName ?? "mx-auto w-full max-w-4xl px-6 py-16 text-center text-slate-500"
        }
        data-page-v2="true"
      >
        {emptyContent}
      </Root>
    );
  }

  // TASK-521-05-L03 — per-page effects + section-motion runtime, front/preview
  // only (this shared renderer is NOT the builder canvas). Present-only: when no
  // effect is authored, the <Root> is byte-identical to pre-521.
  const effects = resolved.settings.effects; // present-only (validated at write)
  const spotlightOn = !!effects?.cursorSpotlight;
  const hasSectionEffect = resolved.sections.some((section) => section.style.scrollEffect != null);
  // TASK-522-05-L01 — present-only composition emit. `usesComposition` gates the
  // page-root composition <style>; `compositionTilt` OR-widens 521-05's SINGLE
  // runtime <script> predicate (the 522 block-tilt binding lives INSIDE the same
  // PAGE_EFFECTS_RUNTIME_SOURCE string, so we reuse the one emit — never a second
  // <script>, which would double-run reveal/parallax/spotlight).
  const usesComposition = docUsesCompositionEffects(document);
  const compositionTilt = usesCompositionTilt(document);
  // ── TASK-534 ── OR-widen the SINGLE runtime <script> emit predicate with the
  // RUNTIME-BEARING interactivity surfaces (switcher / filterable gallery /
  // block.style.magnetic). scrollHint + noise are NOT runtime-bearing (CSS keyframe
  // / static overlay), so they do NOT widen anyMotion. Present-only: a no-effect
  // document keeps anyMotion false ⇒ byte-identical (no <script>, no CSS).
  const usesInteractivity = usesInteractivityRuntime(document);
  const anyMotion = spotlightOn || hasSectionEffect || compositionTilt || usesInteractivity;
  // ── TASK-534 ── present-only page-root static grain overlay.
  const pageNoise = !!effects?.noiseOverlay;
  // TASK-535 — the idempotent effect stylesheets (reveal/composition/spotlight CSS
  // + reveal noscript) stay PER-DOCUMENT/present-only so a footer-only effect is
  // still styled; only the viewport-fixed spotlight OVERLAY DIV is a true page
  // singleton (two stack ⇒ double brightness) and is de-duplicated across the two
  // documents below. The runtime <script> emits from either (self-guards at runtime).
  const isPrimaryDocument = documentRole === "primary";
  // Emit the single spotlight OVERLAY DIV exactly once per page. The overlay is
  // CSS-gated by an ancestor `[data-page-spotlight]` + the root `--spotlight-*` vars,
  // which a document only sets when IT authors spotlight — so a document can only host
  // a WORKING overlay when its OWN `spotlightOn` is true. The primary therefore emits
  // it iff `spotlightOn`; the secondary (footer) emits it iff it authors spotlight AND
  // the primary does NOT (`spotlightOn && !peerSpotlightOn`) — so a footer-only
  // spotlight still renders exactly one (footer-owned) overlay, while both-author
  // (double-brightness) collapses to the single primary-owned one.
  const emitsSpotlightOverlay = isPrimaryDocument ? spotlightOn : spotlightOn && !peerSpotlightOn;

  const spotlightSize = Math.max(
    PAGE_SPOTLIGHT_SIZE_CLAMP.min,
    Math.min(PAGE_SPOTLIGHT_SIZE_CLAMP.max, effects?.spotlightSize ?? 400)
  );
  // Re-sanitize the color at RENDER (defence in depth — React SSR does not block
  // semicolon-delimited CSS injection inside a `style` value), matching every
  // other color in this renderer.
  // Default is a TRANSLUCENT tint (not opaque `var(--primary)`), so the out-of-box
  // spotlight is a subtle glow that does NOT obscure content near the cursor. Authors
  // who pick an explicit color (incl. TASK-519 alpha) fully override this.
  const spotlightColor =
    sanitizeAuthoringCssColor(effects?.spotlightColor) ??
    "color-mix(in srgb, var(--primary) 14%, transparent)";
  // TASK-523-01-L02 — re-sanitize the per-page canvas background at RENDER
  // (defence-in-depth, matching every other color/background in this renderer, e.g.
  // :347 — React SSR does not block a `;`-delimited CSS injection in a `style` value).
  // Present-only: a page without a background yields `undefined`.
  const canvasBackground =
    sanitizeAuthoringCssBackground(resolved.settings.background) ?? undefined;
  // TASK-535 — a full-bleed section paints a `width:100vw` bleed box that counts
  // the vertical-scrollbar gutter, so it is a few px WIDER than the content area
  // and pushes a spurious HORIZONTAL scrollbar. Guard with `overflow-x:clip` on
  // the page root (the containing block that wraps every bleed section). `clip`
  // (NOT `hidden`) is deliberate: `overflow:hidden` on one axis forces the other
  // to `auto`, establishing a scroll container that BREAKS `position:sticky`
  // descendants (the front sticky nav); `clip` clips overflow WITHOUT creating a
  // scroll container, so sticky keeps working. Per-document (NOT primary-only):
  // the footer document wraps its OWN bleed sections in its OWN root. Present-only
  // ⇒ a page with no full-bleed section keeps `rootStyle` byte-identical.
  const needsBleedOverflowGuard = docHasFullBleedSection(resolved.sections);
  // Build rootStyle when the spotlight OR a canvas background is set OR a bleed
  // guard is needed; keep the exact `--spotlight-*` vars and ADD `background` only
  // when present. When NONE apply, rootStyle stays `undefined` ⇒ byte-identical
  // <Root> vs post-522.
  const rootStyle: CSSProperties | undefined =
    spotlightOn || canvasBackground || needsBleedOverflowGuard
      ? ({
          ...(spotlightOn
            ? {
                ["--spotlight-color" as string]: spotlightColor,
                ["--spotlight-size" as string]: `${spotlightSize}px`,
              }
            : {}),
          ...(canvasBackground ? { background: canvasBackground } : {}),
          ...(needsBleedOverflowGuard ? { overflowX: "clip" as const } : {}),
        } as CSSProperties)
      : undefined;

  return (
    <Root
      className={rootClassName ?? "min-h-screen bg-white text-slate-950"}
      style={rootStyle}
      data-page-v2="true"
      {...(anyMotion ? { "data-page-motion": "true" } : {})}
      {...(spotlightOn ? { "data-page-spotlight": "true" } : {})}
      {...(pageNoise ? { "data-noise-host": "true" } : {})}
    >
      {/* Reveal HIDE state — the ONLY emit of 521-02-L02's PAGE_REVEAL_MOTION_CSS
          (committed single path). Scoped under the runtime-set [data-reveal-armed]
          so it is inert until the runtime arms (JS-required-to-HIDE). TASK-535:
          idempotent, document-agnostic selectors — emitted PER-DOCUMENT / present-only
          so a footer-only reveal is still styled; a duplicate copy is harmless. */}
      {hasSectionEffect && (
        <style data-page-motion-css dangerouslySetInnerHTML={{ __html: PAGE_REVEAL_MOTION_CSS }} />
      )}
      {/* Belt-and-suspenders: pure JS-disabled users keep reveal content visible.
          TASK-535: idempotent — per-document / present-only (harmless if duplicated). */}
      {hasSectionEffect && (
        <noscript
          dangerouslySetInnerHTML={{
            __html: '<style>[data-page-effect^="reveal"]{opacity:1;transform:none}</style>',
          }}
        />
      )}
      {/* Spotlight CSS is an idempotent, document-agnostic stylesheet — emit it
          PER-DOCUMENT / present-only so a footer-only spotlight is still styled;
          a duplicate <style> is harmless (same selectors/rules). */}
      {spotlightOn && (
        <style data-page-spotlight-css dangerouslySetInnerHTML={{ __html: PAGE_SPOTLIGHT_CSS }} />
      )}
      {/* TASK-535: the spotlight overlay is a viewport-fixed (`fixed inset-0`)
          page-global singleton — a second copy stacks another radial-gradient and
          DOUBLES the brightness. Emit the overlay DIV EXACTLY ONCE per page
          (`emitsSpotlightOverlay`): the primary owns it when EITHER document has
          spotlight; the footer owns it only for a footer-only spotlight. */}
      {emitsSpotlightOverlay && (
        <div
          aria-hidden="true"
          data-page-spotlight-overlay
          className="pointer-events-none fixed inset-0"
        />
      )}
      {/* TASK-522-05-L01 — composition-effects static CSS, a DISJOINT new node
          emitted present-only (only when a 522 surface/decoration/tilt/hover/
          layer/marquee is authored). Front/preview only (this shared renderer is
          NOT the builder canvas). TASK-535: idempotent stylesheet — per-document /
          present-only so a footer-only composition surface is still styled. */}
      {usesComposition && (
        <style
          data-page-composition-css
          dangerouslySetInnerHTML={{ __html: PAGE_COMPOSITION_EFFECTS_CSS }}
        />
      )}
      {/* ── TASK-534 ── declarative-interactivity CSS (switcher tablist + variants,
          filter chips + .is-hidden, magnetic transition). Idempotent, document-
          agnostic, present-only — emitted only when a switcher/filter/magnetic
          surface is authored. Front/preview only (this is not the builder canvas). */}
      {usesInteractivity && (
        <style
          data-page-interactivity-css
          dangerouslySetInnerHTML={{ __html: PAGE_INTERACTIVITY_CSS }}
        />
      )}
      {/* ── TASK-534 ── present-only page-root static grain overlay + its CSS. */}
      {pageNoise && (
        <>
          <style
            data-page-noise-css
            dangerouslySetInnerHTML={{ __html: INTERACTIVITY_KEYFRAMES_CSS }}
          />
          <div
            aria-hidden="true"
            data-noise-overlay="true"
            className="pointer-events-none absolute inset-0"
          />
        </>
      )}
      {resolved.sections.map((section) => (
        <PageSectionRender
          key={section.id}
          section={section}
          runtimeDataByBlockId={runtimeDataByBlockId}
        />
      ))}
      {anyMotion && (
        <script
          data-coderso-runtime-script={PAGE_EFFECTS_RUNTIME_ID}
          dangerouslySetInnerHTML={{ __html: PAGE_EFFECTS_RUNTIME_SOURCE }}
        />
      )}
    </Root>
  );
}
