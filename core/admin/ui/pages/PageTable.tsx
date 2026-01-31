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
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <Table className="w-full table-fixed">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox aria-label="Select all pages" />
            </TableHead>
            <TableHead className="w-full">Page title</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="hidden lg:table-cell">Author</TableHead>
            <TableHead className="hidden xl:table-cell">Last updated</TableHead>
            <TableHead className="w-12 pr-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No pages yet. Create your first page to get started.
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((page) => (
            <TableRow key={page.id}>
              <TableCell className="pl-4">
                <Checkbox aria-label={`Select ${page.title}`} />
              </TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex flex-col">
                  <span className="break-words font-semibold text-foreground">
                    {page.title}
                  </span>
                  <span className="text-xs text-muted-foreground break-all">
                    {page.slug}
                  </span>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                    <Badge
                      variant="outline"
                      className={statusStyles[page.status] ?? statusStyles.draft}
                    >
                      {statusLabels[page.status] ?? page.status}
                    </Badge>
                    <span className="text-muted-foreground/60">•</span>
                    <span>
                      {page.author?.name ?? page.author?.email ?? "Unknown"}
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{formatDate(page.updatedAt)}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge
                  variant="outline"
                  className={statusStyles[page.status] ?? statusStyles.draft}
                >
                  {statusLabels[page.status] ?? page.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
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
              <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                {formatDate(page.updatedAt)}
              </TableCell>
              <TableCell className="w-12 pr-4 text-right">
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
