import type { ComponentType, CSSProperties } from "react";
import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
  parseCssColorValue,
} from "../../services/theme/cssColorContract";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorBundle,
  WidgetRenderContext,
} from "../types";
import { renderSharedWidgetRuntimeScript } from "../runtimeScripts";
import { compactStyle, resolveClearableCssColorValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";
import { sanitizeRichTextHtml } from "./richTextSection";

export type HeroCta = {
  label: string;
  href: string;
};

export type HeroMediaSource = "library" | "external";
export type HeroFontFamily = "inherit" | "sans" | "serif" | "mono";
export type HeroTextWeight = "normal" | "medium" | "semibold" | "bold";
export type HeroShadowToken = "none" | "soft" | "medium" | "strong";
export type HeroMotionPreset = "none" | "fade-in" | "slide-up";
export type HeroTilt = "none" | "subtle" | "strong";
export const heroTilts = ["none", "subtle", "strong"] as const;
const HERO_TILT_MAX_DEG: Record<HeroTilt, number> = { none: 0, subtle: 5, strong: 8 };
export type HeroLayoutHeight = "auto" | "large" | "screen";
export type HeroLayoutBleed = "contained" | "full-bleed";

export type HeroMedia = {
  type: "none" | "image" | "video";
  source?: HeroMediaSource;
  assetId?: string;
  src?: string;
  alt?: string;
  posterSource?: HeroMediaSource;
  posterAssetId?: string;
  posterSrc?: string;
  title?: string;
  description?: string;
  ratio?: string;
  overlay?: string;
};

export type HeroBadgeTone = "neutral" | "primary" | "success" | "warning";
export type HeroBadgePlacement = "above-headline" | "inline-headline";

export type HeroBadge = {
  enabled?: boolean;
  label: string;
  href?: string;
  prefix?: string;
  tone?: HeroBadgeTone;
  placement?: HeroBadgePlacement;
};

export type HeroSocialProofAvatar = {
  source?: HeroMediaSource;
  assetId?: string;
  src: string;
  alt?: string;
};

export type HeroSocialProof = {
  enabled?: boolean;
  rating?: string;
  reviewCount?: string;
  label?: string;
  avatars?: HeroSocialProofAvatar[];
};

export type HeroBackgroundMedia = {
  type?: "none" | "image" | "video";
  source?: HeroMediaSource;
  assetId?: string;
  src?: string;
  posterSource?: HeroMediaSource;
  posterAssetId?: string;
  posterSrc?: string;
  title?: string;
  description?: string;
  overlay?: string;
};

export type HeroData = {
  headline: string;
  subhead?: string;
  body?: string;
  richHeadline?: string;
  richBody?: string;
  badge?: HeroBadge;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  media?: HeroMedia;
  socialProof?: HeroSocialProof;
  layout?: {
    align?: "left" | "center" | "right";
    maxWidth?: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
    contentWidth?: "none" | "sm" | "md" | "lg" | "xl";
    height?: HeroLayoutHeight;
    bleed?: HeroLayoutBleed;
  };
  spacing?: {
    paddingTop?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    paddingBottom?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  };
  style?: {
    paddingTop?: string;
    paddingBottom?: string;
    textColor?: string;
    subheadColor?: string;
    bodyColor?: string;
    headlineSize?: "none" | "2xl" | "3xl" | "4xl" | "5xl";
    subheadSize?: "none" | "base" | "lg" | "xl" | "2xl";
    bodySize?: "none" | "sm" | "base" | "lg" | "xl";
    borderColor?: string;
    borderWidth?: "0" | "1" | "2" | "3";
    borderRadius?: "none" | "lg" | "xl" | "2xl" | "3xl";
    mediaBorderColor?: string;
    mediaBorderWidth?: "0" | "1" | "2" | "3";
    mediaRadius?: "none" | "lg" | "xl" | "2xl" | "3xl";
    primaryButtonBg?: string;
    primaryButtonText?: string;
    primaryButtonBorder?: string;
    primaryButtonSize?: "none" | "sm" | "md" | "lg";
    secondaryButtonBg?: string;
    secondaryButtonText?: string;
    secondaryButtonBorder?: string;
    secondaryButtonSize?: "none" | "sm" | "md" | "lg";
    cardShadow?: HeroShadowToken;
    mediaShadow?: HeroShadowToken;
    buttonShadow?: HeroShadowToken;
    fontFamily?: HeroFontFamily;
    headlineWeight?: HeroTextWeight;
    bodyWeight?: HeroTextWeight;
    motion?: HeroMotionPreset;
    tilt?: HeroTilt;
  };
  background?: {
    color?: string;
    gradient?: string;
    image?: string;
    media?: HeroBackgroundMedia;
  };
  responsive?: {
    hideMediaOnMobile?: boolean;
  };
};

const heroColorValueSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS["inherited-render"],
    },
  ],
} as const;
const heroNestedColorValueSchema = {
  ...heroColorValueSchema,
  not: {
    type: "string",
    pattern: "^[ ]*[iI][nN][hH][eE][rR][iI][tT][ ]*$",
  },
} as const;

export const HERO_BACKGROUND_GRADIENT_MAX_LENGTH = CSS_COLOR_VALUE_MAX_LENGTH * 2 + 64;
export const HERO_BACKGROUND_GRADIENT_SCHEMA_PATTERN =
  "^(?![\\u0000-\\uffff]*[^\\u0020-\\u007e])[ ]*[lL][iI][nN][eE][aA][rR]-[gG][rR][aA][dD][iI][eE][nN][tT]\\([ -~]+\\)[ ]*$";
const heroBackgroundGradientSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: HERO_BACKGROUND_GRADIENT_MAX_LENGTH,
      pattern: HERO_BACKGROUND_GRADIENT_SCHEMA_PATTERN,
    },
  ],
} as const;

export const heroSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline"],
  properties: {
    headline: { type: "string" },
    subhead: { type: "string" },
    body: { type: "string" },
    richHeadline: { type: "string" },
    richBody: { type: "string" },
    badge: {
      type: "object",
      additionalProperties: false,
      required: ["label"],
      properties: {
        enabled: { type: "boolean" },
        label: { type: "string" },
        href: { type: "string" },
        prefix: { type: "string" },
        tone: { enum: ["neutral", "primary", "success", "warning"] },
        placement: { enum: ["above-headline", "inline-headline"] },
      },
    },
    primaryCta: {
      type: "object",
      additionalProperties: false,
      required: ["label", "href"],
      properties: {
        label: { type: "string" },
        href: { type: "string" },
      },
    },
    secondaryCta: {
      type: "object",
      additionalProperties: false,
      required: ["label", "href"],
      properties: {
        label: { type: "string" },
        href: { type: "string" },
      },
    },
    media: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { enum: ["none", "image", "video"] },
        src: { type: "string" },
        source: { enum: ["library", "external"] },
        assetId: { type: "string" },
        alt: { type: "string" },
        posterSource: { enum: ["library", "external"] },
        posterAssetId: { type: "string" },
        posterSrc: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        ratio: { type: "string" },
        overlay: heroNestedColorValueSchema,
      },
    },
    socialProof: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        rating: { type: "string" },
        reviewCount: { type: "string" },
        label: { type: "string" },
        avatars: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["src"],
            properties: {
              source: { enum: ["library", "external"] },
              assetId: { type: "string" },
              src: { type: "string" },
              alt: { type: "string" },
            },
          },
        },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        align: { enum: ["left", "center", "right"] },
        maxWidth: { enum: ["none", "sm", "md", "lg", "xl", "2xl"] },
        contentWidth: { enum: ["none", "sm", "md", "lg", "xl"] },
        height: { enum: ["auto", "large", "screen"] },
        bleed: { enum: ["contained", "full-bleed"] },
      },
    },
    spacing: {
      type: "object",
      additionalProperties: false,
      properties: {
        paddingTop: {
          enum: ["none", "xs", "sm", "md", "lg", "xl", "2xl"],
        },
        paddingBottom: {
          enum: ["none", "xs", "sm", "md", "lg", "xl", "2xl"],
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        paddingTop: { type: "string" },
        paddingBottom: { type: "string" },
        textColor: heroColorValueSchema,
        subheadColor: heroColorValueSchema,
        bodyColor: heroColorValueSchema,
        headlineSize: { enum: ["none", "2xl", "3xl", "4xl", "5xl"] },
        subheadSize: { enum: ["none", "base", "lg", "xl", "2xl"] },
        bodySize: { enum: ["none", "sm", "base", "lg", "xl"] },
        borderColor: heroColorValueSchema,
        borderWidth: { enum: ["0", "1", "2", "3"] },
        borderRadius: { enum: ["none", "lg", "xl", "2xl", "3xl"] },
        mediaBorderColor: heroColorValueSchema,
        mediaBorderWidth: { enum: ["0", "1", "2", "3"] },
        mediaRadius: { enum: ["none", "lg", "xl", "2xl", "3xl"] },
        primaryButtonBg: heroColorValueSchema,
        primaryButtonText: heroColorValueSchema,
        primaryButtonBorder: heroColorValueSchema,
        primaryButtonSize: { enum: ["none", "sm", "md", "lg"] },
        secondaryButtonBg: heroColorValueSchema,
        secondaryButtonText: heroColorValueSchema,
        secondaryButtonBorder: heroColorValueSchema,
        secondaryButtonSize: { enum: ["none", "sm", "md", "lg"] },
        cardShadow: { enum: ["none", "soft", "medium", "strong"] },
        mediaShadow: { enum: ["none", "soft", "medium", "strong"] },
        buttonShadow: { enum: ["none", "soft", "medium", "strong"] },
        fontFamily: { enum: ["inherit", "sans", "serif", "mono"] },
        headlineWeight: { enum: ["normal", "medium", "semibold", "bold"] },
        bodyWeight: { enum: ["normal", "medium", "semibold", "bold"] },
        motion: { enum: ["none", "fade-in", "slide-up"] },
        tilt: { enum: ["none", "subtle", "strong"] },
      },
    },
    background: {
      type: "object",
      additionalProperties: false,
      properties: {
        color: heroColorValueSchema,
        gradient: heroBackgroundGradientSchema,
        image: { type: "string" },
        media: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { enum: ["none", "image", "video"] },
            source: { enum: ["library", "external"] },
            assetId: { type: "string" },
            src: { type: "string" },
            posterSource: { enum: ["library", "external"] },
            posterAssetId: { type: "string" },
            posterSrc: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            overlay: heroNestedColorValueSchema,
          },
        },
      },
    },
    responsive: {
      type: "object",
      additionalProperties: false,
      properties: {
        hideMediaOnMobile: { type: "boolean" },
      },
    },
  },
};

export const heroDefaults: HeroData = {
  headline: "Build your system with Coderso",
  subhead: "Launch modern sites without rebuilding the app.",
  body: "",
  badge: { enabled: false, label: "", tone: "neutral", placement: "above-headline" },
  primaryCta: { label: "Get started", href: "#" },
  secondaryCta: { label: "Learn more", href: "#" },
  media: { type: "none", source: "external" },
  layout: {
    align: "center",
    maxWidth: "xl",
    contentWidth: "lg",
    height: "auto",
    bleed: "contained",
  },
  spacing: { paddingTop: "xl", paddingBottom: "xl" },
  background: { color: "transparent" },
  responsive: { hideMediaOnMobile: false },
};

const spacingValueMap = {
  none: "0rem",
  xs: "0.5rem",
  sm: "1rem",
  md: "1.5rem",
  lg: "2rem",
  xl: "3rem",
  "2xl": "4rem",
} as const;

const maxWidthClassMap = {
  none: "",
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
} as const;

const contentWidthClassMap = {
  none: "",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

const ratioClassMap: Record<string, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
};

const headlineSizeClassMap = {
  none: "",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
} as const;

const subheadSizeClassMap = {
  none: "",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
} as const;

const bodySizeClassMap = {
  none: "",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
} as const;

const buttonSizeClassMap = {
  none: "",
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
} as const;

const borderWidthValueMap = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
} as const;

const radiusClassMap = {
  none: "",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
} as const;

const shadowClassMap: Record<HeroShadowToken, string> = {
  none: "",
  soft: "shadow-sm",
  medium: "shadow-md",
  strong: "shadow-xl",
};

const fontFamilyClassMap: Record<HeroFontFamily, string> = {
  inherit: "",
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

const textWeightClassMap: Record<HeroTextWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const motionClassMap: Record<HeroMotionPreset, string | undefined> = {
  none: undefined,
  "fade-in":
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none",
  "slide-up":
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none",
};

const heightClassMap: Record<HeroLayoutHeight, string> = {
  auto: "",
  large: "min-h-[80vh]",
  screen: "min-h-screen",
};

const heroBadgeToneClassMap: Record<HeroBadgeTone, string> = {
  neutral: "border-border/80 bg-background/80 text-[var(--color-text)]",
  primary: "border-transparent bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  success: "border-transparent bg-emerald-500/15 text-emerald-700",
  warning: "border-transparent bg-amber-500/15 text-amber-700",
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const resolveSpacingKey = (value: string | undefined, fallback: keyof typeof spacingValueMap) =>
  value && value in spacingValueMap ? (value as keyof typeof spacingValueMap) : fallback;

const resolveHeroAlign = (value: string | undefined): NonNullable<HeroData["layout"]>["align"] => {
  if (value === "left" || value === "right") return value;
  return "center";
};

const resolveHeroMaxWidth = (
  value: string | undefined
): NonNullable<HeroData["layout"]>["maxWidth"] => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "2xl") {
    return value;
  }
  return "xl";
};

const resolveHeroContentWidth = (
  value: string | undefined
): NonNullable<HeroData["layout"]>["contentWidth"] => {
  if (value === "none" || value === "sm" || value === "md" || value === "xl") return value;
  return "lg";
};

const resolveHeroMediaRatio = (value: string | undefined) => {
  if (value === "4:3" || value === "1:1" || value === "3:4") return value;
  return "16:9";
};

const resolveHeroHeadlineSize = (value: string | undefined) => {
  if (value === "none" || value === "2xl" || value === "4xl" || value === "5xl") return value;
  return "3xl";
};

const resolveHeroSubheadSize = (value: string | undefined) => {
  if (value === "none" || value === "base" || value === "lg" || value === "2xl") return value;
  return "xl";
};

const resolveHeroBodySize = (value: string | undefined) => {
  if (value === "none" || value === "sm" || value === "lg" || value === "xl") return value;
  return "base";
};

const resolveHeroButtonSize = (value: string | undefined) => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveHeroBorderWidth = (value: string | undefined) => {
  if (value === "0" || value === "2" || value === "3") return value;
  return "1";
};

const resolveHeroRadius = (value: string | undefined, fallback: "lg" | "xl" | "2xl" | "3xl") => {
  if (value === "none" || value === "lg" || value === "xl" || value === "2xl" || value === "3xl") {
    return value;
  }
  return fallback;
};

const resolveHeroFontFamily = (value: string | undefined): HeroFontFamily => {
  if (value === "sans" || value === "serif" || value === "mono") return value;
  return "inherit";
};

const resolveHeroTextWeight = (value: string | undefined): HeroTextWeight => {
  if (value === "normal" || value === "medium" || value === "semibold" || value === "bold") {
    return value;
  }
  return "semibold";
};

const resolveHeroBodyWeight = (value: string | undefined): HeroTextWeight => {
  if (value === "normal" || value === "medium" || value === "semibold" || value === "bold") {
    return value;
  }
  return "normal";
};

const resolveHeroShadowToken = (value: string | undefined): HeroShadowToken => {
  if (value === "none" || value === "soft" || value === "medium" || value === "strong") {
    return value;
  }
  return "none";
};

const resolveHeroMotionPreset = (value: string | undefined): HeroMotionPreset => {
  if (value === "fade-in" || value === "slide-up") return value;
  return "none";
};

const resolveHeroTilt = (value: string | undefined): HeroTilt =>
  value === "subtle" || value === "strong" ? value : "none";

const resolveHeroLayoutHeight = (value: string | undefined): HeroLayoutHeight => {
  if (value === "large" || value === "screen") return value;
  return "auto";
};

const resolveHeroLayoutBleed = (value: string | undefined): HeroLayoutBleed => {
  if (value === "full-bleed") return value;
  return "contained";
};

const heroVariants = new Set(["centered", "split", "media-left", "media-center"]);

const normalizeHeroMediaSource = (value: string | undefined): HeroMediaSource =>
  value === "library" ? "library" : "external";

const trimOptionalString = (value: string | undefined) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const trimAsciiSpace = (value: string) => {
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) === 0x20) start += 1;
  while (end > start && value.charCodeAt(end - 1) === 0x20) end -= 1;
  return value.slice(start, end);
};

const splitHeroGradientComponents = (value: string): string[] | undefined => {
  const components: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth < 0) return undefined;
    }
    if (character === "," && depth === 0) {
      components.push(value.slice(start, index));
      start = index + 1;
    }
  }
  if (depth !== 0) return undefined;
  components.push(value.slice(start));
  return components;
};

export function normalizeHeroBackgroundGradient(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > HERO_BACKGROUND_GRADIENT_MAX_LENGTH) {
    return undefined;
  }
  const raw = trimAsciiSpace(value);
  const match = /^[lL][iI][nN][eE][aA][rR]-[gG][rR][aA][dD][iI][eE][nN][tT]\((.*)\)$/.exec(raw);
  if (!match) return undefined;
  const components = splitHeroGradientComponents(match[1] ?? "");
  if (!components || components.length !== 3) return undefined;

  const angleMatch = /^[ ]*([0-9]+)[dD][eE][gG][ ]*$/.exec(components[0] ?? "");
  if (!angleMatch) return undefined;
  const angle = Number(angleMatch[1]);
  if (!Number.isSafeInteger(angle) || angle < 0 || angle > 360) return undefined;

  const start = parseCssColorValue(components[1], "inherited-render");
  const end = parseCssColorValue(components[2], "inherited-render");
  if (!start || !end || start.normalized === "inherit" || end.normalized === "inherit") {
    return undefined;
  }
  return `linear-gradient(${angle}deg, ${start.normalized}, ${end.normalized})`;
}

const toBackgroundImageOverlayLayer = (value: string | undefined) =>
  value ? `linear-gradient(${value}, ${value})` : undefined;

function normalizeHeroMedia(value: HeroMedia | undefined): HeroMedia {
  const type = value?.type === "image" || value?.type === "video" ? value.type : "none";
  return {
    type,
    source: normalizeHeroMediaSource(value?.source),
    assetId: trimOptionalString(value?.assetId),
    src: trimOptionalString(value?.src),
    alt: type === "image" ? trimOptionalString(value?.alt) : undefined,
    posterSource: type === "video" ? normalizeHeroMediaSource(value?.posterSource) : undefined,
    posterAssetId: type === "video" ? trimOptionalString(value?.posterAssetId) : undefined,
    posterSrc: type === "video" ? trimOptionalString(value?.posterSrc) : undefined,
    title: type === "video" ? trimOptionalString(value?.title) : undefined,
    description: type === "video" ? trimOptionalString(value?.description) : undefined,
    ratio: type !== "none" ? resolveHeroMediaRatio(trimOptionalString(value?.ratio)) : undefined,
    overlay: resolveClearableCssColorValue(value?.overlay, "inherited-render", {
      allowInheritKeyword: false,
    }),
  };
}

function normalizeHeroBackgroundMedia(
  value: HeroBackgroundMedia | undefined,
  legacyImage?: string
): HeroBackgroundMedia {
  const type =
    value?.type === "image" || value?.type === "video"
      ? value.type
      : legacyImage
        ? "image"
        : "none";
  return {
    type,
    source: normalizeHeroMediaSource(value?.source),
    assetId: trimOptionalString(value?.assetId),
    src: trimOptionalString(value?.src) ?? trimOptionalString(legacyImage),
    posterSource: type === "video" ? normalizeHeroMediaSource(value?.posterSource) : undefined,
    posterAssetId: type === "video" ? trimOptionalString(value?.posterAssetId) : undefined,
    posterSrc: type === "video" ? trimOptionalString(value?.posterSrc) : undefined,
    title: type === "video" ? trimOptionalString(value?.title) : undefined,
    description: type === "video" ? trimOptionalString(value?.description) : undefined,
    overlay: resolveClearableCssColorValue(value?.overlay, "inherited-render", {
      allowInheritKeyword: false,
    }),
  };
}

function normalizeHeroSocialProof(value: HeroSocialProof | undefined): HeroSocialProof | undefined {
  if (!value) return undefined;
  const avatars = (value.avatars ?? [])
    .filter((avatar) => avatar && typeof avatar.src === "string" && avatar.src.trim().length > 0)
    .slice(0, 5)
    .map((avatar) => ({
      source:
        avatar.source === "library" || trimOptionalString(avatar.assetId)
          ? ("library" as const)
          : ("external" as const),
      assetId: trimOptionalString(avatar.assetId),
      src: avatar.src.trim(),
      alt: trimOptionalString(avatar.alt),
    }));
  const normalized: HeroSocialProof = {
    enabled: value.enabled !== false,
    rating: trimOptionalString(value.rating),
    reviewCount: trimOptionalString(value.reviewCount),
    label: trimOptionalString(value.label),
    avatars: avatars.length > 0 ? avatars : undefined,
  };
  if (!normalized.enabled) {
    return { enabled: false };
  }
  if (
    !normalized.rating &&
    !normalized.reviewCount &&
    !normalized.label &&
    !normalized.avatars?.length
  ) {
    return undefined;
  }
  return normalized;
}

function normalizeHeroLayout(
  value: HeroData["layout"] | undefined
): NonNullable<HeroData["layout"]> {
  return {
    align: resolveHeroAlign(value?.align),
    maxWidth: resolveHeroMaxWidth(value?.maxWidth),
    contentWidth: resolveHeroContentWidth(value?.contentWidth),
    height: resolveHeroLayoutHeight(value?.height),
    bleed: resolveHeroLayoutBleed(value?.bleed),
  };
}

function normalizeHeroSpacing(
  value: HeroData["spacing"] | undefined
): NonNullable<HeroData["spacing"]> {
  const defaultSpacing = heroDefaults.spacing ?? { paddingTop: "xl", paddingBottom: "xl" };
  return {
    paddingTop: resolveSpacingKey(value?.paddingTop, defaultSpacing.paddingTop ?? "xl"),
    paddingBottom: resolveSpacingKey(value?.paddingBottom, defaultSpacing.paddingBottom ?? "xl"),
  };
}

function normalizeHeroStyle(value: HeroData["style"] | undefined): HeroData["style"] | undefined {
  if (!value) return undefined;
  const color = (candidate: unknown) =>
    resolveClearableCssColorValue(candidate, "inherited-render");
  return {
    headlineSize: resolveHeroHeadlineSize(value.headlineSize),
    subheadSize: resolveHeroSubheadSize(value.subheadSize),
    bodySize: resolveHeroBodySize(value.bodySize),
    textColor: color(value.textColor),
    subheadColor: color(value.subheadColor),
    bodyColor: color(value.bodyColor),
    borderColor: color(value.borderColor),
    borderWidth: resolveHeroBorderWidth(value.borderWidth),
    borderRadius: resolveHeroRadius(value.borderRadius, "3xl"),
    mediaRadius: resolveHeroRadius(value.mediaRadius, "2xl"),
    mediaBorderColor: color(value.mediaBorderColor),
    mediaBorderWidth: resolveHeroBorderWidth(value.mediaBorderWidth),
    primaryButtonBg: color(value.primaryButtonBg),
    primaryButtonText: color(value.primaryButtonText),
    primaryButtonBorder: color(value.primaryButtonBorder),
    primaryButtonSize: resolveHeroButtonSize(value.primaryButtonSize),
    secondaryButtonBg: color(value.secondaryButtonBg),
    secondaryButtonText: color(value.secondaryButtonText),
    secondaryButtonBorder: color(value.secondaryButtonBorder),
    secondaryButtonSize: resolveHeroButtonSize(value.secondaryButtonSize),
    cardShadow: resolveHeroShadowToken(value.cardShadow),
    mediaShadow: resolveHeroShadowToken(value.mediaShadow),
    buttonShadow: resolveHeroShadowToken(value.buttonShadow),
    fontFamily: resolveHeroFontFamily(value.fontFamily),
    headlineWeight: resolveHeroTextWeight(value.headlineWeight),
    bodyWeight: resolveHeroBodyWeight(value.bodyWeight),
    motion: resolveHeroMotionPreset(value.motion),
    ...(value.tilt !== undefined && resolveHeroTilt(value.tilt) !== "none"
      ? { tilt: resolveHeroTilt(value.tilt) }
      : {}),
  };
}

function normalizeHeroBackground(
  value: HeroData["background"] | undefined
): NonNullable<HeroData["background"]> {
  return {
    color: resolveClearableCssColorValue(value?.color, "inherited-render"),
    gradient: normalizeHeroBackgroundGradient(value?.gradient),
    image: trimOptionalString(value?.image),
    media: normalizeHeroBackgroundMedia(value?.media, value?.image),
  };
}

type HeroImagePolicy = {
  loading: "eager" | "lazy";
  fetchPriority: "high" | "auto";
  sizes: string;
};

function resolveHeroImagePolicy(variant: string): HeroImagePolicy {
  if (variant === "centered" || variant === "media-center") {
    return {
      loading: "eager",
      fetchPriority: "high",
      sizes: "100vw",
    };
  }
  if (variant === "split") {
    return {
      loading: "eager",
      fetchPriority: "high",
      sizes: "(min-width: 768px) 50vw, 100vw",
    };
  }
  return {
    loading: "lazy",
    fetchPriority: "auto",
    sizes: "(min-width: 768px) 50vw, 100vw",
  };
}

export const normalizeHeroHref = (value: unknown) =>
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });

function normalizeHeroBadge(value: HeroBadge | undefined): HeroBadge | undefined {
  if (!value || typeof value.label !== "string") return undefined;
  const label = value.label.trim();
  if (!label) return undefined;
  return {
    enabled: value.enabled !== false,
    label,
    href: normalizeHeroHref(value.href),
    prefix:
      typeof value.prefix === "string" && value.prefix.trim().length > 0 ? value.prefix : undefined,
    tone:
      value.tone === "primary" ||
      value.tone === "success" ||
      value.tone === "warning" ||
      value.tone === "neutral"
        ? value.tone
        : "neutral",
    placement: value.placement === "inline-headline" ? "inline-headline" : "above-headline",
  };
}

function normalizeHeroCta(value: HeroCta | undefined): HeroCta | undefined {
  if (!value || typeof value.label !== "string") return undefined;
  const label = value.label.trim();
  const href = normalizeHeroHref(value.href);
  if (!label || !href) return undefined;
  return { label, href };
}

export function normalizeHeroData(data: HeroData): HeroData {
  return {
    headline:
      typeof data.headline === "string" && data.headline.trim().length > 0
        ? data.headline
        : heroDefaults.headline,
    subhead: typeof data.subhead === "string" ? data.subhead : undefined,
    body: typeof data.body === "string" ? data.body : undefined,
    richHeadline: sanitizeRichTextHtml(data.richHeadline),
    richBody: sanitizeRichTextHtml(data.richBody),
    badge: normalizeHeroBadge(data.badge),
    primaryCta: normalizeHeroCta(data.primaryCta),
    secondaryCta: normalizeHeroCta(data.secondaryCta),
    media: normalizeHeroMedia(data.media),
    socialProof: normalizeHeroSocialProof(data.socialProof),
    layout: normalizeHeroLayout(data.layout),
    spacing: normalizeHeroSpacing(data.spacing),
    style: normalizeHeroStyle(data.style),
    background: normalizeHeroBackground(data.background),
    responsive: {
      ...heroDefaults.responsive,
      ...data.responsive,
    },
  };
}

export function HeroBlock({
  data,
  variant,
  slots,
  previewDevice,
  renderContext,
}: {
  data: HeroData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
}) {
  const normalized = normalizeHeroData(data);
  const layout = normalized.layout ?? {};
  const media = normalized.media ?? { type: "none" };
  const spacingDefaults = heroDefaults.spacing ?? {
    paddingTop: "xl",
    paddingBottom: "xl",
  };
  const defaultPaddingTop = spacingDefaults.paddingTop ?? "xl";
  const defaultPaddingBottom = spacingDefaults.paddingBottom ?? "xl";
  const spacing = {
    paddingTop: spacingDefaults.paddingTop,
    paddingBottom: spacingDefaults.paddingBottom,
    ...(normalized.style ?? {}),
    ...(normalized.spacing ?? {}),
  };
  const align = layout.align ?? "center";
  const maxWidth = layout.maxWidth ?? "xl";
  const contentWidth = layout.contentWidth ?? "lg";
  const paddingTop = resolveSpacingKey(spacing.paddingTop, defaultPaddingTop);
  const paddingBottom = resolveSpacingKey(spacing.paddingBottom, defaultPaddingBottom);
  const background = normalized.background ?? {};
  const resolvedVariant = heroVariants.has(variant) ? variant : "centered";
  const backgroundMedia = normalizeHeroBackgroundMedia(background.media, background.image);
  const centeredImageBackground =
    resolvedVariant === "centered" && media.type === "image" ? media.src : undefined;
  const resolvedBackgroundVideo =
    backgroundMedia.type === "video" ? backgroundMedia.src : undefined;
  const explicitBackgroundImage =
    backgroundMedia.type === "image" ? backgroundMedia.src : trimOptionalString(background.image);
  const resolvedBackgroundImage = explicitBackgroundImage;
  const centeredBackgroundImage = !explicitBackgroundImage ? centeredImageBackground : undefined;
  const resolvedBackgroundGradient = normalizeHeroBackgroundGradient(background.gradient);
  const resolvedBackgroundOverlay = resolveClearableCssColorValue(
    backgroundMedia.overlay ??
      (resolvedVariant === "centered" && media.type === "image" ? media.overlay : undefined),
    "inherited-render",
    { allowInheritKeyword: false }
  );
  const centeredBackgroundGradient =
    centeredBackgroundImage && !resolvedBackgroundVideo ? resolvedBackgroundGradient : undefined;
  const layeredBackground =
    !resolvedBackgroundVideo && resolvedBackgroundImage
      ? [
          toBackgroundImageOverlayLayer(resolvedBackgroundOverlay),
          resolvedBackgroundGradient,
          `url(${resolvedBackgroundImage})`,
        ]
          .filter(Boolean)
          .join(", ")
      : !resolvedBackgroundVideo && !centeredBackgroundImage
        ? resolvedBackgroundGradient || undefined
        : undefined;

  const backgroundStyle: CSSProperties = {
    backgroundColor: resolveClearableCssColorValue(background.color, "inherited-render"),
    backgroundImage: layeredBackground,
    backgroundSize: resolvedBackgroundImage ? "cover" : undefined,
    backgroundPosition: resolvedBackgroundImage ? "center" : undefined,
    paddingTop: spacingValueMap[paddingTop],
    paddingBottom: spacingValueMap[paddingBottom],
  };
  const style = normalized.style ?? {};
  const hasStyleObject = normalized.style !== undefined;
  const borderWidth = style.borderWidth ?? "1";
  const mediaBorderWidth = style.mediaBorderWidth ?? "1";
  const cardStyle: CSSProperties = {
    ...backgroundStyle,
    borderWidth: borderWidthValueMap[borderWidth] ?? "1px",
    borderColor:
      resolveClearableCssColorValue(style.borderColor, "inherited-render") ?? "var(--color-border)",
    borderStyle: "solid",
  };
  const mediaFrameStyle: CSSProperties = {
    borderWidth: borderWidthValueMap[mediaBorderWidth] ?? "1px",
    borderColor:
      resolveClearableCssColorValue(style.mediaBorderColor, "inherited-render") ??
      "var(--color-border)",
    borderStyle: "solid",
  };
  const headlineSize = style.headlineSize ?? "3xl";
  const subheadSize = style.subheadSize ?? "xl";
  const bodySize = style.bodySize ?? "base";
  const primaryButtonSize = style.primaryButtonSize ?? "md";
  const secondaryButtonSize = style.secondaryButtonSize ?? "md";
  const cardShadow = resolveHeroShadowToken(style.cardShadow);
  const mediaShadow = resolveHeroShadowToken(style.mediaShadow);
  const buttonShadow = resolveHeroShadowToken(style.buttonShadow);
  const fontFamily = resolveHeroFontFamily(style.fontFamily);
  const headlineWeight = resolveHeroTextWeight(style.headlineWeight);
  const bodyWeight = resolveHeroBodyWeight(style.bodyWeight);
  const motionPreset = resolveHeroMotionPreset(style.motion);
  const tilt = resolveHeroTilt(style.tilt);
  const tiltEnabled = tilt !== "none";
  const tiltMaxDeg = HERO_TILT_MAX_DEG[tilt];
  const layoutHeight = resolveHeroLayoutHeight(layout.height);
  const layoutBleed = resolveHeroLayoutBleed(layout.bleed);
  const headlineColor =
    resolveClearableCssColorValue(style.textColor, "inherited-render") ?? "var(--color-text)";
  const subheadColor =
    resolveClearableCssColorValue(style.subheadColor, "inherited-render") ?? "var(--color-text)";
  const bodyColor =
    resolveClearableCssColorValue(style.bodyColor, "inherited-render") ?? "var(--color-text)";
  const primaryButtonStyle: CSSProperties =
    compactStyle({
      background: hasStyleObject
        ? resolveClearableCssColorValue(style.primaryButtonBg, "inherited-render")
        : "var(--color-primary)",
      color:
        resolveClearableCssColorValue(style.primaryButtonText, "inherited-render") ??
        "var(--color-bg)",
      borderColor:
        resolveClearableCssColorValue(style.primaryButtonBorder, "inherited-render") ??
        "transparent",
      borderStyle: "solid",
      borderWidth:
        style.primaryButtonBorder &&
        style.primaryButtonBorder !== "transparent" &&
        style.primaryButtonBorder !== ""
          ? "1px"
          : "0px",
    }) ?? {};
  const secondaryButtonStyle: CSSProperties =
    compactStyle({
      background: hasStyleObject
        ? resolveClearableCssColorValue(style.secondaryButtonBg, "inherited-render")
        : "transparent",
      color:
        resolveClearableCssColorValue(style.secondaryButtonText, "inherited-render") ??
        "var(--color-text)",
      borderColor:
        resolveClearableCssColorValue(style.secondaryButtonBorder, "inherited-render") ??
        "var(--color-border)",
      borderStyle: "solid",
      borderWidth: "1px",
    }) ?? {};

  const centeredImagePolicy = centeredBackgroundImage ? resolveHeroImagePolicy("centered") : null;
  const inlineImagePolicy =
    media.type === "image" && media.src ? resolveHeroImagePolicy(resolvedVariant) : null;
  const isSplit = resolvedVariant === "split" || resolvedVariant === "media-left";
  const isMediaLeft = resolvedVariant === "media-left";
  const isMediaCenter = resolvedVariant === "media-center";
  const hideMediaOnMobile = normalized.responsive?.hideMediaOnMobile;
  const contentSlots = slots?.content ?? [];
  const badge = normalized.badge?.enabled ? normalized.badge : undefined;
  const badgeTone = badge?.tone ?? "neutral";
  const socialProof = normalized.socialProof?.enabled ? normalized.socialProof : undefined;
  const badgeNode = badge ? (
    badge.href ? (
      <a
        data-widget-part="hero.badge"
        className={joinClasses(
          "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
          heroBadgeToneClassMap[badgeTone]
        )}
        href={badge.href}
      >
        {badge.prefix ? <span>{badge.prefix}</span> : null}
        <span>{badge.label}</span>
      </a>
    ) : (
      <span
        data-widget-part="hero.badge"
        className={joinClasses(
          "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
          heroBadgeToneClassMap[badgeTone]
        )}
      >
        {badge.prefix ? <span>{badge.prefix}</span> : null}
        <span>{badge.label}</span>
      </span>
    )
  ) : null;

  const effectiveAlign = isMediaCenter ? "center" : align;
  const textAlignClass =
    effectiveAlign === "center"
      ? "text-center"
      : effectiveAlign === "right"
        ? "text-right"
        : "text-left";
  const contentPlacementClass =
    effectiveAlign === "center" ? "mx-auto" : effectiveAlign === "right" ? "ml-auto" : "mr-auto";

  const layoutClass = isSplit
    ? joinClasses(
        "flex flex-col gap-8 md:items-center",
        isMediaLeft ? "md:flex-row-reverse" : "md:flex-row"
      )
    : isMediaCenter
      ? "flex flex-col items-center gap-8"
      : "flex flex-col gap-4";

  const rootStyle: CSSProperties =
    layoutBleed === "full-bleed"
      ? {
          ...cardStyle,
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
        }
      : cardStyle;

  const heroCard = (
    <div
      className={joinClasses(
        "relative w-full overflow-hidden border px-6",
        radiusClassMap[style.borderRadius ?? "3xl"] ?? "rounded-3xl",
        shadowClassMap[cardShadow],
        fontFamilyClassMap[fontFamily],
        motionClassMap[motionPreset],
        heightClassMap[layoutHeight]
      )}
      style={rootStyle}
    >
      {centeredBackgroundImage && centeredImagePolicy ? (
        <img
          src={centeredBackgroundImage}
          alt={media.alt ?? ""}
          loading={centeredImagePolicy.loading}
          fetchPriority={centeredImagePolicy.fetchPriority}
          sizes={centeredImagePolicy.sizes}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {centeredBackgroundGradient ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: centeredBackgroundGradient }}
        />
      ) : null}
      {centeredBackgroundImage && resolvedBackgroundOverlay ? (
        <div
          data-hero-background-overlay="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: resolvedBackgroundOverlay }}
        />
      ) : null}
      {resolvedBackgroundVideo ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          src={resolvedBackgroundVideo}
          poster={backgroundMedia.posterSrc}
          title={backgroundMedia.title || undefined}
          aria-description={backgroundMedia.description || undefined}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {resolvedBackgroundVideo && resolvedBackgroundGradient ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: resolvedBackgroundGradient }}
        />
      ) : null}
      {resolvedBackgroundVideo && resolvedBackgroundOverlay ? (
        <div
          data-hero-background-overlay="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: resolvedBackgroundOverlay }}
        />
      ) : null}
      <div className={joinClasses("relative z-[1] mx-auto w-full", maxWidthClassMap[maxWidth])}>
        <div className={layoutClass}>
          <div
            className={joinClasses(
              "space-y-4",
              textAlignClass,
              isSplit ? "w-full md:flex-1" : contentWidthClassMap[contentWidth],
              !isSplit && contentPlacementClass,
              isMediaCenter && "mx-auto text-center"
            )}
          >
            {badge && badge.placement !== "inline-headline" ? badgeNode : null}
            <h1
              className={joinClasses(
                textWeightClassMap[headlineWeight],
                badge?.placement === "inline-headline" && "flex flex-wrap items-center gap-3",
                headlineSizeClassMap[headlineSize] ?? "text-3xl"
              )}
              style={{ color: headlineColor }}
            >
              {badge?.placement === "inline-headline" ? badgeNode : null}
              {normalized.richHeadline ? (
                <span dangerouslySetInnerHTML={{ __html: normalized.richHeadline }} />
              ) : (
                <span>{normalized.headline}</span>
              )}
            </h1>
            {normalized.subhead ? (
              <p
                className={joinClasses(
                  subheadSizeClassMap[subheadSize] ?? "text-xl",
                  textWeightClassMap[bodyWeight]
                )}
                style={{ color: subheadColor }}
              >
                {normalized.subhead}
              </p>
            ) : null}
            {normalized.richBody ? (
              <div
                className={joinClasses(
                  bodySizeClassMap[bodySize] ?? "text-base",
                  textWeightClassMap[bodyWeight]
                )}
                style={{ color: bodyColor }}
                dangerouslySetInnerHTML={{ __html: normalized.richBody }}
              />
            ) : normalized.body ? (
              <p
                className={joinClasses(
                  bodySizeClassMap[bodySize] ?? "text-base",
                  textWeightClassMap[bodyWeight]
                )}
                style={{ color: bodyColor }}
              >
                {normalized.body}
              </p>
            ) : null}
            {socialProof ? (
              <div
                data-widget-part="hero.social-proof"
                className={joinClasses(
                  "flex flex-wrap items-center gap-3 text-sm",
                  effectiveAlign === "center"
                    ? "justify-center"
                    : effectiveAlign === "right"
                      ? "justify-end"
                      : "justify-start"
                )}
                style={{ color: bodyColor }}
              >
                {socialProof.avatars?.length ? (
                  <div className="flex -space-x-2">
                    {socialProof.avatars.map((avatar, index) => (
                      <img
                        key={`${avatar.src}-${index}`}
                        src={avatar.src}
                        alt={avatar.alt ?? ""}
                        loading="lazy"
                        className="h-8 w-8 rounded-full border border-background object-cover"
                      />
                    ))}
                  </div>
                ) : null}
                {socialProof.rating ? (
                  <span className="font-semibold">{socialProof.rating}</span>
                ) : null}
                {socialProof.reviewCount ? <span>{socialProof.reviewCount}</span> : null}
                {socialProof.label ? <span>{socialProof.label}</span> : null}
              </div>
            ) : null}
            <div
              className={joinClasses(
                "flex w-full flex-wrap items-center gap-3",
                effectiveAlign === "center" && "justify-center",
                effectiveAlign === "right" && "justify-end"
              )}
            >
              {normalized.primaryCta ? (
                <a
                  className={joinClasses(
                    "rounded-md font-semibold",
                    buttonSizeClassMap[primaryButtonSize] ?? "px-4 py-2 text-sm",
                    shadowClassMap[buttonShadow]
                  )}
                  style={primaryButtonStyle}
                  href={normalized.primaryCta.href}
                >
                  {normalized.primaryCta.label}
                </a>
              ) : null}
              {normalized.secondaryCta ? (
                <a
                  className={joinClasses(
                    "rounded-md font-semibold",
                    buttonSizeClassMap[secondaryButtonSize] ?? "px-4 py-2 text-sm",
                    shadowClassMap[buttonShadow]
                  )}
                  style={secondaryButtonStyle}
                  href={normalized.secondaryCta.href}
                >
                  {normalized.secondaryCta.label}
                </a>
              ) : null}
            </div>
            {contentSlots.length ? (
              <div className="mt-6 flex w-full flex-col gap-4">
                {contentSlots.map((slotBlock) => (
                  <WidgetRenderer
                    key={slotBlock.id}
                    block={slotBlock}
                    previewDevice={previewDevice}
                  />
                ))}
              </div>
            ) : null}
          </div>
          {isSplit || isMediaCenter ? (
            <div
              className={joinClasses(
                "w-full",
                isSplit && "md:flex-1",
                isMediaCenter && "mx-auto max-w-4xl",
                hideMediaOnMobile && "hidden md:block"
              )}
            >
              <div
                className={joinClasses(
                  "relative overflow-hidden border bg-muted/20",
                  radiusClassMap[style.mediaRadius ?? "2xl"] ?? "rounded-2xl",
                  ratioClassMap[media?.ratio ?? "16:9"] ?? "aspect-video",
                  shadowClassMap[mediaShadow]
                )}
                style={mediaFrameStyle}
              >
                {media?.type === "image" && media.src ? (
                  <img
                    src={media.src}
                    alt={media.alt ?? ""}
                    loading={inlineImagePolicy?.loading}
                    fetchPriority={inlineImagePolicy?.fetchPriority}
                    sizes={inlineImagePolicy?.sizes}
                    className="h-full w-full object-cover"
                  />
                ) : media?.type === "video" && media.src ? (
                  <video
                    controls
                    src={media.src}
                    poster={media.posterSrc}
                    title={media.title || undefined}
                    aria-description={media.description || undefined}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                    {media?.type === "none" ? "Select media type" : "Add media URL"}
                  </div>
                )}
                {media?.overlay ? (
                  <div
                    data-hero-inline-media-overlay="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: resolveClearableCssColorValue(media.overlay, "inherited-render", {
                        allowInheritKeyword: false,
                      }),
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!tiltEnabled) {
    return heroCard;
  }

  return (
    <div
      className={joinClasses("motion-safe:[perspective:1000px]")}
      data-hero-tilt={tilt}
      data-hero-tilt-max={String(tiltMaxDeg)}
    >
      <div
        data-hero-tilt-inner
        className={joinClasses(
          "motion-safe:transition-transform motion-safe:duration-150",
          "[transform-style:preserve-3d] will-change-transform"
        )}
      >
        {heroCard}
      </div>
      {renderContext?.runtimeScripts != null
        ? renderSharedWidgetRuntimeScript({
            renderContext,
            id: "hero-tilt",
            source: HERO_TILT_SCRIPT,
          })
        : null}
    </div>
  );
}

const HERO_TILT_SCRIPT = [
  "(function(){try{",
  'if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;',
  'if(!(window.matchMedia&&window.matchMedia("(pointer:fine)").matches))return;',
  'var hs=document.querySelectorAll("[data-hero-tilt]");',
  'hs.forEach(function(h){var inner=h.querySelector("[data-hero-tilt-inner]")||h;',
  ' var max=Math.max(0,Math.min(12,parseFloat(h.getAttribute("data-hero-tilt-max"))||6));',
  " var pend=false,rx=0,ry=0;",
  ' function f(){pend=false;inner.style.transform="rotateX("+rx.toFixed(2)+"deg) rotateY("+ry.toFixed(2)+"deg)";}',
  ' h.addEventListener("pointermove",function(e){var r=h.getBoundingClientRect();',
  "  var px=(e.clientX-r.left)/r.width-0.5,py=(e.clientY-r.top)/r.height-0.5;",
  "  ry=px*max*2;rx=-py*max*2;if(!pend){pend=true;requestAnimationFrame(f);}},{passive:true});",
  ' h.addEventListener("pointerleave",function(){rx=0;ry=0;if(!pend){pend=true;requestAnimationFrame(f);}},{passive:true});',
  "});}catch(e){}})();",
].join("");

const heroSocialProofAvatarWritablePaths = Array.from({ length: 5 }, (_, index) => [
  `socialProof.avatars.${index}.source`,
  `socialProof.avatars.${index}.assetId`,
  `socialProof.avatars.${index}.src`,
  `socialProof.avatars.${index}.alt`,
]).flat();

export const heroEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "hero.wizard.goal-structure",
      title: "Goal and starter plan",
      role: "setup",
      writablePaths: [],
    },
    {
      mode: "wizard",
      id: "hero.wizard.starter-copy",
      title: "Starter copy",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["headline"],
    },
    {
      mode: "wizard",
      id: "hero.wizard.primary-action",
      title: "Primary action seed",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["primaryCta.label", "primaryCta.href"],
    },
    {
      mode: "visual",
      id: "hero.variant-presets",
      title: "Variant and Presets",
      role: "setup",
      writablePaths: ["variant"],
    },
    {
      mode: "visual",
      id: "hero.badge-headline",
      title: "Badge and headline",
      role: "content",
      writablePaths: [
        "badge.enabled",
        "badge.label",
        "badge.prefix",
        "badge.href",
        "badge.tone",
        "badge.placement",
        "headline",
        "subhead",
        "body",
      ],
    },
    {
      mode: "visual",
      id: "hero.cta",
      title: "CTA",
      role: "content",
      writablePaths: [
        "secondaryCta",
        "primaryCta.label",
        "primaryCta.href",
        "style.primaryButtonSize",
        "secondaryCta.label",
        "secondaryCta.href",
        "style.secondaryButtonSize",
      ],
    },
    {
      mode: "visual",
      id: "hero.rich-copy-social-proof",
      title: "Rich copy and social proof",
      role: "content",
      writablePaths: [
        "richHeadline",
        "richBody",
        "socialProof.enabled",
        "socialProof.rating",
        "socialProof.reviewCount",
        "socialProof.label",
        ...heroSocialProofAvatarWritablePaths,
      ],
    },
    {
      mode: "visual",
      id: "hero.media",
      title: "Media",
      role: "visual",
      writablePaths: [
        "media.type",
        "media.source",
        "media.assetId",
        "media.src",
        "media.alt",
        "media.title",
        "media.description",
        "media.posterSource",
        "media.posterAssetId",
        "media.posterSrc",
        "media.ratio",
        "media.overlay",
      ],
    },
    {
      mode: "visual",
      id: "hero.layout-spacing",
      title: "Layout and spacing",
      role: "layout",
      writablePaths: [
        "layout.align",
        "layout.maxWidth",
        "layout.contentWidth",
        "layout.height",
        "layout.bleed",
        "spacing.paddingTop",
        "spacing.paddingBottom",
        "responsive.hideMediaOnMobile",
      ],
    },
    {
      mode: "visual",
      id: "hero.typography",
      title: "Typography",
      role: "visual",
      writablePaths: ["style.headlineSize", "style.subheadSize", "style.bodySize"],
    },
    {
      mode: "visual",
      id: "hero.appearance",
      title: "Appearance",
      role: "visual",
      writablePaths: [
        "style.cardShadow",
        "style.mediaShadow",
        "style.buttonShadow",
        "style.fontFamily",
        "style.headlineWeight",
        "style.bodyWeight",
        "style.motion",
        "style.tilt",
      ],
    },
    {
      mode: "visual",
      id: "hero.colors-borders",
      title: "Colors and Borders",
      role: "visual",
      writablePaths: [
        "style.textColor",
        "style.subheadColor",
        "style.bodyColor",
        "style.borderColor",
        "style.primaryButtonBg",
        "style.primaryButtonText",
        "style.primaryButtonBorder",
        "style.secondaryButtonBg",
        "style.secondaryButtonText",
        "style.secondaryButtonBorder",
        "style.mediaBorderColor",
        "style.borderWidth",
        "style.borderRadius",
        "style.mediaBorderWidth",
        "style.mediaRadius",
      ],
    },
    {
      mode: "visual",
      id: "hero.background",
      title: "Background",
      role: "visual",
      writablePaths: [
        "background.color",
        "background.gradient",
        "background.media.type",
        "background.media.source",
        "background.media.assetId",
        "background.media.src",
        "background.media.title",
        "background.media.description",
        "background.media.posterSource",
        "background.media.posterAssetId",
        "background.media.posterSrc",
        "background.media.overlay",
      ],
    },
    {
      mode: "advanced",
      id: "hero.advanced.layout-summary",
      title: "Layout summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "variant",
        "layout.align",
        "layout.maxWidth",
        "layout.contentWidth",
        "layout.height",
        "layout.bleed",
        "spacing.paddingTop",
        "spacing.paddingBottom",
        "responsive.hideMediaOnMobile",
      ],
    },
    {
      mode: "advanced",
      id: "hero.advanced.style-summary",
      title: "Style token summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "style.headlineSize",
        "style.subheadSize",
        "style.bodySize",
        "style.textColor",
        "style.subheadColor",
        "style.bodyColor",
        "style.primaryButtonBg",
        "style.primaryButtonText",
        "style.primaryButtonBorder",
        "style.primaryButtonSize",
        "style.secondaryButtonBg",
        "style.secondaryButtonText",
        "style.secondaryButtonBorder",
        "style.secondaryButtonSize",
        "style.borderColor",
        "style.borderWidth",
        "style.borderRadius",
        "style.mediaBorderColor",
        "style.mediaBorderWidth",
        "style.mediaRadius",
        "style.cardShadow",
        "style.mediaShadow",
        "style.buttonShadow",
        "style.fontFamily",
        "style.headlineWeight",
        "style.bodyWeight",
      ],
    },
    {
      mode: "advanced",
      id: "hero.advanced.media-diagnostics",
      title: "Media diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "media.type",
        "media.source",
        "media.src",
        "media.alt",
        "media.title",
        "background.color",
        "background.gradient",
        "background.media.type",
        "background.media.src",
        "background.media.overlay",
        "background.media.title",
      ],
    },
    {
      mode: "advanced",
      id: "hero.advanced.accessibility-diagnostics",
      title: "Accessibility diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "headline",
        "primaryCta.href",
        "secondaryCta.href",
        "richHeadline",
        "richBody",
        "style.motion",
        "style.tilt",
      ],
    },
    {
      mode: "advanced",
      id: "hero.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "primaryCta.href", "media.src", "richBody"],
    },
    {
      mode: "advanced",
      id: "hero.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["editorContract"],
    },
  ],
};

export function createHeroWidget(
  editors: WidgetEditorBundle<HeroData>
): WidgetDefinition<HeroData> {
  return {
    type: "hero",
    title: "Hero",
    description: "Top-of-page hero section with CTA.",
    category: "layout",
    slots: [{ id: "content", label: "Hero Content" }],
    variants: [
      { id: "centered", label: "Centered" },
      { id: "split", label: "Media Right" },
      { id: "media-left", label: "Media Left" },
      { id: "media-center", label: "Media Center" },
    ],
    schema: heroSchema,
    defaults: heroDefaults,
    preserveAbsentDefaultKeys: ["secondaryCta"],
    editor: editors,
    editorCapabilities: { visualOwnsVariantSelection: true },
    editorContract: heroEditorContract,
    render: HeroBlock,
  };
}
