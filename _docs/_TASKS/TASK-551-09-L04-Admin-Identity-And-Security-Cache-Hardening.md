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
**Changelog:** 1310 (pinned; closure only)

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
`core/admin/utils/adminPrefetch.ts` is a read-only dependency for this leaf:
TASK-551-03-L02 is its sole TASK-551 writer (it consumes six of the eight
03-L02-owned clients), and L04 composes its cache-identity epoch/registration
through `adminCacheAuthority.ts` without editing the file.
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
  | L04 FINAL | auth/CSRF, Admin theme, analytics, assistant status, backups, commerce, content types, shortcuts/custom screens, Dashboard, import/export, listings, media folders, menus, page templates, popups, redirects, reviews, SEO, redacted/general/site settings, solution kits, user settings, widgets, prefetch REGISTRY/semantics via `adminCacheAuthority` (not edits to `adminPrefetch.ts`, which is 03-L02-owned and read-only here), and all generic storage/read-through/cacheBus utilities listed above |

  `assistantClient.ts`/`customScreensCache.ts` own event/clear-only adoption;
  `importExportClient.ts` and `settingsCache.ts` own helper-backed values even
  without a top-level promise. `apiClient.ts`'s CSRF value/promise and
  `authClient.ts`'s bootstrap cache are identity-transition state and are never
  exempt. `admin-cache-client-authority-matrix.test.ts` scans the exact source
  manifest and fails on a newly discovered module-level cached value, promise,
  map, read-through/storage-cache handle, or prefetch registry without exactly
  one writer and either shared authority registration or an explicit security
  exclusion. It scans `adminPrefetch.ts`'s exports read-only (03-L02 sole-owns
  that module; the test may assert the prefetch registry/semantics but must not
  claim L04 edits the module). No implicit "generic clients are safe" claim is
  accepted.
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
# INITIAL gate, before TASK-551-03-L02 and TASK-551-04-L01:
env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/admin/admin-cache-authority.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
# FINAL gate, after both adoption receipts and TASK-551-09-L03:
env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/admin/storageCache.test.ts \
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
  tests/vitest/ui/admin-auth-identity.test.tsx \
  tests/vitest/admin/admin-cache-authority.test.ts
set -a && source .env && set +a
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
# adminPrefetch.ts below is read-only for L04 (sole-owned by TASK-551-03-L02);
# it stays in the line-count gate for verification only.
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
only through TASK-551-10-L02; do not edit changelog 1310 here.

## Workflow Dispatch Envelope

The finite `forbiddenPaths` list captures named current ownership conflicts.
The closed `allowlist` rejects every omitted path, including the broad foreign
categories described in the file-ownership contract. The Redis command carries
no endpoint, namespace, assignment, or override token: TASK-551-11 derives the
private namespace under `task551-db-redis-test`.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-09-L04",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-09"
  },
  "allowlist": [
    "core/admin/services/adminAuthIdentity.ts",
    "core/admin/services/adminCacheIdentity.ts",
    "core/admin/services/authClient.ts",
    "core/admin/services/cachePolicy.ts",
    "core/admin/services/adminThemeClient.ts",
    "core/admin/services/analyticsClient.ts",
    "core/admin/services/apiClient.ts",
    "core/admin/services/assistantClient.ts",
    "core/admin/services/assistantStatusClient.ts",
    "core/admin/services/backupsClient.ts",
    "core/admin/services/commerceClient.ts",
    "core/admin/services/contentTypesClient.ts",
    "core/admin/services/customScreenShortcutsClient.ts",
    "core/admin/services/customScreensCache.ts",
    "core/admin/services/customScreensClient.ts",
    "core/admin/services/dashboardClient.ts",
    "core/admin/services/importExportClient.ts",
    "core/admin/services/listingsClient.ts",
    "core/admin/services/mediaFoldersClient.ts",
    "core/admin/services/menusClient.ts",
    "core/admin/services/pageTemplatesClient.ts",
    "core/admin/services/popupsClient.ts",
    "core/admin/services/redirectsClient.ts",
    "core/admin/services/reviewsClient.ts",
    "core/admin/services/seoClient.ts",
    "core/admin/services/settingsCache.ts",
    "core/admin/services/settingsClient.ts",
    "core/admin/services/siteSettingsClient.ts",
    "core/admin/services/solutionKitsClient.ts",
    "core/admin/services/userSettingsClient.ts",
    "core/admin/services/widgetsClient.ts",
    "core/admin/ui/contexts/AdminAuthContext.tsx",
    "core/admin/utils/adminCacheAuthority.ts",
    "core/admin/utils/storageCache.ts",
    "core/admin/utils/cacheBus.ts",
    "core/admin/utils/readThroughCache.ts",
    "core/admin/utils/sessionCache.ts",
    "core/services/settings/securitySettings.ts",
    "core/server/routes/settingsRoutes.ts",
    "tests/vitest/admin/storageCache.test.ts",
    "tests/vitest/admin/cacheBusHardening.test.ts",
    "tests/vitest/admin/readThroughCache.test.ts",
    "tests/vitest/admin/cacheBus.test.ts",
    "tests/vitest/admin/cacheBusCorrelation.test.ts",
    "tests/vitest/admin/cacheRefresh.test.ts",
    "tests/vitest/admin/support/cacheBusTestHarness.ts",
    "tests/vitest/admin/admin-cache-identity.test.ts",
    "tests/vitest/admin/admin-cache-authority.test.ts",
    "tests/vitest/admin/read-through-cache-generation.test.ts",
    "tests/vitest/admin/admin-cache-client-authority-matrix.test.ts",
    "tests/vitest/admin/authClient.test.ts",
    "tests/vitest/authUi/authClient.test.ts",
    "tests/vitest/ui/admin-auth-identity.test.tsx",
    "tests/unit/security/securitySettings.test.ts",
    "tests/integration/routes/securitySettings.test.ts",
    "tests/integration/routes/settings.test.ts",
    "tests/integration/server/security-settings-db-authority.test.ts"
  ],
  "forbiddenPaths": [
    "core/admin/services/pagesClient.ts",
    "core/admin/services/detailPagesClient.ts",
    "core/admin/services/entriesClient.ts",
    "core/admin/services/postsClient.ts",
    "core/admin/services/adminUsersClient.ts",
    "core/admin/services/formsClient.ts",
    "core/admin/services/mediaClient.ts",
    "core/admin/services/bookingClient.ts",
    "core/admin/services/searchClient.ts",
    "core/admin/ui/search/useSearchResults.ts",
    "core/admin/utils/adminPrefetch.ts",
    "core/server/publicSite.tsx",
    "core/services/cache/serverCacheContracts.ts",
    "core/services/cache/serverCacheCoherence.ts",
    "core/services/cache/serverCacheConditionalWrite.ts",
    "core/services/cache/serverCacheCodec.ts",
    "core/services/cache/serverCacheKeys.ts",
    "core/services/cache/serverCacheEligibility.ts",
    "core/services/cache/serverCacheConfig.ts",
    "tests/vitest/cache/server-cache-contracts.test.ts",
    "tests/vitest/cache/server-cache-codec-keys.test.ts",
    "tests/vitest/cache/server-cache-eligibility.test.ts",
    "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts",
    "core/services/cache/serverCacheRuntime.ts",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json"
  ],
  "dependencies": ["TASK-551-07-L01:single", "TASK-551-09-L03:single"],
  "commands": [
    {
      "id": "initial-authority-test",
      "lane": "vitest",
      "environmentProfile": "none",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/admin-cache-authority.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/admin-cache-authority.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "final-admin-cache-tests",
      "lane": "vitest",
      "environmentProfile": "none",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/storageCache.test.ts", "tests/vitest/admin/cacheBusHardening.test.ts", "tests/vitest/admin/readThroughCache.test.ts", "tests/vitest/admin/cacheBus.test.ts", "tests/vitest/admin/cacheBusCorrelation.test.ts", "tests/vitest/admin/cacheRefresh.test.ts", "tests/vitest/admin/admin-cache-identity.test.ts", "tests/vitest/admin/read-through-cache-generation.test.ts", "tests/vitest/admin/admin-cache-client-authority-matrix.test.ts", "tests/vitest/admin/authClient.test.ts", "tests/vitest/authUi/authClient.test.ts", "tests/vitest/ui/admin-auth-identity.test.tsx", "tests/vitest/admin/admin-cache-authority.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/storageCache.test.ts", "tests/vitest/admin/cacheBusHardening.test.ts", "tests/vitest/admin/readThroughCache.test.ts", "tests/vitest/admin/cacheBus.test.ts", "tests/vitest/admin/cacheBusCorrelation.test.ts", "tests/vitest/admin/cacheRefresh.test.ts", "tests/vitest/admin/admin-cache-identity.test.ts", "tests/vitest/admin/read-through-cache-generation.test.ts", "tests/vitest/admin/admin-cache-client-authority-matrix.test.ts", "tests/vitest/admin/authClient.test.ts", "tests/vitest/authUi/authClient.test.ts", "tests/vitest/ui/admin-auth-identity.test.tsx", "tests/vitest/admin/admin-cache-authority.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "memory-security-settings-tests",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/unit/security/securitySettings.test.ts", "tests/integration/routes/settings.test.ts", "tests/integration/routes/securitySettings.test.ts", "tests/integration/server/security-settings-db-authority.test.ts", "tests/integration/runtime/public-site-cache-query-budget.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/unit/security/securitySettings.test.ts", "tests/integration/routes/settings.test.ts", "tests/integration/routes/securitySettings.test.ts", "tests/integration/server/security-settings-db-authority.test.ts", "tests/integration/runtime/public-site-cache-query-budget.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "redis-security-settings-tests",
      "lane": "bun-test",
      "environmentProfile": "task551-db-redis-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/server/security-settings-db-authority.test.ts", "tests/integration/runtime/public-site-cache-query-budget.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/security-settings-db-authority.test.ts", "tests/integration/runtime/public-site-cache-query-budget.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "admin-boundary-check",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "check:admin-boundary"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["git", "diff", "--check"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "line-count",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["wc", "-l", "core/admin/services/adminAuthIdentity.ts", "core/admin/services/adminCacheIdentity.ts", "core/admin/services/authClient.ts", "core/admin/services/cachePolicy.ts", "core/admin/services/adminThemeClient.ts", "core/admin/services/analyticsClient.ts", "core/admin/services/apiClient.ts", "core/admin/services/assistantClient.ts", "core/admin/services/assistantStatusClient.ts", "core/admin/services/backupsClient.ts", "core/admin/services/commerceClient.ts", "core/admin/services/contentTypesClient.ts", "core/admin/services/customScreenShortcutsClient.ts", "core/admin/services/customScreensCache.ts", "core/admin/services/customScreensClient.ts", "core/admin/services/dashboardClient.ts", "core/admin/services/importExportClient.ts", "core/admin/services/listingsClient.ts", "core/admin/services/mediaFoldersClient.ts", "core/admin/services/menusClient.ts", "core/admin/services/pageTemplatesClient.ts", "core/admin/services/popupsClient.ts", "core/admin/services/redirectsClient.ts", "core/admin/services/reviewsClient.ts", "core/admin/services/seoClient.ts", "core/admin/services/settingsCache.ts", "core/admin/services/settingsClient.ts", "core/admin/services/siteSettingsClient.ts", "core/admin/services/solutionKitsClient.ts", "core/admin/services/userSettingsClient.ts", "core/admin/services/widgetsClient.ts", "core/admin/ui/contexts/AdminAuthContext.tsx", "core/admin/utils/adminCacheAuthority.ts", "core/admin/utils/storageCache.ts", "core/admin/utils/sessionCache.ts", "core/admin/utils/cacheBus.ts", "core/admin/utils/readThroughCache.ts", "core/admin/utils/adminPrefetch.ts", "core/server/routes/settingsRoutes.ts", "core/services/settings/securitySettings.ts", "tests/vitest/admin/storageCache.test.ts", "tests/vitest/admin/cacheBusHardening.test.ts", "tests/vitest/admin/readThroughCache.test.ts", "tests/vitest/admin/cacheBus.test.ts", "tests/vitest/admin/cacheBusCorrelation.test.ts", "tests/vitest/admin/cacheRefresh.test.ts", "tests/vitest/admin/admin-cache-authority.test.ts", "tests/vitest/admin/admin-cache-identity.test.ts", "tests/vitest/admin/read-through-cache-generation.test.ts", "tests/vitest/admin/admin-cache-client-authority-matrix.test.ts", "tests/vitest/admin/authClient.test.ts", "tests/vitest/authUi/authClient.test.ts", "tests/vitest/ui/admin-auth-identity.test.tsx", "tests/vitest/admin/support/cacheBusTestHarness.ts", "tests/unit/security/securitySettings.test.ts", "tests/integration/routes/settings.test.ts", "tests/integration/routes/securitySettings.test.ts", "tests/integration/server/security-settings-db-authority.test.ts"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "initial",
      "dependsOn": ["TASK-551-07-L01:single"],
      "commandIds": ["initial-authority-test", "core-lint-types", "core-lint", "diff-check"]
    },
    {
      "id": "final",
      "dependsOn": ["TASK-551-09-L03:single"],
      "commandIds": ["final-admin-cache-tests", "memory-security-settings-tests", "redis-security-settings-tests", "admin-boundary-check", "core-lint-types", "core-lint", "diff-check", "line-count"]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-24 (mirror of TASK-551-07-L01 round-2; append-only)

- **C1 — envelope `forbiddenPaths` single-writer parity.** TASK-551-07-L01
  owns eleven server-cache paths (seven modules under `core/services/cache/`
  including the split-out coherence and conditional-write modules, plus four
  Vitest suites under `tests/vitest/cache/`). Because 09-L04 `initial` lands
  immediately after 07-L01, the envelope must forbid all eleven 07-L01
  allowlist paths (full parity with 07-L01's allowlist).
  - Before: `forbiddenPaths` listed only three of those paths:
    `core/services/cache/serverCacheContracts.ts`,
    `core/services/cache/serverCacheCoherence.ts`, and
    `core/services/cache/serverCacheConditionalWrite.ts`.
  - After: `forbiddenPaths` lists all eleven:
    `core/services/cache/serverCacheContracts.ts`,
    `core/services/cache/serverCacheCodec.ts`,
    `core/services/cache/serverCacheKeys.ts`,
    `core/services/cache/serverCacheEligibility.ts`,
    `core/services/cache/serverCacheConfig.ts`,
    `core/services/cache/serverCacheCoherence.ts`,
    `core/services/cache/serverCacheConditionalWrite.ts`,
    `tests/vitest/cache/server-cache-contracts.test.ts`,
    `tests/vitest/cache/server-cache-codec-keys.test.ts`,
    `tests/vitest/cache/server-cache-eligibility.test.ts`, and
    `tests/vitest/cache/server-cache-coherence-conditional-write.test.ts`.
    The list stays unique and disjoint from this leaf's allowlist.
  - The edit was made in place in the envelope JSON fence; no other envelope
    key, command, or phase changed.

## Dated Contract Corrections — 2026-09-24 (INITIAL FAZA-0 dispositions; append-only)

Two independent read-only auditors reviewed the INITIAL occurrence of this leaf.
These corrections win over the body wherever they differ; I4-I6 also bind the
FINAL occurrence.

Line references below are to the committed body bytes at HEAD `c9d1e808`. The
only in-place body edits are the ones recorded in I4 (envelope JSON and the
Testing Requirements command block). The envelope edits change no line count.
The command-block edits net two added lines: HEAD lines 552-555 sit one line up,
HEAD lines 556-568 keep their numbers, and every HEAD line from 569 onward
(including the whole envelope) sits two lines lower in the working tree.

### I1 — Test seam for the overflow rule (HIGH)

- The INITIAL API at lines 109-118 declares the overflow rule ("At
  `Number.MAX_SAFE_INTEGER`, the next advance invokes resets and permanently
  disables cache installation") but exposes no way to reach that generation in a
  test short of 2^53 advances.
- Disposition: INITIAL `adminCacheAuthority.ts` exports exactly SIX symbols:
  one type plus five runtime functions (the dispatch mandate's "six runtime
  symbols + the type" counted the type among the six; only five names exist at
  runtime):
  - `type AdminCacheInstallationToken` (opaque);
  - `captureAdminCacheInstallationToken()`;
  - `isCurrentAdminCacheInstallationToken(token)`;
  - `registerAdminModuleCacheReset(reset)`;
  - `advanceAdminCacheInstallationAuthority()`;
  - NEW `createAdminCacheInstallationAuthority(options?: { initialGeneration?: number })`,
    returning an instance `{ capture, isCurrent, register, advance }` with
    semantics identical to the four named functions.
- The module-level default instance is `createAdminCacheInstallationAuthority()`
  (generation `0`); the four named functions delegate to it.
- Production consumers, including L04 FINAL, use only the four named runtime
  functions; `createAdminCacheInstallationAuthority` is used only by
  `admin-cache-authority.test.ts`.
- `initialGeneration` must be a safe integer in `0..Number.MAX_SAFE_INTEGER`.
  Any other value throws a `TypeError` whose message is exactly the stable code
  `"admin_cache_authority_invalid"`.
- The overflow test builds an instance with
  `initialGeneration: Number.MAX_SAFE_INTEGER`, calls `advance()` once and
  asserts:
  - every registered reset ran exactly once;
  - the token captured before the advance, one captured after it and every
    later capture all return `isCurrent(...) === false`;
  - a second `advance()` runs the resets again and neither wraps nor re-enables
    installation.

### I2 — INITIAL semantics (binding pseudocode; AGENTS.md executable-leaf rule)

The body pseudocode (lines 350-445) contains no INITIAL-module shape. This is the
binding INITIAL implementation contract:

```ts
// core/admin/utils/adminCacheAuthority.ts
// Zero value imports (type-only allowed). Touches no host/browser global and no
// network or hashing API at import or call time — see the I3 source guard.

declare const tokenBrand: unique symbol;
export type AdminCacheInstallationToken = { readonly [tokenBrand]: never };

const AUTHORITY_INVALID = "admin_cache_authority_invalid";

const mintToken = (): AdminCacheInstallationToken =>
  Object.freeze(Object.create(null)) as AdminCacheInstallationToken;
  // frozen, prototype-less, own-key-less: JSON.stringify(token) === "{}"

const swallowThenable = (result: unknown): void => {
  if (result !== null && (typeof result === "object" || typeof result === "function")) {
    try {
      const then = (result as { then?: unknown }).then;
      if (typeof then === "function") {
        then.call(result, () => undefined, () => undefined); // never unhandled
      }
    } catch {
      // A throwing `then` getter is swallowed like a throwing reset.
    }
  }
};

export const createAdminCacheInstallationAuthority = (
  options?: { initialGeneration?: number },
) => {
  // `=== undefined`, not `??`: an explicit null must reach validation and throw.
  const initial = options?.initialGeneration === undefined ? 0 : options.initialGeneration;
  if (!Number.isSafeInteger(initial) || initial < 0) {
    throw new TypeError(AUTHORITY_INVALID);
  }
  let generation: number = initial;
  let disabled = false;
  let currentToken: AdminCacheInstallationToken = mintToken();
  // Insertion-ordered; each value is the live registration record for that reset.
  const resets = new Map<() => void, object>();

  const capture = (): AdminCacheInstallationToken =>
    disabled ? mintToken() : currentToken; // fresh never-current sentinel after disable

  const isCurrent = (token: unknown): boolean =>
    !disabled && token === currentToken; // never throws

  const register = (reset: () => void): (() => void) => {
    let record = resets.get(reset); // keyed by reference
    if (record === undefined) {
      record = {};
      resets.set(reset, record); // duplicate registration adds nothing
    }
    const bound = record;
    let active = true; // per-handle: every unsubscribe handle is single-use
    return () => {
      if (!active) return;
      active = false;
      // A stale handle from an earlier registration of the same function is a
      // no-op after re-registration, because its record is no longer live.
      if (resets.get(reset) === bound) resets.delete(reset); // O(1), next dispatch
    };
  };

  const advance = (): void => {
    // Step 1: generation or disable, then a NEW token, before any dispatch.
    if (generation === Number.MAX_SAFE_INTEGER) disabled = true;
    else generation += 1;
    currentToken = mintToken();
    // Step 2: dispatch over a SNAPSHOT in registration (insertion) order.
    for (const reset of [...resets.keys()]) {
      try {
        swallowThenable((reset as () => unknown)()); // zero arguments
      } catch {
        // Swallowed: no rethrow, no scheduled rethrow, no console output.
      }
    }
  };

  return { capture, isCurrent, register, advance };
};

const defaultAuthority = createAdminCacheInstallationAuthority();
export const captureAdminCacheInstallationToken = () => defaultAuthority.capture();
export const isCurrentAdminCacheInstallationToken = (token: unknown) =>
  defaultAuthority.isCurrent(token);
export const registerAdminModuleCacheReset = (reset: () => void) =>
  defaultAuthority.register(reset);
export const advanceAdminCacheInstallationAuthority = () => defaultAuthority.advance();
```

Binding rules the sketch encodes:

- **Source spelling:** the module never spells a guarded identifier from the I3
  source guard, not even in a comment (belt and braces: the guard strips
  comments before matching, and the prose must not rely on that).
- **Validation:** `initialGeneration` omitted or `undefined` means `0`; every
  other value, including `null`, is validated. `-0` is accepted (it is a safe
  integer and not `< 0`).
- **State per instance:** `generation`, `disabled = false`, one `currentToken`
  per generation (`Object.freeze(Object.create(null))`), and
  `resets = new Map<() => void, object>()` (insertion-ordered; the value is the
  live registration record).
- **`capture()`:** returns the current-generation token object. Captures within
  one non-disabled generation are `Object.is`-equal; after disable each capture
  is a distinct fresh sentinel that is never current.
  `JSON.stringify(token) === "{}"` and `Object.keys(token).length === 0`.
- **`isCurrent(t)`:** `!disabled && t === currentToken`. Any other input
  (non-object, foreign object, stale token) returns `false`; it never throws.
- **`advance()`:** step 1 disables at `Number.MAX_SAFE_INTEGER`, otherwise
  increments; in both cases it mints a NEW `currentToken`. Step 2 dispatches
  over a snapshot of `resets` in insertion order. Each call is wrapped in
  `try/catch`; a throw is swallowed (no rethrow, no scheduled rethrow, no console
  output, because the callback carries no identity and the seam must never fail
  a page). A returned thenable is otherwise ignored but gets a no-op rejection
  handler so it never becomes an unhandled rejection. Entries unsubscribed during
  dispatch that are still in the snapshot are called in this pass. Registrations
  made during dispatch run from the next advance. A nested `advance()` inside a
  reset increments again and runs its own full pass, then the outer pass
  continues its remaining snapshot. `advance()` never throws.
- **`register(reset: () => void): () => void`:** keyed by function reference in
  the Map. Registering the same reference again while it is registered adds
  nothing and returns a new handle bound to that same live registration record.
  Resets are invoked with zero arguments. Every unsubscribe handle is single-use
  through its own per-handle `active` flag (a second call is a no-op), and it
  deletes only while its bound record is still the live one, so a stale handle
  from an earlier registration of the same function is a no-op after
  re-registration. The flag alone would not cover a duplicate-registration
  handle that is still active after its twin unsubscribed and the function was
  re-registered; the record check is sufficient, and the flag is defensive.
  Unsubscribe is O(1) and safe
  during dispatch (removal applies from the next dispatch). Per-instance
  registrations (hooks) MUST unsubscribe on cleanup.
  Per-instance registrations (hooks) must pass a closure created for that
  instance; handles for a shared function reference share one registration,
  and any live handle removes it for all holders.
- Each `catch {}` in the module keeps a non-empty explanatory comment (ESLint
  `no-empty`); the comment must not spell a guarded identifier.
- **Reset callbacks must be total** (synchronous clear/assignment only, no I/O).
  The seam swallows throws and rejections only as a last line of defense.
- **Annotation of lines 396-415:** `advanceKeyInstallationGeneration(key)` and
  `isCurrentKeyGeneration(key, generation)` in the pseudocode are FINAL
  `readThroughCache.ts`-private helpers, not `adminCacheAuthority` exports.

### I3 — Test matrix restated (replaces lines 543-548 for INITIAL)

`tests/vitest/admin/admin-cache-authority.test.ts` covers:

- token identity within a generation and inequality across `advance()`;
- `isCurrent` for stale, foreign and non-object inputs;
- advance order: generation/disable happens before dispatch, so a reset that
  captures inside dispatch sees the NEW token;
- registration (insertion) order of dispatch;
- duplicate registration is a no-op, unsubscribe is idempotent, and unsubscribe
  during dispatch still lets the snapshot entry run in the current pass only;
- single-use handles: `register(f)` → `h1`; `h1()`; `register(f)` → `h2`;
  calling `h1()` again leaves `f` registered (the next `advance()` calls `f`
  once), and `h2()` then removes it; a duplicate-registration handle obtained
  before `h1()` is likewise a no-op after re-registration;
- default-instance delegation: `registerAdminModuleCacheReset(spy)` then
  `advanceAdminCacheInstallationAuthority()` calls `spy` exactly once with zero
  arguments; a token captured through `captureAdminCacheInstallationToken()`
  before the advance is stale and one captured after it is current under
  `isCurrentAdminCacheInstallationToken`; every default-instance registration
  made by the suite is unsubscribed in `afterEach` so module state cannot leak
  across tests;
- throwing-subscriber isolation: spy resets registered before and after the
  thrower are still called and `advance()` returns normally; `console.error`,
  `console.warn` and `console.log` are spied and each has zero calls;
- unhandled-rejection proof: install `process.on("unhandledRejection", spy)`;
  register one reset returning `Promise.reject(new Error("x"))` and one
  returning an object whose `then` getter throws; call `advance()`; then
  `await new Promise((r) => setTimeout(r, 0))`; assert
  `expect(spy).not.toHaveBeenCalled()`; remove the listener with `process.off`
  in `finally`/`afterEach`. `vi.waitFor` is not used (it cannot prove absence).
  Vitest also fails the run on an unhandled rejection by default, which is a
  second, independent signal;
- nested `advance()` pin: register `A` (logs `"A"`, then on its first call only,
  guarded by a flag, sets the re-entrancy flag BEFORE calling `advance()`, then
  calls `advance()` once) and `B` (logs `"B"`); one outer
  `advance()` yields a log equal to `["A","A","B","B"]`. Tokens captured before
  the outer advance, inside `A` before the nested call, and after the outer
  advance are three distinct objects (`not.toBe` pairwise) and only the last is
  current. An instance with `initialGeneration: Number.MAX_SAFE_INTEGER - 1`
  whose single nested advance reaches the overflow step disables: every capture
  after that nested advance is non-current, including after the outer pass
  returns;
- overflow per I1;
- `initialGeneration` validation: negative, non-integer, greater than
  `Number.MAX_SAFE_INTEGER`, `NaN`, `null` (cast
  `null as unknown as number`) and a string
  (`createAdminCacheInstallationAuthority({ initialGeneration: "1" as unknown as number })`)
  each throw; every invalid case asserts both `toThrowError(TypeError)` and a
  caught error whose `message === "admin_cache_authority_invalid"`. No
  `@ts-expect-error` or `@ts-ignore` is used. `-0`, `0`, omitted options and
  `{ initialGeneration: undefined }` are accepted;
- zero identity bytes: `reset.mock.calls[i].length === 0` and
  `JSON.stringify(token) === "{}"`;
- token equality is asserted only with `toBe`/`not.toBe`/`Object.is`; structural
  `toEqual`/`toStrictEqual` is never used on tokens, because every token is a
  structurally identical empty frozen object;
- SOURCE GUARD (executable): `readFileSync` the module source `src`, strip
  comments first with
  `const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");`
  and assert zero matches in `code` of each of:
  - `/\b(window|document|localStorage|sessionStorage|BroadcastChannel|fetch|crypto)\b/`;
  - `/^\s*import\s+(?!type\s)/m` (value import; `import type` allowed);
  - `/^\s*export\s[^;]*\sfrom\s*["']/m` (re-export);
  - `/\bimport\s*\(/` (dynamic import);
  - `/\brequire\s*\(/`.

  Positive control: `expect(code).toMatch(/createAdminCacheInstallationAuthority/);`
  proves the stripped source is non-empty and the guard reads the real module.

  The export-set assertion is
  `Object.keys(await import("../../../core/admin/utils/adminCacheAuthority")).sort()`
  (relative import path, house style) equal to exactly the five runtime export
  names from I1 (`advanceAdminCacheInstallationAuthority`,
  `captureAdminCacheInstallationToken`, `createAdminCacheInstallationAuthority`,
  `isCurrentAdminCacheInstallationToken`, `registerAdminModuleCacheReset`); the
  type export has no runtime key. The module must not spell the guarded
  identifiers even in comments (I2 source-spelling rule).

The body sentence at lines 547-548 ("Its source guard proves INITIAL edits only
`adminCacheAuthority.ts` plus this test") is superseded: the two-path INITIAL
scope is proved by the ORCHESTRATOR receipt, not by the test. The orchestrator
COMMITS this contract round before INITIAL dispatch (the owner authorized
worktree commits on this branch; otherwise the receipt is the pre-dispatch
porcelain baseline plus exactly the two `??` lines). The porcelain receipt is
taken immediately after W-test returns, before any spina/receipt write. After
the writer returns,
`git status --porcelain --untracked-files=all` must list exactly these two lines
and nothing else:

- `?? core/admin/utils/adminCacheAuthority.ts`
- `?? tests/vitest/admin/admin-cache-authority.test.ts`

Because both paths are untracked, the orchestrator then runs
`git add -N core/admin/utils/adminCacheAuthority.ts tests/vitest/admin/admin-cache-authority.test.ts`
so the envelope `diff-check` command (`git diff --check`) inspects their bytes.
The status receipt is taken before `git add -N`. The orchestrator runs
`prettier --check` on both new files BEFORE the gates and computes the receipt
sha256 after prettier.

### I4 — Validation law (in-place edits, recorded)

Following the TASK-551-07-L01 C7/R2 law (`bun run test:vitest` sources `.env`
through the root `package.json` script), the INITIAL gate is env-free. In-place
edits made in this round:

- Envelope `initial-authority-test` argv (line 714):
  - Before: `["bun", "run", "test:vitest", "--", "tests/vitest/admin/admin-cache-authority.test.ts"]`
  - After: `["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/admin-cache-authority.test.ts"]`
  - `environmentProfile` stays `"none"`.
- Envelope `final-admin-cache-tests` (lines 725 and 728):
  - Before: argv prefix `["bun", "run", "test:vitest", "--", ...]` with the
    twelve existing test paths; `positiveDiscovery.paths` the same twelve paths.
  - After: argv prefix `["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", ...]`
    with the same twelve paths in the same order plus
    `tests/vitest/admin/admin-cache-authority.test.ts` appended; the same path
    appended to `positiveDiscovery.paths`. `environmentProfile` stays `"none"`.
- Envelope `occurrences[initial].commandIds` (line 794):
  - Before: `["initial-authority-test", "core-lint-types", "core-lint"]`
  - After: `["initial-authority-test", "core-lint-types", "core-lint", "diff-check"]`
  - The occurrence `id`s and `dependsOn` values, and the envelope
    `dependencies`, are unchanged.
- Testing Requirements command block (HEAD lines 550-598; round 1 and round 2
  edits, both in place):
  - Before (HEAD): line 551 `set -a && source .env && set +a` opened the block;
    line 553 was `bun run test:vitest -- tests/vitest/admin/admin-cache-authority.test.ts`;
    the INITIAL gate ended at line 555 `bun --cwd core lint` with no
    `git diff --check`; lines 557-568 were the FINAL
    `bun run test:vitest -- <12 paths>` invocation, which sourced `.env` through
    the root `package.json` script and omitted the authority suite.
  - After (round 1): the leading sourcing line is removed; the INITIAL vitest
    line is
    `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/admin/admin-cache-authority.test.ts`;
    `set -a && source .env && set +a` sits immediately before the FINAL
    `SERVER_CACHE_BACKEND=memory bun test ...` DB lane.
  - After (round 2): the INITIAL gate gains `git diff --check` after
    `bun --cwd core lint`, mirroring `occurrences[initial].commandIds`. The FINAL
    vitest invocation becomes the env-free direct runner
    `bun --env-file=/dev/null node_modules/vitest/vitest.mjs run <13 paths>`,
    with the thirteen paths in exactly the order of the envelope
    `final-admin-cache-tests` argv (the twelve HEAD paths, then
    `tests/vitest/admin/admin-cache-authority.test.ts`). `.env` sourcing stays
    only immediately before the FINAL Bun DB lanes. The vitest invocations
    agree with the envelope argv; the envelope stays authoritative.
  - Round 3 (in place): the FINAL vitest prose line is prefixed with
    `env DATABASE_URL='postgresql://127.0.0.1:1/none'` to match the INITIAL line
    and 10-L01. Before:
    `bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/admin/storageCache.test.ts \`.
    After:
    `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/admin/storageCache.test.ts \`.
- Orchestrator INITIAL gates outside the envelope (run by the orchestrator
  between phases, not by the writer agent):
  - root `tsc -p tsconfig.json --noEmit` compared against the recorded baseline
    (`bun --cwd core lint:types` does not cover `tests/`);
  - `eslint --max-warnings=0` over the two INITIAL paths;
  - `wc -l` over the two INITIAL paths (1,000-line gate);
  - the I3 scope receipt (`git status --porcelain --untracked-files=all`),
    followed by `git add -N` on the two INITIAL paths before the envelope
    `diff-check` command runs. `git diff --check` itself is the envelope
    `diff-check` command and is not repeated here.

### I5 — Seam stability after INITIAL

- FINAL may only extend `adminCacheAuthority.ts` ADDITIVELY. The six INITIAL
  exports (one type plus five runtime functions) keep byte-compatible signatures
  and semantics, because 03-L02
  and 04-L01 import them between phases.
- Any FINAL edit to `adminCacheAuthority.ts` re-runs the direct suite, which I4
  now includes in `final-admin-cache-tests`. Any FINAL export addition updates
  the I3 export-set assertion in the same change.
- Line 75 is overridden (body bytes unchanged):
  `tests/vitest/admin/admin-cache-authority.test.ts` is "created in INITIAL;
  FINAL may extend additively" instead of "(INITIAL only)".

### I6 — Prefetch reset ownership

- Verified: `core/admin/utils/adminPrefetch.ts` keeps its prefetcher state in
  closure variables of `createAdminPrefetcher` (`inFlight`, `queued`, `queue`,
  `lastAttempt`, `lastSuccess` at lines 108-112), and the default prefetcher is
  the module-level `prefetchAdminRoute = createAdminPrefetcher(defaultEntries)`
  at line 466. No other module can reach that state, so the reset must be
  registered INSIDE that file. Its sole TASK-551 writer is 03-L02 (lines 99-102).
- Disposition for the matrix (lines 125-127):
  - The 03-L02 adoption row at line 125 gains: "`adminPrefetch.ts` default
    prefetcher (`inFlight`/`queued`/`queue`/`lastAttempt`/`lastSuccess`) reset
    via `registerAdminModuleCacheReset`".
  - Line 127 is amended: L04 FINAL only VERIFIES that 03-L02 receipt read-only
    (registry/semantics assertion through the matrix test). It neither edits
    `adminPrefetch.ts` nor claims ownership of its reset registration. The
    phrase at lines 101-102 ("L04 composes its cache-identity
    epoch/registration through `adminCacheAuthority.ts`") is read the same way:
    L04 supplies the seam, and 03-L02 registers the reset.
- 03-L02 carries the mirrored obligation; its writer edits that task file in
  this round.

### I7 — Status field

- The board `**Status:**` (line 11) stays `⏳ To Do` until TASK-551-10-L02
  closure (family precedent: 06-L02, 06-L03, 07-L01).
- The sentence at lines 26-27 ("remains `🚧 In Progress`/non-releasable between
  them") describes the non-releasable state between the INITIAL and FINAL
  phases, not the board field.

### I8 — Downstream mirrors recorded

- **TASK-551-03-L02:** the "L04 INITIAL authority manifest" clause (its HEAD
  lines 966-967) is reworded to a registration-plus-advance proof, because INITIAL
  exports no manifest. That leaf also gains the `adminPrefetch.ts` default-
  prefetcher reset obligation from I6 and names
  `tests/vitest/admin/adminPrefetch.test.ts` as its proof home (that path joins
  its allowlist and its owning Vitest argv; the edit is made in 03-L02).
- **TASK-551-10-L01:** its mirrored TASK-551-09-L04 command block (lines
  991-994) is rebuilt from this leaf's envelope: INITIAL is the direct env-free
  vitest runner, `bun --cwd core lint:types`, `bun --cwd core lint` and
  `git diff --check`; `.env` is sourced only immediately before the FINAL Bun DB
  lanes; FINAL uses the 13-path direct runner of `final-admin-cache-tests`.
- **TASK-551-04-L01:** its envelope `forbiddenPaths` gains
  `core/admin/utils/adminCacheAuthority.ts` and
  `core/admin/services/cachePolicy.ts` for explicitness; its `dependencies` are
  unchanged.
- Each mirror is edited by that task file's own writer in this round; this leaf
  only records them.

### Round-2 record (2026-09-24)

Four independent read-only auditors reviewed the round-1 corrections. Verified
findings were applied in place in the sections above (no duplicate headings):

- **I2/I3 contradiction (HIGH):** the I2 sketch header comment spelled the
  guarded identifiers that the I3 source guard forbids. The comment now names
  none of them; I3 pins the comment-stripping guard, the four import/re-export/
  dynamic-import/require patterns, and the relative-path export-set assertion;
  I2 adds the source-spelling rule.
- **I3 additions:** default-instance delegation with `afterEach` unsubscribe;
  the nested-advance log/token pin plus the `MAX_SAFE_INTEGER - 1` nested
  overflow; validation forms (string via `as unknown as number`, `null` throws,
  `-0` accepted, `TypeError` plus exact message, no TS suppression comments);
  the `process` unhandled-rejection proof replacing `vi.waitFor`; zero console
  output from a throwing subscriber; identity-only token equality.
- **I2 registration:** single-use handles through a per-handle `active` flag,
  plus a per-registration record check so a stale handle (including a
  duplicate-registration handle) cannot remove a later re-registration; the
  sketch uses `Map<() => void, object>` for that record. `??` became an explicit
  `=== undefined` check so `null` is validated. Reset callbacks must be total.
- **Scope proof:** the orchestrator commits this contract round before INITIAL
  dispatch; the two-line `??` status receipt precedes `git add -N` and the
  envelope `diff-check`; the duplicate outside-envelope `git diff --check` is
  removed from I4.
- **Precedence and anchors:** corrections bind the body wherever they differ,
  with I4-I6 also binding FINAL; the pseudocode anchor is lines 350-445 and the
  superseded source-guard sentence is lines 547-548; I5 records line 75 as
  overridden with body bytes unchanged and ties FINAL export additions to the I3
  export-set assertion.
- **Command block (in place):** INITIAL gains `git diff --check`; FINAL uses the
  env-free 13-path direct runner in envelope order. Before/after is in I4.
- **Mirrors:** I6 adds `queue`; I8 records the 03-L02 `adminPrefetch.test.ts`
  proof home and the 10-L01 rebuild of its 09-L04 block from the envelope.
- The envelope JSON, its `dependencies`, occurrence ids and `dependsOn` are
  byte-unchanged in round 2.
- **Round-2 LOW wording fixes (four auditors, verified):**
  - I1: production consumers (including L04 FINAL) use only the four named
    runtime functions; the factory is test-only.
  - I2: per-instance hook registrations pass a per-instance closure (shared
    references share one registration); every `catch {}` keeps a non-empty
    comment that spells no guarded identifier; the flag is defensive, the
    record check sufficient.
  - I3: source-guard positive control
    (`expect(code).toMatch(/createAdminCacheInstallationAuthority/)`); the
    nested-advance re-entrancy flag is set BEFORE calling `advance()`; scope
    proof notes the owner-authorized commit (or baseline-plus-two-lines
    fallback), receipt timing right after W-test, and `prettier --check` before
    gates with the receipt sha256 computed after prettier.
  - I4: "prose and envelope agree" narrowed to the vitest invocations versus the
    envelope argv; the FINAL vitest prose line gains the
    `env DATABASE_URL='postgresql://127.0.0.1:1/none'` prefix (before/after in I4).
  - I8: the 03-L02 "lines 966-967" reference is marked as HEAD numbering.
  - The envelope JSON stays byte-unchanged.
