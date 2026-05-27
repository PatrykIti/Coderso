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

test("stack renders defaults with responsive axis markers", () => {
  const html = renderToString(<StackBlock data={stackDefaults} variant="vertical" />);

  expect(html).toContain('data-stack-variant="vertical"');
  expect(html).toContain('data-stack-direction-desktop="column"');
  expect(html).toContain('data-stack-align="stretch"');
  expect(html).toContain('data-stack-align-desktop="stretch"');
  expect(html).toContain('data-stack-justify-tablet="start"');
  expect(html).toContain('data-stack-wrap-mobile="false"');
  expect(html).toContain('data-stack-items="0"');
  expect(html).toContain("Empty stack.");
});

test("stack normalization supports presets, legacy scalars, and responsive objects", () => {
  const horizontal = normalizeStackData({}, "horizontal");
  expect(horizontal.direction).toEqual({
    desktop: "row",
    tablet: "row",
    mobile: "row",
  });
  expect(horizontal.align).toEqual({
    desktop: "stretch",
    tablet: "stretch",
    mobile: "stretch",
  });

  const legacyZeroGap = normalizeStackData(
    {
      gap: {
        desktop: "0",
        tablet: "0",
        mobile: "0",
      },
    },
    "vertical"
  );
  expect(legacyZeroGap.gap).toEqual({
    desktop: "0",
    tablet: "0",
    mobile: "0",
  });

  const responsive = normalizeStackData(
    {
      direction: { mobile: "row" },
      gap: {
        desktop: "unknown" as NonNullable<StackData["gap"]>["desktop"],
      },
      align: "baseline",
      justify: {
        desktop: "evenly",
        tablet: "around",
        mobile: "bad" as never,
      },
      wrap: true,
    },
    "responsive"
  );
  expect(responsive.direction).toEqual({
    desktop: "row",
    tablet: "row",
    mobile: "row",
  });
  expect(responsive.gap?.desktop).toBe("6");
  expect(responsive.align).toEqual({
    desktop: "baseline",
    tablet: "baseline",
    mobile: "baseline",
  });
  expect(responsive.justify).toEqual({
    desktop: "evenly",
    tablet: "around",
    mobile: "start",
  });
  expect(responsive.wrap).toEqual({
    desktop: true,
    tablet: true,
    mobile: true,
  });
  expect(resolveStackVariant("unknown")).toBe("vertical");
});

test("stack renders responsive align, justify, and wrap classes", () => {
  const html = renderToString(
    <StackBlock
      data={{
        direction: {
          desktop: "row",
          tablet: "row",
          mobile: "column",
        },
        gap: {
          desktop: "none",
          tablet: "6",
          mobile: "4",
        },
        align: {
          desktop: "baseline",
          tablet: "center",
          mobile: "start",
        },
        justify: {
          desktop: "evenly",
          tablet: "around",
          mobile: "between",
        },
        wrap: {
          desktop: true,
          tablet: false,
          mobile: true,
        },
      }}
      variant="responsive"
    />
  );

  expect(html).toContain("items-start");
  expect(html).toContain("md:items-center");
  expect(html).toContain("lg:items-baseline");
  expect(html).toContain("justify-between");
  expect(html).toContain("md:justify-around");
  expect(html).toContain("lg:justify-evenly");
  expect(html).toContain("flex-wrap");
  expect(html).toContain("md:flex-nowrap");
  expect(html).toContain("lg:flex-wrap");
  expect(html).toContain('data-stack-gap-desktop="none"');
  expect(html).toContain('data-stack-align="start"');
  expect(html).toContain('data-stack-align-desktop="baseline"');
  expect(html).toContain('data-stack-justify="between"');
  expect(html).toContain('data-stack-justify-tablet="around"');
  expect(html).toContain('data-stack-wrap="true"');
  expect(html).toContain('data-stack-wrap-tablet="false"');
});

test("stack validator accepts legacy scalar and responsive axis or wrap models", () => {
  clearWidgets();
  const widget = createStackWidget({
    wizard: StubStackEditor,
    visual: StubStackEditor,
    advanced: StubStackEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "stack-legacy-axis",
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
        justify: "around",
        wrap: false,
      },
      slots: {
        content: [],
      },
    })
  ).not.toThrow();

  expect(() =>
    normalizeWidgetBlock({
      id: "stack-responsive-axis",
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
        align: {
          desktop: "baseline",
          tablet: "center",
          mobile: "stretch",
        },
        justify: {
          desktop: "evenly",
          tablet: "around",
          mobile: "start",
        },
        wrap: {
          desktop: true,
          tablet: false,
          mobile: true,
        },
      },
      slots: {
        content: [],
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("stack validator rejects invalid responsive axis keys and values", () => {
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
      id: "stack-invalid-align-key",
      type: "stack",
      variant: "responsive",
      data: {
        ...stackDefaults,
        align: {
          desktop: "center",
          widescreen: "start",
        } as never,
      },
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "stack-invalid-wrap-value",
      type: "stack",
      variant: "responsive",
      data: {
        ...stackDefaults,
        wrap: {
          desktop: true,
          tablet: false,
          mobile: "yes",
        } as never,
      },
    })
  ).toThrow("widget_schema_invalid");
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
        variant: "horizontal",
        data: {
          ...stackDefaults,
          direction: {
            desktop: "row",
            tablet: "row",
            mobile: "column",
          },
        },
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
  expect(html).toContain('data-widget-surface="row-flow-item"');
  expect(html).toContain('class="min-w-0 max-w-full" data-widget-surface="row-flow-item"');
  expect(html.match(/<section/g) ?? []).toHaveLength(1);
});

test("stack editors render updated sections, copy, and miniatures", () => {
  const wizardHtml = renderToString(
    <StackWizardEditor
      value={stackDefaults}
      onChange={() => undefined}
      variant="vertical"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Stack quick start");
  expect(wizardHtml).toContain(
    "Visual owns stack preset choice, breakpoint flow directions, spacing, alignment, distribution, and wrapping after setup."
  );
  expect(wizardHtml).not.toContain("Gap on all breakpoints");
  expect(wizardHtml).not.toContain("Align on all breakpoints");
  expect(wizardHtml).not.toContain("Justify on all breakpoints");
  expect(wizardHtml).toContain("content");

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
  expect(visualHtml).toContain("Responsive alignment and wrap");
  expect(visualHtml).toContain("Slot guidance");
  expect(visualHtml).toContain('data-stack-variant-miniature="vertical"');
  expect(visualHtml).toContain('data-stack-variant-miniature="horizontal"');
  expect(visualHtml).toContain('data-stack-variant-miniature="responsive"');

  const advancedHtml = renderToString(
    <StackAdvancedEditor
      value={stackDefaults}
      onChange={() => undefined}
      variant="vertical"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Runtime stack summary");
  expect(advancedHtml).toContain("Support summary");
  expect(advancedHtml).toContain("Stack vertically");
  expect(advancedHtml).not.toContain("Technical flow tokens");
  expect(advancedHtml).not.toContain("Raw payload snapshot");
  expect(advancedHtml).not.toContain("<pre");
});
