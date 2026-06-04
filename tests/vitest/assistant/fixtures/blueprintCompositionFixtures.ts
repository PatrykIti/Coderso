import type {
  AssistantActionContext,
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPlannedAction,
} from "../../../../core/services/assistant/actionPlanTypes";
import type { AssistantResourceCatalogSnapshot } from "../../../../core/services/assistant/adminContextTypes";

export const mabudoLikePromptSourcePath = "_docs/_PROMPTS/mabudo-like-prompt.md";

export const mabudoLikePrompt =
  "Zrob mi strone jak Mabudo: katalog projektow domow z filtrami, kartami, stronami szczegolowymi, formularzem zapytania, realizacjami, poradnikiem, menu i wygodna edycja w adminie.";

type ExpectedActionType = AssistantPlannedAction["type"];

export type BlueprintCompositionPlanFixture = {
  name: string;
  prompt: string;
  context: AssistantActionContext;
  promptSourcePath?: string;
  expected: {
    status: AssistantActionPlan["status"];
    responseKind?: AssistantActionPlan["responseKind"];
    intentId: string;
    intentFamily?: AssistantIntentFamily;
    actionTypes: ExpectedActionType[];
    pageSlugs?: string[];
    primaryCapabilityId?: string;
    adjunctCapabilityIds?: string[];
    gatedCapabilityIds?: string[];
    mergedResourceKeys?: string[];
    existingMatchResourceKeys?: string[];
    unresolvedConflictCodes?: string[];
    schemaFields?: string[];
    serializedExcludes?: string[];
  };
};

export type BlueprintCompositionProviderFixture = {
  name: string;
  prompt: string;
  context: AssistantActionContext;
  llmAvailable: boolean;
  providerDraft: unknown;
  expectProviderNotCalled?: boolean;
  expected:
    | {
        error: "assistant_llm_unavailable";
      }
    | {
        status: AssistantActionPlan["status"];
        responseKind?: AssistantActionPlan["responseKind"];
        intentId?: string;
        actionTypes?: ExpectedActionType[];
        summaryIncludes?: string;
        serializedExcludes?: string[];
      };
};

export const createCompositionCatalog = (
  overrides: Partial<AssistantResourceCatalogSnapshot> = {}
): AssistantResourceCatalogSnapshot => {
  const base: AssistantResourceCatalogSnapshot = {
    schemaVersion: 1,
    generatedAt: "2026-05-10T10:00:00.000Z",
    budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
    pages: [],
    posts: [],
    entries: [],
    contentTypes: [],
    customScreens: [],
    detailPages: [],
    listings: { queries: [], templates: [] },
    forms: [],
    menus: [],
    seoDocuments: [],
    widgets: [],
    media: [],
    warnings: [],
  };

  return {
    ...base,
    ...overrides,
    listings: {
      queries: overrides.listings?.queries ?? base.listings.queries,
      templates: overrides.listings?.templates ?? base.listings.templates,
    },
  };
};

const baseContext = (context: Partial<AssistantActionContext> = {}): AssistantActionContext => ({
  page: "/admin/advanced/widgets",
  locale: "en-US",
  ...context,
});

export const productCatalogReuseContext = baseContext({
  includeResourceCatalog: true,
  resourceCatalog: createCompositionCatalog({
    pages: [{ id: "page-products", title: "Produkty", slug: "/produkty", status: "published" }],
    contentTypes: [
      {
        id: "ct-products",
        slug: "products",
        name: "Products",
        entryCount: 3,
        fields: [],
      },
    ],
    customScreens: [
      {
        id: "screen-products",
        name: "Products",
        contentTypeId: "ct-products",
        status: "active",
        collectionRole: "canonical-admin-screen",
        compositionKey: "products",
        showInSidebar: true,
        sidebarLabel: "Products",
        writableBindingFields: [],
        bindings: [],
      },
    ],
    detailPages: [
      {
        id: "dp-products",
        name: "Products detail",
        status: "published",
        contentTypeId: "ct-products",
        contentTypeSlug: "products",
        linkedRouteType: "content",
        updatedAt: null,
        blockCount: 3,
        bindingCount: 4,
      },
    ],
    listings: {
      queries: [
        {
          id: "lq-products",
          name: "Product Catalog Query",
          description: null,
          source: "entries",
          contentTypeId: "ct-products",
          taxonomyId: null,
          includeDrafts: false,
          fields: ["title", "summary"],
          sort: [],
          limit: null,
        },
      ],
      templates: [
        {
          id: "lt-products",
          name: "Product Catalog Grid",
          slug: "product-catalog-grid",
          description: null,
          layout: "grid",
          configKeys: ["card"],
        },
      ],
    },
    forms: [
      {
        id: "form-inquiry",
        name: "Product Catalog Inquiry",
        slug: "product-catalog-inquiry",
        status: "active",
        submissionAccess: "public",
        fields: [],
      },
    ],
  }),
});

export const detailPageDeleteGuardContext = baseContext({
  page: "/admin/advanced/engine",
  includeResourceCatalog: true,
  resourceCatalog: createCompositionCatalog({
    contentTypes: [
      {
        id: "ct-house",
        slug: "house-projects",
        name: "House Projects",
        entryCount: 0,
        fields: [],
      },
    ],
    detailPages: [
      {
        id: "dp-house",
        name: "House detail",
        status: "published",
        contentTypeId: "ct-house",
        contentTypeSlug: "house-projects",
        linkedRouteType: "content",
        updatedAt: null,
        blockCount: 2,
        bindingCount: 3,
      },
    ],
  }),
});

const singlePackActions: ExpectedActionType[] = [
  "content-type.upsert",
  "detail-page.upsert",
  "setting.content-route.upsert",
  "custom-screen.upsert",
  "listing-query.upsert",
  "listing-template.upsert",
  "page.upsert",
];

export const blueprintCompositionFixtures: BlueprintCompositionPlanFixture[] = [
  {
    name: "single primary house-projects pack stays on current executable pack contract",
    prompt: "I need a house projects catalog.",
    context: baseContext(),
    expected: {
      status: "ready",
      responseKind: "action_plan",
      intentId: "house-projects-catalog",
      intentFamily: "catalog_showcase",
      actionTypes: singlePackActions,
      pageSlugs: ["/projekty-domow"],
      schemaFields: [
        "title",
        "slug",
        "summary",
        "description",
        "heroImage",
        "gallery",
        "areaM2",
        "rooms",
        "bathrooms",
        "floors",
        "priceFrom",
        "location",
        "projectStatus",
      ],
    },
  },
  {
    name: "single primary product catalog remains green",
    prompt: "Create a product catalog for furniture.",
    context: baseContext(),
    expected: {
      status: "ready",
      responseKind: "action_plan",
      intentId: "product-catalog",
      intentFamily: "product_catalog",
      actionTypes: singlePackActions,
      pageSlugs: ["/produkty"],
    },
  },
  {
    name: "single primary services directory remains green",
    prompt: "Create a services directory.",
    context: baseContext(),
    expected: {
      status: "ready",
      responseKind: "action_plan",
      intentId: "services-directory",
      intentFamily: "services_directory",
      actionTypes: singlePackActions,
      pageSlugs: ["/uslugi"],
    },
  },
  {
    name: "product catalog composes inquiry form and editorial hub",
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    context: baseContext(),
    expected: {
      status: "ready",
      responseKind: "action_plan",
      intentId: "blueprint-composed-product-catalog",
      intentFamily: "product_catalog",
      actionTypes: [
        "content-type.upsert",
        "custom-screen.upsert",
        "listing-query.upsert",
        "listing-template.upsert",
        "form.upsert",
        "page.upsert",
        "page.upsert",
        "detail-page.upsert",
        "setting.content-route.upsert",
      ],
      pageSlugs: ["/produkty", "/blog"],
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
      gatedCapabilityIds: [],
      mergedResourceKeys: [
        "content-type:products",
        "detail-page:products",
        "form:product-catalog-inquiry",
        "page:/blog",
        "page:/produkty",
        "route:products",
      ],
    },
  },
  {
    name: "portfolio proof composes lead capture and editorial hub",
    prompt: "Create a portfolio projects site with blog hub and contact form.",
    context: baseContext(),
    expected: {
      status: "ready",
      responseKind: "action_plan",
      intentId: "blueprint-composed-portfolio-projects",
      intentFamily: "portfolio_projects",
      actionTypes: [
        "content-type.upsert",
        "custom-screen.upsert",
        "listing-query.upsert",
        "listing-template.upsert",
        "form.upsert",
        "page.upsert",
        "page.upsert",
        "page.upsert",
        "detail-page.upsert",
        "setting.content-route.upsert",
      ],
      pageSlugs: ["/portfolio", "/kontakt", "/blog"],
      primaryCapabilityId: "portfolio-projects",
      adjunctCapabilityIds: ["lead-capture-site", "editorial-content-hub"],
      gatedCapabilityIds: [],
      mergedResourceKeys: ["detail-page:portfolio-projects", "form:lead-capture-inquiry"],
    },
  },
  {
    name: "gated booking is represented but not executable",
    prompt: "Build a services directory with gated booking and a contact form.",
    context: baseContext(),
    expected: {
      status: "needs_input",
      responseKind: "gated",
      intentId: "blueprint-composed-services-directory-needs-input",
      intentFamily: "services_directory",
      actionTypes: [],
      primaryCapabilityId: "services-directory",
      adjunctCapabilityIds: ["lead-capture-site"],
      gatedCapabilityIds: ["booking-service"],
      unresolvedConflictCodes: ["gated_domain"],
      mergedResourceKeys: ["content-type:services-directory", "detail-page:services-directory"],
    },
  },
  {
    name: "checkout request is gated and does not create commerce resources",
    prompt: "Create a product catalog with checkout payments.",
    context: baseContext(),
    expected: {
      status: "needs_input",
      responseKind: "gated",
      intentId: "blueprint-composed-product-catalog-needs-input",
      intentFamily: "product_catalog",
      actionTypes: [],
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: [],
      gatedCapabilityIds: ["checkout-payment"],
      unresolvedConflictCodes: ["gated_domain"],
      serializedExcludes: ["checkout.payment.upsert", "commerce.product.upsert"],
    },
  },
  {
    name: "Mabudo-like prompt maps to current tier-A house-projects parity",
    prompt: mabudoLikePrompt,
    promptSourcePath: mabudoLikePromptSourcePath,
    context: baseContext({ locale: "pl-PL" }),
    expected: {
      status: "ready",
      responseKind: "action_plan",
      intentId: "house-projects-catalog",
      intentFamily: "catalog_showcase",
      actionTypes: singlePackActions,
      pageSlugs: ["/projekty-domow"],
      schemaFields: [
        "title",
        "slug",
        "summary",
        "description",
        "heroImage",
        "gallery",
        "areaM2",
        "rooms",
        "bathrooms",
        "floors",
        "priceFrom",
        "location",
        "projectStatus",
      ],
      serializedExcludes: ["mabudo-preset", "checkout.payment.upsert", "booking.resource.upsert"],
    },
  },
  {
    name: "server-derived resource catalog records reuse matches on rerun",
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    context: productCatalogReuseContext,
    expected: {
      status: "ready",
      responseKind: "action_plan",
      intentId: "blueprint-composed-product-catalog",
      intentFamily: "product_catalog",
      actionTypes: [
        "content-type.upsert",
        "custom-screen.upsert",
        "listing-query.upsert",
        "listing-template.upsert",
        "form.upsert",
        "page.upsert",
        "page.upsert",
        "detail-page.upsert",
        "setting.content-route.upsert",
      ],
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
      existingMatchResourceKeys: ["listing-query:Product Catalog Query"],
      mergedResourceKeys: ["detail-page:products", "form:product-catalog-inquiry"],
    },
  },
];

export const blueprintCompositionProviderFixtures: BlueprintCompositionProviderFixture[] = [
  {
    name: "Mabudo-like supported setup ignores provider-supplied executable actions",
    prompt: "Build a house projects catalog with contact quote form and poradnik like Mabudo.",
    context: baseContext({ locale: "pl-PL" }),
    llmAvailable: true,
    expectProviderNotCalled: true,
    providerDraft: {
      intentId: "provider-mabudo",
      actions: [
        {
          type: "database.drop",
          input: {},
        },
      ],
    },
    expected: {
      status: "ready",
      responseKind: "action_plan",
      intentId: "blueprint-composed-house-projects-catalog",
      actionTypes: [
        "content-type.upsert",
        "custom-screen.upsert",
        "listing-query.upsert",
        "listing-template.upsert",
        "form.upsert",
        "page.upsert",
        "page.upsert",
        "detail-page.upsert",
        "setting.content-route.upsert",
      ],
      serializedExcludes: ["database.drop", "provider-mabudo"],
    },
  },
  {
    name: "provider action array injection fails closed",
    prompt: "Create a draft product entry from this provider action array.",
    context: baseContext({ page: "/admin/advanced/entries" }),
    llmAvailable: true,
    providerDraft: {
      intentId: "provider-entry",
      actions: [
        {
          type: "entry.upsert-draft",
          input: {
            contentTypeSlug: "products",
            title: "Sample",
            slug: "sample",
            values: { title: "Sample" },
          },
        },
      ],
    },
    expected: {
      status: "needs_input",
      intentId: "entry-create-needs-input",
      actionTypes: [],
      serializedExcludes: ["entry.upsert-draft", "provider-entry"],
    },
  },
  {
    name: "SQL and path injection provider values are not echoed into the plan",
    prompt: "Update the selected page title safely.",
    context: baseContext({ page: "/admin/pages" }),
    llmAvailable: true,
    providerDraft: {
      operation: "update",
      resourceKind: "page",
      mutation: {
        fieldIntent: "title",
        value: "DROP TABLE users; ../../secrets",
      },
    },
    expected: {
      status: "needs_input",
      actionTypes: [],
      serializedExcludes: ["DROP TABLE users", "../../secrets"],
    },
  },
  {
    name: "secret-bearing provider draft is rejected without leaking the secret",
    prompt: "Create a product entry, but do not expose secrets.",
    context: baseContext({ page: "/admin/advanced/entries" }),
    llmAvailable: true,
    providerDraft: {
      operation: "create",
      resourceKind: "entry",
      mutation: {
        patch: {
          items: [
            {
              contentTypeSlug: "products",
              title: "Secret product",
              slug: "secret-product",
              values: {
                title: "Secret product",
                apiKey: "sk-or-v1-red-team-secret",
              },
            },
          ],
        },
      },
    },
    expected: {
      status: "needs_input",
      actionTypes: [],
      serializedExcludes: ["sk-or-v1-red-team-secret", "apiKey"],
    },
  },
  {
    name: "raw media upload bytes remain gated",
    prompt: "Upload raw file bytes into the gallery.",
    context: baseContext({ page: "/admin/media" }),
    llmAvailable: true,
    providerDraft: {
      operation: "create",
      resourceKind: "media",
      mutation: {
        fieldIntent: "upload",
        patch: {
          base64: "rawBytesAAAA",
          mimeType: "image/png",
        },
      },
    },
    expected: {
      status: "needs_input",
      responseKind: "gated",
      intentId: "media-create-gated",
      actionTypes: [],
      serializedExcludes: ["rawBytesAAAA", "base64"],
    },
  },
  {
    name: "ambiguous media filename needs trusted target input",
    prompt: "Attach hero.jpg to the products gallery.",
    context: baseContext({ page: "/admin/media" }),
    llmAvailable: true,
    providerDraft: {
      operation: "update",
      resourceKind: "media",
      mutation: {
        fieldIntent: "reference",
        value: "hero.jpg",
      },
    },
    expected: {
      status: "needs_input",
      intentId: "media-update-needs-input",
      actionTypes: [],
      summaryIncludes: "not precise enough",
    },
  },
  {
    name: "content type delete fixture carries linked detail-page context for executor guard",
    prompt: "Delete the house-projects content type.",
    context: detailPageDeleteGuardContext,
    llmAvailable: true,
    providerDraft: {
      operation: "delete",
      resourceKind: "content-type",
      targetQuery: { exactName: "house-projects" },
      constraints: {
        destructive: true,
        requiresConfirmation: true,
        expectedCount: 1,
      },
    },
    expected: {
      status: "ready",
      responseKind: "action_plan",
      intentId: "content-type-delete",
      actionTypes: ["content-type.delete"],
      serializedExcludes: ["content_type_has_detail_pages"],
    },
  },
  {
    name: "LLM unavailable blocks catalog-backed provider planning",
    prompt: "Do you see the Produkty page in Pages?",
    context: baseContext({
      page: "/admin/pages",
      includeResourceCatalog: true,
      resourceCatalog: createCompositionCatalog({
        pages: [
          {
            id: "page-products",
            title: "Produkty",
            slug: "/produkty",
            status: "published",
          },
        ],
      }),
    }),
    llmAvailable: false,
    providerDraft: null,
    expected: {
      error: "assistant_llm_unavailable",
    },
  },
];
