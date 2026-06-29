import { Download, ScrollText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  exportAuditLogs,
  listAuditLogs,
  type AuditLogListResponse,
  type AuditLogQuery,
  type AuditRecord,
} from "@/services/auditClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { ExportDialog } from "@/ui/shared/ExportDialog";
import { resolveTruthfulCountCopy } from "../../../services/admin/adminQueryConventions";
import {
  resolveAuditCategory,
  resolveAuditSeverity,
} from "../../../services/audit/auditClassification";
import {
  auditExportColumnLabels,
  isAuditExportColumn,
  type AuditExportColumn,
} from "../../../services/audit/auditExportContract";

import { copyAuditEntryJson } from "./auditEntryActions";
import { AuditDetailsDrawer } from "./AuditDetailsDrawer";
import { AuditFilters } from "./AuditFilters";
import { AuditTable } from "./AuditTable";
import type { AuditCategory, AuditDateRange, AuditLog, AuditSeverity, AuditStatus } from "./types";
import type { ExportDialogPayload, ExportField } from "@/ui/shared/ExportDialog";

type AuditCursor = string | null;
type AuditPageState = {
  cursor: AuditCursor;
  previousCursors: AuditCursor[];
};

const formatTitle = (value: string) =>
  value
    .split(/[.\-_]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const formatRelative = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

const resolveStatus = (severity: AuditSeverity): AuditStatus => {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "success";
};

const resolveActorName = (record: AuditRecord, metadata: Record<string, unknown>) => {
  if (!record.actorId) return "System";
  if (typeof metadata.actorName === "string") return metadata.actorName;
  if (typeof metadata.actorEmail === "string") return metadata.actorEmail;
  return `User ${record.actorId.slice(0, 6)}`;
};

const resolveRequestId = (metadata: Record<string, unknown>) => {
  if (typeof metadata.requestId === "string") return metadata.requestId;
  return "—";
};

const resolveIp = (metadata: Record<string, unknown>) => {
  if (typeof metadata.ip === "string") return metadata.ip;
  return "—";
};

const resolveDescription = (record: AuditRecord, metadata: Record<string, unknown>) => {
  if (typeof metadata.description === "string") return metadata.description;
  return `${formatTitle(record.action)} executed on ${record.targetType}.`;
};

const mapAuditRecord = (record: AuditRecord): AuditLog => {
  const metadata = record.metadata ?? {};
  const category = resolveAuditCategory(record);
  const severity = resolveAuditSeverity(record, metadata);
  const status = resolveStatus(severity);
  const actorName = resolveActorName(record, metadata);

  return {
    id: record.id,
    event: formatTitle(record.action),
    category: category as AuditCategory,
    actor: {
      name: actorName,
      role: record.actorId ? "Admin" : "System",
      type: record.actorId ? "user" : "system",
    },
    resource: `/${record.targetType}/${record.targetId}`,
    resourceLabel: `${formatTitle(record.targetType)} ${record.targetId}`,
    ipAddress: resolveIp(metadata),
    createdAt: record.createdAt,
    timestamp: formatRelative(record.createdAt),
    timestampLabel: new Date(record.createdAt).toLocaleString(),
    status,
    severity: severity as AuditSeverity,
    requestId: resolveRequestId(metadata),
    description: resolveDescription(record, metadata),
    payload: metadata,
  };
};

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const endOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

export function buildAuditQueryFromFilters(input: {
  query: string;
  dateRange: AuditDateRange;
  eventType: "all" | AuditCategory;
  severity: "all" | AuditSeverity;
  now?: Date;
}): AuditLogQuery {
  const now = input.now ?? new Date();
  const to = endOfUtcDay(now);
  const from =
    input.dateRange === "this-month"
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      : startOfUtcDay(
          new Date(
            Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth(),
              now.getUTCDate() - (input.dateRange === "last-30-days" ? 29 : 6)
            )
          )
        );
  const trimmedQuery = input.query.trim();

  return {
    limit: 50,
    ...(trimmedQuery ? { query: trimmedQuery } : {}),
    ...(input.eventType !== "all" ? { category: input.eventType } : {}),
    ...(input.severity !== "all" ? { severity: input.severity } : {}),
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

const buildAuditCountCopy = (response: AuditLogListResponse) => {
  return resolveTruthfulCountCopy(response, { resourceLabel: "audit logs" });
};

const firstAuditPageState = (): AuditPageState => ({
  cursor: null,
  previousCursors: [],
});

const auditExportColumns: AuditExportColumn[] = [
  "event",
  "actor",
  "resource",
  "ip",
  "timestamp",
  "status",
  "severity",
  "requestId",
  "payload",
];

const auditExportFields: ExportField[] = auditExportColumns.map((column) => ({
  id: column,
  label: auditExportColumnLabels[column],
  defaultChecked: ["event", "actor", "resource", "timestamp", "status"].includes(column),
}));

export function AuditList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<AuditDateRange>("last-7-days");
  const [eventType, setEventType] = useState<"all" | AuditCategory>("all");
  const [severity, setSeverity] = useState<"all" | AuditSeverity>("all");
  const [countCopy, setCountCopy] = useState("Showing 0 loaded audit logs.");
  const [nextCursor, setNextCursor] = useState<AuditCursor>(null);
  const [pageRequest, setPageRequest] = useState<AuditPageState>(() => firstAuditPageState());
  const [loadedPage, setLoadedPage] = useState<AuditPageState>(() => firstAuditPageState());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const baseAuditQuery = useMemo(
    () => buildAuditQueryFromFilters({ query, dateRange, eventType, severity }),
    [dateRange, eventType, query, severity]
  );
  const auditQuery = useMemo(
    () => ({
      ...baseAuditQuery,
      ...(pageRequest.cursor ? { cursor: pageRequest.cursor } : {}),
    }),
    [baseAuditQuery, pageRequest]
  );

  useEffect(() => {
    let active = true;
    const requestedPage = pageRequest;
    listAuditLogs(auditQuery)
      .then((response) => {
        if (!active) return;
        setError(null);
        setLogs(response.items.map(mapAuditRecord));
        setCountCopy(buildAuditCountCopy(response));
        setNextCursor(response.nextCursor ?? null);
        setLoadedPage(requestedPage);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isApiClientError(err)) {
          if (err.code === "audit_cursor_invalid") {
            setError(null);
            setNotice("Audit cursor expired. Showing the first page again.");
            setNextCursor(null);
            setPageRequest(firstAuditPageState());
            return;
          }
          setError(err.message);
        } else {
          setError("Failed to load audit logs.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auditQuery, pageRequest]);

  const startFilterRefresh = () => {
    setIsLoading(true);
    setPageRequest(firstAuditPageState());
    setNextCursor(null);
    setNotice(null);
  };

  const handleQueryChange = (value: string) => {
    startFilterRefresh();
    setQuery(value);
  };

  const handleDateRangeChange = (value: AuditDateRange) => {
    startFilterRefresh();
    setDateRange(value);
  };

  const handleEventTypeChange = (value: "all" | AuditCategory) => {
    startFilterRefresh();
    setEventType(value);
  };

  const handleSeverityChange = (value: "all" | AuditSeverity) => {
    startFilterRefresh();
    setSeverity(value);
  };

  const selectedLog = useMemo(
    () => logs.find((log) => log.id === selectedId) ?? null,
    [logs, selectedId]
  );

  const handleSelect = (log: AuditLog) => {
    setSelectedId(log.id);
    setDrawerOpen(true);
  };

  const handleCopyJson = useCallback((log: AuditLog) => {
    void copyAuditEntryJson(log);
  }, []);

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

  const handleExport = useCallback(
    async (payload: ExportDialogPayload) => {
      const columns = payload.fields.filter(isAuditExportColumn);
      if (columns.length !== payload.fields.length) {
        throw new Error("Audit export fields are invalid.");
      }
      const result = await exportAuditLogs({
        format: payload.format,
        columns,
        filters: baseAuditQuery,
      });
      if (result.status === "queued") {
        toast.success("Audit export queued.");
      } else {
        toast.success(`Audit export downloaded: ${result.filename}`);
      }
      setExportOpen(false);
    },
    [baseAuditQuery]
  );

  const handleDrawerChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedId(null);
    }
  };

  return (
    <AdminShell activeHref="/admin/audit" breadcrumbs={["Admin", "Audit Logs"]}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        <PageHeader
          title="Audit Logs"
          description="Detailed trail of all actions and security events within the platform."
          icon={<ScrollText />}
          actions={
            <Button variant="outline" className="gap-2" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          }
        />
        <AuditFilters
          query={query}
          dateRange={dateRange}
          eventType={eventType}
          severity={severity}
          onQueryChange={handleQueryChange}
          onDateRangeChange={handleDateRangeChange}
          onEventTypeChange={handleEventTypeChange}
          onSeverityChange={handleSeverityChange}
        />
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            {notice}
          </div>
        ) : null}
        {isLoading && logs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Loading audit logs...
          </div>
        ) : logs.length === 0 && error ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
            Audit logs could not be loaded.
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
            No audit logs match the current filters.
          </div>
        ) : (
          <AuditTable
            logs={logs}
            selectedId={selectedId}
            onSelect={handleSelect}
            onCopyJson={handleCopyJson}
            pageInfo={{
              countCopy,
              canNext: Boolean(nextCursor),
              canPrevious: loadedPage.previousCursors.length > 0,
              isLoading,
              onNext: handleNextPage,
              onPrevious: handlePreviousPage,
            }}
          />
        )}
      </div>
      <AuditDetailsDrawer
        log={selectedLog}
        open={drawerOpen}
        onOpenChange={handleDrawerChange}
        onCopyJson={handleCopyJson}
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export Audit Logs"
        description="Download audit events for compliance reviews."
        filename="audit-logs-current-filters.csv"
        fields={auditExportFields}
        onExport={handleExport}
      />
    </AdminShell>
  );
}
