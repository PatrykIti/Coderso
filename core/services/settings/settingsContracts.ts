import {
  normalizeContentRouteDetailPath,
  normalizeContentRouteListPath,
} from "./contentRoutePaths";
import { normalizeOptionalDetailPageId } from "./detailPageIdContract";

export type ContentRouteSetting = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

export const normalizeContentRoutes = (value: unknown): ContentRouteSetting[] => {
  if (!Array.isArray(value)) {
    throw new Error("settings_value_invalid");
  }
  const seenTypes = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("settings_value_invalid");
    }
    const record = entry as {
      type?: unknown;
      listPath?: unknown;
      detailPath?: unknown;
      enabled?: unknown;
      detailPageId?: unknown;
    };
    if (typeof record.type !== "string") {
      throw new Error("settings_value_invalid");
    }
    const type = record.type.trim();
    if (!type) {
      throw new Error("settings_value_invalid");
    }
    if (seenTypes.has(type)) {
      throw new Error("settings_value_invalid");
    }
    seenTypes.add(type);
    const listPath = normalizeContentRouteListPath(record.listPath);
    const detailPath = normalizeContentRouteDetailPath(record.detailPath);
    if (record.enabled !== undefined && typeof record.enabled !== "boolean") {
      throw new Error("settings_value_invalid");
    }
    const normalized = {
      type,
      listPath,
      detailPath,
      enabled: record.enabled ?? true,
    };
    return Object.prototype.hasOwnProperty.call(record, "detailPageId")
      ? {
          ...normalized,
          detailPageId: normalizeOptionalDetailPageId(record.detailPageId),
        }
      : normalized;
  });
};
