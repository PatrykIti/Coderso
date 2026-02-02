import { Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

import type { WidgetItem } from "./types";

type WidgetConfigSummary = {
  variants: Array<{ id: string; label: string }>;
  fields: Array<{ name: string; type: string; required: boolean; enumValues?: string[] }>;
};

type WidgetDetailsDrawerProps = {
  widget: WidgetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview?: React.ReactNode;
  configSummary?: WidgetConfigSummary | null;
  onInsert?: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
};

export function WidgetDetailsDrawer({
  widget,
  open,
  onOpenChange,
  preview,
  configSummary,
  onInsert,
  onPrimaryAction,
  primaryActionLabel,
}: WidgetDetailsDrawerProps) {
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
                {preview ? (
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                    <div className="aspect-video">{preview}</div>
                  </div>
                ) : null}
                {widget.description ? (
                  <p className="text-xs text-muted-foreground">
                    {widget.description}
                  </p>
                ) : null}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {widget.categoryLabel}
                    {widget.badge ? (
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {widget.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Drag & drop this widget into your layout or insert directly.
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Configuration
                  </p>
                  {configSummary ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Variants
                        </p>
                        {configSummary.variants.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No variants defined.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {configSummary.variants.map((variant) => (
                              <Badge key={variant.id} variant="secondary" className="text-[10px] uppercase">
                                {variant.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Fields
                        </p>
                        {configSummary.fields.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No editable fields defined.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {configSummary.fields.map((field) => (
                              <div
                                key={field.name}
                                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground">
                                    {field.name}
                                  </span>
                                  {field.required ? (
                                    <Badge variant="secondary" className="text-[10px] uppercase">
                                      Required
                                    </Badge>
                                  ) : null}
                                </div>
                                <span className="text-[10px] uppercase text-muted-foreground">
                                  {field.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-background/60 p-4 text-xs text-muted-foreground">
                      Widget settings will appear here once the widget is inserted.
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
