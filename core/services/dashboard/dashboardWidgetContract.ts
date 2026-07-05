import {
  DASHBOARD_LAYOUT_VERSION,
  DASHBOARD_WIDGET_TYPES,
  type DashboardContentOverTimeConfig,
  type DashboardContentQueryConfig,
  type DashboardContentTypeCountsConfig,
  type DashboardCounterMetric,
  type DashboardLayout,
  type DashboardQuickAction,
  type DashboardRecentActivityConfig,
  type DashboardRecentEditType,
  type DashboardTotalsCountersConfig,
  type DashboardWidget,
  type DashboardWidgetConfig,
  type DashboardWidgetPosition,
  type DashboardWidgetType,
} from "./dashboardTypes";

export { DASHBOARD_LAYOUT_VERSION, type DashboardLayout, type DashboardWidget };

export const DASHBOARD_GRID_COLUMNS = 12;
export const DASHBOARD_WIDGET_MIN_W = 1;
export const DASHBOARD_WIDGET_MIN_H = 1;
export const DASHBOARD_WIDGET_MAX_W = DASHBOARD_GRID_COLUMNS;
export const DASHBOARD_WIDGET_MAX_H = 12;
export const DASHBOARD_MAX_WIDGETS = 24;
export const DASHBOARD_CONTENT_QUERY_MAX_LIMIT = 50;
export const DASHBOARD_CONTENT_QUERY_DEFAULT_LIMIT = 10;
export const DASHBOARD_RECENT_ACTIVITY_MAX_LIMIT = 25;
export const DASHBOARD_CHART_MAX_RANGE_DAYS = 365;
export const DASHBOARD_CHART_DEFAULT_RANGE_DAYS = 30;

export const DASHBOARD_LAYOUT_INVALID = "dashboard_layout_invalid";
export const DASHBOARD_WIDGET_CONFIG_KIND_MISMATCH = "dashboard_widget_config_kind_mismatch";

const cmsCounterMetrics = ["pages", "entries", "media", "users"] as const;
const trafficCounterMetrics = ["visitors", "pageviews", "sessions", "bounceRate"] as const;
const allCounterMetrics = [...cmsCounterMetrics, ...trafficCounterMetrics] as const;
const recentEditTypes = ["page", "entry", "media"] as const;
const recentEditStatuses = ["draft", "published", "scheduled", "archived", "active"] as const;
const quickActionTargets = [
  "pages",
  "entries",
  "media",
  "analytics",
  "settings",
  "dashboard",
] as const;

type JsonSchema = Record<string, unknown>;

const stringEnumSchema = <T extends readonly string[]>(values: T) => ({
  type: "string",
  enum: [...values],
});

const configSchemas: Record<DashboardWidgetType, JsonSchema> = {
  "totals-counters": {
    type: "object",
    required: ["kind"],
    properties: {
      kind: { const: "totals-counters" },
      source: stringEnumSchema(["cms", "traffic"] as const),
      metrics: {
        type: "array",
        items: stringEnumSchema(allCounterMetrics),
        maxItems: 8,
      },
      accent: stringEnumSchema(["primary", "success", "warning"] as const),
      format: stringEnumSchema(["number", "bytes", "percent"] as const),
      rangeDays: { type: "number", minimum: 1, maximum: DASHBOARD_CHART_MAX_RANGE_DAYS },
    },
    additionalProperties: false,
  },
  "content-type-counts": {
    type: "object",
    required: ["kind"],
    properties: {
      kind: { const: "content-type-counts" },
      contentTypeIds: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 24 },
      limit: { type: "number", minimum: 1, maximum: DASHBOARD_CONTENT_QUERY_MAX_LIMIT },
      display: stringEnumSchema(["bars", "list", "donut"] as const),
    },
    additionalProperties: false,
  },
  "content-over-time": {
    type: "object",
    required: ["kind"],
    properties: {
      kind: { const: "content-over-time" },
      source: stringEnumSchema(["content", "traffic"] as const),
      rangeDays: { type: "number", minimum: 1, maximum: DASHBOARD_CHART_MAX_RANGE_DAYS },
      bucket: stringEnumSchema(["day", "week"] as const),
      variant: stringEnumSchema(["area", "bar"] as const),
    },
    additionalProperties: false,
  },
  "recent-activity": {
    type: "object",
    required: ["kind"],
    properties: {
      kind: { const: "recent-activity" },
      limit: { type: "number", minimum: 1, maximum: DASHBOARD_RECENT_ACTIVITY_MAX_LIMIT },
      types: { type: "array", items: stringEnumSchema(recentEditTypes), maxItems: 3 },
    },
    additionalProperties: false,
  },
  "storage-usage": {
    type: "object",
    required: ["kind"],
    properties: { kind: { const: "storage-usage" } },
    additionalProperties: false,
  },
  "site-health": {
    type: "object",
    required: ["kind"],
    properties: { kind: { const: "site-health" } },
    additionalProperties: false,
  },
  "security-summary": {
    type: "object",
    required: ["kind"],
    properties: { kind: { const: "security-summary" } },
    additionalProperties: false,
  },
  "quick-actions": {
    type: "object",
    required: ["kind"],
    properties: {
      kind: { const: "quick-actions" },
      actions: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          required: ["id", "label", "target"],
          properties: {
            id: { type: "string", minLength: 1, maxLength: 80 },
            label: { type: "string", minLength: 1, maxLength: 80 },
            target: stringEnumSchema(quickActionTargets),
            icon: { type: "string", minLength: 1, maxLength: 40 },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
  "content-query": {
    type: "object",
    required: ["kind", "contentTypeId"],
    properties: {
      kind: { const: "content-query" },
      contentTypeId: { type: ["string", "null"] },
      status: stringEnumSchema(recentEditStatuses),
      limit: { type: "number", minimum: 1, maximum: DASHBOARD_CONTENT_QUERY_MAX_LIMIT },
      sort: stringEnumSchema(["updatedAt", "createdAt", "title"] as const),
      order: stringEnumSchema(["asc", "desc"] as const),
    },
    additionalProperties: false,
  },
};

export const dashboardWidgetConfigSchemas = configSchemas;

export const dashboardLayoutSchema = {
  type: "object",
  required: ["widgets"],
  properties: {
    version: { type: "number" },
    widgets: {
      type: "array",
      maxItems: DASHBOARD_MAX_WIDGETS,
      items: {
        type: "object",
        required: ["id", "type", "config", "position"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 120 },
          type: stringEnumSchema(DASHBOARD_WIDGET_TYPES),
          title: { type: "string", minLength: 1, maxLength: 120 },
          config: { oneOf: Object.values(configSchemas) },
          position: {
            type: "object",
            required: ["x", "y", "w", "h"],
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              w: { type: "number" },
              h: { type: "number" },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

const defaultConfigByType: Record<DashboardWidgetType, DashboardWidgetConfig> = {
  "totals-counters": {
    kind: "totals-counters",
    source: "cms",
    metrics: ["pages", "entries", "media", "users"],
    accent: "primary",
    format: "number",
    rangeDays: DASHBOARD_CHART_DEFAULT_RANGE_DAYS,
  },
  "content-type-counts": {
    kind: "content-type-counts",
    limit: 10,
    display: "list",
  },
  "content-over-time": {
    kind: "content-over-time",
    source: "content",
    rangeDays: DASHBOARD_CHART_DEFAULT_RANGE_DAYS,
    bucket: "day",
    variant: "area",
  },
  "recent-activity": {
    kind: "recent-activity",
    limit: 10,
    types: ["page", "entry", "media"],
  },
  "storage-usage": { kind: "storage-usage" },
  "site-health": { kind: "site-health" },
  "security-summary": { kind: "security-summary" },
  "quick-actions": { kind: "quick-actions" },
  "content-query": {
    kind: "content-query",
    contentTypeId: null,
    limit: DASHBOARD_CONTENT_QUERY_DEFAULT_LIMIT,
    sort: "updatedAt",
    order: "desc",
  },
};

export const DASHBOARD_WIDGET_DEFAULT_CONFIG = defaultConfigByType;

const cloneConfig = <T extends DashboardWidgetConfig>(config: T): T =>
  JSON.parse(JSON.stringify(config)) as T;

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  version: DASHBOARD_LAYOUT_VERSION,
  widgets: [
    {
      id: "default-totals",
      type: "totals-counters",
      title: "Overview",
      config: cloneConfig(defaultConfigByType["totals-counters"]),
      position: { x: 0, y: 0, w: 12, h: 1 },
    },
    {
      id: "default-activity",
      type: "recent-activity",
      title: "Recent Edits",
      config: cloneConfig(defaultConfigByType["recent-activity"]),
      position: { x: 0, y: 1, w: 8, h: 3 },
    },
    {
      id: "default-storage",
      type: "storage-usage",
      title: "Storage Usage",
      config: cloneConfig(defaultConfigByType["storage-usage"]),
      position: { x: 8, y: 1, w: 4, h: 2 },
    },
    {
      id: "default-security",
      type: "security-summary",
      title: "Security Status",
      config: cloneConfig(defaultConfigByType["security-summary"]),
      position: { x: 8, y: 3, w: 4, h: 2 },
    },
  ],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const fail = (code = DASHBOARD_LAYOUT_INVALID): never => {
  throw new Error(code);
};

const assertAllowedKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  code = DASHBOARD_LAYOUT_INVALID
) => {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) fail(code);
  }
};

const readString = (value: unknown, fallback?: string): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  if (fallback !== undefined) return fallback;
  return fail();
};

const readOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return readString(value);
};

const isOneOf = <T extends readonly string[]>(value: unknown, values: T): value is T[number] =>
  typeof value === "string" && (values as readonly string[]).includes(value);

const readEnum = <T extends readonly string[]>(
  value: unknown,
  values: T,
  fallback: T[number]
): T[number] => {
  if (value === undefined) return fallback;
  if (isOneOf(value, values)) return value;
  return fail();
};

const readNumber = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) return fail();
  return value;
};

const clamp = (value: unknown, fallback: number, min: number, max: number): number => {
  const numeric = readNumber(value, fallback);
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
};

const uniqueStrings = (value: unknown, maxItems: number): string[] | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return fail();
  const next: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const text = readString(entry);
    if (seen.has(text)) continue;
    seen.add(text);
    next.push(text);
    if (next.length >= maxItems) break;
  }
  return next;
};

const readMetricList = (
  value: unknown,
  source: NonNullable<DashboardTotalsCountersConfig["source"]>
): DashboardCounterMetric[] => {
  const allowed = source === "traffic" ? trafficCounterMetrics : cmsCounterMetrics;
  if (value === undefined) return [...allowed] as DashboardCounterMetric[];
  if (!Array.isArray(value)) return fail();
  const next: DashboardCounterMetric[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isOneOf(entry, allCounterMetrics)) fail();
    if (source === "traffic" && !isOneOf(entry, trafficCounterMetrics)) continue;
    if (source === "cms" && !isOneOf(entry, cmsCounterMetrics)) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);
    next.push(entry);
  }
  return next.length > 0 ? next : ([...allowed] as DashboardCounterMetric[]);
};

const readRecentEditTypes = (value: unknown): DashboardRecentEditType[] => {
  if (value === undefined) return [...recentEditTypes];
  if (!Array.isArray(value)) return fail();
  const next: DashboardRecentEditType[] = [];
  for (const entry of value) {
    if (!isOneOf(entry, recentEditTypes)) fail();
    if (!next.includes(entry)) next.push(entry);
  }
  return next.length > 0 ? next : [...recentEditTypes];
};

const normalizeRawConfigForType = (
  type: DashboardWidgetType,
  input: unknown
): Record<string, unknown> => {
  const record = isRecord(input) ? input : {};
  if (record.kind !== undefined && record.kind !== type) {
    fail(DASHBOARD_WIDGET_CONFIG_KIND_MISMATCH);
  }
  return { ...record, kind: type };
};

export function normalizeDashboardWidgetConfig(
  type: DashboardWidgetType,
  config: unknown
): DashboardWidgetConfig {
  const record = normalizeRawConfigForType(type, config);

  switch (type) {
    case "totals-counters": {
      assertAllowedKeys(record, ["kind", "source", "metrics", "accent", "format", "rangeDays"]);
      const source = readEnum(record.source, ["cms", "traffic"] as const, "cms");
      const formatDefault = source === "traffic" ? "number" : "number";
      return {
        kind: type,
        source,
        metrics: readMetricList(record.metrics, source),
        accent: readEnum(record.accent, ["primary", "success", "warning"] as const, "primary"),
        format: readEnum(record.format, ["number", "bytes", "percent"] as const, formatDefault),
        rangeDays: clamp(
          record.rangeDays,
          DASHBOARD_CHART_DEFAULT_RANGE_DAYS,
          1,
          DASHBOARD_CHART_MAX_RANGE_DAYS
        ),
      } satisfies DashboardTotalsCountersConfig;
    }
    case "content-type-counts":
      assertAllowedKeys(record, ["kind", "contentTypeIds", "limit", "display"]);
      return {
        kind: type,
        contentTypeIds: uniqueStrings(record.contentTypeIds, 24),
        limit: clamp(record.limit, 10, 1, DASHBOARD_CONTENT_QUERY_MAX_LIMIT),
        display: readEnum(record.display, ["bars", "list", "donut"] as const, "list"),
      } satisfies DashboardContentTypeCountsConfig;
    case "content-over-time":
      assertAllowedKeys(record, ["kind", "source", "rangeDays", "bucket", "variant"]);
      return {
        kind: type,
        source: readEnum(record.source, ["content", "traffic"] as const, "content"),
        rangeDays: clamp(
          record.rangeDays,
          DASHBOARD_CHART_DEFAULT_RANGE_DAYS,
          1,
          DASHBOARD_CHART_MAX_RANGE_DAYS
        ),
        bucket: readEnum(record.bucket, ["day", "week"] as const, "day"),
        variant: readEnum(record.variant, ["area", "bar"] as const, "area"),
      } satisfies DashboardContentOverTimeConfig;
    case "recent-activity":
      assertAllowedKeys(record, ["kind", "limit", "types"]);
      return {
        kind: type,
        limit: clamp(record.limit, 10, 1, DASHBOARD_RECENT_ACTIVITY_MAX_LIMIT),
        types: readRecentEditTypes(record.types),
      } satisfies DashboardRecentActivityConfig;
    case "storage-usage":
    case "site-health":
    case "security-summary":
      assertAllowedKeys(record, ["kind"]);
      return { kind: type };
    case "quick-actions": {
      assertAllowedKeys(record, ["kind", "actions"]);
      const actions = readQuickActions(record.actions);
      return actions ? { kind: type, actions } : { kind: type };
    }
    case "content-query":
      assertAllowedKeys(record, ["kind", "contentTypeId", "status", "limit", "sort", "order"]);
      return {
        kind: type,
        contentTypeId:
          record.contentTypeId === null || record.contentTypeId === undefined
            ? null
            : readString(record.contentTypeId),
        status:
          record.status === undefined
            ? undefined
            : readEnum(record.status, recentEditStatuses, "draft"),
        limit: clamp(
          record.limit,
          DASHBOARD_CONTENT_QUERY_DEFAULT_LIMIT,
          1,
          DASHBOARD_CONTENT_QUERY_MAX_LIMIT
        ),
        sort: readEnum(record.sort, ["updatedAt", "createdAt", "title"] as const, "updatedAt"),
        order: readEnum(record.order, ["asc", "desc"] as const, "desc"),
      } satisfies DashboardContentQueryConfig;
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

const readQuickActions = (value: unknown): DashboardQuickAction[] | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return fail();
  const actions: DashboardQuickAction[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!isRecord(raw)) return fail();
    assertAllowedKeys(raw, ["id", "label", "target", "icon"]);
    const id = readString(raw.id);
    if (seen.has(id)) continue;
    seen.add(id);
    actions.push({
      id,
      label: readString(raw.label),
      target: readEnum(raw.target, quickActionTargets, "dashboard"),
      icon: readOptionalString(raw.icon),
    });
    if (actions.length >= 8) break;
  }
  return actions;
};

const readPosition = (input: unknown): DashboardWidgetPosition => {
  if (!isRecord(input)) return fail();
  assertAllowedKeys(input, ["x", "y", "w", "h"]);
  const x = clamp(input.x, 0, 0, DASHBOARD_GRID_COLUMNS - 1);
  const maxWidthAtX = Math.max(1, DASHBOARD_GRID_COLUMNS - x);
  return {
    x,
    y: clamp(input.y, 0, 0, 9999),
    w: clamp(input.w, DASHBOARD_WIDGET_MIN_W, DASHBOARD_WIDGET_MIN_W, maxWidthAtX),
    h: clamp(input.h, DASHBOARD_WIDGET_MIN_H, DASHBOARD_WIDGET_MIN_H, DASHBOARD_WIDGET_MAX_H),
  };
};

const readWidgetType = (value: unknown): DashboardWidgetType => {
  if (isOneOf(value, DASHBOARD_WIDGET_TYPES)) return value;
  return fail();
};

const normalizeDashboardWidget = (input: unknown): DashboardWidget => {
  if (!isRecord(input)) return fail();
  assertAllowedKeys(input, ["id", "type", "title", "config", "position"]);
  const type = readWidgetType(input.type);
  const title = readOptionalString(input.title);
  return {
    id: readString(input.id),
    type,
    ...(title ? { title } : {}),
    config: normalizeDashboardWidgetConfig(type, input.config),
    position: readPosition(input.position),
  };
};

export function normalizeDashboardLayout(input: unknown): DashboardLayout {
  if (!isRecord(input)) return fail();
  assertAllowedKeys(input, ["version", "widgets"]);
  if (!Array.isArray(input.widgets)) return fail();
  if (input.widgets.length > DASHBOARD_MAX_WIDGETS) return fail();

  const seen = new Set<string>();
  const widgets: DashboardWidget[] = [];
  for (const rawWidget of input.widgets) {
    const widget = normalizeDashboardWidget(rawWidget);
    if (seen.has(widget.id)) continue;
    seen.add(widget.id);
    widgets.push(widget);
  }

  return { version: DASHBOARD_LAYOUT_VERSION, widgets };
}

const hasWidgets = (input: unknown) =>
  isRecord(input) && Array.isArray(input.widgets) && input.widgets.length > 0;

export function adaptLegacyDashboardLayout(input: unknown): DashboardLayout {
  if (!hasWidgets(input)) return cloneLayout(DEFAULT_DASHBOARD_LAYOUT);
  try {
    return normalizeDashboardLayout(input);
  } catch {
    return cloneLayout(DEFAULT_DASHBOARD_LAYOUT);
  }
}

export function cloneLayout(layout: DashboardLayout): DashboardLayout {
  return {
    version: DASHBOARD_LAYOUT_VERSION,
    widgets: layout.widgets.map((widget) => ({
      ...widget,
      config: cloneConfig(widget.config),
      position: { ...widget.position },
    })),
  };
}
