import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { dashboardLayouts } from "../../db/schema";
import {
  getDefaultDashboardLayout,
  parseDashboardLayoutForWrite,
  readDashboardLayoutFromStorage,
} from "./dashboardLayoutService";
import { DASHBOARD_LAYOUT_VERSION, type DashboardLayout } from "./dashboardTypes";

export type StoredDashboardLayout = {
  layout: DashboardLayout;
  updatedAt: string | null;
};

const toIso = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

export async function getDashboardLayoutForUser(userId: string): Promise<StoredDashboardLayout> {
  const [row] = await db
    .select({
      layout: dashboardLayouts.layout,
      updatedAt: dashboardLayouts.updatedAt,
    })
    .from(dashboardLayouts)
    .where(eq(dashboardLayouts.userId, userId))
    .limit(1);

  if (!row) {
    return { layout: getDefaultDashboardLayout(), updatedAt: null };
  }

  return {
    layout: readDashboardLayoutFromStorage(row.layout),
    updatedAt: toIso(row.updatedAt),
  };
}

export async function saveDashboardLayoutForUser(
  userId: string,
  input: unknown
): Promise<StoredDashboardLayout> {
  const layout = parseDashboardLayoutForWrite(input);
  const [row] = await db
    .insert(dashboardLayouts)
    .values({
      userId,
      schemaVersion: DASHBOARD_LAYOUT_VERSION,
      layout,
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: dashboardLayouts.userId,
      set: {
        schemaVersion: DASHBOARD_LAYOUT_VERSION,
        layout,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    })
    .returning({
      layout: dashboardLayouts.layout,
      updatedAt: dashboardLayouts.updatedAt,
    });

  return {
    layout: readDashboardLayoutFromStorage(row?.layout),
    updatedAt: toIso(row?.updatedAt),
  };
}

export async function resetDashboardLayoutForUser(userId: string): Promise<StoredDashboardLayout> {
  await db.delete(dashboardLayouts).where(eq(dashboardLayouts.userId, userId));
  return { layout: getDefaultDashboardLayout(), updatedAt: null };
}
