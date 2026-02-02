import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BlockSettings } from "@/ui/pages/builder/BlockSettings";
import { createBlock } from "@/ui/pages/builder/blockUtils";
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
    primaryActionLabel ??
    (widget?.source === "template" ? "Edit Template" : "Insert Widget");
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
                  {widgetDefinition ? (
                    <p className="text-[11px] text-muted-foreground">
                      This is a preview of the configuration. Insert the widget to
                      save it into a page or template.
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
