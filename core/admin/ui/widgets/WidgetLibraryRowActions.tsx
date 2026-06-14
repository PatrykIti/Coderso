import { Eye, MoreHorizontal, Plus, Settings2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { WidgetLibrarySection } from "./widgetLibraryUtils";

type WidgetLibraryRowActionsProps = {
  section: WidgetLibrarySection;
  isFavorite: boolean;
  onPreview: () => void;
  onConfigure?: () => void;
  onInsert?: () => void;
  onFavoriteToggle: () => void;
  disabled?: boolean;
};

export function WidgetLibraryRowActions({
  isFavorite,
  onPreview,
  onConfigure,
  onInsert,
  onFavoriteToggle,
  disabled = false,
}: WidgetLibraryRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Open widget actions"
          title="Actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onPreview}>
          <Eye className="h-4 w-4" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onConfigure}>
          <Settings2 className="h-4 w-4" />
          Configure
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInsert}>
          <Plus className="h-4 w-4" />
          Insert
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onFavoriteToggle}>
          <Star className={isFavorite ? "h-4 w-4 fill-yellow-400 text-yellow-500" : "h-4 w-4"} />
          {isFavorite ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
