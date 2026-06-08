import { expect, test } from "vitest";

import { buildAssistantAdminContext } from "../../../core/services/assistant/adminContextService";
import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";
import { mapCmsOperationToActionPlan } from "../../../core/services/assistant/cmsOperationActionMapper";
import { normalizeCmsOperationDraft } from "../../../core/services/assistant/cmsOperationDraftSchema";

const context = buildAssistantAdminContext({
  page: "/admin/advanced",
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
      {
        id: "page-catalog-1",
        title: "Katalog Projektów Domów 33151341",
        slug: "/projekty-domow-33151341",
        status: "published",
      },
      {
        id: "page-catalog-2",
        title: "Katalog Projektów Domów a3afbe30",
        slug: "/projekty-domow-a3afbe30",
        status: "published",
      },
    ],
    contentTypes: [
      {
        id: "ct-products",
        slug: "products",
        name: "Products",
        entryCount: 0,
        fields: [],
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", title: "Title" },
          },
        },
      },
      {
        id: "ct-product-archive",
        slug: "products-archive",
        name: "Products Archive",
        entryCount: 0,
        fields: [],
      },
      {
        id: "ct-product-used",
        slug: "product-used",
        name: "Product Used",
        entryCount: 2,
        fields: [],
      },
    ],
    customScreens: [
      {
        id: "screen-products",
        name: "Products Screen",
        contentTypeId: "ct-products",
        status: "draft",
        collectionRole: null,
        compositionKey: null,
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
        collectionRole: null,
        compositionKey: null,
        showInSidebar: false,
        sidebarLabel: null,
        writableBindingFields: [],
        bindings: [],
      },
      {
        id: "screen-products-archive",
        name: "Products Archive Screen",
        contentTypeId: "ct-products",
        status: "draft",
        collectionRole: null,
        compositionKey: null,
        showInSidebar: false,
        sidebarLabel: null,
        writableBindingFields: [],
        bindings: [],
      },
    ],
    detailPages: [
      {
        id: "detail-products",
        name: "Product Detail",
        status: "draft",
        contentTypeId: "ct-products",
        contentTypeSlug: "products",
        linkedRouteType: "products",
        updatedAt: "2026-04-17T10:00:00.000Z",
        blockCount: 2,
        bindingCount: 1,
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
        {
          id: "query-products-archive",
          name: "Products Archive Query",
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
        {
          id: "template-products-list",
          name: "Products List",
          slug: "products-list",
          description: null,
          layout: "list",
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
      {
        id: "form-lead-secondary",
        name: "Lead Form Secondary",
        slug: "lead-form-secondary",
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
          {
            id: "menu-products-archive",
            label: "Products Archive",
            href: "/products/archive",
            pageId: null,
            parentId: null,
            orderIndex: 1,
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
      {
        id: "seo-products-archive",
        targetType: "page",
        targetId: "page-products-archive",
        targetTitle: "Products Archive",
        slug: "/products/archive",
        title: "Products Archive SEO",
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
      {
        id: "widget-template-hero-secondary",
        source: "template",
        name: "Hero Secondary Template",
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
  expect(
    planFor({
      operation: "delete",
      resourceKind: "page",
      targetQuery: { exactName: "Pysiek Mysiek" },
    })?.actions[0]
  ).toMatchObject({
    type: "page.delete",
    input: { id: "page-pysiek", title: "Pysiek Mysiek" },
  });

  expect(
    planFor({
      operation: "delete",
      resourceKind: "custom-screen",
      targetQuery: { exactName: "Products Screen" },
    })?.actions[0]
  ).toMatchObject({
    type: "custom-screen.delete",
    input: { id: "screen-products", name: "Products Screen" },
  });

  expect(
    planFor({
      operation: "archive",
      resourceKind: "form",
      targetQuery: { exactName: "Lead Form" },
    })?.actions[0]
  ).toMatchObject({
    type: "form.archive",
    input: { id: "form-lead", slug: "lead-form" },
  });
});

test("mapCmsOperationToActionPlan maps generic update drafts to existing typed actions", () => {
  expect(
    planFor({
      operation: "update",
      resourceKind: "listing-query",
      targetQuery: { exactName: "Products Query" },
      mutation: { fieldIntent: "limit", value: 24 },
    })?.actions[0]
  ).toMatchObject({
    type: "listing-query.update",
    input: { id: "query-products", patch: { limit: 24 } },
  });

  expect(
    planFor({
      operation: "update",
      resourceKind: "listing-template",
      targetQuery: { exactName: "Products Grid" },
      mutation: { fieldIntent: "layout", value: "list" },
    })?.actions[0]
  ).toMatchObject({
    type: "listing-template.update",
    input: { id: "template-products", patch: { layout: "list" } },
  });

  expect(
    planFor({
      operation: "update",
      resourceKind: "menu-item",
      targetQuery: { exactName: "Products" },
      mutation: { fieldIntent: "href", value: "/catalog" },
    })?.actions[0]
  ).toMatchObject({
    type: "menu.item.update",
    input: { menuId: "menu-primary", itemId: "menu-products", patch: { href: "/catalog" } },
  });

  expect(
    planFor({
      operation: "update",
      resourceKind: "seo-document",
      targetQuery: { exactName: "Products" },
      mutation: { fieldIntent: "description", value: "Browse products." },
    })?.actions[0]
  ).toMatchObject({
    type: "seo.document.update",
    input: { id: "seo-products", patch: { description: "Browse products." } },
  });

  expect(
    planFor({
      operation: "update",
      resourceKind: "widget-template",
      targetQuery: { exactName: "Hero Template" },
      mutation: { fieldIntent: "name", value: "Hero Template Updated" },
    })?.actions[0]
  ).toMatchObject({
    type: "widget-template.update",
    input: { id: "widget-template-hero", patch: { name: "Hero Template Updated" } },
  });
});

test("mapCmsOperationToActionPlan keeps generic detail-page updates gated", () => {
  const plan = planFor({
    operation: "update",
    resourceKind: "detail-page",
    resourceKey: "detail-page",
    targetQuery: { exactName: "ct-products" },
    mutation: { fieldIntent: "status", value: "published" },
  });

  expect(plan).toMatchObject({
    status: "needs_input",
    responseKind: "gated",
    actions: [],
    summary: "Detail Pages update is gated by assistant operation policy.",
  });
});

test("mapCmsOperationToActionPlan resolves update fields through policy aliases", () => {
  expect(
    planFor({
      operation: "update",
      resourceKind: "page",
      targetQuery: { exactName: "Pysiek Mysiek" },
      mutation: { fieldIntent: "show in nav", value: true },
    })?.actions[0]
  ).toMatchObject({
    type: "page.update",
    input: { id: "page-pysiek", patch: { settings: { showInNav: true } } },
  });

  expect(
    planFor({
      operation: "update",
      resourceKind: "seo-document",
      targetQuery: { exactName: "Products" },
      mutation: { fieldIntent: "meta description", value: "Browse products." },
    })?.actions[0]
  ).toMatchObject({
    type: "seo.document.update",
    input: { id: "seo-products", patch: { description: "Browse products." } },
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

test("mapCmsOperationToActionPlan maps counted partial page deletes to multiple actions", () => {
  const plan = planFor({
    operation: "delete",
    resourceKind: "page",
    targetQuery: { exactName: "Katalog Projektów" },
    constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
  });

  expect(plan?.status).toBe("ready");
  expect(plan?.actions.map((action) => action.type)).toEqual(["page.delete", "page.delete"]);
  expect(
    plan?.actions.map((action) => (action.type === "page.delete" ? action.input.title : null))
  ).toEqual(["Katalog Projektów Domów 33151341", "Katalog Projektów Domów a3afbe30"]);
});

test("mapCmsOperationToActionPlan maps counted destructive prompts for non-page families", () => {
  const cases = [
    {
      draft: {
        operation: "delete",
        resourceKind: "custom-screen",
        targetQuery: { exactName: "Screen" },
        constraints: { expectedCount: 3, destructive: true, requiresConfirmation: true },
      },
      expectedTypes: ["custom-screen.delete", "custom-screen.delete", "custom-screen.delete"],
    },
    {
      draft: {
        operation: "archive",
        resourceKind: "form",
        targetQuery: { exactName: "Lead" },
        constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
      },
      expectedTypes: ["form.archive", "form.archive"],
    },
    {
      draft: {
        operation: "delete",
        resourceKind: "listing-query",
        targetQuery: { exactName: "Products" },
        constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
      },
      expectedTypes: ["listing-query.delete", "listing-query.delete"],
    },
    {
      draft: {
        operation: "delete",
        resourceKind: "listing-template",
        targetQuery: { exactName: "Products" },
        constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
      },
      expectedTypes: ["listing-template.delete", "listing-template.delete"],
    },
    {
      draft: {
        operation: "delete",
        resourceKind: "widget-template",
        targetQuery: { exactName: "Hero" },
        constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
      },
      expectedTypes: ["widget-template.delete", "widget-template.delete"],
    },
    {
      draft: {
        operation: "delete",
        resourceKind: "menu-item",
        targetQuery: { text: "Products" },
        constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
      },
      expectedTypes: ["menu.item.delete", "menu.item.delete"],
    },
    {
      draft: {
        operation: "delete",
        resourceKind: "seo-document",
        targetQuery: { text: "Products" },
        constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
      },
      expectedTypes: ["seo.document.delete", "seo.document.delete"],
    },
    {
      draft: {
        operation: "delete",
        resourceKind: "content-type",
        targetQuery: { text: "Products" },
        constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
      },
      expectedTypes: ["content-type.delete", "content-type.delete"],
    },
  ] as const;

  for (const item of cases) {
    const plan = planFor(item.draft);
    expect(plan?.status).toBe("ready");
    expect(plan?.actions.map((action) => action.type)).toEqual(item.expectedTypes);
  }
});

test("mapCmsOperationToActionPlan keeps counted destructive prompts blocked when counts or safety checks fail", () => {
  const countMismatch = planFor({
    operation: "delete",
    resourceKind: "listing-query",
    targetQuery: { exactName: "Products" },
    constraints: { expectedCount: 3, destructive: true, requiresConfirmation: true },
  });

  expect(countMismatch?.status).toBe("needs_input");
  expect(countMismatch?.actions).toEqual([]);

  const unsafeContentType = planFor({
    operation: "delete",
    resourceKind: "content-type",
    targetQuery: { exactName: "Product" },
    constraints: { expectedCount: 3, destructive: true, requiresConfirmation: true },
  });

  expect(unsafeContentType?.status).toBe("needs_input");
  expect(unsafeContentType?.actions).toEqual([]);
});

test("mapCmsOperationToActionPlan maps counted updates when one patch is valid for every target", () => {
  const pagePlan = planFor({
    operation: "update",
    resourceKind: "page",
    targetQuery: { exactName: "Katalog Projektów" },
    mutation: { fieldIntent: "title", value: "Katalog domów" },
    constraints: { expectedCount: 2 },
  });

  expect(pagePlan?.status).toBe("ready");
  expect(pagePlan?.actions.map((action) => action.type)).toEqual(["page.update", "page.update"]);
  expect(pagePlan?.actions.map((action) => action.title)).toEqual([
    "Update Katalog Projektów Domów 33151341",
    "Update Katalog Projektów Domów a3afbe30",
  ]);

  const listingPlan = planFor({
    operation: "update",
    resourceKind: "listing-query",
    targetQuery: { exactName: "Products" },
    mutation: { fieldIntent: "limit", value: 24 },
    constraints: { expectedCount: 2 },
  });

  expect(listingPlan?.status).toBe("ready");
  expect(listingPlan?.actions.map((action) => action.type)).toEqual([
    "listing-query.update",
    "listing-query.update",
  ]);
});

test("mapCmsOperationToActionPlan blocks counted updates when the patch is invalid for the family", () => {
  const plan = planFor({
    operation: "update",
    resourceKind: "content-type",
    targetQuery: { text: "Products" },
    mutation: { fieldIntent: "title", value: "Archived Products" },
    constraints: { expectedCount: 2 },
  });

  expect(plan?.status).toBe("needs_input");
  expect(plan?.actions).toEqual([]);
});

test("mapCmsOperationToActionPlan maps content-type field additions from a generic field list", () => {
  const plan = mapCmsOperationToActionPlan({
    prompt: `Add these fields to the Content Type named Products
title
project_code
full_description
usable_area_m2
featured_image
exterior_gallery[]
tags[]
rooms[]
  - room_name
  - room_area_m2
project_pdf`,
    draft: normalizeCmsOperationDraft({
      operation: "update",
      resourceKind: "content-type",
      targetQuery: { exactName: "Products" },
      mutation: { fieldIntent: "schema" },
    }),
    context,
  });

  expect(plan?.status).toBe("ready");
  expect(plan?.actions).toHaveLength(1);
  const action = plan?.actions[0];
  if (!action || action.type !== "content-type.field.add") {
    throw new Error("missing_content_type_field_add_action");
  }
  expect(action.input).toMatchObject({
    id: "ct-products",
    slug: "products",
    name: "Products",
  });
  expect(action.input.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "project_code", type: "text" }),
      expect.objectContaining({ name: "full_description", type: "richtext" }),
      expect.objectContaining({ name: "usable_area_m2", type: "number" }),
      expect.objectContaining({ name: "featured_image", type: "media" }),
      expect.objectContaining({ name: "exterior_gallery", type: "media", multiple: true }),
      expect.objectContaining({ name: "project_pdf", type: "media" }),
    ])
  );
  expect(action.input.fields.some((field) => field.name === "tags")).toBe(false);
  expect(action.description).toContain("Unsupported nested or array fields were not planned");
  expect(() => normalizeAssistantActionPlan(plan!)).not.toThrow();
});

test("mapCmsOperationToActionPlan maps explicit multi-create items to existing typed actions", () => {
  const plan = planFor({
    operation: "create",
    resourceKind: "page",
    mutation: {
      patch: {
        items: [
          {
            title: "About",
            slug: "/about",
            status: "draft",
            introTitle: "About us",
            introBody: "Company profile.",
          },
          {
            title: "Contact",
            slug: "/contact-new",
            status: "published",
            introTitle: "Contact us",
            introBody: "Talk to us.",
          },
        ],
      },
    },
    constraints: { expectedCount: 2 },
  });

  expect(plan?.status).toBe("ready");
  expect(plan?.actions.map((action) => action.type)).toEqual(["page.upsert", "page.upsert"]);
  expect(plan?.actions.map((action) => action.title)).toEqual(["Create About", "Create Contact"]);
  expect(() => normalizeAssistantActionPlan(plan!)).not.toThrow();
});

test("mapCmsOperationToActionPlan blocks vague or unsafe multi-create drafts", () => {
  const vague = planFor({
    operation: "create",
    resourceKind: "form",
    constraints: { expectedCount: 2 },
  });

  expect(vague?.status).toBe("needs_input");
  expect(vague?.actions).toEqual([]);

  const unsafe = planFor({
    operation: "create",
    resourceKind: "form",
    mutation: {
      patch: {
        items: [
          {
            name: "Webhook Lead",
            slug: "webhook-lead",
            webhookSecret: "secret",
          },
        ],
      },
    },
    constraints: { expectedCount: 1 },
  });

  expect(unsafe?.status).toBe("needs_input");
  expect(unsafe?.actions).toEqual([]);
});
