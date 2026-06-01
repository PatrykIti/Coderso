import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

import type { AccessLogItem, AccessLogStatus } from "./types";

const statusStyles: Record<AccessLogStatus, string> = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((chunk) => chunk[0])
    .join("");
}

type AccessLogsTableProps = {
  logs: AccessLogItem[];
  isLoading?: boolean;
  onView?: (log: AccessLogItem) => void;
  pageInfo?: {
    countCopy: string;
    canNext: boolean;
    canPrevious: boolean;
    isLoading?: boolean;
    onNext: () => void;
    onPrevious: () => void;
  };
};

export function AccessLogsTable({
  logs,
  isLoading = false,
  onView,
  pageInfo,
}: AccessLogsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              User
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              IP Address
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Device / Browser
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Timestamp
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="px-6 py-6 text-sm text-muted-foreground">
                Loading access logs...
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-6 py-6 text-sm text-muted-foreground">
                No access logs found.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => {
              const DeviceIcon = log.device.icon;

              return (
                <TableRow key={log.id} className="group hover:bg-muted/30">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback>{getInitials(log.user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{log.user.name}</p>
                        <p className="text-xs text-muted-foreground">{log.user.detail}</p>
                        {log.matchContext ? (
                          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                            {log.matchContext.label}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {log.ipAddress}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DeviceIcon className="h-4 w-4" />
                      <span>{log.device.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="text-sm text-foreground">{log.timestamp.date}</div>
                    <div className="text-xs text-muted-foreground">{log.timestamp.time}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide",
                        statusStyles[log.status]
                      )}
                    >
                      {log.status === "success" ? "Success" : "Failed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Open log actions"
                      onClick={() => onView?.(log)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <Separator />
      <div className="flex flex-col gap-3 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{pageInfo?.countCopy ?? `Showing ${logs.length} loaded access logs.`}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!pageInfo?.canPrevious || pageInfo?.isLoading}
            onClick={pageInfo?.onPrevious}
          >
            <span className="sr-only">Previous page</span>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!pageInfo?.canNext || pageInfo?.isLoading}
            onClick={pageInfo?.onNext}
          >
            <span className="sr-only">Next page</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
