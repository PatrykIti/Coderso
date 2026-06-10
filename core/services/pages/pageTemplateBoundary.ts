import { normalizeStoredPageDocumentV2ForRead, type PageDocumentV2 } from "./pageDocumentV2";

export const PAGE_V2_SECTION_BLOCK_CONTRACT = "page-v2-section-block-contract";
export const LEGACY_WIDGET_BLOCK_CONTRACT = "legacy-widget-block-contract";

export type PageTemplateRenderMode = "public-page" | "preview-page";

export type PageTemplateRuntimeInput = {
  kind: "page-v2";
  documentContract: typeof PAGE_V2_SECTION_BLOCK_CONTRACT;
  renderMode: PageTemplateRenderMode;
  document: PageDocumentV2;
};

export type PageTemplateBoundarySurfaceKind =
  | "page"
  | "widget-template"
  | "custom-screen"
  | "detail-page";

export type PageTemplateBoundaryContract =
  | typeof PAGE_V2_SECTION_BLOCK_CONTRACT
  | typeof LEGACY_WIDGET_BLOCK_CONTRACT;

const legacyWidgetSurfaceKinds = new Set<PageTemplateBoundarySurfaceKind>([
  "widget-template",
  "custom-screen",
  "detail-page",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const resolveSurfaceDocumentContract = (
  surfaceKind: PageTemplateBoundarySurfaceKind
): PageTemplateBoundaryContract =>
  legacyWidgetSurfaceKinds.has(surfaceKind)
    ? LEGACY_WIDGET_BLOCK_CONTRACT
    : PAGE_V2_SECTION_BLOCK_CONTRACT;

export const isPageV2SectionBlockDocument = (value: unknown) =>
  isRecord(value) && value.schemaVersion === 2 && Array.isArray(value.sections);

export const hasLegacyWidgetBlockRoot = (value: unknown) =>
  isRecord(value) && Array.isArray(value.blocks);

export const assertPageTemplateInputBoundary = (value: unknown) => {
  if (hasLegacyWidgetBlockRoot(value)) {
    throw new Error("page_template_legacy_widget_blocks_invalid");
  }
};

export const assertLegacyWidgetSurfaceBoundary = (
  surfaceKind: PageTemplateBoundarySurfaceKind,
  value: unknown
) => {
  if (resolveSurfaceDocumentContract(surfaceKind) !== LEGACY_WIDGET_BLOCK_CONTRACT) {
    throw new Error("legacy_widget_surface_kind_invalid");
  }
  if (isPageV2SectionBlockDocument(value)) {
    throw new Error("legacy_widget_surface_page_v2_document_invalid");
  }
};

export const resolvePageTemplateInput = (
  value: unknown,
  options?: { renderMode?: PageTemplateRenderMode; enforceFreshBoundary?: boolean }
): PageTemplateRuntimeInput => {
  if (options?.enforceFreshBoundary) {
    assertPageTemplateInputBoundary(value);
  }
  return {
    kind: "page-v2",
    documentContract: PAGE_V2_SECTION_BLOCK_CONTRACT,
    renderMode: options?.renderMode ?? "public-page",
    document: normalizeStoredPageDocumentV2ForRead(value),
  };
};
