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
  tests/vitest/admin/admin-cache-authority.test.ts \
  tests/vitest/admin/task551PaginatedClients.test.ts \
  tests/vitest/admin/task551PaginatedClientsSlots.test.ts
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
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/storageCache.test.ts", "tests/vitest/admin/cacheBusHardening.test.ts", "tests/vitest/admin/readThroughCache.test.ts", "tests/vitest/admin/cacheBus.test.ts", "tests/vitest/admin/cacheBusCorrelation.test.ts", "tests/vitest/admin/cacheRefresh.test.ts", "tests/vitest/admin/admin-cache-identity.test.ts", "tests/vitest/admin/read-through-cache-generation.test.ts", "tests/vitest/admin/admin-cache-client-authority-matrix.test.ts", "tests/vitest/admin/authClient.test.ts", "tests/vitest/authUi/authClient.test.ts", "tests/vitest/ui/admin-auth-identity.test.tsx", "tests/vitest/admin/admin-cache-authority.test.ts", "tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/task551PaginatedClientsSlots.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/storageCache.test.ts", "tests/vitest/admin/cacheBusHardening.test.ts", "tests/vitest/admin/readThroughCache.test.ts", "tests/vitest/admin/cacheBus.test.ts", "tests/vitest/admin/cacheBusCorrelation.test.ts", "tests/vitest/admin/cacheRefresh.test.ts", "tests/vitest/admin/admin-cache-identity.test.ts", "tests/vitest/admin/read-through-cache-generation.test.ts", "tests/vitest/admin/admin-cache-client-authority-matrix.test.ts", "tests/vitest/admin/authClient.test.ts", "tests/vitest/authUi/authClient.test.ts", "tests/vitest/ui/admin-auth-identity.test.tsx", "tests/vitest/admin/admin-cache-authority.test.ts", "tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/task551PaginatedClientsSlots.test.ts"],
        "minimum": 15
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

## Dated Contract Corrections — 2026-09-26 (03-L02 consumer mirror; append-only section with an in-place fence edit)

Source: TASK-551-03-L02 Round 10 item R10-13 (the executable spec of this
mirror; 03-L02 records the same text under its `### C17 v6` heading), as
re-disposed by orchestrator decision Addendum I, items I2 and I3
(`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`
and `.../audit-evidence/03-l02-round10-dispositions.md`). This section wins
over the body and over the 2026-09-24 sections wherever they differ, for the
FINAL occurrence only; INITIAL is unchanged.

Anchor rule: line references in this section use HEAD `c237e05d` numbering.
The only in-place edits in this round are the Testing Requirements FINAL
vitest line pair and the envelope fence hunk recorded in item (2). HEAD lines
1-568 keep their numbers; HEAD line 569 keeps its number and gains a trailing
` \`; every HEAD line from 570 onward (including the whole envelope and every
earlier dated section) sits two lines lower in the working tree.

### (1) 03-L02 consumer constraints this leaf's FINAL must preserve

TASK-551-03-L02 (R7-02, R7-06, R8-04; restated in its `### C17 v6` heading
and R10-13) builds its paginated-client invalidation on the following admin
cache seams that this leaf owns at FINAL. They are binding constraints on any
FINAL change to `core/admin/utils/cacheBus.ts`, `adminCacheAuthority.ts`, or
the reset registry:

- **Synchronous local delivery.** `broadcastCacheEvent`
  (`core/admin/utils/cacheBus.ts:131-154`) delivers to every local handler
  synchronously inside the call, with `origin` `"local"` and the caller's
  `options.operationToken` passed through unchanged (`:151-153`). Handlers are
  registered through `localHandlers.add(handler)` in `subscribeCacheEvents`
  (`:157`).
- **Own-sourceId drop.** Remote deliveries whose `sourceId` equals the tab's
  own `cacheBusId` are dropped (`:170`), so a client never sees its own
  emission twice (once local, once remote).
- **Media-folder emissions.** `core/admin/services/mediaFoldersClient.ts`
  emits `mediaFolders` only on create (`:236`), update (`:251`) and reorder
  (`:268`); delete emits `mediaFolders` then `mediaList` (`:280-281`). FINAL
  must keep the key set per mutation (03-L02's media subscription clears its
  slot on both keys).
- **03-L02 module-level state is reset-owned.** The module-level state that
  03-L02 introduces — per-client lazy cacheBus subscription handles, the
  `postFirstPageEpochs` map, and the `<client>SelfEmit` guards (for example
  `postsSelfEmit`) — is cleared or unsubscribed by the reset callbacks 03-L02
  registers through `registerAdminModuleCacheReset`. FINAL identity
  transitions must keep invoking every registered reset (the I2 registry
  semantics, one throwing callback not blocking the rest).

A 09-L04 FINAL change to any of the four items above re-opens TASK-551-03-L02
R7-02, R7-06 and R8-04 (cite: 03-L02 `### C17 v6` and R10-13); it is not a
local 09-L04 edit.

Explicitly NOT a constraint: the cacheBus handler ORDER. 03-L02 R10-03 made
the media fail-closed guarantee order-independent (every `mediaList` and
`mediaFolders` event forces the view's `revalidate()`), so no handler-order
pin is owed to this leaf and FINAL may reorder local handler delivery without
re-opening 03-L02 on that ground.

### (2) In-place fence edit — `final-admin-cache-tests` (15 paths)

Both 03-L02 paginated-client suites join this leaf's FINAL admin-cache lane,
because they prove the item (1) constraints against the FINAL cacheBus and
reset registry. Edits made in place (C1/I4 precedent):

- Envelope `final-admin-cache-tests` `argv` (HEAD :727) and
  `positiveDiscovery.paths` (HEAD :730):
  - Before: the 13 paths ending with
    `"tests/vitest/admin/admin-cache-authority.test.ts"]`.
  - After: the same 13 paths in the same order, then
    `"tests/vitest/admin/task551PaginatedClients.test.ts"` and
    `"tests/vitest/admin/task551PaginatedClientsSlots.test.ts"` (15 paths).
- `positiveDiscovery.minimum` (HEAD :731):
  - Before: `"minimum": 1`.
  - After: `"minimum": 15` (the full path count).
- Every other envelope key is byte-identical: `lane`, `environmentProfile`,
  the other eight commands (including `line-count`), `dependencies` (HEAD
  :710) and both occurrences (`initial` HEAD :794, `final` `dependsOn` HEAD
  :800).
- Testing Requirements FINAL vitest invocation (HEAD :557-569):
  - Before: HEAD :569 `  tests/vitest/admin/admin-cache-authority.test.ts`
    ended the invocation.
  - After: HEAD :569 gains a trailing ` \`, followed by the two new prose
    lines `  tests/vitest/admin/task551PaginatedClients.test.ts \` and
    `  tests/vitest/admin/task551PaginatedClientsSlots.test.ts`. The prose
    invocation agrees with the envelope argv; the envelope stays
    authoritative.
- Both files run WHOLE (no `-t`/name filter, no per-test subset); a skipped
  or filtered-out test in either file is a failed FINAL gate.
- Neither file exists at HEAD. TASK-551-03-L02 creates both at its INITIAL
  occurrence (its allowlist and `admin-pagination-vitest-*` fences own them;
  the Slots suite joins `admin-pagination-vitest-2` per Addendum I1). This
  leaf never writes them; they stay out of this leaf's allowlist and its
  `line-count` command (03-L02's own line gate covers them).
- Ordering: this leaf's FINAL runs after `TASK-551-03-L02:initial`. The
  ordering is transitively enforced by the parent graph chain (parent :992 →
  :1004): `TASK-551-03-L02:initial` (:992) → 07-L02 → 08-L01 → 08-L02 →
  08-L03:final → 03-L02:final → 03-L03 → 04-L01 → 04-L02 → 09-L01 → 09-L02 →
  09-L03 → `TASK-551-09-L04:final` (:1004). Per Addendum I2, NO explicit edge
  is added: the envelope `dependencies` and the `final` occurrence `dependsOn`
  stay byte-identical, and the parent graph is not edited. The R10-13 item
  (3) instruction to add `TASK-551-03-L02:initial` to the `final` `dependsOn`
  is superseded by I2, including where 03-L02 `### C17 v6` still names that
  edge.

### (3) Superseded 13-path sentences (quoted verbatim)

Each sentence below is superseded; its replacement follows. Line numbers are
HEAD numbering (working tree +2).

- I4 round-2 (HEAD :1168-1171), superseded:
  "The FINAL vitest invocation becomes the env-free direct runner
  `bun --env-file=/dev/null node_modules/vitest/vitest.mjs run <13 paths>`,
  with the thirteen paths in exactly the order of the envelope
  `final-admin-cache-tests` argv"
  - Replacement: the FINAL vitest invocation is the env-free direct runner
    `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run <15 paths>`,
    with the fifteen paths in exactly the order of the envelope
    `final-admin-cache-tests` argv (the twelve original HEAD paths,
    `tests/vitest/admin/admin-cache-authority.test.ts`,
    `tests/vitest/admin/task551PaginatedClients.test.ts`,
    `tests/vitest/admin/task551PaginatedClientsSlots.test.ts`).
- I8 (HEAD :1247), superseded:
  "FINAL uses the 13-path direct runner of `final-admin-cache-tests`."
  - Replacement: FINAL uses the 15-path direct runner of
    `final-admin-cache-tests`.
- Round-2 record (HEAD :1285-1286), superseded:
  "FINAL uses the env-free 13-path direct runner in envelope order."
  - Replacement: FINAL uses the env-free 15-path direct runner in envelope
    order (item (2) of this section).
- 2026-09-24 FAZA-0 preamble (HEAD :841-843), superseded:
  "The only in-place body edits are the ones recorded in I4 (envelope JSON and
  the Testing Requirements command block)."
  - Replacement: the in-place body edits are the ones recorded in I4 and in
    item (2) of this section (envelope JSON and the Testing Requirements
    command block). The I4 line arithmetic in that preamble applies to HEAD
    `c9d1e808`; the anchor rule of this section applies to HEAD `c237e05d`.

No other sentence of this leaf pins the 13-path list (untruncated
`grep -c "13-path\|thirteen"` at HEAD `c237e05d`: 3 matching lines, all quoted
above; the preamble is quoted because its "only in-place body edits" claim is
no longer true).

### (4) Owed mirror — TASK-551-10-L01 (orchestrator follow-up)

TASK-551-10-L01 mirrors this leaf's FINAL `final-admin-cache-tests` list and
now drifts from it (13 → 15 paths). Owed per Addendum I3 (c), edited by the
TASK-551-10-L01 writer (orchestrator follow-up, not this leaf's writer):

- its mirrored 09-L04 FINAL vitest invocation (the block that ends with
  `tests/vitest/admin/admin-cache-authority.test.ts`) gains the two
  paginated-client paths in envelope order;
- its envelope summary "command `final-admin-cache-tests` (thirteen paths)"
  becomes fifteen paths;
- its FINAL prose "followed by the thirteen `final-admin-cache-tests` paths in
  the envelope's …" becomes fifteen paths ending with the two
  paginated-client suites.

Anchors verified by untruncated grep at HEAD `c237e05d`: TASK-551-10-L01
:995-1010, :1498 and :1522-1524.

### (5) Family inventory

No task file is added, renamed or removed; no occurrence is added. The family
preflight stays `{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}`.

## Dated Contract Corrections — 2026-09-27 (consumer mirror note 2: chain correction, cross-owner exception, scope filter reconciliation, STOP rule, storage API constraint)

Source: orchestrator decision Addendum J, item J6 (a)-(f), with J1 for the
chain
(`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`)
and TASK-551-03-L02 Round 11 item R11-06
(`.../audit-evidence/03-l02-round11-dispositions.md`), after the Round-10 /
fix3 audits `wf_b7515c81-866`. This section is append-only. It wins over the
body, the 2026-09-24 sections and the 2026-09-26 consumer-mirror section
wherever they differ, for the FINAL occurrence only; INITIAL is unchanged.
Everything not quoted under "Superseded sentences" below stays binding.

Anchor rule: line references to this file use HEAD `a3d46bf1` numbering
unless a reference is explicitly labelled `c237e05d`. This round makes no
in-place edit: the envelope fence, the Testing Requirements command block and
every earlier line are byte-identical to HEAD `a3d46bf1`, so no line shifts.
Parent references (`TASK-551_Scalable_Database_Query_And_Cache_Optimization.md`)
use HEAD `a3d46bf1` numbering as well.

### (a) Ordering chain corrected (J1)

The 2026-09-26 section item (2) wrote the parent graph as a linear chain that
passes through `TASK-551-03-L02:final`. That edge does not exist. In the
parent `### Canonical Workflow Dispatch Graph (v1)`,
`TASK-551-03-L02:final` (parent :997) depends on `TASK-551-08-L03:final`, and
`TASK-551-03-L03:single` (parent :998) also depends on
`TASK-551-08-L03:final`; no occurrence depends on `TASK-551-03-L02:final`
(untruncated `grep -c '"dependsOn": \["TASK-551-03-L02:final"\]'` on the
parent file: 0). `TASK-551-03-L02:final` is therefore a dead-end sibling.

The ancestor path that enforces this leaf's FINAL ordering after
`TASK-551-03-L02:initial` is, verbatim per Addendum J1:

`03-L02:initial (:992) → 07-L02 → 08-L01 → 08-L02 → 08-L03:final (:996) → 03-L03 (:998) → 04-L01 → 04-L02 → 09-L01 → 09-L02 → 09-L03 → 09-L04:final (:1004)`

`TASK-551-03-L02:final` precedes `TASK-551-09-L04:final` only through node
order (parent :964, "node order is the total **product** land order"), not
through a `dependsOn` edge. No FINAL requirement of this leaf depends on
`TASK-551-03-L02:final` having landed: both paginated-client suites exist
from `TASK-551-03-L02:initial`. The Addendum I2 decision stays binding: NO
explicit edge is added, the envelope `dependencies` and the `final`
occurrence `dependsOn` stay byte-identical, and the parent graph is not
edited. Addendum I2's "linear chain" wording is an orchestrator record,
corrected by J1 there, not in this file.

### (b) Cross-owner FINAL gate exception (Exclusive Ownership)

Replacement for the body sentence quoted under "Superseded sentences" (b):

"This leaf is the sole TASK-551 writer of `cacheRefresh.test.ts`; it preserves
the existing refresh behavior while adopting the scoped cacheBus/read-through
contract. The two 03-L02 paginated-client suites are the only read-only
cross-owner FINAL gate inputs; 03-L02 is their single writer."

The two suites are `tests/vitest/admin/task551PaginatedClients.test.ts` and
`tests/vitest/admin/task551PaginatedClientsSlots.test.ts` (the last two paths
of the `final-admin-cache-tests` argv, :729). This leaf runs them whole and
never creates, edits, skips, filters or re-baselines them; they stay outside
this leaf's closed allowlist and its `line-count` command. No other read-only
cross-owner test input exists at INITIAL or FINAL.

### (c) Scope/epoch filtering reconciled with consumer constraint (1)

The body's cacheBus filter (:287-290) and the 2026-09-26 item (1)
"Synchronous local delivery" constraint (:1337-1342) are reconciled as
follows; both quoted sentences are restated as amended under "Superseded
sentences" (c):

- **Same-tab local delivery under the CURRENT scope is never dropped.** A
  `broadcastCacheEvent` call made under the tab's current scope/epoch pair
  still delivers synchronously, inside the call, to every local handler, with
  `origin` `"local"` and `options.operationToken` passed through unchanged.
  The current scope is the scope digest and auth epoch the tab holds at
  delivery time, including the no-persistent-scope state; "unknown scope" is
  never a reason to drop a local event.
- **The scope/epoch filter applies only to** (i) remote events (the
  BroadcastChannel and the `storage`-event fallback), where a mismatched
  deployment/scope, a prior epoch or an unknown scope is ignored, and (ii)
  stale-scope local events: a local emission stamped with, or bound through its
  captured installation token/epoch to, a scope/epoch pair that is no longer
  current when delivery happens (for example an async mutation completion that
  started before an identity transition). A stale-scope local event is dropped
  for every local handler; it is never delivered to some handlers only.
- The own-sourceId drop for remote deliveries (2026-09-26 item (1)) and the
  statement that handler ORDER is not a constraint are unchanged.

### (d) STOP-and-report rule for the 03-L02 suites

If either `tests/vitest/admin/task551PaginatedClients.test.ts` or
`tests/vitest/admin/task551PaginatedClientsSlots.test.ts` goes red (or
reports a skipped or filtered-out test) under a change this leaf's body
mandates — the scoped cacheBus event shape (:287-290), the v3 storage key
(:260-261) or the v3 envelope (:262-265) — FINAL STOPS and reports:

1. FINAL does not land. Its receipt records the STOP with the failing suite
   path, the failing test names, the mandated change that caused the red
   (event shape, v3 key or envelope) and the body anchor that mandates it.
2. The fix is a pre-disposed consumer re-run owed to TASK-551-03-L02: the
   03-L02 writer adapts its own suite within the 03-L02 contract (R11-06
   seeding rule; item (e) below) and re-runs it; this leaf's FINAL resumes
   only after that 03-L02 receipt is recorded.
3. This leaf never edits, skips, filters, weakens or silently re-baselines a
   03-L02 suite, and never reverts or dilutes the body-mandated change to make
   a 03-L02 suite pass.

A red that is not traceable to a body-mandated change is not covered by this
rule: it is an ordinary FINAL gate failure fixed in this leaf's own allowlisted
source under the normal fix-the-source rule. A FINAL change to any constraint
of the 2026-09-26 item (1) as amended by item (e) still re-opens
TASK-551-03-L02 R7-02, R7-06 and R8-04; this STOP rule is the procedure that
re-open follows.

### (e) Consumer constraint (5): stable storageCache API by logical key

The 2026-09-26 item (1) list gains a fifth binding constraint:

- **(5) Stable storageCache API by LOGICAL key.** The API contract of
  `core/admin/utils/storageCache.ts` — read/write/clear by LOGICAL key, where
  the logical key comes from `cacheKeys`
  (`core/admin/services/cachePolicy.ts:28`) — stays stable across the FINAL
  v3 physical-key change. Exports verified at HEAD `a3d46bf1`: types
  `StorageLike` (:1), `CacheValidator` (:2) and `MemoryBackedStorageCache`
  (:16, members `read`, `readStorageFirst`, `peekFresh`, `write`, `clear`);
  `getLocalStorage` (:29), `getSessionStorage` (:34); `readStorageCache`
  (:39), `writeStorageCache` (:80), `clearStorageCache` (:91);
  `readLocalCache` (:97), `writeLocalCache` (:103), `clearLocalCache` (:106);
  `readSessionCache` (:109), `writeSessionCache` (:115), `clearSessionCache`
  (:118); `createMemoryBackedStorageCache` (:121) and
  `createMemoryBackedLocalCache` (:165). FINAL keeps every name, and the
  meaning of the `key` argument as the logical `cacheKeys` key, and applies
  the `coderso:admin-cache:v3:<deploymentDigest>:<scopeDigest>:e<authEpoch>:<boundedResourceKey>`
  mapping (:260-261) and the v3 envelope (:262-265) inside the module, never
  in a caller. FINAL may add exports (for example the three limit constants,
  :266-269); it must not rename, remove or re-type an existing export or turn
  its `key` argument into a physical key. Whether a persistent slot is
  visible under a given scope (for example a safe miss when the persistent
  scope is null, :240, :247-248) stays governed by the body; a 03-L02 red
  caused by that rule is a (d) STOP case, not a (5) violation.

03-L02 suites seed and observe persisted slots only through that API by
logical key (TASK-551-03-L02 R11-06), never through a raw physical
`localStorage` key, so the v3 physical-key/envelope change stays transparent
to them. R11-06 names `writeStorageCacheEnvelope`; no such export exists at
HEAD `a3d46bf1` (untruncated `grep -rln writeStorageCacheEnvelope core tests
_docs/_TASKS`: 0 files); for this leaf the binding API is the export list
above, and this leaf adds no export of that name.

### (f) I4 round-2 quote anchor

The 2026-09-26 section item (3) cited the I4 round-2 quote one line short. The
quoted text starts with "The FINAL" and ends with "`final-admin-cache-tests`
argv", which is HEAD `c237e05d` :1168-1172 (HEAD `a3d46bf1` :1170-1174). The
quoted text, its replacement and the 2026-09-26 anchor rule are otherwise
unchanged.

### Superseded sentences (quoted verbatim)

Each quoted sentence below is superseded or amended as stated; its
replacement is the item named. Line numbers are HEAD `a3d46bf1` numbering.

- (a) 2026-09-26 section item (2), "Ordering" bullet (:1404-1408), superseded
  (the bullet's first sentence, "Ordering: this leaf's FINAL runs after
  `TASK-551-03-L02:initial`.", and the rest of the bullet from "Per Addendum
  I2" onward stay binding):
  "The
  ordering is transitively enforced by the parent graph chain (parent :992 →
  :1004): `TASK-551-03-L02:initial` (:992) → 07-L02 → 08-L01 → 08-L02 →
  08-L03:final → 03-L02:final → 03-L03 → 04-L01 → 04-L02 → 09-L01 → 09-L02 →
  09-L03 → `TASK-551-09-L04:final` (:1004)."
  - Replacement: item (a) of this section (the J1 ancestor path;
    `TASK-551-03-L02:final` is a dead-end sibling ordered by node order only).
- (b) Exclusive Ownership (:103-105), superseded:
  "This leaf is the sole TASK-551 writer of `cacheRefresh.test.ts`; it preserves the
  existing refresh behavior while adopting the scoped cacheBus/read-through
  contract. No read-only cross-owner test exception remains."
  - Replacement: item (b) of this section (the first sentence is restated
    unchanged; "No read-only cross-owner test exception remains." becomes
    "The two 03-L02 paginated-client suites are the only read-only cross-owner
    FINAL gate inputs; 03-L02 is their single writer.").
- (c1) Admin Browser Contract (:287-290), amended:
  "CacheBus events carry schema, deployment digest, auth-generation nonce, scope
  digest and auth epoch;
  any mismatched deployment/scope, prior epoch or unknown scope is ignored. The
  raw incarnation never enters the event; its binding is proven by scope digest."
  - As amended: "CacheBus events carry schema, deployment digest,
    auth-generation nonce, scope digest and auth epoch; a remote event
    (BroadcastChannel or `storage` fallback) with a mismatched
    deployment/scope, a prior epoch or an unknown scope is ignored, and a
    stale-scope local event is dropped for every local handler; same-tab local
    delivery under the current scope is never dropped. The raw incarnation
    never enters the event; its binding is proven by scope digest." (item (c)).
- (c2) 2026-09-26 section item (1), "Synchronous local delivery" bullet
  (:1337-1340), amended:
  "`broadcastCacheEvent`
  (`core/admin/utils/cacheBus.ts:131-154`) delivers to every local handler
  synchronously inside the call, with `origin` `"local"` and the caller's
  `options.operationToken` passed through unchanged (`:151-153`)."
  - As amended: the same sentence, qualified "for every event emitted under
    the tab's current scope/epoch pair; a stale-scope local event is dropped
    for every local handler" (item (c)). The bullet's second sentence
    (`localHandlers.add(handler)`, `:157`) is unchanged.
- (e) 2026-09-26 section item (1), re-open sentence (:1359-1361), amended:
  "A 09-L04 FINAL change to any of the four items above re-opens TASK-551-03-L02
  R7-02, R7-06 and R8-04 (cite: 03-L02 `### C17 v6` and R10-13); it is not a
  local 09-L04 edit."
  - As amended: "any of the four items above" reads "any of the five items
    (the four above plus constraint (5), item (e) of the 2026-09-27 section)";
    the re-open follows the item (d) STOP-and-report procedure.
- (f) 2026-09-26 section item (3) (:1420), superseded:
  "I4 round-2 (HEAD :1168-1171), superseded:"
  - Replacement: "I4 round-2 (HEAD `c237e05d` :1168-1172; HEAD `a3d46bf1`
    :1170-1174), superseded:" (item (f)).

Superseded or amended quote count: 6.

### Family inventory

No task file is added, renamed or removed; no occurrence is added; the
envelope fence is untouched this round. The family preflight stays
`{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}`.

## Dated Contract Corrections — 2026-09-27 (consumer mirror note 3: third cross-owner input, widened STOP triggers, (c) test shape)

Source: orchestrator decision Addendum L, items L1, L2 and L6
(`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`),
and TASK-551-03-L02 Round 12 item R12-02 (with R12-01 and R12-13)
(`.../audit-evidence/03-l02-round12-dispositions.md`), after the Round-11 /
fix4 audits `wf_75d02a03-d77` (09-L04: two auditors, 0/2/1 and 0/2/2). This
section is append-only. It wins over the body, the 2026-09-24 sections, the
2026-09-26 section and note 2 (the first 2026-09-27 section) wherever they
differ, for the FINAL occurrence only; INITIAL is unchanged. Everything not
quoted under "Superseded sentences" below stays binding.

Anchor rule: line references to this file use HEAD `b98ed8d9` numbering;
references to other files (TASK-551-09-L01, TASK-551-03-L02,
`core/admin/utils/cacheBus.ts`) use HEAD `b98ed8d9` numbering as well.
`git diff -U0 a3d46bf1 b98ed8d9 -- <this file>` is exactly one hunk
(`@@ -1474,0 +1475,221 @@`, note 2 appended), so lines 1-1474 are identical
at HEAD `a3d46bf1` and HEAD `b98ed8d9`, and every `a3d46bf1` anchor in note 2
still holds. This round makes no in-place edit: the envelope fence, the
Testing Requirements command block and every earlier line are byte-identical
to HEAD `b98ed8d9`, so no line shifts.

### (a) Third read-only cross-owner FINAL input (L1)

`tests/integration/runtime/public-site-cache-query-budget.test.ts` is a
read-only cross-owner FINAL gate input of this leaf, the third next to the two
03-L02 paginated-client suites:

- **Owner.** TASK-551-09-L01 creates it and is its single writer (09-L01 :50
  "new `tests/integration/runtime/public-site-cache-query-budget.test.ts`";
  09-L01 fence allowlist :810). Its line gate is 09-L01's own `line-count`
  command (09-L01 :919 names the path).
- **Where it runs here.** Whole, in both FINAL Bun lanes:
  `memory-security-settings-tests` (envelope :737; `argv` :740;
  `positiveDiscovery.paths` :743) and `redis-security-settings-tests`
  (envelope :748; `argv` :751; `positiveDiscovery.paths` :754); prose
  Testing Requirements block :573-580. The envelope stays authoritative.
- **Boundary.** It is outside this leaf's Exclusive Ownership list (:39-87),
  the envelope allowlist (:625-683) and the `line-count` argv (:790). This leaf
  never creates, edits, skips, filters or re-baselines it, and never adds it
  to its allowlist or `line-count` command.
- **Owed 09-L01 mirror.** The settings-read assertions the body asks for at
  :531-534 ("Re-run the complete public-site query-budget suite after removing
  the settings cache: assert one authoritative settings read plus zero
  additional reads for a safe warm hit and settings plus one content gate plus
  zero additional reads for mutable detail/list") are an owed TASK-551-09-L01
  mirror. They are written by the 09-L01 writer under an orchestrator
  follow-up (Addendum L1), never by this leaf. This leaf's FINAL receipt
  records, for that file, the test names it ran and whether the :531-534
  assertions were present in it; this leaf does not add them, and does not
  gate on them by its own authority.
- **Red handling.** A red (or a skipped or filtered-out test) in this file
  under a change this leaf's body mandates follows the (d) STOP-and-report
  procedure of note 2, as widened by item (b) below, with TASK-551-09-L01 in
  place of TASK-551-03-L02 as the re-run owner: FINAL does not land; the
  09-L01 writer adapts its own suite within the 09-L01 contract and re-runs
  it; this leaf's FINAL resumes only after that 09-L01 receipt is recorded.
  The body-mandated changes that can reach this file are the Uncached Secret
  Security-Settings Contract rules (:300-348; trigger Q1 in item (b)). A red
  that is not traceable to a body-mandated change stays an ordinary FINAL gate
  failure, fixed in this leaf's own allowlisted source (the note 2 (d)
  carve-out applies unchanged).

Replacement for the note 2 (b) sentences quoted under "Superseded sentences"
(a1)-(a3):

"The two 03-L02 paginated-client suites
(`tests/vitest/admin/task551PaginatedClients.test.ts`,
`tests/vitest/admin/task551PaginatedClientsSlots.test.ts`; 03-L02 is their
single writer) and the 09-L01-owned
`tests/integration/runtime/public-site-cache-query-budget.test.ts` (09-L01 is
its single writer) are the three read-only cross-owner FINAL gate inputs. No
read-only cross-owner test input exists at INITIAL."

### (b) (d) STOP triggers widened; receipt field (L2)

The note 2 (d) trigger sentence and its receipt field are widened to the same
closed set. For the two 03-L02 suites, a trigger is EVERY Admin Browser
Contract storage/scope rule this leaf's body mandates:

- **S1 (:156-159; with :166-170 and test list :500-501).** A missing,
  cross-origin, malformed, empty or oversized deployment input returns
  `null`, publishes `scope=null` and makes persistent reads/writes safe
  misses; an unhashed Vite development entry is persistent-cache-ineligible
  (`scope=null`).
- **S2 (:174-176).** `scope=null` is published first; an async digest
  installs only while deployment, incarnation and auth epoch are current;
  cache reads/writes before scope readiness are safe misses/no-ops.
- **S3 (:232-241, including :238-240).** The session-only 128-bit
  incarnation; a sessionStorage failure yields a memory-only incarnation, so
  persistent reads stay safe misses.
- **S4 (:242-259, including :247-248).** The deployment-scoped cross-tab
  auth-generation record; a storage failure makes the persistent scope null;
  unavailable/throwing storage and concurrent rotation fail to
  persistent-cache misses.
- **S5 (:260-261).** The v3 storage key
  `coderso:admin-cache:v3:<deploymentDigest>:<scopeDigest>:e<authEpoch>:<boundedResourceKey>`.
- **S6 (:262-265).** The v3 envelope (schema, deployment digest, scope
  digest, auth epoch, saved time, value; reject unknown/mismatch; no raw
  incarnation).
- **S7 (:266-270).** The exported limits; UTF-8 resource keys outside
  `1..512` fail closed as a miss/no-op.
- **S8 (:270-272).** The per-scope owned-key index inside both count and
  serialized-byte caps, oldest-key eviction before an add, no storage scan
  (its index write accompanies a resource write).
- **S9 (:273-281).** Transition order (rotate generation, increment epoch,
  advance installation generation, abort, clear in-memory values),
  incarnation rotation/deletion and the bounded one-time v1/v2 key removal.
- **S10 (:282-286).** Independent wrapping of storage, JSON,
  BroadcastChannel, fallback and every subscriber.
- **S11 (:287-291, as amended by note 2 (c)).** The scoped cacheBus event
  shape and its remote/stale-scope filter.
- **S12 (:292-298).** The `readThroughCache` epoch/installation-token/per-key
  generation rule.

For the 09-L01-owned query-budget suite (item (a)), the trigger is:

- **Q1 (:300-348).** Any rule of the Uncached Secret Security-Settings
  Contract (no decrypted-settings value cache; one authoritative settings read
  per call; the explicit transaction, lock and outbox rules; the route
  mapping).

(d) item 1 as widened: "FINAL does not land. Its receipt records the STOP
with the failing suite path, the failing test names, the mandated rule that
caused the red (its trigger id S1-S12 or Q1 and the rule's name) and the
body anchor that mandates it." (d) items 2 and 3 are unchanged for the two
03-L02 suites; for the query-budget suite they read with TASK-551-09-L01 as
the owner (item (a)).

The note 2 (e) sentence "a 03-L02 red caused by that rule is a (d) STOP case,
not a (5) violation" (:1611-1613) is now covered by S1-S4 and stays binding.

The 03-L02 suites are seeded through the same API: they seed and observe
persisted slots only through the storageCache API by logical key (TASK-551-03-L02
R11-06; note 2 (e) constraint (5)), and any red caused by a body rule is a (d)
STOP. The body rules above can change what a logical write does physically
(for example S8 adds an owned-key index write next to the resource-key write,
and S1/S2/S4 make writes safe no-ops while the persistent scope is null).
This leaf never narrows a body rule to fit a consumer test; the matching
03-L02 adaptation of its T16 positive control (record every key the sentinel
write touched; at least one `setItem`; order setup → sentinel → baseline →
mutation) is owned by 03-L02 (Addendum L2; 03-L02 R12-01).

### (c) Regression-test shape for the note 2 (c) rules (L6)

The two note 2 (c) behavior rules get a regression-test shape and one owning
suite: `tests/vitest/admin/cacheBusHardening.test.ts`. It is in this leaf's
Exclusive Ownership list (:66), the envelope allowlist (:666), the
`final-admin-cache-tests` `argv` and `positiveDiscovery.paths` (second path,
:729 and :732) and the `line-count` argv (:790); it is 398 lines at HEAD
`b98ed8d9` and stays at or under 1,000. Both legs drive the real
`broadcastCacheEvent`/`subscribeCacheEvents` path of
`core/admin/utils/cacheBus.ts` (at HEAD `b98ed8d9`: `broadcastCacheEvent`
:131-154, local loop :151-153, `localHandlers.add(handler)` :157), never a
test-only delivery bypass.

- **Positive leg (current scope, no persistent scope).** Under a null
  persistent scope (for example before digest readiness, S2) or an unhashed
  development entry (S1), subscribe N >= 2 local handlers and call
  `broadcastCacheEvent` once with a caller `operationToken`. Assert that every
  one of the N handlers ran synchronously inside the call (all N invocations
  are recorded before the call returns), each with `origin` `"local"` and the
  identical `operationToken`. "Unknown scope" never drops a local event.
- **Negative leg (stale-scope local event).** Subscribe N >= 2 local
  handlers, start an emission bound to the current scope/epoch (the
  stamp or captured installation token/epoch that FINAL implements for note 2
  (c)), perform an identity transition (for example a nonce-only rotation or
  an installation-authority advance), then complete the emission. Assert that
  zero of the N handlers ran (no partial delivery). In the same test, a fresh
  emission under the new current scope reaches all N handlers, so the leg
  cannot pass by dropping everything.

FINAL command that runs the suite: `final-admin-cache-tests` (envelope :726;
`argv` :729), that is
`env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run <15 paths>`
with the fifteen paths in envelope order (prose :557-571; the second path is
`tests/vitest/admin/cacheBusHardening.test.ts`), run whole: no `-t`/name
filter, and a skipped or filtered-out test is a failed FINAL gate.

### (d) Line-gate sentence reworded (L6; 03-L02 R12-13)

The 2026-09-26 item (2) parenthetical "(03-L02's own line gate covers them)"
is true only for `task551PaginatedClients.test.ts`, which 03-L02 fence
`line-count-1` names (03-L02 :2096). The 03-L02 fence names
`task551PaginatedClientsSlots.test.ts` in no `line-count` command (untruncated
count over 03-L02 `line-count-1`..`-3`, :2096-2116: 0). Replacement sentence
(see "Superseded sentences" (d1)):

"This leaf never writes them; they stay out of this leaf's allowlist and its
`line-count` command. `task551PaginatedClients.test.ts` is covered by the
03-L02 fence `line-count-1`; `task551PaginatedClientsSlots.test.ts` is bound
by the R10-09 STOP rule and the repository line gate until 03-L02 item (g)
lands (a 03-L02 `line-count` command names it)."

### (e) Cross-check with TASK-551-03-L02 R12-02

03-L02 Round 12 item R12-02 restates the C17 v6 09-L04 row with the same
content as this note and note 2: constraint (1) qualified by note 2 (c)
(same-tab local delivery under the current scope, including the
no-persistent-scope state, is never dropped; a stale-scope local event is
dropped for every handler); five re-open items (note 2 (e)); the three
cross-owner FINAL inputs of item (a); the (d) STOP triggers = every
body-mandated storage/scope rule (item (b)); the non-traceable-red carve-out;
the (c) test shape in `cacheBusHardening.test.ts` (item (c)). If the two
records ever differ, this file governs this leaf's FINAL and the difference
is reported to the orchestrator.

### Superseded sentences (quoted verbatim)

Line numbers are HEAD `b98ed8d9` numbering.

- (a1) Note 2 item (b), replacement sentence (:1527-1528; the replacement
  quote spans :1525-1528), superseded:
  "The two 03-L02 paginated-client suites are the only read-only
  cross-owner FINAL gate inputs; 03-L02 is their single writer."
  - Replacement: the item (a) replacement sentence (three read-only
    cross-owner FINAL inputs).
- (a2) Note 2 item (b) (:1534-1535), superseded:
  "No other read-only
  cross-owner test input exists at INITIAL or FINAL."
  - Replacement: "No read-only cross-owner test input exists at INITIAL;
    at FINAL there are exactly the three named in item (a) of the 2026-09-27
    note 3."
- (a3) Note 2 "Superseded sentences" (b) replacement record (:1653-1654),
  superseded:
  "The two 03-L02 paginated-client suites are the only read-only cross-owner
  FINAL gate inputs; 03-L02 is their single writer."
  - Replacement: the item (a) replacement sentence.
- (b1) Note 2 item (d), trigger fragment (:1566-1568), superseded:
  "under a change this leaf's body
  mandates — the scoped cacheBus event shape (:287-290), the v3 storage key
  (:260-261) or the v3 envelope (:262-265) —"
  - Replacement: "under a change this leaf's body mandates — any rule S1-S12
    of item (b) of the 2026-09-27 note 3 (:156-159 with :166-170, :174-176,
    :232-298) —"; for the query-budget suite, rule Q1 (:300-348).
- (b2) Note 2 item (d) item 1, receipt field (:1572), superseded:
  "(event shape, v3 key or envelope)"
  - Replacement: "(its trigger id S1-S12 or Q1 and the rule's name)"
    (item (b)).
- (b3) Note 2 item (e) (:1615-1618), superseded:
  "03-L02 suites seed and observe persisted slots only through that API by
  logical key (TASK-551-03-L02 R11-06), never through a raw physical
  `localStorage` key, so the v3 physical-key/envelope change stays transparent
  to them."
  - Replacement: "03-L02 suites seed and observe persisted slots only through
    that API by logical key (TASK-551-03-L02 R11-06), never through a raw
    physical `localStorage` key: they are seeded through the same API; any
    red caused by a body rule is a (d) STOP." (item (b)). The rest of the
    :1618-1621 paragraph (the `writeStorageCacheEnvelope` statement) stays
    binding.
- (d1) 2026-09-26 section item (2) (:1401-1403), superseded:
  "This
  leaf never writes them; they stay out of this leaf's allowlist and its
  `line-count` command (03-L02's own line gate covers them)."
  - Replacement: the item (d) replacement sentence.

Superseded quote count: 7.

### Family inventory

No task file is added, renamed or removed; no occurrence is added; the
envelope fence is untouched this round. The family preflight stays
`{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}`.
