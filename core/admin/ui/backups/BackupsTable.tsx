import { Calendar, Download, FileText, RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BackupItem, BackupStatus } from "@/services/backupsClient";

const statusMeta: Record<
  BackupStatus,
  { label: string; className: string }
> = {
  queued: {
    label: "Queued",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400",
  },
  running: {
    label: "Running",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-400",
  },
  complete: {
    label: "Completed",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    className:
      "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-400",
  },
};

const formatBytes = (value: number | null) => {
  if (!value || value <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type BackupsTableProps = {
  items: BackupItem[];
  isLoading: boolean;
  isSaving: boolean;
  onRestore: (id: string) => void;
  onDownload: (id: string) => void;
};

export function BackupsTable({
  items,
  isLoading,
  isSaving,
  onRestore,
  onDownload,
}: BackupsTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return items;
    const needle = query.toLowerCase();
    return items.filter((backup) => {
      return (
        backup.id.toLowerCase().includes(needle) ||
        backup.status.toLowerCase().includes(needle)
      );
    });
  }, [items, query]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b bg-muted/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold">Recent Backups</h3>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search backups..."
            className="pl-9"
          />
        </div>
      </div>
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Backup ID
            </TableHead>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Size
            </TableHead>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Date Created
            </TableHead>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-6 text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="px-6 py-6 text-sm text-muted-foreground">
                Loading backups...
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="px-6 py-6 text-sm text-muted-foreground">
                No backups found.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((backup) => {
              const status = statusMeta[backup.status];
              const canRestore = backup.status === "complete";
              const canDownload = backup.status === "complete" && Boolean(backup.artifactPath);

              return (
                <TableRow key={backup.id}>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">{backup.id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    {formatBytes(backup.sizeBytes)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(backup.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                        status.className
                      )}
                    >
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          "text-muted-foreground",
                          canRestore && "hover:text-primary"
                        )}
                        disabled={!canRestore || isSaving}
                        aria-label="Restore backup"
                        onClick={() => onRestore(backup.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          "text-muted-foreground",
                          canDownload && "hover:text-foreground"
                        )}
                        disabled={!canDownload || isSaving}
                        aria-label="Download backup"
                        onClick={() => onDownload(backup.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete backup"
                        disabled
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <div className="flex flex-col items-start gap-3 border-t px-6 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {filtered.length} of {items.length} backups
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
