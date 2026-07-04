import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Pagination({
  page = 1,
  pageCount = 5,
  total,
  pageSize = 12,
}: {
  page?: number;
  pageCount?: number;
  total?: number;
  pageSize?: number;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total ?? page * pageSize);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {total !== undefined ? (
          <>
            Showing <span className="font-medium text-foreground">{from}</span>–
            <span className="font-medium text-foreground">{to}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span>
          </>
        ) : (
          <>
            Page <span className="font-medium text-foreground">{page}</span> of {pageCount}
          </>
        )}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className={cn(
              "flex size-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              p === page
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
        <Button variant="outline" size="icon-sm" aria-label="Next page">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
