import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
import type { PopupRecord, PopupStatus } from "@/services/popupsClient";
import { AdminLink } from "@/ui/shared/AdminLink";

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

const statusVariant = (status: PopupStatus) => {
  if (status === "published") return "default" as const;
  if (status === "archived") return "secondary" as const;
  return "outline" as const;
};

type PopupTableProps = {
  items: PopupRecord[];
  emptyMessage?: string;
  onStatusChange: (id: string, status: PopupStatus) => void;
  onDelete: (id: string) => void;
};

export function PopupTable({ items, emptyMessage, onStatusChange, onDelete }: PopupTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="min-w-[16rem] pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Popup
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Trigger
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
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
              <TableCell colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                {emptyMessage ?? "No popups yet."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="py-6 pl-6">
                <div className="flex flex-col gap-1">
                  <AdminLink
                    href={`/coderso/popups/${encodeURIComponent(item.id)}`}
                    prefetch
                    className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                    aria-label={`Edit popup: ${item.name}`}
                  >
                    {item.name}
                  </AdminLink>
                  <span className="text-xs text-muted-foreground">/{item.slug}</span>
                  <div className="mt-2 flex items-center gap-2 text-xs md:hidden">
                    <Badge variant={statusVariant(item.status)} className="capitalize">
                      {item.status}
                    </Badge>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground">{formatDate(item.updatedAt)}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden px-4 py-6 md:table-cell">
                <Badge variant={statusVariant(item.status)} className="capitalize">
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground lg:table-cell">
                {item.trigger.type.replace("_", " ")}
              </TableCell>
              <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground lg:table-cell">
                {formatDate(item.updatedAt)}
              </TableCell>
              <TableCell className="w-12 py-6 pr-6 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem asChild>
                      <AdminLink href={`/coderso/popups/${encodeURIComponent(item.id)}`} className="w-full" prefetch>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </AdminLink>
                    </DropdownMenuItem>
                    {item.status !== "published" ? (
                      <DropdownMenuItem onClick={() => onStatusChange(item.id, "published")}>Publish</DropdownMenuItem>
                    ) : null}
                    {item.status !== "draft" ? (
                      <DropdownMenuItem onClick={() => onStatusChange(item.id, "draft")}>Move to draft</DropdownMenuItem>
                    ) : null}
                    {item.status !== "archived" ? (
                      <DropdownMenuItem onClick={() => onStatusChange(item.id, "archived")}>Archive</DropdownMenuItem>
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
