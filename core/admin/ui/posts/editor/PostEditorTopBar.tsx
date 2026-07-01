import { PostEditorHeader } from "./header/PostEditorHeader";

type PostEditorViewportMode = "auto" | "desktop" | "mobile";

type PostEditorTopBarProps = {
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  onClose: () => void;
  onOpenRevisions: () => void;
  onToggleInserter: () => void;
  inserterVisible: boolean;
  onToggleFocusMode: () => void;
  focusMode: boolean;
  onToggleOutline: () => void;
  outlineVisible: boolean;
  onToggleDetails: () => void;
  detailsOpen: boolean;
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

export function PostEditorTopBar({
  status,
  dirty,
  saving,
  lastSavedAt,
  onClose,
  onOpenRevisions,
  onToggleInserter,
  inserterVisible,
  onToggleFocusMode,
  focusMode,
  onToggleOutline,
  outlineVisible,
  onToggleDetails,
  detailsOpen,
  onOpenSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewportMode,
  onSetViewportMode,
  addButtonRef,
  outlineButtonRef,
  detailsButtonRef,
}: PostEditorTopBarProps) {
  return (
    <PostEditorHeader
      status={status}
      dirty={dirty}
      saving={saving}
      lastSavedAt={lastSavedAt}
      onClose={onClose}
      onToggleOutline={onToggleOutline}
      onToggleDetails={onToggleDetails}
      onOpenRevisions={onOpenRevisions}
      onToggleInserter={onToggleInserter}
      inserterVisible={inserterVisible}
      onToggleFocusMode={onToggleFocusMode}
      focusMode={focusMode}
      outlineVisible={outlineVisible}
      onOpenSettings={onOpenSettings}
      detailsOpen={detailsOpen}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={onUndo}
      onRedo={onRedo}
      viewportMode={viewportMode}
      onSetViewportMode={onSetViewportMode}
      addButtonRef={addButtonRef}
      outlineButtonRef={outlineButtonRef}
      detailsButtonRef={detailsButtonRef}
    />
  );
}
