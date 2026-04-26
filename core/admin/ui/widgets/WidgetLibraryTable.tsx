import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { WidgetItem, WidgetSource } from "./types";

export type WidgetLibraryTableRow = WidgetItem & {
  source: WidgetSource;
};

type WidgetLibraryTableProps = {
  rows: WidgetLibraryTableRow[];
  selectedIds: string[];
  isAllSelected: boolean;
  isIndeterminate: boolean;
  emptyMessage: string;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
  onOpenPrimary: (row: WidgetLibraryTableRow) => void;
  renderActions: (row: WidgetLibraryTableRow) => React.ReactNode;
};

const sourceLabel: Record<WidgetSource, string> = {
  core: "Widget",
  template: "Template",
};

export function WidgetLibraryTable({
  rows,
  selectedIds,
  isAllSelected,
  isIndeterminate,
  emptyMessage,
  onToggleAll,
  onToggleRow,
  onOpenPrimary,
  renderActions,
}: WidgetLibraryTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all visible widgets"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={onToggleAll}
              />
            </TableHead>
            <TableHead className="min-w-[14rem] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Item
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Type
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Category
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
              Details
            </TableHead>
            <TableHead className="w-12 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => {
            const isSelected = selectedIds.includes(row.id);
            return (
              <TableRow
                key={row.id}
                className={isSelected ? "bg-muted/30" : undefined}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select ${row.name}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleRow(row.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 flex-col gap-1">
                    <button
                      type="button"
                      className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:text-primary hover:underline focus-visible:underline"
                      onClick={() => onOpenPrimary(row)}
                    >
                      {row.name}
                    </button>
                    {row.description ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {row.description}
                      </span>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                      <Badge variant="outline">{sourceLabel[row.source]}</Badge>
                      <span>{row.categoryLabel}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={row.source === "template" ? "secondary" : "outline"}>
                    {sourceLabel[row.source]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {row.categoryLabel}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  {row.source === "template" ? (
                    <Badge variant={row.status === "published" ? "default" : "outline"}>
                      {row.status ?? "draft"}
                    </Badge>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{row.complexity}</Badge>
                      <Badge variant="outline">{row.module}</Badge>
                    </div>
                  )}
                </TableCell>
                <TableCell className="w-12 pr-4 text-right">
                  {renderActions(row)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
