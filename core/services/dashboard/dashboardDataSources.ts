import type { TrafficOverview } from "../analytics/trafficAggregationTypes";
import type {
  DashboardContentQueryConfig,
  DashboardContentTypeCount,
  DashboardCounterData,
  DashboardCounterMetric,
  DashboardLayout,
  DashboardQuickAction,
  DashboardRecentEdit,
  DashboardSecuritySummary,
  DashboardStorageSummary,
  DashboardTimeBucket,
  DashboardTotals,
  DashboardWidget,
  DashboardWidgetData,
  DashboardWidgetResolution,
  DashboardWidgetType,
} from "./dashboardTypes";
import { DASHBOARD_WIDGET_TYPES } from "./dashboardTypes";

export type DashboardDataReaders = {
  totals: () => Promise<DashboardTotals>;
  recentEdits: (limit: number) => Promise<DashboardRecentEdit[]>;
  storage: () => Promise<DashboardStorageSummary>;
  securitySummary: () => Promise<DashboardSecuritySummary>;
  contentTypeCounts: (
    limit: number,
    contentTypeIds?: string[]
  ) => Promise<DashboardContentTypeCount[]>;
  contentOverTime: (rangeDays: number, bucket: "day" | "week") => Promise<DashboardTimeBucket[]>;
  contentQuery: (config: DashboardContentQueryConfig) => Promise<DashboardRecentEdit[]>;
  trafficOverview: (rangeDays: number) => Promise<TrafficOverview>;
};

type Resolver = (
  widget: DashboardWidget,
  readers: DashboardDataReaders
) => Promise<DashboardWidgetData>;

const labels: Record<DashboardCounterMetric, string> = {
  pages: "Pages",
  entries: "Entries",
  media: "Media",
  users: "Users",
  visitors: "Visitors",
  pageviews: "Pageviews",
  sessions: "Sessions",
  bounceRate: "Bounce Rate",
};

const segmentColors = [
  "var(--primary)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
];

export const DEFAULT_QUICK_ACTIONS: DashboardQuickAction[] = [
  { id: "new-page", label: "New page", target: "pages", icon: "file-plus" },
  { id: "new-entry", label: "New entry", target: "entries", icon: "database" },
  { id: "media", label: "Media", target: "media", icon: "image" },
  { id: "analytics", label: "Analytics", target: "analytics", icon: "bar-chart" },
];

let defaultReadersPromise: Promise<DashboardDataReaders> | null = null;

async function getDefaultReaders(): Promise<DashboardDataReaders> {
  if (defaultReadersPromise) return defaultReadersPromise;
  defaultReadersPromise = (async () => {
    const [dashboardService, trafficService] = await Promise.all([
      import("./dashboardService"),
      import("../analytics/trafficAggregationService"),
    ]);
    return {
      totals: dashboardService.getDashboardTotals,
      recentEdits: dashboardService.getRecentEdits,
      storage: dashboardService.getStorageSummary,
      securitySummary: dashboardService.getDashboardSecuritySummary,
      contentTypeCounts: dashboardService.getContentTypeCounts,
      contentOverTime: dashboardService.getContentOverTime,
      contentQuery: dashboardService.resolveContentQueryWidget,
      trafficOverview: (rangeDays: number) => trafficService.getTrafficOverview({ rangeDays }),
    };
  })();
  return defaultReadersPromise;
}

const formatNumber = (value: number) => Math.round(value).toLocaleString("en-US");

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatBytes = (value: number) => {
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const rounded = size >= 10 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
};

const formatMetric = (metric: DashboardCounterMetric, value: number, format?: string) => {
  if (metric === "bounceRate" || format === "percent") return formatPercent(value);
  if (format === "bytes") return formatBytes(value);
  return formatNumber(value);
};

const trendForDelta = (delta: number) => (delta > 0 ? "up" : delta < 0 ? "down" : "flat");

const formatSignedDelta = (metric: DashboardCounterMetric, delta: number) => {
  const sign = delta > 0 ? "+" : "";
  if (metric === "bounceRate") return `${sign}${Math.round(delta * 100)} pts`;
  return `${sign}${formatNumber(delta)}`;
};

function cmsCounters(totals: DashboardTotals, widget: DashboardWidget): DashboardWidgetData {
  const config = widget.config.kind === "totals-counters" ? widget.config : undefined;
  const metrics = config?.metrics ?? ["pages", "entries", "media", "users"];
  const counters = metrics
    .filter(
      (metric): metric is "pages" | "entries" | "media" | "users" =>
        metric === "pages" || metric === "entries" || metric === "media" || metric === "users"
    )
    .map((metric) => ({
      key: metric,
      label: labels[metric],
      formatted: formatMetric(metric, totals[metric], config?.format),
      value: totals[metric],
    }));
  return { type: "totals-counters", counters };
}

function trafficCounters(overview: TrafficOverview, widget: DashboardWidget): DashboardWidgetData {
  const config = widget.config.kind === "totals-counters" ? widget.config : undefined;
  const metrics = config?.metrics ?? ["visitors", "pageviews", "sessions", "bounceRate"];
  const current: Record<DashboardCounterMetric, number> = {
    pages: 0,
    entries: 0,
    media: 0,
    users: 0,
    visitors: overview.totals.visitors,
    pageviews: overview.totals.pageviews,
    sessions: overview.totals.sessions,
    bounceRate: overview.totals.bounceRate,
  };
  const previous: Record<DashboardCounterMetric, number> = {
    pages: 0,
    entries: 0,
    media: 0,
    users: 0,
    visitors: overview.previous.visitors,
    pageviews: overview.previous.pageviews,
    sessions: overview.previous.sessions,
    bounceRate: overview.previous.bounceRate,
  };
  const spark = overview.trend.map((point) => point.value);
  const counters = metrics
    .filter(
      (metric): metric is "visitors" | "pageviews" | "sessions" | "bounceRate" =>
        metric === "visitors" ||
        metric === "pageviews" ||
        metric === "sessions" ||
        metric === "bounceRate"
    )
    .map((metric) => {
      const delta = current[metric] - previous[metric];
      return {
        key: metric,
        label: labels[metric],
        formatted: formatMetric(
          metric,
          current[metric],
          metric === "bounceRate" ? "percent" : config?.format
        ),
        value: current[metric],
        delta: {
          value: delta,
          trend: trendForDelta(delta),
          label: formatSignedDelta(metric, delta),
        },
        spark: metric === "pageviews" ? spark : undefined,
      } satisfies DashboardCounterData;
    });
  return { type: "totals-counters", counters };
}

const toContentTypeCounts = (
  counts: DashboardContentTypeCount[],
  widget: DashboardWidget
): DashboardWidgetData => {
  const config = widget.config.kind === "content-type-counts" ? widget.config : undefined;
  const filtered = config?.contentTypeIds?.length
    ? counts.filter((row) => config.contentTypeIds?.includes(row.id))
    : counts;
  const visible = filtered.slice(0, config?.limit ?? 10);
  return {
    type: "content-type-counts",
    counts: visible,
    segments:
      config?.display === "donut"
        ? visible.map((row, index) => ({
            label: row.label,
            value: row.count,
            color: segmentColors[index % segmentColors.length] ?? "var(--primary)",
          }))
        : undefined,
  };
};

const toContentOverTime = (
  rows: DashboardTimeBucket[],
  widget: DashboardWidget
): DashboardWidgetData => {
  const config = widget.config.kind === "content-over-time" ? widget.config : undefined;
  return {
    type: "content-over-time",
    variant: config?.variant ?? "area",
    categories: rows.map((row) => row.bucket),
    series: [
      {
        id: "created",
        label: "Created",
        color: "var(--primary)",
        points: rows.map((row) => row.created),
      },
      {
        id: "updated",
        label: "Updated",
        color: "var(--info)",
        points: rows.map((row) => row.updated),
      },
    ],
  };
};

const trafficOverTime = (
  overview: TrafficOverview,
  widget: DashboardWidget
): DashboardWidgetData => {
  const config = widget.config.kind === "content-over-time" ? widget.config : undefined;
  return {
    type: "content-over-time",
    variant: config?.variant ?? "area",
    categories: overview.trend.map((point) => point.date),
    series: [
      {
        id: "pageviews",
        label: "Pageviews",
        color: "var(--primary)",
        points: overview.trend.map((point) => point.value),
      },
    ],
  };
};

const toStorageUsage = (storage: DashboardStorageSummary): DashboardWidgetData => ({
  type: "storage-usage",
  usedBytes: storage.usedBytes,
  limitBytes: storage.limitBytes,
  usedPercent: storage.usedPercent,
});

const toContentQuery = (items: DashboardRecentEdit[]): DashboardWidgetData => ({
  type: "content-query",
  columns: [
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "updatedAt", label: "Updated" },
  ],
  rows: items.map((item) => ({
    title: item.title,
    status: item.status,
    updatedAt: item.updatedAt,
  })),
});

export const dashboardWidgetResolvers: Record<DashboardWidgetType, Resolver> = {
  "totals-counters": async (widget, readers) => {
    const config = widget.config.kind === "totals-counters" ? widget.config : undefined;
    if (config?.source === "traffic") {
      return trafficCounters(await readers.trafficOverview(config.rangeDays ?? 30), widget);
    }
    return cmsCounters(await readers.totals(), widget);
  },
  "content-type-counts": async (widget, readers) => {
    const config = widget.config.kind === "content-type-counts" ? widget.config : undefined;
    return toContentTypeCounts(
      await readers.contentTypeCounts(config?.limit ?? 10, config?.contentTypeIds),
      widget
    );
  },
  "content-over-time": async (widget, readers) => {
    const config = widget.config.kind === "content-over-time" ? widget.config : undefined;
    if (config?.source === "traffic") {
      return trafficOverTime(await readers.trafficOverview(config.rangeDays ?? 30), widget);
    }
    return toContentOverTime(
      await readers.contentOverTime(config?.rangeDays ?? 30, config?.bucket ?? "day"),
      widget
    );
  },
  "recent-activity": async (widget, readers) => {
    const config = widget.config.kind === "recent-activity" ? widget.config : undefined;
    const types = new Set(config?.types ?? ["page", "entry", "media"]);
    const items = (await readers.recentEdits(config?.limit ?? 10)).filter((item) =>
      types.has(item.type)
    );
    return { type: "recent-activity", items };
  },
  "storage-usage": async (_widget, readers) => toStorageUsage(await readers.storage()),
  "site-health": async (_widget, readers) => {
    const [security, storage] = await Promise.all([readers.securitySummary(), readers.storage()]);
    return { type: "site-health", security, storage: { usedPercent: storage.usedPercent } };
  },
  "security-summary": async (_widget, readers) => ({
    type: "security-summary",
    security: await readers.securitySummary(),
  }),
  "quick-actions": async (widget) => ({
    type: "quick-actions",
    actions:
      widget.config.kind === "quick-actions" && widget.config.actions
        ? widget.config.actions
        : DEFAULT_QUICK_ACTIONS,
  }),
  "content-query": async (widget, readers) => {
    const config =
      widget.config.kind === "content-query"
        ? widget.config
        : {
            kind: "content-query",
            contentTypeId: null,
            limit: 10,
            sort: "updatedAt",
            order: "desc",
          };
    return toContentQuery(await readers.contentQuery(config as DashboardContentQueryConfig));
  },
};

export async function resolveWidgetData(
  widget: DashboardWidget,
  readers?: DashboardDataReaders
): Promise<DashboardWidgetResolution> {
  try {
    const activeReaders = readers ?? (await getDefaultReaders());
    return await dashboardWidgetResolvers[widget.type](widget, activeReaders);
  } catch {
    return { type: widget.type, error: "widget_data_unavailable" };
  }
}

export async function resolveDashboardWidgets(
  layout: DashboardLayout,
  readers?: DashboardDataReaders
): Promise<DashboardWidgetResolution[]> {
  const activeReaders = readers ?? (await getDefaultReaders());
  return Promise.all(layout.widgets.map((widget) => resolveWidgetData(widget, activeReaders)));
}

export { DASHBOARD_WIDGET_TYPES };
