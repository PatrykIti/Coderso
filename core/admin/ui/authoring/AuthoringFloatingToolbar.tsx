import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AuthoringCommandIcon } from "./authoringCommands";

export type AuthoringToolbarPanel = {
  id: string;
  label: string;
  description?: string;
  icon?: AuthoringCommandIcon;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export function AuthoringFloatingToolbar({
  label,
  panels,
  actions,
}: {
  label: string;
  panels: readonly AuthoringToolbarPanel[];
  actions?: ReactNode;
}) {
  return (
    <div
      className="pointer-events-auto flex max-w-[calc(100vw_-_2rem)] items-center gap-2 overflow-x-auto rounded-xl border bg-zinc-950 px-2 py-2 text-white shadow-2xl"
      data-authoring-floating-toolbar="true"
    >
      <div className="max-w-[180px] truncate px-2 text-xs font-semibold uppercase text-zinc-300">
        {label}
      </div>
      <div className="flex items-center gap-1">
        {panels.map((panel) => {
          const Icon = panel.icon;
          return (
            <Tooltip key={panel.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={panel.label}
                  aria-expanded={panel.active}
                  disabled={panel.disabled}
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                    panel.active
                      ? "bg-white/15 text-white"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  } disabled:pointer-events-none disabled:opacity-40`}
                  data-authoring-toolbar-panel={panel.id}
                  onClick={panel.onSelect}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : panel.label.slice(0, 1)}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-[240px]">
                <p className="text-xs font-semibold">{panel.label}</p>
                {panel.description ? (
                  <p className="text-xs opacity-80">{panel.description}</p>
                ) : null}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {actions ? (
        <div className="ml-1 flex items-center gap-1 border-l border-white/10 pl-2">{actions}</div>
      ) : null}
    </div>
  );
}
