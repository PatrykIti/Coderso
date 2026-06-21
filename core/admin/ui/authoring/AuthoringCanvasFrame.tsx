import type { ReactNode } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

export function AuthoringCanvasFrame({
  toolbar,
  floatingPanel,
  commandPalette,
  children,
  onClearSelection,
}: {
  toolbar?: ReactNode;
  floatingPanel?: ReactNode;
  commandPalette?: ReactNode;
  children: ReactNode;
  onClearSelection?: () => void;
}) {
  return (
    <div
      className="relative min-h-[620px] overflow-hidden rounded-2xl border bg-muted/20"
      data-authoring-canvas-frame="true"
    >
      {commandPalette}
      <ScrollArea className="h-full max-h-[calc(100dvh_-_14rem)] min-h-[620px]">
        <div
          className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8"
          data-authoring-canvas-viewport="true"
          onClick={onClearSelection}
        >
          {children}
        </div>
      </ScrollArea>
      {toolbar ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          {toolbar}
        </div>
      ) : null}
      {floatingPanel ? (
        <div className="absolute right-4 top-4 z-30 max-h-[calc(100%_-_2rem)] w-[min(360px,calc(100%_-_2rem))] overflow-auto rounded-xl border bg-background p-4 shadow-2xl">
          {floatingPanel}
        </div>
      ) : null}
    </div>
  );
}
