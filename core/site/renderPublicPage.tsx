import { pathToFileURL } from "node:url";

import { renderToString } from "react-dom/server";
import type { CSSProperties, ReactNode } from "react";

import { createTemplateCache } from "../themes/cache";
import { createWidgetRuntimeScriptRegistry } from "../widgets/runtimeScripts";
import type { DeviceTarget, WidgetBlock, WidgetRenderContext } from "../widgets/types";
import type { PageLayoutSettings } from "../services/pages/layoutSettings";
import {
  DEFAULT_PAGE_TEMPLATE_KEY,
  normalizePageTemplateKey,
  resolvePageTemplatePath,
} from "../services/pages/pageTemplateService";
import { type PageBreakpoint, type PageDocumentV2 } from "../services/pages/pageDocumentV2";
import type { PageRuntimeDataByBlockId } from "../services/pages/pageRuntimeBindingContract";
import { resolvePageTemplateInput } from "../services/pages/pageTemplateBoundary";
import { DefaultRuntimePageShell, type PageTemplateProps } from "./pageRuntime";
import { DefaultRuntimePageShellV2, type PageTemplatePropsV2 } from "./pageRuntimeV2";
import { buildSiteShellCss, type SiteShellRenderProps } from "./siteShell";

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
  robots?: string | null;
  imageUrl?: string | null;
  layoutSettings?: PageLayoutSettings;
  /**
   * Analytics tracking snippet body (TASK-483-03-L02): the inline IIFE built by
   * `buildTrackingScript` (already minted with a per-render beacon nonce).
   * `renderDocument` wraps it in a `<script>` appended before `</body>` on LIVE
   * renders only — it is skipped whenever `isPreview` is set, so admin preview
   * traffic never pollutes the analytics tables. Absent/null → no script.
   */
  analyticsScriptHtml?: string | null;
};

export type PublicPageRuntimeRenderOptions = PublicPageRenderOptions & {
  themeName?: string | null;
  templateKey?: unknown;
};

export type PublicPageV2RuntimeRenderOptions = Omit<
  PublicPageRenderOptions,
  "blocks" | "layoutSettings"
> & {
  document: PageDocumentV2 | unknown;
  templateKey?: unknown;
  previewDevice?: PageBreakpoint;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
  /**
   * Scoped responsive `@media` overrides (TASK-423-02). Emitted for public
   * visitors on top of the desktop-resolved base markup; empty/absent on the
   * explicit `previewDevice` path, which keeps single-breakpoint flattening.
   * TASK-455 appends the footer template's builder output under the distinct
   * `[data-site-footer="true"]` scope.
   */
  responsiveCss?: string | null;
  /**
   * Global site shell (TASK-455), resolved once per request by
   * `publicSite.tsx` and threaded into `PageTemplatePropsV2`.
   */
  siteShell?: SiteShellRenderProps | null;
  siteName?: string | null;
  /**
   * TASK-504-03: current request path threaded from `publicSite.tsx` (front page
   * renders only; `null`/absent in preview) so the menu-document header can stamp
   * `aria-current="page"` on the active nav link. Forwarded to `templateProps`.
   */
  activePath?: string | null;
  /**
   * V2 body-script emission seam (TASK-459-02): the registry-rendered runtime
   * scripts appended before `</body>`, exactly like the legacy WidgetBlock
   * path. `publicSite.tsx` provides it only when the prepared runtime
   * document needs a client script (currently the shared listing runtime
   * script for live filters blocks); absent/null keeps v2 pages script-free.
   */
  renderBodyScripts?: (() => ReactNode) | null;
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

const normalizePageV2TemplateKey = (value: unknown) => {
  if (typeof value !== "string") return "default";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
  return normalized.length > 0 ? normalized : "default";
};

const renderDocument = (
  title: string,
  body: ReactNode,
  cssHref?: string | null,
  inlineCss?: string | null,
  metaDescription?: string | null,
  canonicalUrl?: string | null,
  robots?: string | null,
  imageUrl?: string | null,
  devModuleScripts?: string[] | null,
  isPreview?: boolean,
  renderBodyScripts?: () => ReactNode,
  responsiveCss?: string | null,
  analyticsScriptHtml?: string | null
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

  if (robots) {
    headTags.push(<meta key="robots" name="robots" content={robots} />);
  }

  if (imageUrl) {
    headTags.push(<meta key="og-image" property="og:image" content={imageUrl} />);
  }

  if (inlineCss) {
    headTags.push(<style key="inline-css">{inlineCss}</style>);
  }

  if (responsiveCss) {
    // The builder contract (`pageResponsiveCss`) escapes ids so the CSS can
    // never contain `</style>`; React additionally renders style children as
    // raw text, matching the inline token CSS pattern above.
    headTags.push(
      <style key="responsive-css" data-page-responsive="true">
        {responsiveCss}
      </style>
    );
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
  // Analytics snippet (TASK-483-03-L02): LIVE renders only — never on previews,
  // so admin preview traffic never reaches the collector. The script body is a
  // self-contained IIFE (built by buildTrackingScript); it embeds no markup.
  const analyticsHtml =
    analyticsScriptHtml && !isPreview ? `<script>${analyticsScriptHtml}</script>` : "";

  return `<!doctype html><html lang="en"><head>${head}</head><body>${bodyHtml}${bodyScriptsHtml}${analyticsHtml}</body></html>`;
};

const previewBannerOffset = "2rem";

const PreviewBanner = () => (
  <div
    className="sticky top-0 z-50 w-full bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-black"
    data-preview-banner="true"
  >
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
    data-page-preview={isPreview ? "true" : undefined}
    style={
      isPreview
        ? ({ "--coderso-preview-banner-offset": previewBannerOffset } as CSSProperties)
        : undefined
    }
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
    robots,
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
    robots,
    options.imageUrl,
    devModuleScripts,
    isPreview,
    () => runtimeScripts.renderScripts(),
    null, // responsiveCss (legacy path has none)
    options.analyticsScriptHtml
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
    robots,
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
    robots,
    options.imageUrl,
    devModuleScripts,
    isPreview,
    () => runtimeScripts.renderScripts(),
    null, // responsiveCss (runtime path has none)
    options.analyticsScriptHtml
  );
}

export function renderPublicPageV2RuntimeHtml(options: PublicPageV2RuntimeRenderOptions) {
  const {
    title,
    document: rawDocument,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview,
    previewDevice,
    metaDescription,
    canonicalUrl,
    robots,
    templateKey,
    runtimeDataByBlockId,
    responsiveCss,
    siteShell,
    siteName,
    activePath,
    renderBodyScripts,
  } = options;

  const templateInput = resolvePageTemplateInput(rawDocument, {
    renderMode: isPreview ? "preview-page" : "public-page",
  });
  const { document } = templateInput;
  const normalizedTemplateKey = normalizePageV2TemplateKey(
    templateKey ?? document.settings.template
  );
  const templateProps: PageTemplatePropsV2 = {
    title,
    templateKey: normalizedTemplateKey,
    document,
    isPreview,
    previewDevice: previewDevice ?? "desktop",
    runtimeDataByBlockId,
    siteShell,
    siteName,
    activePath: activePath ?? null,
  };

  // The shell ships no client JS; its CSS rides the inline style block only
  // when a shell part actually renders. The stylesheet is built from the
  // published menu's appearance; a null/legacy appearance reproduces the
  // pre-appearance stylesheet byte-identically (TASK-458-02).
  // A document menu (TASK-499-04) reuses the base `.site-header*` layout sheet,
  // so a ZERO-ITEM document menu (mapped `navigation === null`) must STILL emit
  // it — gate on `navigationDocument` too. When a document is active the base
  // layout is emitted with a NULL appearance so residual legacy appearance props
  // (e.g. sticky on a migrated menu) never bleed under the custom menu; the
  // document's own appearance rides its scoped `menuDocumentCss` sheet instead.
  const hasSiteShell = Boolean(
    siteShell?.navigation || siteShell?.navigationDocument || siteShell?.footerDocument
  );
  const inlineCssWithShell = hasSiteShell
    ? [
        inlineCss,
        buildSiteShellCss(
          siteShell?.navigationDocument ? null : (siteShell?.navigationAppearance ?? null)
        ),
      ]
        .filter(Boolean)
        .join("\n")
    : inlineCss;

  const body = (
    <PageRuntimeRoot templateKey={`v2-${templateProps.templateKey}`} isPreview={isPreview}>
      <DefaultRuntimePageShellV2 {...templateProps} />
    </PageRuntimeRoot>
  );

  return renderDocument(
    title,
    body,
    cssHref,
    inlineCssWithShell,
    metaDescription,
    canonicalUrl,
    robots,
    options.imageUrl,
    devModuleScripts,
    isPreview,
    renderBodyScripts ?? undefined,
    responsiveCss,
    options.analyticsScriptHtml
  );
}
