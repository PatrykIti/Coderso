import { CalendarDays, Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  exportTopPages,
  getCachedTopPages,
  getCachedTrafficOverview,
  getTopPagesCached,
  getTrafficOverviewCached,
  type TopPageRow,
  type TrafficOverview,
} from "@/services/analyticsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { AnalyticsCharts } from "./AnalyticsCharts";
import { KpiCards, type KpiCard, type KpiCardId } from "./KpiCards";
import { TopPagesTable, type TopPageTableRow } from "./TopPagesTable";
import { TopPagesDrawer } from "./TopPagesDrawer";

const TOP_PAGES_LIMIT = 50;

const resolveRangeDays = (value: string) => {
  if (value === "ytd") return 365;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return parsed;
};

const createInitialAnalyticsState = () => {
  const overview = getCachedTrafficOverview(30);
  const topPages = getCachedTopPages({ rangeDays: 30, limit: TOP_PAGES_LIMIT });
  return {
    overview,
    topPages: topPages ?? [],
    isLoading: !(overview && topPages),
  };
};

const calcChange = (current: number, previous: number) => {
  if (current === 0 && previous === 0) {
    return { change: "No activity in range", trend: "neutral" as const };
  }
  if (previous === 0) {
    return { change: "New", trend: "up" as const };
  }
  const delta = ((current - previous) / previous) * 100;
  return {
    change: `${Math.abs(Math.round(delta))}%`,
    trend: delta >= 0 ? ("up" as const) : ("down" as const),
  };
};

const buildCountKpi = (
  id: KpiCardId,
  label: string,
  current: number,
  previous: number
): KpiCard => {
  const change = calcChange(current, previous);
  return {
    id,
    label,
    value: current.toLocaleString("en-US"),
    change: change.change,
    trend: change.trend,
  };
};

const buildRateKpi = (id: KpiCardId, label: string, current: number, previous: number): KpiCard => {
  const change = calcChange(current, previous);
  return {
    id,
    label,
    value: `${Math.round(current * 100)}%`,
    change: change.change,
    trend: change.trend,
  };
};

export function buildTrafficKpiCards(overview: TrafficOverview | null): KpiCard[] {
  if (!overview) return [];
  return [
    buildCountKpi(
      "visitors",
      "Unique Visitors",
      overview.totals.visitors,
      overview.previous.visitors
    ),
    buildCountKpi("pageviews", "Pageviews", overview.totals.pageviews, overview.previous.pageviews),
    buildCountKpi("sessions", "Sessions", overview.totals.sessions, overview.previous.sessions),
    buildRateKpi("bounce", "Bounce Rate", overview.totals.bounceRate, overview.previous.bounceRate),
  ];
}

export function AnalyticsPage() {
  const [initialState] = useState(createInitialAnalyticsState);
  const [topPagesOpen, setTopPagesOpen] = useState(false);
  const [rangeValue, setRangeValue] = useState("30");
  const [overview, setOverview] = useState<TrafficOverview | null>(initialState.overview);
  const [topPages, setTopPages] = useState<TopPageRow[]>(initialState.topPages);
  const [isLoading, setIsLoading] = useState(initialState.isLoading);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeDays = useMemo(() => resolveRangeDays(rangeValue), [rangeValue]);

  useEffect(() => {
    let active = true;
    const cachedOverview = getCachedTrafficOverview(rangeDays);
    const cachedTopPages = getCachedTopPages({ rangeDays, limit: TOP_PAGES_LIMIT });
    Promise.all([
      getTrafficOverviewCached(rangeDays, { force: !cachedOverview }),
      getTopPagesCached({
        rangeDays,
        limit: TOP_PAGES_LIMIT,
        force: !cachedTopPages,
      }),
    ])
      .then(([nextOverview, nextTopPages]) => {
        if (!active) return;
        setError(null);
        setOverview(nextOverview);
        setTopPages(nextTopPages);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setOverview(null);
        setTopPages([]);
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load analytics data.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [rangeDays]);

  // Refresh pulls fresh numbers on demand: `force: true` bypasses the 5-minute
  // SPA cache and refetches only the data (overview + top pages) — the page shell
  // stays mounted. This is a user event handler, not an effect, so the state
  // updates here are outside the effect body.
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    Promise.all([
      getTrafficOverviewCached(rangeDays, { force: true }),
      getTopPagesCached({ rangeDays, limit: TOP_PAGES_LIMIT, force: true }),
    ])
      .then(([nextOverview, nextTopPages]) => {
        setError(null);
        setOverview(nextOverview);
        setTopPages(nextTopPages);
      })
      .catch((err: unknown) => {
        setOverview(null);
        setTopPages([]);
        setError(isApiClientError(err) ? err.message : "Failed to load analytics data.");
      })
      .finally(() => setIsRefreshing(false));
  }, [rangeDays]);

  const metrics = useMemo(() => buildTrafficKpiCards(overview), [overview]);

  const tableRows = useMemo(
    (): TopPageTableRow[] =>
      topPages.slice(0, 12).map((page) => ({
        path: page.path,
        views: page.views,
        visitors: page.visitors,
      })),
    [topPages]
  );

  const drawerRows = useMemo(
    (): TopPageTableRow[] =>
      topPages.map((page) => ({
        path: page.path,
        views: page.views,
        visitors: page.visitors,
      })),
    [topPages]
  );

  const handleExportTopPages = useCallback(
    () => exportTopPages({ limit: TOP_PAGES_LIMIT, rangeDays }),
    [rangeDays]
  );

  return (
    <AdminShell
      activeHref="/admin/analytics"
      showSearch={false}
      breadcrumbs={["Admin", "Analytics"]}
      topbarActions={
        <Select
          value={rangeValue}
          onValueChange={(nextValue) => {
            setError(null);
            setRangeValue(nextValue);
            const nextRangeDays = resolveRangeDays(nextValue);
            const cachedOverview = getCachedTrafficOverview(nextRangeDays);
            const cachedTopPages = getCachedTopPages({
              rangeDays: nextRangeDays,
              limit: TOP_PAGES_LIMIT,
            });
            setOverview(cachedOverview ?? null);
            setTopPages(cachedTopPages ?? []);
            setIsLoading(!(cachedOverview && cachedTopPages));
          }}
        >
          <SelectTrigger className="h-9">
            <CalendarDays className="h-4 w-4" />
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Analytics Overview"
          description="Understand how visitors move through your site."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
              >
                <RefreshCw className={`size-4${isRefreshing ? " animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={handleExportTopPages}>
                <Download className="size-4" />
                Export
              </Button>
            </div>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Analytics unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {isLoading ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Loading analytics...
          </div>
        ) : (
          <>
            <KpiCards items={metrics} />
            <AnalyticsCharts
              trend={overview?.trend ?? []}
              topPages={overview?.topPages ?? []}
              sources={overview?.sources ?? []}
              devices={overview?.devices ?? []}
              referrers={overview?.referrers ?? []}
            />
            <TopPagesTable items={tableRows} onViewAll={() => setTopPagesOpen(true)} />
          </>
        )}
      </div>
      <TopPagesDrawer
        open={topPagesOpen}
        onOpenChange={setTopPagesOpen}
        items={drawerRows}
        onExport={handleExportTopPages}
      />
    </AdminShell>
  );
}
