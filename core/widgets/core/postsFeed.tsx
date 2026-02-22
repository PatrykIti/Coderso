import type { ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import {
  ContentListBlock,
  contentListDefaults,
  normalizeContentListData,
  normalizeContentListLimit,
  normalizeContentListRuntimeItems,
  resolveContentListVariant,
  type ContentListCardStyle,
  type ContentListData,
  type ContentListGap,
  type ContentListSort,
  type ContentListColumns,
  type ContentListRuntimeItem,
  type ContentListVariantId,
} from "./contentList";

export type PostsFeedSourceMode = "latest" | "featured" | "category" | "manual";

export type PostsFeedData = {
  source?: {
    mode?: PostsFeedSourceMode;
    category?: string;
    manualPostIds?: string[];
    limit?: number;
    sort?: ContentListSort;
  };
  fields?: {
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
    ctaLabel?: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
  resolved?: {
    items?: ContentListRuntimeItem[];
    total?: number;
    sourceMode?: PostsFeedSourceMode;
    resolvedAt?: string;
    error?: string;
  };
};

const postsFeedSourceModes: PostsFeedSourceMode[] = [
  "latest",
  "featured",
  "category",
  "manual",
];

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
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
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
        gap: { enum: ["sm", "md", "lg"] },
        cardStyle: { enum: ["outlined", "elevated", "minimal"] },
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
        sourceMode: { enum: postsFeedSourceModes },
        resolvedAt: { type: "string" },
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
    limit: 6,
    sort: "published-desc",
  },
  fields: {
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
    ctaLabel: "Read more",
    backgroundColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    textColor: "var(--color-text)",
  },
  resolved: {
    items: [],
    total: 0,
    sourceMode: "latest",
    resolvedAt: "",
  },
};

export function normalizePostsFeedData(data: PostsFeedData): PostsFeedData {
  const sourceDefaults = postsFeedDefaults.source ?? {
    mode: "latest" as const,
    category: "",
    manualPostIds: [] as string[],
    limit: 6,
    sort: "published-desc" as const,
  };

  const fieldDefaults = postsFeedDefaults.fields ?? {
    showExcerpt: true,
    showAuthor: true,
    showDate: true,
    showCta: true,
  };

  const emptyStateDefaults = postsFeedDefaults.emptyState ?? {
    title: "No posts found",
    description: "Publish posts or adjust source settings to populate this feed.",
  };

  const styleDefaults = postsFeedDefaults.style ?? {
    columns: "3" as const,
    gap: "md" as const,
    cardStyle: "outlined" as const,
    ctaLabel: "Read more",
    backgroundColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    textColor: "var(--color-text)",
  };

  return {
    source: {
      mode: resolveSourceMode(data.source?.mode),
      category: resolveTrimmedString(data.source?.category, sourceDefaults.category ?? ""),
      manualPostIds: normalizeManualPostIds(data.source?.manualPostIds),
      limit: normalizeContentListLimit(data.source?.limit ?? sourceDefaults.limit ?? 6),
      sort:
        data.source?.sort ?? sourceDefaults.sort ?? postsFeedDefaults.source?.sort ?? "published-desc",
    },
    fields: {
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
      gap: data.style?.gap ?? styleDefaults.gap ?? "md",
      cardStyle: data.style?.cardStyle ?? styleDefaults.cardStyle ?? "outlined",
      ctaLabel: resolveString(data.style?.ctaLabel, styleDefaults.ctaLabel ?? "Read more"),
      backgroundColor: resolveString(
        data.style?.backgroundColor,
        styleDefaults.backgroundColor ?? "var(--color-bg)"
      ),
      borderColor: resolveString(
        data.style?.borderColor,
        styleDefaults.borderColor ?? "var(--color-border)"
      ),
      textColor: resolveString(data.style?.textColor, styleDefaults.textColor ?? "var(--color-text)"),
    },
    resolved: {
      items: normalizeResolvedItems(data.resolved?.items),
      total:
        typeof data.resolved?.total === "number" && Number.isFinite(data.resolved.total)
          ? data.resolved.total
          : 0,
      sourceMode: resolveSourceMode(data.resolved?.sourceMode),
      resolvedAt: resolveString(data.resolved?.resolvedAt, ""),
      error: resolveString(data.resolved?.error, ""),
    },
  };
}

export function mapPostsFeedToContentListData(data: PostsFeedData): ContentListData {
  const normalized = normalizePostsFeedData(data);
  const fields = normalized.fields ?? postsFeedDefaults.fields!;
  const showMeta = Boolean(fields.showAuthor || fields.showDate);
  const resolvedItems = normalizeContentListRuntimeItems(normalized.resolved?.items).map((item) => ({
    ...item,
    tags: [],
    authorName: fields.showAuthor ? item.authorName : undefined,
    publishedAt: fields.showDate ? item.publishedAt : undefined,
  }));

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
    fields: {
      showImage: false,
      showExcerpt: Boolean(fields.showExcerpt),
      showMeta,
      showCta: Boolean(fields.showCta),
    },
    emptyState: {
      title: normalized.emptyState?.title ?? postsFeedDefaults.emptyState?.title ?? "No posts found",
      description:
        normalized.emptyState?.description ??
        postsFeedDefaults.emptyState?.description ??
        "Publish posts or adjust source settings to populate this feed.",
    },
    style: {
      columns: normalized.style?.columns ?? contentListDefaults.style?.columns,
      gap: normalized.style?.gap ?? contentListDefaults.style?.gap,
      cardStyle: normalized.style?.cardStyle ?? contentListDefaults.style?.cardStyle,
      ctaLabel: normalized.style?.ctaLabel ?? contentListDefaults.style?.ctaLabel,
      backgroundColor:
        normalized.style?.backgroundColor ?? contentListDefaults.style?.backgroundColor,
      borderColor: normalized.style?.borderColor ?? contentListDefaults.style?.borderColor,
      textColor: normalized.style?.textColor ?? contentListDefaults.style?.textColor,
    },
    resolved: {
      items: resolvedItems,
      total: normalized.resolved?.total ?? 0,
      sourceTypeId: "post",
      sourceTypeSlug: "posts",
      resolvedAt: normalized.resolved?.resolvedAt ?? "",
      error: normalized.resolved?.error,
    },
  });
}

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
  const withVariant = {
    ...mapped,
    resolved: {
      ...(mapped.resolved ?? {}),
      sourceTypeId: "post",
      sourceTypeSlug: "posts",
    },
  };

  return <ContentListBlock data={withVariant} variant={resolvedVariant} blockId={blockId} />;
}

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
    render: PostsFeedBlock,
  };
}
