import { CSS_COLOR_SCHEMA_PATTERNS, CSS_COLOR_VALUE_MAX_LENGTH } from "../theme/cssColorContract";
import { resolveClearableCssColorValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export const navigationVariantIds = ["simple", "with-cta", "split"] as const;

export type NavigationVariantId = (typeof navigationVariantIds)[number];

export const navigationMobileModeIds = ["expanded", "drawer", "minimal"] as const;

export type NavigationMobileMode = (typeof navigationMobileModeIds)[number];

export type NavigationLinkTarget = "self" | "blank";

export type NavigationBadgeTone = "default" | "accent" | "success" | "warning" | "danger";

export type NavigationActiveLinkMode = "none" | "pathname" | "exact";

export type NavigationItem = {
  label: string;
  href: string;
  target?: NavigationLinkTarget;
  meta?: NavigationItemMeta;
  children?: NavigationItem[];
};

export type NavigationItemMeta = {
  visibility: "all" | "logged_in" | "logged_out";
  badge: {
    label: string;
    tone: NavigationBadgeTone;
  } | null;
  description: string | null;
  icon: string | null;
  /**
   * Front render affordance (TASK-499-01). Present ONLY for the non-default
   * `"button"` source; the default `"link"` is omitted so existing menu→nav
   * `meta` byte-shapes stay unchanged.
   */
  variant?: "link" | "button";
};

export type NavigationLogo = {
  type: "text" | "image";
  value: string;
  href?: string;
  alt?: string;
  source?: "external" | "library";
  assetId?: string;
};

export type NavigationCta = {
  label: string;
  href: string;
};

export type NavigationBehavior = {
  sticky?: boolean;
  transparent?: boolean;
  collapseOnScroll?: boolean;
  mobileMode?: NavigationMobileMode;
  hideCtaOnMobile?: boolean;
  activeLinkMode?: NavigationActiveLinkMode;
};

export type NavigationStyle = {
  textColor?: string;
  logoColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  linkActiveColor?: string;
  linkUnderline?: "none" | "hover" | "always";
  surfaceColor?: string;
  borderColor?: string;
  borderWidth?: "0" | "1" | "2" | "3";
  ctaTextColor?: string;
  ctaBackgroundColor?: string;
  ctaBorderColor?: string;
  fontSize?: "none" | "xs" | "sm" | "base" | "lg";
  fontWeight?: "none" | "normal" | "medium" | "semibold" | "bold";
  textTransform?: "none" | "uppercase" | "capitalize";
  letterSpacing?: "none" | "wide" | "wider";
  shadow?: "none" | "sm" | "md" | "lg";
  backdropBlur?: "none" | "sm" | "md";
  dropdownDirection?: "bottom" | "top" | "auto";
  motion?: "none" | "subtle" | "standard";
  logoHeight?: "sm" | "md" | "lg" | "xl";
  ctaBorderRadius?: "sm" | "md" | "lg" | "full";
  ctaSeparator?: "none" | "line" | "spacing";
};

export type NavigationData = {
  logo: NavigationLogo;
  items: NavigationItem[];
  cta?: NavigationCta;
  linksSource?: "manual" | "menu" | "pages";
  menuKey?: string;
  behavior?: NavigationBehavior;
  layout?: {
    alignment?: "left" | "center" | "right";
    maxWidth?: "none" | "5xl" | "6xl" | "7xl";
    paddingY?: "none" | "2" | "3" | "4" | "5";
    itemGap?: "none" | "2" | "3" | "4" | "6";
  };
  style?: NavigationStyle;
};

const navigationColorValueSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS["inherited-render"],
    },
  ],
} as const;

export const navigationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["logo", "items"],
  properties: {
    logo: {
      type: "object",
      additionalProperties: false,
      required: ["type", "value"],
      properties: {
        type: { enum: ["text", "image"] },
        value: { type: "string" },
        href: { type: "string" },
        alt: { type: "string" },
        source: { enum: ["external", "library"] },
        assetId: { type: "string" },
      },
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "href"],
        properties: {
          label: { type: "string" },
          href: { type: "string" },
          target: { enum: ["self", "blank"] },
          meta: {
            type: "object",
            additionalProperties: false,
            required: ["visibility", "badge", "description", "icon"],
            properties: {
              visibility: { enum: ["all", "logged_in", "logged_out"] },
              badge: {
                type: ["object", "null"],
                additionalProperties: false,
                required: ["label", "tone"],
                properties: {
                  label: { type: "string" },
                  tone: { enum: ["default", "accent", "success", "warning", "danger"] },
                },
              },
              description: { type: ["string", "null"] },
              icon: { type: ["string", "null"] },
            },
          },
          children: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "href"],
              properties: {
                label: { type: "string" },
                href: { type: "string" },
                target: { enum: ["self", "blank"] },
                meta: {
                  type: "object",
                  additionalProperties: false,
                  required: ["visibility", "badge", "description", "icon"],
                  properties: {
                    visibility: { enum: ["all", "logged_in", "logged_out"] },
                    badge: {
                      type: ["object", "null"],
                      additionalProperties: false,
                      required: ["label", "tone"],
                      properties: {
                        label: { type: "string" },
                        tone: { enum: ["default", "accent", "success", "warning", "danger"] },
                      },
                    },
                    description: { type: ["string", "null"] },
                    icon: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
        },
      },
    },
    cta: {
      type: "object",
      additionalProperties: false,
      required: ["label", "href"],
      properties: {
        label: { type: "string" },
        href: { type: "string" },
      },
    },
    linksSource: { enum: ["manual", "menu", "pages"] },
    menuKey: { type: "string" },
    behavior: {
      type: "object",
      additionalProperties: false,
      properties: {
        sticky: { type: "boolean" },
        transparent: { type: "boolean" },
        collapseOnScroll: { type: "boolean" },
        mobileMode: { enum: navigationMobileModeIds },
        hideCtaOnMobile: { type: "boolean" },
        activeLinkMode: { enum: ["none", "pathname", "exact"] },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        alignment: { enum: ["left", "center", "right"] },
        maxWidth: { enum: ["none", "5xl", "6xl", "7xl"] },
        paddingY: { enum: ["none", "2", "3", "4", "5"] },
        itemGap: { enum: ["none", "2", "3", "4", "6"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        textColor: navigationColorValueSchema,
        logoColor: navigationColorValueSchema,
        linkColor: navigationColorValueSchema,
        linkHoverColor: navigationColorValueSchema,
        linkActiveColor: navigationColorValueSchema,
        linkUnderline: { enum: ["none", "hover", "always"] },
        surfaceColor: navigationColorValueSchema,
        borderColor: navigationColorValueSchema,
        borderWidth: { enum: ["0", "1", "2", "3"] },
        ctaTextColor: navigationColorValueSchema,
        ctaBackgroundColor: navigationColorValueSchema,
        ctaBorderColor: navigationColorValueSchema,
        fontSize: { enum: ["none", "xs", "sm", "base", "lg"] },
        fontWeight: { enum: ["none", "normal", "medium", "semibold", "bold"] },
        textTransform: { enum: ["none", "uppercase", "capitalize"] },
        letterSpacing: { enum: ["none", "wide", "wider"] },
        shadow: { enum: ["none", "sm", "md", "lg"] },
        backdropBlur: { enum: ["none", "sm", "md"] },
        dropdownDirection: { enum: ["bottom", "top", "auto"] },
        motion: { enum: ["none", "subtle", "standard"] },
        logoHeight: { enum: ["sm", "md", "lg", "xl"] },
        ctaBorderRadius: { enum: ["sm", "md", "lg", "full"] },
        ctaSeparator: { enum: ["none", "line", "spacing"] },
      },
    },
  },
};

export const navigationDefaults: NavigationData = {
  logo: { type: "text", value: "Coderso", href: "/", source: "external" },
  items: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Get started", href: "/start" },
  linksSource: "manual",
  behavior: {
    sticky: false,
    transparent: false,
    collapseOnScroll: false,
    mobileMode: "expanded",
    hideCtaOnMobile: false,
    activeLinkMode: "none",
  },
  layout: { alignment: "right", maxWidth: "6xl", paddingY: "4", itemGap: "4" },
  style: {
    surfaceColor: "var(--color-bg)",
    ctaBackgroundColor: "var(--color-primary)",
    ctaTextColor: "var(--color-bg)",
    ctaBorderColor: "transparent",
    linkUnderline: "none",
    shadow: "none",
    backdropBlur: "none",
    dropdownDirection: "bottom",
    motion: "subtle",
    logoHeight: "md",
    ctaBorderRadius: "md",
    ctaSeparator: "none",
  },
};
export const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeNavigationHref = (value: unknown) => {
  const href = normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });
  return href === "#" ? undefined : href;
};

const normalizeNavigationImageHref = (value: unknown) =>
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHttp: true,
  });

const normalizeNavigationTarget = (value: unknown): NavigationLinkTarget =>
  value === "blank" ? "blank" : "self";

function normalizeNavigationItemMeta(meta: NavigationItem["meta"]): NavigationItemMeta | undefined {
  if (!meta) return undefined;
  return {
    visibility:
      meta.visibility === "logged_in" || meta.visibility === "logged_out" ? meta.visibility : "all",
    badge:
      meta.badge && toTrimmedString(meta.badge.label)
        ? {
            label: toTrimmedString(meta.badge.label)!,
            tone:
              meta.badge.tone === "accent" ||
              meta.badge.tone === "success" ||
              meta.badge.tone === "warning" ||
              meta.badge.tone === "danger"
                ? meta.badge.tone
                : "default",
          }
        : null,
    description: toTrimmedString(meta.description ?? undefined) ?? null,
    icon: toTrimmedString(meta.icon ?? undefined) ?? null,
  };
}

const normalizeNavigationActiveLinkMode = (value: unknown): NavigationActiveLinkMode =>
  value === "pathname" || value === "exact" ? value : "none";

const hasStyleKey = (style: NavigationData["style"], key: keyof NavigationStyle) =>
  Boolean(style && Object.prototype.hasOwnProperty.call(style, key));

const normalizeNavigationColorValue = (
  style: NavigationData["style"],
  key: keyof NavigationStyle
) =>
  hasStyleKey(style, key)
    ? resolveClearableCssColorValue(style?.[key], "inherited-render")
    : undefined;

const normalizeNavigationStyle = (style: NavigationData["style"]): NavigationStyle => ({
  ...(style ?? {}),
  ...(hasStyleKey(style, "textColor")
    ? { textColor: normalizeNavigationColorValue(style, "textColor") }
    : {}),
  ...(hasStyleKey(style, "logoColor")
    ? { logoColor: normalizeNavigationColorValue(style, "logoColor") }
    : {}),
  ...(hasStyleKey(style, "linkColor")
    ? { linkColor: normalizeNavigationColorValue(style, "linkColor") }
    : {}),
  ...(hasStyleKey(style, "linkHoverColor")
    ? { linkHoverColor: normalizeNavigationColorValue(style, "linkHoverColor") }
    : {}),
  ...(hasStyleKey(style, "linkActiveColor")
    ? { linkActiveColor: normalizeNavigationColorValue(style, "linkActiveColor") }
    : {}),
  ...(hasStyleKey(style, "surfaceColor")
    ? { surfaceColor: normalizeNavigationColorValue(style, "surfaceColor") }
    : {}),
  ...(hasStyleKey(style, "borderColor")
    ? { borderColor: normalizeNavigationColorValue(style, "borderColor") }
    : {}),
  ...(hasStyleKey(style, "ctaTextColor")
    ? { ctaTextColor: normalizeNavigationColorValue(style, "ctaTextColor") }
    : {}),
  ...(hasStyleKey(style, "ctaBackgroundColor")
    ? { ctaBackgroundColor: normalizeNavigationColorValue(style, "ctaBackgroundColor") }
    : {}),
  ...(hasStyleKey(style, "ctaBorderColor")
    ? { ctaBorderColor: normalizeNavigationColorValue(style, "ctaBorderColor") }
    : {}),
  borderWidth:
    style?.borderWidth === "0" ||
    style?.borderWidth === "1" ||
    style?.borderWidth === "2" ||
    style?.borderWidth === "3"
      ? style.borderWidth
      : undefined,
  fontSize:
    style?.fontSize === "none" ||
    style?.fontSize === "xs" ||
    style?.fontSize === "sm" ||
    style?.fontSize === "base" ||
    style?.fontSize === "lg"
      ? style.fontSize
      : undefined,
  fontWeight:
    style?.fontWeight === "none" ||
    style?.fontWeight === "normal" ||
    style?.fontWeight === "medium" ||
    style?.fontWeight === "semibold" ||
    style?.fontWeight === "bold"
      ? style.fontWeight
      : undefined,
  textTransform:
    style?.textTransform === "none" ||
    style?.textTransform === "uppercase" ||
    style?.textTransform === "capitalize"
      ? style.textTransform
      : undefined,
  linkUnderline:
    style?.linkUnderline === "hover" || style?.linkUnderline === "always"
      ? style.linkUnderline
      : style?.linkUnderline === "none"
        ? "none"
        : undefined,
  letterSpacing:
    style?.letterSpacing === "wide" || style?.letterSpacing === "wider"
      ? style.letterSpacing
      : style?.letterSpacing === "none"
        ? "none"
        : undefined,
  shadow:
    style?.shadow === "sm" || style?.shadow === "md" || style?.shadow === "lg"
      ? style.shadow
      : style?.shadow === "none"
        ? "none"
        : undefined,
  backdropBlur:
    style?.backdropBlur === "sm" || style?.backdropBlur === "md"
      ? style.backdropBlur
      : style?.backdropBlur === "none"
        ? "none"
        : undefined,
  dropdownDirection:
    style?.dropdownDirection === "top" ||
    style?.dropdownDirection === "bottom" ||
    style?.dropdownDirection === "auto"
      ? style.dropdownDirection
      : undefined,
  motion:
    style?.motion === "none" || style?.motion === "standard"
      ? style.motion
      : style?.motion === "subtle"
        ? "subtle"
        : undefined,
  logoHeight:
    style?.logoHeight === "sm" ||
    style?.logoHeight === "md" ||
    style?.logoHeight === "lg" ||
    style?.logoHeight === "xl"
      ? style.logoHeight
      : undefined,
  ctaBorderRadius:
    style?.ctaBorderRadius === "sm" ||
    style?.ctaBorderRadius === "md" ||
    style?.ctaBorderRadius === "lg" ||
    style?.ctaBorderRadius === "full"
      ? style.ctaBorderRadius
      : undefined,
  ctaSeparator:
    style?.ctaSeparator === "line" || style?.ctaSeparator === "spacing"
      ? style.ctaSeparator
      : style?.ctaSeparator === "none"
        ? "none"
        : undefined,
});

function normalizeNavigationItems(items: NavigationData["items"]): NavigationItem[] {
  if (!Array.isArray(items)) return [];
  const normalizeList = (list: NavigationData["items"]): NavigationItem[] => {
    const normalized: NavigationItem[] = [];
    for (const item of list) {
      const label = toTrimmedString(item?.label);
      const href = normalizeNavigationHref(item?.href);
      if (!label || !href) continue;

      const children = Array.isArray(item.children) ? normalizeList(item.children) : undefined;
      normalized.push({
        label,
        href,
        target: normalizeNavigationTarget(item?.target),
        ...(normalizeNavigationItemMeta(item.meta)
          ? { meta: normalizeNavigationItemMeta(item.meta) }
          : {}),
        ...(children && children.length > 0 ? { children } : {}),
      });
    }
    return normalized;
  };

  return normalizeList(items);
}

function normalizeNavigationLogo(logo: NavigationData["logo"]): NavigationData["logo"] {
  const type = logo?.type === "image" ? "image" : "text";
  const value = toTrimmedString(logo?.value);
  const normalizedValue =
    type === "image"
      ? (normalizeNavigationImageHref(value) ?? "")
      : (value ?? navigationDefaults.logo.value ?? "Coderso");

  return {
    ...navigationDefaults.logo,
    ...logo,
    type,
    value: normalizedValue,
    href: normalizeNavigationHref(logo?.href) ?? navigationDefaults.logo.href,
    alt: toTrimmedString(logo?.alt) ?? logo?.alt,
  };
}

export function normalizeNavigationData(data: NavigationData): NavigationData {
  const normalizedItems = normalizeNavigationItems(data.items);
  const ctaLabel = toTrimmedString(data.cta?.label);
  const ctaHref = normalizeNavigationHref(data.cta?.href);
  const baseBehavior = {
    ...navigationDefaults.behavior,
    ...data.behavior,
    activeLinkMode: normalizeNavigationActiveLinkMode(data.behavior?.activeLinkMode),
  } satisfies NavigationBehavior;

  return {
    ...navigationDefaults,
    ...data,
    logo: normalizeNavigationLogo(data.logo),
    items: normalizedItems,
    behavior: baseBehavior,
    style: {
      ...navigationDefaults.style,
      ...normalizeNavigationStyle(data.style),
    },
    ...(ctaLabel && ctaHref ? { cta: { label: ctaLabel, href: ctaHref } } : { cta: undefined }),
  };
}
