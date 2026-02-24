import { Columns3, History, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { PostEditorActionCluster } from "./PostEditorActionCluster";
import { PostEditorDocumentTools } from "./PostEditorDocumentTools";

type PostEditorHeaderProps = {
  addButtonRef?: React.Ref<HTMLButtonElement>;
  title: string;
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  canUndo: boolean;
  canRedo: boolean;
  inserterVisible: boolean;
  outlineVisible: boolean;
  onToggleInserter: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleOutline: () => void;
  onOpenDetails: () => void;
  onOpenRevisions: () => void;
  onSaveDraft: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onToggleFocusMode: () => void;
  focusMode: boolean;
};

export function PostEditorHeader({
  addButtonRef,
  title,
  status,
  dirty,
  saving,
  lastSavedAt,
  canUndo,
  canRedo,
  inserterVisible,
  outlineVisible,
  onToggleInserter,
  onUndo,
  onRedo,
  onToggleOutline,
  onOpenDetails,
  onOpenRevisions,
  onSaveDraft,
  onPreview,
  onPublish,
  onToggleFocusMode,
  focusMode,
}: PostEditorHeaderProps) {
  return (
    <div className="space-y-3 px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Post Editor
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {title.trim().length > 0 ? title : "Untitled post"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={focusMode ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleFocusMode}
            aria-pressed={focusMode}
            aria-label="Toggle focus mode"
            title="Expand editor canvas to full width"
          >
            <Columns3 className="h-4 w-4" />
            Focus mode
          </Button>
          <Button
            type="button"
            variant="outline"
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
            onClick={onOpenDetails}
            aria-label="Open post details"
          >
            <Settings2 className="h-4 w-4" />
            Details
          </Button>
        </div>

        <PostEditorActionCluster
          status={status}
          dirty={dirty}
          saving={saving}
          lastSavedAt={lastSavedAt}
          onSaveDraft={onSaveDraft}
          onPreview={onPreview}
          onPublish={onPublish}
        />
      </div>

      <PostEditorDocumentTools
        addButtonRef={addButtonRef}
        inserterVisible={inserterVisible}
        onToggleInserter={onToggleInserter}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        outlineVisible={outlineVisible}
        onToggleOutline={onToggleOutline}
      />
    </div>
  );
}
