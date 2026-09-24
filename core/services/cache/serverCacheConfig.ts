/**
 * TASK-551-07-L01: validated server-cache infrastructure configuration and
 * mandatory-policy startup capacity.
 *
 * `normalizeServerCacheConfig(env)` owns exactly the pinned variables; it never
 * reads `process.env` itself (the caller supplies the record) and never loads
 * `.env`. Every failure is a stable machine-readable `server_cache_config_*`
 * code. Redis credentials are parsed for validation only and can never appear
 * in normalized diagnostics: only a redacted `scheme://host[:port]` form is
 * retained, so no secret reaches logs, errors or receipts.
 *
 * Dependency direction: this module consumes keys/contracts values one way;
 * nothing in this leaf depends on it.
 *
 * Stricter-than-minimum behavior, documented for operators: `REDIS_URL` is
 * *required* only in Redis mode, but a value that is present in memory mode is
 * still parsed and a malformed one still fails startup with
 * `server_cache_config_redis_url_invalid`. Fail-closed beats silently ignoring
 * a mistyped shared-environment variable; a memory-only deployment that must
 * tolerate a foreign `REDIS_URL` should unset it for that process.
 *
 * Owned-surface note: beyond the contract-mandated `normalizeServerCacheConfig`,
 * `CachePolicyCapacityRequirement` and `assertMandatoryPolicyCapacity`, this
 * module exports `serverCacheConfigDiagnostics` plus the env/config/catalog
 * record types. Those are leaf-owned auxiliary surface -- the redacted
 * diagnostics form and the shapes the mandated functions consume -- and add no
 * second configuration authority.
 */

import {
  SERVER_CACHE_LIMITS,
  isCacheFamily,
  isCacheTag,
  normalizeCacheSchemaVersion,
  normalizePositiveCacheTtlMs,
  normalizeCacheValueByteLimit,
  type CacheFamily,
  type CacheSchemaVersion,
  type CacheTag,
  type CacheValueByteLimit,
  type PositiveCacheTtlMs,
  type ServerCacheBackend,
} from "./serverCacheContracts";
import type { ServerCacheStoreDescription } from "./serverCacheConditionalWrite";
import {
  SERVER_CACHE_NAMESPACE_MAX_BYTES,
  SERVER_CACHE_NAMESPACE_PATTERN,
  SERVER_CACHE_NAMESPACE_SEPARATORS,
  maxServerCacheKeyBytes,
} from "./serverCacheKeys";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const SERVER_CACHE_CONFIG_ERROR_CODES = {
  backendInvalid: "server_cache_config_backend_invalid",
  namespaceInvalid: "server_cache_config_namespace_invalid",
  memoryMaxEntriesInvalid: "server_cache_config_memory_max_entries_invalid",
  memoryMaxBytesInvalid: "server_cache_config_memory_max_bytes_invalid",
  maxEntryBytesInvalid: "server_cache_config_max_entry_bytes_invalid",
  maxInFlightKeysInvalid: "server_cache_config_max_in_flight_keys_invalid",
  commandTimeoutInvalid: "server_cache_config_command_timeout_ms_invalid",
  redisUrlRequired: "server_cache_config_redis_url_required",
  redisUrlInvalid: "server_cache_config_redis_url_invalid",
  redisNamespaceRequired: "server_cache_config_redis_namespace_required",
  byteLimitsInconsistent: "server_cache_config_byte_limits_inconsistent",
  policyCatalogInvalid: "server_cache_policy_catalog_invalid",
  policyExceedsStoreEntryBytes: "server_cache_policy_exceeds_store_entry_bytes",
} as const;

/** Typed startup failure carrying only its machine-readable code. */
export class ServerCacheConfigError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ServerCacheConfigError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new ServerCacheConfigError(code);
}

// ---------------------------------------------------------------------------
// Env record types (injected explicitly; nothing reads process.env here)
// ---------------------------------------------------------------------------

export type ServerCacheEnvRecord = Readonly<Record<string, string | undefined>>;

const CANONICAL_INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function normalizeInteger(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  code: string
): number {
  if (raw === undefined || raw === "") return fallback;
  if (!CANONICAL_INTEGER_PATTERN.test(raw)) fail(code);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(code);
  return value;
}

function redactUrlTarget(raw: string): string {
  try {
    const parsed = new URL(raw);
    const port = parsed.port === "" ? "" : ":" + parsed.port;
    return parsed.protocol.replace(/:$/, "") + "://" + parsed.hostname + port + "/";
  } catch {
    return "redacted";
  }
}

function normalizeRedisUrl(raw: string | undefined): {
  required: boolean;
  redacted: null | string;
} {
  if (raw === undefined || raw === "") {
    return { required: true, redacted: null };
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.redisUrlInvalid);
  }
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.redisUrlInvalid);
  }
  // A Redis target without a host (for example a truncated `rediss:/`) can
  // never describe a reachable server and is malformed, not merely empty.
  if (parsed.hostname === "") {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.redisUrlInvalid);
  }
  // Never keep credentials: only scheme/host/port survive normalization.
  return { required: false, redacted: redactUrlTarget(raw) };
}

export type NormalizedServerCacheConfig = Readonly<{
  backend: ServerCacheBackend;
  namespace: string;
  memoryMaxEntries: number;
  memoryMaxBytes: number;
  /**
   * The normalized per-entry byte ceiling (`SERVER_CACHE_MAX_ENTRY_BYTES`),
   * cross-checked at startup against `store.describe().maxEntryBytes`.
   */
  maxEntryBytes: CacheValueByteLimit;
  maxInFlightKeys: number;
  commandTimeoutMs: number;
  /** True when Redis mode selected a URL; the raw value is never retained. */
  redisUrlPresent: boolean;
  /** Redacted display form (`rediss://host:port/`); no credentials anywhere. */
  redisUrlRedacted: null | string;
}>;

const DEFAULT_MEMORY_NAMESPACE = "local";

// ---------------------------------------------------------------------------
// normalizeServerCacheConfig
// ---------------------------------------------------------------------------

/**
 * Normalizes the closed v1 variable set:
 *
 * SERVER_CACHE_BACKEND=memory|redis          default memory
 * SERVER_CACHE_NAMESPACE=<deployment>        optional in memory, required Redis
 * SERVER_CACHE_MEMORY_MAX_ENTRIES=<int>      default 200, 1..100000
 * SERVER_CACHE_MEMORY_MAX_BYTES=<int>        default 67108864, 1048576..1073741824
 * SERVER_CACHE_MAX_ENTRY_BYTES=<int>         default 2097152, 1024..min(total,...)
 * SERVER_CACHE_MAX_IN_FLIGHT_KEYS=<int>      default 1024, 16..10000
 * SERVER_CACHE_COMMAND_TIMEOUT_MS=<int>      default 50, 5..5000
 * REDIS_URL=redis://...|rediss://...         required only in Redis mode
 */
export function normalizeServerCacheConfig(env: ServerCacheEnvRecord): NormalizedServerCacheConfig {
  const backendRaw = env.SERVER_CACHE_BACKEND ?? "memory";
  if (backendRaw !== "memory" && backendRaw !== "redis") {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.backendInvalid);
  }
  const backend: ServerCacheBackend = backendRaw;

  const memoryMaxEntries = normalizeInteger(
    env.SERVER_CACHE_MEMORY_MAX_ENTRIES,
    200,
    1,
    100_000,
    SERVER_CACHE_CONFIG_ERROR_CODES.memoryMaxEntriesInvalid
  );
  const memoryMaxBytes = normalizeInteger(
    env.SERVER_CACHE_MEMORY_MAX_BYTES,
    67_108_864,
    1_048_576,
    1_073_741_824,
    SERVER_CACHE_CONFIG_ERROR_CODES.memoryMaxBytesInvalid
  );
  const entryCeiling = Math.min(memoryMaxBytes, SERVER_CACHE_LIMITS.maxPolicyValueBytes);
  const maxEntryBytes = normalizeInteger(
    env.SERVER_CACHE_MAX_ENTRY_BYTES,
    2_097_152,
    1_024,
    entryCeiling,
    SERVER_CACHE_CONFIG_ERROR_CODES.maxEntryBytesInvalid
  );
  const maxInFlightKeys = normalizeInteger(
    env.SERVER_CACHE_MAX_IN_FLIGHT_KEYS,
    SERVER_CACHE_LIMITS.defaultInFlightKeys,
    SERVER_CACHE_LIMITS.minInFlightKeys,
    SERVER_CACHE_LIMITS.maxInFlightKeys,
    SERVER_CACHE_CONFIG_ERROR_CODES.maxInFlightKeysInvalid
  );
  const commandTimeoutMs = normalizeInteger(
    env.SERVER_CACHE_COMMAND_TIMEOUT_MS,
    50,
    5,
    5_000,
    SERVER_CACHE_CONFIG_ERROR_CODES.commandTimeoutInvalid
  );

  if (maxEntryBytes < 1_024 || maxEntryBytes > entryCeiling || memoryMaxBytes < maxEntryBytes) {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.byteLimitsInconsistent);
  }

  const namespace = normalizeNamespace(env.SERVER_CACHE_NAMESPACE, backend);

  const redis =
    backend === "redis"
      ? (() => {
          const missingNamespace =
            env.SERVER_CACHE_NAMESPACE === undefined ||
            env.SERVER_CACHE_NAMESPACE === DEFAULT_MEMORY_NAMESPACE;
          if (missingNamespace) fail(SERVER_CACHE_CONFIG_ERROR_CODES.redisNamespaceRequired);
          const normalizedUrl = normalizeRedisUrl(env.REDIS_URL);
          if (normalizedUrl.redacted === null) {
            fail(SERVER_CACHE_CONFIG_ERROR_CODES.redisUrlRequired);
          }
          return normalizedUrl;
        })()
      : (() => {
          const normalizedUrl =
            env.REDIS_URL === undefined
              ? { required: false, redacted: null }
              : normalizeRedisUrl(env.REDIS_URL);
          return normalizedUrl;
        })();

  return {
    backend,
    namespace,
    memoryMaxEntries,
    memoryMaxBytes,
    maxEntryBytes: maxEntryBytes as CacheValueByteLimit,
    maxInFlightKeys,
    commandTimeoutMs,
    redisUrlPresent: redis.redacted !== null,
    redisUrlRedacted: redis.redacted,
  };
}

function normalizeNamespace(raw: string | undefined, backend: ServerCacheBackend): string {
  if (raw === undefined || raw === "") {
    if (backend === "redis") fail(SERVER_CACHE_CONFIG_ERROR_CODES.redisNamespaceRequired);
    // Deterministic memory-mode default.
    return DEFAULT_MEMORY_NAMESPACE;
  }
  if (
    !SERVER_CACHE_NAMESPACE_PATTERN.test(raw) ||
    raw.length > SERVER_CACHE_NAMESPACE_MAX_BYTES ||
    SERVER_CACHE_NAMESPACE_SEPARATORS.includes(
      raw.charAt(0) as (typeof SERVER_CACHE_NAMESPACE_SEPARATORS)[number]
    ) ||
    SERVER_CACHE_NAMESPACE_SEPARATORS.includes(
      raw.charAt(raw.length - 1) as (typeof SERVER_CACHE_NAMESPACE_SEPARATORS)[number]
    )
  ) {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.namespaceInvalid);
  }
  if (backend === "redis" && raw === DEFAULT_MEMORY_NAMESPACE) {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.redisNamespaceRequired);
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Redacted diagnostics
// ---------------------------------------------------------------------------

/**
 * Bounded diagnostics safe for receipts and telemetry: every field is either a
 * code-owned scalar or the redacted Redis target. No credential, path, query
 * or userinfo fragment survives.
 */
export function serverCacheConfigDiagnostics(config: NormalizedServerCacheConfig): Readonly<{
  backend: ServerCacheBackend;
  namespace: string;
  memoryMaxEntries: number;
  memoryMaxBytes: number;
  maxEntryBytes: number;
  maxInFlightKeys: number;
  commandTimeoutMs: number;
  redisUrlPresent: boolean;
  redisUrlRedacted: null | string;
}> {
  return Object.freeze({
    backend: config.backend,
    namespace: config.namespace,
    memoryMaxEntries: config.memoryMaxEntries,
    memoryMaxBytes: config.memoryMaxBytes,
    maxEntryBytes: config.maxEntryBytes as number,
    maxInFlightKeys: config.maxInFlightKeys,
    commandTimeoutMs: config.commandTimeoutMs,
    redisUrlPresent: config.redisUrlPresent,
    redisUrlRedacted: config.redisUrlRedacted,
  });
}

// ---------------------------------------------------------------------------
// Mandatory policy capacity (startup gate)
// ---------------------------------------------------------------------------

export type ServerCachePolicyCapacityDescriptor = Readonly<{
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  ttlMs: PositiveCacheTtlMs;
  maxValueBytes: CacheValueByteLimit;
  tags: readonly CacheTag[];
  mandatory: boolean;
}>;

/**
 * Closed catalog handoff from TASK-551-08-L03. Unknown fields and duplicate
 * family/schema descriptors fail startup before any listen.
 */
export type ServerCachePolicyCapacityCatalog = Readonly<{
  policies: readonly ServerCachePolicyCapacityDescriptor[];
}>;

export type CachePolicyCapacityRequirement = Readonly<{
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  ttlMs: PositiveCacheTtlMs;
  maxValueBytes: CacheValueByteLimit;
  /** Exact maximum canonical key bytes for this namespace. */
  maxKeyBytes: number;
  mandatory: boolean;
}>;

/** One catalog descriptor with every branded scalar already normalized. */
type NormalizedCatalogEntry = Readonly<{
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  ttlMs: PositiveCacheTtlMs;
  maxValueBytes: CacheValueByteLimit;
  tags: readonly CacheTag[];
  mandatory: boolean;
}>;

/**
 * Maps a branded-scalar normalizer onto the catalog failure code, so an
 * out-of-range version, TTL or byte limit aborts startup as
 * `server_cache_policy_catalog_invalid` instead of leaking another code.
 */
function normalizeCatalogScalar<T>(normalize: (value: unknown) => T, value: unknown): T {
  try {
    return normalize(value);
  } catch {
    return fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
  }
}

/**
 * Validates the closed catalog: exact field sets, in-union families and tags,
 * normalized scalar domains and duplicate descriptors compared on NORMALIZED
 * values. Field names alone are never enough -- an understated byte limit, an
 * unknown family string or a non-integer schema version must abort startup
 * rather than silently degrade a mandatory policy.
 */
function normalizeCatalog(
  catalog: ServerCachePolicyCapacityCatalog
): readonly NormalizedCatalogEntry[] {
  if (typeof catalog !== "object" || catalog === null) {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
  }
  const record = catalog as unknown as Record<string, unknown>;
  if (Object.keys(record).join(",") !== "policies") {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
  }
  const policies = record.policies as unknown;
  if (!Array.isArray(policies) || policies.length < 1) {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
  }
  const seenDescriptors = new Set<string>();
  const normalized: NormalizedCatalogEntry[] = [];
  for (const policy of policies) {
    if (typeof policy !== "object" || policy === null) {
      fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
    }
    const entry = policy as unknown as Record<string, unknown>;
    if (
      Object.keys(entry).sort().join(",") !==
        ["family", "mandatory", "maxValueBytes", "schemaVersion", "tags", "ttlMs"]
          .sort()
          .join(",") ||
      Object.getOwnPropertySymbols(entry).length !== 0 ||
      typeof entry.mandatory !== "boolean"
    ) {
      fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
    }
    if (!isCacheFamily(entry.family)) {
      fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
    }
    const tags = entry.tags;
    if (!Array.isArray(tags) || tags.length < 1 || tags.length > SERVER_CACHE_LIMITS.maxTags) {
      fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
    }
    const seenTags = new Set<string>();
    for (const tag of tags) {
      if (!isCacheTag(tag) || seenTags.has(tag)) {
        fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
      }
      seenTags.add(tag);
    }
    const normalizedEntry: NormalizedCatalogEntry = {
      family: entry.family,
      schemaVersion: normalizeCatalogScalar(normalizeCacheSchemaVersion, entry.schemaVersion),
      ttlMs: normalizeCatalogScalar(normalizePositiveCacheTtlMs, entry.ttlMs),
      maxValueBytes: normalizeCatalogScalar(normalizeCacheValueByteLimit, entry.maxValueBytes),
      tags: Object.freeze([...seenTags]) as readonly CacheTag[],
      mandatory: entry.mandatory,
    };
    // Duplicate detection keys on normalized values, never on raw string
    // concatenation: distinct descriptors cannot collapse into one key form
    // (the old `family@sv<version>` spelling collided across spellings) and
    // one policy cannot register twice.
    const descriptorKey = JSON.stringify([normalizedEntry.family, normalizedEntry.schemaVersion]);
    if (seenDescriptors.has(descriptorKey)) {
      fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
    }
    seenDescriptors.add(descriptorKey);
    normalized.push(normalizedEntry);
  }
  return normalized;
}

/**
 * Derives the per-policy startup requirements against one store description.
 * Pure computation: callers decide whether an impossible entry aborts startup.
 */
export function computeServerCachePolicyCapacityRequirements(
  catalog: ServerCachePolicyCapacityCatalog,
  storeDescription: ServerCacheStoreDescription,
  namespace: string
): readonly CachePolicyCapacityRequirement[] {
  const normalized = normalizeCatalog(catalog);
  const namespaceMaxKeyBytes = maxServerCacheKeyBytes(namespace);
  return normalized.map((policy) => ({
    family: policy.family,
    schemaVersion: policy.schemaVersion,
    ttlMs: policy.ttlMs,
    maxValueBytes: policy.maxValueBytes,
    maxKeyBytes: namespaceMaxKeyBytes,
    mandatory: policy.mandatory,
  }));
}

/**
 * Startup gate for every mandatory policy:
 * `maxKeyBytes(namespace) + policy.maxValueBytes <= store.maxEntryBytes`, with
 * safe-integer accounting. Missing descriptors and impossible entries raise the
 * redacted `server_cache_policy_exceeds_store_entry_bytes` code instead of
 * silently degrading a mandatory policy to permanent misses.
 */
export function assertMandatoryPolicyCapacity(
  catalog: ServerCachePolicyCapacityCatalog,
  storeDescription: ServerCacheStoreDescription,
  namespace: string
): void {
  const normalized = normalizeCatalog(catalog);
  if (storeDescription.backend !== "memory" && storeDescription.backend !== "redis") {
    fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyCatalogInvalid);
  }
  const entryCeiling = normalizeCacheValueByteLimit(storeDescription.maxEntryBytes);
  const namespaceMaxKeyBytes = maxServerCacheKeyBytes(namespace);
  for (const policy of normalized) {
    if (!policy.mandatory) continue;
    const totalBytes = namespaceMaxKeyBytes + policy.maxValueBytes;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > entryCeiling) {
      fail(SERVER_CACHE_CONFIG_ERROR_CODES.policyExceedsStoreEntryBytes);
    }
  }
}
