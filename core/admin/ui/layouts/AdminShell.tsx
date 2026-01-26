import { cn } from "@/lib/utils";
import {
  defaultFooterItems,
  defaultNavSections,
  type NavSection,
  type NavItem,
} from "@/ui/navigation/sidebarConfig";
import { SidebarNav } from "@/ui/shared/SidebarNav";
import { TopBar } from "@/ui/shared/TopBar";

type AdminShellProps = {
  children: React.ReactNode;
  navSections?: NavSection[];
  footerItems?: NavItem[];
  activeHref?: string;
  breadcrumbs?: React.ReactNode;
  topbarActions?: React.ReactNode;
  user?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AdminShell({
  children,
  navSections = defaultNavSections,
  footerItems = defaultFooterItems,
  activeHref,
  breadcrumbs,
  topbarActions,
  user,
  className,
  contentClassName,
}: AdminShellProps) {
  return (
    <div className={cn("flex min-h-screen w-full bg-muted/30", className)}>
      <SidebarNav
        sections={navSections}
        footerItems={footerItems}
        activeHref={activeHref}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar
          breadcrumbs={breadcrumbs}
          actions={topbarActions}
          user={user}
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
    </div>
  );
}
