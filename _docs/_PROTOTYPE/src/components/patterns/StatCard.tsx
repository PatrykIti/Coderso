import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/patterns/charts";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  delta,
  trend = "up",
  icon,
  spark,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  spark?: number[];
  hint?: ReactNode;
}) {
  return (
    <Card className="p-5">
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
      {delta || hint ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                trend === "down"
                  ? "bg-destructive/10 text-destructive"
                  : trend === "flat"
                    ? "bg-muted text-muted-foreground"
                    : "bg-success-soft text-success",
              )}
            >
              {trend === "down" ? (
                <ArrowDownRight className="size-3" />
              ) : trend === "up" ? (
                <ArrowUpRight className="size-3" />
              ) : null}
              {delta}
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      ) : null}
    </Card>
  );
}
