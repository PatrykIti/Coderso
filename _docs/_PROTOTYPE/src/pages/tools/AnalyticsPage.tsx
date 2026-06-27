import { Clock, Download, Eye, MousePointerClick, Users } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { SectionCard } from "@/components/patterns/SectionCard";
import { AreaChart, BarChart, Donut } from "@/components/patterns/charts";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { PAGE_TITLES, seeded, spark } from "@/lib/mock";

type Row = {
  page: string;
  slug: string;
  views: string;
  unique: string;
  bounce: string;
  avg: string;
};

const slug = (title: string) => `/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

const ROWS: Row[] = PAGE_TITLES.slice(0, 6).map((title, index) => ({
  page: title,
  slug: slug(title),
  views: Math.round(seeded(index + 2, 24000, 2000)).toLocaleString(),
  unique: Math.round(seeded(index + 5, 18000, 1500)).toLocaleString(),
  bounce: `${Math.round(seeded(index + 8, 62, 24))}%`,
  avg: `${Math.round(seeded(index + 11, 4, 1))}m ${Math.round(seeded(index + 13, 59, 4))}s`,
}));

const SOURCES = [
  { label: "Organic", value: 48, color: "var(--primary)", dot: "bg-primary" },
  { label: "Direct", value: 26, color: "var(--info)", dot: "bg-info" },
  { label: "Social", value: 18, color: "var(--success)", dot: "bg-success" },
  { label: "Referral", value: 8, color: "var(--warning)", dot: "bg-warning" },
];

const DEVICES = [
  { label: "Desktop", value: 62, tone: "primary" as const },
  { label: "Mobile", value: 31, tone: "info" as const },
  { label: "Tablet", value: 7, tone: "success" as const },
];

const columns: Column<Row>[] = [
  {
    key: "page",
    header: "Page",
    render: (row) => (
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{row.page}</span>
        <span className="block truncate font-mono text-xs text-muted-foreground">{row.slug}</span>
      </span>
    ),
  },
  { key: "views", header: "Views", align: "right", render: (row) => <span className="text-sm tabular-nums">{row.views}</span> },
  { key: "unique", header: "Unique", align: "right", render: (row) => <span className="text-sm tabular-nums">{row.unique}</span> },
  {
    key: "bounce",
    header: "Bounce",
    align: "right",
    render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{row.bounce}</span>,
  },
  {
    key: "avg",
    header: "Avg. time",
    align: "right",
    render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{row.avg}</span>,
  },
];

export function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Understand how visitors move through your site."
        actions={
          <>
            <Select defaultValue="30d" className="w-40">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </Select>
            <Button variant="outline" className="gap-1.5">
              <Download className="size-4" /> Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visitors" value="48,271" delta="+12.4%" trend="up" icon={<Users />} spark={spark(2)} />
        <StatCard label="Pageviews" value="129k" delta="+8.1%" trend="up" icon={<Eye />} spark={spark(7)} />
        <StatCard label="Avg. time" value="3m 12s" delta="+5.0%" trend="up" icon={<Clock />} spark={spark(4)} />
        <StatCard label="Bounce rate" value="32.8%" delta="-2.3%" trend="down" icon={<MousePointerClick />} spark={spark(9)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Traffic" description="Visitors over the last 30 days">
          <AreaChart data={[42, 55, 48, 70, 64, 82, 76, 95, 88, 104, 99, 120, 112, 134]} />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-sm">
            <div>
              <div className="text-muted-foreground">Sessions</div>
              <div className="font-display text-lg font-semibold">61,420</div>
            </div>
            <div>
              <div className="text-muted-foreground">New visitors</div>
              <div className="font-display text-lg font-semibold">64%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Pages / session</div>
              <div className="font-display text-lg font-semibold">2.7</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Sources" description="Where traffic comes from">
          <div className="flex flex-col items-center">
            <div className="relative">
              <Donut segments={SOURCES} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-semibold">48k</span>
                <span className="text-xs text-muted-foreground">visits</span>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-2 text-sm">
              {SOURCES.map((source) => (
                <div key={source.label} className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${source.dot}`} />
                  <span className="text-muted-foreground">{source.label}</span>
                  <span className="ml-auto font-medium">{source.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Top pages" description="Views by page">
          <BarChart
            data={[134, 112, 98, 76, 64, 52]}
            labels={["Home", "Pricing", "Blog", "About", "Docs", "Careers"]}
          />
        </SectionCard>

        <SectionCard title="Devices" description="Sessions by device type">
          <div className="flex flex-col gap-4 py-1">
            {DEVICES.map((device) => (
              <div key={device.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{device.label}</span>
                  <span className="font-medium tabular-nums">{device.value}%</span>
                </div>
                <Progress value={device.value} tone={device.tone === "info" ? "primary" : device.tone} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-[15px] font-semibold">Top pages</h2>
        <DataTable columns={columns} rows={ROWS} />
      </div>
    </div>
  );
}
