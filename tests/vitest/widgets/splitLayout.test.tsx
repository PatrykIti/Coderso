import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  SplitLayoutAdvancedEditor,
  SplitLayoutVisualEditor,
  SplitLayoutWizardEditor,
} from "../../../core/admin/ui/widgets/editors/SplitLayoutEditors";
import { createHeroWidget, heroDefaults, type HeroData } from "../../../core/widgets/core/hero";
import {
  createSplitLayoutWidget,
  getSplitLayoutDiagnostics,
  getSplitLayoutGapControlValue,
  getSplitLayoutRatioDisclosure,
  normalizeSplitLayoutData,
  resolveSplitLayoutVariant,
  SplitLayoutBlock,
  splitLayoutDefaults,
  type SplitLayoutData,
} from "../../../core/widgets/core/splitLayout";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubSplitLayoutEditor: ComponentType<WidgetEditorProps<SplitLayoutData>> = () => null;
const StubHeroEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;

test("split layout renders defaults with mobile markers", () => {
  const html = renderToString(<SplitLayoutBlock data={splitLayoutDefaults} variant="50-50" />);

  expect(html).toContain('data-split-layout-variant="50-50"');
  expect(html).toContain('data-split-ratio-desktop="50-50"');
  expect(html).toContain('data-split-ratio-tablet="50-50"');
  expect(html).toContain('data-split-ratio-mobile="50-50"');
  expect(html).toContain('data-split-collapse-mobile="stack"');
  expect(html).toContain('data-split-side="left"');
  expect(html).toContain('data-split-side="right"');
});

test("split layout normalization keeps deterministic defaults and mobile fallback", () => {
  const normalized = normalizeSplitLayoutData(
    {
      ratio: {
        desktop: "invalid" as NonNullable<SplitLayoutData["ratio"]>["desktop"],
        mobile: "invalid" as NonNullable<SplitLayoutData["ratio"]>["mobile"],
      },
      collapseMobile: "bad" as SplitLayoutData["collapseMobile"],
      gap: "bad" as SplitLayoutData["gap"],
      verticalAlign: "bad" as SplitLayoutData["verticalAlign"],
    },
    "60-40"
  );

  expect(normalized.ratio?.desktop).toBe("60-40");
  expect(normalized.ratio?.tablet).toBe("50-50");
  expect(normalized.ratio?.mobile).toBe("50-50");
  expect(normalized.collapseMobile).toBe("stack");
  expect(normalized.gap).toBe("6");
  expect(normalized.verticalAlign).toBe("stretch");
  expect(resolveSplitLayoutVariant("unknown")).toBe("50-50");
});

test("split layout preserves legacy zero gap while exposing none in controls", () => {
  const normalized = normalizeSplitLayoutData(
    {
      ratio: {
        tablet: "60-40",
      },
      collapseMobile: "keep",
      gap: "0",
    },
    "40-60"
  );
  const disclosure = getSplitLayoutRatioDisclosure(
    {
      ratio: {
        desktop: "40-60",
        tablet: "60-40",
      },
      collapseMobile: "keep",
      gap: "0",
    },
    "40-60"
  );
  const diagnostics = getSplitLayoutDiagnostics(
    {
      ratio: {
        desktop: "40-60",
        tablet: "60-40",
      },
      collapseMobile: "keep",
      gap: "0",
    },
    "40-60"
  );

  expect(normalized.gap).toBe("0");
  expect(normalized.ratio?.mobile).toBe("60-40");
  expect(getSplitLayoutGapControlValue(normalized.gap)).toBe("none");
  expect(disclosure.mobile).toBe("60-40");
  expect(diagnostics.gap.controlValue).toBe("none");
  expect(diagnostics.gap.description).toContain("Older saved zero-gap layouts are shown here.");
});

test("split layout disclosure separates starter matches from device-specific changes", () => {
  const explicitStarterMatch = getSplitLayoutRatioDisclosure(
    {
      ratio: {
        desktop: "60-40",
        tablet: "60-40",
        mobile: "60-40",
      },
    },
    "60-40"
  );
  expect(explicitStarterMatch).toMatchObject({
    hasExplicitMobile: true,
    hasOverride: false,
    hasDeviceSpecificChanges: false,
    effectiveMatchesStarter: true,
  });

  const responsiveOverride = getSplitLayoutRatioDisclosure(
    {
      ratio: {
        desktop: "50-50",
        tablet: "40-60",
        mobile: "60-40",
      },
    },
    "60-40"
  );
  expect(responsiveOverride).toMatchObject({
    desktop: "50-50",
    tablet: "40-60",
    mobile: "60-40",
    hasOverride: true,
    hasDeviceSpecificChanges: true,
    effectiveMatchesStarter: false,
  });
});

test("split layout validator accepts expanded model with mobile ratio", () => {
  clearWidgets();
  const widget = createSplitLayoutWidget({
    wizard: StubSplitLayoutEditor,
    visual: StubSplitLayoutEditor,
    advanced: StubSplitLayoutEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "split-1",
      type: "split-layout",
      variant: "40-60",
      data: {
        ratio: {
          desktop: "40-60",
          tablet: "60-40",
          mobile: "50-50",
        },
        collapseMobile: "keep",
        reverseOnMobile: true,
        gap: "8",
        verticalAlign: "center",
      },
      slots: {
        left: [],
        right: [],
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("split layout validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createSplitLayoutWidget({
      wizard: StubSplitLayoutEditor,
      visual: StubSplitLayoutEditor,
      advanced: StubSplitLayoutEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "split-2",
      type: "split-layout",
      variant: "invalid",
      data: splitLayoutDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("split layout hides empty pane guidance in public output and shows actionable preview placeholders", () => {
  const publicHtml = renderToString(
    <SplitLayoutBlock data={splitLayoutDefaults} variant="50-50" />
  );
  const previewHtml = renderToString(
    <SplitLayoutBlock
      data={splitLayoutDefaults}
      variant="50-50"
      renderContext={{ mode: "editor-preview" }}
    />
  );

  expect(publicHtml).not.toContain("Empty left pane");
  expect(publicHtml).not.toContain("Add a widget from Structure or the insert controls");
  expect(publicHtml).not.toContain("data-split-empty-pane");

  expect(previewHtml).toContain('data-split-empty-pane="left"');
  expect(previewHtml).toContain('data-split-empty-pane="right"');
  expect(previewHtml).toContain(
    "Left pane is empty. Add a widget from Structure or the insert controls."
  );
  expect(previewHtml).toContain(
    "Right pane is empty. Add a widget from Structure or the insert controls."
  );
});

test("split layout renders left and right slot content", () => {
  clearWidgets();
  registerWidget(
    createSplitLayoutWidget({
      wizard: StubSplitLayoutEditor,
      visual: StubSplitLayoutEditor,
      advanced: StubSplitLayoutEditor,
    })
  );
  registerWidget(
    createHeroWidget({
      wizard: StubHeroEditor,
      visual: StubHeroEditor,
      advanced: StubHeroEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "split-parent",
        type: "split-layout",
        variant: "50-50",
        data: splitLayoutDefaults,
        slots: {
          left: [
            {
              id: "hero-left",
              type: "hero",
              variant: "centered",
              data: {
                ...heroDefaults,
                headline: "Left pane child",
              },
            },
          ],
          right: [
            {
              id: "hero-right",
              type: "hero",
              variant: "centered",
              data: {
                ...heroDefaults,
                headline: "Right pane child",
              },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Left pane child");
  expect(html).toContain("Right pane child");
  expect(html).toContain('data-split-items-left="1"');
  expect(html).toContain('data-split-items-right="1"');
});

test("split layout editors render updated sections and diagnostics", () => {
  const wizardHtml = renderToString(
    <SplitLayoutWizardEditor
      value={splitLayoutDefaults}
      onChange={() => undefined}
      variant="50-50"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Starter layout");
  expect(wizardHtml).not.toContain("Mobile behavior");
  expect(wizardHtml).not.toContain("Base gap");

  const visualHtml = renderToString(
    <SplitLayoutVisualEditor
      value={splitLayoutDefaults}
      onChange={() => undefined}
      variant="50-50"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Pane layout");
  expect(visualHtml).toContain("Phone behavior");
  expect(visualHtml).toContain("Pane content");
  expect(visualHtml).not.toContain("Pane slots");
  expect(visualHtml).toContain("Current layout on devices");

  const advancedHtml = renderToString(
    <SplitLayoutAdvancedEditor
      value={splitLayoutDefaults}
      onChange={() => undefined}
      variant="50-50"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("How this layout renders");
  expect(advancedHtml).toContain("Saved layout summary");
  expect(advancedHtml).not.toContain("Raw payload snapshot");
  expect(advancedHtml).not.toContain("<pre");
  expect(advancedHtml).not.toContain("raw JSON");
  expect(advancedHtml).not.toContain("CSS class");
  expect(advancedHtml).not.toContain("token");
  expect(advancedHtml).not.toContain("payload");
  expect(advancedHtml).not.toContain("using gap-");
  expect(advancedHtml).not.toContain("using items-");
  expect(advancedHtml).not.toContain("Technical split tokens");
});
