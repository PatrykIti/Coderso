const sensitiveKeyPattern =
  /(password|token|secret|authorization|cookie|apikey|api_key|bearer|csrf|credential|session|signed.*url|x-amz-signature)/i;

const signedUrlPattern =
  /\bhttps?:\/\/\S*[?&](?:x-amz-signature|awsaccesskeyid|signature|expires|token|sig|se|sp|sv)=\S*/gi;

const secretLikePairPattern =
  /\b(password|token|secret|api[-_\s]?key|authorization|cookie|bearer|csrf|credential|session)\b\s*[:=]\s*[^\s,;]+/gi;

const tokenPatterns = [
  /\bsk-or-v1-[a-zA-Z0-9]{8,}\b/g,
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /Bearer\s+[a-zA-Z0-9\-_.=]{8,}/gi,
  /\beyJ[a-zA-Z0-9_-]+=*\.[a-zA-Z0-9_-]+=*\.[a-zA-Z0-9_-]+=*\b/g,
] as const;

const promptPoisoningPatterns = [
  /\bignore\s+(?:all\s+)?(?:previous|prior|above|system|developer)\s+instructions?\b/gi,
  /\bforget\s+(?:all\s+)?(?:previous|prior|above|system|developer)\s+instructions?\b/gi,
  /\bbypass\s+(?:all\s+)?(?:validation|review|reviews|schema|schemas|rbac|csrf)\b/gi,
  /\bexecute\s+without\s+(?:review|reviews|validation|approval)\b/gi,
  /\boverride\s+(?:the\s+)?(?:schema|schemas|validation|system|developer)\b/gi,
  /\bdisable\s+(?:rbac|csrf|validation|review|reviews|guards?)\b/gi,
  /\breveal\s+(?:the\s+)?(?:system|developer)\s+prompt\b/gi,
] as const;

const replaceTokens = (value: string) => {
  let output = value
    .replace(signedUrlPattern, "[REDACTED_URL]")
    .replace(secretLikePairPattern, "$1: [REDACTED]");
  for (const pattern of tokenPatterns) {
    output = output.replace(pattern, "[REDACTED]");
  }
  return output;
};

const normalizeText = (value: string) =>
  value
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const redactAssistantText = (value: string, maxLength = 240) => {
  const normalized = normalizeText(replaceTokens(value));
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
};

export const redactAssistantSafetyText = (value: string, maxLength = 240) => {
  let filtered = value;
  for (const pattern of promptPoisoningPatterns) {
    filtered = filtered.replace(pattern, "[FILTERED_INSTRUCTION]");
  }
  return redactAssistantText(filtered, maxLength);
};

const redactUnknown = (value: unknown): unknown => {
  if (typeof value === "string") {
    return redactAssistantSafetyText(value, 200);
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
