import {
  contentListDefaults,
  contentListLimitMax,
  normalizeContentListData,
  type ContentListData,
  type ContentListRuntimeItem,
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
import type { ListingFiltersRuntimeResult } from "../search/listingRuntimeContract";
import type { ContentRouteSetting } from "../settings/settingsContracts";
import type { FormRuntimeResolution } from "../forms/formRuntimeContract";
import {
  dangerousHtmlContentTagSet,
  escapeHtml,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
} from "../posts/editor/postRichTextHtmlUtils";
import type { PageBlockV2, PageBreakpoint, PageDocumentV2 } from "./pageDocumentV2";

export type ContentListResolvedRuntimeData = {
  items: ContentListRuntimeItem[];
  total: number;
  sourceTypeId: string;
  sourceTypeSlug: string;
  listPath?: string;
  listingQueryId?: string;
  listingTemplateId?: string;
  resolvedAt: string;
  runtime?: NonNullable<ContentListData["resolved"]>["runtime"];
  cardLinkMode?: NonNullable<ContentListData["resolved"]>["cardLinkMode"];
  error?: string;
  templateStyle?: {
    columns?: number;
    gap?: string;
    cardVariant?: string;
  } | null;
  templateEmptyState?: {
    title?: string | null;
    description?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
  } | null;
};

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
   * Rendered by the filters block result-count display.
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

export type ResolveContentListRuntimeData = (
  data: ContentListData,
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
    runtimeSearchParams?: URLSearchParams;
    runtimeAliases?: ListingRuntimeAliasMap;
    blockId: string;
  }
) => Promise<ContentListResolvedRuntimeData>;

export type ResolveFormRuntimeData = (
  formId: string,
  options: { preview: boolean }
) => Promise<FormRuntimeResolution>;

export type ResolveListingFiltersRuntimeData = (input: {
  listingQueryId?: string;
  facets?: ListingFiltersData["facets"];
  aliases?: ListingRuntimeAliasMap;
  preview: boolean;
  runtimeSearchParams?: URLSearchParams;
}) => Promise<ListingFiltersRuntimeResult>;

export type PageRuntimeDataBindingDeps = {
  resolveContentListRuntimeData?: ResolveContentListRuntimeData;
  resolveFormRuntimeData?: ResolveFormRuntimeData;
  resolveListingFiltersRuntimeData?: ResolveListingFiltersRuntimeData;
  now?: () => Date;
};

/**
 * Whole-page HTML cache mode (TASK-459-04):
 * - `"full"` — fully static render, cacheable for the configured site TTL;
 * - `"short-ttl"` — only listing-shaped dynamic bindings are present;
 * - `"none"` — request-coupled state must never be cached.
 */
export type PageRuntimeCacheMode = "full" | "short-ttl" | "none";

export type PreparedPageRuntimeDocument = {
  document: PageDocumentV2;
  runtimeDataByBlockId: PageRuntimeDataByBlockId;
  cacheable: boolean;
  cacheMode: PageRuntimeCacheMode;
  needsListingRuntimeScript: boolean;
};

export type PreparePageRuntimeOptions = {
  preview: boolean;
  breakpoint: PageBreakpoint;
  contentRoutes: ContentRouteSetting[];
  runtimeSearchParams?: URLSearchParams;
  listingRuntimeAliasesByQueryId?: Record<string, ListingRuntimeAliasMap>;
};

const readOptionalText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readBoundedNumber = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
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

/** Owner enum read for the collection block's visitor pagination mode. */
const readCollectionPaginationMode = (value: unknown): "none" | "paged" | "load-more" =>
  value === "paged" || value === "load-more" ? value : "none";

export const mapPageCollectionBlockToContentListData = (block: PageBlockV2): ContentListData => {
  const contentTypeId = readOptionalText(block.props.contentTypeId) ?? "";
  const listingQueryId = readOptionalText(block.props.queryId) ?? "";
  const listingTemplateId = readOptionalText(block.props.templateId) ?? "";
  const limit = readBoundedNumber(
    block.props.limit,
    contentListDefaults.source?.limit ?? 6,
    1,
    contentListLimitMax
  );
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

const readBooleanProp = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

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
