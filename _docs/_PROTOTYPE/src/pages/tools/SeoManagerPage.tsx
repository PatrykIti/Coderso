import { AlertTriangle, FileText, Globe, Gauge, ScanLine } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/lib/router";
import { PAGE_TITLES, pick, seeded } from "@/lib/mock";

type Tone = "primary" | "success" | "warning" | "destructive";

type Row = {
  title: string;
  slug: string;
  score: number;
  titleLength: "ok" | "warning";
  meta: "good" | "missing";
  issues: number;
};

const slug = (title: string) => `/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

const ROWS: Row[] = PAGE_TITLES.map((title, index) => ({
  title,
  slug: slug(title),
  score: Math.round(seeded(index + 3, 98, 52)),
  titleLength: pick(["ok", "ok", "warning"], index) as Row["titleLength"],
  meta: pick(["good", "good", "missing"], index) as Row["meta"],
  issues: Math.round(seeded(index + 9, 6, 0)),
}));

const scoreTextTone = (score: number) =>
  score >= 85 ? "text-success" : score >= 65 ? "text-warning" : "text-destructive";

const scoreTone = (score: number): Tone =>
  score >= 85 ? "success" : score >= 65 ? "warning" : "destructive";

const columns: Column<Row>[] = [
  {
    key: "title",
    header: "Page",
    render: (row) => (
      <Link to="/tools/seo" className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileText className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.title}</span>
          <span className="block truncate font-mono text-xs text-muted-foreground">{row.slug}</span>
        </span>
      </Link>
    ),
  },
  {
    key: "score",
    header: "Score",
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <span className={`w-7 text-sm font-semibold tabular-nums ${scoreTextTone(row.score)}`}>{row.score}</span>
        <Progress value={row.score} tone={scoreTone(row.score)} className="w-20" />
      </div>
    ),
  },
  {
    key: "titleLength",
    header: "Title length",
    render: (row) =>
      row.titleLength === "ok" ? (
        <Badge variant="success">Good</Badge>
      ) : (
        <Badge variant="warning">Too long</Badge>
      ),
  },
  {
    key: "meta",
    header: "Meta description",
    render: (row) =>
      row.meta === "good" ? (
        <Badge variant="success">Good</Badge>
      ) : (
        <Badge variant="destructive">Missing</Badge>
      ),
  },
  {
    key: "issues",
    header: "Issues",
    align: "right",
    render: (row) => (
      <span
        className={`text-sm font-medium tabular-nums ${row.issues > 0 ? "text-foreground" : "text-muted-foreground"}`}
      >
        {row.issues}
      </span>
    ),
  },
];

export function SeoManagerPage() {
  return (
    <div>
      <PageHeader
        title="SEO manager"
        description="Monitor search performance and fix on-page issues across your site."
        icon={<Gauge />}
        actions={
          <Button className="gap-1.5">
            <ScanLine className="size-4" /> Run audit
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Avg. score" value="78/100" delta="+4" trend="up" icon={<Gauge />} hint="vs last week" />
        <StatCard label="Issues" value="23" delta="-6" trend="down" icon={<AlertTriangle />} />
        <StatCard label="Indexed pages" value="84" delta="+2" trend="up" icon={<Globe />} />
        <StatCard label="Warnings" value="11" delta="+1" trend="flat" icon={<AlertTriangle />} />
      </div>

      <FilterBar searchPlaceholder="Search pages…" view="list" />

      <DataTable columns={columns} rows={ROWS} onRowClick={() => {}} />
      <Pagination page={1} pageCount={4} total={42} pageSize={12} />
    </div>
  );
}
