import { PostEditorHeader } from "./header/PostEditorHeader";

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
  onToggleInserter: () => void;
  inserterVisible: boolean;
  onToggleFocusMode: () => void;
  focusMode: boolean;
  onToggleOutline: () => void;
  outlineVisible: boolean;
  onToggleDetails: () => void;
  detailsOpen: boolean;
  onOpenSettings: () => void;
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
  onToggleInserter,
  inserterVisible,
  onToggleFocusMode,
  focusMode,
  onToggleOutline,
  outlineVisible,
  onToggleDetails,
  detailsOpen,
  onOpenSettings,
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
      onToggleInserter={onToggleInserter}
      inserterVisible={inserterVisible}
      onToggleFocusMode={onToggleFocusMode}
      focusMode={focusMode}
      outlineVisible={outlineVisible}
      onOpenSettings={onOpenSettings}
      detailsOpen={detailsOpen}
      addButtonRef={addButtonRef}
      outlineButtonRef={outlineButtonRef}
      detailsButtonRef={detailsButtonRef}
    />
  );
}
