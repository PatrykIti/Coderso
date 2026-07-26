# TASK-551-10-L01: Small/Large Load, Fault, Security, and Redis Smoke Gates
# FileName: TASK-551-10-L01-Small-Large-Load-Fault-Security-And-Redis-Smoke-Gates.md

**Parent Subtask:** TASK-551-10
**Priority:** High
**Category:** Performance / Reliability / Security / Runtime Smoke
**Estimated Effort:** Large
**Dependencies:** exact compile-green sequence landed with targeted gates:
TASK-551-01 → TASK-551-02 → 08-L03 INITIAL → TASK-551-05 →
TASK-551-03-L01 → TASK-551-06-L01/L02/L03 → TASK-551-07-L01 →
09-L04 INITIAL → TASK-551-03-L02 → TASK-551-03-L03 → TASK-551-04 →
TASK-551-07-L02 → TASK-551-08-L01/L02/L03 FINAL →
TASK-551-09-L01/L02/L03/L04 FINAL;
TASK-551-01-L01 post-09 final re-dispatch emitted a fresh exact-set receipt;
TASK-551-11 pre-implementation audit PASS; parent external dispatch gate
reverified for TASK-511, TASK-493, TASK-517, and TASK-518
**Status:** ⏳ To Do
**Changelog:** 1263 pinned (closure only)

---

## Overview

Create and execute the aggregate release-blocking evidence for TASK-551. Run the
frozen small/large profiles against real PostgreSQL, exercise memory/Redis
semantic parity and failure transitions, prove cache security boundaries, wire
the performance/security/reliability suites into the existing Coderso release
gate, and run at least five real flows through two separate application
processes sharing a real Redis service. Re-run and consume TASK-551-03-L02's
five Admin-list visible-effect scenarios in light and dark mode with screenshots
and zero console errors.

This leaf owns harnesses, gate registration, CI Redis provisioning, and final
runtime evidence only. It cannot fix a production failure. Every product defect
returns to its TASK-551-01..09 single writer, after which this leaf reruns the
affected targeted and aggregate commands from a fresh process.

## Sub-Tasks

None; this is an executable aggregate-gate and smoke leaf.

## Exact Single-Writer Ownership

This leaf may create or edit only:

- `tests/perf/task551DatabaseCachePerformanceGate.test.ts`;
- `tests/integration/runtime/task551ServerCacheFaultMatrix.test.ts`;
- `tests/integration/runtime/task551TwoProcessRedisSmoke.test.ts`;
- `tests/security/task551ServerCacheSecurityGate.test.ts`;
- `tests/helpers/task551RedisProcessHarness.ts`;
- `scripts/task551-redis-smoke.ts`;
- `scripts/coderso-release-gates.ts` (additive TASK-551 commands only);
- `.github/workflows/coderso-pr-gates.yml` (one pinned Redis service and bounded
  TASK-551 gate environment/command wiring only);
- `_docs/_workflows/_smoke/task-551/runtime/redis-smoke-v1.json` (sanitized final
  evidence only);
- `_docs/_workflows/_smoke/task-551/03-l02/ui-smoke-v1.json` and these exact ten
  screenshots: `pagination-next-previous-{light,dark}.png`,
  `filter-reset-{light,dark}.png`, `equal-sort-boundary-{light,dark}.png`,
  `booking-dirty-refresh-{light,dark}.png`, and
  `extracted-views-{light,dark}.png` in that same directory.

It reads, but never edits, TASK-551-01's budget artifacts, the final query
inventory/receipt refreshed by TASK-551-01-L01 after 09, and the targeted test
receipts owned by TASK-551-02..09. It writes only the final UI smoke evidence,
not any TASK-551-03-L02 product or targeted-test path. Before writing either
shared gate file, re-read current bytes and confirm no active external task owns
the same region. A collision blocks dispatch and returns to orchestration.

Forbidden paths include all `core/**` production modules, `core/db/migrations/**`,
`core/db/schema*`, TASK-551 task files, `_docs/_CHANGELOG/**`, product/developer
docs, Admin/browser sources, and every targeted test owned by TASK-551-01..09.
This leaf must not rebaseline or weaken an owner assertion.

## Frozen Inputs and Fixture Safety

- Consume the exact versioned performance-budget and query-ownership artifacts
  produced by TASK-551-01; do not copy their constants into this leaf. The
  inventory receipt must be `phase: "final"`, digest-current against the post-09
  production tree, exact-set equal, and contain zero planned deltas. Initial,
  stale, missing, or non-L01-authored receipts fail before any aggregate work.
  Initial is exactly 34 planned fingerprints: 32 named Admin plus
  `cache-outbox-oldest-unprocessed` and `public-html-dependencies-128`. The plan
  registry is exactly 37 IDs/38 cases/76 small+large receipts: those 32 once plus
  `webhooks-created-keyset`, `webhook-deliveries-parent-keyset`,
  `webhooks-event-batch`, `page-latest-autosave`, and the outbox fingerprint.
- The `small` and `large` profiles use TASK-551-01's exact per-family target and
  support-table row counts, relationship recipes, pool capacities, warm-up,
  sample/repetition counts, percentile method, hardware/context metadata, and
  non-weakened budgets. The aggregate runner seeds one mapped inventory family
  at a time through that owner and cleans it before the next family; it does not
  invent a whole-profile fixture, payload-size, or concurrency constant.
- IDs are UUIDv5 from `(validatedRunScope, profile, family, ordinal)`; integer
  family/support counts are exact. List timestamps group each ten ordinals while
  append timestamps are unique by ordinal. Fixed distributions are users
  `80/10/10` with five roles/every tenth multi-role; content `50/30/10/10`;
  entry visibility `70/20/10`; forms `60/30/10`; submissions `70/20/10`; media
  `80/20` with 10% null folder; five booking statuses at 20% each; search
  common/rare counts use L02's exact per-family integer table (no percentage
  rounding), with hidden/miss zero; and ten-row equal-sort groups. Pool capacities are
  small/large `2/10`. Measurement is exactly three repetitions, each five
  unrecorded warmups plus 30 samples; calibration is 20 warmups plus 100 samples.
  Repetition-p95 spread is `(max-min)/max(median,0.1)*100`, except three zeroes
  produce zero, and must be `<=20%`. Normalize by
  `observedMs*referenceCalibrationMedian/currentCalibrationMedian`, accepting
  factor `0.80..1.20`; freeze used
  `ceilToTenth(max(kindFloor, medianRepetitionPercentile*1.25))`. This leaf reads
  checked-in finite ceilings and never invokes `--freeze`.
- Summary/facet `asOf` is `2026-01-15T12:00:00.000Z`. Submission ordinals
  divisible by four are 1..6 days before and all others 8..37 days before,
  yielding rolling-seven-day `500/25,000`, spam `200/10,000`. Booking timezones
  cycle UTC/New_York/Tokyo; buckets `0..9/10..19/20..59/60..99` mean same-day
  past/same-day future/next 1..40/prior 1..40 days, end +60 minutes, yielding
  today `400/20,000`, upcoming and past/current `1,000/50,000` each.
- Consume exact author/type-author/role/tag, webhook event/delivery,
  latest-page-autosave, and public-dependency fixtures. The last has 128 tuples
  (43 page/43 post/42 entry), 101 roots and at most 16,384 canonical bytes.
  Retention uses the frozen `2036-01-01` cutoffs/anchors/child-first counts and
  `499/500/501/2,000/2,001` batch edges for every policy family.
- DB fixtures use one run UUID in every owned slug/key and record every created
  row ID. Teardown deletes only those IDs in FK-safe order, including failure
  paths. Never assert a globally empty table or delete another suite's rows.
- Redis uses an unpredictable task-run namespace below the configured test-only
  prefix. Store the namespace digest, never its raw value. Cleanup uses the
  harness's recorded exact keys/generation/outbox identities; no `KEYS`, broad
  `SCAN`, `FLUSHDB`, or `FLUSHALL`.
- Fail before load tests if PostgreSQL or Redis reachability/version checks fail.
  Redis must be a real supported 7.2+ server; mocks and in-memory substitutes do
  not satisfy the integration/smoke contract.

## Automated Gate Matrix

### Small and large performance

- Point reads, bounded lists/keyset traversal, full-text/trigram search,
  aggregate consolidation, retention batches, pool saturation, memory LRU, Redis
  cache, and eligible public-render hit/miss paths run under both profiles.
- Record p50/p95/p99, rows read/returned, exact query count, bytes transferred,
  pool wait/saturation, cache hit/miss/error, serialized bytes, eviction,
  coalesced loaders, and invalidation lag.
- Assert every public request performs one uncached authoritative
  `getSecuritySettings` query before security/rate middleware. A safely eligible
  non-mutable request totals one query. Mutable details/lists first read safe
  manifest metadata, then one `public_html_dependency_validation` VALUES/CTE
  statement checks root plus all nested dependencies (128 tuples, 16,384 bytes,
  101 roots) and returns one aggregate row/no bodies. Missing/duplicate/changed/
  unpublished/private/password/malformed or unavailable proof renders
  authoritatively with zero HTML/content value GET/fill; total remains two.
- Compare sanitized `EXPLAIN (ANALYZE, BUFFERS)` plan fingerprints against the
  TASK-551-01 budget baseline and TASK-551-05 catalog/plan receipts. A different
  plan is investigated; snapshots never include bind values or raw data.
- Require executable sanitized known-interval `pg_stat_statements` receipts
  before prioritization and before/after comparison without resetting shared
  stats. Classes are exactly `application|migration|maintenance|
  external_diagnostic|unknown`. Owner-supplied Render evidence records only the
  4m51 `row_to_json(t)::text ~ ?` diagnostic UNION and 30–60s+ `access_logs`
  regex shapes. Operator evidence permits `external_diagnostic`; otherwise use
  `unknown`. Exclude both from application decisions and forbid a one-off index.

### Fault and reliability

- Memory corrupt/unknown/expired/oversized envelope, byte/count eviction, loader
  failure, shutdown, and concurrent single-flight transitions.
- Pin concrete-policy envelope lifetime and policy-branded conditional-entry
  TTL/value ceilings; local single-flight default/range/overflow behavior is
  exactly `1_024`, `16..10_000`, a canonical digest of final path key, current
  epoch and branded full-context `shareScopeDigest`, identity-cleaned shared
  fill-outcome promises only (never `Promise<TResult>`/caller values), and forced
  bypass at coherence-epoch overflow. Ineligible/unbranded requests perform zero
  registry/read/lease/fill calls. The owner retains its result; only a strictly
  decoded `published` outcome from successful positive/eligible-negative
  conditional publication lets a joiner call its own resolver. For `no_fill`, rejection, generation
  change, lease loss, unavailable/timeout, closed/bypass or malformed outcomes,
  every joiner runs its own authoritative loader with fill disabled.
  Exercise every exact coherence signal/controller transition, distributed
  owner/waiter/bypass result, and `getServerCacheRuntime().cache` singleton
  before start/while started/after close. The public runtime exposes exactly
  `mode/cache/invalidation.applyAfterCommit/health`; controller, store,
  coordinator, worker and close capabilities remain private. Before listen,
  validate the exact four-policy key+envelope capacity catalog via `describe()`.
- Pin `ServerCache.getOrLoad(ServerCacheLoadRequest<TCached,TResult>)` as sole
  load/fill owner: one pre-loader primary+`fillFenceTags` snapshot and strict
  finite-reason `no_fill` versus `fill`/`fillKind:positive|negative` result.
  `no_fill` returns only `returnValue` with zero encode/write; negative uses only
  its negative TTL and carries no companion; positive permits branded zero/one
  companion whose TTL is sampled/capped independently from the primary's own
  policy, so an atomic pair may have unequal TTLs. No consumer accesses either store write primitive.
- Pin the complete trigger matrix: backend null is `store_absent`; returned
  expired/wrong-generation/oversized/invalid bytes are evicted and become coarse
  `store_value_rejected`; exact disabled reasons are `ineligible|
  singleflight_saturated|coherence_bypass|generation_unavailable|
  transport_unavailable|distributed_wait_timeout|coordinator_closed|
  not_published_retry`. Every loader receives `{trigger, companion}` and maps
  absent/rejected/disabled to `store_absent_no_publication`/
  `store_value_rejected`/`fill_disabled`, never the trigger object. Disabled fill
  has zero publication work. Public manifest/
  HTML may fill only on true absence. Memory expiry+eviction has one 64-entry
  work cap; a required 65th victim skips insertion without partial mutation.
- Pin manifest-primary render as manifest cacheValue + HTTP-only returnValue +
  branded HTML companion, and manifest-hit/HTML-miss as HTML primary + refreshed
  manifest companion; both-or-neither generation fill is mandatory. Both loaders
  use positive fill or finite-reason `no_fill`, never negative. A render-time
  exclusion returns authoritative output without throw, encode, or write.
  `public-html-manifest` is non-authorizing metadata with
  `mutableVisibilityGate:"not_required"`; HTML requires current `strictly_public`
  root+nested validation and refreshed eligibility is a distinct post-render context.
- Source observation tokens ignore older/equal completions; a current-token
  state-identical force/recover is a no-op. Event-keyed observations, duplicates
  included, advance epochs but clear no fence. Only the same event's durable
  processed signal after generation bump plus conditional DB completion clears
  its failed-post-commit fence; broad recovery/PubSub/another event cannot. The
  unresolved-event and active-attempt sets cap independently at 4,096 with no
  settled tombstones. Saturation temporarily bypasses all families and accepts
  callbacks; attempt tokens settle only after no callback can report, recovery
  needs both counts at most 3,072, and >100,000 settled
  events stay bounded. Redis independently fences drain until healthy/no pending/
  claimed rows. Only safe-integer epoch/drain-generation overflow remains forced
  until restart. Pub/Sub carries event key plus generation digest only.
- TASK-551-02 receipts pin one shared parser: runtime `1..256` default `1`, worker
  `0..256` default `0`, pool default `10`, migration reserve `3`, default planned
  `1*10 + 0*10 + 3 = 13`, strictly below validated availability; exact lifecycle
  APIs and the default Bun suite
  `tests/integration/server/task551DatabaseLifecycle.test.ts`; deadlines
  `2_000/5_000/10_000/15_000 ms` plus DB close `10 s`; awaited stop/listen and
  late-acquisition release-once behavior; and closed telemetry with six families,
  five outcomes, 12 duration buckets, nine returned-row buckets, 3,240 cells per
  fingerprint, 44 pool cells, saturating `Number.MAX_SAFE_INTEGER`, deterministic
  `snapshot()`/`reset()`, opt-in `measureDatabaseQuery`, and separate
  `probeDatabasePoolHealth` without a driver-wide rows/wait claim. Pin exact
  constants `QUERY_FAMILIES`, `QUERY_OUTCOMES`,
  `QUERY_DURATION_BUCKET_MAX_MS`, `ROWS_RETURNED_BUCKET_MAX`,
  `POOL_WAIT_BUCKET_MAX_MS`, `POOL_OUTCOMES`, `MAX_QUERY_FINGERPRINTS=512`, and
  `MAX_COUNTER_VALUE=Number.MAX_SAFE_INTEGER`. Pin exported
  `assertMaintenanceSessionAffinity()`, strict maintenance modes
  `primary|direct|session`, pool max `2..4`, secret URL and budget inclusion.
  Primary startup never probes; disabled-scheduler `off+primary+pool1` passes and
  `verifyDatabaseSessions` checks only that session.
  Explicit direct/session probes once at DB start and reuses the lifecycle result;
  enabled scheduler awaits it before timer/listen and fails below two sessions or with transaction+primary.
- Pin pure `databaseApplicationIdentity.ts`: strict runtime/worker process kind,
  separate runtime `1..256` and worker `0..256` fleet counts, globally unique
  replica IDs, exact `coderso:runtime|worker|maintenance:<id>` and
  `coderso:migration:<operationUuid>` names on every physical session, replacement
  identity, and zero DB clients on pure import.
- Redis connect timeout, command timeout, circuit open/half-open/close,
  disconnect, reconnect, corrupt/oversized value, generation read/bump failure,
  Pub/Sub loss, and process restart. Outage bypasses to DB and never starts a
  persistent local value cache. Before either Redis write Lua, the one exact
  internal validator strictly decodes every envelope, matches entry/envelope
  `fillKind`, selects the positive or required non-null negative policy ceiling,
  and rechecks TTL/lifetime/bytes; any malformed one/two-entry bundle performs
  zero Redis commands. Positive companions retain their independently sampled TTL.
- Commit/rollback/no-op invalidation, outbox claim/retry/never-discard policy,
  `FOR UPDATE SKIP LOCKED` concurrency, worker crash/reclaim, duplicate delivery,
  stale-generation fill rejection, lease expiry, token mismatch, and
  compare-and-delete release.
  Redis commits create exactly one same-transaction outbox row; memory commits
  create zero and perform exactly one awaited post-commit generation bump.
- Every domain caller awaits `applyAfterCommit(plan)` before returning committed
  success. Its applied/queued/bypassed resolution follows visible local
  observation or an affected-tag force fence; fire-and-forget/direct epoch
  mutation is a gate failure.
- A distributed owner uses only `putIfGenerationsAndLeaseOwned`; one bounded Lua
  operation proves the exact lease token and every expected generation before an
  all-or-nothing one/two-entry fill. Only `written` fills. `generation_changed`,
  `lease_lost`, `unavailable`, and renew `lost|unknown` return authoritative
  bytes without fill; generation-only store write is forbidden, and release
  afterward is token-safe best-effort cleanup only.
- Migration from clean and immediately-prior databases, disposable rollback and
  forward reapply, plus next-free journal/snapshot integrity after re-reading
  TASK-518, all migration owners, and
  `core/db/migrations/meta/_journal.json`. Require byte identity for all seven
  vector and five selected-or-null trigram source expressions using exact
  immutable-safe `coalesce(...) || ' ' || ...`; resolve the closed function/
  operator set with `pg_proc.provolatile = 'i'`. Require the sole deeply frozen
  `BOOKING_RESERVATION_EXCLUSION_SQL` descriptor, exact extension/add occurrence
  once, intentional exclusion-only snapshot omission, live
  `pg_constraint.contype = 'x'`, preserved `btree_gist` on rollback, and fresh
  generation with zero duplicate add or generated drop. This is one atomic 05-
  L01 schema/SQL/snapshot/journal ownership seam, not claimed Drizzle DSL support.
  Reserve one physical migration session and require L01's sole
  `createTask551ReservedDrizzleClient(poolClient,reserved)`. Direct
  `drizzle(reserved)` is invalid on postgres.js 3.4.9; only
  `drizzle(adaptedReserved)` reaches Drizzle 0.45.2. Pin callable forwarding and
  `.unsafe()`/`.values()` parity on the reserved handle, identical immutable pool
  `.options` with shared parser/serializer maps, same-handle empty-option
  `.begin`, and zero pool SQL/`begin`/`.unsafe()` dispatch after reserve.
  Exactly three custom GUCs remain: `coderso.task551_operation_id`,
  `coderso.task551_receipt_v2`, and `coderso.task551_receipt_sha256`. One PID
  spans GUC set, guard, DDL, receipt, and journal; success proves RESET/same-
  PID/one-release/normal-end, while unknown transaction/cleanup state poisons
  and hard-ends without release. Static SQL validates the SHA-256-bound
  canonical v2 receipt (1..65,536 UTF-8 bytes) inside the migrator transaction;
  clean/prior/replay/reverse, failure rollback, and repeat/status gates pass.
- Require the closed index catalog, including all form/booking/list/retention
  members and assistant-ingest `started_at`. Pin `pages_author_list_updated_id_idx`,
  entry/typed-entry/post author composites, role-leading
  `user_roles_role_user_idx`, webhook list/delivery composites,
  `page_revisions_page_kind_version_id_idx`, and `posts_tags_gin_idx`/
  `media_tags_gin_idx`/`webhooks_events_gin_idx` as `jsonb_path_ops` GIN against
  their exact predicates. Pin `cache_outbox_unprocessed_age_idx(created_at,id) WHERE
  processed_at IS NULL` and `readOldestUnprocessedAge` fingerprint
  `cache_outbox_oldest_unprocessed`: exact created-at/id `LIMIT 1` includes
  claimed/backed-off rows, with 1k/100k EXPLAIN and write-budget evidence. Require
  one version-2 `rollout-forward`: exact app-name activity drain, transactional
  expand, then durable page/content/widget integrity barrier. The old
  `max(version)+1` binary never resumes. External mode admits only the compatible
  TASK-551 binary while read indexes build; offline-single remains cold through
  final catalog; first new-binary traffic makes recovery forward-fix only.
  Transactional SQL creates no index; repeat rollout-forward zero-DDL/transition,
  then verify `status` and concurrent-drop/GiST recovery.
- Lifecycle evidence proves 02-L02 solely owns `runtimeEntrypoint.ts`, `prod.ts`
  and `dev.ts`; `runtimeEntrypoint.ts` alone calls lifecycle start/close and owns
  signals, listen and graceful-at-most-10-second then forced HTTP drain. Prod/dev
  only select mode, Vite is a participant, and every close receives
  `RuntimeCloseContext{absoluteDeadline,signal}`. Total shutdown is at most 15
  seconds; non-DB closes are at most 5 seconds, while DB is the sole exception
  at `min(10 seconds, remaining absolute budget)` with no outer race/detached teardown. Partial
  rollback is awaited with zero listen on startup signal/failure. No participant
  or adapter calls `server.stop`. 03 `routes/index.ts` registers the
  cursor participant at module evaluation; 08 owns only `httpServer.ts` and invokes the idempotent
  composition seam for cache/retention/existing backup without loading/injecting
  the cursor keyring or editing either entrypoint. Shutdown awaits invalidation
  `stopClaiming()`/`drain()`/`close()`, distributed coordinator, cache/store,
  then database.
  Retention lock, liveness, every batch transaction and unlock use one dedicated
  session/backend PID. Close stops ticks, aborts/cancels SQL, confirms rollback/
  termination within 4,500 ms, then permits cache/DB close. Lock loss yields only
  `retention_lock_lost`, no overlap/partial summary/detached work, under the
  shared 5-second participant ceiling.
- TTL-zero evidence proves only manifest/HTML policy/generation/store work is
  bypassed; the fixed positive `public-runtime` bootstrap policy still runs.
- Nested import/restore evidence proves one outer `eventKey` is propagated
  through `collectInvalidationTagsTx` with one persisted/applied plan. Revision
  evidence pins zero-argument `withRevisionParentLock(identity, tx, run)` and
  `allocateRevision(input, tx)`.
- TASK-551-03-L02 evidence starts only after 06-L03 and proves sole adoption of
  06-L02's page `{id,pageId,version,kind,title,slug,createdAt,createdBy:{id,name,email}|null}`
  and detail `{id,detailPageId,version,kind,createdAt,createdBy:string|null}`
  envelopes, rejecting invented `reason`, across route, schema,
  client and UI; the freshly rescanned complete eight-client consumer graph;
  bounded server-side picker/search/load-more; every named cohesive >1,000-line
  split; its two consumer-graph and five revision suites; and zero raw-array,
  auto-fetch-all, first-page-truncation or heavy-body fallback.
- It consumes current 09-L04 INITIAL installation-authority and 08-L03 INITIAL
  header-transport receipts. Every family uses L01's exact two-segment cursor and
  code-owned `KeysetSpec`; previous reverses SQL direction/null placement and
  output, and route parse/spec/signature failures map generically.
- It pins each metric-bearing Admin keyset response's exact
  `{items,nextCursor,hasMore,summary,facets}` envelope. Arbitrary filters use
  `matchingTotal:null`/`exactness:"not_computed"` and no filtered `COUNT`; fixed
  summaries and bounded author/content-type/role/folder/tag facets are exact at
  one read-only `REPEATABLE READ` authorized/parent snapshot. Facet pages use strict
  `{items,nextCursor,hasMore}`, default/max `50/100`, and no auto-fetch. Page +
  fixed aggregate + optional bounded relation-facet batch is at most three
  separately inventoried/budgeted/planned SQL statements, with no hidden page
  concatenation, per-row lookup, or authorization leakage.
- It also pins `formReadService` and exact FormListItem
  `id,name,slug,status,description,submissionAccess,updatedAt`;
  `bookingReadService` owns paginated reservations/resources/services/blackouts,
  capped-100 service-resource/schedule arrays, and 31-day/500-slot preview.
  Existing Reservations/Resources/Services tabs consume narrow items, Services
  keeps derived `submissionAccess`, edits await point detail, and Availability/
  SlotPreview use bounded pickers. Submission payload loads through one authorized
  parent-bound point query only on expansion, stays component-local/uncached, and
  aborts/clears on close/unmount/logout/auth change. Success/error headers are
  exactly `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, and
  `Expires: 0`; its client passes `cache:"no-store"`. Media summaries expose safe
  derived `name` (`originalName→title→sanitized key basename→asset`), omit raw
  key, and `media/utils.ts` consumes name directly.
  Exact extraction stems are `BookingOverviewPanel`, `MediaLibraryFolderState/Results`, `UsersRolesContent`, `DetailTemplateRevisionPanel`, `MenuDesignCanvas/Inspector/DataSources`, `MenuEditorWorkspace`, `PostEditorMediaControls`, `ContentListSource/PresentationEditors`, `CtaBannerContentEditors`, `EntryTeaserSource/PresentationEditors`, `FeatureGridItemEditors`, `FooterNavigation/BrandEditors`, `GalleryMosaicItemEditors`, `HeroContent/Media/LayoutEditors`, `LogoCloudItemEditors`, `NavigationItem/PresentationEditors`, `PostsFeedSourceEditors`, `RichTextContent/LayoutEditors`, `SectionContent/LayoutEditors`, `TeamMember/LayoutEditors`, and `TestimonialItemEditors`; gate
  the shared page-editor fixture plus all eight named split flow suites.
- Gate deletion of legacy `booking-page.test.tsx`/`media-library.test.tsx` and the
  exact fixture/suite owners: `bookingPageTestFixtures.tsx` plus booking `loading-pagination|mutations|calendar`, and `mediaLibraryTestFixtures.tsx` plus media `loading-pagination|selection-folders|upload-edit`.
- Gate Bun-free `searchHistoryContract.ts` and its direct Vitest, deletion of the
  real private `pruneHistory` declaration/call, and actor/UUIDv5-idempotent
  `recordSearch`. Search GETs perform zero writes; sole internal POST
  `/admin/api/search/history` uses session actor, `content:read`, CSRF,
  `admin_write`, strict four-key body and 409 conflict. `searchClient`/
  `useSearchResults` reuse one UUID per UI intent/retry; no public/API-key/GET mutation alias exists.
- Search v1 has no cursor. Five arms each cap exact-email→FTS→non-overlapping
  trigram at 51 candidates; at most 255 enter global tier-first dedup/rank and
  51 leave. L02 imports L01's `buildTask551PrefixTsquery` and constants read-
  only, binds literal `to_tsquery('simple',$1)` once in an input CTE, and reuses
  that tsquery for both assistant vector predicates/ranks. `expandedTerms`
  remains reranker-only. Shared NFKC/Unicode/punctuation plus 2/200-code-point,
  800-byte, 16-token, and 64-code-point-per-token bounds reject local parsers,
  raw interpolation, `websearch_to_tsquery`, `plainto_tsquery`, or a second
  tsquery bind. Trigram uses GIN `%` after static transaction-local
  `SET LOCAL pg_trgm.similarity_threshold='0.300'`; no LIKE/ILIKE/regex fallback.
  Per-arm plan budgets ignore final top-k survival.
- Analytics upgrade evidence pins only `ANALYTICS_RETENTION_DAYS` for age and its
  complete `Number(raw)` truth table:
  absent/malformed/non-finite resolves to 365; finite values floor then clamp to
  `30..1095`; `RETENTION_ANALYTICS_ENABLED` alone controls enablement; both
  unsupported `RETENTION_ANALYTICS_*DAYS` aliases reject. Every present
  `ANALYTICS_PRUNE_INLINE_DISABLED` and `ANALYTICS_PRUNE_INLINE_ENABLED` string
  has its separate warning-once code without logging values; neither changes
  behavior. With exact lowercase `RETENTION_DRY_RUN=true`, direct service calls
  have no scheduler advisory; scheduled use takes exactly one replica advisory
  before the same bounded reads. Both perform no destructive row lock, mutation,
  publication or progress write. Request writes execute zero prune. Page autosave
  parent-locks, reads only latest autosave by version/id, reuses equal normalized
  data with zero write, or allocates and deletes only that exact predecessor.
  Older history is scheduler-only; 100k history/50 writers pin two/six statements.

### Bounded-eventual public-cache consistency

- Public Redis cache coherence is explicitly bounded-eventual, not linearizable.
  When Redis is globally unavailable, both processes must bypass cache and read
  PostgreSQL/render. During ambiguous or partial generation delivery, a safe
  public old-generation value may remain observable until the outbox worker
  delivers the bump or the measured policy TTL expires.
- The healthy worker poll interval is at most 250 ms and healthy committed-public
  invalidation lag must meet p99 at most 1 second. Oldest pending or locally known
  incoherent age strictly above 5 seconds raises an alert, degrades readiness,
  and forces affected-family cache bypass until recovery.
- Every affected policy's hard TTL is measured and recorded. Public HTML is at
  most 600 seconds and no server-cache policy exceeds 3,600 seconds; the smoke
  records both observed invalidation lag and the applicable hard ceiling.
- Admin post-write preview/readback bypasses shared public cache and provides
  read-after-write. Private/password, auth/RBAC, security settings, drafts,
  previews, and nonce-bearing data remain fail-closed and DB-authoritative; no
  stale public-cache allowance applies to them.

### Security

- Scan keys, strict envelopes, cache values, Pub/Sub, outbox rows, telemetry,
  logs, EXPLAIN/evidence, and persisted smoke JSON for forbidden secrets/PII.
- Prove private/password/draft/preview/nonce-bearing/session/auth/RBAC and
  cross-identity Admin values never enter a shared cache or survive an identity/
  permission-epoch transition.
- Prove Admin keys/envelopes/events bind deployment digest, random 128-bit tab
  incarnation, distinct deployment-audience auth-generation nonce, monotonic
  auth epoch/installation token, user and permissions. INITIAL authority fences
  every delayed 03/04 client installation; FINAL's exhaustive module manifest
  resets/fences every cache/promise/map/read-through/prefetch registry. Cross-tab
  storage order is authoritative, BroadcastChannel is wakeup only; storage
  failure forces persistent misses and no auth payload changes.
- Pin fixed-order UTF-8 JSON deployment `{v:3,origin,adminBasePath,
  entryModulePath}` and `AdminCacheScopePreimageV3`
  `{v,deploymentIdentity,authIncarnation,authGenerationNonce,authEpoch,userId,
  permissions,roles}`. Pin 367-byte digest
  `6c69458d5fdc22634a5fca20609e3accb4a6fe606905af2b2c522900770afbf7` and
  nonce-only `222...` digest
  `4214d494f425d2f595de703cd19662a2513d0d85871bff748bdb5d5cb728611d`;
  rotation rejects old storage/events/delayed installs. Arrays stay separately
  normalized/sorted; caps apply and delimiter concatenation is forbidden.
- Prove decrypted or secret-bearing `SecuritySettings` never enters memory,
  Redis, browser cache, outbox, or smoke evidence; reads remain DB-authoritative
  while only finite generation/coherence metadata or typed redacted projections
  may use cache infrastructure.
- Prove commerce product data, form/booking submission nonces, booking slots
  token, analytics beacon nonce, request-scoped token, and unknown dynamic
  dependency create no manifest/envelope; every dynamic dependency is tagged,
  gated, or exactly excluded, and public write defenses execute before cache.
- Prove method+URL dispatch covers the complete booking/Forms/analytics API
  surface before cache normalization/read/write: every booking path/method
  including slots GET, Forms submission/upload at every method, and analytics
  beacon at every method. Handler security/method behavior remains authoritative;
  only unmatched GET/HEAD enters cache and each request reads SecuritySettings once.
- Race settings partial writes under `SET LOCAL lock_timeout='2s'` and advisory
  `(551,904)` before same-tx merge/write. Pin preserved disjoint fields, Redis
  exactly-one outbox row, memory zero rows plus exactly one awaited post-commit
  bump, exact `settingsRoutes.ts` redacted 409 conflict mapping, and observation/
  fence before return. Assert form actions never enter render dependency,
  invalidation, manifest or tag surfaces.
- Exercise hit, miss, Redis outage, reconnect, and stale-generation paths without
  bypassing current auth, CSRF, rate-limit, nonce/HMAC, CAPTCHA, or bot policy.
- Assert arbitrary Redis commands/keys and unknown cache/cursor fields never
  cross a route boundary.

## Required Two-Process Redis Real Flows

`scripts/task551-redis-smoke.ts` starts two independent Coderso server processes
(`processA` and `processB`) on task-owned ports. They share PostgreSQL and one
real Redis namespace, but not process memory. Restart from current built/source
bytes before the smoke; no hot-reload process qualifies. Run these exact ordered
scenario IDs:

1. `cross-process-warm-public-query-budget` — A fills one safely eligible
   structurally non-mutable response; B serves identical bytes with exactly one
   authoritative SecuritySettings query and no process-local persistent value or
   other query. Mutable detail/list requests each total two queries: security plus
   their one bounded root+nested validator, with zero other reads/value GETs and
   exact 128-tuple/16,384-byte/101-root caps.
2. `post-commit-generation-and-rollback` — A commits an update and B observes the
   new value after waiting for bounded outbox/generation recovery and records the
   observed lag; a rolled-back update emits no generation/outbox change and B
   retains the authoritative committed value. The scenario does not assert
   immediate cross-process linearizability.
3. `redis-outage-outbox-recovery` — Redis becomes unavailable around a committed
   mutation; while Redis is globally unavailable both processes bypass to
   PostgreSQL and the API keeps the committed result. For ambiguous/partial
   delivery the test permits only safe public old-generation data within the
   declared lag/TTL model, asserts the 5-second alert/readiness behavior, waits
   for reconnect plus durable outbox delivery, then requires B to return the new
   value and records the recovery lag. It never claims linearizability.
4. `distributed-lease-and-stale-fill` — simultaneous cold requests from A and B
   produce the bounded loader count promised by the lease contract; a generation
   change during fill rejects stale publication, and token-mismatched release
   cannot delete another holder's lease.
5. `security-private-and-nonce-isolation` — both processes exercise public,
   private/password, preview, and nonce-bearing server paths, including a primed
   public entry transitioned to restricted access; restricted bodies,
   secrets and nonce output never appear in shared keys/values or the other
   process's response. Admin browser identity/permission-epoch behavior remains
   the independently run TASK-551-09-L04 Vitest contract, not a claim made by
   this non-browser smoke.

Every scenario uses real HTTP/runtime entry points, asserts response/DOM or
persisted state plus exact query/cache/invalidation telemetry, and cleans only
owned rows/keys/processes/ports in `finally`. Zero unhandled process errors are
allowed. Because this is a non-UI infrastructure smoke, the structured
`screenshots` array is exactly empty.

## Required Admin List UI Smoke

Restart the app and use `playwright-cli -s=wf55103l02` to run, in order,
`pagination-next-previous`, `filter-reset`, `equal-sort-boundary`,
`booking-dirty-refresh`, and `extracted-views`. Each scenario must assert the
TASK-551-03-L02 visible DOM/geometry/ARIA effect in both light and dark mode,
save the two exact screenshots declared in this leaf, and leave the console-error
array empty. The fifth scenario covers Booking, Media, and Users/Roles extracted
surfaces. Validate `Task551AdminListUiSmokeEvidenceV1`; missing mode, screenshot,
visible-effect assertion, scenario, or a console error fails the aggregate gate.

## Structured Evidence

Write exactly one final
`_docs/_workflows/_smoke/task-551/runtime/redis-smoke-v1.json` conforming to
`Task551RedisSmokeEvidenceV1` from TASK-551-10. The gate runner additionally
emits `.tmp/task-551/aggregate-gates-v1.json` using
`Task551AggregateGateEvidenceV1`. Both reject unknown fields, scenario
duplicates/reordering, non-finite/negative metrics, raw namespace/URLs, unknown
commands, required skips, and evidence above the bounded size declared by the
harness.

The tracked smoke evidence contains only version, digests, bounded aggregates,
the exact `publicConsistency` SLO/TTL constants, assertion IDs, and pass/failure
summaries. It contains no response body, raw Redis key, SQL, bind, cookie, header,
credential, path with user data, or raw log.

## Security Contract

- **Visibility/routes:** no route changes; only existing public reads and
  authenticated Admin paths are invoked.
- **Auth/RBAC:** use synthetic least-privileged sessions plus one scoped Admin
  fixture; prove identity and permission-epoch separation. Never persist session
  or CSRF material.
- **CSRF/rate limit/anti-abuse:** existing writes retain CSRF and current buckets;
  public-write probes retain nonce/HMAC/CAPTCHA. Cache failures cannot bypass
  them.
- **Validation:** strict command/profile/scenario/evidence allowlists and all
  parent clamps apply. Unknown fields and duplicate IDs fail before execution.
- **DB/Redis:** isolated fixtures and exact-key cleanup only. Connections have
  bounded connect/command/query/idle timeouts and close in `finally`.
- **Secrets/privacy:** redact before any output; any forbidden pattern blocks the
  evidence write and closure.

## Implementation Pseudocode

```ts
async function runTask551AggregateGates(deps: GateDeps): Promise<GateEvidence> {
  const budgets = await deps.loadAndValidateFrozenTask551Budgets();
  await deps.requireCurrentFinalQueryInventoryReceipt();
  await deps.requireInfrastructureAndOwnerReceipts();
  const profiles: ProfileEvidence[] = [];
  for (const profile of ["small", "large"] as const) {
    for (const scenario of budgets.mappedInventoryScenarios(profile)) {
      const fixture = await deps.seedOwnedFamilyFixture(profile, scenario);
      try {
        profiles.push(await deps.measureAgainstFrozenBudget(fixture, scenario));
      } finally {
        await deps.cleanupExactFamilyFixture(fixture);
      }
    }
  }
  const adminListUi = await deps.runAndValidateAdminListUiSmoke({
    session: "wf55103l02", scenarios: 5, themes: ["light", "dark"],
  });
  const matrices = await deps.runFaultSecurityAndTwoProcessRedisFlows();
  return deps.normalizeAggregateEvidence({ profiles, adminListUi, matrices });
}
```

**Data flow:** frozen budgets + current post-09 final inventory receipt + exact
owner receipts/command manifests → reachability/version preflight → one owned
small/large family fixture at a time → measured Bun/DB/cache matrices → fresh
Admin UI visible-effect smoke → two fresh processes + real Redis scenarios →
sanitized strict evidence → release-gate registration and post-audit handoff.

**Error handling:** unavailable infrastructure, required skip, budget regression,
unexpected plan/query count, malformed evidence, process error, leaked secret,
or incomplete cleanup returns `{ pass:false }`, preserves diagnostic IDs without
sensitive bytes, and blocks closure. Source correction is delegated to the
original owner; this leaf never changes a production assertion to pass.

**Regression-test shape:** test harness self-tests reject fake Redis, one-process
execution, reordered/missing scenarios, unbounded cleanup, raw namespace/URL,
non-finite metrics, unknown evidence fields, required skips, missing/non-zero-
discovery owner command receipts, and evidence writes after failed cleanup. Gate-
runner tests prove the new performance, security, and reliability commands are
release-blocking without moving direct-suite ownership from TASK-551-09.

## Testing Requirements

- Require TASK-551-01-L01's fresh `phase: "final"` exact-set receipt before any
  gate and fail on an initial/stale digest or nonzero planned-delta count.
- Run every performance, fault, security, full-suite, and two-process Redis lane
  below with real required infrastructure and no required skip.
- Run all five Admin-list Playwright scenarios in both themes; validate ten
  non-empty screenshots, visible-effect assertions, and zero console errors.
- Count every touched production/test file from the verified family baseline and
  fail any human-authored file above 1,000 physical lines.
- Validate four ordered TASK-551-09 owner command manifests against the literal
  blocks below. Every command has exact argv, exit code zero and `skipped=false`;
  every test command reports positive discovery. The leaf remains the direct-
  suite owner; this aggregate leaf consumes the receipt and never edits or
  rebaselines those files.

### Exact TASK-551-09 Owner Command Manifests

Canonicalize these blocks to argv arrays and compare their SHA-256 digests with
the four ordered owner receipts. Environment values are never included in the
digest or evidence.

TASK-551-09-L01:

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/site/public-site-cache-read-models.test.ts \
  tests/vitest/content/entry-visibility-gate.test.ts \
  tests/vitest/content/entry-unlock-token.test.ts
SERVER_CACHE_BACKEND=memory bun test \
  tests/unit/site/cache.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts \
  tests/integration/runtime/public-nested-content-cache-gate.test.ts \
  tests/integration/server/entry-access-password-hash.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l01 bun test \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts \
  tests/integration/runtime/public-nested-content-cache-gate.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts
bun test tests/unit/server/publicBookingApi.test.ts \
  tests/unit/server/publicFormsApi-routing-errors.test.ts \
  tests/unit/server/publicFormsApi-public-access-rate.test.ts \
  tests/unit/server/publicFormsApi-internal-auth.test.ts \
  tests/unit/server/publicFormsApi-payload-descriptors.test.ts \
  tests/unit/server/publicFormsApi-database.test.ts \
  tests/integration/routes/bookingRoutes.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/server/formsWriteMounts-routing.test.ts \
  tests/integration/server/formsWriteMounts-upload-errors.test.ts \
  tests/integration/server/formsWriteMounts-auth-media.test.ts \
  tests/integration/routes/publicAnalytics.test.ts \
  tests/security/analyticsBeacon.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/server/publicSite.tsx core/server/publicSiteRenderer.tsx \
  core/server/publicSiteCacheReadModels.ts core/server/publicSiteRenderDependencies.ts \
  core/services/content/publicContentVisibilityGateRead.ts \
  core/site/cache/siteCache.ts \
  tests/unit/site/cache.test.ts \
  tests/vitest/site/public-site-cache-read-models.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts \
  tests/integration/runtime/public-nested-content-cache-gate.test.ts \
  tests/vitest/content/entry-visibility-gate.test.ts \
  tests/vitest/content/entry-unlock-token.test.ts \
  tests/integration/server/entry-access-password-hash.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts \
  tests/unit/server/publicBookingApi.test.ts \
  tests/unit/server/publicFormsApiTestFixtures.ts \
  tests/unit/server/publicFormsApi-*.test.ts \
  tests/integration/routes/bookingRoutes.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/server/formsWriteMountsTestFixtures.ts \
  tests/integration/server/formsWriteMounts-*.test.ts \
  tests/integration/routes/publicAnalytics.test.ts \
  tests/security/analyticsBeacon.test.ts
```

TASK-551-09-L02:

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/cache/content-mutation-invalidation.test.ts \
  tests/vitest/seo/seoSearchPerformanceTypes.test.ts \
  tests/vitest/seo/sitemapBuilder.test.ts \
  tests/vitest/seo/seoPerformanceAggregation.test.ts
SERVER_CACHE_BACKEND=memory bun test \
  tests/integration/runtime/site-cache-page-entry-invalidation.test.ts \
  tests/integration/runtime/site-cache-post-seo-invalidation.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts \
  tests/integration/runtime/pages-runtime-rendering.test.ts \
  tests/integration/runtime/pages-runtime-collections.test.ts \
  tests/integration/runtime/pages-runtime-routing-preview.test.ts \
  tests/integration/runtime/pages-runtime-responsive-cache.test.ts \
  tests/unit/pages/pageService.test.ts \
  tests/unit/content/entryService.test.ts \
  tests/unit/content/entryServiceMetadataAndRelations.test.ts \
  tests/unit/content/entryServiceVisibilityAndRevisions.test.ts \
  tests/unit/content/postsService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/unit/seo/seoServicePersistence.test.ts \
  tests/integration/posts/posts-revisions-flow.test.ts \
  tests/integration/integrations/gscClient.test.ts \
  tests/integration/routes/sitemap.test.ts \
  tests/integration/routes/seo-sitemap.test.ts \
  tests/integration/routes/seo-sync.test.ts \
  tests/integration/routes/seo-performance.test.ts \
  tests/integration/routes/seo-pipeline.test.ts \
  tests/integration/routes/seo.test.ts \
  tests/security/gsc-credential.test.ts \
  tests/security/seo-sitemap.test.ts \
  tests/security/seo-sync.test.ts \
  tests/security/seo-pipeline.test.ts \
  tests/perf/seo-sitemap.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l02 bun test \
  tests/integration/runtime/site-cache-page-entry-invalidation.test.ts \
  tests/integration/runtime/site-cache-post-seo-invalidation.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/pages/pageService.ts \
  core/services/content/{entryService,entryServiceContract,entryPersistence,entryMutationService,entryRevisionService,postsService,postDocumentContract,postMutationService,postRevisionService}.ts \
  core/services/seo/seoService.ts core/services/cache/contentMutationInvalidation.ts \
  tests/unit/pages/pageService.test.ts \
  tests/unit/content/{entryService,entryServiceMetadataAndRelations,entryServiceVisibilityAndRevisions}.test.ts \
  tests/unit/content/postsService.test.ts \
  tests/unit/seo/{seoService,seoServicePersistence}.test.ts \
  tests/integration/posts/posts-revisions-flow.test.ts \
  tests/vitest/cache/content-mutation-invalidation.test.ts \
  tests/integration/runtime/site-cache-{page-entry,post-seo}-invalidation.test.ts \
  tests/integration/runtime/pages-runtime-fixtures.ts \
  tests/integration/runtime/pages-runtime-rendering.test.ts \
  tests/integration/runtime/pages-runtime-collections.test.ts \
  tests/integration/runtime/pages-runtime-routing-preview.test.ts \
  tests/integration/runtime/pages-runtime-responsive-cache.test.ts \
  tests/vitest/seo/{seoSearchPerformanceTypes,sitemapBuilder,seoPerformanceAggregation}.test.ts \
  tests/integration/integrations/gscClient.test.ts \
  tests/integration/routes/{sitemap,seo-sitemap,seo-sync,seo-performance,seo-pipeline,seo}.test.ts \
  tests/security/{gsc-credential,seo-sitemap,seo-sync,seo-pipeline}.test.ts \
  tests/perf/seo-sitemap.test.ts
```

TASK-551-09-L03:

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/cache/site-dependency-invalidation.test.ts \
  tests/vitest/cache/redirect-cache-policy.test.ts
SERVER_CACHE_BACKEND=memory bun test \
  tests/integration/runtime/site-shell-cache-invalidation.test.ts \
  tests/integration/runtime/site-routing-cache-invalidation.test.ts \
  tests/integration/runtime/site-form-listing-cache-invalidation.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/site-shell-runtime.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts \
  tests/unit/menus/menuService.test.ts \
  tests/unit/pages/pageTemplateLibraryService.test.ts \
  tests/unit/pages/publicSiteShell.test.ts \
  tests/unit/themes/themeProfileService.test.ts \
  tests/unit/settings/settingsService.test.ts \
  tests/unit/redirects/redirectService.test.ts \
  tests/unit/forms/formsService.test.ts \
  tests/unit/content/listingQueriesService.test.ts \
  tests/unit/content/listingTemplatesService.test.ts \
  tests/unit/tools/importExport.test.ts \
  tests/integration/routes/importExport.test.ts \
  tests/unit/content/detailPageDocumentService.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l03 bun test \
  tests/integration/runtime/site-shell-cache-invalidation.test.ts \
  tests/integration/runtime/site-routing-cache-invalidation.test.ts \
  tests/integration/runtime/site-form-listing-cache-invalidation.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/{menus/menuService,pages/pageTemplateLibraryService,pages/publicSiteShell,themes/themeProfileService,settings/settingsService,redirects/redirectService,forms/formsService,content/listingQueriesService,content/listingTemplatesService,content/detailPageDocumentService,tools/importExportService}.ts \
  core/services/cache/siteDependencyInvalidation.ts \
  core/services/redirects/redirectCachePolicy.ts \
  tests/unit/menus/menuService.test.ts \
  tests/unit/pages/{pageTemplateLibraryService,publicSiteShell}.test.ts \
  tests/unit/themes/themeProfileService.test.ts \
  tests/unit/settings/settingsService.test.ts \
  tests/unit/redirects/redirectService.test.ts \
  tests/unit/forms/formsService.test.ts \
  tests/unit/content/{listingQueriesService,listingTemplatesService}.test.ts \
  tests/unit/tools/importExport.test.ts \
  tests/integration/routes/importExport.test.ts \
  tests/unit/content/detailPageDocumentService.test.ts \
  tests/vitest/cache/site-dependency-invalidation.test.ts \
  tests/vitest/cache/redirect-cache-policy.test.ts \
  tests/integration/runtime/site-shell-cache-invalidation.test.ts \
  tests/integration/runtime/site-routing-cache-invalidation.test.ts \
  tests/integration/runtime/site-form-listing-cache-invalidation.test.ts \
  tests/integration/runtime/site-shell-runtime.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts
```

TASK-551-09-L04:

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

## Exact Validation Commands

Load repository environment for every DB/settings command, but never print it:

```bash
set -a && source .env && set +a
bun --cwd core lint:types
bun --cwd core lint
bun scripts/task-551-query-inventory.ts --check --phase final
bun test tests/perf/database-pg-stat-interval.test.ts
bunx vitest run tests/vitest/db/databaseConfig.test.ts \
  tests/vitest/db/queryFingerprintRegistry.test.ts \
  tests/vitest/db/databaseApplicationIdentity.test.ts
bun test tests/integration/server/task551DatabaseLifecycle.test.ts \
  tests/integration/server/task551RuntimeEntrypoints.test.ts \
  tests/perf/database-pool-telemetry.test.ts
bunx vitest run tests/vitest/db/schemaExports.test.ts \
  tests/vitest/db/searchVectorDefinitions.test.ts
bun run db:generate
bun test tests/integration/server/task551SchemaMigrationParity.test.ts \
  tests/integration/server/task551SearchVectorMigration.test.ts \
  tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts \
  tests/integration/server/task551IndexAndConstraintCatalog.test.ts \
  tests/integration/server/task551OnlineIndexDeployment.test.ts \
  tests/perf/database-index-write-overhead.test.ts \
  tests/perf/database-explain-plans.test.ts \
  tests/integration/server/task551ConcurrencyConstraints.test.ts
TASK551_OFFLINE_SINGLE_ACK=all-coderso-processes-stopped bun scripts/task-551-online-indexes.ts rollout-forward --receipt .tmp/task551-migration-receipt.json --admission-mode offline-single
TASK551_OFFLINE_SINGLE_ACK=all-coderso-processes-stopped bun scripts/task-551-online-indexes.ts rollout-forward --receipt .tmp/task551-migration-receipt.json --admission-mode offline-single
bun scripts/task-551-online-indexes.ts status --receipt .tmp/task551-migration-receipt.json
bunx vitest run tests/vitest/maintenance/retentionPolicy.test.ts \
  tests/vitest/search/searchHistoryContract.test.ts
bun test tests/unit/access/accessLogService.test.ts \
  tests/unit/audit/auditService.test.ts \
  tests/unit/search/searchHistoryService.test.ts \
  tests/integration/server/task551ActionExecutionStore.test.ts \
  tests/integration/analytics/trafficRepository.test.ts \
  tests/integration/analytics/trafficRetention.test.ts \
  tests/integration/server/task551AppendHeavyRetention.test.ts \
  tests/perf/database-retention-batches.test.ts
bunx vitest run tests/vitest/database/revisionAllocation.test.ts \
  tests/vitest/maintenance/partitionReadinessService.test.ts
bun test tests/unit/pages/revisionService.test.ts \
  tests/unit/widgets/widgetTemplateRevisionService.test.ts \
  tests/unit/content/detailPageRevisionService.test.ts \
  tests/integration/server/task551RevisionConcurrency.test.ts \
  tests/integration/server/task551RevisionRetention.test.ts \
  tests/perf/database-revision-budgets.test.ts \
  tests/integration/runtime/retentionScheduler.test.ts \
  tests/integration/server/task551RetentionJobService.test.ts \
  tests/perf/database-retention-jobs.test.ts \
  tests/perf/database-partition-readiness.test.ts
bun scripts/task-551-partition-readiness.ts --check
bun test --timeout 120000 tests/perf/task551DatabaseCachePerformanceGate.test.ts
bun test --timeout 120000 tests/integration/runtime/task551ServerCacheFaultMatrix.test.ts
bun test --timeout 120000 tests/security/task551ServerCacheSecurityGate.test.ts
bun test --timeout 180000 tests/integration/runtime/task551TwoProcessRedisSmoke.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-test REDIS_URL="$REDIS_URL" bun scripts/task551-redis-smoke.ts
playwright-cli -s=wf55103l02
bun run test:vitest -- \
  tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts \
  tests/vitest/cache/memory-server-cache-store.test.ts \
  tests/vitest/cache/server-cache-coordinator.test.ts
bun run test
bun run test:coverage
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
git diff --check
```

The script derives a random run suffix below the literal test prefix; the
literal command value is not the final shared namespace. Verify `DATABASE_URL`
and `REDIS_URL` reachability before the full commands. A missing required service
blocks rather than skips. Re-run any named failure once in isolation before
classification. The exact 02/05/06 commands above are read-only aggregate
reproofs. TASK-551-09 paths are validated through the four exact owner manifests
and the broad full gate; their targeted ownership does not move to this leaf.
The aggregate Vitest harness must assert that every five named cache files exists
and that discovery/execution counts are non-zero; an empty selection is a failure.

Before handoff, count every production and test file touched from the verified
pre-family baseline; any human-authored file over 1,000 physical lines fails.

## Documentation Updates Required

None in this leaf. TASK-551-10-L02 consumes the gate/smoke receipts and is the
sole final documentation and metadata writer.
