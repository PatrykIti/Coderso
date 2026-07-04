import { ChevronDown, ExternalLink, Hexagon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { AdminLink } from "@/ui/shared/AdminLink";
import type { NavItem, NavSection } from "@/ui/navigation/sidebarConfig";
import { isAdminHrefActive, isExternalHref } from "@/utils/adminPaths";

const SIDEBAR_SCROLL_STORAGE_KEY = "coderso.admin.sidebarScrollTop";
const LEGACY_SIDEBAR_SCROLL_STORAGE_KEY = "nextless.admin.sidebarScrollTop";

// TASK-479-06-L03: de-SaaS version label. There is no client-side version
// constant (only server-side env.APP_VERSION), so render the owner's literal
// "Coderso 1.0" — matching the prototype footer.
const SIDEBAR_VERSION_LABEL = "Coderso 1.0";

/**
 * TASK-479-06-L03: site-identity block (replaces the old SaaS workspace brand).
 * Shows the site name + (optional) domain + a "Visit site" external link — NO
 * workspace switcher chevron. `AdminShell` (L05) resolves name/domain/url from
 * the existing settings cache and passes a `<SiteIdentity />` via the `brand`
 * prop; `SidebarNav` falls back to a neutral identity when none is provided.
 */
export function SiteIdentity({
  siteName,
  siteDomain,
  siteUrl,
}: {
  siteName: string;
  siteDomain?: string;
  siteUrl?: string;
}) {
  const initial = siteName.trim().charAt(0).toUpperCase() || "C";
  return (
    <div className="px-3 pt-3.5">
      <div className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold leading-tight text-[var(--admin-sidebar-active-text)]">
            {siteName}
          </span>
          {siteDomain ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="size-3 shrink-0" />
              <span className="truncate">{siteDomain}</span>
            </span>
          ) : null}
        </span>
      </div>
      {siteUrl ? (
        <a
          href={siteUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-[var(--admin-sidebar-active-text)]"
        >
          <ExternalLink className="size-3.5" /> Visit site
        </a>
      ) : null}
    </div>
  );
}

const defaultBrand = <SiteIdentity siteName="Coderso" />;

// Collect every internal nav target once so the active item can be resolved by
// the LONGEST matching prefix — a published screen highlights its own item, not
// the broader "Screens" entry whose path is also a prefix (proto resolveActiveTo).
const collectNavHrefs = (sections: NavSection[]): string[] => {
  const hrefs: string[] = [];
  for (const section of sections) {
    for (const item of section.items ?? []) hrefs.push(item.href);
    for (const group of section.groups ?? []) {
      for (const item of group.items) hrefs.push(item.href);
    }
    for (const item of section.itemsAfterGroups ?? []) hrefs.push(item.href);
  }
  return hrefs;
};

function SidebarNavLink({
  item,
  active,
  onNavigate,
  dense = false,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
  dense?: boolean;
}) {
  const Icon = item.icon;
  return (
    <AdminLink
      href={item.href}
      prefetch
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        dense && "gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px]",
        active
          ? "bg-[var(--admin-sidebar-active-bg)] text-[var(--admin-sidebar-active-text)]"
          : "text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover-bg)] hover:text-[var(--admin-sidebar-active-text)]"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active
            ? "text-primary"
            : "text-[var(--admin-sidebar-text)] group-hover:text-[var(--admin-sidebar-active-text)]"
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <Badge variant="soft" className="ml-auto px-1.5 py-0 text-[10px]">
          {item.badge}
        </Badge>
      ) : null}
    </AdminLink>
  );
}

type SidebarNavProps = {
  sections: NavSection[];
  activeHref?: string;
  footerItems?: NavItem[];
  brand?: React.ReactNode;
  variant?: "desktop" | "mobile";
  className?: string;
  canAccess?: (permission?: string) => boolean;
  groupState?: Record<string, boolean>;
  onGroupToggle?: (groupId: string, nextExpanded: boolean) => void;
  onNavigate?: () => void;
};

export function SidebarNav({
  sections,
  activeHref,
  footerItems,
  brand = defaultBrand,
  variant = "desktop",
  className,
  canAccess,
  groupState,
  onGroupToggle,
  onNavigate,
}: SidebarNavProps) {
  const adminBasePath = useAdminBasePath();
  const navRef = useRef<HTMLElement | null>(null);
  const shouldPersistScroll = variant === "desktop";
  const canAccessPermission = (permission?: string) => {
    if (!permission) return true;
    return canAccess ? canAccess(permission) : true;
  };
  const canAccessAnyPermission = (permissions?: string[]) => {
    if (!permissions?.length) return true;
    return permissions.some((permission) => canAccessPermission(permission));
  };
  const canAccessNavTarget = (target: { permission?: string; anyPermissions?: string[] }) =>
    canAccessPermission(target.permission) && canAccessAnyPermission(target.anyPermissions);

  const persistScrollPosition = useCallback(() => {
    if (!shouldPersistScroll || typeof window === "undefined") return;
    const nav = navRef.current;
    if (!nav) return;
    window.sessionStorage.setItem(SIDEBAR_SCROLL_STORAGE_KEY, String(nav.scrollTop));
  }, [shouldPersistScroll]);

  useEffect(() => {
    if (!shouldPersistScroll || typeof window === "undefined") return;
    const nav = navRef.current;
    if (!nav) return;
    const stored =
      window.sessionStorage.getItem(SIDEBAR_SCROLL_STORAGE_KEY) ??
      window.sessionStorage.getItem(LEGACY_SIDEBAR_SCROLL_STORAGE_KEY);
    if (!stored) return;
    const scrollTop = Number.parseInt(stored, 10);
    if (!Number.isFinite(scrollTop) || scrollTop < 0) return;

    const restoreScroll = () => {
      nav.scrollTop = scrollTop;
    };
    restoreScroll();
    const frame = window.requestAnimationFrame(restoreScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [shouldPersistScroll]);

  const handleNavigate = () => {
    persistScrollPosition();
    if (variant === "mobile") onNavigate?.();
  };

  // Longest-prefix winner: the single deepest internal href matching `activeHref`.
  // Only the item whose resolved href equals the winner highlights, so a broader
  // prefix (e.g. "Screens") never lights up alongside its published-screen child.
  const activeHrefWinner = useMemo(() => {
    let best: string | null = null;
    for (const href of collectNavHrefs(sections)) {
      if (isExternalHref(href)) continue;
      if (
        isAdminHrefActive(adminBasePath, href, activeHref) &&
        (!best || href.length > best.length)
      ) {
        best = href;
      }
    }
    return best;
  }, [adminBasePath, sections, activeHref]);

  const visibleSections = sections
    .map((section) => {
      const visibleItems = (section.items ?? []).filter((item) => canAccessNavTarget(item));
      const visibleItemsAfterGroups = (section.itemsAfterGroups ?? []).filter((item) =>
        canAccessNavTarget(item)
      );
      const visibleGroups = (section.groups ?? [])
        .filter((group) => canAccessNavTarget(group))
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => canAccessNavTarget(item)),
        }))
        .filter((group) => group.items.length > 0);
      return {
        ...section,
        items: visibleItems,
        itemsAfterGroups: visibleItemsAfterGroups,
        groups: visibleGroups,
      };
    })
    .filter(
      (section) =>
        section.items.length > 0 || section.groups.length > 0 || section.itemsAfterGroups.length > 0
    );

  const baseClasses =
    variant === "mobile"
      ? "flex h-full w-72 flex-col bg-[var(--admin-sidebar-bg)]"
      : "hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--admin-base-border)] bg-[var(--admin-sidebar-bg)] md:flex";
  return (
    <aside className={cn(baseClasses, className)}>
      {brand}
      <nav
        ref={navRef}
        className="flex-1 overflow-y-auto px-3 py-4"
        onScroll={persistScrollPosition}
      >
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-sidebar-text)]/70">
              {section.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  active={item.href === activeHrefWinner}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
            {section.groups.map((group) => {
              const GroupIcon = group.icon ?? group.items[0]?.icon;
              const expanded = groupState?.[group.id] ?? group.defaultExpanded ?? true;
              return (
                <div key={group.id} className="mt-1">
                  <button
                    type="button"
                    onClick={() => onGroupToggle?.(group.id, !expanded)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--admin-sidebar-text)] transition-colors hover:bg-[var(--admin-sidebar-hover-bg)] hover:text-[var(--admin-sidebar-active-text)]"
                    aria-expanded={expanded}
                    aria-controls={`nav-group-${group.id}`}
                  >
                    {GroupIcon ? <GroupIcon className="size-4 shrink-0" /> : null}
                    <span className="flex-1 truncate text-left">{group.label}</span>
                    <ChevronDown
                      className={cn("size-4 transition-transform", !expanded && "-rotate-90")}
                    />
                  </button>
                  {expanded ? (
                    <div
                      id={`nav-group-${group.id}`}
                      className="mt-0.5 ml-3.5 flex flex-col gap-0.5 border-l border-[var(--admin-base-border)] pl-2.5"
                    >
                      {group.items.map((item) => (
                        <SidebarNavLink
                          key={item.href}
                          item={item}
                          active={item.href === activeHrefWinner}
                          onNavigate={handleNavigate}
                          dense
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {section.itemsAfterGroups.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-sidebar-text)]/70">
                  Published screens
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.itemsAfterGroups.map((item) => (
                    <SidebarNavLink
                      key={item.href}
                      item={item}
                      active={item.href === activeHrefWinner}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--admin-base-border)] p-3">
        <div className="mb-2 flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground">
          <Hexagon className="size-3.5 shrink-0" />
          <span>{SIDEBAR_VERSION_LABEL}</span>
        </div>
        {footerItems?.length ? (
          <div className="flex items-center gap-1">
            {footerItems.map((item) => {
              const Icon = item.icon;
              const footerLinkClasses =
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--admin-sidebar-text)] transition-colors hover:bg-[var(--admin-sidebar-hover-bg)] hover:text-[var(--admin-sidebar-active-text)]";
              return isExternalHref(item.href) ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={handleNavigate}
                  className={footerLinkClasses}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </a>
              ) : (
                <AdminLink
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={handleNavigate}
                  className={footerLinkClasses}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </AdminLink>
              );
            })}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
