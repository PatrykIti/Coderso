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
    name: "provider ready draft",
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
      status: "ready",
      intentId: "provider-entry",
      actionType: "entry.upsert-draft",
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
      summaryIncludes: "unsupported actions",
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
