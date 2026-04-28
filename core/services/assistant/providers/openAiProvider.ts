import type {
  AssistantProvider,
  AssistantProviderRequest,
  AssistantProviderResponse,
} from "./providerTypes";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_RETRY_COUNT = 1;

type OpenAiFetch = typeof fetch;

type OpenAiProviderConfig = {
  apiKey: string;
  model: string;
  baseUrl?: string;
  organization?: string | null;
  project?: string | null;
  retryCount?: number;
  fetchImpl?: OpenAiFetch;
};

type OpenAiResponseBody = {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

class OpenAiRequestError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

const normalizeBaseUrl = (value?: string) => {
  const normalized = value?.trim();
  if (!normalized) return DEFAULT_OPENAI_BASE_URL;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

const normalizeRetryCount = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_RETRY_COUNT;
  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : DEFAULT_RETRY_COUNT;
};

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
};

const formatSnippets = (snippets: AssistantProviderRequest["snippets"]) =>
  snippets
    .map((snippet, index) => {
      const heading = snippet.heading || "Top level";
      return `[${index + 1}] ${snippet.path} :: ${heading}\n${snippet.content}`;
    })
    .join("\n\n");

const buildUserPrompt = (request: AssistantProviderRequest) => {
  if (request.snippets.length === 0) return request.userMessage;
  return [
    `Question: ${request.userMessage}`,
    "",
    "Documentation snippets:",
    formatSnippets(request.snippets),
    "",
    "Answer using only snippets above. Cite snippet numbers like [1], [2].",
  ].join("\n");
};

const buildResponseFormat = (request: AssistantProviderRequest) => {
  const contract = request.responseContract;
  if (!contract || contract.kind === "prompt_json_only") return {};
  if (contract.kind === "json_object") {
    return {
      response_format: {
        type: "json_object",
      },
    };
  }
  return {
    response_format: {
      type: "json_schema",
      json_schema: {
        name: contract.name,
        strict: contract.strict,
        schema: contract.schema,
      },
    },
  };
};

const toRequestBody = (request: AssistantProviderRequest, model: string) => ({
  model,
  max_completion_tokens: request.limits.maxOutputTokens,
  ...buildResponseFormat(request),
  messages: [
    {
      role: "system",
      content: request.systemPrompt,
    },
    {
      role: "user",
      content: buildUserPrompt(request),
    },
  ],
});

const parseJsonSafe = async (response: Response): Promise<OpenAiResponseBody> => {
  try {
    return (await response.json()) as OpenAiResponseBody;
  } catch {
    return {};
  }
};

const parseChoiceText = (body: OpenAiResponseBody) => {
  const content = body.choices?.[0]?.message?.content;
  if (typeof content === "string") return normalizeText(content);
  if (!Array.isArray(content)) return "";
  return normalizeText(
    content
      .filter((item) => item?.type === "text")
      .map((item) => normalizeText(item.text))
      .filter(Boolean)
      .join("\n")
  );
};

const parseUsage = (body: OpenAiResponseBody): AssistantProviderResponse["usage"] => {
  const usage = body.usage;
  if (!usage) return undefined;
  return {
    inputTokens:
      typeof usage.prompt_tokens === "number" ? Math.max(0, usage.prompt_tokens) : undefined,
    outputTokens:
      typeof usage.completion_tokens === "number"
        ? Math.max(0, usage.completion_tokens)
        : undefined,
    totalTokens:
      typeof usage.total_tokens === "number" ? Math.max(0, usage.total_tokens) : undefined,
  };
};

export const createOpenAiProvider = (config: OpenAiProviderConfig): AssistantProvider => {
  const apiKey = config.apiKey.trim();
  const model = config.model.trim();
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const retryCount = normalizeRetryCount(config.retryCount);
  const fetchImpl = config.fetchImpl ?? fetch;
  if (!apiKey || !model) throw new Error("assistant_provider_invalid");

  const endpoint = `${baseUrl}/chat/completions`;

  return {
    id: "openai",
    complete: async (request) => {
      let lastError: OpenAiRequestError | null = null;
      for (let attempt = 0; attempt <= retryCount; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), request.limits.timeoutMs);
        try {
          const headers = new Headers({
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          });
          if (config.organization?.trim()) {
            headers.set("OpenAI-Organization", config.organization.trim());
          }
          if (config.project?.trim()) {
            headers.set("OpenAI-Project", config.project.trim());
          }
          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(toRequestBody(request, model)),
            signal: controller.signal,
          });
          const body = await parseJsonSafe(response);
          if (!response.ok) {
            const message = normalizeText(body.error?.message) || `http_${response.status}`;
            throw new OpenAiRequestError(message, response.status >= 500 || response.status === 429);
          }
          const text = parseChoiceText(body);
          if (!text) throw new OpenAiRequestError("response_empty", false);
          return {
            text,
            usage: parseUsage(body),
            providerRequestId: normalizeText(body.id) || undefined,
          };
        } catch (error) {
          if (error instanceof OpenAiRequestError) {
            lastError = error;
          } else if (error instanceof Error && error.name === "AbortError") {
            lastError = new OpenAiRequestError("timeout", true);
          } else {
            lastError = new OpenAiRequestError("network_error", true);
          }
          if (attempt < retryCount && lastError.retryable) continue;
          break;
        } finally {
          clearTimeout(timeout);
        }
      }
      throw new Error(lastError?.message ? "assistant_provider_failed" : "assistant_provider_failed");
    },
  };
};
