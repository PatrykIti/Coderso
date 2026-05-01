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
import { cn } from "@/lib/utils";

export type CustomScreenEntriesBulkActionValue = "publish" | "unpublish" | "delete";

type CustomScreenEntriesBulkActionsBarProps = {
  selectedCount: number;
  action: CustomScreenEntriesBulkActionValue | "";
  allowPublish: boolean;
  allowUnpublish: boolean;
  allowDelete: boolean;
  onActionChange: (value: CustomScreenEntriesBulkActionValue | "") => void;
  onApply: () => void;
  onClear: () => void;
  isApplying?: boolean;
  variant?: "card" | "inline";
};

export function CustomScreenEntriesBulkActionsBar({
  selectedCount,
  action,
  allowPublish,
  allowUnpublish,
  allowDelete,
  onActionChange,
  onApply,
  onClear,
  isApplying = false,
  variant = "card",
}: CustomScreenEntriesBulkActionsBarProps) {
  const isInline = variant === "inline";

  return (
    <div
      data-custom-screen-entry-bulk-actions={variant}
      className={cn(
        isInline
          ? "flex min-w-0 flex-wrap items-center justify-end gap-2"
          : "flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      )}
    >
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
          Selected {selectedCount}
        </Badge>
        <span className={cn("text-xs text-muted-foreground", isInline ? "sr-only" : undefined)}>
          Apply a bulk action to the selected records.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={action}
          onValueChange={(value) => onActionChange(value as CustomScreenEntriesBulkActionValue)}
        >
          <SelectTrigger className={cn("h-8", isInline ? "w-[170px]" : "w-full sm:w-[220px]")}>
            <SelectValue placeholder="Bulk actions" />
          </SelectTrigger>
          <SelectContent>
            {allowPublish ? (
              <SelectItem value="publish">
                <CheckCircle2 className="h-4 w-4" />
                Publish
              </SelectItem>
            ) : null}
            {allowUnpublish ? <SelectItem value="unpublish">Move to Draft</SelectItem> : null}
            {allowDelete ? (
              <SelectItem value="delete" className="text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onApply} disabled={!action || isApplying}>
          {isApplying ? "Applying..." : "Apply"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear record selection">
          {isInline ? "Clear" : "Clear selection"}
        </Button>
      </div>
    </div>
  );
}
