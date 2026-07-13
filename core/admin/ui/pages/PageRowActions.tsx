import { Copy, Eye, MoreHorizontal, Pencil, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { PageStatus } from "@/services/pagesClient";

type PageRowActionsProps = {
  status: PageStatus;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  actionLabel?: string;
};

export function PageRowActions({
  status,
  onEdit,
  onPreview,
  onDuplicate,
  onPublish,
  onUnpublish,
  onDelete,
  disabled = false,
  actionLabel = "Page actions",
}: PageRowActionsProps) {
  const canPublish = status !== "published";
  const canUnpublish = status === "published";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label={actionLabel}>
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPreview}>
          <Eye className="h-4 w-4" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canPublish} onClick={onPublish}>
          <Upload className="h-4 w-4" />
          Publish
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canUnpublish} onClick={onUnpublish}>
          <Upload className="h-4 w-4 rotate-180" />
          Unpublish
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={!onDelete} onClick={() => onDelete?.()}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
