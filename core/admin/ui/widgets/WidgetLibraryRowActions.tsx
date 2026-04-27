import {
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { WidgetLibrarySection } from "./widgetLibraryUtils";
import type { WidgetSource } from "./types";

type WidgetLibraryRowActionsProps = {
  source: WidgetSource;
  section: WidgetLibrarySection;
  isFavorite: boolean;
  onPreview: () => void;
  onConfigure?: () => void;
  onInsert?: () => void;
  onEditTemplate?: () => void;
  onDuplicateTemplate?: () => void;
  onDeleteTemplate?: () => void;
  onFavoriteToggle: () => void;
  disabled?: boolean;
};

export function WidgetLibraryRowActions({
  source,
  section,
  isFavorite,
  onPreview,
  onConfigure,
  onInsert,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onFavoriteToggle,
  disabled = false,
}: WidgetLibraryRowActionsProps) {
  const isTemplate = source === "template";
  const showTemplateManagement = section === "templates" && isTemplate;

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
        {source === "core" ? (
          <>
            <DropdownMenuItem onClick={onConfigure}>
              <Settings2 className="h-4 w-4" />
              Configure
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsert}>
              <Plus className="h-4 w-4" />
              Insert
            </DropdownMenuItem>
          </>
        ) : null}
        {isTemplate ? (
          <DropdownMenuItem onClick={onEditTemplate}>
            <Pencil className="h-4 w-4" />
            Edit template
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={onFavoriteToggle}>
          <Star className={isFavorite ? "h-4 w-4 fill-yellow-400 text-yellow-500" : "h-4 w-4"} />
          {isFavorite ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>
        {showTemplateManagement ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDuplicateTemplate}>
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={onDeleteTemplate}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
