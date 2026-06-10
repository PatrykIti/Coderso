import { PageDocumentRender } from "../services/pages/pageRendererV2";
import type { PageBreakpoint, PageDocumentV2 } from "../services/pages/pageDocumentV2";
import type { PageRuntimeDataByBlockId } from "../services/pages/pageRuntimeDataBinding";

export type PageTemplatePropsV2 = {
  title: string;
  templateKey: string;
  document: PageDocumentV2;
  isPreview?: boolean;
  previewDevice?: PageBreakpoint;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
};

export function DefaultRuntimePageShellV2({
  document,
  previewDevice = "desktop",
  runtimeDataByBlockId,
}: PageTemplatePropsV2) {
  return (
    <PageDocumentRender
      document={document}
      breakpoint={previewDevice}
      runtimeDataByBlockId={runtimeDataByBlockId}
    />
  );
}
