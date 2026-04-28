import { Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type PostEditorActionClusterProps = {
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  onPreview: () => void;
  onPublish: () => void;
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
      <span
        className="hidden text-xs text-muted-foreground md:inline"
        data-post-editor-sync-state="true"
      >
        {syncLabel}
      </span>

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
      <Button
        type="button"
        size="sm"
        onClick={onPublish}
        disabled={saving}
        aria-label={status === "published" ? "Update published post" : "Publish post"}
      >
        <Send className="h-4 w-4" />
        {status === "published" ? "Update" : "Publish"}
      </Button>
    </div>
  );
}
