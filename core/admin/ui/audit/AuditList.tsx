import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { ExportDialog } from "@/ui/shared/ExportDialog";

import { AuditDetailsDrawer } from "./AuditDetailsDrawer";
import { AuditFilters } from "./AuditFilters";
import { AuditTable } from "./AuditTable";
import type { AuditLog } from "./types";

const auditLogs: AuditLog[] = [
  {
    id: "log_92kLp023Xm",
    event: "Updated Article",
    category: "content",
    actor: {
      name: "Sarah Jenks",
      role: "Admin",
      type: "user",
    },
    resource: "/api/v1/posts/302",
    resourceLabel: "Article #302 \"Introduction to CMS\"",
    ipAddress: "192.168.1.45",
    timestamp: "2 mins ago",
    timestampLabel: "Oct 24, 14:22:10",
    status: "success",
    severity: "info",
    requestId: "req_abc123",
    description: "Article metadata updated and published.",
    payload: {
      action: "UPDATE",
      entity: "post",
      entity_id: 302,
      diff: {
        status: { old: "draft", new: "published" },
        updated_at: "2023-10-24T14:22:10Z",
      },
      context: {
        user_agent: "Mozilla/5.0...",
        region: "us-east-1",
      },
    },
  },
  {
    id: "log_83apQ712Lg",
    event: "Failed Login Attempt",
    category: "authentication",
    actor: {
      name: "Alex Morgan",
      role: "Editor",
      type: "user",
    },
    resource: "/auth/login",
    resourceLabel: "Login endpoint",
    ipAddress: "172.16.0.12",
    timestamp: "18 mins ago",
    timestampLabel: "Oct 24, 14:06:42",
    status: "warning",
    severity: "warning",
    requestId: "req_login_42",
    description: "Invalid credentials supplied from a known IP.",
    payload: {
      action: "LOGIN",
      result: "DENIED",
      reason: "invalid_password",
      attempts: 3,
    },
  },
  {
    id: "log_55kLx118Py",
    event: "Role Permissions Updated",
    category: "system",
    actor: {
      name: "Dev Bot",
      role: "Automation",
      type: "system",
    },
    resource: "roles/editor",
    resourceLabel: "Editor role",
    ipAddress: "10.0.0.12",
    timestamp: "42 mins ago",
    timestampLabel: "Oct 24, 13:40:01",
    status: "success",
    severity: "info",
    requestId: "req_role_219",
    description: "Automation updated role permissions based on policy.",
    payload: {
      action: "UPDATE",
      entity: "role",
      permissions_added: ["content.publish", "content.archive"],
      permissions_removed: ["settings.update"],
    },
  },
  {
    id: "log_12fKe498Qw",
    event: "System Error",
    category: "system",
    actor: {
      name: "Dev Bot",
      role: "Automation",
      type: "system",
    },
    resource: "db_connector_v2",
    resourceLabel: "Database connector",
    ipAddress: "10.0.0.5",
    timestamp: "1 hour ago",
    timestampLabel: "Oct 24, 13:10:05",
    status: "error",
    severity: "error",
    requestId: "req_sys_522",
    description: "Database connection timeout reported by worker.",
    payload: {
      action: "ERROR",
      module: "db_connector_v2",
      code: "ETIMEDOUT",
      retry_count: 2,
    },
  },
];

export function AuditList() {
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState("last-7-days");
  const [eventType, setEventType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const matchesQuery =
        !normalizedQuery ||
        log.event.toLowerCase().includes(normalizedQuery) ||
        log.actor.name.toLowerCase().includes(normalizedQuery) ||
        log.resource.toLowerCase().includes(normalizedQuery);
      const matchesType = eventType === "all" || log.category === eventType;
      const matchesSeverity = severity === "all" || log.severity === severity;

      return matchesQuery && matchesType && matchesSeverity;
    });
  }, [query, eventType, severity]);

  const selectedLog = useMemo(
    () => auditLogs.find((log) => log.id === selectedId) ?? null,
    [selectedId]
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
        <AuditTable
          logs={filteredLogs}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
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
