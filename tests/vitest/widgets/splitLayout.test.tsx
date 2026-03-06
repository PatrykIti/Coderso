import React from "react";
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

const StubSplitLayoutEditor: ComponentType<WidgetEditorProps<SplitLayoutData>> = () =>
  null;
const StubHeroEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;

test("split layout renders defaults", () => {
  const html = renderToString(
    <SplitLayoutBlock data={splitLayoutDefaults} variant="50-50" />
  );

  expect(html).toContain('data-split-layout-variant="50-50"');
  expect(html).toContain('data-split-ratio-desktop="50-50"');
  expect(html).toContain('data-split-collapse-mobile="stack"');
  expect(html).toContain('data-split-side="left"');
  expect(html).toContain('data-split-side="right"');
});

test("split layout normalization keeps deterministic defaults", () => {
  const normalized = normalizeSplitLayoutData(
    {
      ratio: {
        desktop: "invalid" as SplitLayoutData["ratio"]["desktop"],
      },
      collapseMobile: "bad" as SplitLayoutData["collapseMobile"],
      gap: "bad" as SplitLayoutData["gap"],
      verticalAlign: "bad" as SplitLayoutData["verticalAlign"],
    },
    "60-40"
  );

  expect(normalized.ratio?.desktop).toBe("60-40");
  expect(normalized.ratio?.tablet).toBe("50-50");
  expect(normalized.collapseMobile).toBe("stack");
  expect(normalized.gap).toBe("6");
  expect(normalized.verticalAlign).toBe("stretch");
  expect(resolveSplitLayoutVariant("unknown")).toBe("50-50");
});

test("split layout validator accepts expanded model", () => {
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

test("split layout editors render expected sections", () => {
  const wizardHtml = renderToString(
    <SplitLayoutWizardEditor
      value={splitLayoutDefaults}
      onChange={() => undefined}
      variant="50-50"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Split preset");
  expect(wizardHtml).toContain("Mobile behavior");

  const visualHtml = renderToString(
    <SplitLayoutVisualEditor
      value={splitLayoutDefaults}
      onChange={() => undefined}
      variant="50-50"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and pane ratio");
  expect(visualHtml).toContain("Mobile collapse behavior");
  expect(visualHtml).toContain("Spacing and vertical alignment");

  const advancedHtml = renderToString(
    <SplitLayoutAdvancedEditor
      value={splitLayoutDefaults}
      onChange={() => undefined}
      variant="50-50"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Technical split tokens");
  expect(advancedHtml).toContain("Raw payload snapshot");
});
