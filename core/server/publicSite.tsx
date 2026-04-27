import fs from "node:fs";
import path from "node:path";

import type { DeviceTarget, WidgetBlock } from "../widgets/types";
import { ensureRuntimeWidgetsRegistered } from "../widgets/runtime";
import { renderPublicPageHtml, renderPublicPageRuntimeHtml } from "../site/renderPublicPage";
import {
  renderPublicEntryDetailHtml,
  renderPublicEntryListHtml,
} from "../site/renderPublicEntry";
import {
  buildSiteCacheKey,
  configureSiteCache,
  getSiteCacheEntry,
  normalizeSitePath,
  setSiteCacheEntry,
} from "../site/cache/siteCache";
import { matchContentRoute } from "../site/contentRouteMatcher";
import { toCssVariables } from "../ui/theme/tokenCss";
import { getPageBySlug, getPage } from "../services/pages/pageService";
import {
  type PreviewTargetType,
  validatePreviewToken,
} from "../services/pages/previewService";
import {
  getEntry,
  getEntryBySlug,
  listEntries,
} from "../services/content/entryService";
import {
  DEFAULT_POST_CONTENT_SCHEMA,
  getPost,
  getPostBySlug,
  listPosts,
  POST_CONTENT_TYPE_NAME,
  POST_CONTENT_TYPE_SLUG,
} from "../services/content/postsService";
import { resolveContentListRuntimeData } from "../services/content/contentListResolver";
import { resolvePostsFeedRuntimeData } from "../services/content/postsFeedResolver";
import { resolveEntryTeaserRuntimeData } from "../services/content/entryTeaserResolver";
import {
  hydrateProductCompareRuntimeData,
  hydrateProductGalleryRuntimeData,
  hydrateProductTableRuntimeData,
  type CommerceRuntimeCache,
} from "../services/commerce/commerceWidgetRuntime";
import { getWidgetTemplatePreviewModel } from "../services/widgets/widgetTemplatePreviewService";
import { getContentType, getContentTypeBySlug } from "../services/content/typeService";
import { getSetting, type ContentRouteSetting } from "../services/settings/settingsService";
import { getResolvedTokens } from "../services/theme/tokenService";
import { getActiveThemeProfile } from "../services/themes/themeProfileService";
import type { ContentSchema } from "../services/content/validation";
import { getPageLayoutSettingsFromData } from "../services/pages/layoutSettings";
import { getWidgetTemplateLayoutSettings } from "../services/widgets/widgetTemplateSettings";
import { resolveDevAssetUrl } from "./utils/styleUrl";
import {
  normalizeContentListData,
  type ContentListData,
} from "../widgets/core/contentList";
import {
  normalizePostsFeedData,
  type PostsFeedData,
} from "../widgets/core/postsFeed";
import {
  normalizeEntryTeaserData,
  type EntryTeaserData,
} from "../widgets/core/entryTeaser";
import { type ProductGalleryData } from "../widgets/core/productGallery";
import { type ProductCompareData } from "../widgets/core/productCompare";
import { type ProductTableData } from "../widgets/core/productTable";
import {
  normalizeFormEmbedData,
  type FormEmbedData,
} from "../widgets/core/formEmbed";
import {
  normalizeBookingCalendarData,
  type BookingCalendarData,
} from "../widgets/core/bookingCalendar";
import {
  normalizeAppointmentFormData,
  type AppointmentFormData,
} from "../widgets/core/appointmentForm";
import {
  normalizeListingFiltersData,
  type ListingFiltersData,
} from "../widgets/core/listingFilters";
import {
  normalizeSearchBoxData,
  type SearchBoxData,
} from "../widgets/core/searchBox";
import { resolveNavigationRuntimeData } from "../services/navigation/navigationRuntimeResolver";
import { resolveTemplateSectionRuntimeData } from "../services/widgets/templateSectionRuntime";
import { resolveFormRuntimeData } from "../services/forms/formRuntimeResolver";
import { resolveBookingRuntimeData } from "../services/booking/bookingRuntimeResolver";
import {
  resolveListingFiltersRuntimeData,
  resolveListingSearchRuntimeState,
} from "../services/search/listingRuntimeService";
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

export type PublicPageData = {
  title: string;
  slug: string;
  status: string;
  publishedData?: Record<string, unknown> | null;
  currentData?: Record<string, unknown> | null;
};

const resolveManifestCss = (
  manifestPath: string,
  basePath: string,
  entryHints: string[]
) => {
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<
    string,
    { css?: string[]; isEntry?: boolean }
  >;
  const entry =
    entryHints.map((key) => manifest[key]).find(Boolean) ??
    Object.values(manifest).find((item) => item.isEntry && item.css?.length);
  const css = entry?.css?.[0];
  const prefix = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return css ? `${prefix}/${css}` : null;
};

const resolveSiteCss = () =>
  resolveManifestCss(
    path.resolve(process.cwd(), "dist/site/manifest.json"),
    "/site",
    ["main.ts", "main.tsx", "site/main.ts", "site/main.tsx"]
  );

const resolveAdminCss = () =>
  resolveManifestCss(
    path.resolve(process.cwd(), "dist/client/manifest.json"),
    "/admin",
    ["admin/main.tsx", "admin/index.html"]
  );

const resolveIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return undefined;
};

const isSiteAsset = (pathname: string) =>
  pathname.startsWith("/site/assets/") || pathname === "/site/favicon.ico";

const resolveSiteFile = (pathname: string) => {
  const distDir = path.resolve(process.cwd(), "dist/site");
  const relative = pathname.replace("/site", "") || "/index.html";
  const filePath = path.resolve(distDir, `.${relative}`);
  if (!filePath.startsWith(distDir)) return null;
  return filePath;
};

const serveSiteAsset = async (pathname: string) => {
  const filePath = resolveSiteFile(pathname);
  if (!filePath) return new Response("Forbidden", { status: 403 });
  const file = Bun.file(filePath);
  if (!(await file.exists())) return new Response("Not Found", { status: 404 });
  return new Response(file, { headers: { "Content-Type": file.type } });
};

const resolvePublicStyles = async () => {
  const tokens = await getResolvedTokens();
  const inlineCss = toCssVariables(tokens);

  const siteCssHref = resolveSiteCss();
  if (siteCssHref) return { inlineCss, cssHref: siteCssHref, devModuleScripts: [] };

  const siteDevClient = resolveDevAssetUrl(
    process.env.VITE_SITE_DEV_SERVER_URL,
    "/site/@vite/client"
  );
  const siteDevEntry = resolveDevAssetUrl(
    process.env.VITE_SITE_DEV_SERVER_URL,
    "/site/main.ts"
  );
  if (siteDevClient && siteDevEntry) {
    return {
      inlineCss,
      cssHref: null,
      devModuleScripts: [siteDevClient, siteDevEntry],
    };
  }

  const adminCssHref = resolveAdminCss();
  if (adminCssHref) return { inlineCss, cssHref: adminCssHref, devModuleScripts: [] };

  const adminDevClient = resolveDevAssetUrl(
    process.env.VITE_DEV_SERVER_URL,
    "/admin/@vite/client"
  );
  const adminDevEntry = resolveDevAssetUrl(
    process.env.VITE_DEV_SERVER_URL,
    "/admin/main.tsx"
  );
  if (adminDevClient && adminDevEntry) {
    return {
      inlineCss,
      cssHref: null,
      devModuleScripts: [adminDevClient, adminDevEntry],
    };
  }

  return { inlineCss, cssHref: null, devModuleScripts: [] };
};

const resolvePublicThemeName = async () => {
  const profile = await getActiveThemeProfile();
  return profile?.themeName ?? "default";
};

const toBlocks = (data?: Record<string, unknown> | null): WidgetBlock[] => {
  if (!data || typeof data !== "object") return [];
  const blocks = (data as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return [];
  return blocks as WidgetBlock[];
};

const ensureRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

type RuntimeHydrationCache = {
  booking?: Awaited<ReturnType<typeof resolveBookingRuntimeData>>;
  commerce?: CommerceRuntimeCache;
};

const hydrateRuntimeBlock = async (
  block: WidgetBlock,
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
    templateStack?: string[];
    runtimeSearchParams?: URLSearchParams;
    runtimeCache: RuntimeHydrationCache;
  }
): Promise<WidgetBlock> => {
  let nextBlock: WidgetBlock = block;

  if (block.type === "content-list") {
    const normalizedData = normalizeContentListData(
      ensureRecord(block.data) as ContentListData
    );
    const resolved = await resolveContentListRuntimeData(normalizedData, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
    });
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved,
      },
    };
  }
  if (block.type === "posts-feed") {
    const normalizedData = normalizePostsFeedData(
      ensureRecord(block.data) as PostsFeedData
    );
    const resolved = await resolvePostsFeedRuntimeData(normalizedData, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
    });
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved,
      },
    };
  }
  if (block.type === "listing-filters") {
    const normalizedData = normalizeListingFiltersData(
      ensureRecord(block.data) as ListingFiltersData
    );
    const resolved = await resolveListingFiltersRuntimeData(
      {
        listingQueryId: normalizedData.listingQueryId,
        facets: normalizedData.facets,
        preview: options.preview,
        runtimeSearchParams: options.runtimeSearchParams,
      }
    );

    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved: {
          listingQueryId: resolved.listingQueryId,
          metrics: resolved.metrics,
          searchQuery: resolved.searchQuery,
          rejectedTokens: resolved.rejectedTokens,
          ...(resolved.error ? { error: resolved.error } : {}),
        },
      },
    };
  }
  if (block.type === "search-box") {
    const normalizedData = normalizeSearchBoxData(
      ensureRecord(block.data) as SearchBoxData
    );
    const listingQueryId =
      normalizedData.mode === "listing"
        ? normalizedData.listingQueryId?.trim() ?? ""
        : "";
    const runtimeState = listingQueryId
      ? resolveListingSearchRuntimeState(
          listingQueryId,
          options.runtimeSearchParams
        )
      : { rejectedTokens: [] as string[] };

    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved: {
          ...(normalizedData.resolved ?? {}),
          ...(listingQueryId ? { query: runtimeState.searchQuery } : {}),
          rejectedTokens: runtimeState.rejectedTokens,
        },
      },
    };
  }
  if (block.type === "entry-teaser") {
    const normalizedData = normalizeEntryTeaserData(
      ensureRecord(block.data) as EntryTeaserData
    );
    const resolved = await resolveEntryTeaserRuntimeData(normalizedData, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
    });
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved,
      },
    };
  }
  if (block.type === "product-gallery") {
    const commerceCache = options.runtimeCache.commerce ?? (new Map() as CommerceRuntimeCache);
    options.runtimeCache.commerce = commerceCache;
    const resolvedData = await hydrateProductGalleryRuntimeData(
      ensureRecord(block.data) as ProductGalleryData,
      {
        preview: options.preview,
        cache: commerceCache,
      }
    );
    nextBlock = {
      ...block,
      data: resolvedData,
    };
  }
  if (block.type === "product-compare") {
    const commerceCache = options.runtimeCache.commerce ?? (new Map() as CommerceRuntimeCache);
    options.runtimeCache.commerce = commerceCache;
    const resolvedData = await hydrateProductCompareRuntimeData(
      ensureRecord(block.data) as ProductCompareData,
      {
        preview: options.preview,
        cache: commerceCache,
      }
    );
    nextBlock = {
      ...block,
      data: resolvedData,
    };
  }
  if (block.type === "product-table") {
    const commerceCache = options.runtimeCache.commerce ?? (new Map() as CommerceRuntimeCache);
    options.runtimeCache.commerce = commerceCache;
    const resolvedData = await hydrateProductTableRuntimeData(
      ensureRecord(block.data) as ProductTableData,
      {
        preview: options.preview,
        cache: commerceCache,
      }
    );
    nextBlock = {
      ...block,
      data: resolvedData,
    };
  }
  if (block.type === "form-embed") {
    const normalizedData = normalizeFormEmbedData(
      ensureRecord(block.data) as FormEmbedData
    );
    const resolved = normalizedData.formId
      ? await resolveFormRuntimeData(normalizedData.formId, {
          preview: options.preview,
        })
      : { error: "form_missing" };
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved,
      },
    };
  }
  if (block.type === "booking-calendar") {
    const normalizedData = normalizeBookingCalendarData(
      ensureRecord(block.data) as BookingCalendarData
    );
    const resolved =
      options.runtimeCache.booking ??
      (await resolveBookingRuntimeData({ preview: options.preview }));
    options.runtimeCache.booking = resolved;

    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved: {
          services: resolved.services,
          resources: resolved.resources,
          slotsToken: resolved.slotsToken,
          ...(resolved.error ? { error: resolved.error } : {}),
        },
      },
    };
  }
  if (block.type === "appointment-form") {
    const normalizedData = normalizeAppointmentFormData(
      ensureRecord(block.data) as AppointmentFormData
    );
    const resolved =
      options.runtimeCache.booking ??
      (await resolveBookingRuntimeData({ preview: options.preview }));
    options.runtimeCache.booking = resolved;

    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved: {
          submissionNonce: resolved.submissionNonce,
          ...(resolved.error ? { error: resolved.error } : {}),
        },
      },
    };
  }
  if (block.type === "navigation") {
    const data = ensureRecord(block.data);
    const resolved = await resolveNavigationRuntimeData(data);
    nextBlock = {
      ...block,
      data: {
        ...data,
        items: resolved.items,
        linksSource: resolved.linksSource,
      },
    };
  }
  if (block.type === "template-section") {
    const data = ensureRecord(block.data);
    const templateId = typeof data.templateId === "string" ? data.templateId.trim() : "";
    const resolution = await resolveTemplateSectionRuntimeData(templateId, {
      preview: options.preview,
      templateStack: options.templateStack ?? [],
    });
    const nextStack = templateId
      ? [...(options.templateStack ?? []), templateId]
      : options.templateStack;
    const resolvedBlocks = resolution.blocks.length
      ? await hydrateRuntimeBlocks(resolution.blocks, {
          ...options,
          templateStack: nextStack,
        })
      : [];

    nextBlock = {
      ...block,
      data: {
        ...data,
        ...(templateId ? { templateId } : {}),
        ...(resolution.templateName ? { templateName: resolution.templateName } : {}),
        resolved: {
          blocks: resolvedBlocks,
          ...(resolution.error ? { error: resolution.error } : {}),
        },
      },
    };
  }

  const sourceSlots = nextBlock.slots;
  if (sourceSlots && typeof sourceSlots === "object") {
    const slotEntries = await Promise.all(
      Object.entries(sourceSlots).map(async ([slotId, slotBlocks]) => [
        slotId,
        await hydrateRuntimeBlocks(slotBlocks, options),
      ])
    );
    nextBlock = {
      ...nextBlock,
      slots: Object.fromEntries(slotEntries),
    };
  }

  if (Array.isArray(nextBlock.children) && nextBlock.children.length > 0) {
    nextBlock = {
      ...nextBlock,
      children: await hydrateRuntimeBlocks(nextBlock.children, options),
    };
  }

  return nextBlock;
};

const hydrateRuntimeBlocks = async (
  blocks: WidgetBlock[],
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
    templateStack?: string[];
    runtimeSearchParams?: URLSearchParams;
    runtimeCache: RuntimeHydrationCache;
  }
) => Promise.all(blocks.map((block) => hydrateRuntimeBlock(block, options)));

const buildHtmlResponse = (html: string) =>
  new Response(html, { headers: { "Content-Type": "text/html" } });

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
  }
) => {
  ensureRuntimeWidgetsRegistered();

  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
  const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
  const sourceData = options?.preview ? page.currentData : page.publishedData;
  const sourceRecord = ensureRecord(sourceData);
  const settingsRecord = ensureRecord(sourceRecord.settings);
  const seoRecord = ensureRecord(sourceRecord.seo);
  const themeName = options?.themeName ?? (await resolvePublicThemeName());
  const metaDescription =
    typeof seoRecord.description === "string" && seoRecord.description.trim().length > 0
      ? seoRecord.description.trim()
      : null;
  const blocks = await hydrateRuntimeBlocks(toBlocks(sourceData), {
    preview: options?.preview ?? false,
    contentRoutes,
    runtimeSearchParams: options?.runtimeSearchParams,
    runtimeCache: {},
  });

  return renderPublicPageRuntimeHtml({
    title: page.title ?? "Page",
    blocks,
    cssHref,
    inlineCss,
    isPreview: options?.preview ?? false,
    previewDevice: options?.previewDevice,
    layoutSettings: getPageLayoutSettingsFromData(sourceData),
    devModuleScripts,
    metaDescription,
    themeName,
    templateKey: settingsRecord.template,
  });
};

export async function renderPublicPage(
  page: PublicPageData,
  options?: { preview?: boolean; previewDevice?: DeviceTarget }
) {
  const html = await renderPublicPageHtmlInternal(page, options);
  return buildHtmlResponse(html);
}

const resolvePreviewTargetType = (value: string | null): PreviewTargetType | null => {
  if (value === "page") return "page";
  if (value === "content") return "content";
  if (value === "widget-template") return "widget-template";
  return null;
};

const resolvePreviewDevice = (value: string | null): DeviceTarget | null => {
  if (value === "desktop") return "desktop";
  if (value === "tablet") return "tablet";
  if (value === "mobile") return "mobile";
  return null;
};

const renderWidgetTemplatePreviewHtml = async (
  templateId: string,
  previewDevice?: DeviceTarget
) => {
  ensureRuntimeWidgetsRegistered();
  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
  const template = await getWidgetTemplatePreviewModel(templateId);
  const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
  const blocks = await hydrateRuntimeBlocks(template.blocks, {
    preview: true,
    contentRoutes,
    runtimeCache: {},
  });
  return renderPublicPageHtml({
    title: template.name,
    blocks,
    cssHref,
    inlineCss,
    isPreview: true,
    previewDevice,
    layoutSettings: getWidgetTemplateLayoutSettings(template.settings),
    devModuleScripts,
  });
};

const buildDetailHref = (pattern: string, slug: string, id?: string) => {
  if (pattern.includes(":slug")) {
    return pattern.replace(":slug", encodeURIComponent(slug));
  }
  if (id && pattern.includes(":id")) {
    return pattern.replace(":id", encodeURIComponent(id));
  }
  return pattern;
};

const isEntryPublished = (entry: { status?: string; publishedAt?: Date | null }) =>
  entry.status === "published" && Boolean(entry.publishedAt ?? true);

const renderEntryListHtml = async (
  typeSlug: string,
  detailPath: string,
  options?: { preview?: boolean; themeName?: string }
) => {
  if (isPostContentTypeSlug(typeSlug)) {
    const postItems = (await listPosts())
      .filter((entry) => isEntryPublished(entry))
      .map((entry) => ({
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
      cssHref,
      inlineCss,
      devModuleScripts,
      isPreview: options?.preview ?? false,
      themeName: options?.themeName ?? (await resolvePublicThemeName()),
    });
  }

  const contentType = await getContentTypeBySlug(typeSlug);
  if (!contentType) return null;

  const entries = await listEntries(contentType.id);
  const items = entries
    .filter((entry) => isEntryPublished(entry))
    .map((entry) => ({
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
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview: options?.preview ?? false,
    themeName: options?.themeName ?? (await resolvePublicThemeName()),
  });
};

const renderEntryDetailHtml = async (
  typeSlug: string,
  slug: string,
  options?: { preview?: boolean; themeName?: string; preferGenericEntry?: boolean }
) => {
  if (!options?.preferGenericEntry && isPostContentTypeSlug(typeSlug)) {
    const post = await getPostBySlug(slug);
    if (!post) return null;
    if (!options?.preview && !isEntryPublished(post)) {
      return null;
    }

    const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
    return renderPublicEntryDetailHtml({
      title: post.title ?? POST_CONTENT_TYPE_NAME,
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
      metaDescription:
        post.seo?.description ?? resolvePostRuntimeMetaDescription(post.data),
      canonicalUrl: post.seo?.canonicalUrl ?? null,
    });
  }

  const contentType = await getContentTypeBySlug(typeSlug);
  if (!contentType) return null;

  const entry = await getEntryBySlug(contentType.id, slug);
  if (!entry) return null;
  if (!options?.preview && !isEntryPublished(entry)) {
    return null;
  }

  const entryDetail = await getEntry(entry.id);
  if (!entryDetail) return null;

  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
  return renderPublicEntryDetailHtml({
    title: entryDetail.title ?? contentType.name,
    contentType: {
      id: contentType.id,
      name: contentType.name,
      slug: contentType.slug,
      schema: contentType.schema as ContentSchema,
    },
    entry: entryDetail,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview: options?.preview ?? false,
    themeName: options?.themeName ?? (await resolvePublicThemeName()),
    metaDescription:
      "seo" in entryDetail && entryDetail.seo
        ? entryDetail.seo.description ?? resolvePostRuntimeMetaDescription(entryDetail.data)
        : resolvePostRuntimeMetaDescription(entryDetail.data),
    canonicalUrl:
      "seo" in entryDetail && entryDetail.seo
        ? entryDetail.seo.canonicalUrl ?? null
        : null,
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
    if (!preview) return new Response("Preview expired", { status: 410 });

    if (preview.targetType === "page") {
      const page = await getPage(preview.targetId);
      if (!page) return new Response("Not Found", { status: 404 });
      const html = await renderPublicPageHtmlInternal(page as PublicPageData, {
        preview: true,
        previewDevice,
        runtimeSearchParams: url.searchParams,
      });
      return buildHtmlResponse(html);
    }

    if (preview.targetType === "content") {
      const post = await getPost(preview.targetId);
      if (post) {
        const html = await renderEntryDetailHtml(POST_CONTENT_TYPE_SLUG, post.slug, {
          preview: true,
        });
        if (!html) return new Response("Not Found", { status: 404 });
        return buildHtmlResponse(html);
      }

      const entry = await getEntry(preview.targetId);
      if (!entry) return new Response("Not Found", { status: 404 });
      const contentType = await getContentType(entry.typeId);
      if (!contentType) return new Response("Not Found", { status: 404 });
      const html = await renderEntryDetailHtml(contentType.slug, entry.slug, {
        preview: true,
        preferGenericEntry: true,
      });
      if (!html) return new Response("Not Found", { status: 404 });
      return buildHtmlResponse(html);
    }

    if (preview.targetType === "widget-template") {
      try {
        const html = await renderWidgetTemplatePreviewHtml(
          preview.targetId,
          previewDevice
        );
        return buildHtmlResponse(html);
      } catch (error) {
        if (error instanceof Error && error.message === "widget_template_not_found") {
          return new Response("Not Found", { status: 404 });
        }
        throw error;
      }
    }
  }

  const slugPath = normalizeSitePath(url.pathname);
  const cacheTtlSeconds = (await getSetting("site.cacheTtlSeconds")) as number;
  const activeProfile = await getActiveThemeProfile();
  const cacheProfileId = activeProfile?.id ?? "default";
  const themeName = activeProfile?.themeName ?? "default";
  configureSiteCache(cacheTtlSeconds);
  const hasQueryParams = url.searchParams.toString().length > 0;
  const shouldUseCache = cacheTtlSeconds > 0 && !hasQueryParams;

  const cacheKey = buildSiteCacheKey(cacheProfileId, slugPath);
  if (shouldUseCache) {
    const cachedHtml = getSiteCacheEntry(cacheKey);
    if (cachedHtml) {
      return buildHtmlResponse(cachedHtml);
    }
  }

  const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
  const match = matchContentRoute(slugPath, contentRoutes);
  if (match) {
    if (match.mode === "list") {
      const html = await renderEntryListHtml(match.type, match.detailPath, {
        themeName,
      });
      if (!html) return new Response("Not Found", { status: 404 });
      if (shouldUseCache) {
        setSiteCacheEntry(cacheKey, html, cacheTtlSeconds);
      }
      return buildHtmlResponse(html);
    }
    const slug = match.params.slug ?? match.params.id ?? "";
    if (!slug) return new Response("Not Found", { status: 404 });
    const html = await renderEntryDetailHtml(match.type, slug, { themeName });
    if (!html) return new Response("Not Found", { status: 404 });
    if (shouldUseCache) {
      setSiteCacheEntry(cacheKey, html, cacheTtlSeconds);
    }
    return buildHtmlResponse(html);
  }
  const page = await getPageBySlug(slugPath);
  if (!page) return new Response("Not Found", { status: 404 });
  if (page.status !== "published" || !page.publishedData) {
    return new Response("Not Found", { status: 404 });
  }
  const html = await renderPublicPageHtmlInternal(page as PublicPageData, {
    themeName,
    runtimeSearchParams: url.searchParams,
  });
  if (shouldUseCache) {
    setSiteCacheEntry(cacheKey, html, cacheTtlSeconds);
  }
  return buildHtmlResponse(html);
}
