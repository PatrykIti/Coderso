const sensitiveKeyMatchers = [
  "password",
  "token",
  "secret",
  "apikey",
  "authorization",
  "cookie",
  "csrf",
  "resettoken",
  "passwordreset",
  "sessionid",
  "sessiontoken",
  "sessioncookie",
] as const;

const redactionPatterns = [
  /\bsk-or-v1-[a-zA-Z0-9]{8,}\b/g,
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /\bre_[a-zA-Z0-9_-]{8,}\b/g,
  /Bearer\s+[a-zA-Z0-9\-_.=]{8,}/gi,
  /\beyJ[a-zA-Z0-9_-]+=*\.[a-zA-Z0-9_-]+=*\.[a-zA-Z0-9_-]+=*\b/g,
  /((?:access|refresh|reset|csrf|session|auth)?_?token=)[^&\s]+/gi,
  /((?:session|csrf)_?id=)[^&\s]+/gi,
] as const;

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

export const isSensitiveAuditPayloadKey = (key: string) => {
  const normalized = normalizeKey(key);
  return sensitiveKeyMatchers.some((matcher) => normalized.includes(matcher));
};

const redactString = (value: string) => {
  let output = value;
  for (const pattern of redactionPatterns) {
    output = output.replace(pattern, (_match, prefix?: string) =>
      typeof prefix === "string" ? `${prefix}[REDACTED]` : "[REDACTED]"
    );
  }
  return output;
};

export const redactAuditText = (value: string) => redactString(value);

const redactUnknown = (value: unknown): unknown => {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((entry) => redactUnknown(entry));
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const entries: Array<[string, unknown]> = [];
  for (const [key, entry] of Object.entries(source)) {
    if (isSensitiveAuditPayloadKey(key)) continue;
    const redacted = redactUnknown(entry);
    entries.push([key, redacted]);
  }
  return Object.fromEntries(entries);
};

export function redactAuditPayload(payload: Record<string, unknown>) {
  return redactUnknown(payload) as Record<string, unknown>;
}

export function sanitizeAuditMetadata(meta: Record<string, unknown>) {
  return redactAuditPayload(meta);
}
