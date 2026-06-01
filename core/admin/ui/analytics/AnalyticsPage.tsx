import { CalendarDays } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isApiClientError } from "@/services/apiClient";
import {
  exportTopContent,
  getOverview,
  getTopContent,
  type AnalyticsOverview,
  type TopContentItem,
} from "@/services/analyticsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { AnalyticsCharts } from "./AnalyticsCharts";
import { KpiCards, type KpiCard } from "./KpiCards";
import { TopContentTable, type TopContentRow } from "./TopContentTable";
import { TopContentDrawer } from "./TopContentDrawer";

type AnalyticsMetricKey = "publishedPages" | "entries" | "media";

const metricLabels: Record<AnalyticsMetricKey, string> = {
  publishedPages: "Published Pages",
  entries: "Content Entries",
  media: "Media Items",
};

const formatMetricValue = (value: number) => (value === 0 ? "-" : value.toLocaleString("en-US"));

const calcChange = (input: { total: number; current: number; previous: number }) => {
  if (input.total === 0) {
    return { change: "No data yet", trend: "neutral" as const };
  }
  if (input.current === 0 && input.previous === 0) {
    return { change: "No activity in range", trend: "neutral" as const };
  }
  if (input.previous === 0) {
    return { change: "New", trend: "up" as const };
  }
  const delta = ((input.current - input.previous) / input.previous) * 100;
  return {
    change: `${Math.abs(Math.round(delta))}%`,
    trend: delta >= 0 ? ("up" as const) : ("down" as const),
  };
};

export function buildAnalyticsKpiCards(overview: AnalyticsOverview | null): KpiCard[] {
  if (!overview) return [];
  const keys: AnalyticsMetricKey[] = ["publishedPages", "entries", "media"];
  return keys.map((key) => {
    const change = calcChange({
      total: overview.totals[key],
      current: overview.current[key],
      previous: overview.previous[key],
    });
    return {
      id: key,
      label: metricLabels[key],
      value: formatMetricValue(overview.totals[key]),
      change: change.change,
      trend: change.trend,
    };
  });
}

export function AnalyticsPage() {
  const [topContentOpen, setTopContentOpen] = useState(false);
  const [rangeValue, setRangeValue] = useState("30");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topContent, setTopContent] = useState<TopContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeDays = useMemo(() => {
    if (rangeValue === "ytd") return 365;
    const parsed = Number(rangeValue);
    if (!Number.isFinite(parsed)) return 30;
    return parsed;
  }, [rangeValue]);

  useEffect(() => {
    let active = true;
    Promise.all([getOverview(rangeDays), getTopContent({ limit: 50, rangeDays })])
      .then(([nextOverview, nextTop]) => {
        if (!active) return;
        setError(null);
        setOverview(nextOverview);
        setTopContent(nextTop);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setOverview(null);
        setTopContent([]);
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

  const metrics = useMemo(() => buildAnalyticsKpiCards(overview), [overview]);

  const topRows = useMemo((): TopContentRow[] => {
    return topContent.map((item) => ({
      id: item.id,
      title: item.title,
      path: item.slug ? (item.slug.startsWith("/") ? item.slug : `/${item.slug}`) : "/",
      score: item.score,
      updatedAt: item.updatedAt,
      type: item.type,
    }));
  }, [topContent]);

  const tableRows = useMemo(() => topRows.slice(0, 12), [topRows]);

  const topPages = useMemo(
    () =>
      topRows.slice(0, 4).map((row) => ({
        id: row.id,
        path: row.path,
        score: row.score,
      })),
    [topRows]
  );

  const handleExportTopContent = useCallback(
    () => exportTopContent({ limit: 50, rangeDays }),
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
            setIsLoading(true);
            setError(null);
            setOverview(null);
            setTopContent([]);
            setRangeValue(nextValue);
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
          description="Monitor traffic, conversions, and content performance."
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
            <AnalyticsCharts trend={overview?.trend ?? []} topPages={topPages} />
            <TopContentTable items={tableRows} onViewAll={() => setTopContentOpen(true)} />
          </>
        )}
      </div>
      <TopContentDrawer
        open={topContentOpen}
        onOpenChange={setTopContentOpen}
        items={topRows}
        onExport={handleExportTopContent}
      />
    </AdminShell>
  );
}
