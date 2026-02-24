import { PostEditorHeader } from "./header/PostEditorHeader";

type PostEditorTopBarProps = {
  title: string;
  status: string;
  dirty: boolean;
  saving: boolean;
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
