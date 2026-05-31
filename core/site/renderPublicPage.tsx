import { pathToFileURL } from "node:url";

import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";

import { createTemplateCache } from "../themes/cache";
import { createWidgetRuntimeScriptRegistry } from "../widgets/runtimeScripts";
import type { DeviceTarget, WidgetBlock, WidgetRenderContext } from "../widgets/types";
import type { PageLayoutSettings } from "../services/pages/layoutSettings";
import {
  DEFAULT_PAGE_TEMPLATE_KEY,
  normalizePageTemplateKey,
  resolvePageTemplatePath,
} from "../services/pages/pageTemplateService";
import { DefaultRuntimePageShell, type PageTemplateProps } from "./pageRuntime";

export type PublicPageRenderOptions = {
  title: string;
  blocks: WidgetBlock[];
  cssHref?: string | null;
  inlineCss?: string | null;
  devModuleScripts?: string[] | null;
  isPreview?: boolean;
  previewDevice?: DeviceTarget;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  imageUrl?: string | null;
  layoutSettings?: PageLayoutSettings;
};

export type PublicPageRuntimeRenderOptions = PublicPageRenderOptions & {
  themeName?: string | null;
  templateKey?: unknown;
};

type TemplateComponent<Props> = (props: Props) => ReactNode;

const loadTemplateComponent = async <Props extends PageTemplateProps>(templatePath: string) => {
  try {
    const mod = await import(pathToFileURL(templatePath).href);
    if (typeof mod.default === "function") {
      return mod.default as TemplateComponent<Props>;
    }
  } catch (error) {
    console.warn(`Failed to load template ${templatePath}`, error);
  }
  return null;
};

const renderDocument = (
  title: string,
  body: ReactNode,
  cssHref?: string | null,
  inlineCss?: string | null,
  metaDescription?: string | null,
  canonicalUrl?: string | null,
  imageUrl?: string | null,
  devModuleScripts?: string[] | null,
  isPreview?: boolean,
  renderBodyScripts?: () => ReactNode
) => {
  const headTags: ReactNode[] = [
    <meta key="charset" charSet="utf-8" />,
    <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1" />,
    <title key="title">{title}</title>,
  ];

  if (metaDescription) {
    headTags.push(<meta key="description" name="description" content={metaDescription} />);
  }

  if (canonicalUrl) {
    headTags.push(<link key="canonical" rel="canonical" href={canonicalUrl} />);
  }

  if (imageUrl) {
    headTags.push(<meta key="og-image" property="og:image" content={imageUrl} />);
  }

  if (inlineCss) {
    headTags.push(<style key="inline-css">{inlineCss}</style>);
  }

  if (isPreview) {
    headTags.push(<style key="preview-hide">{`body{opacity:0}`}</style>);
    headTags.push(
      <script
        key="preview-show"
        dangerouslySetInnerHTML={{
          __html: 'window.addEventListener("load",()=>{document.body.style.opacity="1";});',
        }}
      />
    );
  }

  if (cssHref) {
    headTags.push(<link key="css-preload" rel="preload" as="style" href={cssHref} />);
    headTags.push(<link key="css" rel="stylesheet" href={cssHref} />);
  }

  if (Array.isArray(devModuleScripts)) {
    for (const [index, src] of devModuleScripts.entries()) {
      if (!src) continue;
      headTags.push(<script key={`dev-module-${index}`} type="module" src={src}></script>);
    }
  }

  const head = renderToString(<>{headTags}</>);
  const bodyHtml = renderToString(body);
  const bodyScriptsHtml = renderBodyScripts ? renderToString(<>{renderBodyScripts()}</>) : "";

  return `<!doctype html><html lang="en"><head>${head}</head><body>${bodyHtml}${bodyScriptsHtml}</body></html>`;
};

const PreviewBanner = () => (
  <div className="sticky top-0 z-50 w-full bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-black">
    Preview mode
  </div>
);

const PageRuntimeRoot = ({
  templateKey,
  isPreview,
  children,
}: {
  templateKey: string;
  isPreview?: boolean;
  children: ReactNode;
}) => (
  <div
    className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]"
    data-template={`page-${templateKey}`}
  >
    {isPreview ? <PreviewBanner /> : null}
    {children}
  </div>
);

export function renderPublicPageHtml(options: PublicPageRenderOptions) {
  const {
    title,
    blocks,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview,
    previewDevice,
    metaDescription,
    canonicalUrl,
    layoutSettings: rawLayoutSettings,
  } = options;

  const runtimeScripts = createWidgetRuntimeScriptRegistry();
  const renderContext: WidgetRenderContext = {
    mode: "public",
    previewDevice,
    runtimeScripts,
  };

  const templateProps: PageTemplateProps = {
    title,
    templateKey: DEFAULT_PAGE_TEMPLATE_KEY,
    blocks,
    layoutSettings: rawLayoutSettings,
    isPreview,
    previewDevice,
    renderContext,
  };

  const body = (
    <PageRuntimeRoot templateKey={templateProps.templateKey} isPreview={isPreview}>
      <DefaultRuntimePageShell {...templateProps} />
    </PageRuntimeRoot>
  );

  return renderDocument(
    title,
    body,
    cssHref,
    inlineCss,
    metaDescription,
    canonicalUrl,
    options.imageUrl,
    devModuleScripts,
    isPreview,
    () => runtimeScripts.renderScripts()
  );
}

export async function renderPublicPageRuntimeHtml(options: PublicPageRuntimeRenderOptions) {
  const {
    title,
    blocks,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview,
    previewDevice,
    metaDescription,
    canonicalUrl,
    layoutSettings: rawLayoutSettings,
    themeName,
    templateKey,
  } = options;

  const normalizedTemplateKey = normalizePageTemplateKey(templateKey);
  const cache = createTemplateCache();
  const templatePath = await resolvePageTemplatePath({
    themeName,
    templateKey,
    cache,
  });
  const Template = templatePath
    ? await loadTemplateComponent<PageTemplateProps>(templatePath)
    : null;

  const runtimeScripts = createWidgetRuntimeScriptRegistry();
  const renderContext: WidgetRenderContext = {
    mode: "public",
    previewDevice,
    runtimeScripts,
  };

  const templateProps: PageTemplateProps = {
    title,
    templateKey: normalizedTemplateKey,
    blocks,
    layoutSettings: rawLayoutSettings,
    isPreview,
    previewDevice,
    renderContext,
  };

  const body = (
    <PageRuntimeRoot templateKey={templateProps.templateKey} isPreview={isPreview}>
      {Template ? <Template {...templateProps} /> : <DefaultRuntimePageShell {...templateProps} />}
    </PageRuntimeRoot>
  );

  return renderDocument(
    title,
    body,
    cssHref,
    inlineCss,
    metaDescription,
    canonicalUrl,
    options.imageUrl,
    devModuleScripts,
    isPreview,
    () => runtimeScripts.renderScripts()
  );
}
