// core/server/publicEntryRender.tsx
// Public entry render pipeline (list + detail + detail-page preview), split out
// of core/server/publicSite.tsx for the repo line-limit gate. The entry-visibility
// seams (gateOrNull / password prompt / unlock context / cache probe) live in
// ./publicEntryGateUi.tsx; this module owns the render host for entries.
import type { DeviceTarget } from "../widgets/types";
import { hydrateRuntimeBlocks } from "./publicSiteRenderContext";
import { renderPublicPageRuntimeHtml } from "../site/renderPublicPage";
import { renderPublicEntryDetailHtml, renderPublicEntryListHtml } from "../site/renderPublicEntry";
import { blocksAllowSiteHtmlCache } from "../site/cache/siteCache";
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
import { getContentType, getContentTypeBySlug } from "../services/content/typeService";
import { resolvePublicSeoMetadata } from "../services/seo/seoService";
import { getSetting } from "../services/settings/settingsService";
import type { ContentRouteSetting } from "../services/settings/settingsContracts";
import { getActiveThemeProfile } from "../services/themes/themeProfileService";
import type { ContentSchema } from "../services/content/validation";
import {
  isPostContentTypeSlug,
  resolvePostRuntimeMetaDescription,
} from "../services/posts/runtime/postBlockRuntimeMapper";
import type { PageRuntimeCacheMode } from "../services/pages/pageRuntimeBindingContract";
import {
  collectPrehydratedDetailBlockIds,
  resolveDetailPageRuntimeSeo,
} from "./publicSiteEntryRuntime";
import {
  buildLiveAnalyticsScriptHtml,
  resolvePublicSiteShellContext,
} from "./publicSitePageRuntime";
import {
  buildDetailHref,
  isEntryPublished,
  paginateEntryListEntries,
  resolveLinkedDetailPageId,
} from "./publicSiteRouteRuntime";
import { resolvePublicStyles } from "./publicSiteAssets";
import {
  filterVisibleEntries,
  gateOrNull,
  renderEntryPasswordPromptResult,
  type RenderEntryDetailOptions,
} from "./publicEntryGateUi";

export const resolvePublicThemeName = async () => {
  const profile = await getActiveThemeProfile();
  return profile?.themeName ?? "default";
};

export type PublicHtmlRenderResult = {
  html: string;
  cacheable: boolean;
  /** Granular cache policy for v2 page renders. */
  cacheMode?: PageRuntimeCacheMode;
};

export const resolveRequestCanonicalUrl = (input: {
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

export const renderEntryListHtml = async (
  typeSlug: string,
  detailPath: string,
  options?: {
    preview?: boolean;
    themeName?: string;
    runtimeSearchParams?: URLSearchParams;
    /** content:read-bounded admin/editor flag — sees the full list (bypass parity with the detail gate). */
    isAuthenticated?: boolean;
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
    });
  }

  const contentType = await getContentTypeBySlug(typeSlug);
  if (!contentType) return null;

  // TASK-517-01-L05: anon list bodies never enumerate private/password entries
  // (no existence leak); content:read session sees the full list. Filter BEFORE
  // pagination so pager counts reflect the visible set.
  const listed = await listEntries(contentType.id);
  const visible = filterVisibleEntries(listed, options?.isAuthenticated);
  const paged = paginateEntryListEntries(visible, options?.runtimeSearchParams);
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
  });
};

export const renderEntryDetailHtml = async (
  typeSlug: string,
  routeValue: string,
  options?: RenderEntryDetailOptions
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

  // TASK-517-01-L03: entry-visibility gate — the ONLY gated branch. The POST
  // branch (posts table, no visibility model) is NOT gated above.
  const entryIsGated =
    entryDetail.visibility === "private" || entryDetail.visibility === "password";
  const gateDecision = gateOrNull(entryDetail, options);
  if (gateDecision.kind === "not-found") return null;
  if (gateDecision.kind === "prompt") {
    return renderEntryPasswordPromptResult(entryDetail, options, options?.requestPath);
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
      }),
      cacheable: entryIsGated ? false : blocksAllowSiteHtmlCache(blocks),
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

  const renderedHtml = await renderPublicEntryDetailHtml({
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
  });
  // GATED allow render (private/password, including the authed bypass) must
  // NEVER persist to the shared anon-served cache — return the object form with
  // cacheable:false so the caller computes canCache=false (TASK-517-01-L03 #7).
  return entryIsGated ? { html: renderedHtml, cacheable: false } : renderedHtml;
};

export const renderDetailPagePreviewHtml = async (input: {
  detailPageId: string;
  sampleEntryId: string;
  previewDevice: DeviceTarget;
  runtimeSearchParams: URLSearchParams;
}) => {
  const entryDetail = await getEntry(input.sampleEntryId);
  if (!entryDetail || !isEntryPublished(entryDetail)) return null;

  const contentType = await getContentType(entryDetail.typeId);
  if (!contentType) return null;

  const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
  const detailPage = await resolvePreviewDetailPageRuntime({
    detailPageId: input.detailPageId,
    documentSource: "current",
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

  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
  const detailSeo = resolveDetailPageRuntimeSeo({
    document: detailPage.document,
    entry: entryDetail,
    contentTypeName: contentType.name,
  });
  const { siteShell, siteName } = await resolvePublicSiteShellContext({
    document: null,
    includeResponsiveCss: false,
  });

  return renderPublicPageRuntimeHtml({
    title: detailSeo.title,
    blocks: await hydrateRuntimeBlocks(detailPage.blocks, {
      preview: true,
      contentRoutes,
      runtimeSearchParams: input.runtimeSearchParams,
      runtimeCache: {},
      prehydratedBlockIds: collectPrehydratedDetailBlockIds(detailPage.document),
    }),
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview: true,
    previewDevice: input.previewDevice,
    layoutSettings: detailPage.document.settings.layout,
    metaDescription: detailSeo.metaDescription,
    canonicalUrl: detailSeo.canonicalUrl,
    robots: entryDetail.seo?.robots ?? null,
    siteShell,
    siteName,
    siteLocale: await getSetting("site.locale"),
    imageUrl: detailSeo.imageUrl,
    themeName: await resolvePublicThemeName(),
    templateKey: detailPage.document.settings.template,
  });
};
