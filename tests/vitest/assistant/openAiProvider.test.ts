import { expect, test } from "vitest";

import { createOpenAiProvider } from "../../../core/services/assistant/providers/openAiProvider";

test("createOpenAiProvider maps generic JSON schema response contract", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchMock: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({
        id: "chatcmpl-test",
        choices: [
          {
            message: {
              content: "{\"operation\":\"inspect\",\"resourceKind\":\"custom-screen\"}",
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-5.4-nano",
    organization: "org-test",
    project: "proj-test",
    fetchImpl: fetchMock,
    retryCount: 0,
  });

  const response = await provider.complete({
    systemPrompt: "Return JSON",
    userMessage: "{}",
    snippets: [],
    responseContract: {
      kind: "json_schema",
      name: "cms_operation_draft",
      strict: true,
      schema: { type: "object" },
    },
    limits: {
      maxInputTokens: 8192,
      maxOutputTokens: 512,
      timeoutMs: 1000,
    },
  });

  expect(response.text).toBe("{\"operation\":\"inspect\",\"resourceKind\":\"custom-screen\"}");
  expect(response.providerRequestId).toBe("chatcmpl-test");
  expect(response.usage).toEqual({
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
  });

  const requestBody = JSON.parse(String(calls[0]?.init?.body)) as {
    model: string;
    max_completion_tokens: number;
    response_format?: unknown;
    messages: Array<{ role: string; content: string }>;
  };
  expect(String(calls[0]?.input)).toBe("https://api.openai.com/v1/chat/completions");
  expect(requestBody.model).toBe("gpt-5.4-nano");
  expect(requestBody.max_completion_tokens).toBe(512);
  expect(requestBody.response_format).toEqual({
    type: "json_schema",
    json_schema: {
      name: "cms_operation_draft",
      strict: true,
      schema: { type: "object" },
    },
  });
  expect(requestBody.messages[1]?.content).toBe("{}");
  const headers = calls[0]?.init?.headers as Headers;
  expect(headers.get("OpenAI-Organization")).toBe("org-test");
  expect(headers.get("OpenAI-Project")).toBe("proj-test");
});

test("createOpenAiProvider throws on provider failure", async () => {
  const provider = createOpenAiProvider({
    apiKey: "sk-test",
    model: "gpt-5.4-nano",
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: { message: "bad request" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    retryCount: 0,
  });

  await expect(
    provider.complete({
      systemPrompt: "Return JSON",
      userMessage: "{}",
      snippets: [],
      limits: {
        maxInputTokens: 8192,
        maxOutputTokens: 512,
        timeoutMs: 1000,
      },
    })
  ).rejects.toThrow("assistant_provider_failed");
});
