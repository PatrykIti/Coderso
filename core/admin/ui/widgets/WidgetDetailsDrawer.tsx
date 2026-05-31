import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BlockSettings } from "@/ui/pages/builder/BlockSettings";
import { applyWidgetBlockPatch, createBlock } from "@/ui/pages/builder/blockUtils";
import type { Block, WidgetDefinition } from "@/ui/pages/builder/types";
import { getRegisteredWidget } from "@/ui/widgets/registry";

import type { WidgetItem } from "./types";

type WidgetDetailsDrawerProps = {
  widget: WidgetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert?: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
};

type WidgetConfigPreviewProps = {
  widget: WidgetDefinition;
};

function WidgetConfigPreview({ widget }: WidgetConfigPreviewProps) {
  const [previewBlock, setPreviewBlock] = useState<Block>(() => createBlock(widget));

  return (
    <BlockSettings
      block={previewBlock}
      widget={widget}
      onChange={(next) => setPreviewBlock(next)}
      onBlockPatch={(patch) => setPreviewBlock((current) => applyWidgetBlockPatch(current, patch))}
    />
  );
}

export function WidgetDetailsDrawer({
  widget,
  open,
  onOpenChange,
  onInsert,
  onPrimaryAction,
  primaryActionLabel,
}: WidgetDetailsDrawerProps) {
  const widgetDefinition = useMemo<WidgetDefinition | null>(() => {
    if (!widget || widget.source === "template") return null;
    return getRegisteredWidget(widget.id);
  }, [widget]);
  const previewKey = widgetDefinition
    ? `${widgetDefinition.type}-${open ? "open" : "closed"}`
    : "no-widget";

  const actionLabel =
    primaryActionLabel ?? (widget?.source === "template" ? "Edit Template" : "Insert Widget");
  const actionHandler = onPrimaryAction ?? onInsert;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>{widget?.name ?? "Widget details"}</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Configure the widget before inserting it into a page.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close widget drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        {widget ? (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 px-6 py-6">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/20 p-3 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Module
                      </p>
                      <p className="mt-1 font-medium">{widget.module}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Complexity
                      </p>
                      <p className="mt-1 font-medium">{widget.complexity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Audience
                      </p>
                      <p className="mt-1 font-medium">{widget.audience}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Requires
                      </p>
                      <p className="mt-1 font-medium">
                        {widget.requires && widget.requires.length > 0
                          ? widget.requires.join(", ")
                          : "None"}
                      </p>
                    </div>
                  </div>
                  {widgetDefinition ? (
                    <p className="text-[11px] text-muted-foreground">
                      This is a preview of the configuration. Insert the widget to save it into a
                      page or template.
                    </p>
                  ) : null}
                  {widgetDefinition ? (
                    <div className="rounded-xl border bg-background/60 p-4">
                      <WidgetConfigPreview key={previewKey} widget={widgetDefinition} />
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-background/60 p-4 text-xs text-muted-foreground">
                      {widget?.source === "template"
                        ? "Template settings are edited inside the template editor."
                        : "Widget settings will appear here once the widget is available."}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            <Separator />
            <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  actionHandler?.();
                }}
              >
                {actionLabel}
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
