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
    // The font-size scale spans compact badges/body copy through the baked h1
    // class and STAYS segmented above the select-upgrade limit: declared
    // segmented controls never degrade to a native select.
    expect(resolveById("block.style.fontSize")).toMatchObject({
      kind: "segmented",
      options: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"],
      labels: {
        "2xs": "XX-small",
        xs: "X-small",
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
      // TASK-532 (Bundle B): the weight enum grew 4→6 (extrabold/black); labels
      // auto-humanize via `humanizeOptionToken`.
      options: ["normal", "medium", "semibold", "bold", "extrabold", "black"],
      labels: {
        normal: "Normal",
        medium: "Medium",
        semibold: "Semibold",
        bold: "Bold",
        extrabold: "Extrabold",
        black: "Black",
      },
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

  // ── TASK-532 typography fidelity (Bundle B) — ui-model kinds ──
  test("TASK-532 controls resolve to the correct ui-model kinds", () => {
    // Fluid size is a free-text CSS length input.
    expect(resolveById("block.style.fontSizeCustom")).toEqual({ kind: "text" });
    // 4 options (< the 6-member segmented limit) upgrades to segmented.
    expect(resolveById("block.style.textTransform")).toMatchObject({
      kind: "segmented",
      options: ["none", "uppercase", "lowercase", "capitalize"],
    });
    // Divider eyebrow controls.
    expect(resolveById("block.divider.props.gradient")).toEqual({ kind: "toggle" });
    expect(resolveById("block.divider.props.align")).toMatchObject({
      kind: "segmented",
      options: ["left", "center", "right"],
    });
    // Width is a numeric control (slider family; wide span → stepper pairing).
    const width = resolveById("block.divider.props.width");
    expect(["slider", "sliderStepper"]).toContain(width.kind);
  });

  test("small finite select sets upgrade to segmented with English labels", () => {
    const segmentedIds = [
      "section.layout.align",
      "section.layout.justify",
      "section.style.backgroundType",
      "section.style.shadow",
      "section.hero.variant",
      "section.content.variant",
      "section.feature-grid.variant",
      "section.media-split.variant",
      "section.timeline.variant",
      "section.gallery.variant",
      "section.comparison.variant",
      "section.faq.variant",
      "section.testimonials.variant",
      "section.cta.variant",
      "section.custom.variant",
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

  test("dynamic-source selects resolve to the frozen combobox model (TASK-456)", () => {
    // The form block picker: the exact model contract the editor shell and
    // the TASK-457 collection stage build against.
    expect(resolveById("block.form.props.formId")).toEqual({
      kind: "combobox",
      optionsSource: "forms",
      placeholder: "Pick a form",
      allowNull: true,
    });
    // A dynamic source always wins over static options and never degrades to
    // segmented pills, regardless of nullability.
    expect(
      resolvePageEditorControlUiModel(
        makeControl({ input: "select", optionsSource: "forms", options: ["a", "b"] })
      )
    ).toEqual({
      kind: "combobox",
      optionsSource: "forms",
      placeholder: "Pick a form",
      allowNull: false,
    });
  });

  test("collection block pickers resolve to the frozen combobox and slider models (TASK-457)", () => {
    expect(resolveById("block.collection.props.contentTypeId")).toEqual({
      kind: "combobox",
      optionsSource: "contentTypes",
      placeholder: "Pick a content type",
      allowNull: true,
    });
    // The saved-query picker carries its sibling-prop scope and the scoped
    // empty-state copy: the editor shell filters by the chosen content type.
    expect(resolveById("block.collection.props.queryId")).toEqual({
      kind: "combobox",
      optionsSource: "listingQueries",
      placeholder: "Pick a saved query",
      allowNull: true,
      filterBy: "contentTypeId",
      emptyMessage: "No saved queries for this content type.",
    });
    expect(resolveById("block.collection.props.templateId")).toEqual({
      kind: "combobox",
      optionsSource: "listingTemplates",
      placeholder: "Pick a listing template",
      allowNull: true,
    });
    // Limit rides the existing bounded-number slider upgrade with the single
    // owner clamp (1..24 after the TASK-459-03 unification): step 1 and an
    // explicit unitless readout (an entry count, not pixels).
    expect(resolveById("block.collection.props.limit")).toEqual({
      kind: "slider",
      min: 1,
      max: 24,
      step: 1,
      unit: "",
    });
    // TASK-459-03 visitor pagination: a segmented mode strip plus the
    // page-size slider bound to the same owner clamp.
    expect(resolveById("block.collection.props.paginationMode")).toMatchObject({
      kind: "segmented",
      options: ["none", "paged", "load-more"],
    });
    expect(resolveById("block.collection.props.pageSize")).toEqual({
      kind: "slider",
      min: 1,
      max: 24,
      step: 1,
      unit: "",
    });
  });

  test("filters block controls resolve to the frozen models (TASK-459-02)", () => {
    // The saved-query picker rides the UNSCOPED source: the filters block
    // binds to any saved listing query (no contentTypeId sibling).
    expect(resolveById("block.filters.props.queryId")).toEqual({
      kind: "combobox",
      optionsSource: "listingQueriesAll",
      placeholder: "Pick a saved query",
      allowNull: true,
      emptyMessage: "No saved listing queries yet.",
    });
    // The generic facet builder is its own dedicated model.
    expect(resolveById("block.filters.props.facets")).toEqual({ kind: "facetList" });
    expect(resolveById("block.filters.props.layout")).toMatchObject({ kind: "segmented" });
    expect(resolveById("block.filters.props.autoApply")).toEqual({ kind: "toggle" });
    expect(resolveById("block.filters.props.applyLabel")).toEqual({ kind: "text" });
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
      // TASK-530: every numeric (px) range now steps by 1 for fine control,
      // regardless of span; wide ranges still pair with steppers.
      step: 1,
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
        step: 1,
        unit: "px",
      });
    }
    for (const id of ["section.spacing.gap", "block.columns.props.gap", "block.group.props.gap"]) {
      expect(resolveById(id), id).toEqual({
        kind: "sliderStepper",
        min: 0,
        max: 120,
        step: 1,
        unit: "px",
      });
    }
  });

  test("TASK-530: wide integer ranges step by 1 while fractional ranges stay 0.05", () => {
    // A wide-span px range (maxWidth 320..1920) still pairs with steppers but
    // now steps by 1 for fine control, not the old coarse derived default (10).
    const maxWidth = resolveById("section.layout.maxWidth");
    expect(maxWidth).toMatchObject({ kind: "sliderStepper", min: 320, max: 1920, step: 1 });
    // The former sole explicit integer step (parallax, step: 2) was dropped so
    // it too falls through to the derived 1px default.
    expect(resolveById("section.parallaxIntensity")).toMatchObject({ step: 1, unit: "px" });
    // Fractional ranges (max <= 1) can't step by 1 and keep the 0.05 default.
    expect(resolveById("block.style.opacity")).toMatchObject({ min: 0, max: 1, step: 0.05 });
    // Registry-owned fractional steps stay intentionally fine-grained.
    expect(resolveById("block.style.lineHeight")).toMatchObject({ step: 0.05 });
    expect(resolveById("block.style.letterSpacing")).toMatchObject({ step: 0.5 });
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
    expect(resolveById("block.style.borderWidth")).toEqual({
      kind: "slider",
      min: 0,
      max: 12,
      step: 1,
      unit: "px",
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
    for (const id of [
      "block.style.backgroundImage",
      "block.image.props.src",
      "block.video.props.src",
      "block.card.props.image",
    ]) {
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
      value: "var(--color-primary)",
      previewValue: DEFAULT_TOKENS.colors.primary,
    });
    expect(palette[6]).toMatchObject({
      value: "var(--color-text)",
      previewValue: DEFAULT_TOKENS.neutrals.text,
    });
    const custom = getPageEditorColorPalette({
      ...DEFAULT_TOKENS,
      colors: { ...DEFAULT_TOKENS.colors, primary: "#123456" },
    });
    expect(custom[0]).toMatchObject({
      value: "var(--color-primary)",
      previewValue: "#123456",
    });
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
