import {
  CalendarDays,
  Download,
  Filter,
  Laptop,
  Monitor,
  Search,
  SlidersHorizontal,
  Smartphone,
  Terminal,
  Tablet,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiClientError } from "@/services/apiClient";
import { listAccessLogs, type AccessLogRecord } from "@/services/accessLogsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { ExportDialog } from "@/ui/shared/ExportDialog";

import { AccessLogDetailsDrawer } from "./AccessLogDetailsDrawer";
import { AccessLogsTable } from "./AccessLogsTable";
import type { AccessLogItem } from "./types";

type AccessFilterStatus = "all" | "success" | "failed";

const resolveDateRange = (value: string) => {
  const now = new Date();
  if (value === "last-7-days") {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  }
  if (value === "last-30-days") {
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  }
  if (value === "this-month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  return {};
};

const resolveDevice = (userAgent: string | null) => {
  if (!userAgent) {
    return { label: "Unknown device", icon: Monitor };
  }
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone")) {
    return { label: "iPhone / iOS", icon: Smartphone };
  }
  if (ua.includes("android")) {
    return { label: "Android / Mobile", icon: Smartphone };
  }
  if (ua.includes("ipad")) {
    return { label: "iPad / iPadOS", icon: Tablet };
  }
  if (ua.includes("postman") || ua.includes("curl")) {
    return { label: "API client", icon: Terminal };
  }
  if (ua.includes("windows")) {
    return { label: "Windows / Desktop", icon: Monitor };
  }
  if (ua.includes("mac os") || ua.includes("macintosh")) {
    return { label: "macOS / Desktop", icon: Laptop };
  }
  if (ua.includes("linux")) {
    return { label: "Linux / Desktop", icon: Monitor };
  }
  return { label: "Desktop / Unknown", icon: Monitor };
};

const mapAccessLog = (log: AccessLogRecord): AccessLogItem => {
  const timestamp = new Date(log.createdAt);
  const status = log.status >= 400 ? "failed" : "success";
  const device = resolveDevice(log.userAgent ?? null);
  const userName = log.userName ?? log.userEmail ?? "System";
  const userDetail = log.userEmail ?? "System";

  return {
    id: log.id,
    user: {
      name: userName,
      detail: userDetail,
    },
    ipAddress: log.ip ?? "—",
    method: log.method,
    path: log.path,
    statusCode: log.status,
    durationMs: log.durationMs ?? null,
    userAgent: log.userAgent ?? null,
    device: {
      label: device.label,
      icon: device.icon,
    },
    timestamp: {
      date: Number.isNaN(timestamp.getTime()) ? "Unknown" : timestamp.toLocaleDateString(),
      time: Number.isNaN(timestamp.getTime()) ? "Unknown" : timestamp.toLocaleTimeString(),
    },
    status,
  };
};

export function AccessLogsPage() {
  const [selectedLog, setSelectedLog] = useState<AccessLogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [dateRange, setDateRange] = useState("last-7-days");
  const [statusFilter, setStatusFilter] = useState<AccessFilterStatus>("all");
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleViewLog = (log: AccessLogItem) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const filters = useMemo(() => {
    const range = resolveDateRange(dateRange);
    const normalizedQuery = [query.trim(), userFilter === "all" ? "" : userFilter]
      .filter(Boolean)
      .join(" ");
    return {
      query: normalizedQuery || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      from: range.from?.toISOString(),
    };
  }, [query, statusFilter, dateRange, userFilter]);

  useEffect(() => {
    let active = true;
    listAccessLogs({
      limit: 200,
      status: filters.status,
      query: filters.query,
      from: filters.from,
    })
      .then((items) => {
        if (!active) return;
        setError(null);
        setLogs(items.map(mapAccessLog));
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load access logs.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  return (
    <AdminShell activeHref="/admin/access-logs" breadcrumbs={["Security", "Access Logs"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Access Logs"
          description="Monitor user authentication and security events."
          actions={
            <Button variant="outline" className="gap-2" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          }
        />

        <div className="flex flex-col gap-4 rounded-xl border bg-card/60 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search user or IP..."
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <User className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 w-[180px]">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="this-month">This month</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as AccessFilterStatus)}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="h-9 w-9">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <AccessLogsTable logs={logs} isLoading={isLoading} onView={handleViewLog} />
      </div>
      <AccessLogDetailsDrawer log={selectedLog} open={drawerOpen} onOpenChange={setDrawerOpen} />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export Access Logs"
        description="Download access logs based on the current filters."
        filename="access-logs.csv"
        unavailableReason="Access log export is not wired yet. TASK-358-03 owns the export route and payload."
        fields={[
          { id: "user", label: "User", defaultChecked: true },
          { id: "ip", label: "IP address", defaultChecked: true },
          { id: "device", label: "Device" },
          { id: "timestamp", label: "Timestamp", defaultChecked: true },
          { id: "status", label: "Status" },
        ]}
      />
    </AdminShell>
  );
}
