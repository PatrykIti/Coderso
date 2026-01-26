import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type BlockToolbarProps = {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
};

export function BlockToolbar({
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
      >
        <ArrowUp className="h-3 w-3" />
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={onMoveDown}
        disabled={disableMoveDown}
      >
        <ArrowDown className="h-3 w-3" />
      </Button>
      <Button size="icon-xs" variant="ghost" onClick={onDuplicate}>
        <Copy className="h-3 w-3" />
      </Button>
      <Button size="icon-xs" variant="ghost" onClick={onDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
