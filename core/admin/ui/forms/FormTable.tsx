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

import type { FormRecord } from "@/services/formsClient";
import { FormRowActions } from "./FormRowActions";

const statusStyles: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  archived: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const statusLabels: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

const accessStyles: Record<string, string> = {
  public: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  internal: "bg-violet-500/10 text-violet-600 border-violet-500/20",
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
  onActionLogs,
  onPublish,
  onMoveToDraft,
  onArchive,
  onDelete,
}: FormTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
              <TableCell
                colSpan={6}
                className="py-10 text-center text-sm text-muted-foreground"
              >
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
                <div className="flex flex-col">
                  <AdminLink
                    href={`/coderso/forms/${encodeURIComponent(form.id)}`}
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
                    <Badge
                      variant="outline"
                      className={statusStyles[form.status] ?? statusStyles.draft}
                    >
                      {statusLabels[form.status] ?? form.status}
                    </Badge>
                    <span className="text-muted-foreground/60">•</span>
                    <Badge
                      variant="outline"
                      className={accessStyles[form.submissionAccess] ?? accessStyles.public}
                    >
                      {accessLabels[form.submissionAccess] ?? form.submissionAccess}
                    </Badge>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{formatDate(form.updatedAt)}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden px-4 md:table-cell">
                <Badge
                  variant="outline"
                  className={statusStyles[form.status] ?? statusStyles.draft}
                >
                  {statusLabels[form.status] ?? form.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden px-4 lg:table-cell">
                <Badge
                  variant="outline"
                  className={accessStyles[form.submissionAccess] ?? accessStyles.public}
                >
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
