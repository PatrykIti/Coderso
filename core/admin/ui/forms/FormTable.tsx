import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminLink } from "@/ui/shared/AdminLink";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { FormRecord } from "@/services/formsClient";

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

type FormRowActionsProps = {
  formId: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function FormRowActions({ formId, onEdit, onDelete }: FormRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => onEdit?.(formId)}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(formId)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type FormTableProps = {
  items: FormRecord[];
  emptyMessage?: string;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function FormTable({ items, emptyMessage, onEdit, onDelete }: FormTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="min-w-[14rem] pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Form name
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
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
                colSpan={4}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "No forms yet. Create your first form to get started."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((form) => (
            <TableRow key={form.id}>
              <TableCell className="py-6 pl-4">
                <div className="flex flex-col">
                  <AdminLink
                    href={`/forms/${encodeURIComponent(form.id)}`}
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
                    <span>{formatDate(form.updatedAt)}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden py-6 md:table-cell">
                <Badge
                  variant="outline"
                  className={statusStyles[form.status] ?? statusStyles.draft}
                >
                  {statusLabels[form.status] ?? form.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden py-6 text-sm text-muted-foreground lg:table-cell">
                {formatDate(form.updatedAt)}
              </TableCell>
              <TableCell className="w-12 py-6 pr-4 text-right">
                <FormRowActions formId={form.id} onEdit={onEdit} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
