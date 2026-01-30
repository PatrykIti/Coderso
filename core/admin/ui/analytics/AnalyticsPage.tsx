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

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextOverview, nextTop] = await Promise.all([
        getOverview(rangeDays),
        getTopContent({ limit: 12 }),
      ]);
      setOverview(nextOverview);
      setTopContent(nextTop);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load analytics data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const metrics = useMemo((): KpiCard[] => {
    if (!overview) return [];
    const format = (value: number) => value.toLocaleString("en-US");
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) {
        return current === 0
          ? { change: "0%", trend: "down" as const }
          : { change: "100%", trend: "up" as const };
      }
      const delta = ((current - previous) / previous) * 100;
      return {
        change: `${Math.abs(Math.round(delta))}%`,
        trend: delta >= 0 ? ("up" as const) : ("down" as const),
      };
    };

    const published = calcChange(overview.current.publishedPages, overview.previous.publishedPages);
    const entries = calcChange(overview.current.entries, overview.previous.entries);
    const media = calcChange(overview.current.media, overview.previous.media);

    return [
      {
        id: "publishedPages",
        label: "Published Pages",
        value: format(overview.totals.publishedPages),
        change: published.change,
        trend: published.trend,
      },
      {
        id: "entries",
        label: "Content Entries",
        value: format(overview.totals.entries),
        change: entries.change,
        trend: entries.trend,
      },
      {
        id: "media",
        label: "Media Items",
        value: format(overview.totals.media),
        change: media.change,
        trend: media.trend,
      },
    ];
  }, [overview]);

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

  const topPages = useMemo(
    () =>
      topRows.slice(0, 4).map((row) => ({
        id: row.id,
        path: row.path,
        score: row.score,
      })),
    [topRows]
  );

  return (
    <AdminShell
      activeHref="/admin/analytics"
      showSearch={false}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span className="text-foreground">Analytics</span>
        </div>
      }
      topbarActions={
        <Select defaultValue={rangeValue} onValueChange={setRangeValue}>
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
            <TopContentTable items={topRows} onViewAll={() => setTopContentOpen(true)} />
          </>
        )}
      </div>
      <TopContentDrawer
        open={topContentOpen}
        onOpenChange={setTopContentOpen}
        items={topRows}
      />
    </AdminShell>
  );
}
