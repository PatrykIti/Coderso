import { Badge } from "@/components/ui/badge";
import { AdminLink } from "@/ui/shared/AdminLink";
import { StatusBadge } from "@/ui/shared/StatusBadge";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { withAdminBasePath } from "@/utils/adminPaths";
import type { ContentTypeSummary } from "@/services/contentTypesClient";

export type ContentTypeRow = ContentTypeSummary & {
  fieldCount: number;
  status: "published" | "draft";
  duplicateNameCount?: number;
};

export type ContentTypeSortKey = "name" | "slug" | "fieldCount" | "status";

export type ContentTypeTableProps = {
  rows: ContentTypeRow[];
  basePath: string;
  isLoading?: boolean;
  emptyMessage?: string;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  sortKey?: ContentTypeSortKey;
  sortDirection?: "asc" | "desc";
  onToggleAll?: () => void;
  onToggleRow?: (id: string) => void;
  onSort?: (key: ContentTypeSortKey) => void;
  onDuplicate?: (row: ContentTypeRow) => void;
  onDelete?: (row: ContentTypeRow) => void;
};

export function ContentTypeTable({
  rows,
  basePath,
  isLoading,
  emptyMessage,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  sortKey,
  sortDirection,
  onToggleAll,
  onToggleRow,
  onSort,
  onDuplicate,
  onDelete,
}: ContentTypeTableProps) {
  const renderSortableHead = (key: ContentTypeSortKey, label: string) => {
    const active = sortKey === key;
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        onClick={() => onSort?.(key)}
      >
        {label}
        {active ? ` ${sortDirection === "desc" ? "↓" : "↑"}` : ""}
      </Button>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all content types"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="pl-4">{renderSortableHead("name", "Name")}</TableHead>
            <TableHead>{renderSortableHead("slug", "Slug")}</TableHead>
            <TableHead>{renderSortableHead("fieldCount", "Fields")}</TableHead>
            <TableHead>{renderSortableHead("status", "Status")}</TableHead>
            <TableHead className="pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="px-4 py-6 text-sm text-muted-foreground">
                Loading content types...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-4 py-6 text-sm text-muted-foreground">
                {emptyMessage ?? "No content types yet. Create the first one to get started."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((type) => {
              const editHref = withAdminBasePath(basePath, `/content-types/${type.id}`);
              const isSelected = selectedIds.includes(type.id);
              return (
                <TableRow key={type.id} className={isSelected ? "bg-muted/30" : undefined}>
                  <TableCell className="pl-4">
                    <Checkbox
                      aria-label={`Select ${type.name}`}
                      checked={isSelected}
                      onCheckedChange={() => onToggleRow?.(type.id)}
                    />
                  </TableCell>
                  <TableCell className="pl-4 py-4">
                    <div className="space-y-1">
                      <AdminLink
                        href={editHref}
                        prefetch
                        className="text-sm font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                        aria-label={`Edit content type: ${type.name}`}
                      >
                        {type.name}
                      </AdminLink>
                      {type.duplicateNameCount && type.duplicateNameCount > 1 ? (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          Duplicate name
                        </Badge>
                      ) : null}
                      <p className="text-xs text-muted-foreground">{type.fieldCount} fields</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground">{type.slug}</TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline">{type.fieldCount}</Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <StatusBadge status={type.status} />
                  </TableCell>
                  <TableCell className="py-4 pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Open actions for ${type.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <AdminLink href={editHref} prefetch>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </AdminLink>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicate?.(type)}>
                          <Copy className="h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(type)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
