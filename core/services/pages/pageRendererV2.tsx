import type { CSSProperties, ReactNode } from "react";

import { ContentListBlock } from "../../widgets/core/contentList";
import { FormEmbedBlock, type FormEmbedData } from "../../widgets/core/formEmbed";
import { ListingFiltersBlock } from "../../widgets/core/listingFilters";
import {
  getPageBlockActiveSlotKeys,
  isPageTypographyCapableBlockType,
  pageTypographyFontFamilyCssValues,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
  resolvePageDocumentForBreakpoint,
  type PageBlockSlotKey,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionV2,
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
  readPageFiltersBlockLayout,
  type PageRuntimeDataBinding,
  type PageRuntimeDataByBlockId,
  type PageRuntimeFormBinding,
} from "./pageRuntimeDataBinding";

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
 * Admin-canvas hook (TASK-422-02): receives the exact text node a text-bearing
 * block paints (including renderer fallbacks) so the Page Editor can layer
 * inline editing on top of the same content the front renders. Runtime render
 * paths never provide it, so public output is unchanged. `propPath` follows
 * the `pageInlineEditContract` convention (`"text"`, `"label"`, `"items.0"`).
 */
export type PageInlineTextRenderer = (input: {
  block: PageBlockV2;
  propPath: string;
  text: string;
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
  return /(linear|radial|conic)-gradient\(/i.test(value) ? value : undefined;
};

export const toPageSectionStyle = (section: PageSectionV2): PageSectionStyleProperties => {
  const template = resolvePageSectionTemplate(section);
  return {
    "--coderso-section-accent": section.style.accent,
    backgroundColor:
      section.style.backgroundType === "color" ? section.style.background : undefined,
    backgroundImage:
      section.style.backgroundType === "image" && section.style.backgroundImage
        ? `url(${section.style.backgroundImage})`
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
    padding: `${section.spacing.paddingTop}px ${section.spacing.paddingRight}px ${section.spacing.paddingBottom}px ${section.spacing.paddingLeft}px`,
    maxWidth: template.variant === "full-width" ? "none" : `${section.layout.maxWidth}px`,
    margin: "0 auto",
    gap: `${section.spacing.gap}px`,
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
  if (template.template === "hero" || template.template === "cta") {
    return `${marker} place-items-center text-center`;
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

export const pageBlockAlignmentClass = (align: PageBlockStyle["align"] | undefined) => {
  if (align === "center") return "justify-self-center";
  if (align === "right") return "justify-self-end";
  if (align === "left") return "justify-self-start";
  return undefined;
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
    sectionClassName: "w-full px-4 py-6",
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
    style.backgroundType === "color" && style.background ? style.background : undefined;
  return {
    "--coderso-block-text": style.textColor ?? undefined,
    "--coderso-block-surface": backgroundColor,
    backgroundColor,
    backgroundImage:
      style.backgroundType === "gradient" ? toGradientBackground(style.background) : undefined,
    color: style.textColor ?? undefined,
    opacity: style.opacity,
    borderRadius: style.radius !== undefined ? `${style.radius}px` : undefined,
    boxShadow: toPageShadowValue(style.shadow),
    borderColor: style.borderColor ?? undefined,
    borderStyle: style.borderColor ? "solid" : undefined,
    borderWidth: style.borderColor ? "1px" : undefined,
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
  const style = block.style ?? {};
  return {
    padding: toBoxSpacingValue(style.padding),
    margin: toBoxSpacingValue(style.margin),
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
    pageBlockWidthClass(block.style?.width),
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
  context: PageBlockRenderContext
): ReactNode =>
  context.renderInlineText ? context.renderInlineText({ block, propPath, text }) : text;

const renderHeading = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const text = renderBlockText(block, "text", readText(block.props.text, "Heading"), context);
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

const renderImage = (block: PageBlockV2) => {
  const src = readText(block.props.src);
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
        className="w-full rounded object-cover"
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
    const src = readText(value);
    return src ? { src, alt: "", caption: "" } : null;
  }
  if (!isRecord(value)) return null;
  const src = readGalleryItemText(value, "src", "url", "image", "assetUrl");
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

const renderEmbedBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const binding = getRuntimeBinding(block, context, "embed");
  if (!binding) {
    return renderInertDataBoundBlock("embed", "Embed content is not available yet.");
  }
  if (binding.iframeSrc) {
    return (
      <div
        className="overflow-hidden rounded-lg border bg-black/5"
        data-page-embed-provider="youtube"
      >
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={binding.iframeSrc}
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
      <div
        className="prose max-w-none"
        data-page-embed-html="sanitized"
        dangerouslySetInnerHTML={{ __html: binding.sanitizedHtml }}
      />
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
    const href = isListLinkItem(item) ? item.href : "";
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
      return (
        <p
          className={joinPageRenderClasses(
            "text-base leading-7 text-[var(--coderso-block-text,#334155)]",
            pageTextAlignClass(block.props.align)
          )}
          style={toPageBlockTypographyStyle(block)}
          {...pageBlockTextDataAttributes}
        >
          {renderBlockText(block, "text", readText(block.props.text), context)}
        </p>
      );
    case "button": {
      const href = readText(block.props.href, "#");
      return (
        <a
          className={joinPageRenderClasses(
            "inline-flex w-fit items-center justify-center rounded bg-[var(--coderso-section-accent,#0d9488)] px-5 py-3 text-sm font-semibold text-[var(--coderso-block-text,#ffffff)] shadow-sm transition hover:opacity-90"
          )}
          // Style-target contract: the anchor IS the button the user styles,
          // so the visual style surface lands here, not on the block frame.
          style={toPageBlockElementStyle(block)}
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
      const src = readText(block.props.src);
      return src ? (
        <video
          className="w-full rounded"
          src={src}
          controls
          muted={readBoolean(block.props.muted, true)}
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
      return (
        <article className="rounded border border-slate-200 bg-[var(--coderso-block-surface,#ffffff)] p-5 shadow-sm">
          <h3
            className="text-lg font-semibold text-[var(--coderso-block-text,#020617)]"
            style={cardTypography}
            {...pageBlockTextDataAttributes}
          >
            {readText(block.props.title, "Card title")}
          </h3>
          <p
            className="mt-2 text-sm leading-6 text-[var(--coderso-block-text,#475569)]"
            style={cardTypography}
            {...pageBlockTextDataAttributes}
          >
            {readText(block.props.text)}
          </p>
        </article>
      );
    }
    case "divider":
      return (
        <hr
          className="border-slate-200"
          style={{ borderWidth: `${readNumber(block.props.thickness, 1)}px` }}
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
          <p>{renderBlockText(block, "text", readText(block.props.text), context)}</p>
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
            {members.map(({ block, index }) =>
              renderPageBlockWithFrame(block, blockRenderContext(index))
            )}
            {renderSectionColumnTrailing?.({
              section,
              column: columnIndex + 1,
              childCount: members.length,
            })}
          </div>
        ))
      ) : blocks.length > 0 ? (
        <>
          {blocks.map((block, index) => renderPageBlockWithFrame(block, blockRenderContext(index)))}
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
