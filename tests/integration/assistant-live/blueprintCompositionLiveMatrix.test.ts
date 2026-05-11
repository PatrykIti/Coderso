import { expect, test } from "bun:test";
import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";

import {
  createEnabledLiveProviderRuntimes,
  planWithLiveProvider,
  type LiveProviderRuntime,
} from "./liveCmsHarness";

const providers = createEnabledLiveProviderRuntimes();
const testIfLive = providers.length > 0 ? test : test.skip;

const context: AssistantActionContext = {
  page: "/admin/advanced/widgets",
  locale: "en-US",
};

const runCompositionMatrixForProvider = async (provider: LiveProviderRuntime) => {
  const productPlan = await planWithLiveProvider({
    provider,
    context,
    prompt: "Create a product catalog with inquiry form and a blog hub.",
  });
  expect(productPlan.status, provider.id).toBe("ready");
  expect(productPlan.intentId, provider.id).toBe("blueprint-composed-product-catalog");
  expect(
    productPlan.actions.map((action) => action.type),
    provider.id
  ).toEqual([
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "form.upsert",
    "page.upsert",
    "page.upsert",
    "setting.content-route.upsert",
  ]);
  expect(productPlan.metadata?.blueprintComposition, provider.id).toMatchObject({
    primaryCapabilityId: "product-catalog",
    adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
    gatedCapabilityIds: [],
  });

  const bookingPlan = await planWithLiveProvider({
    provider,
    context,
    prompt: "Build a services directory with gated booking and a contact form.",
  });
  expect(bookingPlan.status, provider.id).toBe("needs_input");
  expect(bookingPlan.responseKind, provider.id).toBe("gated");
  expect(bookingPlan.actions, provider.id).toEqual([]);
  expect(bookingPlan.metadata?.blueprintComposition, provider.id).toMatchObject({
    primaryCapabilityId: "services-directory",
    adjunctCapabilityIds: ["lead-capture-site"],
    gatedCapabilityIds: ["booking-service"],
  });

  const checkoutPlan = await planWithLiveProvider({
    provider,
    context,
    prompt: "Create a product catalog with checkout payments.",
  });
  expect(checkoutPlan.status, provider.id).toBe("needs_input");
  expect(checkoutPlan.responseKind, provider.id).toBe("gated");
  expect(checkoutPlan.actions, provider.id).toEqual([]);
  expect(checkoutPlan.metadata?.blueprintComposition, provider.id).toMatchObject({
    primaryCapabilityId: "product-catalog",
    gatedCapabilityIds: ["checkout-payment"],
  });
};

testIfLive(
  "assistant live providers keep blueprint composition local-first and gated where required",
  async () => {
    for (const provider of providers) {
      await runCompositionMatrixForProvider(provider);
    }
  },
  120_000
);
