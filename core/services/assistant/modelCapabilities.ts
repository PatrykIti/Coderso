import type { AssistantProviderResponseContract } from "./providers/providerTypes";

export type StructuredOutputMode =
  | "json_schema_strict"
  | "json_object"
  | "tool_call_strict"
  | "prompt_json_only"
  | "none";

export type ModelFamily =
  | "gpt"
  | "gemini"
  | "qwen"
  | "llama"
  | "mistral"
  | "claude"
  | "unknown";

export type ModelCapabilityProfile = {
  provider: string;
  family: ModelFamily;
  structuredOutput: {
    preferred: StructuredOutputMode;
    supportsStrictSchema: boolean;
    supportsJsonObject: boolean;
    supportsToolCalling: boolean;
    requiresProviderParam: boolean;
  };
};

export type ResolveModelCapabilityInput = {
  provider: string;
  model: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

const inferFamily = (model: string): ModelFamily => {
  const normalized = normalize(model);
  if (normalized.includes("gpt") || normalized.includes("openai/")) return "gpt";
  if (normalized.includes("gemini") || normalized.includes("google/")) return "gemini";
  if (normalized.includes("qwen")) return "qwen";
  if (normalized.includes("llama") || normalized.includes("meta-llama")) return "llama";
  if (normalized.includes("mistral") || normalized.includes("mixtral")) return "mistral";
  if (normalized.includes("claude") || normalized.includes("anthropic/")) return "claude";
  return "unknown";
};

export const resolveModelCapabilityProfile = (
  input: ResolveModelCapabilityInput
): ModelCapabilityProfile => {
  const provider = normalize(input.provider);
  const family = inferFamily(input.model);

  if (provider === "openai") {
    const supportsStrictSchema = family === "gpt";
    return {
      provider,
      family,
      structuredOutput: {
        preferred: supportsStrictSchema ? "json_schema_strict" : "prompt_json_only",
        supportsStrictSchema,
        supportsJsonObject: supportsStrictSchema,
        supportsToolCalling: supportsStrictSchema,
        requiresProviderParam: false,
      },
    };
  }

  if (provider === "openrouter") {
    const supportsStrictSchema =
      family === "gpt" ||
      family === "gemini" ||
      family === "qwen" ||
      family === "llama" ||
      family === "mistral";
    return {
      provider,
      family,
      structuredOutput: {
        preferred: supportsStrictSchema ? "json_schema_strict" : "prompt_json_only",
        supportsStrictSchema,
        supportsJsonObject: supportsStrictSchema,
        supportsToolCalling: false,
        requiresProviderParam: false,
      },
    };
  }

  return {
    provider,
    family,
    structuredOutput: {
      preferred: "prompt_json_only",
      supportsStrictSchema: false,
      supportsJsonObject: false,
      supportsToolCalling: false,
      requiresProviderParam: false,
    },
  };
};

export const chooseProviderResponseContract = (
  profile: ModelCapabilityProfile,
  input: {
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
  }
): {
  responseContract: AssistantProviderResponseContract;
  requireStructuredOutput: boolean;
} => {
  if (profile.structuredOutput.preferred === "json_schema_strict") {
    return {
      responseContract: {
        kind: "json_schema",
        name: input.name,
        strict: input.strict ?? true,
        schema: input.schema,
      },
      requireStructuredOutput: profile.structuredOutput.requiresProviderParam,
    };
  }
  if (profile.structuredOutput.preferred === "json_object") {
    return {
      responseContract: { kind: "json_object" },
      requireStructuredOutput: false,
    };
  }
  return {
    responseContract: { kind: "prompt_json_only" },
    requireStructuredOutput: false,
  };
};
