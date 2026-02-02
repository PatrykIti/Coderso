import { useMemo, useState } from "react";
import { Monitor, Smartphone, Tablet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { WidgetTemplatePreviewResponse } from "@/services/widgetTemplatePreviewClient";

const devices = [
  { id: "desktop", label: "Desktop", width: 1200, height: 760, icon: Monitor },
  { id: "tablet", label: "Tablet", width: 820, height: 720, icon: Tablet },
  { id: "mobile", label: "Mobile", width: 390, height: 720, icon: Smartphone },
] as const;

type DeviceId = (typeof devices)[number]["id"];

export type WidgetTemplatePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName?: string;
  canPreview: boolean;
  preview: WidgetTemplatePreviewResponse | null;
  isLoading: boolean;
  error: string | null;
};

export function WidgetTemplatePreviewDialog({
  open,
  onOpenChange,
  templateName,
  canPreview,
  preview,
  isLoading,
  error,
}: WidgetTemplatePreviewDialogProps) {
  const [device, setDevice] = useState<DeviceId>("desktop");

  const viewport = useMemo(
    () => devices.find((entry) => entry.id === device) ?? devices[0],
    [device]
  );

  const showEmpty = preview && preview.blocksCount === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b px-6 py-4">
          <div className="space-y-1">
            <DialogTitle>Template Preview</DialogTitle>
            <p className="text-xs text-muted-foreground">
              {templateName ? `${templateName} preview` : "Preview the template layout."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {devices.map((entry) => {
                const isActive = entry.id === device;
                const Icon = entry.icon;
                return (
                  <Button
                    key={entry.id}
                    type="button"
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => setDevice(entry.id)}
                    className={cn(isActive && "shadow-sm")}
                    aria-label={entry.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30 px-6 py-6">
          {isLoading ? (
            <div className="rounded-2xl border bg-background p-10 text-center text-sm text-muted-foreground">
              Rendering preview...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/40 bg-background p-10 text-center text-sm text-destructive">
              {error}
            </div>
          ) : !canPreview ? (
            <div className="rounded-2xl border bg-background p-10 text-center text-sm text-muted-foreground">
              Save the template to generate a preview.
            </div>
          ) : !preview ? (
            <div className="rounded-2xl border bg-background p-10 text-center text-sm text-muted-foreground">
              Preview data is not available yet.
            </div>
          ) : showEmpty ? (
            <div className="rounded-2xl border bg-background p-10 text-center text-sm text-muted-foreground">
              This template has no blocks yet. Add a widget to see the preview.
            </div>
          ) : (
            <div className="mx-auto w-fit rounded-2xl border bg-background shadow-sm">
              <iframe
                title="Template preview"
                sandbox="allow-same-origin"
                srcDoc={preview.html}
                className="block rounded-2xl"
                style={{ width: viewport.width, height: viewport.height }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
