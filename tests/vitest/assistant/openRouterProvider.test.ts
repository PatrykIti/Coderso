import { expect, test } from "vitest";

import { createOpenRouterProvider } from "../../../core/services/assistant/providers/openRouterProvider";

test("createOpenRouterProvider maps request and response", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchMock: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({
        id: "or-req-1",
        choices: [
          {
            message: {
              content: "Use Hero Visual tab in template editor [1].",
            },
          },
        ],
        usage: {
          prompt_tokens: 123,
          completion_tokens: 45,
          total_tokens: 168,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const provider = createOpenRouterProvider({
    apiKey: "sk-or-v1-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: fetchMock,
    retryCount: 0,
  });

  const result = await provider.complete({
    systemPrompt: "Strict RAG mode",
    userMessage: "Where are hero settings?",
    snippets: [
      {
        path: "docs/coderso/widget-template-editor.md",
        heading: "Step By Step",
        content: "Open Widgets and choose Hero visual tab.",
      },
    ],
    limits: {
      maxInputTokens: 8192,
      maxOutputTokens: 512,
      timeoutMs: 1000,
    },
  });

  expect(result.text).toBe("Use Hero Visual tab in template editor [1].");
  expect(result.providerRequestId).toBe("or-req-1");
  expect(result.usage).toEqual({
    inputTokens: 123,
    outputTokens: 45,
    totalTokens: 168,
  });

  expect(calls.length).toBe(1);
  expect(String(calls[0]?.input)).toContain("/chat/completions");
  const requestBody = JSON.parse(String(calls[0]?.init?.body)) as {
    model: string;
    max_tokens: number;
    messages: Array<{ role: string; content: string }>;
  };
  expect(requestBody.model).toBe("google/gemma-3n-e2b-it:free");
  expect(requestBody.max_tokens).toBe(512);
  expect(requestBody.messages[1]?.content).toContain("Documentation snippets");
  expect(requestBody.messages[1]?.content).toContain("docs/coderso/widget-template-editor.md");
});

test("createOpenRouterProvider sends raw user message for planning calls without snippets", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchMock: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({
        id: "or-plan-1",
        choices: [
          {
            message: {
              content: "{\"operation\":\"inspect\",\"resourceKind\":\"custom-screen\"}",
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const provider = createOpenRouterProvider({
    apiKey: "sk-or-v1-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: fetchMock,
    retryCount: 0,
  });

  await provider.complete({
    systemPrompt: "Return JSON",
    userMessage: "{\"prompt\":\"inspect screens\"}",
    snippets: [],
    limits: {
      maxInputTokens: 8192,
      maxOutputTokens: 512,
      timeoutMs: 1000,
    },
  });

  const requestBody = JSON.parse(String(calls[0]?.init?.body)) as {
    messages: Array<{ role: string; content: string }>;
  };
  expect(requestBody.messages[1]?.content).toBe("{\"prompt\":\"inspect screens\"}");
  expect(requestBody.messages[1]?.content).not.toContain("Documentation snippets");
});

test("createOpenRouterProvider retries once on retryable HTTP status", async () => {
  let attempts = 0;
  const fetchMock: typeof fetch = async () => {
    attempts += 1;
    if (attempts === 1) {
      return new Response(JSON.stringify({ error: { message: "temporary issue" } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        id: "or-req-2",
        choices: [{ message: { content: "Recovered answer [1]." } }],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const provider = createOpenRouterProvider({
    apiKey: "sk-or-v1-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: fetchMock,
    retryCount: 1,
  });

  const result = await provider.complete({
    systemPrompt: "Strict RAG mode",
    userMessage: "Question",
    snippets: [{ path: "_docs/a.md", heading: "h", content: "c" }],
    limits: {
      maxInputTokens: 8192,
      maxOutputTokens: 128,
      timeoutMs: 1000,
    },
  });

  expect(attempts).toBe(2);
  expect(result.text).toBe("Recovered answer [1].");
});

test("createOpenRouterProvider throws on non-retryable failure", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: "unauthorized" } }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

  const provider = createOpenRouterProvider({
    apiKey: "sk-or-v1-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: fetchMock,
    retryCount: 1,
  });

  await expect(
    provider.complete({
      systemPrompt: "Strict RAG mode",
      userMessage: "Question",
      snippets: [{ path: "_docs/a.md", heading: "h", content: "c" }],
      limits: {
        maxInputTokens: 8192,
        maxOutputTokens: 128,
        timeoutMs: 1000,
      },
    })
  ).rejects.toThrow("assistant_provider_failed");
});

test("createOpenRouterProvider handles timeout as provider failure", async () => {
  const fetchMock: typeof fetch = async (_input, init) =>
    await new Promise<Response>((_resolve, reject) => {
      const abortError = new Error("aborted");
      abortError.name = "AbortError";
      init?.signal?.addEventListener("abort", () => reject(abortError));
    });

  const provider = createOpenRouterProvider({
    apiKey: "sk-or-v1-test",
    model: "google/gemma-3n-e2b-it:free",
    fetchImpl: fetchMock,
    retryCount: 0,
  });

  await expect(
    provider.complete({
      systemPrompt: "Strict RAG mode",
      userMessage: "Question",
      snippets: [{ path: "_docs/a.md", heading: "h", content: "c" }],
      limits: {
        maxInputTokens: 8192,
        maxOutputTokens: 128,
        timeoutMs: 5,
      },
    })
  ).rejects.toThrow("assistant_provider_failed");
});
