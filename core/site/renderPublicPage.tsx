import { renderToString } from "react-dom/server";
import type { CSSProperties, ReactNode } from "react";

import { WidgetRenderer } from "../widgets/renderers/widgetRenderer";
import type {
  ContainerToken,
  SpacingToken,
  WidgetBlock,
} from "../widgets/types";
import {
  normalizePageLayoutSettings,
  type PageLayoutSettings,
  type PageMaxWidthToken,
} from "../services/pages/layoutSettings";
import type { WidgetRendererPageDefaults } from "../widgets/renderers/widgetRenderer";

export type PublicPageRenderOptions = {
  title: string;
  blocks: WidgetBlock[];
  cssHref?: string | null;
  inlineCss?: string | null;
  isPreview?: boolean;
  metaDescription?: string | null;
  layoutSettings?: PageLayoutSettings;
};

const spacingTokenToGapClassMap: Record<SpacingToken, string> = {
  none: "gap-0",
  xs: "gap-2",
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
  xl: "gap-12",
  "2xl": "gap-16",
};

const spacingTokenToPaddingTopClassMap: Record<SpacingToken, string> = {
  none: "pt-0",
  xs: "pt-2",
  sm: "pt-4",
  md: "pt-6",
  lg: "pt-8",
  xl: "pt-12",
  "2xl": "pt-16",
};

const spacingTokenToPaddingBottomClassMap: Record<SpacingToken, string> = {
  none: "pb-0",
  xs: "pb-2",
  sm: "pb-4",
  md: "pb-6",
  lg: "pb-8",
  xl: "pb-12",
  "2xl": "pb-16",
};

const pageContainerClassMap: Record<ContainerToken, string> = {
  default: "mx-auto w-full max-w-6xl",
  narrow: "mx-auto w-full max-w-4xl",
  full: "w-full",
};

const pageMaxWidthClassMap: Record<PageMaxWidthToken, string> = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const renderBlocks = (
  blocks: WidgetBlock[],
  sectionGap: SpacingToken,
  pageDefaults: WidgetRendererPageDefaults
) => {
  if (!blocks.length) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center text-muted-foreground">
        This page has no content yet.
      </div>
    );
  }
  return (
    <main className={joinClasses("flex flex-col", spacingTokenToGapClassMap[sectionGap])}>
      {blocks.map((block) => (
        <WidgetRenderer key={block.id} block={block} pageDefaults={pageDefaults} />
      ))}
    </main>
  );
};

export function renderPublicPageHtml(options: PublicPageRenderOptions) {
  const {
    title,
    blocks,
    cssHref,
    inlineCss,
    isPreview,
    metaDescription,
    layoutSettings: rawLayoutSettings,
  } = options;
  const layoutSettings = normalizePageLayoutSettings(rawLayoutSettings);
  const pageDefaults = layoutSettings.sections.defaults;
  const wrapperPaddingClass = joinClasses(
    spacingTokenToPaddingTopClassMap[layoutSettings.wrapper.padding.top],
    spacingTokenToPaddingBottomClassMap[layoutSettings.wrapper.padding.bottom]
  );
  const wrapperContainerClass = joinClasses(
    pageContainerClassMap[layoutSettings.wrapper.container],
    layoutSettings.wrapper.container !== "full" && layoutSettings.wrapper.maxWidth
      ? pageMaxWidthClassMap[layoutSettings.wrapper.maxWidth]
      : undefined
  );
  const wrapperBackgroundStyle: CSSProperties = {
    backgroundColor: layoutSettings.wrapper.background.color,
    backgroundImage: layoutSettings.wrapper.background.image
      ? `url(${layoutSettings.wrapper.background.image})`
      : undefined,
    backgroundSize: layoutSettings.wrapper.background.image ? "cover" : undefined,
    backgroundPosition: layoutSettings.wrapper.background.image ? "center" : undefined,
  };

  const body = renderToString(
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {isPreview ? (
        <div className="sticky top-0 z-50 w-full bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-black">
          Preview mode
        </div>
      ) : null}
      <div className={wrapperPaddingClass} style={wrapperBackgroundStyle}>
        <div className={wrapperContainerClass}>
          {renderBlocks(blocks, layoutSettings.sections.gap, pageDefaults)}
        </div>
      </div>
    </div>
  );

  const headTags: ReactNode[] = [
    <meta key="charset" charSet="utf-8" />,
    <meta
      key="viewport"
      name="viewport"
      content="width=device-width, initial-scale=1"
    />,
    <title key="title">{title}</title>,
  ];

  if (metaDescription) {
    headTags.push(
      <meta key="description" name="description" content={metaDescription} />
    );
  }

  if (inlineCss) {
    headTags.push(<style key="inline-css">{inlineCss}</style>);
  }

  if (cssHref) {
    headTags.push(
      <link key="css" rel="stylesheet" href={cssHref} />
    );
  }

  const head = renderToString(<>{headTags}</>);

  return `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`;
}
