import type { AssistantLlmProvider } from "../../settings/settingsService";
import type { IntegrationRuntimeConfig } from "../../integrations/integrationsService";
import { createOpenAiProvider } from "./openAiProvider";
import { createOpenRouterProvider } from "./openRouterProvider";
import type { AssistantProvider, AssistantProviderModelMetadata } from "./providerTypes";

type ProviderResolverDeps = {
  getIntegrationRuntimeConfig: (id: string) => Promise<IntegrationRuntimeConfig | null>;
  createOpenAiProvider: typeof createOpenAiProvider;
  createOpenRouterProvider: typeof createOpenRouterProvider;
};

const defaultDeps: ProviderResolverDeps = {
  getIntegrationRuntimeConfig: async (id: string) => {
    const { getIntegrationRuntimeConfig } = await import("../../integrations/integrationsService");
    return getIntegrationRuntimeConfig(id);
  },
  createOpenAiProvider,
  createOpenRouterProvider,
};

export type ResolveAssistantProviderInput = {
  provider: AssistantLlmProvider;
  model: string;
};

export type ResolveAssistantModelMetadataInput = ResolveAssistantProviderInput;

const DEFAULT_ASSISTANT_MODEL_METADATA: Omit<AssistantProviderModelMetadata, "model"> = {
  maxInputTokens: 4096,
  maxOutputTokens: 1024,
  supportedParameters: [],
  source: "default",
};

const normalizeOptionalString = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

export const resolveAssistantProvider = async (
  input: ResolveAssistantProviderInput,
  deps: ProviderResolverDeps = defaultDeps
): Promise<AssistantProvider | null> => {
  if (input.provider === "openai") {
    const config = await deps.getIntegrationRuntimeConfig("openai");
    if (!config) return null;
    const apiKey = normalizeOptionalString(config.apiKey);
    if (!apiKey) return null;
    const model = input.model.trim();
    if (!model) return null;
    return deps.createOpenAiProvider({
      apiKey,
      model,
      baseUrl: normalizeOptionalString(config.baseUrl),
      organization: normalizeOptionalString(config.organization),
      project: normalizeOptionalString(config.project),
    });
  }

  if (input.provider !== "openrouter") {
    return null;
  }

  const config = await deps.getIntegrationRuntimeConfig("openrouter");
  if (!config) return null;

  const apiKey = normalizeOptionalString(config.apiKey);
  if (!apiKey) return null;

  const model = input.model.trim();
  if (!model) return null;

  return deps.createOpenRouterProvider({
    apiKey,
    model,
    baseUrl: normalizeOptionalString(config.baseUrl),
    siteUrl: normalizeOptionalString(config.siteUrl),
    appName: normalizeOptionalString(config.appName),
  });
};

export const resolveAssistantModelMetadata = async (
  input: ResolveAssistantModelMetadataInput,
  deps: ProviderResolverDeps = defaultDeps
): Promise<AssistantProviderModelMetadata> => {
  const model = input.model.trim();
  const fallback: AssistantProviderModelMetadata = {
    model,
    ...DEFAULT_ASSISTANT_MODEL_METADATA,
  };
  if (!model) return fallback;
  if (input.provider !== "openrouter") return fallback;

  try {
    const provider = await resolveAssistantProvider(input, deps);
    return (await provider?.getModelMetadata?.()) ?? fallback;
  } catch {
    return fallback;
  }
};
