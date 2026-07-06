import { Eye, History, Save, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import type { EntryStatus } from "./EntryMetadataPanel";

/**
 * TASK-514-03: repurposed from the orphaned breadcrumb/badge header into the
 * in-page `PageHeader` actions cluster (prototype fidelity — actions live in the
 * PageHeader, not the outer AdminShell topbar). Renders the status + unsaved
 * badges alongside Runtime preview / History (revisions seam) / Save draft /
 * Publish. `EntryEditor` mounts this as the `PageHeader actions` node.
 */
type EntryEditorHeaderActionsProps = {
  status: EntryStatus;
  hasUnsavedChanges: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  isPublishing?: boolean;
  onPreview: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  // Revisions seam (TASK-487-02-L02): opens the future revision drawer. Optional
  // so the button can render as a documented, non-functional insertion point.
  onHistory?: () => void;
};

export function EntryEditorHeaderActions({
  status,
  hasUnsavedChanges,
  isLoading,
  isSaving,
  isPublishing,
  onPreview,
  onSaveDraft,
  onPublish,
  onHistory,
}: EntryEditorHeaderActionsProps) {
  return (
    <>
      <StatusBadge status={status} />
      {hasUnsavedChanges ? <Badge variant="warning">Unsaved changes</Badge> : null}
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={onPreview}
        disabled={isLoading}
      >
        <Eye className="h-4 w-4" />
        Runtime preview
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={onHistory}
        title="Revision history (coming soon)"
      >
        <History className="h-4 w-4" />
        History
      </Button>
      <Button
        variant="secondary"
        size="sm"
        className="gap-2"
        onClick={onSaveDraft}
        disabled={isSaving || isLoading}
      >
        <Save className="h-4 w-4" />
        {isSaving ? "Saving..." : "Save draft"}
      </Button>
      <Button size="sm" className="gap-2" onClick={onPublish} disabled={isPublishing || isLoading}>
        <Send className="h-4 w-4" />
        {status === "published" ? "Update" : "Publish"}
      </Button>
    </>
  );
}
