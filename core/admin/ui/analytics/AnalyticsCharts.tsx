import { AreaChart } from "@/ui/shared/Charts";
import { SectionCard } from "@/ui/shared/SectionCard";
import type { TopPageRow, TrafficBreakdownRow } from "@/services/analyticsClient";

export type TrendPoint = {
  date: string;
  value: number;
};

type AnalyticsChartsProps = {
  trend: TrendPoint[];
  topPages: TopPageRow[];
  sources: TrafficBreakdownRow[];
  devices: TrafficBreakdownRow[];
  referrers: TrafficBreakdownRow[];
};

const formatCount = (value: number) => value.toLocaleString("en-US");

const formatLabel = (trend: TrendPoint[], index: number) => {
  if (trend.length === 0) return "";
  const point = trend[Math.min(Math.max(index, 0), trend.length - 1)];
  return point?.date ?? "";
};

function BreakdownList({
  title,
  description,
  rows,
  emptyLabel,
}: {
  title: string;
  description: string;
  rows: TrafficBreakdownRow[];
  emptyLabel: string;
}) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.value), 0);
  return (
    <SectionCard title={title} description={description}>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.key} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="text-muted-foreground tabular-nums">{formatCount(row.value)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${max === 0 ? 0 : Math.round((row.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// TASK-483-05-L02: traffic charts bound to the REAL traffic overview series —
// daily pageview trend (area), top pages by views (not computeScore), and the
// sources / devices / referrers breakdown bars from the aggregation service.
export function AnalyticsCharts({
  trend,
  topPages,
  sources,
  devices,
  referrers,
}: AnalyticsChartsProps) {
  const maxViews = topPages.reduce((acc, page) => Math.max(acc, page.views), 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Traffic" description="Daily pageviews over the selected range">
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

        <SectionCard title="Top pages" description="Most-viewed pages in the selected range">
          {topPages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No page views yet. Publish content or widen the date range.
            </div>
          ) : (
            <div className="space-y-5">
              {topPages.map((page) => (
                <div key={page.path} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{page.path}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCount(page.views)} views
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${maxViews === 0 ? 0 : Math.round((page.views / maxViews) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownList
          title="Sources"
          description="How visitors reached your site"
          rows={sources}
          emptyLabel="No source data yet."
        />
        <BreakdownList
          title="Devices"
          description="Visitor device classes"
          rows={devices}
          emptyLabel="No device data yet."
        />
        <BreakdownList
          title="Referrers"
          description="Top referring hosts"
          rows={referrers}
          emptyLabel="No referrer data yet."
        />
      </div>
    </div>
  );
}
