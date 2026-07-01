import {
  ArrowLeft,
  Columns3,
  History,
  ListTree,
  Monitor,
  Plus,
  Settings,
  Sidebar,
  Smartphone,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { PostEditorActionCluster } from "./PostEditorActionCluster";
import {
  formatPostEditorShortcutAria,
  formatPostEditorShortcutLabel,
} from "../hooks/usePostEditorShortcuts";

type PostEditorViewportMode = "auto" | "desktop" | "mobile";

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
  onToggleDetails: () => void;
  detailsOpen: boolean;
  onOpenRevisions: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onSaveDraft?: () => void;
  onToggleInserter: () => void;
  inserterVisible: boolean;
  onToggleFocusMode: () => void;
  focusMode: boolean;
  onOpenSettings: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  viewportMode?: PostEditorViewportMode;
  onSetViewportMode?: (mode: PostEditorViewportMode) => void;
  addButtonRef?: React.Ref<HTMLButtonElement>;
  outlineButtonRef?: React.Ref<HTMLButtonElement>;
  detailsButtonRef?: React.Ref<HTMLButtonElement>;
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
  onToggleDetails,
  detailsOpen,
  onOpenRevisions,
  onPreview,
  onPublish,
  onSaveDraft,
  onToggleInserter,
  inserterVisible,
  onToggleFocusMode,
  focusMode,
  onOpenSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewportMode = "auto",
  onSetViewportMode,
  addButtonRef,
  outlineButtonRef,
  detailsButtonRef,
}: PostEditorHeaderProps) {
  const entryLabel = title.trim().length > 0 ? title : "Edit Post";
  const inserterShortcut = formatPostEditorShortcutLabel("toggleInserter");
  const outlineShortcut = formatPostEditorShortcutLabel("toggleOutline");
  const detailsShortcut = formatPostEditorShortcutLabel("toggleDetails");
  const outlineLabel = outlineVisible ? "Hide document overview" : "Show document overview";
  const detailsLabel = detailsOpen ? "Hide post details" : "Show post details";
  const leftContext = breadcrumbs ?? (
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
        <div className="min-w-0">{leftContext}</div>
      </div>

      <div
        className="flex w-full flex-wrap items-center justify-end gap-1.5 md:w-auto"
        data-post-editor-header-cluster="primary-row"
      >
        <PostEditorActionCluster
          status={status}
          dirty={dirty}
          saving={saving}
          lastSavedAt={lastSavedAt}
          onPreview={onPreview}
          onPublish={onPublish}
          onSaveDraft={onSaveDraft}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
        />

        {onSetViewportMode ? (
          <div
            className="ml-1 hidden items-center rounded-lg border border-border bg-card p-0.5 sm:flex"
            role="group"
            aria-label="Editor viewport"
            data-post-editor-viewport-toggle="true"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-pressed={viewportMode !== "mobile"}
              aria-label="Desktop preview"
              onClick={() => onSetViewportMode("desktop")}
              className={
                viewportMode !== "mobile" ? "bg-muted text-foreground" : "text-muted-foreground"
              }
            >
              <Monitor className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-pressed={viewportMode === "mobile"}
              aria-label="Mobile preview"
              onClick={() => onSetViewportMode("mobile")}
              className={
                viewportMode === "mobile" ? "bg-muted text-foreground" : "text-muted-foreground"
              }
            >
              <Smartphone className="size-3.5" />
            </Button>
          </div>
        ) : null}

        <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />

        <Button
          ref={addButtonRef}
          type="button"
          variant={inserterVisible ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleInserter}
          aria-pressed={inserterVisible}
          aria-expanded={inserterVisible}
          aria-controls="post-editor-block-inserter"
          aria-label="Toggle block inserter"
          aria-keyshortcuts={formatPostEditorShortcutAria("toggleInserter")}
          data-post-editor-shortcut={inserterShortcut}
          title={`Add block (${inserterShortcut})`}
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          ref={outlineButtonRef}
          type="button"
          variant={outlineVisible ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleOutline}
          aria-pressed={outlineVisible}
          aria-expanded={outlineVisible}
          aria-controls="post-editor-document-overview"
          aria-label={outlineLabel}
          aria-keyshortcuts={formatPostEditorShortcutAria("toggleOutline")}
          data-post-editor-shortcut={outlineShortcut}
          title={`${outlineLabel} (${outlineShortcut})`}
        >
          <ListTree className="h-4 w-4" />
        </Button>

        <Button
          ref={detailsButtonRef}
          type="button"
          variant={detailsOpen ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleDetails}
          aria-pressed={detailsOpen}
          aria-expanded={detailsOpen}
          aria-controls="post-editor-details"
          aria-label={detailsLabel}
          aria-keyshortcuts={formatPostEditorShortcutAria("toggleDetails")}
          data-post-editor-shortcut={detailsShortcut}
          title={`${detailsLabel} (${detailsShortcut})`}
        >
          <Sidebar className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={focusMode ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleFocusMode}
          aria-pressed={focusMode}
          aria-label="Toggle full width editor"
          title="Toggle full width editor"
        >
          <Columns3 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenRevisions}
          aria-label="Open revision history"
          title="Revisions"
        >
          <History className="h-4 w-4" />
        </Button>

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
  );
}
