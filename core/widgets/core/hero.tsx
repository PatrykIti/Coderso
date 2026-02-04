import type { ComponentType, CSSProperties } from "react";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type { WidgetBlock, WidgetDefinition, WidgetEditorProps } from "../types";

export type HeroCta = {
  label: string;
  href: string;
};

export type HeroMedia = {
  type: "none" | "image" | "video";
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
  };
  background?: {
    color?: string;
    gradient?: string;
    image?: string;
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
      },
    },
    background: {
      type: "object",
      additionalProperties: false,
      properties: {
        color: { type: "string" },
        gradient: { type: "string" },
        image: { type: "string" },
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
  media: { type: "none" },
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
  const spacingDefaults = heroDefaults.spacing ?? {
    paddingTop: "xl",
    paddingBottom: "xl",
  };
  const spacing = {
    paddingTop: spacingDefaults.paddingTop,
    paddingBottom: spacingDefaults.paddingBottom,
    ...(data.style ?? {}),
    ...(data.spacing ?? {}),
  };
  const align = layout.align ?? "center";
  const maxWidth = layout.maxWidth ?? "xl";
  const contentWidth = layout.contentWidth ?? "lg";
  const paddingTop = resolveSpacingKey(spacing.paddingTop, spacingDefaults.paddingTop);
  const paddingBottom = resolveSpacingKey(
    spacing.paddingBottom,
    spacingDefaults.paddingBottom
  );
  const background = data.background ?? {};

  const backgroundStyle: CSSProperties = {
    backgroundColor: background.color ?? "transparent",
    backgroundImage: background.image
      ? `${background.gradient ? `${background.gradient}, ` : ""}url(${background.image})`
      : background.gradient,
    backgroundSize: background.image ? "cover" : undefined,
    backgroundPosition: background.image ? "center" : undefined,
    paddingTop: spacingValueMap[paddingTop],
    paddingBottom: spacingValueMap[paddingBottom],
  };

  const media = data.media ?? { type: "none" };
  const showMedia = media.type !== "none";
  const isSplit = variant !== "centered" && showMedia;
  const isMediaLeft = variant === "media-left";
  const hideMediaOnMobile = data.responsive?.hideMediaOnMobile;
  const contentSlots = slots?.content ?? [];

  const alignClass =
    align === "center"
      ? "text-center items-center"
      : align === "right"
        ? "text-right items-end"
        : "text-left items-start";

  return (
    <div
      className={joinClasses(
        "w-full rounded-3xl border border-border/40 px-6"
      )}
      style={backgroundStyle}
    >
      <div className={joinClasses("mx-auto w-full", maxWidthClassMap[maxWidth])}>
        <div
          className={joinClasses(
            isSplit ? "grid items-center gap-8 md:grid-cols-2" : "flex flex-col gap-4",
            alignClass
          )}
        >
          <div className={joinClasses("space-y-4", contentWidthClassMap[contentWidth])}>
            <h1 className="text-3xl font-semibold text-[var(--color-text)]">
              {data.headline}
            </h1>
            {data.subhead ? (
              <p className="text-lg text-[var(--color-text)]/70">{data.subhead}</p>
            ) : null}
            {data.body ? (
              <p className="text-base text-[var(--color-text)]/70">{data.body}</p>
            ) : null}
            <div
              className={joinClasses(
                "flex flex-wrap items-center gap-3",
                align === "center" && "justify-center",
                align === "right" && "justify-end"
              )}
            >
              {data.primaryCta ? (
                <a
                  className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)]"
                  href={data.primaryCta.href}
                >
                  {data.primaryCta.label}
                </a>
              ) : null}
              {data.secondaryCta ? (
                <a
                  className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
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
          {isSplit && showMedia ? (
            <div
              className={joinClasses(
                "w-full",
                isMediaLeft ? "md:order-first" : "md:order-last",
                hideMediaOnMobile && "hidden md:block"
              )}
            >
              <div
                className={joinClasses(
                  "relative overflow-hidden rounded-2xl border border-border/40 bg-muted/20",
                  ratioClassMap[media?.ratio ?? "16:9"] ?? "aspect-video"
                )}
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
                    Add media URL
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
      { id: "split", label: "Split" },
      { id: "media-left", label: "Media Left" },
    ],
    schema: heroSchema,
    defaults: heroDefaults,
    editor: editors,
    render: HeroBlock,
  };
}
