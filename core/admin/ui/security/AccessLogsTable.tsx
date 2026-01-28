import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  Laptop,
  Monitor,
  MoreHorizontal,
  Smartphone,
  Terminal,
} from "lucide-react";

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

type AccessLogStatus = "success" | "failed";

type AccessLog = {
  id: string;
  user: {
    name: string;
    detail: string;
  };
  ipAddress: string;
  device: {
    label: string;
    icon: LucideIcon;
  };
  timestamp: {
    date: string;
    time: string;
  };
  status: AccessLogStatus;
};

const accessLogs: AccessLog[] = [
  {
    id: "log-1",
    user: {
      name: "Alex Rivers",
      detail: "alex@nextless.io",
    },
    ipAddress: "192.168.1.42",
    device: {
      label: "Chrome / macOS",
      icon: Monitor,
    },
    timestamp: {
      date: "Oct 19, 2023",
      time: "14:23:45",
    },
    status: "success",
  },
  {
    id: "log-2",
    user: {
      name: "Sarah Chen",
      detail: "s.chen@nextless.io",
    },
    ipAddress: "104.28.14.9",
    device: {
      label: "Safari / iPhone",
      icon: Smartphone,
    },
    timestamp: {
      date: "Oct 19, 2023",
      time: "12:15:02",
    },
    status: "failed",
  },
  {
    id: "log-3",
    user: {
      name: "Jordan Smith",
      detail: "jsmith@nextless.io",
    },
    ipAddress: "82.165.23.111",
    device: {
      label: "Firefox / Windows",
      icon: Laptop,
    },
    timestamp: {
      date: "Oct 18, 2023",
      time: "22:45:18",
    },
    status: "success",
  },
  {
    id: "log-4",
    user: {
      name: "External API",
      detail: "Service Account",
    },
    ipAddress: "35.192.10.4",
    device: {
      label: "Postman / Linux",
      icon: Terminal,
    },
    timestamp: {
      date: "Oct 18, 2023",
      time: "09:12:33",
    },
    status: "success",
  },
];

const statusStyles: Record<AccessLogStatus, string> = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const pageButtons = ["1", "2", "3"] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((chunk) => chunk[0])
    .join("");
}

export function AccessLogsTable() {
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
          {accessLogs.map((log) => {
            const DeviceIcon = log.device.icon;

            return (
              <TableRow key={log.id} className="group hover:bg-muted/30">
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarFallback>
                        {getInitials(log.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {log.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.user.detail}
                      </p>
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
                  <div className="text-sm text-foreground">
                    {log.timestamp.date}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {log.timestamp.time}
                  </div>
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
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Separator />
      <div className="flex flex-col gap-3 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing <span className="font-semibold text-foreground">1 - 4</span> of
          152 logs
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" disabled>
            <span className="sr-only">Previous page</span>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          {pageButtons.map((page) => (
            <Button
              key={page}
              variant={page === "1" ? "secondary" : "ghost"}
              size="xs"
              className="h-7 px-2.5"
            >
              {page}
            </Button>
          ))}
          <Button variant="outline" size="icon-sm">
            <span className="sr-only">Next page</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
