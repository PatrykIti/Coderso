import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type EntryTeaserVariantId = "horizontal" | "vertical" | "minimal";
export type EntryTeaserSourceMode = "manual" | "latest" | "featured";
export type EntryTeaserDataSourceMode = "legacy" | "listing";
export type EntryTeaserCtaHrefMode = "auto" | "custom";
export type EntryTeaserRadius = "sm" | "md" | "lg" | "xl";
export type EntryTeaserSpacing = "sm" | "md" | "lg";

export type EntryTeaserRuntimeItem = {
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

export type EntryTeaserData = {
  sourceMode?: EntryTeaserSourceMode;
  source?: {
    mode?: EntryTeaserDataSourceMode;
    listingQueryId?: string;
    listingTemplateId?: string;
    contentTypeId?: string;
    entryId?: string;
  };
  fields?: {
    showImage?: boolean;
    showExcerpt?: boolean;
    showMeta?: boolean;
    showTags?: boolean;
  };
  cta?: {
    label?: string;
    hrefMode?: EntryTeaserCtaHrefMode;
    href?: string;
  };
  style?: {
    surface?: string;
    border?: string;
    radius?: EntryTeaserRadius;
    spacing?: EntryTeaserSpacing;
  };
  fallback?: {
    title?: string;
    description?: string;
    fallbackToLatest?: boolean;
  };
  resolved?: {
    item?: EntryTeaserRuntimeItem | null;
    sourceTypeId?: string;
    sourceTypeSlug?: string;
    resolvedAt?: string;
    listingQueryId?: string;
    listingTemplateId?: string;
    error?: string;
  };
};

export const entryTeaserSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    sourceMode: { enum: ["manual", "latest", "featured"] },
    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["legacy", "listing"] },
        listingQueryId: { type: "string" },
        listingTemplateId: { type: "string" },
        contentTypeId: { type: "string" },
        entryId: { type: "string" },
      },
    },
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        showImage: { type: "boolean" },
        showExcerpt: { type: "boolean" },
        showMeta: { type: "boolean" },
        showTags: { type: "boolean" },
      },
    },
    cta: {
      type: "object",
      additionalProperties: false,
      properties: {
        label: { type: "string" },
        hrefMode: { enum: ["auto", "custom"] },
        href: { type: "string" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surface: { type: "string" },
        border: { type: "string" },
        radius: { enum: ["sm", "md", "lg", "xl"] },
        spacing: { enum: ["sm", "md", "lg"] },
      },
    },
    fallback: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        fallbackToLatest: { type: "boolean" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        item: {
          anyOf: [
            {
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
            { type: "null" },
          ],
        },
        sourceTypeId: { type: "string" },
        sourceTypeSlug: { type: "string" },
        resolvedAt: { type: "string" },
        listingQueryId: { type: "string" },
        listingTemplateId: { type: "string" },
        error: { type: "string" },
      },
    },
  },
};

export const entryTeaserDefaults: EntryTeaserData = {
  sourceMode: "latest",
  source: {
    mode: "legacy",
    listingQueryId: "",
    listingTemplateId: "",
    contentTypeId: "",
    entryId: "",
  },
  fields: {
    showImage: true,
    showExcerpt: true,
    showMeta: true,
    showTags: true,
  },
  cta: {
    label: "Read more",
    hrefMode: "auto",
    href: "",
  },
  style: {
    surface: "var(--color-bg)",
    border: "var(--color-border)",
    radius: "lg",
    spacing: "md",
  },
  fallback: {
    title: "No entry selected",
    description: "Choose a source mode and content type to render teaser content.",
    fallbackToLatest: true,
  },
  resolved: {
    item: null,
    sourceTypeId: "",
    sourceTypeSlug: "",
    resolvedAt: "",
  },
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const spacingClassMap: Record<EntryTeaserSpacing, string> = {
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const radiusClassMap: Record<EntryTeaserRadius, string> = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolveTrimmedString = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const resolveTrimmedOptionalString = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeHref = (value: string | undefined) => {
  const trimmed = resolveTrimmedOptionalString(value);
  if (!trimmed) return "#";
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }
  return "#";
};

export const resolveEntryTeaserVariant = (variant: string): EntryTeaserVariantId => {
  if (variant === "vertical" || variant === "minimal") return variant;
  return "horizontal";
};

const resolveEntryTeaserSourceMode = (
  value: string | undefined
): EntryTeaserSourceMode => {
  if (value === "manual" || value === "featured") return value;
  return "latest";
};

const resolveEntryTeaserHrefMode = (
  value: string | undefined
): EntryTeaserCtaHrefMode => {
  if (value === "custom") return value;
  return "auto";
};

const resolveEntryTeaserRadius = (value: string | undefined): EntryTeaserRadius => {
  if (value === "sm" || value === "md" || value === "xl") return value;
  return "lg";
};

const resolveEntryTeaserSpacing = (
  value: string | undefined
): EntryTeaserSpacing => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveEntryTeaserDataSourceMode = (
  mode: string | undefined,
  listingQueryId: string | undefined
): EntryTeaserDataSourceMode => {
  if (mode === "listing") return "listing";
  if (mode === "legacy") return "legacy";
  if ((listingQueryId ?? "").trim().length > 0) return "listing";
  return "legacy";
};

const normalizeRuntimeItem = (
  item: EntryTeaserRuntimeItem | null | undefined
): EntryTeaserRuntimeItem | null => {
  if (!item) return null;
  const title = resolveTrimmedOptionalString(item.title);
  if (!title) return null;

  return {
    id: resolveTrimmedOptionalString(item.id),
    title,
    slug: resolveTrimmedOptionalString(item.slug),
    href: resolveTrimmedOptionalString(item.href),
    excerpt: resolveOptionalString(item.excerpt),
    imageSrc: resolveTrimmedOptionalString(item.imageSrc),
    imageAlt: resolveOptionalString(item.imageAlt),
    tags: Array.isArray(item.tags)
      ? item.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [],
    authorName: resolveOptionalString(item.authorName),
    publishedAt: resolveOptionalString(item.publishedAt),
    status: resolveTrimmedOptionalString(item.status),
  };
};

export function normalizeEntryTeaserData(data: EntryTeaserData): EntryTeaserData {
  const sourceDefaults = entryTeaserDefaults.source ?? {
    contentTypeId: "",
    entryId: "",
  };
  const fieldDefaults = entryTeaserDefaults.fields ?? {
    showImage: true,
    showExcerpt: true,
    showMeta: true,
    showTags: true,
  };
  const ctaDefaults = entryTeaserDefaults.cta ?? {
    label: "Read more",
    hrefMode: "auto" as const,
    href: "",
  };
  const styleDefaults = entryTeaserDefaults.style ?? {
    surface: "var(--color-bg)",
    border: "var(--color-border)",
    radius: "lg" as const,
    spacing: "md" as const,
  };
  const fallbackDefaults = entryTeaserDefaults.fallback ?? {
    title: "No entry selected",
    description:
      "Choose a source mode and content type to render teaser content.",
    fallbackToLatest: true,
  };

  return {
    ...data,
    sourceMode: resolveEntryTeaserSourceMode(data.sourceMode),
    source: {
      mode: resolveEntryTeaserDataSourceMode(
        data.source?.mode,
        data.source?.listingQueryId
      ),
      listingQueryId: resolveString(data.source?.listingQueryId, ""),
      listingTemplateId: resolveString(data.source?.listingTemplateId, ""),
      contentTypeId: resolveString(data.source?.contentTypeId, sourceDefaults.contentTypeId ?? ""),
      entryId: resolveString(data.source?.entryId, sourceDefaults.entryId ?? ""),
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
      showTags:
        typeof data.fields?.showTags === "boolean"
          ? data.fields.showTags
          : Boolean(fieldDefaults.showTags),
    },
    cta: {
      label: resolveString(data.cta?.label, ctaDefaults.label ?? "Read more"),
      hrefMode: resolveEntryTeaserHrefMode(data.cta?.hrefMode),
      href: resolveString(data.cta?.href, ctaDefaults.href ?? ""),
    },
    style: {
      surface: resolveString(data.style?.surface, styleDefaults.surface ?? "var(--color-bg)"),
      border: resolveString(data.style?.border, styleDefaults.border ?? "var(--color-border)"),
      radius: resolveEntryTeaserRadius(data.style?.radius),
      spacing: resolveEntryTeaserSpacing(data.style?.spacing),
    },
    fallback: {
      title: resolveString(data.fallback?.title, fallbackDefaults.title ?? "No entry selected"),
      description: resolveString(
        data.fallback?.description,
        fallbackDefaults.description ??
          "Choose a source mode and content type to render teaser content."
      ),
      fallbackToLatest:
        typeof data.fallback?.fallbackToLatest === "boolean"
          ? data.fallback.fallbackToLatest
          : Boolean(fallbackDefaults.fallbackToLatest),
    },
    resolved: {
      item: normalizeRuntimeItem(data.resolved?.item ?? null),
      sourceTypeId: resolveString(data.resolved?.sourceTypeId, ""),
      sourceTypeSlug: resolveString(data.resolved?.sourceTypeSlug, ""),
      resolvedAt: resolveString(data.resolved?.resolvedAt, ""),
      listingQueryId: resolveString(data.resolved?.listingQueryId, ""),
      listingTemplateId: resolveString(data.resolved?.listingTemplateId, ""),
      error: resolveOptionalString(data.resolved?.error),
    },
  };
}

const formatRuntimeDate = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
};

const buildMetaLine = (item: EntryTeaserRuntimeItem) => {
  const chunks: string[] = [];
  const dateLabel = formatRuntimeDate(item.publishedAt);
  if (dateLabel) chunks.push(dateLabel);
  if ((item.authorName ?? "").trim().length > 0) {
    chunks.push(item.authorName!.trim());
  }
  return chunks.join(" • ");
};

export function EntryTeaserBlock({
  data,
  variant,
  blockId,
}: {
  data: EntryTeaserData;
  variant: string;
  blockId?: string;
}) {
  const normalized = normalizeEntryTeaserData(data);
  const resolvedVariant = resolveEntryTeaserVariant(variant);
  const source = normalized.source ?? entryTeaserDefaults.source!;
  const sourceDataMode = source.mode ?? "legacy";
  const sourceMode = normalized.sourceMode ?? "latest";
  const fields = normalized.fields ?? entryTeaserDefaults.fields!;
  const cta = normalized.cta ?? entryTeaserDefaults.cta!;
  const style = normalized.style ?? entryTeaserDefaults.style!;
  const item = normalizeRuntimeItem(normalized.resolved?.item ?? null);
  const hasSource =
    sourceDataMode === "listing"
      ? (source.listingQueryId ?? "").trim().length > 0
      : (source.contentTypeId ?? "").trim().length > 0;
  const state = !hasSource ? "missing-source" : item ? "ready" : "empty";
  const errorText = normalized.resolved?.error;
  const href =
    cta.hrefMode === "custom" && (cta.href ?? "").trim().length > 0
      ? sanitizeHref(cta.href)
      : sanitizeHref(item?.href);

  const wrapperClassName =
    resolvedVariant === "horizontal"
      ? joinClasses(
          "flex flex-col md:flex-row md:items-stretch",
          spacingClassMap[style.spacing ?? "md"]
        )
      : joinClasses("flex flex-col", spacingClassMap[style.spacing ?? "md"]);
  const imageWrapperClassName =
    resolvedVariant === "horizontal"
      ? "w-full md:w-[40%]"
      : resolvedVariant === "minimal"
        ? "w-full"
        : "w-full";
  const contentWrapperClassName =
    resolvedVariant === "horizontal"
      ? "flex-1"
      : "w-full";
  const surfaceStyle: CSSProperties = {
    backgroundColor: style.surface ?? "var(--color-bg)",
    borderColor: style.border ?? "var(--color-border)",
  };
  const metaLine = item ? buildMetaLine(item) : "";

  return (
    <section
      className={joinClasses(
        "mx-auto w-full max-w-5xl border p-5",
        radiusClassMap[style.radius ?? "lg"]
      )}
      style={surfaceStyle}
      data-entry-teaser-variant={resolvedVariant}
      data-entry-teaser-data-source-mode={sourceDataMode}
      data-entry-teaser-source-mode={sourceMode}
      data-entry-teaser-source={
        sourceDataMode === "listing"
          ? source.listingQueryId ?? ""
          : source.contentTypeId ?? ""
      }
      data-entry-teaser-state={state}
      data-listing-widget="entry-teaser"
      data-listing-block-id={blockId ?? ""}
      data-listing-query-id={
        sourceDataMode === "listing" ? normalized.source?.listingQueryId ?? "" : ""
      }
    >
      {errorText ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorText}
        </div>
      ) : null}

      {!hasSource ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-sm text-[var(--color-text)]/80">
          {sourceDataMode === "listing"
            ? "Select listing query to resolve teaser source."
            : "Select content type to resolve teaser source."}
        </div>
      ) : item ? (
        <article className={wrapperClassName} data-entry-teaser-status={item.status ?? "unknown"}>
          {fields.showImage && item.imageSrc ? (
            <div className={imageWrapperClassName}>
              <div
                className={joinClasses(
                  "overflow-hidden border border-[var(--color-border)]/70",
                  radiusClassMap[style.radius ?? "lg"]
                )}
              >
                <img
                  src={item.imageSrc}
                  alt={item.imageAlt ?? item.title ?? "Entry teaser"}
                  className={joinClasses(
                    "w-full object-cover",
                    resolvedVariant === "minimal" ? "h-36" : "h-52"
                  )}
                  loading="lazy"
                />
              </div>
            </div>
          ) : null}
          <div className={joinClasses(contentWrapperClassName, "space-y-3")}>
            <h3
              className={joinClasses(
                "font-semibold text-[var(--color-text)]",
                resolvedVariant === "minimal" ? "text-lg" : "text-2xl"
              )}
            >
              {item.title}
            </h3>
            {fields.showMeta && metaLine.length > 0 ? (
              <p className="text-xs text-[var(--color-text)]/70">{metaLine}</p>
            ) : null}
            {fields.showExcerpt && (item.excerpt ?? "").trim().length > 0 ? (
              <p className="text-sm text-[var(--color-text)]/85">{item.excerpt}</p>
            ) : null}
            {fields.showTags && Array.isArray(item.tags) && item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {item.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--color-border)]/80 px-2 py-1 text-xs text-[var(--color-text)]/75"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div>
              <a
                href={href}
                className="inline-flex items-center text-sm font-medium underline-offset-4 hover:underline"
              >
                {resolveTrimmedString(cta.label, "Read more")}
              </a>
            </div>
          </div>
        </article>
      ) : (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-9 text-center">
          <p className="text-base font-semibold text-[var(--color-text)]">
            {normalized.fallback?.title ?? "No entry selected"}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text)]/75">
            {normalized.fallback?.description ??
              "Choose a source mode and content type to render teaser content."}
          </p>
        </div>
      )}
    </section>
  );
}

export function createEntryTeaserWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<EntryTeaserData>>;
  visual: ComponentType<WidgetEditorProps<EntryTeaserData>>;
  advanced: ComponentType<WidgetEditorProps<EntryTeaserData>>;
}): WidgetDefinition<EntryTeaserData> {
  return {
    type: "entry-teaser",
    title: "Entry Teaser",
    description: "Highlighted teaser for one selected, latest, or featured entry.",
    category: "content",
    variants: [
      {
        id: "horizontal",
        label: "Horizontal",
        description: "Media and copy side by side.",
      },
      {
        id: "vertical",
        label: "Vertical",
        description: "Stacked teaser card layout.",
      },
      {
        id: "minimal",
        label: "Minimal",
        description: "Compact teaser with concise copy.",
      },
    ],
    schema: entryTeaserSchema,
    defaults: entryTeaserDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: EntryTeaserBlock,
  };
}
