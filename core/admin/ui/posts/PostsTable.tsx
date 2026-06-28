import { Newspaper } from "lucide-react";

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
import { PageRowActions } from "../pages/PageRowActions";
import type { PostSummary } from "@/services/postsClient";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
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

const renderTags = (tags: string[] | undefined) => {
  if (!Array.isArray(tags) || tags.length === 0) return "—";
  return tags.slice(0, 3).join(", ");
};

export type PostsTableProps = {
  items: PostSummary[];
  emptyMessage?: string;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleAll?: () => void;
  onTogglePost?: (id: string) => void;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function PostsTable({
  items,
  emptyMessage,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  onToggleAll,
  onTogglePost,
  onEdit,
  onPreview,
  onPublish,
  onUnpublish,
  onDuplicate,
  onDelete,
}: PostsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all posts"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="min-w-[12rem] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Post title
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Author
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
              Categories/Tags
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground 2xl:table-cell">
              Published
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground 2xl:table-cell">
              Updated
            </TableHead>
            <TableHead className="w-12 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage ?? "No posts yet. Create your first post to get started."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((post) => {
            const isSelected = selectedIds.includes(post.id);
            return (
              <TableRow key={post.id} className={isSelected ? "bg-primary-soft/40" : undefined}>
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select ${post.title}`}
                    checked={isSelected}
                    onCheckedChange={() => onTogglePost?.(post.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:flex">
                      <Newspaper className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <AdminLink
                        href={`/posts/${encodeURIComponent(post.id)}`}
                        prefetch
                        className="break-words text-left font-medium text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                        aria-label={`Edit post: ${post.title}`}
                      >
                        {post.title}
                      </AdminLink>
                      <span className="break-all font-mono text-xs text-muted-foreground">
                        {post.slug}
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                        <StatusBadge status={post.status} />
                        <span className="text-muted-foreground/60">•</span>
                        <span>{post.author?.name ?? post.author?.email ?? "Unknown"}</span>
                        <span className="text-muted-foreground/60">•</span>
                        <span>{renderTags(post.tags)}</span>
                      </div>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <StatusBadge status={post.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>
                        {toInitials(post.author?.name ?? post.author?.email ?? "NA")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {post.author?.name ?? post.author?.email ?? "Unknown"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  {renderTags(post.tags)}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground 2xl:table-cell">
                  {formatDate(post.publishedAt)}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground 2xl:table-cell">
                  {formatDate(post.updatedAt)}
                </TableCell>
                <TableCell className="w-12 pr-4 text-right">
                  <PageRowActions
                    status={post.status}
                    onEdit={() => onEdit(post.id)}
                    onPreview={() => onPreview(post.id)}
                    onPublish={() => onPublish(post.id)}
                    onUnpublish={() => onUnpublish(post.id)}
                    onDuplicate={() => onDuplicate(post.id)}
                    onDelete={onDelete ? () => onDelete(post.id) : undefined}
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
