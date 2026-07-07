// Traffic-event JSON schema, enums, clamps, and normalizers (TASK-483-01-L01).
//
// This module owns `trafficEventSchema` (reject-unknown) and the pure
// `normalize*` helpers that the public ingestion route (TASK-483-02) imports.
// It is Bun-free and runtime-free (no db/client import) so Vitest can import it.
//
// The local validation helpers below (assertRecord / rejectUnknownKeys /
// asString / safeHost / clampLang) are DEFINED HERE per the established
// per-module pattern (e.g. assistant/actionFamilyContracts.ts,
// assistantSiteBuilderIntakeNormalizer.ts); they are intentionally not shared
// exports.

import type { NormalizedTrafficEvent, TrafficDeviceClass, TrafficSourceKind } from "./trafficTypes";

export const TRAFFIC_EVENT_MAX_PATH = 2048;
export const TRAFFIC_EVENT_MAX_LANG = 35;

export const trafficEventSchema = {
  type: "object",
  additionalProperties: false, // reject-unknown
  required: ["type", "path"],
  properties: {
    type: { type: "string", enum: ["pageview"] },
    path: { type: "string", minLength: 1, maxLength: TRAFFIC_EVENT_MAX_PATH },
    referrer: { type: ["string", "null"], maxLength: TRAFFIC_EVENT_MAX_PATH },
    lang: { type: "string", maxLength: TRAFFIC_EVENT_MAX_LANG },
  },
} as const;

// ── Local validation helpers (per-module pattern) ───────────────────────────

function assertRecord(input: unknown, errorCode: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(errorCode);
  }
  return input as Record<string, unknown>;
}

function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  errorCode: string
): void {
  const allow = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allow.has(key)) throw new Error(errorCode);
  }
}

function asString(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  return value;
}

// Parse a client-supplied referrer into its lowercased host, or null. Never
// persists the full URL — only the host is retained (SECURITY_SPEC PII posture).
//
// The tracking snippet (TASK-483-03-L01) sends a HOST-ONLY referrer (e.g.
// "news.google.com"), which `new URL()` rejects because it has no scheme. To
// keep traffic-source/referrer attribution alive end-to-end we tolerate BOTH
// shapes: parse as-is first (handles a full URL, should any caller send one),
// and on failure retry with a synthetic scheme (handles the bare host the
// client actually emits). Only the resulting host is ever returned/stored.
function safeHost(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  for (const candidate of [value, `https://${value}`]) {
    try {
      const host = new URL(candidate).hostname.toLowerCase();
      if (host.length > 0) return host;
    } catch {
      // try the next candidate (bare host → prepend scheme)
    }
  }
  return null;
}

function clampLang(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, TRAFFIC_EVENT_MAX_LANG);
}

// ── Path normalization ──────────────────────────────────────────────────────

export function normalizeTrafficPath(input: string): string {
  const url = new URL(input, "http://x"); // tolerate absolute or relative
  const path = url.pathname || "/";
  return path.slice(0, TRAFFIC_EVENT_MAX_PATH); // strip query/hash, clamp
}

// ── Source classification ───────────────────────────────────────────────────
//
// Exact-host or dot-suffix matching ONLY — never substring/regex matching, which
// misclassifies (e.g. "wix.com" contains "x.com", "googlesyndication.com"
// contains "google"). hostMatches("news.google.com") → true for "google.com";
// hostMatches("wix.com") → false for "x.com".

const SEARCH_HOSTS = [
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "yandex.com",
] as const;

const SOCIAL_HOSTS = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "t.co",
  "linkedin.com",
  "instagram.com",
] as const;

function hostMatches(host: string, candidates: readonly string[]): boolean {
  return candidates.some((h) => host === h || host.endsWith("." + h));
}

export function classifySource(
  referrerHost: string | null,
  selfHosts: Set<string>
): TrafficSourceKind {
  if (!referrerHost) return "direct";
  const host = referrerHost.toLowerCase();
  if (selfHosts.has(host)) return "internal";
  if (hostMatches(host, SEARCH_HOSTS)) return "search";
  if (hostMatches(host, SOCIAL_HOSTS)) return "social";
  return "referral";
}

// ── Normalizer ──────────────────────────────────────────────────────────────
//
// The route (TASK-483-02) validates against `trafficEventSchema`, then calls
// this with server-derived context (UA device class, self hosts). The normalizer
// NEVER trusts client-supplied device/source/visitor-trust fields — it recomputes
// them server-side so a hostile client cannot forge attribution.

export function normalizeTrafficEvent(
  input: unknown,
  ctx: { uaDeviceClass: TrafficDeviceClass; selfHosts: Set<string> }
): NormalizedTrafficEvent {
  const record = assertRecord(input, "analytics_beacon_invalid");
  rejectUnknownKeys(record, Object.keys(trafficEventSchema.properties), "analytics_beacon_invalid");
  const path = normalizeTrafficPath(asString(record.path, "analytics_beacon_invalid"));
  const referrerHost = safeHost(record.referrer);
  const sourceKind = classifySource(referrerHost, ctx.selfHosts);
  return {
    type: "pageview",
    path,
    referrerHost,
    sourceKind,
    deviceClass: ctx.uaDeviceClass,
    lang: clampLang(record.lang),
  };
}
