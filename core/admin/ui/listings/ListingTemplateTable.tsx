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
import type { ListingTemplateRecord } from "@/services/listingsClient";

import { listingLayoutOptions } from "./defaults";

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

const layoutLabel = (value: string) =>
  listingLayoutOptions.find((option) => option.value === value)?.label ?? value;

type ListingTemplateTableProps = {
  items: ListingTemplateRecord[];
  emptyMessage?: string;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleAll?: () => void;
  onToggleItem?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ListingTemplateTable({
  items,
  emptyMessage,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  onToggleAll,
  onToggleItem,
  onEdit,
  onDelete,
}: ListingTemplateTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all listing templates"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="min-w-[14rem] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Template
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Layout
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Bindings
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
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
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage ?? "No listing templates yet."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((template) => {
            const isSelected = selectedIds.includes(template.id);
            const bindingCount = template.config.fields.length;
            return (
              <TableRow key={template.id} className={isSelected ? "bg-muted/30" : undefined}>
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select ${template.name}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleItem?.(template.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="break-words font-semibold">{template.name}</span>
                    <span className="break-all text-xs text-muted-foreground">
                      /{template.slug}
                    </span>
                    {template.description ? (
                      <span className="text-xs text-muted-foreground">{template.description}</span>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs md:hidden">
                      <Badge variant="outline">{layoutLabel(template.layout)}</Badge>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="text-muted-foreground">
                        {bindingCount} binding{bindingCount === 1 ? "" : "s"}
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="text-muted-foreground">
                        {formatDate(template.updatedAt)}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden px-4 py-6 md:table-cell">
                  <Badge variant="outline">{layoutLabel(template.layout)}</Badge>
                </TableCell>
                <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground lg:table-cell">
                  {bindingCount} binding{bindingCount === 1 ? "" : "s"}
                </TableCell>
                <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground xl:table-cell">
                  {formatDate(template.updatedAt)}
                </TableCell>
                <TableCell className="w-12 py-6 pr-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => onEdit(template.id)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(template.id)}>
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
