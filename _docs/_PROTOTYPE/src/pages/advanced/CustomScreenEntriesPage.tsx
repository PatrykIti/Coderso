import { CheckCircle2, Clock, Inbox, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { PEOPLE, RELATIVE_TIMES, pick, spark } from "@/lib/mock";

const PRIORITY: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
  high: { variant: "destructive", label: "High" },
  med: { variant: "warning", label: "Medium" },
  low: { variant: "secondary", label: "Low" },
};

type Row = {
  subject: string;
  requester: string;
  priority: string;
  status: string;
  assignee: string;
  updated: string;
};

const SUBJECTS = [
  "Cannot reset my password",
  "Billing charged me twice",
  "Feature request: dark mode",
  "Export to CSV keeps failing",
  "Login redirect loop on mobile",
  "Question about the Pro plan",
  "Broken image on the homepage",
  "API rate limit increase",
];

const ROWS: Row[] = SUBJECTS.map((subject, index) => ({
  subject,
  requester: pick(PEOPLE, index).name,
  priority: pick(["high", "med", "low", "med", "high", "low", "med", "high"], index),
  status: pick(["open", "processing", "published", "open", "processing", "published"], index),
  assignee: pick(PEOPLE, index + 2).name,
  updated: pick(RELATIVE_TIMES, index),
}));

const columns: Column<Row>[] = [
  {
    key: "subject",
    header: "Subject",
    render: (row) => (
      <Link to="/advanced/custom-screens/sample/entries/1" className="block min-w-0">
        <span className="block truncate font-medium text-foreground">{row.subject}</span>
        <span className="block truncate text-xs text-muted-foreground">
          from {row.requester}
        </span>
      </Link>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    render: (row) => {
      const config = PRIORITY[row.priority];
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
  },
  { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  {
    key: "assignee",
    header: "Assignee",
    render: (row) => (
      <span className="flex items-center gap-2">
        <Avatar name={row.assignee} size="sm" />
        <span className="text-sm">{row.assignee.split(" ")[0]}</span>
      </span>
    ),
  },
  {
    key: "updated",
    header: "Updated",
    align: "right",
    render: (row) => <span className="text-sm text-muted-foreground">{row.updated}</span>,
  },
];

export function CustomScreenEntriesPage() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Screens", to: "/advanced/custom-screens" },
          { label: "Support tickets" },
        ]}
        title="Support tickets"
        description="Track and resolve incoming requests from your team."
        actions={
          <Link to="/advanced/custom-screens/sample/entries/1">
            <Button className="gap-1.5">
              <Plus className="size-4" /> New record
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open" value="18" delta="+4" trend="up" icon={<Inbox />} spark={spark(4)} />
        <StatCard label="In progress" value="7" delta="-2" trend="down" icon={<Clock />} spark={spark(9)} />
        <StatCard label="Resolved" value="126" delta="+11" trend="up" icon={<CheckCircle2 />} spark={spark(13)} />
      </div>

      <FilterBar searchPlaceholder="Search tickets…" view="list" />

      <DataTable columns={columns} rows={ROWS} selectable onRowClick={() => {}} />
      <Pagination page={1} pageCount={9} total={104} pageSize={12} />
    </div>
  );
}
