import { AlertTriangle, Plus, ShieldCheck } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DATES, PEOPLE, pick } from "@/lib/mock";

type Row = {
  cidr: string;
  label: string;
  addedBy: string;
  addedOn: string;
};

const ROWS: Row[] = [
  { cidr: "203.0.113.24/32", label: "Office — Warsaw" },
  { cidr: "198.51.100.0/24", label: "VPN gateway" },
  { cidr: "192.0.2.55/32", label: "Patryk — home" },
  { cidr: "203.0.113.0/27", label: "Staging cluster" },
  { cidr: "198.51.100.77/32", label: "On-call laptop" },
].map((row, index) => ({
  ...row,
  addedBy: pick(PEOPLE, index).name,
  addedOn: pick(DATES, index),
}));

const columns: Column<Row>[] = [
  {
    key: "cidr",
    header: "IP / CIDR",
    render: (row) => <span className="font-mono text-sm text-foreground">{row.cidr}</span>,
  },
  {
    key: "label",
    header: "Label",
    render: (row) => <span className="text-sm">{row.label}</span>,
  },
  {
    key: "addedBy",
    header: "Added by",
    render: (row) => <span className="text-sm text-muted-foreground">{row.addedBy}</span>,
  },
  {
    key: "addedOn",
    header: "Added on",
    render: (row) => <span className="text-sm text-muted-foreground">{row.addedOn}</span>,
  },
  {
    key: "actions",
    header: "",
    align: "right",
    render: () => (
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
        Remove
      </Button>
    ),
  },
];

export function IpAllowlistPage() {
  return (
    <SettingsLayout
      title="IP allowlist"
      description="Restrict admin access to trusted IPs."
      saveBar={false}
    >
      <div className="flex flex-col gap-5">
        <Card className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <div className="text-sm font-medium">Enable allowlist</div>
              <div className="text-sm text-muted-foreground">
                Only requests from listed addresses can reach the admin.
              </div>
            </div>
          </div>
          <Switch defaultChecked />
        </Card>

        <div className="flex items-start gap-3 rounded-2xl bg-warning-soft px-4 py-3.5 text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            Enabling the allowlist may lock you out if your current address isn&rsquo;t listed. Add
            your IP before turning this on.
          </p>
        </div>

        <Card className="p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="cidr" className="text-sm font-medium">
                IP or CIDR range
              </label>
              <Input id="cidr" placeholder="203.0.113.24/32" className="font-mono" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="label" className="text-sm font-medium">
                Label
              </label>
              <Input id="label" placeholder="Office — Warsaw" />
            </div>
            <Button type="submit" className="gap-1.5">
              <Plus className="size-4" /> Add
            </Button>
          </form>
        </Card>

        <DataTable columns={columns} rows={ROWS} />
      </div>
    </SettingsLayout>
  );
}
