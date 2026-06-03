import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SessionStatus = "current" | "active";

export type SessionItem = {
  id: string;
  device: string;
  deviceDetail: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  status: SessionStatus;
  canRevoke: boolean;
  icon: LucideIcon;
};

export type SessionsTableProps = {
  sessions: SessionItem[];
  isLoading?: boolean;
  isRevoking?: boolean;
  selectedSessionId?: string | null;
  onRevoke?: (session: SessionItem) => void;
};

const statusMeta: Record<SessionStatus, { label: string; className?: string; dot?: string }> = {
  current: {
    label: "Current session",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  active: {
    label: "Active",
  },
};

export function SessionsTable({
  sessions,
  isLoading = false,
  isRevoking = false,
  selectedSessionId,
  onRevoke,
}: SessionsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Device/OS
            </TableHead>
            <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Location
            </TableHead>
            <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Last Active
            </TableHead>
            <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-4 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-6 text-sm text-muted-foreground">
                Loading sessions...
              </TableCell>
            </TableRow>
          ) : sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-6 text-sm text-muted-foreground">
                No active sessions found.
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((session) => {
              const status = statusMeta[session.status];
              const isCurrent = session.status === "current";
              const Icon = session.icon;
              const isSelected = session.id === selectedSessionId;

              return (
                <TableRow
                  key={session.id}
                  className={cn("group", isSelected ? "bg-primary/5" : undefined)}
                >
                  <TableCell className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          isCurrent
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{session.device}</p>
                        <p className="text-xs text-muted-foreground">{session.deviceDetail}</p>
                        {isSelected ? (
                          <p className="mt-1 text-[11px] font-medium text-primary">
                            Selected from access log
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-foreground">{session.location}</span>
                      <Badge
                        variant="outline"
                        className="rounded-md border-border/60 bg-muted/60 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
                      >
                        {session.ipAddress}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                    {session.lastActive}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    {isCurrent ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 border-transparent text-[10px] uppercase tracking-wide",
                          status.className
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                        {status.label}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{status.label}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-right">
                    {session.canRevoke ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-destructive/30 bg-destructive/5 px-3 text-xs font-semibold text-destructive opacity-100 transition-opacity hover:bg-destructive hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={() => onRevoke?.(session)}
                        disabled={isRevoking}
                      >
                        Revoke
                      </Button>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        Cannot Revoke
                      </span>
                    )}
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
