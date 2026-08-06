import { createHash } from "node:crypto";
import { SmokeError } from "./contracts";

const SECRET_KEY = /(?:authorization|cookie|csrf|database.?url|password|secret|token|api.?key)/iu;
const SECRET_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/giu,
  /\b(?:postgres(?:ql)?|mysql|redis):\/\/[^\s"']+/giu,
  /\b(?:sk|pk|rk)_[A-Za-z0-9_-]{12,}\b/gu,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu,
];

export function redactString(value: string): string {
  let redacted = value;
  for (const pattern of SECRET_VALUE_PATTERNS) redacted = redacted.replace(pattern, "[REDACTED]");
  return redacted;
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 12) throw new SmokeError("smoke_output_invalid", "report nesting is too deep");
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return redactString(value).slice(0, 4096);
  if (Array.isArray(value)) return value.slice(0, 512).map((item) => redactValue(item, depth + 1));
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 512);
    for (const [key, nested] of entries) {
      result[key] = SECRET_KEY.test(key) ? "[REDACTED]" : redactValue(nested, depth + 1);
    }
    return result;
  }
  return "[UNSERIALIZABLE]";
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
