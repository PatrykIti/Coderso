import type { LucideIcon } from "lucide-react";
import { Link2, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type IntegrationStatus = "connected" | "disconnected";

type IntegrationAccent = "amber" | "orange" | "rose" | "violet";

export type IntegrationCardProps = {
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: LucideIcon;
  accent: IntegrationAccent;
  className?: string;
};

const accentStyles: Record<IntegrationAccent, string> = {
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  orange: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  rose: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  violet: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
};

const statusStyles: Record<IntegrationStatus, string> = {
  connected:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400",
  disconnected:
    "border-slate-300/60 bg-slate-200/60 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};

const statusDotStyles: Record<IntegrationStatus, string> = {
  connected: "bg-emerald-500",
  disconnected: "bg-slate-400 dark:bg-slate-500",
};

const actionMeta = {
  connected: {
    label: "Configure",
    variant: "outline" as const,
    Icon: Settings,
  },
  disconnected: {
    label: "Connect",
    variant: "default" as const,
    Icon: Link2,
  },
};

const statusLabels: Record<IntegrationStatus, string> = {
  connected: "Connected",
  disconnected: "Not connected",
};

export function IntegrationCard({
  name,
  description,
  status,
  icon: Icon,
  accent,
  className,
}: IntegrationCardProps) {
  const action = actionMeta[status];

  return (
    <Card
      className={cn(
        "gap-5 border-border/60 p-6 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", accentStyles[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <Badge variant="outline" className={cn("gap-2 border-transparent text-[10px]", statusStyles[status])}>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDotStyles[status])} />
          {statusLabels[status]}
        </Badge>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant={action.variant} className="mt-auto w-full">
        <action.Icon className="h-4 w-4" />
        {action.label}
      </Button>
    </Card>
  );
}
