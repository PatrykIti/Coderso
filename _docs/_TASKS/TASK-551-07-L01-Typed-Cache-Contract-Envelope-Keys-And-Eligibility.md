# TASK-551-07-L01: Typed Cache Contract, Envelope, Keys, and Eligibility
# FileName: TASK-551-07-L01-Typed-Cache-Contract-Envelope-Keys-And-Eligibility.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-07
**Priority:** High
**Category:** Cache / Contracts / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-551-06-L03; consumes TASK-551-01/02 contracts
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Objective

Own the Bun-free typed boundary used by all memory and Redis implementations:
strict policies/envelopes, canonical SHA-256 keys, eligibility, invalidation
plans and validated infrastructure configuration. Do not implement a store.

## Exclusive Ownership

This leaf is the sole writer of:

- new `core/services/cache/serverCacheContracts.ts`;
- new `core/services/cache/serverCacheCodec.ts`;
- new `core/services/cache/serverCacheKeys.ts`;
- new `core/services/cache/serverCacheEligibility.ts`;
- new `core/services/cache/serverCacheConfig.ts`;
- new `tests/vitest/cache/server-cache-contracts.test.ts`;
- new `tests/vitest/cache/server-cache-codec-keys.test.ts`;
- new `tests/vitest/cache/server-cache-eligibility.test.ts`.

Forbidden: `serverCache.ts`, memory/Redis adapters, public runtime, existing
site/Admin cache, domain services, DB/schema/migrations, server lifecycle,
TASK-517, TASK-493 and TASK-511 paths, docs/board/changelog/workflows and package
manifests.

## Exact Owned Surface

Preserve the parent names and export them only from
`serverCacheContracts.ts`: `ServerCacheBackend`, `CacheFamily`, `CacheTag`,
`CacheKey`, `CacheGenerationToken`, `CacheGenerations`,
`CacheEligibilityContext`, `CachePolicy<T>`, `CacheConditionalWrite`,
`ServerCacheStore`, `ServerCacheHealth`, `CacheInvalidationPlan`, and an optional
`DistributedCacheLoadCoordinator`. `decode` is the only authority for a policy's
value. `NegativeCacheTtlMs` is an opaque normalized number whose constructor
accepts only integer `5_000..15_000`; production callers must obtain it through
that constructor rather than an assertion. The exact v1 policy addition is:

```ts
type NegativeCacheTtlMs = number & {
  readonly __negativeCacheTtlMs: "5_000..15_000";
};

type CachePolicy<T> = {
  family: CacheFamily;
  schemaVersion: number;
  ttlMs: number;
  maxValueBytes: number;
  tags: readonly CacheTag[];
  negativeTtlMs: null | NegativeCacheTtlMs;
  stalePolicy: "forbid"; // v1 never serves an expired/SWR value
  decode: (input: unknown) => T;
  isEligible: (context: CacheEligibilityContext) => boolean;
};
```

`CacheFamily` is exactly the finite union `public-runtime | public-html-manifest
| public-html | redirects | site-shell | pages | entries | posts | listings |
forms | public-settings | themes | security-settings-generation`. `CacheTag` is
exactly `site:all | site:runtime | site:html | site:redirects | site:shell |
site:pages | site:entries | site:posts | site:listings | site:forms |
site:settings | site:themes | settings:security`. Unknown or variable-suffixed
families/tags fail closed. V1 deliberately maps record ids, slugs, and paths to
these finite family/site generations; variable identity appears only inside the
digested canonical input, preventing unbounded Redis generation metadata.

`CacheGenerationToken` is an opaque lowercase 32-hex-character cryptographic
token. Reading a missing site/family generation atomically initializes and
returns a fresh non-reusable token before any value lookup; bump replaces tokens
instead of incrementing/resetting an integer. Tests inject a deterministic token
source, while production uses cryptographic randomness.

`ServerCacheEnvelopeV1` is recursively reject-unknown and contains only:

```ts
type ServerCacheEnvelopeV1 = {
  schema: "coderso.server-cache-envelope@v1";
  family: CacheFamily;
  schemaVersion: number;
  writtenAtUnixMs: number;
  expiresAtUnixMs: number;
  generationDigest: string;
  value: unknown;
};
```

Export and reuse these exact limits:

```ts
SERVER_CACHE_LIMITS = {
  maxKeyBytes: 512,
  maxCanonicalInputBytes: 65_536,
  maxDebugLabelBytes: 128,
  maxTags: 32,
  maxTagBytes: 128,
  maxEventKeyBytes: 128,
  maxConditionalWrites: 2,
  maxPolicyTtlMs: 3_600_000,
  ttlJitterMinRatio: 0.90,
  ttlJitterMaxRatio: 1.00,
};
```

Canonical input accepts only null, booleans, finite numbers, strings, arrays
and plain objects; object keys sort by UTF-8 bytes. Reject undefined, holes,
cycles, non-finite numbers, prototypes and over-limit input before hashing.
Tags accept only the finite literals above, deduplicate and sort. Event keys use
the internal `cache-event:<uuid>` form and must fit `maxEventKeyBytes`. The input
and generation projections use lowercase SHA-256; the bounded debug label is
metadata, never key identity. The final key is exactly
`coderso:<namespace>:server-cache:v1:<family>:sv<schemaVersion>:<generationDigest>:<inputDigest>`.

`CacheConditionalWrite` contains one or two already-encoded entries, the finite
tag set, and its expected generation snapshot. Its exact handoff is:

```ts
type CacheConditionalWriteEntry = {
  key: CacheKey;
  encodedEnvelope: Uint8Array;
  ttlMs: number;
};

type CacheConditionalWrite = {
  expectedGenerations: CacheGenerations;
  tags: readonly CacheTag[];
  entries:
    | readonly [CacheConditionalWriteEntry]
    | readonly [CacheConditionalWriteEntry, CacheConditionalWriteEntry];
};

writeIfGenerationsMatch(input: CacheConditionalWrite): Promise<boolean>;
```

It compares every current generation and writes all entries or none. Memory does
so synchronously in-process; Redis parity is one bounded Lua script owned by
TASK-551-08-L01. This is the only primitive TASK-551-09 may use for coupled HTML
value/dependency-manifest publication.

`normalizeServerCacheConfig(env)` owns exactly:

```text
SERVER_CACHE_BACKEND=memory|redis      # default memory
SERVER_CACHE_NAMESPACE=<deployment>   # optional in memory; required in Redis
SERVER_CACHE_MEMORY_MAX_ENTRIES=<int> # default 200, 1..100000
SERVER_CACHE_MEMORY_MAX_BYTES=<int>   # default 67108864, 1048576..1073741824
SERVER_CACHE_MAX_ENTRY_BYTES=<int>    # default 2097152, 1024..min(total,16777216)
SERVER_CACHE_COMMAND_TIMEOUT_MS=<int> # default 50, 5..5000
REDIS_URL=redis://...|rediss://...    # required only in Redis mode
```

An omitted memory namespace normalizes deterministically to `local`. Every other
namespace is 1–128 ASCII `[A-Za-z0-9._-]` bytes and cannot begin/end with a
separator. Redis always requires an explicit non-`local` deployment namespace.
Credentials in `REDIS_URL` never appear in normalized diagnostics. Unknown
backend, malformed integer/URL/namespace or inconsistent byte limits fail
startup; malformed Redis configuration fails startup when Redis is explicitly
selected. Domain TTLs remain policies, not ENV. TASK-551-10-L02 is the sole
`.env.example` writer for both database and server-cache variables;
TASK-551-02-L02 supplies normalized database values/comments as a read-only
handoff rather than editing that shared file.

Eligibility is fail-closed. The context must explicitly prove public,
unauthenticated, non-preview, non-private/password, non-nonce, known bounded
query variant and successful cacheable status. Negative results are allowed
only when `negativeTtlMs` is non-null and normalized to 5–15 seconds.
`stalePolicy` is always `"forbid"` in v1: no policy serves expired data or uses
stale-while-revalidate. Security/auth values are never eligible at all; the
`security-settings-generation` family stores generation metadata only.

## Implementation Pseudocode

```ts
const config = normalizeServerCacheConfig(processEnvRecord);
const generations = normalizeGenerations(await store.readGenerations(policy.tags));
const key = await buildServerCacheKey({
  namespace: config.namespace,
  family: policy.family,
  schemaVersion: policy.schemaVersion,
  generations,
  input: canonicalInput,
});
const decoded = decodeServerCacheEnvelope(bytes, policy);
if (!decoded.ok || decoded.value.expiresAtUnixMs <= now()) return cacheMiss(decoded.reason);
return policy.decode(decoded.value.value);
```

Configuration errors are stable machine-readable `server_cache_config_*`
errors. Runtime envelope/key/eligibility faults do not escape as domain values;
they return a typed bypass reason and bounded redacted telemetry.

## Security Contract

- **Visibility/routes:** no route changes; all modules are server/pure only.
- **Auth/RBAC/CSRF/rate limits:** unchanged and never cached by this policy.
- **Validation:** strict unknown rejection and all limits above; no arbitrary
  cache command/key comes from an API body.
- **Secrets/privacy:** prohibit raw URLs, query strings, cookies, tokens, nonces,
  PII, bind values, secrets and decrypted settings in keys/debug metadata.
- **Anti-abuse:** no public write; hostile canonical inputs fail before large
  allocation or hashing.

## Regression Shape and Validation

Pin canonical object-order, Unicode, numeric, schema-version, generation-order
and key vectors;
prove a legal path containing `|` cannot collide; reject every max+1 and unknown
field; test wrong family/version/expiry/digest; verify eligibility matrix and
that redacted config never exposes Redis credentials. Test the exact finite
family/tag unions, fresh initialization of missing generation tokens, no token
reuse, event-key and conditional-write max+1, memory namespace `local`, required
Redis namespace, negative TTL null/4,999/5,000/15,000/15,001, and
`writeIfGenerationsMatch` all-or-nothing behavior.

```bash
bun run test:vitest -- tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/cache/serverCache{Contracts,Codec,Keys,Eligibility,Config}.ts \
  tests/vitest/cache/server-cache-{contracts,codec-keys,eligibility}.test.ts
```

Send exact env/envelope/key/eligibility documentation to TASK-551-10-L02; do
not edit shared docs or changelog here.
