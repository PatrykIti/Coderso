import { Ban, CheckCircle2, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type RedirectStatus = "active" | "inactive";

export type RedirectRow = {
  id: string;
  from: string;
  to: string;
  type: "301" | "302" | "307" | "308";
  status: RedirectStatus;
  lastHit: string;
};

type RedirectsTableProps = {
  items: RedirectRow[];
  isLoading: boolean;
  isSaving: boolean;
  total: number;
  page: number;
  limit: number;
  isFiltering?: boolean;
  onCreate?: () => void;
  onEdit?: (redirect: RedirectRow) => void;
  onToggle?: (redirect: RedirectRow) => void;
  onDelete?: (redirect: RedirectRow) => void;
  onPageChange?: (page: number) => void;
};

const statusMeta: Record<RedirectStatus, { label: string; badge: string; dot: string }> = {
  active: {
    label: "Active",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    badge: "border-slate-500/20 bg-slate-500/10 text-slate-600",
    dot: "bg-slate-400",
  },
};

const typeBadge: Record<RedirectRow["type"], string> = {
  "301": "border-transparent bg-muted text-muted-foreground",
  "302": "border-transparent bg-blue-500/10 text-blue-600",
  "307": "border-transparent bg-amber-500/10 text-amber-600",
  "308": "border-transparent bg-emerald-500/10 text-emerald-600",
};

export function RedirectsTable({
  items,
  isLoading,
  isSaving,
  total,
  page,
  limit,
  isFiltering = false,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
  onPageChange,
}: RedirectsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPagination = total > limit;
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  const handleDelete = (redirect: RedirectRow) => {
    if (!onDelete) return;
    const confirmed = window.confirm(`Delete redirect from ${redirect.from}?`);
    if (confirmed) onDelete(redirect);
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              From URL
            </TableHead>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              To URL
            </TableHead>
            <TableHead className="w-24 px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Type
            </TableHead>
            <TableHead className="w-28 px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Last hit
            </TableHead>
            <TableHead className="w-28 px-6 text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="px-6 py-6 text-sm text-muted-foreground">
                Loading redirects...
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-6 py-8">
                <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
                  <span>
                    {isFiltering ? "No redirects match your search." : "No redirects found."}
                  </span>
                  {!isFiltering && onCreate ? (
                    <Button variant="outline" size="sm" onClick={onCreate} disabled={isSaving}>
                      Create your first redirect
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((redirect) => {
              const status = statusMeta[redirect.status];

              return (
                <TableRow key={redirect.id} className="group">
                  <TableCell className="px-6 py-4 text-sm font-medium text-foreground">
                    {redirect.from}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    {redirect.to}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md text-[10px] font-semibold",
                        typeBadge[redirect.type]
                      )}
                    >
                      {redirect.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold",
                        status.badge
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    {redirect.lastHit}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-primary"
                        aria-label="Edit redirect"
                        onClick={() => onEdit?.(redirect)}
                        disabled={isSaving}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          "text-muted-foreground",
                          redirect.status === "active"
                            ? "hover:text-rose-500"
                            : "hover:text-emerald-500"
                        )}
                        aria-label={
                          redirect.status === "active" ? "Disable redirect" : "Enable redirect"
                        }
                        onClick={() => onToggle?.(redirect)}
                        disabled={isSaving}
                      >
                        {redirect.status === "active" ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-rose-500"
                        aria-label="Delete redirect"
                        onClick={() => handleDelete(redirect)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <div className="flex flex-col items-start gap-3 border-t px-6 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {items.length} of {total} redirects
        </span>
        {hasPagination ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrevious || isSaving}
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || isSaving}
              onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
