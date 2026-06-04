import type {
  AssistantProvider,
  AssistantProviderModelMetadata,
  AssistantProviderRequest,
  AssistantProviderResponse,
} from "./providerTypes";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_MODEL_MAX_INPUT_TOKENS = 4096;
const DEFAULT_MODEL_MAX_OUTPUT_TOKENS = 1024;

type OpenRouterFetch = typeof fetch;

type OpenRouterProviderConfig = {
  apiKey: string;
  model: string;
  baseUrl?: string;
  siteUrl?: string | null;
  appName?: string | null;
  retryCount?: number;
  fetchImpl?: OpenRouterFetch;
};

type OpenRouterChoice = {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
};

type OpenRouterResponseBody = {
  id?: string;
  choices?: OpenRouterChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

type OpenRouterModelObject = {
  id?: string;
  context_length?: number;
  supported_parameters?: string[];
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  } | null;
};

type OpenRouterModelsResponseBody = {
  data?: OpenRouterModelObject[];
};

class OpenRouterRequestError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

const normalizeBaseUrl = (value?: string) => {
  const normalized = value?.trim();
  if (!normalized) return DEFAULT_OPENROUTER_BASE_URL;
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
  if (request.snippets.length === 0) {
    return request.userMessage;
  }
  const snippets = formatSnippets(request.snippets);
  return [
    `Question: ${request.userMessage}`,
    "",
    "Documentation snippets:",
    snippets,
    "",
    "Answer using only snippets above. Cite snippet numbers like [1], [2].",
  ].join("\n");
};

const parseChoiceText = (choice: OpenRouterChoice | undefined) => {
  const content = choice?.message?.content;
  if (typeof content === "string") {
    return normalizeText(content);
  }
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const item of content) {
    if (!item || item.type !== "text") continue;
    const text = normalizeText(item.text);
    if (text) parts.push(text);
  }
  return normalizeText(parts.join("\n"));
};

const parseUsage = (body: OpenRouterResponseBody): AssistantProviderResponse["usage"] => {
  const usage = body.usage;
  if (!usage) return undefined;
  const inputTokens =
    typeof usage.prompt_tokens === "number" ? Math.max(0, usage.prompt_tokens) : undefined;
  const outputTokens =
    typeof usage.completion_tokens === "number" ? Math.max(0, usage.completion_tokens) : undefined;
  const totalTokens =
    typeof usage.total_tokens === "number" ? Math.max(0, usage.total_tokens) : undefined;
  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
    return undefined;
  }
  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
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

const buildProviderPreferences = (request: AssistantProviderRequest) =>
  request.requireStructuredOutput
    ? {
        provider: {
          require_parameters: true,
        },
      }
    : {};

const toRequestBody = (request: AssistantProviderRequest, model: string) => ({
  model,
  max_tokens: request.limits.maxOutputTokens,
  ...buildResponseFormat(request),
  ...buildProviderPreferences(request),
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

const parseJsonSafe = async (response: Response): Promise<OpenRouterResponseBody> => {
  try {
    return (await response.json()) as OpenRouterResponseBody;
  } catch {
    return {};
  }
};

const parseModelsJsonSafe = async (response: Response): Promise<OpenRouterModelsResponseBody> => {
  try {
    return (await response.json()) as OpenRouterModelsResponseBody;
  } catch {
    return {};
  }
};

const normalizePositiveInteger = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : null;
};

const normalizeSupportedParameters = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
    .sort((left, right) => left.localeCompare(right));
};

const findOpenRouterModel = (body: OpenRouterModelsResponseBody, model: string) => {
  const normalizedModel = model.trim();
  if (!normalizedModel) return null;
  return (body.data ?? []).find((entry) => entry.id === normalizedModel) ?? null;
};

const buildDefaultModelMetadata = (model: string): AssistantProviderModelMetadata => ({
  model,
  maxInputTokens: DEFAULT_MODEL_MAX_INPUT_TOKENS,
  maxOutputTokens: DEFAULT_MODEL_MAX_OUTPUT_TOKENS,
  supportedParameters: [],
  source: "default",
});

export const parseOpenRouterModelMetadata = (
  body: OpenRouterModelsResponseBody,
  model: string
): AssistantProviderModelMetadata => {
  const normalizedModel = model.trim();
  const fallback = buildDefaultModelMetadata(normalizedModel);
  const match = findOpenRouterModel(body, normalizedModel);
  if (!match) return fallback;

  const maxInputTokens =
    normalizePositiveInteger(match.top_provider?.context_length) ??
    normalizePositiveInteger(match.context_length);
  const maxOutputTokens = normalizePositiveInteger(match.top_provider?.max_completion_tokens);

  if (!maxInputTokens && !maxOutputTokens) return fallback;

  return {
    model: normalizedModel,
    maxInputTokens: maxInputTokens ?? fallback.maxInputTokens,
    maxOutputTokens: maxOutputTokens ?? fallback.maxOutputTokens,
    supportedParameters: normalizeSupportedParameters(match.supported_parameters),
    source: "provider",
  };
};

export const createOpenRouterProvider = (config: OpenRouterProviderConfig): AssistantProvider => {
  const apiKey = config.apiKey.trim();
  const model = config.model.trim();
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const retryCount = normalizeRetryCount(config.retryCount);
  const fetchImpl = config.fetchImpl ?? fetch;

  if (!apiKey || !model) {
    throw new Error("assistant_provider_invalid");
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const modelsEndpoint = `${baseUrl}/models`;

  return {
    id: "openrouter",
    getModelMetadata: async () => {
      const headers = new Headers({
        Authorization: `Bearer ${apiKey}`,
      });
      const response = await fetchImpl(modelsEndpoint, {
        method: "GET",
        headers,
      });
      if (!response.ok) return buildDefaultModelMetadata(model);
      const body = await parseModelsJsonSafe(response);
      return parseOpenRouterModelMetadata(body, model);
    },
    complete: async (request) => {
      let lastError: OpenRouterRequestError | null = null;

      for (let attempt = 0; attempt <= retryCount; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, request.limits.timeoutMs);

        try {
          const headers = new Headers({
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          });
          if (config.siteUrl && config.siteUrl.trim()) {
            headers.set("HTTP-Referer", config.siteUrl.trim());
          }
          if (config.appName && config.appName.trim()) {
            headers.set("X-Title", config.appName.trim());
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
            const retryable = response.status >= 500 || response.status === 429;
            throw new OpenRouterRequestError(message, retryable);
          }

          const text = parseChoiceText(body.choices?.[0]);
          if (!text) {
            throw new OpenRouterRequestError("response_empty", false);
          }

          return {
            text,
            usage: parseUsage(body),
            providerRequestId: normalizeText(body.id) || undefined,
          };
        } catch (error) {
          if (error instanceof OpenRouterRequestError) {
            lastError = error;
          } else if (error instanceof Error && error.name === "AbortError") {
            lastError = new OpenRouterRequestError("timeout", true);
          } else {
            lastError = new OpenRouterRequestError("network_error", true);
          }

          if (attempt < retryCount && lastError.retryable) {
            continue;
          }
          break;
        } finally {
          clearTimeout(timeout);
        }
      }

      throw new Error(
        lastError?.message ? "assistant_provider_failed" : "assistant_provider_failed"
      );
    },
  };
};
