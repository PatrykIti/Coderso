# TASK-551-09-L04: Admin Identity and Security Cache Hardening
# FileName: TASK-551-09-L04-Admin-Identity-And-Security-Cache-Hardening.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-09
**Priority:** Critical
**Category:** Admin Cache / Security / Reliability
**Estimated Effort:** Large
**Dependencies:** INITIAL phase after TASK-551-07-L01; FINAL phase after
TASK-551-09-L03 plus TASK-551-03-L02/TASK-551-04-L01 adoption receipts
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

None. This executable leaf has two mandatory serialized land phases and remains
`🚧 In Progress`/non-releasable between them:

1. **INITIAL seam:** add only the installation-authority primitive module and
   new `tests/vitest/admin/admin-cache-authority.test.ts`. This compile-green
   receipt must land before 03-L02 and 04-L01 edit their exclusively owned
   clients.
2. **FINAL adoption:** after those receipts and 09-L03, wire auth transitions,
   every remaining client/cache utility, cross-tab generation, security settings
   and route mapping. It never reopens a 03/04-owned client.

## Exclusive Ownership

Sole writer of:

- `core/admin/services/adminAuthIdentity.ts`;
- new `core/admin/services/adminCacheIdentity.ts`;
- new `core/admin/utils/adminCacheAuthority.ts`;
- `core/admin/services/authClient.ts`;
- `core/admin/ui/contexts/AdminAuthContext.tsx`;
- `core/admin/services/cachePolicy.ts`;
- `core/admin/utils/storageCache.ts`;
- `core/admin/utils/cacheBus.ts`;
- `core/admin/utils/readThroughCache.ts`;
- `core/admin/utils/adminPrefetch.ts`;
- `core/admin/utils/sessionCache.ts`;
- `core/services/settings/securitySettings.ts`;
- `core/server/routes/settingsRoutes.ts` only for centralized
  `security_settings_conflict` mapping;
- FINAL-phase remaining cache-client matrix:
  `core/admin/services/adminThemeClient.ts`, `analyticsClient.ts`,
  `apiClient.ts`, `assistantClient.ts`, `assistantStatusClient.ts`,
  `backupsClient.ts`, `commerceClient.ts`, `contentTypesClient.ts`,
  `customScreenShortcutsClient.ts`, `customScreensCache.ts`,
  `customScreensClient.ts`, `dashboardClient.ts`, `importExportClient.ts`,
  `listingsClient.ts`, `mediaFoldersClient.ts`, `menusClient.ts`,
  `pageTemplatesClient.ts`, `popupsClient.ts`, `redirectsClient.ts`,
  `reviewsClient.ts`, `seoClient.ts`, `settingsCache.ts`, `settingsClient.ts`,
  `siteSettingsClient.ts`, `solutionKitsClient.ts`, `userSettingsClient.ts`, and
  `widgetsClient.ts` (all paths relative to `core/admin/services/`);
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
- new `tests/vitest/admin/admin-cache-authority.test.ts` (INITIAL only);
- new `tests/vitest/admin/read-through-cache-generation.test.ts`;
- new `tests/vitest/admin/admin-cache-client-authority-matrix.test.ts`;
- existing `tests/vitest/admin/authClient.test.ts`,
  `tests/vitest/authUi/authClient.test.ts`, and
  `tests/vitest/ui/admin-auth-identity.test.tsx` for exact auth-incarnation and
  identity-transition adoption assertions;
- `tests/unit/security/securitySettings.test.ts`;
- existing `tests/integration/routes/securitySettings.test.ts` for route-level
  security-settings regression assertions;
- existing `tests/integration/routes/settings.test.ts` for the exact centralized
  conflict mapping assertion;
- new `tests/integration/server/security-settings-db-authority.test.ts`.

Forbidden: other Admin resource clients/UI, publicSite/site/domain invalidation,
07/08 owners, auth/session route contracts, TASK-517/493/511, migrations/
packages and shared docs/tasks. In particular, FINAL must not edit the 03-L02
owners `pagesClient.ts`, `detailPagesClient.ts`, `entriesClient.ts`,
`postsClient.ts`, `adminUsersClient.ts`, `formsClient.ts`, `mediaClient.ts`, or
`bookingClient.ts`, nor the 04-L01 owners `searchClient.ts` and
`ui/search/useSearchResults.ts`; those leaves consume INITIAL and return receipts.
`core/admin/utils/adminPaths.ts` is a read-only dependency: import its existing
`resolveAdminBasePath(...)` and `DEFAULT_ADMIN_PATH` exports exactly; L04 neither
owns nor changes that module and does not invent an `adminPaths` object API.
This leaf is the sole TASK-551 writer of `cacheRefresh.test.ts`; it preserves the
existing refresh behavior while adopting the scoped cacheBus/read-through
contract. No read-only cross-owner test exception remains.

## Admin Browser Contract

- INITIAL exports only opaque `AdminCacheInstallationToken`,
  `captureAdminCacheInstallationToken()`,
  `isCurrentAdminCacheInstallationToken(token)`, and
  `registerAdminModuleCacheReset(reset): unsubscribe` plus the identity-free
  `advanceAdminCacheInstallationAuthority()` from
  `adminCacheAuthority.ts`. It owns a safe-integer page-lifetime generation;
  advancing it synchronously invokes independently isolated reset subscribers.
  At `Number.MAX_SAFE_INTEGER`, the next advance invokes resets and permanently
  disables cache installation until page reload; it never wraps or reuses a
  token. Tokens and reset callbacks contain no identity. FINAL alone wires advancement
  to deployment/auth/cross-tab scope transitions; 03-L02 and 04-L01 import this
  stable seam and guard every promise completion/cache install they own.
- The single-writer matrix is exhaustive, not illustrative:

  | Writer | Exact owned adoption |
  |---|---|
  | 03-L02 after INITIAL | pages, detail pages, entries, posts, Admin users, forms, media and booking clients; every new paginated cache/promise included |
  | 04-L01 after INITIAL | `searchClient.ts` maps/promises and `useSearchResults.ts` delayed search/history/cache work |
  | L04 FINAL | auth/CSRF, Admin theme, analytics, assistant status, backups, commerce, content types, shortcuts/custom screens, Dashboard, import/export, listings, media folders, menus, page templates, popups, redirects, reviews, SEO, redacted/general/site settings, solution kits, user settings, widgets, prefetch and all generic storage/read-through/cacheBus utilities listed above |

  `assistantClient.ts`/`customScreensCache.ts` own event/clear-only adoption;
  `importExportClient.ts` and `settingsCache.ts` own helper-backed values even
  without a top-level promise. `apiClient.ts`'s CSRF value/promise and
  `authClient.ts`'s bootstrap cache are identity-transition state and are never
  exempt. `admin-cache-client-authority-matrix.test.ts` scans the exact source
  manifest and fails on a newly discovered module-level cached value, promise,
  map, read-through/storage-cache handle, or prefetch registry without exactly
  one writer and either shared authority registration or an explicit security
  exclusion. No implicit "generic clients are safe" claim is accepted.
- Preserve `AdminAuthIdentitySnapshot.userId/epoch` for existing consumers and
  add a separate `AdminCacheIdentitySnapshot` with schema version `3` containing
  normalized deployment identity plus its SHA-256 digest, crypto-random auth
  incarnation, then the cross-tab auth-generation nonce, opaque SHA-256 scope digest,
  auth epoch and permission fingerprint.
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
    authGenerationNonce: string;
    authEpoch: number;
    userId: string;
    permissions: readonly string[];
    roles: readonly string[];
  }>;
  ```

  Construct a new object in precisely that field order and serialize it as UTF-8
  JSON with standard JSON escaping. `deploymentIdentity` is the normalized,
  bounded canonical deployment JSON above; `authIncarnation` and
  `authGenerationNonce` are separate exact lowercase 32-hex values; `authEpoch`
  is a bounded safe integer; and `userId`, permission IDs and
  role IDs are non-empty NFC strings with no control characters and the exported
  byte/count caps. Permissions and `permissionSnapshot.roles[].id` are normalized,
  deduplicated and UTF-8-byte sorted into two separate arrays; role names/slugs do
  not substitute for role IDs. Reject malformed/unknown/oversized input and a
  preimage over 65,536 bytes, then SHA-256 exactly the serialized UTF-8 bytes.
  Never concatenate fields or array values with delimiters. In particular,
  permissions `["ab","c"]` and `["a","bc"]`, moving an ID between roles and
  permissions, embedded newlines, and canonically equivalent Unicode must have
  unambiguous normalized behavior.

  The canonical v3 vector is authoritative, including field order immediately
  after `authIncarnation`:

  ```text
  UTF8 JSON (367 bytes): {"v":3,"deploymentIdentity":"{\"v\":3,\"origin\":\"https://admin.example\",\"adminBasePath\":\"/admin\",\"entryModulePath\":\"/assets/index-ABCDEFGH.js\"}","authIncarnation":"00000000000000000000000000000000","authGenerationNonce":"11111111111111111111111111111111","authEpoch":7,"userId":"user-1","permissions":["pages:read","settings:write"],"roles":["role-admin"]}
  SHA-256: 6c69458d5fdc22634a5fca20609e3accb4a6fe606905af2b2c522900770afbf7
  nonce-only rotation to 22222222222222222222222222222222:
  SHA-256: 4214d494f425d2f595de703cd19662a2513d0d85871bff748bdb5d5cb728611d
  ```

  No exact scope helper/input/vector may omit or reorder
  `authGenerationNonce`; it is always the field immediately after
  `authIncarnation`. A nonce-only rotation therefore creates a distinct scope
  even when deployment, incarnation, epoch, user, permissions and roles are
  byte-identical.
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
- Preserve that tab-specific incarnation, but add one deployment-digest-scoped
  cross-tab auth-generation record at
  `coderso:admin-cache:v3:<deploymentDigest>:auth-generation`. Its strict value
  is `{schema:"coderso.admin-auth-generation@v3",deploymentDigest,nonce}` with a
  separate crypto-random lowercase 32-hex nonce and no identity. Create/read it
  only through wrapped localStorage; a storage failure makes persistent scope
  null. Before successful-login installation, logout, unauthorized bootstrap,
  user change or permission-fingerprint transition, rotate/write this nonce
  **before** publishing any new auth identity/scope and broadcast only its
  deployment audience. Other tabs re-read the current storage record (they do
  not trust or order BroadcastChannel payloads), synchronously advance installation
  authority, clear module/storage scope, abort stale work and re-bootstrap auth.
  A different/malformed/unknown nonce is never adopted as a cache value. Storage
  events are the source for cross-tab ordering; BroadcastChannel is wakeup only,
  so delayed channel messages cannot regress to an older nonce. Same-tab reload
  retains its session incarnation only while the current shared nonce still
  matches. Concurrent create/rotate and unavailable/throwing storage fail to
  persistent-cache misses, not an old audience.
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
  change first rotate cross-tab generation, then increment epoch, advance the
  installation generation, abort stale work and clear in-memory values. Login,
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
- CacheBus events carry schema, deployment digest, auth-generation nonce, scope
  digest and auth epoch;
  any mismatched deployment/scope, prior epoch or unknown scope is ignored. The
  raw incarnation never enters the event; its binding is proven by scope digest.
  Dirty editor/background revalidation behavior remains unchanged.
- `readThroughCache` captures auth epoch, installation token and a monotonically
  increasing per-key generation. `set`, `invalidate`, and force-refresh each
  advance the per-key generation before installation/removal/load; `set` installs
  under its new generation, while force-refresh installs only if its captured
  new generation and installation token remain current. An older completion may
  return to its original caller but cannot populate cache over a newer set,
  invalidation, forced refresh or auth/deployment transition.

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
- `settingsRoutes.ts#mapSettingsRouteError` is the sole route mapper and maps
  exactly service error `security_settings_conflict` to
  `ApiError("security_settings_conflict", "Security settings were updated concurrently. Please retry.", 409)`.
  The PATCH remains internal session-authenticated `settings:write`, CSRF and
  `admin_write` rate-limited with its existing strict schema. The mapper never
  returns driver message/details, SQLSTATE, SQL, binds, lock keys or identifiers;
  all other unexpected errors keep the existing generic redacted 500.
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
const authGenerationNonce = loadOrCreateCrossTabAuthGeneration(deploymentIdentity);
publishAuthEpochImmediately(user, authIncarnation, authGenerationNonce);
void deriveAdminCacheScope(
  deploymentIdentity,
  authIncarnation,
  authGenerationNonce,
  user,
  permissions,
).then((scope) => {
  if (isCurrentDeploymentIncarnationNonceEpoch(scope)) publishCacheScope(scope);
});

async function onSuccessfulLogin(user) {
  const authGenerationNonce = rotateCrossTabAuthGenerationBeforeTransition();
  const incarnation = rotateSessionAuthIncarnationBeforeScopeWork();
  advanceAdminCacheInstallationAuthority();
  publishAuthEpochImmediately(user, incarnation, authGenerationNonce);
}

function onLogoutOrUnauthorized() {
  rotateCrossTabAuthGenerationBeforeTransition();
  deleteSessionAuthIncarnationBeforeClearingScope();
  advanceAdminCacheInstallationAuthority();
  publishNullScopeAndAdvanceEpoch();
}

async function forceRefresh(key, loader) {
  const generation = advanceKeyInstallationGeneration(key);
  const authority = captureAdminCacheInstallationToken();
  const value = await loader();
  if (isCurrentKeyGeneration(key, generation)
      && isCurrentAdminCacheInstallationToken(authority)) {
    install(key, value);
  }
  return value;
}

function setCached(key, value) {
  const generation = advanceKeyInstallationGeneration(key);
  installAtGeneration(key, generation, value);
}

function invalidateCached(key) {
  advanceKeyInstallationGeneration(key);
  remove(key);
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
  session-only 32-hex incarnation and separate deployment-scoped 32-hex auth-
  generation record, safe-integer epoch, 512-byte resource-
  key, 512-index-entry and 65,536-byte index caps; deployment source is same-
  origin, hashed-production-entry-only and exact/max+1 UTF-8 bounded; canonical
  JSON scope preimage uses its exact field order, NFC/string/item/preimage caps,
  separately sorted/deduplicated permissions and role IDs, and rejects unknown
  data.
- **Conflict mapping:** security-settings lock timeout/deadlock is the exact
  redacted 409 above; settings auth/RBAC/CSRF/admin-write throttling is unchanged.
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
Use two independently instantiated tab/window harnesses sharing mocked
localStorage plus BroadcastChannel/storage events. Prove each keeps its own
session incarnation, while login/logout/unauthorized/user/permission transition
in either tab rotates the deployment auth-generation before scope publication,
causes the other tab to clear/abort/rebootstrap, and makes every old event,
promise and storage envelope ineligible. Cover delayed/out-of-order Broadcast
wakeups by authoritative storage re-read, simultaneous nonce creation/rotation,
same-tab reload match/mismatch, malformed/max+1 records and throwing/unavailable
storage; no old scope may hydrate.
Hold deployment, `authIncarnation`, `authEpoch`, user, permissions and roles
constant and rotate only `authGenerationNonce`: pin both authoritative digests
above, require immediate installation-authority advancement, and prove every
prior-scope storage envelope, cacheBus/storage event and delayed promise/load
completion is rejected and cannot install. Reordered delivery of the old nonce
after the new storage record is visible must remain stale; no epoch or
incarnation change may be required to obtain this isolation.
Pin deployment derivation for normalized origin/Admin base/module path, stripped
query/fragment, missing selector, cross-origin/malformed/empty/oversized module,
exact/max+1 UTF-8 bounds, hashed production separation and unhashed-development
persistent miss. Import the real `resolveAdminBasePath`/`DEFAULT_ADMIN_PATH`
exports in the test and pin `/` fallback plus custom first-segment Admin paths;
do not mock or duplicate another Admin-base API.
Inject delayed prior-epoch cacheBus traffic and read-through completions and
prove neither can populate the new epoch. For each `set`, `invalidate`, and
force-refresh, delay an older load across the operation and prove generation
advances first, the old completion returns only to its caller, and cannot install
over the newer value/miss/refresh. Repeat across an auth installation-token
transition. For security settings, assert two
successive calls perform two DB reads and return fresh committed values; inspect
memory/Redis/outbox/PubSub boundaries for zero decrypted value bytes. Cover
Redis disconnect and runtime `>5_000 ms` forced-bypass state without changing DB-authoritative
reads, plus commit/rollback and post-commit applied vs queued/bypassed response.
Pin Admin deployment/scope digest, 128-bit session-only incarnation, proof that
raw incarnation bytes never enter localStorage/cacheBus, v3 key/envelope/bus,
index/epoch exact/max+1 count and byte behavior. Pin canonical preimage vectors,
including both nonce-only digests above, for `["ab","c"]` versus `["a","bc"]`,
the same ID in `permissions` versus
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
Pin `mapSettingsRouteError(new Error("security_settings_conflict"))` to the exact
409 code/message above; PATCH responses/logs contain no driver text, SQLSTATE,
SQL, binds or advisory identifiers, while unknown errors retain the generic 500.
Run the exhaustive client-authority manifest: every 03/04 receipt and L04 matrix
module has one writer, clears module maps/promises on transition and rejects a
delayed pre-transition install; a synthetic uncatalogued cache/promise module
must fail the source guard.

Before either 03-L02 or 04-L01 dispatches, run the INITIAL-only direct suite. It
pins opaque token inequality after advancement, current/stale checks, safe-
integer overflow fail-closed behavior, independently isolated reset callbacks,
unsubscribe, one throwing subscriber not blocking the rest, idempotent module
registration and zero identity bytes in tokens/callback arguments. Its source
guard proves INITIAL edits only `adminCacheAuthority.ts` plus this test.

```bash
set -a && source .env && set +a
# INITIAL gate, before TASK-551-03-L02 and TASK-551-04-L01:
bun run test:vitest -- tests/vitest/admin/admin-cache-authority.test.ts
bun --cwd core lint:types
bun --cwd core lint
# FINAL gate, after both adoption receipts and TASK-551-09-L03:
bun run test:vitest -- tests/vitest/admin/storageCache.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts \
  tests/vitest/admin/readThroughCache.test.ts \
  tests/vitest/admin/cacheBus.test.ts \
  tests/vitest/admin/cacheBusCorrelation.test.ts \
  tests/vitest/admin/cacheRefresh.test.ts \
  tests/vitest/admin/admin-cache-identity.test.ts \
  tests/vitest/admin/read-through-cache-generation.test.ts \
  tests/vitest/admin/admin-cache-client-authority-matrix.test.ts \
  tests/vitest/admin/authClient.test.ts \
  tests/vitest/authUi/authClient.test.ts \
  tests/vitest/ui/admin-auth-identity.test.tsx
SERVER_CACHE_BACKEND=memory bun test tests/unit/security/securitySettings.test.ts \
  tests/integration/routes/settings.test.ts \
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
  core/admin/services/{adminThemeClient,analyticsClient,apiClient,assistantClient,assistantStatusClient,backupsClient,commerceClient,contentTypesClient,customScreenShortcutsClient,customScreensCache,customScreensClient,dashboardClient,importExportClient,listingsClient,mediaFoldersClient,menusClient,pageTemplatesClient,popupsClient,redirectsClient,reviewsClient,seoClient,settingsCache,settingsClient,siteSettingsClient,solutionKitsClient,userSettingsClient,widgetsClient}.ts \
  core/admin/ui/contexts/AdminAuthContext.tsx \
  core/admin/utils/{adminCacheAuthority,storageCache,sessionCache,cacheBus,readThroughCache,adminPrefetch}.ts \
  core/server/routes/settingsRoutes.ts \
  core/services/settings/securitySettings.ts \
  tests/vitest/admin/{storageCache,cacheBusHardening,readThroughCache,cacheBus,cacheBusCorrelation,cacheRefresh,admin-cache-authority,admin-cache-identity,read-through-cache-generation,admin-cache-client-authority-matrix}.test.ts \
  tests/vitest/admin/authClient.test.ts \
  tests/vitest/authUi/authClient.test.ts \
  tests/vitest/ui/admin-auth-identity.test.tsx \
  tests/vitest/admin/support/cacheBusTestHarness.ts \
  tests/unit/security/securitySettings.test.ts \
  tests/integration/routes/settings.test.ts \
  tests/integration/routes/securitySettings.test.ts \
  tests/integration/server/security-settings*.test.ts
```

## Documentation Updates Required

Update `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md` and security/cache docs
only through TASK-551-10-L02; do not edit changelog 1263 here.
