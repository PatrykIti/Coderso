import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

import type { WidgetTemplateRevision } from "@/services/widgetTemplateRevisionsClient";

export type WidgetTemplateRevisionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: WidgetTemplateRevision[];
  isLoading: boolean;
  error: string | null;
  restoringId?: string | null;
  onRestore: (revisionId: string) => void;
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function WidgetTemplateRevisionDrawer({
  open,
  onOpenChange,
  revisions,
  isLoading,
  error,
  restoringId,
  onRestore,
}: WidgetTemplateRevisionDrawerProps) {
  const handleRestore = (revisionId: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Restore this revision? This will overwrite the current template."
      );
      if (!confirmed) return;
    }
    onRestore(revisionId);
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
            <SheetTitle>Revision History</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Restore a previous version of this template.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close revisions">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 px-6 py-6">
            {isLoading ? (
              <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Loading revisions...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/40 bg-background p-6 text-center text-sm text-destructive">
                {error}
              </div>
            ) : revisions.length === 0 ? (
              <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No revisions yet. Save the template to create the first snapshot.
              </div>
            ) : (
              revisions.map((revision) => {
                const blocksCount = Array.isArray(revision.blocks)
                  ? revision.blocks.length
                  : 0;
                const author = revision.createdBy?.name?.trim()
                  ? revision.createdBy.name
                  : revision.createdBy?.email || "System";
                return (
                  <div
                    key={revision.id}
                    className="space-y-3 rounded-xl border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Version {revision.version}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(revision.createdAt)} · {author}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {revision.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {revision.category} · {blocksCount} blocks
                    </p>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {revision.name}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restoringId === revision.id}
                        onClick={() => handleRestore(revision.id)}
                      >
                        {restoringId === revision.id ? "Restoring..." : "Restore"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
