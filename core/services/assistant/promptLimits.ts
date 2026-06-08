export const ASSISTANT_TRANSPORT_MAX_CHARS = 2_000_000;
export const ASSISTANT_MIN_PROMPT_BUDGET_CHARS = 8_000;
export const ASSISTANT_CHARS_PER_INPUT_TOKEN = 4;

export const normalizeAssistantInputTokenLimit = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.floor(value))
    : fallback;

export const deriveAssistantPromptCharLimit = (
  inputTokens: unknown,
  fallbackInputTokens = 8_192
) => {
  const normalizedTokens = normalizeAssistantInputTokenLimit(inputTokens, fallbackInputTokens);
  const estimatedChars = normalizedTokens * ASSISTANT_CHARS_PER_INPUT_TOKEN;
  return Math.min(
    ASSISTANT_TRANSPORT_MAX_CHARS,
    Math.max(ASSISTANT_MIN_PROMPT_BUDGET_CHARS, estimatedChars)
  );
};

export const deriveAssistantPromptCharLimitAfterOverhead = (
  inputTokens: unknown,
  overheadChars: unknown,
  fallbackInputTokens = 8_192
) => {
  const normalizedTokens = normalizeAssistantInputTokenLimit(inputTokens, fallbackInputTokens);
  const normalizedOverhead =
    typeof overheadChars === "number" && Number.isFinite(overheadChars) && overheadChars > 0
      ? Math.ceil(overheadChars)
      : 0;
  const availableChars = normalizedTokens * ASSISTANT_CHARS_PER_INPUT_TOKEN - normalizedOverhead;
  return Math.min(ASSISTANT_TRANSPORT_MAX_CHARS, Math.max(0, availableChars));
};

export const assertAssistantPromptWithinBudget = (
  prompt: string,
  inputTokens: unknown,
  fallbackInputTokens = 8_192
) => {
  if (prompt.length <= deriveAssistantPromptCharLimit(inputTokens, fallbackInputTokens)) return;
  throw new Error("assistant_prompt_too_large");
};

export const assertAssistantPromptWithinPackageBudget = (
  prompt: string,
  inputTokens: unknown,
  overheadChars: unknown,
  fallbackInputTokens = 8_192
) => {
  if (
    prompt.length <=
    deriveAssistantPromptCharLimitAfterOverhead(inputTokens, overheadChars, fallbackInputTokens)
  ) {
    return;
  }
  throw new Error("assistant_prompt_too_large");
};
