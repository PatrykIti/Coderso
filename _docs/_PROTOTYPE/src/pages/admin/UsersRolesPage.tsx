import { MailPlus, MoreHorizontal, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { PEOPLE, RELATIVE_TIMES, pick, spark } from "@/lib/mock";

type Row = {
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  twoFactor: boolean;
};

const ROWS: Row[] = PEOPLE.map((person, index) => ({
  name: person.name,
  email: person.email,
  role: person.role,
  status: pick(["active", "active", "active", "pending", "active"], index),
  lastActive: pick(RELATIVE_TIMES, index),
  twoFactor: index % 3 !== 1,
}));

const columns: Column<Row>[] = [
  {
    key: "user",
    header: "User",
    render: (row) => (
      <span className="flex items-center gap-3">
        <Avatar name={row.name} size="md" />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{row.email}</span>
        </span>
      </span>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (row) => <Badge variant="soft">{row.role}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "lastActive",
    header: "Last active",
    render: (row) => <span className="text-sm text-muted-foreground">{row.lastActive}</span>,
  },
  {
    key: "twoFactor",
    header: "2FA",
    render: (row) =>
      row.twoFactor ? (
        <Badge variant="success" className="gap-1">
          <ShieldCheck className="size-3" /> Enabled
        </Badge>
      ) : (
        <Badge variant="secondary">Off</Badge>
      ),
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

export function UsersRolesPage() {
  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage who has access to your workspace and what they can do."
        icon={<Users />}
        actions={
          <Button className="gap-1.5">
            <UserPlus className="size-4" /> Invite user
          </Button>
        }
      />

      <div className="mb-4">
        <Tabs
          variant="underline"
          items={[
            { value: "members", label: "Members", count: 8 },
            { value: "invitations", label: "Invitations", count: 3 },
          ]}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value="24" delta="+4" trend="up" icon={<Users />} spark={spark(3)} />
        <StatCard label="Active" value="21" delta="+2" trend="up" icon={<UserCheck />} spark={spark(8)} />
        <StatCard label="Pending invites" value="3" hint="awaiting response" icon={<MailPlus />} />
      </div>

      <FilterBar searchPlaceholder="Search people…" view="list" />

      <DataTable columns={columns} rows={ROWS} selectable onRowClick={() => {}} />
      <Pagination page={1} pageCount={3} total={24} pageSize={8} />
    </div>
  );
}
