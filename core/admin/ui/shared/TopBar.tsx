import { Bell, Command, HelpCircle, LogOut, Plus, Search, Settings, User } from "lucide-react";
import { useCallback, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { logout } from "@/services/authClient";
import {
  AdminBreadcrumbs,
  buildAdminBreadcrumbItemsFromNode,
  isAdminBreadcrumbItems,
  type AdminBreadcrumbInput,
} from "@/ui/shared/AdminBreadcrumbs";
import { AdminColorModeToggle } from "@/ui/shared/AdminColorModeToggle";
import { AdminLink } from "@/ui/shared/AdminLink";
import { useAdminAuth } from "@/ui/contexts/AdminAuthContext";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { withAdminBasePath } from "@/utils/adminPaths";

type TopBarProps = {
  navToggle?: ReactNode;
  breadcrumbs?: ReactNode | AdminBreadcrumbInput[];
  search?: ReactNode;
  actions?: ReactNode;
  user?: ReactNode;
  className?: string;
};

/** First-letter initials from a display label (no fabricated identity). */
function initialsOf(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
}

/**
 * Command-style search trigger — the compact affordance shown when no real
 * `search` node is supplied. It is presentational only: when `AdminShell` passes
 * `search={<SearchBar />}` that real control renders instead. It introduces no
 * search endpoint or fabricated results.
 */
function CommandSearchTrigger() {
  return (
    <button
      type="button"
      className="group flex h-9 w-full max-w-xs items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-soft transition-colors hover:border-ring/60"
    >
      <Search className="size-4" />
      <span className="flex-1 truncate text-left">Search or jump to…</span>
      <kbd className="hidden items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium sm:flex">
        <Command className="size-3" />K
      </kbd>
    </button>
  );
}

/**
 * Presentational "Create" affordance (de-fabrication rule): it adds no new route
 * or data. A host can supply a real create flow through the TopBar `actions`
 * slot, which renders alongside this default.
 */
function CreateButton() {
  return (
    <Button type="button" variant="default" size="sm" className="hidden gap-1.5 sm:inline-flex">
      <Plus className="size-4" />
      Create
    </Button>
  );
}

/**
 * Notifications dropdown. No notification source/endpoint exists yet, so it shows
 * a calm empty state instead of inventing items or an unread count (de-SaaS
 * de-fabrication rule — no fake unread dot).
 */
function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-2xl">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * User menu — identity is read at render time from `AdminAuthContext` (no new
 * fetch); falls back to initials/"Account" when absent. Sign out reuses the
 * existing `logout()` action then redirects to the canonical admin login route.
 */
function UserMenu() {
  const { user } = useAdminAuth();
  const basePath = useAdminBasePath();

  const displayName = user?.name?.trim() || user?.email || "Account";
  const email = user?.email ?? null;
  const roleName = user?.permissionSnapshot?.roles?.[0]?.name ?? null;

  const handleSignOut = useCallback(() => {
    void (async () => {
      try {
        await logout();
      } catch {
        // Best-effort: still redirect to login so the session is left behind.
      } finally {
        if (typeof window !== "undefined") {
          window.location.assign(withAdminBasePath(basePath, "/login"));
        }
      }
    })();
  }, [basePath]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl p-0.5 pr-1 transition-colors hover:bg-accent"
        >
          <Avatar>
            <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-medium">{displayName}</span>
            {roleName ? (
              <span className="block text-xs text-muted-foreground">{roleName}</span>
            ) : null}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="truncate text-sm font-medium">{displayName}</span>
          {email ? (
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          ) : null}
          {roleName ? (
            <Badge variant="soft" className="mt-0.5 w-fit">
              {roleName}
            </Badge>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Non-navigating (matches proto): no /profile route exists. */}
        <DropdownMenuItem>
          <User />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <AdminLink href="/settings">
            <Settings />
            Settings
          </AdminLink>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HelpCircle />
          Help &amp; support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar({ navToggle, breadcrumbs, search, actions, user, className }: TopBarProps) {
  const renderedBreadcrumbs = (() => {
    if (isAdminBreadcrumbItems(breadcrumbs)) {
      return <AdminBreadcrumbs items={breadcrumbs} />;
    }
    if (breadcrumbs) {
      const derivedItems = buildAdminBreadcrumbItemsFromNode(breadcrumbs);
      if (derivedItems) return <AdminBreadcrumbs items={derivedItems} />;
      return breadcrumbs;
    }
    return <AdminBreadcrumbs items={[{ label: "Home", href: "/admin" }, { label: "Dashboard" }]} />;
  })();

  return (
    // D1: TopBar is chrome — keep the --admin-topbar-* tokens (bg/border/text); the
    // dark recolor comes from the injected `:root.dark{--admin-topbar-*}` block.
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--admin-topbar-border)] bg-[var(--admin-topbar-bg)] px-4 text-[var(--admin-topbar-text)] backdrop-blur-md lg:px-6",
        className
      )}
    >
      {navToggle}
      <div className="min-w-0 truncate text-sm">{renderedBreadcrumbs}</div>

      <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex lg:px-6">
        {search ?? <CommandSearchTrigger />}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <CreateButton />
        <AdminColorModeToggle />
        {actions}
        <NotificationsMenu />
        {user ?? <UserMenu />}
      </div>
    </header>
  );
}
