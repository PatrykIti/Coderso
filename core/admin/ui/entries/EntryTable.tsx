import { Copy, EyeOff, FileText, Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
import { AdminLink } from "@/ui/shared/AdminLink";
import { StatusBadge } from "@/ui/shared/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EntryAuthor,
  EntryListContentType,
  EntrySummary,
  EntryVisibility,
} from "@/services/entriesClient";

type EntryTableProps = {
  entries: EntryTableItem[];
  emptyMessage?: string;
  selectedIds?: string[];
  selectedKeys?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleAll?: () => void;
  onToggleEntry?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  entryTypeSlug?: string | null;
};

type EntryTableItem = EntrySummary & {
  contentType?: EntryListContentType;
};

const entrySelectionKey = (entry: EntryTableItem) =>
  entry.contentType ? `${entry.contentType.slug}:${entry.id}` : entry.id;

const resolveAuthorLabel = (author?: EntryAuthor | null) => {
  const full = author?.name ?? author?.email ?? "System";
  return full.trim().split(/\s+/)[0] || full;
};

function VisibilityBadge({ visibility }: { visibility: EntryVisibility }) {
  if (visibility === "public") return null;
  const isPassword = visibility === "password";
  const Icon = isPassword ? Lock : EyeOff;
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Icon className="size-3" />
      {isPassword ? "Password" : "Private"}
    </Badge>
  );
}

const formatUpdatedAt = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

function EntryRowActions({
  onEdit,
  onDuplicate,
  onDelete,
  entryId,
}: {
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  entryId: string;
}) {
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
        <DropdownMenuItem onClick={() => onDuplicate?.(entryId)}>
          <Copy className="h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(entryId)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EntryTable({
  entries,
  emptyMessage,
  selectedIds = [],
  selectedKeys,
  isAllSelected = false,
  isIndeterminate = false,
  onToggleAll,
  onToggleEntry,
  onEdit,
  onDuplicate,
  onDelete,
  entryTypeSlug,
}: EntryTableProps) {
  return (
    <div
      data-slot="data-table"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
    >
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all entries"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Content Type
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
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="pl-4 text-sm text-muted-foreground">
                {emptyMessage ?? "No entries yet."}
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => {
              const key = entrySelectionKey(entry);
              const isSelected = (selectedKeys ?? selectedIds).includes(key);
              const typeSlug = entry.contentType?.slug ?? entryTypeSlug ?? null;
              return (
                <TableRow
                  key={key}
                  className={isSelected ? "group bg-muted/30" : "group hover:bg-accent/40"}
                >
                  <TableCell className="pl-4">
                    <Checkbox
                      aria-label={`Select ${entry.title}`}
                      checked={isSelected}
                      onCheckedChange={() => onToggleEntry?.(entry.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:flex">
                        <FileText className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        {typeSlug ? (
                          <AdminLink
                            href={`/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(entry.id)}`}
                            prefetch
                            className="text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                            aria-label={`Edit entry: ${entry.title}`}
                          >
                            {entry.title}
                          </AdminLink>
                        ) : onEdit ? (
                          <button
                            type="button"
                            className="text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                            onClick={() => onEdit(entry.id)}
                            aria-label={`Edit entry: ${entry.title}`}
                          >
                            {entry.title}
                          </button>
                        ) : (
                          <span className="font-semibold text-foreground">{entry.title}</span>
                        )}
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {entry.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.contentType ? (
                      <AdminLink
                        href={`/content-types/${encodeURIComponent(entry.contentType.id)}`}
                        prefetch
                        className="underline-offset-4 hover:underline"
                      >
                        <Badge variant="soft">{entry.contentType.name}</Badge>
                      </AdminLink>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unknown</span>
                    )}
                    {entry.contentType ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {entry.contentType.slug}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={entry.status} />
                      <VisibilityBadge visibility={entry.visibility} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>
                          {(entry.author?.name ?? entry.author?.email ?? "NA")
                            .split(" ")
                            .filter(Boolean)
                            .map((chunk) => chunk[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        {resolveAuthorLabel(entry.author)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatUpdatedAt(entry.updatedAt)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex justify-end opacity-100 transition-opacity">
                      <EntryRowActions
                        onEdit={onEdit}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        entryId={entry.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
