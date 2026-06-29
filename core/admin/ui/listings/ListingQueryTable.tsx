import { LayoutGrid, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ListingQueryRecord } from "@/services/listingsClient";
import { AdminLink } from "@/ui/shared/AdminLink";
import { EmptyState } from "@/ui/shared/EmptyState";

import { sourceLabel, summarizeListingQuery } from "./listingQuerySummary";

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

/**
 * TASK-479-16-L01: the Listings query records are now presented as a soft
 * `rounded-2xl` card grid (ported from the prototype `ListingsPage`) instead of
 * a table. The component keeps its exact prop contract (items, selection state,
 * toggle/delete handlers, emptyMessage) so the list page wiring + cache contract
 * are untouched — only the presentation changed.
 */
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
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<LayoutGrid />}
        title={emptyMessage ?? "No listing queries yet."}
        description={
          emptyMessage
            ? undefined
            : "Create a dynamic query preset to render your content anywhere."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex w-fit items-center gap-2 px-1">
        <Checkbox
          aria-label="Select all listing queries"
          checked={isIndeterminate ? "indeterminate" : isAllSelected}
          onCheckedChange={() => onToggleAll?.()}
        />
        <span className="text-xs font-medium text-muted-foreground">Select all (visible)</span>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const editHref = `/advanced/listings/${encodeURIComponent(item.id)}`;
          return (
            <Card
              key={item.id}
              className={cn(
                "flex h-full flex-col rounded-2xl p-5 shadow-card transition-all hover:-translate-y-0.5",
                isSelected && "ring-2 ring-primary/40"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <LayoutGrid className="size-6" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.updatedAt)}
                  </span>
                  <Checkbox
                    aria-label={`Select ${item.name}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleItem?.(item.id)}
                  />
                </div>
              </div>

              <AdminLink
                href={editHref}
                prefetch
                aria-label={`Edit listing query: ${item.name}`}
                className="mt-4 break-words font-display text-[15px] font-semibold text-foreground underline-offset-4 hover:underline focus-visible:underline"
              >
                {item.name}
              </AdminLink>
              <p className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground">
                {summarizeListingQuery(item)}
              </p>
              {item.description ? (
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="soft">{sourceLabel(item.query.source)}</Badge>
                <Badge variant="outline">{item.query.pagination.limit} per page</Badge>
              </div>

              <Separator className="my-4" />

              <div className="mt-auto flex items-center gap-2">
                <Button asChild variant="soft" size="sm" className="flex-1 gap-1.5">
                  <AdminLink href={editHref} prefetch>
                    <Pencil className="size-4" />
                    Edit
                  </AdminLink>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete listing query: ${item.name}`}
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
