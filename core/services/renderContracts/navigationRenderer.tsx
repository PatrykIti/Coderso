import { Fragment, type CSSProperties, type ReactNode } from "react";

import { compactStyle, resolveClearableCssColorValue } from "./clearableStyle";
import { navigationRuntimeClientScript } from "./navigationRuntime";
import {
  normalizeNavigationData,
  navigationDefaults,
  toTrimmedString,
  type NavigationBadgeTone,
  type NavigationData,
  type NavigationItem,
} from "./navigationContract";
import { renderSharedWidgetRuntimeScript } from "./runtimeScriptRegistry";
import type { RuntimeScriptRegistry } from "./runtimeScriptRegistry";

// Slot children are rendered through a caller-provided renderBlock so this module
// stays decoupled from the v1 widget kernel (core/widgets/**). The v1 renderer
// always supplies renderBlock; standalone callers may render slots themselves.
export type NavigationSlotBlock = { id: string; [key: string]: unknown };

export type NavigationRenderContext = {
  runtimeScripts?: RuntimeScriptRegistry;
  stickySurfaceOwner?: string;
  [key: string]: unknown;
};

// Re-export the shared navigation contract surface so non-widget consumers
// (site, services, admin) import everything from one renderer home.
export {
  navigationDefaults,
  navigationMobileModeIds,
  navigationSchema,
  navigationVariantIds,
  normalizeNavigationData,
  type NavigationActiveLinkMode,
  type NavigationBadgeTone,
  type NavigationBehavior,
  type NavigationCta,
  type NavigationData,
  type NavigationItem,
  type NavigationItemMeta,
  type NavigationLinkTarget,
  type NavigationLogo,
  type NavigationMobileMode,
  type NavigationStyle,
  type NavigationVariantId,
} from "./navigationContract";
export {
  bindNavigationRuntimeRoots,
  closeNavigationSubmenus,
  initializeNavigationRuntimeRoot,
  setNavigationDrawerState,
  setNavigationSubmenuState,
  updateNavigationActiveLinks,
  updateNavigationCollapseState,
} from "./navigationRuntime";

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

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
  blockId,
  renderContext,
  renderBlock,
}: {
  data: NavigationData;
  variant: string;
  slots?: Record<string, NavigationSlotBlock[]>;
  blockId?: string;
  renderContext?: NavigationRenderContext;
  renderBlock?: (block: NavigationSlotBlock, context?: NavigationRenderContext) => ReactNode;
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
  const renderColor = (value: unknown) => resolveClearableCssColorValue(value, "inherited-render");
  const textClass = joinClasses(
    fontSizeClassMap[style.fontSize ?? "sm"] ?? "text-sm",
    fontWeightClassMap[style.fontWeight ?? "medium"] ?? "font-medium",
    textTransformClassMap[style.textTransform ?? "none"] ?? "normal-case",
    letterSpacingClassMap[style.letterSpacing ?? "none"] ?? ""
  );
  const navStyle =
    compactStyle({
      backgroundColor: behavior.transparent ? "transparent" : renderColor(style.surfaceColor),
      borderColor: behavior.transparent
        ? "transparent"
        : (renderColor(style.borderColor) ?? "var(--color-border)"),
      borderBottomStyle: "solid",
      borderBottomWidth: borderWidthValueMap[borderWidth] ?? "1px",
      color: renderColor(style.textColor) ?? "var(--color-text)",
      ["--navigation-link-color" as keyof CSSProperties]:
        renderColor(style.linkColor) ?? renderColor(style.textColor) ?? "var(--color-text)",
      ["--navigation-link-hover-color" as keyof CSSProperties]:
        renderColor(style.linkHoverColor) ??
        renderColor(style.linkColor) ??
        renderColor(style.textColor) ??
        "var(--color-text)",
      ["--navigation-link-active-color" as keyof CSSProperties]:
        renderColor(style.linkActiveColor) ??
        renderColor(style.linkHoverColor) ??
        renderColor(style.linkColor) ??
        renderColor(style.textColor) ??
        "var(--color-text)",
      top: navOwnsSticky ? "var(--coderso-preview-banner-offset, 0px)" : undefined,
    }) ?? {};

  const logoStyle: CSSProperties = {
    color: renderColor(style.logoColor) ?? renderColor(style.textColor) ?? "var(--color-text)",
  };

  const ctaStyle: CSSProperties =
    compactStyle({
      background: renderColor(style.ctaBackgroundColor),
      color: renderColor(style.ctaTextColor) ?? "var(--color-bg)",
      borderColor: renderColor(style.ctaBorderColor) ?? "transparent",
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

            {rightSlotBlocks.map((slotBlock) =>
              renderBlock ? (
                <Fragment key={slotBlock.id}>{renderBlock(slotBlock, renderContext)}</Fragment>
              ) : null
            )}

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
