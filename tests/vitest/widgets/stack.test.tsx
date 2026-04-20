import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  StackAdvancedEditor,
  StackVisualEditor,
  StackWizardEditor,
} from "../../../core/admin/ui/widgets/editors/StackEditors";
import { createHeroWidget, heroDefaults, type HeroData } from "../../../core/widgets/core/hero";
import {
  createStackWidget,
  normalizeStackData,
  resolveStackVariant,
  StackBlock,
  stackDefaults,
  type StackData,
} from "../../../core/widgets/core/stack";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubStackEditor: ComponentType<WidgetEditorProps<StackData>> = () => null;
const StubHeroEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;

test("stack renders defaults", () => {
  const html = renderToString(<StackBlock data={stackDefaults} variant="vertical" />);

  expect(html).toContain('data-stack-variant="vertical"');
  expect(html).toContain('data-stack-direction-desktop="column"');
  expect(html).toContain('data-stack-items="0"');
  expect(html).toContain("Empty stack.");
});

test("stack normalization keeps deterministic variant flow defaults", () => {
  const horizontal = normalizeStackData({}, "horizontal");
  expect(horizontal.direction?.desktop).toBe("row");
  expect(horizontal.direction?.tablet).toBe("row");
  expect(horizontal.direction?.mobile).toBe("row");

  const responsive = normalizeStackData(
    {
      direction: { mobile: "row" },
      gap: {
        desktop: "unknown" as NonNullable<StackData["gap"]>["desktop"],
      },
      align: "bad" as StackData["align"],
      justify: "bad" as StackData["justify"],
    },
    "responsive"
  );
  expect(responsive.direction?.desktop).toBe("row");
  expect(responsive.direction?.tablet).toBe("row");
  expect(responsive.direction?.mobile).toBe("row");
  expect(responsive.gap?.desktop).toBe("6");
  expect(responsive.align).toBe("stretch");
  expect(responsive.justify).toBe("start");
  expect(resolveStackVariant("unknown")).toBe("vertical");
});

test("stack validator accepts expanded model", () => {
  clearWidgets();
  const widget = createStackWidget({
    wizard: StubStackEditor,
    visual: StubStackEditor,
    advanced: StubStackEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "stack-1",
      type: "stack",
      variant: "responsive",
      data: {
        direction: {
          desktop: "row",
          tablet: "row",
          mobile: "column",
        },
        gap: {
          desktop: "8",
          tablet: "6",
          mobile: "4",
        },
        align: "center",
        justify: "between",
        wrap: true,
      },
      slots: {
        content: [],
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("stack validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createStackWidget({
      wizard: StubStackEditor,
      visual: StubStackEditor,
      advanced: StubStackEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "stack-2",
      type: "stack",
      variant: "invalid",
      data: stackDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("stack renders content slot blocks", () => {
  clearWidgets();
  registerWidget(
    createStackWidget({
      wizard: StubStackEditor,
      visual: StubStackEditor,
      advanced: StubStackEditor,
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
        id: "stack-parent",
        type: "stack",
        variant: "vertical",
        data: stackDefaults,
        slots: {
          content: [
            {
              id: "hero-child",
              type: "hero",
              variant: "centered",
              data: {
                ...heroDefaults,
                headline: "Stack child",
              },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Stack child");
  expect(html).toContain('data-stack-items="1"');
});

test("stack editors render expected sections", () => {
  const wizardHtml = renderToString(
    <StackWizardEditor
      value={stackDefaults}
      onChange={() => undefined}
      variant="vertical"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Stack style");
  expect(wizardHtml).toContain("Mobile direction");

  const visualHtml = renderToString(
    <StackVisualEditor
      value={stackDefaults}
      onChange={() => undefined}
      variant="vertical"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and flow");
  expect(visualHtml).toContain("Responsive direction");
  expect(visualHtml).toContain("Spacing and distribution");

  const advancedHtml = renderToString(
    <StackAdvancedEditor
      value={stackDefaults}
      onChange={() => undefined}
      variant="vertical"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Technical flow tokens");
  expect(advancedHtml).toContain("Raw payload snapshot");
});
