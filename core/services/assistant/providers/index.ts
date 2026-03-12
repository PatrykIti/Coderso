import type { AssistantLlmProvider } from "../../settings/settingsService";
import type { IntegrationRuntimeConfig } from "../../integrations/integrationsService";
import { createOpenRouterProvider } from "./openRouterProvider";
import type { AssistantProvider } from "./providerTypes";

type ProviderResolverDeps = {
  getIntegrationRuntimeConfig: (id: string) => Promise<IntegrationRuntimeConfig | null>;
  createOpenRouterProvider: typeof createOpenRouterProvider;
};

const defaultDeps: ProviderResolverDeps = {
  getIntegrationRuntimeConfig: async (id: string) => {
    const { getIntegrationRuntimeConfig } = await import("../../integrations/integrationsService");
    return getIntegrationRuntimeConfig(id);
  },
  createOpenRouterProvider,
};

export type ResolveAssistantProviderInput = {
  provider: AssistantLlmProvider;
  model: string;
};

const normalizeOptionalString = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

export const resolveAssistantProvider = async (
  input: ResolveAssistantProviderInput,
  deps: ProviderResolverDeps = defaultDeps
): Promise<AssistantProvider | null> => {
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
