# TASK-483-01-L01: Traffic Event Domain Contract And Normalizers
# FileName: TASK-483-01-L01-Traffic-Event-Domain-Contract-And-Normalizers.md

**Parent Subtask:** TASK-483-01
**Priority:** High
**Category:** Tools / Analytics / Domain Contract
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Define the schema-first traffic-event contract (types, enums,
  defaults, `normalize*`) that every downstream layer (ingestion, repository,
  aggregation) imports. This is the single owner of the traffic event shape.
- **Owning module(s) to create:**
  - `core/services/analytics/trafficTypes.ts` — TypeScript types only
    (`RawTrafficEvent`, `NormalizedTrafficEvent`, `TrafficDeviceClass`,
    `TrafficSourceKind`, `SessionKey`).
  - `core/services/analytics/trafficSchemas.ts` — JSON-schema constants, enums,
    clamps, and `normalizeTrafficEvent()` / `normalizeTrafficPath()` helpers.
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out-of-scope:** DB tables (L02), the public route (TASK-483-02), any
  `db/client` import (keep this module Bun-free and runtime-free).

## Implementation Pseudocode

```ts
// trafficTypes.ts
export type TrafficDeviceClass = "desktop" | "mobile" | "tablet" | "bot" | "unknown";
export type TrafficSourceKind = "direct" | "internal" | "referral" | "search" | "social" | "campaign";

export type RawTrafficEvent = {
  type: "pageview";
  path: string;            // request pathname only (no query/hash by default)
  referrer?: string | null;
  // client hints; server overrides anything trust-sensitive
  screenW?: number;
  screenH?: number;
  lang?: string;
  // session continuity token minted client-side (opaque, non-PII)
  visitId?: string | null;
};

export type NormalizedTrafficEvent = {
  type: "pageview";
  path: string;            // normalized, max 2048, leading slash, no query
  referrerHost: string | null;
  sourceKind: TrafficSourceKind;
  deviceClass: TrafficDeviceClass;
  lang: string | null;
  visitId: string | null;  // validated opaque id or null
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
    screenW: { type: "number", minimum: 0, maximum: 100000 },
    screenH: { type: "number", minimum: 0, maximum: 100000 },
    lang: { type: "string", maxLength: 35 },
    visitId: { type: ["string", "null"], maxLength: 64 },
  },
} as const;

export function normalizeTrafficPath(input: string): string {
  const url = new URL(input, "http://x");       // tolerate absolute or relative
  const path = url.pathname || "/";
  return path.slice(0, TRAFFIC_EVENT_MAX_PATH);  // strip query/hash, clamp
}

export function classifySource(referrerHost: string | null, selfHosts: Set<string>): TrafficSourceKind {
  if (!referrerHost) return "direct";
  if (selfHosts.has(referrerHost)) return "internal";
  if (/google|bing|duckduckgo|yahoo|yandex/.test(referrerHost)) return "search";
  if (/facebook|twitter|x\.com|linkedin|instagram|t\.co/.test(referrerHost)) return "social";
  return "referral";
}

export function normalizeTrafficEvent(
  input: unknown,
  ctx: { uaDeviceClass: TrafficDeviceClass; selfHosts: Set<string>; campaignHit: boolean }
): NormalizedTrafficEvent {
  const record = assertRecord(input, "analytics_beacon_invalid");
  rejectUnknownKeys(record, Object.keys(trafficEventSchema.properties), "analytics_beacon_invalid");
  const path = normalizeTrafficPath(asString(record.path, "analytics_beacon_invalid"));
  const referrerHost = safeHost(record.referrer);
  const sourceKind = ctx.campaignHit ? "campaign" : classifySource(referrerHost, ctx.selfHosts);
  return {
    type: "pageview",
    path,
    referrerHost,
    sourceKind,
    deviceClass: ctx.uaDeviceClass,
    lang: clampLang(record.lang),
    visitId: validateOpaqueId(record.visitId),
  };
}
```

Data flow: route (TASK-483-02) validates against `trafficEventSchema`, then calls
`normalizeTrafficEvent` with server-derived context (UA device class, self hosts,
campaign detection). The normalizer never trusts client-supplied device/source.

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
