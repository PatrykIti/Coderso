# TASK-551-10: Performance, Fault Gates, Documentation, and Closure
# FileName: TASK-551-10-Performance-Fault-Gates-Documentation-And-Closure.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Performance / Reliability / Security / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** compile-green sequence terminal with targeted gates green:
TASK-551-01 → TASK-551-02 → 08-L03 INITIAL → TASK-551-05 →
TASK-551-03-L01 → TASK-551-06-L01/L02/L03 → TASK-551-07-L01 →
09-L04 INITIAL → TASK-551-03-L02 → TASK-551-07-L02 →
TASK-551-08-L01/L02/L03 FINAL → TASK-551-03-L03 → TASK-551-04 →
TASK-551-09-L01/L02/L03/L04 FINAL; then
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
   Also require frozen author/type-author/role/tag/webhook/latest-autosave cases,
   the exact 128-tuple/101-root/16,384-byte public dependency aggregate, and every
   `2036-01-01` retention family with literal anchors/cutoffs/child order plus
   `499/500/501/2,000/2,001` batch edges.
   Pin the initial inventory at 34 planned fingerprints: 32 named Admin plus
   `cache-outbox-oldest-unprocessed` and `public-html-dependencies-128`. Pin the
   plan registry at 37 IDs/38 cases/76 small+large receipts: those 32 Admin IDs
   once plus `webhooks-created-keyset`, `webhook-deliveries-parent-keyset`,
   `webhooks-event-batch`, `page-latest-autosave`, and
   `cache-outbox-oldest-unprocessed`.
9. Consume TASK-551-02's shared fleet parser receipts: runtime processes
   `1..256` default `1`, workers `0..256` default `0`, pool max default `10`,
   migration reserve `3`, and default planned `1*10 + 0*10 + 3 = 13`, strictly
   below validated server availability; default Bun lifecycle suite
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
   Require pure `databaseApplicationIdentity.ts`: strict runtime/worker process
   kind, separate runtime `1..256` and worker `0..256` fleet counts, globally
   unique replica IDs, and every physical session named only
   `coderso:runtime|worker|maintenance:<id>` or
   `coderso:migration:<operationUuid>`; a pure import opens no DB client.
   Require sanitized known-interval `pg_stat_statements` receipts before
   prioritization and before/after comparison, never a shared-stat reset, with
   exact classes `application|migration|maintenance|external_diagnostic|unknown`.
   Owner-supplied Render evidence is only the 4m51 full-schema
   `row_to_json(t)::text ~ ?` diagnostic UNION plus 30–60s+ `access_logs` regex
   shape. With operator evidence classify it `external_diagnostic`, otherwise
   `unknown`; exclude it from application decisions and forbid a one-off index.
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
    same-number online manifest. Pin page/entry/typed-entry/post author
    composites, role-leading `user_roles_role_user_idx`, webhook list/delivery
    composites, `page_revisions_page_kind_version_id_idx`, and
    `posts_tags_gin_idx`/`media_tags_gin_idx`/`webhooks_events_gin_idx` as
    `jsonb_path_ops` GIN against their exact callers and parameterized `@>`.
    Pin read-performance member `cache_outbox_unprocessed_age_idx(created_at,id)
    WHERE processed_at IS NULL` and `readOldestUnprocessedAge` fingerprint
    `cache_outbox_oldest_unprocessed`: exact created-at/id `LIMIT 1`, including claimed/backed-off rows, with 1k/100k EXPLAIN and write-budget evidence.
    Require the single version-2 CAS/hash-chained `rollout-forward` orchestrator.
    It drains admission/workers and proves exact application names in
    `pg_stat_activity`; the old `max(version)+1` binary stays stopped through the
    durable page/content/widget `revision-integrity` group and never resumes.
    External mode then admits only the digest-pinned compatible TASK-551 binary
    while the read-performance group builds; offline-single remains cold through
    final catalog. First compatible traffic makes rollback forward-fix only.
    Transactional SQL creates no index; run `rollout-forward` twice (second zero
    DDL/transition), then `status`. One L01 writer
    owns schema exports/descriptor, SQL, snapshot, journal, and tests atomically;
    no closure text may pretend the installed DSL represents the exclusion. The
    exact custom SQL is `CREATE EXTENSION IF NOT EXISTS btree_gist`, then
    `ALTER TABLE bookings ADD CONSTRAINT bookings_active_resource_window_excl EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'))`;
    rollback is
    `ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_active_resource_window_excl`
    without dropping the extension.
    Require one reserved physical migration session and L01's sole
    `createTask551ReservedDrizzleClient(poolClient,reserved)`. Direct
    `drizzle(reserved)` is impossible on postgres.js 3.4.9; only
    `drizzle(adaptedReserved)` reaches Drizzle 0.45.2. Pin callable/unsafe
    forwarding to the reserved handle, identical non-reassignable pool `.options`
    with mutable shared parser/serializer maps, empty-option same-adapter
    BEGIN/COMMIT/ROLLBACK, and zero `poolClient.begin` or pool SQL dispatch after
    reserve. Exactly three custom GUCs remain:
    `coderso.task551_operation_id`, `coderso.task551_receipt_v2`, and
    `coderso.task551_receipt_sha256`. One PID records GUC set, first guard, DDL,
    receipt and journal; clean/prior/replay/reverse plus injected rollback are
    atomic. Pin RESET/same-PID/one-release/normal-end and unknown-state poison/
    no-release/hard-end. Faithful-adapter failure blocks rollout until the
    contract selects the custom reserved transaction runner alone; no fallback
    or dual path passes.
11. Re-prove TASK-551-03-L02 only after 06-L03. Require the exact summary-only
    page `{id,pageId,version,kind,title,slug,createdAt,createdBy:{id,name,email}|null}`
    and detail `{id,detailPageId,version,kind,createdAt,createdBy:string|null}`
    envelopes from 06-L02, with no invented `reason`, plus current 09-L04
    INITIAL installation-authority and 08-L03 INITIAL header-transport receipts,
    then L02's sole route/
    schema/client/UI adoption, full eight-client consumer graph and fresh graph
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
    the exact two-segment cursor/code-owned `KeysetSpec`, generic public cursor
    error mapping and previous-page SQL/output reversal. Require every metric-
    bearing envelope `{items,nextCursor,hasMore,summary,facets}` to use
    `matchingTotal:null`/`exactness:"not_computed"` for arbitrary filters with no
    filtered `COUNT`. Fixed summaries and author/content-type/role/folder/tag
    facets are exact at one read-only `REPEATABLE READ` snapshot. Facet
    pages use strict `{items,nextCursor,hasMore}`, default/max `50/100`, and never
    auto-fetch. The page query, one fixed aggregate row, and at most one bounded
    relation-facet batch execute at most three separately inventoried/budgeted/
    planned SQL statements with no hidden page concatenation, per-row lookup, or auth leakage. Require
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
    Search v1 has no cursor; each of five arms yields at most 51 candidates in
    exact-email→FTS→non-overlapping-trigram priority, at most 255 reach global
    dedup/rank and 51 leave. Tier precedes score and each arm's plan budget is
    independent of final top-k survival.
    L02 imports L01's `buildTask551PrefixTsquery` and constants read-only. Its one
    input CTE binds literal `to_tsquery('simple',$1)` once; both assistant vector
    predicates and ranks reuse that tsquery. `expandedTerms` is absent from SQL
    candidates and remains reranker-only. Shared NFKC/Unicode/punctuation and
    2/200-code-point, 800-byte, 16-token, 64-code-point-per-token tests reject
    local parsers, raw interpolation, websearch/plainto constructors, or a second
    tsquery bind. Admin search uses the same token grammar. Trigram uses GIN-indexed
    `%` operator after static transaction-local
    `SET LOCAL pg_trgm.similarity_threshold='0.300'`; LIKE/ILIKE/regex fallback
    is forbidden, and closure updates `_docs/SEARCH_SPEC.md`.
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
    Page autosave locks its parent, selects only latest autosave by version/id,
    reuses an equal normalized snapshot with zero write, or allocates then deletes
    only that exact predecessor; old history is scheduler-only and 100k/50-writer
    evidence pins two/six-statement budgets.
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
  non-mutable request has no additional query. Mutable detail/list requests read
  safe manifest metadata then run one root+nested set-based validator over at
  most 128 tuples/16,384 canonical bytes and 101 root rows, for two total queries.
  It returns one aggregate validation row and no bodies/hashes. Missing,
  duplicate, changed, unpublished, private/password or unavailable proof renders
  authoritatively with zero HTML/content value GET/fill.
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
  singleton/accessor pass start/close identity tests. Its public runtime key set
  is only `mode/cache/invalidation.applyAfterCommit/health`; stores, controller,
  coordinator, workers and close capabilities remain private. Startup validates
  all four mandatory policy key+envelope capacities against `store.describe()`.
- `ServerCache.getOrLoad(ServerCacheLoadRequest<TCached,TResult>)` alone captures
  primary plus finite fill-fence generations. Its strict result is either finite-
  reason `no_fill` (`returnValue` only, zero encode/write) or `fill` with
  `fillKind:positive|negative`, cache value, return value and branded optional
  companion. Positive primary/companion entries independently sample their own
  policy TTLs and may differ; negative uses only its negative TTL and forbids a companion. No
  consumer calls either conditional-write primitive.
- Backend null gives the loader `store_absent`; returned expired/wrong-generation/
  oversized/invalid bytes are evicted and give coarse `store_value_rejected`;
  exact disabled reasons are `ineligible|singleflight_saturated|coherence_bypass|
  generation_unavailable|transport_unavailable|distributed_wait_timeout|
  coordinator_closed|not_published_retry`. Every loader receives
  `{trigger, companion}`; shared outcomes map `store_absent` to
  `store_absent_no_publication`, every rejected-value reason to
  `store_value_rejected`, and every disabled reason to `fill_disabled`, never the
  trigger object itself.
  Disabled fill has zero publication work, and public manifest/HTML may refill
  only a true absence. Memory expiry+eviction shares one 64-entry work budget;
  a required 65th victim skips insertion atomically.
- Public HTML pins both companion directions: manifest-primary miss returns HTTP
  while caching manifest+HTML companion; manifest hit/HTML miss caches HTML plus
  refreshed-manifest companion. `returnValue` is never encoded and fill is atomic.
  These loaders use positive fill or finite-reason `no_fill`, never negative;
  a render-time exclusion returns authoritative output without throw/encode/write.
  `public-html-manifest` is non-authorizing metadata with family-specific
  `mutableVisibilityGate:"not_required"`; HTML requires current `strictly_public`
  root+nested validation. Refreshed-manifest eligibility is a distinct post-render
  context and never inherits or authorizes HTML access.
- A distributed owner may publish only through atomic
  `putIfGenerationsAndLeaseOwned`: one bounded Redis operation proves its random
  token and every expected generation before one/two-entry fill. Only `written`
  fills; generation change, lease loss, unavailability, or renew uncertainty
  yields authoritative bytes without fill. Generation-only write is forbidden
  there, and post-attempt release is token-safe cleanup only.
  Generation-only conditional writes likewise return
  `written|generation_changed|unknown`; timeout/disconnect after dispatch is
  unknown physical outcome, never proof that bytes are absent or publishable.
- Source observation tokens ignore older/equal completions; current-token
  state-identical force/recover is a no-op. Every event-keyed observation,
  duplicates included, advances epochs but clears no fence. Only the same
  event's `durable_invalidation_processed` after generation bump plus conditional
  DB completion clears its failed-post-commit fence; broad recovery/PubSub/other
  events cannot. No historical/tombstone registry exists: concurrently unresolved
  events and active attempts cap independently at 4,096. Saturation temporarily
  bypasses all families without rejecting callbacks and recovers only when both
  counts are at most 3,072; attempt tokens settle only after no callback can
  report, and over 100,000 sequential settled events stay bounded.
  Redis additionally holds a durable drain fence until healthy with no pending/
  claimed row. Only safe-integer epoch/drain-generation overflow stays forced
  until restart. Pub/Sub contains only event key plus generation digest.
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
- Admin cache evidence binds deployment digest, random 128-bit tab incarnation,
  distinct cross-tab auth-generation nonce, monotonic epoch/installation token,
  user and permissions. Every module-level cache/promise/map/prefetch registry
  has one writer, reset subscription and delayed-install fence; storage failure
  yields persistent misses and no auth payload field. Read-through `set`,
  invalidate and refresh advance generation before installation.
- Deployment identity is fixed-order v3 UTF-8 JSON. Scope SHA-256 hashes fixed-
  order `AdminCacheScopePreimageV3` JSON
  `{v,deploymentIdentity,authIncarnation,authGenerationNonce,authEpoch,userId,
  permissions,roles}`. The 367-byte vector digest is
  `6c69458d5fdc22634a5fca20609e3accb4a6fe606905af2b2c522900770afbf7`;
  nonce-only `222...` rotation yields
  `4214d494f425d2f595de703cd19662a2513d0d85871bff748bdb5d5cb728611d`
  and rejects old storage/events/delayed installs. No delimiter preimage exists.
- Security-settings writes use same-tx `SET LOCAL lock_timeout='2s'` and
  `pg_advisory_xact_lock(551,904)` before read/merge/write. Redis writes add
  exactly one same-tx outbox row; memory writes add zero and perform exactly one
  awaited post-commit generation bump. Both map `55P03`/`40P01` to
  `security_settings_conflict`; `settingsRoutes.ts` maps it to exact redacted 409.
  Form actions are excluded from public render dependency/invalidation surfaces.
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

type Task489CompanionId =
  | "task489-runs-all-keyset"
  | "task489-runs-package-keyset"
  | "task489-effective-supersession"
  | "task489-active-starter-owner"
  | "task489-safe-detail";

type Task551AggregateGateEvidenceV1 = Readonly<{
  schema: "coderso.task551.aggregate-gates@v1";
  pass: boolean;
  summary: string;
  head: string;
  fixtureProfiles: readonly ("small" | "large")[];
  task489Predecessor: Readonly<{
    schema: "coderso.task551.task489-predecessor@v1";
    pass: boolean;
    smallRuns: 10_000; largeRuns: 1_000_000;
    ids: readonly Task489CompanionId[]; // exact five
    cases: readonly Readonly<{ id: Task489CompanionId; caseId: string;
      statementIds: readonly [string] | readonly [string, string] }>[]; // exact fourteen
    statementReceipts: readonly Readonly<{
      id: Task489CompanionId; caseId: string; statementId: string;
      profile: "small" | "large"; planSha256: string;
      normalizedP95Ms: number; p95MsMax: number; pass: boolean;
    }>[]; // exact thirty
    errors: readonly string[];
  }>;
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
      "551-08-L03(initial)",
      "551-05-L01", "551-05-L02", "551-03-L01",
      "551-06-L01", "551-06-L02", "551-06-L03",
      "551-07-L01", "551-09-L04(initial)",
      "551-03-L02", "551-07-L02",
      "551-08-L01", "551-08-L02", "551-08-L03(final)",
      "551-03-L03", "551-04-L01", "551-04-L02",
      "551-09-L01", "551-09-L02", "551-09-L03", "551-09-L04(final)",
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
