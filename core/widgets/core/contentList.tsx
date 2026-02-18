import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type ContentListVariantId = "cards" | "list" | "compact";
export type ContentListStatusScope =
  | "published"
  | "all"
  | "draft"
  | "scheduled"
  | "archived";
export type ContentListSort =
  | "published-desc"
  | "published-asc"
  | "updated-desc"
  | "updated-asc"
  | "title-asc"
  | "title-desc";
export type ContentListSourceMode = "legacy" | "listing";
export type ContentListColumns = "1" | "2" | "3";
export type ContentListGap = "sm" | "md" | "lg";
export type ContentListCardStyle = "outlined" | "elevated" | "minimal";

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
    listingQueryId?: string;
    listingTemplateId?: string;
    resolvedAt?: string;
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
        sourceTypeId: { type: "string" },
        sourceTypeSlug: { type: "string" },
        listingQueryId: { type: "string" },
        listingTemplateId: { type: "string" },
        resolvedAt: { type: "string" },
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

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const gridColumnsClassMap: Record<ContentListColumns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 md:grid-cols-2",
  "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
};

const gapClassMap: Record<ContentListGap, string> = {
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
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

const resolveContentListStatusScope = (
  value: string | undefined
): ContentListStatusScope => {
  if (
    value === "all" ||
    value === "draft" ||
    value === "scheduled" ||
    value === "archived"
  ) {
    return value;
  }
  return "published";
};

const resolveContentListSort = (value: string | undefined): ContentListSort => {
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

const resolveContentListColumns = (
  value: string | undefined
): ContentListColumns => {
  if (value === "1" || value === "2") return value;
  return "3";
};

const resolveContentListGap = (value: string | undefined): ContentListGap => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveContentListCardStyle = (
  value: string | undefined
): ContentListCardStyle => {
  if (value === "elevated" || value === "minimal") return value;
  return "outlined";
};

export const resolveContentListVariant = (variant: string): ContentListVariantId => {
  if (variant === "list" || variant === "compact") return variant;
  return "cards";
};

export const normalizeContentListLimit = (value: number) => {
  if (!Number.isFinite(value)) return contentListDefaults.source?.limit ?? 6;
  return Math.min(contentListLimitMax, Math.max(contentListLimitMin, Math.floor(value)));
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
  const fieldDefaults = contentListDefaults.fields ?? {
    showImage: true,
    showExcerpt: true,
    showMeta: true,
    showCta: true,
  };
  const emptyStateDefaults = contentListDefaults.emptyState ?? {
    title: "No items found",
    description: "Adjust filters or publish entries for this content type.",
  };
  const styleDefaults = contentListDefaults.style ?? {
    columns: "3" as const,
    gap: "md" as const,
    cardStyle: "outlined" as const,
    ctaLabel: "Read more",
    backgroundColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    textColor: "var(--color-text)",
  };

  return {
    ...data,
    source: {
      mode: resolveContentListSourceMode(
        data.source?.mode,
        data.source?.listingQueryId
      ),
      listingQueryId: resolveString(data.source?.listingQueryId, ""),
      listingTemplateId: resolveString(data.source?.listingTemplateId, ""),
      contentTypeId: resolveString(data.source?.contentTypeId, sourceDefaults.contentTypeId ?? ""),
      statusScope: resolveContentListStatusScope(data.source?.statusScope),
      limit: normalizeContentListLimit(data.source?.limit ?? sourceDefaults.limit ?? 6),
      sort: resolveContentListSort(data.source?.sort),
    },
    filters: {
      taxonomy: resolveString(data.filters?.taxonomy, filterDefaults.taxonomy ?? ""),
      featuredOnly:
        typeof data.filters?.featuredOnly === "boolean"
          ? data.filters.featuredOnly
          : Boolean(filterDefaults.featuredOnly),
      searchQuery: resolveString(
        data.filters?.searchQuery,
        filterDefaults.searchQuery ?? ""
      ),
      authorId: resolveString(data.filters?.authorId, filterDefaults.authorId ?? ""),
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
        emptyStateDefaults.description ??
          "Adjust filters or publish entries for this content type."
      ),
    },
    style: {
      columns: resolveContentListColumns(data.style?.columns),
      gap: resolveContentListGap(data.style?.gap),
      cardStyle: resolveContentListCardStyle(data.style?.cardStyle),
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
      items: normalizeContentListRuntimeItems(data.resolved?.items),
      total:
        typeof data.resolved?.total === "number" && Number.isFinite(data.resolved.total)
          ? data.resolved.total
          : 0,
      sourceTypeId: resolveString(data.resolved?.sourceTypeId, ""),
      sourceTypeSlug: resolveString(data.resolved?.sourceTypeSlug, ""),
      listingQueryId: resolveString(data.resolved?.listingQueryId, ""),
      listingTemplateId: resolveString(data.resolved?.listingTemplateId, ""),
      resolvedAt: resolveString(data.resolved?.resolvedAt, ""),
      error: resolveOptionalString(data.resolved?.error),
    },
  };
}

const formatRuntimeDate = (value: string | undefined) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

const buildMetaLine = (item: ContentListRuntimeItem) => {
  const chunks: string[] = [];
  const dateLabel = formatRuntimeDate(item.publishedAt);
  if (dateLabel) chunks.push(dateLabel);
  if (item.authorName && item.authorName.trim().length > 0) {
    chunks.push(item.authorName.trim());
  }
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    chunks.push(item.tags.slice(0, 2).join(", "));
  }
  return chunks.join(" • ");
};

function ContentListItemCard({
  item,
  index,
  variant,
  fields,
  style,
}: {
  item: ContentListRuntimeItem;
  index: number;
  variant: ContentListVariantId;
  fields: NonNullable<ContentListData["fields"]>;
  style: NonNullable<ContentListData["style"]>;
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
  const cardStyleVars: CSSProperties = {
    backgroundColor: style.backgroundColor ?? "var(--color-bg)",
    borderColor: style.borderColor ?? "var(--color-border)",
    color: style.textColor ?? "var(--color-text)",
  };
  const metaLine = buildMetaLine(item);
  const title = item.title ?? "Untitled";
  const href = item.href && item.href.trim().length > 0 ? item.href : "#";
  const excerpt = (item.excerpt ?? "").trim();
  const showImage = fields.showImage && item.imageSrc;
  const showExcerpt = fields.showExcerpt && excerpt.length > 0;
  const showMeta = fields.showMeta && metaLine.length > 0;
  const showCta = fields.showCta;

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
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className={variant === "compact" ? "text-base font-semibold" : "text-lg font-semibold"}>
          <a href={href} className="hover:underline">
            {title}
          </a>
        </h3>
        {showMeta ? <p className="text-xs opacity-75">{metaLine}</p> : null}
        {showExcerpt ? (
          <p className={variant === "compact" ? "text-sm opacity-90" : "text-sm opacity-90"}>
            {excerpt}
          </p>
        ) : null}
        {showCta ? (
          <div>
            <a href={href} className="text-sm font-medium underline-offset-4 hover:underline">
              {style.ctaLabel ?? "Read more"}
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ContentListBlock({
  data,
  variant,
}: {
  data: ContentListData;
  variant: string;
}) {
  const normalized = normalizeContentListData(data);
  const resolvedVariant = resolveContentListVariant(variant);
  const source = normalized.source ?? contentListDefaults.source!;
  const fields = normalized.fields ?? contentListDefaults.fields!;
  const style = normalized.style ?? contentListDefaults.style!;
  const resolvedItems = normalizeContentListRuntimeItems(normalized.resolved?.items);
  const sourceMode = source.mode ?? "legacy";
  const hasSource =
    sourceMode === "listing"
      ? (source.listingQueryId ?? "").trim().length > 0
      : (source.contentTypeId ?? "").trim().length > 0;
  const hasItems = resolvedItems.length > 0;
  const state = !hasSource ? "missing-source" : hasItems ? "ready" : "empty";
  const errorText = normalized.resolved?.error;

  const wrapperClassName =
    resolvedVariant === "list"
      ? joinClasses("flex flex-col", gapClassMap[style.gap ?? "md"])
      : joinClasses(
          "grid",
          resolvedVariant === "compact"
            ? "grid-cols-1"
            : gridColumnsClassMap[style.columns ?? "3"],
          gapClassMap[style.gap ?? "md"]
        );

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      data-content-list-variant={resolvedVariant}
      data-content-list-source-mode={sourceMode}
      data-content-list-source={
        sourceMode === "listing"
          ? source.listingQueryId ?? ""
          : source.contentTypeId ?? ""
      }
      data-content-list-items={String(resolvedItems.length)}
      data-content-list-status-scope={source.statusScope ?? "published"}
      data-content-list-state={state}
    >
      {errorText ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorText}
        </div>
      ) : null}
      {!hasSource ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-8 text-sm text-[var(--color-text)]/80">
          {sourceMode === "listing"
            ? "Choose a listing query in widget settings to render items here."
            : "Choose a content type in widget settings to render entries here."}
        </div>
      ) : hasItems ? (
        <div className={wrapperClassName}>
          {resolvedItems.map((item, index) => (
            <ContentListItemCard
              key={item.id ?? `${item.slug ?? "item"}-${index + 1}`}
              item={item}
              index={index}
              variant={resolvedVariant}
              fields={fields}
              style={style}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-10 text-center">
          <p className="text-base font-semibold text-[var(--color-text)]">
            {normalized.emptyState?.title ?? "No items found"}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text)]/75">
            {normalized.emptyState?.description ??
              "Adjust filters or publish entries for this content type."}
          </p>
        </div>
      )}
    </section>
  );
}

export function createContentListWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ContentListData>>;
  visual: ComponentType<WidgetEditorProps<ContentListData>>;
  advanced: ComponentType<WidgetEditorProps<ContentListData>>;
}): WidgetDefinition<ContentListData> {
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
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: ContentListBlock,
  };
}
