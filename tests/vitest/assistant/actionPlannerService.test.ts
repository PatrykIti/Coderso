import { expect, test } from "vitest";

import {
  classifyAssistantPrompt,
  isLikelyGuidePlanningPrompt,
  isLikelyHouseProjectsCatalogPrompt,
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import type { AssistantProvider } from "../../../core/services/assistant/providers/providerTypes";

const createFakeProvider = (text: string): AssistantProvider => ({
  id: "fake",
  complete: async () => ({ text }),
});

test("detects guide planning prompt for house projects catalog", () => {
  expect(
    isLikelyGuidePlanningPrompt(
      "potrzebuje strony na ktore bede mogl prezentowac projekty domow, caly katalog"
    )
  ).toBe(true);
  expect(
    isLikelyHouseProjectsCatalogPrompt(
      "potrzebuje strony na ktore bede mogl prezentowac projekty domow, caly katalog"
    )
  ).toBe(true);
});

test("classifyAssistantPrompt distinguishes docs, setup, and refinement prompts", () => {
  expect(classifyAssistantPrompt("gdzie zmienie kolory hero widgetu?")).toMatchObject({
    promptKind: "docs_question",
    intentFamily: "unknown",
  });

  expect(
    classifyAssistantPrompt(
      "potrzebuje strony na ktore bede mogl prezentowac projekty domow, caly katalog"
    )
  ).toMatchObject({
    promptKind: "setup_request",
    intentFamily: "catalog_showcase",
  });

  expect(
    classifyAssistantPrompt("dodaj filtr po metrazu i liczbie pokoi")
  ).toMatchObject({
    promptKind: "refinement_request",
  });
});

test("planAssistantActions builds ready house projects catalog plan", () => {
  const plan = planAssistantActions({
    prompt:
      "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.promptKind).toBe("setup_request");
  expect(plan.intentFamily).toBe("catalog_showcase");
  expect(plan.intentId).toBe("house-projects-catalog");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "setting.content-route.upsert",
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "page.upsert",
  ]);
  expect(plan.actions.some((action) => action.type === "page.upsert")).toBe(true);
});

test("planAssistantActions returns clarification plan for non-actionable prompt", () => {
  const plan = planAssistantActions({
    prompt: "gdzie zmienie kolory hero widgetu?",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.promptKind).toBe("docs_question");
  expect(plan.intentFamily).toBe("unknown");
  expect(plan.questions.length).toBeGreaterThan(0);
  expect(plan.actions).toHaveLength(0);
});

test("planAssistantActions builds custom screen delete plan from resource catalog prefix", () => {
  const plan = planAssistantActions({
    prompt: "usun dwa ekrany w screens o prefixie 'House Projects' w tytule ekranu",
    context: {
      page: "/admin/coderso/custom-screens/screen-1/entries",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-12T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [
          {
            id: "screen-1",
            name: "House Projects",
            contentTypeId: "type-1",
            status: "active",
            showInSidebar: true,
            sidebarLabel: "House Projects",
            writableBindingFields: [],
            bindings: [],
          },
          {
            id: "screen-2",
            name: "House Projects Archive",
            contentTypeId: "type-1",
            status: "draft",
            showInSidebar: false,
            sidebarLabel: null,
            writableBindingFields: [],
            bindings: [],
          },
          {
            id: "screen-3",
            name: "Products",
            contentTypeId: "type-2",
            status: "active",
            showInSidebar: true,
            sidebarLabel: "Products",
            writableBindingFields: [],
            bindings: [],
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("custom-screen-delete");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "custom-screen.delete",
    "custom-screen.delete",
  ]);
  expect(plan.actions.map((action) => action.input.name)).toEqual([
    "House Projects",
    "House Projects Archive",
  ]);
});

test("planAssistantActions builds page delete plan from active page context", () => {
  const plan = planAssistantActions({
    prompt: "usun te strone contact",
    context: {
      page: "/admin/pages/page-contact",
      locale: "pl-PL",
      activeSurface: {
        kind: "page",
        page: {
          id: "page-contact",
          title: "Contact",
          slug: "/contact",
          status: "published",
          template: "landing",
        },
        selectedBlockId: "hero-1",
        blocks: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-delete");
  expect(plan.actions).toEqual([
    {
      id: "page-delete-page-contact",
      type: "page.delete",
      title: "Delete Contact",
      description: "Delete the active page selected from admin context.",
      input: {
        id: "page-contact",
        title: "Contact",
        slug: "/contact",
        expectedStatus: "published",
      },
    },
  ]);
});

test("planAssistantActions asks for active page context before page deletion", () => {
  const plan = planAssistantActions({
    prompt: "usun strone contact",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("page-delete-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds widget template delete plan from active template context", () => {
  const plan = planAssistantActions({
    prompt: "usun ten widget template Contact CTA",
    context: {
      page: "/admin/coderso/widgets/templates/template-1",
      locale: "pl-PL",
      activeSurface: {
        kind: "widget-template",
        template: {
          id: "template-1",
          name: "Contact CTA",
          status: "published",
          category: "Marketing",
        },
        selectedBlockId: "cta-1",
        blocks: [],
        settings: {
          wrapperContainer: "default",
          sectionGap: "md",
          hasBackgroundMedia: false,
        },
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("widget-template-delete");
  expect(plan.actions).toEqual([
    {
      id: "widget-template-delete-template-1",
      type: "widget-template.delete",
      title: "Delete Contact CTA",
      description: "Delete the active reusable widget template selected from admin context.",
      input: {
        id: "template-1",
        name: "Contact CTA",
        expectedStatus: "published",
        expectedCategory: "Marketing",
      },
    },
  ]);
});

test("planAssistantActions asks for active widget template context before template deletion", () => {
  const plan = planAssistantActions({
    prompt: "usun widget template Contact CTA",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("widget-template-delete-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions routes non-house-project setup prompts into generic needs-input family", () => {
  const docsQuestionPlan = planAssistantActions({
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(docsQuestionPlan.status).toBe("ready");
  expect(docsQuestionPlan.promptKind).toBe("setup_request");
  expect(docsQuestionPlan.intentFamily).toBe("product_catalog");
  expect(docsQuestionPlan.intentId).toBe("product-catalog");
});

test("planAssistantActions builds product inquiry catalog for catalog plus form prompts", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje katalogu produktow dla sklepu z formularzem zapytania",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("product-inquiry-catalog");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "setting.content-route.upsert",
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "form.upsert",
    "page.upsert",
  ]);
  expect(plan.summary).toContain("inquiry form");
});

test("planAssistantActions returns needs-input for checkout/payment prompts", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje sklep z checkoutem koszykiem i platnosciami",
    context: {
      page: "/admin/coderso/commerce",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("product-checkout-needs-prerequisite");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds ready portfolio and services plans for routed families", () => {
  const portfolioPlan = planAssistantActions({
    prompt: "stworz portfolio projektow dla agencji architektonicznej",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(portfolioPlan.status).toBe("ready");
  expect(portfolioPlan.intentFamily).toBe("portfolio_projects");
  expect(portfolioPlan.intentId).toBe("portfolio-projects");
  expect(JSON.stringify(portfolioPlan.actions)).toContain("resultSummary");
  expect(JSON.stringify(portfolioPlan.actions)).toContain("testimonialQuote");

  const servicesPlan = planAssistantActions({
    prompt: "potrzebuje katalogu uslug dla firmy sprzatajacej",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(servicesPlan.status).toBe("ready");
  expect(servicesPlan.intentFamily).toBe("services_directory");
  expect(servicesPlan.intentId).toBe("services-directory");
});

test("planAssistantActions builds ready lead capture site plan", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje strony kontaktowej z formularzem kontaktowym do zbierania leadow",
    context: {
      page: "/admin/coderso/forms",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("lead_capture_site");
  expect(plan.intentId).toBe("lead-capture-site");
  expect(plan.actions.map((action) => action.type)).toEqual(["form.upsert", "page.upsert"]);
});

test("planAssistantActions returns gated needs-input plan for booking service prompts", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje strony z rezerwacja online i kalendarzem wizyt",
    context: {
      page: "/admin/coderso/booking",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentFamily).toBe("booking_service");
  expect(plan.intentId).toBe("booking-service-needs-prerequisite");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds editorial content hub without post mutations", () => {
  const plan = planAssistantActions({
    prompt: "stworz blog z aktualnosciami i najnowszymi wpisami",
    context: {
      page: "/admin/posts",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("editorial_content_hub");
  expect(plan.intentId).toBe("editorial-content-hub");
  expect(plan.actions.map((action) => action.type)).toEqual(["page.upsert"]);
  expect(JSON.stringify(plan.actions)).toContain("posts-feed");
});

test("planAssistantActions builds ready refinement plan for house-project filters", () => {
  const plan = planAssistantActions({
    prompt: "dodaj filtr po metrazu i liczbie pokoi",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.promptKind).toBe("refinement_request");
  expect(plan.intentFamily).toBe("catalog_showcase");
  expect(plan.intentId).toBe("house-projects-catalog-refinement");
  expect(plan.actions).toHaveLength(1);
  expect(plan.actions[0]?.type).toBe("page.upsert");
  if (plan.actions[0]?.type !== "page.upsert") {
    throw new Error("expected_page_upsert_action");
  }
  expect(plan.actions[0].input.listingFilters?.facets.length).toBeGreaterThan(1);
});

test("planAssistantActions builds inquiry form refinement plan for house projects", () => {
  const plan = planAssistantActions({
    prompt: "dodaj formularz zapytania do strony szczegolowej",
    context: {
      page: "/admin/pages/projekty-domow",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.promptKind).toBe("refinement_request");
  expect(plan.intentFamily).toBe("catalog_showcase");
  expect(plan.intentId).toBe("house-projects-catalog-inquiry-form");
  expect(plan.actions.map((action) => action.type)).toEqual(["form.upsert", "page.upsert"]);
  const formAction = plan.actions.find((action) => action.type === "form.upsert");
  expect(formAction?.input.slug).toBe("house-projects-catalog-inquiry");
  const pageAction = plan.actions.find((action) => action.type === "page.upsert");
  expect(pageAction?.input.formEmbed?.formName).toBe("House Projects Catalog Inquiry");
});

test("planAssistantActions builds site-kit actions from guided site-kit context", () => {
  const plan = planAssistantActions({
    prompt: "prepare a starter site kit",
    context: {
      locale: "en",
      siteKit: {
        businessType: "automotive_workshop",
        goals: ["lead_generation", "online_booking"],
        locale: "en",
        selectedKitId: "automotive-workshop",
        enabledStepIds: ["settings", "pages", "qa"],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("site_kit");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "site-kit.recommend",
    "site-kit.install",
  ]);
  const install = plan.actions.find((action) => action.type === "site-kit.install");
  expect(install?.input.preview.selectedKitId).toBe("automotive-workshop");
  expect(install?.input.preview.enabledStepIds).toEqual(["settings", "pages", "qa"]);
});

test("planAssistantActions accepts enriched resource catalog context without DB imports", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
    context: {
      page: "/admin/coderso/engine",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-11T10:00:00.000Z",
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
            entryCount: 3,
            fields: [
              {
                name: "title",
                type: "string",
                required: true,
                label: "Title",
                orderIndex: null,
              },
            ],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("product-catalog");
});

test("planAssistantActionsWithProviderDraft maps provider JSON through strict adapter", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "create one draft product entry",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        intentId: "provider-entry",
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Draft entry",
        answer: "I can draft an entry.",
        summary: "Create a draft product entry.",
        confidence: 0.8,
        assumptions: [],
        actions: [
          {
            type: "entry.upsert-draft",
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
      })
    ),
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("provider-entry");
  expect(plan.actions[0]?.type).toBe("entry.upsert-draft");
});

test("planAssistantActionsWithProviderDraft falls back when provider is unavailable", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
    llmAvailable: false,
    provider: createFakeProvider(
      JSON.stringify({
        actions: [
          {
            type: "database.drop",
            input: {},
          },
        ],
      })
    ),
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("product-catalog");
});

test("planAssistantActionsWithProviderDraft falls back on provider errors", async () => {
  const provider: AssistantProvider = {
    id: "fake",
    complete: async () => {
      throw new Error("timeout");
    },
  };

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "potrzebuje katalogu uslug dla firmy sprzatajacej",
    llmAvailable: true,
    provider,
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("services_directory");
  expect(plan.intentId).toBe("services-directory");
});

test("planAssistantActionsWithProviderDraft recovers unsafe provider drafts as questions", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "create catalog",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        actions: [
          {
            type: "database.drop",
            input: {},
          },
        ],
      })
    ),
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.summary).toContain("unsupported actions");
});
