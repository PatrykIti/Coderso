import type { ReactNode } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  authoringCanvasSurfaceClass,
  authoringCanvasViewportClass,
  authoringToolbarPanelClass,
} from "./canvasChrome";

export function AuthoringCanvasFrame({
  toolbar,
  floatingPanel,
  commandPalette,
  children,
  onClearSelection,
  borderless = false,
}: {
  toolbar?: ReactNode;
  floatingPanel?: ReactNode;
  commandPalette?: ReactNode;
  children: ReactNode;
  onClearSelection?: () => void;
  borderless?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative min-h-[620px] overflow-hidden",
        authoringCanvasSurfaceClass,
        borderless ? "bg-muted/10" : "rounded-2xl border bg-muted/20"
      )}
      data-authoring-canvas-frame="true"
      data-authoring-canvas-borderless={borderless ? "true" : "false"}
    >
      {commandPalette}
      <ScrollArea className="h-full max-h-[calc(100dvh_-_14rem)] min-h-[620px]">
        <div
          className={authoringCanvasViewportClass}
          data-authoring-canvas-viewport="true"
          onClick={onClearSelection}
        >
          {children}
        </div>
      </ScrollArea>
      {toolbar || floatingPanel ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex max-w-[calc(100vw_-_2rem)] flex-col items-center gap-2">
            {floatingPanel ? (
              <div
                className={cn("pointer-events-auto", authoringToolbarPanelClass)}
                data-authoring-toolbar-subpanel="true"
              >
                {floatingPanel}
              </div>
            ) : null}
            {toolbar}
          </div>
        </div>
      ) : null}
    </div>
  );
}
