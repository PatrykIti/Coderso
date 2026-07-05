import { resolveDashboardWidgets, type DashboardDataReaders } from "./dashboardDataSources";
import {
  DASHBOARD_LAYOUT_INVALID,
  DASHBOARD_MAX_WIDGETS,
  normalizeDashboardWidgetConfig,
} from "./dashboardWidgetContract";
import {
  DASHBOARD_WIDGET_TYPES,
  type DashboardWidget,
  type DashboardWidgetResolution,
} from "./dashboardTypes";

export type DashboardWidgetDataRequest = {
  widgets: Array<{
    id: string;
    type: DashboardWidget["type"];
    title?: string;
    config?: unknown;
  }>;
};

export type DashboardWidgetDataEntry = {
  id: string;
  type: DashboardWidget["type"];
  data: DashboardWidgetResolution;
};

export type DashboardWidgetDataResponse = {
  generatedAt: string;
  widgets: DashboardWidgetDataEntry[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const readString = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(DASHBOARD_LAYOUT_INVALID);
  }
  return value.trim();
};

const readWidgetType = (value: unknown): DashboardWidget["type"] => {
  if (typeof value === "string" && (DASHBOARD_WIDGET_TYPES as readonly string[]).includes(value)) {
    return value as DashboardWidget["type"];
  }
  throw new Error(DASHBOARD_LAYOUT_INVALID);
};

function parseRequest(input: unknown): DashboardWidget[] {
  if (!isRecord(input) || !Array.isArray(input.widgets)) {
    throw new Error(DASHBOARD_LAYOUT_INVALID);
  }
  if (input.widgets.length > DASHBOARD_MAX_WIDGETS) {
    throw new Error(DASHBOARD_LAYOUT_INVALID);
  }

  return input.widgets.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(DASHBOARD_LAYOUT_INVALID);
    const allowedKeys = new Set(["id", "type", "title", "config"]);
    for (const key of Object.keys(raw)) {
      if (!allowedKeys.has(key)) throw new Error(DASHBOARD_LAYOUT_INVALID);
    }
    const type = readWidgetType(raw.type);
    const title = raw.title === undefined ? undefined : readString(raw.title);
    return {
      id: readString(raw.id),
      type,
      title,
      config: normalizeDashboardWidgetConfig(type, raw.config),
      position: { x: 0, y: index, w: 12, h: 1 },
    };
  });
}

export async function resolveWidgetDataBatch(
  input: unknown,
  readers?: DashboardDataReaders
): Promise<DashboardWidgetDataResponse> {
  const widgets = parseRequest(input);
  const resolved = await resolveDashboardWidgets({ version: 1, widgets }, readers);
  return {
    generatedAt: new Date().toISOString(),
    widgets: widgets.map((widget, index) => ({
      id: widget.id,
      type: widget.type,
      data: resolved[index] ?? { type: widget.type, error: "widget_data_unavailable" },
    })),
  };
}

export async function resolveSavedLayoutWidgetData(
  userId: string,
  readers?: DashboardDataReaders
): Promise<DashboardWidgetDataResponse> {
  const { getDashboardLayoutForUser } = await import("./dashboardLayoutRepository");
  const { layout } = await getDashboardLayoutForUser(userId);
  const resolved = await resolveDashboardWidgets(layout, readers);
  return {
    generatedAt: new Date().toISOString(),
    widgets: layout.widgets.map((widget, index) => ({
      id: widget.id,
      type: widget.type,
      data: resolved[index] ?? { type: widget.type, error: "widget_data_unavailable" },
    })),
  };
}
