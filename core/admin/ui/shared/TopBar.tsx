import { Bell, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminThemeSwitcher } from "@/ui/shared/AdminThemeSwitcher";

type TopBarProps = {
  navToggle?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  search?: React.ReactNode;
  actions?: React.ReactNode;
  user?: React.ReactNode;
  className?: string;
};

export function TopBar({
  navToggle,
  breadcrumbs,
  search,
  actions,
  user,
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "flex w-full flex-wrap items-center gap-3 border-b border-[var(--admin-topbar-border)] bg-[var(--admin-topbar-bg)] px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3 text-sm text-[var(--admin-topbar-text)]">
        {navToggle}
        <div className="min-w-0 truncate">
          {breadcrumbs ?? (
            <div className="flex items-center gap-2">
              <span>Home</span>
              <span className="text-[var(--admin-topbar-text)]/60">/</span>
              <span className="text-[var(--admin-base-text)]">Dashboard</span>
            </div>
          )}
        </div>
      </div>
      <div className="order-3 w-full sm:order-none sm:flex-1 sm:px-6">
        {search}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2 sm:ml-0 sm:flex-nowrap">
        <AdminThemeSwitcher />
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
