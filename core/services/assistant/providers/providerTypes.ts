export type AssistantProviderSnippet = {
  path: string;
  heading: string;
  content: string;
};

export type AssistantProviderRequest = {
  systemPrompt: string;
  userMessage: string;
  snippets: AssistantProviderSnippet[];
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

export type AssistantProvider = {
  id: string;
  complete: (request: AssistantProviderRequest) => Promise<AssistantProviderResponse>;
};
