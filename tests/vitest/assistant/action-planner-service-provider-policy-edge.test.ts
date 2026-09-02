import { afterEach, expect, test, vi } from "vitest";

import {
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import {
  createContentTypeFieldAddContext,
  createFakeProvider,
  createTrustedCatalog,
  contentTypeFieldAddPrompt,
} from "./actionPlannerFixtures";
import type { AssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

afterEach(() => {
  vi.unstubAllEnvs();
});

const emptyCatalogContext = {
  page: "/admin",
  locale: "en-US",
  includeResourceCatalog: true,
  resourceCatalog: createTrustedCatalog(),
};

const advancedIntakeSession: AssistantSiteBuilderIntakeSession = {
  version: 1,
  mode: "advanced",
  currentStepId: "site-goals",
  answers: [],
};

const basicIntakeSession: AssistantSiteBuilderIntakeSession = {
  version: 1,
  mode: "basic",
  currentStepId: "site-goals",
  answers: [],
};

const listingQueryCatalog = createTrustedCatalog({
  listings: {
    queries: [
      {
        id: "list-products",
        name: "Products list",
        description: "Lists product entries.",
        source: "products",
        contentTypeId: "products",
        taxonomyId: null,
        includeDrafts: false,
        fields: ["title", "price"],
        sort: [],
        limit: 10,
      },
    ],
    templates: [],
  },
});

const listingQueryCatalogContext = {
  page: "/admin/listings",
  locale: "en-US",
  includeResourceCatalog: true,
  resourceCatalog: listingQueryCatalog,
};

test("planAssistantActionsWithProviderDraft delegates active advanced intake sessions", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "continue the guided setup",
    llmAvailable: true,
    provider: createFakeProvider(JSON.stringify({ invalid: true })),
    context: {
      ...emptyCatalogContext,
      siteBuilderIntakeState: { activeSession: advancedIntakeSession },
    },
  });

  expect(plan.intentId).toBe("site-builder-advanced-intake");
  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("needs_input");
});

test("planAssistantActionsWithProviderDraft delegates active basic intake sessions", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "continue the basic setup",
    llmAvailable: true,
    provider: createFakeProvider(JSON.stringify({ invalid: true })),
    context: {
      ...emptyCatalogContext,
      siteBuilderIntakeState: { activeSession: basicIntakeSession },
    },
  });

  expect(plan.intentId).toBe("site-builder-basic-intake");
  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("needs_input");
});

test("planAssistantActionsWithProviderDraft delegates direct site-kit requests", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "apply my reviewed site plan",
    llmAvailable: true,
    provider: createFakeProvider(JSON.stringify({ invalid: true })),
    context: {
      ...emptyCatalogContext,
      siteKit: {
        businessType: "small_ecommerce",
        goals: ["sell_products"],
        locale: "en",
      },
    },
  });

  expect(plan.intentId).toBe("site-kit-reviewed-intake-required");
  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("gated");
});

test("planAssistantActionsWithProviderDraft coerces numeric mutation values", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "update",
      resourceKind: "listing-query",
      targetQuery: { exactName: "products list" },
      mutation: {
        fieldIntent: "limit",
        value: "20",
      },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "show 20 products in the products list",
    llmAvailable: true,
    provider,
    context: listingQueryCatalogContext,
  });

  expect(plan.status).toBe("ready");
  expect(plan.metadata?.planner).toBe("provider");
  expect(plan.actions[0]).toMatchObject({
    type: "listing-query.update",
    input: { patch: { limit: 20 } },
  });
});

test("planAssistantActionsWithProviderDraft coerces boolean yes and no mutation values", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "update",
      resourceKind: "listing-query",
      targetQuery: { exactName: "products list" },
      mutation: {
        fieldIntent: "includeDrafts",
        value: "yes",
      },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "include drafts in the products list",
    llmAvailable: true,
    provider,
    context: listingQueryCatalogContext,
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]).toMatchObject({
    type: "listing-query.update",
    input: { patch: { includeDrafts: true } },
  });

  const noProvider = createFakeProvider(
    JSON.stringify({
      operation: "update",
      resourceKind: "listing-query",
      targetQuery: { exactName: "products list" },
      mutation: {
        fieldIntent: "includeDrafts",
        value: "no",
      },
    })
  );

  const noPlan = await planAssistantActionsWithProviderDraft({
    prompt: "exclude drafts from the products list",
    llmAvailable: true,
    provider: noProvider,
    context: listingQueryCatalogContext,
  });

  expect(noPlan.status).toBe("ready");
  expect(noPlan.actions[0]).toMatchObject({
    type: "listing-query.update",
    input: { patch: { includeDrafts: false } },
  });
});

test("planAssistantActionsWithProviderDraft builds clarifying plans for empty normalized prompts", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "   ",
    llmAvailable: false,
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("generic-guide-needs-input");
  expect(plan.answer).toContain("clarify");
});

test("planAssistantActions resolves unquoted named content type targets", () => {
  const plan = planAssistantActions({
    prompt: contentTypeFieldAddPrompt,
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]?.type).toBe("content-type.field.add");
});

test("planAssistantActions resolves quoted slug targets for content type field additions", () => {
  const plan = planAssistantActions({
    prompt: 'dodaj pola do content type "Products"\ntitle\nslug',
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]).toMatchObject({
    type: "content-type.field.add",
    input: { id: "ct-products" },
  });
});

test("planAssistantActions resolves wildcard prefix targets for content type field additions", () => {
  const plan = planAssistantActions({
    prompt: 'dodaj pola do content type "prod*"\ntitle\nslug',
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]).toMatchObject({
    type: "content-type.field.add",
    input: { id: "ct-products" },
  });
});

test("planAssistantActions resolves content type mentions from the prompt header", () => {
  const plan = planAssistantActions({
    prompt: "dodaj pola do Content Type Products\ntitle\nslug",
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]?.type).toBe("content-type.field.add");
});

test("planAssistantActions matches mutation values against catalog content types", () => {
  const plan = planAssistantActions({
    prompt: 'dodaj pola do ten content type "Products"\ntitle\nslug',
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]).toMatchObject({
    type: "content-type.field.add",
    input: { id: "ct-products" },
  });
});

test("planAssistantActions uses the selected content type resource as a target", () => {
  const plan = planAssistantActions({
    prompt: "dodaj pola\ntitle\nslug",
    context: {
      ...createContentTypeFieldAddContext(),
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/advanced/engine",
        activeHref: "/admin/advanced/engine",
        area: "advanced",
        advancedModule: "engine",
        selectedResource: { kind: "content-type", id: "ct-products" },
        visibleActions: [],
        permissionHints: {
          known: true,
          requiredForVisibleActions: [],
          reason: "server_enriched",
        },
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]).toMatchObject({
    type: "content-type.field.add",
    input: { id: "ct-products" },
  });
});

test("planAssistantActionsWithProviderDraft parses provider JSON embedded in prose", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "limit the products list to five entries",
    llmAvailable: true,
    provider: createFakeProvider(
      "Certainly, here is the validated draft: " +
        JSON.stringify({
          operation: "update",
          resourceKind: "listing-query",
          targetQuery: { exactName: "products list" },
          mutation: { fieldIntent: "limit", value: "5" },
        })
    ),
    context: listingQueryCatalogContext,
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]?.type).toBe("listing-query.update");
});

test("planAssistantActionsWithProviderDraft plans the full service business site for setup requests", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "Zrobimy cala strone pracowni architektonicznej.",
    llmAvailable: true,
    provider: createFakeProvider("not json at all"),
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("service-business-full-site");
});

test("planAssistantActions builds the full service business site plan for setup requests", () => {
  const plan = planAssistantActions({
    prompt: "Zrobimy cala strone pracowni architektonicznej.",
  });

  expect(plan.intentId).toBe("service-business-full-site");
});

test("planAssistantActions builds portfolio refinement plans that mention client filters", () => {
  const plan = planAssistantActions({
    prompt: "add a client name filter to my portfolio projects",
  });

  expect(plan.intentId).toBe("portfolio-projects-refinement");
});

test("planAssistantActions maps path-style slug targets to needs-input field add plans", () => {
  const plan = planAssistantActions({
    prompt: 'dodaj pole do content type "/products" wartosc "opis"\ntitle\nslug',
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("content-type-update-needs-input");
});

test("planAssistantActions maps keyword prefix targets to field add plans", () => {
  const plan = planAssistantActions({
    prompt: 'dodaj pole do content type zaczyna sie od "prod" wartosc "opis"\ntitle\nslug',
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]).toMatchObject({
    type: "content-type.field.add",
    input: { id: "ct-products" },
  });
});

test("planAssistantActions falls back to resolved targets when field add prompts lack a target", () => {
  const plan = planAssistantActions({
    prompt: "dodaj pola\ntitle\nslug",
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]).toMatchObject({
    type: "content-type.field.add",
    input: { id: "ct-products" },
  });
});

test("planAssistantActionsWithProviderDraft recovers local inspection for empty provider inspections", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "inspect",
      resourceKind: "page",
      targetQuery: { exactName: "nope" },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "sprawdz strone glowna",
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: createContentTypeFieldAddContext().resourceCatalog,
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.responseKind).toBe("inspection");
  expect(plan.metadata?.planner).toBe("provider");
});

test("planAssistantActionsWithProviderDraft falls back locally for broad destructive provider drafts", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "delete",
      resourceKind: "entry",
      targetQuery: { text: "delete all" },
      filters: [{ field: "status", operator: "eq", value: "draft" }],
      constraints: { expectedCount: 3, destructive: true, requiresConfirmation: true },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "usun wszystkie wpisy ze strony",
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/advanced/entries",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: createContentTypeFieldAddContext().resourceCatalog,
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("cms-page-delete-broad-blocked");
});

test("planAssistantActions resolves quoted exact-name targets for field add plans", () => {
  const plan = planAssistantActions({
    prompt: 'dodaj pole do content type "Products" wartosc "opis"\ntitle\nslug',
    context: createContentTypeFieldAddContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]).toMatchObject({
    type: "content-type.field.add",
    input: { id: "ct-products" },
  });
});
