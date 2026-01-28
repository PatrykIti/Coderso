import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { PageRowActions } from "./PageRowActions";
import type { PageSummary } from "@/services/pagesClient";

const statusStyles: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  archived: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const statusLabels: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  scheduled: "Scheduled",
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

const toInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export type PageTableProps = {
  items: PageSummary[];
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDuplicate: (id: string) => void;
};

export function PageTable({
  items,
  onEdit,
  onPreview,
  onPublish,
  onUnpublish,
  onDuplicate,
}: PageTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox aria-label="Select all pages" />
            </TableHead>
            <TableHead>Page title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead className="pr-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                No pages yet. Create your first page to get started.
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((page) => (
            <TableRow key={page.id}>
              <TableCell className="pl-4">
                <Checkbox aria-label={`Select ${page.title}`} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">
                    {page.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {page.slug}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={statusStyles[page.status] ?? statusStyles.draft}
                >
                  {statusLabels[page.status] ?? page.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>
                      {toInitials(
                        page.author?.name ??
                          page.author?.email ??
                          "NA"
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {page.author?.name ?? page.author?.email ?? "Unknown"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(page.updatedAt)}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <PageRowActions
                  status={page.status}
                  onEdit={() => onEdit(page.id)}
                  onPreview={() => onPreview(page.id)}
                  onPublish={() => onPublish(page.id)}
                  onUnpublish={() => onUnpublish(page.id)}
                  onDuplicate={() => onDuplicate(page.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
