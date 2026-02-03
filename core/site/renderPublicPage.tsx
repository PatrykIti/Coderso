import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";

import { WidgetRenderer } from "../widgets/renderers/widgetRenderer";
import type { WidgetBlock } from "../widgets/types";

export type PublicPageRenderOptions = {
  title: string;
  blocks: WidgetBlock[];
  cssHref?: string | null;
  inlineCss?: string | null;
  isPreview?: boolean;
  metaDescription?: string | null;
};

const renderBlocks = (blocks: WidgetBlock[]) => {
  if (!blocks.length) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center text-muted-foreground">
        This page has no content yet.
      </div>
    );
  }
  return (
    <main className="flex flex-col gap-0">
      {blocks.map((block) => (
        <WidgetRenderer key={block.id} block={block} />
      ))}
    </main>
  );
};

export function renderPublicPageHtml(options: PublicPageRenderOptions) {
  const { title, blocks, cssHref, inlineCss, isPreview, metaDescription } = options;

  const body = renderToString(
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {isPreview ? (
        <div className="sticky top-0 z-50 w-full bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-black">
          Preview mode
        </div>
      ) : null}
      {renderBlocks(blocks)}
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
