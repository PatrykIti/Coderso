import { expect, test } from "bun:test";
import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";

import {
  createEnabledLiveProviderRuntimes,
  planWithLiveProvider,
  type LiveProviderRuntime,
} from "./liveCmsHarness";

const providers = createEnabledLiveProviderRuntimes();
const testIfLive = providers.length > 0 ? test : test.skip;

const context = {
  page: "/admin/advanced",
  locale: "pl-PL",
  includeResourceCatalog: true,
  resourceCatalog: {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    budget: { maxItemsPerGroup: 100, maxFieldsPerResource: 24, truncated: false },
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
} as unknown as AssistantActionContext;

const assertGated = async (provider: LiveProviderRuntime, prompt: string) => {
  const plan = await planWithLiveProvider({
    provider,
    context,
    prompt,
  });
  expect(plan.actions, `${provider.id}:${prompt}`).toEqual([]);
  expect(plan.responseKind, `${provider.id}:${prompt}`).not.toBe("action_plan");
};

const runOperationsMatrixForProvider = async (provider: LiveProviderRuntime) => {
  await assertGated(provider, "Skonfiguruj booking dla salonu fryzjerskiego");
  await assertGated(provider, "Dodaj checkout payment do sklepu produktowego");
  await assertGated(provider, "Usun wszystkie reviews z panelu Reviews");
  await assertGated(provider, "Utworz popup promocyjny z rabatem 10 procent");
  await assertGated(provider, "Zarekomenduj i zainstaluj solution kit dla warsztatu samochodowego");
};

testIfLive(
  "assistant live providers keep unsupported Advanced operation modules gated",
  async () => {
    for (const provider of providers) {
      await runOperationsMatrixForProvider(provider);
    }
  },
  120_000
);
