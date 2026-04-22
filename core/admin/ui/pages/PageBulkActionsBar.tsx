import { Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PageBulkActionValue = "publish" | "unpublish" | "delete";

type PageBulkActionsBarProps = {
  selectedCount: number;
  action: PageBulkActionValue | "";
  onActionChange: (value: PageBulkActionValue | "") => void;
  onApply: () => void;
  onClear: () => void;
  isApplying?: boolean;
};

export function PageBulkActionsBar({
  selectedCount,
  action,
  onActionChange,
  onApply,
  onClear,
  isApplying = false,
}: PageBulkActionsBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
          Selected {selectedCount}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Apply a bulk action to the selected pages.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={action}
          onValueChange={(value) => onActionChange(value as PageBulkActionValue)}
        >
          <SelectTrigger className="h-8 w-full sm:w-[200px]">
            <SelectValue placeholder="Bulk actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="publish">
              <Upload className="h-4 w-4" />
              Publish
            </SelectItem>
            <SelectItem value="unpublish">Unpublish</SelectItem>
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
