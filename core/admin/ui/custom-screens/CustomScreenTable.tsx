import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminLink } from "@/ui/shared/AdminLink";

import { CustomScreenRowActions } from "./CustomScreenRowActions";
import type { CustomScreenListRow } from "./customScreenListModel";

const statusStyles = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
} as const;

const statusLabels = {
  active: "Active",
  draft: "Draft",
} as const;

const sidebarStateLabels = {
  visible: "Visible",
  configured_after_activation: "Configured after activation",
  hidden: "Not shown",
} as const;

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

export type CustomScreenTableProps = {
  items: CustomScreenListRow[];
  emptyMessage?: string;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  workingId?: string | null;
  onToggleAll?: () => void;
  onToggleScreen?: (id: string) => void;
  onActivate: (id: string) => void;
  onMoveToDraft: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CustomScreenTable({
  items,
  emptyMessage,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  workingId,
  onToggleAll,
  onToggleScreen,
  onActivate,
  onMoveToDraft,
  onDelete,
}: CustomScreenTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all custom screens"
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()}
              />
            </TableHead>
            <TableHead className="min-w-[14rem] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Screen
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Content type
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
              Mode
            </TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
              Sidebar
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
              <TableCell
                colSpan={8}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "No custom screens yet."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((row) => {
            const screen = row.screen;
            const isSelected = selectedIds.includes(screen.id);
            const sidebarLabel = sidebarStateLabels[row.sidebarShortcutState];
            return (
              <TableRow
                key={screen.id}
                className={isSelected ? "bg-muted/30" : undefined}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select ${screen.name}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleScreen?.(screen.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <AdminLink
                      href={`/advanced/custom-screens/${encodeURIComponent(screen.id)}`}
                      prefetch
                      className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                      aria-label={`Edit custom screen: ${screen.name}`}
                    >
                      {screen.name}
                    </AdminLink>
                    {screen.sidebarLabel ? (
                      <span className="text-xs text-muted-foreground break-words">
                        Sidebar label: {screen.sidebarLabel}
                      </span>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                      <Badge
                        variant="outline"
                        className={statusStyles[screen.status]}
                      >
                        {statusLabels[screen.status]}
                      </Badge>
                      <span className="text-muted-foreground/60">•</span>
                      <span>{row.contentTypeLabel}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>{sidebarLabel}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge
                    variant="outline"
                    className={statusStyles[screen.status]}
                  >
                    {statusLabels[screen.status]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  <span title={row.contentTypeSlug ?? screen.contentTypeId}>
                    {row.contentTypeLabel}
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  {row.modeLabel}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  <div className="flex flex-col">
                    <span>{sidebarLabel}</span>
                    {row.sidebarShortcutLabel ? (
                      <span className="text-xs text-muted-foreground/80">
                        {row.sidebarShortcutLabel}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground 2xl:table-cell">
                  {formatDate(row.updatedAt)}
                </TableCell>
                <TableCell className="w-12 pr-4 text-right">
                  <CustomScreenRowActions
                    id={screen.id}
                    status={screen.status}
                    disabled={workingId === screen.id}
                    onActivate={() => onActivate(screen.id)}
                    onMoveToDraft={() => onMoveToDraft(screen.id)}
                    onDelete={() => onDelete(screen.id)}
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
