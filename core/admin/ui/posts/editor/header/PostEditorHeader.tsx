import { ArrowLeft, Columns3, History, ListTree, Settings, Sidebar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PostEditorActionCluster } from "./PostEditorActionCluster";

type PostEditorHeaderProps = {
  title: string;
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  breadcrumbs?: React.ReactNode;
  onClose: () => void;
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
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  draft: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  scheduled: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  archived: "border-slate-500/30 bg-slate-500/10 text-slate-700",
};

export function PostEditorHeader({
  title,
  status,
  dirty,
  saving,
  lastSavedAt,
  breadcrumbs,
  onClose,
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
  const entryLabel = title.trim().length > 0 ? title : "Edit Post";
  const leftContext =
    breadcrumbs ?? (
      <nav
        aria-label="Post editor breadcrumb"
        className="flex min-w-0 items-center gap-2 overflow-hidden text-sm text-muted-foreground"
      >
        <span className="shrink-0">Content</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="shrink-0">Posts</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="truncate font-medium text-foreground">{entryLabel}</span>
      </nav>
    );

  return (
    <div className="flex flex-col">
      <div
        className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6"
        data-post-editor-header-row="primary"
      >
        <div className="flex min-w-0 items-center gap-3" data-post-editor-header-left-context="true">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Back to posts"
            title="Back to posts"
            data-post-editor-header-close="true"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="min-w-0">{leftContext}</div>
            <Badge
              variant="outline"
              className={statusClass[status] ?? statusClass.draft}
              data-post-editor-header-status="true"
            >
              {statusLabel[status] ?? status}
            </Badge>
          </div>
        </div>

        <div
          className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto"
          data-post-editor-header-cluster="primary-row"
        >
          <PostEditorActionCluster
            status={status}
            dirty={dirty}
            saving={saving}
            lastSavedAt={lastSavedAt}
            onPreview={onPreview}
            onPublish={onPublish}
          />
          <div className="hidden h-6 w-px bg-border md:block" aria-hidden />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            aria-label="Editor settings"
            title="Editor settings"
            data-post-editor-header-settings="true"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="border-t px-4 py-2 sm:px-6"
        data-post-editor-header-row="secondary"
      >
        <div className="flex flex-wrap items-center gap-2" data-post-editor-header-cluster="secondary-controls">
          <Button
            type="button"
            variant={outlineVisible ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleOutline}
            aria-label="Toggle document outline"
            aria-pressed={outlineVisible}
          >
            <ListTree className="h-4 w-4" />
            Outline
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDetails}
            aria-label="Open post details"
            title="Post and block details"
          >
            <Sidebar className="h-4 w-4" />
            Details
          </Button>
          <Button
            type="button"
            variant={focusMode ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleFocusMode}
            aria-label="Toggle full width editor"
            title="Toggle full width editor"
            aria-pressed={focusMode}
          >
            <Columns3 className="h-4 w-4" />
            Focus
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
        </div>
      </div>
    </div>
  );
}
