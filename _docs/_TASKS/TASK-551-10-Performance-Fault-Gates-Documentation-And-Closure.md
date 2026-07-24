# TASK-551-10: Performance, Fault Gates, Documentation, and Closure
# FileName: TASK-551-10-Performance-Fault-Gates-Documentation-And-Closure.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Performance / Reliability / Security / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** compile-green sequence terminal with targeted gates green:
TASK-551-01 → TASK-551-02 → TASK-551-05 → TASK-551-03-L01 →
TASK-551-06-L01/L02/L03 → TASK-551-03-L02 → TASK-551-03-L03 →
TASK-551-04 → TASK-551-07 → TASK-551-08 → TASK-551-09; then
TASK-551-01-L01 re-dispatched with a fresh exact-set `phase: "final"` receipt;
TASK-551-11 authoring-audit PASS and post-audit handoffs; parent external
dispatch gate reverified for TASK-511, TASK-493, TASK-517, and TASK-518
**Status:** ⏳ To Do
**Changelog:** 1263 pinned (closure only)

---

## Overview

Prove the complete database/query/cache program against frozen small- and
large-data budgets, real PostgreSQL, the memory backend, and a real Redis 7.2+
service used by two independent Coderso processes. Exercise fault, security,
reliability, migration, invalidation, and stampede behavior; publish the
operational documentation; consume and re-prove the TASK-551-03-L02 five-scenario
Admin-list visible-effect smoke in light and dark mode; then close every TASK-551
descendant in terminal order under changelog 1263.

This child is acceptance and closure only. It must not repair or reopen a
production contract owned by TASK-551-01..09. A failed budget, security
invariant, query plan, migration, cache parity check, or smoke scenario is routed
to the exact owning leaf; that owner fixes the source and reruns its targeted
gate before this child restarts the affected aggregate gate.

## Child Boundary

- **TASK-551-10-L01** exclusively owns aggregate load/fault/security/reliability
  harnesses, release-gate wiring, the CI Redis service contract, final Redis
  runtime-smoke evidence, and the final receipt/screenshots for the TASK-551-03-L02
  Playwright visible-effect smoke. It does not edit the 03-L02 product surfaces.
- **TASK-551-10-L02** exclusively owns final source-of-truth docs, deployment
  runbooks, `.env.example` after TASK-511's env writer is terminal, changelog
  1263, TASK-551 status-only transitions, and the TASK-551 board/statistics
  closeout.
- **TASK-551-11** owns workflow scripts and audit evidence. It may dispatch this
  child and verify hashes, but it cannot write L01 runtime evidence or L02 docs,
  task statuses, board, or changelog.
- No TASK-551-10 owner may edit `core/**` production modules, database schema or
  migrations, TASK-551-01..09 targeted tests, cache adapters, routes, services,
  Admin clients, or browser UI. Those paths remain forbidden even when an
  aggregate gate exposes a defect.

## Required Handoff Verification

Immediately before L01 runs and again before L02 closes:

1. Read every physical TASK-551 file, current HEAD, complete dirty status/diff,
   migration journal, and all TASK-551-01..09 gate receipts. Require the sole-owned
   query inventory's current receipt to be `phase: "final"`, produced by the
   post-09 TASK-551-01-L01 re-dispatch, exact-set equal to the current production
   callers, digest-current, and free of planned deltas. An initial, stale, missing,
   or later-leaf-written receipt blocks L01.
2. Re-read TASK-511. Terminal is the default. If it remains active, require the
   same fresh exact serialized parent-gate handoff that already proved all
   schema/journal/env/publicSite/entry/SEO/import/lifecycle source and test paths
   byte-disjoint; a narrower active-owner note cannot produce a green receipt.
   Verify the bounded export/restore contract without claiming external work.
   TASK-551-10-L02 may not edit `.env.example` until TASK-511-07's literal-file
   ownership is terminal and its final bytes have been re-read; an active handoff
   is insufficient for that shared documentation file.
3. Re-read TASK-517 and its current public runtime. Private/password content,
   authenticated bypasses, previews, and nonce-bearing HTML must remain excluded
   from shared server-cache values in both memory and Redis modes.
4. Re-read TASK-493. Inventory any newly landed Search Console/indexing query
   path and either prove its final bounded/indexed/cache disposition or preserve
   TASK-493 as the explicit active owner; never overwrite its product behavior.
5. Re-read TASK-518 plus `core/db/migrations/meta/_journal.json`. Prove all
   TASK-551 migration numbers were allocated from fresh state and that the
   stable-admin-role migration, if landed, has no ordering or snapshot collision.
6. Re-prove lifecycle staging: 02-L02 is sole writer of `prod.ts`, `dev.ts`, and
   `runtimeEntrypoint.ts`; it alone calls lifecycle start/close, owns signals,
   listen and the graceful-at-most-10-second then forced HTTP drain. Thin prod/dev
   adapters only select mode; Vite is a participant. Every close gets
   `RuntimeCloseContext{absoluteDeadline,signal}`. Total shutdown is at most 15
   seconds; non-DB closes are at most 5 seconds, while DB is the sole exception
   at `min(10 seconds, remaining absolute budget)` with no outer race/detached work. Startup signal/failure never listens and partial rollback is awaited;
   no participant or adapter calls `server.stop`. 03-L02's sole
   `routes/index.ts` writer registers the cursor participant idempotently at
   module evaluation; 08-L03's sole `httpServer.ts` writer invokes
   `registerComposedHttpRuntimeParticipants()` at module evaluation for cache,
   retention and existing backup while preserving that cursor registration.
   Reject any 08 keyring load/injection or `prod.ts`/`dev.ts` edit.
   Dedicated sessions expose signal-aware static execute/transaction/liveness/
   cancel-and-rollback only. Retention uses one session/backend PID for lock,
   every batch and unlock; close aborts/cancels SQL and confirms rollback or
   connection termination within 4,500 ms before cache/DB close. Lock loss maps
   only to `retention_lock_lost`, publishes no partial summary, permits no overlap
   or detached work, and remains below the shared 5-second participant ceiling.
7. Run TASK-551-03-L02's five exact Admin-list Playwright scenarios from a fresh
   server in task session `wf55103l02`. Require visible DOM/geometry/ARIA effects,
   both light and dark mode, one screenshot per scenario per mode, and zero console
   errors; then validate the strict UI-smoke receipt before aggregate acceptance.
8. Consume TASK-551-01-L02's exact one-family-at-a-time fixture receipt. Require
   UUIDv5 scoped IDs, fixed ordinal-millisecond timestamps, every declared target
   and support-table count, small/large pool capacities `2/10`, three repetitions
   of five warmups plus 30 samples, calibration `20/100`, and the frozen p95
   formula. The spread is `(max-min)/max(median,0.1)*100` (all-zero is zero), at
   most 20%; normalization is
   `observed*referenceCalibrationMedian/currentCalibrationMedian` within
   `0.80..1.20`; ceilings are
   `ceilToTenth(max(floor, medianRepetitionPercentile*1.25))`. Closure consumes
   stored finite ceilings and never re-runs `--freeze`.
   Require all frozen status/visibility/relation distributions, ten-row equal-
   sort groups, and the exact small/large per-family integer common/rare search
   counts with hidden/miss zero; percentage-derived search counts are invalid.
   Freeze summary/facet `asOf=2026-01-15T12:00:00.000Z`. Submission ordinals
   divisible by four are 1..6 days before, all others 8..37 days before: exact
   rolling-seven-day `500/25,000`, spam `200/10,000`. Booking timezones cycle
   UTC/New_York/Tokyo; modulo-100 buckets `0..9/10..19/20..59/60..99` are same-
   day past/same-day future/next 1..40/prior 1..40 days with +60-minute end,
   yielding today `400/20,000`, upcoming and past/current `1,000/50,000` each.
9. Consume TASK-551-02's exact receipts: default pool/server/reserve/worker/
   migration values `10/103/21/2/1`, replicas `1`, planned `13`, available `82`,
   strict `planned < available`; default Bun lifecycle suite
   `tests/integration/server/task551DatabaseLifecycle.test.ts`; deadlines
   `2_000/5_000/10_000/15_000 ms` and DB close `10 s`; late acquisitions release
   once; and closed telemetry with six families, five outcomes, 12 duration and
   nine returned-row buckets including overflow, 3,240 cells per fingerprint,
   44 pool cells, saturating counters, deterministic `snapshot()`/`reset()`, and
   no driver-wide row/wait claim. Require exact registry exports
   `QUERY_FAMILIES`, `QUERY_OUTCOMES`, `QUERY_DURATION_BUCKET_MAX_MS`,
   `ROWS_RETURNED_BUCKET_MAX`, `POOL_WAIT_BUCKET_MAX_MS`, `POOL_OUTCOMES`,
   `MAX_QUERY_FINGERPRINTS=512`, and
   `MAX_COUNTER_VALUE=Number.MAX_SAFE_INTEGER`. Require exported
   `assertMaintenanceSessionAffinity()`, strict `DB_MAINTENANCE_MODE=primary|direct|session`, pool max `2..4`, secret URL and budget inclusion. Primary startup never probes; disabled-scheduler `off+primary+pool1` is valid and `verifyDatabaseSessions` checks only that session. Explicit direct/session probes once at DB start and reuses its lifecycle-scoped result; an enabled scheduler awaits it before timer/listen and fails below two sessions or with transaction+primary.
10. Consume TASK-551-05's exact schema/migration evidence. All seven
    `SEARCH_VECTOR_SQL` and five trigram source literals must preserve byte-exact
    `coalesce(...) || ' ' || ...` expressions, with every closed function/
    operator dependency resolving to `pg_proc.provolatile = 'i'`. The deeply
    immutable `BOOKING_RESERVATION_EXCLUSION_SQL` is the sole custom seam:
    extension then exact add SQL occur once in the one migration, the Drizzle
    snapshot intentionally omits only that unsupported object, live
    `pg_constraint.contype = 'x'` matches, and clean/immediately-prior/rollback/
    forward plus generator-zero-drift/no-add-or-drop guards pass. Assistant ingest
    cutoff/success indexes use `started_at`. All closed catalog members are in the
    same-number online manifest. Pin `pages_author_list_updated_id_idx`, role-leading
    `user_roles_role_user_idx`, and `posts_tags_gin_idx`/`media_tags_gin_idx` as
    `jsonb_path_ops` GIN against their exact parameterized `@>` predicates.
    Pin read-performance member `cache_outbox_unprocessed_age_idx(created_at,id)
    WHERE processed_at IS NULL` and `readOldestUnprocessedAge` fingerprint
    `cache_outbox_oldest_unprocessed`: exact created-at/id `LIMIT 1`, including claimed/backed-off rows, with 1k/100k EXPLAIN and write-budget evidence.
    Preflight/classification and transactional expand retain the mutation drain
    through an ordered page/content/widget revision-unique `revision-integrity`
    group. `apply-resume-check --through-group revision-integrity` must durably
    prove all three ready/valid before old `max(version)+1` writers resume; only
    then does the online read-performance group run before final admission;
    transactional SQL creates no index and rollback uses top-level concurrent
    drops. Require fresh `resolve-receipt`, then `apply-resume-check` twice with
    the second run zero-DDL. One L01 writer
    owns schema exports/descriptor, SQL, snapshot, journal, and tests atomically;
    no closure text may pretend the installed DSL represents the exclusion. The
    exact custom SQL is `CREATE EXTENSION IF NOT EXISTS btree_gist`, then
    `ALTER TABLE bookings ADD CONSTRAINT bookings_active_resource_window_excl EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'))`;
    rollback is
    `ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_active_resource_window_excl`
    without dropping the extension.
11. Re-prove TASK-551-03-L02 only after 06-L03. Require the exact summary-only
    page `{id,pageId,version,kind,title,slug,createdAt,createdBy:{id,name,email}|null}`
    and detail `{id,detailPageId,version,kind,createdAt,createdBy:string|null}`
    envelopes from 06-L02, with no invented `reason`, then L02's sole route/
    schema/client/UI adoption, full seven-client consumer graph and fresh graph
    rescan, bounded server-side picker/search/load-more behavior, all named
    cohesive >1,000-line splits, two consumer-graph suites, five revision suites,
    and UI smoke. `formReadService` owns form-list SQL/only the exact seven-field
    `id,name,slug,status,description,submissionAccess,updatedAt` DTO; `bookingReadService`
    owns paginated reservations/resources/services/blackouts, service-resource/
    schedule arrays capped at 100 (read 101 fails closed), and 31-day/500-slot
    preview (501 fails), with no other booking list owner. Require
    existing Reservations/Resources/Services tabs consume narrow items, Services
    keeps derived `submissionAccess`, edits await point detail, and Availability/
    SlotPreview use bounded pickers. Submission payload is fetched by one
    authorized parent-bound point query only on explicit expansion, stays
    component-local/uncached, and aborts/clears on close/unmount/logout/auth
    changes. Success/error headers are exactly `Cache-Control: private, no-store,
    max-age=0`, `Pragma: no-cache`, `Expires: 0`; the client passes
    `cache:"no-store"`. Media summaries expose safe derived `name`
    (`originalName→title→sanitized key basename→asset`) while omitting raw key;
    `media/utils.ts` consumes name without reconstructing a key. Require
    every metric-bearing Admin keyset response's exact `{items,nextCursor,hasMore,summary,facets}`
    envelope: only `matchingTotal` follows normalized row filters; all other
    domain summary fields and author/content-type/role/folder/tag facets retain
    global authorized/parent scope across three-plus pages and filters. Facet
    pages use strict `{items,nextCursor,hasMore}`, default/max `50/100`, and never
    auto-fetch. The page query, one fixed aggregate row, and at most one bounded
    relation-facet batch execute at most three SQL statements with no hidden
    page concatenation, per-row lookup, or auth leakage. Require
    exact extraction stems `BookingOverviewPanel`, `MediaLibraryFolderState/Results`, `UsersRolesContent`, `DetailTemplateRevisionPanel`, `MenuDesignCanvas/Inspector/DataSources`, `MenuEditorWorkspace`, `PostEditorMediaControls`, `ContentListSource/PresentationEditors`, `CtaBannerContentEditors`, `EntryTeaserSource/PresentationEditors`, `FeatureGridItemEditors`, `FooterNavigation/BrandEditors`, `GalleryMosaicItemEditors`, `HeroContent/Media/LayoutEditors`, `LogoCloudItemEditors`, `NavigationItem/PresentationEditors`, `PostsFeedSourceEditors`, `RichTextContent/LayoutEditors`, `SectionContent/LayoutEditors`, `TeamMember/LayoutEditors`, and `TestimonialItemEditors` and the eight named page-editor flow suites
    from 03-L02. A raw
    array, auto-fetch-all, first-page truncation, or heavy-
    body fallback fails the handoff.
    Legacy `booking-page.test.tsx`/`media-library.test.tsx` must be absent. Pin
    `bookingPageTestFixtures.tsx` plus booking `loading-pagination|mutations|calendar`, and `mediaLibraryTestFixtures.tsx` plus media `loading-pagination|selection-folders|upload-edit` suites as exact independent owners.
12. Consume TASK-551-06-L01's Bun-free `searchHistoryContract.ts` and direct
    Vitest receipt, real private `pruneHistory` declaration/call removal, and
    actor/UUIDv5-idempotent `recordSearch`. TASK-551-04 makes every search GET
    write-free and adds the sole internal `POST /admin/api/search/history` with
    session actor, `content:read`, CSRF, `admin_write`, strict four-key body and
    409 idempotency conflict; `searchClient`/`useSearchResults` reuse one UUID per
    normalized UI intent/retry, with no public/API-key/GET mutation alias.
    Also consume TASK-551-06-L01's analytics compatibility receipt:
    `ANALYTICS_RETENTION_DAYS` alone owns age; absent/malformed/non-finite means
    365; finite input is floored then clamped to `30..1095`; only
    `RETENTION_ANALYTICS_ENABLED` controls enablement; both unsupported
    `RETENTION_ANALYTICS_*DAYS` aliases reject; pin the complete `Number(raw)`
    truth table. Every present `ANALYTICS_PRUNE_INLINE_DISABLED` and
    `ANALYTICS_PRUNE_INLINE_ENABLED` string is its own raw-value-free warning-once
    deprecated no-op. `RETENTION_DRY_RUN` alone accepts exact lowercase
    `true|false`; direct dry-run has no scheduler advisory lock, while scheduled
    dry-run takes exactly one before the same bounded service path; both perform
    zero destructive-row-lock/mutation/publication/progress. Request inline SQL is zero.
13. Consume a strict exact-command receipt from every executable 01..09 leaf.
    Every literal argv from its Validation Commands must have exit code zero,
    `skipped=false`, and positive discovery for test commands; paths must equal
    the leaf's current literal manifest. Every new TASK-551 default Bun integration
    suite lives under `tests/integration/server`, never a legacy non-default
    integration tree. The 09 leaves
    retain ownership of all direct existing suites (including split entry/SEO,
    import/export/detail-page, Admin boundary/cacheRefresh, and public booking/
    forms/analytics anti-abuse); L01/full gates may execute them transitively but
    never edit, rebaseline, or claim them; aggregate/full rediscovery transfers
    no targeted-test ownership for any leaf.

An active handoff is not a false green: it must be the parent's fresh exact
all-path serialized handoff with one named owner, exact bytes/paths/tests,
current status, tested boundary, land order, and follow-up disposition in the
final inventory and changelog. TASK-9999 cannot receive a performance, reliability,
security, persistence, migration, or test-integrity residual.

## Aggregate Acceptance Matrix

- Both frozen fixture profiles from TASK-551-01 pass their exact non-weakened
  p50/p95/p99, rows-read/returned, query-count, pool-wait, cache-byte, hit/miss,
  coalescing, and invalidation-lag budgets.
- Every public request executes exactly one authoritative, uncached
  `getSecuritySettings` read before security/rate middleware. A safely eligible
  structurally non-mutable HTML/list request has no additional query. Mutable
  page/home/post/content-entry detail/list requests add exactly one family point/
  membership gate, for two total queries; list gates return at most validated
  `pageLimit + 1` narrow projections and no bodies/hashes. Page/post/entry fields,
  digests, missing representation, unpublish, membership/reorder and restricted
  transitions match 09-L01. All execute zero additional domain/render/cache reads;
  restricted/missing/malformed or changed membership/version proof cannot return
  primed output.
- Public Redis cache consistency is bounded-eventual, never linearizable.
  Globally unavailable Redis makes both processes bypass to PostgreSQL/render.
  Ambiguous/partial generation delivery may expose only safe public old-generation
  data until outbox delivery or measured hard TTL expiry. Worker poll is at most
  250 ms, healthy invalidation lag is p99 at most 1 second, and locally known
  incoherence/backlog strictly above 5 seconds alerts, degrades readiness, and
  forces affected-family bypass until recovery. Public HTML TTL is at most 600 seconds and
  no server-cache policy exceeds 3,600 seconds.
- Admin post-write preview/readback bypasses shared public cache for read-after-
  write. Private/password, auth/RBAC, security, draft/preview, and nonce-bearing
  data remain fail-closed and DB-authoritative under every outage state.
  Decrypted/secret-bearing `SecuritySettings` is never cached; only finite
  generation/coherence metadata and explicitly typed redacted projections qualify.
- Memory and Redis backends pass the same envelope, TTL, expiry, oversize,
  malformed-value, generation, invalidation, and loader-result semantics.
- Policy-branded one/two-entry conditional publication carries `fillKind`,
  positive and nullable-negative policy TTL ceilings, and value ceiling. Both
  stores strictly decode each envelope, match entry/envelope `fillKind`, select
  the positive or required non-null negative ceiling, and recheck TTL/lifetime/
  bytes before work. Redis's generation-only and lease-owned paths reuse one
  exact internal validator; a malformed bundle executes zero Redis commands.
  The one coherence controller consumes the exact
  normalized force/recover/invalidation signals; local single-flight pins
  default/range `1_024`/`16..10_000`, a canonical digest of final path key,
  current process epoch and branded full-context `shareScopeDigest`, plus
  identity-cleaned shared fill-outcome promises only—never `Promise<TResult>` or
  caller values—and forced-bypass on epoch overflow. Ineligible/unbranded
  requests bypass registry/read/lease/fill. The owner retains its own loader
  result; a joiner uses its own resolver only after a strictly decoded `published`
  outcome proves successful positive/eligible-negative conditional publication. Every
  `not_published` path makes each joiner load authoritatively with fill disabled. The
  exact distributed coordinator unions and `getServerCacheRuntime().cache`
  singleton/accessor pass start/close identity tests.
- `ServerCache.getOrLoad(ServerCacheLoadRequest<TCached,TResult>)` alone captures
  primary plus finite fill-fence generations. Its strict result is either finite-
  reason `no_fill` (`returnValue` only, zero encode/write) or `fill` with
  `fillKind:positive|negative`, cache value, return value and branded optional
  companion. Positive primary/companion entries independently sample their own
  policy TTLs and may differ; negative uses only its negative TTL and forbids a companion. No
  consumer calls either conditional-write primitive.
- Public HTML pins both companion directions: manifest-primary miss returns HTTP
  while caching manifest+HTML companion; manifest hit/HTML miss caches HTML plus
  refreshed-manifest companion. `returnValue` is never encoded and fill is atomic.
  These loaders use positive fill or finite-reason `no_fill`, never negative;
  a render-time exclusion returns authoritative output without throw/encode/write.
- A distributed owner may publish only through atomic
  `putIfGenerationsAndLeaseOwned`: one bounded Redis operation proves its random
  token and every expected generation before one/two-entry fill. Only `written`
  fills; generation change, lease loss, unavailability, or renew uncertainty
  yields authoritative bytes without fill. Generation-only write is forbidden
  there, and post-attempt release is token-safe cleanup only.
- A state-identical force or recover report is a no-op. Every accepted local or
  Pub/Sub `invalidation_observed`, including duplicate at-least-once delivery,
  advances affected epochs without clearing any fence. No event-dedup registry
  or second epoch mutator exists, and safe-integer overflow permanently forces
  bypass. Pub/Sub contains only `eventKey` plus generation digest; subscribers
  point-read the outbox row to obtain and normalize finite tags.
- Public HTML TTL `0` bypasses manifest/HTML policy construction, generations,
  and store access while the independent fixed positive `public-runtime`
  bootstrap snapshot remains available.
- Commit, rollback, no-op, old/new slug, delete, dependency fan-out, outbox
  retry, Redis outage/reconnect, lease expiry, stale-generation fill, and process
  restart paths satisfy the bounded-eventual SLO. Outage recovery scenarios wait
  for outbox/generation recovery, then require the new value and record measured
  invalidation lag rather than claiming immediate linearizability.
- Every committed plan is passed to awaited `applyAfterCommit` before the domain
  success returns. Fire-and-forget/direct epoch reporting is forbidden; a
  resolved applied/queued/bypassed outcome means local observation or the
  affected-tag uncertainty fence is already visible.
  Redis commits persist exactly one same-transaction outbox row; memory commits
  persist zero and perform exactly one awaited post-commit generation bump.
- Nested settings/import/restore paths propagate exactly one outer `eventKey`
  and transaction through `collectInvalidationTagsTx`, persist/apply one plan,
  and create no nested key. Revision adopters call exactly
  `withRevisionParentLock(identity, tx, run)` with zero-argument `run` closing
  over `tx`, then `allocateRevision(input, tx)`.
- Security tests prove no credential, secret setting, password/hash, token,
  cookie, nonce, raw PII, private/draft/preview body, unrestricted URL, or bind
  value enters a cache key/value, Redis message/outbox payload, plan, metric,
  log, fixture, or persisted evidence.
- Exact public HTML no-fill exclusions cover commerce product data, form and
  booking submission nonces, booking slots token, analytics beacon nonce,
  request-scoped token, and unknown dynamic dependency; every dynamic dependency
  is tagged, gated, or excluded and all existing public-write defenses run first.
- Bounded method+URL dispatch preserves the complete booking/Forms/analytics API
  surface before cache normalization/read/write: every booking path/method
  including slots GET, exact Forms submission/upload paths at every method, and
  analytics beacon at every method. Existing handler security/method behavior
  remains authoritative; only unmatched GET/HEAD enters cache normalization and
  every dispatched/read request keeps one uncached security-settings read.
- Admin cache evidence binds deployment digest, crypto-random 128-bit session
  `authIncarnation`, monotonic safe-integer `authEpoch`, user and permissions;
  it proves same-tab reload reuse only, rotation before new login/logout/401/
  403/identity transition, memory-only safe misses on storage failure, and no
  auth API payload field.
- Deployment identity is fixed-order v3 UTF-8 JSON. Scope SHA-256 hashes fixed-
  order v3 JSON with deployment/incarnation/epoch/user and separate NFC,
  deduplicated, UTF-8-byte-sorted permissions/roles; no delimiter preimage exists.
- Security-settings writes use same-tx `SET LOCAL lock_timeout='2s'` and
  `pg_advisory_xact_lock(551,904)` before read/merge/write. Redis writes add
  exactly one same-tx outbox row; memory writes add zero and perform exactly one
  awaited post-commit generation bump. Both map `55P03`/`40P01` to
  `security_settings_conflict` and await invalidation.
- Migration-from-prior and clean-install paths pass with full artifacts and no
  unsafe task-owned table truncation or broad Redis cleanup.
- At least five distinct real-flow scenarios run through two independent app
  processes and one real Redis service; an in-memory mock does not qualify.
- The five ordered TASK-551-03-L02 Admin-list scenarios run through real Admin UI
  flows in both themes, assert visible effects, produce ten human-review
  screenshots, and report zero console errors.
- Full Bun, Vitest, precommit, release, strict security, task-graph, diff, and
  touched-file line-count gates pass with no required skip.

## Structured Evidence Contract

L01 and TASK-551-11 use strict reject-unknown JSON evidence. L02 consumes it
read-only:

```ts
type Task551CommandEvidenceV1 = Readonly<{
  id: string;
  argv: readonly string[]; // allowlisted command words only; no env values
  exitCode: number;
  durationMs: number;
  skipped: boolean;
  skipReason: string | null;
  discoveredTestCount: number | null; // test commands require a positive value
}>;

type Task551AggregateGateEvidenceV1 = Readonly<{
  schema: "coderso.task551.aggregate-gates@v1";
  pass: boolean;
  summary: string;
  head: string;
  fixtureProfiles: readonly ("small" | "large")[];
  commands: readonly Task551CommandEvidenceV1[];
  ownerTargetedHandoffs: readonly {
    taskId: "TASK-551-09-L01" | "TASK-551-09-L02" |
      "TASK-551-09-L03" | "TASK-551-09-L04";
    commandManifestSha256: string;
    commands: readonly Task551CommandEvidenceV1[];
    directExistingSuitePaths: readonly string[];
  }[]; // exact four owners, in leaf order
  metrics: readonly {
    id: string; profile: "small" | "large" | "redis-smoke";
    unit: "ms" | "count" | "bytes" | "ratio";
    value: number; budget: number; pass: boolean;
  }[];
  errors: readonly string[];
}>;

type Task551RedisSmokeEvidenceV1 = Readonly<{
  schema: "coderso.task551.redis-smoke@v1";
  pass: boolean;
  serverUp: Readonly<{ processA: boolean; processB: boolean;
    postgres: boolean; redis: boolean }>;
  redisVersion: string; // version only, no host/URL/auth
  namespaceDigest: string;
  publicConsistency: Readonly<{
    model: "bounded-eventual";
    workerPollMaxMs: 250;
    healthyP99LagBudgetMs: 1_000;
    readinessBypassThresholdMs: 5_000;
    publicHtmlHardTtlMs: 600_000;
    serverCacheHardTtlMs: 3_600_000;
  }>;
  scenarios: readonly {
    id: string; pass: boolean; assertions: readonly string[];
    processAQueries: number; processBQueries: number;
    invalidationLagMs: number | null;
  }[];
  consoleErrors: readonly string[];
  screenshots: readonly []; // non-UI smoke; leaf-specific UI smoke remains owned elsewhere
  failures: readonly string[];
}>;

type Task551AdminListUiSmokeEvidenceV1 = Readonly<{
  schema: "coderso.task551.admin-list-ui-smoke@v1";
  pass: boolean;
  session: "wf55103l02";
  scenarios: readonly {
    id: "pagination-next-previous" | "filter-reset" |
      "equal-sort-boundary" | "booking-dirty-refresh" |
      "extracted-views";
    pass: boolean;
    themes: readonly ["light", "dark"];
    visibleEffectAssertions: readonly string[];
    screenshots: readonly [string, string];
  }[]; // exactly the five union members above, in declaration order
  consoleErrors: readonly [];
  failures: readonly string[];
}>;
```

Raw environment values, connection strings, Redis keys, cached bodies, SQL/bind
values, cookies, user data, and provider credentials are forbidden evidence.
Only bounded sanitized fingerprints and aggregate metrics may persist.

## Security Contract

- **Endpoint visibility:** no endpoint is added or changed by this child. Tests
  exercise existing public reads and internal Admin/session routes only.
- **Auth/RBAC:** existing auth and permission checks remain authoritative in hit,
  miss, bypass, Redis-outage, and cross-process cases. No cache result may grant
  access or cross authenticated identities/permission epochs.
- **CSRF/rate limits:** existing Admin writes retain CSRF and their current
  buckets. Existing public-write nonce/HMAC/CAPTCHA and rate-limit paths are
  exercised but not modified.
- **Validation:** strict evidence schemas reject unknown fields; commands,
  profiles, page/batch sizes, timeouts, metrics, scenario IDs, namespace length,
  and evidence bytes are bounded.
- **Redis/DB isolation:** use a task-unique Redis namespace and uniquely scoped DB
  fixtures. Cleanup deletes only keys/rows created by this run. Never use Redis
  `KEYS`, unbounded `SCAN`, table truncation, or global destructive cleanup.
- **Secrets/privacy:** redact all connection/auth material before logs or
  evidence. A secret-like cache/evidence value is a hard security failure.
- **Anti-abuse:** no new public write exists. Cache outage cannot bypass existing
  rate limiting, nonce, signature, CAPTCHA, or bot policy.

## Sub-Tasks

1. [ ] **TASK-551-10-L01** — small/large performance budgets, fault/security/
   reliability/full gates, and at least five two-process Redis real-flow smokes.
2. [ ] **TASK-551-10-L02** — documentation/runbooks, final task-graph and
   changelog 1263 closure without reopening product source.

## Implementation Pseudocode

```ts
async function closeTask551Family(): Promise<void> {
  const handoffs = await verifyCurrentCollisionOwnerHandoffs([
    "TASK-511", "TASK-517", "TASK-493", "TASK-518",
  ]);
  const finalInventory = await requireCurrentFinalQueryInventoryReceipt();
  const ownerHandoffs = await requireExactOwnerHandoffs({
    compileGreenOrder: [
      "551-01-L01(initial)", "551-01-L02",
      "551-02-L01", "551-02-L02",
      "551-05-L01", "551-05-L02", "551-03-L01",
      "551-06-L01", "551-06-L02", "551-06-L03",
      "551-03-L02", "551-03-L03", "551-04-L01", "551-04-L02",
      "551-07-L01", "551-07-L02",
      "551-08-L01", "551-08-L02", "551-08-L03",
      "551-09-L01", "551-09-L02", "551-09-L03", "551-09-L04",
    ],
    finalInventoryRefresh: "551-01-L01(final)",
    task09LiteralCommandManifests: true,
  });
  const adminListUiSmoke = await runAndValidateTask55103L02UiSmoke({
    session: "wf55103l02", themes: ["light", "dark"], scenarioCount: 5,
  });
  const aggregate = await dispatchTask55110L01({
    handoffs, ownerHandoffs, finalInventory, adminListUiSmoke,
  });
  requireAggregateGatePass(aggregate);

  const postAudit = await task551Sidecar.runFreshPostAuditLenses();
  if (!postAudit.pass) {
    await task551Sidecar.returnFindingsToExactOwnersOnce(postAudit.findings);
    await task551Sidecar.rerunAffectedTargetedGates();
    requireAggregateGatePass(await dispatchTask55110L01({ handoffs }));
  }

  const finalDrift = await task551Sidecar.runFreshFinalDrift();
  requireZeroUnresolvedFindings(finalDrift);
  await dispatchTask55110L02({ aggregate, postAudit, finalDrift });
}
```

**Data flow:** frozen budgets + fresh post-09 exact inventory receipt + landed
receipts + current task/handoff state + five-scenario Admin UI smoke → aggregate
Bun/DB/Redis/security/reliability/full gates → five-lens
post-audit → exact owner fixes and affected reruns if needed → fresh final
drift → docs/changelog/status/board closeout.

**Error handling:** a missing/malformed result, skipped required lane, unavailable
DB/Redis, budget weakening, leaked sensitive value, dirty fixture cleanup,
unresolved collision, stale audit, task-graph mismatch, or file over 1,000 lines
blocks closure. Do not reinterpret infrastructure absence as a passing skip.

**Regression-test shape:** aggregate tests validate exact owner command receipts
rather than duplicating their assertions or ownership; pin frozen budgets, exact
query counts, backend parity, fault transitions, security exclusions, two-
process scenario identity/order, clean scoped teardown, non-zero direct-suite
discovery, and release-gate registration.

## Testing Requirements

- All exact commands from TASK-551-10-L01.
- Workflow/audit/task-graph commands from TASK-551-11.
- Validate the four ordered TASK-551-09 literal command manifests, exit code
  zero, no skip, positive test discovery, and digest equality to the current
  owner leaves before accepting aggregate/full-gate results.
- Validate the exact `Task551AdminListUiSmokeEvidenceV1` receipt, ten non-empty
  screenshot files, both themes per scenario, and an empty console-error array.
- `git diff --check` and physical-line counts for every file added or modified
  since the verified TASK-551 family baseline.
- No terminal metadata write until every required receipt is current and green.

## Documentation Updates Required

TASK-551-10-L02 owns the exact documentation and closure set declared in its
file. This child does not grant any other leaf shared-doc, task-board, status, or
changelog authority.
