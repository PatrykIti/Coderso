import {
  Archive,
  FilePenLine,
  ListChecks,
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

import type { FormStatus } from "@/services/formsClient";

type FormRowActionsProps = {
  status: FormStatus;
  onEdit: () => void;
  onActionLogs: () => void;
  onPublish: () => void;
  onMoveToDraft: () => void;
  onArchive: () => void;
  onDelete?: () => void;
  disabled?: boolean;
};

export function FormRowActions({
  status,
  onEdit,
  onActionLogs,
  onPublish,
  onMoveToDraft,
  onArchive,
  onDelete,
  disabled = false,
}: FormRowActionsProps) {
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
        <DropdownMenuItem onClick={onActionLogs}>
          <ListChecks className="h-4 w-4" />
          Action logs
        </DropdownMenuItem>
        {status !== "published" ? (
          <DropdownMenuItem onClick={onPublish}>
            <Upload className="h-4 w-4" />
            Publish
          </DropdownMenuItem>
        ) : null}
        {status !== "draft" ? (
          <DropdownMenuItem onClick={onMoveToDraft}>
            <FilePenLine className="h-4 w-4" />
            Move to draft
          </DropdownMenuItem>
        ) : null}
        {status !== "archived" ? (
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="h-4 w-4" />
            Archive
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={!onDelete}
          onClick={() => onDelete?.()}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
