import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

const buildPath = (trend: TrendPoint[]) => {
  if (trend.length === 0) return "";
  const max = Math.max(...trend.map((point) => point.value), 1);
  return trend
    .map((point, index) => {
      const x = trend.length === 1 ? 0 : (index / (trend.length - 1)) * 1000;
      const y = 90 - (point.value / max) * 80;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
};

const formatLabel = (trend: TrendPoint[], index: number) => {
  if (trend.length === 0) return "";
  const point = trend[Math.min(Math.max(index, 0), trend.length - 1)];
  return point?.date ?? "";
};

export function AnalyticsCharts({ trend, topPages }: AnalyticsChartsProps) {
  const linePath = buildPath(trend);
  const fadedPath = buildPath(
    trend.map((point) => ({ ...point, value: Math.max(0, point.value - 2) }))
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">Content Activity</CardTitle>
            <CardDescription>New content created over time</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Current period
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-muted" />
              Previous period
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative h-64 rounded-xl border border-border/60 bg-[radial-gradient(circle_at_1px_1px,_rgba(148,163,184,0.35),_transparent_0)] bg-[size:24px_24px] dark:bg-[radial-gradient(circle_at_1px_1px,_rgba(51,65,85,0.45),_transparent_0)]">
            <svg
              className="absolute inset-0 h-full w-full px-4 pb-8 pt-10"
              preserveAspectRatio="none"
              viewBox="0 0 1000 100"
              aria-hidden="true"
            >
              {fadedPath ? (
                <path
                  className="text-muted-foreground/30"
                  d={fadedPath}
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="4"
                  strokeWidth="2"
                />
              ) : null}
              {linePath ? (
                <path
                  className="text-emerald-500"
                  d={linePath}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
              ) : null}
            </svg>
            <div className="absolute bottom-2 inset-x-0 flex justify-between px-6 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <span>{formatLabel(trend, 0)}</span>
              <span>{formatLabel(trend, Math.floor(trend.length / 2))}</span>
              <span>{formatLabel(trend, trend.length - 1)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Top Performing Content</CardTitle>
          <CardDescription>Highest activity items in the selected range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {topPages.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No content activity yet. Publish content or widen the date range.
            </div>
          ) : (
            topPages.map((page) => (
              <div key={page.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{page.path}</span>
                  <span className="text-muted-foreground">{formatScore(page.score)} score</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={cn("h-full rounded-full bg-emerald-500")}
                    style={{ width: `${page.score}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
