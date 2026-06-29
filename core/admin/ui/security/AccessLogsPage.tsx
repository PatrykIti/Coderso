import {
  Activity,
  CalendarDays,
  Download,
  Filter,
  Globe,
  KeyRound,
  Laptop,
  Monitor,
  Network,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Terminal,
  Tablet,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import {
  exportAccessLogs,
  listAccessLogs,
  revokeAccessFromLog,
  type AccessLogListResponse,
  type AccessLogQuery,
  type AccessLogRecord,
} from "@/services/accessLogsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { StatCard } from "@/ui/shared/StatCard";
import { ExportDialog, type ExportDialogPayload, type ExportField } from "@/ui/shared/ExportDialog";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { useOptionalAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { resolveAdminBasePath, resolveAdminHref } from "@/utils/adminPaths";
import { resolveTruthfulCountCopy } from "../../../services/admin/adminQueryConventions";
import {
  accessLogExportColumnLabels,
  isAccessLogExportColumn,
  type AccessLogExportColumn,
} from "../../../services/access/accessLogExportContract";
import { isAccessLogMethod } from "../../../services/access/accessLogQueryContract";

import { AccessLogDetailsDrawer } from "./AccessLogDetailsDrawer";
import { AccessLogsTable } from "./AccessLogsTable";
import type { AccessLogItem } from "./types";

type AccessFilterStatus = "all" | "success" | "failed";
type AccessDateRange = "last-7-days" | "last-30-days" | "this-month" | "custom";
type AccessCursor = string | null;
type AccessAdvancedFilters = {
  method: string;
  ip: string;
};
type AccessAdvancedFilterErrors = Partial<Record<keyof AccessAdvancedFilters, string>>;
type AccessPageState = {
  cursor: AccessCursor;
  previousCursors: AccessCursor[];
};

const emptyAdvancedFilters: AccessAdvancedFilters = {
  method: "",
  ip: "",
};

const ipFilterPattern = /^[0-9a-fA-F:.]{1,128}$/;

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

const accessLogExportColumns: AccessLogExportColumn[] = [
  "id",
  "user",
  "userId",
  "ip",
  "device",
  "userAgent",
  "timestamp",
  "status",
  "method",
  "path",
  "durationMs",
  "sessionState",
  "match",
];

const accessLogExportFields: ExportField[] = accessLogExportColumns.map((column) => ({
  id: column,
  label: accessLogExportColumnLabels[column],
  defaultChecked: ["user", "ip", "timestamp", "status"].includes(column),
}));

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
  advancedFilters,
}: {
  query: string;
  userId: string;
  dateRange: AccessDateRange;
  customFrom: string;
  customTo: string;
  status: AccessFilterStatus;
  advancedFilters: AccessAdvancedFilters;
}): { query: AccessLogQuery; validationError: string | null } => {
  const normalizedQuery = query.trim();
  const normalizedUserId = userId.trim();
  const normalizedMethod = advancedFilters.method.trim().toUpperCase();
  const normalizedIp = advancedFilters.ip.trim();
  const baseQuery: AccessLogQuery = {
    limit: 50,
    ...(normalizedQuery ? { query: normalizedQuery } : {}),
    ...(normalizedUserId ? { userId: normalizedUserId } : {}),
    ...(status === "all" ? {} : { status }),
    ...(normalizedMethod ? { method: normalizedMethod } : {}),
    ...(normalizedIp ? { ip: normalizedIp } : {}),
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

const normalizeAdvancedFilters = (draft: AccessAdvancedFilters): AccessAdvancedFilters => ({
  method: draft.method.trim().toUpperCase(),
  ip: draft.ip.trim(),
});

const validateAdvancedFilters = (draft: AccessAdvancedFilters): AccessAdvancedFilterErrors => {
  const normalized = normalizeAdvancedFilters(draft);
  const errors: AccessAdvancedFilterErrors = {};
  if (normalized.method && !isAccessLogMethod(normalized.method)) {
    errors.method = "Use a supported HTTP method such as GET, POST, PATCH, or DELETE.";
  }
  if (normalized.ip && !ipFilterPattern.test(normalized.ip)) {
    errors.ip = "Use only IPv4 or IPv6 characters for the IP contains filter.";
  }
  return errors;
};

const hasAdvancedErrors = (errors: AccessAdvancedFilterErrors) =>
  Boolean(errors.method || errors.ip);

const dateRangeLabels: Record<Exclude<AccessDateRange, "last-7-days">, string> = {
  "last-30-days": "Last 30 days",
  "this-month": "This month",
  custom: "Custom range",
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AccessAdvancedFilters>(
    () => emptyAdvancedFilters
  );
  const [advancedDraft, setAdvancedDraft] = useState<AccessAdvancedFilters>(
    () => emptyAdvancedFilters
  );
  const [advancedErrors, setAdvancedErrors] = useState<AccessAdvancedFilterErrors>({});
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
        advancedFilters,
      }),
    [advancedFilters, customFrom, customTo, dateRange, query, statusFilter, userIdFilter]
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

  const handleExport = useCallback(
    async (payload: ExportDialogPayload) => {
      const columns = payload.fields.filter(isAccessLogExportColumn);
      if (columns.length !== payload.fields.length) {
        throw new Error("Access log export fields are invalid.");
      }
      const result = await exportAccessLogs({
        format: payload.format,
        columns,
        filters: baseAccessQuery,
      });
      if (result.status === "queued") {
        toast.success("Access log export queued.");
      } else {
        toast.success(`Access log export downloaded: ${result.filename}`);
      }
      setExportOpen(false);
    },
    [baseAccessQuery]
  );

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

  const handleAdvancedOpenChange = (open: boolean) => {
    setAdvancedOpen(open);
    if (open) {
      setAdvancedDraft(advancedFilters);
      setAdvancedErrors({});
    }
  };

  const handleAdvancedDraftChange = (field: keyof AccessAdvancedFilters, value: string) => {
    setAdvancedDraft((current) => ({ ...current, [field]: value }));
    setAdvancedErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleApplyAdvancedFilters = () => {
    const errors = validateAdvancedFilters(advancedDraft);
    if (hasAdvancedErrors(errors)) {
      setAdvancedErrors(errors);
      return;
    }
    startFilterRefresh();
    setAdvancedFilters(normalizeAdvancedFilters(advancedDraft));
    setAdvancedOpen(false);
  };

  const handleClearAdvancedFilters = () => {
    startFilterRefresh();
    setAdvancedFilters(emptyAdvancedFilters);
    setAdvancedDraft(emptyAdvancedFilters);
    setAdvancedErrors({});
  };

  const clearSearchFilter = () => {
    startFilterRefresh();
    setQuery("");
  };

  const clearUserIdFilter = () => {
    startFilterRefresh();
    setUserIdFilter("");
  };

  const clearStatusFilter = () => {
    startFilterRefresh();
    setStatusFilter("all");
  };

  const clearDateRangeFilter = () => {
    startFilterRefresh();
    setDateRange("last-7-days");
    setCustomFrom("");
    setCustomTo("");
  };

  const clearAdvancedFilter = (field: keyof AccessAdvancedFilters) => {
    startFilterRefresh();
    setAdvancedFilters((current) => ({ ...current, [field]: "" }));
    setAdvancedDraft((current) => ({ ...current, [field]: "" }));
    setAdvancedErrors((current) => ({ ...current, [field]: undefined }));
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

  // TASK-479-27-L04: page-scoped stat row derived ONLY from the loaded
  // AccessLogItem view models. There is no 24h aggregate on the response, so
  // every metric is honestly labelled "(page)" — never a fabricated total.
  const stats = useMemo(
    () => ({
      blocked: logs.filter((log) => log.statusCode === 401 || log.statusCode === 403).length,
      failed: logs.filter((log) => log.path.includes("login") && log.statusCode >= 400).length,
      uniqueIps: new Set(logs.map((log) => log.ipAddress)).size,
    }),
    [logs]
  );

  const visibleError = validationError ?? error;
  const tableIsLoading = validationError ? false : isLoading;
  const activeFilterChips = [
    ...(query.trim()
      ? [{ id: "query", label: `Search: ${query.trim()}`, onClear: clearSearchFilter }]
      : []),
    ...(userIdFilter.trim()
      ? [{ id: "userId", label: `User ID: ${userIdFilter.trim()}`, onClear: clearUserIdFilter }]
      : []),
    ...(statusFilter !== "all"
      ? [{ id: "status", label: `Status: ${statusFilter}`, onClear: clearStatusFilter }]
      : []),
    ...(dateRange !== "last-7-days"
      ? [
          {
            id: "dateRange",
            label:
              dateRange === "custom" && customFrom && customTo
                ? `Date: ${customFrom} to ${customTo}`
                : `Date: ${dateRangeLabels[dateRange]}`,
            onClear: clearDateRangeFilter,
          },
        ]
      : []),
    ...(advancedFilters.method
      ? [
          {
            id: "method",
            label: `Method: ${advancedFilters.method}`,
            onClear: () => clearAdvancedFilter("method"),
          },
        ]
      : []),
    ...(advancedFilters.ip
      ? [
          {
            id: "ip",
            label: `IP contains: ${advancedFilters.ip}`,
            onClear: () => clearAdvancedFilter("ip"),
          },
        ]
      : []),
  ];

  return (
    <AdminShell activeHref="/admin/access-logs" breadcrumbs={["Admin", "Access Logs"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Access Logs"
          description="Monitor user authentication and security events."
          icon={<Network />}
          actions={
            <Button variant="outline" className="gap-2" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Loaded (page)" value={String(logs.length)} icon={<Activity />} />
          <StatCard label="Blocked (page)" value={String(stats.blocked)} icon={<ShieldAlert />} />
          <StatCard label="Unique IPs (page)" value={String(stats.uniqueIps)} icon={<Globe />} />
          <StatCard label="Failed logins (page)" value={String(stats.failed)} icon={<KeyRound />} />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
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
              aria-label="Advanced access log filters"
              title="Filter by HTTP method and IP address"
              onClick={() => handleAdvancedOpenChange(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Active access log filters">
            {activeFilterChips.map((chip) => (
              <Badge key={chip.id} variant="secondary" className="max-w-full gap-1.5 pr-1">
                <span className="min-w-0 truncate">{chip.label}</span>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Clear ${chip.label}`}
                  onClick={chip.onClear}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}

        {visibleError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {visibleError}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
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
      <Sheet open={advancedOpen} onOpenChange={handleAdvancedOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex h-full min-h-0 w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
            <div>
              <SheetTitle>Advanced access filters</SheetTitle>
              <SheetDescription>
                Filter the current access log query by request method and IP without loading a user
                directory.
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close advanced access filters"
              onClick={() => handleAdvancedOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="access-method-filter">
                HTTP method
              </label>
              <Input
                id="access-method-filter"
                value={advancedDraft.method}
                onChange={(event) => handleAdvancedDraftChange("method", event.target.value)}
                placeholder="GET"
                autoCapitalize="characters"
                aria-invalid={Boolean(advancedErrors.method)}
                aria-describedby={advancedErrors.method ? "access-method-filter-error" : undefined}
              />
              {advancedErrors.method ? (
                <p id="access-method-filter-error" className="text-xs text-destructive">
                  {advancedErrors.method}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Supported values: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="access-ip-filter">
                IP contains
              </label>
              <Input
                id="access-ip-filter"
                value={advancedDraft.ip}
                onChange={(event) => handleAdvancedDraftChange("ip", event.target.value)}
                placeholder="127.0.0.1"
                aria-invalid={Boolean(advancedErrors.ip)}
                aria-describedby={advancedErrors.ip ? "access-ip-filter-error" : undefined}
              />
              {advancedErrors.ip ? (
                <p id="access-ip-filter-error" className="text-xs text-destructive">
                  {advancedErrors.ip}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Matches IPv4 or IPv6 text already present in access log rows.
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
              Exact User ID remains the user filter. Role filtering is not available because access
              logs do not store historical role snapshots.
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => handleAdvancedOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleClearAdvancedFilters}>
              Clear advanced
            </Button>
            <Button onClick={handleApplyAdvancedFilters}>Apply filters</Button>
          </div>
        </SheetContent>
      </Sheet>
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
        filename="access-logs-current-filters.{format}"
        fields={accessLogExportFields}
        onExport={handleExport}
      />
    </AdminShell>
  );
}
