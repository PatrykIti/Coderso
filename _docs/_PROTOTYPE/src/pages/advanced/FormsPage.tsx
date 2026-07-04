import { ArrowUpRight, ClipboardList, Inbox, MoreHorizontal, Percent, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { RELATIVE_TIMES, pick, spark } from "@/lib/mock";

type Row = {
  name: string;
  fields: number;
  submissions: number;
  status: string;
  last: string;
};

const FORMS = [
  { name: "Contact", fields: 5, submissions: 1284, status: "active" },
  { name: "Newsletter", fields: 2, submissions: 4921, status: "active" },
  { name: "Demo request", fields: 8, submissions: 612, status: "active" },
  { name: "Support", fields: 6, submissions: 873, status: "active" },
  { name: "Job application", fields: 11, submissions: 209, status: "draft" },
  { name: "Event RSVP", fields: 4, submissions: 358, status: "draft" },
];

const ROWS: Row[] = FORMS.map((form, index) => ({
  name: form.name,
  fields: form.fields,
  submissions: form.submissions,
  status: form.status,
  last: pick(RELATIVE_TIMES, index),
}));

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <Link to="/advanced/forms/sample" className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
          <ClipboardList className="size-4" />
        </span>
        <span className="font-medium text-foreground">{row.name}</span>
      </Link>
    ),
  },
  {
    key: "fields",
    header: "Fields",
    align: "right",
    render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{row.fields}</span>,
  },
  {
    key: "submissions",
    header: "Submissions",
    align: "right",
    render: (row) => <span className="text-sm font-medium tabular-nums">{row.submissions.toLocaleString()}</span>,
  },
  { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  {
    key: "last",
    header: "Last submission",
    render: (row) => <span className="text-sm text-muted-foreground">{row.last}</span>,
  },
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

export function FormsPage() {
  return (
    <div>
      <PageHeader
        title="Forms"
        description="Collect submissions and route them anywhere."
        icon={<ClipboardList />}
        actions={
          <Link to="/advanced/forms/sample">
            <Button className="gap-1.5">
              <Plus className="size-4" /> New form
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total forms" value="14" icon={<ClipboardList />} hint="6 active" />
        <StatCard
          label="Submissions this month"
          value="3,142"
          delta="+18.2%"
          trend="up"
          icon={<Inbox />}
          spark={spark(8)}
        />
        <StatCard label="Avg. conversion" value="4.7%" delta="+0.6%" trend="up" icon={<Percent />} />
      </div>

      <div className="mt-4">
        <DataTable columns={columns} rows={ROWS} selectable onRowClick={() => {}} />
      </div>

      <div className="mt-4 flex justify-end">
        <Link to="/advanced/forms/sample/submissions">
          <Button variant="ghost" size="sm" className="gap-1">
            Recent submissions <ArrowUpRight className="size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
