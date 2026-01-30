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
        "flex h-16 shrink-0 items-center justify-between border-b border-[var(--admin-topbar-border)] bg-[var(--admin-topbar-bg)] px-6",
        className
      )}
    >
      <div className="flex items-center gap-4 text-sm text-[var(--admin-topbar-text)]">
        {navToggle}
        {breadcrumbs ?? (
          <div className="flex items-center gap-2">
            <span>Home</span>
            <span className="text-[var(--admin-topbar-text)]/60">/</span>
            <span className="text-[var(--admin-base-text)]">Dashboard</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 justify-center px-6">{search}</div>
      <div className="flex items-center gap-2">
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
