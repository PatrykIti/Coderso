import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import type { WidgetTemplatePreviewResponse } from "@/services/widgetTemplatePreviewClient";

export type WidgetTemplatePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName?: string;
  canPreview: boolean;
  preview: WidgetTemplatePreviewResponse | null;
  isLoading: boolean;
  error: string | null;
};

export function WidgetTemplatePreviewDialog({
  open,
  onOpenChange,
  templateName,
  canPreview,
  preview,
  isLoading,
  error,
}: WidgetTemplatePreviewDialogProps) {
  const showEmpty = preview && preview.blocksCount === 0;
  return (
    <RuntimePreviewDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Template Preview"
      subtitle={templateName ? `${templateName} runtime preview` : "Template runtime preview."}
      canPreview={canPreview}
      previewUrl={preview?.previewUrl ?? null}
      isLoading={isLoading}
      error={error}
      showEmpty={Boolean(showEmpty)}
      emptyMessage="This template has no blocks yet. Add a widget to see the preview."
      cannotPreviewMessage="Save the template to generate a preview."
      iframeTitle="Template runtime preview"
    />
  );
}
