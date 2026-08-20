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
  createContentTypeFieldAddContext,
  createFakeProvider,
  createPageWithReferencedTemplateContext,
  createTrustedCatalog,
  contentTypeFieldAddPrompt,
} from "./actionPlannerFixtures";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("planAssistantActions does not attach blueprint shadow metadata to generic cms plans even in debug mode", () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  const plan = planAssistantActions({
    prompt: "czy widzisz strone Home w Pages?",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [{ id: "page-home", title: "Home", slug: "/", status: "published" }],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "type-1",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        media: [],
        warnings: [],
      },
    },
  });

  expect(plan.intentId).toBe("cms-resource-inspect");
  expect(plan.metadata?.blueprintShadow).toBeUndefined();
});

test("planAssistantActions uses normalized admin route aliases for blueprint shadow diagnostics", () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  const plan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/content",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "ct-products",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
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
          templates: [],
        },
        forms: [],
        menus: [],
        seoDocuments: [],
        media: [],
        warnings: [],
      },
    },
  });

  expect(plan.metadata?.blueprintShadow).toMatchObject({
    primaryCapabilityId: "product-catalog",
  });
});

test("planAssistantActions uses normalized content-type aliases for blueprint shadow diagnostics", () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  const plan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/content-types/type-1",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "type-1",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
          {
            id: "type-2",
            slug: "services",
            name: "Services",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: {
          queries: [
            {
              id: "query-products",
              name: "Products Query",
              description: null,
              source: "entries",
              contentTypeId: "type-1",
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
        media: [],
        warnings: [],
      },
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/content-types/type-1",
        activeHref: "/admin/content-types/type-1",
        area: "advanced",
        advancedModule: null,
        selectedResource: {
          kind: "content-type",
          id: "type-1",
        },
        visibleActions: [],
        permissionHints: {
          known: false,
          reason: "not_available",
          requiredForVisibleActions: [],
        },
      },
    },
  });

  expect(plan.metadata?.blueprintShadow).toMatchObject({
    primaryCapabilityId: "product-catalog",
  });
});

test("planAssistantActions uses normalized content-type aliases for blueprint shadow diagnostics without selectedResource", () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  const plan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/content-types/type-1",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "type-1",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
          {
            id: "type-2",
            slug: "services",
            name: "Services",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: {
          queries: [
            {
              id: "query-products",
              name: "Products Query",
              description: null,
              source: "entries",
              contentTypeId: "type-1",
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
        media: [],
        warnings: [],
      },
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/content-types/type-1",
        activeHref: "/admin/content-types/type-1",
        area: "advanced",
        advancedModule: null,
        selectedResource: null,
        visibleActions: [],
        permissionHints: {
          known: false,
          reason: "not_available",
          requiredForVisibleActions: [],
        },
      },
    },
  });

  expect(plan.metadata?.blueprintShadow).toMatchObject({
    primaryCapabilityId: "product-catalog",
  });
});

test("planAssistantActions ignores client-authored resource catalogs in blueprint shadow diagnostics without the include flag", () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  const plan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/content-types/type-1",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "type-1",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        media: [],
        warnings: [],
      },
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/content-types/type-1",
        activeHref: "/admin/content-types/type-1",
        area: "advanced",
        advancedModule: null,
        selectedResource: {
          kind: "content-type",
          id: "type-1",
        },
        visibleActions: [],
        permissionHints: {
          known: false,
          reason: "not_available",
          requiredForVisibleActions: [],
        },
      },
    },
  });

  expect(plan.metadata?.blueprintShadow).toMatchObject({
    primaryCapabilityId: null,
    mismatchReason: "no_candidates",
  });
  expect(plan.intentFamily).toBe("unknown");
});

test("planAssistantActions shadow diagnostics can infer family from selectedResource id on engine surfaces", () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  const plan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/advanced/engine/type-1",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "ct-products",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        media: [],
        warnings: [],
      },
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/advanced/engine/type-1",
        activeHref: "/admin/advanced/engine/type-1",
        area: "advanced",
        advancedModule: "engine",
        selectedResource: {
          kind: "content-type",
          id: "type-1",
        },
        visibleActions: [],
        permissionHints: {
          known: false,
          reason: "not_available",
          requiredForVisibleActions: [],
        },
      },
    },
  });

  expect(plan.metadata?.blueprintShadow).toMatchObject({
    primaryCapabilityId: "product-catalog",
  });
});

test("planAssistantActions shadow diagnostics ignore selectedResource ids on non catalog-aware page surfaces", () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  const plan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/pages/123",
      locale: "pl-PL",
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/pages/123",
        activeHref: "/admin/pages/123",
        area: "pages",
        advancedModule: null,
        selectedResource: {
          kind: "page",
          id: "page-services",
        },
        visibleActions: [],
        permissionHints: {
          known: false,
          reason: "not_available",
          requiredForVisibleActions: [],
        },
      },
    },
  });

  expect(plan.intentId).toBe("page-update-needs-input");
  expect(plan.metadata?.blueprintShadow).toMatchObject({
    primaryCapabilityId: null,
    mismatchReason: "no_candidates",
  });
});
