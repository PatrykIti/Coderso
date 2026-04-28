import { BadgeCheck, ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { PluginDetailsDialog } from "./PluginDetailsDialog";
import type { PluginSummary } from "./types";

const statusMeta = {
  verified: {
    label: "Verified",
    Icon: ShieldCheck,
    className: "text-emerald-600",
  },
  official: {
    label: "Official",
    Icon: BadgeCheck,
    className: "text-blue-600",
  },
  community: {
    label: "Community",
    Icon: Users,
    className: "text-amber-600",
  },
};

export type PluginCardProps = {
  plugin: PluginSummary;
};

export function PluginCard({ plugin }: PluginCardProps) {
  const meta = statusMeta[plugin.status];
  const ActionButton = (
    <Button
      size="sm"
      variant={plugin.installed ? "secondary" : "default"}
    >
      {plugin.installed ? "Installed" : "Install"}
    </Button>
  );

  return (
    <Card className="gap-4 border-border/70 p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-primary">
          {plugin.icon}
        </div>
        <Badge variant="outline" className="text-xs">
          v{plugin.version}
        </Badge>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{plugin.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {plugin.description}
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t pt-4">
        <div className={cn("flex items-center gap-1 text-xs font-medium", meta.className)}>
          <meta.Icon className="h-3.5 w-3.5" />
          {meta.label}
        </div>
        <div className="flex items-center gap-2">
          <PluginDetailsDialog plugin={plugin} />
          {ActionButton}
        </div>
      </div>
    </Card>
  );
}
