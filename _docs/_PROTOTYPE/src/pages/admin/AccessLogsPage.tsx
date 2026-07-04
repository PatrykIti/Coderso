import { Activity, Globe, KeyRound, Network, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { RELATIVE_TIMES, pick, spark } from "@/lib/mock";

type Row = {
  method: string;
  path: string;
  status: number;
  ip: string;
  location: string;
  agent: string;
};

const ROWS: Row[] = [
  { method: "GET", path: "/", status: 200, ip: "84.23.11.5", location: "Warsaw, PL", agent: "Chrome 126 · macOS" },
  { method: "POST", path: "/api/login", status: 401, ip: "203.0.113.7", location: "Berlin, DE", agent: "Firefox 128 · Windows" },
  { method: "GET", path: "/dashboard", status: 200, ip: "198.51.100.4", location: "Kraków, PL", agent: "Safari 17 · iOS" },
  { method: "GET", path: "/old-pricing", status: 302, ip: "146.70.30.1", location: "Amsterdam, NL", agent: "Chrome 126 · Linux" },
  { method: "POST", path: "/api/pages", status: 200, ip: "172.16.4.88", location: "Warsaw, PL", agent: "Edge 126 · Windows" },
  { method: "GET", path: "/wp-admin", status: 403, ip: "45.155.205.9", location: "Unknown", agent: "curl/8.4.0" },
  { method: "GET", path: "/assets/app.js", status: 404, ip: "91.198.174.2", location: "Paris, FR", agent: "Chrome 125 · Android" },
  { method: "DELETE", path: "/api/media/91", status: 200, ip: "10.0.0.12", location: "Warsaw, PL", agent: "Chrome 126 · macOS" },
  { method: "POST", path: "/api/checkout", status: 500, ip: "203.0.113.21", location: "London, UK", agent: "Safari 17 · macOS" },
  { method: "GET", path: "/api/admin/users", status: 403, ip: "185.220.101.4", location: "Unknown", agent: "python-requests/2.31" },
];

const methodVariant = (method: string): BadgeProps["variant"] =>
  method === "GET"
    ? "info"
    : method === "POST"
      ? "soft"
      : method === "DELETE"
        ? "destructive"
        : "warning";

const statusTone = (code: number) =>
  code === 200
    ? "text-success"
    : code === 302
      ? "text-info"
      : code === 401 || code === 403
        ? "text-warning"
        : "text-destructive";

const columns: Column<Row>[] = [
  {
    key: "time",
    header: "Time",
    render: (_row, index) => <span className="text-sm text-muted-foreground">{pick(RELATIVE_TIMES, index)}</span>,
  },
  {
    key: "ip",
    header: "IP",
    render: (row) => <span className="font-mono text-sm">{row.ip}</span>,
  },
  {
    key: "location",
    header: "Location",
    render: (row) => <span className="text-sm">{row.location}</span>,
  },
  {
    key: "request",
    header: "Request",
    render: (row) => (
      <span className="flex items-center gap-2">
        <Badge variant={methodVariant(row.method)} className="font-mono">
          {row.method}
        </Badge>
        <span className="font-mono text-sm text-muted-foreground">{row.path}</span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    align: "right",
    render: (row) => (
      <span className={`font-mono text-sm font-semibold tabular-nums ${statusTone(row.status)}`}>
        {row.status}
      </span>
    ),
  },
  {
    key: "agent",
    header: "User agent",
    render: (row) => (
      <span className="block max-w-[180px] truncate text-sm text-muted-foreground">{row.agent}</span>
    ),
  },
];

export function AccessLogsPage() {
  return (
    <div>
      <PageHeader
        title="Access logs"
        description="Monitor incoming traffic, blocked requests, and sign-in attempts."
        icon={<Network />}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requests · 24h" value="38,420" delta="+6.2%" trend="up" icon={<Activity />} spark={spark(4)} />
        <StatCard label="Blocked" value="126" delta="+18" trend="down" icon={<ShieldAlert />} spark={spark(9)} />
        <StatCard label="Unique IPs" value="2,318" delta="+4.1%" trend="up" icon={<Globe />} spark={spark(14)} />
        <StatCard label="Failed logins" value="47" delta="-9" trend="down" icon={<KeyRound />} spark={spark(6)} />
      </div>

      <FilterBar searchPlaceholder="Search by IP, path, or status…" view="list" />

      <DataTable columns={columns} rows={ROWS} />
      <Pagination page={1} pageCount={24} total={236} pageSize={10} />
    </div>
  );
}
