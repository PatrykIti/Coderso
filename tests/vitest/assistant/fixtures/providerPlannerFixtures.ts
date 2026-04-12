import type { AssistantProvider } from "../../../../core/services/assistant/providers/providerTypes";

export type ProviderPlannerFixture = {
  name: string;
  prompt: string;
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
