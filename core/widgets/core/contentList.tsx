import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorBundle } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export type ContentListVariantId = "cards" | "list" | "compact";
export type ContentListStatusScope = "published" | "all" | "draft" | "scheduled" | "archived";
export type ContentListSort =
  "published-desc" | "published-asc" | "updated-desc" | "updated-asc" | "title-asc" | "title-desc";
export type ContentListSourceMode = "legacy" | "listing";
/** Grid columns; 4-6 exist for listing-template style consumption (TASK-459-03). */
export type ContentListColumns = "1" | "2" | "3" | "4" | "5" | "6";
export type ContentListGap = "none" | "sm" | "md" | "lg";
export type ContentListCardStyle = "outlined" | "elevated" | "minimal";
export type ContentListImageAspect = "compact" | "standard" | "wide" | "square";
export type ContentListPaginationMode = "none" | "paged" | "load-more" | "view-all";
export type ContentListTagMode = "meta-line" | "badges" | "hidden";
export type ContentListLinkUnavailableReason = "missing-route";

export type ContentListRuntimeItem = {
  id?: string;
  title?: string;
  slug?: string;
  href?: string;
  excerpt?: string;
  imageSrc?: string;
  imageAlt?: string;
  tags?: string[];
  authorName?: string;
  publishedAt?: string;
  status?: string;
};

export type ContentListData = {
  source?: {
    mode?: ContentListSourceMode;
    listingQueryId?: string;
    listingTemplateId?: string;
    contentTypeId?: string;
    statusScope?: ContentListStatusScope;
    limit?: number;
    sort?: ContentListSort;
  };
  filters?: {
    taxonomy?: string;
    featuredOnly?: boolean;
    searchQuery?: string;
    authorId?: string;
  };
  title?: string;
  description?: string;
  pagination?: {
    mode?: ContentListPaginationMode;
    pageSize?: number;
    viewAllHref?: string;
    viewAllLabel?: string;
    loadMoreLabel?: string;
  };
  fields?: {
    showImage?: boolean;
    showExcerpt?: boolean;
    showMeta?: boolean;
    showCta?: boolean;
  };
  emptyState?: {
    title?: string;
    description?: string;
  };
  style?: {
    columns?: ContentListColumns;
    gap?: ContentListGap;
    cardStyle?: ContentListCardStyle;
    imageAspect?: ContentListImageAspect;
    tagMode?: ContentListTagMode;
    tagLimit?: number;
    ctaLabel?: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
  resolved?: {
    items?: ContentListRuntimeItem[];
    total?: number;
    sourceTypeId?: string;
    sourceTypeSlug?: string;
    listPath?: string;
    listingQueryId?: string;
    listingTemplateId?: string;
    resolvedAt?: string;
    runtime?: {
      rejectedTokens?: string[];
      searchQuery?: string;
      page?: number;
      pageSize?: number;
      totalPages?: number;
      previousPageHref?: string;
      nextPageHref?: string;
      /**
       * Page query-param key for THIS list (TASK-459-03): the canonical
       * `lq.<queryId>.__page` token for listing-bound lists, the legacy
       * `cl.<blockId>.page` key otherwise. Together with `search` it lets the
       * pager build an href for any page number server-side (no-JS safe).
       */
      pageParamKey?: string;
      /** Serialized current search params the pager builds page hrefs from. */
      search?: string;
    };
    /**
     * Dangling-route guard state (TASK-459-03 frozen policy): "missing-route"
     * when the resolver found no enabled content route for the source type,
     * so card links were suppressed instead of pointing at unmatched URLs.
     */
    cardLinkMode?: "ready" | "missing-route";
    error?: string;
  };
};

export const contentListEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "content-list.wizard.source-binding",
      title: "Source setup",
      role: "source",
      writablePaths: [
        "source.mode",
        "source.listingQueryId",
        "source.listingTemplateId",
        "source.contentTypeId",
      ],
    },
    {
      mode: "wizard",
      id: "content-list.wizard.source-rules",
      title: "Source rules",
      role: "setup",
      writablePaths: ["source.statusScope", "source.limit", "source.sort"],
    },
    {
      mode: "visual",
      id: "content-list.visual.variant-layout",
      title: "Variant and layout",
      role: "layout",
      writablePaths: ["variant", "style.columns", "style.gap", "style.cardStyle"],
    },
    {
      mode: "visual",
      id: "content-list.visual.filters",
      title: "Daily filters",
      role: "content",
      writablePaths: [
        "filters.taxonomy",
        "filters.authorId",
        "filters.searchQuery",
        "filters.featuredOnly",
      ],
      readOnlyPaths: [
        "source.mode",
        "source.listingQueryId",
        "source.listingTemplateId",
        "source.contentTypeId",
        "source.statusScope",
        "source.sort",
      ],
    },
    {
      mode: "visual",
      id: "content-list.visual.section-context",
      title: "Section context",
      role: "content",
      writablePaths: ["title", "description"],
    },
    {
      mode: "visual",
      id: "content-list.visual.pagination-actions",
      title: "Pagination and actions",
      role: "content",
      writablePaths: [
        "pagination.mode",
        "pagination.pageSize",
        "pagination.viewAllHref",
        "pagination.viewAllLabel",
        "pagination.loadMoreLabel",
      ],
    },
    {
      mode: "visual",
      id: "content-list.visual.presentation-fields",
      title: "Presentation fields",
      role: "visual",
      writablePaths: [
        "fields.showImage",
        "fields.showExcerpt",
        "fields.showMeta",
        "fields.showCta",
        "style.imageAspect",
        "style.tagMode",
        "style.tagLimit",
        "style.ctaLabel",
      ],
    },
    {
      mode: "visual",
      id: "content-list.visual.surface-colors",
      title: "Surface colors",
      role: "visual",
      writablePaths: ["style.backgroundColor", "style.borderColor", "style.textColor"],
    },
    {
      mode: "visual",
      id: "content-list.visual.empty-state",
      title: "Empty state",
      role: "content",
      writablePaths: ["emptyState.title", "emptyState.description"],
    },
    {
      mode: "advanced",
      id: "content-list.advanced.source-summary",
      title: "Source summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "source",
        "filters",
        "source.mode",
        "source.listingQueryId",
        "source.listingTemplateId",
        "source.contentTypeId",
        "source.statusScope",
        "source.limit",
        "source.sort",
      ],
    },
    {
      mode: "advanced",
      id: "content-list.advanced.style-summary",
      title: "Style summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["style"],
    },
    {
      mode: "advanced",
      id: "content-list.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "resolved.total",
        "resolved.sourceTypeId",
        "resolved.sourceTypeSlug",
        "resolved.listPath",
        "resolved.listingQueryId",
        "resolved.listingTemplateId",
        "resolved.resolvedAt",
        "resolved.runtime",
        "resolved.error",
      ],
    },
  ],
};

const contentListLimitMin = 1;
export const contentListLimitMax = 24;

export const contentListSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["legacy", "listing"] },
        listingQueryId: { type: "string" },
        listingTemplateId: { type: "string" },
        contentTypeId: { type: "string" },
        statusScope: {
          enum: ["published", "all", "draft", "scheduled", "archived"],
        },
        limit: { type: "number", minimum: contentListLimitMin, maximum: contentListLimitMax },
        sort: {
          enum: [
            "published-desc",
            "published-asc",
            "updated-desc",
            "updated-asc",
            "title-asc",
            "title-desc",
          ],
        },
      },
    },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        taxonomy: { type: "string" },
        featuredOnly: { type: "boolean" },
        searchQuery: { type: "string" },
        authorId: { type: "string" },
      },
    },
    title: { type: "string" },
    description: { type: "string" },
    pagination: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["none", "paged", "load-more", "view-all"] },
        pageSize: { type: "number", minimum: contentListLimitMin, maximum: contentListLimitMax },
        viewAllHref: { type: "string" },
        viewAllLabel: { type: "string" },
        loadMoreLabel: { type: "string" },
      },
    },
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        showImage: { type: "boolean" },
        showExcerpt: { type: "boolean" },
        showMeta: { type: "boolean" },
        showCta: { type: "boolean" },
      },
    },
    emptyState: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        columns: { enum: ["1", "2", "3", "4", "5", "6"] },
        gap: { enum: ["none", "sm", "md", "lg"] },
        cardStyle: { enum: ["outlined", "elevated", "minimal"] },
        imageAspect: { enum: ["compact", "standard", "wide", "square"] },
        tagMode: { enum: ["meta-line", "badges", "hidden"] },
        tagLimit: { type: "number", minimum: 1, maximum: 4 },
        ctaLabel: { type: "string" },
        backgroundColor: { type: "string" },
        borderColor: { type: "string" },
        textColor: { type: "string" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              slug: { type: "string" },
              href: { type: "string" },
              excerpt: { type: "string" },
              imageSrc: { type: "string" },
              imageAlt: { type: "string" },
              tags: {
                type: "array",
                items: { type: "string" },
              },
              authorName: { type: "string" },
              publishedAt: { type: "string" },
              status: { type: "string" },
            },
          },
        },
        total: { type: "number" },
        sourceTypeId: { type: "string" },
        sourceTypeSlug: { type: "string" },
        listPath: { type: "string" },
        listingQueryId: { type: "string" },
        listingTemplateId: { type: "string" },
        resolvedAt: { type: "string" },
        runtime: {
          type: "object",
          additionalProperties: false,
          properties: {
            rejectedTokens: {
              type: "array",
              items: { type: "string" },
            },
            searchQuery: { type: "string" },
            page: { type: "number" },
            pageSize: { type: "number" },
            totalPages: { type: "number" },
            previousPageHref: { type: "string" },
            nextPageHref: { type: "string" },
            pageParamKey: { type: "string" },
            search: { type: "string" },
          },
        },
        cardLinkMode: { enum: ["ready", "missing-route"] },
        error: { type: "string" },
      },
    },
  },
};

export const contentListDefaults: ContentListData = {
  source: {
    mode: "legacy",
    listingQueryId: "",
    listingTemplateId: "",
    contentTypeId: "",
    statusScope: "published",
    limit: 6,
    sort: "published-desc",
  },
  filters: {
    taxonomy: "",
    featuredOnly: false,
    searchQuery: "",
    authorId: "",
  },
  fields: {
    showImage: true,
    showExcerpt: true,
    showMeta: true,
    showCta: true,
  },
  emptyState: {
    title: "No items found",
    description: "Adjust filters or publish entries for this content type.",
  },
  style: {
    columns: "3",
    gap: "md",
    cardStyle: "outlined",
    imageAspect: "standard",
    tagMode: "meta-line",
    tagLimit: 2,
    ctaLabel: "Read more",
    backgroundColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    textColor: "var(--color-text)",
  },
  resolved: {
    items: [],
    total: 0,
    sourceTypeId: "",
    sourceTypeSlug: "",
    resolvedAt: "",
  },
};

const defaultContentListEmptyDescription =
  "Adjust filters or publish entries for this content type.";
const defaultContentListListingEmptyDescription =
  "Adjust the listing query or publish matching entries.";

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const gridColumnsClassMap: Record<ContentListColumns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 md:grid-cols-2",
  "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  "5": "grid-cols-1 md:grid-cols-2 lg:grid-cols-5",
  "6": "grid-cols-1 md:grid-cols-3 lg:grid-cols-6",
};

const gapClassMap: Record<ContentListGap, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const imageAspectClassMap: Record<ContentListImageAspect, string> = {
  compact: "h-32",
  standard: "h-40",
  wide: "aspect-[16/9]",
  square: "aspect-square",
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolveTrimmedOptionalString = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveContentListStatusScope = (value: string | undefined): ContentListStatusScope => {
  if (value === "all" || value === "draft" || value === "scheduled" || value === "archived") {
    return value;
  }
  return "published";
};

export const resolveContentListSort = (value: string | undefined): ContentListSort => {
  if (
    value === "published-asc" ||
    value === "updated-desc" ||
    value === "updated-asc" ||
    value === "title-asc" ||
    value === "title-desc"
  ) {
    return value;
  }
  return "published-desc";
};

const resolveContentListSourceMode = (
  mode: string | undefined,
  listingQueryId: string | undefined
): ContentListSourceMode => {
  if (mode === "listing") return "listing";
  if (mode === "legacy") return "legacy";
  if ((listingQueryId ?? "").trim().length > 0) return "listing";
  return "legacy";
};

const resolveContentListColumns = (value: string | undefined): ContentListColumns => {
  if (value === "1" || value === "2" || value === "4" || value === "5" || value === "6") {
    return value;
  }
  return "3";
};

export const resolveContentListGap = (value: string | undefined): ContentListGap => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveContentListCardStyle = (value: string | undefined): ContentListCardStyle => {
  if (value === "elevated" || value === "minimal") return value;
  return "outlined";
};

const resolveContentListPaginationMode = (value: string | undefined): ContentListPaginationMode => {
  if (value === "paged" || value === "load-more" || value === "view-all") return value;
  return "none";
};

const resolveContentListTagMode = (value: string | undefined): ContentListTagMode => {
  if (value === "badges" || value === "hidden") return value;
  return "meta-line";
};

const resolveContentListTagLimit = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 2;
  return Math.min(4, Math.max(1, Math.floor(value)));
};

const resolveContentListImageAspect = (value: string | undefined): ContentListImageAspect => {
  if (value === "compact" || value === "wide" || value === "square") return value;
  return "standard";
};

export const resolveContentListVariant = (variant: string): ContentListVariantId => {
  if (variant === "list" || variant === "compact") return variant;
  return "cards";
};

export const normalizeContentListLimit = (value: number) => {
  if (!Number.isFinite(value)) return contentListDefaults.source?.limit ?? 6;
  return Math.min(contentListLimitMax, Math.max(contentListLimitMin, Math.floor(value)));
};

/**
 * Canonical page-href builder for list pagination (TASK-459-03). Owned by the
 * widget contract so the server resolver and the rendered pager agree on the
 * exact URL shape: page 1 DROPS the param (canonical unpaged URL), any other
 * page sets `pageKey=N` on top of the current serialized search params.
 */
export const buildContentListPageHref = (search: string, pageKey: string, page: number) => {
  const params = new URLSearchParams(search);
  if (page <= 1) {
    params.delete(pageKey);
  } else {
    params.set(pageKey, String(page));
  }
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "?";
};

/**
 * Windowed pager model (TASK-459-03): always page 1 and the last page, a
 * +/- `windowSize` window around the current page, `"ellipsis"` tokens where
 * the sequence gaps (e.g. 1 … 4 5 6 … 12). Pure so renderer tests can pin the
 * windowing without DOM assertions.
 */
export const buildContentListPagerWindow = (
  page: number,
  totalPages: number,
  windowSize = 2
): Array<number | "ellipsis"> => {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const current = Math.min(Math.max(1, Math.floor(page)), safeTotal);
  const pages = new Set<number>([1, safeTotal]);
  for (let candidate = current - windowSize; candidate <= current + windowSize; candidate += 1) {
    if (candidate >= 1 && candidate <= safeTotal) pages.add(candidate);
  }
  const sorted = [...pages].sort((left, right) => left - right);
  const result: Array<number | "ellipsis"> = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous > 0 && value - previous > 1) result.push("ellipsis");
    result.push(value);
    previous = value;
  }
  return result;
};

export function normalizeContentListRuntimeItems(
  items: ContentListRuntimeItem[] | undefined
): ContentListRuntimeItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      id: resolveTrimmedOptionalString(item?.id),
      title: resolveTrimmedOptionalString(item?.title),
      slug: resolveTrimmedOptionalString(item?.slug),
      href: resolveTrimmedOptionalString(item?.href),
      excerpt: resolveOptionalString(item?.excerpt),
      imageSrc: resolveTrimmedOptionalString(item?.imageSrc),
      imageAlt: resolveOptionalString(item?.imageAlt),
      tags: Array.isArray(item?.tags)
        ? item.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [],
      authorName: resolveOptionalString(item?.authorName),
      publishedAt: resolveOptionalString(item?.publishedAt),
      status: resolveTrimmedOptionalString(item?.status),
    }))
    .filter((item) => (item.title ?? "").trim().length > 0);
}

export function normalizeContentListData(data: ContentListData): ContentListData {
  const sourceDefaults = contentListDefaults.source ?? {
    contentTypeId: "",
    statusScope: "published" as const,
    limit: 6,
    sort: "published-desc" as const,
  };
  const filterDefaults = contentListDefaults.filters ?? {
    taxonomy: "",
    featuredOnly: false,
    searchQuery: "",
    authorId: "",
  };
  const paginationDefaults = contentListDefaults.pagination ?? {
    mode: "none" as const,
    pageSize: 6,
    viewAllHref: "",
    viewAllLabel: "View all",
    loadMoreLabel: "Load more",
  };
  const fieldDefaults = contentListDefaults.fields ?? {
    showImage: true,
    showExcerpt: true,
    showMeta: true,
    showCta: true,
  };
  const emptyStateDefaults = contentListDefaults.emptyState ?? {
    title: "No items found",
    description: defaultContentListEmptyDescription,
  };
  const styleDefaults = contentListDefaults.style ?? {
    columns: "3" as const,
    gap: "md" as const,
    cardStyle: "outlined" as const,
    imageAspect: "standard" as const,
    tagMode: "meta-line" as const,
    tagLimit: 2,
    ctaLabel: "Read more",
    backgroundColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    textColor: "var(--color-text)",
  };
  const hasStyleObject = data.style !== undefined;
  const sourceMode = resolveContentListSourceMode(data.source?.mode, data.source?.listingQueryId);
  const normalizedFilters =
    sourceMode === "listing"
      ? {
          taxonomy: "",
          featuredOnly: false,
          searchQuery: "",
          authorId: "",
        }
      : {
          taxonomy: resolveString(data.filters?.taxonomy, filterDefaults.taxonomy ?? ""),
          featuredOnly:
            typeof data.filters?.featuredOnly === "boolean"
              ? data.filters.featuredOnly
              : Boolean(filterDefaults.featuredOnly),
          searchQuery: resolveString(data.filters?.searchQuery, filterDefaults.searchQuery ?? ""),
          authorId: resolveString(data.filters?.authorId, filterDefaults.authorId ?? ""),
        };

  return {
    ...data,
    title: resolveTrimmedOptionalString(data.title),
    description: resolveTrimmedOptionalString(data.description),
    pagination: {
      mode: resolveContentListPaginationMode(data.pagination?.mode),
      pageSize: normalizeContentListLimit(
        data.pagination?.pageSize ?? data.source?.limit ?? paginationDefaults.pageSize ?? 6
      ),
      viewAllHref: resolveString(
        data.pagination?.viewAllHref,
        paginationDefaults.viewAllHref ?? ""
      ),
      viewAllLabel: resolveString(
        data.pagination?.viewAllLabel,
        paginationDefaults.viewAllLabel ?? "View all"
      ),
      loadMoreLabel: resolveString(
        data.pagination?.loadMoreLabel,
        paginationDefaults.loadMoreLabel ?? "Load more"
      ),
    },
    source: {
      mode: sourceMode,
      listingQueryId: resolveString(data.source?.listingQueryId, ""),
      listingTemplateId: resolveString(data.source?.listingTemplateId, ""),
      contentTypeId: resolveString(data.source?.contentTypeId, sourceDefaults.contentTypeId ?? ""),
      statusScope: resolveContentListStatusScope(data.source?.statusScope),
      limit: normalizeContentListLimit(data.source?.limit ?? sourceDefaults.limit ?? 6),
      sort: resolveContentListSort(data.source?.sort),
    },
    filters: normalizedFilters,
    fields: {
      showImage:
        typeof data.fields?.showImage === "boolean"
          ? data.fields.showImage
          : Boolean(fieldDefaults.showImage),
      showExcerpt:
        typeof data.fields?.showExcerpt === "boolean"
          ? data.fields.showExcerpt
          : Boolean(fieldDefaults.showExcerpt),
      showMeta:
        typeof data.fields?.showMeta === "boolean"
          ? data.fields.showMeta
          : Boolean(fieldDefaults.showMeta),
      showCta:
        typeof data.fields?.showCta === "boolean"
          ? data.fields.showCta
          : Boolean(fieldDefaults.showCta),
    },
    emptyState: {
      title: resolveString(data.emptyState?.title, emptyStateDefaults.title ?? "No items found"),
      description: resolveString(
        data.emptyState?.description,
        emptyStateDefaults.description ?? defaultContentListEmptyDescription
      ),
    },
    style: {
      columns: resolveContentListColumns(data.style?.columns),
      gap: resolveContentListGap(data.style?.gap),
      cardStyle: resolveContentListCardStyle(data.style?.cardStyle),
      imageAspect: resolveContentListImageAspect(data.style?.imageAspect),
      tagMode: resolveContentListTagMode(data.style?.tagMode),
      tagLimit: resolveContentListTagLimit(data.style?.tagLimit),
      ctaLabel: resolveString(data.style?.ctaLabel, styleDefaults.ctaLabel ?? "Read more"),
      backgroundColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.backgroundColor)
        : styleDefaults.backgroundColor,
      borderColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.borderColor)
        : styleDefaults.borderColor,
      textColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.textColor)
        : styleDefaults.textColor,
    },
    resolved: {
      items: normalizeContentListRuntimeItems(data.resolved?.items),
      total:
        typeof data.resolved?.total === "number" && Number.isFinite(data.resolved.total)
          ? data.resolved.total
          : 0,
      sourceTypeId: resolveString(data.resolved?.sourceTypeId, ""),
      sourceTypeSlug: resolveString(data.resolved?.sourceTypeSlug, ""),
      listPath: resolveString(data.resolved?.listPath, ""),
      listingQueryId: resolveString(data.resolved?.listingQueryId, ""),
      listingTemplateId: resolveString(data.resolved?.listingTemplateId, ""),
      resolvedAt: resolveString(data.resolved?.resolvedAt, ""),
      runtime: {
        rejectedTokens: Array.isArray(data.resolved?.runtime?.rejectedTokens)
          ? data.resolved?.runtime?.rejectedTokens
              .filter((entry): entry is string => typeof entry === "string")
              .map((entry) => entry.trim())
              .filter(Boolean)
          : [],
        searchQuery: resolveOptionalString(data.resolved?.runtime?.searchQuery),
        page: (() => {
          const runtimePage = data.resolved?.runtime?.page;
          if (typeof runtimePage !== "number" || !Number.isFinite(runtimePage)) {
            return undefined;
          }
          return Math.max(1, Math.floor(runtimePage));
        })(),
        pageSize: (() => {
          const runtimePageSize = data.resolved?.runtime?.pageSize;
          if (typeof runtimePageSize !== "number" || !Number.isFinite(runtimePageSize)) {
            return undefined;
          }
          return normalizeContentListLimit(runtimePageSize);
        })(),
        totalPages: (() => {
          const runtimeTotalPages = data.resolved?.runtime?.totalPages;
          if (typeof runtimeTotalPages !== "number" || !Number.isFinite(runtimeTotalPages)) {
            return undefined;
          }
          return Math.max(1, Math.floor(runtimeTotalPages));
        })(),
        previousPageHref: resolveTrimmedOptionalString(data.resolved?.runtime?.previousPageHref),
        nextPageHref: resolveTrimmedOptionalString(data.resolved?.runtime?.nextPageHref),
        pageParamKey: resolveTrimmedOptionalString(data.resolved?.runtime?.pageParamKey),
        search: resolveOptionalString(data.resolved?.runtime?.search),
      },
      cardLinkMode:
        data.resolved?.cardLinkMode === "missing-route" || data.resolved?.cardLinkMode === "ready"
          ? data.resolved.cardLinkMode
          : undefined,
      error: resolveOptionalString(data.resolved?.error),
    },
  };
}

/**
 * Listing-template presentation input (TASK-459-03), typed structurally so
 * the pure widget contract never imports the content-service template module.
 * Shape mirrors `ListingTemplateConfig.style` / `.emptyState`
 * (`core/services/content/listingTemplateConfig.ts`).
 */
export type ContentListTemplatePresentationInput = {
  style?: { columns?: number; gap?: string; cardVariant?: string } | null;
  emptyState?: { title?: string | null; description?: string | null } | null;
};

export type ContentListTemplatePresentation = {
  variant: ContentListVariantId;
  style: { columns: ContentListColumns; gap: ContentListGap; cardStyle: ContentListCardStyle };
  emptyState?: { title?: string; description?: string };
};

const templateGapToContentListGap: Record<string, ContentListGap> = {
  xs: "sm",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "lg",
};

/**
 * Maps a listing template's `config.style` + `config.emptyState` onto the
 * widget presentation vocabulary (TASK-459-03 template-style consumption):
 * columns 1-6 map 1:1, the 5-step gap scale collapses onto the widget's
 * none/sm/md/lg, `cardVariant: "compact"` selects the compact list variant,
 * `"minimal"` keeps cards with the minimal card style. Absent/invalid values
 * fall back to today's grid defaults, so templates without style render
 * exactly as before.
 */
export const mapListingTemplatePresentationToContentList = (
  input: ContentListTemplatePresentationInput
): ContentListTemplatePresentation => {
  const style = input.style ?? null;
  const columnsNumber =
    typeof style?.columns === "number" && Number.isFinite(style.columns)
      ? Math.min(6, Math.max(1, Math.trunc(style.columns)))
      : 3;
  const columns = resolveContentListColumns(String(columnsNumber));
  const gap = templateGapToContentListGap[style?.gap ?? ""] ?? "md";
  const cardVariant = style?.cardVariant ?? "default";
  const variant: ContentListVariantId = cardVariant === "compact" ? "compact" : "cards";
  const cardStyle: ContentListCardStyle = cardVariant === "minimal" ? "minimal" : "outlined";
  const emptyTitle = resolveTrimmedOptionalString(input.emptyState?.title ?? undefined);
  const emptyDescription = resolveTrimmedOptionalString(input.emptyState?.description ?? undefined);
  return {
    variant,
    style: { columns, gap, cardStyle },
    ...(emptyTitle || emptyDescription
      ? {
          emptyState: {
            ...(emptyTitle ? { title: emptyTitle } : {}),
            ...(emptyDescription ? { description: emptyDescription } : {}),
          },
        }
      : {}),
  };
};

type ContentListDateParts = {
  dateTime: string;
  label: string;
};

type ContentListMetaParts = {
  date?: ContentListDateParts;
  authorName?: string;
  tags: string[];
};

const runtimeDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatRuntimeDateParts = (value: string | undefined): ContentListDateParts | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return {
    dateTime: date.toISOString(),
    label: runtimeDateFormatter.format(date),
  };
};

const resolveContentListEmptyDescription = (
  sourceMode: ContentListSourceMode,
  configuredDescription: string | undefined
) => {
  const trimmed = resolveTrimmedOptionalString(configuredDescription);
  if (trimmed && !(sourceMode === "listing" && trimmed === defaultContentListEmptyDescription)) {
    return trimmed;
  }
  if (sourceMode === "listing") return defaultContentListListingEmptyDescription;
  return trimmed ?? defaultContentListEmptyDescription;
};

const buildMetaParts = (
  item: ContentListRuntimeItem,
  includeTags: boolean
): ContentListMetaParts => {
  const authorName = resolveTrimmedOptionalString(item.authorName);
  const tags =
    includeTags && Array.isArray(item.tags)
      ? item.tags
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 2)
      : [];

  return {
    date: formatRuntimeDateParts(item.publishedAt),
    authorName,
    tags,
  };
};

const hasMetaParts = (parts: ContentListMetaParts) =>
  Boolean(parts.date || parts.authorName || parts.tags.length > 0);

const resolveContentListCtaAccessibleLabel = (
  item: ContentListRuntimeItem,
  visibleLabel: string
) => {
  const resolvedLabel = resolveTrimmedOptionalString(visibleLabel) ?? "Read more";
  const title = resolveTrimmedOptionalString(item.title);
  return title ? `${resolvedLabel}: ${title}` : resolvedLabel;
};

function ContentListItemCard({
  item,
  index,
  variant,
  fields,
  style,
  linkUnavailableReason,
}: {
  item: ContentListRuntimeItem;
  index: number;
  variant: ContentListVariantId;
  fields: NonNullable<ContentListData["fields"]>;
  style: NonNullable<ContentListData["style"]>;
  linkUnavailableReason?: ContentListLinkUnavailableReason;
}) {
  const cardStyle = style.cardStyle ?? "outlined";
  const wrapperClassName =
    variant === "compact"
      ? "rounded-lg border p-3"
      : variant === "list"
        ? "rounded-lg border p-4"
        : "rounded-xl border p-4";
  const cardClassName =
    cardStyle === "elevated"
      ? joinClasses(wrapperClassName, "shadow-sm")
      : cardStyle === "minimal"
        ? joinClasses(wrapperClassName, "border-transparent bg-transparent")
        : wrapperClassName;
  const cardStyleVars: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.backgroundColor),
      borderColor: resolveClearableStyleValue(style.borderColor),
      color: resolveClearableStyleValue(style.textColor),
    }) ?? {};
  const tagMode = style.tagMode ?? "meta-line";
  const tagLimit = resolveContentListTagLimit(style.tagLimit);
  const tags = tagMode === "hidden" ? [] : (item.tags ?? []).slice(0, tagLimit);
  const metaParts = buildMetaParts(item, tagMode === "meta-line");
  const metaTail = [...(metaParts.authorName ? [metaParts.authorName] : []), ...metaParts.tags];
  const title = item.title ?? "Untitled";
  const href = item.href && item.href.trim().length > 0 ? item.href : undefined;
  const excerpt = (item.excerpt ?? "").trim();
  const imageAspectClassName = imageAspectClassMap[style.imageAspect ?? "standard"];
  const showImage = Boolean(fields.showImage) && Boolean(item.imageSrc);
  const showExcerpt = fields.showExcerpt && excerpt.length > 0;
  const showMeta = fields.showMeta && hasMetaParts(metaParts);
  const showTagBadges = tagMode === "badges" && tags.length > 0;
  const showCta = Boolean(fields.showCta);
  const showCtaLink = showCta && Boolean(href);
  const hasHref = Boolean(href);
  const showLinkUnavailable = !hasHref && linkUnavailableReason === "missing-route";
  const showCtaFallback = showCta && !hasHref;
  const ctaLabel = style.ctaLabel ?? "Read more";
  const ctaAccessibleLabel = resolveContentListCtaAccessibleLabel(item, ctaLabel);

  return (
    <article
      className={cardClassName}
      style={cardStyleVars}
      data-content-list-item={String(index + 1)}
      data-content-list-status={item.status ?? "unknown"}
    >
      {showImage ? (
        <div className="mb-3 overflow-hidden rounded-md border border-[var(--color-border)]/70">
          <img
            src={item.imageSrc}
            alt={item.imageAlt ?? title}
            className={joinClasses("w-full object-cover", imageAspectClassName)}
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className={variant === "compact" ? "text-base font-semibold" : "text-lg font-semibold"}>
          {href ? (
            <a href={href} className="hover:underline">
              {title}
            </a>
          ) : (
            title
          )}
        </h3>
        {showTagBadges ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--color-border)]/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] opacity-80"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {showMeta ? (
          <p className="text-xs opacity-75">
            {metaParts.date ? (
              <time dateTime={metaParts.date.dateTime}>{metaParts.date.label}</time>
            ) : null}
            {metaTail.map((segment, index) => (
              <span key={`${segment}-${index}`}>
                {metaParts.date || index > 0 ? <span aria-hidden="true"> • </span> : null}
                <span>{segment}</span>
              </span>
            ))}
          </p>
        ) : null}
        {showExcerpt ? (
          <p className={variant === "compact" ? "text-sm opacity-90" : "text-sm opacity-90"}>
            {excerpt}
          </p>
        ) : null}
        {showCtaLink ? (
          <div>
            <a
              href={href}
              className="text-sm font-medium underline-offset-4 hover:underline"
              aria-label={ctaAccessibleLabel}
            >
              {ctaLabel}
            </a>
          </div>
        ) : null}
        {showCtaFallback ? (
          <div>
            <span
              className="text-sm font-medium opacity-70"
              aria-disabled="true"
              aria-label={ctaAccessibleLabel}
              data-content-list-cta-disabled={linkUnavailableReason ?? "missing-href"}
            >
              {ctaLabel}
            </span>
          </div>
        ) : null}
        {showLinkUnavailable ? (
          <p className="text-xs opacity-70" data-content-list-link-unavailable="1">
            Links unavailable until a detail route is configured.
          </p>
        ) : null}
      </div>
    </article>
  );
}

export type ContentListPagerProps = {
  page: number;
  totalPages: number;
  total: number;
  /** Page param key + serialized search the numbered links are built from. */
  pageParamKey?: string;
  search?: string;
  /** Resolver-provided prev/next hrefs (preferred when present). */
  previousPageHref?: string;
  nextPageHref?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
};

/**
 * Shared numbered pager (TASK-459-03): totals line ("N results"), windowed
 * page numbers, prev/next — all server-rendered hrefs (no-JS safe). Anchors
 * carry `data-listing-page-link="1"` so the listing runtime client script can
 * fetch-swap listing-bound blocks instead of a full navigation. Reused by the
 * content-list widget and the auto entry-list route template.
 */
export function ContentListPager({
  page,
  totalPages,
  total,
  pageParamKey,
  search,
  previousPageHref,
  nextPageHref,
  viewAllHref,
  viewAllLabel,
}: ContentListPagerProps) {
  const safeTotalPages = Math.max(1, Math.floor(totalPages));
  const currentPage = Math.min(Math.max(1, Math.floor(page)), safeTotalPages);
  const hrefFor = (target: number) =>
    pageParamKey ? buildContentListPageHref(search ?? "", pageParamKey, target) : undefined;
  const resolvedPreviousHref =
    previousPageHref ?? (currentPage > 1 ? hrefFor(currentPage - 1) : undefined);
  const resolvedNextHref =
    nextPageHref ?? (currentPage < safeTotalPages ? hrefFor(currentPage + 1) : undefined);
  if (!resolvedPreviousHref && !resolvedNextHref) return null;
  const windowItems = buildContentListPagerWindow(currentPage, safeTotalPages);
  const linkClassName = "font-medium underline-offset-4 hover:underline";

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm"
      aria-label="Content list pagination"
      data-content-list-pagination="paged"
    >
      <span className="text-[var(--color-text)]/75" data-content-list-total={String(total)}>
        {total === 1 ? "1 result" : `${total} results`}
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {resolvedPreviousHref ? (
          <a href={resolvedPreviousHref} className={linkClassName} data-listing-page-link="1">
            Previous
          </a>
        ) : (
          <span className="font-medium opacity-60">Previous</span>
        )}
        {windowItems.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} aria-hidden="true" className="opacity-60">
              …
            </span>
          ) : item === currentPage ? (
            <span
              key={item}
              aria-current="page"
              className="rounded border border-[var(--color-border)] px-2 py-0.5 font-semibold"
              data-content-list-page={String(item)}
            >
              {item}
            </span>
          ) : (
            (() => {
              const href = hrefFor(item);
              return href ? (
                <a
                  key={item}
                  href={href}
                  className={joinClasses(linkClassName, "px-1")}
                  aria-label={`Page ${item}`}
                  data-listing-page-link="1"
                  data-content-list-page={String(item)}
                >
                  {item}
                </a>
              ) : (
                <span key={item} className="px-1 opacity-60" data-content-list-page={String(item)}>
                  {item}
                </span>
              );
            })()
          )
        )}
        {resolvedNextHref ? (
          <a href={resolvedNextHref} className={linkClassName} data-listing-page-link="1">
            Next
          </a>
        ) : (
          <span className="font-medium opacity-60">Next</span>
        )}
      </span>
      {viewAllHref ? (
        <a href={viewAllHref} className={linkClassName} data-content-list-view-all="1">
          {viewAllLabel ?? "View all"}
        </a>
      ) : null}
    </nav>
  );
}

function ContentListPaginationActions({
  pagination,
  resolved,
  state,
}: {
  pagination: NonNullable<ContentListData["pagination"]>;
  resolved: NonNullable<ContentListData["resolved"]>;
  state: "missing-source" | "ready" | "empty";
}) {
  const normalizePaginationHref = (value: string | undefined) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("?")) return trimmed;
    return normalizeWidgetSafeHref(trimmed, {
      allowRelative: true,
      allowHttp: true,
    });
  };

  const mode = pagination.mode ?? "none";
  const previousPageHref = normalizePaginationHref(resolved.runtime?.previousPageHref);
  const nextPageHref = normalizePaginationHref(resolved.runtime?.nextPageHref);
  const explicitViewAllHref = normalizeWidgetSafeHref(pagination.viewAllHref, {
    allowRelative: true,
    allowHttp: true,
  });
  const viewAllHref =
    explicitViewAllHref ??
    normalizeWidgetSafeHref(resolved.listPath, {
      allowRelative: true,
      allowHttp: true,
    });
  const currentPage = resolved.runtime?.page ?? 1;
  const totalPages = resolved.runtime?.totalPages ?? 1;

  if (mode === "paged" && state === "ready" && (previousPageHref || nextPageHref)) {
    return (
      <ContentListPager
        page={currentPage}
        totalPages={totalPages}
        total={resolved.total ?? 0}
        pageParamKey={resolved.runtime?.pageParamKey}
        search={resolved.runtime?.search}
        previousPageHref={previousPageHref}
        nextPageHref={nextPageHref}
        viewAllHref={explicitViewAllHref}
        viewAllLabel={pagination.viewAllLabel}
      />
    );
  }

  if (mode === "load-more" && state === "ready" && nextPageHref) {
    return (
      <div className="mt-6">
        <a href={nextPageHref} className="text-sm font-medium underline-offset-4 hover:underline">
          {pagination.loadMoreLabel ?? "Load more"}
        </a>
      </div>
    );
  }

  if (mode === "view-all" && viewAllHref) {
    return (
      <div className="mt-6">
        <a href={viewAllHref} className="text-sm font-medium underline-offset-4 hover:underline">
          {pagination.viewAllLabel ?? "View all"}
        </a>
      </div>
    );
  }

  if (mode === "view-all") {
    return (
      <div className="mt-6 text-sm" data-content-list-view-all-unavailable="1">
        <span className="font-medium opacity-70" aria-disabled="true">
          {pagination.viewAllLabel ?? "View all"}
        </span>
        <p className="mt-1 text-xs text-[var(--color-text)]/65">
          View all is unavailable until a destination or list route is configured.
        </p>
      </div>
    );
  }

  return null;
}

export function ContentListBlock({
  data,
  variant,
  blockId,
  linkUnavailableReason,
}: {
  data: ContentListData;
  variant: string;
  blockId?: string;
  linkUnavailableReason?: ContentListLinkUnavailableReason;
}) {
  const normalized = normalizeContentListData(data);
  const resolvedVariant = resolveContentListVariant(variant);
  const source = normalized.source ?? contentListDefaults.source!;
  const pagination = normalized.pagination ?? contentListDefaults.pagination!;
  const fields = normalized.fields ?? contentListDefaults.fields!;
  const style = normalized.style ?? contentListDefaults.style!;
  const resolvedItems = normalizeContentListRuntimeItems(normalized.resolved?.items);
  // Dangling-route guard (TASK-459-03): when the resolver suppressed card
  // links because no enabled content route exists, surface the explicit
  // "missing-route" state even when the caller passed no override prop.
  const effectiveLinkUnavailableReason =
    linkUnavailableReason ??
    (normalized.resolved?.cardLinkMode === "missing-route" ? "missing-route" : undefined);
  const sourceMode = source.mode ?? "legacy";
  const hasSource =
    sourceMode === "listing"
      ? (source.listingQueryId ?? "").trim().length > 0
      : (source.contentTypeId ?? "").trim().length > 0;
  const hasItems = resolvedItems.length > 0;
  const state = !hasSource ? "missing-source" : hasItems ? "ready" : "empty";
  const errorText = normalized.resolved?.error;
  const sectionTitle = resolveTrimmedOptionalString(normalized.title);
  const sectionDescription = resolveTrimmedOptionalString(normalized.description);
  const headingIdBase = (blockId ?? "content-list").trim() || "content-list";
  const sectionTitleId = `${headingIdBase}-title`;
  const sectionDescriptionId = `${headingIdBase}-description`;
  const emptyDescription = resolveContentListEmptyDescription(
    sourceMode,
    normalized.emptyState?.description
  );

  const wrapperClassName =
    resolvedVariant === "list"
      ? joinClasses("flex flex-col", gapClassMap[style.gap ?? "md"])
      : joinClasses(
          "grid",
          resolvedVariant === "compact" ? "grid-cols-1" : gridColumnsClassMap[style.columns ?? "3"],
          gapClassMap[style.gap ?? "md"]
        );

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      aria-labelledby={sectionTitle ? sectionTitleId : undefined}
      aria-describedby={sectionDescription ? sectionDescriptionId : undefined}
      aria-label={sectionTitle ? undefined : "Content list"}
      data-content-list-variant={resolvedVariant}
      data-content-list-source-mode={sourceMode}
      data-content-list-source={
        sourceMode === "listing" ? (source.listingQueryId ?? "") : (source.contentTypeId ?? "")
      }
      data-content-list-items={String(resolvedItems.length)}
      data-content-list-status-scope={source.statusScope ?? "published"}
      data-content-list-state={state}
      data-listing-widget="content-list"
      data-listing-block-id={blockId ?? ""}
      data-listing-query-id={sourceMode === "listing" ? (source.listingQueryId ?? "") : ""}
    >
      {errorText ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorText}
        </div>
      ) : null}
      {sectionTitle ? (
        <h2 id={sectionTitleId} className="text-2xl font-semibold text-[var(--color-text)]">
          {sectionTitle}
        </h2>
      ) : null}
      {sectionDescription ? (
        <p
          id={sectionDescriptionId}
          className={joinClasses(
            "text-sm text-[var(--color-text)]/75",
            sectionTitle ? "mt-2" : undefined,
            "mb-6"
          )}
        >
          {sectionDescription}
        </p>
      ) : null}
      {!hasSource ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-8 text-sm text-[var(--color-text)]/80">
          {sourceMode === "listing"
            ? "Choose a listing query in widget settings to render items here."
            : "Choose a content type in widget settings to render entries here."}
        </div>
      ) : hasItems ? (
        <>
          <div className={wrapperClassName}>
            {resolvedItems.map((item, index) => (
              <ContentListItemCard
                key={item.id ?? `${item.slug ?? "item"}-${index + 1}`}
                item={item}
                index={index}
                variant={resolvedVariant}
                fields={fields}
                style={style}
                linkUnavailableReason={effectiveLinkUnavailableReason}
              />
            ))}
          </div>
          <ContentListPaginationActions
            pagination={pagination}
            resolved={normalized.resolved ?? { items: [] }}
            state={state}
          />
        </>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-10 text-center">
          <p className="text-base font-semibold text-[var(--color-text)]">
            {normalized.emptyState?.title ?? "No items found"}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text)]/75">{emptyDescription}</p>
        </div>
      )}
    </section>
  );
}

export function createContentListWidget(
  editors: WidgetEditorBundle<ContentListData>
): WidgetDefinition<ContentListData> {
  return {
    type: "content-list",
    title: "Content List",
    description: "Dynamic list of entries from selected content type.",
    category: "content",
    variants: [
      {
        id: "cards",
        label: "Cards",
        description: "Card grid with media and metadata.",
      },
      {
        id: "list",
        label: "List",
        description: "One-column article list layout.",
      },
      {
        id: "compact",
        label: "Compact",
        description: "Dense list for sidebars and utility sections.",
      },
    ],
    schema: contentListSchema,
    defaults: contentListDefaults,
    editor: editors,
    editorContract: contentListEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: ContentListBlock,
  };
}
