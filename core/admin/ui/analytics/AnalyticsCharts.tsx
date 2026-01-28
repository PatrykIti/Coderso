import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TopPage = {
  id: string;
  path: string;
  views: string;
  percent: number;
  barClassName: string;
};

const topPages: TopPage[] = [
  {
    id: "modern-ui",
    path: "/blog/modern-ui-trends",
    views: "12,402",
    percent: 85,
    barClassName: "bg-emerald-500",
  },
  {
    id: "analytics-dashboard",
    path: "/features/analytics-dashboard",
    views: "9,821",
    percent: 65,
    barClassName: "bg-emerald-500/80",
  },
  {
    id: "docs",
    path: "/docs/getting-started",
    views: "7,240",
    percent: 45,
    barClassName: "bg-emerald-500/60",
  },
  {
    id: "pricing",
    path: "/pricing",
    views: "5,112",
    percent: 30,
    barClassName: "bg-emerald-500/40",
  },
];

export function AnalyticsCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">Traffic Trends</CardTitle>
            <CardDescription>Daily visitor movement over time</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              This period
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-muted" />
              Previous
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
              <path
                className="text-muted-foreground/30"
                d="M0,80 L100,75 L200,85 L300,70 L400,75 L500,60 L600,65 L700,55 L800,60 L900,45 L1000,50"
                fill="none"
                stroke="currentColor"
                strokeDasharray="4"
                strokeWidth="2"
              />
              <path
                className="text-emerald-500"
                d="M0,85 L100,70 L200,60 L300,65 L400,50 L500,45 L600,30 L700,25 L800,35 L900,15 L1000,10"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            </svg>
            <div className="absolute bottom-2 inset-x-0 flex justify-between px-6 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <span>Jun 01</span>
              <span>Jun 10</span>
              <span>Jun 20</span>
              <span>Jun 30</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Top Performing Pages</CardTitle>
          <CardDescription>Highest traffic destinations this period</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {topPages.map((page) => (
            <div key={page.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{page.path}</span>
                <span className="text-muted-foreground">{page.views} views</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn("h-full rounded-full", page.barClassName)}
                  style={{ width: `${page.percent}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
