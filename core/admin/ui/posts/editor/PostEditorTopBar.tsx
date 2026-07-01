import { PostEditorHeader } from "./header/PostEditorHeader";

type PostEditorViewportMode = "auto" | "desktop" | "mobile";

type PostEditorTopBarProps = {
  title: string;
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  breadcrumbs?: React.ReactNode;
  onClose: () => void;
  onOpenRevisions: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onSaveDraft?: () => void;
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
  title,
  status,
  dirty,
  saving,
  lastSavedAt,
  breadcrumbs,
  onClose,
  onOpenRevisions,
  onPreview,
  onPublish,
  onSaveDraft,
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
      title={title}
      status={status}
      dirty={dirty}
      saving={saving}
      lastSavedAt={lastSavedAt}
      breadcrumbs={breadcrumbs}
      onClose={onClose}
      onToggleOutline={onToggleOutline}
      onToggleDetails={onToggleDetails}
      onOpenRevisions={onOpenRevisions}
      onPreview={onPreview}
      onPublish={onPublish}
      onSaveDraft={onSaveDraft}
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
