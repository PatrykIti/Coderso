import { PageDocumentRender } from "../services/pages/pageRendererV2";
import type { PageBreakpoint, PageDocumentV2 } from "../services/pages/pageDocumentV2";
import type { PageRuntimeDataByBlockId } from "../services/pages/pageRuntimeDataBinding";
import { SiteFooter, SiteHeaderNav, type SiteShellRenderProps } from "./siteShell";

export type PageTemplatePropsV2 = {
  title: string;
  templateKey: string;
  document: PageDocumentV2;
  isPreview?: boolean;
  previewDevice?: PageBreakpoint;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
  /**
   * Global site shell (TASK-455): published navigation menu above and
   * published footer template below the page content on EVERY public Page v2
   * render, tokenized preview included. `null` parts render nothing.
   */
  siteShell?: SiteShellRenderProps | null;
  /** Site name for the shell header brand link. */
  siteName?: string | null;
};

export function DefaultRuntimePageShellV2({
  document,
  previewDevice = "desktop",
  runtimeDataByBlockId,
  siteShell,
  siteName,
}: PageTemplatePropsV2) {
  return (
    <>
      {siteShell?.navigation ? (
        <SiteHeaderNav navigation={siteShell.navigation} siteName={siteName} />
      ) : null}
      <PageDocumentRender
        document={document}
        breakpoint={previewDevice}
        runtimeDataByBlockId={runtimeDataByBlockId}
      />
      {siteShell?.footerDocument ? (
        <SiteFooter document={siteShell.footerDocument} breakpoint={previewDevice} />
      ) : null}
    </>
  );
}
