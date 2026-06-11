import { describe, expect, test } from "vitest";

import {
  getPageBlockCapability,
  getPageEditorControlsForTarget,
  getPageSectionCapability,
  getPageSectionVariantControl,
  pageBlockControlRegistry,
  pageUniversalBlockControls,
  pageUniversalSectionControls,
  type PageEditorControlDefinition,
} from "../../../core/services/pages/pageEditorControlRegistry";
import {
  pageBackgroundTypes,
  pageBlockCapabilities,
  pageBlockPropKeys,
  pageBlockTypes,
  pageBlockWidths,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageColumnDistributions,
  pageDividerTones,
  pageGroupDirections,
  pageHeadingLevels,
  pageImageFits,
  pageSectionAlignments,
  pageSectionCapabilities,
  pageSectionJustify,
  pageSectionTypes,
  pageShadowTokens,
  pageTextAlignments,
  pageTextFormats,
} from "../../../core/services/pages/pageDocumentV2";
import {
  getPageSectionVariantOptions,
  pageSectionTemplateRegistry,
} from "../../../core/services/pages/pageSectionTemplates";

const validSectionPaths = new Set([
  "layout.columns",
  "layout.maxWidth",
  "layout.align",
  "layout.justify",
  "style.background",
  "style.backgroundType",
  "style.accent",
  "style.radius",
  "style.shadow",
  "spacing.paddingTop",
  "spacing.paddingBottom",
  "spacing.paddingLeft",
  "spacing.paddingRight",
  "spacing.gap",
  "visibility.visible",
  "visibility.authOnly",
]);

const validBlockPaths = new Set([
  "style.width",
  "style.align",
  "style.textColor",
  "style.background",
  "style.backgroundType",
  "style.opacity",
  "style.radius",
  "style.shadow",
  "style.borderColor",
  "style.padding.top",
  "style.padding.right",
  "style.padding.bottom",
  "style.padding.left",
  "style.margin.top",
  "style.margin.right",
  "style.margin.bottom",
  "style.margin.left",
  "visibility.visible",
]);

const pathKey = (path: readonly string[]) => path.join(".");

const ownerOptionSets = new Set<readonly string[]>([
  pageBackgroundTypes,
  pageBlockWidths,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageColumnDistributions,
  pageDividerTones,
  pageGroupDirections,
  pageHeadingLevels,
  pageImageFits,
  pageSectionAlignments,
  pageSectionJustify,
  pageShadowTokens,
  pageTextAlignments,
  pageTextFormats,
]);

const expectControlPath = (control: PageEditorControlDefinition, validPaths: Set<string>) => {
  expect(control.path.length).toBeGreaterThan(0);
  expect(control.overridePath.length).toBeGreaterThan(0);
  expect(validPaths.has(pathKey(control.path))).toBe(true);
  expect(validPaths.has(pathKey(control.overridePath))).toBe(true);
};

describe("page editor control registry", () => {
  test("universal section controls use schema-owned array paths and owner options", () => {
    for (const control of pageUniversalSectionControls) {
      expect(control.target).toBe("section");
      expectControlPath(control, validSectionPaths);
    }

    expect(
      pageUniversalSectionControls.find((control) => control.id === "section.layout.align")
    ).toMatchObject({ input: "segmented", options: pageSectionAlignments });
    expect(
      pageUniversalSectionControls.find((control) => control.id === "section.layout.justify")
    ).toMatchObject({ input: "segmented", options: pageSectionJustify });
    expect(
      pageUniversalSectionControls.find((control) => control.id === "section.style.backgroundType")
    ).toMatchObject({ input: "select", options: pageBackgroundTypes });
    expect(
      pageUniversalSectionControls.find((control) => control.id === "section.style.shadow")
    ).toMatchObject({ input: "select", options: pageShadowTokens });
  });

  test("universal block controls use schema-owned array paths and owner options", () => {
    for (const control of pageUniversalBlockControls) {
      expect(control.target).toBe("block");
      expectControlPath(control, validBlockPaths);
    }

    expect(
      pageUniversalBlockControls.find((control) => control.id === "block.style.align")
    ).toMatchObject({ input: "segmented", options: pageTextAlignments });
    expect(
      pageUniversalBlockControls.find((control) => control.id === "block.style.width")
    ).toMatchObject({ input: "segmented", options: pageBlockWidths });
    expect(
      pageUniversalBlockControls.find((control) => control.id === "block.style.backgroundType")
    ).toMatchObject({ input: "select", options: pageBackgroundTypes });
    expect(
      pageUniversalBlockControls.find((control) => control.id === "block.style.shadow")
    ).toMatchObject({ input: "select", options: pageShadowTokens });
  });

  test("section and block capability coverage is complete", () => {
    expect(Object.keys(pageSectionCapabilities).sort()).toEqual([...pageSectionTypes].sort());
    for (const type of pageSectionTypes) {
      const capability = getPageSectionCapability(type);
      expect(capability).toBeTruthy();
      if (!capability.insertable) expect(capability.reason).toBeTruthy();
    }

    expect(Object.keys(pageBlockCapabilities).sort()).toEqual([...pageBlockTypes].sort());
    for (const type of pageBlockTypes) {
      const capability = getPageBlockCapability(type);
      expect(capability).toBeTruthy();
      expect(typeof capability.editorInsertable).toBe("boolean");
      if (!capability.insertable) {
        expect(capability.reason).toBeTruthy();
      }
      if (!capability.editorInsertable) {
        expect(getPageEditorControlsForTarget({ kind: "block", type })).toEqual([]);
      }
    }
    expect(pageBlockCapabilities.columns).toMatchObject({
      editorInsertable: true,
      insertable: true,
      assistantEmittable: true,
      runtimeRenderer: "real",
    });
    expect("reason" in pageBlockCapabilities.columns).toBe(false);
    expect(pageBlockCapabilities.gallery).toMatchObject({
      editorInsertable: false,
      insertable: false,
      assistantEmittable: false,
      runtimeRenderer: "real",
      reason: "gallery-editor-controls-pending",
    });
    expect(pageBlockCapabilities.collection.editorInsertable).toBe(false);
  });

  test("insertable sections expose universal controls and blocks expose universal plus per-type controls", () => {
    for (const type of pageSectionTypes) {
      const controls = getPageEditorControlsForTarget({ kind: "section", type });
      if (pageSectionCapabilities[type].insertable) {
        const variantControl = getPageSectionVariantControl(type);
        expect(controls.map((control) => control.id)).toEqual(
          [...pageUniversalSectionControls, ...(variantControl ? [variantControl] : [])].map(
            (control) => control.id
          )
        );
      } else {
        expect(controls).toEqual([]);
      }
    }

    for (const type of pageBlockTypes) {
      const controls = getPageEditorControlsForTarget({ kind: "block", type });
      if (pageBlockCapabilities[type].editorInsertable) {
        expect(controls.map((control) => control.id)).toEqual(
          [...pageUniversalBlockControls, ...pageBlockControlRegistry[type]].map(
            (control) => control.id
          )
        );
        if (type !== "container") {
          expect(pageBlockControlRegistry[type].length).toBeGreaterThan(0);
        }
      } else {
        expect(controls).toEqual([]);
        expect(pageBlockControlRegistry[type]).toEqual([]);
      }
    }
  });

  test("insertable section catalog is frozen to the audited 11 sections", () => {
    const insertableSections = pageSectionTypes.filter(
      (type) => pageSectionCapabilities[type].insertable
    );
    expect(insertableSections).toEqual([
      "hero",
      "content",
      "feature-grid",
      "media-split",
      "timeline",
      "gallery",
      "comparison",
      "faq",
      "testimonials",
      "cta",
      "custom",
    ]);
    for (const type of insertableSections) {
      expect(pageSectionCapabilities[type]).toEqual({
        insertable: true,
        assistantEmittable: true,
      });
    }
  });

  test("insertable block catalog is frozen to the audited 14 blocks", () => {
    const insertableBlocks = pageBlockTypes.filter(
      (type) => pageBlockCapabilities[type].editorInsertable
    );
    expect(insertableBlocks).toEqual([
      "heading",
      "text",
      "button",
      "image",
      "video",
      "list",
      "card",
      "divider",
      "spacer",
      "statistic",
      "quote",
      "container",
      "columns",
      "group",
    ]);
    for (const type of insertableBlocks) {
      expect(pageBlockCapabilities[type]).toMatchObject({
        editorInsertable: true,
        insertable: true,
        assistantEmittable: true,
        runtimeRenderer: "real",
      });
      expect("reason" in pageBlockCapabilities[type]).toBe(false);
    }
    // Editor-insertable and runtime-insertable gates are intentionally the
    // same set today; promoting one without the other is a contract change.
    for (const type of pageBlockTypes) {
      expect(pageBlockCapabilities[type].insertable).toBe(
        pageBlockCapabilities[type].editorInsertable
      );
    }
  });

  test("all 6 gated sections stay non-insertable with frozen capability reasons", () => {
    const gatedSectionReasons = {
      template: "template-section-boundary",
      navigation: "runtime-navigation-boundary",
      collection: "collection-section-boundary",
      filters: "listing-section-boundary",
      "lead-form": "form-section-boundary",
      embed: "embed-section-boundary",
    } as const;

    expect(pageSectionTypes.filter((type) => !pageSectionCapabilities[type].insertable)).toEqual(
      Object.keys(gatedSectionReasons)
    );
    for (const [type, reason] of Object.entries(gatedSectionReasons)) {
      expect(pageSectionCapabilities[type as keyof typeof gatedSectionReasons]).toEqual({
        insertable: false,
        assistantEmittable: false,
        reason,
      });
    }
  });

  test("all 5 gated blocks stay non-insertable with frozen capability reasons", () => {
    const gatedBlockReasons = {
      gallery: "gallery-editor-controls-pending",
      form: "form-editor-controls-pending",
      collection: "collection-editor-controls-pending",
      embed: "embed-editor-controls-pending",
      icon: "icon-runtime-renderer-pending",
    } as const;

    expect(pageBlockTypes.filter((type) => !pageBlockCapabilities[type].editorInsertable)).toEqual(
      Object.keys(gatedBlockReasons)
    );
    for (const [type, reason] of Object.entries(gatedBlockReasons)) {
      expect(pageBlockCapabilities[type as keyof typeof gatedBlockReasons]).toMatchObject({
        editorInsertable: false,
        insertable: false,
        assistantEmittable: false,
        reason,
      });
    }
  });

  test("icon stays the only placeholder runtime renderer and remains non-insertable", () => {
    expect(pageBlockCapabilities.icon.insertable).toBe(false);
    expect(pageBlockCapabilities.icon.editorInsertable).toBe(false);
    expect(pageBlockCapabilities.icon.runtimeRenderer).toBe("placeholder");
    expect(
      pageBlockTypes.filter((type) => pageBlockCapabilities[type].runtimeRenderer !== "real")
    ).toEqual(["icon"]);
  });

  test("section variant controls are type-scoped from the template registry", () => {
    for (const [type, definition] of Object.entries(pageSectionTemplateRegistry)) {
      const control = getPageSectionVariantControl(
        type as keyof typeof pageSectionTemplateRegistry
      );
      expect(control).toMatchObject({
        id: `section.${type}.variant`,
        label: "Variant",
        panel: "layout",
        path: ["variant"],
        responsive: false,
        options: definition.variants,
      });
      expect(
        getPageSectionVariantOptions(type as keyof typeof pageSectionTemplateRegistry)
      ).toEqual(definition.variants);
    }

    for (const type of pageSectionTypes) {
      if (pageSectionCapabilities[type].insertable) {
        expect(getPageSectionVariantControl(type)).toBeTruthy();
      } else {
        expect(getPageSectionVariantControl(type)).toBeNull();
      }
    }

    expect(getPageSectionVariantControl("hero")?.options).toEqual([
      "default",
      "split",
      "centered",
      "full-width",
    ]);
    expect(getPageSectionVariantControl("cta")?.options).toEqual([
      "centered",
      "full-width",
      "default",
    ]);
    expect(getPageSectionVariantControl("navigation")).toBeNull();
  });

  test("per-type block controls are complete, owner-backed, and allowlist-safe", () => {
    expect(Object.keys(pageBlockControlRegistry).sort()).toEqual([...pageBlockTypes].sort());

    for (const type of pageBlockTypes) {
      for (const control of pageBlockControlRegistry[type]) {
        expect(control.target).toBe("block");
        expect(control.overridePath).toEqual(control.path);
        if (control.path[0] === "props") {
          const prop = control.path[1];
          expect(prop).toBeTruthy();
          expect(pageBlockPropKeys[type].includes(prop!)).toBe(true);
        }
      }
    }

    const allControls = [
      ...pageUniversalSectionControls,
      ...pageUniversalBlockControls,
      ...Object.values(pageBlockControlRegistry).flat(),
    ];
    for (const control of allControls) {
      if (control.input !== "select" && control.input !== "segmented") continue;
      expect(control.options).toBeTruthy();
      expect(ownerOptionSets.has(control.options!)).toBe(true);
    }
  });
});
