import { Eye, Save, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PostEditorActionClusterProps = {
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  onSaveDraft: () => void;
  onPreview: () => void;
  onPublish: () => void;
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
  archived: "Archived",
};

const statusStyle: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  archived: "bg-slate-500/10 text-slate-500 border-slate-500/20",
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
  onSaveDraft,
  onPreview,
  onPublish,
}: PostEditorActionClusterProps) {
  const syncLabel = saving
    ? "Saving..."
    : dirty
      ? "Unsaved changes"
      : status === "published"
        ? "Published"
        : lastSavedAt
          ? `Autosaved at ${formatSavedAt(lastSavedAt)}`
          : "Synced";

  const syncBadgeClass = saving
    ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
    : dirty
      ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600";

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      aria-label="Save, preview, and publish actions"
      data-post-editor-header-cluster="actions"
    >
      <Badge
        variant="outline"
        className={statusStyle[status] ?? statusStyle.draft}
      >
        {statusLabel[status] ?? status}
      </Badge>
      <Badge variant="outline" className={syncBadgeClass}>
        {syncLabel}
      </Badge>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onSaveDraft}
        disabled={saving}
        aria-label="Save current post draft"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save draft"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPreview}
        disabled={saving}
        aria-label="Open runtime preview"
      >
        <Eye className="h-4 w-4" />
        Runtime preview
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
