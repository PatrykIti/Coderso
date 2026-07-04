import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/ui/shared/SectionCard";
import type {
  DashboardSecuritySummary,
  DashboardStatus,
} from "../../../services/dashboard/dashboardTypes";

/**
 * TASK-479-07-L01: security-status card restyled inside the shared `SectionCard`
 * with token-driven tones (success/warning/destructive) in place of the
 * hardcoded emerald/amber/red. The `security` data slice is unchanged.
 */
const statusBadge: Record<
  DashboardStatus,
  { variant: "success" | "warning" | "destructive"; label: string }
> = {
  ok: { variant: "success", label: "Good" },
  warning: { variant: "warning", label: "Warning" },
  critical: { variant: "destructive", label: "Critical" },
};

const statusIcon = (status: DashboardStatus) => {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
};

type SecurityStatusCardProps = {
  summary: DashboardSecuritySummary;
};

export function SecurityStatusCard({ summary }: SecurityStatusCardProps) {
  const badge = statusBadge[summary.status];

  return (
    <SectionCard
      title="Security Status"
      icon={<ShieldCheck />}
      description={
        summary.issues === 0
          ? "All checks passed."
          : `${summary.issues} issue${summary.issues === 1 ? "" : "s"} detected.`
      }
      action={<Badge variant={badge.variant}>{badge.label}</Badge>}
    >
      {summary.checks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No security checks reported.</p>
      ) : (
        <div className="space-y-3 text-sm text-muted-foreground">
          {summary.checks.map((check) => (
            <div key={check.id} className="flex items-start gap-2">
              {statusIcon(check.status)}
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{check.label}</div>
                <div className="text-xs text-muted-foreground">{check.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
