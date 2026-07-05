import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Maximize2,
  Minimize2,
  Settings,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
  DashboardWidgetResolution,
} from "../../../services/dashboard/dashboardTypes";

type WidgetAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "wider"
  | "narrower"
  | "configure"
  | "remove";

type DashboardWidgetHostProps = {
  widget: DashboardWidget;
  data?: DashboardWidgetResolution;
  editMode: boolean;
  selected?: boolean;
  onAction?: (action: WidgetAction) => void;
};

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

function IconAction({
  label,
  icon,
  onClick,
  variant = "ghost",
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "destructive";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={variant}
          className="size-8"
          aria-label={label}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

const unwrap = <T extends DashboardWidgetData["type"]>(
  data: DashboardWidgetResolution | undefined,
  type: T
): Extract<DashboardWidgetData, { type: T }> | null => {
  if (!data || "error" in data || data.type !== type) return null;
  return data as Extract<DashboardWidgetData, { type: T }>;
};

function UnavailableWidget({ widget }: { widget: DashboardWidget }) {
  return (
    <SectionCard title={widget.title ?? "Widget"} description="Data unavailable">
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
        This widget has no data for the current source.
      </div>
    </SectionCard>
  );
}

function TotalsWidget({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data?: DashboardWidgetResolution;
}) {
  const payload = unwrap(data, "totals-counters");
  if (!payload) return <UnavailableWidget widget={widget} />;
  return (
    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {payload.counters.map((counter) => (
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

function CountsWidget({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data?: DashboardWidgetResolution;
}) {
  const payload = unwrap(data, "content-type-counts");
  if (!payload) return <UnavailableWidget widget={widget} />;
  const max = Math.max(...payload.counts.map((row) => row.count), 1);
  return (
    <SectionCard title={widget.title ?? "Content Types"}>
      {payload.counts.length === 0 ? (
        <div className="py-6 text-sm text-muted-foreground">No content types yet.</div>
      ) : payload.segments ? (
        <div className="flex flex-col items-center gap-4">
          <Donut segments={payload.segments} />
          <div className="grid w-full gap-2 text-sm">
            {payload.segments.map((segment) => (
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
          {payload.counts.map((row) => (
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

function TimelineWidget({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data?: DashboardWidgetResolution;
}) {
  const payload = unwrap(data, "content-over-time");
  if (!payload) return <UnavailableWidget widget={widget} />;
  const primary = payload.series[0]?.points ?? [];
  return (
    <SectionCard
      title={widget.title ?? "Timeline"}
      description={payload.categories.slice(-2).map(toDateLabel).join(" - ")}
    >
      {payload.variant === "bar" ? (
        <BarChart data={primary} labels={payload.categories.map(toDateLabel)} />
      ) : (
        <AreaChart data={primary} tone="primary" />
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {payload.series.map((series) => (
          <Badge key={series.id} variant="secondary">
            {series.label}
          </Badge>
        ))}
      </div>
    </SectionCard>
  );
}

function StorageWidget({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data?: DashboardWidgetResolution;
}) {
  const payload = unwrap(data, "storage-usage");
  if (!payload) return <UnavailableWidget widget={widget} />;
  return (
    <SectionCard title={widget.title ?? "Storage Usage"}>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Used</span>
          <span className="font-medium">
            {payload.usedPercent === null
              ? `${formatBytes(payload.usedBytes)} / no limit`
              : `${payload.usedPercent}%`}
          </span>
        </div>
        <Progress value={payload.usedPercent ?? 0} className="h-2" />
        <div className="text-xs text-muted-foreground">
          {formatBytes(payload.usedBytes)}
          {payload.limitBytes ? ` of ${formatBytes(payload.limitBytes)}` : " stored"}
        </div>
      </div>
    </SectionCard>
  );
}

function SiteHealthWidget({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data?: DashboardWidgetResolution;
}) {
  const payload = unwrap(data, "site-health");
  if (!payload) return <UnavailableWidget widget={widget} />;
  const storagePercent = payload.storage.usedPercent ?? 0;
  const securityScore =
    payload.security.checks.length === 0
      ? 100
      : Math.round(
          ((payload.security.checks.length - payload.security.issues) /
            payload.security.checks.length) *
            100
        );
  return (
    <SectionCard
      title={widget.title ?? "Site Health"}
      action={<StatusBadge status={payload.security.status} />}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium">
              {payload.storage.usedPercent === null ? "No limit" : `${storagePercent}%`}
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

function SecurityWidget({ data }: { data?: DashboardWidgetResolution }) {
  const payload = unwrap(data, "security-summary");
  if (!payload) {
    const empty: DashboardSecuritySummary = { status: "ok", issues: 0, checks: [] };
    return <SecurityStatusCard summary={empty} />;
  }
  return <SecurityStatusCard summary={payload.security} />;
}

function QuickActionsWidget({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data?: DashboardWidgetResolution;
}) {
  const payload = unwrap(data, "quick-actions");
  if (!payload) return <UnavailableWidget widget={widget} />;
  return (
    <SectionCard title={widget.title ?? "Quick Actions"}>
      <div className="grid gap-2 sm:grid-cols-2">
        {payload.actions.map((action) => (
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

function ContentQueryWidget({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data?: DashboardWidgetResolution;
}) {
  const payload = unwrap(data, "content-query");
  if (!payload) return <UnavailableWidget widget={widget} />;
  return (
    <SectionCard title={widget.title ?? "Content Query"} padded={false} bodyClassName="p-0">
      {payload.rows.length === 0 ? (
        <div className="px-5 py-8 text-sm text-muted-foreground">No matching entries.</div>
      ) : (
        <DataTable
          className="rounded-none border-0 shadow-none"
          columns={payload.columns.map((column) => ({
            key: column.key,
            header: column.label,
            render: (row) =>
              column.key === "status" ? (
                <StatusBadge status={String(row[column.key] ?? "")} />
              ) : (
                String(row[column.key] ?? "")
              ),
          }))}
          rows={payload.rows}
        />
      )}
    </SectionCard>
  );
}

function renderWidget(widget: DashboardWidget, data?: DashboardWidgetResolution) {
  if (data && "error" in data) return <UnavailableWidget widget={widget} />;
  switch (widget.type) {
    case "totals-counters":
      return <TotalsWidget widget={widget} data={data} />;
    case "content-type-counts":
      return <CountsWidget widget={widget} data={data} />;
    case "content-over-time":
      return <TimelineWidget widget={widget} data={data} />;
    case "recent-activity": {
      const payload = unwrap(data, "recent-activity");
      return (
        <SectionCard title={widget.title ?? "Recent Activity"} padded={false} bodyClassName="p-0">
          <RecentEditsTable items={payload?.items ?? []} />
        </SectionCard>
      );
    }
    case "storage-usage":
      return <StorageWidget widget={widget} data={data} />;
    case "site-health":
      return <SiteHealthWidget widget={widget} data={data} />;
    case "security-summary":
      return <SecurityWidget data={data} />;
    case "quick-actions":
      return <QuickActionsWidget widget={widget} data={data} />;
    case "content-query":
      return <ContentQueryWidget widget={widget} data={data} />;
    default:
      return <UnavailableWidget widget={widget} />;
  }
}

export function DashboardWidgetHost({
  widget,
  data,
  editMode,
  selected,
  onAction,
}: DashboardWidgetHostProps) {
  return (
    <div
      className={cn(
        "relative h-full min-h-40 rounded-lg",
        editMode && "outline outline-1 outline-dashed outline-border",
        selected && "outline-2 outline-primary"
      )}
      data-widget-id={widget.id}
      data-widget-type={widget.type}
    >
      {editMode ? (
        <div className="absolute right-2 top-2 z-10 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-soft">
          <IconAction
            label="Move left"
            icon={<ArrowLeft className="size-4" />}
            onClick={() => onAction?.("left")}
          />
          <IconAction
            label="Move right"
            icon={<ArrowRight className="size-4" />}
            onClick={() => onAction?.("right")}
          />
          <IconAction
            label="Move up"
            icon={<ArrowUp className="size-4" />}
            onClick={() => onAction?.("up")}
          />
          <IconAction
            label="Move down"
            icon={<ArrowDown className="size-4" />}
            onClick={() => onAction?.("down")}
          />
          <IconAction
            label="Wider"
            icon={<Maximize2 className="size-4" />}
            onClick={() => onAction?.("wider")}
          />
          <IconAction
            label="Narrower"
            icon={<Minimize2 className="size-4" />}
            onClick={() => onAction?.("narrower")}
          />
          <IconAction
            label="Configure"
            icon={<Settings className="size-4" />}
            onClick={() => onAction?.("configure")}
          />
          <IconAction
            label="Remove"
            icon={<Trash2 className="size-4" />}
            variant="destructive"
            onClick={() => onAction?.("remove")}
          />
        </div>
      ) : null}
      <div className={cn("h-full", editMode && "pt-11")}>{renderWidget(widget, data)}</div>
    </div>
  );
}
