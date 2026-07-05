// Public beacon request envelope (TASK-483-02-L01).
//
// Owns `beaconRequestSchema` (strict `{ event, nonce }` envelope with
// additionalProperties: false) and `normalizeBeaconRequest()`. The route
// (TASK-483-02-L02) validates through this module and never re-declares the
// shape. The inner `event` is validated/normalized by normalizeTrafficEvent
// (trafficSchemas.ts, TASK-483-01-L01); the `nonce` string format is verified
// by beaconNonce.ts (assertBeaconNonce).
//
// Error convention: the normalizer throws plain Error("analytics_beacon_invalid")
// — the machine-readable convention of the TASK-483-01-L01 normalizers — mapped
// at the route boundary via mapAnalyticsError. (Only beaconNonce.ts throws
// ApiError directly.)
//
// The local validation helpers below (assertRecord / rejectUnknownKeys /
// asString) are DEFINED HERE per the established per-module pattern (mirroring
// trafficSchemas.ts and assistant/actionFamilyContracts.ts); they are
// intentionally not shared exports.

import { trafficEventSchema } from "./trafficSchemas";

export const BEACON_NONCE_MIN_LENGTH = 8;
export const BEACON_NONCE_MAX_LENGTH = 200;

export const beaconRequestSchema = {
  type: "object",
  additionalProperties: false, // reject-unknown
  required: ["event", "nonce"],
  properties: {
    event: trafficEventSchema,
    nonce: {
      type: "string",
      minLength: BEACON_NONCE_MIN_LENGTH,
      maxLength: BEACON_NONCE_MAX_LENGTH,
    },
  },
} as const;

const BEACON_ENVELOPE_KEYS = Object.keys(beaconRequestSchema.properties);

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

export type NormalizedBeaconRequest = {
  rawEvent: unknown;
  nonce: string;
};

export function normalizeBeaconRequest(input: unknown): NormalizedBeaconRequest {
  const record = assertRecord(input, "analytics_beacon_invalid");
  rejectUnknownKeys(record, BEACON_ENVELOPE_KEYS, "analytics_beacon_invalid");
  return {
    rawEvent: record.event,
    nonce: asString(record.nonce, "analytics_beacon_invalid"),
  };
}
