import { Info, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { IpAllowlistEntry } from "@/services/ipAllowlistClient";

const tableHeaderClassName =
  "px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground";

type IpAllowlistTableProps = {
  entries: IpAllowlistEntry[];
  isLoading?: boolean;
  error?: string | null;
  onRemove?: (id: string) => void;
};

export function IpAllowlistTable({
  entries,
  isLoading = false,
  error,
  onRemove,
}: IpAllowlistTableProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">Active Restrictions</h2>
        <p className="text-sm text-muted-foreground">
          Only traffic from the following IP ranges will be able to access the admin
          panel.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className={tableHeaderClassName}>Label</TableHead>
              <TableHead className={tableHeaderClassName}>IP Range (CIDR)</TableHead>
              <TableHead className={tableHeaderClassName}>Added By</TableHead>
              <TableHead className={tableHeaderClassName}>Status</TableHead>
              <TableHead className={cn(tableHeaderClassName, "text-right")}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-6 text-sm text-muted-foreground">
                  Loading allowlist...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-6 text-sm text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-6 text-sm text-muted-foreground">
                  No IP ranges are currently allowlisted.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.label ?? "Untitled"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.description ?? "No description"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <code className="rounded-md bg-muted px-2 py-1 text-xs font-mono text-primary">
                      {entry.cidr}
                    </code>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    System
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Active
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${entry.cidr}`}
                      className="text-muted-foreground hover:text-rose-500"
                      onClick={() => onRemove?.(entry.id)}
                      disabled={!onRemove}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Separator />
        <div className="flex items-center justify-center gap-2 bg-muted/30 px-6 py-3 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>
            Changes to allowlist can take up to 2 minutes to propagate globally.
          </span>
        </div>
      </div>
    </div>
  );
}
