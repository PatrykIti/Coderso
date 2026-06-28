import { useId } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { ADMIN_LIST_PAGE_SIZE_OPTIONS, type ListPaginationState } from "./useListPagination";

type ListPaginationFooterProps<T> = {
  pagination: ListPaginationState<T>;
  resourceLabel: string;
  className?: string;
  isLoading?: boolean;
};

export function ListPaginationFooter<T>({
  pagination,
  resourceLabel,
  className,
  isLoading = false,
}: ListPaginationFooterProps<T>) {
  const pageSizeLabelId = useId();
  const rangeCopy = isLoading
    ? `Loading ${resourceLabel}...`
    : pagination.totalItems === 0
      ? `Showing 0 of 0 ${resourceLabel}`
      : `Showing ${pagination.rangeStart}-${pagination.rangeEnd} of ${pagination.totalItems} ${resourceLabel}`;

  return (
    // TASK-479-06-L02: rethemed onto the soft/violet tokens (explicit
    // `border-border`). API + range-copy text node unchanged — the new
    // rounded/soft controls come from the L01 Button/Select restyle.
    <div
      className={cn(
        "flex flex-col items-start gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <span>{rangeCopy}</span>
      <div className="flex flex-wrap items-center gap-2">
        <span id={pageSizeLabelId} className="text-xs font-medium text-muted-foreground">
          Rows
        </span>
        <Select
          value={String(pagination.pageSize)}
          onValueChange={pagination.setPageSize}
          disabled={isLoading}
        >
          <SelectTrigger size="sm" className="h-8 w-[92px]" aria-labelledby={pageSizeLabelId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADMIN_LIST_PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.previousPage}
          disabled={isLoading || !pagination.canPreviousPage}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.nextPage}
          disabled={isLoading || !pagination.canNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
