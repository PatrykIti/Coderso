import { CalendarDays, Download, Inbox, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PEOPLE, RELATIVE_TIMES, pick, spark } from "@/lib/mock";

const MESSAGES = [
  "Hi! I'd love to learn more about your enterprise pricing and onboarding options.",
  "Can someone help me migrate my existing site over to Coderso this week?",
  "Loved the demo — when does the Aom integration ship to production?",
  "We're a team of 12 and need SSO. Is that available on the Pro plan?",
  "Your checkout flow looks great. Do you support multi-currency billing?",
  "Quick question about custom domains and SSL certificate renewals.",
  "CONGRATULATIONS you have won a free prize, click here to claim now!!!",
  "Following up on my previous note about the partnership opportunity.",
];

type Row = {
  name: string;
  email: string;
  message: string;
  submitted: string;
  status: string;
};

const ROWS: Row[] = PEOPLE.map((person, index) => ({
  name: person.name,
  email: person.email,
  message: pick(MESSAGES, index),
  submitted: pick(RELATIVE_TIMES, index),
  status: pick(["new", "read", "read", "new", "read", "spam", "read", "new"], index),
}));

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <span className="flex items-center gap-2.5">
        <Avatar name={row.name} size="sm" />
        <span className="font-medium text-foreground">{row.name}</span>
      </span>
    ),
  },
  {
    key: "email",
    header: "Email",
    render: (row) => <span className="text-sm text-muted-foreground">{row.email}</span>,
  },
  {
    key: "message",
    header: "Message",
    render: (row) => (
      <span className="block max-w-xs truncate text-sm text-muted-foreground">{row.message}</span>
    ),
  },
  {
    key: "submitted",
    header: "Submitted",
    render: (row) => <span className="text-sm text-muted-foreground">{row.submitted}</span>,
  },
  { key: "status", header: "Status", align: "right", render: (row) => <StatusBadge status={row.status} /> },
];

export function FormSubmissionsPage() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Forms", to: "/advanced/forms" }, { label: "Contact form" }]}
        title="Submissions"
        description="Every response captured by your Contact form."
        actions={
          <Button variant="outline" className="gap-1.5">
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total" value="1,284" delta="+96" trend="up" icon={<Inbox />} spark={spark(2)} />
        <StatCard label="This week" value="96" delta="+12%" trend="up" icon={<CalendarDays />} spark={spark(6)} />
        <StatCard label="Spam blocked" value="42" trend="flat" icon={<ShieldAlert />} spark={spark(11)} />
      </div>

      <FilterBar searchPlaceholder="Search submissions…" view="list" />

      <DataTable columns={columns} rows={ROWS} selectable onRowClick={() => {}} />
      <Pagination page={1} pageCount={18} total={210} pageSize={12} />
    </div>
  );
}
