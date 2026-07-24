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

## Objective

Implement TASK-551-07-L01's `ServerCacheStore` over Bun's native Redis client
with exact timeouts, atomic generation-token replacement, conditional writes,
bounded health and DB-bypass failure semantics. Do not wire server startup,
outbox, Pub/Sub or distributed leases.

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
- Tag identity is the SHA-256 digest of one L01 finite site/family tag. No v1
  record-id/slug/path generation key exists. One bounded Lua operation
  atomically initializes any missing generation to caller-supplied fresh,
  non-reusable 32-hex tokens before lookup; bump atomically replaces every
  requested token. `readGenerations` returns only fully initialized snapshots.
- Implement L01 `writeIfGenerationsMatch` as one bounded Lua script: compare all
  expected finite generation tokens and `SET ... PX` one or two encoded entries,
  or write none. Script keys/arguments/replies obey the shared exact limits.
- All commands use `SERVER_CACHE_COMMAND_TIMEOUT_MS`. Timeout, disconnect,
  malformed reply or uncertain write becomes a typed store failure consumed by
  TASK-551-07-L02's coordinator circuit; it never returns guessed/stale bytes.
- The generic coordinator circuit is closed/half-open/open with one probe and
  bounded exponential cooldown. Redis health exposes only ready/degraded,
  last stable code and timing counters—never URL, key, command payload or reply.
- Corrupt envelopes are handled by `ServerCache`; its best-effort delete failure
  is telemetry only. `close()` is idempotent and closes only this adapter's owned
  command client. TASK-551-08-L03 runtime owns worker/PubSub shutdown.

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

## Regression Shape and Validation

Against isolated unique namespaces, test byte parity, TTL, delete, exact/max+1,
two-client missing-generation initialization, fresh/non-reused token replacement,
concurrent bump visibility, finite tag rejection, one/two-entry conditional-write
atomicity and stale-generation rejection, namespace isolation, corrupt replies,
timeout, refused connection, mid-command disconnect, circuit open/half-open/
recovery, startup URL/auth/version failures and redacted diagnostics. Cleanup only
test-owned keys using the known namespace inventory, never global `FLUSH*`/`KEYS`.

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

Redis is a required gate for completion; an unavailable Redis service is a
reported blocker, not a skipped passing test. Docs are handed to 10-L02.
