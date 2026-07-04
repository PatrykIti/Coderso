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
import { cn } from "@/lib/cn";

export type Column<Row> = {
  key: string;
  header: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  render?: (row: Row, index: number) => ReactNode;
};

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
  const alignClass = (align?: string) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-soft", className)}>
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
                <TableCell onClick={(e) => e.stopPropagation()}>
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
