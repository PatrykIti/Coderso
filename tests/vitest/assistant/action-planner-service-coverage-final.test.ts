import { expect, test } from "vitest";

import {
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import { createFakeProvider, createTrustedCatalog } from "./actionPlannerFixtures";

const catalogContext = {
  page: "/admin",
  locale: "pl-PL",
  includeResourceCatalog: true,
  resourceCatalog: createTrustedCatalog(),
};

const pagesCatalogContext = {
  page: "/admin/pages",
  locale: "pl-PL",
  includeResourceCatalog: true,
  resourceCatalog: createTrustedCatalog({
    pages: [{ id: "page-home", title: "Home", slug: "/", status: "draft" }],
  }),
};

const detailPageContext = {
  page: "/admin/pages",
  locale: "pl-PL",
  includeResourceCatalog: true,
  resourceCatalog: createTrustedCatalog({
    detailPages: [
      {
        id: "detail-page-products",
        name: "Products Detail",
        status: "published",
        contentTypeId: "ct-products",
        contentTypeSlug: "products",
        linkedRouteType: "products",
        updatedAt: "2026-04-20T11:00:00.000Z",
        blockCount: 0,
        bindingCount: 0,
      },
    ],
  }),
};

const multiPageContext = {
  page: "/admin/pages",
  locale: "pl-PL",
  includeResourceCatalog: true,
  resourceCatalog: createTrustedCatalog({
    pages: [
      { id: "page-home", title: "Home", slug: "/", status: "draft" },
      { id: "page-contact", title: "Kontakt", slug: "/kontakt", status: "draft" },
      { id: "page-about", title: "O nas", slug: "/o-nas", status: "draft" },
    ],
  }),
};

test("planAssistantActions plans checkout prerequisite for product catalogs with online payments", () => {
  const plan = planAssistantActions({
    prompt: "Stwórz katalog produktów z platnosc online",
    context: catalogContext,
  });

  expect(plan.intentId).toBe("product-checkout-needs-prerequisite");
  expect(plan.status).toBe("needs_input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions plans inquiry catalog for product catalogs with an inquiry form", () => {
  const plan = planAssistantActions({
    prompt: "Stwórz katalog produktów z formularzem",
    context: catalogContext,
  });

  expect(plan.intentId).toBe("product-inquiry-catalog");
  expect(plan.status).toBe("ready");
  expect(plan.actions.length).toBeGreaterThan(0);
});

test("planAssistantActions redacts the original prompt for gated detail page updates", () => {
  const plan = planAssistantActions({
    prompt: "zaktualizuj detail page Products Detail zmieniając token: abc123 na inny",
    context: detailPageContext,
  });

  expect(plan.intentId).toBe("detail-page-update-gated");
  expect(plan.assumptions).toContain("Original prompt: [REDACTED]");
});

test("planAssistantActionsWithProviderDraft recovers a local plan when provider inspection has no candidates", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "Stwórz katalog produktów",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "inspect",
        resourceKind: "page",
        targetQuery: { text: "catalog" },
      })
    ),
    context: catalogContext,
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("product-catalog");
  expect(plan.metadata?.planner).toBe("provider");
  expect(plan.metadata?.providerDraftUsed).toBe(false);
});

test("planAssistantActionsWithProviderDraft recovers a ready local plan for rejected needs-input drafts", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "Stwórz katalog produktów z formularzem",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "update",
        resourceKind: "page",
        targetQuery: { exactName: "nope" },
        mutation: { fieldIntent: "title" },
      })
    ),
    context: catalogContext,
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("product-inquiry-catalog");
  expect(plan.metadata?.planner).toBe("provider");
  expect(plan.metadata?.providerDraftUsed).toBe(false);
});

test("planAssistantActionsWithProviderDraft falls back locally when destructive action count mismatches the prompt", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "usuń 3 strony",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "delete",
        resourceKind: "page",
        targetQuery: { exactName: "Home" },
        constraints: { expectedCount: 1 },
      })
    ),
    context: pagesCatalogContext,
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("page-delete-needs-input");
  expect(plan.metadata?.planner).toBeUndefined();
});

test("planAssistantActionsWithProviderDraft falls back locally when the provider action count mismatches an explicit prompt count", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "zaktualizuj dokładnie 3 strony",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "update",
        resourceKind: "page",
        targetQuery: { exactName: "Home" },
        mutation: { fieldIntent: "title", value: "X" },
      })
    ),
    context: multiPageContext,
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("generic-guide-needs-input");
  expect(plan.metadata?.planner).toBeUndefined();
});

test("planAssistantActionsWithProviderDraft falls back locally when a ready draft ignores a destructive prompt", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "usuń stronę główną",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "update",
        resourceKind: "page",
        targetQuery: { exactName: "Home" },
        mutation: { fieldIntent: "title", value: "X" },
      })
    ),
    context: multiPageContext,
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("page-delete-needs-input");
  expect(plan.metadata?.planner).toBeUndefined();
});

test("planAssistantActionsWithProviderDraft falls back locally when the draft patch misses a prompt-implied field", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "zmień tytuł i adres URL",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "update",
        resourceKind: "page",
        targetQuery: { exactName: "Home" },
        mutation: { fieldIntent: "title", value: "X" },
      })
    ),
    context: multiPageContext,
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("generic-guide-needs-input");
  expect(plan.metadata?.planner).toBeUndefined();
});

test("planAssistantActions falls back to generic routing when a content-type field add names no target", () => {
  const plan = planAssistantActions({
    prompt: "Dodaj pola do content type:\n- email\n- telefon",
    context: {
      page: "/admin/engine",
      locale: "pl-PL",
      includeResourceCatalog: true,
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/engine",
        activeHref: null,
        area: "advanced",
        advancedModule: "engine",
        selectedResource: null,
        visibleActions: [],
        permissionHints: { known: false, requiredForVisibleActions: [], reason: "not_available" },
      },
      resourceCatalog: createTrustedCatalog({
        contentTypes: [
          { id: "ct-product", name: "Produkt", slug: "produkt", entryCount: 0, fields: [] },
        ],
      }),
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("content-type-update-needs-input");
});
