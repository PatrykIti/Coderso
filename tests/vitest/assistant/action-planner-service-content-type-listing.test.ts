import { afterEach, expect, test, vi } from "vitest";

import {
  classifyAssistantPrompt,
  isLikelyGuidePlanningPrompt,
  isLikelyHouseProjectsCatalogPrompt,
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import { mapCmsOperationToActionPlan } from "../../../core/services/assistant/cmsOperationActionMapper";
import {
  isCuratedMediaUrl,
  selectCuratedMediaProfile,
} from "../../../core/services/media/curatedMediaProfiles";
import type {
  AssistantActionContext,
  AssistantAdminContext,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantProvider } from "../../../core/services/assistant/providers/providerTypes";
import {
  carCatalogMarkdownPrompt,
  createFakeProvider,
  createPageWithReferencedTemplateContext,
  createTrustedCatalog,
} from "./actionPlannerFixtures";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("planAssistantActions blocks content type delete when entries exist", () => {
  const plan = planAssistantActions({
    prompt: "usun content type 'products'",
    context: {
      page: "/admin/advanced/engine",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-13T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [
          {
            id: "ct-products",
            slug: "products",
            name: "Products",
            entryCount: 2,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("content-type-delete-needs-input");
  expect(plan.summary).toContain("not precise enough");
  expect(plan.actions).toEqual([]);
});

const createContentTypeFieldAddContext = (): AssistantActionContext => ({
  page: "/admin/advanced/engine",
  locale: "pl-PL",
  includeResourceCatalog: true,
  resourceCatalog: createTrustedCatalog({
    contentTypes: [
      {
        id: "ct-products",
        slug: "products",
        name: "Products",
        entryCount: 0,
        fields: [
          {
            name: "title",
            type: "string",
            required: false,
            label: "Title",
            orderIndex: null,
          },
        ],
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", title: "Title" },
          },
        },
      },
      {
        id: "ct-orders",
        slug: "orders",
        name: "Orders",
        entryCount: 3,
        fields: [],
      },
    ],
  }),
  runtimeSnapshot: {
    schemaVersion: 2,
    route: "/admin/advanced/engine",
    activeHref: "/admin/advanced/engine",
    area: "advanced",
    advancedModule: "engine",
    selectedResource: {
      kind: "content-type",
      id: "ct-products",
    },
    visibleActions: [],
    permissionHints: {
      known: false,
      requiredForVisibleActions: [],
      reason: "frontend_user_has_no_permissions",
    },
  },
});

const contentTypeFieldAddPrompt = `dodaj mi pola do Content Type o nazwie 'Products'.. pola ktore podaje nizej

# Project

title
slug
project_code
short_description
full_description
usable_area_m2
featured_image
tags[]
rooms[]
  - room_name
  - room_area_m2
project_pdf`;

test("planAssistantActions plans generic content type field additions before site-builder follow-up routing", () => {
  const plan = planAssistantActions({
    prompt: contentTypeFieldAddPrompt,
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.responseKind).toBe("action_plan");
  expect(plan.intentId).toBe("content-type-field-add");
  expect(plan.actions).toHaveLength(1);
  const action = plan.actions[0];
  if (!action || action.type !== "content-type.field.add") {
    throw new Error("missing_content_type_field_add_action");
  }
  expect(action.input.slug).toBe("products");
  expect(action.input.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "project_code", type: "text" }),
      expect.objectContaining({ name: "short_description", type: "richtext" }),
      expect.objectContaining({ name: "full_description", type: "richtext" }),
      expect.objectContaining({ name: "usable_area_m2", type: "number" }),
      expect.objectContaining({ name: "featured_image", type: "media" }),
      expect.objectContaining({ name: "project_pdf", type: "media" }),
    ])
  );
  expect(action.input.fields.some((field) => field.name === "title")).toBe(false);
  expect(action.input.fields.some((field) => field.name === "tags")).toBe(false);
  expect(action.description).toContain("Unsupported nested or array fields were not planned");
});

test("planAssistantActionsWithProviderDraft keeps content type field additions on deterministic local policy path", async () => {
  let providerCalls = 0;
  const provider: AssistantProvider = {
    id: "fake",
    complete: async () => {
      providerCalls += 1;
      return {
        text: JSON.stringify({
          operation: "inspect",
          resourceKind: "content-type",
        }),
      };
    },
  };

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: contentTypeFieldAddPrompt,
    llmAvailable: true,
    provider,
    context: createContentTypeFieldAddContext(),
  });

  expect(providerCalls).toBe(0);
  expect(plan.status).toBe("ready");
  expect(plan.responseKind).toBe("action_plan");
  expect(plan.actions[0]?.type).toBe("content-type.field.add");
  expect(plan.metadata).toMatchObject({
    planner: "provider",
    providerDraftUsed: false,
    providerId: "fake",
  });
});

test("planAssistantActions builds listing query delete plan from active listing route", () => {
  const plan = planAssistantActions({
    prompt: "usun ten listing query",
    context: {
      page: "/admin/advanced/listings/query-1",
      locale: "pl-PL",
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/advanced/listings/query-1",
        activeHref: "/admin/advanced/listings/query-1",
        area: "advanced",
        advancedModule: "listings",
        selectedResource: { kind: "listing-query", id: "query-1" },
        visibleActions: [],
        permissionHints: {
          known: false,
          requiredForVisibleActions: [],
          reason: "frontend_user_has_no_permissions",
        },
      },
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-13T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [
            {
              id: "query-1",
              name: "Products Catalog Query",
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
          templates: [],
        },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("listing-query-delete");
  expect(plan.actions[0]).toMatchObject({
    id: "listing-query-delete-query-1",
    type: "listing-query.delete",
    input: {
      id: "query-1",
      name: "Products Catalog Query",
    },
  });
});

test("planAssistantActions builds listing template delete plan from exact slug", () => {
  const plan = planAssistantActions({
    prompt: "usun listing template 'products-grid'",
    context: {
      page: "/admin/advanced/listings",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-13T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [],
          templates: [
            {
              id: "template-1",
              name: "Products Grid",
              slug: "products-grid",
              description: null,
              layout: "grid",
              configKeys: [],
            },
          ],
        },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("listing-template-delete");
  expect(plan.actions[0]).toMatchObject({
    id: "listing-template-delete-template-1",
    type: "listing-template.delete",
    input: {
      id: "template-1",
      name: "Products Grid",
      slug: "products-grid",
      expectedLayout: "grid",
    },
  });
});

test("planAssistantActions asks for exact listing query when name is ambiguous", () => {
  const plan = planAssistantActions({
    prompt: "usun listing query 'Products Catalog Query'",
    context: {
      page: "/admin/advanced/listings",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-13T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [
            {
              id: "query-1",
              name: "Products Catalog Query",
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
              id: "query-2",
              name: "Products Catalog Query",
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
          templates: [],
        },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("listing-query-delete-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds listing query update plan from exact target", () => {
  const plan = planAssistantActions({
    prompt: "zmien limit listing query 'Products Catalog Query' na 24",
    context: {
      page: "/admin/advanced/listings",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [
            {
              id: "query-1",
              name: "Products Catalog Query",
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
          templates: [],
        },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("listing-query-update");
  expect(plan.assumptions).toContain(
    "The follow-up target was resolved by the guided site-builder follow-up resolver before action mapping."
  );
  expect(plan.actions[0]).toMatchObject({
    type: "listing-query.update",
    input: { id: "query-1", name: "Products Catalog Query", patch: { limit: 24 } },
  });
});
