import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  SpacerAdvancedEditor,
  SpacerVisualEditor,
  SpacerWizardEditor,
} from "../../../core/admin/ui/widgets/editors/SpacerEditors";
import {
  applySpacerPreset,
  createSpacerWidget,
  deriveSpacerPresetId,
  normalizeSpacerCustomHeightInput,
  normalizeSpacerData,
  resolveSpacerVariant,
  SpacerBlock,
  spacerDefaults,
  spacerPresetDefinitions,
  type SpacerData,
} from "../../../core/widgets/core/spacer";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubSpacerEditor: ComponentType<WidgetEditorProps<SpacerData>> = () => null;

test("spacer renders defaults", () => {
  const html = renderToString(
    <SpacerBlock data={spacerDefaults} variant="responsive" previewDevice="desktop" />
  );

  expect(html).toContain('data-spacer="true"');
  expect(html).toContain('data-spacer-variant="responsive"');
  expect(html).toContain('data-spacer-desktop="16"');
  expect(html).toContain('data-spacer-tablet="12"');
  expect(html).toContain('data-spacer-mobile="8"');
});

test("spacer normalization keeps deterministic defaults", () => {
  const normalizedResponsive = normalizeSpacerData(
    {
      height: {
        desktop: "bad",
        tablet: "bad",
        mobile: "24",
      },
    },
    "responsive"
  );
  expect(normalizedResponsive.height?.desktop).toBe("16");
  expect(normalizedResponsive.height?.tablet).toBe("12");
  expect(normalizedResponsive.height?.mobile).toBe("24");

  const normalizedFixed = normalizeSpacerData(
    {
      height: {
        desktop: "48",
        tablet: "10",
        mobile: "8",
      },
      showGuideInEditor: false,
    },
    "fixed"
  );
  expect(normalizedFixed.height?.desktop).toBe("48px");
  expect(normalizedFixed.height?.tablet).toBe("10");
  expect(normalizedFixed.height?.mobile).toBe("8");
  expect(normalizedFixed.showGuideInEditor).toBe(false);
  expect(resolveSpacerVariant("unknown")).toBe("responsive");
});

test("spacer presets stay transient and derive exact matches from current heights", () => {
  expect(spacerPresetDefinitions.map((preset) => preset.id)).toEqual([
    "card-gap",
    "section-gap",
    "hero-gap",
  ]);
  expect(deriveSpacerPresetId(spacerDefaults.height)).toBe("section-gap");

  const applied = applySpacerPreset(
    {
      height: {
        desktop: "48px",
        tablet: "12",
        mobile: "8",
      },
      showGuideInEditor: false,
    },
    "hero-gap"
  );

  expect(applied).toEqual({
    height: {
      desktop: "24",
      tablet: "20",
      mobile: "16",
    },
    showGuideInEditor: false,
  });
  expect(deriveSpacerPresetId(applied.height)).toBe("hero-gap");
  expect(
    deriveSpacerPresetId({
      desktop: "24",
      tablet: "20",
      mobile: "12",
    })
  ).toBeNull();
  expect(
    deriveSpacerPresetId({
      desktop: "10vh",
      tablet: "12",
      mobile: "8",
    })
  ).toBeNull();
});

test("spacer accepts bounded viewport and clamp lengths", () => {
  expect(normalizeSpacerCustomHeightInput("10VH")).toBe("10vh");
  expect(normalizeSpacerCustomHeightInput("50dvh")).toBe("50dvh");
  expect(normalizeSpacerCustomHeightInput("5SVH")).toBe("5svh");
  expect(normalizeSpacerCustomHeightInput("12vw")).toBe("12vw");
  expect(normalizeSpacerCustomHeightInput("clamp( 2REM , 5VW , 8rem )")).toBe(
    "clamp(2rem, 5vw, 8rem)"
  );

  const normalized = normalizeSpacerData(
    {
      height: {
        desktop: "10VH",
        tablet: "clamp( 2REM , 5VW , 8rem )",
        mobile: "48",
      },
    },
    "responsive"
  );

  expect(normalized.height).toEqual({
    desktop: "10vh",
    tablet: "clamp(2rem, 5vw, 8rem)",
    mobile: "48px",
  });

  const html = renderToString(
    <SpacerBlock
      data={{
        height: {
          desktop: "10vh",
          tablet: "clamp(2rem, 5vw, 8rem)",
          mobile: "12vw",
        },
        showGuideInEditor: true,
      }}
      variant="responsive"
      previewDevice="desktop"
    />
  );

  expect(html).toContain('data-spacer-desktop="10vh"');
  expect(html).toContain('data-spacer-tablet="clamp(2rem, 5vw, 8rem)"');
  expect(html).toContain('data-spacer-mobile="12vw"');
  expect(html).toContain("--spacer-desktop-height:10vh");
  expect(html).toContain("--spacer-tablet-height:clamp(2rem, 5vw, 8rem)");
  expect(html).toContain("--spacer-mobile-height:12vw");
});

test("spacer rejects unsafe custom lengths and falls back to defaults", () => {
  expect(normalizeSpacerCustomHeightInput("2rem")).toBeUndefined();
  expect(normalizeSpacerCustomHeightInput("10lvh")).toBeUndefined();
  expect(normalizeSpacerCustomHeightInput("calc(100vh - 2rem)")).toBeUndefined();
  expect(normalizeSpacerCustomHeightInput("var(--spacer)")).toBeUndefined();
  expect(normalizeSpacerCustomHeightInput("-10vh")).toBeUndefined();
  expect(normalizeSpacerCustomHeightInput("clamp(2rem, 5rem, 8rem)")).toBeUndefined();
  expect(normalizeSpacerCustomHeightInput("clamp(2rem, calc(5vw + 1rem), 8rem)")).toBeUndefined();
  expect(normalizeSpacerCustomHeightInput("clamp(2rem, 5vw, 8rem); color:red")).toBeUndefined();

  const normalized = normalizeSpacerData(
    {
      height: {
        desktop: "calc(100vh - 2rem)",
        tablet: "clamp(2rem, 5rem, 8rem)",
        mobile: "url(https://example.com)",
      },
    },
    "responsive"
  );

  expect(normalized.height).toEqual({
    desktop: "16",
    tablet: "12",
    mobile: "8",
  });

  const html = renderToString(
    <SpacerBlock
      data={{
        height: {
          desktop: "calc(100vh - 2rem)",
          tablet: "clamp(2rem, 5rem, 8rem)",
          mobile: "url(https://example.com)",
        },
      }}
      variant="responsive"
      previewDevice="desktop"
    />
  );

  expect(html).toContain('data-spacer-desktop="16"');
  expect(html).toContain('data-spacer-tablet="12"');
  expect(html).toContain('data-spacer-mobile="8"');
  expect(html).not.toContain("calc(100vh - 2rem)");
  expect(html).not.toContain("clamp(2rem, 5rem, 8rem)");
  expect(html).not.toContain("url(https://example.com)");
});

test("spacer fixed variant preserves hidden custom heights while rendering desktop height", () => {
  const normalized = normalizeSpacerData(
    {
      height: {
        desktop: "24px",
        tablet: "50dvh",
        mobile: "clamp(24px, 4dvh, 96px)",
      },
    },
    "fixed"
  );

  expect(normalized.height).toEqual({
    desktop: "24px",
    tablet: "50dvh",
    mobile: "clamp(24px, 4dvh, 96px)",
  });

  const html = renderToString(
    <SpacerBlock
      data={{
        height: {
          desktop: "24px",
          tablet: "50dvh",
          mobile: "clamp(24px, 4dvh, 96px)",
        },
      }}
      variant="fixed"
      previewDevice="tablet"
    />
  );

  expect(html).toContain('data-spacer-desktop="24px"');
  expect(html).toContain('data-spacer-tablet="24px"');
  expect(html).toContain('data-spacer-mobile="24px"');
  expect(html).toContain('data-spacer-preview-height="24px"');
  expect(html).not.toContain('data-spacer-tablet="50dvh"');
  expect(html).not.toContain('data-spacer-mobile="clamp(24px, 4dvh, 96px)"');
});

test("spacer shows guide in editor preview without requiring previewDevice", () => {
  const html = renderToString(
    <SpacerBlock
      data={spacerDefaults}
      variant="responsive"
      renderContext={{ mode: "editor-preview" }}
    />
  );

  expect(html).toContain('data-spacer-preview-height="16"');
  expect(html).toContain("Section gap");
  expect(html).not.toContain("Spacer 4rem");
  expect(html).not.toContain("<!-- -->4rem");
});

test("spacer validator accepts expanded model", () => {
  clearWidgets();
  const widget = createSpacerWidget({
    wizard: StubSpacerEditor,
    visual: StubSpacerEditor,
    advanced: StubSpacerEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "spacer-1",
      type: "spacer",
      variant: "responsive",
      data: {
        height: {
          desktop: "24",
          tablet: "72px",
          mobile: "12",
        },
        showGuideInEditor: true,
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("spacer validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createSpacerWidget({
      wizard: StubSpacerEditor,
      visual: StubSpacerEditor,
      advanced: StubSpacerEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "spacer-2",
      type: "spacer",
      variant: "bad",
      data: spacerDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("spacer editors render expected sections", () => {
  const wizardHtml = renderToString(
    <SpacerWizardEditor
      value={spacerDefaults}
      onChange={() => undefined}
      variant="responsive"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Spacer mode");
  expect(wizardHtml).toContain("Desktop height");

  const visualHtml = renderToString(
    <SpacerVisualEditor
      value={spacerDefaults}
      onChange={() => undefined}
      variant="responsive"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and responsive behavior");
  expect(visualHtml).toContain("Responsive heights");
  expect(visualHtml).toContain("Editor guide");
  expect(visualHtml).toContain('data-widget-editor-section="spacer.visual.rhythm"');
  expect(visualHtml).toContain('data-widget-editor-mode="visual"');
  expect(visualHtml).toContain('data-widget-editor-section-role="layout"');
  expect(visualHtml).toContain('data-widget-control-path="height.desktop"');

  const advancedHtml = renderToString(
    <SpacerAdvancedEditor
      value={spacerDefaults}
      onChange={() => undefined}
      variant="responsive"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Runtime spacing summary");
  expect(advancedHtml).toContain("Support summary");
  expect(advancedHtml).toContain('data-widget-editor-section="spacer.advanced.runtime-summary"');
  expect(advancedHtml).toContain('data-widget-control-readonly="true"');
  expect(advancedHtml).not.toContain("<pre");
  expect(advancedHtml).not.toContain("Raw payload");
  expect(advancedHtml).not.toContain('data-widget-control-ownership="writable"');
});
