import { CheckCircle2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BulkActionValue = "publish" | "draft" | "archive" | "delete";

type EntryBulkActionsBarProps = {
  selectedCount: number;
  action: BulkActionValue | "";
  onActionChange: (value: BulkActionValue | "") => void;
  onApply: () => void;
  onClear: () => void;
  isApplying?: boolean;
};

export function EntryBulkActionsBar({
  selectedCount,
  action,
  onActionChange,
  onApply,
  onClear,
  isApplying = false,
}: EntryBulkActionsBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
          Selected {selectedCount}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Apply a bulk action to the selected entries.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={action} onValueChange={(value) => onActionChange(value as BulkActionValue)}>
          <SelectTrigger className="h-8 w-full sm:w-[200px]">
            <SelectValue placeholder="Bulk actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="publish">
              <CheckCircle2 className="h-4 w-4" />
              Publish
            </SelectItem>
            <SelectItem value="draft">Move to Draft</SelectItem>
            <SelectItem value="archive">Archive</SelectItem>
            <SelectItem value="delete" className="text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onApply} disabled={!action || isApplying}>
          {isApplying ? "Applying..." : "Apply"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear selection
        </Button>
      </div>
    </div>
  );
}
