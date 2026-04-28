import {
  normalizePageLayoutSettings,
  type PageLayoutSettings,
} from "../pages/layoutSettings";

export type WidgetTemplateSettings = {
  layout: PageLayoutSettings;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function normalizeWidgetTemplateSettings(
  input?: unknown
): WidgetTemplateSettings {
  const value = isRecord(input) ? input : {};
  return {
    layout: normalizePageLayoutSettings(value.layout),
  };
}

export function getWidgetTemplateLayoutSettings(
  settings?: unknown
): PageLayoutSettings {
  return normalizeWidgetTemplateSettings(settings).layout;
}
