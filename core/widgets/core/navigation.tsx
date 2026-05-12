import type { ComponentType, CSSProperties } from "react";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type { DeviceTarget, WidgetDefinition, WidgetEditorProps } from "../types";
import type { WidgetBlock } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export type NavigationItem = {
  label: string;
  href: string;
  meta?: NavigationItemMeta;
  children?: NavigationItem[];
};

export type NavigationItemMeta = {
  visibility: "all" | "logged_in" | "logged_out";
  badge: {
    label: string;
    tone: "default" | "accent" | "success" | "warning" | "danger";
  } | null;
  description: string | null;
  icon: string | null;
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
  mobileMode?: "expanded" | "drawer" | "minimal";
  hideCtaOnMobile?: boolean;
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
  style?: {
    textColor?: string;
    logoColor?: string;
    linkColor?: string;
    surfaceColor?: string;
    borderColor?: string;
    borderWidth?: "0" | "1" | "2" | "3";
    ctaTextColor?: string;
    ctaBackgroundColor?: string;
    ctaBorderColor?: string;
    fontSize?: "none" | "xs" | "sm" | "base" | "lg";
    fontWeight?: "none" | "normal" | "medium" | "semibold" | "bold";
    textTransform?: "none" | "uppercase" | "capitalize";
  };
};

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
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "href"],
        properties: {
          label: { type: "string" },
          href: { type: "string" },
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
                        tone: {
                          enum: ["default", "accent", "success", "warning", "danger"],
                        },
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
        mobileMode: { enum: ["expanded", "drawer", "minimal"] },
        hideCtaOnMobile: { type: "boolean" },
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
        textColor: { type: "string" },
        logoColor: { type: "string" },
        linkColor: { type: "string" },
        surfaceColor: { type: "string" },
        borderColor: { type: "string" },
        borderWidth: { enum: ["0", "1", "2", "3"] },
        ctaTextColor: { type: "string" },
        ctaBackgroundColor: { type: "string" },
        ctaBorderColor: { type: "string" },
        fontSize: { enum: ["none", "xs", "sm", "base", "lg"] },
        fontWeight: { enum: ["none", "normal", "medium", "semibold", "bold"] },
        textTransform: { enum: ["none", "uppercase", "capitalize"] },
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
  },
  layout: { alignment: "right", maxWidth: "6xl", paddingY: "4", itemGap: "4" },
  style: {
    surfaceColor: "var(--color-bg)",
    ctaBackgroundColor: "var(--color-primary)",
    ctaTextColor: "var(--color-bg)",
    ctaBorderColor: "transparent",
  },
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeNavigationHref = (value: unknown) =>
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });

const variantSupportsCta = (variant: string) => variant === "with-cta" || variant === "split";

const maxWidthClassMap = {
  none: "",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

const paddingYClassMap = {
  none: "py-0",
  "2": "py-2",
  "3": "py-3",
  "4": "py-4",
  "5": "py-5",
} as const;

const itemGapClassMap = {
  none: "gap-0",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "6": "gap-6",
} as const;

const fontSizeClassMap = {
  none: "",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
} as const;

const fontWeightClassMap = {
  none: "",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

const textTransformClassMap = {
  none: "normal-case",
  uppercase: "uppercase",
  capitalize: "capitalize",
} as const;

const borderWidthValueMap = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
} as const;

const navigationRuntimeClientScript = `
(() => {
  if (typeof window === "undefined") return;
  if (window.__nextlessNavigationBound === true) return;
  window.__nextlessNavigationBound = true;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest("[data-navigation-mobile-toggle]");
    if (!(trigger instanceof HTMLElement)) return;
    const root = trigger.closest("[data-navigation-widget='1']");
    if (!(root instanceof HTMLElement)) return;
    const panel = root.querySelector("[data-navigation-mobile-panel]");
    if (!(panel instanceof HTMLElement)) return;
    const expanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", expanded ? "false" : "true");
    if (expanded) {
      panel.setAttribute("hidden", "");
    } else {
      panel.removeAttribute("hidden");
    }
  });
})();
`;

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

function normalizeNavigationItems(items: NavigationData["items"]): NavigationItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const label = toTrimmedString(item?.label);
      const href = normalizeNavigationHref(item?.href);
      if (!label || !href) return null;
      const children = Array.isArray(item.children)
        ? item.children
            .map((child) => {
              const childLabel = toTrimmedString(child?.label);
              const childHref = normalizeNavigationHref(child?.href);
              if (!childLabel || !childHref) return null;
              return {
                label: childLabel,
                href: childHref,
                ...(normalizeNavigationItemMeta(child.meta)
                  ? { meta: normalizeNavigationItemMeta(child.meta) }
                  : {}),
              } satisfies NavigationItem;
            })
            .filter((child): child is NavigationItem => child !== null)
        : undefined;
      return {
        label,
        href,
        ...(normalizeNavigationItemMeta(item.meta)
          ? { meta: normalizeNavigationItemMeta(item.meta) }
          : {}),
        ...(children && children.length > 0 ? { children } : {}),
      } satisfies NavigationItem;
    })
    .filter((item): item is NavigationItem => item !== null);
}

export function normalizeNavigationData(data: NavigationData): NavigationData {
  const normalizedItems = normalizeNavigationItems(data.items);
  const ctaLabel = toTrimmedString(data.cta?.label);
  const ctaHref = normalizeNavigationHref(data.cta?.href);

  return {
    ...navigationDefaults,
    ...data,
    logo: {
      ...navigationDefaults.logo,
      ...data.logo,
      value: toTrimmedString(data.logo?.value) ?? navigationDefaults.logo.value,
      href: normalizeNavigationHref(data.logo?.href) ?? navigationDefaults.logo.href,
      alt: toTrimmedString(data.logo?.alt) ?? data.logo?.alt,
    },
    items: normalizedItems,
    ...(ctaLabel && ctaHref ? { cta: { label: ctaLabel, href: ctaHref } } : { cta: undefined }),
  };
}

export function NavigationBlock({
  data,
  variant,
  slots,
  previewDevice,
  blockId,
}: {
  data: NavigationData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  blockId?: string;
}) {
  const normalized = normalizeNavigationData(data);
  const showCta = variantSupportsCta(variant);
  const splitLayout = variant === "split";
  const linksSource = normalized.linksSource ?? "manual";
  const resolvedAlignment =
    normalized.layout?.alignment ?? navigationDefaults.layout?.alignment ?? "left";
  const alignmentClass =
    resolvedAlignment === "center"
      ? "justify-center"
      : resolvedAlignment === "right"
        ? "justify-end"
        : "justify-start";
  const layout = normalized.layout ?? {};
  const style = normalized.style ?? {};
  const behavior = normalized.behavior ?? {};
  const mobileMode = behavior.mobileMode ?? "expanded";
  const linksVisibleOnMobile = mobileMode === "expanded";
  const showMobileToggle = mobileMode !== "expanded";
  const renderedItems = normalized.items.length > 0 ? normalized.items : navigationDefaults.items;
  const rightSlotBlocks = slots?.right ?? [];
  const hasRightActions = rightSlotBlocks.length > 0 || Boolean(showCta && normalized.cta);
  const shouldRenderRightCluster = hasRightActions || showMobileToggle;
  const mobilePanelId = `navigation-mobile-${blockId ?? "panel"}`;
  const borderWidth = style.borderWidth ?? "1";
  const navStyle: CSSProperties =
    compactStyle({
      backgroundColor: behavior.transparent
        ? "transparent"
        : resolveClearableStyleValue(style.surfaceColor),
      borderColor: behavior.transparent
        ? "transparent"
        : (style.borderColor ?? "var(--color-border)"),
      borderBottomStyle: "solid",
      borderBottomWidth: borderWidthValueMap[borderWidth] ?? "1px",
      color: style.textColor ?? "var(--color-text)",
    }) ?? {};

  const logoStyle: CSSProperties =
    normalized.logo.type === "text"
      ? { color: style.logoColor ?? style.textColor ?? "var(--color-text)" }
      : {};

  const linksStyle: CSSProperties = {
    color: style.linkColor ?? style.textColor ?? "var(--color-text)",
  };

  const ctaStyle: CSSProperties =
    compactStyle({
      background: resolveClearableStyleValue(style.ctaBackgroundColor),
      color: style.ctaTextColor ?? "var(--color-bg)",
      borderColor: style.ctaBorderColor ?? "transparent",
      borderStyle: "solid",
      borderWidth:
        style.ctaBorderColor &&
        style.ctaBorderColor !== "transparent" &&
        style.ctaBorderColor !== ""
          ? "1px"
          : "0px",
    }) ?? {};

  const navClass = joinClasses(
    "w-full px-6",
    paddingYClassMap[layout.paddingY ?? "4"] ?? "py-4",
    behavior.sticky && "sticky top-0 z-40"
  );

  return (
    <nav
      className={navClass}
      data-navigation-widget="1"
      data-collapse-on-scroll={behavior.collapseOnScroll ? "true" : undefined}
      data-mobile-mode={mobileMode}
      data-link-source={linksSource}
      data-menu-key={normalized.menuKey ?? undefined}
      style={navStyle}
    >
      <div
        className={joinClasses(
          "mx-auto flex w-full items-center justify-between",
          maxWidthClassMap[layout.maxWidth ?? "6xl"] ?? "max-w-6xl"
        )}
      >
        <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-text)]">
          {normalized.logo.type === "image" ? (
            <img
              src={normalized.logo.value}
              alt={normalized.logo.alt ?? "Logo"}
              className="h-6 w-auto"
            />
          ) : (
            <span style={logoStyle}>{normalized.logo.value}</span>
          )}
        </div>
        <div
          className={joinClasses(
            "flex flex-1 items-center",
            splitLayout ? "justify-center" : alignmentClass
          )}
        >
          <ul
            className={joinClasses(
              "items-center",
              linksVisibleOnMobile ? "flex" : "hidden md:flex",
              itemGapClassMap[layout.itemGap ?? "4"] ?? "gap-4",
              fontSizeClassMap[style.fontSize ?? "sm"] ?? "text-sm",
              fontWeightClassMap[style.fontWeight ?? "medium"] ?? "font-medium",
              textTransformClassMap[style.textTransform ?? "none"] ?? "normal-case"
            )}
            style={linksStyle}
          >
            {renderedItems.map((item, index) => (
              <li key={`${item.href || item.label}-${index}`} className="group relative">
                <a href={item.href}>{item.label}</a>
                {item.children?.length ? (
                  <ul className="absolute left-0 top-full z-20 mt-2 hidden min-w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-sm group-hover:block group-focus-within:block">
                    {item.children.map((child, childIndex) => (
                      <li key={`${child.href || child.label}-${childIndex}`}>
                        <a
                          href={child.href}
                          className="block rounded px-2 py-1 text-sm text-[var(--color-text)]/80 hover:bg-[var(--color-surface)]"
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        {shouldRenderRightCluster ? (
          <div className="flex items-center gap-3 pl-4">
            {showMobileToggle ? (
              <button
                type="button"
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-semibold md:hidden"
                data-navigation-mobile-toggle
                aria-expanded="false"
                aria-controls={mobilePanelId}
              >
                Menu
              </button>
            ) : null}
            {rightSlotBlocks.map((slotBlock) => (
              <WidgetRenderer key={slotBlock.id} block={slotBlock} previewDevice={previewDevice} />
            ))}
            {showCta && normalized.cta ? (
              <a
                className={joinClasses(
                  "rounded-md px-3 py-2 text-xs font-semibold",
                  behavior.hideCtaOnMobile && "hidden md:inline-flex"
                )}
                style={ctaStyle}
                href={normalized.cta.href}
              >
                {normalized.cta.label}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      {showMobileToggle ? (
        <div
          id={mobilePanelId}
          data-navigation-mobile-panel
          hidden
          className="mx-auto mt-3 w-full max-w-6xl rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:hidden"
        >
          <ul
            className={joinClasses(
              "flex flex-col gap-3",
              fontSizeClassMap[style.fontSize ?? "sm"] ?? "text-sm",
              fontWeightClassMap[style.fontWeight ?? "medium"] ?? "font-medium",
              textTransformClassMap[style.textTransform ?? "none"] ?? "normal-case"
            )}
            style={linksStyle}
          >
            {renderedItems.map((item, index) => (
              <li key={`mobile-${item.href || item.label}-${index}`}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
          {showCta && normalized.cta ? (
            <a
              className="mt-4 inline-flex rounded-md px-3 py-2 text-xs font-semibold"
              style={ctaStyle}
              href={normalized.cta.href}
            >
              {normalized.cta.label}
            </a>
          ) : null}
        </div>
      ) : null}
      {showMobileToggle ? (
        <script dangerouslySetInnerHTML={{ __html: navigationRuntimeClientScript }} />
      ) : null}
    </nav>
  );
}

export function createNavigationWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<NavigationData>>;
  visual: ComponentType<WidgetEditorProps<NavigationData>>;
  advanced: ComponentType<WidgetEditorProps<NavigationData>>;
}): WidgetDefinition<NavigationData> {
  return {
    type: "navigation",
    title: "Navigation",
    description: "Site menu with logo and links.",
    category: "navigation",
    slots: [{ id: "right", label: "Right Actions" }],
    variants: [
      { id: "simple", label: "Simple" },
      { id: "with-cta", label: "With CTA" },
      { id: "split", label: "Split" },
    ],
    schema: navigationSchema,
    defaults: navigationDefaults,
    editor: editors,
    editorCapabilities: { visualOwnsVariantSelection: true },
    render: NavigationBlock,
  };
}
