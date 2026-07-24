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
async completions, bind every namespace to deployment plus a cryptographic
per-login auth incarnation, and make decrypted security settings DB-authoritative
with no process-local, browser, or Redis value cache.

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
- `tests/vitest/admin/readThroughCache.test.ts`;
- `tests/vitest/admin/cacheBus.test.ts`;
- `tests/vitest/admin/cacheBusCorrelation.test.ts`;
- `tests/vitest/admin/cacheRefresh.test.ts` for cacheBus/read-through refresh
  adoption and regression assertions;
- `tests/vitest/admin/support/cacheBusTestHarness.ts` when the scoped event shape
  requires harness updates;
- new `tests/vitest/admin/admin-cache-identity.test.ts`;
- new `tests/vitest/admin/read-through-cache-generation.test.ts`;
- existing `tests/vitest/admin/authClient.test.ts`,
  `tests/vitest/authUi/authClient.test.ts`, and
  `tests/vitest/ui/admin-auth-identity.test.tsx` for exact auth-incarnation and
  identity-transition adoption assertions;
- `tests/unit/security/securitySettings.test.ts`;
- existing `tests/integration/routes/securitySettings.test.ts` for route-level
  security-settings regression assertions;
- new `tests/integration/server/security-settings-db-authority.test.ts`.

Forbidden: other Admin resource clients/UI, publicSite/site/domain invalidation,
07/08 owners, auth/session route contracts, TASK-517/493/511, migrations/
packages and shared docs/tasks. Existing generic cache clients consume the
transparent scoped key/storage contract without per-client edits.
`core/admin/utils/adminPaths.ts` is a read-only dependency: import its existing
`resolveAdminBasePath(...)` and `DEFAULT_ADMIN_PATH` exports exactly; L04 neither
owns nor changes that module and does not invent an `adminPaths` object API.
This leaf is the sole TASK-551 writer of `cacheRefresh.test.ts`; it preserves the
existing refresh behavior while adopting the scoped cacheBus/read-through
contract. No read-only cross-owner test exception remains.

## Admin Browser Contract

- Preserve `AdminAuthIdentitySnapshot.userId/epoch` for existing consumers and
  add a separate `AdminCacheIdentitySnapshot` with schema version `3` containing
  normalized deployment identity plus its SHA-256 digest, crypto-random auth
  incarnation, opaque SHA-256 scope digest, auth epoch and permission fingerprint.
  Raw deployment identity, user ID/email/roles/permissions never appear in
  storage keys.
- `resolveAdminDeploymentIdentity()` in `adminCacheIdentity.ts` derives the sole
  browser deployment source without an auth/API payload change. It canonicalizes
  `location.origin`, the Admin base returned by
  `resolveAdminBasePath(location.pathname || DEFAULT_ADMIN_PATH)`, and the current
  entry module selected by
  `document.querySelector('script[type="module"][src]')`.
  Parse the module `src` against the current origin, require the same origin,
  strip query and fragment, and use only its normalized pathname. Export exact
  bounds `ADMIN_CACHE_MAX_DEPLOYMENT_IDENTITY_BYTES = 2_048` and
  `ADMIN_CACHE_MAX_ENTRY_MODULE_PATH_BYTES = 1_024`; missing, cross-origin,
  malformed, empty or oversized input returns `null`, publishes `scope=null` and
  makes persistent reads/writes safe misses. The canonical deployment identity
  is UTF-8 JSON with exactly the fixed field order
  `{ "v":3,"origin":...,"adminBasePath":...,"entryModulePath":... }` after
  strict normalization; it is never newline/delimiter concatenation.
- Production accepts only the current Vite entry filename carrying its content
  hash, matched by exported
  `ADMIN_CACHE_VITE_ENTRY_FILE_RE = /(?:^|\/)[^/]+-[A-Za-z0-9_-]{8,}\.m?js$/`,
  so a same-origin deployment with a new hashed asset path derives a new
  deployment/scope digest before hydration. An unhashed Vite development entry is
  intentionally persistent-cache-ineligible (`scope=null`); API reads and page-
  lifetime behavior continue authoritatively, without promising persistence
  across dev rebuilds.
- Derive the digest with browser Web Crypto from the exact canonical preimage
  contract below. `deploymentDigest` is lowercase SHA-256 of the normalized
  deployment identity. Auth epoch and auth incarnation are required digest
  fields, not merely async-race guards. Publish `scope=null` first and only install
  an async digest if the deployment, incarnation and auth epoch are still current.
  Cache reads/writes before scope readiness are safe misses/no-ops, not unscoped
  access. Auth epoch is an integer `0..Number.MAX_SAFE_INTEGER`; overflow leaves
  scope null and creates a new incarnation during a fresh bootstrap rather than
  reusing an epoch.
- The scope preimage schema is exact and reject-unknown:

  ```ts
  const ADMIN_CACHE_SCOPE_SCHEMA_VERSION = 3 as const;
  const ADMIN_CACHE_MAX_USER_ID_BYTES = 128;
  const ADMIN_CACHE_MAX_SCOPE_ITEM_BYTES = 256;
  const ADMIN_CACHE_MAX_PERMISSION_ITEMS = 256;
  const ADMIN_CACHE_MAX_ROLE_ITEMS = 256;
  const ADMIN_CACHE_MAX_SCOPE_PREIMAGE_BYTES = 65_536;

  type AdminCacheScopePreimageV3 = Readonly<{
    v: 3;
    deploymentIdentity: string;
    authIncarnation: string;
    authEpoch: number;
    userId: string;
    permissions: readonly string[];
    roles: readonly string[];
  }>;
  ```

  Construct a new object in precisely that field order and serialize it as UTF-8
  JSON with standard JSON escaping. `deploymentIdentity` is the normalized,
  bounded canonical deployment JSON above; `authIncarnation` is exact lowercase
  32-hex; `authEpoch` is a bounded safe integer; and `userId`, permission IDs and
  role IDs are non-empty NFC strings with no control characters and the exported
  byte/count caps. Permissions and `permissionSnapshot.roles[].id` are normalized,
  deduplicated and UTF-8-byte sorted into two separate arrays; role names/slugs do
  not substitute for role IDs. Reject malformed/unknown/oversized input and a
  preimage over 65,536 bytes, then SHA-256 exactly the serialized UTF-8 bytes.
  Never concatenate fields or array values with delimiters. In particular,
  permissions `["ab","c"]` and `["a","bc"]`, moving an ID between roles and
  permissions, embedded newlines, and canonically equivalent Unicode must have
  unambiguous normalized behavior.
- `authIncarnation` is exactly 128 crypto-random bits encoded as 32 lowercase hex
  characters from `crypto.getRandomValues`, never a timestamp/counter/identity
  hash. Store it only in a strict versioned `sessionStorage` record so a reload in
  the same tab can reuse the current authenticated incarnation. A successful new
  login rotates it before scope work; logout or unauthorized bootstrap clears it
  before clearing scope, and the next login creates a new value. If sessionStorage
  acquisition/read/write/remove/validation fails, use a fresh memory-only random
  incarnation for that page lifetime; because it cannot match a prior persistent
  namespace, persistent reads remain safe misses. No auth endpoint or payload
  field changes.
- Versioned storage key is
  `coderso:admin-cache:v3:<deploymentDigest>:<scopeDigest>:e<authEpoch>:<boundedResourceKey>`.
  Envelope includes schema, identical deployment digest, scope digest,
  safe-integer auth epoch, saved time and value; reject unknown/mismatch. The raw
  incarnation never enters the persistent resource key or envelope; its binding
  is proven by the scope digest.
  Export and reuse exact limits
  `ADMIN_CACHE_MAX_RESOURCE_KEY_BYTES = 512`,
  `ADMIN_CACHE_MAX_OWNED_KEYS_PER_SCOPE = 512`, and
  `ADMIN_CACHE_MAX_OWNED_KEY_INDEX_BYTES = 65_536`. UTF-8 resource keys outside
  `1..512` fail closed as cache miss/no-op. Maintain the per-scope owned-key
  index inside both count and serialized-byte caps; evict its oldest owned key
  before adding a new one, and never scan browser storage.
- Login, logout, unauthorized bootstrap, user change and permission fingerprint
  change increment epoch, abort stale work and clear in-memory values. Login,
  logout, unauthorized bootstrap and user change also rotate/delete the
  incarnation as applicable, making old storage inaccessible even when the same
  user logs in again with unchanged permissions. Bounded cleanup is best effort
  only; deployment/incarnation/epoch namespacing is the security boundary. A
  bounded one-time migration removes known legacy v1/v2 keys; never scan
  unbounded browser storage.
- Wrap storage acquisition/get/set/remove, JSON stringify/parse, BroadcastChannel,
  localStorage fallback and every subscriber independently. Quota/private-mode/
  transport/subscriber failure is recorded best-effort and cannot make a
  successful API mutation reject. Update the old hardening test that expected
  subscriber exceptions to escape.
- CacheBus events carry schema, deployment digest, scope digest and auth epoch;
  any mismatched deployment/scope, prior epoch or unknown scope is ignored. The
  raw incarnation never enters the event; its binding is proven by scope digest.
  Dirty editor/background revalidation behavior remains unchanged.
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
  read, and no prior decrypted object is reused. Public GET/HEAD therefore keeps
  L01's honest total budget: a safe warm hit is exactly one DB query (this read),
  while page/home/post/content-entry detail or list is exactly two (this read plus
  its mandatory gate). `SecuritySettings`, rate-limit policy and header policy
  never enter `PublicCacheRuntimeSnapshot` to recover a false zero-query claim.
- V1 defines no cacheable redacted security projection. A future projection
  requires a separate explicit schema enumerating each non-secret field and a
  new reviewed policy; absence of that contract means cache none. The existing
  `security-settings-generation` family/`settings:security` tag may remain as
  bounded metadata only and never has value bytes.
- `setSecuritySettings` becomes an explicit transaction: persist encrypted/
  redacted stored data and, only in Redis mode, exactly one metadata-only outbox
  row in the same commit. Memory mode writes exactly zero outbox rows. Before the
  authoritative transaction-scoped read/merge, execute exact
  `SET LOCAL lock_timeout = '2s'` and acquire
  `pg_advisory_xact_lock(551, 904)` on that same transaction handle. The lock
  serializes all partial writers; no pre-lock/global/cached settings read may
  participate in the merge. The Redis write and its one outbox row share the lock
  and transaction; the memory write has no outbox side effect. Centrally map lock
  timeout (SQLSTATE `55P03`) and a defensive
  deadlock (`40P01`) to machine-readable `security_settings_conflict` without
  exposing driver text, SQL, values, or identifiers. Then call and await the
  lifecycle-owned invalidation handle's `applyAfterCommit(plan)` exactly once
  after commit. In Redis mode this is the awaited immediate apply backed by the
  one durable row; in memory mode it performs exactly one awaited post-commit
  generation bump and no outbox insert. Its sole controller owns
  epoch/fence changes. Rollback emits nothing; cache transport failure cannot
  reverse committed success. In both modes the local observation or affected-
  family failure fence and new epoch are visible before the mutation caller
  resumes. No local
  decrypted value is installed after either applied or queued delivery.
- Public projection remains redacted exactly as today. Metrics contain only
  operation/outcome codes; no keys, values, or cache-hit metric exists for
  decrypted settings.

## Implementation Pseudocode

```ts
import {
  DEFAULT_ADMIN_PATH,
  resolveAdminBasePath,
} from "../utils/adminPaths";

const deploymentIdentity = resolveAdminDeploymentIdentity({
  origin: location.origin,
  adminBasePath: resolveAdminBasePath(
    location.pathname || DEFAULT_ADMIN_PATH,
  ),
  entryModule: document.querySelector('script[type="module"][src]'),
});
if (!deploymentIdentity) {
  publishNullScopeAndDisablePersistentCache();
  return;
}
const authIncarnation = loadOrCreateSessionAuthIncarnation();
publishAuthEpochImmediately(user, authIncarnation);
void deriveAdminCacheScope(
  deploymentIdentity,
  authIncarnation,
  user,
  permissions,
).then((scope) => {
  if (isCurrentDeploymentIncarnationEpoch(scope)) publishCacheScope(scope);
});

async function onSuccessfulLogin(user) {
  const incarnation = rotateSessionAuthIncarnationBeforeScopeWork();
  publishAuthEpochImmediately(user, incarnation);
}

function onLogoutOrUnauthorized() {
  deleteSessionAuthIncarnationBeforeClearingScope();
  publishNullScopeAndAdvanceEpoch();
}

async function getSecuritySettings() {
  return loadAndDecryptSecuritySettingsFromDb(); // authoritative on every call
}

async function setSecuritySettings(update) {
  const eventKey = createCacheInvalidationEventKey();
  let committed;
  try {
    committed = await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '2s'`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(551, 904)`);
      const current = await loadAndDecryptSecuritySettingsTx(tx);
      const merged = validateAndMergeSecuritySettings(current, update);
      await upsertEncryptedSecuritySettingsTx(tx, merged);
      const plan = { eventKey, tags: ["settings:security"] };
      await persistCacheInvalidationTx(tx, plan, cacheBackend);
      // Redis => exactly one row; memory => exactly zero rows.
      return { value: merged, plan };
    });
  } catch (error) {
    throw mapSecuritySettingsPersistenceError(error); // 55P03/40P01 -> conflict
  }
  const outcome = await getServerCacheRuntime()
    .invalidation.applyAfterCommit(committed.plan);
  // Redis => awaited apply; memory => exactly one awaited generation bump.
  recordBoundedInvalidationOutcome(outcome);
  return committed.value;
}
```

## Security Contract

- **Visibility/routes:** existing `/auth/*` and Admin settings routes only; no
  new endpoint or payload field.
- **Auth/RBAC:** resource cache requires current authenticated scope and cannot
  widen permissions; settings permissions remain server-authoritative.
- **CSRF/rate limits:** existing login/logout/settings write contracts unchanged.
- **Validation:** strict scope/envelope/event fields and bounded key index/
  storage payload; exact lowercase SHA-256 deployment/scope digests, strict
  session-only 32-hex incarnation record, safe-integer epoch, 512-byte resource-
  key, 512-index-entry and 65,536-byte index caps; deployment source is same-
  origin, hashed-production-entry-only and exact/max+1 UTF-8 bounded; canonical
  JSON scope preimage uses its exact field order, NFC/string/item/preimage caps,
  separately sorted/deduplicated permissions and role IDs, and rejects unknown
  data.
- **Secrets/privacy:** no raw identity/permission, credentials or decrypted
  settings in localStorage, cacheBus, Redis, outbox, log or metric. The opaque
  incarnation exists only in its strict sessionStorage record or ephemeral memory
  and as an input to the one-way scope digest; it is never placed in localStorage,
  cacheBus, logs or metrics and is never treated as authentication.
- **Anti-abuse:** existing login/reset bot protection and limits remain; cache
  outage never bypasses them.

## Testing Requirements

Test A→logout→B, A→logout→A with unchanged permissions/roles, same-user
permission change, new login rotation, unauthorized deletion, same-tab reload
reuse, same-origin production entry hash change, async digest race, legacy v1/v2
key denial, sessionStorage unavailable/corrupt/throwing get/set/remove with fresh
memory-only incarnation, localStorage quota/private storage, throwing getter/set/
remove, BroadcastChannel/fallback/subscriber failures, deployment/incarnation/
scope mismatch and bounded index.
Pin deployment derivation for normalized origin/Admin base/module path, stripped
query/fragment, missing selector, cross-origin/malformed/empty/oversized module,
exact/max+1 UTF-8 bounds, hashed production separation and unhashed-development
persistent miss. Import the real `resolveAdminBasePath`/`DEFAULT_ADMIN_PATH`
exports in the test and pin `/` fallback plus custom first-segment Admin paths;
do not mock or duplicate another Admin-base API.
Inject delayed prior-epoch cacheBus traffic and read-through completions and
prove neither can populate the new epoch. For security settings, assert two
successive calls perform two DB reads and return fresh committed values; inspect
memory/Redis/outbox/PubSub boundaries for zero decrypted value bytes. Cover
Redis disconnect and runtime `>5_000 ms` forced-bypass state without changing DB-authoritative
reads, plus commit/rollback and post-commit applied vs queued/bypassed response.
Pin Admin deployment/scope digest, 128-bit session-only incarnation, proof that
raw incarnation bytes never enter localStorage/cacheBus, v3 key/envelope/bus,
index/epoch exact/max+1 count and byte behavior. Pin canonical preimage vectors
for `["ab","c"]` versus `["a","bc"]`, the same ID in `permissions` versus
`roles`, JSON-special/newline strings, composed/decomposed Unicode, duplicate/
order normalization, every item/count/preimage max+1, malformed 32-hex and
unknown fields; assert no delimiter-concatenation implementation exists. Run two
concurrent disjoint partial settings updates and prove advisory-lock serialization
preserves both fields rather than last-read overwrite. Hold advisory lock
`(551,904)` from a second connection and prove the exact two-second timeout maps
to `security_settings_conflict` with redacted diagnostics. Prove rollback writes
no settings/outbox row. In the explicit memory lane, assert each successful
commit writes zero outbox rows, performs exactly one awaited post-commit
generation bump, and exposes its observation or failure fence/epoch before
return. In the explicit Redis lane, assert each successful commit writes exactly
one outbox row in the transaction, then awaits `applyAfterCommit` until local
observation/any force fence is visible. Re-run the complete public-site
query-budget suite after removing the settings cache: assert one authoritative
settings read plus zero additional reads for a safe warm hit and settings plus one
content gate plus zero additional reads for mutable detail/list.

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/admin/storageCache.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts \
  tests/vitest/admin/readThroughCache.test.ts \
  tests/vitest/admin/cacheBus.test.ts \
  tests/vitest/admin/cacheBusCorrelation.test.ts \
  tests/vitest/admin/cacheRefresh.test.ts \
  tests/vitest/admin/admin-cache-identity.test.ts \
  tests/vitest/admin/read-through-cache-generation.test.ts \
  tests/vitest/admin/authClient.test.ts \
  tests/vitest/authUi/authClient.test.ts \
  tests/vitest/ui/admin-auth-identity.test.tsx
SERVER_CACHE_BACKEND=memory bun test tests/unit/security/securitySettings.test.ts \
  tests/integration/routes/securitySettings.test.ts \
  tests/integration/server/security-settings-db-authority.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l04 bun test \
  tests/integration/server/security-settings-db-authority.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts
bun run check:admin-boundary
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/services/{adminAuthIdentity,adminCacheIdentity,authClient,cachePolicy}.ts \
  core/admin/ui/contexts/AdminAuthContext.tsx \
  core/admin/utils/{storageCache,cacheBus,readThroughCache}.ts \
  core/services/settings/securitySettings.ts \
  tests/vitest/admin/{storageCache,cacheBusHardening,readThroughCache,cacheBus,cacheBusCorrelation,cacheRefresh,admin-cache-identity,read-through-cache-generation}.test.ts \
  tests/vitest/admin/authClient.test.ts \
  tests/vitest/authUi/authClient.test.ts \
  tests/vitest/ui/admin-auth-identity.test.tsx \
  tests/vitest/admin/support/cacheBusTestHarness.ts \
  tests/unit/security/securitySettings.test.ts \
  tests/integration/routes/securitySettings.test.ts \
  tests/integration/server/security-settings*.test.ts
```

## Documentation Updates Required

Update `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md` and security/cache docs
only through TASK-551-10-L02; do not edit changelog 1263 here.
