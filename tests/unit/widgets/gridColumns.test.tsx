import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  GridColumnsAdvancedEditor,
  GridColumnsVisualEditor,
  GridColumnsWizardEditor,
} from "../../../core/admin/ui/widgets/editors/GridColumnsEditors";
import { createHeroWidget, heroDefaults, type HeroData } from "../../../core/widgets/core/hero";
import {
  createGridColumnsWidget,
  gridColumnsDefaults,
  GridColumnsBlock,
  normalizeGridColumnsData,
  resolveGridColumnsVariant,
  type GridColumnsData,
} from "../../../core/widgets/core/gridColumns";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubGridColumnsEditor: ComponentType<WidgetEditorProps<GridColumnsData>> = () =>
  null;
const StubHeroEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;

test("grid columns renders defaults", () => {
  const html = renderToString(
    <GridColumnsBlock data={gridColumnsDefaults} variant="equal" />
  );

  expect(html).toContain('data-grid-columns-variant="equal"');
  expect(html).toContain('data-grid-columns-count="2"');
  expect(html).toContain('data-grid-column="column:1"');
  expect(html).toContain("Empty column.");
});

test("grid columns normalization keeps deterministic ids and bounds", () => {
  const normalized = normalizeGridColumnsData({
    columns: [
      { id: "1", label: "Lead", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
      { id: "1", label: "", desktopSpan: "13" as GridColumnsData["columns"][number]["desktopSpan"] },
      { id: "3", label: "Support", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
    ],
    layout: {
      gapX: "7" as GridColumnsData["layout"]["gapX"],
      gapY: "7" as GridColumnsData["layout"]["gapY"],
      align: "unsupported" as GridColumnsData["layout"]["align"],
    },
    style: {
      columnBorderWidth: "9" as GridColumnsData["style"]["columnBorderWidth"],
      columnRadius: "bad" as GridColumnsData["style"]["columnRadius"],
      columnPadding: "42" as GridColumnsData["style"]["columnPadding"],
    },
  });

  expect(normalized.columns?.length).toBe(3);
  expect(normalized.columns?.[0]?.id).toBe("1");
  expect(normalized.columns?.[1]?.id).toBe("2");
  expect(normalized.columns?.[1]?.label).toBe("Column 2");
  expect(normalized.columns?.[1]?.desktopSpan).toBe("6");
  expect(normalized.layout?.gapX).toBe("6");
  expect(normalized.layout?.align).toBe("start");
  expect(normalized.style?.columnBorderWidth).toBe("1");
  expect(resolveGridColumnsVariant("unknown")).toBe("equal");
});

test("grid columns validator accepts expanded model", () => {
  clearWidgets();
  const widget = createGridColumnsWidget({
    wizard: StubGridColumnsEditor,
    visual: StubGridColumnsEditor,
    advanced: StubGridColumnsEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "grid-1",
      type: "grid-columns",
      variant: "masonry-lite",
      data: {
        columns: [
          {
            id: "1",
            label: "Lead",
            desktopSpan: "8",
            tabletSpan: "6",
            mobileSpan: "12",
          },
          {
            id: "2",
            label: "Side",
            desktopSpan: "4",
            tabletSpan: "6",
            mobileSpan: "12",
          },
        ],
        layout: {
          gapX: "4",
          gapY: "6",
          align: "start",
        },
        style: {
          cardizeColumns: true,
          columnBackground: "#ffffff",
          columnBorderColor: "#e2e8f0",
          columnBorderWidth: "1",
          columnRadius: "xl",
          columnPadding: "4",
        },
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("grid columns validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createGridColumnsWidget({
      wizard: StubGridColumnsEditor,
      visual: StubGridColumnsEditor,
      advanced: StubGridColumnsEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "grid-2",
      type: "grid-columns",
      variant: "invalid",
      data: gridColumnsDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("grid columns renders repeatable slot content", () => {
  clearWidgets();
  registerWidget(
    createGridColumnsWidget({
      wizard: StubGridColumnsEditor,
      visual: StubGridColumnsEditor,
      advanced: StubGridColumnsEditor,
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
        id: "grid-parent",
        type: "grid-columns",
        variant: "equal",
        data: {
          columns: [
            {
              id: "1",
              label: "Primary",
              desktopSpan: "8",
              tabletSpan: "6",
              mobileSpan: "12",
            },
            {
              id: "2",
              label: "Secondary",
              desktopSpan: "4",
              tabletSpan: "6",
              mobileSpan: "12",
            },
          ],
        },
        slots: {
          "column:1": [
            {
              id: "hero-child",
              type: "hero",
              variant: "centered",
              data: {
                ...heroDefaults,
                headline: "Nested column child",
              },
            },
          ],
          "column:2": [],
        },
      }}
    />
  );

  expect(html).toContain("Nested column child");
  expect(html).toContain('data-grid-column="column:1"');
  expect(html).toContain('data-grid-column="column:2"');
});

test("grid columns editors render expected sections", () => {
  const wizardHtml = renderToString(
    <GridColumnsWizardEditor
      value={gridColumnsDefaults}
      onChange={() => undefined}
      variant="equal"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Grid style");
  expect(wizardHtml).toContain("Column configs");

  const visualHtml = renderToString(
    <GridColumnsVisualEditor
      value={gridColumnsDefaults}
      onChange={() => undefined}
      variant="equal"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and layout structure");
  expect(visualHtml).toContain("Column sizing and labels");
  expect(visualHtml).toContain("Gap and column surface");

  const advancedHtml = renderToString(
    <GridColumnsAdvancedEditor
      value={gridColumnsDefaults}
      onChange={() => undefined}
      variant="equal"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Technical layout tokens");
  expect(advancedHtml).toContain("Raw payload snapshot");
});
