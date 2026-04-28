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
import { AdminLink } from "@/ui/shared/AdminLink";

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
  emptyMessage?: string;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleAll?: () => void;
  onTogglePage?: (id: string) => void;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete?: (id: string) => void;
};

const missingAuthorLabel = "No author";
const missingAuthorHint = "Previous author is no longer available.";

const resolveAuthorLabel = (author: PageSummary["author"]) =>
  author?.name ?? author?.email ?? missingAuthorLabel;

export function PageTable({
  items,
  emptyMessage,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  onToggleAll,
  onTogglePage,
  onEdit,
  onPreview,
  onPublish,
  onUnpublish,
  onDuplicate,
  onDelete,
}: PageTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all pages"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="min-w-[12rem] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Page title
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Author
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
              Last updated
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
                colSpan={6}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "No pages yet. Create your first page to get started."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((page) => {
            const isSelected = selectedIds.includes(page.id);
            const authorLabel = resolveAuthorLabel(page.author);
            const authorHint = page.author ? undefined : missingAuthorHint;
            return (
            <TableRow key={page.id} className={isSelected ? "bg-muted/30" : undefined}>
              <TableCell className="pl-4">
                <Checkbox
                  aria-label={`Select ${page.title}`}
                  checked={isSelected}
                  onCheckedChange={() => onTogglePage?.(page.id)}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <AdminLink
                    href={`/pages/${encodeURIComponent(page.id)}`}
                    prefetch
                    className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                    aria-label={`Edit page: ${page.title}`}
                  >
                    {page.title}
                  </AdminLink>
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
                    <span title={authorHint}>
                      {authorLabel}
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
                      {toInitials(authorLabel)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground" title={authorHint}>
                    {authorLabel}
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
                  onDelete={onDelete ? () => onDelete(page.id) : undefined}
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
