import type { ComponentType, CSSProperties, ReactNode } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import { renderSharedWidgetRuntimeScript } from "../runtimeScripts";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import {
  compactStyle,
  resolveClearableCssColorValue,
  resolveClearableStyleValue,
} from "./clearableStyle";
import {
  navigationMobileModeIds,
  navigationVariantIds,
  type NavigationMobileMode,
} from "./navigationContract";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export {
  navigationMobileModeIds,
  navigationVariantIds,
  type NavigationMobileMode,
  type NavigationVariantId,
} from "./navigationContract";

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

const navigationColorValueSchemaPattern = [
  "^\\s*(?:",
  "#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})",
  "|var\\(\\s*--color-[a-zA-Z0-9_-]+\\s*\\)",
  "|[rR][gG][bB][aA]?\\(\\s*\\d{1,3}(?:\\.\\d+)?%?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%?(?:\\s*,\\s*(?:0(?:\\.\\d+)?|1(?:\\.0+)?|\\d{1,3}(?:\\.\\d+)?%))?\\s*\\)",
  "|[hH][sS][lL][aA]?\\(\\s*\\d{1,3}(?:\\.\\d+)?(?:deg)?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%(?:\\s*,\\s*(?:0(?:\\.\\d+)?|1(?:\\.0+)?|\\d{1,3}(?:\\.\\d+)?%))?\\s*\\)",
  "|[tT][rR][aA][nN][sS][pP][aA][rR][eE][nN][tT]",
  "|[cC][uU][rR][rR][eE][nN][tT][cC][oO][lL][oO][rR]",
  "|[iI][nN][hH][eE][rR][iI][tT]",
  ")?\\s*$",
].join("");
const navigationColorValueSchema = {
  type: "string",
  pattern: navigationColorValueSchemaPattern,
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

export const navigationEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "navigation.wizard.starter-menu",
      title: "Starter menu",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["variant", "logo.type", "logo.value", "linksSource", "menuKey"],
    },
    {
      mode: "visual",
      id: "navigation.visual.variant-structure",
      title: "Variant and Structure",
      role: "layout",
      writablePaths: ["variant", "linksSource", "menuKey"],
    },
    {
      mode: "visual",
      id: "navigation.visual.brand-logo",
      title: "Brand and Logo",
      role: "content",
      writablePaths: [
        "logo.type",
        "logo.value",
        "logo.href",
        "logo.alt",
        "logo.source",
        "logo.assetId",
      ],
    },
    {
      mode: "visual",
      id: "navigation.visual.navigation-links",
      title: "Navigation Links",
      role: "content",
      writablePaths: ["behavior.activeLinkMode", "items"],
    },
    {
      mode: "visual",
      id: "navigation.visual.cta-right-actions",
      title: "CTA and Right Actions",
      role: "content",
      writablePaths: ["cta.label", "cta.href"],
    },
    {
      mode: "visual",
      id: "navigation.visual.mobile-behavior",
      title: "Mobile Behavior",
      role: "layout",
      writablePaths: ["behavior.mobileMode", "behavior.hideCtaOnMobile"],
    },
    {
      mode: "visual",
      id: "navigation.visual.colors-borders-typography",
      title: "Colors, Borders, Typography",
      role: "visual",
      writablePaths: [
        "style.surfaceColor",
        "style.borderColor",
        "style.textColor",
        "style.logoColor",
        "style.linkColor",
        "style.linkHoverColor",
        "style.linkActiveColor",
        "style.borderWidth",
        "style.fontSize",
        "style.fontWeight",
        "style.textTransform",
        "style.letterSpacing",
        "style.ctaBackgroundColor",
        "style.ctaTextColor",
        "style.ctaBorderColor",
        "style.linkUnderline",
        "style.shadow",
        "style.backdropBlur",
        "style.dropdownDirection",
        "style.motion",
        "style.logoHeight",
        "style.ctaBorderRadius",
        "style.ctaSeparator",
      ],
    },
    {
      mode: "visual",
      id: "navigation.visual.surface-runtime-behavior",
      title: "Surface and Runtime Behavior",
      role: "layout",
      writablePaths: [
        "layout.alignment",
        "layout.maxWidth",
        "layout.paddingY",
        "layout.itemGap",
        "behavior.transparent",
        "behavior.sticky",
        "behavior.collapseOnScroll",
      ],
    },
    {
      mode: "advanced",
      id: "navigation.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["linksSource", "menuKey", "items", "cta"],
    },
    {
      mode: "advanced",
      id: "navigation.advanced.layout-token-summary",
      title: "Layout token summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["layout.alignment", "layout.maxWidth", "layout.paddingY", "layout.itemGap"],
    },
    {
      mode: "advanced",
      id: "navigation.advanced.runtime-behavior-summary",
      title: "Runtime behavior summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "behavior.sticky",
        "behavior.transparent",
        "behavior.collapseOnScroll",
        "behavior.mobileMode",
        "behavior.hideCtaOnMobile",
        "behavior.activeLinkMode",
      ],
    },
  ],
};

const navigationVariantLabels: Record<(typeof navigationVariantIds)[number], string> = {
  simple: "Simple",
  "with-cta": "With CTA",
  split: "Split",
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const toTrimmedString = (value: unknown) => {
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

const letterSpacingClassMap = {
  none: "",
  wide: "tracking-wide",
  wider: "tracking-wider",
} as const;

const borderWidthValueMap = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
} as const;

const shadowClassMap = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
} as const;

const backdropBlurClassMap = {
  none: "",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
} as const;

const logoHeightClassMap = {
  sm: "h-5",
  md: "h-6",
  lg: "h-8",
  xl: "h-10",
} as const;

const ctaRadiusClassMap = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
} as const;

const badgeToneClassMap: Record<NavigationBadgeTone, string> = {
  default: "bg-muted text-foreground/80",
  accent: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-700",
  warning: "bg-amber-500/10 text-amber-700",
  danger: "bg-rose-500/10 text-rose-700",
};

const rootMotionClassMap = {
  none: "transition-none",
  subtle:
    "transition-[background-color,border-color,box-shadow,padding] duration-150 ease-out motion-reduce:transition-none",
  standard:
    "transition-[background-color,border-color,box-shadow,padding,transform] duration-200 ease-out motion-reduce:transition-none",
} as const;

const surfaceMotionClassMap = {
  none: "transition-none",
  subtle:
    "transition-[opacity,transform,max-height] duration-150 ease-out motion-reduce:transition-none",
  standard:
    "transition-[opacity,transform,max-height] duration-200 ease-out motion-reduce:transition-none",
} as const;

const navigationRootSelector = '[data-navigation-widget="1"]';
const navigationLinkSelector = '[data-navigation-link="1"]';
const navigationSubmenuToggleSelector = '[data-navigation-submenu-toggle="1"]';
const navigationMobileToggleSelector = "[data-navigation-mobile-toggle]";
const navigationMobilePanelSelector = "[data-navigation-mobile-panel]";
const navigationFocusableSelector =
  'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
const navigationDrawerAnimationMs = 180;
const navigationCollapseThreshold = 24;
const navigationCollapseJitter = 16;

type NavigationScrollTarget = Window | HTMLElement;

type NavigationRuntimeBindOptions = {
  scrollTarget?: NavigationScrollTarget | null;
};

const findNavigationRoots = (container: ParentNode): HTMLElement[] => {
  if (typeof HTMLElement === "undefined") return [];
  const roots: HTMLElement[] = [];
  if (container instanceof HTMLElement && container.matches(navigationRootSelector)) {
    roots.push(container);
  }
  roots.push(
    ...Array.from(container.querySelectorAll(navigationRootSelector)).filter(
      (node): node is HTMLElement => node instanceof HTMLElement
    )
  );
  return roots;
};

const getNavigationOwnerDocument = (root: HTMLElement) => root.ownerDocument ?? document;

const getNavigationWindow = (root: HTMLElement) =>
  getNavigationOwnerDocument(root).defaultView ?? window;

const getNavigationScrollY = (target: NavigationScrollTarget) =>
  target instanceof Window ? target.scrollY : target.scrollTop;

const parseNavigationScrollY = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isNavigationCollapsed = (root: HTMLElement) => root.dataset.navigationCollapsed === "true";

function resolveNavigationCollapsedState(
  currentY: number,
  previousY: number,
  wasCollapsed: boolean
): boolean {
  const delta = currentY - previousY;
  if (currentY <= navigationCollapseThreshold) return false;
  if (delta > navigationCollapseJitter) return true;
  if (delta < -navigationCollapseJitter) return false;
  return wasCollapsed;
}

function syncNavigationCollapsedState(root: HTMLElement, collapsed: boolean): void {
  root.dataset.navigationCollapsed = collapsed ? "true" : "false";
  root.classList.toggle("is-navigation-collapsed", collapsed);
}

function shouldStoreNavigationScrollY(currentY: number, previousY: number): boolean {
  return (
    currentY <= navigationCollapseThreshold ||
    Math.abs(currentY - previousY) > navigationCollapseJitter
  );
}

const getNavigationFocusableElements = (container: HTMLElement): HTMLElement[] => {
  if (typeof HTMLElement === "undefined") return [];
  return Array.from(container.querySelectorAll(navigationFocusableSelector)).filter(
    (candidate): candidate is HTMLElement => {
      if (!(candidate instanceof HTMLElement)) return false;
      if (candidate.hidden) return false;
      if (candidate.getAttribute("aria-hidden") === "true") return false;
      return candidate.offsetParent !== null || candidate === container.ownerDocument.activeElement;
    }
  );
};

const parseNavigationRuntimeUrl = (root: HTMLElement, href: string | null) => {
  if (!href || href.startsWith("#")) return null;
  try {
    const ownerWindow = getNavigationWindow(root);
    return new URL(href, ownerWindow.location.origin);
  } catch {
    return null;
  }
};

const resolveNavigationMatchingPath = (
  root: HTMLElement,
  href: string | null,
  mode: string | undefined
) => {
  const parsed = parseNavigationRuntimeUrl(root, href);
  const ownerWindow = getNavigationWindow(root);
  if (!parsed || parsed.origin !== ownerWindow.location.origin) return null;
  const currentPath = ownerWindow.location.pathname.replace(/\/$/, "") || "/";
  const targetPath = parsed.pathname.replace(/\/$/, "") || "/";
  if (mode === "exact") return currentPath === targetPath ? targetPath : null;
  if (mode === "pathname") {
    return targetPath === "/"
      ? currentPath === "/"
        ? targetPath
        : null
      : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
        ? targetPath
        : null;
  }
  return null;
};

export function updateNavigationActiveLinks(root: HTMLElement): void {
  const mode = root.dataset.navigationActiveMode;
  const anchors = Array.from(root.querySelectorAll(navigationLinkSelector));
  const matches: Array<{ anchor: HTMLAnchorElement; path: string }> = [];
  for (const candidate of anchors) {
    if (!(candidate instanceof HTMLAnchorElement)) continue;
    candidate.dataset.navigationActive = "false";
    candidate.removeAttribute("aria-current");
    if (!mode || mode === "none") continue;
    const matchedPath = resolveNavigationMatchingPath(root, candidate.getAttribute("href"), mode);
    if (!matchedPath) continue;
    matches.push({ anchor: candidate, path: matchedPath });
  }

  if (matches.length === 0) return;

  const bestLength = matches.reduce((longest, match) => Math.max(longest, match.path.length), 0);
  for (const match of matches) {
    if (match.path.length !== bestLength) continue;
    match.anchor.dataset.navigationActive = "true";
    match.anchor.setAttribute("aria-current", "page");
  }
}

const resolveNavigationSubmenuPanel = (toggle: HTMLButtonElement): HTMLElement | null => {
  const controls = toggle.getAttribute("aria-controls");
  if (!controls) return null;
  const panel = getNavigationOwnerDocument(toggle).getElementById(controls);
  return panel instanceof HTMLElement ? panel : null;
};

const syncNavigationSubmenuPosition = (toggle: HTMLButtonElement, panel: HTMLElement): void => {
  const configured = panel.dataset.navigationDirection || "bottom";
  if (configured === "top" || configured === "bottom") {
    panel.dataset.navigationPosition = configured;
    return;
  }
  const ownerWindow = getNavigationWindow(toggle);
  const rect = panel.getBoundingClientRect();
  const shouldOpenUp =
    rect.bottom > ownerWindow.innerHeight - 24 && rect.top > ownerWindow.innerHeight / 2;
  panel.dataset.navigationPosition = shouldOpenUp ? "top" : "bottom";
};

const closeNavigationSiblingSubmenus = (
  root: HTMLElement,
  exceptToggle: HTMLButtonElement
): void => {
  for (const candidate of Array.from(root.querySelectorAll(navigationSubmenuToggleSelector))) {
    if (!(candidate instanceof HTMLButtonElement) || candidate === exceptToggle) continue;
    const panel = resolveNavigationSubmenuPanel(candidate);
    if (!panel) continue;
    candidate.dataset.state = "closed";
    candidate.setAttribute("aria-expanded", "false");
    panel.dataset.state = "closed";
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("hidden", "");
  }
};

export function setNavigationSubmenuState(toggle: HTMLButtonElement, open: boolean): void {
  const root = toggle.closest(navigationRootSelector);
  if (!(root instanceof HTMLElement)) return;
  const panel = resolveNavigationSubmenuPanel(toggle);
  if (!panel) return;
  if (open) {
    closeNavigationSiblingSubmenus(root, toggle);
    panel.removeAttribute("hidden");
    syncNavigationSubmenuPosition(toggle, panel);
  } else {
    panel.setAttribute("hidden", "");
  }
  toggle.dataset.state = open ? "open" : "closed";
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  panel.dataset.state = open ? "open" : "closed";
  panel.setAttribute("aria-hidden", open ? "false" : "true");
}

export function closeNavigationSubmenus(root: HTMLElement): void {
  for (const candidate of Array.from(root.querySelectorAll(navigationSubmenuToggleSelector))) {
    if (!(candidate instanceof HTMLButtonElement)) continue;
    setNavigationSubmenuState(candidate, false);
  }
}

const resolveNavigationDrawer = (root: HTMLElement) => {
  const trigger = root.querySelector(navigationMobileToggleSelector);
  const panel = root.querySelector(navigationMobilePanelSelector);
  if (!(trigger instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return null;
  return { trigger, panel };
};

const syncNavigationToggleDecorations = (trigger: HTMLButtonElement, open: boolean): void => {
  trigger.dataset.state = open ? "open" : "closed";
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
  trigger.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  for (const icon of Array.from(trigger.querySelectorAll("[data-navigation-mobile-icon]"))) {
    if (!(icon instanceof HTMLElement)) continue;
    const iconState = icon.dataset.navigationMobileIcon;
    icon.hidden = open ? iconState !== "close" : iconState !== "menu";
  }
  const label = trigger.querySelector("[data-navigation-mobile-label]");
  if (label instanceof HTMLElement) {
    label.textContent = open ? "Close" : "Menu";
  }
};

const clearNavigationPanelCloseTimer = (panel: HTMLElement): void => {
  const timerId = panel.dataset.navigationCloseTimer;
  if (!timerId) return;
  getNavigationWindow(panel).clearTimeout(Number(timerId));
  delete panel.dataset.navigationCloseTimer;
};

const setNavigationPanelOpenState = (panel: HTMLElement, open: boolean): void => {
  clearNavigationPanelCloseTimer(panel);
  panel.dataset.state = open ? "open" : "closed";
  panel.setAttribute("aria-hidden", open ? "false" : "true");
  if ("inert" in panel) {
    panel.inert = !open;
  }
  if (open) {
    panel.hidden = false;
    getNavigationWindow(panel).requestAnimationFrame(() => {
      panel.dataset.state = "open";
    });
  } else {
    const timer = getNavigationWindow(panel).setTimeout(() => {
      panel.hidden = true;
    }, navigationDrawerAnimationMs);
    panel.dataset.navigationCloseTimer = String(timer);
  }
};

const focusFirstNavigationDrawerTarget = (panel: HTMLElement, trigger: HTMLButtonElement): void => {
  const focusable = getNavigationFocusableElements(panel)[0];
  if (focusable instanceof HTMLElement) {
    focusable.focus();
    return;
  }
  if (!panel.hasAttribute("tabindex")) {
    panel.setAttribute("tabindex", "-1");
  }
  panel.focus();
  trigger.blur();
};

export function setNavigationDrawerState(
  root: HTMLElement,
  open: boolean,
  focusTriggerOnClose = true
): void {
  const drawer = resolveNavigationDrawer(root);
  if (!drawer) return;
  const { trigger, panel } = drawer;
  syncNavigationToggleDecorations(trigger, open);
  setNavigationPanelOpenState(panel, open);
  if (open) {
    focusFirstNavigationDrawerTarget(panel, trigger);
    closeNavigationSubmenus(root);
  } else if (focusTriggerOnClose) {
    trigger.focus();
  }
}

export function updateNavigationCollapseState(
  roots: HTMLElement[],
  scrollTarget: NavigationScrollTarget
): void {
  const currentY = getNavigationScrollY(scrollTarget);
  for (const root of roots) {
    if (root.dataset.collapseOnScroll !== "true") continue;
    const previousY = parseNavigationScrollY(root.dataset.navigationLastScrollY, currentY);
    const collapsed = resolveNavigationCollapsedState(
      currentY,
      previousY,
      isNavigationCollapsed(root)
    );
    syncNavigationCollapsedState(root, collapsed);
    if (shouldStoreNavigationScrollY(currentY, previousY)) {
      root.dataset.navigationLastScrollY = String(currentY);
    }
  }
}

export function initializeNavigationRuntimeRoot(
  root: HTMLElement,
  scrollTarget: NavigationScrollTarget
): void {
  const drawer = resolveNavigationDrawer(root);
  if (drawer) {
    syncNavigationToggleDecorations(drawer.trigger, false);
    drawer.panel.hidden = true;
    drawer.panel.dataset.state = "closed";
    drawer.panel.setAttribute("aria-hidden", "true");
    if ("inert" in drawer.panel) {
      drawer.panel.inert = true;
    }
  }
  closeNavigationSubmenus(root);
  updateNavigationActiveLinks(root);
  const currentY = getNavigationScrollY(scrollTarget);
  if (root.dataset.collapseOnScroll === "true") {
    const previousY = parseNavigationScrollY(root.dataset.navigationLastScrollY, 0);
    const collapsed =
      root.dataset.navigationLastScrollY === undefined
        ? currentY > navigationCollapseThreshold || isNavigationCollapsed(root)
        : resolveNavigationCollapsedState(currentY, previousY, isNavigationCollapsed(root));
    syncNavigationCollapsedState(root, collapsed);
  }
  root.dataset.navigationLastScrollY = String(currentY);
}

export function bindNavigationRuntimeRoots(
  container: ParentNode,
  options: NavigationRuntimeBindOptions = {}
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const roots = findNavigationRoots(container);
  const scrollTarget = options.scrollTarget ?? window;
  if (!roots.length) return () => undefined;

  roots.forEach((root) => initializeNavigationRuntimeRoot(root, scrollTarget));
  updateNavigationCollapseState(roots, scrollTarget);

  const ownerDocument = roots[0]?.ownerDocument ?? document;
  const ownerWindow = ownerDocument.defaultView ?? window;

  const handleClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const drawerTrigger = target.closest(navigationMobileToggleSelector);
    if (drawerTrigger instanceof HTMLButtonElement) {
      const root = drawerTrigger.closest(navigationRootSelector);
      if (!(root instanceof HTMLElement) || !roots.includes(root)) return;
      const nextOpen = drawerTrigger.getAttribute("aria-expanded") !== "true";
      setNavigationDrawerState(root, nextOpen, true);
      return;
    }

    const submenuTrigger = target.closest(navigationSubmenuToggleSelector);
    if (submenuTrigger instanceof HTMLButtonElement) {
      const root = submenuTrigger.closest(navigationRootSelector);
      if (!(root instanceof HTMLElement) || !roots.includes(root)) return;
      const nextOpen = submenuTrigger.getAttribute("aria-expanded") !== "true";
      setNavigationSubmenuState(submenuTrigger, nextOpen);
      return;
    }

    for (const root of roots) {
      if (root.contains(target)) continue;
      setNavigationDrawerState(root, false, false);
      closeNavigationSubmenus(root);
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      for (const root of roots) {
        const drawer = resolveNavigationDrawer(root);
        const drawerOpen = drawer?.trigger.getAttribute("aria-expanded") === "true";
        if (drawerOpen) {
          event.preventDefault();
          setNavigationDrawerState(root, false, true);
        }
        for (const toggle of Array.from(root.querySelectorAll(navigationSubmenuToggleSelector))) {
          if (!(toggle instanceof HTMLButtonElement)) continue;
          if (toggle.getAttribute("aria-expanded") !== "true") continue;
          event.preventDefault();
          setNavigationSubmenuState(toggle, false);
          toggle.focus();
        }
      }
      return;
    }

    if (event.key !== "Tab") return;
    for (const root of roots) {
      const drawer = resolveNavigationDrawer(root);
      if (!drawer) continue;
      if (drawer.trigger.getAttribute("aria-expanded") !== "true") continue;
      const focusables = [drawer.trigger, ...getNavigationFocusableElements(drawer.panel)];
      const currentIndex = focusables.indexOf(ownerDocument.activeElement as HTMLElement);
      if (currentIndex === -1 || focusables.length === 0) continue;
      if (event.shiftKey && currentIndex === 0) {
        event.preventDefault();
        focusables[focusables.length - 1]?.focus();
      } else if (!event.shiftKey && currentIndex === focusables.length - 1) {
        event.preventDefault();
        focusables[0]?.focus();
      }
    }
  };

  const handleScroll = () => updateNavigationCollapseState(roots, scrollTarget);
  const handleLocationChange = () => roots.forEach((root) => updateNavigationActiveLinks(root));

  ownerDocument.addEventListener("click", handleClick);
  ownerDocument.addEventListener("keydown", handleKeydown);
  scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
  ownerWindow.addEventListener("popstate", handleLocationChange);
  ownerWindow.addEventListener("hashchange", handleLocationChange);

  return () => {
    ownerDocument.removeEventListener("click", handleClick);
    ownerDocument.removeEventListener("keydown", handleKeydown);
    scrollTarget.removeEventListener("scroll", handleScroll);
    ownerWindow.removeEventListener("popstate", handleLocationChange);
    ownerWindow.removeEventListener("hashchange", handleLocationChange);
  };
}

const navigationRuntimeClientScript = `
(() => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const listenersBound = window.__nextlessNavigationBound === true;
  window.__nextlessNavigationBound = true;

  const DRAWER_ANIMATION_MS = 180;
  const COLLAPSE_THRESHOLD = 24;
  const COLLAPSE_JITTER = 16;
  const focusableSelector = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const getRoots = () =>
    Array.from(document.querySelectorAll('[data-navigation-widget="1"]')).filter(
      (candidate) => candidate instanceof HTMLElement
    );

  const getFocusableElements = (container) =>
    Array.from(container.querySelectorAll(focusableSelector)).filter((candidate) => {
      if (!(candidate instanceof HTMLElement)) return false;
      if (candidate.hidden) return false;
      if (candidate.getAttribute("aria-hidden") === "true") return false;
      return candidate.offsetParent !== null || candidate === document.activeElement;
    });

  const parseScrollY = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const resolveCollapsedState = (currentY, previousY, wasCollapsed) => {
    const delta = currentY - previousY;
    if (currentY <= COLLAPSE_THRESHOLD) return false;
    if (delta > COLLAPSE_JITTER) return true;
    if (delta < -COLLAPSE_JITTER) return false;
    return wasCollapsed;
  };

  const syncCollapsedState = (root, collapsed) => {
    root.dataset.navigationCollapsed = collapsed ? "true" : "false";
    root.classList.toggle("is-navigation-collapsed", collapsed);
  };

  const shouldStoreScrollY = (currentY, previousY) =>
    currentY <= COLLAPSE_THRESHOLD || Math.abs(currentY - previousY) > COLLAPSE_JITTER;

  const parseUrl = (href) => {
    if (!href || href.startsWith("#")) return null;
    try {
      return new URL(href, window.location.origin);
    } catch {
      return null;
    }
  };

  const resolveMatchingPath = (href, mode) => {
    const parsed = parseUrl(href);
    if (!parsed || parsed.origin !== window.location.origin) return null;
    const currentPath = window.location.pathname.replace(/\\/$/, "") || "/";
    const targetPath = parsed.pathname.replace(/\\/$/, "") || "/";
    if (mode === "exact") return currentPath === targetPath ? targetPath : null;
    if (mode === "pathname") {
      return targetPath === "/"
        ? currentPath === "/"
          ? targetPath
          : null
        : currentPath === targetPath || currentPath.startsWith(targetPath + "/")
          ? targetPath
          : null;
    }
    return null;
  };

  const updateActiveLinks = (root) => {
    const mode = root.dataset.navigationActiveMode;
    const anchors = Array.from(root.querySelectorAll('[data-navigation-link="1"]'));
    const matches = [];
    for (const candidate of anchors) {
      if (!(candidate instanceof HTMLAnchorElement)) continue;
      candidate.dataset.navigationActive = "false";
      candidate.removeAttribute("aria-current");
      if (!mode || mode === "none") continue;
      const matchedPath = resolveMatchingPath(candidate.getAttribute("href"), mode);
      if (!matchedPath) continue;
      matches.push({ anchor: candidate, path: matchedPath });
    }

    if (matches.length === 0) return;

    const bestLength = matches.reduce(
      (longest, match) => Math.max(longest, match.path.length),
      0
    );
    for (const match of matches) {
      if (match.path.length !== bestLength) continue;
      match.anchor.dataset.navigationActive = "true";
      match.anchor.setAttribute("aria-current", "page");
    }
  };

  const resolveSubmenuPanel = (toggle) => {
    const controls = toggle.getAttribute("aria-controls");
    if (!controls) return null;
    const panel = document.getElementById(controls);
    return panel instanceof HTMLElement ? panel : null;
  };

  const syncSubmenuPosition = (toggle, panel) => {
    const configured = panel.dataset.navigationDirection || "bottom";
    if (configured === "top" || configured === "bottom") {
      panel.dataset.navigationPosition = configured;
      return;
    }
    const rect = panel.getBoundingClientRect();
    const shouldOpenUp = rect.bottom > window.innerHeight - 24 && rect.top > window.innerHeight / 2;
    panel.dataset.navigationPosition = shouldOpenUp ? "top" : "bottom";
  };

  const closeSiblingSubmenus = (root, exceptToggle) => {
    for (const candidate of root.querySelectorAll('[data-navigation-submenu-toggle="1"]')) {
      if (!(candidate instanceof HTMLButtonElement) || candidate === exceptToggle) continue;
      const panel = resolveSubmenuPanel(candidate);
      if (!panel) continue;
      candidate.dataset.state = "closed";
      candidate.setAttribute("aria-expanded", "false");
      panel.dataset.state = "closed";
      panel.setAttribute("aria-hidden", "true");
      panel.setAttribute("hidden", "");
    }
  };

  const setSubmenuState = (toggle, open) => {
    const root = toggle.closest('[data-navigation-widget="1"]');
    if (!(root instanceof HTMLElement)) return;
    const panel = resolveSubmenuPanel(toggle);
    if (!panel) return;
    if (open) {
      closeSiblingSubmenus(root, toggle);
      panel.removeAttribute("hidden");
      syncSubmenuPosition(toggle, panel);
    } else {
      panel.setAttribute("hidden", "");
    }
    toggle.dataset.state = open ? "open" : "closed";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    panel.dataset.state = open ? "open" : "closed";
    panel.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const closeAllSubmenus = (root) => {
    for (const candidate of root.querySelectorAll('[data-navigation-submenu-toggle="1"]')) {
      if (!(candidate instanceof HTMLButtonElement)) continue;
      setSubmenuState(candidate, false);
    }
  };

  const resolveDrawer = (root) => {
    const trigger = root.querySelector('[data-navigation-mobile-toggle]');
    const panel = root.querySelector('[data-navigation-mobile-panel]');
    if (!(trigger instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return null;
    return { trigger, panel };
  };

  const syncToggleDecorations = (trigger, open) => {
    trigger.dataset.state = open ? "open" : "closed";
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    trigger.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    for (const icon of trigger.querySelectorAll('[data-navigation-mobile-icon]')) {
      if (!(icon instanceof HTMLElement)) continue;
      const iconState = icon.dataset.navigationMobileIcon;
      icon.hidden = open ? iconState !== "close" : iconState !== "menu";
    }
    const label = trigger.querySelector('[data-navigation-mobile-label]');
    if (label instanceof HTMLElement) {
      label.textContent = open ? "Close" : "Menu";
    }
  };

  const clearPanelCloseTimer = (panel) => {
    const timerId = panel.dataset.navigationCloseTimer;
    if (!timerId) return;
    window.clearTimeout(Number(timerId));
    delete panel.dataset.navigationCloseTimer;
  };

  const setPanelOpenState = (panel, open) => {
    clearPanelCloseTimer(panel);
    panel.dataset.state = open ? "open" : "closed";
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if ("inert" in panel) {
      panel.inert = !open;
    }
    if (open) {
      panel.hidden = false;
      requestAnimationFrame(() => {
        panel.dataset.state = "open";
      });
    } else {
      const timer = window.setTimeout(() => {
        panel.hidden = true;
      }, DRAWER_ANIMATION_MS);
      panel.dataset.navigationCloseTimer = String(timer);
    }
  };

  const focusFirstDrawerTarget = (panel, trigger) => {
    const focusable = getFocusableElements(panel)[0];
    if (focusable instanceof HTMLElement) {
      focusable.focus();
      return;
    }
    if (!panel.hasAttribute("tabindex")) {
      panel.setAttribute("tabindex", "-1");
    }
    panel.focus();
    trigger.blur();
  };

  const setDrawerState = (root, open, focusTriggerOnClose = true) => {
    const drawer = resolveDrawer(root);
    if (!drawer) return;
    const { trigger, panel } = drawer;
    syncToggleDecorations(trigger, open);
    setPanelOpenState(panel, open);
    if (open) {
      focusFirstDrawerTarget(panel, trigger);
      closeAllSubmenus(root);
    } else if (focusTriggerOnClose) {
      trigger.focus();
    }
  };

  const updateCollapseState = () => {
    const currentY = window.scrollY;
    for (const root of getRoots()) {
      if (!(root instanceof HTMLElement)) continue;
      if (root.dataset.collapseOnScroll !== "true") continue;
      const previousY = parseScrollY(root.dataset.navigationLastScrollY, currentY);
      const collapsed = resolveCollapsedState(
        currentY,
        previousY,
        root.dataset.navigationCollapsed === "true"
      );
      syncCollapsedState(root, collapsed);
      if (shouldStoreScrollY(currentY, previousY)) {
        root.dataset.navigationLastScrollY = String(currentY);
      }
    }
  };

  const closeRootsOnOutsideClick = (target) => {
    for (const root of getRoots()) {
      if (!(root instanceof HTMLElement)) continue;
      if (root.contains(target)) continue;
      setDrawerState(root, false, false);
      closeAllSubmenus(root);
    }
  };

  if (!listenersBound) {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const drawerTrigger = target.closest('[data-navigation-mobile-toggle]');
      if (drawerTrigger instanceof HTMLButtonElement) {
        const root = drawerTrigger.closest('[data-navigation-widget="1"]');
        if (!(root instanceof HTMLElement)) return;
        const nextOpen = drawerTrigger.getAttribute("aria-expanded") !== "true";
        setDrawerState(root, nextOpen, true);
        return;
      }

      const submenuTrigger = target.closest('[data-navigation-submenu-toggle="1"]');
      if (submenuTrigger instanceof HTMLButtonElement) {
        const nextOpen = submenuTrigger.getAttribute("aria-expanded") !== "true";
        setSubmenuState(submenuTrigger, nextOpen);
        return;
      }

      closeRootsOnOutsideClick(target);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        for (const root of getRoots()) {
          if (!(root instanceof HTMLElement)) continue;
          const drawer = resolveDrawer(root);
          const drawerOpen = drawer?.trigger.getAttribute("aria-expanded") === "true";
          if (drawerOpen) {
            event.preventDefault();
            setDrawerState(root, false, true);
          }
          for (const toggle of root.querySelectorAll('[data-navigation-submenu-toggle="1"]')) {
            if (!(toggle instanceof HTMLButtonElement)) continue;
            if (toggle.getAttribute("aria-expanded") !== "true") continue;
            event.preventDefault();
            setSubmenuState(toggle, false);
            toggle.focus();
          }
        }
        return;
      }

      if (event.key !== "Tab") return;
      for (const root of getRoots()) {
        const drawer = resolveDrawer(root);
        if (!drawer) continue;
        if (drawer.trigger.getAttribute("aria-expanded") !== "true") continue;
        const focusables = [drawer.trigger, ...getFocusableElements(drawer.panel)];
        const currentIndex = focusables.indexOf(document.activeElement);
        if (currentIndex === -1 || focusables.length === 0) continue;
        if (event.shiftKey && currentIndex === 0) {
          event.preventDefault();
          focusables[focusables.length - 1]?.focus();
        } else if (!event.shiftKey && currentIndex === focusables.length - 1) {
          event.preventDefault();
          focusables[0]?.focus();
        }
      }
    });

    window.addEventListener("scroll", updateCollapseState, { passive: true });
    window.addEventListener("popstate", () => {
      for (const root of getRoots()) {
        updateActiveLinks(root);
      }
    });
    window.addEventListener("hashchange", () => {
      for (const root of getRoots()) {
        updateActiveLinks(root);
      }
    });
  }

  for (const root of getRoots()) {
    if (!(root instanceof HTMLElement)) continue;
    const drawer = resolveDrawer(root);
    if (drawer) {
      syncToggleDecorations(drawer.trigger, false);
      drawer.panel.hidden = true;
      drawer.panel.dataset.state = "closed";
      drawer.panel.setAttribute("aria-hidden", "true");
      if ("inert" in drawer.panel) {
        drawer.panel.inert = true;
      }
    }
    closeAllSubmenus(root);
    updateActiveLinks(root);
    if (root.dataset.collapseOnScroll === "true") {
      const currentY = window.scrollY;
      const previousY = parseScrollY(root.dataset.navigationLastScrollY, 0);
      const collapsed =
        root.dataset.navigationLastScrollY === undefined
          ? currentY > COLLAPSE_THRESHOLD || root.dataset.navigationCollapsed === "true"
          : resolveCollapsedState(
              currentY,
              previousY,
              root.dataset.navigationCollapsed === "true"
            );
      syncCollapsedState(root, collapsed);
    }
    root.dataset.navigationLastScrollY = String(window.scrollY);
  }

  updateCollapseState();
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

const normalizeNavigationActiveLinkMode = (value: unknown): NavigationActiveLinkMode =>
  value === "pathname" || value === "exact" ? value : "none";

const hasStyleKey = (style: NavigationData["style"], key: keyof NavigationStyle) =>
  Boolean(style && Object.prototype.hasOwnProperty.call(style, key));

const normalizeNavigationColorValue = (
  style: NavigationData["style"],
  key: keyof NavigationStyle
) => (hasStyleKey(style, key) ? resolveClearableCssColorValue(style?.[key]) : undefined);

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

function resolveLinkProps(item: NavigationItem) {
  const target = item.target === "blank" ? "_blank" : undefined;
  return {
    href: item.href,
    target,
    rel: target ? "noopener noreferrer" : undefined,
  };
}

export function NavigationBlock({
  data,
  variant,
  slots,
  previewDevice,
  blockId,
  renderContext,
}: {
  data: NavigationData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  blockId?: string;
  renderContext?: WidgetRenderContext;
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
  const stickyEnabled = Boolean(behavior.sticky || behavior.collapseOnScroll);
  const outerSurfaceOwnsSticky =
    stickyEnabled && renderContext?.stickySurfaceOwner === "widget-renderer";
  const navOwnsSticky = stickyEnabled && !outerSurfaceOwnsSticky;
  const mobileMode = behavior.mobileMode ?? "expanded";
  const isDrawerMode = mobileMode === "drawer";
  const isMinimalMode = mobileMode === "minimal";
  const linksVisibleOnMobile = mobileMode === "expanded";
  const showMobileToggle = isDrawerMode;
  const renderedItems = normalized.items;
  const hasInteractiveSubmenus = renderedItems.some((item) => (item.children?.length ?? 0) > 0);
  const rightSlotBlocks = slots?.right ?? [];
  const hasRightActions = rightSlotBlocks.length > 0 || Boolean(showCta && normalized.cta);
  const shouldRenderRightCluster = hasRightActions || showMobileToggle;
  const rootId = blockId ?? "navigation";
  const mobilePanelId = `${rootId}-mobile-panel`;
  const borderWidth = style.borderWidth ?? "1";
  const textClass = joinClasses(
    fontSizeClassMap[style.fontSize ?? "sm"] ?? "text-sm",
    fontWeightClassMap[style.fontWeight ?? "medium"] ?? "font-medium",
    textTransformClassMap[style.textTransform ?? "none"] ?? "normal-case",
    letterSpacingClassMap[style.letterSpacing ?? "none"] ?? ""
  );
  const navStyle =
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
      ["--navigation-link-color" as keyof CSSProperties]:
        style.linkColor ?? style.textColor ?? "var(--color-text)",
      ["--navigation-link-hover-color" as keyof CSSProperties]:
        style.linkHoverColor ?? style.linkColor ?? style.textColor ?? "var(--color-text)",
      ["--navigation-link-active-color" as keyof CSSProperties]:
        style.linkActiveColor ??
        style.linkHoverColor ??
        style.linkColor ??
        style.textColor ??
        "var(--color-text)",
      top: navOwnsSticky ? "var(--coderso-preview-banner-offset, 0px)" : undefined,
    }) ?? {};

  const logoStyle: CSSProperties = {
    color: style.logoColor ?? style.textColor ?? "var(--color-text)",
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
    navOwnsSticky && "sticky z-40",
    shadowClassMap[style.shadow ?? "none"],
    backdropBlurClassMap[style.backdropBlur ?? "none"],
    rootMotionClassMap[style.motion ?? "subtle"],
    ["3", "4", "5"].includes(layout.paddingY ?? "4") && "data-[navigation-collapsed=true]:py-2",
    "data-[navigation-collapsed=true]:shadow-md"
  );

  const logoHref = normalized.logo.href ?? "/";
  const hasLogoImage = normalized.logo.type === "image" && normalized.logo.value.trim().length > 0;
  const logoAccessibleName =
    normalized.logo.type === "image"
      ? (toTrimmedString(normalized.logo.alt) ?? "Logo")
      : normalized.logo.value;
  const linkUnderlineClass =
    style.linkUnderline === "always"
      ? "underline underline-offset-4"
      : style.linkUnderline === "hover"
        ? "hover:underline data-[navigation-active=true]:underline underline-offset-4"
        : "";

  const linkClass = joinClasses(
    "inline-flex items-center gap-2 rounded-sm text-[var(--navigation-link-color)] transition-colors motion-reduce:transition-none",
    "hover:text-[var(--navigation-link-hover-color)] data-[navigation-active=true]:text-[var(--navigation-link-active-color)]",
    linkUnderlineClass
  );

  const dropdownDirection = style.dropdownDirection ?? "bottom";
  const motionClass = surfaceMotionClassMap[style.motion ?? "subtle"];

  const renderNavigationLabel = (item: NavigationItem) => (
    <span className="inline-flex min-w-0 flex-col">
      <span className="inline-flex min-w-0 items-center gap-2">
        {item.meta?.icon ? (
          <span
            aria-hidden="true"
            className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted/50 px-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/70"
          >
            {item.meta.icon}
          </span>
        ) : null}
        <span className="min-w-0 truncate">{item.label}</span>
        {item.meta?.badge ? (
          <span
            className={joinClasses(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              badgeToneClassMap[item.meta.badge.tone]
            )}
          >
            {item.meta.badge.label}
          </span>
        ) : null}
      </span>
      {item.meta?.description ? (
        <span className="mt-0.5 text-left text-xs text-[var(--color-text)]/70">
          {item.meta.description}
        </span>
      ) : null}
    </span>
  );

  const renderSubmenuList = (
    items: NavigationItem[],
    panelId: string,
    mobile = false
  ): ReactNode => (
    <ul
      id={panelId}
      data-navigation-submenu-panel="1"
      data-navigation-direction={mobile ? "bottom" : dropdownDirection}
      data-navigation-position={mobile ? "bottom" : dropdownDirection === "top" ? "top" : "bottom"}
      data-state="closed"
      hidden
      className={joinClasses(
        mobile
          ? "mt-2 space-y-2 rounded-md border border-border/60 bg-background/60 p-3"
          : "absolute left-0 z-20 min-w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2",
        mobile
          ? ""
          : "data-[navigation-position=bottom]:top-full data-[navigation-position=bottom]:mt-2 data-[navigation-position=top]:bottom-full data-[navigation-position=top]:mb-2",
        motionClass,
        "data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 data-[state=closed]:-translate-y-1",
        "data-[state=open]:pointer-events-auto data-[state=open]:opacity-100 data-[state=open]:translate-y-0"
      )}
      aria-hidden="true"
    >
      {items.map((child, childIndex) => {
        const childProps = resolveLinkProps(child);
        return (
          <li key={`${child.href || child.label}-${childIndex}`}>
            <a
              {...childProps}
              data-navigation-link="1"
              data-navigation-active="false"
              className={joinClasses(
                "block rounded-md px-3 py-2 text-left text-[var(--navigation-link-color)] transition-colors motion-reduce:transition-none",
                "hover:bg-[var(--color-surface)]/70 hover:text-[var(--navigation-link-hover-color)]",
                "data-[navigation-active=true]:bg-[var(--color-surface)]/70 data-[navigation-active=true]:text-[var(--navigation-link-active-color)]"
              )}
            >
              {renderNavigationLabel(child)}
            </a>
          </li>
        );
      })}
    </ul>
  );

  const renderNavigationItem = (item: NavigationItem, index: number, mobile = false): ReactNode => {
    const itemProps = resolveLinkProps(item);
    const submenuId = `${rootId}-${mobile ? "mobile" : "desktop"}-submenu-${index}`;
    const hasChildren = Boolean(item.children?.length);

    return (
      <li
        key={`${mobile ? "mobile" : "desktop"}-${item.href || item.label}-${index}`}
        className={joinClasses("relative", mobile ? "space-y-2" : "group")}
      >
        <div className={joinClasses("flex items-start gap-2", mobile && "justify-between")}>
          <a
            {...itemProps}
            data-navigation-link="1"
            data-navigation-active="false"
            className={joinClasses(linkClass, mobile ? "min-w-0 flex-1 py-1" : "py-1")}
          >
            {renderNavigationLabel(item)}
          </a>
          {hasChildren ? (
            <button
              type="button"
              data-navigation-submenu-toggle="1"
              data-state="closed"
              aria-expanded="false"
              aria-controls={submenuId}
              aria-label={`Toggle ${item.label} submenu`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-[var(--navigation-link-color)] transition-colors hover:bg-muted/50 hover:text-[var(--navigation-link-hover-color)]"
            >
              <span aria-hidden="true">{mobile ? "+" : "▾"}</span>
            </button>
          ) : null}
        </div>
        {hasChildren ? renderSubmenuList(item.children ?? [], submenuId, mobile) : null}
      </li>
    );
  };

  const headerCtaClass = joinClasses(
    ctaRadiusClassMap[style.ctaBorderRadius ?? "md"],
    "px-3 py-2 text-xs font-semibold",
    behavior.hideCtaOnMobile && "hidden md:inline-flex",
    !behavior.hideCtaOnMobile && isDrawerMode && "hidden md:inline-flex"
  );

  const ctaClusterClass = joinClasses(
    "flex items-center gap-3",
    style.ctaSeparator === "line"
      ? "border-l border-[var(--color-border)] pl-4"
      : style.ctaSeparator === "spacing"
        ? "pl-4"
        : ""
  );

  return (
    <nav
      className={navClass}
      data-navigation-widget="1"
      data-navigation-sticky={stickyEnabled ? "true" : undefined}
      data-navigation-collapsed="false"
      data-collapse-on-scroll={behavior.collapseOnScroll ? "true" : undefined}
      data-mobile-mode={mobileMode}
      data-link-source={linksSource}
      data-menu-configured={normalized.menuKey ? "true" : undefined}
      data-navigation-active-mode={behavior.activeLinkMode ?? "none"}
      style={navStyle}
      aria-label="Primary navigation"
    >
      <div
        className={joinClasses(
          "mx-auto flex w-full items-center justify-between gap-4",
          maxWidthClassMap[layout.maxWidth ?? "6xl"] ?? "max-w-6xl"
        )}
      >
        <a
          href={logoHref}
          className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--navigation-link-hover-color)]"
          aria-label={`${logoAccessibleName} home`}
        >
          {hasLogoImage ? (
            <img
              src={normalized.logo.value}
              alt={normalized.logo.alt ?? "Logo"}
              className={joinClasses(
                logoHeightClassMap[style.logoHeight ?? "md"] ?? "h-6",
                "w-auto"
              )}
            />
          ) : (
            <span
              data-navigation-logo-missing-image={
                normalized.logo.type === "image" ? "true" : undefined
              }
              style={logoStyle}
            >
              {normalized.logo.type === "image" ? logoAccessibleName : normalized.logo.value}
            </span>
          )}
        </a>

        <div
          className={joinClasses(
            "flex flex-1 items-center",
            splitLayout ? "justify-center" : alignmentClass
          )}
        >
          <ul
            className={joinClasses(
              "items-center",
              linksVisibleOnMobile ? "flex" : isMinimalMode ? "hidden md:flex" : "hidden md:flex",
              itemGapClassMap[layout.itemGap ?? "4"] ?? "gap-4",
              textClass
            )}
          >
            {renderedItems.map((item, index) => renderNavigationItem(item, index, false))}
          </ul>
        </div>

        {shouldRenderRightCluster ? (
          <div className="flex items-center gap-3 pl-4">
            {showMobileToggle ? (
              <button
                type="button"
                className={joinClasses(
                  "inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--navigation-link-color)] md:hidden",
                  "transition-colors hover:bg-muted/50 hover:text-[var(--navigation-link-hover-color)]"
                )}
                data-navigation-mobile-toggle
                data-state="closed"
                aria-expanded="false"
                aria-controls={mobilePanelId}
                aria-label="Open navigation menu"
              >
                <span data-navigation-mobile-icon="menu" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-none stroke-current"
                    strokeWidth="2"
                  >
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </span>
                <span data-navigation-mobile-icon="close" aria-hidden="true" hidden>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-none stroke-current"
                    strokeWidth="2"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </span>
                <span data-navigation-mobile-label>Menu</span>
              </button>
            ) : null}

            {rightSlotBlocks.map((slotBlock) => (
              <WidgetRenderer
                key={slotBlock.id}
                block={slotBlock}
                previewDevice={previewDevice}
                renderContext={renderContext}
              />
            ))}

            {showCta && normalized.cta ? (
              <div className={ctaClusterClass}>
                <a className={headerCtaClass} style={ctaStyle} href={normalized.cta.href}>
                  {normalized.cta.label}
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showMobileToggle ? (
        <div
          id={mobilePanelId}
          data-navigation-mobile-panel
          data-state="closed"
          hidden
          aria-hidden="true"
          className={joinClasses(
            "mx-auto mt-3 w-full max-w-6xl overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 md:hidden",
            motionClass,
            "data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 data-[state=closed]:-translate-y-2",
            "data-[state=open]:pointer-events-auto data-[state=open]:opacity-100 data-[state=open]:translate-y-0"
          )}
        >
          <ul className={joinClasses("flex flex-col gap-3", textClass)}>
            {renderedItems.map((item, index) => renderNavigationItem(item, index, true))}
          </ul>
          {showCta && normalized.cta && !behavior.hideCtaOnMobile ? (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <a
                className={joinClasses(
                  ctaRadiusClassMap[style.ctaBorderRadius ?? "md"],
                  "inline-flex px-3 py-2 text-xs font-semibold"
                )}
                style={ctaStyle}
                href={normalized.cta.href}
              >
                {normalized.cta.label}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {(showMobileToggle ||
        hasInteractiveSubmenus ||
        behavior.collapseOnScroll ||
        behavior.activeLinkMode !== "none") &&
        renderSharedWidgetRuntimeScript({
          renderContext,
          id: "navigation",
          source: navigationRuntimeClientScript,
        })}
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
    variants: navigationVariantIds.map((id) => ({ id, label: navigationVariantLabels[id] })),
    schema: navigationSchema,
    defaults: navigationDefaults,
    editor: editors,
    editorContract: navigationEditorContract,
    editorCapabilities: { visualOwnsVariantSelection: true },
    render: NavigationBlock,
  };
}
