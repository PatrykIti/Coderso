import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * TASK-479-06-L02: list/grid filter toolbar ported from the prototype
 * (`patterns/FilterBar.tsx`). Presentational — the view toggle is lifted to the
 * caller via `view` + `onViewChange`; there is no internal data state.
 */
export function FilterBar({
  searchPlaceholder = "Search…",
  filters,
  view,
  onViewChange,
  trailing,
  className,
}: {
  searchPlaceholder?: string;
  filters?: ReactNode;
  view?: "grid" | "list";
  onViewChange?: (view: "grid" | "list") => void;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2", className)}>
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={searchPlaceholder} className="pl-9" />
      </div>
      {filters}
      <Button variant="outline" size="sm" className="gap-1.5">
        <SlidersHorizontal className="size-4" />
        Filters
      </Button>
      {view !== undefined ? (
        <div className="ml-auto inline-flex items-center rounded-xl border border-border bg-card p-0.5 shadow-soft">
          <button
            type="button"
            onClick={() => onViewChange?.("list")}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg transition-colors",
              view === "list" ? "bg-muted text-foreground" : "text-muted-foreground"
            )}
            aria-label="List view"
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange?.("grid")}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg transition-colors",
              view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      ) : null}
      {trailing ? <div className={cn(view === undefined && "ml-auto")}>{trailing}</div> : null}
    </div>
  );
}
