import { Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import { listAuditLogs, type AuditRecord } from "@/services/auditClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { ExportDialog } from "@/ui/shared/ExportDialog";

import { AuditDetailsDrawer } from "./AuditDetailsDrawer";
import { AuditFilters } from "./AuditFilters";
import { AuditTable } from "./AuditTable";
import type { AuditCategory, AuditLog, AuditSeverity, AuditStatus } from "./types";

const categoryByTarget = new Set([
  "page",
  "content",
  "entry",
  "menu",
  "media",
  "seo",
  "redirect",
  "theme",
  "admin-theme",
]);

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

const resolveCategory = (record: AuditRecord): AuditCategory => {
  const action = record.action.toLowerCase();
  if (action.startsWith("auth.") || action.startsWith("sessions.")) {
    return "authentication";
  }
  if (categoryByTarget.has(record.targetType.toLowerCase())) {
    return "content";
  }
  return "system";
};

const resolveSeverity = (
  record: AuditRecord,
  metadata: Record<string, unknown>
): AuditSeverity => {
  const metaSeverity = typeof metadata.severity === "string" ? metadata.severity : null;
  if (metaSeverity === "info" || metaSeverity === "warning" || metaSeverity === "error") {
    return metaSeverity;
  }

  const action = record.action.toLowerCase();
  if (action.includes("error") || action.includes("fail")) return "error";
  if (action.includes("warn") || action.includes("denied")) return "warning";
  return "info";
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
  const category = resolveCategory(record);
  const severity = resolveSeverity(record, metadata);
  const status = resolveStatus(severity);
  const actorName = resolveActorName(record, metadata);

  return {
    id: record.id,
    event: formatTitle(record.action),
    category,
    actor: {
      name: actorName,
      role: record.actorId ? "Admin" : "System",
      type: record.actorId ? "user" : "system",
    },
    resource: `/${record.targetType}/${record.targetId}`,
    resourceLabel: `${formatTitle(record.targetType)} ${record.targetId}`,
    ipAddress: resolveIp(metadata),
    timestamp: formatRelative(record.createdAt),
    timestampLabel: new Date(record.createdAt).toLocaleString(),
    status,
    severity,
    requestId: resolveRequestId(metadata),
    description: resolveDescription(record, metadata),
    payload: metadata,
  };
};

export function AuditList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState("last-7-days");
  const [eventType, setEventType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await listAuditLogs(200);
      setLogs(items.map(mapAuditRecord));
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load audit logs.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesQuery =
        !normalizedQuery ||
        log.event.toLowerCase().includes(normalizedQuery) ||
        log.actor.name.toLowerCase().includes(normalizedQuery) ||
        log.resource.toLowerCase().includes(normalizedQuery);
      const matchesType = eventType === "all" || log.category === eventType;
      const matchesSeverity = severity === "all" || log.severity === severity;

      return matchesQuery && matchesType && matchesSeverity;
    });
  }, [logs, query, eventType, severity]);

  const selectedLog = useMemo(
    () => logs.find((log) => log.id === selectedId) ?? null,
    [logs, selectedId]
  );

  const handleSelect = (log: AuditLog) => {
    setSelectedId(log.id);
    setDrawerOpen(true);
  };

  const handleDrawerChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedId(null);
    }
  };

  return (
    <AdminShell
      activeHref="/admin/audit"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Security</span>
          <span>/</span>
          <span className="text-foreground">Audit Logs</span>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        <PageHeader
          title="Audit Logs"
          description="Detailed trail of all actions and security events within the platform."
          actions={
            <Button variant="outline" className="gap-2" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          }
        />
        <AuditFilters
          query={query}
          dateRange={dateRange}
          eventType={eventType}
          severity={severity}
          onQueryChange={setQuery}
          onDateRangeChange={setDateRange}
          onEventTypeChange={setEventType}
          onSeverityChange={setSeverity}
        />
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {isLoading ? (
          <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
            Loading audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/10 p-6 text-sm text-muted-foreground">
            No audit logs match the current filters.
          </div>
        ) : (
          <AuditTable
            logs={filteredLogs}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        )}
      </div>
      <AuditDetailsDrawer
        log={selectedLog}
        open={drawerOpen}
        onOpenChange={handleDrawerChange}
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export Audit Logs"
        description="Download audit events for compliance reviews."
        filename="audit-logs.csv"
        fields={[
          { id: "event", label: "Event", defaultChecked: true },
          { id: "actor", label: "Actor", defaultChecked: true },
          { id: "resource", label: "Resource", defaultChecked: true },
          { id: "ip", label: "IP address" },
          { id: "timestamp", label: "Timestamp", defaultChecked: true },
          { id: "status", label: "Status" },
        ]}
      />
    </AdminShell>
  );
}
