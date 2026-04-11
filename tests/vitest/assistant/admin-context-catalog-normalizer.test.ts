import { expect, test } from "vitest";

import { normalizeAssistantResourceCatalog } from "../../../core/services/assistant/adminContextCatalogNormalizer";

test("normalizeAssistantResourceCatalog summarizes resource schemas deterministically", () => {
  const snapshot = normalizeAssistantResourceCatalog(
    {
      contentTypes: [
        {
          id: "ct-products",
          slug: "products",
          name: "Products",
          entryCount: 12,
          schema: {
            type: "object",
            required: ["title"],
            properties: {
              apiKey: { type: "string" },
              price: { type: "number", title: "Price" },
              title: { type: "string", title: "Title" },
            },
          },
        },
      ],
      customScreens: [
        {
          id: "screen-products",
          name: "Products Admin",
          contentTypeId: "ct-products",
          status: "active",
          showInSidebar: true,
          sidebarLabel: "Products",
          bindings: [
            {
              widgetId: "header",
              propPath: "title",
              field: "title",
              mode: "readwrite",
            },
          ],
        },
      ],
      listingQueries: [
        {
          id: "query-products",
          name: "Products Query",
          description: "Published products",
          query: {
            source: "entries",
            sourceConfig: {
              contentTypeId: "ct-products",
              includeDrafts: true,
            },
            fields: ["title", "price", "secretToken"],
            sort: [{ field: "title", dir: "asc" }],
            pagination: { limit: 18, offset: 0 },
          },
        },
      ],
      listingTemplates: [
        {
          id: "template-products",
          name: "Products Grid",
          slug: "products-grid",
          description: "Grid layout",
          layout: "grid",
          config: {
            card: true,
            webhookSecret: "never expose",
          },
        },
      ],
      forms: [
        {
          form: {
            id: "form-lead",
            name: "Lead Form",
            slug: "lead-form",
            status: "published",
            submissionAccess: "public",
          },
          fields: [
            {
              id: "email",
              type: "email",
              label: "Email",
              name: "email",
              required: true,
              orderIndex: 1,
              settings: { placeholder: "Email" },
            },
            {
              id: "token",
              type: "text",
              label: "Token",
              name: "apiToken",
              required: false,
              orderIndex: 2,
              settings: { token: "never expose" },
            },
          ],
        },
      ],
      widgets: [
        {
          type: "content-list",
          title: "Content List",
          description: "List entries",
          category: "content",
          module: "entries",
          complexity: "composite",
          audience: "beginner",
          variants: [{ id: "cards", label: "Cards" }],
          slots: [
            {
              id: "header",
              label: "Header",
              kind: "fixed",
              allowedTypes: ["rich-text-section"],
            },
          ],
          surfaces: ["page-builder", "widget-library"],
          requires: ["entries"],
          editor: { hidden: true },
          render: () => null,
        },
      ],
    },
    {
      generatedAt: "2026-04-11T10:00:00.000Z",
      maxItemsPerGroup: 20,
      maxFieldsPerResource: 10,
    }
  );

  expect(snapshot).toMatchObject({
    schemaVersion: 1,
    generatedAt: "2026-04-11T10:00:00.000Z",
    budget: {
      maxItemsPerGroup: 20,
      maxFieldsPerResource: 10,
      truncated: false,
    },
    contentTypes: [
      {
        id: "ct-products",
        slug: "products",
        name: "Products",
        entryCount: 12,
      },
    ],
    customScreens: [
      {
        id: "screen-products",
        name: "Products Admin",
        contentTypeId: "ct-products",
        status: "active",
        showInSidebar: true,
        sidebarLabel: "Products",
        writableBindingFields: ["title"],
      },
    ],
    listings: {
      queries: [
        {
          id: "query-products",
          source: "entries",
          contentTypeId: "ct-products",
          includeDrafts: true,
          fields: ["price", "title"],
          limit: 18,
        },
      ],
      templates: [
        {
          id: "template-products",
          slug: "products-grid",
          layout: "grid",
          configKeys: ["card"],
        },
      ],
    },
    forms: [
      {
        id: "form-lead",
        slug: "lead-form",
        submissionAccess: "public",
      },
    ],
    widgets: [
      {
        id: "content-list",
        source: "core",
        name: "Content List",
        variants: ["cards"],
        surfaces: ["page-builder", "widget-library"],
      },
    ],
  });
  expect(snapshot.contentTypes[0]?.fields.map((field) => field.name)).toEqual([
    "price",
    "title",
  ]);
  expect(snapshot.forms[0]?.fields.map((field) => field.name)).toEqual(["email"]);
  expect(snapshot.widgets[0]?.slots).toEqual([
    {
      id: "header",
      label: "Header",
      kind: "fixed",
      allowedTypes: ["rich-text-section"],
      minItems: null,
      maxItems: null,
    },
  ]);
  expect(JSON.stringify(snapshot)).not.toContain("never expose");
  expect(JSON.stringify(snapshot)).not.toContain("apiToken");
  expect(snapshot.warnings).toEqual([
    "content_type_products_field_redacted",
    "form_form-lead_field_redacted",
    "listing_template_products-grid_config_key_redacted",
  ]);
});

test("normalizeAssistantResourceCatalog clamps groups and fields with stable ordering", () => {
  const snapshot = normalizeAssistantResourceCatalog(
    {
      contentTypes: [
        {
          id: "ct-b",
          slug: "b",
          name: "B",
          schema: {
            properties: {
              zed: { type: "string" },
              alpha: { type: "string" },
            },
          },
        },
        {
          id: "ct-a",
          slug: "a",
          name: "A",
          schema: { properties: { title: { type: "string" } } },
        },
      ],
      widgets: [
        { id: "widget-b", source: "core", name: "Widget B" },
        { id: "widget-a", source: "core", name: "Widget A" },
      ],
    },
    {
      generatedAt: "2026-04-11T10:00:00.000Z",
      maxItemsPerGroup: 1,
      maxFieldsPerResource: 1,
    }
  );

  expect(snapshot.budget.truncated).toBe(true);
  expect(snapshot.contentTypes.map((item) => item.slug)).toEqual(["a"]);
  expect(snapshot.contentTypes[0]?.fields.map((field) => field.name)).toEqual(["title"]);
  expect(snapshot.widgets.map((item) => item.id)).toEqual(["widget-a"]);
  expect(snapshot.warnings).toContain("content_types_truncated");
  expect(snapshot.warnings).toContain("widgets_truncated");
});
