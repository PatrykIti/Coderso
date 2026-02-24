import { Columns3, Eye, History, ListTree, Settings, Send, Sidebar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PostEditorHeaderProps = {
  title: string;
  status: string;
  dirty: boolean;
  saving: boolean;
  outlineVisible: boolean;
  onToggleOutline: () => void;
  onOpenDetails: () => void;
  onOpenRevisions: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onToggleFocusMode: () => void;
  focusMode: boolean;
  onOpenSettings: () => void;
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
  archived: "Archived",
};

const statusClass: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-amber-100 text-amber-700",
  archived: "bg-slate-200 text-slate-600",
};

export function PostEditorHeader({
  title,
  status,
  dirty,
  saving,
  outlineVisible,
  onToggleOutline,
  onOpenDetails,
  onOpenRevisions,
  onPreview,
  onPublish,
  onToggleFocusMode,
  focusMode,
  onOpenSettings,
}: PostEditorHeaderProps) {
  const syncLabel = saving ? "Saving..." : dirty ? "Unsaved changes" : "Saved";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-semibold text-foreground">
          {title.trim().length > 0 ? title : "New Post"}
        </p>
        <Badge
          variant="outline"
          className={statusClass[status] ?? statusClass.draft}
          data-post-editor-header-status="true"
        >
          {statusLabel[status] ?? status}
        </Badge>
        <span className="text-xs text-muted-foreground">{syncLabel}</span>
      </div>

      <div
        className="flex flex-wrap items-center justify-end gap-2"
        data-post-editor-header-cluster="actions"
      >
        <Button
          type="button"
          variant={outlineVisible ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleOutline}
          aria-label="Toggle document outline"
        >
          <ListTree className="h-4 w-4" />
          Outline
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onOpenDetails}
          aria-label="Open post details"
          title="Post and block details"
        >
          <Sidebar className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={focusMode ? "secondary" : "outline"}
          size="icon"
          onClick={onToggleFocusMode}
          aria-label="Toggle full width editor"
          title="Toggle full width editor"
        >
          <Columns3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenRevisions}
          aria-label="Open revision history"
        >
          <History className="h-4 w-4" />
          Revisions
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          aria-label="Editor settings"
          title="Editor settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
