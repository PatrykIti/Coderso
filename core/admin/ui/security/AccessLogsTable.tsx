import { ChevronLeft, ChevronRight } from "lucide-react";

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

import type { AccessLogItem } from "./types";

// TASK-479-27-L04: method + HTTP-status-code tone ported from the prototype
// (patterns/DataTable + access-logs) onto the soft semantic tokens. The method
// badge maps to the soft Badge variants and the numeric status code carries a
// success/info/warning/destructive tone — no hardcoded palette colours.
const methodVariant = (method: string): "info" | "soft" | "destructive" | "warning" =>
  method === "GET"
    ? "info"
    : method === "POST"
      ? "soft"
      : method === "DELETE"
        ? "destructive"
        : "warning";

const statusTone = (code: number) =>
  code < 300
    ? "text-success"
    : code < 400
      ? "text-info"
      : code < 500
        ? "text-warning"
        : "text-destructive";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
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
                Request
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Timestamp
              </TableHead>
              <TableHead className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
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
                  <TableRow
                    key={log.id}
                    className={cn(
                      onView && "cursor-pointer",
                      "transition-colors hover:bg-muted/40"
                    )}
                    onClick={onView ? () => onView(log) : undefined}
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback>{getInitials(log.user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {log.user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {log.user.detail}
                          </p>
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
                      <div className="flex items-center gap-2">
                        <Badge variant={methodVariant(log.method)} className="font-mono">
                          {log.method}
                        </Badge>
                        <span className="font-mono text-sm text-muted-foreground">{log.path}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="text-sm text-foreground">{log.timestamp.date}</div>
                      <div className="text-xs text-muted-foreground">{log.timestamp.time}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <span
                        className={cn(
                          "font-mono text-sm font-semibold tabular-nums",
                          statusTone(log.statusCode)
                        )}
                      >
                        {log.statusCode}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
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
