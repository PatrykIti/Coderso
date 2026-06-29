import { FileText } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdminLink } from "@/ui/shared/AdminLink";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import { PageRowActions } from "./PageRowActions";
import type { PageSummary } from "@/services/pagesClient";

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

const firstNameOf = (value: string) => value.split(" ")[0] || value;

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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all pages"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="min-w-[12rem]">Title</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="hidden lg:table-cell">Author</TableHead>
            <TableHead className="hidden xl:table-cell">Updated</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Views</TableHead>
            <TableHead className="w-12 pr-4 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage ?? "No pages yet. Create your first page to get started."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((page) => {
            const isSelected = selectedIds.includes(page.id);
            const authorLabel = resolveAuthorLabel(page.author);
            const authorHint = page.author ? undefined : missingAuthorHint;
            return (
              <TableRow key={page.id} className={isSelected ? "bg-primary-soft/40" : undefined}>
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select ${page.title}`}
                    checked={isSelected}
                    onCheckedChange={() => onTogglePage?.(page.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <FileText className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <AdminLink
                        href={`/pages/${encodeURIComponent(page.id)}`}
                        prefetch
                        className="truncate font-medium text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                        aria-label={`Edit page: ${page.title}`}
                      >
                        {page.title}
                      </AdminLink>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {page.slug}
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                        <StatusBadge status={page.status} />
                        <span className="text-muted-foreground/60">•</span>
                        <span title={authorHint}>{authorLabel}</span>
                        <span className="text-muted-foreground/60">•</span>
                        <span>{formatDate(page.updatedAt)}</span>
                      </div>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <StatusBadge status={page.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{toInitials(authorLabel)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground" title={authorHint}>
                      {firstNameOf(authorLabel)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  {formatDate(page.updatedAt)}
                </TableCell>
                <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
                  {/* PageSummary exposes no view count — de-fabricate per the
                      owner's rule (em-dash, never a mock number). */}
                  —
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
