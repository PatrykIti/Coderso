import { describe, expect, test } from "vitest";

import {
  LEGACY_WIDGET_BLOCK_CONTRACT,
  PAGE_V2_SECTION_BLOCK_CONTRACT,
  assertLegacyWidgetSurfaceBoundary,
  assertPageTemplateInputBoundary,
  resolvePageTemplateInput,
  resolveSurfaceDocumentContract,
  type PageTemplateBoundarySurfaceKind,
} from "../../../core/services/pages/pageTemplateBoundary";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

const pageDocument = (): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections: [
    createPageSectionV2("hero", {
      id: "sec-page-template-boundary",
      blocks: [
        createPageBlockV2("heading", {
          id: "blk-page-template-heading",
          props: { text: "Page template boundary", level: "h1", align: "center" },
        }),
      ],
    }),
  ],
});

const legacyWidgetDocument = {
  blocks: [
    {
      id: "legacy-widget-hero",
      type: "hero",
      data: { title: "Legacy widget hero" },
      variant: "default",
    },
  ],
  settings: { template: "landing" },
};

describe("page template boundary", () => {
  test("resolves Page template input as a Page v2 section/block document", () => {
    const input = resolvePageTemplateInput(pageDocument(), { renderMode: "preview-page" });

    expect(input).toMatchObject({
      kind: "page-v2",
      documentContract: PAGE_V2_SECTION_BLOCK_CONTRACT,
      renderMode: "preview-page",
    });
    expect(input.document.sections[0]?.blocks[0]?.type).toBe("heading");
    expect("blocks" in input.document).toBe(false);
  });

  test("keeps stored legacy Page rows on the documented read/reset compatibility path", () => {
    const input = resolvePageTemplateInput(legacyWidgetDocument);

    expect(input.documentContract).toBe(PAGE_V2_SECTION_BLOCK_CONTRACT);
    expect(input.renderMode).toBe("public-page");
    expect(input.document.sections).toEqual([]);
    expect("blocks" in input.document).toBe(false);
  });

  test("rejects fresh Page template inputs that carry legacy widget block roots", () => {
    expect(() => assertPageTemplateInputBoundary(legacyWidgetDocument)).toThrow(
      "page_template_legacy_widget_blocks_invalid"
    );
    expect(() =>
      resolvePageTemplateInput(legacyWidgetDocument, { enforceFreshBoundary: true })
    ).toThrow("page_template_legacy_widget_blocks_invalid");
  });

  test("keeps non-Page surfaces on the legacy WidgetBlock contract", () => {
    const legacySurfaceKinds: PageTemplateBoundarySurfaceKind[] = [
      "widget-template",
      "custom-screen",
      "detail-page",
    ];

    expect(resolveSurfaceDocumentContract("page")).toBe(PAGE_V2_SECTION_BLOCK_CONTRACT);
    for (const surfaceKind of legacySurfaceKinds) {
      expect(resolveSurfaceDocumentContract(surfaceKind)).toBe(LEGACY_WIDGET_BLOCK_CONTRACT);
      expect(() =>
        assertLegacyWidgetSurfaceBoundary(surfaceKind, legacyWidgetDocument)
      ).not.toThrow();
    }
  });

  test("rejects Page v2 documents at legacy widget surface boundaries", () => {
    for (const surfaceKind of ["widget-template", "custom-screen", "detail-page"] as const) {
      expect(() => assertLegacyWidgetSurfaceBoundary(surfaceKind, pageDocument())).toThrow(
        "legacy_widget_surface_page_v2_document_invalid"
      );
    }
    expect(() => assertLegacyWidgetSurfaceBoundary("page", legacyWidgetDocument)).toThrow(
      "legacy_widget_surface_kind_invalid"
    );
  });
});
