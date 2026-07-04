import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/ui/shared/SectionCard";
import type {
  DashboardSecuritySummary,
  DashboardStatus,
  DashboardStorageSummary,
} from "../../../services/dashboard/dashboardTypes";

/**
 * TASK-479-07-L01: site-health card restyled inside the shared `SectionCard`
 * with token-driven Badge tones (no hardcoded emerald/amber/red). Data slices
 * (`storage`/`security`) and the derived metrics are unchanged.
 */
const statusBadge: Record<
  DashboardStatus,
  { variant: "success" | "warning" | "destructive"; label: string }
> = {
  ok: { variant: "success", label: "Good" },
  warning: { variant: "warning", label: "Warning" },
  critical: { variant: "destructive", label: "Critical" },
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

type SiteHealthCardProps = {
  storage: DashboardStorageSummary;
  security: DashboardSecuritySummary;
};

export function SiteHealthCard({ storage, security }: SiteHealthCardProps) {
  const storagePercent = storage.usedPercent ?? 0;
  const securityScore =
    security.checks.length === 0
      ? 100
      : Math.round(((security.checks.length - security.issues) / security.checks.length) * 100);

  const metrics = [
    {
      label: "Storage Usage",
      value: storagePercent,
      display:
        storage.usedPercent === null
          ? `${formatBytes(storage.usedBytes)} (no limit)`
          : `${storage.usedPercent}%`,
    },
    {
      label: "Security Checks",
      value: securityScore,
      display: `${security.checks.length - security.issues}/${security.checks.length} passing`,
    },
  ];

  const badge = statusBadge[security.status];

  return (
    <SectionCard title="Site Health" action={<Badge variant={badge.variant}>{badge.label}</Badge>}>
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{metric.label}</span>
              <span className="font-medium">{metric.display}</span>
            </div>
            <Progress value={metric.value} className="h-2" />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
