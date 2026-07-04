import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { usePath } from "@/lib/router";
import { cn } from "@/lib/cn";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = usePath();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [path]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden w-[264px] shrink-0 border-r border-sidebar-border lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-[280px] border-r border-sidebar-border bg-sidebar shadow-pop transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-4 z-10 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main data-app-scroll className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
            <div key={path} className="animate-in-soft">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
