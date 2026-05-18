import { afterEach, beforeEach, expect, test } from "bun:test";

import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { clearWidgetValidators, normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetDefinition, WidgetBlock } from "../../../core/widgets/types";
import {
  createGalleryMosaicWidget,
  galleryMosaicDefaults,
  type GalleryMosaicData,
} from "../../../core/widgets/core/galleryMosaic";

const Dummy = () => null;

const definition: WidgetDefinition<{ headline: string; tone?: string }> = {
  type: "hero",
  title: "Hero",
  description: "Hero",
  category: "layout",
  complexity: "composite",
  audience: "beginner",
  module: "content",
  variants: [{ id: "centered", label: "Centered" }],
  schema: {
    type: "object",
    required: ["headline"],
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      tone: { type: "string" },
    },
  },
  defaults: { headline: "Hello", tone: "friendly" },
  editor: { wizard: Dummy, visual: Dummy, advanced: Dummy },
  render: Dummy,
};

const repeatableDefinition: WidgetDefinition<{ headline: string }> = {
  type: "layout-columns",
  title: "Layout Columns",
  description: "Layout",
  category: "layout",
  complexity: "atomic",
  audience: "advanced",
  module: "layout",
  variants: [{ id: "equal", label: "Equal" }],
  slots: [{ id: "column", label: "Column", kind: "repeatable", minItems: 2, maxItems: 3 }],
  schema: {
    type: "object",
    required: ["headline"],
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
    },
  },
  defaults: { headline: "Columns" },
  editor: { wizard: Dummy, visual: Dummy, advanced: Dummy },
  render: Dummy,
};

afterEach(() => {
  clearWidgets();
  clearWidgetValidators();
});

beforeEach(() => {
  clearWidgets();
  clearWidgetValidators();
});

test("normalizeWidgetBlock merges defaults", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    data: {},
  };
  const normalized = normalizeWidgetBlock(block);
  expect(normalized.data.headline).toBe("Hello");
  expect(normalized.data.tone).toBe("friendly");
  expect(normalized.variant).toBe("centered");
});

test("normalizeWidgetBlock rejects invalid variant", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    variant: "bad",
    data: {},
  };
  expect(() => normalizeWidgetBlock(block)).toThrow("widget_invalid_variant");
});

test("normalizeWidgetBlock rejects schema mismatch", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    data: { headline: 42 },
  };
  expect(() => normalizeWidgetBlock(block)).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock maps legacy children into default slot", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    data: { headline: "Parent" },
    children: [
      {
        id: "child-1",
        type: "hero",
        data: { headline: "Child" },
      },
    ],
  };

  const normalized = normalizeWidgetBlock(block);
  expect(normalized.slots?.default).toHaveLength(1);
  expect(normalized.children).toBeUndefined();
});

test("normalizeWidgetBlock enforces repeatable minimum slots", () => {
  registerWidget(repeatableDefinition);
  const block: WidgetBlock = {
    id: "1",
    type: "layout-columns",
    data: {},
  };

  const normalized = normalizeWidgetBlock(block);
  expect(normalized.slots?.["column:1"]).toEqual([]);
  expect(normalized.slots?.["column:2"]).toEqual([]);
});

test("normalizeWidgetBlock migrates legacy repeatable key and enforces max slots", () => {
  registerWidget(repeatableDefinition);
  const block: WidgetBlock = {
    id: "1",
    type: "layout-columns",
    data: {},
    slots: {
      column: [{ id: "legacy", type: "hero", data: { headline: "Legacy" } }],
      "column:2": [{ id: "child-2", type: "hero", data: { headline: "Child 2" } }],
      "column:3": [],
      "column:4": [],
      "column:5": [],
    },
  };

  const normalized = normalizeWidgetBlock(block);
  expect(normalized.slots?.column).toBeUndefined();
  expect(normalized.slots?.["column:2"]).toHaveLength(2);
  expect(normalized.slots?.["column:5"]).toBeUndefined();
  expect(
    Object.keys(normalized.slots ?? {}).filter((key) => key.startsWith("column:"))
  ).toHaveLength(3);
});

test("normalizeWidgetBlock accepts gallery mosaic per-item media presentation fields", () => {
  registerWidget(
    createGalleryMosaicWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  const block: WidgetBlock = {
    id: "gallery-1",
    type: "gallery-mosaic",
    variant: "mosaic",
    data: {
      ...galleryMosaicDefaults,
      items: [
        {
          id: "gallery-a",
          image: "https://cdn.example.com/one.jpg",
          alt: "Accessible alt",
          poster: "https://cdn.example.com/poster.jpg",
          objectPosition: "right",
          ratio: "1:1",
        },
      ],
    } satisfies GalleryMosaicData,
  };

  const normalized = normalizeWidgetBlock(block);
  expect(normalized.data).toEqual(
    expect.objectContaining({
      items: [
        expect.objectContaining({
          alt: "Accessible alt",
          poster: "https://cdn.example.com/poster.jpg",
          objectPosition: "right",
          ratio: "1:1",
        }),
      ],
    })
  );
});

test("normalizeWidgetBlock rejects invalid gallery mosaic media presentation enums", () => {
  registerWidget(
    createGalleryMosaicWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "gallery-2",
      type: "gallery-mosaic",
      variant: "mosaic",
      data: {
        ...galleryMosaicDefaults,
        items: [
          {
            id: "gallery-a",
            image: "https://cdn.example.com/one.jpg",
            objectPosition: "diagonal",
          },
        ],
      },
    })
  ).toThrow("widget_schema_invalid");
});
