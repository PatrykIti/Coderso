import { History, Settings2 } from "lucide-react";

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
}: PostEditorHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
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

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Post editor
        </p>
        <p className="truncate text-sm font-semibold text-foreground">
          {title.trim().length > 0 ? title : "Untitled post"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
  );
}
