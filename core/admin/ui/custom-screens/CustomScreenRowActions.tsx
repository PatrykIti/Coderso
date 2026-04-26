import {
  MoreHorizontal,
  Pencil,
  SquarePen,
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
import type { CustomScreenStatus } from "@/services/customScreensClient";
import { AdminLink } from "@/ui/shared/AdminLink";

type CustomScreenRowActionsProps = {
  id: string;
  status: CustomScreenStatus;
  onActivate: () => void;
  onMoveToDraft: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

export function CustomScreenRowActions({
  id,
  status,
  onActivate,
  onMoveToDraft,
  onDelete,
  disabled = false,
}: CustomScreenRowActionsProps) {
  const encodedId = encodeURIComponent(id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={disabled}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <AdminLink
            href={`/coderso/custom-screens/${encodedId}/entries`}
            className="w-full"
            prefetch
          >
            <SquarePen className="h-4 w-4" />
            Records
          </AdminLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <AdminLink
            href={`/coderso/custom-screens/${encodedId}`}
            className="w-full"
            prefetch
          >
            <Pencil className="h-4 w-4" />
            Edit
          </AdminLink>
        </DropdownMenuItem>
        {status === "draft" ? (
          <DropdownMenuItem onClick={onActivate}>
            <Upload className="h-4 w-4" />
            Activate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onMoveToDraft}>
            <Upload className="h-4 w-4 rotate-180" />
            Move to draft
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
