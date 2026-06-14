import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  clampToolbarOffset,
  hasAnyResponsiveOverride,
  hasPathValue,
  hasResponsiveOverride,
  readBlockBreakpointOverride,
  readSectionBreakpointOverride,
  resolveInitialToolbarPanel,
  resolvePageEditorSelection,
} from "../../../core/services/pages/pageEditorState";

const section = createPageSectionV2("hero", {
  id: "sec-state",
  blocks: [
    createPageBlockV2("heading", {
      id: "blk-heading",
      props: { text: "State heading", level: "h2", align: "left" },
      responsive: { mobile: { style: { textColor: "#0d9488" } } },
    }),
  ],
  responsive: { tablet: { style: { accent: "#0d9488" } } },
});

const document: PageDocumentV2 = {
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections: [section],
};

test("resolvePageEditorSelection resolves section and block ids without throwing on stale paths", () => {
  expect(
    resolvePageEditorSelection(document, {
      selectedSectionId: "sec-state",
      selectedBlockPath: [{ index: 0 }],
    })
  ).toMatchObject({
    section: { id: "sec-state" },
    block: { id: "blk-heading" },
    selectedBlockId: "blk-heading",
  });

  expect(
    resolvePageEditorSelection(document, {
      selectedSectionId: "sec-state",
      selectedBlockPath: [{ index: 99 }],
    })
  ).toMatchObject({ section: { id: "sec-state" }, block: null, selectedBlockId: null });
});

test("responsive state helpers detect inherited, override, and base values", () => {
  expect(readSectionBreakpointOverride(section, "desktop")).toBeUndefined();
  expect(readSectionBreakpointOverride(section, "tablet")).toEqual({
    style: { accent: "#0d9488" },
  });
  expect(hasResponsiveOverride("tablet", section.responsive.tablet, ["style", "accent"])).toBe(
    true
  );
  expect(hasResponsiveOverride("mobile", section.responsive.mobile, ["style", "accent"])).toBe(
    false
  );
  expect(hasResponsiveOverride("desktop", section.responsive.tablet, ["style", "accent"])).toBe(
    false
  );
  expect(hasPathValue(section.responsive.tablet, ["style", "accent"])).toBe(true);
  expect(hasAnyResponsiveOverride("tablet", section.responsive.tablet)).toBe(true);

  const block = section.blocks[0]!;
  expect(readBlockBreakpointOverride(block, "mobile")).toEqual({ style: { textColor: "#0d9488" } });
});

test("toolbar state helpers keep offsets and default panel deterministic", () => {
  expect(clampToolbarOffset(20, -10, 10)).toBe(10);
  expect(clampToolbarOffset(-20, -10, 10)).toBe(-10);
  expect(clampToolbarOffset(4, -10, 10)).toBe(4);
  expect(resolveInitialToolbarPanel(false)).toBe("layout");
  expect(resolveInitialToolbarPanel(true)).toBe("host-appearance");
});
