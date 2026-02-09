import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  SpacerAdvancedEditor,
  SpacerVisualEditor,
  SpacerWizardEditor,
} from "../../../core/admin/ui/widgets/editors/SpacerEditors";
import {
  createSpacerWidget,
  normalizeSpacerData,
  resolveSpacerVariant,
  SpacerBlock,
  spacerDefaults,
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
  expect(normalizedFixed.height?.tablet).toBe("48px");
  expect(normalizedFixed.height?.mobile).toBe("48px");
  expect(normalizedFixed.showGuideInEditor).toBe(false);
  expect(resolveSpacerVariant("unknown")).toBe("responsive");
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

  const advancedHtml = renderToString(
    <SpacerAdvancedEditor
      value={spacerDefaults}
      onChange={() => undefined}
      variant="responsive"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Technical height tokens");
  expect(advancedHtml).toContain("Raw payload snapshot");
});
