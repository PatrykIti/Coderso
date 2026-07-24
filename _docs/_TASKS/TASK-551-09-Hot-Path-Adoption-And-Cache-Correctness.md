# TASK-551-09: Hot-Path Adoption and Cache Correctness
# FileName: TASK-551-09-Hot-Path-Adoption-And-Cache-Correctness.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Runtime / Cache / Performance / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-551-08 complete; TASK-551-03 query and TASK-551-06
revision handoffs terminal; parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Adopt the local/Redis cache in the real public hot path, make safely eligible
warm HTML hits execute no domain/render/cache PostgreSQL reads beyond the one
mandatory authoritative security-settings read, gate detail and list output
that can contain mutable public content with one additional bounded
authoritative query, complete post-commit invalidation for all rendered
dependencies, isolate Admin browser cache by deployment/auth incarnation/
identity/permissions, and keep decrypted security settings uncached and
DB-authoritative.

Public cache adoption inherits TASK-551-08's explicit bounded-eventual CAP
contract, not linearizability: healthy worker poll <=250 ms, p99 invalidation
target <=1 second, and locally visible oldest-pending age `>5_000 ms`
degrades/alerts and transitions runtime to forced value-cache bypass, skipping
Redis GET/fill until proven recovery. Policy TTL is the hard stale ceiling only
under remote ambiguity not locally known degraded.
Admin preview/read-after-write bypasses until its event is observed. Security,
auth, private/password and nonce-bearing data never use this eventual model.

## Locked Adoption Contract

- Before cache-specific normalization or any cache/bootstrap read, a minimal
  method-plus-URL classifier preserves the existing booking, Forms and analytics
  dispatch order across each whole API surface, not only writes: it includes
  booking slots GET, every booking path/method, exact Forms submission/upload
  surfaces at every method, and the analytics beacon path at every method. Each
  match performs its one authoritative `getSecuritySettings` read and delegates
  unchanged session/API-key/access/CSRF/DNT/rate/nonce/HMAC/CAPTCHA/token and
  method-not-allowed/not-found semantics to its existing handler. Only an
  unmatched surviving GET/HEAD request normalizes a cache request.
  Every public request still performs exactly one narrow authoritative
  `getSecuritySettings` DB read before its security/rate middleware. Neither the
  resulting `SecuritySettings` nor its rate-limit/header policy may enter
  `PublicCacheRuntimeSnapshot`, `ServerCache`, Redis, a manifest, or another
  process cache. All query budgets below are **total whole-request budgets after
  middleware**: a safe warm hit is exactly one DB query; a mutable-content detail
  or list warm hit is exactly two total DB queries (security plus its one gate),
  with zero additional domain/render/cache DB reads.
- After request middleware, `publicSite` may first load only the fixed-positive,
  strictly non-secret `PublicCacheRuntimeSnapshot` routing/bootstrap value. That
  snapshot contains or authorizes no content value. The strict classifier then
  returns `safe_non_mutable`, `mutable_content_detail`,
  `mutable_content_list`, or `authoritative_bypass`. Mutable content covers page
  and homepage, post, and `content_entry` output. Before any manifest/HTML/content
  value lookup, a detail classification performs exactly one narrow indexed
  publication/visibility/version gate; a mutable-content list performs exactly
  one bounded family-specific indexed membership/version gate for at most the
  validated page limit plus one projections and no bodies or password hashes.
  Page projection is exactly id/status/publishedAt/derived hasPublishedData/
  updatedAt; post is id/status/publishedAt/updatedAt; content entry is id/status/
  publishedAt/visibility/derived hasPassword/updatedAt. Only the current
  published representation, and for entries public plus password-free, can
  continue. The ordered gate digest joins canonical key input. A proven warm hit
  then performs zero additional domain/render/cache DB queries. Unknown,
  ambiguous, unpublished, missing-data, private/password or changed membership
  bypasses value cache for authoritative routing/DB. A stale bootstrap may cause
  a miss/bypass, never authorization of a restricted body.
- Every rendered dynamic dependency is classified into exactly one of: a finite
  generation tag, a mandatory authoritative content gate, or an exact cache
  exclusion. V1 excludes HTML containing commerce product data or blocks,
  form/submission nonces, booking submission nonces, booking `slotsToken`,
  analytics beacon nonces, any other request-scoped/one-time token, or an unknown
  dynamic dependency. Excluded output performs no dependency-manifest or HTML
  envelope fill. TASK-551 does not take ownership of `commerceService`; adding a
  commerce block changes the owning page/post/entry version gate before the
  excluded render can be considered.
- Public manifest/HTML reads and publication go only through L01's typed
  `ServerCache.getOrLoad(request)` wrapper. Rendering happens inside its loader;
  the cache captures a finite pre-loader fill fence and owns the eligibility-
  scope-bound local fill-attempt registry, encoding, generation checks and the primary plus optional manifest/HTML
  companion. Consumers never call `writeIfGenerationsMatch` or
  `putIfGenerationsAndLeaseOwned`. Memory uses only the internal generation-
  checked store write; a Redis distributed owner uses only the combined lease-
  plus-generation operation. For 1/10/50 concurrent same-scope misses whose
  positive fill is successfully written there is one render per process, and two-
  process Redis parity permits only the distributed winner to publish both coupled
  entries. The registry stores only the shared fill outcome, and every joiner
  resolves the published primary through its own `resolveCached`. Manifest/HTML loaders use only L01's strict
  positive-fill or finite-reason `no_fill` branches, never negative fill. A render
  audit that discovers commerce, nonce/token or unknown dynamic dependencies
  returns the owner's authoritative response as `no_fill`; it neither throws to
  signal exclusion nor encodes/publishes either entry. Such an outcome is never
  shared: every waiting caller renders authoritatively for itself, preserving its
  distinct nonce/token/response. Ineligible/missing-proof requests never enter the
  registry, and its key includes L01's full-context branded `shareScopeDigest`.
- The renderer records exact dependencies but maps them only to L01's finite
  site/family tags. Record ids/slugs/paths remain digested value-key input and
  never create generation keys. Uncertain linkage uses `site:all`.
- Preview/draft, private/password, authenticated variants, nonce/form-bearing
  HTML, unknown query variants and 5xx remain cache-exempt. Preserve every
  TASK-517 visibility/list/auth exclusion.
- Mutations cover old and new slug/path through the owning finite page/entry/
  post/list/shell/site generations, persist Redis outbox within the mutation
  transaction and apply only after commit. Rollback/no-op emits nothing. A
  mutation calls the lifecycle-owned invalidation handle's
  awaited `applyAfterCommit(plan)` exactly once before the mutation caller
  resumes; that handle reports to the sole coherence
  controller, which alone advances the local epoch or installs a family bypass
  fence on generation failure.
  The plan/outbox itself contains only opaque event key plus finite tags; old/new
  record/path identity never crosses that boundary. Nested import/restore work
  receives one outer-transaction event key and contributes tags through
  `collectInvalidationTagsTx`; only the outer transaction persists and applies
  the one deduplicated plan.
- Admin browser cache is independent from server cache and scoped by deployment,
  a cryptographic per-login auth incarnation, authenticated identity, permission
  fingerprint and auth epoch. The incarnation is stored only in sessionStorage
  (or ephemeral memory on failure) and is bound into the opaque scope digest; the
  deployment digest is carried by keys, envelopes and cacheBus events. Decrypted
  `SecuritySettings` is never cached in-process, browser storage or Redis;
  `getSecuritySettings` is DB-authoritative on every call. Redis may carry only
  finite generation metadata for an explicitly typed redacted projection, and
  v1 enables no such projection by default.
- Admin scope hashing uses one strict fixed-order UTF-8 canonical JSON v3
  preimage—not delimiter concatenation—with normalized deployment identity,
  exact 32-hex incarnation, safe integer epoch, normalized user ID, and separately
  sorted/deduplicated permission IDs and role IDs under explicit byte/count caps.
  Security-settings partial writers run under transaction advisory lock
  `(551,904)` after exact `SET LOCAL lock_timeout = '2s'`; the authoritative read,
  merge and encrypted upsert share that transaction. In Redis mode exactly one
  outbox event also shares it; memory mode writes zero outbox rows. Timeout/
  deadlock maps centrally to redacted `security_settings_conflict`, and the sole
  post-commit invalidation handle is awaited.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-551-09-L01 | Public read models, complete dependency classification, one-total-query safe warm hits and two-total-query mutable-content gates | ⏳ To Do |
| TASK-551-09-L02 | Pages, entries, posts and current SEO post-commit invalidation | ⏳ To Do |
| TASK-551-09-L03 | Menu/footer/theme/settings/redirect/form/list/detail dependencies, exact redirect policy and invalidation | ⏳ To Do |
| TASK-551-09-L04 | Deployment/incarnation/identity/epoch-scoped Admin cache and uncached DB-authoritative security settings | ⏳ To Do |

**Land order:** `TASK-551-09-L01 → L02 → L03 → L04`.

## Collision Guards and Handoffs

- The parent gate applies before any TASK-551 product implementation:
  TASK-511/TASK-493/TASK-517/TASK-518 are terminal by default, and only a fresh
  exact serialized audit proving every listed schema/journal/env/publicSite/
  entry/SEO/import/lifecycle source and test path disjoint may substitute.
- TASK-517 owns current `publicSite.tsx` visibility/cache-exclusion work. L01
  cannot dispatch until all relevant TASK-517 leaves are terminal or an exact
  serialized handoff is recorded; it re-reads final bytes and preserves their
  behavior/tests. L02 likewise waits for TASK-517's `entryService` writer.
- TASK-493 owns new sitemap/Search Console/indexing behavior, including its
  `publicSite.tsx` and SEO service work. L01/L02 cannot dispatch until those
  writers are terminal or explicitly serialized; then 09 becomes the sole final
  TASK-551 writer of `publicSite.tsx` and the whole current `seoService`, while
  preserving TASK-493 behavior. It never edits TASK-493 schema, routes, Admin UI
  or migrations.
- TASK-511 exclusively owns `core/services/backups/**`. L03 consumes its final
  import/restore transaction/post-commit effect seam and never edits backup code.
  That seam must carry the outer event key plus `collectInvalidationTagsTx` so
  nested import contributes tags without persisting/applying its own plan. If the
  terminal seam cannot carry that context, implementation pauses for a task-
  contract amendment rather than invalidating inside a transaction.
- No 09 leaf edits 07/08 owners, other TASK-551 domain/query owners, migration
  artifacts, package files, workflows, board/changelog or shared docs.
- L01 consumes the already composed lifecycle singleton only through
  `getServerCacheRuntime().cache`, handed off by 08-L03 after
  `registerComposedHttpRuntimeParticipants()` registration. No 09 leaf creates,
  starts, closes or substitutes a `ServerCache`, memory store or Redis client.
- L02/L03 consume 08's lifecycle-owned invalidation handle and call only
  `applyAfterCommit(plan)` after the authoritative commit. They never advance a
  coherence epoch, install a fence or instantiate a second controller directly.
- TASK-551-03 and TASK-551-06 hand off specifications/evidence only: 09-L02 is
  the sole writer for whole entry/post facade/mutation/revision adoption and
  `seoService`; 09-L03 is the sole writer for whole `importExportService` and
  `detailPageDocumentService`. Earlier leaves must not edit those paths.
- L02 likewise owns the complete existing entry/post/SEO test suites and their
  named cohesive splits. It also owns removal of the oversized
  `tests/integration/runtime/pages-runtime.test.ts`, one named fixture module and
  all four exact replacement suites listed in L02. L03 owns the complete existing
  import-export/detail-page suites plus
  `tests/integration/runtime/site-shell-runtime.test.ts` and
  `tests/integration/runtime/detail-page-preview-cache.test.ts`. L04 owns
  `tests/vitest/admin/cacheRefresh.test.ts`. Every direct existing suite in a 09
  validation command therefore has one exact 09 owner and appears literally in
  that leaf's line-count manifest; no read-only cross-owner exception remains.

## Security Contract

- **Visibility:** existing public reads and internal Admin APIs only; no new
  public write route.
- **Auth/RBAC:** existing checks remain authoritative and happen before
  protected data; authenticated/private/password output never enters shared
  HTML cache.
- **CSRF/rate limits:** all existing writes retain CSRF and route-family limits;
  cache failure cannot bypass middleware.
- **Validation:** strict cache policy/envelope plus bounded query variants,
  dependency tags, bounded point/list gate projections and Admin deployment/
  incarnation/scope envelopes.
- **Secrets/privacy:** no secret/decrypted security value, cookie, nonce, token,
  raw user identifier or private body in Redis/browser key/log/metric.
- **Anti-abuse:** existing form/booking/analytics nonce/HMAC/CAPTCHA remains
  authoritative across hit/miss/outage paths.

## Acceptance Criteria

- Warm safely eligible public HTML performs exactly one total DB query: the
  uncached authoritative security-settings read, with byte-identical output and
  zero domain/render/cache reads. A page/home, post, or content-entry detail and
  a family-specific mutable-content list perform exactly two total DB queries:
  security plus one narrow point or bounded membership/version gate for at most
  page-limit-plus-one projections. They perform zero additional warm-hit reads;
  unpublished/missing-data/private/password/unknown or changed membership never
  returns a primed item.
- Runtime bootstrap loading precedes dynamic route classification but cannot
  authorize/contain content. Unknown, ambiguous or stale classification performs
  no manifest/HTML/content value lookup and uses authoritative routing/DB.
- Commerce product data/blocks, form or booking submission nonces, booking slot
  tokens, analytics beacon nonces, any request-scoped/one-time token, and unknown
  dynamic dependencies are exact typed `no_fill`/no-manifest/no-envelope-fill
  exclusions. The owner keeps its response and every joiner executes its own
  render, with distinct token/nonce output never shared. HTML positive results declare `fillKind:"positive"`; HTML never
  emits negative fill. Tests prove every renderer dependency is tagged, gated, or excluded.
- Update/delete/old-new slug plus page/entry/post/SEO/menu/footer/theme/settings/
  redirects/forms/list/detail dependencies select the complete finite family
  invalidation plan after commit in memory and two-client Redis modes.
- L01-owned runtime/manifest/HTML policies and L03's redirect positive/negative
  policy use their one exact tables; runtime snapshot dependencies and mutation
  tags are identical.
- Rollback/no-op and failed mutations do not invalidate; Redis failure after a
  durable commit does not turn API success into failure. The awaited handle
  returns only after local observation and any required force fence are visible;
  no domain mutation detaches it.
- Healthy Redis invalidation meets <=250 ms polling and <=1 second p99 delivery;
  locally visible age `>5_000 ms` degrades/alerts and forces GET/fill bypass
  until recovery. Global
  ambiguity may retain safe public bytes only to policy TTL and is never called
  linearizable or instant cross-replica invalidation.
- Admin cache never hydrates across user or permission scope; storage/cacheBus
  failure is best effort. Deployment digest, a crypto-random per-login
  incarnation and each auth epoch form distinct namespaces; reload reuses only
  the current session incarnation. Deployment identity is derived fail closed
  from same-origin Admin base plus the current hashed production entry-module
  path; missing/cross-origin/oversized or unhashed development entry paths never
  enable persistent scope. Decrypted security settings are never cached and every
  read remains DB-authoritative. Canonical-scope collision vectors, concurrent
  disjoint partial security updates, advisory-lock timeout and rollback are
  covered. A successful Redis settings commit writes exactly one outbox row and
  awaits post-commit apply; a successful memory commit writes exactly zero outbox
  rows and awaits exactly one post-commit memory-generation bump. In both modes
  the observation or affected-family failure fence/epoch is visible before the
  caller resumes.
- Every touched oversized module is split coherently below 1,000 lines before
  behavior is added.

## Testing Requirements

- Run every child leaf's named Vitest/Bun memory/Redis lane in land order, then
  typecheck, lint, diff-check, and touched-file line counts.
- Count one-total-query safe warm routes separately from two-total-query mutable-
  content detail/list routes. In each total, exactly one query is the uncached
  security-settings read; the latter adds exactly one point or bounded membership
  gate and neither permits any additional domain/render/cache query.
- Inject missing/corrupt/stale bootstrap routing metadata and prove classification
  takes authoritative fallback before any manifest/HTML/content value read.
- Exercise the complete pre-cache booking/Forms/analytics surface, including
  booking slots GET and unsupported-method/path responses. Preserve each existing
  handler's security/rate/token semantics and prove a matched request invokes zero
  cache normalization/bootstrap/generation/manifest/HTML operations.
- For 1/10/50 same-key-and-share-scope misses whose conditional write succeeds,
  prove one render per process through the typed primary/companion `getOrLoad`
  seam; with two Redis processes prove only the
  distributed winner atomically publishes manifest plus HTML and no consumer
  calls a conditional-write primitive. For ineligible/missing-proof, `no_fill`,
  rejection, changed-generation, lease/transport/closed and malformed outcomes,
  prove each waiting caller renders for itself and no auth/request-token/nonce/
  caller-specific result crosses the fill-outcome registry.
- Pin canonical Admin scope vectors across ambiguous arrays, roles versus
  permissions, newlines and Unicode normalization. Prove advisory-locked
  concurrent disjoint security partial writes preserve both changes, timeout is
  redacted `security_settings_conflict`, and rollback emits no event. Pin Redis
  commit = exactly one outbox row plus awaited apply; memory commit = zero outbox
  rows plus exactly one awaited generation bump. Neither caller resumes before
  its local observation or failure fence/epoch is visible.
- Redis is mandatory for distributed invalidation/lease tests; unavailable
  infrastructure is a blocker, not a skipped passing gate.

## Documentation Updates Required

Full perf/fault/smoke/docs/closure and changelog 1263 remain with TASK-551-10.
