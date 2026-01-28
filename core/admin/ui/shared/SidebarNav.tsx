import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NavItem, NavSection } from "@/ui/navigation/sidebarConfig";

const defaultBrand = (
  <div className="flex items-center gap-3 px-2">
    <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-semibold">
      N
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-semibold">Nextless</span>
      <span className="text-xs text-muted-foreground">Admin Panel</span>
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
      ? "flex h-full w-72 flex-col bg-background"
      : "hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex";
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
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeHref === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      isActive &&
                        "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {footerItems?.length ? (
        <div className="border-t p-4">
          {footerItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
