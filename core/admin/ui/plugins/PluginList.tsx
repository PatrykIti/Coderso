import { Puzzle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";

import type { InstalledPlugin } from "./types";

// TASK-479-24-L01: token-driven status tones (replaces the local emerald/slate/rose
// hex map) so the installed-plugin cards read from the theme.
const statusVariant: Record<InstalledPlugin["status"], "success" | "secondary" | "destructive"> = {
  enabled: "success",
  disabled: "secondary",
  error: "destructive",
};

export type PluginListProps = {
  items: InstalledPlugin[];
  selectedName?: string;
  onSelect: (name: string) => void;
};

export function PluginList(props: PluginListProps) {
  const { items, selectedName, onSelect } = props;
  const basePath = resolveAdminBasePath();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
        No plugins installed yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((plugin) => {
        const isActive = selectedName === plugin.name;
        return (
          <div
            key={plugin.name}
            className={cn(
              "group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5",
              isActive ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(plugin.name)}
              aria-pressed={isActive}
              className="flex flex-1 flex-col text-left"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                  <Puzzle className="size-6" />
                </span>
                <Badge variant={statusVariant[plugin.status]} className="capitalize">
                  {plugin.status}
                </Badge>
              </div>
              <div className="mt-4 font-display text-[15px] font-semibold">{plugin.name}</div>
              <p className="mt-1 text-xs text-muted-foreground">v{plugin.version}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{plugin.policy}</Badge>
                {plugin.updateAvailable ? (
                  <Badge variant="info">Update {plugin.updateAvailable}</Badge>
                ) : null}
                <span>Updated {plugin.lastUpdated}</span>
              </div>
            </button>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <a
                href={withAdminBasePath(
                  basePath,
                  `/store/plugins/${encodeURIComponent(plugin.name)}`
                )}
              >
                Manage
              </a>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
