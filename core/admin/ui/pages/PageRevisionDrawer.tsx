import { History, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import type { PageRevision } from "@/services/pagesClient";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";

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
  const [pendingRestore, setPendingRestore] = useState<PageRevision | null>(null);
  const [pendingDiscardId, setPendingDiscardId] = useState<string | null>(null);

  const handleRestore = (revision: PageRevision) => {
    setPendingRestore(revision);
  };

  const handleDiscard = (revisionId: string) => {
    setPendingDiscardId(revisionId);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="space-y-1">
              <SheetTitle>Page history</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Restore published versions or manage the latest draft version.
              </SheetDescription>
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
                      ? "Draft version"
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
                              {revision.kind === "autosave" ? "Draft" : "Published"}
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
      <ConfirmActionDialog
        open={Boolean(pendingRestore)}
        onOpenChange={(next) => {
          if (!next) setPendingRestore(null);
        }}
        title={
          pendingRestore?.kind === "autosave"
            ? "Restore draft version?"
            : "Restore revision?"
        }
        description={
          pendingRestore?.kind === "autosave"
            ? "Restore this draft version? Current unsaved changes may be overwritten."
            : "Restore this revision? Current unsaved changes may be overwritten."
        }
        confirmLabel="Restore"
        confirmingLabel="Restoring..."
        isConfirming={restoringId === pendingRestore?.id}
        onConfirm={() => {
          if (!pendingRestore) return;
          onRestore(pendingRestore.id);
          setPendingRestore(null);
        }}
      >
        Current editor state can be replaced by the selected snapshot.
      </ConfirmActionDialog>
      <ConfirmActionDialog
        open={Boolean(pendingDiscardId)}
        onOpenChange={(next) => {
          if (!next) setPendingDiscardId(null);
        }}
        title="Discard draft version?"
        description="Discard this draft version? It will be removed from history."
        confirmLabel="Discard draft version"
        confirmingLabel="Discarding..."
        isConfirming={discardingId === pendingDiscardId}
        onConfirm={() => {
          if (!pendingDiscardId) return;
          onDiscard(pendingDiscardId);
          setPendingDiscardId(null);
        }}
      />
    </>
  );
}
