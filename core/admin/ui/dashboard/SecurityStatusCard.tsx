import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardSecuritySummary } from "../../../services/dashboard/dashboardTypes";

const statusBadgeStyles: Record<DashboardSecuritySummary["status"], string> = {
  ok: "bg-emerald-500/15 text-emerald-700",
  warning: "bg-amber-500/15 text-amber-700",
  critical: "bg-red-500/15 text-red-700",
};

const statusLabel: Record<DashboardSecuritySummary["status"], string> = {
  ok: "Good",
  warning: "Warning",
  critical: "Critical",
};

const statusIcon = (status: DashboardSecuritySummary["status"]) => {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
};

type SecurityStatusCardProps = {
  summary: DashboardSecuritySummary;
};

export function SecurityStatusCard({ summary }: SecurityStatusCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Security Status</h3>
            <p className="text-xs text-muted-foreground">
              {summary.issues === 0
                ? "All checks passed."
                : `${summary.issues} issue${summary.issues === 1 ? "" : "s"} detected.`}
            </p>
          </div>
        </div>
        <div className="space-y-2 border-t pt-3 text-sm text-muted-foreground">
          {summary.checks.map((check) => (
            <div key={check.id} className="flex items-start gap-2">
              {statusIcon(check.status)}
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {check.label}
                </div>
                <div className="text-xs text-muted-foreground">{check.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          className={`w-full ${statusBadgeStyles[summary.status]}`}
          disabled
        >
          Security: {statusLabel[summary.status]}
        </Button>
      </CardContent>
    </Card>
  );
}
