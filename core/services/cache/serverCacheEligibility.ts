/**
 * TASK-551-07-L01: sole eligibility proof factory.
 *
 * `deriveCacheEligibilityProof` recursively validates the complete finite
 * `CacheEligibilityContext` and fails closed (returns `null`) for every
 * authenticated, preview/draft, private/password, nonce-bearing, unknown-query,
 * missing, malformed or excluded case — including the manifest family's
 * mandatory `"not_required"` gate and the never-cacheable security family.
 *
 * An eligible context yields a branded proof whose `shareScopeDigest` covers
 * the canonical encoding of EVERY normalized context field (including the full
 * mutable-visibility gate): a policy cannot select a subset, and the digest is
 * useless for any other auth/query/disposition/version combination. Raw
 * cookies, tokens, nonces, identities and unrestricted query text are not
 * representable context fields and therefore can never reach the digest or any
 * diagnostic.
 *
 * Digest scope, stated exactly: the proof is CONTEXT-bound, not family-bound.
 * `family` gates derivation (unknown, security and gated manifest contexts are
 * refused) but is not a context field, so two families derive byte-identical
 * digests for one context. Non-replay across families is enforced where the
 * family actually lives -- in the policy-owned `isEligible`, which passes its
 * own family to this factory, and in the final key and flight identity, both
 * of which contain the family. No consumer may therefore compare two proofs
 * without also comparing the policy family that produced them.
 *
 * Dependency direction: this factory consumes canonical hashing from
 * `serverCacheKeys.ts` and the runtime proof brand from contracts, so the
 * chain stays acyclic.
 */

import {
  CACHE_FAMILIES,
  SERVER_CACHE_LIMITS,
  validatedCacheEligibilityProof,
  type CacheEligibilityContext,
  type CacheEligibilityFieldDigest,
  type CacheEligibilityProof,
  type CacheFamily,
  type CacheShareScopeDigest,
} from "./serverCacheContracts";
import { digestServerCacheInput } from "./serverCacheKeys";

// ---------------------------------------------------------------------------
// Specification data (fail-closed matrices)
// ---------------------------------------------------------------------------

const ELIGIBLE_ACCESS_VALUES = ["public_anonymous"] as const;
const EXCLUDED_ACCESS_VALUES = ["authenticated", "private", "password", "unknown"] as const;

const ELIGIBLE_RENDER_MODES = ["public"] as const;
const EXCLUDED_RENDER_MODES = ["preview", "draft", "unknown"] as const;

const ABSENT_SENSITIVE_DEPENDENCY = "absent";
const EXCLUDED_SENSITIVE_DEPENDENCIES = ["nonce", "request_scoped", "unknown"] as const;

const POSITIVE_DISPOSITIONS = ["positive_candidate", "public_negative_candidate"] as const;
const EXCLUDED_DISPOSITIONS = ["unknown"] as const;

/**
 * Families whose values are structurally ineligible regardless of context:
 * security/auth settings store generation metadata only and are never cached.
 */
const ALWAYS_INELIGIBLE_FAMILIES = ["security-settings-generation"] as const;

/** The non-authorizing manifest family forbids any visibility gate object. */
const MANIFEST_REQUIRED_GATE_STATE = "not_required";

const CONTEXT_FIELD_ORDER = [
  "access",
  "renderMode",
  "sensitiveDependency",
  "queryVariant",
  "responseDisposition",
  "mutableVisibilityGate",
] as const;

/**
 * Byte-identical to the `lowercase-64-hex` shape owned by
 * `CacheEligibilityFieldDigest` / `CacheShareScopeDigest` in
 * `serverCacheContracts.ts` (`isValidLowercaseSha256Hex`); restated locally
 * because this module may not import the codec-side pattern without widening
 * its dependency surface.
 */
const LOWERCASE_SHA256_PATTERN = /^[0-9a-f]{64}$/;

export const SERVER_CACHE_ELIGIBILITY_SPECIFICATION = Object.freeze({
  eligibleAccessValues: ELIGIBLE_ACCESS_VALUES,
  excludedAccessValues: EXCLUDED_ACCESS_VALUES,
  eligibleRenderModes: ELIGIBLE_RENDER_MODES,
  excludedRenderModes: EXCLUDED_RENDER_MODES,
  absentSensitiveDependency: ABSENT_SENSITIVE_DEPENDENCY,
  excludedSensitiveDependencies: EXCLUDED_SENSITIVE_DEPENDENCIES,
  positiveDispositions: POSITIVE_DISPOSITIONS,
  excludedDispositions: EXCLUDED_DISPOSITIONS,
  alwaysIneligibleFamilies: ALWAYS_INELIGIBLE_FAMILIES,
  manifestRequiredGateState: MANIFEST_REQUIRED_GATE_STATE,
  /** Digests cover the full canonical context within this byte budget. */
  maxCanonicalContextBytes: SERVER_CACHE_LIMITS.maxCanonicalInputBytes,
  maxVisibilityVersionTokenBytes: 64,
});

// ---------------------------------------------------------------------------
// Context validation helpers
// ---------------------------------------------------------------------------

function isIn(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/**
 * Exact-field membership uses `Object.hasOwn`, never `in`: an inherited
 * (prototype-chain) property would otherwise satisfy a missing own field and
 * turn an exact-field gate into a pass-through that accepts smuggled payload.
 */
function hasExactFields(record: Record<string, unknown>, fields: readonly string[]): boolean {
  const keys = Object.keys(record);
  if (keys.length !== fields.length) return false;
  return fields.every((field) => Object.hasOwn(record, field));
}

function isValidFieldDigest(value: unknown): value is CacheEligibilityFieldDigest {
  return typeof value === "string" && value.length === 64 && LOWERCASE_SHA256_PATTERN.test(value);
}

type NormalizedContext = Readonly<{
  access: "public_anonymous";
  renderMode: "public";
  sensitiveDependency: "absent";
  queryVariant:
    | Readonly<{ kind: "known_bounded"; digest: CacheEligibilityFieldDigest }>
    | Readonly<{ kind: "unknown" }>;
  responseDisposition: "positive_candidate" | "public_negative_candidate";
  mutableVisibilityGate:
    | "not_required"
    | Readonly<{ state: "strictly_public"; versionToken: CacheEligibilityFieldDigest }>;
}>;

/**
 * Rejects every malformed, unknown-field or excluded state with `null`.
 * Validation covers the complete field set exactly once per variant so no
 * subset of the context can authorize a fill.
 */
function normalizeContext(context: CacheEligibilityContext): NormalizedContext | null {
  if (typeof context !== "object" || context === null) return null;
  const record = context as unknown as Record<string, unknown>;
  if (!hasExactFields(record, CONTEXT_FIELD_ORDER)) return null;
  if (!isIn(record.access, ELIGIBLE_ACCESS_VALUES)) return null;
  if (!isIn(record.renderMode, ELIGIBLE_RENDER_MODES)) return null;
  if (!isIn(record.sensitiveDependency, [ABSENT_SENSITIVE_DEPENDENCY])) return null;
  if (!isIn(record.responseDisposition, POSITIVE_DISPOSITIONS)) return null;

  let queryVariant: NormalizedContext["queryVariant"];
  const rawQueryVariant = record.queryVariant;
  if (typeof rawQueryVariant !== "object" || rawQueryVariant === null) return null;
  const queryRecord = rawQueryVariant as unknown as Record<string, unknown>;
  if (queryRecord.kind === "known_bounded") {
    if (!hasExactFields(queryRecord, ["kind", "digest"])) return null;
    if (!isValidFieldDigest(queryRecord.digest)) return null;
    queryVariant = { kind: "known_bounded", digest: queryRecord.digest };
  } else if (queryRecord.kind === "unknown") {
    if (!hasExactFields(queryRecord, ["kind"])) return null;
    queryVariant = { kind: "unknown" };
  } else {
    return null;
  }

  let mutableVisibilityGate: NormalizedContext["mutableVisibilityGate"];
  const rawGate = record.mutableVisibilityGate;
  if (rawGate === MANIFEST_REQUIRED_GATE_STATE) {
    mutableVisibilityGate = "not_required";
  } else if (typeof rawGate === "object" && rawGate !== null) {
    const gateRecord = rawGate as unknown as Record<string, unknown>;
    if (
      gateRecord.state !== "strictly_public" ||
      !hasExactFields(gateRecord, ["state", "versionToken"]) ||
      !isValidFieldDigest(gateRecord.versionToken)
    ) {
      return null;
    }
    mutableVisibilityGate = {
      state: "strictly_public",
      versionToken: gateRecord.versionToken,
    };
  } else {
    return null;
  }

  return {
    access: record.access as NormalizedContext["access"],
    renderMode: record.renderMode as NormalizedContext["renderMode"],
    sensitiveDependency: ABSENT_SENSITIVE_DEPENDENCY,
    queryVariant,
    responseDisposition: record.responseDisposition as NormalizedContext["responseDisposition"],
    mutableVisibilityGate,
  };
}

// ---------------------------------------------------------------------------
// Proof derivation
// ---------------------------------------------------------------------------

export type DeriveCacheEligibilityProofInput = Readonly<{
  family: CacheFamily;
  context: CacheEligibilityContext;
}>;

/**
 * Returns the branded proof for a fully eligible public context, or `null`.
 * A proof carries `negativeFill: "eligible"` only when the disposition is the
 * explicitly proven public negative candidate; positive-only proofs forbid it.
 */
export function deriveCacheEligibilityProof(
  input: DeriveCacheEligibilityProofInput
): CacheEligibilityProof | null {
  if (!(CACHE_FAMILIES as readonly string[]).includes(input.family)) return null;
  if ((ALWAYS_INELIGIBLE_FAMILIES as readonly string[]).includes(input.family)) return null;
  const context = normalizeContext(input.context);
  if (context === null) return null;
  // Unknown/unordered query text can never be proven bounded.
  if (context.queryVariant.kind === "unknown") return null;
  // The non-authorizing manifest family requires exactly "not_required";
  // its proof never authorizes HTML/body access.
  if (input.family === MANIFEST_FAMILY && context.mutableVisibilityGate !== "not_required") {
    return null;
  }

  // Canonical key order keeps the digest stable across property insertion
  // order while covering every normalized field, including the gate token.
  const negativeFill =
    context.responseDisposition === "public_negative_candidate" ? "eligible" : "forbid";
  // Same 64-hex wire form, distinct brand: the share scope is a projection of
  // the canonical context bytes and never equals a bare field digest type.
  const shareScopeDigest = digestServerCacheInput({
    access: context.access,
    mutableVisibilityGate: context.mutableVisibilityGate,
    queryVariant: context.queryVariant,
    renderMode: context.renderMode,
    responseDisposition: context.responseDisposition,
    sensitiveDependency: context.sensitiveDependency,
  }) as unknown as CacheShareScopeDigest;

  return {
    negativeFill,
    shareScopeDigest,
    [validatedCacheEligibilityProof]: true,
  };
}

/** The non-authorizing manifest family, which mandates `"not_required"`. */
const MANIFEST_FAMILY = "public-html-manifest";

/**
 * Type-level companion proving only branded proofs satisfy the
 * `CachePolicy.isEligible` contract; foreign objects without the brand are
 * rejected before entering any registry, value read or lease acquisition.
 */
export function isBrandedCacheEligibilityProof(value: unknown): value is CacheEligibilityProof {
  if (typeof value !== "object" || value === null) return false;
  const probe = value as Partial<Record<string, unknown>> &
    Partial<Record<typeof validatedCacheEligibilityProof, unknown>>;
  if (probe[validatedCacheEligibilityProof] !== true) return false;
  const record = value as Record<string, unknown>;
  return (
    isValidFieldDigest(record.shareScopeDigest) &&
    (record.negativeFill === "eligible" || record.negativeFill === "forbid")
  );
}

/**
 * Convenience predicate mirroring `negativeTtlMs !== null` plus an
 * eligible-negative proof, i.e. exactly the negative-fill authority in v1. The
 * `5_000..15_000` window is owned by `normalizeNegativeCacheTtlMs` and the
 * `NegativeCacheTtlMs` brand in `serverCacheContracts.ts`; it is restated here
 * because this predicate also accepts unbranded numbers.
 */
export function authorizesNegativeFill(
  proof: CacheEligibilityProof | null,
  negativeTtlMs: null | number
): boolean {
  if (proof === null || !isBrandedCacheEligibilityProof(proof)) return false;
  if (proof.negativeFill !== "eligible") return false;
  if (negativeTtlMs === null) return false;
  return negativeTtlMs >= 5_000 && negativeTtlMs <= 15_000;
}
