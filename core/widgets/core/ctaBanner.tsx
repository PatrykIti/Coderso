import { ArrowRight, ChevronRight, ExternalLink } from "lucide-react";
import type { CSSProperties, ComponentType, ReactNode } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref, resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type CtaBannerVariantId = "centered" | "split" | "with-badge";
export type CtaBannerBorderWidth = "0" | "1" | "2" | "3";
export type CtaBannerRadius = "none" | "md" | "lg" | "xl" | "2xl";
export type CtaBannerPadding = "none" | "sm" | "md" | "lg" | "xl";
export type CtaButtonRadius = "inherit" | "none" | "md" | "lg" | "xl" | "2xl" | "pill";
export type CtaButtonSize = "none" | "sm" | "md" | "lg";
export type CtaActionIcon = "none" | "arrow-right" | "chevron-right" | "external-link";
export type CtaBackgroundMediaType = "none" | "image";
export type CtaBackgroundMediaSource = "library" | "external";
export type CtaBackgroundMediaFit = "cover" | "contain";
export type CtaBackgroundMediaPosition = "center" | "top" | "bottom";
export type CtaMotionPreset = "none" | "fade-in" | "slide-up";

export type CtaBannerAction = {
  label?: string;
  href?: string;
  enabled?: boolean;
  openInNewTab?: boolean;
  icon?: CtaActionIcon;
};

export type CtaBannerData = {
  content?: {
    badge?: string;
    title?: string;
    description?: string;
    showDescription?: boolean;
  };
  actions?: {
    primaryCta?: CtaBannerAction;
    secondaryCta?: CtaBannerAction;
    tertiaryCta?: CtaBannerAction;
  };
  style?: {
    background?: string;
    text?: string;
    border?: string;
    borderWidth?: CtaBannerBorderWidth;
    radius?: CtaBannerRadius;
    padding?: CtaBannerPadding;
    badgeBackground?: string;
    badgeText?: string;
    primaryButtonBg?: string;
    primaryButtonText?: string;
    primaryButtonBorder?: string;
    secondaryButtonBg?: string;
    secondaryButtonText?: string;
    secondaryButtonBorder?: string;
    buttonRadius?: CtaButtonRadius;
    primaryButtonSize?: CtaButtonSize;
    secondaryButtonSize?: CtaButtonSize;
  };
  background?: {
    color?: string;
    gradient?: string;
    media?: {
      type?: CtaBackgroundMediaType;
      source?: CtaBackgroundMediaSource;
      assetId?: string;
      src?: string;
      fit?: CtaBackgroundMediaFit;
      position?: CtaBackgroundMediaPosition;
    };
  };
  motion?: {
    preset?: CtaMotionPreset;
  };
};

type NormalizedCtaBannerAction = Required<
  Pick<CtaBannerAction, "enabled" | "openInNewTab" | "icon">
> & {
  label: string;
  href: string;
};

const ctaHrefOptions = {
  allowRelative: true,
  allowHash: true,
  allowHttp: true,
} as const;

const backgroundHrefOptions = {
  allowRelative: true,
  allowHttp: true,
} as const;

const linearGradientPattern =
  /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)$/;

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const radiusClassMap: Record<CtaBannerRadius, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const buttonRadiusClassMap: Record<Exclude<CtaButtonRadius, "inherit" | "pill">, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const paddingClassMap: Record<CtaBannerPadding, string> = {
  none: "p-0",
  sm: "px-4 py-4",
  md: "px-5 py-5",
  lg: "px-6 py-6",
  xl: "px-7 py-7",
};

const buttonSizeClassMap: Record<CtaButtonSize, string> = {
  none: "",
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

const borderWidthValueMap: Record<CtaBannerBorderWidth, string> = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
};

const motionClassMap: Record<CtaMotionPreset, string | undefined> = {
  none: undefined,
  "fade-in":
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none",
  "slide-up":
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none",
};

export const ctaBannerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    content: {
      type: "object",
      additionalProperties: false,
      properties: {
        badge: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        showDescription: { type: "boolean" },
      },
    },
    actions: {
      type: "object",
      additionalProperties: false,
      properties: {
        primaryCta: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            href: { type: "string" },
            enabled: { type: "boolean" },
            openInNewTab: { type: "boolean" },
            icon: { enum: ["none", "arrow-right", "chevron-right", "external-link"] },
          },
        },
        secondaryCta: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            href: { type: "string" },
            enabled: { type: "boolean" },
            openInNewTab: { type: "boolean" },
            icon: { enum: ["none", "arrow-right", "chevron-right", "external-link"] },
          },
        },
        tertiaryCta: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            href: { type: "string" },
            enabled: { type: "boolean" },
            openInNewTab: { type: "boolean" },
            icon: { enum: ["none", "arrow-right", "chevron-right", "external-link"] },
          },
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        background: { type: "string" },
        text: { type: "string" },
        border: { type: "string" },
        borderWidth: { enum: ["0", "1", "2", "3"] },
        radius: { enum: ["none", "md", "lg", "xl", "2xl"] },
        padding: { enum: ["none", "sm", "md", "lg", "xl"] },
        badgeBackground: { type: "string" },
        badgeText: { type: "string" },
        primaryButtonBg: { type: "string" },
        primaryButtonText: { type: "string" },
        primaryButtonBorder: { type: "string" },
        secondaryButtonBg: { type: "string" },
        secondaryButtonText: { type: "string" },
        secondaryButtonBorder: { type: "string" },
        buttonRadius: { enum: ["inherit", "none", "md", "lg", "xl", "2xl", "pill"] },
        primaryButtonSize: { enum: ["none", "sm", "md", "lg"] },
        secondaryButtonSize: { enum: ["none", "sm", "md", "lg"] },
      },
    },
    background: {
      type: "object",
      additionalProperties: false,
      properties: {
        color: { type: "string" },
        gradient: { type: "string" },
        media: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { enum: ["none", "image"] },
            source: { enum: ["library", "external"] },
            assetId: { type: "string" },
            src: { type: "string" },
            fit: { enum: ["cover", "contain"] },
            position: { enum: ["center", "top", "bottom"] },
          },
        },
      },
    },
    motion: {
      type: "object",
      additionalProperties: false,
      properties: {
        preset: { enum: ["none", "fade-in", "slide-up"] },
      },
    },
  },
};

export const ctaBannerDefaults: CtaBannerData = {
  content: {
    badge: "Limited offer",
    title: "Ready to launch your next campaign?",
    description: "Use reusable sections and publish faster with consistent design.",
    showDescription: true,
  },
  actions: {
    primaryCta: {
      label: "Get started",
      href: "#",
      enabled: true,
      openInNewTab: false,
      icon: "none",
    },
    secondaryCta: {
      label: "Contact sales",
      href: "#",
      enabled: true,
      openInNewTab: false,
      icon: "none",
    },
    tertiaryCta: {
      label: "",
      href: "",
      enabled: false,
      openInNewTab: false,
      icon: "none",
    },
  },
  style: {
    background: "var(--color-surface)",
    text: "var(--color-text)",
    border: "var(--color-border)",
    borderWidth: "1",
    radius: "xl",
    padding: "md",
    badgeBackground: "var(--color-primary)",
    badgeText: "var(--color-bg)",
    primaryButtonBg: "var(--color-primary)",
    primaryButtonText: "var(--color-bg)",
    primaryButtonBorder: "transparent",
    secondaryButtonBg: "transparent",
    secondaryButtonText: "var(--color-text)",
    secondaryButtonBorder: "var(--color-border)",
    primaryButtonSize: "md",
    secondaryButtonSize: "md",
  },
  background: {
    color: "var(--color-surface)",
    media: {
      type: "none",
      source: "external",
      fit: "cover",
      position: "center",
    },
  },
  motion: {
    preset: "none",
  },
};

const ctaBannerWizardVisualDuplicateAllowances = [
  {
    path: "variant",
    reason: "Wizard seeds the conversion layout until one-time setup hides replayed fields.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "content.title",
    reason: "Wizard seeds primary CTA copy; Visual remains the daily content owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "content.description",
    reason: "Wizard seeds supporting copy; Visual remains the daily content owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "actions.primaryCta.label",
    reason: "Wizard seeds the primary action; Visual remains the daily action owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "actions.primaryCta.href",
    reason: "Wizard seeds the primary action; Visual remains the daily action owner.",
    expiresWithTask: "TASK-336-16",
  },
] satisfies NonNullable<WidgetEditorContract["sections"][number]["allowedDuplicateWritablePaths"]>;

export const ctaBannerEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "cta-banner.wizard.starter-conversion",
      title: "Starter conversion",
      role: "setup",
      writablePaths: [
        "variant",
        "content.title",
        "content.description",
        "actions.primaryCta.label",
        "actions.primaryCta.href",
      ],
      allowedDuplicateWritablePaths: ctaBannerWizardVisualDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "cta-banner.visual.copy-actions",
      title: "Copy and actions",
      role: "content",
      writablePaths: [
        "variant",
        "content.badge",
        "content.title",
        "content.description",
        "content.showDescription",
        "actions.primaryCta.label",
        "actions.primaryCta.href",
        "actions.primaryCta.enabled",
        "actions.primaryCta.openInNewTab",
        "actions.primaryCta.icon",
        "actions.secondaryCta.label",
        "actions.secondaryCta.href",
        "actions.secondaryCta.enabled",
        "actions.secondaryCta.openInNewTab",
        "actions.secondaryCta.icon",
        "actions.tertiaryCta.label",
        "actions.tertiaryCta.href",
        "actions.tertiaryCta.enabled",
        "actions.tertiaryCta.openInNewTab",
        "actions.tertiaryCta.icon",
      ],
      allowedDuplicateWritablePaths: ctaBannerWizardVisualDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "cta-banner.visual.presentation",
      title: "Presentation",
      role: "visual",
      writablePaths: [
        "style.background",
        "style.text",
        "style.border",
        "style.borderWidth",
        "style.radius",
        "style.padding",
        "style.badgeBackground",
        "style.badgeText",
        "style.primaryButtonBg",
        "style.primaryButtonText",
        "style.primaryButtonBorder",
        "style.secondaryButtonBg",
        "style.secondaryButtonText",
        "style.secondaryButtonBorder",
        "style.buttonRadius",
        "style.primaryButtonSize",
        "style.secondaryButtonSize",
        "background.color",
        "background.gradient",
        "background.media.type",
        "background.media.source",
        "background.media.assetId",
        "background.media.src",
        "background.media.fit",
        "background.media.position",
        "motion.preset",
      ],
    },
    {
      mode: "advanced",
      id: "cta-banner.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "content", "actions", "style", "background", "motion"],
    },
  ],
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const trimText = (value: string | undefined) => (value ?? "").trim();

const resolveOptionalStyleToken = <TValue extends string>(
  style: Record<string, unknown> | undefined,
  key: string,
  fallback: TValue
) => {
  if (!style) return fallback;
  if (!Object.prototype.hasOwnProperty.call(style, key)) return undefined;
  const value = style[key];
  return typeof value === "string" ? value : undefined;
};

const resolveCtaActionIcon = (value: string | undefined): CtaActionIcon => {
  if (value === "arrow-right" || value === "chevron-right" || value === "external-link") {
    return value;
  }
  return "none";
};

const resolveCtaBackgroundGradient = (value: string | undefined) =>
  typeof value === "string" && linearGradientPattern.test(value.trim()) ? value.trim() : undefined;

const normalizeActionHref = (value: string | undefined, fallback: string) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return normalizeWidgetSafeHref(trimmed, ctaHrefOptions) ?? fallback;
  }
  return fallback;
};

const normalizeAction = (
  action: CtaBannerAction | undefined,
  fallback: Required<CtaBannerAction>,
  defaultEnabled: boolean
): NormalizedCtaBannerAction => ({
  label: resolveString(action?.label, fallback.label),
  href: normalizeActionHref(action?.href, fallback.href),
  enabled: typeof action?.enabled === "boolean" ? action.enabled : defaultEnabled,
  openInNewTab:
    typeof action?.openInNewTab === "boolean" ? action.openInNewTab : fallback.openInNewTab,
  icon: resolveCtaActionIcon(action?.icon ?? fallback.icon),
});

const resolveCtaBannerBorderWidth = (value: string | undefined): CtaBannerBorderWidth => {
  if (value === "0" || value === "1" || value === "2" || value === "3") return value;
  return "1";
};

const resolveCtaBannerRadius = (value: string | undefined): CtaBannerRadius => {
  if (value === "none" || value === "md" || value === "lg" || value === "xl" || value === "2xl") {
    return value;
  }
  return "xl";
};

const resolveCtaBannerPadding = (value: string | undefined): CtaBannerPadding => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return "md";
};

const resolveCtaButtonRadius = (
  value: string | undefined,
  containerRadius: CtaBannerRadius
): string => {
  if (value === undefined) return "rounded-md";
  if (value === "inherit") return radiusClassMap[containerRadius] ?? "";
  if (value === "pill") return "rounded-full";
  if (value === "none" || value === "md" || value === "lg" || value === "xl" || value === "2xl") {
    return buttonRadiusClassMap[value];
  }
  return "rounded-md";
};

const resolveCtaButtonSize = (value: string | undefined): CtaButtonSize => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg") return value;
  return "md";
};

const resolveCtaBackgroundMediaType = (value: string | undefined): CtaBackgroundMediaType =>
  value === "image" ? "image" : "none";

const resolveCtaBackgroundMediaSource = (value: string | undefined): CtaBackgroundMediaSource =>
  value === "library" ? "library" : "external";

const resolveCtaBackgroundMediaFit = (value: string | undefined): CtaBackgroundMediaFit =>
  value === "contain" ? "contain" : "cover";

const resolveCtaBackgroundMediaPosition = (
  value: string | undefined
): CtaBackgroundMediaPosition => (value === "top" || value === "bottom" ? value : "center");

const resolveCtaMotionPreset = (value: string | undefined): CtaMotionPreset =>
  value === "fade-in" || value === "slide-up" ? value : "none";

export const resolveCtaBannerVariant = (variant: string): CtaBannerVariantId => {
  if (variant === "split" || variant === "with-badge") return variant;
  return "centered";
};

export function normalizeCtaBannerData(data: CtaBannerData): CtaBannerData {
  const contentDefaults = ctaBannerDefaults.content ?? {
    badge: "",
    title: "",
    description: "",
    showDescription: true,
  };
  const actionsDefaults = ctaBannerDefaults.actions ?? {
    primaryCta: {
      label: "",
      href: "#",
      enabled: true,
      openInNewTab: false,
      icon: "none",
    },
    secondaryCta: {
      label: "",
      href: "#",
      enabled: true,
      openInNewTab: false,
      icon: "none",
    },
    tertiaryCta: {
      label: "",
      href: "",
      enabled: false,
      openInNewTab: false,
      icon: "none",
    },
  };
  const styleDefaults = ctaBannerDefaults.style ?? {
    background: "var(--color-surface)",
    text: "var(--color-text)",
    border: "var(--color-border)",
    borderWidth: "1",
    radius: "xl",
    padding: "md",
    badgeBackground: "var(--color-primary)",
    badgeText: "var(--color-bg)",
    primaryButtonBg: "var(--color-primary)",
    primaryButtonText: "var(--color-bg)",
    primaryButtonBorder: "transparent",
    secondaryButtonBg: "transparent",
    secondaryButtonText: "var(--color-text)",
    secondaryButtonBorder: "var(--color-border)",
    primaryButtonSize: "md",
    secondaryButtonSize: "md",
  };
  const backgroundDefaults = ctaBannerDefaults.background ?? {
    color: "var(--color-surface)",
    media: {
      type: "none" as const,
      source: "external" as const,
      fit: "cover" as const,
      position: "center" as const,
    },
  };
  const motionDefaults = ctaBannerDefaults.motion ?? { preset: "none" as const };

  const hasStyleObject = data.style !== undefined;
  const normalizedStyleBackground = hasStyleObject
    ? resolveClearableStyleValue(data.style?.background)
    : styleDefaults.background;
  const backgroundColor =
    resolveClearableStyleValue(data.background?.color) ?? normalizedStyleBackground;
  const backgroundMediaSrc = normalizeWidgetSafeHref(
    data.background?.media?.src,
    backgroundHrefOptions
  );

  return {
    content: {
      badge: resolveString(data.content?.badge, contentDefaults.badge ?? ""),
      title: resolveString(data.content?.title, contentDefaults.title ?? ""),
      description: resolveString(data.content?.description, contentDefaults.description ?? ""),
      showDescription:
        typeof data.content?.showDescription === "boolean"
          ? data.content.showDescription
          : (contentDefaults.showDescription ?? true),
    },
    actions: {
      primaryCta: normalizeAction(
        data.actions?.primaryCta,
        (actionsDefaults.primaryCta ?? {
          label: "Get started",
          href: "#",
          enabled: true,
          openInNewTab: false,
          icon: "none",
        }) as Required<CtaBannerAction>,
        true
      ),
      secondaryCta: normalizeAction(
        data.actions?.secondaryCta,
        (actionsDefaults.secondaryCta ?? {
          label: "Contact sales",
          href: "#",
          enabled: true,
          openInNewTab: false,
          icon: "none",
        }) as Required<CtaBannerAction>,
        true
      ),
      tertiaryCta: normalizeAction(
        data.actions?.tertiaryCta,
        (actionsDefaults.tertiaryCta ?? {
          label: "",
          href: "",
          enabled: false,
          openInNewTab: false,
          icon: "none",
        }) as Required<CtaBannerAction>,
        false
      ),
    },
    style: {
      background: normalizedStyleBackground,
      text: resolveOptionalStyleToken(
        data.style as Record<string, unknown> | undefined,
        "text",
        styleDefaults.text ?? "var(--color-text)"
      ),
      border: resolveString(data.style?.border, styleDefaults.border ?? "var(--color-border)"),
      borderWidth: resolveCtaBannerBorderWidth(data.style?.borderWidth),
      radius: resolveCtaBannerRadius(data.style?.radius),
      padding: resolveCtaBannerPadding(data.style?.padding),
      badgeBackground: hasStyleObject
        ? resolveClearableStyleValue(data.style?.badgeBackground)
        : styleDefaults.badgeBackground,
      badgeText: resolveOptionalStyleToken(
        data.style as Record<string, unknown> | undefined,
        "badgeText",
        styleDefaults.badgeText ?? "var(--color-bg)"
      ),
      primaryButtonBg: hasStyleObject
        ? resolveClearableStyleValue(data.style?.primaryButtonBg)
        : styleDefaults.primaryButtonBg,
      primaryButtonText: resolveOptionalStyleToken(
        data.style as Record<string, unknown> | undefined,
        "primaryButtonText",
        styleDefaults.primaryButtonText ?? "var(--color-bg)"
      ),
      primaryButtonBorder: resolveString(
        data.style?.primaryButtonBorder,
        styleDefaults.primaryButtonBorder ?? "transparent"
      ),
      secondaryButtonBg: hasStyleObject
        ? resolveClearableStyleValue(data.style?.secondaryButtonBg)
        : styleDefaults.secondaryButtonBg,
      secondaryButtonText: resolveOptionalStyleToken(
        data.style as Record<string, unknown> | undefined,
        "secondaryButtonText",
        styleDefaults.secondaryButtonText ?? "var(--color-text)"
      ),
      secondaryButtonBorder: resolveString(
        data.style?.secondaryButtonBorder,
        styleDefaults.secondaryButtonBorder ?? "var(--color-border)"
      ),
      buttonRadius:
        data.style?.buttonRadius === "inherit" ||
        data.style?.buttonRadius === "none" ||
        data.style?.buttonRadius === "md" ||
        data.style?.buttonRadius === "lg" ||
        data.style?.buttonRadius === "xl" ||
        data.style?.buttonRadius === "2xl" ||
        data.style?.buttonRadius === "pill"
          ? data.style.buttonRadius
          : undefined,
      primaryButtonSize: resolveCtaButtonSize(
        data.style?.primaryButtonSize ?? styleDefaults.primaryButtonSize
      ),
      secondaryButtonSize: resolveCtaButtonSize(
        data.style?.secondaryButtonSize ?? styleDefaults.secondaryButtonSize
      ),
    },
    background: {
      color: backgroundColor,
      gradient: resolveCtaBackgroundGradient(data.background?.gradient),
      media: {
        type: resolveCtaBackgroundMediaType(data.background?.media?.type),
        source: resolveCtaBackgroundMediaSource(
          data.background?.media?.source ?? backgroundDefaults.media?.source
        ),
        assetId:
          typeof data.background?.media?.assetId === "string" &&
          data.background.media.assetId.trim().length > 0
            ? data.background.media.assetId
            : undefined,
        src: backgroundMediaSrc,
        fit: resolveCtaBackgroundMediaFit(
          data.background?.media?.fit ?? backgroundDefaults.media?.fit
        ),
        position: resolveCtaBackgroundMediaPosition(
          data.background?.media?.position ?? backgroundDefaults.media?.position
        ),
      },
    },
    motion: {
      preset: resolveCtaMotionPreset(data.motion?.preset ?? motionDefaults.preset),
    },
  };
}

function resolveCtaTitleId(blockId: string | undefined, hasTitle: boolean) {
  if (!hasTitle || trimText(blockId).length === 0) return undefined;
  return `${blockId}-cta-title`;
}

function resolveActionIconNode(icon: CtaActionIcon): ReactNode {
  const className = "h-4 w-4";
  if (icon === "arrow-right") return <ArrowRight aria-hidden="true" className={className} />;
  if (icon === "chevron-right") return <ChevronRight aria-hidden="true" className={className} />;
  if (icon === "external-link") return <ExternalLink aria-hidden="true" className={className} />;
  return null;
}

function resolveBackgroundStyle(data: CtaBannerData): CSSProperties {
  const normalized = normalizeCtaBannerData(data);
  const background = normalized.background ?? {};
  const backgroundMedia = background.media;
  const image =
    backgroundMedia?.type === "image"
      ? normalizeWidgetSafeHref(backgroundMedia.src, backgroundHrefOptions)
      : undefined;

  return (
    compactStyle({
      backgroundColor: resolveClearableStyleValue(background.color),
      backgroundImage: image
        ? [background.gradient, `url(${image})`].filter(Boolean).join(", ")
        : background.gradient,
      backgroundSize: image ? (backgroundMedia?.fit ?? "cover") : undefined,
      backgroundPosition: image ? (backgroundMedia?.position ?? "center") : undefined,
    }) ?? {}
  );
}

export function CtaBannerBlock({
  data,
  variant,
  blockId,
}: {
  data: CtaBannerData;
  variant: string;
  blockId?: string;
}) {
  const normalized = normalizeCtaBannerData(data);
  const resolvedVariant = resolveCtaBannerVariant(variant);
  const style = normalized.style ?? ctaBannerDefaults.style!;
  const content = normalized.content ?? ctaBannerDefaults.content!;
  const actions = normalized.actions ?? ctaBannerDefaults.actions!;
  const motionPreset = resolveCtaMotionPreset(normalized.motion?.preset);
  const hasStyleObject = normalized.style !== undefined;

  const hasBadge = trimText(content.badge).length > 0;
  const hasTitle = trimText(content.title).length > 0;
  const showDescription =
    (content.showDescription ?? true) && trimText(content.description).length > 0;
  const titleId = resolveCtaTitleId(blockId, hasTitle);
  const borderWidth = resolveCtaBannerBorderWidth(style.borderWidth);
  const buttonRadiusClass = resolveCtaButtonRadius(style.buttonRadius, style.radius ?? "xl");

  const wrapperClassName =
    resolvedVariant === "split"
      ? "flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      : "flex flex-col items-center gap-4 text-center";

  const actionsClassName =
    resolvedVariant === "split"
      ? "flex flex-wrap items-center gap-3 md:justify-end"
      : "flex flex-wrap items-center justify-center gap-3";

  const containerStyle: CSSProperties = {
    ...(compactStyle({
      color: style.text ?? "var(--color-text)",
      borderColor: style.border ?? "var(--color-border)",
      borderStyle: "solid",
      borderWidth: borderWidthValueMap[borderWidth],
    }) ?? {}),
    ...resolveBackgroundStyle(normalized),
  };

  const descriptionStyle =
    compactStyle({
      color: style.text ?? "var(--color-text)",
      opacity: 0.8,
    }) ?? {};

  const primaryLinkAttrs = resolveWidgetLinkAttrs(actions.primaryCta?.href, {
    ...ctaHrefOptions,
    openInNewTab: actions.primaryCta?.openInNewTab,
  });
  const secondaryLinkAttrs = resolveWidgetLinkAttrs(actions.secondaryCta?.href, {
    ...ctaHrefOptions,
    openInNewTab: actions.secondaryCta?.openInNewTab,
  });
  const tertiaryLinkAttrs = resolveWidgetLinkAttrs(actions.tertiaryCta?.href, {
    ...ctaHrefOptions,
    openInNewTab: actions.tertiaryCta?.openInNewTab,
  });

  const hasPrimary =
    actions.primaryCta?.enabled !== false &&
    trimText(actions.primaryCta?.label).length > 0 &&
    primaryLinkAttrs;
  const hasSecondary =
    actions.secondaryCta?.enabled !== false &&
    trimText(actions.secondaryCta?.label).length > 0 &&
    secondaryLinkAttrs;
  const hasTertiary =
    actions.tertiaryCta?.enabled !== false &&
    trimText(actions.tertiaryCta?.label).length > 0 &&
    tertiaryLinkAttrs;

  const primaryButtonStyle: CSSProperties =
    compactStyle({
      backgroundColor: hasStyleObject
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
      backgroundColor: hasStyleObject
        ? resolveClearableStyleValue(style.secondaryButtonBg)
        : "transparent",
      color: style.secondaryButtonText ?? "var(--color-text)",
      borderColor: style.secondaryButtonBorder ?? "var(--color-border)",
      borderStyle: "solid",
      borderWidth: "1px",
    }) ?? {};

  return (
    <section
      aria-labelledby={titleId}
      aria-label={titleId ? undefined : "Call to action"}
      className={joinClasses("w-full px-4 py-8", motionClassMap[motionPreset])}
      style={motionPreset === "none" ? undefined : { animationDuration: "500ms" }}
      data-cta-banner-outer="true"
      data-cta-banner-motion={motionPreset}
    >
      <div
        className={joinClasses(
          "w-full",
          borderWidth === "0" ? undefined : "border",
          radiusClassMap[resolveCtaBannerRadius(style.radius)],
          paddingClassMap[resolveCtaBannerPadding(style.padding)]
        )}
        style={containerStyle}
        data-cta-banner-variant={resolvedVariant}
        data-cta-banner-padding={resolveCtaBannerPadding(style.padding)}
        data-cta-banner-border-width={borderWidth}
      >
        <div className={wrapperClassName}>
          <div
            className={joinClasses(
              "space-y-2",
              resolvedVariant === "split" ? "md:max-w-2xl" : "max-w-2xl"
            )}
          >
            {hasBadge ? (
              <span
                className="inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                style={compactStyle({
                  backgroundColor: resolveClearableStyleValue(style.badgeBackground),
                  color: style.badgeText ?? "var(--color-bg)",
                })}
                data-cta-banner-badge="true"
              >
                {content.badge}
              </span>
            ) : null}

            {hasTitle ? (
              <h3 id={titleId} className="text-2xl font-semibold">
                {content.title}
              </h3>
            ) : null}
            {showDescription ? (
              <p className="text-sm" style={descriptionStyle}>
                {content.description}
              </p>
            ) : null}
          </div>

          <div className={actionsClassName}>
            {hasPrimary && primaryLinkAttrs ? (
              <a
                {...primaryLinkAttrs}
                className={joinClasses(
                  "inline-flex items-center gap-2 border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2",
                  buttonRadiusClass,
                  buttonSizeClassMap[resolveCtaButtonSize(style.primaryButtonSize)]
                )}
                style={primaryButtonStyle}
                data-cta-button="primary"
              >
                <span>{actions.primaryCta?.label}</span>
                {resolveActionIconNode(actions.primaryCta?.icon ?? "none")}
              </a>
            ) : null}
            {hasSecondary && secondaryLinkAttrs ? (
              <a
                {...secondaryLinkAttrs}
                className={joinClasses(
                  "inline-flex items-center gap-2 border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2",
                  buttonRadiusClass,
                  buttonSizeClassMap[resolveCtaButtonSize(style.secondaryButtonSize)]
                )}
                style={secondaryButtonStyle}
                data-cta-button="secondary"
              >
                <span>{actions.secondaryCta?.label}</span>
                {resolveActionIconNode(actions.secondaryCta?.icon ?? "none")}
              </a>
            ) : null}
            {hasTertiary && tertiaryLinkAttrs ? (
              <a
                {...tertiaryLinkAttrs}
                className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2"
                style={compactStyle({ color: style.text ?? "var(--color-text)" })}
                data-cta-button="tertiary"
              >
                <span>{actions.tertiaryCta?.label}</span>
                {resolveActionIconNode(actions.tertiaryCta?.icon ?? "none")}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function createCtaBannerWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<CtaBannerData>>;
  visual: ComponentType<WidgetEditorProps<CtaBannerData>>;
  advanced: ComponentType<WidgetEditorProps<CtaBannerData>>;
}): WidgetDefinition<CtaBannerData> {
  return {
    type: "cta-banner",
    title: "CTA Banner",
    description: "Compact conversion strip with headline and CTA actions.",
    category: "content",
    variants: [
      {
        id: "centered",
        label: "Centered",
        description: "Centered copy and actions for balanced CTA emphasis.",
      },
      {
        id: "split",
        label: "Split",
        description: "Copy on the left and actions on the right.",
      },
      {
        id: "with-badge",
        label: "With Badge",
        description: "CTA with highlighted badge above heading.",
      },
    ],
    schema: ctaBannerSchema,
    defaults: ctaBannerDefaults,
    editor: editors,
    editorContract: ctaBannerEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: CtaBannerBlock,
  };
}
