# TASK-551-08-L01: Redis Adapter and Failure Semantics
# FileName: TASK-551-08-L01-Redis-Adapter-And-Failure-Semantics.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-08
**Priority:** Critical
**Category:** Cache / Redis / Reliability / Security
**Estimated Effort:** Large
**Dependencies:** TASK-551-07-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Implement TASK-551-07-L01's `ServerCacheStore` over Bun's native Redis client
with exact timeouts, atomic generation-token replacement, conditional writes,
bounded backend-health signals and DB-bypass failure semantics. The constructor
consumes, but never creates, L02's one process coherence controller. Do not wire
server startup, outbox, Pub/Sub or distributed leases.

## Sub-Tasks

None. This file is an executable leaf under TASK-551-08.

## Exclusive Ownership

Sole writer of:

- new `core/services/cache/redisServerCacheClient.ts`;
- new `core/services/cache/redisServerCacheStore.ts`;
- new `core/services/cache/redisServerCacheHealth.ts`;
- new `tests/integration/server/redis-server-cache-store.test.ts`;
- new `tests/integration/server/redis-server-cache-outage.test.ts`.

Forbidden: TASK-551-07 files, outbox/schema/migrations/PubSub/lease/runtime
composition, `httpServer.ts`, public/domain/Admin cache, TASK-517/493/511,
package manifests/lockfile and shared docs/tasks.

## Store and Failure Contract

- Re-check the Bun 1.3.14+ native Redis API and pin behavior in adapter tests.
  Connect only to `redis:`/`rediss:` URL supplied by normalized L01 config.
- On explicit Redis startup, bounded `PING` plus server-version capability check
  must prove Redis 7.2+. Configuration/auth/TLS/version failure is a stable
  redacted `server_cache_redis_startup_failed` and blocks startup.
- Value operations are `GET`, `SET key bytes PX ttl`, and `DEL` on L01 keys.
  Never create an in-process value mirror. `Uint8Array` bytes round-trip exactly.
  `describe()` returns only the immutable Redis backend and normalized total
  entry ceiling required by L01 startup policy-capacity validation.
- Tag identity is the SHA-256 digest of one L01 finite site/family tag. No v1
  record-id/slug/path generation key exists. One bounded Lua operation
  atomically initializes any missing generation to caller-supplied fresh,
  non-reusable 32-hex tokens before lookup; bump atomically replaces every
  requested token. `readGenerations` returns only fully initialized snapshots.
- Implement L01 `writeIfGenerationsMatch` as one bounded Lua script: compare all
  expected finite generation tokens and `SET ... PX` one or two encoded entries,
  or write none. Before Lua, require L01's coordinator-created conditional-entry
  brand and strictly decode every envelope. Require
  `entry.fillKind === envelope.fillKind`; select `policyPositiveTtlMs` for
  `positive`, or require and select non-null `policyNegativeTtlMs` for `negative`.
  Recheck `ttlMs` and envelope lifetime against that selected ceiling, encoded
  bytes against `policyMaxValueBytes`, and
  `UTF8(key).byteLength + encodedEnvelope.byteLength` against the configured total
  entry ceiling. Reject unknown/malformed discriminator data, null-negative
  policy, forged/mutated brands or any one-entry mismatch for the entire bundle
  before acquiring a command deadline or issuing **any** Redis command/Lua call.
  `redisServerCacheStore.ts` owns and exports the exact internal helper
  `validateRedisConditionalWriteBeforeCommand(write, storeMaxEntryBytes)` for this
  store and L03's lease-plus-generation writer only; it returns normalized
  immutable keys/arguments or throws the stable redacted validation error. It is
  never re-exported through `ServerCache`, runtime, domain or public facades.
  Script keys/arguments/replies obey the shared exact limits. This is explicitly
  the generation-only store primitive called internally only by `ServerCache`
  for non-distributed paths; it is not re-exported through a public/domain/
  compatibility facade. A
  distributed owner must never call it because it cannot prove current lease
  ownership. TASK-551-08-L03 exclusively implements L01's separate combined
  `owner.putIfGenerationsAndLeaseOwned(...)` Lua operation.
- All commands use `SERVER_CACHE_COMMAND_TIMEOUT_MS`. Timeout, disconnect or a
  malformed reply never returns guessed/stale bytes. For a dispatched conditional
  write, return L01's `kind:"unknown", physicalOutcome:"unknown"` because Redis
  may physically have executed the script; only a positively normalized
  `written` reply authorizes publication. A later independent GET may use
  physically present bytes only after normal strict envelope and expected-
  generation-digest validation.
- The generic coordinator circuit is closed/half-open/open with one probe and
  bounded exponential cooldown. The adapter reports exact `redis_store`
  force/recover signals (reason `redis_unavailable`, affected tags `"all"`,
  normalized pending age/time/stable code) to its injected L01 controller.
  Obtain a fresh source-bound controller observation token before each async
  health/command probe and attach it to the resulting report, so a delayed
  success cannot recover a newer failure.
  `health()` passes only `{ backend: "redis", readiness, stableCode }` to
  `controller.health(...)`; the controller deterministically returns the exact
  `ServerCacheHealth`. Timing counters remain bounded telemetry outside that
  type. Neither adapter nor L03 creates another coherence owner, and
  malformed/unknown health can never authorize a value read.
- Corrupt envelopes are handled by `ServerCache`; its best-effort delete failure
  is telemetry only. `close()` is idempotent and closes only this adapter's owned
  command client. TASK-551-08-L03 runtime closes the L02 worker/PubSub handle and
  distributed coordinator before the store.

## Implementation Pseudocode

```ts
const client = createNativeRedisClient(redactedConfig);
await withCommandDeadline("startup", () => assertRedis72(client));

async function get(key) {
  return withCommandDeadline("get", () => client.getBuffer(key));
}
async function bumpGenerations(tags) {
  const keys = tags.map(toDigestedGenerationKey);
  return normalizeGenerationReply(
    await withCommandDeadline("generation_bump", () =>
      evalBounded(REPLACE_GENERATIONS_LUA, keys, freshTokens(tags.length)))
  );
}
async function writeIfGenerationsMatch(write) {
  const validated = validateRedisConditionalWriteBeforeCommand(
    write,
    config.maxEntryBytes,
  ); // internally strict-decodes, matches fillKind, selects ceiling and checks bytes
  // Validation failure above performs zero Redis commands.
  return normalizeConditionalWriteReplyOrUnknownPhysicalOutcome(
    await withCommandDeadline("conditional_write", () =>
      evalBounded(WRITE_IF_GENERATIONS_MATCH_LUA, validated.keys, validated.args)
    ),
  );
}
```

Runtime store failures must cause a measured cache bypass and authoritative
loader execution. They do not fail a public read or rewrite a committed domain
mutation. Explicit startup misconfiguration is not silently downgraded to
memory. No Redis operation uses `KEYS`, `SCAN`, blocking commands or unbounded
scripts/replies.

## Security Contract

- **Visibility/routes:** no route changes.
- **Auth/RBAC/CSRF/rate limits:** unchanged and evaluated outside cache.
- **Validation:** exact config/key/tag/TTL/byte/reply bounds; no user command.
- **Secrets/privacy:** redact full URL, credentials, raw keys/values and replies;
  TLS/auth remain `REDIS_URL` infrastructure only.
- **Anti-abuse:** fixed command/script allowlist and deadlines prevent arbitrary
  Redis access or unbounded work.

## Testing Requirements

Against isolated unique namespaces, test byte parity, TTL, delete, exact/max+1,
two-client missing-generation initialization, fresh/non-reused token replacement,
concurrent bump visibility, finite tag rejection, one/two-entry conditional-write
atomicity, raw/forged/mutated-brand rejection, positive and negative success,
entry/envelope `fillKind` mismatch, unknown/malformed discriminator, null-negative
policy, positive/negative TTL and envelope-lifetime ceiling mismatch, policy-byte/
total-byte rejection and stale-generation rejection. For every invalid one- or
two-entry bundle assert zero Redis commands, including zero Lua evaluation; the
other valid entry cannot partially write. Prove the store exposes no lease-bearing or distributed-owner fill
surface, no consumer can invoke its internal conditional-write method, and record
the L03 handoff: a distributed owner cannot substitute this generation-only
write. Also test namespace isolation, corrupt replies, timeout,
refused connection,
mid-command disconnect, circuit open/half-open/
recovery, startup URL/auth/version failures and redacted diagnostics. Cleanup only
test-owned keys using the known namespace inventory, never global `FLUSH*`/`KEYS`.
For pre-dispatch failure prove no physical write; for timeout/disconnect/malformed
reply after dispatch prove `unknown` physical outcome, zero published/joiner
authorization, and safe later independent hit only after strict generation digest.
Assert every failure/recovery signal, reverse-completion watermark ordering, and
deterministic controller-composed health;
timing counters must not leak into the exact health payload.

```bash
set -a && source .env && set +a
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-l01 \
  bun test tests/integration/server/redis-server-cache-store.test.ts \
  tests/integration/server/redis-server-cache-outage.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/cache/redisServerCache*.ts \
  tests/integration/server/redis-server-cache-*.test.ts
```

## Documentation Updates Required

Redis is a required gate for completion; an unavailable Redis service is a
reported blocker, not a skipped passing test. Docs are handed to 10-L02.
