import type { ComponentType, CSSProperties } from "react";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type { DeviceTarget, WidgetBlock, WidgetDefinition, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export type HeroCta = {
  label: string;
  href: string;
};

export type HeroMedia = {
  type: "none" | "image" | "video";
  source?: "library" | "external";
  assetId?: string;
  src?: string;
  alt?: string;
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

export type HeroData = {
  headline: string;
  subhead?: string;
  body?: string;
  badge?: HeroBadge;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  media?: HeroMedia;
  layout?: {
    align?: "left" | "center" | "right";
    maxWidth?: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
    contentWidth?: "none" | "sm" | "md" | "lg" | "xl";
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
  };
  background?: {
    color?: string;
    gradient?: string;
    image?: string;
    media?: {
      type?: "none" | "image" | "video";
      source?: "library" | "external";
      assetId?: string;
      src?: string;
      overlay?: string;
    };
  };
  responsive?: {
    hideMediaOnMobile?: boolean;
  };
};

export const heroSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline"],
  properties: {
    headline: { type: "string" },
    subhead: { type: "string" },
    body: { type: "string" },
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
        ratio: { type: "string" },
        overlay: { type: "string" },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        align: { enum: ["left", "center", "right"] },
        maxWidth: { enum: ["none", "sm", "md", "lg", "xl", "2xl"] },
        contentWidth: { enum: ["none", "sm", "md", "lg", "xl"] },
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
        textColor: { type: "string" },
        subheadColor: { type: "string" },
        bodyColor: { type: "string" },
        headlineSize: { enum: ["none", "2xl", "3xl", "4xl", "5xl"] },
        subheadSize: { enum: ["none", "base", "lg", "xl", "2xl"] },
        bodySize: { enum: ["none", "sm", "base", "lg", "xl"] },
        borderColor: { type: "string" },
        borderWidth: { enum: ["0", "1", "2", "3"] },
        borderRadius: { enum: ["none", "lg", "xl", "2xl", "3xl"] },
        mediaBorderColor: { type: "string" },
        mediaBorderWidth: { enum: ["0", "1", "2", "3"] },
        mediaRadius: { enum: ["none", "lg", "xl", "2xl", "3xl"] },
        primaryButtonBg: { type: "string" },
        primaryButtonText: { type: "string" },
        primaryButtonBorder: { type: "string" },
        primaryButtonSize: { enum: ["none", "sm", "md", "lg"] },
        secondaryButtonBg: { type: "string" },
        secondaryButtonText: { type: "string" },
        secondaryButtonBorder: { type: "string" },
        secondaryButtonSize: { enum: ["none", "sm", "md", "lg"] },
      },
    },
    background: {
      type: "object",
      additionalProperties: false,
      properties: {
        color: { type: "string" },
        gradient: { type: "string" },
        image: { type: "string" },
        media: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { enum: ["none", "image", "video"] },
            source: { enum: ["library", "external"] },
            assetId: { type: "string" },
            src: { type: "string" },
            overlay: { type: "string" },
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
  layout: { align: "center", maxWidth: "xl", contentWidth: "lg" },
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
    ...heroDefaults,
    ...data,
    headline:
      typeof data.headline === "string" && data.headline.trim().length > 0
        ? data.headline
        : heroDefaults.headline,
    subhead: typeof data.subhead === "string" ? data.subhead : undefined,
    body: typeof data.body === "string" ? data.body : undefined,
    badge: normalizeHeroBadge(data.badge),
    primaryCta: normalizeHeroCta(data.primaryCta),
    secondaryCta: normalizeHeroCta(data.secondaryCta),
    media: {
      type: data.media?.type ?? heroDefaults.media?.type ?? "none",
      source: data.media?.source ?? heroDefaults.media?.source ?? "external",
      assetId: data.media?.assetId,
      src: data.media?.src,
      alt: data.media?.alt,
      ratio: data.media?.ratio,
      overlay: data.media?.overlay,
    },
    layout: {
      ...heroDefaults.layout,
      ...data.layout,
    },
    spacing: {
      ...heroDefaults.spacing,
      ...data.spacing,
    },
    style: data.style ? { ...data.style } : undefined,
    background: data.background
      ? {
          ...data.background,
          media: data.background.media ? { ...data.background.media } : undefined,
        }
      : heroDefaults.background,
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
}: {
  data: HeroData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
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
  const backgroundMedia = {
    type: background.media?.type ?? (background.image ? "image" : "none"),
    source: background.media?.source ?? "external",
    assetId: background.media?.assetId,
    src: background.media?.src ?? background.image,
    overlay: background.media?.overlay,
  };
  const centeredImageBackground =
    variant === "centered" && media.type === "image" ? media.src : undefined;
  const resolvedBackgroundVideo =
    backgroundMedia.type === "video" ? backgroundMedia.src : undefined;
  const resolvedBackgroundImage =
    backgroundMedia.type === "image"
      ? (backgroundMedia.src ?? centeredImageBackground)
      : (background.image ?? centeredImageBackground);
  const resolvedBackgroundGradient = resolveClearableStyleValue(background.gradient);
  const resolvedBackgroundOverlay = resolveClearableStyleValue(
    backgroundMedia.overlay ??
      (variant === "centered" && media.type === "image" ? media.overlay : undefined)
  );
  const layeredBackground =
    !resolvedBackgroundVideo && resolvedBackgroundImage
      ? [resolvedBackgroundOverlay, resolvedBackgroundGradient, `url(${resolvedBackgroundImage})`]
          .filter(Boolean)
          .join(", ")
      : !resolvedBackgroundVideo
        ? resolvedBackgroundGradient || undefined
        : undefined;

  const backgroundStyle: CSSProperties = {
    backgroundColor: resolveClearableStyleValue(background.color),
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
    borderColor: style.borderColor ?? "var(--color-border)",
    borderStyle: "solid",
  };
  const mediaFrameStyle: CSSProperties = {
    borderWidth: borderWidthValueMap[mediaBorderWidth] ?? "1px",
    borderColor: style.mediaBorderColor ?? "var(--color-border)",
    borderStyle: "solid",
  };
  const headlineSize = style.headlineSize ?? "3xl";
  const subheadSize = style.subheadSize ?? "xl";
  const bodySize = style.bodySize ?? "base";
  const primaryButtonSize = style.primaryButtonSize ?? "md";
  const secondaryButtonSize = style.secondaryButtonSize ?? "md";
  const headlineColor = style.textColor ?? "var(--color-text)";
  const subheadColor = style.subheadColor ?? "var(--color-text)";
  const bodyColor = style.bodyColor ?? "var(--color-text)";
  const primaryButtonStyle: CSSProperties =
    compactStyle({
      background: hasStyleObject
        ? resolveClearableStyleValue(style.primaryButtonBg)
        : "var(--color-primary)",
      color: style.primaryButtonText ?? "var(--color-bg)",
      borderColor: style.primaryButtonBorder ?? "transparent",
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
        ? resolveClearableStyleValue(style.secondaryButtonBg)
        : "transparent",
      color: style.secondaryButtonText ?? "var(--color-text)",
      borderColor: style.secondaryButtonBorder ?? "var(--color-border)",
      borderStyle: "solid",
      borderWidth: "1px",
    }) ?? {};

  const isSplit = variant !== "centered";
  const isMediaLeft = variant === "media-left";
  const hideMediaOnMobile = normalized.responsive?.hideMediaOnMobile;
  const contentSlots = slots?.content ?? [];
  const badge = normalized.badge?.enabled ? normalized.badge : undefined;
  const badgeTone = badge?.tone ?? "neutral";
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

  const textAlignClass =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const contentPlacementClass =
    align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "mr-auto";

  const layoutClass = isSplit
    ? joinClasses(
        "flex flex-col gap-8 md:items-center",
        isMediaLeft ? "md:flex-row-reverse" : "md:flex-row"
      )
    : "flex flex-col gap-4";

  return (
    <div
      className={joinClasses(
        "relative w-full overflow-hidden border px-6",
        radiusClassMap[style.borderRadius ?? "3xl"] ?? "rounded-3xl"
      )}
      style={cardStyle}
    >
      {resolvedBackgroundVideo ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          src={resolvedBackgroundVideo}
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
              !isSplit && contentPlacementClass
            )}
          >
            {badge && badge.placement !== "inline-headline" ? badgeNode : null}
            <h1
              className={joinClasses(
                "font-semibold",
                badge?.placement === "inline-headline" && "flex flex-wrap items-center gap-3",
                headlineSizeClassMap[headlineSize] ?? "text-3xl"
              )}
              style={{ color: headlineColor }}
            >
              {badge?.placement === "inline-headline" ? badgeNode : null}
              <span>{normalized.headline}</span>
            </h1>
            {normalized.subhead ? (
              <p
                className={joinClasses(subheadSizeClassMap[subheadSize] ?? "text-xl")}
                style={{ color: subheadColor }}
              >
                {normalized.subhead}
              </p>
            ) : null}
            {normalized.body ? (
              <p
                className={joinClasses(bodySizeClassMap[bodySize] ?? "text-base")}
                style={{ color: bodyColor }}
              >
                {normalized.body}
              </p>
            ) : null}
            <div
              className={joinClasses(
                "flex w-full flex-wrap items-center gap-3",
                align === "center" && "justify-center",
                align === "right" && "justify-end"
              )}
            >
              {normalized.primaryCta ? (
                <a
                  className={joinClasses(
                    "rounded-md font-semibold",
                    buttonSizeClassMap[primaryButtonSize] ?? "px-4 py-2 text-sm"
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
                    buttonSizeClassMap[secondaryButtonSize] ?? "px-4 py-2 text-sm"
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
          {isSplit ? (
            <div
              className={joinClasses("w-full", "md:flex-1", hideMediaOnMobile && "hidden md:block")}
            >
              <div
                className={joinClasses(
                  "relative overflow-hidden border bg-muted/20",
                  radiusClassMap[style.mediaRadius ?? "2xl"] ?? "rounded-2xl",
                  ratioClassMap[media?.ratio ?? "16:9"] ?? "aspect-video"
                )}
                style={mediaFrameStyle}
              >
                {media?.type === "image" && media.src ? (
                  <img
                    src={media.src}
                    alt={media.alt ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : media?.type === "video" && media.src ? (
                  <video controls src={media?.src} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                    {media?.type === "none" ? "Select media type" : "Add media URL"}
                  </div>
                )}
                {media?.overlay ? (
                  <div className="absolute inset-0" style={{ background: media.overlay }} />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function createHeroWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<HeroData>>;
  visual: ComponentType<WidgetEditorProps<HeroData>>;
  advanced: ComponentType<WidgetEditorProps<HeroData>>;
}): WidgetDefinition<HeroData> {
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
    ],
    schema: heroSchema,
    defaults: heroDefaults,
    editor: editors,
    editorCapabilities: { visualOwnsVariantSelection: true },
    render: HeroBlock,
  };
}
