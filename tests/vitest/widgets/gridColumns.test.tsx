import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  GridColumnsAdvancedEditor,
  GridColumnsVisualEditor,
  GridColumnsWizardEditor,
} from "../../../core/admin/ui/widgets/editors/GridColumnsEditors";
import { createHeroWidget, heroDefaults, type HeroData } from "../../../core/widgets/core/hero";
import {
  applyGridColumnsAsymmetricPreset,
  buildAsymmetricGridColumnsDesktopSpans,
  calculateGridColumnsSpanTotals,
  createGridColumnsWidget,
  resolveGridColumnsEffectiveColumns,
  gridColumnsDefaults,
  gridColumnsOverflowDecision,
  GridColumnsBlock,
  normalizeGridColumnsData,
  reorderGridColumnsColumnsAndSlots,
  resolveGridColumnsAsymmetricVariantState,
  resolveGridColumnsVariant,
  type GridColumnsData,
} from "../../../core/widgets/core/gridColumns";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubGridColumnsEditor: ComponentType<WidgetEditorProps<GridColumnsData>> = () => null;
const StubHeroEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;
type GridColumnsColumn = NonNullable<GridColumnsData["columns"]>[number];
type GridColumnsLayout = NonNullable<GridColumnsData["layout"]>;
type GridColumnsStyle = NonNullable<GridColumnsData["style"]>;

test("grid columns renders defaults", () => {
  const html = renderToString(<GridColumnsBlock data={gridColumnsDefaults} variant="equal" />);

  expect(html).toContain('data-grid-columns-variant="equal"');
  expect(html).toContain('data-grid-columns-count="2"');
  expect(html).toContain('data-grid-column="column:1"');
  expect(html).not.toContain("Empty column.");
});

test("grid columns render empty-column placeholders only in editor preview", () => {
  const publicHtml = renderToString(
    <GridColumnsBlock data={gridColumnsDefaults} variant="equal" />
  );
  const previewHtml = renderToString(
    <GridColumnsBlock
      data={gridColumnsDefaults}
      variant="equal"
      renderContext={{ mode: "editor-preview" }}
    />
  );

  expect(publicHtml).not.toContain("Empty column.");
  expect(previewHtml).toContain("Empty column.");
});

test("grid columns render every configured column when no live repeatable slots exist", () => {
  const html = renderToString(
    <GridColumnsBlock
      data={{
        columns: [
          { id: "1", label: "One", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
          { id: "2", label: "Two", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
          { id: "3", label: "Three", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
        ],
      }}
      variant="equal"
    />
  );

  expect(html).toContain('data-grid-columns-count="3"');
  expect(html).toContain('data-grid-column="column:1"');
  expect(html).toContain('data-grid-column="column:2"');
  expect(html).toContain('data-grid-column="column:3"');
});

test("grid columns keep following live slot structure when repeatable slot ids already exist", () => {
  const html = renderToString(
    <GridColumnsBlock
      data={{
        columns: [
          { id: "1", label: "One", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
          { id: "2", label: "Two", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
          { id: "3", label: "Three", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
        ],
      }}
      slots={{
        "column:1": [],
        "column:2": [],
      }}
      variant="equal"
    />
  );

  expect(html).toContain('data-grid-columns-count="2"');
  expect(html).toContain('data-grid-column="column:1"');
  expect(html).toContain('data-grid-column="column:2"');
  expect(html).not.toContain('data-grid-column="column:3"');
});

test("grid columns keep technical labels out of public runtime", () => {
  const publicHtml = renderToString(
    <GridColumnsBlock data={gridColumnsDefaults} variant="equal" />
  );
  const previewHtml = renderToString(
    <GridColumnsBlock
      data={gridColumnsDefaults}
      variant="equal"
      renderContext={{ mode: "editor-preview" }}
    />
  );

  expect(publicHtml).not.toContain("Column 1");
  expect(previewHtml).toContain("Column 1");
});

test("grid columns normalization keeps deterministic ids and bounds", () => {
  const normalized = normalizeGridColumnsData({
    columns: [
      {
        id: "1",
        label: "Lead",
        desktopSpan: "8",
        tabletSpan: "6",
        mobileSpan: "12",
        xlSpan: "9",
        minHeight: "lg",
        mobileMinHeight: "sm",
        alignSelf: "center",
        style: {
          surface: "on",
          background: "#112233",
          borderColor: "var(--color-border)",
          overflow: "hidden",
        },
      },
      {
        id: "1",
        label: "",
        desktopSpan: "13" as GridColumnsColumn["desktopSpan"],
        twoXlSpan: "13" as GridColumnsColumn["twoXlSpan"],
        hideOnMobile: true,
        hideOnTablet: true,
        hideOnDesktop: true,
        minHeight: "mega" as GridColumnsColumn["minHeight"],
        style: {
          surface: "off" as never,
          background: "url(https://evil.test)" as never,
          borderWidth: "9" as never,
          overflow: "clip" as never,
        },
      },
      { id: "3", label: "Support", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
    ],
    layout: {
      gapX: "11" as GridColumnsLayout["gapX"],
      gapY: "7" as GridColumnsLayout["gapY"],
      align: "unsupported" as GridColumnsLayout["align"],
      reverseOnMobile: true,
    },
    style: {
      columnBackground: "token-surface" as GridColumnsStyle["columnBackground"],
      columnBorderColor: "rgb(0 0 0)" as GridColumnsStyle["columnBorderColor"],
      columnBorderWidth: "9" as GridColumnsStyle["columnBorderWidth"],
      columnRadius: "bad" as GridColumnsStyle["columnRadius"],
      columnPadding: "42" as GridColumnsStyle["columnPadding"],
    },
  });

  expect(normalized.columns?.length).toBe(3);
  expect(normalized.columns?.[0]?.id).toBe("1");
  expect(normalized.columns?.[1]?.id).toBe("2");
  expect(normalized.columns?.[1]?.label).toBe("Column 2");
  expect(normalized.columns?.[1]?.desktopSpan).toBe("6");
  expect(normalized.columns?.[0]?.xlSpan).toBe("9");
  expect(normalized.columns?.[0]?.minHeight).toBe("lg");
  expect(normalized.columns?.[0]?.mobileMinHeight).toBe("sm");
  expect(normalized.columns?.[0]?.alignSelf).toBe("center");
  expect(normalized.columns?.[0]?.style).toEqual(
    expect.objectContaining({
      surface: "on",
      background: "#112233",
      borderColor: "var(--color-border)",
      overflow: "hidden",
    })
  );
  expect(normalized.columns?.[1]?.twoXlSpan).toBeUndefined();
  expect(normalized.columns?.[1]?.hideOnMobile).toBe(false);
  expect(normalized.columns?.[1]?.hideOnTablet).toBe(false);
  expect(normalized.columns?.[1]?.hideOnDesktop).toBe(false);
  expect(normalized.columns?.[1]?.minHeight).toBeUndefined();
  expect(normalized.columns?.[1]?.style).toBeUndefined();
  expect(normalized.layout?.gapX).toBe("6");
  expect(normalized.layout?.gapY).toBe("7");
  expect(normalized.layout?.align).toBe("start");
  expect(normalized.layout?.reverseOnMobile).toBe(true);
  expect(normalized.style?.columnBackground).toBeUndefined();
  expect(normalized.style?.columnBorderColor).toBeUndefined();
  expect(normalized.style?.columnBorderWidth).toBe("1");
  expect(resolveGridColumnsVariant("unknown")).toBe("equal");
});

test("grid columns asymmetric helper reapplies desktop preset without rewriting tablet or mobile spans", () => {
  const next = applyGridColumnsAsymmetricPreset({
    columns: [
      { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "5", mobileSpan: "11" },
      { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "7", mobileSpan: "9" },
      { id: "3", label: "Meta", desktopSpan: "6", tabletSpan: "4", mobileSpan: "8" },
    ],
  });

  expect(next.columns?.map((column) => column.desktopSpan)).toEqual(["6", "3", "3"]);
  expect(next.columns?.map((column) => column.tabletSpan)).toEqual(["5", "7", "4"]);
  expect(next.columns?.map((column) => column.mobileSpan)).toEqual(["11", "9", "8"]);
});


test("grid columns asymmetric helper materializes the current live slot order when reapplying", () => {
  const next = applyGridColumnsAsymmetricPreset(
    {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "5", mobileSpan: "11" },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "7", mobileSpan: "9" },
        { id: "4", label: "Phantom", desktopSpan: "2", tabletSpan: "4", mobileSpan: "8" },
      ],
    },
    ["1", "2", "3"]
  );

  expect(
    next.columns?.map((column) => ({
      id: column.id,
      desktopSpan: column.desktopSpan,
      tabletSpan: column.tabletSpan,
      mobileSpan: column.mobileSpan,
    }))
  ).toEqual([
    { id: "1", desktopSpan: "6", tabletSpan: "5", mobileSpan: "11" },
    { id: "2", desktopSpan: "3", tabletSpan: "7", mobileSpan: "9" },
    { id: "3", desktopSpan: "3", tabletSpan: "6", mobileSpan: "12" },
  ]);
});

test("grid columns asymmetric desktop presets stay within 12 columns for larger counts", () => {
  expect(buildAsymmetricGridColumnsDesktopSpans(4)).toEqual(["4", "3", "3", "2"]);
  expect(buildAsymmetricGridColumnsDesktopSpans(5)).toEqual(["4", "2", "2", "2", "2"]);
  expect(buildAsymmetricGridColumnsDesktopSpans(6)).toEqual(["3", "2", "2", "2", "2", "1"]);

  expect(
    [4, 5, 6].map((count) =>
      buildAsymmetricGridColumnsDesktopSpans(count).reduce(
        (total, span) => total + Number.parseInt(span, 10),
        0
      )
    )
  ).toEqual([12, 12, 12]);
});

test("grid columns asymmetric state distinguishes preset, equal, and custom desktop spans", () => {
  expect(
    resolveGridColumnsAsymmetricVariantState([
      { id: "1", desktopSpan: "8" },
      { id: "2", desktopSpan: "4" },
    ])
  ).toEqual({ mode: "preset" });

  expect(
    resolveGridColumnsAsymmetricVariantState([
      { id: "1", desktopSpan: "6" },
      { id: "2", desktopSpan: "6" },
    ])
  ).toMatchObject({
    mode: "equal",
    message: expect.stringContaining("matching desktop spans"),
  });

  expect(
    resolveGridColumnsAsymmetricVariantState([
      { id: "1", desktopSpan: "7" },
      { id: "2", desktopSpan: "5" },
    ])
  ).toMatchObject({
    mode: "custom",
    message: expect.stringContaining("Custom desktop spans"),
  });
});

test("grid columns span totals helper reports current desktop, tablet, and mobile sums", () => {
  expect(
    calculateGridColumnsSpanTotals([
      { id: "1", desktopSpan: "7", tabletSpan: "6", mobileSpan: "12" },
      { id: "2", desktopSpan: "5", tabletSpan: "6", mobileSpan: "12" },
      { id: "3", desktopSpan: "2", tabletSpan: "4", mobileSpan: "6" },
    ])
  ).toEqual({
    desktop: 14,
    tablet: 16,
    mobile: 30,
  });
});

test("grid columns span totals helper excludes columns hidden at each breakpoint", () => {
  expect(
    calculateGridColumnsSpanTotals([
      { id: "1", desktopSpan: "7", tabletSpan: "6", mobileSpan: "12" },
      { id: "2", desktopSpan: "5", tabletSpan: "6", mobileSpan: "12", hideOnMobile: true },
      { id: "3", desktopSpan: "2", tabletSpan: "4", mobileSpan: "6", hideOnDesktop: true },
      { id: "4", desktopSpan: "1", tabletSpan: "2", mobileSpan: "3", hideOnTablet: true },
    ])
  ).toEqual({
    desktop: 13,
    tablet: 16,
    mobile: 21,
  });
});


test("grid columns span totals helper normalizes conflicting all-hidden visibility back to visible", () => {
  expect(
    calculateGridColumnsSpanTotals([
      {
        id: "1",
        desktopSpan: "6",
        tabletSpan: "4",
        mobileSpan: "3",
        hideOnMobile: true,
        hideOnTablet: true,
        hideOnDesktop: true,
      },
      { id: "2", desktopSpan: "6", tabletSpan: "8", mobileSpan: "9" },
    ])
  ).toEqual({
    desktop: 12,
    tablet: 12,
    mobile: 12,
  });
});

test("grid columns effective columns follow live slot count and variant fallbacks", () => {
  expect(
    resolveGridColumnsEffectiveColumns({
      data: {
        columns: [
          { id: "1", label: "Lead", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
          { id: "2", label: "Side", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
        ],
      },
      variant: "asymmetric",
      orderedInstanceIds: ["1", "2", "3"],
    }).map((column) => ({
      id: column.id,
      desktopSpan: column.desktopSpan,
      tabletSpan: column.tabletSpan,
      mobileSpan: column.mobileSpan,
    }))
  ).toEqual([
    { id: "1", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
    { id: "2", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
    { id: "3", desktopSpan: "3", tabletSpan: "6", mobileSpan: "12" },
  ]);
});

test("grid columns effective columns do not borrow another saved column for unmatched live ids", () => {
  expect(
    resolveGridColumnsEffectiveColumns({
      data: {
        columns: [
          { id: "1", label: "Lead", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
          { id: "2", label: "Borrow me", desktopSpan: "4", tabletSpan: "5", mobileSpan: "7" },
          { id: "3", label: "Side", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
        ],
      },
      variant: "equal",
      orderedInstanceIds: ["1", "4", "3"],
    })[1]
  ).toEqual(
    expect.objectContaining({
      id: "4",
      label: "Column 2",
      desktopSpan: "4",
      tabletSpan: "6",
      mobileSpan: "12",
    })
  );
});

test("grid columns records the explicit no-runtime-guard overflow decision", () => {
  expect(gridColumnsOverflowDecision).toBe("no-runtime-guard");
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
            xlSpan: "3",
            twoXlSpan: "2",
            hideOnMobile: true,
            minHeight: "lg",
            mobileMinHeight: "sm",
            alignSelf: "end",
            style: {
              surface: "on",
              background: "#ffffff",
              borderColor: "var(--color-border)",
              borderWidth: "2",
              radius: "2xl",
              padding: "6",
              overflow: "hidden",
            },
          },
        ],
        layout: {
          gapX: "4",
          gapY: "6",
          align: "start",
          reverseOnMobile: true,
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

test("grid columns validator rejects unsafe global column surface colors", () => {
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
      id: "grid-unsafe-global-style",
      type: "grid-columns",
      variant: "equal",
      data: {
        columns: [
          { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
          { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        ],
        style: {
          columnBackground: "url(https://evil.test)",
        },
      },
    } as never)
  ).toThrow("widget_schema_invalid");
});

test("grid columns validator rejects unsafe per-column override payloads", () => {
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
      id: "grid-unsafe-style",
      type: "grid-columns",
      variant: "equal",
      data: {
        columns: [
          {
            id: "1",
            label: "Lead",
            desktopSpan: "6",
            tabletSpan: "6",
            mobileSpan: "12",
            style: {
              background: "url(https://evil.test)",
            },
          },
          {
            id: "2",
            label: "Side",
            desktopSpan: "6",
            tabletSpan: "6",
            mobileSpan: "12",
          },
        ],
      },
    } as never)
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "grid-extra-style-key",
      type: "grid-columns",
      variant: "equal",
      data: {
        columns: [
          {
            id: "1",
            label: "Lead",
            desktopSpan: "6",
            tabletSpan: "6",
            mobileSpan: "12",
            style: {
              surface: "on",
              extra: "nope",
            },
          },
          {
            id: "2",
            label: "Side",
            desktopSpan: "6",
            tabletSpan: "6",
            mobileSpan: "12",
          },
        ],
      },
    } as never)
  ).toThrow("widget_schema_invalid");
});

test("grid columns render responsive reverse, visibility, and wide-breakpoint classes", () => {
  const html = renderToString(
    <GridColumnsBlock
      variant="equal"
      data={{
        columns: [
          {
            id: "1",
            label: "Lead",
            desktopSpan: "8",
            tabletSpan: "6",
            mobileSpan: "12",
            xlSpan: "9",
            twoXlSpan: "8",
            hideOnMobile: true,
          },
          {
            id: "2",
            label: "Side",
            desktopSpan: "4",
            tabletSpan: "6",
            mobileSpan: "12",
            hideOnTablet: true,
            hideOnDesktop: true,
          },
        ],
        layout: {
          reverseOnMobile: true,
        },
      }}
    />
  );

  expect(html).toContain('data-grid-columns-reverse-mobile="true"');
  expect(html).toContain("order-2 md:order-none");
  expect(html).toContain("order-1 md:order-none");
  expect(html).toContain("hidden md:block");
  expect(html).toContain("md:hidden");
  expect(html).toContain("xl:col-span-9");
  expect(html).toContain("2xl:col-span-8");
});

test("grid columns render per-column surface, overflow, height, and alignment overrides", () => {
  const html = renderToString(
    <GridColumnsBlock
      variant="equal"
      data={{
        columns: [
          {
            id: "1",
            label: "Lead",
            desktopSpan: "8",
            tabletSpan: "6",
            mobileSpan: "12",
            minHeight: "lg",
            mobileMinHeight: "none",
            alignSelf: "end",
            style: {
              surface: "on",
              background: "#112233",
              borderColor: "#445566",
              borderWidth: "2",
              radius: "2xl",
              padding: "6",
              overflow: "hidden",
            },
          },
          {
            id: "2",
            label: "Side",
            desktopSpan: "4",
            tabletSpan: "6",
            mobileSpan: "12",
          },
        ],
      }}
    />
  );

  expect(html).toContain("self-end");
  expect(html).toContain("min-h-0 md:min-h-[8rem]");
  expect(html).toContain("overflow-hidden");
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("p-6");
  expect(html).toContain("background-color:#112233");
  expect(html).toContain("border-color:#445566");
  expect(html).toContain("border-width:2px");
});

test("grid columns allow overflow clipping without forcing a local card shell", () => {
  const html = renderToString(
    <GridColumnsBlock
      variant="equal"
      data={{
        columns: [
          {
            id: "1",
            label: "Lead",
            desktopSpan: "8",
            tabletSpan: "6",
            mobileSpan: "12",
            style: {
              overflow: "hidden",
            },
          },
          {
            id: "2",
            label: "Side",
            desktopSpan: "4",
            tabletSpan: "6",
            mobileSpan: "12",
          },
        ],
      }}
    />
  );

  expect(html).toContain("overflow-hidden");
  expect(html).not.toContain("background-color:");
  expect(html).not.toContain("border-color:");
  expect(html).not.toContain("border-width:");
  expect(html).not.toContain("rounded-xl");
});

test("grid columns cleared column surface omits background output", () => {
  const normalized = normalizeGridColumnsData({
    ...gridColumnsDefaults,
    style: {},
  });
  const html = renderToString(<GridColumnsBlock data={normalized} variant="equal" />);

  expect(normalized.style?.columnBackground).toBeUndefined();
  expect(normalized.style?.columnBorderColor).toBeUndefined();
  expect(html).not.toContain("background-color:");
  expect(html).not.toContain("border-color:");
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

test("grid columns reorder helper keeps column data and slots aligned", () => {
  const firstChildren = [{ id: "child-1", type: "hero", data: { headline: "One" } }];
  const secondChildren = [{ id: "child-2", type: "hero", data: { headline: "Two" } }];
  const legacyChildren = [{ id: "child-legacy", type: "hero", data: { headline: "Legacy" } }];
  const result = reorderGridColumnsColumnsAndSlots({
    data: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    slots: {
      "column:1": firstChildren,
      "column:2": secondChildren,
      "column:legacy": legacyChildren,
      default: [],
    },
    orderedInstanceIds: ["2", "1"],
  });

  expect(result.data.columns?.map((column) => column.id)).toEqual(["2", "1"]);
  expect(Object.keys(result.slots ?? {})).toEqual([
    "column:2",
    "column:1",
    "column:legacy",
    "default",
  ]);
  expect(result.slots?.["column:2"]).toBe(secondChildren);
  expect(result.slots?.["column:1"]).toBe(firstChildren);
  expect(result.slots?.["column:legacy"]).toBe(legacyChildren);
});

test("grid columns widget exposes repeatable slot sync hooks", () => {
  clearWidgets();
  const widget = createGridColumnsWidget({
    wizard: StubGridColumnsEditor,
    visual: StubGridColumnsEditor,
    advanced: StubGridColumnsEditor,
  });
  const adapter = widget.repeatableSlotSync?.find((entry) => entry.definitionId === "column");

  expect(adapter).toBeDefined();
  const appended = adapter?.appendItem?.(
    {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    { id: "3", label: "Extra", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" }
  ) as GridColumnsData;
  const reordered = adapter?.reorderItemsByInstanceIds?.(appended, [
    "3",
    "1",
    "2",
  ]) as GridColumnsData;

  expect(appended.columns?.map((column) => column.id)).toEqual(["1", "2", "3"]);
  expect(reordered.columns?.map((column) => column.id)).toEqual(["3", "1", "2"]);
  expect(reordered.columns?.[0]).toEqual(
    expect.objectContaining({
      id: "3",
      label: "Extra",
    })
  );
});

test("grid columns append adapter keeps later live metadata when a holey instance id is re-added", () => {
  clearWidgets();
  const widget = createGridColumnsWidget({
    wizard: StubGridColumnsEditor,
    visual: StubGridColumnsEditor,
    advanced: StubGridColumnsEditor,
  });
  const adapter = widget.repeatableSlotSync?.find((entry) => entry.definitionId === "column");

  const appended = adapter?.appendItem?.(
    {
      columns: [
        { id: "1", label: "One", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Two", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "3", label: "Three", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    { id: "2", label: "Two", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" }
  ) as GridColumnsData;

  expect(appended.columns?.map((column) => column.id)).toEqual(["1", "2", "3"]);
  expect(appended.columns?.[2]).toEqual(
    expect.objectContaining({
      id: "3",
      label: "Three",
      desktopSpan: "4",
    })
  );
});

test("grid columns append adapter reuses known instance ids without duplicating or truncating later metadata", () => {
  clearWidgets();
  const widget = createGridColumnsWidget({
    wizard: StubGridColumnsEditor,
    visual: StubGridColumnsEditor,
    advanced: StubGridColumnsEditor,
  });
  const adapter = widget.repeatableSlotSync?.find((entry) => entry.definitionId === "column");

  const appended = adapter?.appendItem?.(
    {
      columns: [
        { id: "1", label: "One", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Two", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "3", label: "Three", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
        { id: "4", label: "Phantom", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    { id: "3", label: "Three", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" }
  ) as GridColumnsData;

  expect(appended.columns?.map((column) => column.id)).toEqual(["1", "2", "3", "4"]);
  expect(appended.columns?.filter((column) => column.id === "3")).toHaveLength(1);
  expect(appended.columns?.[2]).toEqual(
    expect.objectContaining({
      id: "3",
      label: "Three",
    })
  );
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
  expect(wizardHtml).toContain("Column count");
  expect(wizardHtml).toContain('data-grid-columns-preset="two-equal"');

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
  expect(visualHtml).toContain("Per-column surfaces and behavior");
  expect(visualHtml).toContain('data-grid-columns-variant-preview="equal"');

  const advancedHtml = renderToString(
    <GridColumnsAdvancedEditor
      value={gridColumnsDefaults}
      onChange={() => undefined}
      variant="equal"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Technical layout tokens");
  expect(advancedHtml).toContain("Per-column override tokens");
  expect(advancedHtml).toContain("Raw payload snapshot");
});
