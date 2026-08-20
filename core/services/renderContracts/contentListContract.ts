import { resolveClearableStyleValue } from "./clearableStyle";

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

export const defaultContentListEmptyDescription =
  "Adjust filters or publish entries for this content type.";
export const defaultContentListListingEmptyDescription =
  "Adjust the listing query or publish matching entries.";

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

export const resolveTrimmedOptionalString = (value: string | undefined) => {
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

export const resolveContentListTagLimit = (value: number | undefined) => {
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
