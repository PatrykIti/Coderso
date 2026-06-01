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
import { useCallback, useEffect, useMemo, useState } from "react";

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
import {
  listAccessLogs,
  revokeAccessFromLog,
  type AccessLogListResponse,
  type AccessLogQuery,
  type AccessLogRecord,
} from "@/services/accessLogsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { ExportDialog } from "@/ui/shared/ExportDialog";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { useOptionalAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { resolveAdminBasePath, resolveAdminHref } from "@/utils/adminPaths";
import { resolveTruthfulCountCopy } from "../../../services/admin/adminQueryConventions";

import { AccessLogDetailsDrawer } from "./AccessLogDetailsDrawer";
import { AccessLogsTable } from "./AccessLogsTable";
import type { AccessLogItem } from "./types";

type AccessFilterStatus = "all" | "success" | "failed";
type AccessDateRange = "last-7-days" | "last-30-days" | "this-month" | "custom";
type AccessCursor = string | null;
type AccessPageState = {
  cursor: AccessCursor;
  previousCursors: AccessCursor[];
};

const advancedFiltersUnavailableReason =
  "Advanced access log filters are not wired yet. TASK-358-04 owns method, IP, and saved advanced filter controls.";

const firstAccessPageState = (): AccessPageState => ({
  cursor: null,
  previousCursors: [],
});

const buildAccessCountCopy = (response: AccessLogListResponse) => {
  return resolveTruthfulCountCopy(response, { resourceLabel: "access logs" });
};

const unresolvedSessionContext = {
  state: "none" as const,
  label: "Historical log without session link",
  reason: "historical" as const,
  view: {
    enabled: false,
    reason: "Historical log without session link",
  },
  revoke: {
    enabled: false,
    reason: "Historical log without session link",
  },
};

const toDateBoundary = (value: string, boundary: "start" | "end") =>
  `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}Z`;

const resolveDateRange = (value: AccessDateRange) => {
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

const buildAccessLogQueryFromFilters = ({
  query,
  userId,
  dateRange,
  customFrom,
  customTo,
  status,
}: {
  query: string;
  userId: string;
  dateRange: AccessDateRange;
  customFrom: string;
  customTo: string;
  status: AccessFilterStatus;
}): { query: AccessLogQuery; validationError: string | null } => {
  const normalizedQuery = query.trim();
  const normalizedUserId = userId.trim();
  const baseQuery: AccessLogQuery = {
    limit: 50,
    ...(normalizedQuery ? { query: normalizedQuery } : {}),
    ...(normalizedUserId ? { userId: normalizedUserId } : {}),
    ...(status === "all" ? {} : { status }),
  };

  if (dateRange === "custom") {
    if (!customFrom || !customTo) {
      return {
        query: baseQuery,
        validationError: "Custom range requires both start and end dates.",
      };
    }
    if (customFrom > customTo) {
      return {
        query: baseQuery,
        validationError: "Custom range must start before it ends.",
      };
    }
    return {
      query: {
        ...baseQuery,
        from: toDateBoundary(customFrom, "start"),
        to: toDateBoundary(customTo, "end"),
      },
      validationError: null,
    };
  }

  const range = resolveDateRange(dateRange);
  return {
    query: {
      ...baseQuery,
      ...(range.from ? { from: range.from.toISOString() } : {}),
    },
    validationError: null,
  };
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
    matchContext: log.matchContext ?? null,
    session: log.session ?? unresolvedSessionContext,
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
  const adminRouter = useOptionalAdminRouter();
  const [selectedLog, setSelectedLog] = useState<AccessLogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pendingRevokeLog, setPendingRevokeLog] = useState<AccessLogItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [query, setQuery] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [dateRange, setDateRange] = useState<AccessDateRange>("last-7-days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccessFilterStatus>("all");
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [countCopy, setCountCopy] = useState("Showing 0 loaded access logs.");
  const [nextCursor, setNextCursor] = useState<AccessCursor>(null);
  const [pageRequest, setPageRequest] = useState<AccessPageState>(() => firstAccessPageState());
  const [loadedPage, setLoadedPage] = useState<AccessPageState>(() => firstAccessPageState());
  const [reloadNonce, setReloadNonce] = useState(0);

  const handleViewLog = (log: AccessLogItem) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const handleViewSession = useCallback(
    (log: AccessLogItem) => {
      if (!log.session.view.enabled || !log.session.sessionId) return;
      const params = new URLSearchParams({ sessionId: log.session.sessionId });
      if (log.session.userId) params.set("userId", log.session.userId);
      const href = `/settings/security/sessions?${params.toString()}`;
      setDrawerOpen(false);
      if (adminRouter) {
        adminRouter.navigate(href);
        return;
      }
      if (typeof window !== "undefined") {
        const basePath = resolveAdminBasePath(window.location.pathname);
        window.location.assign(resolveAdminHref(basePath, href));
      }
    },
    [adminRouter]
  );

  const handleRequestRevoke = useCallback((log: AccessLogItem) => {
    if (!log.session.revoke.enabled) return;
    setPendingRevokeLog(log);
  }, []);

  const { query: baseAccessQuery, validationError } = useMemo(
    () =>
      buildAccessLogQueryFromFilters({
        query,
        userId: userIdFilter,
        dateRange,
        customFrom,
        customTo,
        status: statusFilter,
      }),
    [customFrom, customTo, dateRange, query, statusFilter, userIdFilter]
  );

  const accessQuery = useMemo(
    () => ({
      ...baseAccessQuery,
      ...(pageRequest.cursor ? { cursor: pageRequest.cursor } : {}),
    }),
    [baseAccessQuery, pageRequest]
  );

  useEffect(() => {
    let active = true;
    if (validationError) {
      return () => {
        active = false;
      };
    }
    const requestedPage = pageRequest;
    listAccessLogs(accessQuery)
      .then((response) => {
        if (!active) return;
        const mappedLogs = response.items.map(mapAccessLog);
        setError(null);
        setLogs(mappedLogs);
        setSelectedLog((current) => {
          if (!current) return current;
          return mappedLogs.find((item) => item.id === current.id) ?? current;
        });
        setCountCopy(buildAccessCountCopy(response));
        setNextCursor(response.nextCursor ?? null);
        setLoadedPage(requestedPage);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isApiClientError(err)) {
          if (err.code === "access_log_cursor_invalid") {
            setError(null);
            setNotice("Access log cursor expired. Showing the first page again.");
            setNextCursor(null);
            setPageRequest(firstAccessPageState());
            return;
          }
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
  }, [accessQuery, pageRequest, reloadNonce, validationError]);

  const handleConfirmRevoke = useCallback(async () => {
    if (!pendingRevokeLog) return;
    setIsRevoking(true);
    try {
      const result = await revokeAccessFromLog(pendingRevokeLog.id);
      setNotice(
        result.alreadyRevoked
          ? "Access session was already revoked. Showing refreshed access logs."
          : "Access session revoked. Showing refreshed access logs."
      );
      setReloadNonce((value) => value + 1);
    } catch (err) {
      if (isApiClientError(err)) {
        throw new Error(err.message);
      }
      throw err;
    } finally {
      setIsRevoking(false);
    }
  }, [pendingRevokeLog]);

  const startFilterRefresh = () => {
    setIsLoading(true);
    setPageRequest(firstAccessPageState());
    setNextCursor(null);
    setNotice(null);
  };

  const handleQueryChange = (value: string) => {
    startFilterRefresh();
    setQuery(value);
  };

  const handleUserIdChange = (value: string) => {
    startFilterRefresh();
    setUserIdFilter(value);
  };

  const handleDateRangeChange = (value: string) => {
    startFilterRefresh();
    setDateRange(value as AccessDateRange);
  };

  const handleCustomFromChange = (value: string) => {
    startFilterRefresh();
    setCustomFrom(value);
  };

  const handleCustomToChange = (value: string) => {
    startFilterRefresh();
    setCustomTo(value);
  };

  const handleStatusChange = (value: string) => {
    startFilterRefresh();
    setStatusFilter(value as AccessFilterStatus);
  };

  const handleNextPage = useCallback(() => {
    if (!nextCursor) return;
    setIsLoading(true);
    setNotice(null);
    setPageRequest({
      cursor: nextCursor,
      previousCursors: [...loadedPage.previousCursors, loadedPage.cursor],
    });
  }, [loadedPage, nextCursor]);

  const handlePreviousPage = useCallback(() => {
    if (loadedPage.previousCursors.length === 0) return;
    const previousCursor = loadedPage.previousCursors.at(-1) ?? null;
    setIsLoading(true);
    setNotice(null);
    setPageRequest({
      cursor: previousCursor,
      previousCursors: loadedPage.previousCursors.slice(0, -1),
    });
  }, [loadedPage]);

  const visibleError = validationError ?? error;
  const tableIsLoading = validationError ? false : isLoading;

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
              onChange={(event) => handleQueryChange(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={userIdFilter}
                onChange={(event) => handleUserIdChange(event.target.value)}
                placeholder="User ID"
                className="h-9 w-[180px] pl-9"
                aria-label="Filter by user ID"
              />
            </div>

            <Select value={dateRange} onValueChange={handleDateRangeChange}>
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
            {dateRange === "custom" ? (
              <>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(event) => handleCustomFromChange(event.target.value)}
                  className="h-9 w-[150px]"
                  aria-label="Custom range start"
                />
                <Input
                  type="date"
                  value={customTo}
                  onChange={(event) => handleCustomToChange(event.target.value)}
                  className="h-9 w-[150px]"
                  aria-label="Custom range end"
                />
              </>
            ) : null}

            <Select value={statusFilter} onValueChange={handleStatusChange}>
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

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled
              aria-label="Advanced access log filters unavailable"
              title={advancedFiltersUnavailableReason}
              data-no-op-control="access-advanced-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {visibleError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {visibleError}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            {notice}
          </div>
        ) : null}
        <AccessLogsTable
          logs={logs}
          isLoading={tableIsLoading}
          onView={handleViewLog}
          pageInfo={{
            countCopy,
            canNext: Boolean(nextCursor),
            canPrevious: loadedPage.previousCursors.length > 0,
            isLoading: tableIsLoading,
            onNext: handleNextPage,
            onPrevious: handlePreviousPage,
          }}
        />
      </div>
      <AccessLogDetailsDrawer
        log={selectedLog}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onViewSession={handleViewSession}
        onRequestRevoke={handleRequestRevoke}
        isRevoking={isRevoking}
      />
      <ConfirmActionDialog
        open={Boolean(pendingRevokeLog)}
        onOpenChange={(open) => {
          if (!open) setPendingRevokeLog(null);
        }}
        title="Revoke access session"
        description="This will end the active session linked to the selected access log."
        confirmLabel="Revoke access"
        confirmingLabel="Revoking..."
        isConfirming={isRevoking}
        targetLabel={
          pendingRevokeLog
            ? `${pendingRevokeLog.user.name} · ${pendingRevokeLog.ipAddress} · ${pendingRevokeLog.device.label}`
            : undefined
        }
        requireTypedValue="REVOKE"
        onConfirm={handleConfirmRevoke}
      >
        The user will be signed out from that session. Current sessions cannot be revoked from
        access logs.
      </ConfirmActionDialog>
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
