import { expect, test } from "vitest";

import {
  normalizeAssistantActionPlan,
  isAssistantActionPlanStrict,
} from "../../../core/services/assistant/actionPlanSchema";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { buildFullServiceSitePlan } from "../../../core/services/assistant/blueprints/fullServiceSiteBlueprint";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { buildBasicSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicFlow";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

test("normalizeAssistantActionPlan accepts entry upsert draft actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "entry-products",
        type: "entry.upsert-draft",
        title: "Create product entry",
        description: "Draft sample product entry.",
        input: {
          contentTypeSlug: "products",
          title: "Sample",
          slug: "sample",
          values: {
            title: "Sample",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("entry.upsert-draft");
});

test("normalizeAssistantActionPlan accepts public sample entry actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "entry-sample-service",
        type: "entry.sample.create",
        title: "Publish service sample",
        description: "Create a published sample service entry.",
        input: {
          contentTypeSlug: "services-directory",
          title: "Projekt koncepcyjny",
          slug: "projekt-koncepcyjny",
          status: "published",
          values: {
            title: "Projekt koncepcyjny",
          },
          seo: {
            title: "Projekt koncepcyjny | Studio Forma",
            description: "Poznaj zakres projektu koncepcyjnego dla inwestorow.",
            canonicalUrl: "/uslugi/projekt-koncepcyjny",
            robots: "index,follow",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "entry.sample.create",
    input: {
      status: "published",
      slug: "projekt-koncepcyjny",
    },
  });
});

test("normalizeAssistantActionPlan accepts safe menu item upsert actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "menu-primary",
        type: "menu.upsert",
        title: "Create primary menu",
        description: "Create the primary navigation menu.",
        input: {
          name: "Primary navigation",
          location: "primary",
          status: "published",
        },
      },
      {
        id: "menu-products",
        type: "menu.item.upsert",
        title: "Add products to menu",
        description: "Add products catalog link.",
        input: {
          menuId: {
            kind: "action-result",
            actionId: "menu-primary",
            resourceType: "menu",
            field: "id",
          },
          label: "Products",
          href: "/products",
          orderIndex: 1,
          settings: {
            description: "Browse products",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("menu.upsert");
  expect(normalized.actions[1]).toMatchObject({
    type: "menu.item.upsert",
    input: {
      menuId: {
        kind: "action-result",
        actionId: "menu-primary",
        resourceType: "menu",
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts seo document upsert actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "seo-products",
        type: "seo.document.upsert",
        title: "Update product SEO",
        description: "Add SEO metadata to products page.",
        input: {
          targetType: "page",
          targetId: "page-products",
          seo: {
            title: "Products",
            description: "Browse products.",
            canonicalUrl: "/products",
            robots: "index,follow",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("seo.document.upsert");
});

test("normalizeAssistantActionPlan accepts seo target locators", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "seo-home",
        type: "seo.document.upsert",
        title: "Update home SEO",
        description: "Add SEO metadata to the home page.",
        input: {
          targetType: "page",
          targetId: {
            kind: "stable-slug",
            resourceType: "page",
            slug: "/",
          },
          seo: {
            title: "Studio Forma",
            description: "Architektura w pelnym procesie.",
            canonicalUrl: "/",
            robots: "index,follow",
          },
        },
      },
      {
        id: "seo-service",
        type: "seo.document.upsert",
        title: "Update service SEO",
        description: "Add SEO metadata to a sample service.",
        input: {
          targetType: "entry",
          targetId: {
            kind: "action-result",
            actionId: "entry-sample-service",
            resourceType: "entry",
            field: "id",
          },
          seo: {
            title: "Projekt koncepcyjny | Studio Forma",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "seo.document.upsert",
    input: {
      targetId: {
        kind: "stable-slug",
        resourceType: "page",
        slug: "/",
      },
    },
  });
  expect(normalized.actions[1]).toMatchObject({
    type: "seo.document.upsert",
    input: {
      targetId: {
        kind: "action-result",
        actionId: "entry-sample-service",
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts menu and seo delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "menu-products-delete",
        type: "menu.item.delete",
        title: "Delete products menu item",
        description: "Delete selected menu item.",
        input: {
          menuId: "menu-primary",
          itemId: "menu-products",
          label: "Products",
          expectedHref: "/products",
          expectedParentId: null,
        },
      },
      {
        id: "seo-products-delete",
        type: "seo.document.delete",
        title: "Delete products SEO",
        description: "Delete selected SEO document.",
        input: {
          id: "seo-1",
          targetType: "page",
          targetId: "page-products",
          expectedSlug: "/products",
          expectedTitle: "Products Catalog",
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual([
    "menu.item.delete",
    "seo.document.delete",
  ]);
});

test("normalizeAssistantActionPlan accepts remaining domain update actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "entry-update",
        type: "entry.update",
        title: "Update entry",
        description: "Update selected entry.",
        input: {
          id: "entry-1",
          contentTypeSlug: "products",
          expectedTitle: "Old",
          expectedSlug: "old",
          expectedStatus: "draft",
          patch: {
            title: "New",
            values: { title: "New" },
            seo: { title: "SEO New" },
          },
        },
      },
      {
        id: "form-update",
        type: "form.update",
        title: "Update form",
        description: "Update selected form.",
        input: {
          id: "form-1",
          name: "Contact",
          slug: "contact",
          expectedStatus: "published",
          patch: {
            name: "Contact Updated",
            submissionAccess: "internal",
          },
        },
      },
      {
        id: "listing-query-update",
        type: "listing-query.update",
        title: "Update query",
        description: "Update listing query.",
        input: {
          id: "query-1",
          name: "Products Query",
          patch: {
            limit: 24,
            includeDrafts: false,
          },
        },
      },
      {
        id: "listing-template-update",
        type: "listing-template.update",
        title: "Update template",
        description: "Update listing template.",
        input: {
          id: "template-1",
          name: "Products Grid",
          slug: "products-grid",
          expectedLayout: "grid",
          patch: {
            layout: "list",
            card: { showImage: false },
          },
        },
      },
      {
        id: "menu-item-update",
        type: "menu.item.update",
        title: "Update menu item",
        description: "Update menu item.",
        input: {
          menuId: "menu-primary",
          itemId: "menu-products",
          label: "Products",
          expectedHref: "/products",
          expectedParentId: null,
          patch: {
            label: "Products Catalog",
          },
        },
      },
      {
        id: "seo-update",
        type: "seo.document.update",
        title: "Update SEO",
        description: "Update SEO document.",
        input: {
          id: "seo-1",
          targetType: "page",
          targetId: "page-1",
          expectedSlug: "/products",
          expectedTitle: "Products",
          patch: {
            title: "Products SEO",
            description: "Browse products.",
          },
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual([
    "entry.update",
    "form.update",
    "listing-query.update",
    "listing-template.update",
    "menu.item.update",
    "seo.document.update",
  ]);
});

test("normalizeAssistantActionPlan accepts entry media reference attach actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "media-entry",
        type: "media.reference.attach",
        title: "Attach hero image",
        description: "Attach existing media to entry field.",
        input: {
          mediaId: "media-1",
          targetType: "entry",
          targetId: "entry-1",
          field: "heroImage",
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("media.reference.attach");
});

test("normalizeAssistantActionPlan accepts listing query filter patch actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "listing-filters",
        type: "listing-query.filters.patch",
        title: "Add listing filters",
        description: "Patch filters onto the product listing query.",
        input: {
          listingQueryName: "Products Catalog Query",
          filters: [
            {
              field: "category",
              operator: "eq",
              value: "chairs",
            },
          ],
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("listing-query.filters.patch");
});

test("normalizeAssistantActionPlan accepts listing delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "listing-query-delete",
        type: "listing-query.delete",
        title: "Delete listing query",
        description: "Delete product listing query.",
        input: {
          id: "query-1",
          name: "Products Catalog Query",
        },
      },
      {
        id: "listing-template-delete",
        type: "listing-template.delete",
        title: "Delete listing template",
        description: "Delete product listing template.",
        input: {
          id: "template-1",
          name: "Products Grid",
          slug: "products-grid",
          expectedLayout: "grid",
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual([
    "listing-query.delete",
    "listing-template.delete",
  ]);
});

test("normalizeAssistantActionPlan accepts listing template card patch actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "listing-card",
        type: "listing-template.card.patch",
        title: "Update card config",
        description: "Patch product card config.",
        input: {
          listingTemplateSlug: "products-grid",
          card: {
            showPrice: true,
            showStatus: true,
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("listing-template.card.patch");
});
