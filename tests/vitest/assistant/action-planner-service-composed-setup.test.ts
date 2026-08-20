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

test("planAssistantActions routes non-house-project setup prompts into generic needs-input family", () => {
  const docsQuestionPlan = planAssistantActions({
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
    context: {
      page: "/admin/advanced/widgets",
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
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("blueprint-composed-product-catalog");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "form.upsert",
    "page.upsert",
    "detail-page.upsert",
    "setting.content-route.upsert",
  ]);
  expect(plan.actions.find((action) => action.type === "page.upsert")).toMatchObject({
    input: {
      formEmbed: {
        formName: "Product Catalog Inquiry",
      },
    },
  });
});

test("planAssistantActions routes checkout/payment prompts through the composed gated path", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje sklep z checkoutem koszykiem i platnosciami",
    context: {
      page: "/admin/advanced/commerce",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("gated");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("blueprint-composed-product-catalog-needs-input");
  expect(plan.actions).toEqual([]);
  expect(plan.questions).toEqual([
    expect.objectContaining({
      id: expect.stringContaining("blueprint-gated-domain"),
    }),
  ]);
  expect(plan.summary).toContain("Checkout and Payment");
});

test("planAssistantActions returns a gated composed plan for mixed services setup with booking", () => {
  const plan = planAssistantActions({
    prompt: "Build a services directory with contact page and booking.",
    context: {
      page: "/admin/advanced/entries",
      locale: "en-US",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("gated");
  expect(plan.intentFamily).toBe("services_directory");
  expect(plan.intentId).toBe("blueprint-composed-services-directory-needs-input");
  expect(plan.actions).toEqual([]);
  expect(plan.questions).toEqual([
    expect.objectContaining({
      id: expect.stringContaining("blueprint-gated-domain"),
    }),
  ]);
  expect(plan.summary).toContain("Booking Service");
});

test("planAssistantActions composes a services directory with a single adjunct contact page", () => {
  const plan = planAssistantActions({
    prompt: "Build a services directory with contact page.",
    context: {
      page: "/admin/advanced/entries",
      locale: "en-US",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("services_directory");
  expect(plan.intentId).toBe("blueprint-composed-services-directory");
  expect(
    plan.actions
      .filter((action) => action.type === "page.upsert")
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
  ).toEqual(["/uslugi", "/kontakt"]);
});

test("planAssistantActions ignores untrusted resource catalogs on the live composed setup path", () => {
  const prompt = "Create a services directory with contact page here.";
  const trustedByRouteOnly = planAssistantActions({
    prompt,
    context: {
      page: "/admin/advanced/entries",
      locale: "en-US",
    },
  });
  const withClientAuthoredCatalog = planAssistantActions({
    prompt,
    context: {
      page: "/admin/advanced/entries",
      locale: "en-US",
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
    },
  });

  expect(withClientAuthoredCatalog.intentId).toBe(trustedByRouteOnly.intentId);
  expect(withClientAuthoredCatalog.intentFamily).toBe(trustedByRouteOnly.intentFamily);
  expect(withClientAuthoredCatalog.actions).toEqual(trustedByRouteOnly.actions);
});

test("planAssistantActions ignores untrusted resource catalogs on local CMS inspection paths", () => {
  const prompt = "find page home";
  const trustedByRouteOnly = planAssistantActions({
    prompt,
    context: {
      page: "/admin/pages",
      locale: "en-US",
    },
  });
  const withClientAuthoredCatalog = planAssistantActions({
    prompt,
    context: {
      page: "/admin/pages",
      locale: "en-US",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-08T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [
          {
            id: "page-home",
            title: "Home",
            slug: "/home",
            status: "published",
          },
        ],
        posts: [],
        entries: [],
        contentTypes: [],
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

  expect(withClientAuthoredCatalog.responseKind).toBe(trustedByRouteOnly.responseKind);
  expect(withClientAuthoredCatalog.inspection?.candidates ?? []).toEqual(
    trustedByRouteOnly.inspection?.candidates ?? []
  );
});

test("planAssistantActions builds ready portfolio and services plans for routed families", () => {
  const portfolioPlan = planAssistantActions({
    prompt: "stworz portfolio projektow dla agencji architektonicznej",
    context: {
      page: "/admin/advanced/widgets",
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
      page: "/admin/advanced/widgets",
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
      page: "/admin/advanced/forms",
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
      page: "/admin/advanced/booking",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentFamily).toBe("booking_service");
  expect(plan.intentId).toBe("booking-service-needs-prerequisite");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds static editorial content hub without post mutations", () => {
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
  expect(JSON.stringify(plan.actions)).toContain("editorial-hub-posts-overview");
});

test("planAssistantActions inspects posts from resource catalog", () => {
  const plan = planAssistantActions({
    prompt: "pokaz mi wszystkie posty",
    context: {
      page: "/admin/posts",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-20T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        posts: [
          {
            id: "post-public",
            title: "Public Post",
            slug: "public-post",
            status: "published",
            publishedAt: "2026-04-20T10:00:00.000Z",
            updatedAt: "2026-04-20T11:00:00.000Z",
          },
          {
            id: "post-draft",
            title: "Draft Post",
            slug: "draft-post",
            status: "draft",
            publishedAt: null,
            updatedAt: "2026-04-20T12:00:00.000Z",
          },
        ],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.responseKind).toBe("inspection");
  expect(plan.inspection?.resourceKind).toBe("post");
  expect(plan.inspection?.candidates.map((candidate) => candidate.label)).toEqual([
    "Draft Post",
    "Public Post",
  ]);
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions inspects left-menu resource catalog sections", () => {
  const resourceCatalog: AssistantActionContext["resourceCatalog"] = {
    schemaVersion: 1,
    generatedAt: "2026-04-20T10:00:00.000Z",
    budget: {
      maxItemsPerGroup: 50,
      maxFieldsPerResource: 24,
      truncated: false,
    },
    pages: [],
    posts: [],
    entries: [
      {
        id: "entry-product",
        typeId: "ct-products",
        title: "Product Entry",
        slug: "product-entry",
        status: "published",
        publishedAt: "2026-04-20T10:00:00.000Z",
        updatedAt: "2026-04-20T11:00:00.000Z",
      },
    ],
    contentTypes: [],
    customScreens: [
      {
        id: "screen-products",
        name: "Products Screen",
        contentTypeId: "ct-products",
        status: "active",
        collectionRole: null,
        compositionKey: null,
        showInSidebar: true,
        sidebarLabel: "Products",
        writableBindingFields: [],
        bindings: [],
      },
    ],
    listings: { queries: [], templates: [] },
    forms: [],
    menus: [
      {
        id: "menu-primary",
        name: "Primary",
        location: "primary",
        itemCount: 1,
        items: [
          {
            id: "menu-home",
            label: "Home",
            href: "/",
            pageId: null,
            parentId: null,
            orderIndex: 0,
            depth: 0,
          },
        ],
      },
    ],
    seoDocuments: [],
    media: [
      {
        id: "media-1",
        title: "Hero",
        originalName: "hero.png",
        type: "image",
        mimeType: "image/png",
        size: 123,
        alt: "Hero alt",
        createdAt: "2026-04-20T10:00:00.000Z",
      },
    ],
    commerce: {
      products: [
        {
          id: "commerce-product",
          title: "Product",
          slug: "product",
          status: "published",
          currency: "PLN",
          priceAmount: 199,
          stockState: "in_stock",
          updatedAt: "2026-04-20T10:00:00.000Z",
        },
      ],
      collections: [
        {
          id: "commerce-collection",
          name: "Featured",
          slug: "featured",
          productCount: 1,
          updatedAt: "2026-04-20T10:00:00.000Z",
        },
      ],
    },
    solutionKits: [
      {
        id: "services-directory",
        title: "Services Directory",
        shortDescription: "Services kit",
        recommendedModules: ["engine", "entries"],
        features: ["Directory"],
      },
    ],
    warnings: [],
  };
  const cases = [
    { prompt: "pokaz menu", resourceKind: "menu", labels: ["Primary"] },
    { prompt: "pokaz media", resourceKind: "media", labels: ["Hero"] },
    { prompt: "pokaz entries", resourceKind: "entry", labels: ["Product Entry"] },
    { prompt: "pokaz screens", resourceKind: "custom-screen", labels: ["Products Screen"] },
    { prompt: "pokaz commerce", resourceKind: "commerce", labels: ["Featured", "Product"] },
    { prompt: "pokaz solution kits", resourceKind: "solution-kit", labels: ["Services Directory"] },
  ] as const;

  for (const item of cases) {
    const plan = planAssistantActions({
      prompt: item.prompt,
      context: {
        page: "/admin",
        locale: "pl-PL",
        includeResourceCatalog: true,
        resourceCatalog,
      },
    });

    expect(plan.responseKind, item.prompt).toBe("inspection");
    expect(plan.inspection?.resourceKind, item.prompt).toBe(item.resourceKind);
    expect(
      plan.inspection?.candidates.map((candidate) => candidate.label),
      item.prompt
    ).toEqual(item.labels);
    expect(plan.actions, item.prompt).toEqual([]);
  }
});

test("planAssistantActions uses SEO target titles instead of technical entry slugs", () => {
  const plan = planAssistantActions({
    prompt: "co widzisz w seo manager?",
    context: {
      page: "/admin/seo",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-20T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [
          {
            id: "seo-entry",
            targetType: "entry",
            targetId: "entry-123",
            targetTitle: "Modern House Project",
            slug: "/entry-123",
            title: null,
            status: "warning",
          },
        ],
        warnings: [],
      },
    },
  });

  expect(plan.responseKind).toBe("inspection");
  expect(plan.inspection?.resourceKind).toBe("seo-document");
  expect(plan.inspection?.candidates[0]).toMatchObject({
    label: "Modern House Project",
    slug: "/entry-123",
    status: "warning",
  });
  expect(plan.answer).toContain("Modern House Project");
});

test("planAssistantActions gates direct post mutation prompts", () => {
  const plan = planAssistantActions({
    prompt: "utworz post blogowy o tytule Test",
    context: {
      page: "/admin/posts",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("post-create-gated");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions gates media upload prompts", () => {
  const plan = planAssistantActions({
    prompt: "wgraj nowy obraz z internetu",
    context: { page: "/admin/media", locale: "pl-PL" },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("media-create-gated");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds ready refinement plan for house-project filters", () => {
  const plan = planAssistantActions({
    prompt: "dodaj filtr po metrazu i liczbie pokoi",
    context: {
      page: "/admin/advanced/widgets",
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

test("planAssistantActions gates direct site-kit context before executable actions", () => {
  const plan = planAssistantActions({
    prompt: "prepare a starter site kit",
    context: {
      locale: "en",
      siteKit: {
        businessType: "automotive_workshop",
        goals: ["online_booking"],
        locale: "en",
        selectedKitId: "automotive-workshop",
        enabledStepIds: ["settings", "pages", "qa"],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentFamily).toBe("site_kit");
  expect(plan.responseKind).toBe("gated");
  expect(plan.actions).toEqual([]);
  expect(plan.answer).toContain("reviewed LLM Guide site-builder intake");
});

test("planAssistantActions accepts enriched resource catalog context without DB imports", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
    context: {
      page: "/admin/advanced/engine",
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
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("product-catalog");
});
