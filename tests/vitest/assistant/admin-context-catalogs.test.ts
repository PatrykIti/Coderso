import { expect, test } from "vitest";

import {
  buildAssistantResourceCatalogSnapshot,
  type AssistantResourceCatalogDeps,
} from "../../../core/services/assistant/adminContextCatalogs";

const createDeps = (overrides: Partial<AssistantResourceCatalogDeps> = {}) => {
  const calls: string[] = [];
  const deps: AssistantResourceCatalogDeps = {
    listPages: async () => {
      calls.push("pages");
      return [
        {
          id: "page-products",
          title: "Products",
          slug: "/products",
          status: "published",
        },
      ];
    },
    listPosts: async () => {
      calls.push("posts");
      return [
        {
          id: "post-public",
          title: "Published Post",
          slug: "published-post",
          status: "published",
          publishedAt: "2026-04-20T10:00:00.000Z",
          updatedAt: "2026-04-20T11:00:00.000Z",
        },
      ];
    },
    listEntries: async (typeId: string) => {
      calls.push(`entries:${typeId}`);
      return [
        {
          id: "entry-product",
          typeId,
          title: "Product Entry",
          slug: "product-entry",
          status: "published",
          publishedAt: "2026-04-20T10:00:00.000Z",
          updatedAt: "2026-04-20T11:00:00.000Z",
        },
      ];
    },
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
    listDetailPages: async () => {
      calls.push("detailPages");
      return [
        {
          id: "detail-page-products",
          name: "Products Detail",
          status: "published",
          contentTypeId: "ct-products",
          contentTypeSlug: "products",
          linkedRouteType: "products",
          updatedAt: "2026-04-20T11:00:00.000Z",
          blockCount: 4,
          bindingCount: 3,
          currentDocument: {
            blocks: [{ id: "hero-1" }],
            bindings: [{ id: "title" }],
            secretToken: "never expose",
          },
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
    listMenusWithItems: async () => {
      calls.push("menus");
      return [
        {
          menu: {
            id: "menu-primary",
            name: "Primary",
            location: "primary",
          },
          items: [
            {
              id: "menu-products",
              label: "Products",
              href: "/products",
              pageId: null,
              parentId: null,
              orderIndex: 0,
            },
          ],
        },
      ];
    },
    listSeoDocuments: async () => {
      calls.push("seoDocuments");
      return [
        {
          id: "seo-products",
          targetType: "page",
          targetId: "page-products",
          targetTitle: "Products",
          slug: "/products",
          title: "Products",
          status: "warning",
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
    listMedia: async () => {
      calls.push("media");
      return [
        {
          id: "media-1",
          originalName: "hero.png",
          title: "Hero",
          type: "image",
          mimeType: "image/png",
          size: 123,
        },
      ];
    },
    listCommerceProducts: async () => {
      calls.push("commerceProducts");
      return [
        {
          id: "product-1",
          title: "Product",
          slug: "product",
          status: "published",
          pricing: { amount: 199, currency: "PLN" },
          stock: { state: "in_stock" },
        },
      ];
    },
    listCommerceCollections: async () => {
      calls.push("commerceCollections");
      return [
        {
          id: "collection-1",
          name: "Featured",
          slug: "featured",
          productCount: 1,
        },
      ];
    },
    listSolutionKits: async () => {
      calls.push("solutionKits");
      return [
        {
          id: "services-directory",
          title: "Services Directory",
          shortDescription: "Services kit",
          recommendedModules: ["engine", "entries"],
          features: ["Directory"],
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
    "commerceCollections",
    "commerceProducts",
    "contentTypes",
    "customScreens",
    "detailPages",
    "entries:ct-products",
    "forms",
    "listingQueries",
    "listingTemplates",
    "media",
    "menus",
    "pages",
    "posts",
    "seoDocuments",
    "solutionKits",
    "widgets",
  ]);
  expect(snapshot.generatedAt).toBe("2026-04-11T10:00:00.000Z");
  expect(snapshot.contentTypes[0]?.slug).toBe("products");
  expect(snapshot.pages?.[0]?.slug).toBe("/products");
  expect(snapshot.detailPages?.[0]).toMatchObject({
    id: "detail-page-products",
    contentTypeId: "ct-products",
    contentTypeSlug: "products",
    linkedRouteType: "products",
    blockCount: 4,
    bindingCount: 3,
  });
  expect(JSON.stringify(snapshot.detailPages)).not.toContain("never expose");
  expect(snapshot.posts?.[0]?.slug).toBe("published-post");
  expect(snapshot.entries?.[0]?.slug).toBe("product-entry");
  expect(snapshot.forms[0]?.fields[0]?.name).toBe("email");
  expect(snapshot.menus[0]?.items[0]?.label).toBe("Products");
  expect(snapshot.seoDocuments[0]?.slug).toBe("/products");
  expect(snapshot.widgets[0]?.id).toBe("content-list");
  expect(snapshot.media?.[0]?.originalName).toBe("hero.png");
  expect(snapshot.commerce?.products[0]?.slug).toBe("product");
  expect(snapshot.commerce?.collections[0]?.slug).toBe("featured");
  expect(snapshot.solutionKits?.[0]?.id).toBe("services-directory");
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
