import { describe, expect, test } from "vitest";

import {
  getPageBlockCapability,
  getPageEditorControlsForTarget,
  getPageResponsiveEffectiveVisible,
  getPageSectionCapability,
  getPageSectionVariantControl,
  pageBlockControlRegistry,
  pageEditorDeviceMetadata,
  pageResponsiveHideToggles,
  pageSectionStackVerticalControl,
  pageTypographyBlockControls,
  pageUniversalBlockControls,
  pageUniversalSectionControls,
  projectPageResponsiveOverrideEntries,
  type PageEditorControlDefinition,
} from "../../../core/services/pages/pageEditorControlRegistry";
import {
  PAGE_COLLECTION_LIMIT_CLAMP,
  PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
  PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
  isPageTypographyCapableBlockType,
  pageBackgroundTypes,
  pageBadgeIconPositions,
  pageBadgeIcons,
  pageBadgeShapes,
  pageBadgeSizes,
  pageBadgeVariants,
  pageBadgeWeights,
  pageBlockCapabilities,
  pageBlockDefaultProps,
  pageBlockPropKeys,
  pageBlockTypes,
  pageBlockWidths,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageCollectionPaginationModes,
  pageColumnDistributions,
  pageDividerTones,
  pageFiltersBlockLayouts,
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
  pageTypographyCapableBlockTypes,
  pageTypographyFontFamilies,
  pageTypographyFontSizes,
  pageTypographyFontWeights,
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
  "layout.stackVertical",
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
  "style.fontFamily",
  "style.fontSize",
  "style.fontWeight",
  "style.lineHeight",
  "style.letterSpacing",
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
  pageBadgeIconPositions,
  pageBadgeIcons,
  pageBadgeShapes,
  pageBadgeSizes,
  pageBadgeVariants,
  pageBadgeWeights,
  pageBlockWidths,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageCollectionPaginationModes,
  pageColumnDistributions,
  pageDividerTones,
  pageFiltersBlockLayouts,
  pageGroupDirections,
  pageHeadingLevels,
  pageImageFits,
  pageSectionAlignments,
  pageSectionJustify,
  pageShadowTokens,
  pageTextAlignments,
  pageTextFormats,
  pageTypographyFontFamilies,
  pageTypographyFontSizes,
  pageTypographyFontWeights,
]);

/**
 * Text-capable types whose Typography "Text align" presentation reuses the
 * universal `block.style.align` stored path; heading/text relocate their own
 * `props.align` control instead.
 */
const styleAlignTypographyBlockTypes = pageTypographyCapableBlockTypes.filter(
  (type) => type !== "heading" && type !== "text"
);

const expectedUniversalBlockControls = (type: (typeof pageBlockTypes)[number]) =>
  (styleAlignTypographyBlockTypes as readonly string[]).includes(type)
    ? pageUniversalBlockControls.filter((control) => control.id !== "block.style.align")
    : pageUniversalBlockControls;

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
    // TASK-457: the collection block joined the editor-insertable catalog.
    expect(pageBlockCapabilities.collection.editorInsertable).toBe(true);
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
          [...expectedUniversalBlockControls(type), ...pageBlockControlRegistry[type]].map(
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

  test("insertable block catalog is frozen to the audited 18 blocks (TASK-471-04 badge addition)", () => {
    const insertableBlocks = pageBlockTypes.filter(
      (type) => pageBlockCapabilities[type].editorInsertable
    );
    expect(insertableBlocks).toEqual([
      "heading",
      "text",
      "badge",
      "button",
      "image",
      "video",
      "form",
      "list",
      "card",
      "collection",
      "filters",
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
        // TASK-456/457/459-02 deliberate scope: the form, collection, and
        // filters blocks are author-insertable but stay OUTSIDE the
        // assistant emission vocabulary — assistant plans must not invent
        // form or content-type/query references (the blueprint composer
        // binds RESOLVED query ids explicitly instead).
        assistantEmittable: type !== "form" && type !== "collection" && type !== "filters",
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

  test("all 3 gated blocks stay non-insertable with frozen capability reasons", () => {
    // TASK-456/457 amendments: "form" and "collection" left this set
    // deliberately (editor controls shipped). Any further promotion requires
    // an explicit capability change and follow-on task, exactly like those.
    const gatedBlockReasons = {
      gallery: "gallery-editor-controls-pending",
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

  test("typography cluster is exposed on every text-capable block and nowhere else", () => {
    expect(pageTypographyCapableBlockTypes).toEqual([
      "heading",
      "text",
      "button",
      "list",
      "card",
      "statistic",
      "quote",
    ]);
    expect(pageTypographyBlockControls.map((control) => control.id)).toEqual([
      "block.style.fontFamily",
      "block.style.fontSize",
      "block.style.fontWeight",
      "block.style.lineHeight",
      "block.style.letterSpacing",
    ]);
    for (const control of pageTypographyBlockControls) {
      expect(control.target).toBe("block");
      expect(control.panel).toBe("typography");
      expect(control.responsive).toBe(true);
      expect(control.path).toEqual(["style", control.id.split(".").at(-1)]);
      expect(control.overridePath).toEqual(control.path);
    }
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.fontFamily")
    ).toMatchObject({ input: "segmented", options: pageTypographyFontFamilies });
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.fontSize")
    ).toMatchObject({ input: "segmented", options: pageTypographyFontSizes });
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.fontWeight")
    ).toMatchObject({ input: "segmented", options: pageTypographyFontWeights });
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.lineHeight")
    ).toMatchObject({
      input: "number",
      clamp: PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
      step: 0.05,
      unit: "",
    });
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.letterSpacing")
    ).toMatchObject({
      input: "number",
      clamp: PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
      step: 0.5,
      unit: "px",
    });

    for (const type of pageBlockTypes) {
      const controls = getPageEditorControlsForTarget({ kind: "block", type });
      const typographyControls = controls.filter((control) => control.panel === "typography");
      if (isPageTypographyCapableBlockType(type)) {
        // Cluster plus the relocated text-align presentation.
        expect(typographyControls.map((control) => control.id)).toEqual([
          ...pageTypographyBlockControls.map((control) => control.id),
          type === "heading" || type === "text" ? `block.${type}.props.align` : "block.style.align",
        ]);
        const alignControl = typographyControls.at(-1)!;
        expect(alignControl).toMatchObject({
          label: "Text align",
          input: "segmented",
          options: pageTextAlignments,
        });
        // Relocation keeps the stored path identical to the legacy control.
        expect(alignControl.path).toEqual(
          type === "heading" || type === "text" ? ["props", "align"] : ["style", "align"]
        );
        // No duplicate presentation of the same stored align path.
        expect(
          controls.filter((control) => control.path.join(".") === alignControl.path.join("."))
        ).toHaveLength(1);
      } else {
        expect(typographyControls).toEqual([]);
      }
    }

    // Sections never expose typography controls.
    for (const type of pageSectionTypes) {
      const controls = getPageEditorControlsForTarget({ kind: "section", type });
      expect(controls.filter((control) => control.panel === "typography")).toEqual([]);
    }
  });

  test("responsive panel contract owns device metadata, hide toggles, and the stack toggle (TASK-425)", () => {
    // One shared source for switcher labels and canvas width readouts.
    expect(pageEditorDeviceMetadata).toEqual({
      desktop: { label: "Desktop", width: 1080 },
      tablet: { label: "Tablet", width: 744 },
      mobile: { label: "Mobile", width: 390 },
    });

    // Per-breakpoint hide toggles reuse the EXISTING schema visibility paths.
    expect(pageResponsiveHideToggles.map((toggle) => toggle.id)).toEqual([
      "responsive.hide.desktop",
      "responsive.hide.tablet",
      "responsive.hide.mobile",
    ]);
    for (const toggle of pageResponsiveHideToggles) {
      expect(toggle.path).toEqual(["visibility", "visible"]);
      expect(toggle.label).toBe(`Hide on ${toggle.breakpoint}`);
    }

    // The vertical-layout toggle is a real registry control on the new
    // schema-owned layout.stackVertical path, scoped to the Responsive panel.
    expect(pageSectionStackVerticalControl).toMatchObject({
      id: "section.layout.stackVertical",
      panel: "responsive",
      target: "section",
      label: "Stack vertically",
      path: ["layout", "stackVertical"],
      overridePath: ["layout", "stackVertical"],
      input: "switch",
      responsive: true,
    });
    expect(
      getPageEditorControlsForTarget({ kind: "section", type: "hero" }).some(
        (control) => control.id === pageSectionStackVerticalControl.id
      )
    ).toBe(true);
    // Blocks never expose the section stacking surface.
    for (const type of pageBlockTypes) {
      expect(
        getPageEditorControlsForTarget({ kind: "block", type }).filter(
          (control) => control.panel === "responsive"
        )
      ).toEqual([]);
    }
  });

  test("effective visibility and the override-state projection follow the cascade (TASK-425)", () => {
    const source = {
      visibility: { visible: true },
      responsive: { mobile: { visibility: { visible: false } } },
    };
    expect(getPageResponsiveEffectiveVisible(source, "desktop")).toBe(true);
    expect(getPageResponsiveEffectiveVisible(source, "tablet")).toBe(true);
    expect(getPageResponsiveEffectiveVisible(source, "mobile")).toBe(false);
    expect(getPageResponsiveEffectiveVisible({ visibility: { visible: false } }, "mobile")).toBe(
      false
    );

    // Desktop is the base: every responsive-capable field projects as "base".
    const desktopEntries = projectPageResponsiveOverrideEntries(
      { kind: "section", type: "hero" },
      "desktop",
      undefined
    );
    expect(desktopEntries.length).toBeGreaterThan(0);
    expect(desktopEntries.every((entry) => entry.state === "base")).toBe(true);
    // The non-responsive variant control never appears in the projection.
    expect(desktopEntries.some((entry) => entry.control.id === "section.hero.variant")).toBe(false);

    const mobileEntries = projectPageResponsiveOverrideEntries(
      { kind: "section", type: "hero" },
      "mobile",
      { layout: { stackVertical: true }, spacing: { gap: 12 } }
    );
    const byId = new Map(mobileEntries.map((entry) => [entry.control.id, entry.state]));
    expect(byId.get("section.layout.stackVertical")).toBe("override");
    expect(byId.get("section.spacing.gap")).toBe("override");
    expect(byId.get("section.layout.maxWidth")).toBe("inherited");
    expect(byId.get("section.visibility.visible")).toBe("inherited");

    const blockEntries = projectPageResponsiveOverrideEntries(
      { kind: "block", type: "heading" },
      "tablet",
      { props: { text: "Tablet headline" } }
    );
    const blockById = new Map(blockEntries.map((entry) => [entry.control.id, entry.state]));
    expect(blockById.get("block.heading.props.text")).toBe("override");
    expect(blockById.get("block.style.width")).toBe("inherited");

    // Unsupported targets project no entries instead of fake controls.
    expect(
      projectPageResponsiveOverrideEntries({ kind: "section", type: "navigation" }, "mobile", {})
    ).toEqual([]);
    expect(
      projectPageResponsiveOverrideEntries({ kind: "block", type: "gallery" }, "mobile", {})
    ).toEqual([]);
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

    expect(pageBlockControlRegistry.badge.map((control) => control.id)).toEqual([
      "block.badge.props.text",
      "block.badge.props.variant",
      "block.badge.props.size",
      "block.badge.props.shape",
      "block.badge.props.weight",
      "block.badge.props.background",
      "block.badge.props.textColor",
      "block.badge.props.icon",
      "block.badge.props.iconPosition",
    ]);
    expect(
      pageBlockControlRegistry.badge.find((control) => control.id.endsWith(".variant"))
    ).toMatchObject({
      input: "segmented",
      options: pageBadgeVariants,
    });
    expect(
      pageBlockControlRegistry.badge.find((control) => control.id.endsWith(".size"))
    ).toMatchObject({
      input: "segmented",
      options: pageBadgeSizes,
    });
    expect(
      pageBlockControlRegistry.badge.find((control) => control.id.endsWith(".shape"))
    ).toMatchObject({
      input: "segmented",
      options: pageBadgeShapes,
    });
    expect(
      pageBlockControlRegistry.badge.find((control) => control.id.endsWith(".weight"))
    ).toMatchObject({
      input: "segmented",
      options: pageBadgeWeights,
    });
    expect(
      pageBlockControlRegistry.badge.find((control) => control.id.endsWith(".icon"))
    ).toMatchObject({
      input: "select",
      options: pageBadgeIcons,
    });
    expect(
      pageBlockControlRegistry.badge.find((control) => control.id.endsWith(".iconPosition"))
    ).toMatchObject({
      input: "segmented",
      options: pageBadgeIconPositions,
    });

    const allControls = [
      ...pageUniversalSectionControls,
      ...pageUniversalBlockControls,
      ...Object.values(pageBlockControlRegistry).flat(),
    ];
    for (const control of allControls) {
      if (control.input !== "select" && control.input !== "segmented") continue;
      if (control.optionsSource) {
        // Dynamic reference pickers (TASK-456/457) never carry static
        // options; the editor shell resolves the named source instead.
        expect(control.options, control.id).toBeUndefined();
        expect(
          ["forms", "contentTypes", "listingQueries", "listingQueriesAll", "listingTemplates"],
          control.id
        ).toContain(control.optionsSource);
        // `filterBy` is meaningful only with a dynamic source and must name
        // a sibling prop key owned by the same block type.
        if (control.filterBy) {
          const type = control.id.split(".")[1] as keyof typeof pageBlockPropKeys;
          expect(pageBlockPropKeys[type], control.id).toContain(control.filterBy);
        }
        continue;
      }
      expect(control.filterBy, control.id).toBeUndefined();
      expect(control.options).toBeTruthy();
      expect(ownerOptionSets.has(control.options!)).toBe(true);
    }
  });

  test("form block content controls are frozen to the TASK-456 contract", () => {
    expect(pageBlockControlRegistry.form.map((control) => control.id)).toEqual([
      "block.form.props.formId",
      "block.form.props.title",
    ]);
    const formIdControl = pageBlockControlRegistry.form[0]!;
    expect(formIdControl).toMatchObject({
      panel: "content",
      target: "block",
      label: "Form",
      path: ["props", "formId"],
      overridePath: ["props", "formId"],
      input: "select",
      optionsSource: "forms",
      // Schema-owned nullability: `pageBlockDefaultProps.form.formId` is null
      // (nullableStringSchema), so the combobox offers the "None" row.
      nullable: true,
      responsive: true,
    });
    expect(formIdControl.options).toBeUndefined();
    expect(formIdControl.fallback).toBeUndefined();
    expect(pageBlockControlRegistry.form[1]).toMatchObject({
      panel: "content",
      label: "Title",
      path: ["props", "title"],
      input: "text",
      fallback: "",
    });
    // The full target surface = universal block controls + the two content
    // controls; the form block is not typography-capable, so no cluster.
    expect(
      getPageEditorControlsForTarget({ kind: "block", type: "form" }).map((control) => control.id)
    ).toEqual([
      ...pageUniversalBlockControls.map((control) => control.id),
      "block.form.props.formId",
      "block.form.props.title",
    ]);
  });

  test("collection block content controls are frozen to the TASK-457 contract (+TASK-459-03 pagination)", () => {
    expect(pageBlockControlRegistry.collection.map((control) => control.id)).toEqual([
      "block.collection.props.contentTypeId",
      "block.collection.props.queryId",
      "block.collection.props.limit",
      "block.collection.props.templateId",
      "block.collection.props.paginationMode",
      "block.collection.props.pageSize",
    ]);
    const [
      contentTypeControl,
      queryControl,
      limitControl,
      templateControl,
      paginationModeControl,
      pageSizeControl,
    ] = pageBlockControlRegistry.collection;
    expect(contentTypeControl).toMatchObject({
      panel: "content",
      target: "block",
      label: "Content type",
      path: ["props", "contentTypeId"],
      overridePath: ["props", "contentTypeId"],
      input: "select",
      optionsSource: "contentTypes",
      // Schema-owned nullability: `pageBlockDefaultProps.collection.*Id` are
      // null (nullableStringSchema), so each combobox offers the "None" row.
      nullable: true,
      responsive: true,
    });
    expect(contentTypeControl!.options).toBeUndefined();
    expect(contentTypeControl!.fallback).toBeUndefined();
    expect(contentTypeControl!.filterBy).toBeUndefined();
    expect(queryControl).toMatchObject({
      panel: "content",
      label: "Saved query",
      path: ["props", "queryId"],
      input: "select",
      optionsSource: "listingQueries",
      // Saved queries are scoped to the chosen content type (the editor
      // shell filters by this sibling prop and clears queryId on change).
      filterBy: "contentTypeId",
      nullable: true,
    });
    expect(limitControl).toMatchObject({
      panel: "content",
      label: "Limit",
      path: ["props", "limit"],
      input: "number",
      // TASK-459-03 clamp unification: the single owner bound (1..24 from
      // `contentListLimitMax`) replaced the old 1..50 ceiling the runtime
      // silently truncated. Entry count is a unitless readout.
      clamp: { min: PAGE_COLLECTION_LIMIT_CLAMP.min, max: PAGE_COLLECTION_LIMIT_CLAMP.max },
      unit: "",
      fallback: 6,
    });
    expect(PAGE_COLLECTION_LIMIT_CLAMP).toEqual({ min: 1, max: 24 });
    expect(templateControl).toMatchObject({
      panel: "content",
      label: "Listing template",
      path: ["props", "templateId"],
      input: "select",
      optionsSource: "listingTemplates",
      nullable: true,
    });
    expect(templateControl!.filterBy).toBeUndefined();
    // TASK-459-03 visitor pagination: a segmented mode strip (owner enum,
    // default "none" keeps existing pages unchanged) and a nullable page-size
    // number bound to the same owner clamp ("follow limit" when unset).
    expect(paginationModeControl).toMatchObject({
      panel: "content",
      label: "Pagination",
      path: ["props", "paginationMode"],
      input: "segmented",
      options: pageCollectionPaginationModes,
      fallback: "none",
      responsive: true,
    });
    expect(pageCollectionPaginationModes).toEqual(["none", "paged", "load-more"]);
    expect(pageSizeControl).toMatchObject({
      panel: "content",
      label: "Page size",
      path: ["props", "pageSize"],
      input: "number",
      clamp: { min: PAGE_COLLECTION_LIMIT_CLAMP.min, max: PAGE_COLLECTION_LIMIT_CLAMP.max },
      unit: "",
    });
    // Nullable schema default (`pageSize: null` = follow limit): no scalar
    // fallback may lie about the unset state.
    expect(pageSizeControl!.fallback).toBeUndefined();
    // The full target surface = universal block controls + the six content
    // controls; the collection block is not typography-capable, so no cluster.
    expect(
      getPageEditorControlsForTarget({ kind: "block", type: "collection" }).map(
        (control) => control.id
      )
    ).toEqual([
      ...pageUniversalBlockControls.map((control) => control.id),
      "block.collection.props.contentTypeId",
      "block.collection.props.queryId",
      "block.collection.props.limit",
      "block.collection.props.templateId",
      "block.collection.props.paginationMode",
      "block.collection.props.pageSize",
    ]);
  });

  test("filters block content controls are frozen to the TASK-459-02 contract", () => {
    expect(pageBlockControlRegistry.filters.map((control) => control.id)).toEqual([
      "block.filters.props.queryId",
      "block.filters.props.facets",
      "block.filters.props.layout",
      "block.filters.props.autoApply",
      "block.filters.props.showSearch",
      "block.filters.props.showCount",
      "block.filters.props.searchLabel",
      "block.filters.props.searchPlaceholder",
      "block.filters.props.applyLabel",
    ]);
    const controlsById = new Map(
      pageBlockControlRegistry.filters.map((control) => [control.id, control])
    );
    expect(controlsById.get("block.filters.props.queryId")).toMatchObject({
      panel: "content",
      target: "block",
      label: "Saved query",
      path: ["props", "queryId"],
      input: "select",
      // Unscoped source: the filters block binds to ANY saved listing query
      // (no contentTypeId sibling exists to scope by).
      optionsSource: "listingQueriesAll",
      // Schema-owned nullability: `pageBlockDefaultProps.filters.queryId` is
      // null (nullableStringSchema), so the combobox offers the "None" row.
      nullable: true,
      responsive: true,
    });
    expect(controlsById.get("block.filters.props.queryId")?.filterBy).toBeUndefined();
    expect(controlsById.get("block.filters.props.facets")).toMatchObject({
      panel: "content",
      label: "Facets",
      path: ["props", "facets"],
      input: "facets",
    });
    expect(controlsById.get("block.filters.props.layout")).toMatchObject({
      panel: "layout",
      input: "segmented",
      options: ["horizontal", "sidebar"],
      fallback: "horizontal",
    });
    for (const toggle of ["autoApply", "showSearch", "showCount"]) {
      expect(controlsById.get(`block.filters.props.${toggle}`)).toMatchObject({
        panel: "content",
        input: "switch",
        // Schema defaults are true: the form auto-applies, shows the search
        // row, and shows the result count unless explicitly disabled.
        fallback: true,
      });
    }
    expect(controlsById.get("block.filters.props.applyLabel")).toMatchObject({
      input: "text",
      fallback: "Apply filters",
    });
    // The full target surface = universal block controls + the nine content
    // controls; the filters block is not typography-capable, so no cluster.
    expect(
      getPageEditorControlsForTarget({ kind: "block", type: "filters" }).map(
        (control) => control.id
      )
    ).toEqual([
      ...pageUniversalBlockControls.map((control) => control.id),
      ...pageBlockControlRegistry.filters.map((control) => control.id),
    ]);
  });

  test("display fallbacks mirror the pageDocumentV2 schema defaults (TASK-449 bug #9)", () => {
    // Block style fields whose unset state renders exactly like the schema
    // default carry that default as the display fallback.
    const universalById = new Map(pageUniversalBlockControls.map((entry) => [entry.id, entry]));
    expect(universalById.get("block.style.opacity")?.fallback).toBe(1);
    expect(universalById.get("block.style.radius")?.fallback).toBe(0);
    expect(universalById.get("block.style.shadow")?.fallback).toBe("none");
    expect(universalById.get("block.style.backgroundType")?.fallback).toBe("none");
    expect(universalById.get("block.visibility.visible")?.fallback).toBe(true);
    for (const side of ["top", "right", "bottom", "left"]) {
      expect(universalById.get(`block.style.padding.${side}`)?.fallback).toBe(0);
      expect(universalById.get(`block.style.margin.${side}`)?.fallback).toBe(0);
    }

    // Unset typography tokens and block width/align mean "inherit the baked
    // styling": no token is render-equivalent, so they must NOT lie with a
    // fallback. Letter spacing is the exception (baked classes set no
    // tracking, so unset renders as 0px).
    const typographyById = new Map(pageTypographyBlockControls.map((entry) => [entry.id, entry]));
    expect(typographyById.get("block.style.fontFamily")?.fallback).toBeUndefined();
    expect(typographyById.get("block.style.fontSize")?.fallback).toBeUndefined();
    expect(typographyById.get("block.style.fontWeight")?.fallback).toBeUndefined();
    expect(typographyById.get("block.style.lineHeight")?.fallback).toBeUndefined();
    expect(typographyById.get("block.style.letterSpacing")?.fallback).toBe(0);
    expect(universalById.get("block.style.width")?.fallback).toBeUndefined();
    expect(universalById.get("block.style.align")?.fallback).toBeUndefined();
    expect(universalById.get("block.style.textColor")?.fallback).toBeUndefined();
    expect(universalById.get("block.style.background")?.fallback).toBeUndefined();
    expect(universalById.get("block.style.borderColor")?.fallback).toBeUndefined();

    // Block prop fallbacks come straight from the owner default props, so a
    // degenerate document still presents the schema default (heading level
    // h2), never a lying first option.
    for (const type of pageBlockTypes) {
      for (const control of pageBlockControlRegistry[type]) {
        if (control.path[0] !== "props") continue;
        const schemaDefault = pageBlockDefaultProps[type][control.path[1]!];
        if (
          typeof schemaDefault === "string" ||
          typeof schemaDefault === "number" ||
          typeof schemaDefault === "boolean"
        ) {
          expect(control.fallback, control.id).toBe(schemaDefault);
        } else {
          expect(control.fallback, control.id).toBeUndefined();
        }
      }
    }
    const headingLevel = pageBlockControlRegistry.heading.find(
      (entry) => entry.id === "block.heading.props.level"
    );
    expect(headingLevel?.fallback).toBe("h2");
  });
});
