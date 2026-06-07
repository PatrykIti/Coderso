export type AssistantProviderSnippet = {
  path: string;
  heading: string;
  content: string;
};

export type AssistantProviderResponseContract =
  | {
      kind: "json_schema";
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    }
  | {
      kind: "json_object";
    }
  | {
      kind: "prompt_json_only";
    };

export type AssistantProviderRequest = {
  systemPrompt: string;
  userMessage: string;
  snippets: AssistantProviderSnippet[];
  responseContract?: AssistantProviderResponseContract;
  requireStructuredOutput?: boolean;
  limits: {
    maxInputTokens: number;
    maxOutputTokens: number;
    timeoutMs: number;
  };
};

export type AssistantProviderResponse = {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  providerRequestId?: string;
};

export type AssistantProviderModelMetadata = {
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportedParameters: string[];
  source: "provider" | "default";
};

export type AssistantProvider = {
  id: string;
  complete: (request: AssistantProviderRequest) => Promise<AssistantProviderResponse>;
  getModelMetadata?: () => Promise<AssistantProviderModelMetadata>;
};
