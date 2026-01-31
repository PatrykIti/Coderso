import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  defaultFooterItems,
  defaultNavSections,
  type NavSection,
  type NavItem,
} from "@/ui/navigation/sidebarConfig";
import { SearchBar } from "@/ui/search/SearchBar";
import { SidebarNav } from "@/ui/shared/SidebarNav";
import { TopBar } from "@/ui/shared/TopBar";

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
  navSections = defaultNavSections,
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

  return (
    <div
      className={cn(
        "flex h-screen w-full overflow-hidden bg-[var(--admin-base-surface)]",
        className
      )}
    >
      <SidebarNav
        sections={navSections}
        footerItems={footerItems}
        activeHref={activeHref}
      />
      <div className="flex min-h-screen flex-1 flex-col">
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
            sections={navSections}
            footerItems={footerItems}
            activeHref={activeHref}
            variant="mobile"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
