import { Eye, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { EntryStatus } from "./EntryMetadataPanel";

const statusLabels: Record<EntryStatus, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
  archived: "Archived",
};

const statusStyles: Record<EntryStatus, string> = {
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  draft: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  scheduled: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  archived: "border-slate-500/30 bg-slate-500/10 text-slate-600",
};

const statusDotStyles: Record<EntryStatus, string> = {
  published: "bg-emerald-500",
  draft: "bg-amber-500",
  scheduled: "bg-blue-500",
  archived: "bg-slate-500",
};

type EntryEditorHeaderProps = {
  status: EntryStatus;
  hasUnsavedChanges: boolean;
  contentType: string;
  entryLabel: string;
};

export function EntryEditorHeader({
  status,
  hasUnsavedChanges,
  contentType,
  entryLabel,
}: EntryEditorHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Content</span>
        <span className="text-muted-foreground/50">/</span>
        <span>{contentType}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="font-medium text-foreground">{entryLabel}</span>
      </nav>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`gap-1.5 ${statusStyles[status]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotStyles[status]}`} />
          {statusLabels[status]}
        </Badge>
        {hasUnsavedChanges ? (
          <Badge
            variant="outline"
            className="border-rose-500/30 bg-rose-500/10 text-rose-600"
          >
            Unsaved changes
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

type EntryEditorHeaderActionsProps = {
  status: EntryStatus;
  onPreview: () => void;
  onPublish: () => void;
};

export function EntryEditorHeaderActions({
  status,
  onPreview,
  onPublish,
}: EntryEditorHeaderActionsProps) {
  const primaryLabel = status === "published" ? "Update" : "Publish";

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" className="gap-2" onClick={onPreview}>
        <Eye className="h-4 w-4" />
        Preview
      </Button>
      <Button size="sm" className="gap-2" onClick={onPublish}>
        <Send className="h-4 w-4" />
        {primaryLabel}
      </Button>
    </div>
  );
}
