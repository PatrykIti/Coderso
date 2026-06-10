import type { CSSProperties, ReactNode } from "react";

import {
  getPageBlockActiveSlotKeys,
  resolvePageDocumentForBreakpoint,
  type PageBlockSlotKey,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionV2,
} from "./pageDocumentV2";
import type { PageBlockPath } from "./pageBlockPaths";
import {
  resolvePageSectionTemplate,
  type ResolvedPageSectionTemplate,
} from "./pageSectionTemplates";

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
  "data-section-id": string;
  "data-page-variant": PageSectionV2["variant"];
  "data-page-section-template": string;
};

export type PageBlockDataAttributes = {
  "data-page-block": PageBlockV2["type"];
  "data-block-id": string;
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

type PageBlockRenderContext = {
  blockPath: PageBlockPath;
  depth: number;
  includeHiddenBlocks: boolean;
  renderBlockFrame?: PageBlockFrameRenderer;
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

const pageSectionTemplateColumns = (template: ResolvedPageSectionTemplate) => {
  const columns = template.section.layout.columns;
  if (template.template === "hero" && template.variant === "split") return 2;
  if (template.template === "media-split" && template.variant !== "default") return 2;
  if (
    (template.template === "feature-grid" ||
      template.template === "gallery" ||
      template.template === "testimonials") &&
    (template.variant === "grid" || template.variant === "cards")
  ) {
    return Math.max(columns, 3);
  }
  if (
    (template.template === "comparison" || template.template === "custom") &&
    (template.variant === "grid" || template.variant === "cards")
  ) {
    return Math.max(columns, 2);
  }
  return columns;
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
  const columns = pageSectionTemplateColumns(template);
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
      "data-section-id": section.id,
      "data-page-variant": template.variant,
      "data-page-section-template": template.template,
    },
  };
};

export const toPageBlockStyle = (block: PageBlockV2): PageBlockStyleProperties => {
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
    padding: toBoxSpacingValue(style.padding),
    margin: toBoxSpacingValue(style.margin),
    textAlign: style.align,
  };
};

export const toPageBlockRenderProps = (block: PageBlockV2): PageBlockRenderProps => ({
  className: joinPageRenderClasses(
    "max-w-full",
    pageBlockWidthClass(block.style?.width),
    pageBlockAlignmentClass(block.style?.align)
  ),
  style: toPageBlockStyle(block),
  dataAttributes: {
    "data-page-block": block.type,
    "data-block-id": block.id,
  },
});

const renderHeading = (block: PageBlockV2) => {
  const text = readText(block.props.text, "Heading");
  const level = readText(block.props.level, "h2");
  const className = joinPageRenderClasses(
    "font-semibold leading-tight text-[var(--coderso-block-text,#020617)]",
    level === "h1" ? "text-5xl" : level === "h2" ? "text-4xl" : "text-2xl",
    pageTextAlignClass(block.props.align)
  );

  if (level === "h1") return <h1 className={className}>{text}</h1>;
  if (level === "h3") return <h3 className={className}>{text}</h3>;
  if (level === "h4") return <h4 className={className}>{text}</h4>;
  if (level === "h5") return <h5 className={className}>{text}</h5>;
  if (level === "h6") return <h6 className={className}>{text}</h6>;
  return <h2 className={className}>{text}</h2>;
};

const renderImage = (block: PageBlockV2) => {
  const src = readText(block.props.src);
  const alt = readText(block.props.alt);
  const caption = readText(block.props.caption);
  if (!src) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        Image
      </div>
    );
  }
  return (
    <figure className="space-y-2">
      <img className="w-full rounded object-cover" src={src} alt={alt} loading="lazy" />
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

const renderInertDataBoundBlock = (type: "collection" | "form" | "embed", message: string) => (
  <div
    className="rounded border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
    data-page-block-inert={type}
  >
    {message}
  </div>
);

const isListLinkItem = (value: unknown): value is { label: string; href: string } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { label?: unknown }).label === "string" &&
  typeof (value as { href?: unknown }).href === "string";

const renderList = (block: PageBlockV2) => {
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
          label
        )}
      </li>
    );
  });
  return readBoolean(block.props.ordered, false) ? (
    <ol className="list-decimal space-y-2 pl-6 text-[var(--coderso-block-text,#334155)]">
      {children}
    </ol>
  ) : (
    <ul className="list-disc space-y-2 pl-6 text-[var(--coderso-block-text,#334155)]">
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
        {slotKeys.map((slotKey) => (
          <FragmentLike key={slotKey}>
            {renderSlotWrapper({
              block,
              slotKey,
              className: "min-w-0 space-y-4",
              children: renderPageBlockList(block.slots?.[slotKey] ?? [], {
                parentPath: context.blockPath,
                depth: context.depth + 1,
                includeHiddenBlocks: context.includeHiddenBlocks,
                renderBlockFrame: context.renderBlockFrame,
                slotKey,
                parentBlock: block,
              }),
            })}
          </FragmentLike>
        ))}
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
      return renderHeading(block);
    case "text":
      return (
        <p
          className={joinPageRenderClasses(
            "text-base leading-7 text-[var(--coderso-block-text,#334155)]",
            pageTextAlignClass(block.props.align)
          )}
        >
          {readText(block.props.text)}
        </p>
      );
    case "button": {
      const href = readText(block.props.href, "#");
      return (
        <a
          className={joinPageRenderClasses(
            "inline-flex w-fit items-center justify-center rounded bg-[var(--coderso-section-accent,#0d9488)] px-5 py-3 text-sm font-semibold text-[var(--coderso-block-text,#ffffff)] shadow-sm transition hover:opacity-90"
          )}
          href={href}
          target={toHrefTarget(block.props.target)}
          rel={block.props.target === "blank" ? "noreferrer" : undefined}
        >
          {readText(block.props.label, "Learn more")}
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
      return renderList(block);
    case "card":
      return (
        <article className="rounded border border-slate-200 bg-[var(--coderso-block-surface,#ffffff)] p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--coderso-block-text,#020617)]">
            {readText(block.props.title, "Card title")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--coderso-block-text,#475569)]">
            {readText(block.props.text)}
          </p>
        </article>
      );
    case "divider":
      return (
        <hr
          className="border-slate-200"
          style={{ borderWidth: `${readNumber(block.props.thickness, 1)}px` }}
        />
      );
    case "spacer":
      return <div aria-hidden="true" style={{ height: `${readNumber(block.props.size, 32)}px` }} />;
    case "statistic":
      return (
        <div className="rounded border border-slate-200 p-5">
          <div className="text-3xl font-semibold text-[var(--coderso-block-text,#020617)]">
            {readText(block.props.value, "0")}
          </div>
          <div className="mt-1 text-sm font-medium text-[var(--coderso-block-text,#334155)]">
            {readText(block.props.label, "Metric")}
          </div>
          <div className="mt-1 text-sm text-[var(--coderso-block-text,#64748b)]">
            {readText(block.props.caption)}
          </div>
        </div>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 border-[var(--coderso-section-accent,#0d9488)] pl-5 text-lg leading-8 text-[var(--coderso-block-text,#334155)]">
          <p>{readText(block.props.text)}</p>
          {readText(block.props.cite) ? (
            <cite className="mt-3 block text-sm text-[var(--coderso-block-text,#64748b)]">
              {readText(block.props.cite)}
            </cite>
          ) : null}
        </blockquote>
      );
    case "gallery":
      return renderGallery(block);
    case "collection":
      return renderInertDataBoundBlock("collection", "Collection content is not available yet.");
    case "form": {
      const title = readText(block.props.title);
      return renderInertDataBoundBlock(
        "form",
        title ? `${title} is not available yet.` : "Form is not available yet."
      );
    }
    case "embed":
      return renderInertDataBoundBlock("embed", "Embed content is not available yet.");
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

export function PageSectionContent({
  section,
  emptyContent = defaultEmptySectionContent,
  renderBlockFrame,
  layoutMode = "runtime",
  includeHiddenBlocks = false,
}: {
  section: PageSectionV2;
  emptyContent?: ReactNode;
  renderBlockFrame?: PageBlockFrameRenderer;
  layoutMode?: PageSectionLayoutMode;
  includeHiddenBlocks?: boolean;
}) {
  const renderProps = toPageSectionRenderProps(section, { layoutMode });
  const blocks = includeHiddenBlocks
    ? section.blocks
    : section.blocks.filter((block) => block.visibility.visible);
  return (
    <div
      className={renderProps.contentClassName}
      style={renderProps.style}
      data-page-section-content="true"
      data-page-section-layout-mode={layoutMode}
    >
      {blocks.length > 0
        ? blocks.map((block, index) =>
            renderPageBlockWithFrame(block, {
              blockPath: [{ index }] as PageBlockPath,
              depth: 1,
              includeHiddenBlocks,
              renderBlockFrame,
            })
          )
        : emptyContent}
    </div>
  );
}

function FragmentLike({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function PageSectionRender({
  section,
  emptyContent,
}: {
  section: PageSectionV2;
  emptyContent?: ReactNode;
}) {
  if (!section.visibility.visible) return null;
  const renderProps = toPageSectionRenderProps(section);
  return (
    <section
      id={section.visibility.anchor ?? undefined}
      className={renderProps.sectionClassName}
      {...renderProps.dataAttributes}
    >
      <PageSectionContent section={section} emptyContent={emptyContent} />
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
}: {
  document: PageDocumentV2;
  breakpoint?: PageBreakpoint;
  emptyContent?: ReactNode;
}) {
  const resolved = resolvePageRenderTree(document, breakpoint);

  if (resolved.sections.length === 0) {
    return (
      <main
        className="mx-auto w-full max-w-4xl px-6 py-16 text-center text-slate-500"
        data-page-v2="true"
      >
        {emptyContent}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-950" data-page-v2="true">
      {resolved.sections.map((section) => (
        <PageSectionRender key={section.id} section={section} />
      ))}
    </main>
  );
}
