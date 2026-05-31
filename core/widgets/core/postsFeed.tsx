import type { ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { resolveClearableStyleValue } from "./clearableStyle";
import {
  ContentListBlock,
  contentListDefaults,
  normalizeContentListData,
  normalizeContentListLimit,
  normalizeContentListRuntimeItems,
  resolveContentListGap,
  resolveContentListVariant,
  type ContentListCardStyle,
  type ContentListData,
  type ContentListGap,
  type ContentListImageAspect,
  type ContentListPaginationMode,
  type ContentListSort,
  type ContentListColumns,
  type ContentListRuntimeItem,
  type ContentListVariantId,
} from "./contentList";

export type PostsFeedSourceMode = "latest" | "featured" | "category" | "manual";
export type PostsFeedMotion = "none" | "fade" | "slide-up";

export type PostsFeedData = {
  source?: {
    mode?: PostsFeedSourceMode;
    category?: string;
    manualPostIds?: string[];
    authorId?: string;
    featuredFirst?: boolean;
    dateRange?: {
      from?: string;
      to?: string;
    };
    limit?: number;
    sort?: ContentListSort;
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
    showAuthor?: boolean;
    showDate?: boolean;
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
    ctaLabel?: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    motion?: PostsFeedMotion;
  };
  resolved?: {
    items?: ContentListRuntimeItem[];
    total?: number;
    sourceMode?: PostsFeedSourceMode;
    listPath?: string;
    resolvedAt?: string;
    runtime?: {
      page?: number;
      pageSize?: number;
      totalPages?: number;
      previousPageHref?: string;
      nextPageHref?: string;
    };
    error?: string;
  };
};

const postsFeedSourceModes: PostsFeedSourceMode[] = ["latest", "featured", "category", "manual"];

const resolveString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const resolveTrimmedString = (value: unknown, fallback = "") =>
  resolveString(value, fallback).trim();

const resolveSourceMode = (value: unknown): PostsFeedSourceMode => {
  if (typeof value !== "string") return "latest";
  return postsFeedSourceModes.includes(value as PostsFeedSourceMode)
    ? (value as PostsFeedSourceMode)
    : "latest";
};

const postsFeedPaginationModes: ContentListPaginationMode[] = [
  "none",
  "paged",
  "load-more",
  "view-all",
];

const postsFeedImageAspects: ContentListImageAspect[] = ["compact", "standard", "wide", "square"];

const postsFeedMotionModes: PostsFeedMotion[] = ["none", "fade", "slide-up"];

const resolvePaginationMode = (value: unknown): ContentListPaginationMode => {
  if (typeof value !== "string") return "none";
  return postsFeedPaginationModes.includes(value as ContentListPaginationMode)
    ? (value as ContentListPaginationMode)
    : "none";
};

const resolveImageAspect = (value: unknown): ContentListImageAspect => {
  if (typeof value !== "string") return "standard";
  return postsFeedImageAspects.includes(value as ContentListImageAspect)
    ? (value as ContentListImageAspect)
    : "standard";
};

const resolveMotion = (value: unknown): PostsFeedMotion => {
  if (typeof value !== "string") return "none";
  return postsFeedMotionModes.includes(value as PostsFeedMotion)
    ? (value as PostsFeedMotion)
    : "none";
};

const isValidIsoDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  const normalized = new Date(Date.UTC(year, month - 1, day));
  return (
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day
  );
};

const resolveOptionalDateFilter = (value: unknown) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return isValidIsoDateOnly(trimmed) ? trimmed : "";
};

const resolvePositiveInteger = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(1, Math.floor(value));
};

const normalizeManualPostIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
    if (next.length >= 64) break;
  }
  return next;
};

const normalizeResolvedItems = (value: unknown) =>
  normalizeContentListRuntimeItems(
    Array.isArray(value) ? (value as ContentListRuntimeItem[]) : undefined
  );

export type PostsFeedRouteState = {
  cardLinks: { mode: "ready"; listPath: string } | { mode: "missing_detail_route"; reason: string };
  viewAll:
    | { mode: "not_applicable" }
    | { mode: "ready"; href: string; allItemsVisible: boolean }
    | { mode: "missing_view_all_destination"; reason: string };
};

export const postsFeedSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: postsFeedSourceModes },
        category: { type: "string" },
        manualPostIds: {
          type: "array",
          maxItems: 64,
          items: { type: "string", minLength: 1 },
        },
        authorId: { type: "string" },
        featuredFirst: { type: "boolean" },
        dateRange: {
          type: "object",
          additionalProperties: false,
          properties: {
            from: { type: "string" },
            to: { type: "string" },
          },
        },
        limit: { type: "number", minimum: 1, maximum: 24 },
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
    title: { type: "string" },
    description: { type: "string" },
    pagination: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: postsFeedPaginationModes },
        pageSize: { type: "number", minimum: 1, maximum: 24 },
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
        showAuthor: { type: "boolean" },
        showDate: { type: "boolean" },
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
        columns: { enum: ["1", "2", "3"] },
        gap: { enum: ["none", "sm", "md", "lg"] },
        cardStyle: { enum: ["outlined", "elevated", "minimal"] },
        imageAspect: { enum: postsFeedImageAspects },
        ctaLabel: { type: "string" },
        backgroundColor: { type: "string" },
        borderColor: { type: "string" },
        textColor: { type: "string" },
        motion: { enum: postsFeedMotionModes },
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
        sourceMode: { enum: postsFeedSourceModes },
        listPath: { type: "string" },
        resolvedAt: { type: "string" },
        runtime: {
          type: "object",
          additionalProperties: false,
          properties: {
            page: { type: "number" },
            pageSize: { type: "number" },
            totalPages: { type: "number" },
            previousPageHref: { type: "string" },
            nextPageHref: { type: "string" },
          },
        },
        error: { type: "string" },
      },
    },
  },
};

export const postsFeedDefaults: PostsFeedData = {
  source: {
    mode: "latest",
    category: "",
    manualPostIds: [],
    authorId: "",
    featuredFirst: false,
    dateRange: {
      from: "",
      to: "",
    },
    limit: 6,
    sort: "published-desc",
  },
  title: "",
  description: "",
  pagination: {
    mode: "none",
    pageSize: 6,
    viewAllHref: "",
    viewAllLabel: "View all posts",
    loadMoreLabel: "Load more",
  },
  fields: {
    showImage: false,
    showExcerpt: true,
    showAuthor: true,
    showDate: true,
    showCta: true,
  },
  emptyState: {
    title: "No posts found",
    description: "Publish posts or adjust source settings to populate this feed.",
  },
  style: {
    columns: "3",
    gap: "md",
    cardStyle: "outlined",
    imageAspect: "standard",
    ctaLabel: "Read more",
    motion: "none",
  },
  resolved: {
    items: [],
    total: 0,
    sourceMode: "latest",
    listPath: "",
    resolvedAt: "",
    runtime: {
      page: 1,
      pageSize: 6,
      totalPages: 1,
    },
  },
};

export function normalizePostsFeedData(data: PostsFeedData): PostsFeedData {
  const sourceDefaults = postsFeedDefaults.source ?? {
    mode: "latest" as const,
    category: "",
    manualPostIds: [] as string[],
    authorId: "",
    featuredFirst: false,
    dateRange: {
      from: "",
      to: "",
    },
    limit: 6,
    sort: "published-desc" as const,
  };

  const paginationDefaults = postsFeedDefaults.pagination ?? {
    mode: "none" as const,
    pageSize: 6,
    viewAllHref: "",
    viewAllLabel: "View all posts",
    loadMoreLabel: "Load more",
  };

  const fieldDefaults = postsFeedDefaults.fields ?? {
    showImage: false,
    showExcerpt: true,
    showAuthor: true,
    showDate: true,
    showCta: true,
  };

  const emptyStateDefaults = postsFeedDefaults.emptyState ?? {
    title: "No posts found",
    description: "Publish posts or adjust source settings to populate this feed.",
  };

  const styleDefaults: NonNullable<PostsFeedData["style"]> = postsFeedDefaults.style ?? {
    columns: "3" as const,
    gap: "md" as const,
    cardStyle: "outlined" as const,
    imageAspect: "standard" as const,
    ctaLabel: "Read more",
    motion: "none" as const,
  };
  const hasStyleObject = data.style !== undefined;

  return {
    source: {
      mode: resolveSourceMode(data.source?.mode),
      category: resolveTrimmedString(data.source?.category, sourceDefaults.category ?? ""),
      manualPostIds: normalizeManualPostIds(data.source?.manualPostIds),
      authorId: resolveTrimmedString(data.source?.authorId, sourceDefaults.authorId ?? ""),
      featuredFirst:
        typeof data.source?.featuredFirst === "boolean"
          ? data.source.featuredFirst
          : Boolean(sourceDefaults.featuredFirst),
      dateRange: {
        from: resolveOptionalDateFilter(
          data.source?.dateRange?.from ?? sourceDefaults.dateRange?.from
        ),
        to: resolveOptionalDateFilter(data.source?.dateRange?.to ?? sourceDefaults.dateRange?.to),
      },
      limit: normalizeContentListLimit(data.source?.limit ?? sourceDefaults.limit ?? 6),
      sort:
        data.source?.sort ??
        sourceDefaults.sort ??
        postsFeedDefaults.source?.sort ??
        "published-desc",
    },
    title: resolveString(data.title, postsFeedDefaults.title ?? ""),
    description: resolveString(data.description, postsFeedDefaults.description ?? ""),
    pagination: {
      mode: resolvePaginationMode(data.pagination?.mode ?? paginationDefaults.mode),
      pageSize: normalizeContentListLimit(
        data.pagination?.pageSize ?? paginationDefaults.pageSize ?? sourceDefaults.limit ?? 6
      ),
      viewAllHref: resolveString(
        data.pagination?.viewAllHref,
        paginationDefaults.viewAllHref ?? ""
      ),
      viewAllLabel: resolveString(
        data.pagination?.viewAllLabel,
        paginationDefaults.viewAllLabel ?? "View all posts"
      ),
      loadMoreLabel: resolveString(
        data.pagination?.loadMoreLabel,
        paginationDefaults.loadMoreLabel ?? "Load more"
      ),
    },
    fields: {
      showImage:
        typeof data.fields?.showImage === "boolean"
          ? data.fields.showImage
          : Boolean(fieldDefaults.showImage),
      showExcerpt:
        typeof data.fields?.showExcerpt === "boolean"
          ? data.fields.showExcerpt
          : Boolean(fieldDefaults.showExcerpt),
      showAuthor:
        typeof data.fields?.showAuthor === "boolean"
          ? data.fields.showAuthor
          : Boolean(fieldDefaults.showAuthor),
      showDate:
        typeof data.fields?.showDate === "boolean"
          ? data.fields.showDate
          : Boolean(fieldDefaults.showDate),
      showCta:
        typeof data.fields?.showCta === "boolean"
          ? data.fields.showCta
          : Boolean(fieldDefaults.showCta),
    },
    emptyState: {
      title: resolveString(data.emptyState?.title, emptyStateDefaults.title ?? "No posts found"),
      description: resolveString(
        data.emptyState?.description,
        emptyStateDefaults.description ??
          "Publish posts or adjust source settings to populate this feed."
      ),
    },
    style: {
      columns: data.style?.columns ?? styleDefaults.columns ?? "3",
      gap: resolveContentListGap(data.style?.gap ?? styleDefaults.gap ?? "md"),
      cardStyle: data.style?.cardStyle ?? styleDefaults.cardStyle ?? "outlined",
      imageAspect: resolveImageAspect(data.style?.imageAspect ?? styleDefaults.imageAspect),
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
      motion: resolveMotion(data.style?.motion ?? styleDefaults.motion),
    },
    resolved: {
      items: normalizeResolvedItems(data.resolved?.items),
      total:
        typeof data.resolved?.total === "number" && Number.isFinite(data.resolved.total)
          ? data.resolved.total
          : 0,
      sourceMode: resolveSourceMode(data.resolved?.sourceMode),
      listPath: resolveString(data.resolved?.listPath, ""),
      resolvedAt: resolveString(data.resolved?.resolvedAt, ""),
      runtime: {
        page: resolvePositiveInteger(data.resolved?.runtime?.page) ?? 1,
        pageSize:
          resolvePositiveInteger(data.resolved?.runtime?.pageSize) ??
          normalizeContentListLimit(
            data.pagination?.pageSize ?? paginationDefaults.pageSize ?? sourceDefaults.limit ?? 6
          ),
        totalPages: resolvePositiveInteger(data.resolved?.runtime?.totalPages) ?? 1,
        previousPageHref: resolveString(data.resolved?.runtime?.previousPageHref, ""),
        nextPageHref: resolveString(data.resolved?.runtime?.nextPageHref, ""),
      },
      error: resolveString(data.resolved?.error, ""),
    },
  };
}

export function mapPostsFeedToContentListData(data: PostsFeedData): ContentListData {
  const normalized = normalizePostsFeedData(data);
  const fields = normalized.fields ?? postsFeedDefaults.fields!;
  const resolvedItems = normalizeContentListRuntimeItems(normalized.resolved?.items).map(
    (item) => ({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags : [],
      authorName: fields.showAuthor ? item.authorName : undefined,
      publishedAt: fields.showDate ? item.publishedAt : undefined,
    })
  );
  const showMeta = Boolean(
    fields.showAuthor ||
    fields.showDate ||
    resolvedItems.some((item) => Array.isArray(item.tags) && item.tags.length > 0)
  );

  return normalizeContentListData({
    source: {
      mode: "legacy",
      contentTypeId: "post",
      statusScope: "published",
      limit: normalized.source?.limit ?? postsFeedDefaults.source?.limit ?? 6,
      sort: normalized.source?.sort ?? postsFeedDefaults.source?.sort ?? "published-desc",
    },
    filters: {
      taxonomy: "",
      featuredOnly: false,
      searchQuery: "",
      authorId: "",
    },
    title: normalized.title,
    description: normalized.description,
    pagination: {
      mode: normalized.pagination?.mode ?? "none",
      pageSize: normalized.pagination?.pageSize ?? normalized.source?.limit ?? 6,
      viewAllHref: normalized.pagination?.viewAllHref ?? "",
      viewAllLabel: normalized.pagination?.viewAllLabel ?? "View all posts",
      loadMoreLabel: normalized.pagination?.loadMoreLabel ?? "Load more",
    },
    fields: {
      showImage: Boolean(fields.showImage),
      showExcerpt: Boolean(fields.showExcerpt),
      showMeta,
      showCta: Boolean(fields.showCta),
    },
    emptyState: {
      title:
        normalized.emptyState?.title ?? postsFeedDefaults.emptyState?.title ?? "No posts found",
      description:
        normalized.emptyState?.description ??
        postsFeedDefaults.emptyState?.description ??
        "Publish posts or adjust source settings to populate this feed.",
    },
    style: {
      columns: normalized.style?.columns ?? contentListDefaults.style?.columns,
      gap: normalized.style?.gap ?? contentListDefaults.style?.gap,
      cardStyle: normalized.style?.cardStyle ?? contentListDefaults.style?.cardStyle,
      imageAspect: normalized.style?.imageAspect ?? contentListDefaults.style?.imageAspect,
      ctaLabel: normalized.style?.ctaLabel ?? contentListDefaults.style?.ctaLabel,
      backgroundColor: normalized.style?.backgroundColor,
      borderColor: normalized.style?.borderColor,
      textColor: normalized.style?.textColor ?? contentListDefaults.style?.textColor,
    },
    resolved: {
      items: resolvedItems,
      total: normalized.resolved?.total ?? 0,
      sourceTypeId: "post",
      sourceTypeSlug: "posts",
      listPath: normalized.resolved?.listPath ?? "",
      resolvedAt: normalized.resolved?.resolvedAt ?? "",
      runtime: normalized.resolved?.runtime,
      error: normalized.resolved?.error,
    },
  });
}

export function resolvePostsFeedRouteState(
  data: PostsFeedData,
  resolvedOverride?: PostsFeedData["resolved"]
): PostsFeedRouteState {
  const normalized = normalizePostsFeedData(data);
  const resolved = resolvedOverride ?? normalized.resolved;
  const listPath = resolveTrimmedString(resolved?.listPath);
  const explicitViewAllHref = resolveTrimmedString(normalized.pagination?.viewAllHref);
  const paginationMode = normalized.pagination?.mode ?? "none";
  const resolvedItems = normalizeResolvedItems(resolved?.items);
  const hasMissingItemHref = resolvedItems.some((item) => !resolveTrimmedString(item.href));
  const cardLinksReady = resolvedItems.length > 0 ? !hasMissingItemHref : Boolean(listPath);
  const total =
    typeof resolved?.total === "number" && Number.isFinite(resolved.total)
      ? Math.max(0, Math.floor(resolved.total))
      : 0;
  const allItemsVisible = total > 0 && resolvedItems.length >= total;

  return {
    cardLinks: cardLinksReady
      ? { mode: "ready", listPath }
      : {
          mode: "missing_detail_route",
          reason:
            "Card titles and CTA labels render as non-links until a posts route is configured.",
        },
    viewAll:
      paginationMode !== "view-all"
        ? { mode: "not_applicable" }
        : explicitViewAllHref || listPath
          ? {
              mode: "ready",
              href: explicitViewAllHref || listPath,
              allItemsVisible,
            }
          : {
              mode: "missing_view_all_destination",
              reason:
                "View all is hidden until you pick a destination or configure an enabled posts list route.",
            },
  };
}

const postsFeedMotionStyleText = `
@keyframes posts-feed-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes posts-feed-slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

[data-posts-feed-motion="fade"] {
  animation: posts-feed-fade-in 220ms ease-out both;
}

[data-posts-feed-motion="slide-up"] {
  animation: posts-feed-slide-up 260ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  [data-posts-feed-motion="fade"],
  [data-posts-feed-motion="slide-up"] {
    animation: none !important;
  }
}
`;

export function PostsFeedBlock({
  data,
  variant,
  blockId,
}: {
  data: PostsFeedData;
  variant: string;
  blockId?: string;
}) {
  const resolvedVariant: ContentListVariantId = resolveContentListVariant(variant);
  const mapped = mapPostsFeedToContentListData(data);
  const routeState = resolvePostsFeedRouteState(data);
  const motion = normalizePostsFeedData(data).style?.motion ?? "none";
  const withVariant = {
    ...mapped,
    resolved: {
      ...(mapped.resolved ?? {}),
      sourceTypeId: "post",
      sourceTypeSlug: "posts",
    },
  };
  const content = (
    <ContentListBlock
      data={withVariant}
      variant={resolvedVariant}
      blockId={blockId}
      linkUnavailableReason={
        routeState.cardLinks.mode === "missing_detail_route" ? "missing-route" : undefined
      }
    />
  );
  if (motion === "none") {
    return content;
  }
  return (
    <>
      <style>{postsFeedMotionStyleText}</style>
      <div data-posts-feed-motion={motion}>{content}</div>
    </>
  );
}

export const postsFeedEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "posts-feed.wizard.source-setup",
      title: "Source setup",
      role: "source",
      writablePaths: [
        "source.mode",
        "source.category",
        "source.manualPostIds",
        "source.authorId",
        "source.featuredFirst",
        "source.dateRange.from",
        "source.dateRange.to",
        "source.limit",
        "source.sort",
      ],
    },
    {
      mode: "visual",
      id: "posts-feed.visual.display",
      title: "Display",
      role: "content",
      writablePaths: [
        "fields.showImage",
        "fields.showExcerpt",
        "fields.showAuthor",
        "fields.showDate",
        "fields.showCta",
      ],
    },
    {
      mode: "visual",
      id: "posts-feed.visual.section-header",
      title: "Section header",
      role: "content",
      writablePaths: ["title", "description"],
    },
    {
      mode: "visual",
      id: "posts-feed.visual.layout-style",
      title: "Layout and style",
      role: "visual",
      writablePaths: [
        "variant",
        "style.columns",
        "style.gap",
        "style.cardStyle",
        "style.imageAspect",
        "style.ctaLabel",
        "style.backgroundColor",
        "style.borderColor",
        "style.textColor",
        "style.motion",
      ],
    },
    {
      mode: "visual",
      id: "posts-feed.visual.pagination",
      title: "Pagination presentation",
      role: "visual",
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
      id: "posts-feed.visual.empty-state",
      title: "Empty state",
      role: "content",
      writablePaths: ["emptyState.title", "emptyState.description"],
    },
    {
      mode: "advanced",
      id: "posts-feed.advanced.resolved-query",
      title: "Resolved query",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "source",
        "source.mode",
        "source.limit",
        "source.sort",
        "source.manualPostIds",
        "pagination.mode",
        "resolved.items",
        "resolved.runtime",
        "resolved.listPath",
      ],
    },
    {
      mode: "advanced",
      id: "posts-feed.advanced.runtime-status",
      title: "Runtime status",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "resolved.total",
        "resolved.sourceMode",
        "resolved.resolvedAt",
        "resolved.error",
      ],
    },
    {
      mode: "advanced",
      id: "posts-feed.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
    },
  ],
};

export function createPostsFeedWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<PostsFeedData>>;
  visual: ComponentType<WidgetEditorProps<PostsFeedData>>;
  advanced: ComponentType<WidgetEditorProps<PostsFeedData>>;
}): WidgetDefinition<PostsFeedData> {
  return {
    type: "posts-feed",
    title: "Posts Feed",
    description: "Display latest or selected posts without building a listing query.",
    category: "content",
    variants: [
      {
        id: "cards",
        label: "Cards",
        description: "Card grid with excerpt and optional metadata.",
      },
      {
        id: "list",
        label: "List",
        description: "Single-column list of recent posts.",
      },
      {
        id: "compact",
        label: "Compact",
        description: "Dense list for sidebars and utility areas.",
      },
    ],
    schema: postsFeedSchema,
    defaults: postsFeedDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    editorContract: postsFeedEditorContract,
    render: PostsFeedBlock,
  };
}
