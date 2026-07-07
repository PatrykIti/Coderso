import { BarChart3, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";

import type { TopPageTableRow } from "./TopPagesTable";

type TopPagesExportFile = {
  fileName: string;
  contentType: string;
  content: string;
};

type TopPagesDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: TopPageTableRow[];
  onExport: () => Promise<TopPagesExportFile>;
};

const formatCount = (value: number) => value.toLocaleString("en-US");

const downloadTextFile = (file: TopPagesExportFile) => {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("download_unavailable");
  }
  const blob = new Blob([file.content], { type: file.contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export function TopPagesDrawer({ open, onOpenChange, items, onExport }: TopPagesDrawerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    if (items.length === 0 || isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const file = await onExport();
      downloadTextFile(file);
    } catch (err) {
      setExportError(isApiClientError(err) ? err.message : "Failed to export top pages.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Top Pages</SheetTitle>
            <SheetDescription className="text-xs">
              Full ranking for the selected date range.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close top pages drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 px-6 py-6">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No page views yet. Publish content or widen the date range.
              </div>
            ) : (
              items.map((row) => (
                <div key={row.path} className="rounded-xl border bg-muted/30 p-4">
                  <p className="font-mono text-xs text-muted-foreground">{row.path}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {formatCount(row.views)} views
                    </span>
                    <span>{formatCount(row.visitors)} visitors</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <div className="min-h-5 flex-1 text-sm text-muted-foreground">
            {exportError ? (
              <p className="text-destructive" role="alert">
                {exportError}
              </p>
            ) : items.length === 0 ? (
              <p>No rows to export.</p>
            ) : null}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled={items.length === 0 || isExporting} onClick={() => void handleExport()}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
