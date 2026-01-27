import { Filter, Shield } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

type AuditItem = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actor: string;
  createdAt: string;
};

const sampleAudit: AuditItem[] = [
  {
    id: "audit-1",
    action: "auth.login",
    targetType: "user",
    targetId: "user-1",
    actor: "admin@nextless.dev",
    createdAt: "2026-01-27 08:12",
  },
  {
    id: "audit-2",
    action: "pages.publish",
    targetType: "page",
    targetId: "page-3",
    actor: "editor@nextless.dev",
    createdAt: "2026-01-27 07:42",
  },
  {
    id: "audit-3",
    action: "settings.update",
    targetType: "settings",
    targetId: "site.locale",
    actor: "admin@nextless.dev",
    createdAt: "2026-01-26 18:30",
  },
];

const actionStyles: Record<string, string> = {
  "auth.login": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "auth.logout": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  "pages.publish": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "pages.restore": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "settings.update": "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export function AuditList() {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filtered = useMemo(() => {
    return sampleAudit.filter((item) => {
      const matchesQuery =
        !query ||
        item.action.toLowerCase().includes(query.toLowerCase()) ||
        item.actor.toLowerCase().includes(query.toLowerCase());
      const matchesAction =
        actionFilter === "all" || item.action === actionFilter;
      return matchesQuery && matchesAction;
    });
  }, [query, actionFilter]);

  return (
    <AdminShell
      activeHref="/admin/audit"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span className="text-foreground">Audit Logs</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader
          title="Audit Logs"
          description="Track critical actions across the CMS."
          actions={
            <Button variant="outline" className="gap-2">
              <Shield className="h-4 w-4" />
              Security Overview
            </Button>
          }
        />
        <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <Input
            placeholder="Search by action or user..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="lg:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              variant={actionFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActionFilter("all")}
            >
              All actions
            </Button>
            <Button
              variant={actionFilter === "pages.publish" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActionFilter("pages.publish")}
            >
              Page publish
            </Button>
            <Button
              variant={actionFilter === "settings.update" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActionFilter("settings.update")}
            >
              Settings
            </Button>
            <Button variant="ghost" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={actionStyles[item.action] ?? "bg-muted"}
                    >
                      {item.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.targetType} / {item.targetId}
                  </TableCell>
                  <TableCell className="text-sm">{item.actor}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.createdAt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminShell>
  );
}
