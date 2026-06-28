import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Sparkline } from "@/ui/shared/Charts";
import { cn } from "@/lib/utils";

/**
 * TASK-479-07-L01: dashboard metric card restyled to the prototype look
 * (`_docs/_PROTOTYPE/src/components/patterns/StatCard.tsx`) — soft Card, muted
 * icon chip, `font-display` value, pill delta. The prop API is kept
 * backward-compatible (label/value/delta/icon/accent/className) and only adds
 * the OPTIONAL `trend`/`spark` so the future swap to the shared
 * `@/ui/shared/StatCard` (479-06-L02 / TASK-480-04) is non-breaking. No
 * fabricated series: callers omit `spark` when no real time-series exists.
 */
type StatCardAccent = "primary" | "success" | "warning";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
  accent?: StatCardAccent;
  trend?: "up" | "down" | "flat";
  spark?: number[];
  className?: string;
};

const accentDeltaTone: Record<StatCardAccent, string> = {
  primary: "bg-success-soft text-success",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

function DeltaPill({
  delta,
  trend,
  accent,
}: {
  delta: string;
  trend: NonNullable<StatCardProps["trend"]>;
  accent: StatCardAccent;
}) {
  const tone =
    trend === "down"
      ? "bg-destructive/10 text-destructive"
      : trend === "flat"
        ? "bg-muted text-muted-foreground"
        : accentDeltaTone[accent];
  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
          tone
        )}
      >
        {trend === "down" ? (
          <ArrowDownRight className="size-3" />
        ) : trend === "up" ? (
          <ArrowUpRight className="size-3" />
        ) : null}
        {delta}
      </span>
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  accent = "primary",
  trend = "up",
  spark,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("gap-0 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {icon ? (
              <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
                {icon}
              </span>
            ) : null}
            {label}
          </div>
          <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
        </div>
        {spark ? (
          <Sparkline data={spark} tone={trend === "down" ? "destructive" : "primary"} />
        ) : null}
      </div>
      {delta ? <DeltaPill delta={delta} trend={trend} accent={accent} /> : null}
    </Card>
  );
}
