import { ChevronDown, ChevronsUpDown, Hexagon, Sparkles } from "lucide-react";
import { useState } from "react";

import { footerItems, navSections, type NavItem } from "@/nav/navConfig";
import { Link, usePath } from "@/lib/router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const isActive = (path: string, to: string) =>
  to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`);

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const path = usePath();
  const active = isActive(path, item.to);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-4.5 shrink-0 transition-colors",
          active ? "text-primary" : "text-sidebar-muted group-hover:text-foreground",
        )}
      />
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <Badge variant="soft" className="ml-auto px-1.5 py-0 text-[10px]">
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePath();
  const [advancedOpen, setAdvancedOpen] = useState(true);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Workspace switcher */}
      <div className="px-3 pt-3.5">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors hover:bg-accent"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Hexagon className="size-5 fill-current" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-sm font-semibold leading-tight">
              Coderso
            </span>
            <span className="block truncate text-xs text-muted-foreground">Acme Studio</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items?.map((item) => (
                <NavLink key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>

            {section.group ? (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <section.group.icon className="size-4.5 shrink-0 text-sidebar-muted" />
                  <span>{section.group.label}</span>
                  <ChevronDown
                    className={cn(
                      "ml-auto size-4 text-sidebar-muted transition-transform",
                      advancedOpen ? "" : "-rotate-90",
                    )}
                  />
                </button>
                {advancedOpen ? (
                  <div className="mt-0.5 ml-3.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2.5">
                    {section.group.items.map((item) => {
                      const active = isActive(path, item.to);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={onNavigate}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground hover:bg-accent hover:text-foreground",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              active ? "text-primary" : "text-sidebar-muted group-hover:text-foreground",
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                          {item.badge ? (
                            <span className="ml-auto text-[10px] font-medium text-primary-soft-foreground">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-primary-soft/70 px-3 py-2.5">
          <Sparkles className="size-4.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-foreground">Coderso Pro</div>
            <div className="truncate text-xs text-muted-foreground">14 days left in trial</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {footerItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
