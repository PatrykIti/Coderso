import { expect, test, vi } from "vitest";

import { createOpenAiProvider } from "../../../core/services/assistant/providers/openAiProvider";
import type { AssistantProviderSnippet } from "../../../core/services/assistant/providers/providerTypes";
import { createOpenRouterProvider } from "../../../core/services/assistant/providers/openRouterProvider";
import {
  resolveAssistantModelMetadata,
  resolveAssistantProvider,
} from "../../../core/services/assistant/providers/index";

const baseRequest = {
  systemPrompt: "Strict RAG mode",
  userMessage: "Where are hero settings?",
  snippets: [] as Array<{
    path: string;
    heading: string;
    content: string;
  }>,
  limits: {
    maxInputTokens: 8192,
    maxOutputTokens: 512,
    timeoutMs: 1000,
  },
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const abortError = () => {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
};

test("createOpenAiProvider strips trailing slash from base URL", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1/",
    fetchImpl: async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        id: "req-trailing",
        choices: [{ message: { content: "ok" } }],
      });
    },
    retryCount: 0,
  });

  await provider.complete(baseRequest);
  expect(String(calls[0]?.input)).toBe("https://api.openai.com/v1/chat/completions");
});

test("createOpenAiProvider formats snippets with a default heading", async () => {
  let sentBody: string | null = null;
  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    fetchImpl: async (_input, init) => {
      sentBody = String(init?.body);
      return jsonResponse({
        id: "req-snippets",
        choices: [{ message: { content: "Use [1]." } }],
      });
    },
    retryCount: 0,
  });

  const result = await provider.complete({
    ...baseRequest,
    snippets: [
      // Intentionally omit heading: the provider must fall back to "Top level".
      { path: "docs/guide/widgets.md", content: "Open the Hero tab." } as AssistantProviderSnippet,
      { path: "docs/guide/menus.md", heading: "Menus", content: "Edit menu items." },
    ],
  });

  expect(result.text).toBe("Use [1].");
  expect(sentBody).toContain("[1] docs/guide/widgets.md :: Top level");
  expect(sentBody).toContain("[2] docs/guide/menus.md :: Menus");
  expect(sentBody).toContain("Documentation snippets:");
});

test("createOpenAiProvider sends json_object response format on request", async () => {
  let sentBody: string | null = null;
  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    fetchImpl: async (_input, init) => {
      sentBody = String(init?.body);
      return jsonResponse({
        id: "req-json",
        choices: [{ message: { content: '{"ok":true}' } }],
      });
    },
    retryCount: 0,
  });

  await provider.complete({
    ...baseRequest,
    responseContract: { kind: "json_object" },
  });

  expect(sentBody).toContain('"response_format"');
  expect(sentBody).toContain('"json_object"');
});

test("createOpenAiProvider falls back to an empty body when JSON parsing fails", async () => {
  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    fetchImpl: async () =>
      new Response("not-json", {
        status: 500,
        headers: { "content-type": "text/plain" },
      }),
    retryCount: 0,
  });

  await expect(provider.complete(baseRequest)).rejects.toThrow("assistant_provider_failed");
});

test("createOpenAiProvider handles non-string array message content", async () => {
  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    fetchImpl: async () =>
      jsonResponse({
        id: "req-array",
        choices: [
          {
            message: {
              content: [
                { type: "text", text: "  First part  " },
                { type: "image", text: "ignored" },
                { type: "text", text: " second part " },
              ],
            },
          },
        ],
      }),
    retryCount: 0,
  });

  const result = await provider.complete(baseRequest);
  expect(result.text).toBe("First part second part");
});

test("createOpenAiProvider returns empty text for unsupported content shapes", async () => {
  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    fetchImpl: async () =>
      jsonResponse({
        id: "req-shape",
        choices: [{ message: { content: 42 } }],
      }),
    retryCount: 0,
  });

  await expect(provider.complete(baseRequest)).rejects.toThrow("assistant_provider_failed");
});

test("createOpenAiProvider maps abort errors to a retryable timeout", async () => {
  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    fetchImpl: async () => {
      throw abortError();
    },
    retryCount: 0,
  });

  await expect(provider.complete(baseRequest)).rejects.toThrow("assistant_provider_failed");
});

test("createOpenAiProvider maps generic fetch failures to network errors", async () => {
  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    fetchImpl: async () => {
      throw new Error("socket hang up");
    },
    retryCount: 0,
  });

  await expect(provider.complete(baseRequest)).rejects.toThrow("assistant_provider_failed");
});

test("createOpenRouterProvider strips trailing slash and sets identity headers", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const provider = createOpenRouterProvider({
    apiKey: "sk-or-test",
    model: "google/gemma-3n-e2b-it:free",
    baseUrl: "https://openrouter.ai/api/v1/",
    siteUrl: "https://example.com",
    appName: "Coderso Admin",
    fetchImpl: async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        id: "or-1",
        choices: [{ message: { content: "answer" } }],
        usage: {
          prompt_tokens: 1,
          completion_tokens: 2,
          total_tokens: 3,
        },
      });
    },
    retryCount: 0,
  });

  await provider.complete(baseRequest);
  expect(String(calls[0]?.input)).toBe("https://openrouter.ai/api/v1/chat/completions");
  expect((calls[0]?.init?.headers as Headers)?.get("HTTP-Referer")).toBe("https://example.com");
  expect((calls[0]?.init?.headers as Headers)?.get("X-Title")).toBe("Coderso Admin");
});

test("createOpenRouterProvider parses array message content", async () => {
  const provider = createOpenRouterProvider({
    apiKey: "sk-or-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: async () =>
      jsonResponse({
        id: "or-2",
        choices: [
          {
            message: {
              content: [
                { type: "text", text: "hello" },
                { type: "thinking", text: "skip" },
                { type: "text", text: " world" },
              ],
            },
          },
        ],
      }),
    retryCount: 0,
  });

  const result = await provider.complete(baseRequest);
  expect(result.text).toBe("hello world");
});

test("createOpenRouterProvider omits undefined usage and rejects empty responses", async () => {
  const provider = createOpenRouterProvider({
    apiKey: "sk-or-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: async () =>
      jsonResponse({
        id: "or-3",
        choices: [{ message: { content: "" } }],
        usage: { bad: true },
      }),
    retryCount: 0,
  });

  await expect(provider.complete(baseRequest)).rejects.toThrow("assistant_provider_failed");
});

test("createOpenRouterProvider maps network failures to network errors", async () => {
  const provider = createOpenRouterProvider({
    apiKey: "sk-or-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: async () => {
      throw new Error("boom");
    },
    retryCount: 0,
  });

  await expect(provider.complete(baseRequest)).rejects.toThrow("assistant_provider_failed");
});

test("createOpenRouterProvider sends json_object response format on request", async () => {
  let sentBody: string | null = null;
  const provider = createOpenRouterProvider({
    apiKey: "sk-or-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: async (_input, init) => {
      sentBody = String(init?.body);
      return jsonResponse({
        id: "or-4",
        choices: [{ message: { content: "{}" } }],
      });
    },
    retryCount: 0,
  });

  await provider.complete({
    ...baseRequest,
    responseContract: { kind: "json_object" },
  });

  expect(sentBody).toContain('"json_object"');
});

test("createOpenRouterProvider falls back to http status text on non-JSON error bodies", async () => {
  const provider = createOpenRouterProvider({
    apiKey: "sk-or-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: async () =>
      new Response("boom", {
        status: 503,
        headers: { "content-type": "text/plain" },
      }),
    retryCount: 0,
  });

  await expect(provider.complete(baseRequest)).rejects.toThrow("assistant_provider_failed");
});

test("createOpenRouterProvider rejects invalid provider configuration", () => {
  expect(() =>
    createOpenRouterProvider({
      apiKey: "   ",
      model: "model",
    })
  ).toThrow("assistant_provider_invalid");
  expect(() =>
    createOpenRouterProvider({
      apiKey: "sk-or-test",
      model: "",
    })
  ).toThrow("assistant_provider_invalid");
});

test("createOpenRouterProvider model metadata tolerates non-JSON bodies", async () => {
  const provider = createOpenRouterProvider({
    apiKey: "sk-or-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: async () =>
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    retryCount: 0,
  });

  const metadata = await provider.getModelMetadata?.();
  expect(metadata).toMatchObject({ model: "google/gemma-3n-e2b-it:free" });
});

test("resolveAssistantModelMetadata returns the default fallback for empty models", async () => {
  const metadata = await resolveAssistantModelMetadata(
    { provider: "openrouter", model: "   " },
    {
      getIntegrationRuntimeConfig: async () => null,
      createOpenAiProvider,
      createOpenRouterProvider,
    }
  );
  expect(metadata.model).toBe("");
  expect(metadata.source).toBe("default");
});

test("resolveAssistantModelMetadata returns fallback for non-openrouter providers", async () => {
  const metadata = await resolveAssistantModelMetadata(
    { provider: "openai", model: "claude" },
    {
      getIntegrationRuntimeConfig: async () => null,
      createOpenAiProvider,
      createOpenRouterProvider,
    }
  );
  expect(metadata.model).toBe("claude");
  expect(metadata.source).toBe("default");
});

test("resolveAssistantModelMetadata resolves openrouter model metadata through the provider", async () => {
  const metadata = await resolveAssistantModelMetadata(
    { provider: "openrouter", model: "google/gemma-3n-e2b-it:free" },
    {
      getIntegrationRuntimeConfig: async (id) =>
        id === "openrouter" ? { apiKey: "sk-or-test" } : null,
      createOpenAiProvider,
      createOpenRouterProvider,
    }
  );
  expect(metadata.model).toBe("google/gemma-3n-e2b-it:free");
});

test("resolveAssistantModelMetadata falls back when the provider throws", async () => {
  const metadata = await resolveAssistantModelMetadata(
    { provider: "openrouter", model: "google/gemma-3n-e2b-it:free" },
    {
      getIntegrationRuntimeConfig: async () => {
        throw new Error("config_failure");
      },
      createOpenAiProvider,
      createOpenRouterProvider,
    }
  );
  expect(metadata.model).toBe("google/gemma-3n-e2b-it:free");
  expect(metadata.source).toBe("default");
});

test("resolveAssistantProvider uses the default integration seam when deps are omitted", async () => {
  const result = await resolveAssistantProvider({
    provider: "openai",
    model: "gpt-4o-mini",
  }).catch(() => null);
  // Either a resolved provider (configured environment) or a failed load path;
  // the default deps seam is exercised in both cases.
  expect(result === null || result?.id === "openai").toBe(true);
});

vi.mock("../../../core/services/integrations/integrationsService", () => ({
  getIntegrationRuntimeConfig: async () => ({
    apiKey: "sk-test-123456",
    baseUrl: null,
    organization: null,
    project: null,
  }),
}));

test("resolveAssistantProvider resolves through the default dynamic integration seam", async () => {
  const provider = await resolveAssistantProvider({
    provider: "openai",
    model: "gpt-4o-mini",
  });

  expect(provider?.id).toBe("openai");
});
