import { Cpu, MoreHorizontal } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { auditCategoryMeta, auditStatusMeta } from "./auditMeta";
import type { AuditLog } from "./types";

export type AuditTableProps = {
  logs: AuditLog[];
  selectedId?: string | null;
  onSelect: (log: AuditLog) => void;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function AuditTable({ logs, selectedId, onSelect }: AuditTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="pl-4">Event</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const category = auditCategoryMeta[log.category];
              const status = auditStatusMeta[log.status];
              const isSelected = log.id === selectedId;
              const Icon = category.icon;

              return (
                <TableRow
                  key={log.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    isSelected && "border-l-4 border-l-primary bg-primary/5"
                  )}
                  onClick={() => onSelect(log)}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          category.className
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {log.event}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {category.label}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {log.actor.type === "system" ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600">
                          <Cpu className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <Avatar size="sm">
                          <AvatarFallback>
                            {getInitials(log.actor.name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {log.actor.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="font-mono">{log.resource}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="font-mono">{log.ipAddress}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {log.timestamp}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {log.timestampLabel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("rounded-md", status.className)}
                    >
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onSelect(log)}>
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem>Copy JSON</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Export entry</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          Showing 1 to {logs.length} of 2,459 logs
        </span>
        <div className="flex gap-2">
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
