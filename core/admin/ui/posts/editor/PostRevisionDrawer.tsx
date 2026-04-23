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
import type { PostRevision } from "@/services/postsClient";
import { postRichTextToPlainText } from "../../../../services/posts/editor/postRichTextSerializer";

type PostRevisionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: PostRevision[];
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

const countBlocks = (revision: PostRevision) => {
  const document = revision.data?.document;
  if (!document || typeof document !== "object" || Array.isArray(document)) return 0;
  const blocks = (document as { blocks?: unknown }).blocks;
  return Array.isArray(blocks) ? blocks.length : 0;
};

const collectPreviewText = (value: unknown): string => {
  if (typeof value === "string") return postRichTextToPlainText(value);
  if (Array.isArray(value)) return value.map((item) => collectPreviewText(item)).join(" ");
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  const directText = typeof record.text === "string" ? postRichTextToPlainText(record.text) : "";
  const htmlText = typeof record.html === "string" ? postRichTextToPlainText(record.html) : "";
  const contentText = collectPreviewText(record.content);
  const nodesText = collectPreviewText(record.nodes);
  const blocksText = collectPreviewText(record.blocks);
  const excerptText =
    typeof record.excerpt === "string" ? postRichTextToPlainText(record.excerpt) : "";

  return [directText, htmlText, excerptText, contentText, nodesText, blocksText]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
};

const describeRevisionFallback = (revision: PostRevision, author: string) => {
  const blockCount = countBlocks(revision);
  const blockLabel = blockCount === 1 ? "block" : "blocks";
  const document = revision.data?.document;
  const shape =
    document && typeof document === "object" && !Array.isArray(document)
      ? `Snapshot contains ${blockCount} ${blockLabel} without extractable text.`
      : "No document snapshot is stored for this revision.";

  return `Version ${revision.version} by ${author} on ${formatTimestamp(
    revision.createdAt
  )}. ${shape}`;
};

const resolveRevisionPreview = (revision: PostRevision, author: string) => {
  const text = collectPreviewText(revision.data?.document).replace(/\s+/g, " ").trim();
  if (text.length === 0) return describeRevisionFallback(revision, author);
  if (text.length <= 180) return text;
  return `${text.slice(0, 177)}...`;
};

export function PostRevisionDrawer({
  open,
  onOpenChange,
  revisions,
  isLoading,
  error,
  restoringId,
  onRestore,
}: PostRevisionDrawerProps) {
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(null);

  const handleRestore = (revisionId: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Restore this revision? Current unsaved changes may be overwritten."
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
            <SheetTitle>Post revisions</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Restore an earlier snapshot of this post.
            </SheetDescription>
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
                No revisions yet.
              </div>
            ) : (
              revisions.map((revision) => {
                const author = revision.createdBy?.name?.trim()
                  ? revision.createdBy.name
                  : revision.createdBy?.email || "System";

                return (
                  <div key={revision.id} className="rounded-xl border bg-background p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Version {revision.version}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(revision.createdAt)} · {author}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {countBlocks(revision)} blocks
                      </div>
                    </div>
                    {previewRevisionId === revision.id ? (
                      <div className="mb-3 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                        {resolveRevisionPreview(revision, author)}
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
  );
}
