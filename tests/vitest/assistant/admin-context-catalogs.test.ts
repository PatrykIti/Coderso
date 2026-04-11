import { expect, test } from "vitest";

import {
  buildAssistantResourceCatalogSnapshot,
  type AssistantResourceCatalogDeps,
} from "../../../core/services/assistant/adminContextCatalogs";

const createDeps = (overrides: Partial<AssistantResourceCatalogDeps> = {}) => {
  const calls: string[] = [];
  const deps: AssistantResourceCatalogDeps = {
    listContentTypes: async () => {
      calls.push("contentTypes");
      return [
        {
          id: "ct-products",
          slug: "products",
          name: "Products",
          schema: {
            required: ["title"],
            properties: {
              title: { type: "string" },
            },
          },
        },
      ];
    },
    listCustomScreens: async () => {
      calls.push("customScreens");
      return [
        {
          id: "screen-products",
          name: "Products Admin",
          contentTypeId: "ct-products",
          status: "active",
          showInSidebar: true,
          bindings: [],
        },
      ];
    },
    listListingQueries: async () => {
      calls.push("listingQueries");
      return [
        {
          id: "query-products",
          name: "Products Query",
          query: {
            source: "entries",
            sourceConfig: { contentTypeId: "ct-products" },
            fields: ["title"],
            sort: [],
            pagination: { limit: 12 },
          },
        },
      ];
    },
    listListingTemplates: async () => {
      calls.push("listingTemplates");
      return [
        {
          id: "template-products",
          name: "Products Grid",
          slug: "products-grid",
          layout: "grid",
          config: { card: true },
        },
      ];
    },
    listFormsWithFields: async () => {
      calls.push("forms");
      return [
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
              name: "email",
              label: "Email",
              type: "email",
              required: true,
              orderIndex: 0,
            },
          ],
        },
      ];
    },
    listWidgetCatalog: async () => {
      calls.push("widgets");
      return [
        {
          id: "content-list",
          source: "core",
          name: "Content List",
          category: "content",
          variants: ["cards"],
        },
      ];
    },
    ...overrides,
  };

  return { calls, deps };
};

test("buildAssistantResourceCatalogSnapshot aggregates injected deps", async () => {
  const { calls, deps } = createDeps();
  const snapshot = await buildAssistantResourceCatalogSnapshot(
    {
      generatedAt: "2026-04-11T10:00:00.000Z",
    },
    deps
  );

  expect(calls.sort()).toEqual([
    "contentTypes",
    "customScreens",
    "forms",
    "listingQueries",
    "listingTemplates",
    "widgets",
  ]);
  expect(snapshot.generatedAt).toBe("2026-04-11T10:00:00.000Z");
  expect(snapshot.contentTypes[0]?.slug).toBe("products");
  expect(snapshot.forms[0]?.fields[0]?.name).toBe("email");
  expect(snapshot.widgets[0]?.id).toBe("content-list");
  expect(snapshot.warnings).toEqual([]);
});

test("buildAssistantResourceCatalogSnapshot keeps valid groups when one dep fails", async () => {
  const { deps } = createDeps({
    listWidgetCatalog: async () => {
      throw new Error("widgets_unavailable");
    },
  });

  const snapshot = await buildAssistantResourceCatalogSnapshot(
    {
      generatedAt: "2026-04-11T10:00:00.000Z",
    },
    deps
  );

  expect(snapshot.contentTypes).toHaveLength(1);
  expect(snapshot.widgets).toHaveLength(0);
  expect(snapshot.warnings).toContain("widgets_unavailable");
});
