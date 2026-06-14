import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { editorControlFocusClass } from "../editorControls/controlChrome";
import type { ToolbarActionTooltip, ToolbarPanel } from "./pageEditorOptions";

export const ToolbarIconButton = ({
  tooltip,
  active = false,
  expanded,
  panelId,
  disabled = false,
  onClick,
  onPointerDown,
  children,
}: {
  tooltip: ToolbarActionTooltip;
  active?: boolean;
  expanded?: boolean;
  panelId?: ToolbarPanel;
  disabled?: boolean;
  onClick?: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={tooltip.label}
        aria-expanded={expanded}
        data-page-editor-toolbar-icon={panelId}
        disabled={disabled}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${editorControlFocusClass} ${
          active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
        } disabled:pointer-events-none disabled:opacity-40`}
        onClick={onClick}
        onPointerDown={onPointerDown}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" sideOffset={8} className="max-w-[240px]">
      <p className="text-xs font-semibold">{tooltip.label}</p>
      <p className="text-xs opacity-80">{tooltip.description}</p>
    </TooltipContent>
  </Tooltip>
);
