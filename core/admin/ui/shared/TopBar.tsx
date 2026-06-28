import { Bell, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AdminBreadcrumbs,
  buildAdminBreadcrumbItemsFromNode,
  isAdminBreadcrumbItems,
  type AdminBreadcrumbInput,
} from "@/ui/shared/AdminBreadcrumbs";
import { AdminColorModeToggle } from "@/ui/shared/AdminColorModeToggle";
import { AdminThemeSwitcher } from "@/ui/shared/AdminThemeSwitcher";

type TopBarProps = {
  navToggle?: ReactNode;
  breadcrumbs?: ReactNode | AdminBreadcrumbInput[];
  search?: ReactNode;
  actions?: ReactNode;
  user?: ReactNode;
  className?: string;
};

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
    <header
      className={cn(
        "flex w-full flex-wrap items-center gap-3 border-b border-[var(--admin-topbar-border)] bg-[var(--admin-topbar-bg)] px-4 py-3 lg:h-16 lg:flex-nowrap lg:px-6 lg:py-0",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3 text-sm text-[var(--admin-topbar-text)]">
        {navToggle}
        <div className="min-w-0 truncate">{renderedBreadcrumbs}</div>
      </div>
      <div className="order-3 w-full lg:order-none lg:flex-1 lg:px-6">{search}</div>
      <div className="ml-auto flex flex-wrap items-center gap-2 lg:ml-0 lg:flex-nowrap">
        <AdminThemeSwitcher />
        <AdminColorModeToggle />
        {actions}
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-4 w-4" />
        </Button>
        {user}
      </div>
    </header>
  );
}
