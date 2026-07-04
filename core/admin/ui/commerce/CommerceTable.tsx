import { ShoppingBag } from "lucide-react";

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
import { cn } from "@/lib/utils";
import type { CommerceStockState } from "@/services/commerceClient";
import { AdminLink } from "@/ui/shared/AdminLink";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import { CommerceRowActions } from "./CommerceRowActions";
import type { CommerceProductListRow } from "./CommerceListPage";

/**
 * TASK-479-19-L01: token-driven stock badge over the real `CommerceStockState`
 * enum (in_stock -> success, out_of_stock -> destructive, backorder -> warning).
 * Replaces the previous inline `stockLabels` string. The product status pill now
 * reuses the shared `StatusBadge` (479-06-L02) so the catalog matches the rest of
 * the admin instead of a divergent local hex map.
 */
const stockBadge: Record<
  CommerceStockState,
  { variant: "success" | "warning" | "destructive"; label: string }
> = {
  in_stock: { variant: "success", label: "In stock" },
  out_of_stock: { variant: "destructive", label: "Out of stock" },
  backorder: { variant: "warning", label: "Backorder" },
};

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

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
};

type CommerceTableProps = {
  items: CommerceProductListRow[];
  emptyMessage?: string;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleAll?: () => void;
  onToggleProduct?: (id: string) => void;
  onEdit: (id: string) => void;
  onPublish: (id: string) => void;
  onMoveToDraft: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CommerceTable({
  items,
  emptyMessage,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  onToggleAll,
  onToggleProduct,
  onEdit,
  onPublish,
  onMoveToDraft,
  onArchive,
  onDelete,
}: CommerceTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all products"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="min-w-[13rem] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Price
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
              Stock
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
              Collections
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground 2xl:table-cell">
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
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage ?? "No products yet. Create your first product to start cataloging."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const stock = stockBadge[item.stock.state];
            const quantitySuffix = item.stock.quantity != null ? ` (${item.stock.quantity})` : "";

            return (
              <TableRow
                key={item.id}
                className={cn(
                  "transition-colors",
                  isSelected ? "bg-muted/30" : "hover:bg-accent/40"
                )}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select ${item.title}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleProduct?.(item.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                    >
                      <ShoppingBag className="size-5" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <AdminLink
                        href={`/advanced/commerce/${encodeURIComponent(item.id)}`}
                        prefetch
                        className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                        aria-label={`Edit product: ${item.title}`}
                      >
                        {item.title}
                      </AdminLink>
                      <span className="text-xs text-muted-foreground break-all">/{item.slug}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.excerpt ?? "No excerpt"}
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                        <StatusBadge status={item.status} />
                        <span className="text-muted-foreground/60">•</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatMoney(item.pricing.amount, item.pricing.currency)}
                        </span>
                        <span className="text-muted-foreground/60">•</span>
                        <Badge variant={stock.variant}>{stock.label}</Badge>
                        {quantitySuffix ? <span>{quantitySuffix.trim()}</span> : null}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="hidden text-right text-sm tabular-nums text-foreground lg:table-cell">
                  {formatMoney(item.pricing.amount, item.pricing.currency)}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <Badge variant={stock.variant}>{stock.label}</Badge>
                    {quantitySuffix ? (
                      <span className="tabular-nums">{quantitySuffix.trim()}</span>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="hidden max-w-[12rem] text-sm text-muted-foreground xl:table-cell">
                  {item.collectionLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.collectionLabels.slice(0, 2).map((label, index) => (
                        <Badge key={`${item.id}-${label}-${index}`} variant="secondary">
                          {label}
                        </Badge>
                      ))}
                      {item.collectionLabels.length > 2 ? (
                        <Badge variant="outline">+{item.collectionLabels.length - 2}</Badge>
                      ) : null}
                    </div>
                  ) : (
                    "No collections"
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground 2xl:table-cell">
                  {formatDate(item.updatedAt)}
                </TableCell>
                <TableCell className="w-12 pr-4 text-right">
                  <CommerceRowActions
                    status={item.status}
                    onEdit={() => onEdit(item.id)}
                    onPublish={() => onPublish(item.id)}
                    onMoveToDraft={() => onMoveToDraft(item.id)}
                    onArchive={() => onArchive(item.id)}
                    onDelete={() => onDelete(item.id)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
