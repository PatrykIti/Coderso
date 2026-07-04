import { Grid2X2, List, Search } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// TASK-479-11-L01: MediaFilter keeps the real filter union the folder rail
// drives (page-level `setFilter`). "video" is included so the Videos folder maps
// onto the existing MediaKind without a new backend; the rail owns the pills now,
// so MediaToolbar no longer renders inline filter buttons.
export type MediaFilter = "all" | "image" | "video" | "document" | "audio";
export type MediaView = "grid" | "list";

type MediaToolbarProps = {
  search: string;
  view: MediaView;
  openAfterUpload?: boolean;
  onOpenAfterUploadChange?: (value: boolean) => void;
  onSearchChange: (value: string) => void;
  onViewChange: (value: MediaView) => void;
};

export function MediaToolbar({
  search,
  view,
  openAfterUpload,
  onOpenAfterUploadChange,
  onSearchChange,
  onViewChange,
}: MediaToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          className="pl-9"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      {onOpenAfterUploadChange ? (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={Boolean(openAfterUpload)}
            onCheckedChange={(next) => onOpenAfterUploadChange(next === true)}
          />
          Open details after upload
        </label>
      ) : null}
      <div className="ml-auto inline-flex items-center rounded-xl border border-border bg-card p-0.5 shadow-soft">
        <button
          type="button"
          onClick={() => onViewChange("grid")}
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg transition-colors",
            view === "grid"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Grid2X2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onViewChange("list")}
          aria-label="List view"
          aria-pressed={view === "list"}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg transition-colors",
            view === "list"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <List className="size-4" />
        </button>
      </div>
    </div>
  );
}
