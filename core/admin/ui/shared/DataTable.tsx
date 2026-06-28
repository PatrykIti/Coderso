import { type ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * TASK-479-06-L02: generic config-driven table ported from the prototype
 * (`patterns/DataTable.tsx`). Presentational — `rows` are rendered as given;
 * pair empty `rows` with `EmptyState` at the call site. `selectable` adds a
 * checkbox column; the checkbox cell stops row-click propagation.
 */
export type Column<Row> = {
  key: string;
  header: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  render?: (row: Row, index: number) => ReactNode;
};

const alignClass = (align?: string) =>
  align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

export function DataTable<Row extends Record<string, unknown>>({
  columns,
  rows,
  selectable,
  onRowClick,
  className,
}: {
  columns: Column<Row>[];
  rows: Row[];
  selectable?: boolean;
  onRowClick?: (row: Row) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-soft",
        className
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selectable ? (
              <TableHead className="w-10">
                <Checkbox aria-label="Select all" />
              </TableHead>
            ) : null}
            {columns.map((col) => (
              <TableHead key={col.key} className={cn(alignClass(col.align), col.className)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={index}
              className={onRowClick ? "cursor-pointer" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {selectable ? (
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox aria-label="Select row" />
                </TableCell>
              ) : null}
              {columns.map((col) => (
                <TableCell key={col.key} className={cn(alignClass(col.align), col.className)}>
                  {col.render ? col.render(row, index) : (row[col.key] as ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
