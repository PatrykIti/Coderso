import { Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { SidebarNav } from "@/ui/shared/SidebarNav";
import { TopBar } from "@/ui/shared/TopBar";
import { AssistantPanel } from "@/ui/assistant/AssistantPanel";
import { mapNavItems, mapNavSections, resolveAdminHref } from "@/utils/adminPaths";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import {
  getCachedCustomScreens,
  listCustomScreensCached,
  type CustomScreenRecord,
} from "@/services/customScreensClient";
import {
  getActiveSolutionKitId,
  subscribeActiveSolutionKitId,
  buildCodersoFeatureFlagsForSolutionKit,
} from "@/services/solutionKitSelection";
import {
  getCachedSolutionKits,
  listSolutionKitsCached,
  type SolutionKitId,
  type SolutionKitSummary,
} from "@/services/solutionKitsClient";
import { cacheKeys } from "@/services/cachePolicy";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const NAV_GROUP_STATE_KEY = "nextless.admin.navGroupState";

const collectDefaultGroupState = (sections: NavSection[]) => {
  const defaults: Record<string, boolean> = {};
  for (const section of sections) {
    for (const group of section.groups ?? []) {
      defaults[group.id] = group.defaultExpanded ?? true;
    }
  }
  return defaults;
};

type AdminShellProps = {
  children: React.ReactNode;
  navSections?: NavSection[];
  footerItems?: NavItem[];
  activeHref?: string;
  breadcrumbs?: React.ReactNode;
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
  const [customScreens, setCustomScreens] = useState<CustomScreenRecord[]>(
    () => getCachedCustomScreens() ?? []
  );
  const [solutionKits, setSolutionKits] = useState<SolutionKitSummary[]>(
    () => getCachedSolutionKits() ?? []
  );
  const [activeSolutionKitId, setActiveSolutionKitId] = useState<SolutionKitId | null>(
    () => getActiveSolutionKitId()
  );
  const adminBasePath = useAdminBasePath();
  const activeSolutionKit = useMemo(
    () => solutionKits.find((item) => item.id === activeSolutionKitId) ?? null,
    [activeSolutionKitId, solutionKits]
  );
  const solutionKitFlags = useMemo(
    () => buildCodersoFeatureFlagsForSolutionKit(activeSolutionKit),
    [activeSolutionKit]
  );
  const baseNavSections = useMemo(
    () => navSections ?? buildDefaultNavSections(solutionKitFlags),
    [navSections, solutionKitFlags]
  );
  const hasCodersoGroup = useMemo(
    () => baseNavSections.some((section) => section.groups?.some((group) => group.id === "coderso")),
    [baseNavSections]
  );
  const navGroupDefaults = useMemo(
    () => collectDefaultGroupState(baseNavSections),
    [baseNavSections]
  );
  const [navGroupState, setNavGroupState] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return navGroupDefaults;
    const stored = window.localStorage.getItem(NAV_GROUP_STATE_KEY);
    if (!stored) return navGroupDefaults;
    try {
      const parsed = JSON.parse(stored) as Record<string, boolean>;
      return {
        ...navGroupDefaults,
        ...parsed,
      };
    } catch {
      return navGroupDefaults;
    }
  });

  useEffect(() => {
    if (!hasCodersoGroup) return;
    listCustomScreensCached()
      .then((items) => setCustomScreens(items))
      .catch(() => undefined);
  }, [hasCodersoGroup]);

  useEffect(() => {
    if (!hasCodersoGroup) return;
    listSolutionKitsCached()
      .then((items) => setSolutionKits(items))
      .catch(() => undefined);
  }, [hasCodersoGroup]);

  useEffect(() => {
    if (!hasCodersoGroup) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.customScreensList) return;
      listCustomScreensCached({ force: true })
        .then((items) => setCustomScreens(items))
        .catch(() => undefined);
    });
  }, [hasCodersoGroup]);

  useEffect(() => {
    if (!hasCodersoGroup) return undefined;
    return subscribeActiveSolutionKitId((kitId) => {
      setActiveSolutionKitId(kitId);
    });
  }, [hasCodersoGroup]);

  const navSectionsWithCustomScreens = useMemo(
    () =>
      appendNavItemsAfterGroup(
        baseNavSections,
        "coderso",
        buildCustomScreenShortcutNavItems(customScreens)
      ),
    [baseNavSections, customScreens]
  );

  const resolvedSections = useMemo(
    () => mapNavSections(navSectionsWithCustomScreens, adminBasePath),
    [adminBasePath, navSectionsWithCustomScreens]
  );
  const resolvedFooter = useMemo(
    () => (footerItems ? mapNavItems(footerItems, adminBasePath) : footerItems),
    [adminBasePath, footerItems]
  );
  const resolvedActiveHref = activeHref
    ? resolveAdminHref(adminBasePath, activeHref)
    : activeHref;
  const resolvedNavGroupState = useMemo(
    () => ({
      ...navGroupDefaults,
      ...navGroupState,
    }),
    [navGroupDefaults, navGroupState]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      NAV_GROUP_STATE_KEY,
      JSON.stringify(resolvedNavGroupState)
    );
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
        groupState={resolvedNavGroupState}
        onGroupToggle={(groupId, nextExpanded) =>
          setNavGroupState((prev) => ({
            ...prev,
            [groupId]: nextExpanded,
          }))
        }
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
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
          className={cn(
            "flex-1 overflow-y-auto px-6 py-8",
            contentClassName
          )}
        >
          {children}
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
            variant="mobile"
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
