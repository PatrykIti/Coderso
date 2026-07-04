import type { ComponentType } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * TASK-496-02: light-token segmented panel rail for the Custom Screen builder
 * surfaces. Renders the existing `listToolbarPanels` / `toolbarPanels` arrays as
 * the shared `CanvasEditor` sub-toolbar buttons, replacing the retired dark
 * floating-toolbar panel buttons. Same `{ id, label, icon, active,
 * disabled, onSelect }` shape — only the container/tone changes (presentational
 * only, imports `cn` + tooltip primitives, no data/service module so it stays
 * inside the custom-screen authoring boundary).
 */
export type ScreenToolbarPanel = {
  id: string;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export function ScreenPanelToggleRail({ panels }: { panels: readonly ScreenToolbarPanel[] }) {
  return (
    <div
      className="flex max-w-full flex-wrap items-center gap-1 border-t border-border pt-2"
      data-screen-toolbar-rail="true"
    >
      {panels.map((panel) => {
        const Icon = panel.icon;
        return (
          <Tooltip key={panel.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={panel.label}
                aria-expanded={panel.active}
                aria-pressed={panel.active}
                disabled={panel.disabled}
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40",
                  panel.active
                    ? "bg-primary-soft text-primary-soft-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-screen-toolbar-panel={panel.id}
                onClick={panel.onSelect}
              >
                {Icon ? <Icon className="h-4 w-4" /> : panel.label.slice(0, 1)}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} className="max-w-[240px]">
              <p className="text-xs font-semibold">{panel.label}</p>
              {panel.description ? <p className="text-xs opacity-80">{panel.description}</p> : null}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
