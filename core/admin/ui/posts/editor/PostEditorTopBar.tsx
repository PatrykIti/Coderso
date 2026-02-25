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
  onToggleFocusMode: () => void;
  focusMode: boolean;
  onToggleOutline: () => void;
  outlineVisible: boolean;
  onOpenDetails: () => void;
  onOpenSettings: () => void;
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
  onToggleFocusMode,
  focusMode,
  onToggleOutline,
  outlineVisible,
  onOpenDetails,
  onOpenSettings,
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
      onOpenDetails={onOpenDetails}
      onOpenRevisions={onOpenRevisions}
      onPreview={onPreview}
      onPublish={onPublish}
      onToggleFocusMode={onToggleFocusMode}
      focusMode={focusMode}
      outlineVisible={outlineVisible}
      onOpenSettings={onOpenSettings}
    />
  );
}
