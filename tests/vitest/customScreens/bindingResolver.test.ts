import { expect, test } from "vitest";

import {
  applyBindingsToBlocks,
  applyBindingsToBlockData,
  collectBindingPropPaths,
  collectWritableBindingFields,
  getWidgetBindingTarget,
  isBindingWriteAllowed,
  isListRowFieldWritable,
  listSelectedEntryWidgetBindingTargets,
  mergeBindingValuesIntoEntryData,
  readBindingPathValue,
  resolveCustomScreenBindingContracts,
  resolveListRowFieldBinding,
  sanitizeUnsupportedWriteBindings,
  writeBindingPathValue,
} from "../../../core/services/customScreens/bindingResolver";
import type { CustomScreenBinding } from "../../../core/services/customScreens/customScreenSchemas";
import type { ScreenFieldBinding } from "../../../core/services/customScreens/customScreenContracts";

const bindings: CustomScreenBinding[] = [
  {
    id: "hero-title",
    widgetId: "hero-1",
    propPath: "heading.title",
    field: "title",
    mode: "readwrite",
  },
  {
    id: "hero-subtitle",
    widgetId: "hero-1",
    propPath: "heading.subtitle",
    field: "subtitle",
    mode: "read",
  },
  {
    id: "feature-score",
    widgetId: "feature-1",
    propPath: "items.0.score",
    field: "score",
    mode: "write",
  },
];

test("readBindingPathValue reads nested objects and arrays", () => {
  expect(
    readBindingPathValue({ heading: { title: "Catalog" }, items: [{ score: 42 }] }, "items.0.score")
  ).toBe(42);
});

test("writeBindingPathValue creates nested paths immutably", () => {
  const source = { heading: { title: "Draft" } };
  const updated = writeBindingPathValue(source, "heading.subtitle", "Published") as {
    heading: { title: string; subtitle: string };
  };

  expect(updated.heading.title).toBe("Draft");
  expect(updated.heading.subtitle).toBe("Published");
  expect(source).toEqual({ heading: { title: "Draft" } });
});

test("applyBindingsToBlockData applies read bindings and skips write-only bindings", () => {
  const result = applyBindingsToBlockData(
    { heading: { title: "Fallback", subtitle: "Fallback subtitle" } },
    "hero-1",
    bindings,
    { title: "Bound title", subtitle: "Bound subtitle", score: 11 }
  );

  expect(result).toEqual({
    heading: {
      title: "Bound title",
      subtitle: "Bound subtitle",
    },
  });
});

test("mergeBindingValuesIntoEntryData writes write and readwrite bindings back into entry data", () => {
  const fromHero = mergeBindingValuesIntoEntryData(
    { subtitle: "Existing" },
    "hero-1",
    { heading: { title: "Updated title", subtitle: "Ignored subtitle" } },
    bindings
  );
  const fromFeature = mergeBindingValuesIntoEntryData(
    fromHero,
    "feature-1",
    { items: [{ score: 87 }] },
    bindings
  );

  expect(fromFeature).toEqual({
    subtitle: "Existing",
    title: "Updated title",
    score: 87,
  });
});

test("applyBindingsToBlocks resolves nested slot blocks", () => {
  const result = applyBindingsToBlocks(
    [
      {
        id: "section-1",
        type: "section",
        data: {},
        slots: {
          default: [
            {
              id: "hero-1",
              type: "hero",
              data: { heading: { title: "Fallback", subtitle: "Fallback" } },
            },
          ],
        },
      },
    ],
    bindings,
    { title: "Catalog", subtitle: "Ready" }
  );

  expect(result[0]?.slots?.default?.[0]?.data).toEqual({
    heading: {
      title: "Catalog",
      subtitle: "Ready",
    },
  });
});

test("collectBindingPropPaths flattens nested data into dot paths", () => {
  expect(
    collectBindingPropPaths({
      heading: { title: "Hello" },
      items: [{ score: 1 }],
    })
  ).toEqual(["heading.title", "items.0.score"]);
});

test("collectWritableBindingFields returns unique write targets", () => {
  expect(collectWritableBindingFields(bindings)).toEqual(["title", "score"]);
});

test("widget-aware write helpers retire screen widget write contracts", () => {
  const screenBindings: CustomScreenBinding[] = [
    {
      id: "header-title",
      widgetId: "header-1",
      propPath: "title",
      field: "title",
      mode: "readwrite",
    },
    {
      id: "field-value",
      widgetId: "field-1",
      propPath: "value",
      field: "headline",
      mode: "readwrite",
    },
    {
      id: "legacy-hero",
      widgetId: "hero-1",
      propPath: "heading.title",
      field: "legacyTitle",
      mode: "readwrite",
    },
  ];
  const blocks = [
    { id: "header-1", type: "screen-record-header", data: {} },
    { id: "field-1", type: "screen-field-value", data: {} },
    { id: "hero-1", type: "hero", data: {} },
  ];
  const contracts = resolveCustomScreenBindingContracts(blocks);

  expect(
    isBindingWriteAllowed(screenBindings[0]!, {
      contracts,
      fallbackToModeOnly: false,
    })
  ).toBe(false);
  expect(
    isBindingWriteAllowed(screenBindings[1]!, {
      contracts,
      fallbackToModeOnly: false,
    })
  ).toBe(false);
  expect(
    isBindingWriteAllowed(screenBindings[2]!, {
      contracts,
      fallbackToModeOnly: false,
    })
  ).toBe(false);
  expect(
    collectWritableBindingFields(screenBindings, {
      contracts,
      fallbackToModeOnly: false,
    })
  ).toEqual([]);
});

test("sanitizeUnsupportedWriteBindings downgrades stale screen-widget write modes to read", () => {
  const bindingsToSanitize: CustomScreenBinding[] = [
    {
      id: "header-title",
      widgetId: "header-1",
      propPath: "title",
      field: "title",
      mode: "readwrite",
    },
    {
      id: "field-value",
      widgetId: "field-1",
      propPath: "value",
      field: "headline",
      mode: "readwrite",
    },
    {
      id: "legacy-hero",
      widgetId: "hero-1",
      propPath: "heading.title",
      field: "legacyTitle",
      mode: "readwrite",
    },
  ];

  expect(
    sanitizeUnsupportedWriteBindings(bindingsToSanitize, {
      blocks: [
        { id: "header-1", type: "screen-record-header", data: {} },
        { id: "field-1", type: "screen-field-value", data: {} },
        { id: "hero-1", type: "hero", data: {} },
      ],
    })
  ).toEqual([
    expect.objectContaining({
      id: "header-title",
      mode: "read",
    }),
    expect.objectContaining({
      id: "field-value",
      mode: "read",
    }),
    expect.objectContaining({
      id: "legacy-hero",
      mode: "readwrite",
    }),
  ]);
});

type LegacyWidgetDef = {
  surfaces: readonly string[];
  dataAccess: { source: string; modes?: Array<"read" | "write"> } | null;
  bindingTargets: readonly {
    propPath: string;
    label: string;
    description?: string;
    modes?: Array<"read" | "write">;
  }[];
};

const simpleWidget = (overrides: Partial<LegacyWidgetDef> = {}): LegacyWidgetDef => ({
  surfaces: [],
  dataAccess: { source: "selected-entry" },
  bindingTargets: [
    { propPath: "title", label: "Title" },
    {
      propPath: "summary",
      label: "Summary",
      description: "Short summary",
      modes: ["read", "write"],
    },
  ],
  ...overrides,
});

test("getWidgetBindingTarget resolves targets and falls back to read modes", () => {
  const widget = simpleWidget();

  const title = getWidgetBindingTarget(widget, "title");
  expect(title).toMatchObject({
    propPath: "title",
    label: "Title",
    modes: ["read"],
  });

  const summary = getWidgetBindingTarget(widget, "summary");
  expect(summary).toMatchObject({
    propPath: "summary",
    label: "Summary",
    description: "Short summary",
    modes: ["read", "write"],
  });

  expect(getWidgetBindingTarget(widget, "missing")).toBeNull();
  expect(getWidgetBindingTarget(widget, "")).toBeNull();
  expect(getWidgetBindingTarget(null, "title")).toBeNull();
});

test("listSelectedEntryWidgetBindingTargets lists declared and compatibility bindings", () => {
  const existingBindings: CustomScreenBinding[] = [
    {
      id: "hero-title",
      widgetId: "hero-1",
      propPath: "title",
      field: "headline",
      mode: "read",
    },
    {
      id: "hero-custom",
      widgetId: "hero-1",
      propPath: "legacy.custom",
      field: "legacyField",
      mode: "read",
    },
  ];

  const result = listSelectedEntryWidgetBindingTargets({
    widget: simpleWidget(),
    existingBindings,
  });

  expect(result).toEqual([
    expect.objectContaining({ propPath: "title", kind: "declared" }),
    expect.objectContaining({ propPath: "summary", kind: "declared", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "legacy.custom", kind: "compatibility", modes: ["read"] }),
  ]);
});

test("listSelectedEntryWidgetBindingTargets returns an empty list for non-entry widgets", () => {
  expect(
    listSelectedEntryWidgetBindingTargets({
      widget: simpleWidget({ dataAccess: { source: "screen" } }),
      existingBindings: [],
    })
  ).toEqual([]);
});

test("isBindingWriteAllowed falls back to mode-only when the widget contract is missing", () => {
  const contracts = resolveCustomScreenBindingContracts([{ id: "hero-1", type: "hero", data: {} }]);

  expect(
    isBindingWriteAllowed(
      {
        widgetId: "missing-1",
        propPath: "title",
        field: "headline",
        mode: "readwrite",
      },
      { contracts, fallbackToModeOnly: false }
    )
  ).toBe(false);
  expect(
    isBindingWriteAllowed(
      {
        widgetId: "missing-1",
        propPath: "title",
        field: "headline",
        mode: "readwrite",
      },
      { contracts }
    )
  ).toBe(true);
});

test("applyBindingsToBlocks recurses into nested children", () => {
  const result = applyBindingsToBlocks(
    [
      {
        id: "root-1",
        type: "hero",
        data: {},
        children: [
          {
            id: "hero-1",
            type: "hero",
            data: { heading: { title: "Fallback" } },
          },
        ],
      },
    ],
    bindings,
    { title: "Catalog", subtitle: "Ready" }
  );

  expect(result[0]?.children?.[0]?.data).toEqual({
    heading: { title: "Catalog", subtitle: "Ready" },
  });
});

test("resolveCustomScreenBindingContracts visits nested children and slot blocks", () => {
  const contracts = resolveCustomScreenBindingContracts([
    {
      id: "root-1",
      type: "hero",
      data: {},
      children: [{ id: "child-1", type: "text", data: {} }],
      slots: {
        aside: [{ id: "slot-1", type: "text", data: {} }],
        empty: [],
      },
    },
  ]);

  expect(contracts.get("child-1")).toBeDefined();
  expect(contracts.get("slot-1")).toBeDefined();
});

test("resolveListRowFieldBinding finds the entry value binding for a column", () => {
  const column = {
    id: "field-title",
    source: "field" as const,
    field: "headline",
    label: "Headline",
    formatter: "text" as const,
    visible: true,
  };

  expect(
    resolveListRowFieldBinding({
      column,
      rowTemplate: {
        document: { schemaVersion: 1, sections: [] },
        bindings: [
          {
            id: "b1",
            blockId: "field-1",
            propPath: "value",
            source: "entry" as const,
            field: "headline",
            mode: "readwrite" as const,
          },
          {
            id: "b2",
            blockId: "field-2",
            propPath: "value",
            source: "entry" as const,
            field: "other",
            mode: "read" as const,
          },
        ],
      },
    })
  ).toMatchObject({ id: "b1" });

  expect(resolveListRowFieldBinding({ column })).toBeNull();
});

test("isListRowFieldWritable classifies write modes", () => {
  const binding = (mode: "read" | "write" | "readwrite"): ScreenFieldBinding => ({
    id: "b1",
    blockId: "field-1",
    propPath: "value",
    source: "entry",
    field: "headline",
    mode,
  });

  expect(isListRowFieldWritable(binding("write"))).toBe(true);
  expect(isListRowFieldWritable(binding("readwrite"))).toBe(true);
  expect(isListRowFieldWritable(binding("read"))).toBe(false);
  expect(isListRowFieldWritable(null)).toBe(false);
  expect(isListRowFieldWritable(undefined)).toBe(false);
});
