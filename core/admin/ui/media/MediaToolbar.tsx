import { Grid2X2, List, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MediaFilter = "all" | "image" | "document" | "audio";
export type MediaView = "grid" | "list";

type MediaToolbarProps = {
  search: string;
  filter: MediaFilter;
  view: MediaView;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: MediaFilter) => void;
  onViewChange: (value: MediaView) => void;
};

export function MediaToolbar({
  search,
  filter,
  view,
  onSearchChange,
  onFilterChange,
  onViewChange,
}: MediaToolbarProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            className="pl-9"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("all")}
          >
            All Files
          </Button>
          <Button
            variant={filter === "image" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("image")}
          >
            Images
          </Button>
          <Button
            variant={filter === "document" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("document")}
          >
            Documents
          </Button>
          <Button
            variant={filter === "audio" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("audio")}
          >
            Audio
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={view === "grid" ? "outline" : "ghost"}
          size="icon"
          onClick={() => onViewChange("grid")}
        >
          <Grid2X2 className="h-4 w-4" />
        </Button>
        <Button
          variant={view === "list" ? "outline" : "ghost"}
          size="icon"
          onClick={() => onViewChange("list")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
