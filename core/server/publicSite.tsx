import type { ReactNode } from "react";

import type { DeviceTarget } from "../widgets/types";
import { ensureRecord, hydrateRuntimeBlocks } from "./publicSiteRenderContext";
import {
  renderPublicPageRuntimeHtml,
  renderPublicPageV2RuntimeHtml,
} from "../site/renderPublicPage";
import { renderPublicEntryDetailHtml, renderPublicEntryListHtml } from "../site/renderPublicEntry";
import {
  DEFAULT_SITE_CACHE_TTL_SECONDS,
  blocksAllowSiteHtmlCache,
  buildSiteCacheKey,
  configureSiteCache,
  getSiteCacheEntry,
  normalizeSitePath,
  resolveSiteCacheSearchSignature,
  setSiteCacheEntry,
} from "../site/cache/siteCache";
import { matchContentRoute } from "../site/contentRouteMatcher";
import { getPageBySlug, getPage } from "../services/pages/pageService";
import { validatePreviewToken } from "../services/pages/previewService";
import { getEntry, getEntryBySlug, listEntries } from "../services/content/entryService";
import {
  DEFAULT_POST_CONTENT_SCHEMA,
  getPost,
  getPostBySlug,
  listPosts,
  POST_CONTENT_TYPE_NAME,
  POST_CONTENT_TYPE_SLUG,
} from "../services/content/postsService";
import {
  resolvePreviewDetailPageRuntime,
  resolvePublishedDetailPageRuntime,
} from "../services/content/detailPageRuntimeResolver";
import { getPageTemplatePreviewModel } from "../services/pages/pageTemplateLibraryService";
import { isPageTemplateError } from "../services/pages/pageTemplateLibrarySchema";
import { getContentType, getContentTypeBySlug } from "../services/content/typeService";
import { resolvePublicSeoMetadata } from "../services/seo/seoService";
import { getSetting } from "../services/settings/settingsService";
import type { ContentRouteSetting } from "../services/settings/settingsContracts";
import { getActiveThemeProfile } from "../services/themes/themeProfileService";
import { resolvePublicRedirect } from "../services/redirects/redirectService";
import type { ContentSchema } from "../services/content/validation";
import { getListingRuntimeClientScript } from "../widgets/core/listingRuntimeScript";
import { createWidgetRuntimeScriptRegistry } from "../widgets/runtimeScripts";
import {
  isPostContentTypeSlug,
  resolvePostRuntimeMetaDescription,
} from "../services/posts/runtime/postBlockRuntimeMapper";
import { checkRateLimit } from "./middleware/rateLimit";
import { getSecuritySettings } from "../services/settings/securitySettings";
import { searchPublicIndex } from "../services/search/searchIndexService";
import { publicSearchRequestSchema } from "./validation/filterSchemas";
import { validate } from "./validation/schemaValidator";
import { handlePublicBookingApi } from "./publicBookingApi";
import { handlePublicFormsApi } from "./publicFormsApi";
import { handlePublicPopupsApi } from "./publicPopupsApi";
import { injectPopupRuntime } from "./popupRuntimeScript";
import { ANALYTICS_BEACON_PATH, handlePublicAnalyticsApi } from "./publicAnalyticsApi";
import {
  collectPrehydratedDetailBlockIds,
  resolveDetailPageImageUrl,
  resolveDetailPageRuntimeSeo,
  toPublicSeoText,
} from "./publicSiteEntryRuntime";
import { preparePageRuntimeDocument } from "../services/pages/pageRuntimeDataPreparation";
import type { PageRuntimeCacheMode } from "../services/pages/pageRuntimeBindingContract";
import { resolvePageTemplateInput } from "../services/pages/pageTemplateBoundary";
import type { PageBreakpoint } from "../services/pages/pageDocumentV2";
import { buildLiveAnalyticsScriptHtml, resolvePublicAnalyticsHeadSnippet } from "./publicHeadTags";
import { resolvePublicSiteShellContext } from "./publicSitePageRuntime";
import { renderDetailPagePreviewHtml, resolvePublicThemeName } from "./publicSitePreview";
import {
  buildDetailHref,
  isEntryPublished,
  normalizePreviewDetailPageId,
  paginateEntryListEntries,
  resolveLinkedDetailPageId,
  resolvePreviewDevice,
  resolvePreviewTargetType,
} from "./publicSiteRouteRuntime";
import { resolvePublicSiteRouteTarget } from "./publicSiteRoutePrecedence";
import { isSiteAsset, resolvePublicStyles, serveSiteAsset } from "./publicSiteAssets";

export type PublicPageData = {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedData?: Record<string, unknown> | null;
  currentData?: Record<string, unknown> | null;
};

const resolveIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return undefined;
};

// Builds every public HTML Response (fresh renders AND the cache-hit path).
// The popup runtime script (TASK-486-03-L02) is injected after cache
// read/write since it is static and identical for every page; injection is
// memoized and side-effect free.
const buildHtmlResponse = (html: string) =>
  new Response(injectPopupRuntime(html), { headers: { "Content-Type": "text/html" } });

type PublicHtmlRenderResult = {
  html: string;
  cacheable: boolean;
  /** Granular cache policy for v2 page renders. */
  cacheMode?: PageRuntimeCacheMode;
};

const resolveRequestCanonicalUrl = (input: {
  canonicalUrl: string | null;
  requestOrigin?: string | null;
  requestPath?: string | null;
}): string | null => {
  if (input.canonicalUrl) return input.canonicalUrl;
  if (!input.requestOrigin || !input.requestPath) return null;
  try {
    const origin = new URL(input.requestOrigin);
    if (origin.protocol !== "http:" && origin.protocol !== "https:") return null;
    const canonical = new URL(input.requestPath, origin);
    return canonical.origin === origin.origin ? canonical.href : null;
  } catch {
    return null;
  }
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const renderPublicPageHtmlInternal = async (
  page: PublicPageData,
  options?: {
    preview?: boolean;
    previewDevice?: DeviceTarget;
    themeName?: string;
    runtimeSearchParams?: URLSearchParams;
    /**
     * TASK-504-03: normalized request path (`normalizeSitePath(url.pathname)`),
     * passed ONLY on the public PAGE render callers so the menu-document header
     * can stamp `aria-current="page"`. Absent on preview/page-template renders ⇒
     * `activePath` null ⇒ no stamp.
     */
    requestPath?: string | null;
    /**
     * GA4 head snippet (TASK-491-01-L02): resolved once per PUBLIC request in
     * `handlePublicRequest`; preview/token render paths omit it (null) so the
     * renderer never emits the GA tag for preview traffic.
     */
    analyticsHeadSnippet?: string | null;
  }
): Promise<PublicHtmlRenderResult> => {
  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
  const sourceData = options?.preview ? page.currentData : page.publishedData;
  const sourceRecord = ensureRecord(sourceData);
  const settingsRecord = ensureRecord(sourceRecord.settings);
  const seoRecord = ensureRecord(sourceRecord.seo);
  const fallbackSeo = {
    title: toPublicSeoText(seoRecord.title) ?? page.title ?? "Page",
    description: toPublicSeoText(seoRecord.description),
    canonicalUrl: toPublicSeoText(seoRecord.canonicalUrl),
    robots: toPublicSeoText(seoRecord.robots),
  };
  const resolvedSeo = options?.preview
    ? fallbackSeo
    : await resolvePublicSeoMetadata({
        targetType: "page",
        targetId: page.id,
        slug: page.slug,
        fallback: fallbackSeo,
      });
  const imageUrl = resolveDetailPageImageUrl(seoRecord.imageUrl ?? seoRecord.socialImage);
  const contentRoutesSetting = await getSetting("site.contentRoutes");
  const contentRoutes = Array.isArray(contentRoutesSetting)
    ? (contentRoutesSetting as ContentRouteSetting[])
    : [];
  const pageTemplateInput = resolvePageTemplateInput(sourceData, {
    renderMode: options?.preview ? "preview-page" : "public-page",
  });
  const previewDevice = options?.previewDevice;
  const siteLocale = await getSetting("site.locale");
  const preparedRuntime = await preparePageRuntimeDocument(pageTemplateInput.document, {
    preview: options?.preview ?? false,
    breakpoint: (previewDevice ?? "desktop") as PageBreakpoint,
    contentRoutes,
    siteLocale,
    runtimeSearchParams: options?.runtimeSearchParams,
  });

  const { siteShell, siteName, responsiveCss } = await resolvePublicSiteShellContext({
    document: pageTemplateInput.document,
    includeResponsiveCss: !previewDevice,
  });

  // Listing filters register their public fetch-swap runtime only when needed.
  let renderBodyScripts: (() => ReactNode) | undefined;
  if (preparedRuntime.needsListingRuntimeScript) {
    const runtimeScripts = createWidgetRuntimeScriptRegistry();
    runtimeScripts.registerScript("listing-runtime", getListingRuntimeClientScript());
    renderBodyScripts = () => runtimeScripts.renderScripts();
  }

  const analyticsScriptHtml = await buildLiveAnalyticsScriptHtml(options?.preview === true);

  return {
    html: renderPublicPageV2RuntimeHtml({
      title: resolvedSeo.title ?? page.title ?? "Page",
      document: preparedRuntime.document,
      cssHref,
      inlineCss,
      isPreview: options?.preview ?? false,
      previewDevice,
      devModuleScripts,
      metaDescription: resolvedSeo.description,
      canonicalUrl: resolvedSeo.canonicalUrl,
      robots: resolvedSeo.robots,
      imageUrl,
      templateKey: settingsRecord.template,
      runtimeDataByBlockId: preparedRuntime.runtimeDataByBlockId,
      responsiveCss,
      siteShell,
      siteName,
      activePath: options?.requestPath ?? null,
      renderBodyScripts,
      analyticsScriptHtml,
      siteLocale,
      analyticsHeadSnippet: options?.analyticsHeadSnippet ?? null,
    }),
    cacheable: preparedRuntime.cacheable,
    cacheMode: preparedRuntime.cacheMode,
  };
};

export async function renderPublicPage(
  page: PublicPageData,
  options?: { preview?: boolean; previewDevice?: DeviceTarget }
) {
  const result = await renderPublicPageHtmlInternal(page, options);
  return buildHtmlResponse(result.html);
}

/**
 * Page Templates render through the SAME public Page v2 pipeline as page
 * preview: token-gated, `?device=` flatten semantics, scoped data-bound block
 * handling, and fail-closed boundary enforcement against legacy
 * `WidgetBlock[]` documents.
 */
const renderPageTemplatePreviewHtml = async (
  templateId: string,
  previewDevice?: DeviceTarget,
  runtimeSearchParams?: URLSearchParams
) => {
  const model = await getPageTemplatePreviewModel(templateId);
  const input = resolvePageTemplateInput(model.document, {
    renderMode: "preview-page",
    enforceFreshBoundary: true,
  });
  const result = await renderPublicPageHtmlInternal(
    {
      id: model.id,
      title: model.name,
      slug: `/page-templates/${model.slug}`,
      status: "draft",
      currentData: input.document as unknown as Record<string, unknown>,
      publishedData: null,
    },
    {
      preview: true,
      previewDevice,
      runtimeSearchParams,
    }
  );
  return result.html;
};

const renderEntryListHtml = async (
  typeSlug: string,
  detailPath: string,
  options?: {
    preview?: boolean;
    themeName?: string;
    runtimeSearchParams?: URLSearchParams;
    analyticsHeadSnippet?: string | null;
  }
) => {
  if (isPostContentTypeSlug(typeSlug)) {
    const paged = paginateEntryListEntries(await listPosts(), options?.runtimeSearchParams);
    const postItems = paged.entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      href: buildDetailHref(detailPath, entry.slug, entry.id),
      entry,
    }));

    const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
    return renderPublicEntryListHtml({
      title: POST_CONTENT_TYPE_NAME,
      contentType: {
        id: POST_CONTENT_TYPE_SLUG,
        name: POST_CONTENT_TYPE_NAME,
        slug: POST_CONTENT_TYPE_SLUG,
        schema: DEFAULT_POST_CONTENT_SCHEMA as unknown as ContentSchema,
      },
      items: postItems,
      pagination: paged.pagination,
      cssHref,
      inlineCss,
      devModuleScripts,
      isPreview: options?.preview ?? false,
      themeName: options?.themeName ?? (await resolvePublicThemeName()),
      analyticsScriptHtml: await buildLiveAnalyticsScriptHtml(options?.preview === true),
      siteLocale: await getSetting("site.locale"),
      analyticsHeadSnippet: options?.analyticsHeadSnippet ?? null,
    });
  }

  const contentType = await getContentTypeBySlug(typeSlug);
  if (!contentType) return null;

  const paged = paginateEntryListEntries(
    await listEntries(contentType.id),
    options?.runtimeSearchParams
  );
  const items = paged.entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    href: buildDetailHref(detailPath, entry.slug, entry.id),
    entry,
  }));

  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
  return renderPublicEntryListHtml({
    title: contentType.name,
    contentType: {
      id: contentType.id,
      name: contentType.name,
      slug: contentType.slug,
      schema: contentType.schema as ContentSchema,
    },
    items,
    pagination: paged.pagination,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview: options?.preview ?? false,
    themeName: options?.themeName ?? (await resolvePublicThemeName()),
    siteLocale: await getSetting("site.locale"),
    analyticsScriptHtml: await buildLiveAnalyticsScriptHtml(options?.preview === true),
    analyticsHeadSnippet: options?.analyticsHeadSnippet ?? null,
  });
};

const renderEntryDetailHtml = async (
  typeSlug: string,
  routeValue: string,
  options?: {
    preview?: boolean;
    previewDevice?: DeviceTarget;
    themeName?: string;
    preferGenericEntry?: boolean;
    routeParam?: "slug" | "id";
    detailPageId?: string | null;
    contentRoutes?: ContentRouteSetting[];
    runtimeSearchParams?: URLSearchParams;
    requestPath?: string | null;
    requestOrigin?: string | null;
    analyticsHeadSnippet?: string | null;
  }
): Promise<PublicHtmlRenderResult | string | null> => {
  const routeParam = options?.routeParam ?? "slug";

  if (!options?.preferGenericEntry && isPostContentTypeSlug(typeSlug)) {
    const post = routeParam === "id" ? await getPost(routeValue) : await getPostBySlug(routeValue);
    if (!post) return null;
    if (!options?.preview && !isEntryPublished(post)) {
      return null;
    }

    const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
    return renderPublicEntryDetailHtml({
      title: post.seo?.title ?? post.title ?? POST_CONTENT_TYPE_NAME,
      contentType: {
        id: POST_CONTENT_TYPE_SLUG,
        name: POST_CONTENT_TYPE_NAME,
        slug: POST_CONTENT_TYPE_SLUG,
        schema: DEFAULT_POST_CONTENT_SCHEMA as unknown as ContentSchema,
      },
      entry: post,
      cssHref,
      inlineCss,
      devModuleScripts,
      isPreview: options?.preview ?? false,
      themeName: options?.themeName ?? (await resolvePublicThemeName()),
      metaDescription: post.seo?.description ?? resolvePostRuntimeMetaDescription(post.data),
      canonicalUrl: post.seo?.canonicalUrl ?? null,
      robots: post.seo?.robots ?? null,
      analyticsScriptHtml: await buildLiveAnalyticsScriptHtml(options?.preview === true),
      siteLocale: await getSetting("site.locale"),
      analyticsHeadSnippet: options?.analyticsHeadSnippet ?? null,
    });
  }

  const contentType = await getContentTypeBySlug(typeSlug);
  if (!contentType) return null;

  const entryDetail =
    routeParam === "id"
      ? await getEntry(routeValue)
      : await (async () => {
          const entry = await getEntryBySlug(contentType.id, routeValue);
          if (!entry) return null;
          if (!options?.preview && !isEntryPublished(entry)) {
            return null;
          }
          return getEntry(entry.id);
        })();
  if (!entryDetail) return null;
  if (entryDetail.typeId !== contentType.id) return null;
  if (!options?.preview && !isEntryPublished(entryDetail)) {
    return null;
  }

  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
  const contentTypeSnapshot = {
    id: contentType.id,
    name: contentType.name,
    slug: contentType.slug,
    schema: contentType.schema as ContentSchema,
  };
  const contentRoutes = options?.contentRoutes ?? [];
  const activeDetailPageId =
    options?.detailPageId ??
    (options?.preview ? resolveLinkedDetailPageId(contentType.slug, contentRoutes) : null);

  if (activeDetailPageId) {
    const detailPage = options?.preview
      ? await resolvePreviewDetailPageRuntime({
          detailPageId: activeDetailPageId,
          documentSource: "published",
          entry: {
            id: entryDetail.id,
            typeId: entryDetail.typeId,
            title: entryDetail.title,
            slug: entryDetail.slug,
            status: entryDetail.status,
            visibility: entryDetail.visibility,
            hasPassword: entryDetail.hasPassword,
            tags: entryDetail.tags ?? [],
            data: entryDetail.data ?? {},
            publishedAt: entryDetail.publishedAt ?? null,
            scheduledAt: entryDetail.scheduledAt ?? null,
            createdAt: entryDetail.createdAt ?? null,
            updatedAt: entryDetail.updatedAt ?? null,
            author: entryDetail.author ?? null,
          },
          contentType: {
            id: contentType.id,
            slug: contentType.slug,
            schema: contentType.schema as ContentSchema,
          },
          contentRoutes,
        })
      : await resolvePublishedDetailPageRuntime({
          detailPageId: activeDetailPageId,
          entry: {
            id: entryDetail.id,
            typeId: entryDetail.typeId,
            title: entryDetail.title,
            slug: entryDetail.slug,
            status: entryDetail.status,
            visibility: entryDetail.visibility,
            hasPassword: entryDetail.hasPassword,
            tags: entryDetail.tags ?? [],
            data: entryDetail.data ?? {},
            publishedAt: entryDetail.publishedAt ?? null,
            scheduledAt: entryDetail.scheduledAt ?? null,
            createdAt: entryDetail.createdAt ?? null,
            updatedAt: entryDetail.updatedAt ?? null,
            author: entryDetail.author ?? null,
          },
          contentType: {
            id: contentType.id,
            slug: contentType.slug,
            schema: contentType.schema as ContentSchema,
          },
          contentRoutes,
        });
    if (!detailPage) return null;

    const detailSeo = resolveDetailPageRuntimeSeo({
      document: detailPage.document,
      entry: entryDetail,
      contentTypeName: contentType.name,
    });
    const resolvedSeo = options?.preview
      ? {
          title: detailSeo.title,
          description: detailSeo.metaDescription,
          canonicalUrl: detailSeo.canonicalUrl,
          robots: entryDetail.seo?.robots ?? null,
        }
      : await resolvePublicSeoMetadata({
          targetType: "entry",
          targetId: entryDetail.id,
          slug: entryDetail.slug,
          fallback: {
            title: detailSeo.title,
            description: detailSeo.metaDescription,
            canonicalUrl: detailSeo.canonicalUrl,
            robots: entryDetail.seo?.robots ?? null,
          },
        });
    const blocks = await hydrateRuntimeBlocks(detailPage.blocks, {
      preview: options?.preview ?? false,
      contentRoutes,
      runtimeSearchParams: options?.runtimeSearchParams,
      runtimeCache: {},
      prehydratedBlockIds: collectPrehydratedDetailBlockIds(detailPage.document),
    });
    const { siteShell, siteName, responsiveCss } = await resolvePublicSiteShellContext({
      document: null,
      includeResponsiveCss: !options?.previewDevice,
    });
    return {
      html: await renderPublicPageRuntimeHtml({
        title:
          detailPage.document.seo?.titlePattern || detailPage.document.titlePattern
            ? detailSeo.title
            : (resolvedSeo.title ?? detailSeo.title),
        blocks,
        cssHref,
        inlineCss,
        devModuleScripts,
        isPreview: options?.preview ?? false,
        previewDevice: options?.previewDevice,
        layoutSettings: detailPage.document.settings.layout,
        metaDescription: detailPage.document.seo?.descriptionField
          ? detailSeo.metaDescription
          : resolvedSeo.description,
        canonicalUrl: resolveRequestCanonicalUrl({
          canonicalUrl: resolvedSeo.canonicalUrl,
          requestOrigin: options?.requestOrigin,
          requestPath: options?.requestPath,
        }),
        robots: resolvedSeo.robots,
        imageUrl: detailSeo.imageUrl,
        responsiveCss,
        siteShell,
        siteName,
        activePath: options?.requestPath ?? null,
        siteLocale: await getSetting("site.locale"),
        themeName: options?.themeName ?? (await resolvePublicThemeName()),
        templateKey: detailPage.document.settings.template,
        analyticsScriptHtml: await buildLiveAnalyticsScriptHtml(options?.preview === true),
        analyticsHeadSnippet: options?.analyticsHeadSnippet ?? null,
      }),
      cacheable: blocksAllowSiteHtmlCache(blocks),
    };
  }

  const fallbackSeo = {
    title: entryDetail.seo?.title ?? entryDetail.title ?? contentType.name,
    description:
      "seo" in entryDetail && entryDetail.seo
        ? (entryDetail.seo.description ?? resolvePostRuntimeMetaDescription(entryDetail.data))
        : resolvePostRuntimeMetaDescription(entryDetail.data),
    canonicalUrl:
      "seo" in entryDetail && entryDetail.seo ? (entryDetail.seo.canonicalUrl ?? null) : null,
    robots: "seo" in entryDetail && entryDetail.seo ? (entryDetail.seo.robots ?? null) : null,
  };
  const resolvedSeo = options?.preview
    ? fallbackSeo
    : await resolvePublicSeoMetadata({
        targetType: "entry",
        targetId: entryDetail.id,
        slug: entryDetail.slug,
        fallback: fallbackSeo,
      });

  return renderPublicEntryDetailHtml({
    title: resolvedSeo.title ?? entryDetail.title ?? contentType.name,
    contentType: contentTypeSnapshot,
    entry: entryDetail,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview: options?.preview ?? false,
    themeName: options?.themeName ?? (await resolvePublicThemeName()),
    metaDescription: resolvedSeo.description,
    canonicalUrl: resolvedSeo.canonicalUrl,
    siteLocale: await getSetting("site.locale"),
    robots: resolvedSeo.robots,
    analyticsScriptHtml: await buildLiveAnalyticsScriptHtml(options?.preview === true),
    analyticsHeadSnippet: options?.analyticsHeadSnippet ?? null,
  });
};

export async function handlePublicRequest(req: Request) {
  const url = new URL(req.url);
  const security = await getSecuritySettings();
  const ip = resolveIp(req);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const bookingApiResponse = await handlePublicBookingApi(req, {
    url,
    ip,
    userAgent,
    security,
  });
  if (bookingApiResponse) return bookingApiResponse;

  const formsApiResponse = await handlePublicFormsApi(req, {
    url,
    ip,
    userAgent,
    security,
  });
  if (formsApiResponse) return formsApiResponse;

  const popupsApiResponse = await handlePublicPopupsApi(req, {
    url,
    ip,
    userAgent,
    security,
  });
  if (popupsApiResponse) return popupsApiResponse;

  // Public analytics beacon collector (TASK-483-02). handlePublicAnalyticsApi
  // always returns a Response (never null), so it is dispatched by an explicit
  // pathname guard, mirroring the booking/forms dispatch above; ip/userAgent/
  // security are already resolved and reused, exactly like booking.
  if (url.pathname === ANALYTICS_BEACON_PATH) {
    return handlePublicAnalyticsApi(req, { ip, userAgent, security });
  }

  checkRateLimit(
    "public_read",
    {
      ip,
      userAgent,
    },
    security.rateLimit
  );
  if (url.pathname === "/api/search") {
    const query = url.searchParams.get("q") ?? "";
    const limitRaw = url.searchParams.get("limit");
    const sources = url.searchParams.get("sources") ?? undefined;
    const requestPayload = {
      q: query,
      ...(limitRaw ? { limit: Number(limitRaw) } : {}),
      ...(sources ? { sources } : {}),
    };

    try {
      validate(publicSearchRequestSchema, requestPayload);
    } catch {
      return jsonResponse(
        {
          error: {
            code: "validation_error",
            message: "Invalid search request",
          },
        },
        400
      );
    }

    const result = await searchPublicIndex(query, {
      ...(limitRaw ? { limit: Number(limitRaw) } : {}),
      ...(sources ? { sources } : {}),
      contentRoutes: ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [],
    });

    return jsonResponse(result);
  }

  if (isSiteAsset(url.pathname)) {
    return serveSiteAsset(url.pathname);
  }
  if (url.pathname === "/preview") {
    const token = url.searchParams.get("token");
    const targetType = resolvePreviewTargetType(url.searchParams.get("type"));
    const previewDevice = resolvePreviewDevice(url.searchParams.get("device")) ?? "desktop";
    if (!token || !targetType) return new Response("Not Found", { status: 404 });

    const previewEnabled = await getSetting("site.previewEnabled");
    if (!previewEnabled) return new Response("Not Found", { status: 404 });

    const preview = await validatePreviewToken(token, targetType);
    if (preview.status === "expired") {
      return new Response("Preview expired", { status: 410 });
    }
    if (preview.status !== "valid") {
      return new Response("Not Found", { status: 404 });
    }

    if (preview.token.targetType === "page") {
      const page = await getPage(preview.token.targetId);
      if (!page) return new Response("Not Found", { status: 404 });
      const html = await renderPublicPageHtmlInternal(page as PublicPageData, {
        preview: true,
        previewDevice,
        runtimeSearchParams: url.searchParams,
      });
      return buildHtmlResponse(html.html);
    }

    if (preview.token.targetType === "content") {
      const post = await getPost(preview.token.targetId);
      if (post) {
        const html = await renderEntryDetailHtml(POST_CONTENT_TYPE_SLUG, post.slug, {
          preview: true,
          previewDevice,
        });
        if (!html) return new Response("Not Found", { status: 404 });
        return buildHtmlResponse(typeof html === "string" ? html : html.html);
      }

      const entry = await getEntry(preview.token.targetId);
      if (!entry) return new Response("Not Found", { status: 404 });
      const contentType = await getContentType(entry.typeId);
      if (!contentType) return new Response("Not Found", { status: 404 });
      const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
      const requestedDetailPageId = url.searchParams.get("detailPageId");
      const normalizedDetailPageId = normalizePreviewDetailPageId(requestedDetailPageId);
      if (requestedDetailPageId !== null && !normalizedDetailPageId) {
        return new Response("Not Found", { status: 404 });
      }
      const html = await renderEntryDetailHtml(contentType.slug, entry.slug, {
        preview: true,
        previewDevice,
        preferGenericEntry: true,
        detailPageId: normalizedDetailPageId,
        contentRoutes,
        runtimeSearchParams: url.searchParams,
      });
      if (!html) return new Response("Not Found", { status: 404 });
      return buildHtmlResponse(typeof html === "string" ? html : html.html);
    }

    if (preview.token.targetType === "detail-page") {
      const sampleEntryId =
        preview.token.context?.kind === "detail-page" ? preview.token.context.sampleEntryId : null;
      if (!sampleEntryId) return new Response("Not Found", { status: 404 });
      const html = await renderDetailPagePreviewHtml({
        detailPageId: preview.token.targetId,
        sampleEntryId,
        previewDevice,
        runtimeSearchParams: url.searchParams,
      });
      if (!html) return new Response("Not Found", { status: 404 });
      return buildHtmlResponse(html);
    }

    if (preview.token.targetType === "page-template") {
      try {
        const html = await renderPageTemplatePreviewHtml(
          preview.token.targetId,
          previewDevice,
          url.searchParams
        );
        return buildHtmlResponse(html);
      } catch (error) {
        // Fail closed: missing templates, unreadable stored documents, and
        // boundary violations all return 404 instead of partial rendering.
        if (isPageTemplateError(error)) {
          return new Response("Not Found", { status: 404 });
        }
        if (error instanceof Error && error.message.startsWith("page_template_")) {
          return new Response("Not Found", { status: 404 });
        }
        throw error;
      }
    }
  }

  // GA4 head snippet (TASK-491-01-L02): resolved once per PUBLIC request.
  // Preview/token paths above never reach this point, so they stay tag-free.
  const analyticsHeadSnippet = await resolvePublicAnalyticsHeadSnippet();

  try {
    const redirect = await resolvePublicRedirect(url.pathname);
    if (redirect) {
      const location = new URL(redirect.location, url);
      return Response.redirect(location.toString(), redirect.statusCode);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "redirect_loop" || error.message === "redirect_target_external")
    ) {
      return new Response("Redirect Loop", { status: 508 });
    }
    throw error;
  }

  const slugPath = normalizeSitePath(url.pathname);
  const cacheTtlSeconds = (await getSetting("site.cacheTtlSeconds")) as number;
  const activeProfile = await getActiveThemeProfile();
  const cacheProfileId = activeProfile?.id ?? "default";
  const themeName = activeProfile?.themeName ?? "default";
  configureSiteCache(cacheTtlSeconds);
  // Param-aware caching (TASK-459-04): requests whose params all belong to
  // the listing/pager allowlist are cached under a canonical signature key
  // (filtered variants under a short TTL); any other param keeps the request
  // uncacheable, exactly like before.
  const searchSignature = resolveSiteCacheSearchSignature(url.searchParams);
  const shouldUseCache = cacheTtlSeconds > 0 && searchSignature.cacheable;
  const shortCacheTtlSeconds = Math.min(cacheTtlSeconds, DEFAULT_SITE_CACHE_TTL_SECONDS);
  const defaultStoreTtlSeconds = searchSignature.signature ? shortCacheTtlSeconds : cacheTtlSeconds;
  const resolveRenderCacheTtl = (result: PublicHtmlRenderResult) => {
    if (result.cacheMode === "none") return 0;
    if (result.cacheMode === "short-ttl") return shortCacheTtlSeconds;
    if (result.cacheMode === "full") return defaultStoreTtlSeconds;
    return result.cacheable ? defaultStoreTtlSeconds : 0;
  };

  const cacheKey = buildSiteCacheKey(cacheProfileId, slugPath, searchSignature.signature);
  if (shouldUseCache) {
    const cachedHtml = getSiteCacheEntry(cacheKey);
    if (cachedHtml) {
      return buildHtmlResponse(cachedHtml);
    }
  }

  if (slugPath === "/") {
    const homepageId = (await getSetting("site.homepageId")) as string | null;
    if (homepageId) {
      const page = await getPage(homepageId);
      if (!page || page.status !== "published" || !page.publishedData) {
        return new Response("Not Found", { status: 404 });
      }
      const result = await renderPublicPageHtmlInternal(page as PublicPageData, {
        themeName,
        runtimeSearchParams: url.searchParams,
        requestPath: slugPath,
        analyticsHeadSnippet,
      });
      const homepageTtlSeconds = resolveRenderCacheTtl(result);
      if (shouldUseCache && homepageTtlSeconds > 0) {
        setSiteCacheEntry(cacheKey, result.html, homepageTtlSeconds);
      }
      return buildHtmlResponse(result.html);
    }
  }

  const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
  const match = matchContentRoute(slugPath, contentRoutes);
  const page = match?.mode === "detail" ? null : await getPageBySlug(slugPath);
  const hasPublishedStaticPage = Boolean(page && page.status === "published" && page.publishedData);
  const routeTarget = resolvePublicSiteRouteTarget(match, hasPublishedStaticPage);

  if (routeTarget === "content-detail") {
    if (!match || match.mode !== "detail") return new Response("Not Found", { status: 404 });
    const slug = match.params.slug ?? match.params.id ?? "";
    if (!slug) return new Response("Not Found", { status: 404 });
    const detailHtml = await renderEntryDetailHtml(match.type, slug, {
      themeName,
      routeParam: match.params.slug ? "slug" : "id",
      detailPageId: match.detailPageId,
      contentRoutes,
      runtimeSearchParams: url.searchParams,
      requestPath: slugPath,
      requestOrigin: url.origin,
      analyticsHeadSnippet,
    });
    if (!detailHtml) return new Response("Not Found", { status: 404 });
    const html = typeof detailHtml === "string" ? detailHtml : detailHtml.html;
    const canCache = typeof detailHtml === "string" ? true : detailHtml.cacheable;
    if (shouldUseCache && canCache) {
      setSiteCacheEntry(cacheKey, html, defaultStoreTtlSeconds);
    }
    return buildHtmlResponse(html);
  }

  if (routeTarget === "static-page") {
    if (!page || page.status !== "published" || !page.publishedData) {
      return new Response("Not Found", { status: 404 });
    }
    const result = await renderPublicPageHtmlInternal(page as PublicPageData, {
      themeName,
      runtimeSearchParams: url.searchParams,
      requestPath: slugPath,
      analyticsHeadSnippet,
    });
    const pageTtlSeconds = resolveRenderCacheTtl(result);
    if (shouldUseCache && pageTtlSeconds > 0) {
      setSiteCacheEntry(cacheKey, result.html, pageTtlSeconds);
    }
    return buildHtmlResponse(result.html);
  }

  if (routeTarget === "content-list") {
    if (!match || match.mode !== "list") return new Response("Not Found", { status: 404 });
    const html = await renderEntryListHtml(match.type, match.detailPath, {
      themeName,
      runtimeSearchParams: url.searchParams,
      analyticsHeadSnippet,
    });
    if (!html) return new Response("Not Found", { status: 404 });
    if (shouldUseCache) {
      setSiteCacheEntry(cacheKey, html, defaultStoreTtlSeconds);
    }
    return buildHtmlResponse(html);
  }

  return new Response("Not Found", { status: 404 });
}
