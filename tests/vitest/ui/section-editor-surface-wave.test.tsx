// @vitest-environment happy-dom
//
// Section editor wave -- surface, colour and decoration.
//
// This suite owns what the Section editors say about the surface the section is painted
// with: the mounted colour inventory and its inheritance policy, saved-custom swatch
// handling, gradients, borders, overlays, shadow and motion, the decorative background
// image/video layers, and the numeric surface controls that clamp and round those values.
// Its sibling `section-editor-wave.test.tsx` owns the section's structure and contract.
//
// The stubbed admin primitives, the DOM query helpers and the mount harness are shared with
// that sibling and live in `./support/sectionEditorHarness`.

import { afterEach, expect, test, vi } from "vitest";

// Module scope, not a deferred import inside the first test: this suite mounts the same
// SectionEditors graph as its sibling, and deferring it made whichever test ran first absorb
// the whole transform inside its own `testTimeout` (4.0s of a 4.1s test on an idle box).
// Nothing here calls `vi.resetModules()` or `vi.doMock`, so unlike the sibling's
// `renderEditors` there is no mock the re-import is needed to observe.
import * as sectionEditorsModule from "../../../core/admin/ui/widgets/editors/SectionEditors";

import { RETAINED_COLOR_FIELDS } from "../widgets/retainedColorConsumerTable";
import {
  clickButton,
  clickByText,
  findColorInputByLabel,
  findInputByPlaceholder,
  findInputsByPlaceholder,
  findNumberInputs,
  findSectionByTitle,
  findSectionRangeValue,
  findSectionSlider,
  findSectionStepper,
  findSelectByOptions,
  findSelectsByOptions,
  findTextareaByPlaceholder,
  findWidgetControl,
  flush,
  renderSectionEditors,
  resetSectionEditorEnvironment,
  setInputValue,
  setRawInputValue,
  setSelectValue,
  setTextareaValue,
  type SectionEditorsRenderOptions,
} from "./support/sectionEditorHarness";

vi.mock("@/components/ui/badge", async () =>
  (await import("./support/sectionEditorHarness")).sectionBadgeMock()
);

vi.mock("@/components/ui/tabs", async () =>
  (await import("./support/sectionEditorHarness")).sectionTabsMock()
);

vi.mock("@/components/ui/input", async () =>
  (await import("./support/sectionEditorHarness")).sectionInputMock()
);

vi.mock("@/components/ui/select", async () =>
  (await import("./support/sectionEditorHarness")).sectionSelectMock()
);

vi.mock("@/components/ui/textarea", async () =>
  (await import("./support/sectionEditorHarness")).sectionTextareaMock()
);

vi.mock("@/lib/utils", async () =>
  (await import("./support/sectionEditorHarness")).sectionUtilsMock()
);

vi.mock("@/services/apiClient", async () =>
  (await import("./support/sectionEditorHarness")).sectionApiClientMock()
);

vi.mock("@/services/mediaClient", async () =>
  (await import("./support/sectionEditorHarness")).sectionMediaClientMock()
);

vi.mock("@/ui/media/MediaPicker", async () =>
  (await import("./support/sectionEditorHarness")).sectionMediaPickerMock()
);

afterEach(resetSectionEditorEnvironment);

const renderEditors = (options: SectionEditorsRenderOptions) =>
  renderSectionEditors({ ...options, editors: sectionEditorsModule });

test("Section mounted color inventory preserves direct inheritance and nested-stop policy", async () => {
  const view = await renderEditors({
    initialVariant: "default",
    initialValue: {
      heading: {
        labelColor: "currentColor",
        titleColor: "inherit",
        descriptionColor: "currentColor",
      },
      style: {
        backgroundColor: "inherit",
        gradientFrom: "currentColor",
        gradientTo: "inherit",
        borderColor: "currentColor",
        overlayColor: "inherit",
      },
    },
  });

  try {
    await flush();
    for (const entry of RETAINED_COLOR_FIELDS.section) {
      const control = findWidgetControl(view.container, entry.control);
      const state = control
        .querySelector("[data-shared-color-state]")
        ?.getAttribute("data-shared-color-state");
      expect(state, entry.path).toBe(
        entry.nested && entry.path.endsWith("gradientTo") ? "saved_custom" : "inherited"
      );
    }
    expect(view.container.textContent).toContain("Inherited color");
    expect(view.onChangeSpy).not.toHaveBeenCalled();

    const labelControl = findWidgetControl(view.container, "section.heading.labelColor");
    setInputValue(findColorInputByLabel(labelControl, "Label color"), "#102030");
    expect(view.getLatestValue().heading?.labelColor).toBe("#102030");
    expect(view.onChangeSpy).toHaveBeenCalledTimes(1);

    const overlayControl = findWidgetControl(view.container, "section.style.overlayColor");
    clickByText(overlayControl, "Clear");
    expect(view.getLatestValue().style?.overlayColor).toBe("#000000");
    expect(view.onChangeSpy).toHaveBeenCalledTimes(2);
  } finally {
    view.cleanup();
  }
});

test("Section editors normalize malformed defaults, summarize saved custom colors, and ignore variant changes without a handler", async () => {
  const view = await renderEditors({
    initialValue: {
      semantics: {
        element: "article" as never,
      },
      style: {
        backgroundColor: "brand-token",
        gradientFrom: "surface-start-token",
        gradientTo: "surface-end-token",
        gradientAngle: 999,
        borderColor: "border-token",
        borderWidth: "9" as never,
        radius: "round" as never,
        overlayColor: "overlay-token",
        overlayOpacity: 150,
      },
    },
    initialVariant: "legacy",
    withVariantChange: false,
  });

  try {
    const wizardSection = findSectionByTitle(view.container, "Section setup");
    if (!(wizardSection instanceof HTMLElement)) {
      throw new Error("Missing section setup");
    }
    expect(wizardSection.textContent).not.toContain("Quick preset");
    expect(wizardSection.textContent).not.toContain("Hero band");
    const wizardVariantControl = wizardSection.querySelector(
      '[data-widget-control="section.wizard.variant"]'
    );
    if (!(wizardVariantControl instanceof HTMLElement)) {
      throw new Error("Missing wizard variant control");
    }
    expect(wizardVariantControl.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(wizardVariantControl.textContent).toContain("Default");
    expect(view.getLatestVariant()).toBe("legacy");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
    expect(view.onChangeSpy).not.toHaveBeenCalled();

    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }
    expect(linkSection.getAttribute("data-widget-editor-section")).toBe(
      "section.visual.link-accessibility"
    );
    expect(
      linkSection.querySelector('[data-widget-control="section.semantics.anchorId"]')
    ).not.toBeNull();
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    expect(surfaceSection.getAttribute("data-widget-editor-section")).toBe(
      "section.surface-borders"
    );
    expect(spacingSection.getAttribute("data-widget-editor-section")).toBe("section.width-spacing");

    expect(findSelectByOptions(linkSection, ["section", "div"]).value).toBe("section");
    expect(findColorInputByLabel(surfaceSection, "Background color").value).toBe("#ffffff");
    expect(findColorInputByLabel(surfaceSection, "Gradient start").value).toBe("#ffffff");
    expect(findColorInputByLabel(surfaceSection, "Gradient end").value).toBe("#f1f5f9");
    expect(findColorInputByLabel(surfaceSection, "Border color").value).toBe("#e2e8f0");
    expect(findColorInputByLabel(surfaceSection, "Overlay color").value).toBe("#000000");
    expect(surfaceSection.textContent).toContain("Saved custom color");
    expect(findInputsByPlaceholder(surfaceSection, "var(--color-border)")).toHaveLength(0);
    expect(findInputsByPlaceholder(surfaceSection, "#ffffff")).toHaveLength(0);

    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("0");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("none");
    expect(
      findSelectByOptions(surfaceSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"])
        .value
    ).toBe("__match_variant__");
    expect(findSelectByOptions(surfaceSection, ["none", "fade", "slide-up"]).value).toBe("none");
    const preview = surfaceSection.querySelector('[data-section-surface-preview="true"]');
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("none");
    expect(preview?.getAttribute("data-section-surface-preview-motion")).toBe("none");

    expect(findSectionSlider(surfaceSection, "gradient-angle")).not.toBeNull();
    expect(findSectionSlider(surfaceSection, "overlay-opacity")).not.toBeNull();
    expect(findSectionRangeValue(surfaceSection, "gradient-angle")?.textContent).toBe("360°");
    expect(findSectionRangeValue(surfaceSection, "overlay-opacity")?.textContent).toBe("100%");

    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    expect(angleInput?.value).toBe("360");
    expect(opacityInput?.value).toBe("100");
  } finally {
    view.cleanup();
  }
});

test("Section editors cover variant changes, friendly link fields, swatch colors, and advanced summaries", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        backgroundColor: "brand-token",
        gradientFrom: "",
        gradientTo: "",
        gradientAngle: 999,
        borderColor: "",
        borderWidth: "9" as never,
        radius: "round" as never,
        overlayColor: "",
        overlayOpacity: 150,
      },
    },
  });

  try {
    const wizardSection = findSectionByTitle(view.container, "Section setup");
    if (!(wizardSection instanceof HTMLElement)) {
      throw new Error("Missing section setup");
    }
    const wizardVariantControl = wizardSection.querySelector(
      '[data-widget-control="section.wizard.variant"]'
    );
    if (!(wizardVariantControl instanceof HTMLElement)) {
      throw new Error("Missing wizard variant control");
    }
    expect(wizardVariantControl.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(wizardVariantControl.textContent).toContain("Default");
    const wizardRoot = view.container.querySelector(
      '[data-widget-editor-mode="wizard"]'
    ) as ParentNode | null;
    expect(view.container.textContent).toContain("Wizard is one-time starter setup");
    expect(
      findInputByPlaceholder(wizardRoot ?? view.container, "Section label (optional)")
    ).toBeUndefined();
    expect(findInputByPlaceholder(wizardRoot ?? view.container, "Section title")).toBeUndefined();
    expect(
      findTextareaByPlaceholder(wizardRoot ?? view.container, "Short context for the section")
    ).toBeUndefined();

    const variantSection = findSectionByTitle(view.container, "Variant and structure");
    if (!(variantSection instanceof HTMLElement)) {
      throw new Error("Missing variant and structure section");
    }
    expect(
      variantSection.querySelector('[data-widget-control-path="layout.containerWidth"]')
    ).not.toBeNull();
    expect(
      variantSection.querySelector('[data-widget-control-path="style.radius"]')
    ).not.toBeNull();
    clickByText(variantSection, "Bleed");
    expect(view.getLatestVariant()).toBe("bleed");

    setInputValue(findInputsByPlaceholder(view.container, "Section title")[1], "Overview section");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Supportive copy for this section"),
      "Supporting copy from visual editor."
    );
    setInputValue(findInputByPlaceholder(view.container, "Section label"), "Overview");
    setInputValue(findInputByPlaceholder(view.container, "Pricing area"), "overview");
    setInputValue(findInputByPlaceholder(view.container, "Pricing section"), "Overview section");

    const headingSection = findSectionByTitle(view.container, "Heading and intro");
    if (!(headingSection instanceof HTMLElement)) {
      throw new Error("Missing heading section");
    }
    expect(headingSection.textContent).toContain("Section titles default to `h2`.");
    setSelectValue(findSelectByOptions(headingSection, ["h1", "h2", "h3", "h4", "h5", "h6"]), "h4");
    setSelectValue(findSelectByOptions(headingSection, ["left", "center", "right"]), "center");
    setSelectValue(findSelectByOptions(headingSection, ["xs", "sm", "md"]), "md");
    setSelectValue(findSelectByOptions(headingSection, ["xl", "2xl", "3xl"]), "3xl");
    setSelectValue(findSelectByOptions(headingSection, ["sm", "base", "lg"]), "lg");
    setInputValue(findColorInputByLabel(headingSection, "Label color"), "#475569");
    setInputValue(findColorInputByLabel(headingSection, "Title color"), "#111827");
    setInputValue(findColorInputByLabel(headingSection, "Description color"), "#334155");

    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }
    const elementSelect = findSelectByOptions(linkSection, ["section", "div"]);
    setSelectValue(elementSelect, "div");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }
    const borderWidthSelect = findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]);
    const radiusSelect = findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]);
    const shadowSelect = findSelectByOptions(surfaceSection, [
      "__match_variant__",
      "none",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const motionSelect = findSelectByOptions(surfaceSection, ["none", "fade", "slide-up"]);
    const spacingSelects = findSelectsByOptions(spacingSection, ["content", "wide", "full"]);
    setSelectValue(spacingSelects[0], "wide");
    setSelectValue(
      findSelectByOptions(spacingSection, ["none", "4xl", "5xl", "6xl", "7xl"]),
      "7xl"
    );
    setSelectValue(
      findSelectByOptions(spacingSection, ["none", "compact", "hero", "screen"]),
      "hero"
    );
    setSelectValue(findSelectByOptions(spacingSection, ["stack", "row", "grid"]), "grid");
    const regionColumnsSelect = findSelectByOptions(spacingSection, [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    expect(regionColumnsSelect.disabled).toBe(false);
    setSelectValue(regionColumnsSelect, "4");
    setSelectValue(findSelectByOptions(spacingSection, ["sm", "md", "lg", "xl"]), "xl");
    setSelectValue(findSelectByOptions(spacingSection, ["none", "sm", "md", "lg"]), "lg");
    const responsiveBlockSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const responsiveInlineSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "none",
      "sm",
      "md",
      "lg",
    ]);
    setSelectValue(responsiveBlockSelects[0], "sm");
    setSelectValue(responsiveInlineSelects[0], "none");
    setSelectValue(responsiveBlockSelects[1], "xl");
    setSelectValue(responsiveInlineSelects[1], "lg");
    setSelectValue(findSelectByOptions(spacingSection, ["none", "sm", "md", "lg", "xl"]), "lg");
    setSelectValue(
      findSelectByOptions(spacingSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"]),
      "xl"
    );
    setInputValue(findColorInputByLabel(surfaceSection, "Background color"), "#ecfeff");
    setInputValue(findColorInputByLabel(surfaceSection, "Gradient start"), "#1d4ed8");
    setInputValue(findColorInputByLabel(surfaceSection, "Gradient end"), "#222222");
    setInputValue(findColorInputByLabel(surfaceSection, "Border color"), "#0f172a");
    setSelectValue(borderWidthSelect, "2");
    setSelectValue(radiusSelect, "xl");
    setSelectValue(shadowSelect, "lg");
    setSelectValue(motionSelect, "slide-up");

    setInputValue(findColorInputByLabel(surfaceSection, "Overlay color"), "#333333");
    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    setInputValue(angleInput, "270");
    setInputValue(opacityInput, "35");

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(view.getLatestValue().heading).toMatchObject({
      label: "Overview",
      title: "",
      description: "Supporting copy from visual editor.",
      level: "h4",
      align: "center",
      labelSize: "md",
      titleSize: "3xl",
      descriptionSize: "lg",
      descriptionColor: "#334155",
    });
    expect(view.getLatestValue().layout).toMatchObject({
      containerWidth: "wide",
      maxWidth: "7xl",
      minHeight: "hero",
      regionFlow: "grid",
      regionColumns: "4",
      paddingBlock: "xl",
      paddingInline: "lg",
      mobilePaddingBlock: "sm",
      mobilePaddingInline: "none",
      desktopPaddingBlock: "xl",
      desktopPaddingInline: "lg",
      headingGap: "lg",
      regionGap: "xl",
    });
    expect(view.getLatestValue().semantics).toMatchObject({
      element: "div",
      anchorId: "overview",
      ariaLabel: "Overview section",
    });
    expect(view.getLatestValue().style).toMatchObject({
      backgroundColor: "#ecfeff",
      borderColor: "#0f172a",
      gradientFrom: "#1d4ed8",
      gradientTo: "#222222",
      gradientAngle: 270,
      borderWidth: "2",
      radius: "xl",
      shadow: "lg",
      motion: "slide-up",
      overlayColor: "#333333",
      overlayOpacity: 35,
    });

    const preview = surfaceSection.querySelector('[data-section-surface-preview="true"]');
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("lg");
    expect(preview?.getAttribute("data-section-surface-preview-motion")).toBe("slide-up");
    expect(preview?.className).toContain("shadow-lg");
    expect(
      surfaceSection.querySelector('[data-section-surface-preview-overlay="true"]')
    ).not.toBeNull();

    const advancedSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(advancedSection?.textContent).toContain("h4 heading");
    expect(view.container.textContent).toContain("link name overview");
    expect(advancedSection?.textContent).toContain("Gradient angle 270 degrees");
    expect(advancedSection?.textContent).toContain("overlay 35%");
  } finally {
    view.cleanup();
  }
});

test("Section shadow fallback stays match-variant until explicitly overridden", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "contained",
  });

  try {
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const shadowSelect = findSelectByOptions(surfaceSection, [
      "__match_variant__",
      "none",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const motionSelect = findSelectByOptions(surfaceSection, ["none", "fade", "slide-up"]);
    const preview = surfaceSection.querySelector('[data-section-surface-preview="true"]');

    expect(shadowSelect.value).toBe("__match_variant__");
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("sm");
    expect(preview?.getAttribute("data-section-surface-preview-motion")).toBe("none");

    setSelectValue(shadowSelect, "none");
    expect(view.getLatestValue().style?.shadow).toBe("none");
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("none");

    setSelectValue(shadowSelect, "__match_variant__");
    expect(view.getLatestValue().style?.shadow).toBeUndefined();
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("sm");

    setSelectValue(motionSelect, "fade");
    expect(view.getLatestValue().style?.motion).toBe("fade");
    expect(preview?.getAttribute("data-section-surface-preview-motion")).toBe("fade");
  } finally {
    view.cleanup();
  }
});

test("Section visual editor resolves decorative background image assets and bounded layer controls", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "default",
  });

  try {
    const backgroundSection = findSectionByTitle(view.container, "Background media and layers");
    if (!(backgroundSection instanceof HTMLElement)) {
      throw new Error("Missing background media section");
    }

    setSelectValue(findSelectByOptions(backgroundSection, ["none", "image", "video"]), "image");
    clickByText(backgroundSection, "pick-image-asset");
    await flush();

    setSelectValue(findSelectByOptions(backgroundSection, ["cover", "contain"]), "contain");
    setSelectValue(
      findSelectByOptions(backgroundSection, ["center", "top", "bottom", "left", "right"]),
      "top"
    );
    setSelectValue(
      findSelectByOptions(backgroundSection, ["normal", "multiply", "screen", "overlay"]),
      "overlay"
    );
    setSelectValue(
      findSelectByOptions(backgroundSection, ["media-under-overlay", "overlay-under-media"]),
      "overlay-under-media"
    );
    setInputValue(findNumberInputs(backgroundSection)[0], "45");

    expect(view.getLatestValue().style?.backgroundMedia).toMatchObject({
      type: "image",
      source: "library",
      assetId: "asset-image",
      src: "/media/section-background.jpg",
      fit: "contain",
      position: "top",
      opacity: 45,
      blendMode: "overlay",
      layerOrder: "overlay-under-media",
    });

    const mediaControl = findWidgetControl(
      backgroundSection,
      "section.style.backgroundMedia.assetId"
    );
    expect(mediaControl.getAttribute("data-widget-control-path")).toBe("style.backgroundMedia");
    expect(
      backgroundSection.querySelector('[data-widget-control-path="style.backgroundMedia.source"]')
    ).not.toBeNull();
    expect(
      backgroundSection.querySelector('[data-widget-control-path="style.backgroundMedia.src"]')
    ).not.toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("image from Media Library");
    expect(diagnosticsSection?.textContent).toContain("45% opacity");
  } finally {
    view.cleanup();
  }
});

test("Section visual editor resolves decorative background video and poster assets", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "default",
  });

  try {
    const backgroundSection = findSectionByTitle(view.container, "Background media and layers");
    if (!(backgroundSection instanceof HTMLElement)) {
      throw new Error("Missing background media section");
    }

    setSelectValue(findSelectByOptions(backgroundSection, ["none", "image", "video"]), "video");
    clickByText(backgroundSection, "pick-video-asset");
    await flush();

    setInputValue(
      findInputByPlaceholder(backgroundSection, "Ambient background video"),
      "Ambient loop"
    );
    setTextareaValue(
      findTextareaByPlaceholder(backgroundSection, "Optional notes for this decorative video"),
      "Muted decorative video loop."
    );
    const posterPicker = Array.from(backgroundSection.querySelectorAll("[data-media-picker]")).find(
      (node) => node.getAttribute("data-media-picker") === "image/*"
    );
    if (!(posterPicker instanceof HTMLElement)) {
      throw new Error("Missing poster media picker");
    }
    clickByText(posterPicker, "pick-poster-asset");
    await flush();
    setInputValue(findNumberInputs(backgroundSection)[0], "55");

    expect(view.getLatestValue().style?.backgroundMedia).toMatchObject({
      type: "video",
      source: "library",
      assetId: "asset-video",
      src: "https://cdn.example.com/section-demo.mp4",
      title: "Ambient loop",
      description: "Muted decorative video loop.",
      posterSource: "library",
      posterAssetId: "asset-poster",
      posterSrc: "/media/section-poster.jpg",
      opacity: 55,
    });

    const posterControl = findWidgetControl(
      backgroundSection,
      "section.style.backgroundMedia.posterAssetId"
    );
    expect(posterControl.getAttribute("data-widget-control-path")).toBe("style.backgroundMedia");
    expect(
      backgroundSection.querySelector(
        '[data-widget-control-path="style.backgroundMedia.posterSource"]'
      )
    ).not.toBeNull();
    expect(
      backgroundSection.querySelector(
        '[data-widget-control-path="style.backgroundMedia.posterSrc"]'
      )
    ).not.toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("video from Media Library");
    expect(diagnosticsSection?.textContent).toContain("55% opacity");
  } finally {
    view.cleanup();
  }
});

test("Section surface color controls replace saved custom values through swatches without raw inputs", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        backgroundColor: "var(--section-surface)",
        gradientFrom: "surface-start-token",
        borderColor: "border-strong-token",
      },
    },
  });

  try {
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    expect(findInputsByPlaceholder(surfaceSection, "transparent")).toHaveLength(0);
    expect(findInputsByPlaceholder(surfaceSection, "#ffffff")).toHaveLength(0);
    expect(findInputsByPlaceholder(surfaceSection, "var(--color-border)")).toHaveLength(0);
    expect(surfaceSection.textContent).toContain("Saved custom color");

    const backgroundColorInput = findColorInputByLabel(surfaceSection, "Background color");
    const gradientStartColorInput = findColorInputByLabel(surfaceSection, "Gradient start");
    const borderColorInput = findColorInputByLabel(surfaceSection, "Border color");
    expect(backgroundColorInput.value).toBe("#ffffff");
    expect(gradientStartColorInput.value).toBe("#ffffff");
    expect(borderColorInput.value).toBe("#e2e8f0");

    setInputValue(backgroundColorInput, "#112233");
    setInputValue(gradientStartColorInput, "#abcdef");
    setInputValue(borderColorInput, "#334455");

    expect(view.getLatestValue().style).toMatchObject({
      backgroundColor: "#112233",
      gradientFrom: "#abcdef",
      borderColor: "#334455",
    });

    clickByText(findWidgetControl(surfaceSection, "section.style.backgroundColor"), "Clear");

    expect(view.getLatestValue().style?.backgroundColor).toBeUndefined();
    expect(backgroundColorInput.value).toBe("#ffffff");
    expect(view.container.querySelector("pre")).toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("No decorative background media.");
  } finally {
    view.cleanup();
  }
});

test("Section editors coerce invalid numeric text input back to safe angle and opacity defaults", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        gradientAngle: 45,
        overlayOpacity: 55,
      },
    },
  });

  try {
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    setRawInputValue(angleInput, "not-a-number");
    setRawInputValue(opacityInput, "not-a-number");

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 180,
      overlayOpacity: 0,
    });

    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    expect(findNumberInputs(technicalTokensSection)).toHaveLength(0);

    expect(view.container.querySelector("pre")).toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("Gradient angle 180 degrees");
    expect(diagnosticsSection?.textContent).toContain("overlay 0%");
  } finally {
    view.cleanup();
  }
});

test("Section surface slider and exact controls round decimals, clamp boundaries, and stay visible in Advanced summaries", async () => {
  const view = await renderEditors({
    initialValue: {
      semantics: {
        anchorId: "initial-anchor",
        ariaLabel: "Initial section",
      },
      style: {
        gradientAngle: 12,
        overlayOpacity: 8,
      },
    },
  });

  try {
    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }

    setInputValue(findInputByPlaceholder(linkSection, "Pricing area"), "wave-layout");
    setInputValue(findInputByPlaceholder(linkSection, "Pricing section"), "Wave layout section");

    expect(view.getLatestValue().semantics).toMatchObject({
      anchorId: "wave-layout",
      ariaLabel: "Wave layout section",
    });

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    expect(findSectionSlider(surfaceSection, "gradient-angle")).not.toBeNull();
    expect(findSectionSlider(surfaceSection, "overlay-opacity")).not.toBeNull();

    clickButton(findSectionStepper(surfaceSection, "gradient-angle", "increase"));
    clickButton(findSectionStepper(surfaceSection, "overlay-opacity", "decrease"));

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 27,
      overlayOpacity: 3,
    });
    expect(findSectionRangeValue(surfaceSection, "gradient-angle")?.textContent).toBe("27°");
    expect(findSectionRangeValue(surfaceSection, "overlay-opacity")?.textContent).toBe("3%");

    const [surfaceAngleInput, surfaceOpacityInput] = findNumberInputs(surfaceSection);
    setInputValue(surfaceAngleInput, "44.6");
    setInputValue(surfaceOpacityInput, "15.5");

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 45,
      overlayOpacity: 16,
    });
    expect(surfaceAngleInput?.value).toBe("45");
    expect(surfaceOpacityInput?.value).toBe("16");
    expect(findSectionRangeValue(surfaceSection, "gradient-angle")?.textContent).toBe("45°");
    expect(findSectionRangeValue(surfaceSection, "overlay-opacity")?.textContent).toBe("16%");

    setInputValue(surfaceAngleInput, "359.6");
    setInputValue(surfaceOpacityInput, "-0.6");

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 360,
      overlayOpacity: 0,
    });
    expect(surfaceAngleInput?.value).toBe("360");
    expect(surfaceOpacityInput?.value).toBe("0");
    expect(findSectionRangeValue(surfaceSection, "gradient-angle")?.textContent).toBe("360°");
    expect(findSectionRangeValue(surfaceSection, "overlay-opacity")?.textContent).toBe("0%");

    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    expect(technicalTokensSection?.textContent).toContain("link name wave-layout");
    expect(technicalTokensSection?.textContent).toContain("accessibility name Wave layout section");
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("Gradient angle 360 degrees");
    expect(diagnosticsSection?.textContent).toContain("overlay 0%");
  } finally {
    view.cleanup();
  }
});
