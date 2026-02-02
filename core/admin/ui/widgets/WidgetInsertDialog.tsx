import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { WidgetItem } from "./types";

export type WidgetInsertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget?: WidgetItem | null;
  preview?: React.ReactNode;
  pages?: { id: string; title: string }[];
  onInsert?: (payload: { pageId: string | null; placement: "new" | "inside" }) => void;
};

type PlacementOption = "new" | "inside";

export function WidgetInsertDialog({
  open,
  onOpenChange,
  widget,
  preview,
  pages,
  onInsert,
}: WidgetInsertDialogProps) {
  const pageOptions = useMemo(() => pages ?? [], [pages]);
  const [pageId, setPageId] = useState<string | null>(() => pageOptions[0]?.id ?? null);
  const [placement, setPlacement] = useState<PlacementOption>("new");
  const resolvedPageId = pageId ?? pageOptions[0]?.id ?? null;
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setPageId(pageOptions[0]?.id ?? null);
      setPlacement("new");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Insert Widget</DialogTitle>
            <DialogDescription>
              Choose where this widget should be inserted.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close insert widget dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-6 px-6 py-6">
          <div className="flex gap-4 rounded-xl border bg-muted/30 p-3">
            <div className="h-20 w-28 overflow-hidden rounded-lg border bg-muted/40">
              <div className="h-full w-full">{preview}</div>
            </div>
            <div className="flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {widget?.name ?? "Selected widget"}
                </span>
                {widget?.categoryLabel ? (
                  <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    {widget.categoryLabel}
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Insert this widget into a page layout.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Target page
            </label>
            <Select
              value={resolvedPageId ?? undefined}
              onValueChange={(value) => setPageId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a page" />
              </SelectTrigger>
              <SelectContent>
                {pageOptions.length === 0 ? (
                  <SelectItem value="" disabled>
                    No pages available
                  </SelectItem>
                ) : (
                  pageOptions.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Placement
            </label>
            <div className="space-y-2">
              {([
                {
                  id: "new",
                  title: "Insert as new section",
                  description: "Adds at the bottom of the page layout",
                },
                {
                  id: "inside",
                  title: "Insert into existing block",
                  description: "Pick a specific container inside the layout",
                },
              ] as const).map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                    placement === option.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/70 bg-muted/20 hover:border-primary/30"
                  )}
                >
                  <input
                    type="radio"
                    name="widget-placement"
                    checked={placement === option.id}
                    onChange={() => setPlacement(option.id)}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      {option.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onInsert?.({ pageId: resolvedPageId, placement });
              handleOpenChange(false);
            }}
          >
            Insert Widget
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
