import { Calendar, Download, FileText, RotateCcw, Search, Trash2 } from "lucide-react";

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

type BackupStatus = "successful" | "pending";

type BackupRow = {
  id: string;
  size: string;
  createdAt: string;
  status: BackupStatus;
  canRestore: boolean;
  canDownload: boolean;
};

const backups: BackupRow[] = [
  {
    id: "bak_20240520_001",
    size: "1.2 GB",
    createdAt: "May 20, 2024 04:00 AM",
    status: "successful",
    canRestore: true,
    canDownload: true,
  },
  {
    id: "bak_20240519_001",
    size: "1.1 GB",
    createdAt: "May 19, 2024 04:00 AM",
    status: "pending",
    canRestore: false,
    canDownload: false,
  },
  {
    id: "bak_20240518_001",
    size: "1.2 GB",
    createdAt: "May 18, 2024 04:00 AM",
    status: "successful",
    canRestore: true,
    canDownload: true,
  },
];

const statusMeta: Record<
  BackupStatus,
  { label: string; className: string }
> = {
  successful: {
    label: "Successful",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  pending: {
    label: "Pending",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400",
  },
};

export function BackupsTable() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b bg-muted/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold">Recent Backups</h3>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search backups..." className="pl-9" />
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
          {backups.map((backup) => {
            const status = statusMeta[backup.status];

            return (
              <TableRow key={backup.id}>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{backup.id}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {backup.size}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {backup.createdAt}
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
                        backup.canRestore && "hover:text-primary"
                      )}
                      disabled={!backup.canRestore}
                      aria-label="Restore backup"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        "text-muted-foreground",
                        backup.canDownload && "hover:text-foreground"
                      )}
                      disabled={!backup.canDownload}
                      aria-label="Download backup"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete backup"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex flex-col items-start gap-3 border-t px-6 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Showing 3 of 42 backups</span>
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
