import { PageDocumentRender, documentUsesSpotlight } from "../services/pages/pageRendererV2";
import type { PageBreakpoint, PageDocumentV2 } from "../services/pages/pageDocumentV2";
import type { PageRuntimeDataByBlockId } from "../services/pages/pageRuntimeBindingContract";
import {
  SiteFooter,
  SiteHeaderMenuDocumentRender,
  SiteHeaderNav,
  type SiteShellRenderProps,
} from "./siteShell";

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
  /**
   * TASK-504-03: current request path (front only; `null`/absent in preview) —
   * forwarded ONLY into the document-header branch to stamp `aria-current`.
   */
  activePath?: string | null;
};

export function DefaultRuntimePageShellV2({
  document,
  previewDevice = "desktop",
  runtimeDataByBlockId,
  siteShell,
  siteName,
  activePath,
}: PageTemplatePropsV2) {
  // TASK-535 — the single viewport-fixed spotlight overlay DIV is de-duplicated
  // across the two page documents (primary <main> + secondary footer). The primary
  // owns the overlay whenever it authors spotlight; the footer suppresses ITS copy
  // when the primary already owns one (`peerSpotlightOn={mainSpotlightOn}`) yet still
  // renders one for a footer-only spotlight (see PageDocumentRender's `peerSpotlightOn`).
  const mainSpotlightOn = documentUsesSpotlight(document);
  return (
    <>
      {siteShell?.navigationDocument ? (
        <SiteHeaderMenuDocumentRender
          document={siteShell.navigationDocument}
          navigation={siteShell.navigation}
          siteName={siteName}
          breakpoint={previewDevice}
          activePath={activePath}
        />
      ) : siteShell?.navigation ? (
        <SiteHeaderNav
          navigation={siteShell.navigation}
          siteName={siteName}
          extras={siteShell.navigationExtras ?? null}
        />
      ) : null}
      <PageDocumentRender
        document={document}
        breakpoint={previewDevice}
        runtimeDataByBlockId={runtimeDataByBlockId}
      />
      {siteShell?.footerDocument ? (
        <SiteFooter
          document={siteShell.footerDocument}
          breakpoint={previewDevice}
          peerSpotlightOn={mainSpotlightOn}
        />
      ) : null}
    </>
  );
}
