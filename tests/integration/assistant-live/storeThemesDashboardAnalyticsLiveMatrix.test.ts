import { expect, test } from "bun:test";

import {
  createEnabledLiveProviderRuntimes,
  planWithLiveProvider,
  type LiveProviderRuntime,
} from "./liveCmsHarness";

const providers = createEnabledLiveProviderRuntimes();
const testIfLive = providers.length > 0 ? test : test.skip;

const context = {
  page: "/admin",
  locale: "pl-PL",
  resourceCatalog: {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    budget: { maxItemsPerGroup: 20, maxFieldsPerResource: 24, truncated: false },
    pages: [],
    contentTypes: [],
    customScreens: [],
    listings: { queries: [], templates: [] },
    forms: [],
    menus: [],
    seoDocuments: [],
    widgets: [],
    warnings: [],
  },
} as const;

const assertNoExecutableActions = async (provider: LiveProviderRuntime, prompt: string) => {
  const plan = await planWithLiveProvider({ provider, context, prompt });
  expect(plan.actions, `${provider.id}:${prompt}`).toEqual([]);
  expect(plan.responseKind, `${provider.id}:${prompt}`).not.toBe("action_plan");
};

const runMatrixForProvider = async (provider: LiveProviderRuntime) => {
  await assertNoExecutableActions(provider, "Pokaz status dashboard i ostatnie aktywnosci");
  await assertNoExecutableActions(provider, "Zainstaluj plugin SEO Boost ze sklepu pluginow");
  await assertNoExecutableActions(provider, "Zmien Admin UI Theme na ciemny profil");
  await assertNoExecutableActions(provider, "Usun wszystkie dane analytics z ostatniego miesiaca");
};

testIfLive(
  "assistant live providers keep store themes dashboard analytics non-executable without typed contracts",
  async () => {
    for (const provider of providers) {
      await runMatrixForProvider(provider);
    }
  },
  120_000
);
