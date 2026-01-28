import { ChevronLeft, ChevronRight, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const entries = [
  {
    id: "entry-1",
    title: "Mastering Headless CMS Architecture",
    slug: "/blog/mastering-headless-cms",
    status: "published" as const,
    author: "Sarah Jenks",
    updated: "2 hours ago",
  },
  {
    id: "entry-2",
    title: "New Plugin System Announcement",
    slug: "/blog/plugin-system-v2",
    status: "draft" as const,
    author: "Admin User",
    updated: "Oct 22, 2025",
  },
  {
    id: "entry-3",
    title: "Top 10 Frontend Trends in 2026",
    slug: "/blog/frontend-trends-2026",
    status: "scheduled" as const,
    author: "Michael Chen",
    updated: "Oct 19, 2025",
  },
];

const statusStyles = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const statusLabels = {
  published: "Published",
  draft: "Draft",
  scheduled: "Scheduled",
};

type EntryTableProps = {
  onEdit?: (id: string) => void;
};

function EntryRowActions({ onEdit, entryId }: { onEdit?: (id: string) => void; entryId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onEdit?.(entryId)}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy className="h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EntryTable({ onEdit }: EntryTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox aria-label="Select all entries" />
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Author
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Updated
            </TableHead>
            <TableHead className="pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} className="group">
              <TableCell className="pl-4">
                <Checkbox aria-label={`Select ${entry.title}`} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">
                    {entry.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.slug}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={statusStyles[entry.status]}
                >
                  {statusLabels[entry.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>
                      {entry.author
                        .split(" ")
                        .map((chunk) => chunk[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {entry.author}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {entry.updated}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                  <EntryRowActions onEdit={onEdit} entryId={entry.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator />
      <div className="flex flex-col items-start gap-3 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing <span className="font-semibold text-foreground">1-3</span> of 124
          entries
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" disabled>
            <span className="sr-only">Previous</span>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-sm">
            <span className="sr-only">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
