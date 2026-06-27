import { Calendar, Database, Download, HardDrive, Plus, RotateCcw, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Row = {
  date: string;
  time: string;
  size: string;
  type: "Auto" | "Manual";
  status: string;
};

const ROWS: Row[] = [
  { date: "Jun 27, 2026", time: "03:00", size: "248 MB", type: "Auto", status: "completed" },
  { date: "Jun 26, 2026", time: "03:00", size: "246 MB", type: "Auto", status: "completed" },
  { date: "Jun 25, 2026", time: "14:12", size: "251 MB", type: "Manual", status: "completed" },
  { date: "Jun 25, 2026", time: "03:00", size: "245 MB", type: "Auto", status: "completed" },
  { date: "Jun 24, 2026", time: "03:00", size: "—", type: "Auto", status: "failed" },
  { date: "Jun 23, 2026", time: "03:00", size: "243 MB", type: "Auto", status: "completed" },
];

const columns: Column<Row>[] = [
  {
    key: "date",
    header: "Backup",
    render: (row) => (
      <span className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Calendar className="size-4" />
        </span>
        <span className="text-sm font-medium text-foreground">
          {row.date} · {row.time}
        </span>
      </span>
    ),
  },
  {
    key: "size",
    header: "Size",
    render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{row.size}</span>,
  },
  {
    key: "type",
    header: "Type",
    render: (row) =>
      row.type === "Auto" ? (
        <Badge variant="secondary">Auto</Badge>
      ) : (
        <Badge variant="soft">Manual</Badge>
      ),
  },
  { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  {
    key: "actions",
    header: "",
    align: "right",
    render: () => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <RotateCcw className="size-4" /> Restore
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Download backup">
          <Download className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Delete backup" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </div>
    ),
  },
];

export function BackupsPage() {
  return (
    <div>
      <PageHeader
        title="Backups"
        description="Keep automatic snapshots of your content and restore in one click."
        icon={<Database />}
        actions={
          <Button className="gap-1.5">
            <Plus className="size-4" /> Create backup
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Automatic backups" icon={<Database />}>
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div className="text-sm font-medium">Enable automatic backups</div>
              <div className="text-sm text-muted-foreground">Snapshots run on a recurring schedule.</div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Frequency</label>
              <Select defaultValue="daily">
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Retention</label>
              <Select defaultValue="30">
                <option value="7">Keep 7 days</option>
                <option value="30">Keep 30 days</option>
                <option value="90">Keep 90 days</option>
              </Select>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Next backup scheduled for <span className="font-medium text-foreground">Jun 28, 2026 · 03:00</span>.
          </p>
        </SectionCard>

        <SectionCard title="Storage usage" icon={<HardDrive />}>
          <div className="flex items-end justify-between">
            <div className="font-display text-3xl font-semibold tracking-tight">6.2 GB</div>
            <div className="text-sm text-muted-foreground">of 20 GB</div>
          </div>
          <Progress value={31} className="mt-3" />
          <p className="mt-3 text-sm text-muted-foreground">
            18 backups stored · oldest from May 30, 2026.
          </p>
        </SectionCard>
      </div>

      <DataTable columns={columns} rows={ROWS} />
    </div>
  );
}
