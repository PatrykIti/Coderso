import { MoreHorizontal, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";
import type { ReviewRecord, ReviewStatus } from "@/services/reviewsClient";

const statusVariant = (status: ReviewStatus) => {
  if (status === "approved") return "default" as const;
  if (status === "pending") return "outline" as const;
  return "secondary" as const;
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

const renderStars = (value: number) => "★".repeat(value).padEnd(5, "☆");

type ReviewTableProps = {
  items: ReviewRecord[];
  selectedId: string | null;
  emptyMessage?: string;
  onSelect: (reviewId: string) => void;
  onModerate: (reviewId: string, status: ReviewStatus) => void;
  onDelete: (reviewId: string) => void;
};

export function ReviewTable({
  items,
  selectedId,
  emptyMessage,
  onSelect,
  onModerate,
  onDelete,
}: ReviewTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="min-w-[14rem] pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Review
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Entity
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Created
            </TableHead>
            <TableHead className="w-12 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                {emptyMessage ?? "No reviews yet."}
              </TableCell>
            </TableRow>
          ) : null}

          {items.map((item) => (
            <TableRow
              key={item.id}
              className={cn(
                "cursor-pointer",
                selectedId === item.id ? "bg-muted/50" : undefined
              )}
              onClick={() => onSelect(item.id)}
            >
              <TableCell className="py-5 pl-6">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{item.authorName}</span>
                  <span className="text-xs text-muted-foreground">{renderStars(item.rating)}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {item.title || item.body || "No review text"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden px-4 py-5 text-sm text-muted-foreground md:table-cell">
                {item.entityType}:{item.entityId}
              </TableCell>
              <TableCell className="hidden px-4 py-5 md:table-cell">
                <Badge variant={statusVariant(item.status)} className="capitalize">
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden px-4 py-5 text-sm text-muted-foreground lg:table-cell">
                {formatDate(item.createdAt)}
              </TableCell>
              <TableCell className="w-12 py-5 pr-6 text-right" onClick={(event) => event.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {item.status !== "approved" ? (
                      <DropdownMenuItem onClick={() => onModerate(item.id, "approved")}>
                        Approve
                      </DropdownMenuItem>
                    ) : null}
                    {item.status !== "rejected" ? (
                      <DropdownMenuItem onClick={() => onModerate(item.id, "rejected")}>
                        Reject
                      </DropdownMenuItem>
                    ) : null}
                    {item.status !== "spam" ? (
                      <DropdownMenuItem onClick={() => onModerate(item.id, "spam")}>Mark as spam</DropdownMenuItem>
                    ) : null}
                    {item.status !== "pending" ? (
                      <DropdownMenuItem onClick={() => onModerate(item.id, "pending")}>
                        Move to pending
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(item.id)}>
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
