import { Eye, Redo2, Rocket, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PostEditorActionClusterProps = {
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  onPreview: () => void;
  onPublish: () => void;
  onSaveDraft?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

const formatSavedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function PostEditorActionCluster({
  status,
  dirty,
  saving,
  lastSavedAt,
  onPreview,
  onPublish,
  onSaveDraft,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: PostEditorActionClusterProps) {
  const syncLabel = saving
    ? "Saving..."
    : dirty
      ? "Unsaved changes"
      : lastSavedAt
        ? `Saved at ${formatSavedAt(lastSavedAt)}`
        : "Synced";

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      aria-label="Primary editor actions"
      data-post-editor-header-cluster="primary-actions"
    >
      <Badge variant="outline" className="hidden md:inline-flex" data-post-editor-sync-state="true">
        {syncLabel}
      </Badge>

      {onUndo ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          data-post-editor-undo="true"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      ) : null}
      {onRedo ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
          data-post-editor-redo="true"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPreview}
        disabled={saving}
        aria-label="Open runtime preview"
      >
        <Eye className="h-4 w-4" />
        Preview
      </Button>

      {onSaveDraft ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSaveDraft}
          disabled={saving}
          aria-label="Save draft"
          data-post-editor-save-draft="true"
        >
          Save draft
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        onClick={onPublish}
        disabled={saving}
        aria-label={status === "published" ? "Update published post" : "Publish post"}
      >
        <Rocket className="h-4 w-4" />
        {status === "published" ? "Update" : "Publish"}
      </Button>
    </div>
  );
}
