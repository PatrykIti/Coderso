export type DashboardStatus = "ok" | "warning" | "critical";

export type DashboardSecurityCheckId = "csrf" | "rateLimit" | "headers" | "sessionPolicy";

export type DashboardSecurityCheck = {
  id: DashboardSecurityCheckId;
  label: string;
  status: DashboardStatus;
  detail: string;
};

export type DashboardSecuritySummary = {
  status: DashboardStatus;
  issues: number;
  checks: DashboardSecurityCheck[];
};

export type DashboardRecentEditType = "page" | "entry" | "media";

export type DashboardRecentEditStatus = "draft" | "published" | "scheduled" | "archived" | "active";

export type DashboardRecentEditAuthor = {
  id: string | null;
  name: string | null;
  email: string | null;
};

export type DashboardRecentEdit = {
  id: string;
  type: DashboardRecentEditType;
  title: string;
  path: string | null;
  status: DashboardRecentEditStatus;
  updatedAt: string;
  author: DashboardRecentEditAuthor;
};

export type DashboardTotals = {
  pages: number;
  entries: number;
  media: number;
  users: number;
};

export type DashboardStorageSummary = {
  usedBytes: number;
  limitBytes: number | null;
  usedPercent: number | null;
};

export type DashboardPayload = {
  generatedAt: string;
  totals: DashboardTotals;
  storage: DashboardStorageSummary;
  security: DashboardSecuritySummary;
  recentEdits: DashboardRecentEdit[];
};

// Admin Dashboard widgets. These configurable panels belong to the admin
// Dashboard only; they are distinct from public/page-builder widgets in
// `core/widgets/*`.
export const DASHBOARD_WIDGET_TYPES = [
  "totals-counters",
  "content-type-counts",
  "content-over-time",
  "recent-activity",
  "storage-usage",
  "site-health",
  "security-summary",
  "quick-actions",
  "content-query",
] as const;

export type DashboardWidgetType = (typeof DASHBOARD_WIDGET_TYPES)[number];

export const DASHBOARD_LAYOUT_VERSION = 1 as const;

export type DashboardCounterMetric =
  | "pages"
  | "entries"
  | "media"
  | "users"
  | "visitors"
  | "pageviews"
  | "sessions"
  | "bounceRate";

export type DashboardWidgetPosition = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DashboardTotalsCountersConfig = {
  kind: "totals-counters";
  source?: "cms" | "traffic";
  metrics?: DashboardCounterMetric[];
  accent?: "primary" | "success" | "warning";
  format?: "number" | "bytes" | "percent";
  rangeDays?: number;
};

export type DashboardContentTypeCountsConfig = {
  kind: "content-type-counts";
  contentTypeIds?: string[];
  limit?: number;
  display?: "bars" | "list" | "donut";
};

export type DashboardContentOverTimeConfig = {
  kind: "content-over-time";
  source?: "content" | "traffic";
  rangeDays?: number;
  bucket?: "day" | "week";
  variant?: "area" | "bar";
};

export type DashboardRecentActivityConfig = {
  kind: "recent-activity";
  limit?: number;
  types?: DashboardRecentEditType[];
};

export type DashboardQuickAction = {
  id: string;
  label: string;
  target: "pages" | "entries" | "media" | "analytics" | "settings" | "dashboard";
  icon?: string;
};

export type DashboardQuickActionsConfig = {
  kind: "quick-actions";
  actions?: DashboardQuickAction[];
};

export type DashboardContentQueryConfig = {
  kind: "content-query";
  contentTypeId: string | null;
  status?: DashboardRecentEditStatus;
  limit?: number;
  sort?: "updatedAt" | "createdAt" | "title";
  order?: "asc" | "desc";
};

export type DashboardWidgetConfig =
  | DashboardTotalsCountersConfig
  | DashboardContentTypeCountsConfig
  | DashboardContentOverTimeConfig
  | DashboardRecentActivityConfig
  | { kind: "storage-usage" }
  | { kind: "site-health" }
  | { kind: "security-summary" }
  | DashboardQuickActionsConfig
  | DashboardContentQueryConfig;

export type DashboardWidget = {
  id: string;
  type: DashboardWidgetType;
  title?: string;
  config: DashboardWidgetConfig;
  position: DashboardWidgetPosition;
};

export type DashboardLayout = {
  version: typeof DASHBOARD_LAYOUT_VERSION;
  widgets: DashboardWidget[];
};

export type DashboardCounterData = {
  key: DashboardCounterMetric;
  label: string;
  formatted: string;
  value: number;
  delta?: { value: number; trend: "up" | "down" | "flat"; label?: string };
  spark?: number[];
};

export type DashboardContentTypeCount = {
  id: string;
  slug: string;
  label: string;
  count: number;
};

export type DashboardTimeBucket = {
  bucket: string;
  created: number;
  updated: number;
};

export type DashboardWidgetData =
  | { type: "totals-counters"; counters: DashboardCounterData[] }
  | {
      type: "content-type-counts";
      counts: DashboardContentTypeCount[];
      segments?: { label: string; value: number; color: string }[];
    }
  | {
      type: "content-over-time";
      variant: "area" | "bar";
      series: { id: string; label: string; color?: string; points: number[] }[];
      categories: string[];
    }
  | { type: "recent-activity"; items: DashboardRecentEdit[] }
  | {
      type: "storage-usage";
      usedBytes: number;
      limitBytes: number | null;
      usedPercent: number | null;
      breakdown?: { label: string; bytes: number }[];
    }
  | {
      type: "site-health";
      security: DashboardSecuritySummary;
      storage: { usedPercent: number | null };
    }
  | { type: "security-summary"; security: DashboardSecuritySummary }
  | { type: "quick-actions"; actions: DashboardQuickAction[] }
  | {
      type: "content-query";
      columns: { key: string; label: string }[];
      rows: Record<string, string | number>[];
    };

export type DashboardWidgetResolution =
  | DashboardWidgetData
  | { type: DashboardWidgetType; error: "widget_data_unavailable" };
