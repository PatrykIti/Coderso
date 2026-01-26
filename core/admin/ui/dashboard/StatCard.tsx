import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "warning";
  className?: string;
};

const accentStyles: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "text-primary",
  success: "text-emerald-600",
  warning: "text-amber-600",
};

export function StatCard({
  label,
  value,
  delta,
  icon,
  accent = "primary",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("border-border/60", className)}>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={cn("flex items-center", accentStyles[accent])}>
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-semibold">{value}</p>
          {delta ? (
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <ArrowUpRight className="h-3 w-3" />
              {delta}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
