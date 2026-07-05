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
import type { DashboardWidgetType } from "../../../services/dashboard/dashboardTypes";

export type DashboardWidgetDescriptor = {
  type: DashboardWidgetType;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  defaultPosition: DashboardWidget["position"];
};

export const dashboardWidgetCatalog: DashboardWidgetDescriptor[] = [
  {
    type: "totals-counters",
    title: "Counters",
    description: "CMS or traffic totals",
    icon: Gauge,
    defaultPosition: { x: 0, y: 0, w: 12, h: 1 },
  },
  {
    type: "content-type-counts",
    title: "Content Types",
    description: "Entry counts by collection",
    icon: Database,
    defaultPosition: { x: 0, y: 0, w: 6, h: 3 },
  },
  {
    type: "content-over-time",
    title: "Timeline",
    description: "Content or traffic trend",
    icon: BarChart3,
    defaultPosition: { x: 0, y: 0, w: 8, h: 3 },
  },
  {
    type: "recent-activity",
    title: "Recent Activity",
    description: "Latest content and media changes",
    icon: FileClock,
    defaultPosition: { x: 0, y: 0, w: 8, h: 3 },
  },
  {
    type: "storage-usage",
    title: "Storage",
    description: "Media storage usage",
    icon: LayoutDashboard,
    defaultPosition: { x: 0, y: 0, w: 4, h: 2 },
  },
  {
    type: "site-health",
    title: "Site Health",
    description: "Storage and security status",
    icon: ListChecks,
    defaultPosition: { x: 0, y: 0, w: 4, h: 2 },
  },
  {
    type: "security-summary",
    title: "Security",
    description: "Admin protection checks",
    icon: ShieldCheck,
    defaultPosition: { x: 0, y: 0, w: 4, h: 2 },
  },
  {
    type: "quick-actions",
    title: "Quick Actions",
    description: "Common admin shortcuts",
    icon: Zap,
    defaultPosition: { x: 0, y: 0, w: 4, h: 2 },
  },
  {
    type: "content-query",
    title: "Content Query",
    description: "Filtered entry list",
    icon: ClipboardList,
    defaultPosition: { x: 0, y: 0, w: 8, h: 3 },
  },
];

export const getDashboardWidgetDescriptor = (type: DashboardWidgetType) =>
  dashboardWidgetCatalog.find((item) => item.type === type) ?? dashboardWidgetCatalog[0];

export function createDashboardWidget(type: DashboardWidgetType, y: number): DashboardWidget {
  const descriptor = getDashboardWidgetDescriptor(type);
  return {
    id: `dashboard-${type}-${Date.now().toString(36)}`,
    type,
    title: descriptor.title,
    config: JSON.parse(JSON.stringify(DASHBOARD_WIDGET_DEFAULT_CONFIG[type])),
    position: { ...descriptor.defaultPosition, y },
  };
}
