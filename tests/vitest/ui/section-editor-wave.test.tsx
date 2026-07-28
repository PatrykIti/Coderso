// @vitest-environment happy-dom
//
// Section editor wave -- structure, layout and contract.
//
// This suite owns what the Section editors say about the section's SHAPE: the builder-owned
// region slots, variant and preset selection, container width / max width / grid flow /
// responsive padding, the link-and-accessibility semantics, and the fallbacks the editors
// apply when the section contract reports sparse defaults. Its sibling
// `section-editor-surface-wave.test.tsx` owns the surface the section is painted with.
//
// The stubbed admin primitives, the DOM query helpers and the two mount harnesses are
// shared with that sibling and live in `./support/sectionEditorHarness`.

import { afterEach, expect, test, vi } from "vitest";

// `vi.mock` is hoisted above every import, so the three module-scope imports below still see
// the stubbed admin primitives declared further down. They exist to keep the BlockSettings
// module graph OFF the first test's `testTimeout`: loading it cost 7.3s of an 7.4s test on an
// idle box, and crossed the 30s lane budget under full-suite contention. Imported here, that
// transform lands in the file's collection phase, which no per-test deadline governs.
import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import * as sectionEditorsModule from "../../../core/admin/ui/widgets/editors/SectionEditors";
import * as sectionContractModule from "../../../core/widgets/core/section";
import type { SectionData } from "../../../core/widgets/core/section";
import {
  clickByText,
  findColorInputByLabel,
  findInputByPlaceholder,
  findInputsByPlaceholder,
  findNumberInputs,
  findSectionByTitle,
  findSelectByOptions,
  findSelectsByOptions,
  findTextareaByPlaceholder,
  findWidgetControl,
  flush,
  renderSectionBlockSettingsHost,
  renderSectionEditors,
  resetSectionEditorEnvironment,
  setInputValue,
  setSelectValue,
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

// This one stays dynamic ON PURPOSE, unlike the imports above and unlike its twin in
// section-editor-surface-wave.test.tsx. `mockSectionContract` below calls `vi.resetModules()`
// + `vi.doMock(".../core/widgets/core/section")`, and re-importing here is how the two
// sparse-contract tests observe that mock; bind it at module scope and they silently read the
// REAL contract instead, which was verified by trying it. The cost this would have saved is
// already paid by the module-scope import above -- these tests resolve SectionEditors from a
// warm registry -- so the deadline is not what is being traded away.
const renderEditors = async (options: SectionEditorsRenderOptions) =>
  renderSectionEditors({
    ...options,
    editors: await import("../../../core/admin/ui/widgets/editors/SectionEditors"),
  });

const renderSectionBlockSettings = () =>
  renderSectionBlockSettingsHost({
    BlockSettings,
    editors: sectionEditorsModule,
    contract: sectionContractModule,
  });

test("Section builder-owned Region controls expose stable control paths", async () => {
  const view = await renderSectionBlockSettings();

  try {
    await flush();
    const regionsSection = view.container.querySelector(
      '[data-widget-editor-section="section.regions"]'
    );
    if (!(regionsSection instanceof HTMLElement)) {
      throw new Error("Missing Section regions section");
    }

    const addRegionControl = findWidgetControl(regionsSection, "section.regions.add-region");
    expect(addRegionControl.getAttribute("data-widget-control-path")).toBe("regions");
    expect(addRegionControl.getAttribute("data-widget-control-ownership")).toBe("action");
    expect(addRegionControl.textContent).toContain("Add Region");

    const regionRow = findWidgetControl(regionsSection, "section.slot.region:1");
    expect(regionRow.getAttribute("data-widget-control-path")).toBe("regions.1");
    expect(regionRow.getAttribute("data-widget-control-ownership")).toBe("action");

    const labelControl = findWidgetControl(regionsSection, "section.slot.region:1.label");
    expect(labelControl.getAttribute("data-widget-control-path")).toBe("regions.1.label");
    expect(labelControl.getAttribute("data-widget-control-ownership")).toBe("writable");
    const labelInput = labelControl.querySelector("input");
    expect(labelInput?.getAttribute("aria-label")).toBe("Rename Hero slot");

    setInputValue(labelInput, "Main");
    expect(view.getLatestBlock().data).toMatchObject({
      regions: [{ id: "1", label: "Main" }],
    });

    clickByText(regionsSection, "Add Region");
    expect(view.getLatestBlock().slots).toMatchObject({
      "region:1": [],
      "region:2": [],
    });
    const nextLabelControl = findWidgetControl(view.container, "section.slot.region:2.label");
    expect(nextLabelControl.getAttribute("data-widget-control-path")).toBe("regions.2.label");

    const unmappedControls = Array.from(regionsSection.querySelectorAll("button, input")).filter(
      (element) => !element.closest("[data-widget-control-path]")
    );
    expect(unmappedControls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("Section variant cards use atomic block patches when available", async () => {
  const view = await renderEditors({
    initialValue: {
      heading: {
        title: "Atomic section",
      },
    },
    initialVariant: "default",
    withVariantChange: false,
    withBlockPatch: true,
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
    expect(view.onBlockPatchSpy).not.toHaveBeenCalled();
    expect(view.onChangeSpy).not.toHaveBeenCalled();
    expect(view.getLatestVariant()).toBe("default");

    const variantSection = findSectionByTitle(view.container, "Variant and structure");
    if (!(variantSection instanceof HTMLElement)) {
      throw new Error("Missing variant and structure section");
    }
    clickByText(variantSection, "Contained");
    expect(view.getLatestVariant()).toBe("contained");
  } finally {
    view.cleanup();
  }
});

test("Section editor presets preserve heading copy and expose friendly width and gradient guidance", async () => {
  const view = await renderEditors({
    initialValue: {
      heading: {
        label: "Overview",
        title: "Pricing plans",
        description: "Supportive copy stays intact.",
      },
    },
    initialVariant: "default",
  });

  try {
    const wizardSection = findSectionByTitle(view.container, "Section setup");
    if (!(wizardSection instanceof HTMLElement)) {
      throw new Error("Missing section setup");
    }
    expect(wizardSection.textContent).not.toContain("Quick preset");
    expect(wizardSection.textContent).not.toContain("Two-column region group");
    const wizardVariantControl = wizardSection.querySelector(
      '[data-widget-control="section.wizard.variant"]'
    );
    if (!(wizardVariantControl instanceof HTMLElement)) {
      throw new Error("Missing wizard variant control");
    }
    expect(wizardVariantControl.getAttribute("data-widget-control-readonly")).toBe("true");

    const variantSection = findSectionByTitle(view.container, "Variant and structure");
    if (!(variantSection instanceof HTMLElement)) {
      throw new Error("Missing variant and structure section");
    }
    expect(variantSection.textContent).toContain("Quick presets");
    clickByText(variantSection, "Bleed");
    expect(view.getLatestVariant()).toBe("bleed");
    expect(view.getLatestValue().heading).toMatchObject({
      label: "Overview",
      title: "Pricing plans",
      description: "Supportive copy stays intact.",
    });
    clickByText(variantSection, "Two-column region group");
    expect(view.getLatestVariant()).toBe("default");
    expect(view.getLatestValue().heading).toMatchObject({
      label: "Overview",
      title: "Pricing plans",
      description: "Supportive copy stays intact.",
      align: "left",
    });
    expect(view.getLatestValue().layout).toMatchObject({
      containerWidth: "content",
      maxWidth: "7xl",
      regionFlow: "grid",
      regionColumns: "2",
      headingGap: "lg",
      regionGap: "lg",
    });

    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }
    expect(spacingSection.textContent).toContain(
      "`Wide alias` keeps the same wrapper classes as `Content`"
    );
    expect(spacingSection.textContent).toContain("Full-width wrapper");
    const maxWidthSelect = findSelectByOptions(spacingSection, [
      "none",
      "4xl",
      "5xl",
      "6xl",
      "7xl",
    ]);
    expect(Array.from(maxWidthSelect.options).map((option) => option.textContent)).toContain(
      "7XL (80rem / 1280px)"
    );

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    expect(surfaceSection.textContent).toContain("gradient becomes the visible surface");
    expect(
      surfaceSection.querySelector('[data-widget-control="section.style.gradientFrom"]')
        ?.textContent
    ).toContain("Clear");
    expect(
      surfaceSection.querySelector('[data-widget-control="section.style.gradientTo"]')?.textContent
    ).toContain("Clear");
  } finally {
    view.cleanup();
  }
});

test("Section visual editor keeps grid columns disabled until grid flow is selected and restores match-variant spacing", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "default",
  });

  try {
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }

    const regionFlowSelect = findSelectByOptions(spacingSection, ["stack", "row", "grid"]);
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
    const regionGapSelect = findSelectByOptions(spacingSection, [
      "__match_variant__",
      "none",
      "sm",
      "md",
      "lg",
      "xl",
    ]);

    expect(spacingSection.textContent).toContain(
      "Grid columns stay inactive until Region flow is set to Grid."
    );
    expect(regionColumnsSelect.disabled).toBe(true);
    expect(regionColumnsSelect.value).toBe("1");
    expect(regionGapSelect.value).toBe("__match_variant__");

    setSelectValue(regionFlowSelect, "grid");
    expect(view.getLatestValue().layout?.regionFlow).toBe("grid");
    expect(regionColumnsSelect.disabled).toBe(false);

    setSelectValue(regionColumnsSelect, "5");
    expect(view.getLatestValue().layout?.regionColumns).toBe("5");

    setSelectValue(regionGapSelect, "lg");
    expect(view.getLatestValue().layout?.regionGap).toBe("lg");

    setSelectValue(regionGapSelect, "__match_variant__");
    expect(view.getLatestValue().layout?.regionGap).toBeUndefined();

    setSelectValue(regionFlowSelect, "row");
    expect(view.getLatestValue().layout).toMatchObject({
      regionFlow: "row",
      regionColumns: "1",
    });
    expect(regionColumnsSelect.disabled).toBe(true);
    expect(regionColumnsSelect.value).toBe("1");
  } finally {
    view.cleanup();
  }
});

test("Section visual editor clears responsive padding overrides back to match base", async () => {
  const view = await renderEditors({
    initialValue: {
      layout: {
        mobilePaddingBlock: "sm",
        mobilePaddingInline: "none",
        desktopPaddingBlock: "xl",
        desktopPaddingInline: "lg",
      },
    },
    initialVariant: "default",
  });

  try {
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }

    expect(spacingSection.textContent).toContain(
      "Responsive padding stays on the same bounded tokens."
    );

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

    expect(responsiveBlockSelects).toHaveLength(2);
    expect(responsiveInlineSelects).toHaveLength(2);
    expect(responsiveBlockSelects[0]?.value).toBe("sm");
    expect(responsiveInlineSelects[0]?.value).toBe("none");
    expect(responsiveBlockSelects[1]?.value).toBe("xl");
    expect(responsiveInlineSelects[1]?.value).toBe("lg");

    setSelectValue(responsiveBlockSelects[0], "__match_base__");
    setSelectValue(responsiveInlineSelects[0], "__match_base__");
    setSelectValue(responsiveBlockSelects[1], "__match_base__");
    setSelectValue(responsiveInlineSelects[1], "__match_base__");

    expect(view.getLatestValue().layout?.mobilePaddingBlock).toBeUndefined();
    expect(view.getLatestValue().layout?.mobilePaddingInline).toBeUndefined();
    expect(view.getLatestValue().layout?.desktopPaddingBlock).toBeUndefined();
    expect(view.getLatestValue().layout?.desktopPaddingInline).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("Section visual link fields own semantics while Advanced stays read-only", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        gradientAngle: Number.NaN,
        overlayOpacity: Number.POSITIVE_INFINITY,
      },
    },
  });

  try {
    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    expect(findNumberInputs(technicalTokensSection)).toHaveLength(0);
    expect(technicalTokensSection.querySelectorAll("input, select, textarea, button")).toHaveLength(
      0
    );

    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }
    setInputValue(findInputByPlaceholder(linkSection, "Pricing area"), "team-overview");
    setInputValue(findInputByPlaceholder(linkSection, "Pricing section"), "Team overview section");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    expect(angleInput?.value).toBe("180");
    expect(opacityInput?.value).toBe("0");
    setInputValue(angleInput, "-12");
    setInputValue(opacityInput, "125");

    expect(view.getLatestValue().semantics).toMatchObject({
      anchorId: "team-overview",
      ariaLabel: "Team overview section",
    });
    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 0,
      overlayOpacity: 100,
    });

    expect(view.container.querySelector("pre")).toBeNull();
    expect(technicalTokensSection.textContent).toContain("link name team-overview");
    expect(technicalTokensSection.textContent).toContain(
      "accessibility name Team overview section"
    );
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("Gradient angle 0 degrees");
    expect(diagnosticsSection?.textContent).toContain("overlay 100%");
  } finally {
    view.cleanup();
  }
});

const mockSectionContract = async ({
  normalizedValue,
  defaults,
}: {
  normalizedValue: SectionData;
  defaults: SectionData;
}) => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/section", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/section")>(
      "../../../core/widgets/core/section"
    );

    return {
      ...actual,
      normalizeSectionData: vi.fn(() => normalizedValue),
      sectionDefaults: defaults,
    };
  });
};

test("Section editors fall back to sparse normalized token fields and contract defaults", async () => {
  await mockSectionContract({
    normalizedValue: {
      heading: {
        label: undefined,
        title: undefined,
        description: undefined,
      },
      semantics: {
        element: undefined,
        anchorId: undefined,
        ariaLabel: undefined,
      },
      style: {
        backgroundColor: undefined,
        gradientFrom: undefined,
        gradientTo: undefined,
        gradientAngle: 180,
        borderColor: undefined,
        borderWidth: undefined,
        radius: undefined,
        overlayColor: undefined,
        overlayOpacity: 0,
      },
    },
    defaults: {
      heading: {},
      semantics: {
        element: "div",
      },
      style: {
        borderWidth: "3",
        radius: "lg",
        gradientAngle: 180,
        overlayOpacity: 0,
      },
    },
  });

  let view: Awaited<ReturnType<typeof renderEditors>> | undefined;

  try {
    view = await renderEditors({
      initialValue: {},
    });

    const wizardRoot = view.container.querySelector(
      '[data-widget-editor-mode="wizard"]'
    ) as ParentNode | null;
    expect(findInputByPlaceholder(wizardRoot ?? view.container, "Section title")).toBeUndefined();
    expect(
      findTextareaByPlaceholder(wizardRoot ?? view.container, "Short context for the section")
    ).toBeUndefined();
    expect(findInputsByPlaceholder(view.container, "transparent")).toHaveLength(0);
    expect(findColorInputByLabel(view.container, "Background color").value).toBe("#ffffff");

    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }

    expect(findInputByPlaceholder(view.container, "Section label (optional)")).toBeUndefined();
    expect(findInputByPlaceholder(view.container, "Section label")?.value).toBe("");
    const headingSection = findSectionByTitle(view.container, "Heading and intro");
    if (!(headingSection instanceof HTMLElement)) {
      throw new Error("Missing heading section");
    }
    expect(findInputByPlaceholder(headingSection, "Section title")?.value).toBe("");
    expect(
      findTextareaByPlaceholder(view.container, "Supportive copy for this section")?.value
    ).toBe("");
    expect(findSelectByOptions(linkSection, ["section", "div"]).value).toBe("div");
    expect(findInputByPlaceholder(linkSection, "Pricing area")?.value).toBe("");
    expect(findInputByPlaceholder(linkSection, "Pricing section")?.value).toBe("");
    expect(findSelectByOptions(spacingSection, ["none", "compact", "hero", "screen"]).value).toBe(
      "none"
    );
    expect(findSelectByOptions(spacingSection, ["stack", "row", "grid"]).value).toBe("stack");
    const sparseColumnsSelect = findSelectByOptions(spacingSection, [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    expect(sparseColumnsSelect.value).toBe("1");
    expect(sparseColumnsSelect.disabled).toBe(true);
    expect(findSelectByOptions(spacingSection, ["none", "sm", "md", "lg", "xl"]).value).toBe("md");
    const sparseResponsiveBlockSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const sparseResponsiveInlineSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "none",
      "sm",
      "md",
      "lg",
    ]);
    expect(sparseResponsiveBlockSelects).toHaveLength(2);
    expect(sparseResponsiveInlineSelects).toHaveLength(2);
    expect(sparseResponsiveBlockSelects[0]?.value).toBe("__match_base__");
    expect(sparseResponsiveBlockSelects[1]?.value).toBe("__match_base__");
    expect(sparseResponsiveInlineSelects[0]?.value).toBe("__match_base__");
    expect(sparseResponsiveInlineSelects[1]?.value).toBe("__match_base__");
    expect(
      findSelectByOptions(spacingSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"])
        .value
    ).toBe("__match_variant__");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    expect(findInputsByPlaceholder(surfaceSection, "#ffffff")).toHaveLength(0);
    expect(findColorInputByLabel(surfaceSection, "Gradient start").value).toBe("#ffffff");
    expect(findInputsByPlaceholder(surfaceSection, "#f1f5f9")).toHaveLength(0);
    expect(findColorInputByLabel(surfaceSection, "Gradient end").value).toBe("#f1f5f9");
    expect(findInputsByPlaceholder(surfaceSection, "var(--color-border)")).toHaveLength(0);
    expect(findColorInputByLabel(surfaceSection, "Border color").value).toBe("#e2e8f0");
    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("3");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("lg");
    expect(findInputsByPlaceholder(surfaceSection, "#000000")).toHaveLength(0);
    expect(findColorInputByLabel(surfaceSection, "Overlay color").value).toBe("#000000");

    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    expect(findNumberInputs(technicalTokensSection)).toHaveLength(0);
    expect(technicalTokensSection.querySelectorAll("input, select, textarea, button")).toHaveLength(
      0
    );

    expect(view.container.querySelector("pre")).toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("Gradient angle 180 degrees");
    expect(diagnosticsSection?.textContent).toContain("overlay 0%");
  } finally {
    view?.cleanup();
    vi.doUnmock("../../../core/widgets/core/section");
    vi.resetModules();
  }
});

test("Section editors sanitize invalid anchor characters before persisting", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "default",
  });

  try {
    const semanticsSection = findSectionByTitle(view.container, "Section link and accessibility");
    setInputValue(
      findInputByPlaceholder(semanticsSection ?? view.container, "Pricing area"),
      " team overview / 2026 "
    );

    expect(view.getLatestValue().semantics?.anchorId).toBe("team-overview-2026");
  } finally {
    view.cleanup();
  }
});

test("Section editors use hardcoded select fallbacks when sparse defaults omit semantics and surface options", async () => {
  await mockSectionContract({
    normalizedValue: {
      heading: {},
      semantics: {
        element: undefined,
        anchorId: undefined,
        ariaLabel: undefined,
      },
      style: {
        backgroundColor: undefined,
        gradientFrom: undefined,
        gradientTo: undefined,
        gradientAngle: 180,
        borderColor: undefined,
        borderWidth: undefined,
        radius: undefined,
        overlayColor: undefined,
        overlayOpacity: 0,
      },
    },
    defaults: {
      heading: {},
      semantics: {},
      style: {
        gradientAngle: 180,
        overlayOpacity: 0,
      },
    },
  });

  let view: Awaited<ReturnType<typeof renderEditors>> | undefined;

  try {
    view = await renderEditors({
      initialValue: {},
      withVariantChange: false,
    });

    const semanticsSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }
    expect(findSelectByOptions(semanticsSection, ["section", "div"]).value).toBe("section");

    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }
    expect(findSelectByOptions(spacingSection, ["none", "compact", "hero", "screen"]).value).toBe(
      "none"
    );
    expect(findSelectByOptions(spacingSection, ["stack", "row", "grid"]).value).toBe("stack");
    const hardcodedColumnsSelect = findSelectByOptions(spacingSection, [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    expect(hardcodedColumnsSelect.value).toBe("1");
    expect(hardcodedColumnsSelect.disabled).toBe(true);
    expect(findSelectByOptions(spacingSection, ["none", "sm", "md", "lg", "xl"]).value).toBe("md");
    const hardcodedResponsiveBlockSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const hardcodedResponsiveInlineSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "none",
      "sm",
      "md",
      "lg",
    ]);
    expect(hardcodedResponsiveBlockSelects).toHaveLength(2);
    expect(hardcodedResponsiveInlineSelects).toHaveLength(2);
    expect(hardcodedResponsiveBlockSelects[0]?.value).toBe("__match_base__");
    expect(hardcodedResponsiveBlockSelects[1]?.value).toBe("__match_base__");
    expect(hardcodedResponsiveInlineSelects[0]?.value).toBe("__match_base__");
    expect(hardcodedResponsiveInlineSelects[1]?.value).toBe("__match_base__");
    expect(
      findSelectByOptions(spacingSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"])
        .value
    ).toBe("__match_variant__");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("0");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("none");

    clickByText(view.container, "Contained");
    expect(view.getLatestVariant()).toBe("legacy");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
  } finally {
    view?.cleanup();
    vi.doUnmock("../../../core/widgets/core/section");
    vi.resetModules();
  }
});
