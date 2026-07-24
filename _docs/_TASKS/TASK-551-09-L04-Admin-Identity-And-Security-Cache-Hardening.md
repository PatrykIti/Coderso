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

## Overview

Prevent browser cache hydration across Admin identities/permissions, isolate
storage and cacheBus failures from authoritative API results, prevent stale
async completions, and make decrypted security settings DB-authoritative with no
process-local, browser, or Redis value cache.

## Sub-Tasks

None. This file is an executable leaf under TASK-551-09.

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
- `tests/vitest/admin/storageCache.test.ts`;
- `tests/vitest/admin/cacheBusHardening.test.ts`;
- new `tests/vitest/admin/admin-cache-identity.test.ts`;
- new `tests/vitest/admin/read-through-cache-generation.test.ts`;
- `tests/unit/security/securitySettings.test.ts`;
- new `tests/integration/server/security-settings-db-authority.test.ts`.

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
  `origin + authEpoch + userId + sorted permission/role IDs`. Auth epoch is a
  required digest field, not merely an async-race guard. Publish `scope=null` first and
  only install an async digest if the auth epoch is still current. Cache reads/
  writes before scope readiness are safe misses/no-ops, not unscoped access.
  Auth epoch is an integer `0..Number.MAX_SAFE_INTEGER`; overflow leaves scope
  null and requires a fresh page bootstrap rather than reusing an epoch.
- Versioned storage key is
  `coderso:admin-cache:v2:<scopeDigest>:e<authEpoch>:<boundedResourceKey>`.
  Envelope includes schema, identical scope digest, identical safe-integer auth
  epoch, saved time and value; reject unknown/mismatch.
  Export and reuse exact limits
  `ADMIN_CACHE_MAX_RESOURCE_KEY_BYTES = 512`,
  `ADMIN_CACHE_MAX_OWNED_KEYS_PER_SCOPE = 512`, and
  `ADMIN_CACHE_MAX_OWNED_KEY_INDEX_BYTES = 65_536`. UTF-8 resource keys outside
  `1..512` fail closed as cache miss/no-op. Maintain the per-scope owned-key
  index inside both count and serialized-byte caps; evict its oldest owned key
  before adding a new one, and never scan browser storage.
- Login, logout, unauthorized bootstrap, user change and permission fingerprint
  change increment epoch, abort stale work, clear in-memory values and make old
  storage inaccessible even when the same user logs in again with unchanged
  permissions. Bounded cleanup is best effort only; epoch namespacing is the
  security boundary. A bounded one-time migration removes known legacy v1
  keys; never scan unbounded browser storage.
- Wrap storage acquisition/get/set/remove, JSON stringify/parse, BroadcastChannel,
  localStorage fallback and every subscriber independently. Quota/private-mode/
  transport/subscriber failure is recorded best-effort and cannot make a
  successful API mutation reject. Update the old hardening test that expected
  subscriber exceptions to escape.
- CacheBus events carry schema, scope digest and auth epoch; any mismatched,
  prior-epoch or unknown scope is ignored. Dirty editor/background revalidation
  behavior remains unchanged.
- `readThroughCache` captures auth epoch plus a monotonically increasing
  generation. Invalidate/force increments generation; an older completion may
  return to its original caller but cannot populate cache over a newer result.

## Uncached Secret Security-Settings Contract

- Decrypted `SecuritySettings` is never cached: not in module/process memory,
  `ServerCache`, Redis, browser storage, outbox, Pub/Sub or stale-while-
  revalidate. Do not create a security-settings value-cache module.
- Every `getSecuritySettings` call performs the existing narrow authoritative DB
  read and decryption after its normal auth/service boundary. Redis health,
  generation state, circuit state and outbox lag never authorize or block this
  read, and no prior decrypted object is reused.
- V1 defines no cacheable redacted security projection. A future projection
  requires a separate explicit schema enumerating each non-secret field and a
  new reviewed policy; absence of that contract means cache none. The existing
  `security-settings-generation` family/`settings:security` tag may remain as
  bounded metadata only and never has value bytes.
- `setSecuritySettings` becomes an explicit transaction: persist encrypted/
  redacted stored data and the metadata-only Redis outbox plan in the same
  commit, then best-effort apply the generation after commit. Rollback emits
  nothing; cache transport failure cannot reverse committed success. No local
  decrypted value is installed after either applied or queued delivery.
- Public projection remains redacted exactly as today. Metrics contain only
  operation/outcome codes; no keys, values, or cache-hit metric exists for
  decrypted settings.

## Implementation Pseudocode

```ts
publishAuthEpochImmediately(user);
void deriveAdminCacheScope(user, permissions).then((scope) => {
  if (isCurrentEpoch(scope.epoch)) publishCacheScope(scope);
});

async function getSecuritySettings() {
  return loadAndDecryptSecuritySettingsFromDb(); // authoritative on every call
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

## Testing Requirements

Test A→logout→B, A→logout→A with unchanged permissions/roles, same-user
permission change, async digest race, reload/current
scope, legacy key denial, quota/private storage, throwing getter/set/remove,
BroadcastChannel/fallback/subscriber failures, scope mismatch and bounded index.
Inject delayed prior-epoch cacheBus traffic and read-through completions and
prove neither can populate the new epoch. For security settings, assert two
successive calls perform two DB reads and return fresh committed values; inspect
memory/Redis/outbox/PubSub boundaries for zero decrypted value bytes. Cover
Redis disconnect and runtime `>5_000 ms` forced-bypass state without changing DB-authoritative
reads, plus commit/rollback and post-commit applied vs queued/bypassed response.
Pin Admin key/index/epoch exact/max+1 count and byte behavior.

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/admin/storageCache.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts \
  tests/vitest/admin/admin-cache-identity.test.ts \
  tests/vitest/admin/read-through-cache-generation.test.ts
SERVER_CACHE_BACKEND=memory bun test tests/unit/security/securitySettings.test.ts \
  tests/integration/server/security-settings-db-authority.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l04 bun test \
  tests/integration/server/security-settings-db-authority.test.ts
bun run check:admin-boundary
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/services/{adminAuthIdentity,adminCacheIdentity,authClient,cachePolicy}.ts \
  core/admin/ui/contexts/AdminAuthContext.tsx \
  core/admin/utils/{storageCache,cacheBus,readThroughCache}.ts \
  core/services/settings/securitySettings.ts \
  tests/vitest/admin/{storageCache,cacheBusHardening,admin-cache-identity,read-through-cache-generation}.test.ts \
  tests/{unit/security,integration/server}/security-settings*.test.ts
```

## Documentation Updates Required

Update `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md` and security/cache docs
only through TASK-551-10-L02; do not edit changelog 1263 here.
