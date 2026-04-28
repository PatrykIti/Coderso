const sensitiveKeyPattern =
  /(password|token|secret|authorization|cookie|apikey|api_key|bearer|signed.*url)/i;

const tokenPatterns = [
  /\bsk-or-v1-[a-zA-Z0-9]{8,}\b/g,
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /Bearer\s+[a-zA-Z0-9\-_.=]{8,}/gi,
  /\beyJ[a-zA-Z0-9_-]+=*\.[a-zA-Z0-9_-]+=*\.[a-zA-Z0-9_-]+=*\b/g,
] as const;

const replaceTokens = (value: string) => {
  let output = value;
  for (const pattern of tokenPatterns) {
    output = output.replace(pattern, "[REDACTED]");
  }
  return output;
};

const normalizeText = (value: string) =>
  value.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim();

export const redactAssistantText = (value: string, maxLength = 240) => {
  const normalized = normalizeText(replaceTokens(value));
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
};

const redactUnknown = (value: unknown): unknown => {
  if (typeof value === "string") {
    return redactAssistantText(value, 200);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactUnknown(entry));
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const entries: Array<[string, unknown]> = [];
    for (const [key, entry] of Object.entries(source)) {
      if (sensitiveKeyPattern.test(key)) {
        entries.push([key, "[REDACTED]"]);
        continue;
      }
      entries.push([key, redactUnknown(entry)]);
    }
    return Object.fromEntries(entries);
  }

  return value;
};

export const redactAssistantMetadata = (input: Record<string, unknown>) =>
  redactUnknown(input) as Record<string, unknown>;
