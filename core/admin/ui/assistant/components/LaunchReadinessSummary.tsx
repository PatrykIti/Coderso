import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AssistantActionPlanResponse } from "@/services/assistantClient";

type LaunchReadinessMetadata = NonNullable<
  NonNullable<AssistantActionPlanResponse["metadata"]>["launchReadiness"]
>;
type LaunchReadinessCheck = LaunchReadinessMetadata["checks"][number];

type LaunchReadinessSummaryProps = {
  readiness?: LaunchReadinessMetadata | null;
};

const secretLikeTextPattern =
  /(token|secret|password|api[-_]?key|credential|cookie|csrf|authorization|bearer)/i;

const redactUiText = (value: string) => (secretLikeTextPattern.test(value) ? "[redacted]" : value);

const statusLabel: Record<LaunchReadinessCheck["status"], string> = {
  satisfied: "Satisfied",
  pending_execute: "Pending execute",
  gated: "Gated",
};

const statusVariant = (status: LaunchReadinessCheck["status"]) => {
  if (status === "satisfied") return "default";
  if (status === "gated") return "destructive";
  return "outline";
};

const StatusIcon = ({ status }: { status: LaunchReadinessCheck["status"] }) => {
  if (status === "satisfied") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "gated") return <ShieldAlert className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
};

export function LaunchReadinessSummary({ readiness }: LaunchReadinessSummaryProps) {
  if (!readiness) return null;

  const minimumEntryTotal = Object.values(readiness.minimumPublishedEntries).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Launch readiness
      </p>
      <div className="space-y-3 rounded-lg border bg-background px-3 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{readiness.requiredPages.length} pages</Badge>
          <Badge variant="outline">{readiness.requiredCatalogs.length} catalogs</Badge>
          <Badge variant="outline">{minimumEntryTotal} minimum entries</Badge>
        </div>
        <div className="space-y-2">
          {readiness.checks.map((check) => (
            <div key={check.id} className="rounded-md border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{redactUiText(check.label)}</span>
                <Badge variant={statusVariant(check.status)} className="gap-1">
                  <StatusIcon status={check.status} />
                  {statusLabel[check.status]}
                </Badge>
              </div>
              {check.evidence.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Evidence: {check.evidence.map(redactUiText).join(", ")}
                </p>
              ) : null}
              {check.gates.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Gates: {check.gates.map(redactUiText).join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
