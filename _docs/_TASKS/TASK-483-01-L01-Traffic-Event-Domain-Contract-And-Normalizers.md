# TASK-483-01-L01: Traffic Event Domain Contract And Normalizers
# FileName: TASK-483-01-L01-Traffic-Event-Domain-Contract-And-Normalizers.md

**Parent Subtask:** TASK-483-01
**Priority:** High
**Category:** Tools / Analytics / Domain Contract
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

- **Goal:** Define the schema-first traffic-event contract (types, enums,
  defaults, `normalize*`) that every downstream layer (ingestion, repository,
  aggregation) imports. This is the single owner of the traffic event shape.
- **Owning module(s) to create:**
  - `core/services/analytics/trafficTypes.ts` — TypeScript types only
    (`RawTrafficEvent`, `NormalizedTrafficEvent`, `TrafficDeviceClass`,
    `TrafficSourceKind`).
  - `core/services/analytics/trafficSchemas.ts` — JSON-schema constants, enums,
    clamps, and `normalizeTrafficEvent()` / `normalizeTrafficPath()` helpers.
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out-of-scope:** DB tables (L02), the public route (TASK-483-02), any
  `db/client` import (keep this module Bun-free and runtime-free), and
  **campaign/UTM attribution** — `sourceKind` classifies
  direct/internal/referral/search/social only. The client sends no query string
  and `normalizeTrafficPath` strips any query/hash, so there is no campaign
  signal to classify; a future, privacy-reviewed task may add a UTM field, kept
  aligned across TASK-483-01-L01 / 02-L02 / 03-L01. Also out of scope:
  **screen dimensions** (`screenW`/`screenH`) — nothing downstream consumes
  them (device classification is UA-only per TASK-483-02-L03, no table column
  persists them per TASK-483-01-L02), so under the data-minimization posture
  they are **not** part of the payload contract. Because the schema is
  reject-unknown, the tracking snippet (TASK-483-03-L01) **must not send
  them** or every beacon gets a 400 — keep this aligned across
  TASK-483-01-L01 / 02-L03 / 03-L01. If a future task wants a device-class
  fallback signal, it re-adds the fields consciously in all three leaves.

## Implementation Pseudocode

```ts
// trafficTypes.ts
export type TrafficDeviceClass = "desktop" | "mobile" | "tablet" | "bot" | "unknown";
export type TrafficSourceKind = "direct" | "internal" | "referral" | "search" | "social";

export type RawTrafficEvent = {
  type: "pageview";
  path: string;            // request pathname only (no query/hash by default)
  referrer?: string | null;
  // client hint; server overrides anything trust-sensitive
  lang?: string;
  // NOTE: no client-minted session/visit token — sessionization is keyed SOLELY
  // on the server-side visitorHash (computed in 02-L03, consumed by 01-L03's
  // recordTrafficEvent rolling window); a client-supplied session token would
  // be an attacker-controlled trust input and is deliberately absent from the
  // contract (kept aligned across 01-L01 / 01-L03 / 03-L01).
  // NOTE: no screen dimensions — data minimization; device class is UA-only (02-L03)
};

export type NormalizedTrafficEvent = {
  type: "pageview";
  path: string;            // normalized, max 2048, leading slash, no query
  referrerHost: string | null;
  sourceKind: TrafficSourceKind;
  deviceClass: TrafficDeviceClass;
  lang: string | null;
};

// trafficSchemas.ts
export const TRAFFIC_EVENT_MAX_PATH = 2048;
export const trafficEventSchema = {
  type: "object",
  additionalProperties: false,            // reject-unknown
  required: ["type", "path"],
  properties: {
    type: { type: "string", enum: ["pageview"] },
    path: { type: "string", minLength: 1, maxLength: TRAFFIC_EVENT_MAX_PATH },
    referrer: { type: ["string", "null"], maxLength: TRAFFIC_EVENT_MAX_PATH },
    lang: { type: "string", maxLength: 35 },
  },
} as const;

export function normalizeTrafficPath(input: string): string {
  const url = new URL(input, "http://x");       // tolerate absolute or relative
  const path = url.pathname || "/";
  return path.slice(0, TRAFFIC_EVENT_MAX_PATH);  // strip query/hash, clamp
}

// Exact-host or dot-suffix matching ONLY — never substring/regex matching,
// which misclassifies (e.g. "wix.com" contains "x.com", "googlesyndication.com"
// contains "google"). hostMatches("news.google.com") → true for "google.com";
// hostMatches("wix.com") → false for "x.com".
const SEARCH_HOSTS = ["google.com", "bing.com", "duckduckgo.com", "yahoo.com", "yandex.com"];
const SOCIAL_HOSTS = ["facebook.com", "twitter.com", "x.com", "t.co", "linkedin.com", "instagram.com"];

function hostMatches(host: string, candidates: readonly string[]): boolean {
  return candidates.some((h) => host === h || host.endsWith("." + h));
}

export function classifySource(referrerHost: string | null, selfHosts: Set<string>): TrafficSourceKind {
  if (!referrerHost) return "direct";
  const host = referrerHost.toLowerCase();
  if (selfHosts.has(host)) return "internal";
  if (hostMatches(host, SEARCH_HOSTS)) return "search";
  if (hostMatches(host, SOCIAL_HOSTS)) return "social";
  return "referral";
}

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
```

Data flow: route (TASK-483-02) validates against `trafficEventSchema`, then calls
`normalizeTrafficEvent` with server-derived context (UA device class, self
hosts). The normalizer never trusts client-supplied device/source.

Error handling: all rejections throw machine-readable `analytics_beacon_invalid`;
the route boundary maps it through `mapAnalyticsError` (TASK-483-02) to a 400
`ApiError`. No raw payload is included in the error message.

Regression-test shape (Vitest, `tests/vitest/analytics/trafficSchemas.test.ts`):

```ts
test("strips query and clamps path", () => {
  expect(normalizeTrafficPath("/blog/post?utm=x#h")).toBe("/blog/post");
});
test("rejects unknown fields", () => {
  expect(() => normalizeTrafficEvent({ type: "pageview", path: "/", evil: 1 }, ctx))
    .toThrow("analytics_beacon_invalid");
});
test("self-referrer classifies as internal", () => {
  const e = normalizeTrafficEvent({ type: "pageview", path: "/", referrer: "https://site.tld/a" },
    { ...ctx, selfHosts: new Set(["site.tld"]) });
  expect(e.sourceKind).toBe("internal");
});
test("host matching is exact/dot-suffix, never substring", () => {
  expect(classifySource("wix.com", new Set())).toBe("referral");        // contains "x.com"
  expect(classifySource("googlesyndication.com", new Set())).toBe("referral"); // contains "google"
  expect(classifySource("x.com", new Set())).toBe("social");
  expect(classifySource("news.google.com", new Set())).toBe("search");  // dot-suffix match
});
test("rejects screen dimensions (not part of the minimal payload)", () => {
  expect(() => normalizeTrafficEvent({ type: "pageview", path: "/", screenW: 1920 }, ctx))
    .toThrow("analytics_beacon_invalid");
});
```

## Security Contract

- **Endpoint visibility:** none — pure domain module, no HTTP surface here.
- **Auth model:** N/A (consumed by the public route in TASK-483-02).
- **RBAC:** N/A.
- **CSRF expectations:** N/A.
- **Rate-limit bucket:** N/A (enforced at the route).
- **Validation schema-owner module:** `trafficSchemas.ts` owns
  `trafficEventSchema`; routes/validation re-export it, never re-declare.
  `additionalProperties: false` (reject-unknown) is mandatory.
- **Anti-abuse controls:** N/A here; the normalizer must **discard**
  client-claimed device/source/visitor-trust fields and recompute them
  server-side so a hostile client cannot forge attribution.
- **Secret/PII handling:** no IP, no full referrer URL persisted — only the
  referrer **host**. No secrets read in this module; no logging of raw input.

## Testing Requirements

- Vitest only (Bun-free): `tests/vitest/analytics/trafficSchemas.test.ts`
  covering normalization, clamps, reject-unknown, and source classification.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
