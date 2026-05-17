import { afterEach, beforeEach, expect, test } from "bun:test";

import { contactDefaults, createContactWidget } from "../../../core/widgets/core/contact";
import { createFooterWidget } from "../../../core/widgets/core/footer";
import {
  createFeatureGridWidget,
  featureGridDefaults,
  type FeatureGridData,
} from "../../../core/widgets/core/featureGrid";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { clearWidgetValidators, normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetDefinition, WidgetBlock } from "../../../core/widgets/types";

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

test("normalizeWidgetBlock accepts Contact runtime hydration data but rejects unknown resolved keys", () => {
  registerWidget(
    createContactWidget({
      wizard: Dummy,
      visual: Dummy,
      advanced: Dummy,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "contact-runtime",
      type: "contact",
      variant: "form-left",
      data: {
        ...contactDefaults,
        resolved: {
          formId: "form-public",
          formName: "Support",
          status: "published",
          submissionAccess: "public",
          submissionNonce: "signed-nonce",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Full name",
              name: "full_name",
              required: true,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      },
    })
  ).not.toThrow();

  expect(() =>
    normalizeWidgetBlock({
      id: "contact-runtime-bad",
      type: "contact",
      variant: "form-left",
      data: {
        ...contactDefaults,
        resolved: {
          formId: "form-public",
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "contact-runtime-field-bad",
      type: "contact",
      variant: "form-left",
      data: {
        ...contactDefaults,
        resolved: {
          formId: "form-public",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Full name",
              name: "full_name",
              required: true,
              orderIndex: 0,
              settings: {},
              extra: "nope",
            },
          ],
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");
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

test("normalizeWidgetBlock accepts feature grid imageAlt authoring", () => {
  registerWidget(
    createFeatureGridWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  const block: WidgetBlock = {
    id: "feature-grid-1",
    type: "feature-grid",
    variant: "cards-3",
    data: {
      ...featureGridDefaults,
      items: [
        {
          id: "feature-1",
          title: "Media ready",
          image: "/media/feature.jpg",
          imageAlt: "Readable feature screenshot",
          description: "<p><strong>Rich</strong> copy</p>",
          descriptionMode: "rich",
          ctaEnabled: true,
          ctaLabel: "Open",
          ctaHref: "https://example.com",
          ctaTarget: "new-tab",
        },
      ],
      style: {
        textAlign: "center",
        cardPadding: "spacious",
        mediaSize: "lg",
        cardLayout: "horizontal",
        maxWidth: "7xl",
        headerSize: "lg",
        cardTitleSize: "lg",
        hoverEffect: "lift",
      },
    } satisfies FeatureGridData,
  };

  const normalized = normalizeWidgetBlock(block);
  expect((normalized.data as FeatureGridData).items[0]?.imageAlt).toBe(
    "Readable feature screenshot"
  );
  expect((normalized.data as FeatureGridData).style?.cardLayout).toBe("horizontal");
  expect((normalized.data as FeatureGridData).style?.hoverEffect).toBe("lift");
  expect((normalized.data as FeatureGridData).items[0]?.descriptionMode).toBe("rich");
  expect((normalized.data as FeatureGridData).items[0]?.ctaTarget).toBe("new-tab");
});

test("normalizeWidgetBlock accepts footer brand, visibility, and target extensions", () => {
  registerWidget(
    createFooterWidget({
      wizard: Dummy,
      visual: Dummy,
      advanced: Dummy,
    })
  );

  const normalized = normalizeWidgetBlock({
    id: "footer-1",
    type: "footer",
    variant: "columns-2",
    data: {
      columns: [{ title: "Company", links: [{ label: "Docs", href: "/docs", target: "_blank" }] }],
      brand: {
        logoText: "Coderso",
        tagline: "Build confidently",
      },
      legal: {
        enabled: false,
        privacy: "/privacy",
        privacyLabel: "Privacy policy",
        privacyTarget: "_blank",
      },
      socialEnabled: true,
      social: [{ type: "custom", href: "https://community.example", label: "Community" }],
      layout: {
        paddingX: "8",
        columnBreakpoint: "lg",
      },
      style: {
        linkUnderline: "always",
        linkFontWeight: "semibold",
        linkLetterSpacing: "wide",
      },
    },
  });

  expect(normalized.data.brand).toBeDefined();
  expect(normalized.data.layout).toMatchObject({
    paddingX: "8",
    columnBreakpoint: "lg",
  });
});

test("normalizeWidgetBlock rejects unknown footer keys", () => {
  registerWidget(
    createFooterWidget({
      wizard: Dummy,
      visual: Dummy,
      advanced: Dummy,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "footer-2",
      type: "footer",
      variant: "columns-2",
      data: {
        columns: [{ title: "Company", links: [] }],
        style: {
          mysteryColor: "#ffffff",
        },
      },
    })
  ).toThrow("widget_schema_invalid");
});
