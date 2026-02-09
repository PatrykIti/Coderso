import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  DashboardSecuritySummary,
  DashboardStorageSummary,
} from "../../../services/dashboard/dashboardTypes";

const toStatusLabel = (status: DashboardSecuritySummary["status"]) => {
  if (status === "ok") return "Good";
  if (status === "warning") return "Warning";
  return "Critical";
};

const toStatusClass = (status: DashboardSecuritySummary["status"]) => {
  if (status === "ok") return "bg-emerald-500/15 text-emerald-700";
  if (status === "warning") return "bg-amber-500/15 text-amber-700";
  return "bg-red-500/15 text-red-700";
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
      : Math.round(
          ((security.checks.length - security.issues) / security.checks.length) * 100
        );

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

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Site Health</h3>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${toStatusClass(
              security.status
            )}`}
          >
            {toStatusLabel(security.status)}
          </span>
        </div>
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
      </CardContent>
    </Card>
  );
}
