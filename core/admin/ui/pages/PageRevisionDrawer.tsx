import { History, RotateCcw, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { PageRevision } from "@/services/pagesClient";

export type PageRevisionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: PageRevision[];
  isLoading: boolean;
  error: string | null;
  restoringId?: string | null;
  discardingId?: string | null;
  onRestore: (revisionId: string) => void;
  onDiscard: (revisionId: string) => void;
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

export function PageRevisionDrawer({
  open,
  onOpenChange,
  revisions,
  isLoading,
  error,
  restoringId = null,
  discardingId = null,
  onRestore,
  onDiscard,
}: PageRevisionDrawerProps) {
  const handleRestore = (revision: PageRevision) => {
    const label =
      revision.kind === "autosave"
        ? "Restore this autosave? Current unsaved changes may be overwritten."
        : "Restore this revision? Current unsaved changes may be overwritten.";
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(label);
      if (!confirmed) return;
    }
    onRestore(revision.id);
  };

  const handleDiscard = (revisionId: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Discard this autosave? It will be removed from history."
      );
      if (!confirmed) return;
    }
    onDiscard(revisionId);
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
            <SheetTitle>Page history</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Restore published revisions or manage the latest settings autosave.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close page history">
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
                No revisions yet.
              </div>
            ) : (
              revisions.map((revision) => {
                const author = revision.createdBy?.name?.trim()
                  ? revision.createdBy.name
                  : revision.createdBy?.email || "System";
                const label =
                  revision.kind === "autosave"
                    ? "Not saved"
                    : `Version ${revision.version}`;

                return (
                  <div key={revision.id} className="space-y-3 rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{label}</p>
                          <Badge
                            variant={revision.kind === "autosave" ? "secondary" : "outline"}
                            className="text-[10px] uppercase"
                          >
                            {revision.kind === "autosave" ? "Autosave" : "Published"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(revision.createdAt)} · {author}
                        </p>
                      </div>
                      <History className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    </div>

                    {revision.title || revision.slug ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {revision.title ? <p>Title: {revision.title}</p> : null}
                        {revision.slug ? <p>Slug: {revision.slug}</p> : null}
                      </div>
                    ) : null}

                    <Separator />

                    <div className="flex items-center justify-end gap-2">
                      {revision.kind === "autosave" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={discardingId === revision.id}
                          onClick={() => handleDiscard(revision.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {discardingId === revision.id ? "Discarding..." : "Discard"}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restoringId === revision.id}
                        onClick={() => handleRestore(revision)}
                      >
                        <RotateCcw className="h-4 w-4" />
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
