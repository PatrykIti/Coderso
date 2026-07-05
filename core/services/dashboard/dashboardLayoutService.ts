import {
  adaptLegacyDashboardLayout,
  cloneLayout,
  DASHBOARD_LAYOUT_INVALID,
  DEFAULT_DASHBOARD_LAYOUT,
  normalizeDashboardLayout,
} from "./dashboardWidgetContract";
import type { DashboardLayout } from "./dashboardTypes";

export class DashboardLayoutError extends Error {
  public readonly code: string;

  constructor(code = DASHBOARD_LAYOUT_INVALID) {
    super(code);
    this.name = "DashboardLayoutError";
    this.code = code;
  }
}

export function parseDashboardLayoutForWrite(input: unknown): DashboardLayout {
  try {
    return normalizeDashboardLayout(input);
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw new DashboardLayoutError(error.message);
    }
    throw new DashboardLayoutError();
  }
}

export function readDashboardLayoutFromStorage(input: unknown): DashboardLayout {
  return adaptLegacyDashboardLayout(input);
}

export function getDefaultDashboardLayout(): DashboardLayout {
  return cloneLayout(DEFAULT_DASHBOARD_LAYOUT);
}
