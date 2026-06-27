import { ArrowRight, MoreHorizontal, Plus, Signpost } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { seeded } from "@/lib/mock";

type Row = {
  source: string;
  destination: string;
  type: "301" | "302";
  hits: number;
  status: string;
};

const PATHS: { from: string; to: string; type: "301" | "302" }[] = [
  { from: "/old-pricing", to: "/pricing", type: "301" },
  { from: "/blog/2024/launch", to: "/blog/launch", type: "301" },
  { from: "/promo", to: "/campaigns/summer", type: "302" },
  { from: "/team", to: "/about/team", type: "301" },
  { from: "/docs/v1", to: "/docs", type: "301" },
  { from: "/beta-signup", to: "/signup", type: "302" },
  { from: "/legacy-contact", to: "/contact", type: "301" },
  { from: "/help/old", to: "/help-center", type: "301" },
];

const ROWS: Row[] = PATHS.map((path, index) => ({
  source: path.from,
  destination: path.to,
  type: path.type,
  hits: Math.round(seeded(index + 4, 4200, 12)),
  status: "active",
}));

const columns: Column<Row>[] = [
  {
    key: "source",
    header: "Source",
    render: (row) => <span className="font-mono text-sm text-foreground">{row.source}</span>,
  },
  {
    key: "arrow",
    header: "",
    className: "w-8",
    render: () => <ArrowRight className="size-4 text-muted-foreground" />,
  },
  {
    key: "destination",
    header: "Destination",
    render: (row) => <span className="font-mono text-sm text-muted-foreground">{row.destination}</span>,
  },
  {
    key: "type",
    header: "Type",
    render: (row) =>
      row.type === "301" ? (
        <Badge variant="success">301</Badge>
      ) : (
        <Badge variant="info">302</Badge>
      ),
  },
  {
    key: "hits",
    header: "Hits",
    align: "right",
    render: (row) => <span className="text-sm tabular-nums">{row.hits.toLocaleString()}</span>,
  },
  { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  {
    key: "actions",
    header: "",
    align: "right",
    render: () => (
      <Button variant="ghost" size="icon-sm" aria-label="Row actions">
        <MoreHorizontal className="size-4" />
      </Button>
    ),
  },
];

export function RedirectsPage() {
  return (
    <div>
      <PageHeader
        title="Redirects"
        description="Route old URLs to new destinations and catch broken links."
        icon={<Signpost />}
        actions={
          <Button className="gap-1.5">
            <Plus className="size-4" /> Add redirect
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total redirects" value="142" delta="+8" trend="up" icon={<Signpost />} />
        <StatCard label="301 permanent" value="118" icon={<ArrowRight />} />
        <StatCard label="302 temporary" value="24" icon={<ArrowRight />} />
        <StatCard label="404s caught" value="36" delta="-12" trend="down" icon={<Signpost />} />
      </div>

      <Card className="mb-4 p-3">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center"
        >
          <Input placeholder="/old-path" className="font-mono sm:flex-1" />
          <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
          <Input placeholder="/new-path" className="font-mono sm:flex-1" />
          <Select defaultValue="301" className="sm:w-28">
            <option value="301">301</option>
            <option value="302">302</option>
          </Select>
          <Button type="submit" className="gap-1.5">
            <Plus className="size-4" /> Add
          </Button>
        </form>
      </Card>

      <DataTable columns={columns} rows={ROWS} selectable onRowClick={() => {}} />
      <Pagination page={1} pageCount={5} total={142} pageSize={12} />
    </div>
  );
}
