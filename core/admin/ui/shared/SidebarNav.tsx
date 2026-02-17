import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AdminLink } from "@/ui/shared/AdminLink";
import type { NavItem, NavSection } from "@/ui/navigation/sidebarConfig";

const defaultBrand = (
  <div className="flex items-center gap-3 px-2">
    <div className="h-9 w-9 rounded-lg bg-[var(--admin-button-primary-bg)] text-[var(--admin-button-primary-text)] flex items-center justify-center font-semibold">
      N
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-[var(--admin-sidebar-active-text)]">
        Nextless
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
};

export function SidebarNav({
  sections,
  activeHref,
  footerItems,
  brand = defaultBrand,
  variant = "desktop",
  className,
}: SidebarNavProps) {
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
      <nav className="flex-1 overflow-y-auto px-4 pb-6">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--admin-sidebar-text)]/70">
              {section.title}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeHref === item.href;
                return (
                  <AdminLink
                    key={item.href}
                    href={item.href}
                    prefetch
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
