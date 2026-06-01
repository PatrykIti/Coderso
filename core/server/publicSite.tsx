import fs from "node:fs";
import path from "node:path";

import type { DeviceTarget, WidgetBlock } from "../widgets/types";
import { ensureRuntimeWidgetsRegistered } from "../widgets/runtime";
import { renderPublicPageHtml, renderPublicPageRuntimeHtml } from "../site/renderPublicPage";
import { renderPublicEntryDetailHtml, renderPublicEntryListHtml } from "../site/renderPublicEntry";
import {
  blocksAllowSiteHtmlCache,
  buildSiteCacheKey,
  configureSiteCache,
  getSiteCacheEntry,
  normalizeSitePath,
  setSiteCacheEntry,
} from "../site/cache/siteCache";
import { matchContentRoute } from "../site/contentRouteMatcher";
import { toCssVariables } from "../ui/theme/tokenCss";
import { getPageBySlug, getPage } from "../services/pages/pageService";
import { type PreviewTargetType, validatePreviewToken } from "../services/pages/previewService";
import { getEntry, getEntryBySlug, listEntries } from "../services/content/entryService";
import {
  DEFAULT_POST_CONTENT_SCHEMA,
  getPost,
  getPostBySlug,
  listPosts,
  POST_CONTENT_TYPE_NAME,
  POST_CONTENT_TYPE_SLUG,
} from "../services/content/postsService";
import { resolveContentListRuntimeData } from "../services/content/contentListResolver";
import {
  resolvePreviewDetailPageRuntime,
  resolvePublishedDetailPageRuntime,
} from "../services/content/detailPageRuntimeResolver";
import { isDetailPageTitleTokenSafe } from "../services/content/detailPageSchema";
import type { DetailPageDocument } from "../services/content/detailPageTypes";
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
import { resolveDevAssetUrl, resolveSiteDevServerUrl } from "./utils/styleUrl";
import { normalizeContentListData, type ContentListData } from "../widgets/core/contentList";
import { normalizePostsFeedData, type PostsFeedData } from "../widgets/core/postsFeed";
import { normalizeEntryTeaserData, type EntryTeaserData } from "../widgets/core/entryTeaser";
import { type ProductGalleryData } from "../widgets/core/productGallery";
import { type ProductCompareData } from "../widgets/core/productCompare";
import { type ProductTableData } from "../widgets/core/productTable";
import { normalizeContactData, type ContactData } from "../widgets/core/contact";
import { normalizeFormEmbedData, type FormEmbedData } from "../widgets/core/formEmbed";
import { normalizeNewsletterData, type NewsletterData } from "../widgets/core/newsletter";
import {
  normalizeBookingCalendarData,
  type BookingCalendarData,
} from "../widgets/core/bookingCalendar";
import {
  appointmentFormSchema,
  normalizeAppointmentFormData,
  type AppointmentFormData,
} from "../widgets/core/appointmentForm";
import {
  normalizeListingFiltersData,
  type ListingFiltersData,
} from "../widgets/core/listingFilters";
import { normalizeSearchBoxData, type SearchBoxData } from "../widgets/core/searchBox";
import { resolveNavigationRuntimeData } from "../services/navigation/navigationRuntimeResolver";
import { resolveTemplateSectionRuntimeData } from "../services/widgets/templateSectionRuntime";
import { resolveFormRuntimeData } from "../services/forms/formRuntimeResolver";
import { resolveBookingRuntimeData } from "../services/booking/bookingRuntimeResolver";
import {
  resolveListingFiltersRuntimeData,
  resolveListingSearchRuntimeState,
} from "../services/search/listingRuntimeService";
import {
  isDetailPageIdFormat,
  normalizeDetailPageIdText,
} from "../services/settings/detailPageIdContract";
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
import { readBindingPathValue } from "../services/utils/bindingPath";

export type PublicPageData = {
  title: string;
  slug: string;
  status: string;
  publishedData?: Record<string, unknown> | null;
  currentData?: Record<string, unknown> | null;
};

const resolveManifestCss = (manifestPath: string, basePath: string, entryHints: string[]) => {
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
  resolveManifestCss(path.resolve(process.cwd(), "dist/site/manifest.json"), "/site", [
    "main.ts",
    "main.tsx",
    "site/main.ts",
    "site/main.tsx",
  ]);

const resolveAdminCss = () =>
  resolveManifestCss(path.resolve(process.cwd(), "dist/client/manifest.json"), "/admin", [
    "admin/main.tsx",
    "admin/index.html",
  ]);

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
  const adminDevBaseUrl =
    process.env.VITE_DEV_SERVER_URL ?? process.env.CODERSO_PUBLIC_VITE_DEV_URL;
  const siteDevBaseUrl = resolveSiteDevServerUrl(
    process.env.VITE_SITE_DEV_SERVER_URL,
    adminDevBaseUrl
  );

  const siteCssHref = resolveSiteCss();
  if (siteCssHref) return { inlineCss, cssHref: siteCssHref, devModuleScripts: [] };

  const siteDevClient = resolveDevAssetUrl(siteDevBaseUrl ?? undefined, "/site/@vite/client");
  const siteDevEntry = resolveDevAssetUrl(siteDevBaseUrl ?? undefined, "/site/main.ts");
  if (siteDevClient && siteDevEntry) {
    return {
      inlineCss,
      cssHref: null,
      devModuleScripts: [siteDevClient, siteDevEntry],
    };
  }

  const adminCssHref = resolveAdminCss();
  if (adminCssHref) return { inlineCss, cssHref: adminCssHref, devModuleScripts: [] };

  const adminDevClient = resolveDevAssetUrl(adminDevBaseUrl ?? undefined, "/admin/@vite/client");
  const adminDevEntry = resolveDevAssetUrl(adminDevBaseUrl ?? undefined, "/admin/main.tsx");
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

const hasNestedTemplateSectionError = (blocks: WidgetBlock[], error: string): boolean =>
  blocks.some((block) => {
    const data = ensureRecord(block.data);
    const resolved = ensureRecord(data.resolved);
    if (block.type === "template-section" && resolved.error === error) {
      return true;
    }

    const resolvedBlocks = Array.isArray(resolved.blocks) ? (resolved.blocks as WidgetBlock[]) : [];
    if (hasNestedTemplateSectionError(resolvedBlocks, error)) return true;

    const children = Array.isArray(block.children) ? block.children : [];
    if (hasNestedTemplateSectionError(children, error)) return true;

    const slots = ensureRecord(block.slots);
    return Object.values(slots).some((slotBlocks) =>
      Array.isArray(slotBlocks)
        ? hasNestedTemplateSectionError(slotBlocks as WidgetBlock[], error)
        : false
    );
  });

const appointmentFormSupportsRuntimeCaptchaHydration = (() => {
  const properties = ensureRecord((appointmentFormSchema as { properties?: unknown }).properties);
  const resolvedSchema = ensureRecord(
    (properties.resolved as { properties?: unknown } | undefined)?.properties
  );
  return Object.prototype.hasOwnProperty.call(resolvedSchema, "captcha");
})();

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
    const normalizedData = normalizeContentListData(ensureRecord(block.data) as ContentListData);
    const resolved = await resolveContentListRuntimeData(normalizedData, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
      blockId: block.id,
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
    const normalizedData = normalizePostsFeedData(ensureRecord(block.data) as PostsFeedData);
    const resolved = await resolvePostsFeedRuntimeData(normalizedData, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
      blockId: block.id,
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
    const resolved = await resolveListingFiltersRuntimeData({
      listingQueryId: normalizedData.listingQueryId,
      facets: normalizedData.facets,
      preview: options.preview,
      runtimeSearchParams: options.runtimeSearchParams,
    });

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
    const normalizedData = normalizeSearchBoxData(ensureRecord(block.data) as SearchBoxData);
    const listingQueryId =
      normalizedData.mode === "listing" ? (normalizedData.listingQueryId?.trim() ?? "") : "";
    const runtimeState = listingQueryId
      ? resolveListingSearchRuntimeState(listingQueryId, options.runtimeSearchParams)
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
    const normalizedData = normalizeEntryTeaserData(ensureRecord(block.data) as EntryTeaserData);
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
        runtimeSearchParams: options.runtimeSearchParams,
        blockId: block.id,
      }
    );
    nextBlock = {
      ...block,
      data: resolvedData,
    };
  }
  if (block.type === "form-embed") {
    const normalizedData = normalizeFormEmbedData(ensureRecord(block.data) as FormEmbedData);
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
  if (block.type === "contact") {
    const normalizedData = normalizeContactData(ensureRecord(block.data) as ContactData);
    const submission = normalizedData.form?.submission;
    const formId = submission?.mode === "forms-runtime" ? (submission.formId ?? "").trim() : "";
    const resolvedData = formId
      ? await resolveFormRuntimeData(formId, {
          preview: options.preview,
        })
      : undefined;
    const resolved = resolvedData
      ? {
          formId: resolvedData.formId,
          formName: resolvedData.formName,
          description: resolvedData.description,
          status: resolvedData.status,
          successMessage: resolvedData.successMessage,
          successRedirectUrl: resolvedData.successRedirectUrl,
          submissionAccess: resolvedData.submissionAccess,
          submissionNonce: resolvedData.submissionNonce ?? null,
          fields: resolvedData.fields,
          ...(resolvedData.error ? { error: resolvedData.error } : {}),
        }
      : undefined;
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        ...(resolved ? { resolved } : {}),
      },
    };
  }
  if (block.type === "newsletter") {
    const normalizedData = normalizeNewsletterData(ensureRecord(block.data) as NewsletterData);
    const formId =
      normalizedData.submission?.mode === "forms-runtime"
        ? (normalizedData.submission.formId ?? "").trim()
        : "";
    const resolvedData = formId
      ? await resolveFormRuntimeData(formId, {
          preview: options.preview,
        })
      : undefined;
    const resolved = resolvedData
      ? {
          formId: resolvedData.formId,
          formName: resolvedData.formName,
          description: resolvedData.description,
          status: resolvedData.status,
          successMessage: resolvedData.successMessage,
          successRedirectUrl: resolvedData.successRedirectUrl,
          submissionAccess: resolvedData.submissionAccess,
          submissionNonce: resolvedData.submissionNonce ?? null,
          botProtection: resolvedData.botProtection ?? null,
          fields: resolvedData.fields,
          ...(resolvedData.error ? { error: resolvedData.error } : {}),
        }
      : undefined;
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        ...(resolved ? { resolved } : {}),
      },
    };
  }
  if (block.type === "booking-calendar") {
    const normalizedData = normalizeBookingCalendarData(
      ensureRecord(block.data) as BookingCalendarData
    );
    const slotPolicy = {
      ...(normalizedData.minDate ? { minDate: normalizedData.minDate } : {}),
      ...(normalizedData.maxDate ? { maxDate: normalizedData.maxDate } : {}),
    };
    const shouldReuseBookingCache = !slotPolicy.minDate && !slotPolicy.maxDate;
    const resolved =
      shouldReuseBookingCache && options.runtimeCache.booking
        ? options.runtimeCache.booking
        : await resolveBookingRuntimeData({
            preview: options.preview,
            ...(shouldReuseBookingCache ? {} : { slotPolicy }),
          });
    if (shouldReuseBookingCache) {
      options.runtimeCache.booking = resolved;
    }

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
          ...(appointmentFormSupportsRuntimeCaptchaHydration ? { captcha: resolved.captcha } : {}),
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
    const rawTemplateId = typeof data.templateId === "string" ? data.templateId : "";
    const resolution = await resolveTemplateSectionRuntimeData(rawTemplateId, {
      preview: options.preview,
      templateStack: options.templateStack ?? [],
    });
    const templateId = resolution.templateId ?? "";
    const nextStack = templateId
      ? [...(options.templateStack ?? []), templateId]
      : options.templateStack;
    const resolvedBlocks = resolution.blocks.length
      ? await hydrateRuntimeBlocks(resolution.blocks, {
          ...options,
          templateStack: nextStack,
        })
      : [];
    const resolvedError =
      resolution.error ??
      (hasNestedTemplateSectionError(resolvedBlocks, "template_loop")
        ? "template_loop"
        : undefined);

    nextBlock = {
      ...block,
      data: {
        ...data,
        templateId,
        ...(resolution.templateName ? { templateName: resolution.templateName } : {}),
        resolved: {
          blocks: resolvedBlocks,
          ...(resolvedError ? { error: resolvedError } : {}),
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

type PublicHtmlRenderResult = {
  html: string;
  cacheable: boolean;
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type DetailPageRuntimeEntrySeo = {
  description?: string | null;
  canonicalUrl?: string | null;
};

type DetailPageRuntimeEntry = {
  title?: string | null;
  slug?: string | null;
  data?: Record<string, unknown> | null;
  seo?: DetailPageRuntimeEntrySeo | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  author?: { name?: string | null } | null;
};

const detailPageTitleTokenPattern = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}|\{\s*([A-Za-z0-9_.-]+)\s*\}/g;

const toPublicSeoText = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  return null;
};

const readDetailPageEntryValue = (entry: DetailPageRuntimeEntry, field: string) => {
  const normalized = field.trim();
  switch (normalized) {
    case "title":
      return entry.title;
    case "slug":
      return entry.slug;
    case "publishedAt":
      return entry.publishedAt;
    case "updatedAt":
      return entry.updatedAt;
    case "createdAt":
      return entry.createdAt;
    case "author":
      return entry.author?.name ?? null;
    default: {
      const dataPath = normalized.startsWith("data.")
        ? normalized.slice("data.".length)
        : normalized;
      return readBindingPathValue(entry.data ?? {}, dataPath);
    }
  }
};

const resolveDetailPageTitle = (
  pattern: string | null | undefined,
  entry: DetailPageRuntimeEntry,
  fallback: string
) => {
  const source = typeof pattern === "string" && pattern.trim().length > 0 ? pattern : fallback;
  let blockedToken = false;
  const rendered = source.replace(
    detailPageTitleTokenPattern,
    (_match, doubleToken, singleToken) => {
      const token = doubleToken ?? singleToken;
      if (!isDetailPageTitleTokenSafe(token)) {
        blockedToken = true;
        return "";
      }
      return toPublicSeoText(readDetailPageEntryValue(entry, token)) ?? "";
    }
  );
  if (blockedToken) return fallback;
  const trimmed = rendered.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const resolveDetailPageImageUrl = (value: unknown): string | null => {
  if (Array.isArray(value)) return value.length > 0 ? resolveDetailPageImageUrl(value[0]) : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed.startsWith("/") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("http://")
    ) {
      return trimmed;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return resolveDetailPageImageUrl(record.src ?? record.url);
};

const resolveEntryMetaDescription = (entry: DetailPageRuntimeEntry) =>
  entry.seo?.description ?? resolvePostRuntimeMetaDescription(entry.data ?? {});

const resolveDetailPageRuntimeSeo = (input: {
  document: DetailPageDocument;
  entry: DetailPageRuntimeEntry;
  contentTypeName: string;
}) => {
  const fallbackTitle = input.entry.title ?? input.contentTypeName;
  const descriptionField = input.document.seo?.descriptionField ?? null;
  const imageField = input.document.seo?.imageField ?? null;
  const description = descriptionField
    ? toPublicSeoText(readDetailPageEntryValue(input.entry, descriptionField))
    : null;
  const imageUrl = imageField
    ? resolveDetailPageImageUrl(readDetailPageEntryValue(input.entry, imageField))
    : null;

  return {
    title: resolveDetailPageTitle(
      input.document.seo?.titlePattern ?? input.document.titlePattern,
      input.entry,
      fallbackTitle
    ),
    metaDescription: description ?? resolveEntryMetaDescription(input.entry),
    imageUrl,
    canonicalUrl: input.entry.seo?.canonicalUrl ?? null,
  };
};

const renderPublicPageHtmlInternal = async (
  page: PublicPageData,
  options?: {
    preview?: boolean;
    previewDevice?: DeviceTarget;
    themeName?: string;
    runtimeSearchParams?: URLSearchParams;
  }
): Promise<PublicHtmlRenderResult> => {
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

  return {
    html: await renderPublicPageRuntimeHtml({
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
    }),
    cacheable: blocksAllowSiteHtmlCache(blocks),
  };
};

export async function renderPublicPage(
  page: PublicPageData,
  options?: { preview?: boolean; previewDevice?: DeviceTarget }
) {
  const result = await renderPublicPageHtmlInternal(page, options);
  return buildHtmlResponse(result.html);
}

const resolvePreviewTargetType = (value: string | null): PreviewTargetType | null => {
  if (value === "page") return "page";
  if (value === "content") return "content";
  if (value === "widget-template") return "widget-template";
  if (value === "detail-page") return "detail-page";
  return null;
};

const normalizePreviewDetailPageId = (value: string | null) => {
  const normalized = normalizeDetailPageIdText(value);
  if (!normalized || !isDetailPageIdFormat(normalized)) return null;
  return normalized;
};

const resolveLinkedDetailPageId = (typeSlug: string, contentRoutes: ContentRouteSetting[]) =>
  contentRoutes.find((entry) => entry.enabled && entry.type === typeSlug)?.detailPageId ?? null;

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
      metaDescription: post.seo?.description ?? resolvePostRuntimeMetaDescription(post.data),
      canonicalUrl: post.seo?.canonicalUrl ?? null,
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
    const blocks = await hydrateRuntimeBlocks(detailPage.blocks, {
      preview: options?.preview ?? false,
      contentRoutes,
      runtimeSearchParams: options?.runtimeSearchParams,
      runtimeCache: {},
    });
    return {
      html: await renderPublicPageRuntimeHtml({
        title: detailSeo.title,
        blocks,
        cssHref,
        inlineCss,
        devModuleScripts,
        isPreview: options?.preview ?? false,
        previewDevice: options?.previewDevice,
        layoutSettings: detailPage.document.settings.layout,
        metaDescription: detailSeo.metaDescription,
        canonicalUrl: detailSeo.canonicalUrl,
        imageUrl: detailSeo.imageUrl,
        themeName: options?.themeName ?? (await resolvePublicThemeName()),
        templateKey: detailPage.document.settings.template,
      }),
      cacheable: blocksAllowSiteHtmlCache(blocks),
    };
  }

  return renderPublicEntryDetailHtml({
    title: entryDetail.title ?? contentType.name,
    contentType: contentTypeSnapshot,
    entry: entryDetail,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview: options?.preview ?? false,
    themeName: options?.themeName ?? (await resolvePublicThemeName()),
    metaDescription:
      "seo" in entryDetail && entryDetail.seo
        ? (entryDetail.seo.description ?? resolvePostRuntimeMetaDescription(entryDetail.data))
        : resolvePostRuntimeMetaDescription(entryDetail.data),
    canonicalUrl:
      "seo" in entryDetail && entryDetail.seo ? (entryDetail.seo.canonicalUrl ?? null) : null,
  });
};

const renderDetailPagePreviewHtml = async (input: {
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

  return renderPublicPageRuntimeHtml({
    title: detailSeo.title,
    blocks: await hydrateRuntimeBlocks(detailPage.blocks, {
      preview: true,
      contentRoutes,
      runtimeSearchParams: input.runtimeSearchParams,
      runtimeCache: {},
    }),
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview: true,
    previewDevice: input.previewDevice,
    layoutSettings: detailPage.document.settings.layout,
    metaDescription: detailSeo.metaDescription,
    canonicalUrl: detailSeo.canonicalUrl,
    imageUrl: detailSeo.imageUrl,
    themeName: await resolvePublicThemeName(),
    templateKey: detailPage.document.settings.template,
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

    if (preview.token.targetType === "widget-template") {
      try {
        const html = await renderWidgetTemplatePreviewHtml(preview.token.targetId, previewDevice);
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
      });
      if (shouldUseCache && result.cacheable) {
        setSiteCacheEntry(cacheKey, result.html, cacheTtlSeconds);
      }
      return buildHtmlResponse(result.html);
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
    const detailHtml = await renderEntryDetailHtml(match.type, slug, {
      themeName,
      routeParam: match.params.slug ? "slug" : "id",
      detailPageId: match.detailPageId,
      contentRoutes,
      runtimeSearchParams: url.searchParams,
    });
    if (!detailHtml) return new Response("Not Found", { status: 404 });
    const html = typeof detailHtml === "string" ? detailHtml : detailHtml.html;
    const canCache = typeof detailHtml === "string" ? true : detailHtml.cacheable;
    if (shouldUseCache && canCache) {
      setSiteCacheEntry(cacheKey, html, cacheTtlSeconds);
    }
    return buildHtmlResponse(html);
  }
  const page = await getPageBySlug(slugPath);
  if (!page) return new Response("Not Found", { status: 404 });
  if (page.status !== "published" || !page.publishedData) {
    return new Response("Not Found", { status: 404 });
  }
  const result = await renderPublicPageHtmlInternal(page as PublicPageData, {
    themeName,
    runtimeSearchParams: url.searchParams,
  });
  if (shouldUseCache && result.cacheable) {
    setSiteCacheEntry(cacheKey, result.html, cacheTtlSeconds);
  }
  return buildHtmlResponse(result.html);
}
