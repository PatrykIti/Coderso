import { AreaChart } from "@/ui/shared/Charts";
import { SectionCard } from "@/ui/shared/SectionCard";

export type TrendPoint = {
  date: string;
  value: number;
};

export type TopPageItem = {
  id: string;
  path: string;
  score: number;
};

type AnalyticsChartsProps = {
  trend: TrendPoint[];
  topPages: TopPageItem[];
};

const formatScore = (score: number) => `${score}%`;

const formatLabel = (trend: TrendPoint[], index: number) => {
  if (trend.length === 0) return "";
  const point = trend[Math.min(Math.max(index, 0), trend.length - 1)];
  return point?.date ?? "";
};

// TASK-479-26-L03: traffic (area) + top-pages cards ported to the shared
// SectionCard + pure-SVG Charts. Both bind only to the REAL series the page
// already passes (overview.trend / derived topPages); the prototype's
// sessions/new-visitor summary, Sources donut, and Devices bars are dropped for
// lack of backing fields.
export function AnalyticsCharts({ trend, topPages }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Traffic" description="New content created over time">
        {trend.length === 0 ? (
          <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            No traffic data yet. Publish content or widen the date range.
          </div>
        ) : (
          <>
            <AreaChart data={trend.map((point) => point.value)} tone="primary" />
            <div className="mt-2 flex justify-between px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <span>{formatLabel(trend, 0)}</span>
              <span>{formatLabel(trend, Math.floor(trend.length / 2))}</span>
              <span>{formatLabel(trend, trend.length - 1)}</span>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Top pages" description="Highest activity items in the selected range">
        {topPages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No content activity yet. Publish content or widen the date range.
          </div>
        ) : (
          <div className="space-y-5">
            {topPages.map((page) => (
              <div key={page.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{page.path}</span>
                  <span className="text-muted-foreground">{formatScore(page.score)} score</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${page.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
