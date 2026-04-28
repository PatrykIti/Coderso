import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { AdminLink } from "@/ui/shared/AdminLink";
import type { NavItem, NavSection } from "@/ui/navigation/sidebarConfig";
import { isAdminHrefActive } from "@/utils/adminPaths";

const SIDEBAR_SCROLL_STORAGE_KEY = "coderso.admin.sidebarScrollTop";
const LEGACY_SIDEBAR_SCROLL_STORAGE_KEY = "nextless.admin.sidebarScrollTop";

const defaultBrand = (
  <div className="flex items-center gap-3 px-2">
    <div className="h-9 w-9 rounded-lg bg-[var(--admin-button-primary-bg)] text-[var(--admin-button-primary-text)] flex items-center justify-center font-semibold">
      C
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-[var(--admin-sidebar-active-text)]">
        Coderso
      </span>
      <span className="text-xs text-[var(--admin-sidebar-text)]">Admin Panel</span>
    </div>
  </div>
);

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

  const persistScrollPosition = useCallback(() => {
    if (!shouldPersistScroll || typeof window === "undefined") return;
    const nav = navRef.current;
    if (!nav) return;
    window.sessionStorage.setItem(
      SIDEBAR_SCROLL_STORAGE_KEY,
      String(nav.scrollTop)
    );
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

  const visibleSections = sections
    .map((section) => {
      const visibleItems = (section.items ?? []).filter((item) =>
        canAccessPermission(item.permission)
      );
      const visibleItemsAfterGroups = (section.itemsAfterGroups ?? []).filter((item) =>
        canAccessPermission(item.permission)
      );
      const visibleGroups = (section.groups ?? [])
        .filter((group) => canAccessPermission(group.permission))
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => canAccessPermission(item.permission)),
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
        section.items.length > 0 ||
        section.groups.length > 0 ||
        section.itemsAfterGroups.length > 0
    );

  const baseClasses =
    variant === "mobile"
      ? "flex h-full w-72 flex-col bg-[var(--admin-sidebar-bg)]"
      : "hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--admin-base-border)] bg-[var(--admin-sidebar-bg)] md:flex";
  return (
    <aside
      className={cn(
        baseClasses,
        className
      )}
    >
      <div className="p-6 pb-4">{brand}</div>
      <nav
        ref={navRef}
        className="flex-1 overflow-y-auto px-4 pb-6"
        onScroll={persistScrollPosition}
      >
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--admin-sidebar-text)]/70">
              {section.title}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = isAdminHrefActive(
                  adminBasePath,
                  item.href,
                  activeHref
                );
                return (
                  <AdminLink
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={handleNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--admin-sidebar-text)] transition-colors hover:bg-[var(--admin-sidebar-hover-bg)] hover:text-[var(--admin-sidebar-active-text)]",
                      isActive &&
                        "bg-[var(--admin-sidebar-active-bg)] text-[var(--admin-sidebar-active-text)] hover:bg-[var(--admin-sidebar-active-bg)] hover:text-[var(--admin-sidebar-active-text)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </AdminLink>
                );
              })}
              {section.groups.map((group) => {
                const GroupIcon = group.icon ?? group.items[0]?.icon;
                const isGroupActive = group.items.some((item) =>
                  isAdminHrefActive(adminBasePath, item.href, activeHref)
                );
                const expanded =
                  groupState?.[group.id] ?? group.defaultExpanded ?? true;
                return (
                  <div key={group.id} className="rounded-lg border border-transparent">
                    <button
                      type="button"
                      onClick={() => onGroupToggle?.(group.id, !expanded)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--admin-sidebar-text)] transition-colors hover:bg-[var(--admin-sidebar-hover-bg)] hover:text-[var(--admin-sidebar-active-text)]",
                        isGroupActive &&
                          "bg-[var(--admin-sidebar-active-bg)] text-[var(--admin-sidebar-active-text)] hover:bg-[var(--admin-sidebar-active-bg)] hover:text-[var(--admin-sidebar-active-text)]"
                      )}
                      aria-expanded={expanded}
                      aria-controls={`nav-group-${group.id}`}
                    >
                      {GroupIcon ? <GroupIcon className="h-4 w-4" /> : null}
                      <span className="flex-1 truncate text-left">{group.label}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                      />
                    </button>
                    {expanded ? (
                      <div
                        id={`nav-group-${group.id}`}
                        className="mt-1 space-y-1 border-l border-[var(--admin-base-border)]/70 pl-3"
                      >
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isItemActive = isAdminHrefActive(
                            adminBasePath,
                            item.href,
                            activeHref
                          );
                          return (
                            <AdminLink
                              key={item.href}
                              href={item.href}
                              prefetch
                              onClick={handleNavigate}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--admin-sidebar-text)] transition-colors hover:bg-[var(--admin-sidebar-hover-bg)] hover:text-[var(--admin-sidebar-active-text)]",
                                isItemActive &&
                                  "bg-[var(--admin-sidebar-active-bg)] text-[var(--admin-sidebar-active-text)] hover:bg-[var(--admin-sidebar-active-bg)] hover:text-[var(--admin-sidebar-active-text)]"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {item.badge}
                                </Badge>
                              ) : null}
                            </AdminLink>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {section.itemsAfterGroups.map((item) => {
                const Icon = item.icon;
                const isActive = isAdminHrefActive(
                  adminBasePath,
                  item.href,
                  activeHref
                );
                return (
                  <AdminLink
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={handleNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--admin-sidebar-text)] transition-colors hover:bg-[var(--admin-sidebar-hover-bg)] hover:text-[var(--admin-sidebar-active-text)]",
                      isActive &&
                        "bg-[var(--admin-sidebar-active-bg)] text-[var(--admin-sidebar-active-text)] hover:bg-[var(--admin-sidebar-active-bg)] hover:text-[var(--admin-sidebar-active-text)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </AdminLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {footerItems?.length ? (
        <div className="border-t border-[var(--admin-base-border)] p-4">
          {footerItems.map((item) => {
            const Icon = item.icon;
            return (
              <AdminLink
                key={item.href}
                href={item.href}
                prefetch
                onClick={handleNavigate}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--admin-sidebar-text)] transition-colors hover:bg-[var(--admin-sidebar-hover-bg)] hover:text-[var(--admin-sidebar-active-text)]"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </AdminLink>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
