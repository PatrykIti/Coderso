import type { CSSProperties, ComponentType } from "react";

import type {
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref, resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type EntryTeaserVariantId = "horizontal" | "vertical" | "minimal";
export type EntryTeaserSourceMode = "manual" | "latest" | "featured";
export type EntryTeaserDataSourceMode = "legacy" | "listing";
export type EntryTeaserListingManualTarget = {
  rowId?: string;
  entryId?: string;
};
export type EntryTeaserCtaHrefMode = "auto" | "custom";
export type EntryTeaserCtaStyle = "link" | "filled" | "outline";
export type EntryTeaserRadius = "none" | "sm" | "md" | "lg" | "xl";
export type EntryTeaserSpacing = "none" | "sm" | "md" | "lg";
export type EntryTeaserHeadingLevel = "h2" | "h3" | "h4";
export type EntryTeaserMediaMode = "image" | "icon" | "none";
export type EntryTeaserImageAspect = "auto" | "16:9" | "4:3" | "1:1";
export type EntryTeaserImageHeight = "auto" | "sm" | "md" | "lg";
export type EntryTeaserObjectFit = "cover" | "contain";
export type EntryTeaserMaxWidth = "sm" | "md" | "lg" | "xl" | "full";

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
    listingManualTarget?: EntryTeaserListingManualTarget;
    contentTypeId?: string;
    entryId?: string;
  };
  fields?: {
    showImage?: boolean;
    showExcerpt?: boolean;
    showMeta?: boolean;
    showTags?: boolean;
    tagLimit?: number;
  };
  cta?: {
    label?: string;
    hrefMode?: EntryTeaserCtaHrefMode;
    href?: string;
    opensInNewTab?: boolean;
    style?: EntryTeaserCtaStyle;
  };
  style?: {
    surface?: string;
    border?: string;
    radius?: EntryTeaserRadius;
    spacing?: EntryTeaserSpacing;
  };
  section?: {
    title?: string;
    headingLevel?: EntryTeaserHeadingLevel;
  };
  title?: {
    headingLevel?: EntryTeaserHeadingLevel;
  };
  media?: {
    mode?: EntryTeaserMediaMode;
    aspect?: EntryTeaserImageAspect;
    height?: EntryTeaserImageHeight;
    fit?: EntryTeaserObjectFit;
  };
  layout?: {
    maxWidth?: EntryTeaserMaxWidth;
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
        listingManualTarget: {
          type: "object",
          additionalProperties: false,
          properties: {
            rowId: { type: "string" },
            entryId: { type: "string" },
          },
        },
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
        tagLimit: { type: "integer", minimum: 0, maximum: 12 },
      },
    },
    cta: {
      type: "object",
      additionalProperties: false,
      properties: {
        label: { type: "string" },
        hrefMode: { enum: ["auto", "custom"] },
        href: { type: "string" },
        opensInNewTab: { type: "boolean" },
        style: { enum: ["link", "filled", "outline"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surface: { type: "string" },
        border: { type: "string" },
        radius: { enum: ["none", "sm", "md", "lg", "xl"] },
        spacing: { enum: ["none", "sm", "md", "lg"] },
      },
    },
    section: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        headingLevel: { enum: ["h2", "h3", "h4"] },
      },
    },
    title: {
      type: "object",
      additionalProperties: false,
      properties: {
        headingLevel: { enum: ["h2", "h3", "h4"] },
      },
    },
    media: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["image", "icon", "none"] },
        aspect: { enum: ["auto", "16:9", "4:3", "1:1"] },
        height: { enum: ["auto", "sm", "md", "lg"] },
        fit: { enum: ["cover", "contain"] },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        maxWidth: { enum: ["sm", "md", "lg", "xl", "full"] },
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
    listingManualTarget: {
      rowId: "",
      entryId: "",
    },
    contentTypeId: "",
    entryId: "",
  },
  fields: {
    showImage: true,
    showExcerpt: true,
    showMeta: true,
    showTags: true,
    tagLimit: 5,
  },
  cta: {
    label: "Read more",
    hrefMode: "auto",
    href: "",
    opensInNewTab: false,
    style: "link",
  },
  style: {
    radius: "lg",
    spacing: "md",
  },
  section: {
    title: "",
    headingLevel: "h2",
  },
  title: {
    headingLevel: "h3",
  },
  media: {
    mode: "image",
    aspect: "auto",
    height: "auto",
    fit: "cover",
  },
  layout: {
    maxWidth: "lg",
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

export const entryTeaserEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "entry-teaser.wizard.source-setup",
      title: "Source setup",
      role: "source",
      writablePaths: [
        "sourceMode",
        "source.mode",
        "source.listingQueryId",
        "source.listingTemplateId",
        "source.listingManualTarget.rowId",
        "source.listingManualTarget.entryId",
        "source.contentTypeId",
        "source.entryId",
      ],
    },
    {
      mode: "visual",
      id: "entry-teaser.visual.content-display",
      title: "Content display",
      role: "content",
      writablePaths: [
        "variant",
        "section.title",
        "section.headingLevel",
        "title.headingLevel",
        "fields.showImage",
        "fields.showExcerpt",
        "fields.showMeta",
        "fields.showTags",
        "fields.tagLimit",
        "cta.label",
        "cta.hrefMode",
        "cta.href",
        "cta.opensInNewTab",
        "cta.style",
        "fallback.title",
        "fallback.description",
        "fallback.fallbackToLatest",
      ],
    },
    {
      mode: "visual",
      id: "entry-teaser.visual.presentation",
      title: "Presentation",
      role: "visual",
      writablePaths: [
        "media.mode",
        "media.aspect",
        "media.height",
        "media.fit",
        "layout.maxWidth",
        "style.surface",
        "style.border",
        "style.radius",
        "style.spacing",
      ],
    },
    {
      mode: "advanced",
      id: "entry-teaser.advanced.source-diagnostics",
      title: "Source diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["source", "sourceMode", "resolved", "runtime.previewState"],
    },
    {
      mode: "advanced",
      id: "entry-teaser.advanced.presentation-diagnostics",
      title: "Presentation diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "fields.tagLimit", "media", "layout", "style"],
    },
    {
      mode: "advanced",
      id: "entry-teaser.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["resolved", "runtime.previewState"],
    },
  ],
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const ctaStyleClassMap: Record<EntryTeaserCtaStyle, string> = {
  link: "text-sm font-medium underline-offset-4 hover:underline",
  filled:
    "rounded-md bg-[var(--color-text)] px-4 py-2 text-sm font-medium text-[var(--color-bg)] transition hover:opacity-90",
  outline:
    "rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]/60",
};

const spacingClassMap: Record<EntryTeaserSpacing, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const radiusClassMap: Record<EntryTeaserRadius, string> = {
  none: "",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
};

const headingLevelOptions = ["h2", "h3", "h4"] as const;
const mediaModeOptions = ["image", "icon", "none"] as const;
const mediaAspectOptions = ["auto", "16:9", "4:3", "1:1"] as const;
const mediaHeightOptions = ["auto", "sm", "md", "lg"] as const;
const mediaObjectFitOptions = ["cover", "contain"] as const;
const maxWidthOptions = ["sm", "md", "lg", "xl", "full"] as const;

const maxWidthClassMap: Record<EntryTeaserMaxWidth, string> = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-none",
};

const mediaHeightClassMap: Record<Exclude<EntryTeaserImageHeight, "auto">, string> = {
  sm: "h-36",
  md: "h-52",
  lg: "h-64",
};

const mediaObjectFitClassMap: Record<EntryTeaserObjectFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
};

const mediaDimensionsMap: Record<
  Exclude<EntryTeaserImageAspect, "auto">,
  Record<Exclude<EntryTeaserImageHeight, "auto">, { width: number; height: number }>
> = {
  "16:9": {
    sm: { width: 640, height: 360 },
    md: { width: 960, height: 540 },
    lg: { width: 1280, height: 720 },
  },
  "4:3": {
    sm: { width: 480, height: 360 },
    md: { width: 640, height: 480 },
    lg: { width: 800, height: 600 },
  },
  "1:1": {
    sm: { width: 360, height: 360 },
    md: { width: 480, height: 480 },
    lg: { width: 640, height: 640 },
  },
};

const defaultVariantMediaDimensionsMap: Record<
  EntryTeaserVariantId,
  Record<Exclude<EntryTeaserImageHeight, "auto">, { width: number; height: number }>
> = {
  horizontal: {
    sm: { width: 640, height: 360 },
    md: { width: 960, height: 540 },
    lg: { width: 1280, height: 720 },
  },
  vertical: {
    sm: { width: 640, height: 360 },
    md: { width: 960, height: 540 },
    lg: { width: 1280, height: 720 },
  },
  minimal: {
    sm: { width: 480, height: 270 },
    md: { width: 640, height: 360 },
    lg: { width: 960, height: 540 },
  },
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const limitString = (value: string, maxLength: number) =>
  value.length > maxLength ? value.slice(0, maxLength) : value;

const resolveLimitedString = (value: string | undefined, fallback: string, maxLength: number) =>
  limitString(resolveString(value, fallback), maxLength);

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

const normalizeCustomCtaHref = (value: string | undefined) => {
  const trimmed = resolveTrimmedOptionalString(value);
  if (!trimmed) return "";
  return (
    normalizeWidgetSafeHref(trimmed, {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    }) ?? ""
  );
};

export const resolveEntryTeaserVariant = (variant: string): EntryTeaserVariantId => {
  if (variant === "horizontal" || variant === "vertical" || variant === "minimal") return variant;
  return "horizontal";
};

const resolveEnum = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T => {
  if (value && allowed.includes(value as T)) return value as T;
  return fallback;
};

const resolveEntryTeaserSourceMode = (value: string | undefined): EntryTeaserSourceMode => {
  if (value === "manual" || value === "featured") return value;
  return "latest";
};

const resolveEntryTeaserHrefMode = (value: string | undefined): EntryTeaserCtaHrefMode => {
  if (value === "custom") return value;
  return "auto";
};

const resolveEntryTeaserCtaStyle = (value: string | undefined): EntryTeaserCtaStyle => {
  if (value === "filled" || value === "outline") return value;
  return "link";
};

const resolveEntryTeaserRadius = (value: string | undefined): EntryTeaserRadius => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl")
    return value;
  return "lg";
};

const resolveEntryTeaserSpacing = (value: string | undefined): EntryTeaserSpacing => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveEntryTeaserHeadingLevel = (
  value: string | undefined,
  fallback: EntryTeaserHeadingLevel
): EntryTeaserHeadingLevel => resolveEnum(value, headingLevelOptions, fallback);

const resolveEntryTeaserMediaMode = (value: string | undefined): EntryTeaserMediaMode =>
  resolveEnum(value, mediaModeOptions, "image");

const resolveEntryTeaserImageAspect = (value: string | undefined): EntryTeaserImageAspect =>
  resolveEnum(value, mediaAspectOptions, "auto");

const resolveEntryTeaserImageHeight = (value: string | undefined): EntryTeaserImageHeight =>
  resolveEnum(value, mediaHeightOptions, "auto");

const resolveEntryTeaserObjectFit = (value: string | undefined): EntryTeaserObjectFit =>
  resolveEnum(value, mediaObjectFitOptions, "cover");

const resolveEntryTeaserMaxWidth = (value: string | undefined): EntryTeaserMaxWidth =>
  resolveEnum(value, maxWidthOptions, "lg");

const clampEntryTeaserTagLimit = (value: number | undefined, fallback: number) => {
  if (!Number.isInteger(value)) return fallback;
  return Math.max(0, Math.min(12, value ?? fallback));
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
          .slice(0, 12)
      : [],
    authorName: resolveOptionalString(item.authorName),
    publishedAt: resolveOptionalString(item.publishedAt),
    status: resolveTrimmedOptionalString(item.status),
  };
};

export function normalizeEntryTeaserData(data: EntryTeaserData): EntryTeaserData {
  const sourceDefaults = entryTeaserDefaults.source ?? {
    listingManualTarget: {
      rowId: "",
      entryId: "",
    },
    contentTypeId: "",
    entryId: "",
  };
  const fieldDefaults = entryTeaserDefaults.fields ?? {
    showImage: true,
    showExcerpt: true,
    showMeta: true,
    showTags: true,
    tagLimit: 5,
  };
  const ctaDefaults = entryTeaserDefaults.cta ?? {
    label: "Read more",
    hrefMode: "auto" as const,
    href: "",
    opensInNewTab: false,
    style: "link" as const,
  };
  const styleDefaults = entryTeaserDefaults.style ?? {
    radius: "lg" as const,
    spacing: "md" as const,
  };
  const sectionDefaults = entryTeaserDefaults.section ?? {
    title: "",
    headingLevel: "h2" as const,
  };
  const titleDefaults = entryTeaserDefaults.title ?? {
    headingLevel: "h3" as const,
  };
  const mediaDefaults = entryTeaserDefaults.media ?? {
    mode: "image" as const,
    aspect: "auto" as const,
    height: "auto" as const,
    fit: "cover" as const,
  };
  const layoutDefaults = entryTeaserDefaults.layout ?? {
    maxWidth: "lg" as const,
  };
  const fallbackDefaults = entryTeaserDefaults.fallback ?? {
    title: "No entry selected",
    description: "Choose a source mode and content type to render teaser content.",
    fallbackToLatest: true,
  };
  const hasStyleObject = data.style !== undefined;
  const ctaHrefMode = resolveEntryTeaserHrefMode(data.cta?.hrefMode);

  return {
    ...data,
    sourceMode: resolveEntryTeaserSourceMode(data.sourceMode),
    source: {
      mode: resolveEntryTeaserDataSourceMode(data.source?.mode, data.source?.listingQueryId),
      listingQueryId: resolveString(data.source?.listingQueryId, ""),
      listingTemplateId: resolveString(data.source?.listingTemplateId, ""),
      listingManualTarget: {
        rowId: resolveString(
          data.source?.listingManualTarget?.rowId,
          sourceDefaults.listingManualTarget?.rowId ?? ""
        ),
        entryId: resolveString(
          data.source?.listingManualTarget?.entryId,
          sourceDefaults.listingManualTarget?.entryId ?? ""
        ),
      },
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
      tagLimit: clampEntryTeaserTagLimit(data.fields?.tagLimit, fieldDefaults.tagLimit ?? 5),
    },
    cta: {
      label: resolveLimitedString(data.cta?.label, ctaDefaults.label ?? "Read more", 32),
      hrefMode: ctaHrefMode,
      href:
        ctaHrefMode === "custom"
          ? normalizeCustomCtaHref(data.cta?.href)
          : resolveString(data.cta?.href, ctaDefaults.href ?? ""),
      opensInNewTab:
        typeof data.cta?.opensInNewTab === "boolean"
          ? data.cta.opensInNewTab
          : Boolean(ctaDefaults.opensInNewTab),
      style: resolveEntryTeaserCtaStyle(data.cta?.style ?? ctaDefaults.style),
    },
    style: {
      surface: hasStyleObject
        ? resolveClearableStyleValue(data.style?.surface)
        : styleDefaults.surface,
      border: hasStyleObject
        ? resolveClearableStyleValue(data.style?.border)
        : styleDefaults.border,
      radius: resolveEntryTeaserRadius(data.style?.radius),
      spacing: resolveEntryTeaserSpacing(data.style?.spacing),
    },
    section: {
      title: resolveString(data.section?.title, sectionDefaults.title ?? ""),
      headingLevel: resolveEntryTeaserHeadingLevel(
        data.section?.headingLevel,
        sectionDefaults.headingLevel ?? "h2"
      ),
    },
    title: {
      headingLevel: resolveEntryTeaserHeadingLevel(
        data.title?.headingLevel,
        titleDefaults.headingLevel ?? "h3"
      ),
    },
    media: {
      mode: resolveEntryTeaserMediaMode(data.media?.mode ?? mediaDefaults.mode),
      aspect: resolveEntryTeaserImageAspect(data.media?.aspect ?? mediaDefaults.aspect),
      height: resolveEntryTeaserImageHeight(data.media?.height ?? mediaDefaults.height),
      fit: resolveEntryTeaserObjectFit(data.media?.fit ?? mediaDefaults.fit),
    },
    layout: {
      maxWidth: resolveEntryTeaserMaxWidth(data.layout?.maxWidth ?? layoutDefaults.maxWidth),
    },
    fallback: {
      title: resolveLimitedString(
        data.fallback?.title,
        fallbackDefaults.title ?? "No entry selected",
        60
      ),
      description: resolveLimitedString(
        data.fallback?.description,
        fallbackDefaults.description ??
          "Choose a source mode and content type to render teaser content.",
        200
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

const resolveEntryTeaserMediaHeightToken = (
  value: EntryTeaserImageHeight | undefined,
  variant: EntryTeaserVariantId
): Exclude<EntryTeaserImageHeight, "auto"> => {
  if (value === "sm" || value === "md" || value === "lg") return value;
  return variant === "minimal" ? "sm" : "md";
};

const resolveEntryTeaserMediaHeightClass = (
  value: EntryTeaserImageHeight | undefined,
  variant: EntryTeaserVariantId
) => mediaHeightClassMap[resolveEntryTeaserMediaHeightToken(value, variant)];

const resolveEntryTeaserMediaDimensions = (
  aspect: EntryTeaserImageAspect | undefined,
  height: EntryTeaserImageHeight | undefined,
  variant: EntryTeaserVariantId
) => {
  const resolvedHeight = resolveEntryTeaserMediaHeightToken(height, variant);
  if (aspect && aspect !== "auto") {
    return mediaDimensionsMap[aspect][resolvedHeight];
  }
  return defaultVariantMediaDimensionsMap[variant][resolvedHeight];
};

export function EntryTeaserBlock({
  data,
  variant,
  blockId,
  renderContext,
}: {
  data: EntryTeaserData;
  variant: string;
  blockId?: string;
  renderContext?: WidgetRenderContext;
}) {
  const normalized = normalizeEntryTeaserData(data);
  const resolvedVariant = resolveEntryTeaserVariant(variant);
  const source = normalized.source ?? entryTeaserDefaults.source!;
  const sourceDataMode = source.mode ?? "legacy";
  const sourceMode = normalized.sourceMode ?? "latest";
  const fields = normalized.fields ?? entryTeaserDefaults.fields!;
  const cta = normalized.cta ?? entryTeaserDefaults.cta!;
  const style = normalized.style ?? entryTeaserDefaults.style!;
  const section = normalized.section ?? entryTeaserDefaults.section!;
  const title = normalized.title ?? entryTeaserDefaults.title!;
  const media = normalized.media ?? entryTeaserDefaults.media!;
  const layout = normalized.layout ?? entryTeaserDefaults.layout!;
  const item = normalizeRuntimeItem(normalized.resolved?.item ?? null);
  const hasSource =
    sourceDataMode === "listing"
      ? (source.listingQueryId ?? "").trim().length > 0
      : (source.contentTypeId ?? "").trim().length > 0;
  const state = !hasSource ? "missing-source" : item ? "ready" : "empty";
  const errorText = normalized.resolved?.error;
  const ctaLinkAttrs = resolveWidgetLinkAttrs(cta.hrefMode === "custom" ? cta.href : item?.href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openInNewTab: cta.opensInNewTab,
  });

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
  const contentWrapperClassName = resolvedVariant === "horizontal" ? "flex-1" : "w-full";
  const surfaceStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.surface),
      borderColor: resolveClearableStyleValue(style.border),
    }) ?? {};
  const metaLine = item ? buildMetaLine(item) : "";
  const visibleTags = item ? (item.tags?.slice(0, fields.tagLimit ?? 5) ?? []) : [];
  const sectionHeadingText = resolveTrimmedOptionalString(section.title);
  const SectionHeadingTag = section.headingLevel ?? "h2";
  const EntryHeadingTag = title.headingLevel ?? "h3";
  const mediaHeightClassName = resolveEntryTeaserMediaHeightClass(media.height, resolvedVariant);
  const mediaDimensions = resolveEntryTeaserMediaDimensions(
    media.aspect,
    media.height,
    resolvedVariant
  );
  const mediaObjectFitClassName =
    media.mode === "icon"
      ? mediaObjectFitClassMap.contain
      : mediaObjectFitClassMap[media.fit ?? "cover"];
  const previewState = renderContext?.mode === "editor-preview" ? renderContext.previewState : null;
  const previewLoading = previewState?.status === "loading" && hasSource && !item;
  const previewMessage =
    previewState?.status === "error" && !errorText && hasSource && !item
      ? previewState.message
      : null;

  return (
    <section
      className={joinClasses(
        "mx-auto w-full border p-5",
        maxWidthClassMap[layout.maxWidth ?? "lg"],
        radiusClassMap[style.radius ?? "lg"]
      )}
      style={surfaceStyle}
      data-entry-teaser-variant={resolvedVariant}
      data-entry-teaser-data-source-mode={sourceDataMode}
      data-entry-teaser-source-mode={sourceMode}
      data-entry-teaser-media-mode={media.mode ?? "image"}
      data-entry-teaser-max-width={layout.maxWidth ?? "lg"}
      data-entry-teaser-tag-limit={String(fields.tagLimit ?? 5)}
      data-entry-teaser-source={
        sourceDataMode === "listing" ? (source.listingQueryId ?? "") : (source.contentTypeId ?? "")
      }
      data-entry-teaser-state={state}
      data-listing-widget="entry-teaser"
      data-listing-block-id={blockId ?? ""}
      data-listing-query-id={
        sourceDataMode === "listing" ? (normalized.source?.listingQueryId ?? "") : ""
      }
    >
      {sectionHeadingText ? (
        <SectionHeadingTag className="mb-4 text-xl font-semibold text-[var(--color-text)]">
          {sectionHeadingText}
        </SectionHeadingTag>
      ) : null}
      {errorText ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorText}
        </div>
      ) : null}
      {previewMessage ? (
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          {previewMessage}
        </div>
      ) : null}

      {!hasSource ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-sm text-[var(--color-text)]/80">
          {sourceDataMode === "listing"
            ? "Select listing query to resolve teaser source."
            : "Select content type to resolve teaser source."}
        </div>
      ) : previewLoading ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-sm text-[var(--color-text)]/80">
          Loading resolved teaser preview...
        </div>
      ) : item ? (
        <article className={wrapperClassName} data-entry-teaser-status={item.status ?? "unknown"}>
          {fields.showImage && media.mode !== "none" && item.imageSrc ? (
            <div className={imageWrapperClassName}>
              <div
                className={joinClasses(
                  "overflow-hidden border border-[var(--color-border)]/70",
                  radiusClassMap[style.radius ?? "lg"],
                  media.mode === "icon" ? "bg-[var(--color-bg)]/70 p-6" : undefined
                )}
              >
                <img
                  src={item.imageSrc}
                  alt={item.imageAlt ?? item.title ?? "Entry teaser"}
                  width={mediaDimensions.width}
                  height={mediaDimensions.height}
                  className={joinClasses(
                    "w-full",
                    mediaHeightClassName,
                    mediaObjectFitClassName,
                    media.mode === "icon" ? "mx-auto max-w-[12rem]" : undefined
                  )}
                  loading="lazy"
                />
              </div>
            </div>
          ) : null}
          <div className={joinClasses(contentWrapperClassName, "space-y-3")}>
            <EntryHeadingTag
              className={joinClasses(
                "font-semibold text-[var(--color-text)]",
                resolvedVariant === "minimal" ? "text-lg" : "text-2xl"
              )}
            >
              {item.title}
            </EntryHeadingTag>
            {fields.showMeta && metaLine.length > 0 ? (
              <p className="text-xs text-[var(--color-text)]/70">{metaLine}</p>
            ) : null}
            {fields.showExcerpt && (item.excerpt ?? "").trim().length > 0 ? (
              <p className="text-sm text-[var(--color-text)]/85">{item.excerpt}</p>
            ) : null}
            {fields.showTags && visibleTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {visibleTags.map((tag) => (
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
              {ctaLinkAttrs ? (
                <a
                  {...ctaLinkAttrs}
                  className={joinClasses(
                    "inline-flex items-center",
                    ctaStyleClassMap[cta.style ?? "link"]
                  )}
                >
                  {resolveTrimmedString(cta.label, "Read more")}
                </a>
              ) : (
                <span
                  className={joinClasses(
                    "inline-flex items-center opacity-70",
                    ctaStyleClassMap[cta.style ?? "link"]
                  )}
                >
                  {resolveTrimmedString(cta.label, "Read more")}
                </span>
              )}
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
    editorContract: entryTeaserEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
      supportsPreviewState: true,
    },
    render: EntryTeaserBlock,
  };
}
