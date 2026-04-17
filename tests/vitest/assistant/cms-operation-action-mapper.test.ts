import { expect, test } from "vitest";

import { buildAssistantAdminContext } from "../../../core/services/assistant/adminContextService";
import { mapCmsOperationToActionPlan } from "../../../core/services/assistant/cmsOperationActionMapper";
import { normalizeCmsOperationDraft } from "../../../core/services/assistant/cmsOperationDraftSchema";

const context = buildAssistantAdminContext({
  page: "/admin/coderso",
  locale: "pl-PL",
  resourceCatalog: {
    schemaVersion: 1,
    generatedAt: "2026-04-17T10:00:00.000Z",
    budget: {
      maxItemsPerGroup: 50,
      maxFieldsPerResource: 24,
      truncated: false,
    },
    pages: [
      {
        id: "page-pysiek",
        title: "Pysiek Mysiek",
        slug: "/pysiek-mysiek",
        status: "draft",
      },
    ],
    contentTypes: [
      {
        id: "ct-products",
        slug: "products",
        name: "Products",
        entryCount: 0,
        fields: [],
      },
    ],
    customScreens: [
      {
        id: "screen-products",
        name: "Products Screen",
        contentTypeId: "ct-products",
        status: "draft",
        showInSidebar: false,
        sidebarLabel: null,
        writableBindingFields: [],
        bindings: [],
      },
      {
        id: "screen-archive",
        name: "Archive Screen",
        contentTypeId: "ct-products",
        status: "draft",
        showInSidebar: false,
        sidebarLabel: null,
        writableBindingFields: [],
        bindings: [],
      },
    ],
    listings: {
      queries: [
        {
          id: "query-products",
          name: "Products Query",
          description: null,
          source: "entries",
          contentTypeId: "ct-products",
          taxonomyId: null,
          includeDrafts: false,
          fields: ["title"],
          sort: [],
          limit: 12,
        },
      ],
      templates: [
        {
          id: "template-products",
          name: "Products Grid",
          slug: "products-grid",
          description: null,
          layout: "grid",
          configKeys: [],
        },
      ],
    },
    forms: [
      {
        id: "form-lead",
        name: "Lead Form",
        slug: "lead-form",
        status: "published",
        submissionAccess: "public",
        fields: [],
      },
    ],
    menus: [
      {
        id: "menu-primary",
        name: "Primary",
        location: "primary",
        itemCount: 1,
        items: [
          {
            id: "menu-products",
            label: "Products",
            href: "/products",
            pageId: null,
            parentId: null,
            orderIndex: 0,
            depth: 0,
          },
        ],
      },
    ],
    seoDocuments: [
      {
        id: "seo-products",
        targetType: "page",
        targetId: "page-products",
        targetTitle: "Products",
        slug: "/products",
        title: "Products SEO",
        status: "warning",
      },
    ],
    widgets: [
      {
        id: "widget-template-hero",
        source: "template",
        name: "Hero Template",
        description: null,
        category: "Marketing",
        module: "widgets",
        complexity: "composite",
        audience: "beginner",
        variants: [],
        slots: [],
        surfaces: ["page-builder"],
        requires: [],
        status: "published",
      },
    ],
    warnings: [],
  },
});

const planFor = (draft: unknown) =>
  mapCmsOperationToActionPlan({
    prompt: "test prompt",
    draft: normalizeCmsOperationDraft(draft),
    context,
  });

test("mapCmsOperationToActionPlan maps generic delete drafts to existing typed actions", () => {
  expect(planFor({
    operation: "delete",
    resourceKind: "page",
    targetQuery: { exactName: "Pysiek Mysiek" },
  })?.actions[0]).toMatchObject({
    type: "page.delete",
    input: { id: "page-pysiek", title: "Pysiek Mysiek" },
  });

  expect(planFor({
    operation: "delete",
    resourceKind: "custom-screen",
    targetQuery: { exactName: "Products Screen" },
  })?.actions[0]).toMatchObject({
    type: "custom-screen.delete",
    input: { id: "screen-products", name: "Products Screen" },
  });

  expect(planFor({
    operation: "archive",
    resourceKind: "form",
    targetQuery: { exactName: "Lead Form" },
  })?.actions[0]).toMatchObject({
    type: "form.archive",
    input: { id: "form-lead", slug: "lead-form" },
  });
});

test("mapCmsOperationToActionPlan maps generic update drafts to existing typed actions", () => {
  expect(planFor({
    operation: "update",
    resourceKind: "listing-query",
    targetQuery: { exactName: "Products Query" },
    mutation: { fieldIntent: "limit", value: 24 },
  })?.actions[0]).toMatchObject({
    type: "listing-query.update",
    input: { id: "query-products", patch: { limit: 24 } },
  });

  expect(planFor({
    operation: "update",
    resourceKind: "listing-template",
    targetQuery: { exactName: "Products Grid" },
    mutation: { fieldIntent: "layout", value: "list" },
  })?.actions[0]).toMatchObject({
    type: "listing-template.update",
    input: { id: "template-products", patch: { layout: "list" } },
  });

  expect(planFor({
    operation: "update",
    resourceKind: "menu-item",
    targetQuery: { exactName: "Products" },
    mutation: { fieldIntent: "href", value: "/catalog" },
  })?.actions[0]).toMatchObject({
    type: "menu.item.update",
    input: { menuId: "menu-primary", itemId: "menu-products", patch: { href: "/catalog" } },
  });

  expect(planFor({
    operation: "update",
    resourceKind: "seo-document",
    targetQuery: { exactName: "Products" },
    mutation: { fieldIntent: "description", value: "Browse products." },
  })?.actions[0]).toMatchObject({
    type: "seo.document.update",
    input: { id: "seo-products", patch: { description: "Browse products." } },
  });

  expect(planFor({
    operation: "update",
    resourceKind: "widget-template",
    targetQuery: { exactName: "Hero Template" },
    mutation: { fieldIntent: "name", value: "Hero Template Updated" },
  })?.actions[0]).toMatchObject({
    type: "widget-template.update",
    input: { id: "widget-template-hero", patch: { name: "Hero Template Updated" } },
  });
});

test("mapCmsOperationToActionPlan fails closed for broad destructive prompts", () => {
  const plan = planFor({
    operation: "delete",
    resourceKind: "custom-screen",
    constraints: { destructive: true },
  });

  expect(plan?.status).toBe("needs_input");
  expect(plan?.actions).toEqual([]);
});
