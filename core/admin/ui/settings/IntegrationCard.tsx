import type { LucideIcon } from "lucide-react";
import { Link2, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type IntegrationStatus = "connected" | "disconnected";

type IntegrationAccent = "amber" | "emerald" | "orange" | "rose" | "violet";

export type IntegrationCardProps = {
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: LucideIcon;
  accent: IntegrationAccent;
  className?: string;
  onAction?: () => void;
};

// TASK-479-28-L06: token-driven accent + status tints (no raw palette colors).
// The per-integration accent maps onto the soft semantic tokens from 479-05/06.
const accentStyles: Record<IntegrationAccent, string> = {
  amber: "bg-warning-soft text-warning",
  emerald: "bg-success-soft text-success",
  orange: "bg-warning-soft text-warning",
  rose: "bg-destructive/12 text-destructive",
  violet: "bg-primary-soft text-primary-soft-foreground",
};

const statusStyles: Record<IntegrationStatus, string> = {
  connected: "bg-success-soft text-success",
  disconnected: "bg-muted text-muted-foreground",
};

const statusDotStyles: Record<IntegrationStatus, string> = {
  connected: "bg-success",
  disconnected: "bg-muted-foreground",
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
  onAction,
}: IntegrationCardProps) {
  const action = actionMeta[status];

  return (
    <Card className={cn("gap-5 p-6 transition-shadow hover:shadow-card", className)}>
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            accentStyles[accent]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <Badge
          variant="outline"
          className={cn("gap-2 border-transparent text-[10px]", statusStyles[status])}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDotStyles[status])} />
          {statusLabels[status]}
        </Badge>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant={action.variant} className="mt-auto w-full" onClick={onAction}>
        <action.Icon className="h-4 w-4" />
        {action.label}
      </Button>
    </Card>
  );
}
