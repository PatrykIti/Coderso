import { MoreHorizontal, SquarePen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EntrySummary } from "@/services/entriesClient";
import { AdminLink } from "@/ui/shared/AdminLink";
import type { CustomScreenListViewDefinition } from "../../../services/customScreens/customScreenSchemas";
import { getVisibleListColumns, resolveEntryColumnValue } from "./customScreenListModel";

type CustomScreenEntriesTableProps = {
  items: EntrySummary[];
  listView: CustomScreenListViewDefinition;
  emptyMessage?: string;
  buildRowHref: (entry: EntrySummary) => string;
  preview?: boolean;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleAll?: () => void;
  onToggleEntry?: (id: string) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CustomScreenEntriesTable({
  items,
  listView,
  emptyMessage,
  buildRowHref,
  preview = false,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  onToggleAll,
  onToggleEntry,
  onPublish,
  onUnpublish,
  onDelete,
}: CustomScreenEntriesTableProps) {
  const hasSelection =
    !preview &&
    (listView.bulkActions.delete || listView.bulkActions.publish || listView.bulkActions.unpublish);
  const columns = getVisibleListColumns(listView);
  const resolvedColumns =
    columns.length > 0
      ? columns
      : [
          {
            id: "fallback-title",
            source: "system" as const,
            field: "title",
            label: "Record",
            formatter: "text" as const,
            visible: true,
          },
        ];
  const hasActions = !preview;
  const colSpan = Math.max(resolvedColumns.length + (hasSelection ? 2 : hasActions ? 1 : 0), 2);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            {hasSelection ? (
              <TableHead className="w-10 pl-4">
                <Checkbox
                  aria-label="Select all records"
                  checked={isIndeterminate ? "indeterminate" : isAllSelected}
                  onCheckedChange={() => onToggleAll?.()}
                />
              </TableHead>
            ) : null}
            {resolvedColumns.map((column) => (
              <TableHead
                key={column.id}
                className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground first:pl-6"
              >
                {column.label}
              </TableHead>
            ))}
            {hasActions ? (
              <TableHead className="w-12 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="px-6 py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "No records yet."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => {
            const rowHref = buildRowHref(item);
            const isSelected = selectedIds.includes(item.id);
            return (
              <TableRow key={item.id}>
                {hasSelection ? (
                  <TableCell className="pl-4">
                    <Checkbox
                      aria-label={`Select ${item.title}`}
                      checked={isSelected}
                      onCheckedChange={() => onToggleEntry?.(item.id)}
                    />
                  </TableCell>
                ) : null}
                {resolvedColumns.map((column, index) => (
                  <TableCell key={column.id} className="px-4 py-5 text-sm first:pl-6">
                    {index === 0 && !preview ? (
                      <div className="flex flex-col gap-1">
                        <AdminLink
                          href={rowHref}
                          className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                        >
                          {resolveEntryColumnValue({ entry: item, column })}
                        </AdminLink>
                        <span className="text-xs text-muted-foreground">/{item.slug}</span>
                      </div>
                    ) : (
                      <span>{resolveEntryColumnValue({ entry: item, column })}</span>
                    )}
                  </TableCell>
                ))}
                {hasActions ? (
                  <TableCell className="w-12 py-5 pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Record actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <AdminLink href={rowHref} className="w-full">
                            <SquarePen className="h-4 w-4" />
                            Edit record
                          </AdminLink>
                        </DropdownMenuItem>
                        {item.status === "published" ? (
                          <DropdownMenuItem onClick={() => onUnpublish?.(item.id)}>
                            Move to Draft
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => onPublish?.(item.id)}>
                            Publish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
