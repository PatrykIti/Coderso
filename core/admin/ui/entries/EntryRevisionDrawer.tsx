import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EntryRevision } from "@/services/entriesClient";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";

type EntryRevisionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: EntryRevision[];
  isLoading: boolean;
  error: string | null;
  restoringId: string | null;
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

/**
 * Entry data is content-type field data, NOT a rich-text document, so a revision
 * preview is a field/value summary rather than the post editor's text extractor.
 */
const describeEntryRevision = (revision: EntryRevision) => {
  const data = revision.data ?? {};
  const keys = Object.keys(data);
  const title = typeof data.title === "string" && data.title.trim() ? data.title : null;
  return title ?? `Snapshot with ${keys.length} field${keys.length === 1 ? "" : "s"}`;
};

const formatPreviewValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => formatPreviewValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${formatPreviewValue(item)}`)
      .join(", ");
  }
  return "";
};

const collectFieldSummary = (revision: EntryRevision) => {
  const data = revision.data ?? {};
  return Object.entries(data)
    .filter(([key]) => key !== "title")
    .map(([key, value]) => {
      const text = formatPreviewValue(value);
      return text ? `${key}: ${text}` : null;
    })
    .filter((entry): entry is string => entry !== null);
};

export function EntryRevisionDrawer({
  open,
  onOpenChange,
  revisions,
  isLoading,
  error,
  restoringId,
  onRestore,
}: EntryRevisionDrawerProps) {
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(null);
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);

  const handleRestore = (revisionId: string) => {
    setPendingRestoreId(revisionId);
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
              <SheetTitle>Entry revisions</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Restore an earlier snapshot of this entry.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close revisions">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>

          <ScrollArea className="min-h-0 flex-1">
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
                  const previewFields = collectFieldSummary(revision);

                  return (
                    <div key={revision.id} className="rounded-xl border bg-background p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Version {revision.version}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(revision.createdAt)} · {author}
                          </p>
                        </div>
                      </div>
                      {previewRevisionId === revision.id ? (
                        <div className="mb-3 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                          {previewFields.length > 0 ? (
                            <ul className="space-y-1">
                              {previewFields.map((entry) => (
                                <li key={entry}>{entry}</li>
                              ))}
                            </ul>
                          ) : (
                            describeEntryRevision(revision)
                          )}
                        </div>
                      ) : null}
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setPreviewRevisionId((current) =>
                              current === revision.id ? null : revision.id
                            )
                          }
                        >
                          {previewRevisionId === revision.id ? "Hide preview" : "Preview"}
                        </Button>
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
      <ConfirmActionDialog
        open={Boolean(pendingRestoreId)}
        onOpenChange={(next) => {
          if (!next) setPendingRestoreId(null);
        }}
        title="Restore revision?"
        description="Restore this revision? Current unsaved changes may be overwritten."
        confirmLabel="Restore"
        confirmingLabel="Restoring..."
        isConfirming={restoringId === pendingRestoreId}
        onConfirm={() => {
          if (!pendingRestoreId) return;
          onRestore(pendingRestoreId);
          setPendingRestoreId(null);
        }}
      >
        Current editor state can be replaced by the selected snapshot.
      </ConfirmActionDialog>
    </>
  );
}
