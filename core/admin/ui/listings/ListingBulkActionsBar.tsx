import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ListingBulkActionValue = "delete";

type ListingBulkActionsBarProps = {
  selectedCount: number;
  action: ListingBulkActionValue | "";
  resourceLabel: string;
  onActionChange: (value: ListingBulkActionValue | "") => void;
  onApply: () => void;
  onClear: () => void;
  isApplying?: boolean;
};

export function ListingBulkActionsBar({
  selectedCount,
  action,
  resourceLabel,
  onActionChange,
  onApply,
  onClear,
  isApplying = false,
}: ListingBulkActionsBarProps) {
  return (
    <div
      data-listing-bulk-actions="inline"
      className="flex min-w-0 flex-wrap items-center justify-end gap-2 rounded-2xl border border-border bg-card px-2.5 py-1.5 shadow-soft"
    >
      <Badge variant="soft" className="text-[10px] uppercase tracking-widest">
        Selected {selectedCount}
      </Badge>
      <span className="sr-only">Apply a bulk action to the selected {resourceLabel}.</span>
      <Select
        value={action}
        onValueChange={(value) => onActionChange(value as ListingBulkActionValue)}
      >
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="Bulk actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="delete" className="text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete
          </SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" onClick={onApply} disabled={!action || isApplying}>
        {isApplying ? "Applying..." : "Apply"}
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear listing selection">
        Clear
      </Button>
    </div>
  );
}
