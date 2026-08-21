import { describe, expect, test } from "vitest";

import {
  getPageBlockCapability,
  getPageEditorControlsForTarget,
  getPageResponsiveEffectiveVisible,
  getPageSectionCapability,
  getPageSectionVariantControl,
  isPageEditorControlVisible,
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
  ANIMATED_ICON_SIZE_CLAMP,
  ANIMATED_ICON_SPEED_CLAMP,
  animatedIconAnimations,
  animatedIconNames,
  pageBackgroundTypes,
  pageBadgeIconPositions,
  pageBadgeIcons,
  pageBadgeShapes,
  pageBadgeSizes,
  pageBadgeVariants,
  pageBadgeWeights,
  pageBlockCapabilities,
  pageBlockBorderStyles,
  pageBlockDecorationMotions,
  pageBlockDefaultProps,
  pageBlockPropKeys,
  pageBlockTypes,
  pageBlockWidths,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageCollectionPaginationModes,
  pageColumnTemplatePresets,
  pageColumnDistributions,
  pageDividerTones,
  pageFiltersBlockLayouts,
  pageGalleryLayouts,
  pageGroupDirections,
  pageHeadingLevels,
  pageImageFits,
  // ── TASK-534 ── declarative-interactivity control options.
  switcherVariants,
  scrollHintGlyphs,
  pageSectionAlignments,
  pageSectionCapabilities,
  pageSectionJustify,
  pageSectionScrollEffects,
  pageSectionTypes,
  pageShadowTokens,
  PAGE_PARALLAX_INTENSITY_CLAMP,
  pageTextAlignments,
  pageTextFormats,
  pageTiltStrengths,
  pageSurfacePresets,
  pageBlockHoverEffects,
  pageCompositions,
  pageLayerAnchors,
  pageMarqueeDirections,
  pageTypographyCapableBlockTypes,
  pageTypographyFontFamilies,
  pageTypographyFontSizes,
  pageTypographyFontWeights,
  pageTypographyTextTransforms,
  pageDividerAligns,
} from "../../../core/services/pages/pageDocumentV2";
import {
  getPageSectionVariantOptions,
  pageSectionTemplateRegistry,
} from "../../../core/services/pages/pageSectionTemplates";
import { FORM_EMBED_SUCCESS_BEHAVIORS } from "../../../core/services/renderContracts/formEmbedContract";
import { blockOptionCopy } from "../../../core/admin/ui/pages/editor/pageEditorOptions";

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
  "style.scrollEffect",
  "style.parallaxIntensity",
  // TASK-522-05-L01 section surface + composition.
  "style.surfacePreset",
  "style.composition",
  // TASK-525-01-L02 full-bleed background.
  "style.fullBleed",
  // TASK-531-01-L03 section glow group (arbitrary colored box-shadow).
  "style.glow.color",
  "style.glow.blur",
  "style.glow.spread",
  "style.glow.x",
  "style.glow.y",
  // ── TASK-534 ── section grain overlay.
  "style.noiseOverlay",
  // TASK-533-01-L03 asymmetric column ratio.
  "style.columnTemplate",
  // TASK-533-02-L03 per-edge section border (4 edges × color/width/style).
  "style.border.top.color",
  "style.border.top.width",
  "style.border.top.style",
  "style.border.right.color",
  "style.border.right.width",
  "style.border.right.style",
  "style.border.bottom.color",
  "style.border.bottom.width",
  "style.border.bottom.style",
  "style.border.left.color",
  "style.border.left.width",
  "style.border.left.style",
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
  "style.backgroundImage",
  "style.opacity",
  "style.radius",
  "style.shadow",
  "style.borderColor",
  "style.borderWidth",
  "style.borderStyle",
  "style.padding.top",
  "style.padding.right",
  "style.padding.bottom",
  "style.padding.left",
  "style.margin.top",
  "style.margin.right",
  "style.margin.bottom",
  "style.margin.left",
  // TASK-522-03 floating-drift decoration (universal).
  "style.decoration.motion",
  "style.decoration.delay",
  "style.decoration.duration",
  // TASK-522-04 mouse tilt (3D) + glare (universal).
  "style.tilt",
  "style.tiltGlare",
  // TASK-522-05-L02/L03 block glass/hover surface + layered-child placement.
  "style.surfacePreset",
  "style.hoverEffect",
  // TASK-524-02-L03 independent glass tint.
  "style.surfaceTint",
  "style.layer.x",
  "style.layer.y",
  "style.layer.z",
  "style.layer.anchor",
  // TASK-525-02-L03 per-block staggered reveal control.
  "style.revealDelay",
  // TASK-531-01-L03 block glow group (arbitrary colored box-shadow).
  "style.glow.color",
  "style.glow.blur",
  "style.glow.spread",
  "style.glow.x",
  "style.glow.y",
  // ── TASK-534 ── magnetic-hover flag (universal block control).
  "style.magnetic",
  // TASK-533-01-L03 block grid span.
  "style.colSpan",
  "style.rowSpan",
  "visibility.visible",
]);

const pathKey = (path: readonly string[]) => path.join(".");

const ownerOptionSets = new Set<readonly string[]>([
  FORM_EMBED_SUCCESS_BEHAVIORS,
  pageBackgroundTypes,
  pageBadgeIconPositions,
  pageBadgeIcons,
  pageBadgeShapes,
  pageBadgeSizes,
  pageBadgeVariants,
  pageBadgeWeights,
  pageBlockBorderStyles,
  pageBlockDecorationMotions,
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
  pageSectionScrollEffects,
  pageShadowTokens,
  pageTextAlignments,
  pageTextFormats,
  pageTiltStrengths,
  pageSurfacePresets,
  pageBlockHoverEffects,
  pageCompositions,
  pageLayerAnchors,
  pageMarqueeDirections,
  pageTypographyFontFamilies,
  pageTypographyFontSizes,
  pageTypographyFontWeights,
  // ── TASK-532 typography fidelity (Bundle B) option sets ──
  pageTypographyTextTransforms,
  pageDividerAligns,
  animatedIconNames,
  animatedIconAnimations,
  // ── TASK-534 ── declarative-interactivity control option sets.
  pageGalleryLayouts,
  switcherVariants,
  scrollHintGlyphs,
  // TASK-533-01-L03 curated column-ratio presets (all sanitizer-passing).
  pageColumnTemplatePresets,
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

    // TASK-521-02-L01 — section scroll/parallax descriptors (device-uniform).
    const scrollEffect = pageUniversalSectionControls.find(
      (control) => control.id === "section.scrollEffect"
    );
    expect(scrollEffect).toMatchObject({
      panel: "style",
      target: "section",
      input: "segmented",
      responsive: false,
    });
    expect(scrollEffect?.path).toEqual(["style", "scrollEffect"]);
    // Options are exactly the model enum (import-and-compare guards enum/UI drift).
    expect(scrollEffect?.options).toEqual([...pageSectionScrollEffects]);

    const parallaxIntensity = pageUniversalSectionControls.find(
      (control) => control.id === "section.parallaxIntensity"
    );
    expect(parallaxIntensity).toMatchObject({
      panel: "style",
      target: "section",
      input: "number",
      responsive: false,
      unit: "px",
      clamp: {
        min: PAGE_PARALLAX_INTENSITY_CLAMP.min,
        max: PAGE_PARALLAX_INTENSITY_CLAMP.max,
      },
    });
    expect(parallaxIntensity?.path).toEqual(["style", "parallaxIntensity"]);
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
      pageUniversalBlockControls.find((control) => control.id === "block.style.backgroundImage")
    ).toMatchObject({ input: "media" });
    expect(
      pageUniversalBlockControls.find((control) => control.id === "block.style.shadow")
    ).toMatchObject({ input: "select", options: pageShadowTokens });
    expect(
      pageUniversalBlockControls.find((control) => control.id === "block.style.borderStyle")
    ).toMatchObject({ input: "segmented", options: pageBlockBorderStyles });
  });

  // TASK-524-02-L04 — independent "Surface tint" alpha color control.
  test("pageUniversalBlockControls has a Surface tint alpha color control", () => {
    const control = pageUniversalBlockControls.find((c) => c.id === "block.surface.tint");
    expect(control).toBeTruthy();
    expect(control!.path).toEqual(["style", "surfaceTint"]);
    expect(control!.input).toBe("color");
    expect(control!.target).toBe("block");
    expect(control!.label).toBe("Surface tint");
    expect(typeof control!.responsive).toBe("boolean");
    expect(control!.responsive).toBe(true);
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
    // ── TASK-534 ── gallery is now editor-insertable (filter/layout controls
    // shipped), so it carries no capability reason and stays assistant-excluded.
    expect(pageBlockCapabilities.gallery).toMatchObject({
      editorInsertable: true,
      insertable: true,
      assistantEmittable: false,
      runtimeRenderer: "real",
    });
    expect("reason" in pageBlockCapabilities.gallery).toBe(false);
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
        // `container` has no per-type controls; every other insertable block
        // (incl. `customSvg`, enriched by TASK-522-02) has ≥1 per-type control.
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

  test("insertable block catalog is frozen to the audited 23 blocks (TASK-534 gallery/switcher/scrollHint additions)", () => {
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
      // TASK-534: gallery joined the editor-insertable catalog (filter controls).
      "gallery",
      "form",
      "list",
      "card",
      "collection",
      "filters",
      "divider",
      "spacer",
      "statistic",
      "icon",
      "quote",
      "container",
      "columns",
      "group",
      "customSvg",
      // TASK-534: the switcher + scrollHint interactivity blocks.
      "switcher",
      "scrollHint",
    ]);
    for (const type of insertableBlocks) {
      expect(pageBlockCapabilities[type]).toMatchObject({
        editorInsertable: true,
        insertable: true,
        // TASK-456/457/459-02 deliberate scope: the form, collection, and
        // filters blocks are author-insertable but stay OUTSIDE the
        // assistant emission vocabulary — assistant plans must not invent
        // form or content-type/query references (the blueprint composer
        // binds RESOLVED query ids explicitly instead). TASK-521-04: the
        // animated icon block is likewise author-insertable but NOT
        // assistant-emittable (the assistant does not invent decorative motion).
        // TASK-522-01: the custom-SVG block is likewise author-insertable but NOT
        // assistant-emittable (the assistant does not invent pasted SVG markup).
        // TASK-534: gallery, switcher, and scrollHint are author-insertable but NOT
        // assistant-emittable (the assistant does not invent galleries/tabs/hints).
        assistantEmittable:
          type !== "form" &&
          type !== "collection" &&
          type !== "filters" &&
          type !== "icon" &&
          type !== "customSvg" &&
          type !== "gallery" &&
          type !== "switcher" &&
          type !== "scrollHint",
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

  test("the remaining gated blocks stay non-insertable with frozen capability reasons", () => {
    // TASK-456/457 amendments: "form" and "collection" left this set
    // deliberately (editor controls shipped). TASK-521-04 promoted "icon" out of
    // this set (renderer case + palette + controls shipped). TASK-534 promoted
    // "gallery" out (filter/layout controls shipped). Any further promotion
    // requires an explicit capability change and follow-on task, exactly like those.
    // TASK-580-03-L01: "legacy-widget" joins the gated set BY DESIGN — it is a
    // migration-only read-only placeholder, never editor-insertable (reason
    // "unsupported", the derived default).
    const gatedBlockReasons = {
      embed: "embed-editor-controls-pending",
      "legacy-widget": "unsupported",
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

  test("icon is a real, insertable runtime renderer (TASK-521-04 flip)", () => {
    expect(pageBlockCapabilities.icon.insertable).toBe(true);
    expect(pageBlockCapabilities.icon.editorInsertable).toBe(true);
    expect(pageBlockCapabilities.icon.runtimeRenderer).toBe("real");
    expect(pageBlockCapabilities.icon).not.toHaveProperty("reason");
    // Every page block type now has a real runtime renderer (no placeholder left).
    expect(
      pageBlockTypes.filter((type) => pageBlockCapabilities[type].runtimeRenderer !== "real")
    ).toEqual([]);
  });

  test("icon block controls are the TASK-521-04 animated-icon descriptor set", () => {
    // Per-type controls live ONLY on the icon block (not the universal array).
    expect(pageBlockControlRegistry.icon.map((control) => control.id)).toEqual([
      "block.icon.props.name",
      "block.icon.props.animation",
      "block.icon.props.size",
      "block.icon.props.speed",
      "block.icon.props.color",
    ]);
    const nameControl = pageBlockControlRegistry.icon.find((c) => c.id.endsWith(".name"))!;
    expect(nameControl).toMatchObject({ input: "select", options: animatedIconNames });
    // Bare imported enum reference (identity), not a re-typed copy.
    expect(nameControl.options).toBe(animatedIconNames);
    const animationControl = pageBlockControlRegistry.icon.find((c) =>
      c.id.endsWith(".animation")
    )!;
    expect(animationControl).toMatchObject({
      input: "segmented",
      panel: "style",
      options: animatedIconAnimations,
    });
    expect(animationControl.options).toBe(animatedIconAnimations);
    expect(pageBlockControlRegistry.icon.find((c) => c.id.endsWith(".size"))).toMatchObject({
      input: "number",
      panel: "style",
      unit: "px",
      clamp: { min: ANIMATED_ICON_SIZE_CLAMP.min, max: ANIMATED_ICON_SIZE_CLAMP.max },
    });
    expect(pageBlockControlRegistry.icon.find((c) => c.id.endsWith(".speed"))).toMatchObject({
      input: "number",
      panel: "style",
      unit: "ms",
      clamp: { min: ANIMATED_ICON_SPEED_CLAMP.min, max: ANIMATED_ICON_SPEED_CLAMP.max },
    });
    expect(pageBlockControlRegistry.icon.find((c) => c.id.endsWith(".color"))).toMatchObject({
      input: "color",
      panel: "style",
    });
    // The icon controls do NOT leak onto the universal block-control array.
    expect(pageUniversalBlockControls.some((c) => c.id.startsWith("block.icon."))).toBe(false);
    expect(blockOptionCopy.icon).toEqual({
      label: "Icon",
      description: "Animated inline icon (spin / pulse / bounce / draw).",
    });
  });

  test("customSvg block controls are the TASK-522-02 SVG-paste descriptor set", () => {
    const controls = pageBlockControlRegistry.customSvg;
    expect(controls.map((control) => control.id)).toEqual([
      "block.customSvg.props.svg",
      "block.customSvg.props.label",
      "block.customSvg.props.drawIn",
      "block.customSvg.props.drawSpeed",
    ]);
    expect(controls.map((control) => control.input)).toEqual(["text", "text", "switch", "number"]);
    const drawSpeed = controls.find((c) => c.id.endsWith(".drawSpeed"))!;
    expect(drawSpeed).toMatchObject({
      input: "number",
      panel: "style",
      unit: "ms",
      clamp: { min: 600, max: 6000 },
    });
    // Live PageEditorControlDefinition shape only — no invented descriptor fields.
    for (const control of controls) {
      expect(control).not.toHaveProperty("kind");
      expect(control).not.toHaveProperty("showWhen");
      expect(control).not.toHaveProperty("prop");
      expect(control.target).toBe("block");
      expect(control.responsive).toBe(true);
    }
    // customSvg controls do NOT leak onto the universal block-control array.
    expect(pageUniversalBlockControls.some((c) => c.id.startsWith("block.customSvg."))).toBe(false);
    // Palette-insertable with icon-less copy (BlockOption has no `icon` field).
    expect(pageBlockCapabilities.customSvg.editorInsertable).toBe(true);
    expect(blockOptionCopy.customSvg).toEqual({
      label: "Custom SVG",
      description: "Paste a sanitized inline SVG (line drawings, logos, diagrams).",
    });
    expect(blockOptionCopy.customSvg).not.toHaveProperty("icon");
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

    // Unsupported targets project no entries instead of fake controls. TASK-534:
    // gallery is now insertable (filter controls), so `embed` is the gated block
    // that still projects nothing.
    expect(
      projectPageResponsiveOverrideEntries({ kind: "section", type: "navigation" }, "mobile", {})
    ).toEqual([]);
    expect(
      projectPageResponsiveOverrideEntries({ kind: "block", type: "embed" }, "mobile", {})
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

  // TASK-539-03-L01 — control reachability gates (base vs effective).
  test("reachability gates resolve base vs effective targets and fail closed", () => {
    const gate = (responsive: boolean, equals: string | number | boolean | null = true) =>
      ({
        id: "test.gated",
        panel: "content",
        target: "block",
        label: "Gated",
        path: ["props", "flag"],
        overridePath: ["props", "flag"],
        input: "switch",
        responsive,
        showWhen: { path: ["props", "flag"], equals },
      }) satisfies PageEditorControlDefinition;
    const targets = (base: unknown, effective: unknown) => ({
      baseTarget: base,
      effectiveTarget: effective,
    });
    // No gate => always visible; responsive gates read the EFFECTIVE target.
    expect(
      isPageEditorControlVisible({ ...gate(true), showWhen: undefined }, targets({}, {}))
    ).toBe(true);
    expect(
      isPageEditorControlVisible(
        gate(true),
        targets({ props: { flag: false } }, { props: { flag: true } })
      )
    ).toBe(true);
    // Base-only gates ALWAYS read the BASE target: a tablet/mobile override
    // can neither open nor close a base-only gate.
    expect(
      isPageEditorControlVisible(
        gate(false),
        targets({ props: { flag: false } }, { props: { flag: true } })
      )
    ).toBe(false);
    expect(
      isPageEditorControlVisible(
        gate(false),
        targets({ props: { flag: true } }, { props: { flag: false } })
      )
    ).toBe(true);
    // Strict equality, missing, and malformed values fail closed.
    expect(isPageEditorControlVisible(gate(true, "1"), targets({}, { props: { flag: 1 } }))).toBe(
      false
    );
    expect(isPageEditorControlVisible(gate(true), targets({}, { props: {} }))).toBe(false);
    expect(isPageEditorControlVisible(gate(true), targets({}, { props: { flag: "true" } }))).toBe(
      false
    );
  });
});
