import { Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  appendNavItemsAfterGroup,
  buildCustomScreenShortcutNavItems,
  buildDefaultNavSections,
  defaultFooterItems,
  type NavSection,
  type NavItem,
} from "@/ui/navigation/sidebarConfig";
import { SearchBar } from "@/ui/search/SearchBar";
import { SidebarNav, SiteIdentity } from "@/ui/shared/SidebarNav";
import { TopBar } from "@/ui/shared/TopBar";
import { AssistantPanel } from "@/ui/assistant/AssistantPanel";
import type { AdminBreadcrumbInput } from "@/ui/shared/AdminBreadcrumbs";
import { mapNavItems, mapNavSections, resolveAdminHref } from "@/utils/adminPaths";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import {
  getCachedCustomScreenShortcuts,
  listCustomScreenShortcutsCached,
  type CustomScreenShortcutRecord,
} from "@/services/customScreenShortcutsClient";
import {
  getActiveSolutionKitId,
  subscribeActiveSolutionKitId,
  buildAdvancedFeatureFlagsForSolutionKit,
} from "@/services/solutionKitSelection";
import {
  getCachedSolutionKits,
  listSolutionKitsCached,
  type SolutionKitId,
  type SolutionKitSummary,
} from "@/services/solutionKitsClient";
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedRedactedSettings } from "@/services/settingsCache";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { useAdminCan } from "@/ui/contexts/AdminAuthContext";

const NAV_GROUP_STATE_KEY = "coderso.admin.navGroupState";
const LEGACY_NAV_GROUP_STATE_KEY = "nextless.admin.navGroupState";

const collectDefaultGroupState = (sections: NavSection[]) => {
  const defaults: Record<string, boolean> = {};
  for (const section of sections) {
    for (const group of section.groups ?? []) {
      defaults[group.id] = group.defaultExpanded ?? true;
    }
  }
  return defaults;
};

const normalizeStoredGroupState = (value: unknown): Record<string, boolean> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const parsed = value as Record<string, unknown>;
  const normalized: Record<string, boolean> = {};
  for (const [key, item] of Object.entries(parsed)) {
    if (typeof item !== "boolean") continue;
    normalized[key === "coderso" ? "advanced" : key] = item;
  }
  return normalized;
};

const readStoredNavGroupState = () => {
  if (typeof window === "undefined") return null;
  const stored =
    window.localStorage.getItem(NAV_GROUP_STATE_KEY) ??
    window.localStorage.getItem(LEGACY_NAV_GROUP_STATE_KEY);
  if (!stored) return null;
  try {
    return normalizeStoredGroupState(JSON.parse(stored) as unknown);
  } catch {
    return null;
  }
};

type SiteIdentityValue = {
  siteName: string;
  siteDomain?: string;
  siteUrl?: string;
};

// TASK-479-06-L05: de-SaaS site identity. Render-time derivation from the
// already-cached redacted settings — NO new fetch. Falls back to the neutral
// "Coderso" brand (SidebarNav default) when settings are not cached yet.
const deriveSiteIdentityFromCache = (): SiteIdentityValue => {
  const cached = getCachedRedactedSettings();
  const siteName = cached?.general.siteName?.trim() || "Coderso";
  const siteUrl =
    cached?.site.publicBaseUrl?.trim() || cached?.general.publicBaseUrl?.trim() || undefined;
  let siteDomain: string | undefined;
  if (siteUrl) {
    try {
      siteDomain = new URL(siteUrl).host;
    } catch {
      siteDomain = undefined;
    }
  }
  return {
    siteName,
    ...(siteDomain ? { siteDomain } : {}),
    ...(siteUrl ? { siteUrl } : {}),
  };
};

const useSiteIdentityFromCache = (): SiteIdentityValue => {
  const [identity, setIdentity] = useState<SiteIdentityValue>(deriveSiteIdentityFromCache);
  useEffect(
    () =>
      subscribeCacheEvents((event) => {
        if (event.key !== cacheKeys.settingsRedacted) return;
        const next = deriveSiteIdentityFromCache();
        setIdentity((prev) =>
          prev.siteName === next.siteName &&
          prev.siteDomain === next.siteDomain &&
          prev.siteUrl === next.siteUrl
            ? prev
            : next
        );
      }),
    []
  );
  return identity;
};

type AdminShellProps = {
  children: React.ReactNode;
  navSections?: NavSection[];
  footerItems?: NavItem[];
  activeHref?: string;
  breadcrumbs?: React.ReactNode | AdminBreadcrumbInput[];
  topbarActions?: React.ReactNode;
  search?: React.ReactNode;
  showSearch?: boolean;
  user?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AdminShell({
  children,
  navSections,
  footerItems = defaultFooterItems,
  activeHref,
  breadcrumbs,
  topbarActions,
  search,
  showSearch = true,
  user,
  className,
  contentClassName,
}: AdminShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const canAccess = useAdminCan();
  const siteIdentity = useSiteIdentityFromCache();
  const canReadCustomScreens = canAccess("content:read");
  const canReadSolutionKits = canAccess("solution-kits:read");
  const [customScreens, setCustomScreens] = useState<CustomScreenShortcutRecord[]>(() =>
    canReadCustomScreens ? (getCachedCustomScreenShortcuts() ?? []) : []
  );
  const [solutionKits, setSolutionKits] = useState<SolutionKitSummary[]>(() =>
    canReadSolutionKits ? (getCachedSolutionKits() ?? []) : []
  );
  const [activeSolutionKitId, setActiveSolutionKitId] = useState<SolutionKitId | null>(() =>
    getActiveSolutionKitId()
  );
  const adminBasePath = useAdminBasePath();
  const activeSolutionKit = useMemo(
    () =>
      canReadSolutionKits
        ? (solutionKits.find((item) => item.id === activeSolutionKitId) ?? null)
        : null,
    [activeSolutionKitId, canReadSolutionKits, solutionKits]
  );
  const solutionKitFlags = useMemo(
    () => buildAdvancedFeatureFlagsForSolutionKit(activeSolutionKit),
    [activeSolutionKit]
  );
  const baseNavSections = useMemo(
    () => navSections ?? buildDefaultNavSections(solutionKitFlags),
    [navSections, solutionKitFlags]
  );
  const hasAdvancedGroup = useMemo(
    () =>
      baseNavSections.some((section) => section.groups?.some((group) => group.id === "advanced")),
    [baseNavSections]
  );
  const canLoadCustomScreens = hasAdvancedGroup && canReadCustomScreens;
  const canLoadSolutionKits = hasAdvancedGroup && canReadSolutionKits;
  const navGroupDefaults = useMemo(
    () => collectDefaultGroupState(baseNavSections),
    [baseNavSections]
  );
  const [navGroupState, setNavGroupState] = useState<Record<string, boolean>>(() => {
    const stored = readStoredNavGroupState();
    if (!stored) return navGroupDefaults;
    return {
      ...navGroupDefaults,
      ...stored,
    };
  });

  useEffect(() => {
    if (!canLoadCustomScreens) return;
    listCustomScreenShortcutsCached()
      .then((items) => setCustomScreens(items))
      .catch(() => undefined);
  }, [canLoadCustomScreens]);

  useEffect(() => {
    if (!canLoadSolutionKits) return;
    listSolutionKitsCached()
      .then((items) => setSolutionKits(items))
      .catch(() => undefined);
  }, [canLoadSolutionKits]);

  useEffect(() => {
    if (!canLoadCustomScreens) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.customScreensList) return;
      listCustomScreenShortcutsCached({ force: true })
        .then((items) => setCustomScreens(items))
        .catch(() => undefined);
    });
  }, [canLoadCustomScreens]);

  useEffect(() => {
    if (!canLoadSolutionKits) return undefined;
    return subscribeActiveSolutionKitId((kitId) => {
      setActiveSolutionKitId(kitId);
    });
  }, [canLoadSolutionKits]);

  const navSectionsWithCustomScreens = useMemo(
    () =>
      appendNavItemsAfterGroup(
        baseNavSections,
        "advanced",
        buildCustomScreenShortcutNavItems(canReadCustomScreens ? customScreens : [])
      ),
    [baseNavSections, canReadCustomScreens, customScreens]
  );

  const resolvedSections = useMemo(
    () => mapNavSections(navSectionsWithCustomScreens, adminBasePath),
    [adminBasePath, navSectionsWithCustomScreens]
  );
  const resolvedFooter = useMemo(
    () => (footerItems ? mapNavItems(footerItems, adminBasePath) : footerItems),
    [adminBasePath, footerItems]
  );
  const resolvedActiveHref = activeHref ? resolveAdminHref(adminBasePath, activeHref) : activeHref;
  // Stable key for the soft route transition. Uses a value already available
  // (the resolved active href) — no new router coupling — and guards undefined
  // so the keyed wrapper never forces a data-bearing remount/refetch.
  const routeKey = resolvedActiveHref ?? "admin-root";
  const contentOwnsOverflow = contentClassName?.includes("overflow-") ?? false;
  const resolvedNavGroupState = useMemo(
    () => ({
      ...navGroupDefaults,
      ...navGroupState,
    }),
    [navGroupDefaults, navGroupState]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NAV_GROUP_STATE_KEY, JSON.stringify(resolvedNavGroupState));
  }, [resolvedNavGroupState]);

  return (
    <div
      className={cn(
        "flex h-screen w-full overflow-hidden bg-[var(--admin-base-surface)]",
        className
      )}
    >
      <SidebarNav
        sections={resolvedSections}
        footerItems={resolvedFooter}
        activeHref={resolvedActiveHref}
        canAccess={canAccess}
        groupState={resolvedNavGroupState}
        brand={<SiteIdentity {...siteIdentity} />}
        onGroupToggle={(groupId, nextExpanded) =>
          setNavGroupState((prev) => ({
            ...prev,
            [groupId]: nextExpanded,
          }))
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar
          breadcrumbs={breadcrumbs}
          search={showSearch ? (search ?? <SearchBar />) : search}
          actions={topbarActions}
          user={user}
          navToggle={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <main
          data-app-scroll
          className={cn(
            "min-h-0 flex-1",
            !contentOwnsOverflow && "overflow-y-auto",
            contentClassName
          )}
        >
          {/* Editor / full-bleed routes own their overflow and skip the centered
              max-width column; everything else gets the comfortable centered
              column with a CSS-only soft route transition. */}
          {contentOwnsOverflow ? (
            children
          ) : (
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
              <div key={routeKey} className="animate-in-soft">
                {children}
              </div>
            </div>
          )}
        </main>
      </div>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Primary navigation links for the admin dashboard.
          </SheetDescription>
          <SidebarNav
            sections={resolvedSections}
            footerItems={resolvedFooter}
            activeHref={resolvedActiveHref}
            canAccess={canAccess}
            variant="mobile"
            brand={<SiteIdentity {...siteIdentity} />}
            groupState={resolvedNavGroupState}
            onGroupToggle={(groupId, nextExpanded) =>
              setNavGroupState((prev) => ({
                ...prev,
                [groupId]: nextExpanded,
              }))
            }
            onNavigate={() => setNavOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <AssistantPanel activeHref={resolvedActiveHref ?? null} />
    </div>
  );
}
