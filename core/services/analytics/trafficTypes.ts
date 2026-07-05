// Traffic-event domain types (TASK-483-01-L01).
//
// These types describe the real traffic-analytics event shape and are the single
// owner of that shape for every downstream layer (ingestion route, repository,
// aggregation). They are DISTINCT from analyticsTypes.ts (content inventory).
//
// This module is intentionally TypeScript-types-only: no runtime, no db/client
// import, so it stays Bun-free and importable by Vitest.

export type TrafficDeviceClass = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

export type TrafficSourceKind = "direct" | "internal" | "referral" | "search" | "social";

export type RawTrafficEvent = {
  type: "pageview";
  // Request pathname only (no query/hash by default).
  path: string;
  referrer?: string | null;
  // Client hint; the server overrides anything trust-sensitive.
  lang?: string;
  // NOTE: no client-minted session/visit token — sessionization is keyed SOLELY
  // on the server-side visitorHash (computed in TASK-483-02-L03, consumed by
  // TASK-483-01-L03's recordTrafficEvent rolling window). A client-supplied
  // session token would be an attacker-controlled trust input and is
  // deliberately absent from the contract (kept aligned across
  // 01-L01 / 01-L03 / 03-L01).
  // NOTE: no screen dimensions — data minimization; device class is UA-only (02-L03).
};

export type NormalizedTrafficEvent = {
  type: "pageview";
  // Normalized, max TRAFFIC_EVENT_MAX_PATH, leading slash, no query/hash.
  path: string;
  referrerHost: string | null;
  sourceKind: TrafficSourceKind;
  deviceClass: TrafficDeviceClass;
  lang: string | null;
};
