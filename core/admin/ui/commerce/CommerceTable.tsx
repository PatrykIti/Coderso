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
import { AdminLink } from "@/ui/shared/AdminLink";

import { CommerceRowActions } from "./CommerceRowActions";
import type { CommerceProductListRow } from "./CommerceListPage";

const statusStyles: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  archived: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const statusLabels: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

const stockLabels: Record<string, string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  backorder: "Backorder",
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
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
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
              <TableCell
                colSpan={8}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ??
                  "No products yet. Create your first product to start cataloging."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const stockLabel = stockLabels[item.stock.state] ?? item.stock.state;

            return (
              <TableRow
                key={item.id}
                className={isSelected ? "bg-muted/30" : undefined}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select ${item.title}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleProduct?.(item.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <AdminLink
                      href={`/coderso/commerce/${encodeURIComponent(item.id)}`}
                      prefetch
                      className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                      aria-label={`Edit product: ${item.title}`}
                    >
                      {item.title}
                    </AdminLink>
                    <span className="text-xs text-muted-foreground break-all">
                      /{item.slug}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.excerpt ?? "No excerpt"}
                    </span>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                      <Badge
                        variant="outline"
                        className={
                          statusStyles[item.status] ?? statusStyles.draft
                        }
                      >
                        {statusLabels[item.status] ?? item.status}
                      </Badge>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="text-muted-foreground">
                        {formatMoney(item.pricing.amount, item.pricing.currency)}
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>
                        {stockLabel}
                        {item.stock.quantity != null
                          ? ` (${item.stock.quantity})`
                          : ""}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge
                    variant="outline"
                    className={statusStyles[item.status] ?? statusStyles.draft}
                  >
                    {statusLabels[item.status] ?? item.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {formatMoney(item.pricing.amount, item.pricing.currency)}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  {stockLabel}
                  {item.stock.quantity != null ? ` (${item.stock.quantity})` : ""}
                </TableCell>
                <TableCell className="hidden max-w-[12rem] text-sm text-muted-foreground xl:table-cell">
                  {item.collectionLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.collectionLabels.slice(0, 2).map((label, index) => (
                        <Badge
                          key={`${item.id}-${label}-${index}`}
                          variant="secondary"
                        >
                          {label}
                        </Badge>
                      ))}
                      {item.collectionLabels.length > 2 ? (
                        <Badge variant="outline">
                          +{item.collectionLabels.length - 2}
                        </Badge>
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
