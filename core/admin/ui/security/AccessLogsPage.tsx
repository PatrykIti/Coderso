import {
  CalendarDays,
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { ExportDialog } from "@/ui/shared/ExportDialog";

import { AccessLogDetailsDrawer } from "./AccessLogDetailsDrawer";
import { AccessLogsTable } from "./AccessLogsTable";
import type { AccessLogItem } from "./types";

export function AccessLogsPage() {
  const [selectedLog, setSelectedLog] = useState<AccessLogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const handleViewLog = (log: AccessLogItem) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  return (
    <AdminShell
      activeHref="/admin/access-logs"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Security</span>
          <span>/</span>
          <span className="text-foreground">Access Logs</span>
        </div>
      }
    >
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
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select defaultValue="all">
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

            <Select defaultValue="last-7-days">
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

            <Select defaultValue="all">
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

        <AccessLogsTable onView={handleViewLog} />
      </div>
      <AccessLogDetailsDrawer
        log={selectedLog}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export Access Logs"
        description="Download access logs based on the current filters."
        filename="access-logs.csv"
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
