# TASK-551-09-L04: Admin Identity and Security Cache Hardening
# FileName: TASK-551-09-L04-Admin-Identity-And-Security-Cache-Hardening.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-09
**Priority:** Critical
**Category:** Admin Cache / Security / Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-551-09-L03
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Objective

Prevent browser cache hydration across Admin identities/permissions, isolate
storage and cacheBus failures from authoritative API results, prevent stale
async completions, and keep secret security settings local while making their
cross-replica freshness bounded and generation-aware.

## Exclusive Ownership

Sole writer of:

- `core/admin/services/adminAuthIdentity.ts`;
- new `core/admin/services/adminCacheIdentity.ts`;
- `core/admin/services/authClient.ts`;
- `core/admin/ui/contexts/AdminAuthContext.tsx`;
- `core/admin/services/cachePolicy.ts`;
- `core/admin/utils/storageCache.ts`;
- `core/admin/utils/cacheBus.ts`;
- `core/admin/utils/readThroughCache.ts`;
- `core/services/settings/securitySettings.ts`;
- new `core/services/cache/securitySettingsCache.ts`;
- `tests/vitest/admin/storageCache.test.ts`;
- `tests/vitest/admin/cacheBusHardening.test.ts`;
- new `tests/vitest/admin/admin-cache-identity.test.ts`;
- new `tests/vitest/admin/read-through-cache-generation.test.ts`;
- `tests/unit/security/securitySettings.test.ts`;
- new `tests/integration/server/security-settings-cache-coherence.test.ts`.

Forbidden: other Admin resource clients/UI, publicSite/site/domain invalidation,
07/08 owners, auth/session route contracts, TASK-517/493/511, migrations/
packages and shared docs/tasks. Existing generic cache clients consume the
transparent scoped key/storage contract without per-client edits.

## Admin Browser Contract

- Preserve `AdminAuthIdentitySnapshot.userId/epoch` for existing consumers and
  add a separate `AdminCacheIdentitySnapshot` containing schema version,
  deployment identity, opaque SHA-256 scope digest, auth epoch and permission
  fingerprint. Raw user ID/email/roles/permissions never appear in storage keys.
- Derive the digest with browser Web Crypto from canonical
  `origin + userId + sorted permission/role IDs`. Publish `scope=null` first and
  only install an async digest if the auth epoch is still current. Cache reads/
  writes before scope readiness are safe misses/no-ops, not unscoped access.
- Versioned storage key is
  `coderso:admin-cache:v2:<scopeDigest>:<boundedResourceKey>`. Envelope includes
  schema, identical scope digest, saved time and value; reject unknown/mismatch.
  Export and reuse exact limits
  `ADMIN_CACHE_MAX_RESOURCE_KEY_BYTES = 512`,
  `ADMIN_CACHE_MAX_OWNED_KEYS_PER_SCOPE = 512`, and
  `ADMIN_CACHE_MAX_OWNED_KEY_INDEX_BYTES = 65_536`. UTF-8 resource keys outside
  `1..512` fail closed as cache miss/no-op. Maintain the per-scope owned-key
  index inside both count and serialized-byte caps; evict its oldest owned key
  before adding a new one, and never scan browser storage.
- Login, logout, unauthorized bootstrap, user change and permission fingerprint
  change increment epoch, abort stale work, clear in-memory values and make old
  storage inaccessible. A bounded one-time migration removes known legacy v1
  keys; never scan unbounded browser storage.
- Wrap storage acquisition/get/set/remove, JSON stringify/parse, BroadcastChannel,
  localStorage fallback and every subscriber independently. Quota/private-mode/
  transport/subscriber failure is recorded best-effort and cannot make a
  successful API mutation reject. Update the old hardening test that expected
  subscriber exceptions to escape.
- CacheBus events carry schema and scope digest; mismatched/unknown scopes are
  ignored. Dirty editor/background revalidation behavior remains unchanged.
- `readThroughCache` captures auth epoch plus a monotonically increasing
  generation. Invalidate/force increments generation; an older completion may
  return to its original caller but cannot populate cache over a newer result.

## Secret Security-Settings Contract

- Decrypted `SecuritySettings` remains process-local only, never Redis. Local
  entry stores settings, loaded generation and monotonic expiry with exact
  `SECURITY_SETTINGS_LOCAL_TTL_MS = 1_000`.
- Policy tag is `settings:security`. Each `getSecuritySettings` first obtains a
  trustworthy generation-token through server cache. Trust requires successful
  transport plus no pending/unknown invalidation or local/shared coherence-
  degraded signal for this family; an oldest-pending age above 5 seconds always
  raises that signal, but security reads do not wait 5 seconds before bypassing
  known uncertainty. Matching unexpired local entry may return; generation
  mismatch reloads the narrow DB row. Failed/malformed missing-generation
  initialization, Redis unavailable, circuit open/disconnected, pending/unknown
  invalidation, malformed reply or any transport uncertainty means coherence is unproved:
  evict/bypass local and read DB, with no stale-while-revalidate and no bounded-
  eventual public-cache allowance.
- `setSecuritySettings` becomes an explicit transaction: persist encrypted/
  redacted stored data and Redis outbox plan in the same commit, then update the
  generation after commit. Store the new local value only after a successful
  apply/re-read returns the exact trustworthy new token. A queued/bypassed/
  uncertain result clears the local entry and subsequent reads use DB. Rollback
  leaves cache/generation unchanged. Cache transport failure cannot reverse
  committed success.
- Public projection remains redacted exactly as today. Metrics contain only
  family/hit/miss/bypass code; no keys or values.

## Implementation Pseudocode

```ts
publishAuthEpochImmediately(user);
void deriveAdminCacheScope(user, permissions).then((scope) => {
  if (isCurrentEpoch(scope.epoch)) publishCacheScope(scope);
});

async function getSecuritySettings() {
  const generation = await securityGenerationOrNull();
  if (generation && local.matches(generation) && local.isFresh()) return local.value;
  if (!generation) local.clear();
  const value = await loadAndDecryptSecuritySettingsFromDb();
  if (generation) local.set(value, generation, 1_000);
  return value;
}
```

## Security Contract

- **Visibility/routes:** existing `/auth/*` and Admin settings routes only; no
  new endpoint or payload field.
- **Auth/RBAC:** resource cache requires current authenticated scope and cannot
  widen permissions; settings permissions remain server-authoritative.
- **CSRF/rate limits:** existing login/logout/settings write contracts unchanged.
- **Validation:** strict scope/envelope/event fields and bounded key index/
  storage payload; exact 512-byte resource-key, 512-index-entry and 65,536-byte
  index caps; reject unknown data.
- **Secrets/privacy:** no raw identity/permission, credentials or decrypted
  settings in localStorage, cacheBus, Redis, outbox, log or metric.
- **Anti-abuse:** existing login/reset bot protection and limits remain; cache
  outage never bypasses them.

## Regression Shape and Validation

Test A→logout→B, same user permission change, async digest race, reload/current
scope, legacy key denial, quota/private storage, throwing getter/set/remove,
BroadcastChannel/fallback/subscriber failures, scope mismatch and bounded index.
Test stale forced-read completion cannot overwrite newer. For security settings,
test local hit, exact 1 s expiry, two-client generation change, missing-generation
token initialization, Redis disconnect/reconnect with pending outbox DB bypass,
>5-second degraded state, no secret Redis value bytes, commit/rollback and
post-commit applied vs queued/bypassed response. Pin Admin key/index exact/max+1
count and byte behavior.

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/admin/storageCache.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts \
  tests/vitest/admin/admin-cache-identity.test.ts \
  tests/vitest/admin/read-through-cache-generation.test.ts
SERVER_CACHE_BACKEND=memory bun test tests/unit/security/securitySettings.test.ts \
  tests/integration/server/security-settings-cache-coherence.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l04 bun test \
  tests/integration/server/security-settings-cache-coherence.test.ts
bun run check:admin-boundary
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/services/{adminAuthIdentity,adminCacheIdentity,authClient,cachePolicy}.ts \
  core/admin/ui/contexts/AdminAuthContext.tsx \
  core/admin/utils/{storageCache,cacheBus,readThroughCache}.ts \
  core/services/settings/securitySettings.ts core/services/cache/securitySettingsCache.ts \
  tests/vitest/admin/{storageCache,cacheBusHardening,admin-cache-identity,read-through-cache-generation}.test.ts \
  tests/{unit/security,integration/server}/security-settings*.test.ts
```

Update `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md` and security/cache docs
only through TASK-551-10-L02; do not edit changelog 1263 here.
