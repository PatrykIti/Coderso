import {
  BarChart3,
  ClipboardList,
  Database,
  FileClock,
  Gauge,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";

import {
  DASHBOARD_WIDGET_DEFAULT_CONFIG,
  type DashboardWidget,
} from "../../../services/dashboard/dashboardWidgetContract";
import {
  DASHBOARD_WIDGET_TYPES,
  type DashboardWidgetConfig,
  type DashboardWidgetData,
  type DashboardWidgetPosition,
  type DashboardWidgetType,
} from "../../../services/dashboard/dashboardTypes";
import {
  ContentOverTimeWidget,
  ContentQueryWidget,
  ContentTypeCountsWidget,
  QuickActionsWidget,
  RecentActivityWidget,
  SecuritySummaryWidget,
  SiteHealthWidget,
  StorageUsageWidget,
  TotalsCountersWidget,
  type WidgetRenderer,
} from "./widgetRenderers";

export type { DashboardWidgetRendererProps, WidgetRenderer } from "./widgetRenderers";

// Exhaustive renderer registry: a mapped type over `DashboardWidgetType`, so
// omitting any widget type is a COMPILE error (never a silent runtime fallthrough
// like the previous `switch`). The host + builder dispatch through this map and
// never branch on `widget.type` / `widget.config.kind` themselves.
export type DashboardWidgetRendererRegistry = {
  [T in DashboardWidgetType]: WidgetRenderer<T>;
};

export const DASHBOARD_WIDGET_RENDERERS: DashboardWidgetRendererRegistry = {
  "totals-counters": TotalsCountersWidget,
  "content-type-counts": ContentTypeCountsWidget,
  "content-over-time": ContentOverTimeWidget,
  "recent-activity": RecentActivityWidget,
  "storage-usage": StorageUsageWidget,
  "site-health": SiteHealthWidget,
  "security-summary": SecuritySummaryWidget,
  "quick-actions": QuickActionsWidget,
  "content-query": ContentQueryWidget,
};

export function getWidgetRenderer<T extends DashboardWidgetType>(type: T): WidgetRenderer<T> {
  return DASHBOARD_WIDGET_RENDERERS[type];
}

// Per-type "is there anything to show?" predicate. Pure + exhaustive; a new data
// variant without a branch is a COMPILE error.
export function isWidgetDataEmpty(data: DashboardWidgetData): boolean {
  switch (data.type) {
    case "recent-activity":
      return data.items.length === 0;
    case "content-type-counts":
      return data.counts.length === 0;
    case "content-query":
      return data.rows.length === 0;
    case "quick-actions":
      return data.actions.length === 0;
    case "content-over-time":
      return data.series.every((series) => series.points.length === 0);
    case "totals-counters":
    case "storage-usage":
    case "site-health":
    case "security-summary":
      return false;
  }
}

// Schema-driven config-form descriptor. Each configurable widget type publishes
// a `configFields` list derived from its per-kind config schema in
// `dashboardWidgetContract.ts`; the generic `<WidgetConfigForm>` renders controls
// from these descriptors and writes back through `normalizeDashboardWidgetConfig`
// (schema-first, reject-unknown preserved). The builder never hand-writes per-kind
// control branches.
export type WidgetConfigOption = { value: string; label: string };

// Dynamic option sources resolved by the form at render time (not statically
// enumerable): `contentTypes` = the cached `contentTypes:list`; `counterMetrics` =
// the counter metrics allowed for the current `source` (cms vs traffic).
export type WidgetConfigOptionSource = "contentTypes" | "counterMetrics";

export type WidgetConfigField =
  | { key: string; control: "text"; label: string; placeholder?: string }
  | {
      key: string;
      control: "select";
      label: string;
      options: WidgetConfigOption[] | "contentTypes";
      // When present, an extra leading option maps to this cleared value
      // (`null` → stored null, `undefined` → key omitted so the schema default
      // applies). Used for nullable/optional enum fields.
      emptyOption?: { label: string; value: null | undefined };
    }
  | {
      key: string;
      control: "multiselect";
      label: string;
      options: WidgetConfigOption[] | WidgetConfigOptionSource;
    }
  | { key: string; control: "checkbox"; label: string }
  | { key: string; control: "number"; label: string; min: number; max: number }
  | { key: string; control: "slider"; label: string; min: number; max: number; step?: number }
  | { key: string; control: "actions"; label: string };

// Counter metrics by source, with display labels. The form filters/relabels the
// `metrics` multiselect from this map using the widget's current `source`.
export const DASHBOARD_COUNTER_METRIC_OPTIONS: Record<"cms" | "traffic", WidgetConfigOption[]> = {
  cms: [
    { value: "pages", label: "Pages" },
    { value: "entries", label: "Entries" },
    { value: "media", label: "Media" },
    { value: "users", label: "Users" },
  ],
  traffic: [
    { value: "visitors", label: "Visitors" },
    { value: "pageviews", label: "Pageviews" },
    { value: "sessions", label: "Sessions" },
    { value: "bounceRate", label: "Bounce rate" },
  ],
};

// Quick-action navigation targets (mirrors the `quickActionTargets` enum owned by
// the contract). The actions editor renders a target select from this list.
export const DASHBOARD_QUICK_ACTION_TARGET_OPTIONS: WidgetConfigOption[] = [
  { value: "pages", label: "Pages" },
  { value: "entries", label: "Entries" },
  { value: "media", label: "Media" },
  { value: "analytics", label: "Analytics" },
  { value: "settings", label: "Settings" },
  { value: "dashboard", label: "Dashboard" },
];

// Catalog metadata consumed by the builder's add-widget / configure UI. This
// module owns catalog completeness (exhaustive Record); the builder does not
// redeclare labels, icons, defaults, sizing, or config fields.
export type DashboardWidgetCatalogEntry = {
  type: DashboardWidgetType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  defaultConfig: DashboardWidgetConfig;
  defaultLayout: DashboardWidgetPosition;
  configFields: WidgetConfigField[];
  // Presentational RBAC guard (TASK-480-05-L02 Security Contract). The permissions
  // the current set must ALL hold for this widget type to render meaningful data —
  // so the add-widget catalog hides types the viewer can never populate (e.g. a
  // counters widget surfacing user counts without `users:read`). This is defence in
  // depth only; the widget-data route (`content:read`) remains the real boundary.
  requiredPermissions: string[];
};

export const DASHBOARD_WIDGET_CATALOG: Record<DashboardWidgetType, DashboardWidgetCatalogEntry> = {
  "totals-counters": {
    type: "totals-counters",
    label: "Counters",
    description: "CMS or traffic totals",
    icon: Gauge,
    defaultConfig: DASHBOARD_WIDGET_DEFAULT_CONFIG["totals-counters"],
    defaultLayout: { x: 0, y: 0, w: 12, h: 1 },
    // Default metric set includes user counts (see DASHBOARD_WIDGET_DEFAULT_CONFIG).
    requiredPermissions: ["users:read"],
    configFields: [
      {
        key: "source",
        control: "select",
        label: "Source",
        options: [
          { value: "cms", label: "CMS" },
          { value: "traffic", label: "Traffic" },
        ],
      },
      { key: "metrics", control: "multiselect", label: "Metrics", options: "counterMetrics" },
      {
        key: "format",
        control: "select",
        label: "Value format",
        options: [
          { value: "number", label: "Number" },
          { value: "bytes", label: "Bytes" },
          { value: "percent", label: "Percent" },
        ],
      },
      {
        key: "accent",
        control: "select",
        label: "Accent",
        options: [
          { value: "primary", label: "Primary" },
          { value: "success", label: "Success" },
          { value: "warning", label: "Warning" },
        ],
      },
      { key: "rangeDays", control: "slider", label: "Trend range (days)", min: 1, max: 365 },
    ],
  },
  "content-type-counts": {
    type: "content-type-counts",
    label: "Content Types",
    description: "Entry counts by collection",
    icon: Database,
    defaultConfig: DASHBOARD_WIDGET_DEFAULT_CONFIG["content-type-counts"],
    defaultLayout: { x: 0, y: 0, w: 6, h: 3 },
    requiredPermissions: [],
    configFields: [
      {
        key: "display",
        control: "select",
        label: "Display",
        options: [
          { value: "bars", label: "Bars" },
          { value: "list", label: "List" },
          { value: "donut", label: "Donut" },
        ],
      },
      { key: "limit", control: "slider", label: "Limit", min: 1, max: 50 },
      {
        key: "contentTypeIds",
        control: "multiselect",
        label: "Content types (all when none selected)",
        options: "contentTypes",
      },
    ],
  },
  "content-over-time": {
    type: "content-over-time",
    label: "Timeline",
    description: "Content or traffic trend",
    icon: BarChart3,
    defaultConfig: DASHBOARD_WIDGET_DEFAULT_CONFIG["content-over-time"],
    defaultLayout: { x: 0, y: 0, w: 8, h: 3 },
    requiredPermissions: [],
    configFields: [
      {
        key: "source",
        control: "select",
        label: "Source",
        options: [
          { value: "content", label: "Content" },
          { value: "traffic", label: "Traffic" },
        ],
      },
      {
        key: "variant",
        control: "select",
        label: "Chart",
        options: [
          { value: "area", label: "Area" },
          { value: "bar", label: "Bar" },
        ],
      },
      {
        key: "bucket",
        control: "select",
        label: "Bucket",
        options: [
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
        ],
      },
      { key: "rangeDays", control: "slider", label: "Range (days)", min: 1, max: 365 },
    ],
  },
  "recent-activity": {
    type: "recent-activity",
    label: "Recent Activity",
    description: "Latest content and media changes",
    icon: FileClock,
    defaultConfig: DASHBOARD_WIDGET_DEFAULT_CONFIG["recent-activity"],
    defaultLayout: { x: 0, y: 0, w: 8, h: 3 },
    requiredPermissions: [],
    configFields: [
      { key: "limit", control: "slider", label: "Limit", min: 1, max: 25 },
      {
        key: "types",
        control: "multiselect",
        label: "Types",
        options: [
          { value: "page", label: "Pages" },
          { value: "entry", label: "Entries" },
          { value: "media", label: "Media" },
        ],
      },
    ],
  },
  "storage-usage": {
    type: "storage-usage",
    label: "Storage",
    description: "Media storage usage",
    icon: LayoutDashboard,
    defaultConfig: DASHBOARD_WIDGET_DEFAULT_CONFIG["storage-usage"],
    defaultLayout: { x: 0, y: 0, w: 4, h: 2 },
    // Surfaces media storage byte counts.
    requiredPermissions: ["media:read"],
    configFields: [],
  },
  "site-health": {
    type: "site-health",
    label: "Site Health",
    description: "Storage and security status",
    icon: ListChecks,
    defaultConfig: DASHBOARD_WIDGET_DEFAULT_CONFIG["site-health"],
    defaultLayout: { x: 0, y: 0, w: 4, h: 2 },
    // Combines storage usage (media) with the security status.
    requiredPermissions: ["media:read"],
    configFields: [],
  },
  "security-summary": {
    type: "security-summary",
    label: "Security",
    description: "Admin protection checks",
    icon: ShieldCheck,
    defaultConfig: DASHBOARD_WIDGET_DEFAULT_CONFIG["security-summary"],
    defaultLayout: { x: 0, y: 0, w: 4, h: 2 },
    requiredPermissions: [],
    configFields: [],
  },
  "quick-actions": {
    type: "quick-actions",
    label: "Quick Actions",
    description: "Common admin shortcuts",
    icon: Zap,
    defaultConfig: DASHBOARD_WIDGET_DEFAULT_CONFIG["quick-actions"],
    defaultLayout: { x: 0, y: 0, w: 4, h: 2 },
    requiredPermissions: [],
    configFields: [{ key: "actions", control: "actions", label: "Actions" }],
  },
  "content-query": {
    type: "content-query",
    label: "Content Query",
    description: "Filtered entry list",
    icon: ClipboardList,
    defaultConfig: DASHBOARD_WIDGET_DEFAULT_CONFIG["content-query"],
    defaultLayout: { x: 0, y: 0, w: 8, h: 3 },
    requiredPermissions: [],
    configFields: [
      {
        key: "contentTypeId",
        control: "select",
        label: "Content type",
        options: "contentTypes",
        emptyOption: { label: "All content types", value: null },
      },
      {
        key: "status",
        control: "select",
        label: "Status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
          { value: "scheduled", label: "Scheduled" },
          { value: "archived", label: "Archived" },
          { value: "active", label: "Active" },
        ],
        emptyOption: { label: "Any status", value: undefined },
      },
      { key: "limit", control: "slider", label: "Limit", min: 1, max: 50 },
      {
        key: "sort",
        control: "select",
        label: "Sort by",
        options: [
          { value: "updatedAt", label: "Updated" },
          { value: "createdAt", label: "Created" },
          { value: "title", label: "Title" },
        ],
      },
      {
        key: "order",
        control: "select",
        label: "Order",
        options: [
          { value: "desc", label: "Descending" },
          { value: "asc", label: "Ascending" },
        ],
      },
    ],
  },
};

// Ordered catalog list for the add-widget grid (stable enum order).
export const dashboardWidgetCatalog: DashboardWidgetCatalogEntry[] = DASHBOARD_WIDGET_TYPES.map(
  (type) => DASHBOARD_WIDGET_CATALOG[type]
);

export const getDashboardWidgetDescriptor = (
  type: DashboardWidgetType
): DashboardWidgetCatalogEntry => DASHBOARD_WIDGET_CATALOG[type];

// Presentational RBAC predicate for the add-widget catalog. Returns true only when
// the permission set (`can`) satisfies EVERY `requiredPermissions` entry for the
// type, so the catalog hides widget types the viewer could never populate with
// real data. Defence in depth only — the widget-data route stays the boundary.
export const canRenderWidgetType = (
  type: DashboardWidgetType,
  can: (permission: string) => boolean
): boolean =>
  DASHBOARD_WIDGET_CATALOG[type].requiredPermissions.every((permission) => can(permission));

export function createDashboardWidget(type: DashboardWidgetType, y: number): DashboardWidget {
  const entry = DASHBOARD_WIDGET_CATALOG[type];
  return {
    id: `dashboard-${type}-${Date.now().toString(36)}`,
    type,
    title: entry.label,
    config: JSON.parse(JSON.stringify(entry.defaultConfig)),
    position: { ...entry.defaultLayout, y },
  };
}
