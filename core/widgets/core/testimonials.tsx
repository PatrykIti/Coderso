import { useId, type CSSProperties, type ComponentType } from "react";

import {
  dangerousHtmlContentTagSet,
  escapeHtml,
  htmlToPlainText,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
} from "../../services/posts/editor/postRichTextHtmlUtils";
import type { WidgetDefinition, WidgetEditorContract, WidgetEditorBundle } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";
import { normalizeWidgetSafeHref, resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type TestimonialsVariantId = "grid" | "spotlight" | "slider-static";
export type TestimonialsSpacing = "none" | "sm" | "md" | "lg";
export type TestimonialsHeaderAlign = "left" | "center" | "right";
export type TestimonialsTitleSize = "sm" | "md" | "lg";
export type TestimonialsCardRadius = "none" | "sm" | "md" | "lg" | "xl";
export type TestimonialsCardBorderWidth = "none" | "sm" | "md";
export type TestimonialsSectionGradient = "none" | "soft" | "warm" | "cool";
export type TestimonialsBackgroundTone = "plain" | "soft" | "contrast";
export type TestimonialsSliderNavigation = "none" | "dots";
export type TestimonialsRatingDisplay = "stars" | "hide-empty" | "label-empty";
export type TestimonialsCtaTarget = "same-tab" | "new-tab";
export type TestimonialsCtaStyle = "primary" | "secondary" | "link";
export type TestimonialsPaginationMode = "none" | "load-more";

export type TestimonialItem = {
  id?: string;
  quote?: string;
  quoteHtml?: string;
  author?: string;
  role?: string;
  avatar?: string;
  rating?: number;
  sourceLabel?: string;
};

export type TestimonialsData = {
  header?: {
    eyebrow?: string;
    title?: string;
    description?: string;
  };
  testimonials: TestimonialItem[];
  cta?: {
    enabled?: boolean;
    label?: string;
    href?: string;
    target?: TestimonialsCtaTarget;
    style?: TestimonialsCtaStyle;
  };
  layout?: {
    spotlightItemId?: string;
  };
  behavior?: {
    sliderNavigation?: TestimonialsSliderNavigation;
    ratingDisplay?: TestimonialsRatingDisplay;
  };
  pagination?: {
    mode?: TestimonialsPaginationMode;
    pageSize?: number;
    loadMoreLabel?: string;
  };
  style?: {
    sectionBackground?: string;
    sectionGradient?: TestimonialsSectionGradient;
    backgroundTone?: TestimonialsBackgroundTone;
    backgroundImage?: string;
    cardSurface?: string;
    cardBorder?: string;
    textColor?: string;
    accentColor?: string;
    spacing?: TestimonialsSpacing;
    headerAlign?: TestimonialsHeaderAlign;
    titleSize?: TestimonialsTitleSize;
    cardRadius?: TestimonialsCardRadius;
    cardBorderWidth?: TestimonialsCardBorderWidth;
  };
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const testimonialsVariantCountMap: Record<TestimonialsVariantId, number> = {
  grid: 3,
  spotlight: 2,
  "slider-static": 3,
};

const spacingClassMap: Record<TestimonialsSpacing, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const headerAlignClassMap: Record<TestimonialsHeaderAlign, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const titleSizeClassMap: Record<TestimonialsTitleSize, string> = {
  sm: "text-xl sm:text-2xl",
  md: "text-2xl sm:text-3xl",
  lg: "text-3xl sm:text-4xl",
};

const cardRadiusClassMap: Record<TestimonialsCardRadius, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-[1.75rem]",
};

const cardBorderWidthClassMap: Record<TestimonialsCardBorderWidth, string> = {
  none: "border-0",
  sm: "border",
  md: "border-2",
};

const sectionToneClassMap: Record<TestimonialsBackgroundTone, string> = {
  plain: "",
  soft: "shadow-sm ring-1 ring-inset ring-[var(--color-border)]/35",
  contrast: "shadow-lg ring-1 ring-inset ring-[var(--color-border)]/50",
};

const sectionGradientImageMap: Record<TestimonialsSectionGradient, string | undefined> = {
  none: undefined,
  soft: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(255, 255, 255, 0))",
  warm: "linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(249, 115, 22, 0.08))",
  cool: "linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(99, 102, 241, 0.08))",
};

const ctaStyleClassMap: Record<TestimonialsCtaStyle, string> = {
  primary: "border-transparent bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-90",
  secondary:
    "border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg)]/70",
  link: "border-transparent px-0 text-[var(--color-text)] underline underline-offset-4 hover:opacity-80",
};

const testimonialsQuoteAllowedTags = new Set(["p", "br", "strong", "em", "a"]);
const testimonialsQuoteSelfClosingTags = new Set(["br"]);
const testimonialsQuoteBlockTags = new Set(["p"]);

const testimonialsItemMin = 2;
export const testimonialsItemMax = 24;
export const testimonialsPageSizeMin = 2;
export const testimonialsPageSizeMax = 12;

export const testimonialsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["testimonials"],
  properties: {
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        eyebrow: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    testimonials: {
      type: "array",
      minItems: testimonialsItemMin,
      maxItems: testimonialsItemMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          quote: { type: "string" },
          quoteHtml: { type: "string" },
          author: { type: "string" },
          role: { type: "string" },
          avatar: { type: "string" },
          rating: { type: "integer", minimum: 0, maximum: 5 },
          sourceLabel: { type: "string" },
        },
      },
    },
    cta: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        label: { type: "string" },
        href: { type: "string" },
        target: { enum: ["same-tab", "new-tab"] },
        style: { enum: ["primary", "secondary", "link"] },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        spotlightItemId: { type: "string" },
      },
    },
    behavior: {
      type: "object",
      additionalProperties: false,
      properties: {
        sliderNavigation: { enum: ["none", "dots"] },
        ratingDisplay: { enum: ["stars", "hide-empty", "label-empty"] },
      },
    },
    pagination: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["none", "load-more"] },
        pageSize: {
          type: "integer",
          minimum: testimonialsPageSizeMin,
          maximum: testimonialsPageSizeMax,
        },
        loadMoreLabel: { type: "string" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        sectionBackground: { type: "string" },
        sectionGradient: { enum: ["none", "soft", "warm", "cool"] },
        backgroundTone: { enum: ["plain", "soft", "contrast"] },
        backgroundImage: { type: "string" },
        cardSurface: { type: "string" },
        cardBorder: { type: "string" },
        textColor: { type: "string" },
        accentColor: { type: "string" },
        spacing: { enum: ["none", "sm", "md", "lg"] },
        headerAlign: { enum: ["left", "center", "right"] },
        titleSize: { enum: ["sm", "md", "lg"] },
        cardRadius: { enum: ["none", "sm", "md", "lg", "xl"] },
        cardBorderWidth: { enum: ["none", "sm", "md"] },
      },
    },
  },
};

export const testimonialsDefaults: TestimonialsData = {
  header: {
    eyebrow: "Customer stories",
    title: "Trusted by teams that ship fast",
    description: "Use real customer voices to build trust and reduce hesitation.",
  },
  testimonials: [
    {
      id: "testimonial-1",
      quote: "We launched our marketing site in two days and kept full control over future edits.",
      author: "Anna Kowalska",
      role: "Product Marketing Lead",
      rating: 5,
      sourceLabel: "Acme Studio",
    },
    {
      id: "testimonial-2",
      quote: "The widget workflow made iteration faster without sacrificing consistency.",
      author: "Marek Nowak",
      role: "Growth Manager",
      rating: 5,
      sourceLabel: "North Labs",
    },
    {
      id: "testimonial-3",
      quote: "Editors can now publish conversion-focused sections without developer support.",
      author: "Ewa Zielinska",
      role: "Content Ops",
      rating: 4,
      sourceLabel: "BlueRiver",
    },
  ],
  cta: {
    enabled: false,
    label: "Read more stories",
    href: "/case-studies",
    target: "same-tab",
    style: "secondary",
  },
  layout: {
    spotlightItemId: "testimonial-1",
  },
  behavior: {
    sliderNavigation: "dots",
    ratingDisplay: "hide-empty",
  },
  pagination: {
    mode: "none",
    pageSize: 6,
    loadMoreLabel: "Load more testimonials",
  },
  style: {
    sectionGradient: "none",
    backgroundTone: "plain",
    spacing: "md",
    headerAlign: "center",
    titleSize: "md",
    cardRadius: "lg",
    cardBorderWidth: "sm",
  },
};

export const testimonialsEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "testimonials.wizard.starter-proof",
      title: "Section copy",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["variant", "testimonials.count"],
    },
    {
      mode: "visual",
      id: "testimonials.visual.variant-layout",
      title: "Variant and layout structure",
      role: "visual",
      writablePaths: [
        "variant",
        "testimonials.count",
        "style.spacing",
        "behavior.sliderNavigation",
        "behavior.ratingDisplay",
      ],
    },
    {
      mode: "visual",
      id: "testimonials.visual.header-copy",
      title: "Header copy",
      role: "content",
      writablePaths: ["header.eyebrow", "header.title", "header.description"],
    },
    {
      mode: "visual",
      id: "testimonials.visual.content-ratings",
      title: "Testimonials content and ratings",
      role: "content",
      writablePaths: [
        "testimonials",
        "testimonials.quote",
        "testimonials.quoteHtml",
        "testimonials.author",
        "testimonials.role",
        "testimonials.avatar",
        "testimonials.rating",
        "testimonials.sourceLabel",
      ],
    },
    {
      mode: "visual",
      id: "testimonials.visual.surface-typography",
      title: "Section surface and typography",
      role: "visual",
      writablePaths: [
        "style.sectionBackground",
        "style.sectionGradient",
        "style.backgroundTone",
        "style.backgroundImage",
        "style.headerAlign",
        "style.titleSize",
        "style.cardRadius",
        "style.cardBorderWidth",
      ],
    },
    {
      mode: "visual",
      id: "testimonials.visual.colors-emphasis",
      title: "Colors and emphasis",
      role: "visual",
      writablePaths: [
        "style.cardSurface",
        "style.cardBorder",
        "style.textColor",
        "style.accentColor",
      ],
    },
    {
      mode: "visual",
      id: "testimonials.visual.cta-conversion",
      title: "CTA and conversion follow-up",
      role: "visual",
      writablePaths: ["cta.enabled", "cta.label", "cta.href", "cta.target", "cta.style"],
    },
    {
      mode: "visual",
      id: "testimonials.visual.pagination-load-more",
      title: "Pagination and load more",
      role: "visual",
      writablePaths: [
        "layout.spotlightItemId",
        "pagination.mode",
        "pagination.pageSize",
        "pagination.loadMoreLabel",
      ],
    },
    {
      mode: "advanced",
      id: "testimonials.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "testimonials", "layout.spotlightItemId"],
    },
    {
      mode: "advanced",
      id: "testimonials.advanced.display-settings",
      title: "Display settings",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "style.spacing",
        "behavior.ratingDisplay",
        "behavior.sliderNavigation",
        "pagination.mode",
        "pagination.pageSize",
        "pagination.loadMoreLabel",
      ],
    },
    {
      mode: "advanced",
      id: "testimonials.advanced.content-health",
      title: "Content health",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["testimonials.avatar", "testimonials.rating", "cta.enabled"],
    },
  ],
};

const createTestimonialId = (index: number) => `testimonial-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveRating = (value: number | undefined, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return Math.min(5, Math.max(0, rounded));
};

const resolveTestimonialsSpacing = (value: string | undefined): TestimonialsSpacing => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveTestimonialsHeaderAlign = (value: string | undefined): TestimonialsHeaderAlign => {
  if (value === "left" || value === "right") return value;
  return "center";
};

const resolveTestimonialsTitleSize = (value: string | undefined): TestimonialsTitleSize => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveTestimonialsCardRadius = (value: string | undefined): TestimonialsCardRadius => {
  if (value === "none" || value === "sm" || value === "md" || value === "xl") return value;
  return "lg";
};

const resolveTestimonialsCardBorderWidth = (
  value: string | undefined
): TestimonialsCardBorderWidth => {
  if (value === "none" || value === "md") return value;
  return "sm";
};

const resolveTestimonialsSectionGradient = (
  value: string | undefined
): TestimonialsSectionGradient => {
  if (value === "soft" || value === "warm" || value === "cool") return value;
  return "none";
};

const resolveTestimonialsBackgroundTone = (
  value: string | undefined
): TestimonialsBackgroundTone => {
  if (value === "soft" || value === "contrast") return value;
  return "plain";
};

const resolveTestimonialsSliderNavigation = (
  value: string | undefined
): TestimonialsSliderNavigation => (value === "none" ? "none" : "dots");

const resolveTestimonialsRatingDisplay = (value: string | undefined): TestimonialsRatingDisplay => {
  if (value === "stars" || value === "label-empty") return value;
  return "hide-empty";
};

const resolveTestimonialsCtaTarget = (value: string | undefined): TestimonialsCtaTarget =>
  value === "new-tab" ? "new-tab" : "same-tab";

const resolveTestimonialsCtaStyle = (value: string | undefined): TestimonialsCtaStyle => {
  if (value === "secondary" || value === "link") return value;
  return "primary";
};

const resolveTestimonialsPaginationMode = (
  value: string | undefined
): TestimonialsPaginationMode => (value === "load-more" ? "load-more" : "none");

const resolveTestimonialsPageSize = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return testimonialsDefaults.pagination?.pageSize ?? 6;
  }
  return Math.min(testimonialsPageSizeMax, Math.max(testimonialsPageSizeMin, Math.floor(value)));
};

export const resolveTestimonialsVariant = (variant: string): TestimonialsVariantId => {
  if (variant === "spotlight" || variant === "slider-static") return variant;
  return "grid";
};

export const resolveTestimonialsCountForVariant = (variant: TestimonialsVariantId): number =>
  testimonialsVariantCountMap[variant];

export const normalizeTestimonialsCount = (value: number) => {
  if (!Number.isFinite(value)) return resolveTestimonialsCountForVariant("grid");
  return Math.min(testimonialsItemMax, Math.max(testimonialsItemMin, Math.floor(value)));
};

export const normalizeTestimonialsMediaUrl = (value: unknown) => {
  const href = normalizeWidgetSafeHref(value, { allowRelative: true, allowHttp: true });
  if (!href || href.startsWith("#")) return undefined;
  return href;
};

export const isValidTestimonialsMediaUrl = (value: string | undefined) =>
  !value?.trim() || normalizeTestimonialsMediaUrl(value) !== undefined;

export const normalizeTestimonialsAvatarUrl = (value: unknown) =>
  normalizeTestimonialsMediaUrl(value);

export const isValidTestimonialsAvatarUrl = (value: string | undefined) =>
  isValidTestimonialsMediaUrl(value);

export const normalizeTestimonialsBackgroundImageUrl = (value: unknown) =>
  normalizeTestimonialsMediaUrl(value);

export const isValidTestimonialsBackgroundImageUrl = (value: string | undefined) =>
  isValidTestimonialsMediaUrl(value);

export const normalizeTestimonialsCtaHref = (value: unknown) =>
  normalizeWidgetSafeHref(value, { allowRelative: true, allowHash: true, allowHttp: true });

export const isValidTestimonialsCtaHref = (value: string | undefined) =>
  !value?.trim() || normalizeTestimonialsCtaHref(value) !== undefined;

function sanitizeTestimonialsQuoteAttrs(tagName: string, rawAttrs: string) {
  if (tagName !== "a") return "";

  const attributes = parseHtmlAttributes(rawAttrs);
  const href =
    normalizeWidgetSafeHref(attributes.get("href"), {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    }) ?? "#";
  const title = attributes.get("title");
  const target = attributes.get("target") === "_blank" ? "_blank" : undefined;

  let attrs = ` href="${escapeHtml(href)}"`;
  if (typeof title === "string" && title.trim().length > 0) {
    attrs += ` title="${escapeHtml(title.trim())}"`;
  }
  if (target === "_blank") {
    attrs += ' target="_blank" rel="noopener noreferrer"';
  }
  return attrs;
}

export function sanitizeTestimonialsQuoteHtml(value: string | undefined): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const sanitized = sanitizeHtmlWithPolicy(value, {
    allowedTags: testimonialsQuoteAllowedTags,
    selfClosingTags: testimonialsQuoteSelfClosingTags,
    dropContentTags: dangerousHtmlContentTagSet,
    sanitizeAttributes: sanitizeTestimonialsQuoteAttrs,
  });
  if (!sanitized) return undefined;
  return htmlToPlainText(sanitized, testimonialsQuoteBlockTags) ? sanitized : undefined;
}

export function getTestimonialsPlainQuote(item: TestimonialItem | undefined): string {
  const sanitizedHtml = sanitizeTestimonialsQuoteHtml(item?.quoteHtml);
  if (sanitizedHtml) {
    const plain = htmlToPlainText(sanitizedHtml, testimonialsQuoteBlockTags);
    if (plain) return plain;
  }

  const quote = item?.quote?.trim();
  return quote ?? "";
}

function resolveQuoteText(base: TestimonialItem, fallback: string) {
  const quoted = typeof base.quote === "string" ? base.quote.trim() : "";
  if (quoted.length > 0) return quoted;

  const richQuote = sanitizeTestimonialsQuoteHtml(base.quoteHtml);
  if (richQuote) {
    const derived = htmlToPlainText(richQuote, testimonialsQuoteBlockTags);
    if (derived) return derived;
  }

  return fallback;
}

export function normalizeTestimonialsItems(
  items: TestimonialItem[] | undefined,
  desiredCount?: number
): TestimonialItem[] {
  const source = Array.isArray(items) ? items : [];
  const fallbackQuotes = [
    "We launched our marketing site in two days and kept full control over future edits.",
    "The widget workflow made iteration faster without sacrificing consistency.",
    "Editors can now publish conversion-focused sections without developer support.",
    "Templates gave us a clean and predictable process for every campaign.",
  ];
  const fallbackAuthors = ["Customer One", "Customer Two", "Customer Three", "Customer Four"];

  const targetCount =
    typeof desiredCount === "number"
      ? normalizeTestimonialsCount(desiredCount)
      : normalizeTestimonialsCount(
          source.length > 0 ? source.length : resolveTestimonialsCountForVariant("grid")
        );

  const normalized: TestimonialItem[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};

    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createTestimonialId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`testimonial-${candidate}`)) {
        candidate += 1;
      }
      id = `testimonial-${candidate}`;
    }
    usedIds.add(id);

    normalized.push({
      id,
      quote: resolveQuoteText(base, fallbackQuotes[index] ?? `Customer quote ${index + 1}`),
      quoteHtml: sanitizeTestimonialsQuoteHtml(base.quoteHtml),
      author:
        typeof base.author === "string" && base.author.trim().length > 0
          ? base.author.trim()
          : (fallbackAuthors[index] ?? `Customer ${index + 1}`),
      role: resolveOptionalString(base.role),
      avatar: resolveOptionalString(base.avatar),
      rating: resolveRating(base.rating, 5),
      sourceLabel: resolveOptionalString(base.sourceLabel),
    });
  }

  return normalized;
}

function resolveSpotlightItemId(
  rawSpotlightItemId: string | undefined,
  items: TestimonialItem[]
): string | undefined {
  if (rawSpotlightItemId && items.some((item) => item.id === rawSpotlightItemId)) {
    return rawSpotlightItemId;
  }
  return items[0]?.id;
}

export function normalizeTestimonialsData(data: TestimonialsData): TestimonialsData {
  const headerDefaults = testimonialsDefaults.header ?? {
    eyebrow: "",
    title: "",
    description: "",
  };
  const ctaDefaults = testimonialsDefaults.cta ?? {
    enabled: false,
    label: "",
    href: "",
    target: "same-tab",
    style: "primary",
  };
  const behaviorDefaults = testimonialsDefaults.behavior ?? {
    sliderNavigation: "dots",
    ratingDisplay: "hide-empty",
  };
  const paginationDefaults = testimonialsDefaults.pagination ?? {
    mode: "none",
    pageSize: 6,
    loadMoreLabel: "Load more testimonials",
  };
  const styleDefaults = testimonialsDefaults.style ?? {
    sectionGradient: "none",
    backgroundTone: "plain",
    spacing: "md",
    headerAlign: "center",
    titleSize: "md",
    cardRadius: "lg",
    cardBorderWidth: "sm",
  };
  const hasStyleObject = data.style !== undefined;
  const testimonials = normalizeTestimonialsItems(data.testimonials);

  return {
    ...data,
    header: {
      eyebrow: resolveString(data.header?.eyebrow, headerDefaults.eyebrow ?? ""),
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
    },
    testimonials,
    cta: {
      enabled:
        typeof data.cta?.enabled === "boolean" ? data.cta.enabled : Boolean(ctaDefaults.enabled),
      label: resolveString(data.cta?.label, ctaDefaults.label ?? ""),
      href: resolveString(data.cta?.href, ctaDefaults.href ?? ""),
      target: resolveTestimonialsCtaTarget(data.cta?.target ?? ctaDefaults.target),
      style: resolveTestimonialsCtaStyle(data.cta?.style ?? ctaDefaults.style),
    },
    layout: {
      spotlightItemId: resolveSpotlightItemId(data.layout?.spotlightItemId, testimonials),
    },
    behavior: {
      sliderNavigation: resolveTestimonialsSliderNavigation(
        data.behavior?.sliderNavigation ?? behaviorDefaults.sliderNavigation
      ),
      ratingDisplay: resolveTestimonialsRatingDisplay(
        data.behavior?.ratingDisplay ?? behaviorDefaults.ratingDisplay
      ),
    },
    pagination: {
      mode: resolveTestimonialsPaginationMode(data.pagination?.mode ?? paginationDefaults.mode),
      pageSize: resolveTestimonialsPageSize(
        data.pagination?.pageSize ?? paginationDefaults.pageSize
      ),
      loadMoreLabel: resolveString(
        data.pagination?.loadMoreLabel,
        paginationDefaults.loadMoreLabel ?? "Load more testimonials"
      ),
    },
    style: {
      sectionBackground: hasStyleObject
        ? resolveClearableStyleValue(data.style?.sectionBackground)
        : styleDefaults.sectionBackground,
      sectionGradient: resolveTestimonialsSectionGradient(
        data.style?.sectionGradient ?? styleDefaults.sectionGradient
      ),
      backgroundTone: resolveTestimonialsBackgroundTone(
        data.style?.backgroundTone ?? styleDefaults.backgroundTone
      ),
      backgroundImage: resolveOptionalString(data.style?.backgroundImage),
      cardSurface: hasStyleObject
        ? resolveClearableStyleValue(data.style?.cardSurface)
        : styleDefaults.cardSurface,
      cardBorder: hasStyleObject
        ? resolveClearableStyleValue(data.style?.cardBorder)
        : styleDefaults.cardBorder,
      textColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.textColor)
        : styleDefaults.textColor,
      accentColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.accentColor)
        : styleDefaults.accentColor,
      spacing: resolveTestimonialsSpacing(data.style?.spacing ?? styleDefaults.spacing),
      headerAlign: resolveTestimonialsHeaderAlign(
        data.style?.headerAlign ?? styleDefaults.headerAlign
      ),
      titleSize: resolveTestimonialsTitleSize(data.style?.titleSize ?? styleDefaults.titleSize),
      cardRadius: resolveTestimonialsCardRadius(data.style?.cardRadius ?? styleDefaults.cardRadius),
      cardBorderWidth: resolveTestimonialsCardBorderWidth(
        data.style?.cardBorderWidth ?? styleDefaults.cardBorderWidth
      ),
    },
  };
}

function resolveTestimonialsAnchorId(instanceId: string, item: TestimonialItem, index: number) {
  return scopedId(instanceId, item.id?.trim() || `testimonial-${index + 1}`);
}

function resolveOrderedTestimonials(
  variant: TestimonialsVariantId,
  items: TestimonialItem[],
  spotlightItemId: string | undefined
) {
  if (variant !== "spotlight" || !spotlightItemId) return items;
  const spotlightIndex = items.findIndex((item) => item.id === spotlightItemId);
  if (spotlightIndex <= 0) return items;
  const spotlightItem = items[spotlightIndex];
  if (!spotlightItem) return items;
  return [spotlightItem, ...items.filter((item) => item.id !== spotlightItem.id)];
}

function resolveVisibleTestimonials(
  items: TestimonialItem[],
  pagination: NonNullable<TestimonialsData["pagination"]>
) {
  if (pagination.mode !== "load-more") {
    return {
      initial: items,
      overflow: [] as TestimonialItem[],
    };
  }

  const pageSize = resolveTestimonialsPageSize(pagination.pageSize);
  return {
    initial: items.slice(0, pageSize),
    overflow: items.slice(pageSize),
  };
}

function RatingStars({ rating, accentColor }: { rating: number; accentColor: string }) {
  const clampedRating = resolveRating(rating, 0);

  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${clampedRating} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < clampedRating;
        return (
          <span
            key={`star-${index + 1}`}
            className="text-sm leading-none"
            style={{
              color: active
                ? accentColor
                : "color-mix(in oklab, var(--color-text) 25%, transparent)",
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

function TestimonialRating({
  rating,
  display,
  accentColor,
}: {
  rating: number;
  display: TestimonialsRatingDisplay;
  accentColor: string;
}) {
  const clampedRating = resolveRating(rating, 0);
  if (clampedRating > 0 || display === "stars") {
    return <RatingStars rating={clampedRating} accentColor={accentColor} />;
  }
  if (display === "label-empty") {
    return (
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-text)]/60">
        No rating
      </p>
    );
  }
  return null;
}

function Avatar({
  author,
  src,
  accentColor,
  role,
  sourceLabel,
}: {
  author: string;
  src?: string;
  accentColor: string;
  role?: string;
  sourceLabel?: string;
}) {
  const safeSrc = normalizeTestimonialsAvatarUrl(src);

  if (safeSrc) {
    return (
      <img
        src={safeSrc}
        alt={resolveTestimonialsAvatarAlt(author, role, sourceLabel)}
        loading="lazy"
        className="h-10 w-10 rounded-full border border-[var(--color-border)] object-cover"
      />
    );
  }

  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] text-sm font-semibold"
      style={{ color: accentColor }}
      aria-hidden="true"
    >
      {author.charAt(0).toUpperCase()}
    </span>
  );
}

function resolveTestimonialsAvatarAlt(author: string, role?: string, sourceLabel?: string) {
  const identityParts = [author.trim(), (role ?? "").trim(), (sourceLabel ?? "").trim()].filter(
    (part) => part.length > 0
  );
  return `Photo of ${identityParts.join(", ") || author}`;
}

function TestimonialQuote({ item, highlight }: { item: TestimonialItem; highlight: boolean }) {
  const quoteHtml = sanitizeTestimonialsQuoteHtml(item.quoteHtml);
  const plainQuote = getTestimonialsPlainQuote(item);
  const className = joinClasses("leading-relaxed", highlight ? "text-base" : "text-sm");

  if (quoteHtml) {
    return (
      <div
        className={className}
        data-testimonial-quote-mode="html"
        dangerouslySetInnerHTML={{ __html: quoteHtml }}
      />
    );
  }

  return (
    <p className={className} data-testimonial-quote-mode="plain">
      &quot;{plainQuote}&quot;
    </p>
  );
}

function TestimonialsList({
  items,
  variant,
  spotlightItemId,
  instanceId,
  style,
  ratingDisplay,
}: {
  items: TestimonialItem[];
  variant: TestimonialsVariantId;
  spotlightItemId: string | undefined;
  instanceId: string;
  style: NonNullable<TestimonialsData["style"]>;
  ratingDisplay: TestimonialsRatingDisplay;
}) {
  const resolvedSpacing = resolveTestimonialsSpacing(style.spacing);
  const resolvedCardRadius = resolveTestimonialsCardRadius(style.cardRadius);
  const resolvedCardBorderWidth = resolveTestimonialsCardBorderWidth(style.cardBorderWidth);
  const cardStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.cardSurface),
      borderColor: resolveClearableStyleValue(style.cardBorder),
      color: style.textColor ?? "var(--color-text)",
    }) ?? {};

  const listClassName =
    variant === "slider-static"
      ? joinClasses(
          "flex overflow-x-auto snap-x snap-mandatory pb-2",
          spacingClassMap[resolvedSpacing]
        )
      : variant === "spotlight"
        ? joinClasses("grid grid-cols-1 lg:grid-cols-2", spacingClassMap[resolvedSpacing])
        : joinClasses(
            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            spacingClassMap[resolvedSpacing]
          );

  return (
    <>
      {variant === "slider-static" ? (
        <p
          id={scopedId(instanceId, "scroll-hint")}
          className="mb-2 text-xs text-[var(--color-text)]/60"
          data-overflow-affordance="horizontal-scroll"
        >
          Scroll horizontally to view more testimonials.
        </p>
      ) : null}
      <div
        className={listClassName}
        data-testimonials-list={variant}
        data-overflow-intentional={variant === "slider-static" ? "true" : undefined}
        aria-describedby={
          variant === "slider-static" ? scopedId(instanceId, "scroll-hint") : undefined
        }
        tabIndex={variant === "slider-static" ? 0 : undefined}
      >
        {items.map((item, index) => {
          const highlight = variant === "spotlight" && item.id === spotlightItemId;
          const author = item.author ?? `Customer ${index + 1}`;
          const rating = resolveRating(item.rating, 0);
          const roleText = (item.role ?? "").trim();
          const sourceText = (item.sourceLabel ?? "").trim();

          return (
            <article
              id={resolveTestimonialsAnchorId(instanceId, item, index)}
              aria-label={`Testimonial ${index + 1}: ${author}`}
              key={item.id ?? `testimonial-${index + 1}`}
              className={joinClasses(
                "flex h-full flex-col gap-4 p-5",
                cardRadiusClassMap[resolvedCardRadius],
                cardBorderWidthClassMap[resolvedCardBorderWidth],
                variant === "slider-static" ? "min-w-[18rem] shrink-0 snap-start" : undefined,
                highlight ? "lg:col-span-2" : undefined
              )}
              style={cardStyle}
              data-testimonial-item={String(index + 1)}
              data-testimonial-rating={String(rating)}
              data-testimonial-highlighted={String(highlight)}
            >
              <TestimonialRating
                rating={rating}
                display={ratingDisplay}
                accentColor={style.accentColor ?? "var(--color-primary)"}
              />

              <TestimonialQuote item={item} highlight={highlight} />

              <div className="mt-auto flex items-center gap-3">
                <Avatar
                  author={author}
                  src={item.avatar}
                  accentColor={style.accentColor ?? "var(--color-primary)"}
                  role={roleText || undefined}
                  sourceLabel={sourceText || undefined}
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">{author}</p>
                  {roleText.length > 0 ? (
                    <p className="text-xs text-[var(--color-text)]/70">{roleText}</p>
                  ) : null}
                  {sourceText.length > 0 ? (
                    <p
                      className="text-xs font-medium"
                      style={{ color: style.accentColor ?? "var(--color-primary)" }}
                    >
                      {sourceText}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function TestimonialsCta({
  cta,
  accentColor,
}: {
  cta: NonNullable<TestimonialsData["cta"]>;
  accentColor: string;
}) {
  const label = cta.label?.trim() ?? "";
  const linkAttrs = resolveWidgetLinkAttrs(cta.href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openInNewTab: cta.target === "new-tab",
  });

  if (!cta.enabled || !label || !linkAttrs) return null;

  return (
    <div className="mt-8 flex justify-center">
      <a
        {...linkAttrs}
        className={joinClasses(
          "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          ctaStyleClassMap[cta.style ?? "primary"]
        )}
        style={cta.style === "link" ? { color: accentColor } : undefined}
        data-testimonials-cta="true"
        data-testimonials-cta-style={cta.style ?? "primary"}
      >
        {label}
      </a>
    </div>
  );
}

export function TestimonialsBlock({
  data,
  variant,
  blockId,
}: {
  data: TestimonialsData;
  variant: string;
  blockId?: string;
}) {
  const headingId = useId();
  const fallbackInstanceSeed = useId();
  const resolvedVariant = resolveTestimonialsVariant(variant);
  const normalizedData = normalizeTestimonialsData(data);
  const style = normalizedData.style ?? testimonialsDefaults.style!;
  const orderedItems = resolveOrderedTestimonials(
    resolvedVariant,
    normalizedData.testimonials,
    normalizedData.layout?.spotlightItemId
  );
  const visibleItems = resolveVisibleTestimonials(orderedItems, normalizedData.pagination!);
  const navigationItems = visibleItems.initial;
  const showHeader =
    (normalizedData.header?.eyebrow ?? "").trim().length > 0 ||
    (normalizedData.header?.title ?? "").trim().length > 0 ||
    (normalizedData.header?.description ?? "").trim().length > 0;
  const instanceId = createWidgetInstanceId(
    "testimonials",
    blockId,
    `${resolvedVariant}-${fallbackInstanceSeed}`
  );
  const backgroundImageHref = normalizeTestimonialsBackgroundImageUrl(style.backgroundImage);
  const gradientImage = sectionGradientImageMap[style.sectionGradient ?? "none"];
  const backgroundLayers = [
    gradientImage,
    backgroundImageHref ? `url("${backgroundImageHref}")` : undefined,
  ].filter(Boolean) as string[];
  const sectionSurfaceStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.sectionBackground),
      backgroundImage: backgroundLayers.length > 0 ? backgroundLayers.join(", ") : undefined,
      backgroundRepeat: backgroundImageHref
        ? backgroundLayers.length > 1
          ? "no-repeat, no-repeat"
          : "no-repeat"
        : undefined,
      backgroundPosition: backgroundImageHref
        ? backgroundLayers.length > 1
          ? "center, center"
          : "center"
        : undefined,
      backgroundSize: backgroundImageHref
        ? backgroundLayers.length > 1
          ? "auto, cover"
          : "cover"
        : undefined,
      color: style.textColor ?? "var(--color-text)",
    }) ?? {};
  const navigationEnabled =
    resolvedVariant === "slider-static" &&
    normalizedData.behavior?.sliderNavigation === "dots" &&
    navigationItems.length > 1;

  return (
    <section
      aria-label={(normalizedData.header?.title ?? "").trim() || "Testimonials"}
      aria-labelledby={(normalizedData.header?.title ?? "").trim() ? headingId : undefined}
      className="mx-auto w-full max-w-6xl px-4 py-8"
      data-testimonials-variant={resolvedVariant}
      data-testimonials-spacing={style.spacing ?? "md"}
      data-testimonials-count={String(orderedItems.length)}
      data-testimonials-header-align={style.headerAlign ?? "center"}
      data-testimonials-title-size={style.titleSize ?? "md"}
      data-testimonials-card-radius={style.cardRadius ?? "lg"}
      data-testimonials-card-border-width={style.cardBorderWidth ?? "sm"}
      data-testimonials-slider-navigation={navigationEnabled ? "dots" : "none"}
      data-testimonials-rating-display={normalizedData.behavior?.ratingDisplay ?? "hide-empty"}
      data-testimonials-pagination={normalizedData.pagination?.mode ?? "none"}
      data-testimonials-background-tone={style.backgroundTone ?? "plain"}
      data-testimonials-background-gradient={style.sectionGradient ?? "none"}
      data-testimonials-has-background-image={String(Boolean(backgroundImageHref))}
    >
      <div
        className={joinClasses(
          "rounded-[2rem] p-6 sm:p-8",
          sectionToneClassMap[style.backgroundTone ?? "plain"]
        )}
        style={sectionSurfaceStyle}
      >
        {showHeader ? (
          <header
            className={joinClasses(
              "mx-auto mb-6 flex max-w-3xl flex-col gap-2",
              headerAlignClassMap[style.headerAlign ?? "center"]
            )}
          >
            {(normalizedData.header?.eyebrow ?? "").trim().length > 0 ? (
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-current/60">
                {normalizedData.header?.eyebrow}
              </p>
            ) : null}
            {(normalizedData.header?.title ?? "").trim().length > 0 ? (
              <h2
                id={headingId}
                className={joinClasses(
                  "font-semibold text-current",
                  titleSizeClassMap[style.titleSize ?? "md"]
                )}
              >
                {normalizedData.header?.title}
              </h2>
            ) : null}
            {(normalizedData.header?.description ?? "").trim().length > 0 ? (
              <p className="text-sm text-current/75">{normalizedData.header?.description}</p>
            ) : null}
          </header>
        ) : null}

        <TestimonialsList
          items={visibleItems.initial}
          variant={resolvedVariant}
          spotlightItemId={normalizedData.layout?.spotlightItemId}
          instanceId={instanceId}
          style={style}
          ratingDisplay={normalizedData.behavior?.ratingDisplay ?? "hide-empty"}
        />

        {visibleItems.overflow.length > 0 ? (
          <details className="mt-5 space-y-4" data-testimonials-load-more="true">
            <summary className="cursor-pointer text-sm font-medium text-current/80">
              {normalizedData.pagination?.loadMoreLabel ?? "Load more testimonials"}
            </summary>
            <div className="pt-4">
              <TestimonialsList
                items={visibleItems.overflow}
                variant={resolvedVariant}
                spotlightItemId={normalizedData.layout?.spotlightItemId}
                instanceId={instanceId}
                style={style}
                ratingDisplay={normalizedData.behavior?.ratingDisplay ?? "hide-empty"}
              />
            </div>
          </details>
        ) : null}

        {navigationEnabled ? (
          <nav className="mt-5 flex justify-center gap-2" aria-label="Testimonials navigation">
            {navigationItems.map((item, index) => (
              <a
                key={item.id ?? `testimonial-nav-${index + 1}`}
                href={`#${resolveTestimonialsAnchorId(instanceId, item, index)}`}
                className="h-2.5 w-2.5 rounded-full bg-[var(--color-text)]/25 transition hover:bg-[var(--color-text)]/50"
                data-testimonials-nav-dot={String(index + 1)}
              >
                <span className="sr-only">Jump to testimonial {index + 1}</span>
              </a>
            ))}
          </nav>
        ) : null}

        <TestimonialsCta
          cta={normalizedData.cta ?? testimonialsDefaults.cta!}
          accentColor={style.accentColor ?? "var(--color-primary)"}
        />
      </div>
    </section>
  );
}

export function createTestimonialsWidget(
  editors: WidgetEditorBundle<TestimonialsData>
): WidgetDefinition<TestimonialsData> {
  return {
    type: "testimonials",
    title: "Testimonials",
    description: "Social proof quotes with ratings, author identity, and conversion CTA.",
    category: "content",
    variants: [
      {
        id: "grid",
        label: "Grid",
        description: "Balanced testimonial card grid.",
      },
      {
        id: "spotlight",
        label: "Spotlight",
        description: "Highlights one primary testimonial and supporting quotes.",
      },
      {
        id: "slider-static",
        label: "Slider Static",
        description: "Horizontal card strip prepared for slider-like layout.",
      },
    ],
    schema: testimonialsSchema,
    defaults: testimonialsDefaults,
    editor: editors,
    editorContract: testimonialsEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: TestimonialsBlock,
  };
}
