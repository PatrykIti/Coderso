import { ClipboardList } from "lucide-react";

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
import { AdminLink } from "@/ui/shared/AdminLink";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import type { FormRecord } from "@/services/formsClient";
import { FormRowActions } from "./FormRowActions";

// Access is not a domain "status" enum, so it keeps a small local badge — but
// driven by semantic token variants (no raw palette classes), so dark mode and
// the violet accent recolor correctly.
const accessBadgeVariant: Record<string, "info" | "soft"> = {
  public: "info",
  internal: "soft",
};

const accessLabels: Record<string, string> = {
  public: "Public",
  internal: "Internal",
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

export type FormTableProps = {
  items: FormRecord[];
  emptyMessage?: string;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleAll?: () => void;
  onToggleForm?: (id: string) => void;
  onEdit: (id: string) => void;
  onSubmissions: (id: string) => void;
  onActionLogs: (id: string) => void;
  onPublish: (id: string) => void;
  onMoveToDraft: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function FormTable({
  items,
  emptyMessage,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  onToggleAll,
  onToggleForm,
  onEdit,
  onSubmissions,
  onActionLogs,
  onPublish,
  onMoveToDraft,
  onArchive,
  onDelete,
}: FormTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all forms"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="min-w-[14rem] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Form
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Access
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
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
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage ?? "No forms yet. Create your first form to get started."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((form) => {
            const isSelected = selectedIds.includes(form.id);
            return (
              <TableRow key={form.id} className={isSelected ? "bg-muted/30" : undefined}>
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select ${form.name}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleForm?.(form.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                      <ClipboardList className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <AdminLink
                        href={`/advanced/forms/${encodeURIComponent(form.id)}`}
                        prefetch
                        className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                        aria-label={`Edit form: ${form.name}`}
                      >
                        {form.name}
                      </AdminLink>
                      <span className="text-xs text-muted-foreground">
                        {form.description ?? "No description yet"}
                      </span>
                      <span className="text-xs text-muted-foreground break-all">/{form.slug}</span>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                        <StatusBadge status={form.status} />
                        <span className="text-muted-foreground/60">•</span>
                        <Badge variant={accessBadgeVariant[form.submissionAccess] ?? "info"}>
                          {accessLabels[form.submissionAccess] ?? form.submissionAccess}
                        </Badge>
                        <span className="text-muted-foreground/60">•</span>
                        <span>{formatDate(form.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden px-4 md:table-cell">
                  <StatusBadge status={form.status} />
                </TableCell>
                <TableCell className="hidden px-4 lg:table-cell">
                  <Badge variant={accessBadgeVariant[form.submissionAccess] ?? "info"}>
                    {accessLabels[form.submissionAccess] ?? form.submissionAccess}
                  </Badge>
                </TableCell>
                <TableCell className="hidden px-4 text-sm text-muted-foreground lg:table-cell">
                  {formatDate(form.updatedAt)}
                </TableCell>
                <TableCell className="w-12 pr-4 text-right">
                  <FormRowActions
                    status={form.status}
                    onEdit={() => onEdit(form.id)}
                    onSubmissions={() => onSubmissions(form.id)}
                    onActionLogs={() => onActionLogs(form.id)}
                    onPublish={() => onPublish(form.id)}
                    onMoveToDraft={() => onMoveToDraft(form.id)}
                    onArchive={() => onArchive(form.id)}
                    onDelete={onDelete ? () => onDelete(form.id) : undefined}
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
