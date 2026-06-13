import {
  contentListDefaults,
  contentListLimitMax,
  mapListingTemplatePresentationToContentList,
  normalizeContentListData,
  type ContentListData,
  type ContentListVariantId,
} from "../../widgets/core/contentList";
import {
  normalizeListingFiltersData,
  type ListingFiltersData,
} from "../../widgets/core/listingFilters";
import {
  normalizeListingRuntimeAliases,
  type ListingRuntimeAliasMap,
} from "../search/filterContract";
import type {
  ContentListResolvedRuntimeData,
  resolveContentListRuntimeData,
} from "../content/contentListResolver";
import type { FormRuntimeResolution, resolveFormRuntimeData } from "../forms/formRuntimeResolver";
import type {
  ListingFiltersRuntimeResult,
  resolveListingFiltersRuntimeData,
} from "../search/listingRuntimeService";
import { getDefaultFormSettings } from "../forms/formSettings";
import {
  dangerousHtmlContentTagSet,
  escapeHtml,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
} from "../posts/editor/postRichTextHtmlUtils";
import { toYoutubeEmbedUrl } from "../posts/shared/videoEmbed";
import type { ContentRouteSetting } from "../settings/settingsService";
import {
  getPageBlockActiveSlotKeys,
  resolvePageDocumentForBreakpoint,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionV2,
  type PageSectionVisibilityV2,
} from "./pageDocumentV2";

export type PageRuntimeCollectionBinding = {
  kind: "collection";
  data: ContentListData;
  /**
   * Effective list variant (TASK-459-03 template-style consumption): set when
   * the bound listing template's `config.style.cardVariant` selects a
   * non-default presentation (e.g. "compact"). Absent = today's grid render.
   */
  variant?: ContentListVariantId;
};

export type PageRuntimeFiltersBinding = {
  kind: "filters";
  /** Shared listing-filters data shape consumed by the reused facet markup. */
  data: ListingFiltersData;
  /**
   * Total of the bound listing execution (TASK-459-01 counts contract field).
   * Rendered by the filters block result-count display; truthful full-corpus
   * values land with TASK-459-04 — the field contract is stable already.
   */
  total: number;
};

export type PageRuntimeFormBinding = {
  kind: "form";
  formId: string;
  title: string | null;
  resolution: FormRuntimeResolution;
};

export type PageRuntimeEmbedBinding = {
  kind: "embed";
  sanitizedHtml: string;
  iframeSrc: string | null;
  iframeTitle: string;
};

export type PageRuntimeDataBinding =
  | PageRuntimeCollectionBinding
  | PageRuntimeFiltersBinding
  | PageRuntimeFormBinding
  | PageRuntimeEmbedBinding;

export type PageRuntimeDataByBlockId = Record<string, PageRuntimeDataBinding>;

export type PageRuntimeDataBindingDeps = {
  resolveContentListRuntimeData?: typeof resolveContentListRuntimeData;
  resolveFormRuntimeData?: typeof resolveFormRuntimeData;
  resolveListingFiltersRuntimeData?: typeof resolveListingFiltersRuntimeData;
  now?: () => Date;
};

/**
 * Whole-page HTML cache mode (TASK-459-04):
 * - `"full"` — fully static render, cacheable for the configured site TTL;
 * - `"short-ttl"` — the only dynamic bindings are listing-shaped
 *   (collection/filters over published content), safe to cache under a
 *   short, bounded TTL so filtered catalog requests stop re-rendering on
 *   every hit;
 * - `"none"` — request-coupled state (forms with submission nonces,
 *   auth/schedule-gated sections) must never be cached.
 */
export type PageRuntimeCacheMode = "full" | "short-ttl" | "none";

export type PreparedPageRuntimeDocument = {
  document: PageDocumentV2;
  runtimeDataByBlockId: PageRuntimeDataByBlockId;
  cacheable: boolean;
  cacheMode: PageRuntimeCacheMode;
  /**
   * Whether the rendered page needs the shared listing runtime client script
   * (TASK-459-02 body-script seam): true exactly when a filters block bound
   * to an existing saved query rendered a live facet form. The script stays
   * progressive enhancement — the facet form is a plain GET form that filters
   * without JS through the existing `lq.*` server pipeline.
   */
  needsListingRuntimeScript: boolean;
};

type PreparePageRuntimeOptions = {
  preview: boolean;
  breakpoint: PageBreakpoint;
  contentRoutes: ContentRouteSetting[];
  runtimeSearchParams?: URLSearchParams;
  listingRuntimeAliasesByQueryId?: Record<string, ListingRuntimeAliasMap>;
};

const pageEmbedAllowedTags = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "ul",
]);

const pageEmbedSelfClosingTags = new Set(["br"]);

const readOptionalText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readBoundedNumber = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isSafeInlineHref = (value: string) => {
  if (value.startsWith("#") || value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
};

const sanitizePageEmbedAttributes = (tagName: string, rawAttrs: string) => {
  if (tagName !== "a") return "";
  const attrs = parseHtmlAttributes(rawAttrs);
  const href = attrs.get("href")?.trim();
  if (!href || !isSafeInlineHref(href)) return null;
  return ` href="${escapeHtml(href)}" rel="nofollow noreferrer" target="_blank"`;
};

export const sanitizePageEmbedHtml = (html: string) =>
  sanitizeHtmlWithPolicy(html, {
    allowedTags: pageEmbedAllowedTags,
    selfClosingTags: pageEmbedSelfClosingTags,
    dropContentTags: dangerousHtmlContentTagSet,
    sanitizeAttributes: sanitizePageEmbedAttributes,
  });

const isWithinSectionSchedule = (visibility: PageSectionVisibilityV2, now: Date) => {
  const startsAt = readOptionalText(visibility.startsAt);
  if (startsAt) {
    const startsAtMs = Date.parse(startsAt);
    if (Number.isFinite(startsAtMs) && now.getTime() < startsAtMs) return false;
  }

  const endsAt = readOptionalText(visibility.endsAt);
  if (endsAt) {
    const endsAtMs = Date.parse(endsAt);
    if (Number.isFinite(endsAtMs) && now.getTime() > endsAtMs) return false;
  }

  return true;
};

const sectionAllowsPublicRender = (
  section: PageSectionV2,
  options: { preview: boolean; now: Date }
) => {
  if (!section.visibility.visible) return false;
  if (options.preview) return true;
  if (section.visibility.authOnly) return false;
  return isWithinSectionSchedule(section.visibility, options.now);
};

const pruneSectionsForRuntime = (
  document: PageDocumentV2,
  options: { preview: boolean; now: Date }
): { document: PageDocumentV2; hasPublicGates: boolean } => {
  let hasPublicGates = false;
  const sections = document.sections.filter((section) => {
    const allowed = sectionAllowsPublicRender(section, options);
    if (!options.preview && !allowed && section.visibility.visible) {
      hasPublicGates = true;
    }
    return allowed;
  });
  return {
    document: { ...document, sections },
    hasPublicGates,
  };
};

const walkVisibleBlocks = function* (blocks: readonly PageBlockV2[]): Generator<PageBlockV2> {
  for (const block of blocks) {
    if (!block.visibility.visible) continue;
    yield block;
    for (const slotKey of getPageBlockActiveSlotKeys(block)) {
      yield* walkVisibleBlocks(block.slots?.[slotKey] ?? []);
    }
  }
};

const walkDocumentBlocks = function* (document: PageDocumentV2): Generator<PageBlockV2> {
  for (const section of document.sections) {
    yield* walkVisibleBlocks(section.blocks);
  }
};

/** Owner enum read for the collection block's visitor pagination mode. */
const readCollectionPaginationMode = (value: unknown): "none" | "paged" | "load-more" =>
  value === "paged" || value === "load-more" ? value : "none";

export const mapPageCollectionBlockToContentListData = (block: PageBlockV2): ContentListData => {
  const contentTypeId = readOptionalText(block.props.contentTypeId) ?? "";
  const listingQueryId = readOptionalText(block.props.queryId) ?? "";
  const listingTemplateId = readOptionalText(block.props.templateId) ?? "";
  // Single owner clamp (TASK-459-03): the binding reads the SAME bound the
  // editor schema enforces (`contentListLimitMax`), so authored values render
  // exactly as stored instead of silently truncating.
  const limit = readBoundedNumber(
    block.props.limit,
    contentListDefaults.source?.limit ?? 6,
    1,
    contentListLimitMax
  );
  // Visitor pagination (TASK-459-03): block props drive the widget pagination
  // contract — default "none" preserves today's render; `pageSize` follows
  // `limit` when unset (nullable prop).
  const paginationMode = readCollectionPaginationMode(block.props.paginationMode);
  const pageSize = readBoundedNumber(block.props.pageSize, limit, 1, contentListLimitMax);
  const mode = listingQueryId ? "listing" : "legacy";

  return normalizeContentListData({
    ...contentListDefaults,
    source: {
      ...contentListDefaults.source,
      mode,
      contentTypeId,
      listingQueryId,
      listingTemplateId,
      statusScope: "published",
      limit,
    },
    pagination: {
      ...contentListDefaults.pagination,
      mode: paginationMode,
      pageSize,
    },
  });
};

const resolveCollectionBinding = async (
  block: PageBlockV2,
  options: PreparePageRuntimeOptions,
  deps: Required<Pick<PageRuntimeDataBindingDeps, "resolveContentListRuntimeData">>
): Promise<PageRuntimeCollectionBinding> => {
  const data = mapPageCollectionBlockToContentListData(block);
  const listingQueryId = data.source?.listingQueryId?.trim() ?? "";
  let resolved: ContentListResolvedRuntimeData;
  try {
    resolved = await deps.resolveContentListRuntimeData(data, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
      runtimeAliases: listingQueryId
        ? options.listingRuntimeAliasesByQueryId?.[listingQueryId]
        : undefined,
      blockId: block.id,
    });
  } catch {
    resolved = {
      items: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      resolvedAt: new Date().toISOString(),
      error: "content_list_unavailable",
    };
  }
  // Listing template presentation (TASK-459-03): consume the bound template's
  // `config.style` (columns/gap/cardVariant) and `emptyState` instead of the
  // hardcoded grid defaults. Absent template/style keeps today's defaults, so
  // existing pages render unchanged.
  const presentation =
    resolved.templateStyle || resolved.templateEmptyState
      ? mapListingTemplatePresentationToContentList({
          style: resolved.templateStyle ?? null,
          emptyState: resolved.templateEmptyState ?? null,
        })
      : null;
  return {
    kind: "collection",
    data: normalizeContentListData({
      ...data,
      ...(presentation
        ? {
            style: { ...contentListDefaults.style, ...presentation.style },
            ...(presentation.emptyState
              ? { emptyState: { ...contentListDefaults.emptyState, ...presentation.emptyState } }
              : {}),
          }
        : {}),
      resolved,
    }),
    ...(presentation ? { variant: presentation.variant } : {}),
  };
};

const readBooleanProp = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

/**
 * Maps the v2 filters block props onto the shared `listing-filters` data
 * shape (TASK-459-02). The widget normalizer stays the single owner of facet
 * canonicalization and fallback behavior — including the default sort facet
 * when the author configured no facets — so the v2 block renders the exact
 * facet markup the widget runtime ships.
 */
export const mapPageFiltersBlockToListingFiltersData = (block: PageBlockV2): ListingFiltersData =>
  normalizeListingFiltersData({
    listingQueryId: readOptionalText(block.props.queryId) ?? "",
    autoApply: readBooleanProp(block.props.autoApply, true),
    showSearch: readBooleanProp(block.props.showSearch, true),
    searchLabel: readOptionalText(block.props.searchLabel) ?? undefined,
    searchPlaceholder: readOptionalText(block.props.searchPlaceholder) ?? undefined,
    applyLabel: readOptionalText(block.props.applyLabel) ?? undefined,
    aliases: normalizeListingRuntimeAliases(block.props.aliases),
    facets: Array.isArray(block.props.facets)
      ? (block.props.facets as ListingFiltersData["facets"])
      : [],
  });

/** Effective layout variant of the filters block for the shared markup. */
export const readPageFiltersBlockLayout = (block: PageBlockV2): "horizontal" | "sidebar" =>
  block.props.layout === "sidebar" ? "sidebar" : "horizontal";

const resolveFiltersBinding = async (
  block: PageBlockV2,
  options: PreparePageRuntimeOptions,
  deps: Required<Pick<PageRuntimeDataBindingDeps, "resolveListingFiltersRuntimeData">>
): Promise<PageRuntimeFiltersBinding> => {
  const data = mapPageFiltersBlockToListingFiltersData(block);
  let resolved: ListingFiltersRuntimeResult;
  try {
    resolved = await deps.resolveListingFiltersRuntimeData({
      listingQueryId: data.listingQueryId,
      facets: data.facets,
      aliases: data.aliases,
      preview: options.preview,
      runtimeSearchParams: options.runtimeSearchParams,
    });
  } catch {
    resolved = {
      listingQueryId: data.listingQueryId ?? "",
      metrics: [],
      rejectedTokens: [],
      total: 0,
      error: "Failed to resolve runtime filters.",
    };
  }
  return {
    kind: "filters",
    data: normalizeListingFiltersData({
      ...data,
      resolved: {
        listingQueryId: resolved.listingQueryId,
        metrics: resolved.metrics,
        searchQuery: resolved.searchQuery,
        rejectedTokens: resolved.rejectedTokens,
        ...(resolved.error ? { error: resolved.error } : {}),
      },
    }),
    total: resolved.total,
  };
};

const resolveFormBinding = async (
  block: PageBlockV2,
  options: PreparePageRuntimeOptions,
  deps: Required<Pick<PageRuntimeDataBindingDeps, "resolveFormRuntimeData">>
): Promise<PageRuntimeFormBinding | null> => {
  const formId = readOptionalText(block.props.formId);
  if (!formId) return null;
  let resolution: FormRuntimeResolution;
  try {
    resolution = await deps.resolveFormRuntimeData(formId, { preview: options.preview });
  } catch {
    resolution = {
      formId: "",
      formName: "",
      description: null,
      status: "missing",
      successMessage: null,
      successRedirectUrl: null,
      settings: getDefaultFormSettings(),
      submissionAccess: "public",
      submissionNonce: null,
      botProtection: null,
      fields: [],
      error: "form_not_found",
    };
  }
  return {
    kind: "form",
    formId,
    title: readOptionalText(block.props.title),
    resolution,
  };
};

const resolveEmbedBinding = (block: PageBlockV2): PageRuntimeEmbedBinding => {
  const html = readOptionalText(block.props.html) ?? "";
  const url = readOptionalText(block.props.url) ?? "";
  const iframeSrc = url && isHttpUrl(url) ? toYoutubeEmbedUrl(url) : null;
  return {
    kind: "embed",
    sanitizedHtml: sanitizePageEmbedHtml(html),
    iframeSrc,
    iframeTitle: iframeSrc ? "Embedded YouTube content" : "Embedded content",
  };
};

const collectListingRuntimeAliasesByQueryId = (
  document: PageDocumentV2
): Record<string, ListingRuntimeAliasMap> => {
  const result: Record<string, ListingRuntimeAliasMap> = {};
  for (const block of walkDocumentBlocks(document)) {
    if (block.type !== "filters") continue;
    const data = mapPageFiltersBlockToListingFiltersData(block);
    const queryId = data.listingQueryId?.trim();
    if (!queryId) continue;
    const aliases = normalizeListingRuntimeAliases(data.aliases);
    if (Object.keys(aliases).length === 0) continue;
    result[queryId] = aliases;
  }
  return result;
};

export async function preparePageRuntimeDocument(
  document: PageDocumentV2,
  options: PreparePageRuntimeOptions,
  deps: PageRuntimeDataBindingDeps = {}
): Promise<PreparedPageRuntimeDocument> {
  const now = deps.now?.() ?? new Date();
  const resolvedDocument = resolvePageDocumentForBreakpoint(document, options.breakpoint);
  const pruned = pruneSectionsForRuntime(resolvedDocument, {
    preview: options.preview,
    now,
  });
  const resolveCollection =
    deps.resolveContentListRuntimeData ??
    (await import("../content/contentListResolver")).resolveContentListRuntimeData;
  const resolveForm =
    deps.resolveFormRuntimeData ??
    (await import("../forms/formRuntimeResolver")).resolveFormRuntimeData;
  const hasFiltersBlock = [...walkDocumentBlocks(pruned.document)].some(
    (block) => block.type === "filters"
  );
  const resolveFilters = hasFiltersBlock
    ? (deps.resolveListingFiltersRuntimeData ??
      (await import("../search/listingRuntimeService")).resolveListingFiltersRuntimeData)
    : deps.resolveListingFiltersRuntimeData;

  let hasDynamicBinding = pruned.hasPublicGates;
  // Cache-mode tracking (TASK-459-04): listing bindings allow short-TTL
  // caching; request-coupled bindings (forms) and visibility gates force the
  // render uncacheable.
  let hasListingBinding = false;
  let hasUncacheableBinding = pruned.hasPublicGates;
  let needsListingRuntimeScript = false;
  const runtimeDataByBlockId: PageRuntimeDataByBlockId = {};
  const runtimeOptions: PreparePageRuntimeOptions = {
    ...options,
    listingRuntimeAliasesByQueryId: collectListingRuntimeAliasesByQueryId(pruned.document),
  };

  for (const block of walkDocumentBlocks(pruned.document)) {
    if (block.type === "collection") {
      const binding = await resolveCollectionBinding(block, runtimeOptions, {
        resolveContentListRuntimeData: resolveCollection,
      });
      runtimeDataByBlockId[block.id] = binding;
      hasDynamicBinding = true;
      hasListingBinding = true;
      // TASK-459-03: a paged, listing-bound collection enhances its pager
      // links with the shared fetch-swap client (coordinated with the
      // TASK-459-02 seam). Legacy-mode pagers (`cl.*` params) and unresolved
      // queries stay no-JS full navigations.
      if (
        binding.data.pagination?.mode === "paged" &&
        (binding.data.source?.listingQueryId ?? "").length > 0 &&
        !binding.data.resolved?.error
      ) {
        needsListingRuntimeScript = true;
      }
      continue;
    }
    if (block.type === "filters" && resolveFilters) {
      const binding = await resolveFiltersBinding(block, runtimeOptions, {
        resolveListingFiltersRuntimeData: resolveFilters,
      });
      runtimeDataByBlockId[block.id] = binding;
      hasDynamicBinding = true;
      hasListingBinding = true;
      // The script ships only for live facet forms: a missing queryId or a
      // dangling saved query renders the fail-closed placeholder without JS.
      if ((binding.data.listingQueryId ?? "").length > 0 && !binding.data.resolved?.error) {
        needsListingRuntimeScript = true;
      }
      continue;
    }
    if (block.type === "form") {
      const binding = await resolveFormBinding(block, options, {
        resolveFormRuntimeData: resolveForm,
      });
      if (binding) runtimeDataByBlockId[block.id] = binding;
      hasDynamicBinding = true;
      hasUncacheableBinding = true;
      continue;
    }
    if (block.type === "embed") {
      runtimeDataByBlockId[block.id] = resolveEmbedBinding(block);
    }
  }

  const cacheMode: PageRuntimeCacheMode = hasUncacheableBinding
    ? "none"
    : hasListingBinding
      ? "short-ttl"
      : "full";

  return {
    document: pruned.document,
    runtimeDataByBlockId,
    cacheable: !hasDynamicBinding,
    cacheMode,
    needsListingRuntimeScript,
  };
}
