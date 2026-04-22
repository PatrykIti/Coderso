import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type BlockToolbarProps = {
  blockLabel: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
};

export function BlockToolbar({
  blockLabel,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  disableMoveUp,
  disableMoveDown,
}: BlockToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={onMoveUp}
        disabled={disableMoveUp}
        aria-label={`Move ${blockLabel} up`}
        title={`Move ${blockLabel} up`}
      >
        <ArrowUp className="h-3 w-3" />
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={onMoveDown}
        disabled={disableMoveDown}
        aria-label={`Move ${blockLabel} down`}
        title={`Move ${blockLabel} down`}
      >
        <ArrowDown className="h-3 w-3" />
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={onDuplicate}
        aria-label={`Duplicate ${blockLabel}`}
        title={`Duplicate ${blockLabel}`}
      >
        <Copy className="h-3 w-3" />
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        aria-label={`Delete ${blockLabel}`}
        title={`Delete ${blockLabel}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
