import type { ComponentType, CSSProperties } from "react";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type { WidgetBlock, WidgetDefinition, WidgetEditorProps } from "../types";

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

export type HeroData = {
  headline: string;
  subhead?: string;
  body?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  media?: HeroMedia;
  layout?: {
    align?: "left" | "center" | "right";
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
    contentWidth?: "sm" | "md" | "lg" | "xl";
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
    headlineSize?: "2xl" | "3xl" | "4xl" | "5xl";
    subheadSize?: "base" | "lg" | "xl" | "2xl";
    bodySize?: "sm" | "base" | "lg" | "xl";
    borderColor?: string;
    borderWidth?: "0" | "1" | "2" | "3";
    borderRadius?: "lg" | "xl" | "2xl" | "3xl";
    mediaBorderColor?: string;
    mediaBorderWidth?: "0" | "1" | "2" | "3";
    mediaRadius?: "lg" | "xl" | "2xl" | "3xl";
    primaryButtonBg?: string;
    primaryButtonText?: string;
    primaryButtonBorder?: string;
    primaryButtonSize?: "sm" | "md" | "lg";
    secondaryButtonBg?: string;
    secondaryButtonText?: string;
    secondaryButtonBorder?: string;
    secondaryButtonSize?: "sm" | "md" | "lg";
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
        maxWidth: { enum: ["sm", "md", "lg", "xl", "2xl"] },
        contentWidth: { enum: ["sm", "md", "lg", "xl"] },
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
        headlineSize: { enum: ["2xl", "3xl", "4xl", "5xl"] },
        subheadSize: { enum: ["base", "lg", "xl", "2xl"] },
        bodySize: { enum: ["sm", "base", "lg", "xl"] },
        borderColor: { type: "string" },
        borderWidth: { enum: ["0", "1", "2", "3"] },
        borderRadius: { enum: ["lg", "xl", "2xl", "3xl"] },
        mediaBorderColor: { type: "string" },
        mediaBorderWidth: { enum: ["0", "1", "2", "3"] },
        mediaRadius: { enum: ["lg", "xl", "2xl", "3xl"] },
        primaryButtonBg: { type: "string" },
        primaryButtonText: { type: "string" },
        primaryButtonBorder: { type: "string" },
        primaryButtonSize: { enum: ["sm", "md", "lg"] },
        secondaryButtonBg: { type: "string" },
        secondaryButtonText: { type: "string" },
        secondaryButtonBorder: { type: "string" },
        secondaryButtonSize: { enum: ["sm", "md", "lg"] },
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
  headline: "Build faster with Nextless",
  subhead: "Launch modern sites without rebuilding the app.",
  body: "",
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
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
} as const;

const contentWidthClassMap = {
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
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
} as const;

const subheadSizeClassMap = {
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
} as const;

const bodySizeClassMap = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
} as const;

const buttonSizeClassMap = {
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
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
} as const;

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const resolveSpacingKey = (
  value: string | undefined,
  fallback: keyof typeof spacingValueMap
) => (value && value in spacingValueMap ? (value as keyof typeof spacingValueMap) : fallback);

export function HeroBlock({
  data,
  variant,
  slots,
}: {
  data: HeroData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
}) {
  const layout = data.layout ?? {};
  const media = data.media ?? { type: "none" };
  const spacingDefaults = heroDefaults.spacing ?? {
    paddingTop: "xl",
    paddingBottom: "xl",
  };
  const defaultPaddingTop = spacingDefaults.paddingTop ?? "xl";
  const defaultPaddingBottom = spacingDefaults.paddingBottom ?? "xl";
  const spacing = {
    paddingTop: spacingDefaults.paddingTop,
    paddingBottom: spacingDefaults.paddingBottom,
    ...(data.style ?? {}),
    ...(data.spacing ?? {}),
  };
  const align = layout.align ?? "center";
  const maxWidth = layout.maxWidth ?? "xl";
  const contentWidth = layout.contentWidth ?? "lg";
  const paddingTop = resolveSpacingKey(spacing.paddingTop, defaultPaddingTop);
  const paddingBottom = resolveSpacingKey(spacing.paddingBottom, defaultPaddingBottom);
  const background = data.background ?? {};
  const backgroundMedia = {
    type: background.media?.type ?? (background.image ? "image" : "none"),
    source: background.media?.source ?? "external",
    assetId: background.media?.assetId,
    src: background.media?.src ?? background.image,
  };
  const centeredImageBackground =
    variant === "centered" && media.type === "image" ? media.src : undefined;
  const resolvedBackgroundVideo =
    backgroundMedia.type === "video" ? backgroundMedia.src : undefined;
  const resolvedBackgroundImage =
    backgroundMedia.type === "image"
      ? backgroundMedia.src ?? centeredImageBackground
      : background.image ?? centeredImageBackground;
  const resolvedBackgroundGradient = background.gradient ?? "";
  const centeredMediaOverlay =
    variant === "centered" && media.type === "image" ? media.overlay : undefined;
  const layeredBackground = !resolvedBackgroundVideo && resolvedBackgroundImage
    ? [
        centeredMediaOverlay,
        resolvedBackgroundGradient,
        `url(${resolvedBackgroundImage})`,
      ]
        .filter(Boolean)
        .join(", ")
    : !resolvedBackgroundVideo
      ? resolvedBackgroundGradient || undefined
      : undefined;

  const backgroundStyle: CSSProperties = {
    backgroundColor: background.color ?? "transparent",
    backgroundImage: layeredBackground,
    backgroundSize: resolvedBackgroundImage ? "cover" : undefined,
    backgroundPosition: resolvedBackgroundImage ? "center" : undefined,
    paddingTop: spacingValueMap[paddingTop],
    paddingBottom: spacingValueMap[paddingBottom],
  };
  const style = data.style ?? {};
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
  const primaryButtonStyle: CSSProperties = {
    background: style.primaryButtonBg ?? "var(--color-primary)",
    color: style.primaryButtonText ?? "var(--color-bg)",
    borderColor: style.primaryButtonBorder ?? "transparent",
    borderStyle: "solid",
    borderWidth:
      style.primaryButtonBorder &&
      style.primaryButtonBorder !== "transparent" &&
      style.primaryButtonBorder !== ""
        ? "1px"
        : "0px",
  };
  const secondaryButtonStyle: CSSProperties = {
    background: style.secondaryButtonBg ?? "transparent",
    color: style.secondaryButtonText ?? "var(--color-text)",
    borderColor: style.secondaryButtonBorder ?? "var(--color-border)",
    borderStyle: "solid",
    borderWidth: "1px",
  };

  const isSplit = variant !== "centered";
  const isMediaLeft = variant === "media-left";
  const hideMediaOnMobile = data.responsive?.hideMediaOnMobile;
  const contentSlots = slots?.content ?? [];

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
      {resolvedBackgroundVideo && centeredMediaOverlay ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: centeredMediaOverlay }}
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
            )}
          >
            <h1
              className={joinClasses(
                "font-semibold",
                headlineSizeClassMap[headlineSize] ?? "text-3xl"
              )}
              style={{ color: headlineColor }}
            >
              {data.headline}
            </h1>
            {data.subhead ? (
              <p
                className={joinClasses(
                  subheadSizeClassMap[subheadSize] ?? "text-xl"
                )}
                style={{ color: subheadColor }}
              >
                {data.subhead}
              </p>
            ) : null}
            {data.body ? (
              <p
                className={joinClasses(bodySizeClassMap[bodySize] ?? "text-base")}
                style={{ color: bodyColor }}
              >
                {data.body}
              </p>
            ) : null}
            <div
              className={joinClasses(
                "flex w-full flex-wrap items-center gap-3",
                align === "center" && "justify-center",
                align === "right" && "justify-end"
              )}
            >
              {data.primaryCta ? (
                <a
                  className={joinClasses(
                    "rounded-md font-semibold",
                    buttonSizeClassMap[primaryButtonSize] ?? "px-4 py-2 text-sm"
                  )}
                  style={primaryButtonStyle}
                  href={data.primaryCta.href}
                >
                  {data.primaryCta.label}
                </a>
              ) : null}
              {data.secondaryCta ? (
                <a
                  className={joinClasses(
                    "rounded-md font-semibold",
                    buttonSizeClassMap[secondaryButtonSize] ?? "px-4 py-2 text-sm"
                  )}
                  style={secondaryButtonStyle}
                  href={data.secondaryCta.href}
                >
                  {data.secondaryCta.label}
                </a>
              ) : null}
            </div>
            {contentSlots.length ? (
              <div className="mt-6 flex w-full flex-col gap-4">
                {contentSlots.map((slotBlock) => (
                  <WidgetRenderer key={slotBlock.id} block={slotBlock} />
                ))}
              </div>
            ) : null}
          </div>
          {isSplit ? (
            <div
              className={joinClasses(
                "w-full",
                "md:flex-1",
                hideMediaOnMobile && "hidden md:block"
              )}
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
                  <video
                    controls
                    src={media?.src}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                    {media?.type === "none" ? "Select media type" : "Add media URL"}
                  </div>
                )}
                {media?.overlay ? (
                  <div
                    className="absolute inset-0"
                    style={{ background: media.overlay }}
                  />
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
