import { PostEditorHeader } from "./header/PostEditorHeader";

type PostEditorTopBarProps = {
  addButtonRef?: React.Ref<HTMLButtonElement>;
  title: string;
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenRevisions: () => void;
  onSaveDraft: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onToggleFocusMode: () => void;
  focusMode: boolean;
  onToggleInserter?: () => void;
  inserterVisible?: boolean;
  onToggleOutline: () => void;
  outlineVisible: boolean;
  onOpenDetails: () => void;
};

export function PostEditorTopBar({
  addButtonRef,
  title,
  status,
  dirty,
  saving,
  lastSavedAt,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenRevisions,
  onSaveDraft,
  onPreview,
  onPublish,
  onToggleFocusMode,
  focusMode,
  onToggleInserter,
  inserterVisible = false,
  onToggleOutline,
  outlineVisible,
  onOpenDetails,
}: PostEditorTopBarProps) {
  return (
    <PostEditorHeader
      addButtonRef={addButtonRef}
      title={title}
      status={status}
      dirty={dirty}
      saving={saving}
      lastSavedAt={lastSavedAt}
      canUndo={canUndo}
      canRedo={canRedo}
      inserterVisible={inserterVisible}
      outlineVisible={outlineVisible}
      onToggleInserter={() => onToggleInserter?.()}
      onUndo={onUndo}
      onRedo={onRedo}
      onToggleOutline={onToggleOutline}
      onOpenDetails={onOpenDetails}
      onOpenRevisions={onOpenRevisions}
      onSaveDraft={onSaveDraft}
      onPreview={onPreview}
      onPublish={onPublish}
      onToggleFocusMode={onToggleFocusMode}
      focusMode={focusMode}
    />
  );
}
