import type { ReactNode } from "react";

import type { DeviceTarget } from "../widgets/types";
import { ensureRecord } from "./publicSiteRenderContext";
import { renderPublicPageV2RuntimeHtml } from "../site/renderPublicPage";
import {
  DEFAULT_SITE_CACHE_TTL_SECONDS,
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
import { getEntry } from "../services/content/entryService";
import { getPost, POST_CONTENT_TYPE_SLUG } from "../services/content/postsService";
import { getPageTemplatePreviewModel } from "../services/pages/pageTemplateLibraryService";
import { isPageTemplateError } from "../services/pages/pageTemplateLibrarySchema";
import { getContentType } from "../services/content/typeService";
import { resolvePublicSeoMetadata } from "../services/seo/seoService";
import { getSetting } from "../services/settings/settingsService";
import type { ContentRouteSetting } from "../services/settings/settingsContracts";
import { getActiveThemeProfile } from "../services/themes/themeProfileService";
import { resolvePublicRedirect } from "../services/redirects/redirectService";
import { getListingRuntimeClientScript } from "../widgets/core/listingRuntimeScript";
import { createWidgetRuntimeScriptRegistry } from "../widgets/runtimeScripts";
import { checkRateLimit } from "./middleware/rateLimit";
import { getSecuritySettings } from "../services/settings/securitySettings";
import { searchPublicIndex } from "../services/search/searchIndexService";
import { publicSearchRequestSchema } from "./validation/filterSchemas";
import { validate } from "./validation/schemaValidator";
import { handlePublicBookingApi } from "./publicBookingApi";
import { handlePublicFormsApi } from "./publicFormsApi";
import { handlePublicEntryUnlockApi } from "./publicEntryUnlockApi";
import { handlePublicPopupsApi } from "./publicPopupsApi";
import { injectPopupRuntime } from "./popupRuntimeScript";
import { ANALYTICS_BEACON_PATH, handlePublicAnalyticsApi } from "./publicAnalyticsApi";
import { resolveDetailPageImageUrl, toPublicSeoText } from "./publicSiteEntryRuntime";
import { preparePageRuntimeDocument } from "../services/pages/pageRuntimeDataPreparation";
import { resolvePageTemplateInput } from "../services/pages/pageTemplateBoundary";
import type { PageBreakpoint } from "../services/pages/pageDocumentV2";
import { buildLiveAnalyticsScriptHtml, resolvePublicAnalyticsHeadSnippet } from "./publicHeadTags";
import { resolvePublicSiteShellContext } from "./publicSitePageRuntime";
import {
  normalizePreviewDetailPageId,
  resolvePreviewDevice,
  resolvePreviewTargetType,
} from "./publicSiteRouteRuntime";
import { resolvePublicSiteRouteTarget } from "./publicSiteRoutePrecedence";
import { isSiteAsset, resolvePublicStyles, serveSiteAsset } from "./publicSiteAssets";
import {
  buildEntryUnlockContext,
  entryRouteIsGated,
  resolveEntryRequestAuth,
} from "./publicEntryGateUi";
import {
  renderDetailPagePreviewHtml,
  renderEntryDetailHtml,
  renderEntryListHtml,
  type PublicHtmlRenderResult,
} from "./publicEntryRender";

export type PublicPageData = {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedData?: Record<string, unknown> | null;
  currentData?: Record<string, unknown> | null;
};

// Module-local cookie/header helpers now live in publicEntryGateUi.tsx
// (TASK-517 seams); see resolveEntryRequestAuth / buildEntryUnlockContext.
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

export async function handlePublicRequest(req: Request) {
  const url = new URL(req.url);

  // Disaster-restore gate (TASK-511-05): while `site.maintenanceMode` is ON, the
  // whole public surface (pages + the non-admin public API dispatchers hosted
  // below) returns 503 so a full/disaster import can never race public
  // registrations or content writes. Admin SPA, /auth/* and /admin/api/* are
  // dispatched BEFORE this handler (httpServer.ts fetch), so the admin can drive
  // the restore and flip the flag back.
  if ((await getSetting("site.maintenanceMode")) === true) {
    return new Response("Service temporarily unavailable", {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "retry-after": "3600",
      },
    });
  }

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

  // Public entry-unlock submit (TASK-517-02-L02): POST /entries/:id/unlock.
  const unlockApiResponse = await handlePublicEntryUnlockApi(req, {
    url,
    ip,
    userAgent,
    security,
  });
  if (unlockApiResponse) return unlockApiResponse;

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
  // TASK-517-03: contentRoutes + match hoisted above the cache read so the
  // gated-route signal exists before BOTH the read and the writes.
  const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
  const match = matchContentRoute(slugPath, contentRoutes);
  const routeIsGatedEntry = match?.mode === "detail" ? await entryRouteIsGated(match) : false;
  const shouldUseCache = cacheTtlSeconds > 0 && searchSignature.cacheable && !routeIsGatedEntry;
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

  // ── SHARED AUTH SEAM (TASK-517-01-L03/L05, impl in publicEntryGateUi) ───────
  // session→content:read boolean + cookies derived ONCE above the routeTarget
  // branches; bypass is PERMISSION-bounded, not bare Boolean(user).
  const { isAuthenticated, cookies } = await resolveEntryRequestAuth(req);
  // ── END SHARED AUTH SEAM ────────────────────────────────────────────────────

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
      isAuthenticated,
      unlockContext: buildEntryUnlockContext(cookies),
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
      isAuthenticated,
    });
    if (!html) return new Response("Not Found", { status: 404 });
    // TASK-517-01-L05 anti-poisoning: the authed FULL-list body is never
    // written under the auth-independent cache key.
    if (shouldUseCache && !isAuthenticated) {
      setSiteCacheEntry(cacheKey, html, defaultStoreTtlSeconds);
    }
    return buildHtmlResponse(html);
  }

  return new Response("Not Found", { status: 404 });
}
