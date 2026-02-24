import { ListTree, Plus, Redo2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type PostEditorDocumentToolsProps = {
  addButtonRef?: React.Ref<HTMLButtonElement>;
  inserterVisible: boolean;
  onToggleInserter: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  outlineVisible: boolean;
  onToggleOutline: () => void;
};

export function PostEditorDocumentTools({
  addButtonRef,
  inserterVisible,
  onToggleInserter,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  outlineVisible,
  onToggleOutline,
}: PostEditorDocumentToolsProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t pt-3"
      aria-label="Document tools"
      data-post-editor-header-cluster="tools"
    >
      <Button
        ref={addButtonRef}
        type="button"
        variant={inserterVisible ? "secondary" : "outline"}
        size="sm"
        onClick={onToggleInserter}
        aria-pressed={inserterVisible}
        aria-label="Toggle block inserter"
        title="Add block (/) and toggle inserter"
      >
        <Plus className="h-4 w-4" />
        Add block
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo last change"
        title="Undo (Ctrl/Cmd+Z)"
      >
        <Undo2 className="h-4 w-4" />
        Undo
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo last change"
        title="Redo (Ctrl/Cmd+Shift+Z)"
      >
        <Redo2 className="h-4 w-4" />
        Redo
      </Button>

      <Button
        type="button"
        variant={outlineVisible ? "secondary" : "outline"}
        size="sm"
        onClick={onToggleOutline}
        aria-pressed={outlineVisible}
        aria-label="Toggle document overview"
        title="Document overview (Alt+Arrow to reorder blocks)"
      >
        <ListTree className="h-4 w-4" />
        Outline
      </Button>
    </div>
  );
}
