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
  pageTypographyFontFamilyCssValues,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
  resolvePageDocumentForBreakpoint,
  type PageBlockSlotKey,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionV2,
  type PageTextMark,
} from "./pageDocumentV2";
import type { PageBlockPath } from "./pageBlockPaths";
import {
  isPageBlockVisualElementType,
  PAGE_BLOCK_ELEMENT_ATTRIBUTE,
  PAGE_BLOCK_ID_ATTRIBUTE,
  PAGE_BLOCK_TEXT_ATTRIBUTE,
  PAGE_SECTION_CONTENT_ATTRIBUTE,
  PAGE_SECTION_ID_ATTRIBUTE,
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
  isSafeAuthoringCssGradient,
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
  sanitizeAuthoringRichTextHtml,
} from "./pageAuthoringSanitizers";

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
  return safe && isSafeAuthoringCssGradient(safe) ? safe : undefined;
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
  return {
    "--coderso-section-accent": accent ?? undefined,
    backgroundColor: backgroundColor ?? undefined,
    backgroundImage: backgroundImageUrl
      ? `url("${escapeAuthoringCssString(backgroundImageUrl)}")`
      : undefined,
    borderRadius: `${section.style.radius}px`,
    boxShadow:
      section.style.shadow === "none"
        ? undefined
        : section.style.shadow === "sm"
          ? "0 6px 20px rgba(15, 23, 42, 0.08)"
          : section.style.shadow === "md"
            ? "0 14px 40px rgba(15, 23, 42, 0.12)"
            : "0 22px 60px rgba(15, 23, 42, 0.16)",
    padding: `${spacing.paddingTop}px ${spacing.paddingRight}px ${spacing.paddingBottom}px ${spacing.paddingLeft}px`,
    maxWidth: template.variant === "full-width" ? "none" : `${section.layout.maxWidth}px`,
    margin: "0 auto",
    gap: `${spacing.gap}px`,
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
  return {
    sectionClassName: template.variant === "full-width" ? "w-full" : "w-full px-4 py-6",
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
    boxShadow: toPageShadowValue(style.shadow),
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

export const toPageBlockRenderProps = (block: PageBlockV2): PageBlockRenderProps => ({
  className: joinPageRenderClasses(
    "max-w-full",
    pageBlockEffectiveWidthClass(block.style),
    pageBlockAlignmentClass(block.style?.align)
  ),
  style: toPageBlockStyle(block),
  dataAttributes: {
    "data-page-block": block.type,
    [PAGE_BLOCK_ID_ATTRIBUTE]: block.id,
  },
});

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
};

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
  return { src, alt, caption };
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

  return (
    <div
      className={pageGalleryGridClass(layout)}
      data-page-gallery="true"
      data-page-gallery-layout={layout}
    >
      {items.map((item, index) => (
        <figure
          key={`${block.id}-gallery-${index}`}
          className={joinPageRenderClasses(
            "overflow-hidden rounded border border-slate-200 bg-[var(--coderso-block-surface,#ffffff)]",
            pageGalleryItemClass(layout)
          )}
          data-page-gallery-item="true"
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
      ))}
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

const renderPageLayoutBlockContent = (
  block: PageBlockV2,
  context: PageBlockRenderContext
): ReactNode => {
  const slotKeys = getPageBlockActiveSlotKeys(block);
  if (slotKeys.length === 0) return null;

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
    case "icon":
      return null;
    default:
      return null;
  }
};

const renderPageBlockWithFrame = (block: PageBlockV2, context: PageBlockRenderContext) => {
  if (!context.includeHiddenBlocks && !block.visibility.visible) return null;
  const content = renderPageBlockContent(block, context);
  const renderProps = toPageBlockRenderProps(block);
  if (context.renderBlockFrame) {
    return (
      <FragmentLike key={block.id}>
        {context.renderBlockFrame({
          block,
          content,
          renderProps,
          blockPath: context.blockPath,
          depth: context.depth,
          slotKey: context.slotKey,
          parentBlock: context.parentBlock,
        })}
      </FragmentLike>
    );
  }
  return (
    <PageBlockFrame key={block.id} block={block}>
      {content}
    </PageBlockFrame>
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
  return (
    <section
      id={section.visibility.anchor ?? undefined}
      className={renderProps.sectionClassName}
      {...renderProps.dataAttributes}
    >
      <PageSectionContent
        section={section}
        emptyContent={emptyContent}
        runtimeDataByBlockId={runtimeDataByBlockId}
      />
    </section>
  );
}

const emptyDocumentContent = "This page has no content yet.";

export const resolvePageRenderTree = (
  document: PageDocumentV2,
  breakpoint: PageBreakpoint
): PageDocumentV2 => resolvePageDocumentForBreakpoint(document, breakpoint);

export function PageDocumentRender({
  document,
  breakpoint = "desktop",
  emptyContent = emptyDocumentContent,
  runtimeDataByBlockId,
  rootTag = "main",
  rootClassName,
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

  return (
    <Root className={rootClassName ?? "min-h-screen bg-white text-slate-950"} data-page-v2="true">
      {resolved.sections.map((section) => (
        <PageSectionRender
          key={section.id}
          section={section}
          runtimeDataByBlockId={runtimeDataByBlockId}
        />
      ))}
    </Root>
  );
}
