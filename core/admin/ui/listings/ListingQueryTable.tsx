import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { ListingQueryRecord } from "@/services/listingsClient";
import { AdminLink } from "@/ui/shared/AdminLink";

import { listingSourceOptions } from "./defaults";

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const sourceLabel = (value: string) =>
  listingSourceOptions.find((option) => option.value === value)?.label ?? value;

type ListingQueryTableProps = {
  items: ListingQueryRecord[];
  emptyMessage?: string;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleAll?: () => void;
  onToggleItem?: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ListingQueryTable({
  items,
  emptyMessage,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  onToggleAll,
  onToggleItem,
  onDelete,
}: ListingQueryTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all listing queries"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="min-w-[16rem] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Query
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Source
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Updated
            </TableHead>
            <TableHead className="w-12 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "No listing queries yet."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
            <TableRow
              key={item.id}
              className={isSelected ? "bg-muted/30" : undefined}
            >
              <TableCell className="pl-4">
                <Checkbox
                  aria-label={`Select ${item.name}`}
                  checked={isSelected}
                  onCheckedChange={() => onToggleItem?.(item.id)}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <AdminLink
                    href={`/coderso/listings/${encodeURIComponent(item.id)}`}
                    prefetch
                    className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                    aria-label={`Edit listing query: ${item.name}`}
                  >
                    {item.name}
                  </AdminLink>
                  <span className="text-xs text-muted-foreground">
                    {item.description ?? "No description"}
                  </span>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs md:hidden">
                    <Badge variant="outline" className="capitalize">
                      {sourceLabel(item.query.source)}
                    </Badge>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground">
                      {formatDate(item.updatedAt)}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden px-4 py-6 md:table-cell">
                <Badge variant="outline">{sourceLabel(item.query.source)}</Badge>
              </TableCell>
              <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground lg:table-cell">
                {formatDate(item.updatedAt)}
              </TableCell>
              <TableCell className="w-12 py-6 pr-4 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem asChild>
                      <AdminLink
                        href={`/coderso/listings/${encodeURIComponent(item.id)}`}
                        className="w-full"
                        prefetch
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </AdminLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(item.id)}
                    >
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
