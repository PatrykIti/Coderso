import { expect, test } from "vitest";

import {
  applyBindingsToBlocks,
  applyBindingsToBlockData,
  collectBindingPropPaths,
  collectWritableBindingFields,
  isBindingWriteAllowed,
  mergeBindingValuesIntoEntryData,
  readBindingPathValue,
  resolveCustomScreenBindingContracts,
  sanitizeUnsupportedWriteBindings,
  writeBindingPathValue,
} from "../../../core/services/customScreens/bindingResolver";
import type { CustomScreenBinding } from "../../../core/services/customScreens/customScreenSchemas";

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

test("widget-aware write helpers only expose screen-field-value.value as writable", () => {
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
  ).toBe(true);
  expect(
    isBindingWriteAllowed(screenBindings[1]!, {
      contracts,
      fallbackToModeOnly: false,
    })
  ).toBe(true);
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
  ).toEqual(["title", "headline"]);
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
      mode: "readwrite",
    }),
    expect.objectContaining({
      id: "field-value",
      mode: "readwrite",
    }),
    expect.objectContaining({
      id: "legacy-hero",
      mode: "readwrite",
    }),
  ]);
});
