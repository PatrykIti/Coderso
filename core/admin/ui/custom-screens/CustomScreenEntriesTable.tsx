import { MoreHorizontal, Pencil, SquarePen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  buildClassicHref: (entry: EntrySummary) => string;
  onDelete: (id: string) => void;
};

export function CustomScreenEntriesTable({
  items,
  listView,
  emptyMessage,
  buildRowHref,
  buildClassicHref,
  onDelete,
}: CustomScreenEntriesTableProps) {
  const columns = getVisibleListColumns(listView);
  const colSpan = Math.max(columns.length + 1, 2);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground first:pl-6"
              >
                {column.label}
              </TableHead>
            ))}
            <TableHead className="w-12 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
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
            return (
              <TableRow key={item.id}>
                {columns.map((column, index) => (
                  <TableCell key={column.id} className="px-4 py-5 text-sm first:pl-6">
                    {index === 0 ? (
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
                      <DropdownMenuItem asChild>
                        <AdminLink href={buildClassicHref(item)} className="w-full">
                          <Pencil className="h-4 w-4" />
                          Classic editor
                        </AdminLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
