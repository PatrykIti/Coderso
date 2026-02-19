import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import type { CommerceProductRecord } from "@/services/commerceClient";
import { AdminLink } from "@/ui/shared/AdminLink";

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
  items: CommerceProductRecord[];
  emptyMessage?: string;
  onDelete: (id: string) => void;
};

export function CommerceTable({ items, emptyMessage, onDelete }: CommerceTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="min-w-[15rem] pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Price
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
              Stock
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
              Updated
            </TableHead>
            <TableHead className="w-12 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="px-6 py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "No products yet. Create your first product to start cataloging."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="py-6 pl-6">
                <div className="flex flex-col gap-1">
                  <AdminLink
                    href={`/coderso/commerce/${encodeURIComponent(item.id)}`}
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
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs md:hidden">
                    <Badge
                      variant="outline"
                      className={statusStyles[item.status] ?? statusStyles.draft}
                    >
                      {statusLabels[item.status] ?? item.status}
                    </Badge>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground">
                      {formatMoney(item.pricing.amount, item.pricing.currency)}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden px-4 py-6 md:table-cell">
                <Badge
                  variant="outline"
                  className={statusStyles[item.status] ?? statusStyles.draft}
                >
                  {statusLabels[item.status] ?? item.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground lg:table-cell">
                {formatMoney(item.pricing.amount, item.pricing.currency)}
              </TableCell>
              <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground xl:table-cell">
                {item.stock.state.replace("_", " ")}
                {item.stock.quantity != null ? ` (${item.stock.quantity})` : ""}
              </TableCell>
              <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground xl:table-cell">
                {formatDate(item.updatedAt)}
              </TableCell>
              <TableCell className="w-12 py-6 pr-6 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem asChild>
                      <AdminLink
                        href={`/coderso/commerce/${encodeURIComponent(item.id)}`}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
