import type { ReactNode } from "react";

import type { ContentTypeSummary } from "@/services/contentTypesClient";
import {
  useCustomScreenPreviewRecordState,
  type CustomScreenPreviewRecordState,
} from "./customScreenPreviewData";

type PreviewOwnerState = {
  previewDataLoading: boolean;
  previewRecordState: CustomScreenPreviewRecordState;
  previewNotice: ReactNode;
};

export type CustomScreenEditorPreviewOwnerProps = {
  contentType: ContentTypeSummary | null;
  children: (state: PreviewOwnerState) => ReactNode;
};

function PreviewStateNotice({
  contentType,
  previewRecordState,
  isLoading,
}: {
  contentType: ContentTypeSummary | null;
  previewRecordState: CustomScreenPreviewRecordState;
  isLoading: boolean;
}) {
  const message = isLoading
    ? `Loading the first record for ${contentType?.name ?? "this content type"}. Schema fallback values are shown until preview data is ready.`
    : previewRecordState.note;
  if (!message) return null;

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function CustomScreenEditorPreviewOwner({
  contentType,
  children,
}: CustomScreenEditorPreviewOwnerProps) {
  const { isLoading, previewRecordState } = useCustomScreenPreviewRecordState(contentType);
  return (
    <>
      {children({
        previewDataLoading: isLoading,
        previewRecordState,
        previewNotice: (
          <PreviewStateNotice
            contentType={contentType}
            previewRecordState={previewRecordState}
            isLoading={isLoading}
          />
        ),
      })}
    </>
  );
}
