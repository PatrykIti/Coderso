import {
  Archive,
  FilePenLine,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CommerceProductStatus } from "@/services/commerceClient";

type CommerceRowActionsProps = {
  status: CommerceProductStatus;
  onEdit: () => void;
  onPublish: () => void;
  onMoveToDraft: () => void;
  onArchive: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

export function CommerceRowActions({
  status,
  onEdit,
  onPublish,
  onMoveToDraft,
  onArchive,
  onDelete,
  disabled = false,
}: CommerceRowActionsProps) {
  const canPublish = status !== "published";
  const canMoveToDraft = status === "published" || status === "archived";
  const canArchive = status !== "archived";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={disabled}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canPublish} onClick={onPublish}>
          <Upload className="h-4 w-4" />
          Publish
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canMoveToDraft} onClick={onMoveToDraft}>
          <FilePenLine className="h-4 w-4" />
          Move to draft
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canArchive} onClick={onArchive}>
          <Archive className="h-4 w-4" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
