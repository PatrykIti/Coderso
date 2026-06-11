import { describe, expect, test } from "vitest";

import {
  getPageEditorControlsForTarget,
  getPageSectionVariantControl,
  pageBlockControlRegistry,
  pageUniversalBlockControls,
  pageUniversalSectionControls,
  type PageEditorControlDefinition,
} from "../../../core/services/pages/pageEditorControlRegistry";
import {
  pageBlockCapabilities,
  pageBlockTypes,
  pageSectionCapabilities,
  pageSectionTypes,
} from "../../../core/services/pages/pageDocumentV2";
import {
  clampPageEditorSliderValue,
  getPageEditorColorPalette,
  getPageEditorOptionLabel,
  getPageEditorOptionLabels,
  PAGE_EDITOR_SEGMENTED_NUMBER_OPTION_LIMIT,
  PAGE_EDITOR_SEGMENTED_OPTION_LIMIT,
  PAGE_EDITOR_SLIDER_STEPPER_SPAN_THRESHOLD,
  pageEditorControlOptionLabelOverrides,
  pageEditorOptionLabelCatalog,
  resolvePageEditorControlUiModel,
  type PageEditorControlUiModel,
} from "../../../core/services/pages/pageEditorControlUiModel";
import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";

const makeControl = (
  overrides: Partial<PageEditorControlDefinition> & {
    input: PageEditorControlDefinition["input"];
  }
): PageEditorControlDefinition => ({
  id: "test.control",
  panel: "style",
  target: "section",
  label: "Test control",
  path: ["style", "test"],
  overridePath: ["style", "test"],
  responsive: true,
  ...overrides,
});

const allRegistryControls = (): PageEditorControlDefinition[] => {
  const controls: PageEditorControlDefinition[] = [
    ...pageUniversalSectionControls,
    ...pageUniversalBlockControls,
    ...Object.values(pageBlockControlRegistry).flat(),
  ];
  for (const type of pageSectionTypes) {
    const variantControl = getPageSectionVariantControl(type);
    if (variantControl) controls.push(variantControl);
  }
  return controls;
};

const resolveById = (id: string): PageEditorControlUiModel => {
  const control = allRegistryControls().find((candidate) => candidate.id === id);
  expect(control, `registry control ${id}`).toBeTruthy();
  return resolvePageEditorControlUiModel(control!);
};

describe("page editor control ui model adapter", () => {
  test("thresholds stay at the audited contract values", () => {
    expect(PAGE_EDITOR_SEGMENTED_OPTION_LIMIT).toBe(6);
    expect(PAGE_EDITOR_SEGMENTED_NUMBER_OPTION_LIMIT).toBe(5);
    expect(PAGE_EDITOR_SLIDER_STEPPER_SPAN_THRESHOLD).toBe(100);
  });

  test("every registry control maps to a supported model and text stays free-form only", () => {
    for (const control of allRegistryControls()) {
      const model = resolvePageEditorControlUiModel(control);
      expect(model.kind, control.id).not.toBe("unsupported");
      if (control.input === "text") {
        expect(model.kind, control.id).toBe("text");
      } else {
        expect(model.kind, control.id).not.toBe("text");
      }
    }
  });

  test("every insertable target resolves all controls without unsupported models", () => {
    for (const type of pageSectionTypes) {
      if (!pageSectionCapabilities[type].insertable) continue;
      for (const control of getPageEditorControlsForTarget({ kind: "section", type })) {
        expect(resolvePageEditorControlUiModel(control).kind).not.toBe("unsupported");
      }
    }
    for (const type of pageBlockTypes) {
      if (!pageBlockCapabilities[type].editorInsertable) continue;
      for (const control of getPageEditorControlsForTarget({ kind: "block", type })) {
        expect(resolvePageEditorControlUiModel(control).kind).not.toBe("unsupported");
      }
    }
  });

  test("switch inputs map to toggle models", () => {
    for (const id of [
      "section.visibility.visible",
      "section.visibility.authOnly",
      "block.visibility.visible",
      "block.video.props.autoplay",
      "block.video.props.muted",
      "block.list.props.ordered",
      "block.group.props.wrap",
    ]) {
      expect(resolveById(id)).toEqual({ kind: "toggle" });
    }
  });

  test("typography controls map to segmented token selects and slider-stepper precision models", () => {
    expect(resolveById("block.style.fontFamily")).toMatchObject({
      kind: "segmented",
      options: ["sans", "display"],
      labels: { sans: "Sans", display: "Display" },
    });
    // The font-size scale tops out at 5xl (matching the baked h1 class) and
    // STAYS segmented above the select-upgrade limit: declared segmented
    // controls never degrade to a native select.
    expect(resolveById("block.style.fontSize")).toMatchObject({
      kind: "segmented",
      options: ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"],
      labels: {
        sm: "Small",
        md: "Medium",
        lg: "Large",
        xl: "XL",
        "2xl": "2XL",
        "3xl": "3XL",
        "4xl": "4XL",
        "5xl": "5XL",
      },
    });
    expect(resolveById("block.style.fontWeight")).toMatchObject({
      kind: "segmented",
      options: ["normal", "medium", "semibold", "bold"],
      labels: { normal: "Normal", medium: "Medium", semibold: "Semibold", bold: "Bold" },
    });
    // Registry-owned fractional step/unit force the slider+stepper pairing
    // even below the wide-span threshold; line height stays unitless.
    expect(resolveById("block.style.lineHeight")).toEqual({
      kind: "sliderStepper",
      min: 1,
      max: 2.5,
      step: 0.05,
      unit: "",
    });
    expect(resolveById("block.style.letterSpacing")).toEqual({
      kind: "sliderStepper",
      min: -2,
      max: 8,
      step: 0.5,
      unit: "px",
    });
  });

  test("small finite select sets upgrade to segmented with English labels", () => {
    const segmentedIds = [
      "section.layout.align",
      "section.layout.justify",
      "section.style.backgroundType",
      "section.style.shadow",
      "section.hero.variant",
      "block.style.width",
      "block.style.align",
      "block.style.backgroundType",
      "block.style.shadow",
      "block.heading.props.level",
      "block.heading.props.align",
      "block.text.props.format",
      "block.button.props.target",
      "block.button.props.variant",
      "block.button.props.size",
      "block.image.props.fit",
      "block.divider.props.tone",
      "block.columns.props.distribution",
      "block.group.props.direction",
    ];
    for (const id of segmentedIds) {
      const model = resolveById(id);
      expect(model.kind, id).toBe("segmented");
      if (model.kind !== "segmented") continue;
      for (const option of model.options) {
        const label = model.labels[option];
        expect(label, `${id}:${option}`).toBeTruthy();
        expect(label![0]).toBe(label![0]!.toUpperCase());
      }
    }
  });

  test("option label catalog avoids raw enum tokens for semantic values", () => {
    expect(getPageEditorOptionLabel("between")).toBe("Between");
    expect(getPageEditorOptionLabel("full-width")).toBe("Full width");
    expect(getPageEditorOptionLabel("sm")).toBe("Small");
    expect(getPageEditorOptionLabel("md")).toBe("Medium");
    expect(getPageEditorOptionLabel("lg")).toBe("Large");
    expect(getPageEditorOptionLabel("rich")).toBe("Rich text");
    expect(getPageEditorOptionLabel("h1")).toBe("H1");
    // Per-control overrides win over the global catalog.
    expect(pageEditorControlOptionLabelOverrides["block.button.props.target"]).toBeTruthy();
    expect(getPageEditorOptionLabel("self", "block.button.props.target")).toBe("Same tab");
    expect(getPageEditorOptionLabel("blank", "block.button.props.target")).toBe("New tab");
    // Unknown tokens humanize instead of leaking raw kebab-case tokens.
    expect(getPageEditorOptionLabel("my-custom_token")).toBe("My custom token");
    expect(getPageEditorOptionLabels(["start", "between"])).toEqual({
      start: "Start",
      between: "Between",
    });
    for (const [token, label] of Object.entries(pageEditorOptionLabelCatalog)) {
      expect(label.length).toBeGreaterThan(0);
      expect(label[0]).toBe(label[0]!.toUpperCase());
      expect(token).not.toBe("");
    }
  });

  test("long option lists stay select models with labels", () => {
    const options = ["one", "two", "three", "four", "five", "six", "seven"] as const;
    const model = resolvePageEditorControlUiModel(makeControl({ input: "select", options }));
    expect(model.kind).toBe("select");
    if (model.kind === "select") {
      expect(model.options).toEqual(options);
      expect(model.labels.one).toBe("One");
    }
  });

  test("declared segmented controls stay segmented above the select-upgrade limit", () => {
    const options = ["one", "two", "three", "four", "five", "six", "seven", "eight"] as const;
    const model = resolvePageEditorControlUiModel(makeControl({ input: "segmented", options }));
    expect(model.kind).toBe("segmented");
    if (model.kind === "segmented") {
      expect(model.options).toEqual(options);
    }
  });

  test("option controls without options fail closed to unsupported", () => {
    expect(resolvePageEditorControlUiModel(makeControl({ input: "select" }))).toEqual({
      kind: "unsupported",
      reason: "option-control-without-options",
    });
    expect(
      resolvePageEditorControlUiModel(makeControl({ input: "segmented", options: [] }))
    ).toEqual({ kind: "unsupported", reason: "option-control-without-options" });
  });

  test("columns clamp ranges become segmented numeric pills, not sliders", () => {
    for (const id of ["section.layout.columns", "block.columns.props.count"]) {
      const model = resolveById(id);
      expect(model).toEqual({
        kind: "segmented",
        options: ["1", "2", "3", "4"],
        labels: { "1": "1", "2": "2", "3": "3", "4": "4" },
      });
    }
  });

  test("max width and paddings map to slider/stepper pairs with px units", () => {
    expect(resolveById("section.layout.maxWidth")).toEqual({
      kind: "sliderStepper",
      min: 320,
      max: 1920,
      step: 10,
      unit: "px",
    });
    for (const id of [
      "section.spacing.paddingTop",
      "section.spacing.paddingBottom",
      "section.spacing.paddingLeft",
      "section.spacing.paddingRight",
      "block.style.padding.top",
      "block.style.margin.bottom",
      "block.spacer.props.size",
    ]) {
      expect(resolveById(id), id).toEqual({
        kind: "sliderStepper",
        min: 0,
        max: 240,
        step: 4,
        unit: "px",
      });
    }
    for (const id of ["section.spacing.gap", "block.columns.props.gap", "block.group.props.gap"]) {
      expect(resolveById(id), id).toEqual({
        kind: "sliderStepper",
        min: 0,
        max: 120,
        step: 2,
        unit: "px",
      });
    }
  });

  test("narrow bounded numbers map to plain sliders", () => {
    expect(resolveById("section.style.radius")).toEqual({
      kind: "slider",
      min: 0,
      max: 64,
      step: 1,
      unit: "px",
    });
    expect(resolveById("block.style.radius")).toEqual({
      kind: "slider",
      min: 0,
      max: 64,
      step: 1,
      unit: "px",
    });
    expect(resolveById("block.divider.props.thickness")).toEqual({
      kind: "slider",
      min: 1,
      max: 16,
      step: 1,
      unit: "px",
    });
    expect(resolveById("block.style.opacity")).toEqual({
      kind: "slider",
      min: 0,
      max: 1,
      step: 0.05,
      unit: "",
    });
  });

  test("numbers without a valid clamp fail closed to unsupported", () => {
    expect(resolvePageEditorControlUiModel(makeControl({ input: "number" }))).toEqual({
      kind: "unsupported",
      reason: "number-without-valid-clamp",
    });
    expect(
      resolvePageEditorControlUiModel(makeControl({ input: "number", clamp: { min: 10, max: 10 } }))
    ).toEqual({ kind: "unsupported", reason: "number-without-valid-clamp" });
    expect(
      resolvePageEditorControlUiModel(
        makeControl({ input: "number", clamp: { min: 0, max: Number.NaN } })
      )
    ).toEqual({ kind: "unsupported", reason: "number-without-valid-clamp" });
  });

  test("color maps to swatch with custom picker and swatch input stays preset-only", () => {
    // Block style colors are nullable in pageDocumentV2, so block swatches
    // offer the value-clearing "Transparent" option; base section colors are
    // non-nullable (normalization would restore defaults), so sections don't.
    for (const id of [
      "block.style.textColor",
      "block.style.background",
      "block.style.borderColor",
    ]) {
      expect(resolveById(id), id).toEqual({
        kind: "swatch",
        allowCustom: true,
        allowTransparent: true,
      });
    }
    for (const id of ["section.style.background", "section.style.accent"]) {
      expect(resolveById(id), id).toEqual({
        kind: "swatch",
        allowCustom: true,
        allowTransparent: false,
      });
    }
    expect(resolvePageEditorControlUiModel(makeControl({ input: "swatch" }))).toEqual({
      kind: "swatch",
      allowCustom: false,
      allowTransparent: false,
    });
    expect(
      resolvePageEditorControlUiModel(makeControl({ input: "swatch", target: "block" }))
    ).toEqual({
      kind: "swatch",
      allowCustom: false,
      allowTransparent: true,
    });
  });

  test("media inputs map to media models, never text", () => {
    for (const id of ["block.image.props.src", "block.video.props.src", "block.card.props.image"]) {
      expect(resolveById(id), id).toEqual({ kind: "media" });
    }
  });

  test("free-form copy/href/alt controls keep the text model", () => {
    for (const id of [
      "block.heading.props.text",
      "block.button.props.href",
      "block.image.props.alt",
      "block.quote.props.cite",
    ]) {
      expect(resolveById(id), id).toEqual({ kind: "text" });
    }
  });

  test("unknown input kinds fail closed to a non-mutating unsupported model", () => {
    const model = resolvePageEditorControlUiModel(
      makeControl({ input: "magic-paint" as PageEditorControlDefinition["input"] })
    );
    expect(model).toEqual({
      kind: "unsupported",
      reason: "unknown-control-input:magic-paint",
    });
  });

  test("color palette is token-backed from the design tokens contract", () => {
    const palette = getPageEditorColorPalette();
    expect(palette).toHaveLength(7);
    expect(palette.map((swatch) => swatch.id)).toEqual([
      "primary",
      "secondary",
      "accent",
      "bg",
      "surface",
      "border",
      "text",
    ]);
    expect(palette[0]).toEqual({
      id: "primary",
      label: "Primary",
      value: DEFAULT_TOKENS.colors.primary,
    });
    expect(palette[6]!.value).toBe(DEFAULT_TOKENS.neutrals.text);
    const custom = getPageEditorColorPalette({
      ...DEFAULT_TOKENS,
      colors: { ...DEFAULT_TOKENS.colors, primary: "#123456" },
    });
    expect(custom[0]!.value).toBe("#123456");
  });

  test("slider clamp helper bounds values and rejects non-finite input", () => {
    const bounds = { min: 320, max: 1920 };
    expect(clampPageEditorSliderValue(1000, bounds)).toBe(1000);
    expect(clampPageEditorSliderValue(100, bounds)).toBe(320);
    expect(clampPageEditorSliderValue(99999, bounds)).toBe(1920);
    expect(clampPageEditorSliderValue(Number.NaN, bounds)).toBe(320);
    expect(clampPageEditorSliderValue(Number.POSITIVE_INFINITY, bounds)).toBe(1920);
  });
});
