import type { ComponentType, CSSProperties } from "react";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import type { WidgetBlock } from "../types";

export type NavigationItem = {
  label: string;
  href: string;
  children?: Array<{
    label: string;
    href: string;
  }>;
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
  linksSource?: "manual" | "menu";
  menuKey?: string;
  behavior?: NavigationBehavior;
  layout?: {
    alignment?: "left" | "center" | "right";
    maxWidth?: "5xl" | "6xl" | "7xl";
    paddingY?: "2" | "3" | "4" | "5";
    itemGap?: "2" | "3" | "4" | "6";
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
    fontSize?: "xs" | "sm" | "base" | "lg";
    fontWeight?: "normal" | "medium" | "semibold" | "bold";
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
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "href"],
        properties: {
          label: { type: "string" },
          href: { type: "string" },
          children: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "href"],
              properties: {
                label: { type: "string" },
                href: { type: "string" },
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
    linksSource: { enum: ["manual", "menu"] },
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
        maxWidth: { enum: ["5xl", "6xl", "7xl"] },
        paddingY: { enum: ["2", "3", "4", "5"] },
        itemGap: { enum: ["2", "3", "4", "6"] },
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
        fontSize: { enum: ["xs", "sm", "base", "lg"] },
        fontWeight: { enum: ["normal", "medium", "semibold", "bold"] },
        textTransform: { enum: ["none", "uppercase", "capitalize"] },
      },
    },
  },
};

export const navigationDefaults: NavigationData = {
  logo: { type: "text", value: "Nextless", href: "/", source: "external" },
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
  layout: { alignment: "left", maxWidth: "6xl", paddingY: "4", itemGap: "4" },
  style: {},
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const variantSupportsCta = (variant: string) =>
  variant === "with-cta" || variant === "split";

const maxWidthClassMap = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

const paddingYClassMap = {
  "2": "py-2",
  "3": "py-3",
  "4": "py-4",
  "5": "py-5",
} as const;

const itemGapClassMap = {
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "6": "gap-6",
} as const;

const fontSizeClassMap = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
} as const;

const fontWeightClassMap = {
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

export function NavigationBlock({
  data,
  variant,
  slots,
}: {
  data: NavigationData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
}) {
  const showCta = variantSupportsCta(variant);
  const splitLayout = variant === "split";
  const linksSource = data.linksSource ?? "manual";
  const alignmentClass =
    data.layout?.alignment === "center"
      ? "justify-center"
      : data.layout?.alignment === "right"
        ? "justify-end"
        : "justify-start";
  const layout = data.layout ?? {};
  const style = data.style ?? {};
  const behavior = data.behavior ?? {};
  const mobileMode = behavior.mobileMode ?? "expanded";
  const linksVisibleOnMobile = mobileMode === "expanded";
  const showMobileToggle = mobileMode !== "expanded";
  const renderedItems = data.items.length > 0 ? data.items : navigationDefaults.items;
  const rightSlotBlocks = slots?.right ?? [];
  const hasRightActions = rightSlotBlocks.length > 0 || Boolean(showCta && data.cta);
  const borderWidth = style.borderWidth ?? "1";
  const navStyle: CSSProperties = {
    backgroundColor: behavior.transparent
      ? "transparent"
      : style.surfaceColor ?? "var(--color-bg)",
    borderColor: behavior.transparent
      ? "transparent"
      : style.borderColor ?? "var(--color-border)",
    borderBottomStyle: "solid",
    borderBottomWidth: borderWidthValueMap[borderWidth] ?? "1px",
    color: style.textColor ?? "var(--color-text)",
  };

  const logoStyle: CSSProperties =
    data.logo.type === "text"
      ? { color: style.logoColor ?? style.textColor ?? "var(--color-text)" }
      : {};

  const linksStyle: CSSProperties = {
    color: style.linkColor ?? style.textColor ?? "var(--color-text)",
  };

  const ctaStyle: CSSProperties = {
    background: style.ctaBackgroundColor ?? "var(--color-primary)",
    color: style.ctaTextColor ?? "var(--color-bg)",
    borderColor: style.ctaBorderColor ?? "transparent",
    borderStyle: "solid",
    borderWidth:
      style.ctaBorderColor &&
      style.ctaBorderColor !== "transparent" &&
      style.ctaBorderColor !== ""
        ? "1px"
        : "0px",
  };

  const navClass = joinClasses(
    "w-full px-6",
    paddingYClassMap[layout.paddingY ?? "4"] ?? "py-4",
    behavior.sticky && "sticky top-0 z-40"
  );

  return (
    <nav
      className={navClass}
      data-collapse-on-scroll={behavior.collapseOnScroll ? "true" : undefined}
      data-mobile-mode={mobileMode}
      data-link-source={linksSource}
      data-menu-key={data.menuKey ?? undefined}
      style={navStyle}
    >
      <div
        className={joinClasses(
          "mx-auto flex w-full items-center justify-between",
          maxWidthClassMap[layout.maxWidth ?? "6xl"] ?? "max-w-6xl"
        )}
      >
        <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-text)]">
          {data.logo.type === "image" ? (
            <img src={data.logo.value} alt={data.logo.alt ?? "Logo"} className="h-6 w-auto" />
          ) : (
            <span style={logoStyle}>{data.logo.value}</span>
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
        {hasRightActions ? (
          <div className="flex items-center gap-3 pl-4">
            {showMobileToggle ? (
              <button
                type="button"
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-semibold md:hidden"
              >
                Menu
              </button>
            ) : null}
            {rightSlotBlocks.map((slotBlock) => (
              <WidgetRenderer key={slotBlock.id} block={slotBlock} />
            ))}
            {showCta && data.cta ? (
              <a
                className={joinClasses(
                  "rounded-md px-3 py-2 text-xs font-semibold",
                  behavior.hideCtaOnMobile && "hidden md:inline-flex"
                )}
                style={ctaStyle}
                href={data.cta.href}
              >
                {data.cta.label}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
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
