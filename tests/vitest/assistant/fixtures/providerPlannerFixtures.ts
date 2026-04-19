import type { AssistantProvider } from "../../../../core/services/assistant/providers/providerTypes";
import type { AssistantActionContext } from "../../../../core/services/assistant/actionPlanTypes";

export type ProviderPlannerFixture = {
  name: string;
  prompt: string;
  context?: AssistantActionContext;
  llmAvailable: boolean;
  provider: AssistantProvider | null;
  expected: {
    status: "ready" | "needs_input";
    intentId?: string;
    intentFamily?: string;
    summaryIncludes?: string;
    actionType?: string;
  };
};

const fakeProvider = (text: string): AssistantProvider => ({
  id: "fake",
  complete: async () => ({ text }),
});

const failingProvider: AssistantProvider = {
  id: "fake",
  complete: async () => {
    throw new Error("timeout");
  },
};

export const providerPlannerFixtures: ProviderPlannerFixture[] = [
  {
    name: "provider CMS operation draft inspection",
    prompt: "sprawdz jakie ekrany customowe sa widoczne",
    context: {
      page: "/admin/coderso/custom-screens",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-16T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [
          {
            id: "screen-house",
            name: "House Projects",
            contentTypeId: "ct-house",
            status: "active",
            showInSidebar: true,
            sidebarLabel: "House Projects",
            writableBindingFields: [],
            bindings: [],
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        warnings: [],
      },
    },
    llmAvailable: true,
    provider: fakeProvider(
      JSON.stringify({
        operation: "inspect",
        resourceKind: "custom-screen",
      })
    ),
    expected: {
      status: "ready",
      intentId: "cms-resource-inspect",
      summaryIncludes: "custom-screen candidate",
    },
  },
  {
    name: "provider broad destructive operation asks for target clarification",
    prompt: "usun customowe ekrany",
    context: {
      page: "/admin/coderso/custom-screens",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-16T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [
          {
            id: "screen-house",
            name: "House Projects",
            contentTypeId: "ct-house",
            status: "active",
            showInSidebar: true,
            sidebarLabel: "House Projects",
            writableBindingFields: [],
            bindings: [],
          },
          {
            id: "screen-products",
            name: "Products",
            contentTypeId: "ct-products",
            status: "draft",
            showInSidebar: false,
            sidebarLabel: null,
            writableBindingFields: [],
            bindings: [],
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        warnings: [],
      },
    },
    llmAvailable: true,
    provider: fakeProvider(
      JSON.stringify({
        operation: "delete",
        resourceKind: "custom-screen",
        constraints: {
          destructive: true,
          requiresConfirmation: true,
        },
      })
    ),
    expected: {
      status: "needs_input",
      intentId: "cms-custom-screen-delete-needs-input",
      summaryIncludes: "not precise enough",
    },
  },
  {
    name: "provider invented target id fails closed",
    prompt: "usun strone Pysiek",
    llmAvailable: true,
    provider: fakeProvider(
      JSON.stringify({
        operation: "delete",
        resourceKind: "page",
        targetQuery: {
          id: "invented-page-id",
        },
      })
    ),
    expected: {
      status: "needs_input",
      summaryIncludes: "not precise enough",
    },
  },
  {
    name: "malformed provider JSON falls back locally",
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
    llmAvailable: true,
    provider: fakeProvider("{ this is not json"),
    expected: {
      status: "ready",
      intentId: "product-catalog",
      intentFamily: "product_catalog",
    },
  },
  {
    name: "provider fenced CMS operation draft inspection",
    prompt: "sprawdz jakie ekrany customowe sa widoczne",
    context: {
      page: "/admin/coderso/custom-screens",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-16T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [
          {
            id: "screen-house",
            name: "House Projects",
            contentTypeId: "ct-house",
            status: "active",
            showInSidebar: true,
            sidebarLabel: "House Projects",
            writableBindingFields: [],
            bindings: [],
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        warnings: [],
      },
    },
    llmAvailable: true,
    provider: fakeProvider(
      [
        "```json",
        JSON.stringify({
          operation: "inspect",
          resourceKind: "custom-screen",
        }),
        "```",
      ].join("\n")
    ),
    expected: {
      status: "ready",
      intentId: "cms-resource-inspect",
      summaryIncludes: "custom-screen candidate",
    },
  },
  {
    name: "provider repaired CMS operation draft inspection",
    prompt: "sprawdz jakie ekrany customowe sa widoczne",
    context: {
      page: "/admin/coderso/custom-screens",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-16T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [
          {
            id: "screen-house",
            name: "House Projects",
            contentTypeId: "ct-house",
            status: "active",
            showInSidebar: true,
            sidebarLabel: "House Projects",
            writableBindingFields: [],
            bindings: [],
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        warnings: [],
      },
    },
    llmAvailable: true,
    provider: fakeProvider(
      JSON.stringify({
        operation: "inspect",
        resourceKind: "custom-screen",
        "optional targetQuery": {
          filters: [{ field: "showInSidebar", operator: "eq", value: true }],
        },
        constraints: {
          returnFields: ["name"],
        },
      })
    ),
    expected: {
      status: "ready",
      intentId: "cms-resource-inspect",
      summaryIncludes: "custom-screen candidate",
    },
  },
  {
    name: "provider uses surface hint for Screens instead of target query",
    prompt: "no a jakies sa opublikowane w sekcji Screens?",
    context: {
      page: "/admin/coderso/custom-screens",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-17T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [
          {
            id: "screen-house",
            name: "House Projects",
            contentTypeId: "ct-house",
            status: "active",
            showInSidebar: true,
            sidebarLabel: "House Projects",
            writableBindingFields: [],
            bindings: [],
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        warnings: [],
      },
    },
    llmAvailable: true,
    provider: fakeProvider(
      JSON.stringify({
        operation: "inspect",
        resourceKind: "custom-screen",
        surfaceHint: "Screens",
        filters: [{ field: "status", operator: "eq", value: "active" }],
        targetQuery: null,
        mutation: null,
        constraints: null,
      })
    ),
    expected: {
      status: "ready",
      intentId: "cms-resource-inspect",
      summaryIncludes: "custom-screen candidate",
    },
  },
  {
    name: "provider action array is ignored",
    prompt: "create a draft product entry",
    llmAvailable: true,
    provider: fakeProvider(
      JSON.stringify({
        intentId: "provider-entry",
        intentFamily: "product_catalog",
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
    expected: {
      status: "needs_input",
      intentId: "generic-guide-needs-input",
    },
  },
  {
    name: "unsafe provider draft",
    prompt: "delete the database",
    llmAvailable: true,
    provider: fakeProvider(
      JSON.stringify({
        actions: [
          {
            type: "database.drop",
            input: {},
          },
        ],
      })
    ),
    expected: {
      status: "needs_input",
      intentId: "generic-guide-needs-input",
    },
  },
  {
    name: "provider error fallback",
    prompt: "potrzebuje katalogu uslug dla firmy sprzatajacej",
    llmAvailable: true,
    provider: failingProvider,
    expected: {
      status: "ready",
      intentId: "services-directory",
      intentFamily: "services_directory",
    },
  },
  {
    name: "provider unavailable fallback",
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
    llmAvailable: false,
    provider: fakeProvider(
      JSON.stringify({
        actions: [
          {
            type: "database.drop",
            input: {},
          },
        ],
      })
    ),
    expected: {
      status: "ready",
      intentId: "product-catalog",
      intentFamily: "product_catalog",
    },
  },
];
