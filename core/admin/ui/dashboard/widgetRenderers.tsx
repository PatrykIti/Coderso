import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AreaChart, BarChart, Donut } from "@/ui/shared/Charts";
import { DataTable } from "@/ui/shared/DataTable";
import { AdminLink } from "@/ui/shared/AdminLink";
import { SectionCard } from "@/ui/shared/SectionCard";
import { StatusBadge } from "@/ui/shared/StatusBadge";
import { RecentEditsTable } from "@/ui/dashboard/RecentEditsTable";
import { SecurityStatusCard } from "@/ui/dashboard/SecurityStatusCard";
import { StatCard } from "@/ui/dashboard/StatCard";
import type {
  DashboardSecuritySummary,
  DashboardWidget,
  DashboardWidgetData,
  DashboardWidgetType,
} from "../../../services/dashboard/dashboardTypes";

// Props every dashboard-widget renderer receives. `data` is the already-narrowed
// data variant for this widget type (or `undefined` when the host has no matching
// payload); the host owns discriminant + error handling before dispatch, so each
// renderer body sees ONLY its own data shape.
export type DashboardWidgetRendererProps<T extends DashboardWidgetType = DashboardWidgetType> = {
  widget: DashboardWidget;
  data?: Extract<DashboardWidgetData, { type: T }>;
};

export type WidgetRenderer<T extends DashboardWidgetType = DashboardWidgetType> = ComponentType<
  DashboardWidgetRendererProps<T>
>;

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

const toDateLabel = (value: string) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const quickActionHref = (target: string) => {
  if (target === "pages") return "/pages";
  if (target === "entries") return "/content";
  if (target === "media") return "/media";
  if (target === "analytics") return "/analytics";
  if (target === "settings") return "/settings";
  return "/admin";
};

export function UnavailableWidget({ widget }: { widget: DashboardWidget }) {
  return (
    <SectionCard title={widget.title ?? "Widget"} description="Data unavailable">
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
        This widget has no data for the current source.
      </div>
    </SectionCard>
  );
}

export function TotalsCountersWidget({
  widget,
  data,
}: DashboardWidgetRendererProps<"totals-counters">) {
  if (!data) return <UnavailableWidget widget={widget} />;
  return (
    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {data.counters.map((counter) => (
        <StatCard
          key={counter.key}
          label={counter.label}
          value={counter.formatted}
          delta={counter.delta?.label}
          trend={counter.delta?.trend}
          spark={counter.spark}
          className="h-full"
        />
      ))}
    </div>
  );
}

export function ContentTypeCountsWidget({
  widget,
  data,
}: DashboardWidgetRendererProps<"content-type-counts">) {
  if (!data) return <UnavailableWidget widget={widget} />;
  const max = Math.max(...data.counts.map((row) => row.count), 1);
  return (
    <SectionCard title={widget.title ?? "Content Types"}>
      {data.counts.length === 0 ? (
        <div className="py-6 text-sm text-muted-foreground">No content types yet.</div>
      ) : data.segments ? (
        <div className="flex flex-col items-center gap-4">
          <Donut segments={data.segments} />
          <div className="grid w-full gap-2 text-sm">
            {data.segments.map((segment) => (
              <div key={segment.label} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: segment.color }} />
                <span className="text-muted-foreground">{segment.label}</span>
                <span className="ml-auto font-medium">{segment.value.toLocaleString("en-US")}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.counts.map((row) => (
            <div key={row.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{row.label}</span>
                <span className="text-muted-foreground">{row.count.toLocaleString("en-US")}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function ContentOverTimeWidget({
  widget,
  data,
}: DashboardWidgetRendererProps<"content-over-time">) {
  if (!data) return <UnavailableWidget widget={widget} />;
  const primary = data.series[0]?.points ?? [];
  return (
    <SectionCard
      title={widget.title ?? "Timeline"}
      description={data.categories.slice(-2).map(toDateLabel).join(" - ")}
    >
      {data.variant === "bar" ? (
        <BarChart data={primary} labels={data.categories.map(toDateLabel)} />
      ) : (
        <AreaChart data={primary} tone="primary" />
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {data.series.map((series) => (
          <Badge key={series.id} variant="secondary">
            {series.label}
          </Badge>
        ))}
      </div>
    </SectionCard>
  );
}

export function RecentActivityWidget({
  widget,
  data,
}: DashboardWidgetRendererProps<"recent-activity">) {
  return (
    <SectionCard title={widget.title ?? "Recent Activity"} padded={false} bodyClassName="p-0">
      <RecentEditsTable items={data?.items ?? []} />
    </SectionCard>
  );
}

export function StorageUsageWidget({
  widget,
  data,
}: DashboardWidgetRendererProps<"storage-usage">) {
  if (!data) return <UnavailableWidget widget={widget} />;
  return (
    <SectionCard title={widget.title ?? "Storage Usage"}>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Used</span>
          <span className="font-medium">
            {data.usedPercent === null
              ? `${formatBytes(data.usedBytes)} / no limit`
              : `${data.usedPercent}%`}
          </span>
        </div>
        <Progress value={data.usedPercent ?? 0} className="h-2" />
        <div className="text-xs text-muted-foreground">
          {formatBytes(data.usedBytes)}
          {data.limitBytes ? ` of ${formatBytes(data.limitBytes)}` : " stored"}
        </div>
      </div>
    </SectionCard>
  );
}

export function SiteHealthWidget({ widget, data }: DashboardWidgetRendererProps<"site-health">) {
  if (!data) return <UnavailableWidget widget={widget} />;
  const storagePercent = data.storage.usedPercent ?? 0;
  const securityScore =
    data.security.checks.length === 0
      ? 100
      : Math.round(
          ((data.security.checks.length - data.security.issues) / data.security.checks.length) * 100
        );
  return (
    <SectionCard
      title={widget.title ?? "Site Health"}
      action={<StatusBadge status={data.security.status} />}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium">
              {data.storage.usedPercent === null ? "No limit" : `${storagePercent}%`}
            </span>
          </div>
          <Progress value={storagePercent} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Security</span>
            <span className="font-medium">{securityScore}%</span>
          </div>
          <Progress value={securityScore} className="h-2" />
        </div>
      </div>
    </SectionCard>
  );
}

export function SecuritySummaryWidget({ data }: DashboardWidgetRendererProps<"security-summary">) {
  if (!data) {
    const empty: DashboardSecuritySummary = { status: "ok", issues: 0, checks: [] };
    return <SecurityStatusCard summary={empty} />;
  }
  return <SecurityStatusCard summary={data.security} />;
}

export function QuickActionsWidget({
  widget,
  data,
}: DashboardWidgetRendererProps<"quick-actions">) {
  if (!data) return <UnavailableWidget widget={widget} />;
  return (
    <SectionCard title={widget.title ?? "Quick Actions"}>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.actions.map((action) => (
          <Button key={action.id} asChild variant="outline" className="justify-start">
            <AdminLink href={quickActionHref(action.target)} prefetch>
              {action.label}
            </AdminLink>
          </Button>
        ))}
      </div>
    </SectionCard>
  );
}

export function ContentQueryWidget({
  widget,
  data,
}: DashboardWidgetRendererProps<"content-query">) {
  if (!data) return <UnavailableWidget widget={widget} />;
  return (
    <SectionCard title={widget.title ?? "Content Query"} padded={false} bodyClassName="p-0">
      {data.rows.length === 0 ? (
        <div className="px-5 py-8 text-sm text-muted-foreground">No matching entries.</div>
      ) : (
        <DataTable
          className="rounded-none border-0 shadow-none"
          columns={data.columns.map((column) => ({
            key: column.key,
            header: column.label,
            render: (row) =>
              column.key === "status" ? (
                <StatusBadge status={String(row[column.key] ?? "")} />
              ) : (
                String(row[column.key] ?? "")
              ),
          }))}
          rows={data.rows}
        />
      )}
    </SectionCard>
  );
}
