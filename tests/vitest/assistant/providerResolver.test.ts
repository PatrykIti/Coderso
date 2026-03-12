import { expect, test } from "vitest";

import { resolveAssistantProvider } from "../../../core/services/assistant/providers";

test("resolveAssistantProvider returns null when provider is none", async () => {
  const provider = await resolveAssistantProvider(
    {
      provider: "none",
      model: "google/gemma-3n-e2b-it:free",
    },
    {
      getIntegrationRuntimeConfig: async () => ({
        apiKey: "sk-or-v1-test",
      }),
      createOpenRouterProvider: () => ({
        id: "openrouter",
        complete: async () => ({ text: "ok" }),
      }),
    }
  );

  expect(provider).toBeNull();
});

test("resolveAssistantProvider returns provider when OpenRouter config is valid", async () => {
  const provider = await resolveAssistantProvider(
    {
      provider: "openrouter",
      model: "google/gemma-3n-e2b-it:free",
    },
    {
      getIntegrationRuntimeConfig: async () => ({
        apiKey: "sk-or-v1-test",
        baseUrl: "https://openrouter.ai/api/v1",
      }),
      createOpenRouterProvider: () => ({
        id: "openrouter",
        complete: async () => ({ text: "ok" }),
      }),
    }
  );

  expect(provider?.id).toBe("openrouter");
});

test("resolveAssistantProvider returns null when OpenRouter API key is missing", async () => {
  const provider = await resolveAssistantProvider(
    {
      provider: "openrouter",
      model: "google/gemma-3n-e2b-it:free",
    },
    {
      getIntegrationRuntimeConfig: async () => ({
        apiKey: null,
      }),
      createOpenRouterProvider: () => ({
        id: "openrouter",
        complete: async () => ({ text: "ok" }),
      }),
    }
  );

  expect(provider).toBeNull();
});
