# TASK-551-10-L02: Documentation, Runbooks, and Family Closure
# FileName: TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md

**Parent Subtask:** TASK-551-10
**Priority:** High
**Category:** Documentation / Operations / Task Board / Changelog / Closure
**Estimated Effort:** Large
**Dependencies:** exact compile-green owner sequence
TASK-551-01 → 02 → 08-L03 INITIAL → 05 → 03-L01 → 06-L01/L02/L03 →
07-L01 → 09-L04 INITIAL → 03-L02 → 03-L03 → 04 → 07-L02 →
08-L01/L02/L03 FINAL → 09-L01/L02/L03/L04 FINAL →
01-L01 final refresh complete;
TASK-551-10-L01 aggregate/full gates and Redis smoke PASS; TASK-551-11 post-
audit plus fresh final-drift PASS; every production owner terminal-ready with no
unresolved finding
**Status:** ⏳ To Do
**Changelog:** 1263 pinned (closure only)

---

## Overview

Publish the final database-performance and server-cache sources of truth,
document safe small-site and multi-replica operations, record measured outcomes
and collision handoffs, then close all 37 physical TASK-551 tasks and changelog
1263 without reopening any production, test, migration, gate, or workflow
contract.

This is the only TASK-551 status/board/changelog writer. It consumes immutable
current receipts from L01 and TASK-551-11. If documentation discovers a behavior
that the receipts or current source cannot prove, closure stops and returns the
issue to the exact owning leaf; L02 never changes product code or weakens copy to
hide the gap.

## Sub-Tasks

None; this is the executable documentation and terminal-metadata closure leaf.

## Exact Single-Writer Ownership

Final source-of-truth documentation:

- `_docs/DATABASE_PERFORMANCE.md` (new);
- `_docs/SERVER_CACHE.md` (new);
- `.env.example` (sole TASK-551 writer, only after TASK-511-07 is terminal and
  its final bytes are re-read);
- `README.md`;
- `_docs/ARCHITECTURE.md`;
- `_docs/CMS_API.md`;
- `_docs/SEARCH_SPEC.md`;
- `_docs/ORM_SPEC.md`;
- `_docs/DATA_MODEL.md`;
- `_docs/TESTING_STRATEGY.md`;
- `_docs/SECURITY_SPEC.md`;
- `_docs/CODERSO_RELEASE_GATES.md`;
- `_docs/ADMIN_CACHE.md`;
- `_docs/ADMIN_CACHE_MAP.md`;
- `docs/develop/getting-started.md`;
- `docs/develop/architecture.md`;
- `docs/develop/runtime-model.md`;
- `docs/develop/security.md`;
- `docs/develop/testing.md`.

Closure metadata:

- status/completion fields only in every `TASK-551*.md` file;
- the TASK-551 row and exact statistics deltas in `_docs/_TASKS/README.md`;
- `_docs/_CHANGELOG/1263-<closure-date>-task-551-scalable-database-query-and-cache-optimization.md`;
- the single matching 1263 index row and next-free pointer in
  `_docs/_CHANGELOG/README.md`.

Before editing a shared doc or index, read its current bytes and active owner
state. TASK-547/TASK-548 or another active task with the same literal path must
be terminal or provide an explicitly serialized handoff. Wildcard ownership is
not sufficient. For `.env.example`, TASK-511-07 must be terminal; an active
handoff does not authorize TASK-551 to write that literal file.

Forbidden paths are all `core/**`, `tests/**`, `scripts/**`, `.github/**`,
database migrations, runtime smoke evidence, workflow/audit evidence, and task
contract bodies beyond exact status/completion metadata. L02 does not re-run a
formatter that rewrites unrelated documentation.

## Required Documentation Content

### Database performance source of truth

`_docs/DATABASE_PERFORMANCE.md` must document:

- production query classification and inventory ownership;
- explicit projections, point/detail boundaries, keyset cursor/version rules,
  stable ordering, batch/backpressure and N+1 prevention;
- search-vector/trigram ownership and exact query/index alignment;
- constraints, index ordering/selectivity/write amplification, FK access paths,
  safe index removal evidence, and sanitized EXPLAIN workflow;
- transaction-handle discipline, concurrency patterns, expected error mapping,
  after-commit/outbox rules, and bounded retry;
- exactly one outer transaction `eventKey` propagated through nested
  `collectInvalidationTagsTx` collectors, with no nested key/plan/application;
- the exact revision APIs `withRevisionParentLock(identity, tx, run)` (zero-
  argument `run` closes over `tx`) and `allocateRevision(input, tx)`;
- pool/cluster budgets, PgBouncer mode, timeouts, cancellation/shutdown, and
  sanitized observability using a known statistics interval;
- retention/pruning schedules, archive/partition thresholds, VACUUM/ANALYZE,
  migration locking/backfill/deploy/recovery, backup interaction, and rollback/
  forward-fix runbooks, always naming the canonical journal as
  `core/db/migrations/meta/_journal.json`;
- frozen small/large fixture profiles, budget measurement method, current
  measured results, alert thresholds, and safe troubleshooting.
- TASK-551-01's exact one-family-at-a-time target/support counts, UUIDv5/timestamp
  recipe, small/large pool `2/10`, three repetitions of `5` warmups + `30`
  samples, `20/100` calibration, p95 spread denominator `max(median,0.1)` with
  all-zero special case, `20%` cap, `0.80..1.20` normalization, and
  `ceilToTenth(max(floor, median*1.25))` freeze formula; normal runs consume the
  stored numeric ceilings and never freeze again;
- all deterministic fixture distributions, ten-row equal-sort timestamps, unique
  append timestamps, and exact per-family integer common/rare search counts plus
  hidden/miss zero; search fixture counts are never derived by percentage;
- summary/facet `asOf=2026-01-15T12:00:00.000Z`; submission ordinal-divisible-by-
  four 1..6-day and remaining 8..37-day timestamp exceptions with exact rolling-
  seven-day `500/25,000` and spam `200/10,000`; booking UTC/New_York/Tokyo and
  modulo-100 same-day-past/same-day-future/next-1..40/prior-1..40 recipe, +60-
  minute end, today `400/20,000`, upcoming/past-current `1,000/50,000` each;
- the exact author/type-author/role/tag, webhook event/delivery, latest-autosave
  and 128-tuple/101-root/16,384-byte public-dependency cases; the `2036-01-01`
  retention clock, literal missing-family cutoff/anchor/child-first counts and
  `499/500/501/2,000/2,001` batch edges;
- TASK-551-02's one shared fleet parser: runtime `1..256` default `1`, worker
  `0..256` default `0`, pool default `10`, migration reserve `3`, default planned
  `1*10 + 0*10 + 3 = 13`, strictly below validated server availability; exact
  lifecycle APIs, default Bun lifecycle path
  `tests/integration/server/task551DatabaseLifecycle.test.ts`,
  `tests/integration/server/task551RuntimeEntrypoints.test.ts`,
  `2_000/5_000/10_000/15_000 ms` plus 10-second DB-close deadlines, and exact
  fixed telemetry cardinality from six families, five outcomes, 12 duration and
  nine returned-row cells including overflow: `3_240` cells per fingerprint
  plus `44` pool cells, saturating counters, deterministic snapshot/reset, and
  opt-in measurement/pool probes. Its other direct paths are
  `tests/vitest/db/databaseConfig.test.ts`,
  `tests/vitest/db/queryFingerprintRegistry.test.ts`, and
  `tests/perf/database-pool-telemetry.test.ts`; name the exact registries
  `QUERY_FAMILIES`, `QUERY_OUTCOMES`, `QUERY_DURATION_BUCKET_MAX_MS`,
  `ROWS_RETURNED_BUCKET_MAX`, `POOL_WAIT_BUCKET_MAX_MS`, `POOL_OUTCOMES`,
  `MAX_QUERY_FINGERPRINTS=512`, and
  `MAX_COUNTER_VALUE=Number.MAX_SAFE_INTEGER`; document exported
  `assertMaintenanceSessionAffinity()`, `DB_MAINTENANCE_MODE=primary|direct|session`, pool max `2..4`, secret URL and budget inclusion. Primary startup never probes; disabled-scheduler `off+primary+pool1` is valid and `verifyDatabaseSessions` checks only that session. Explicit direct/session probes once at DB startup and reuses that lifecycle result; enabled scheduler awaits it before timer/listen and fails below two sessions or with transaction+primary;
- pure `databaseApplicationIdentity.ts`: strict runtime/worker kind, separate
  runtime `1..256`/worker `0..256` counts, globally unique replica IDs, and exact
  every-session `coderso:runtime|worker|maintenance:<id>` or
  `coderso:migration:<operationUuid>` names, with no host/URL/tenant/credential;
- executable sanitized known-interval `pg_stat_statements` receipts before
  prioritization and before/after comparisons, exact classes
  `application|migration|maintenance|external_diagnostic|unknown`, and no shared-
  stats reset. Record owner-supplied Render evidence only as a 4m51 full-schema
  `row_to_json(t)::text ~ ?` diagnostic UNION plus 30–60s+ `access_logs` regex
  shapes, never binds/data. Classify `external_diagnostic` only with operator
  evidence, else `unknown`; exclude from app decisions, forbid a one-off index,
  and document clean read-only/strict-timeout/prefer-replica bounded diagnostics;
- exact signal-aware dedicated-session static execute/transaction/liveness/
  cancel-and-rollback API; retention lock, all batches and unlock on one backend
  PID; abort/SQL cancel plus confirmed rollback/termination within 4,500 ms
  before cache/DB close, with `retention_lock_lost`, no overlap/partial summary/
  detached work, under the shared 5-second participant ceiling;
- TASK-551-05's exact seven vector and five trigram source bytes using
  immutable-safe `coalesce(...) || ' ' || ...`, closed
  `pg_proc.provolatile = 'i'` proof, and sole deeply immutable
  `BOOKING_RESERVATION_EXCLUSION_SQL` custom seam. Document the exact extension/
  add/drop SQL, intentional exclusion-only Drizzle snapshot omission, live
  `pg_constraint.contype = 'x'` parity, clean/prior/rollback/forward and fresh-
  generator no-add/no-drop guards. Explain that one 05-L01 writer atomically owns
  schema exports/descriptor, SQL, snapshot, journal, and tests; never claim DSL
  support that the installed Drizzle version lacks. Document one reserved
  physical session; exact GUCs `coderso.task551_operation_id`,
  `coderso.task551_receipt_v2`, `coderso.task551_receipt_sha256`; canonical
  1..65,536-byte UTF-8 v2 receipt/SHA-256; in-transaction static SQL validation;
  and clean/prior, rollback/replay, failure rollback, repeat/status/recovery gates;
- the closed form/booking/list/retention index catalog and assistant-ingest
  `started_at` expressions; exact `pages_author_list_updated_id_idx`, role-leading
  `user_roles_role_user_idx`, and `posts_tags_gin_idx`/`media_tags_gin_idx` as
  `jsonb_path_ops` GIN plus parameterized `@>` predicates. Also name the exact
  entry/typed-entry/post-author, webhook list/delivery/event and latest-autosave
  members. Include read-performance
  `cache_outbox_unprocessed_age_idx(created_at,id) WHERE processed_at IS NULL`,
  exact `readOldestUnprocessedAge`/`cache_outbox_oldest_unprocessed` query ordered
  created-at/id `LIMIT 1` over claimed/backed-off rows, plus 1k/100k EXPLAIN/write
  budgets. Document the sole version-2 `rollout-forward`: exact app-name drain,
  guarded transaction, durable revision-integrity barrier, permanent rejection
  of the old `max(version)+1` binary, compatible-binary-only external traffic
  during read-index builds, and offline-single cold through final catalog. First
  new-binary traffic makes rollback forward-fix only. Preserve numeric/crash/
  concurrent-drop gates; transaction has no index DDL. Run rollout-forward twice
  (second zero-DDL/transition), then `status`;
- TASK-551-06 analytics upgrade compatibility: only
  `ANALYTICS_RETENTION_DAYS`, absent/malformed/non-finite → 365, finite floor+
  clamp `30..1095`, enablement only through `RETENTION_ANALYTICS_ENABLED`, both
  unsupported age aliases rejected, the complete `Number(raw)` truth table, and
  every present `ANALYTICS_PRUNE_INLINE_DISABLED` or
  `ANALYTICS_PRUNE_INLINE_ENABLED` value a separate raw-value-free warning-once
  no-op; strict global `RETENTION_DRY_RUN` accepts only lowercase `true|false`;
  direct dry-run takes no scheduler lock, scheduled use takes exactly one replica
  advisory lock, and neither takes destructive row locks or mutates/publishes/
  persists; analytics request writes execute zero inline prune SQL;
- the initial and post-09 final TASK-551-01-L01 inventory phases, the final
  exact-set receipt, and the rule that later callers never become artifact writers.
  Initial is 34 planned fingerprints: 32 named Admin plus
  `cache-outbox-oldest-unprocessed` and `public-html-dependencies-128`. The plan
  registry is 37 IDs/38 cases/76 small+large receipts: those 32 once plus
  `webhooks-created-keyset`, `webhook-deliveries-parent-keyset`,
  `webhooks-event-batch`, `page-latest-autosave`, and the outbox fingerprint.

`_docs/CMS_API.md` must document the shipped bounded Admin list query contracts:
the exact two-segment cursor, code-owned typed `KeysetSpec`, previous-page SQL/
output reversal, generic public parse/spec/signature error mapping, limit fields, narrow list
projections, unchanged auth/RBAC/CSRF/rate-limit behavior, and the exact affected
Admin endpoints from TASK-551-03-L02. For every metric-bearing keyset response, document the exact
`{items,nextCursor,hasMore,summary,facets}` envelope: arbitrary filters use
`matchingTotal:null`/`exactness:"not_computed"` and no filtered `COUNT`; fixed
summary fields and bounded author/content-type/role/folder/tag facets are exact
at one authorized/parent read-only `REPEATABLE READ` snapshot. Facet pages are strict
`{items,nextCursor,hasMore}` with default/max `50/100` and no auto-fetch. One page
query, one fixed aggregate row, and at most one bounded relation-facet batch total
at most three separately inventoried/budgeted/planned SQL statements; page concatenation, per-row lookups, and auth
leakage are forbidden. Record that 06-L02 owns the summary-only
  family-specific page `{id,pageId,version,kind,title,slug,createdAt,createdBy:{id,name,email}|null}`
  and detail `{id,detailPageId,version,kind,createdAt,createdBy:string|null}`
  revision envelopes (no invented `reason`), and 03-L02, only after 06-L03, solely owns
its route/schema/client/UI adoption after current 09-L04 INITIAL authority and
08-L03 INITIAL header receipts, the full eight-client consumer graph,
  bounded picker/search/load-more migration, cohesive >1,000-line splits, direct
  tests, and UI smoke. Name `formReadService`, its exact FormListItem fields
  `id,name,slug,status,description,submissionAccess,updatedAt`. Every
  `bookingReadService` list means paginated reservations/resources/services/
  blackouts, capped-100 service-resource/schedule arrays and 31-day/500-slot preview;
  existing Reservations/Resources/Services tabs consume narrow items, Services
  keeps derived `submissionAccess`, edit awaits point detail, and Availability/
  SlotPreview use bounded pickers. Document the authorized parent-bound
  submission point detail: one query only after explicit expansion, payload only
  in component memory, no cache/storage/bus/log, abort+clear on close/unmount/
  logout/auth change. Success/error headers are exactly `Cache-Control: private,
  no-store, max-age=0`, `Pragma: no-cache`, `Expires: 0`; the client uses
  `cache:"no-store"`. Media list `name` is derived originalName→title→sanitized
  key basename→asset, raw key stays omitted, and `media/utils.ts` consumes name;
  exact extraction stems `BookingOverviewPanel`, `MediaLibraryFolderState/Results`, `UsersRolesContent`, `DetailTemplateRevisionPanel`, `MenuDesignCanvas/Inspector/DataSources`, `MenuEditorWorkspace`, `PostEditorMediaControls`, `ContentListSource/PresentationEditors`, `CtaBannerContentEditors`, `EntryTeaserSource/PresentationEditors`, `FeatureGridItemEditors`, `FooterNavigation/BrandEditors`, `GalleryMosaicItemEditors`, `HeroContent/Media/LayoutEditors`, `LogoCloudItemEditors`, `NavigationItem/PresentationEditors`, `PostsFeedSourceEditors`, `RichTextContent/LayoutEditors`, `SectionContent/LayoutEditors`, `TeamMember/LayoutEditors`, and `TestimonialItemEditors`, and all eight page-editor split suites. No
  raw-array, auto-fetch-all, first-page-truncation or
heavy-body fallback is shipped. It must not describe speculative routes.
Document deletion of legacy `booking-page.test.tsx`/`media-library.test.tsx` and
the exact replacements: `bookingPageTestFixtures.tsx` plus booking
`loading-pagination|mutations|calendar`, and `mediaLibraryTestFixtures.tsx` plus
media `loading-pagination|selection-folders|upload-edit` suites.

Document L06's Bun-free `searchHistoryContract.ts`, direct Vitest, actual private
`pruneHistory` declaration/call removal and actor/UUIDv5-idempotent `recordSearch`.
In `_docs/CMS_API.md`, every search GET is write-free and the sole history write
is internal `POST /admin/api/search/history`: session actor, `content:read`, CSRF,
`admin_write`, strict reject-unknown four-key body, `{recorded:boolean}`, 409
idempotency conflict, no API-key/public/GET alias. Record `searchClient`/
`useSearchResults` one-UUID-per-normalized-UI-intent/retry behavior.
Document that search v1 has no cursor: five source arms each cap exact-email→FTS
→non-overlapping-trigram at 51, at most 255 enter tier-first global dedup/rank
and 51 leave; every arm's plan budget is independent of final top-k survival.
Update `_docs/SEARCH_SPEC.md`: Unicode `L/M/N/_` runs become `token:*` joined by
` & ` for bounded `to_tsquery('simple', :prefixQuery)`; trigram uses GIN `%`
after static transaction-local
`SET LOCAL pg_trgm.similarity_threshold='0.300'`. LIKE/ILIKE/regex fallback is forbidden.
Document page autosave's parent lock, one latest projected version/id row, equal-
snapshot zero write, exact-predecessor-only delete on change, scheduler-only old
history, and two/six-statement 100k-history/50-writer evidence.

### Server cache source of truth

`_docs/SERVER_CACHE.md` must document:

- the exact `ServerCache`, `ServerCacheStore`, `CachePolicy`, key/envelope,
  generation/tag, invalidation-plan, health and telemetry owners shipped by
  TASK-551-07/08;
- complete store `describe/get/delete/readGenerations/bumpGenerations/
  writeIfGenerationsMatch/health/close`, cloned bytes and normalized
  `written|generation_changed|unknown(physicalOutcome:"unknown")` outcomes;
  the public runtime exposes only `mode/cache/invalidation.applyAfterCommit/
  health`, while store/controller/coordinator/workers/close remain private;
  startup validates the exact four-policy key+envelope capacity catalog;
- policy-branded conditional entries with `fillKind`, positive/nullable-negative
  policy TTL ceilings and value ceiling. Both stores strictly decode each
  envelope, match entry/envelope `fillKind`, select the positive or required
  non-null negative ceiling, and recheck TTL/lifetime/bytes. Redis's generation-
  only and lease-owned writes reuse one internal pre-command validator, so a
  forged/malformed one/two-entry bundle issues zero Redis commands; also document
  the exact normalized coherence signal/controller shapes and one controller owner;
- generic `ServerCache.getOrLoad(ServerCacheLoadRequest<TCached,TResult>)` as the
  only load/fill owner: pre-loader primary+fill-fence generation capture; strict
  finite-reason `no_fill` with return value/zero encode-write versus `fill` with
  `fillKind:positive|negative`, cache/return values and branded optional companion;
  independent per-policy primary/companion TTL sampling with unequal atomic-pair
  TTLs permitted; negative-only TTL/no companion; resolve-cached behavior; zero consumer access
  to store write primitives;
- exact loader triggers: backend null `store_absent`; returned expired/wrong-
  generation/oversized/invalid bytes evicted as coarse `store_value_rejected`;
  exact disabled reasons `ineligible|singleflight_saturated|coherence_bypass|
  generation_unavailable|transport_unavailable|distributed_wait_timeout|
  coordinator_closed|not_published_retry`. Every loader gets `{trigger,
  companion}`; shared outcomes map absent/rejected/disabled to
  `store_absent_no_publication`/`store_value_rejected`/`fill_disabled`, never the
  trigger object. Disabled fill publishes nothing; manifest/HTML fills only true absence. Memory uses
  one 64-entry expiry+eviction work cap and skips a 65th-victim insertion atomically;
- public manifest-primary/HTML-companion and manifest-hit/HTML-primary/refreshed-
  manifest-companion directions, both-or-neither fill, uncached return value,
  positive-or-finite-reason-`no_fill` only (never negative), and authoritative
  no-throw/no-encode/no-write output when render auditing discovers an exclusion.
  `public-html-manifest` is non-authorizing metadata with family-specific
  `mutableVisibilityGate:"not_required"`; HTML requires current `strictly_public`
  root+nested validation, and refreshed eligibility is a distinct post-render context;
- distributed owner fills only through atomic
  `putIfGenerationsAndLeaseOwned`, which proves lease token plus all generations
  before one/two entries. Only `written` fills; every other result/uncertain renew
  returns authoritative bytes without fill, generation-only write is forbidden,
  and post-attempt release is cleanup only;
- memory as the default bounded single-replica backend and Redis as the explicit
  multi-replica backend, including validated environment fields and startup/
  readiness behavior;
- eligibility, TTL/jitter, byte/count caps, single-flight, negative-cache,
  circuit, bypass and distributed-lease behavior;
- single-flight `SERVER_CACHE_MAX_IN_FLIGHT_KEYS` default/range/saturation of
  `1_024`/`16..10_000`, canonical final-path-key+current-epoch+branded full-context
  `shareScopeDigest` identity, and identity-cleaned shared fill-outcome promises
  only—never `Promise<TResult>`/caller values. Document that ineligible/unbranded
  requests bypass registry/read/lease/fill, the owner keeps its result, a joiner
  uses its own resolver only after a strictly decoded `published` outcome proves
  successful positive/eligible-negative conditional publication, and every `not_published` path
  runs one authoritative no-fill loader per joiner; also cover safe-integer coherence-epoch overflow behavior and every
  exact distributed acquire/owner/waiter/bypass result, and singleton
  `getServerCacheRuntime().cache` availability before start/started/after close;
- Redis-only transactional outbox, worker claim/retry/recovery and optional
  Pub/Sub acceleration; memory's zero-outbox, exactly-one awaited post-commit
  generation bump;
- awaited `applyAfterCommit(plan)` before committed success returns, with no
  fire-and-forget/direct epoch call and a visible local observation or affected-
  tag fence before its applied/queued/bypassed resolution;
- exact coherence transition semantics: source-bound observation tokens ignore
  older/equal completions; current-token identical force/recover is a no-op;
  every event-keyed observation advances epochs but clears no fence. Only the
  same event's durable-processed signal after generation bump and conditional DB
  completion clears its failed-post-commit fence; broad recovery, Pub/Sub and
  another event cannot. Retain only concurrently unresolved events and active
  attempts, independently capped at 4,096 with no settled tombstones. Saturation
  temporarily bypasses all families without rejecting callbacks; recover only
  when both counts are at most 3,072. Attempt tokens settle only after no callback
  can report. More than 100,000 settled events stay
  bounded. Redis has an independent durable-drain fence until healthy/no pending/
  claimed rows; only safe-integer epoch/drain-generation overflow lasts to restart;
- Pub/Sub's strict `{ eventKey, generationDigest }`-only payload. It carries no
  tags or domain identity; a subscriber treats the event key only as a wakeup,
  bounded-point-reads the outbox row, strictly normalizes finite tags, and emits
  no observation on missing/malformed/read failure;
- the bounded-eventual, non-linearizable public-cache model: global Redis outage
  means DB/render bypass on every replica; ambiguous/partial delivery may expose
  safe public old-generation data only until outbox delivery or measured hard TTL;
  worker poll at most 250 ms, healthy invalidation-lag p99 at most 1 second,
  alert/readiness degradation plus visible-barrier bypass above 5 seconds, public
  HTML TTL at most 600 seconds, and every policy TTL at most 3,600 seconds;
- Admin post-write preview/readback cache bypass for read-after-write, while
  security/private/auth/draft/preview/nonce-bearing data remains fail-closed and
  DB-authoritative;
- one authoritative SecuritySettings query on every public request before
  security/rate middleware. Structurally non-mutable routes total one query;
  mutable detail/list routes read safe manifest metadata then add one parameterized
  root+nested validator and total two. Document exact page/post/entry projections,
  128 tuples/16,384 canonical bytes/101 roots, one aggregate row/no bodies,
  unavailable/rejected/missing/private/change fail-closed behavior, and zero
  HTML/content value GET/fill before a valid receipt;
- public HTML TTL `0` as a pre-policy/generation/store bypass for manifest/HTML
  only, the independent fixed positive `public-runtime` bootstrap policy,
  positive TTL bounds, and forced affected-family bypass for locally known
  incoherence strictly above 5 seconds;
- Admin INITIAL installation tokens/reset subscribers and FINAL exhaustive module-
  cache authority matrix; deployment digest + random 128-bit tab incarnation +
  distinct cross-tab auth-generation nonce + monotonic auth epoch + user/
  permissions, storage-ordered transitions/BroadcastChannel wakeup, reset/fence
  of every cache/promise/map/read-through/prefetch registry, read-through set/
  invalidate/refresh generation-first ordering, persistent misses on failure,
  and no auth payload change;
- fixed-order v3 deployment and `AdminCacheScopePreimageV3`
  `{v,deploymentIdentity,authIncarnation,authGenerationNonce,authEpoch,userId,
  permissions,roles}`. Pin 367-byte digest
  `6c69458d5fdc22634a5fca20609e3accb4a6fe606905af2b2c522900770afbf7`
  and nonce-only `222...` digest
  `4214d494f425d2f595de703cd19662a2513d0d85871bff748bdb5d5cb728611d`;
  rotation rejects old storage/events/delayed installs. Arrays are separately
  normalized/byte-sorted; exact caps and delimiter-collision rejection apply;
- decrypted/secret-bearing `SecuritySettings` as never cached and DB-authoritative,
  with only finite generation/coherence metadata or typed redacted projections;
- commerce product data, form/booking submission nonces, booking slots token,
  analytics beacon nonce, request-scoped token, and unknown dynamic dependency
  as exact no-manifest/no-envelope-fill exclusions; every public-write security
  control executes before cache and every dependency is tagged/gated/excluded;
- minimal method+URL dispatch of every existing booking path/method (including
  slots GET), exact Forms submission/upload paths at every method, and analytics
  beacon at every method before cache normalization/read/write; existing handler
  security/method semantics and one security read per request; only unmatched
  surviving GET/HEAD may enter cache;
- security-settings 2-second local lock timeout and transaction advisory
  `(551,904)` before same-tx read/merge/write; Redis exactly-one same-tx outbox,
  memory zero outbox plus exactly-one awaited post-commit bump,
  `settingsRoutes.ts` exact redacted 409 mapping, and observation/fence before
  return; form actions are absent from render dependency/invalidation surfaces;
- complete never-cache/security inventory and Admin browser-cache separation;
- key/namespace rotation, Redis outage/reconnect, outbox backlog, corrupt value,
  stampede, deploy/rollback, incident response and exact-key cleanup runbooks;
- lifecycle staging and shutdown: 02-L02 solely owns `runtimeEntrypoint.ts`,
  `prod.ts`, and `dev.ts`; `runtimeEntrypoint.ts` alone calls lifecycle start/
  close and owns signals, listen, graceful-at-most-10-second then forced HTTP
  drain, followed by reverse close. Prod/dev only select mode and Vite is a
  participant. Every close receives cancellable
  `RuntimeCloseContext{absoluteDeadline,signal}`; total shutdown is at most 15
  seconds, non-DB closes are at most 5 seconds, and DB is the sole exception at
  `min(10 seconds, remaining absolute budget)` with no outer race/detached teardown. Partial rollback/no-listen on a
  startup signal/failure is mandatory; 03 `routes/index.ts` registers the cursor participant
  at module evaluation; 08 owns only `httpServer.ts` and calls
  `registerComposedHttpRuntimeParticipants()` for cache/retention/existing
  backup while preserving cursor identity, with no 08 keyring load/injection or
  entrypoint edit; invalidation `stopClaiming()`/`drain()`/`close()` precedes
  lease/store/DB close;
- measurable cache/query/invalidation metrics and the five two-process smoke
  scenarios.
- the five TASK-551-03-L02 Admin-list visible-effect scenarios, light/dark
  screenshots, and zero-console-error receipt alongside the infrastructure smoke.
- every executable 01..09 leaf's exact literal argv manifest and receipt, using
  `tests/integration/server/task551*.test.ts` for new default-lane integration
  suites and no legacy non-default path. The four 09
  manifests additionally preserve direct-existing-suite ownership. Those
  leaves own/run all direct existing suites; closure consumes exact argv/digest,
  zero exit, no skip and positive discovery while aggregate/full gates retain
  only aggregate ownership.

All other listed docs link to these owners and update only their relevant
configuration, architecture, data model, security, cache-map, testing, gate, or
operator sections. Do not duplicate full contracts into every guide.

## Collision and Task-Handoff Closeout

Record fresh evidence for TASK-511, TASK-517, TASK-493, and TASK-518 exactly as
required by TASK-551-10. For each, the changelog states `terminal verified` or
`active explicit handoff`, the exact non-overlap, and the follow-up task when
needed. Do not mark another family terminal, edit its task files, or silently
claim its work.

Re-triage every finding before closure. Any HIGH/MEDIUM remains blocking. A LOW
with performance, reliability, security, privacy, auth, RBAC, API, persistence,
migration, data, or test-integrity impact is not eligible for TASK-9999 and must
be fixed or promoted to an active execution-ready follow-up. Only a truly
zero-impact LOW may use the permanent backlog with the parent's exact evidence.

## Terminal Task-Graph Contract

The complete family is exactly 37 physical task files:

- one parent;
- 11 technical children;
- 25 executable leaves distributed `2,2,3,2,2,3,2,3,4,2,0` across children
  01 through 11.

Changelog 1263 must list the parent ID, every child ID, and every leaf ID before
any descendant becomes `✅ Done`. Apply terminal transitions descendants first,
then children, then the parent. No parent closes over an open descendant.

Read both indexes fresh immediately before closeout. Move only the TASK-551
parent board row from its current bucket to Done; descendants remain represented
through that row. Recompute statistics from the actual pre-close status of all
37 verified task files. For every non-Done node transitioning to Done, subtract
one from its real source bucket (`To Do` or `In Progress`) and add one to Done;
already-Done nodes contribute zero. Assert the per-bucket source counts, newly-
Done total, and graph total 37 before writing. Never assume `-37/+37`, leave an
In Progress count unchanged despite a real transition, or hardcode stale totals.

Create exactly one changelog 1263 file with the actual UTC closure date, list
all 37 IDs, before/after metrics, all command results and required skips (there
must be none), Redis version/smoke scenario outcomes, migration and security
evidence, collision handoffs, post-audit summary, docs, and explicit non-goals.
Add exactly one index row and advance the next-unreserved pointer without
disturbing other reservations.

## Security Contract

- **Visibility/routes:** documentation and metadata only; no endpoint change.
- **Auth/RBAC/CSRF/rate limit:** document the shipped behavior without changing
  or weakening any permission, CSRF, bucket, nonce/HMAC, CAPTCHA, or bot rule.
- **Validation:** task graph, IDs, statuses, changelog number, index row,
  statistics deltas, doc links, evidence schemas, configuration tables, and
  command receipts are validated strictly before write.
- **Secrets/privacy:** no URL credential, cookie, token, nonce, raw PII, cached
  body, SQL bind, provider key, or sensitive log enters docs/changelog/task
  evidence. Environment examples use placeholders only.
- **Operational safety:** runbooks never prescribe `FLUSHDB`, `FLUSHALL`, Redis
  `KEYS`, unbounded `SCAN`, table truncation, broad deletes, or unsafe index/
  partition operations.

## Implementation Pseudocode

```ts
async function closeTask551Metadata(input: ClosureReceipts): Promise<void> {
  const current = await readFreshTaskAndChangelogIndexes();
  const graph = await validateExactTask551Graph({
    parent: 1, children: 11, leaves: 25,
    leafDistribution: [2, 2, 3, 2, 2, 3, 2, 3, 4, 2, 0],
  });
  requireCurrentPassingReceipts(input, graph);
  requireCurrentFinalQueryInventoryReceipt(input.queryInventory, {
    phase: "final", plannedDeltaCount: 0,
  });
  requireAdminListUiSmokeReceipt(input.adminListUiSmoke, {
    scenarioCount: 5, themes: ["light", "dark"], consoleErrors: 0,
  });
  requireExactPerLeafCommandManifests(input.implementationHandoffs, {
    ownerRange: "TASK-551-01..09", requireLiteralArgv: true,
    exitCode: 0, skipped: false, requirePositiveTestDiscovery: true,
  });
  requireExactTask55109DirectSuiteOwnership(input.ownerTargetedHandoffs, {
    ownerOrder: ["TASK-551-09-L01", "TASK-551-09-L02",
      "TASK-551-09-L03", "TASK-551-09-L04"],
    exitCode: 0, skipped: false, requirePositiveTestDiscovery: true,
  });
  requireNoUnresolvedFindings(input.finalDrift);
  requireEveryDocumentMatchesCurrentSource(input.docs);

  const changelog = buildTask551Changelog1263({
    taskIds: graph.allIds,
    metrics: input.aggregate.metrics,
    redisSmoke: input.redisSmoke,
    audits: input.audits,
    handoffs: input.handoffs,
  });
  const statusDelta = deriveCurrentStatusBucketDelta(graph.currentStatuses, {
    terminal: "Done", graphCount: 37,
  });
  await writeNewChangelogAndIndexRow(changelog); // fail on existing/collision
  await markDescendantsThenParentsDone(graph);
  await moveParentRowAndApplyVerifiedStatisticsDelta(current, statusDelta);
  await verifyExactClosureDiff(graph, changelog, statusDelta);
}
```

**Data flow:** final source/gate/audit/smoke receipts → current-source docs and
runbooks → strict 37-file graph/index validation → changelog 1263 coverage →
descendant-to-parent terminal metadata → board/statistics/index verification.

**Error handling:** stale/missing receipt, doc/source mismatch, open descendant,
duplicate/missing ID, changelog collision, wrong reservation/pointer, concurrent
index drift, unresolved finding, required skip, leaked sensitive value, broken
link, or unexpected diff aborts closure. Re-read after any conflict; never
overwrite or revert another task's bytes.

**Regression-test shape:** workflow/task-graph tests prove 37-file membership,
leaf distribution, changelog coverage before terminal status, child-before-parent
closure, one board row move, current-status-derived per-bucket statistics deltas
for mixed To Do/In Progress/already-Done fixtures, graph-total preservation, one
1263 index row, next-free reservation preservation, status-only task edits, and
refusal on stale/concurrent index bytes.

## Testing Requirements

- Consume the current green L01 aggregate, Redis, and Admin-list UI-smoke
  receipts plus TASK-551-01-L01's fresh final exact-set inventory receipt.
- Consume every executable 01..09 leaf's exact literal manifest with digest/argv
  equality, zero exit, no skip and positive test discovery. Separately validate
  all four 09 direct-suite ownership lists; closure reruns/edits none of them.
- Validate all links/configuration/API tables against current source and reject
  any undocumented or speculative endpoint behavior.
- Run the workflow graph/status/changelog checks, link checker, lint/type checks,
  diff check, and complete touched production/test line-count gate below.
- Do not write terminal metadata when any receipt is stale, skipped, malformed,
  missing a screenshot/theme, or carries a console error or unresolved finding.
- Validate status statistics from the actual 37-node pre-close buckets; fixtures
  must cover the TASK-551-01 interim In Progress state and already-Done nodes,
  and must reject a hardcoded `To Do -37 / Done +37` assumption.

## Exact Validation Commands

Consume the current green L01 receipt, then run closure-only checks:

```bash
node --check _docs/_workflows/task-551-author-audit.mjs
node --check _docs/_workflows/task-551-implement.mjs
node --check _docs/_workflows/task-551-fix.mjs
bun test tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/task551WorkflowContracts.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Run the TASK-551-11 task-graph/status/changelog audit and link checker against
the final working tree. Verify line counts for every production/test file touched
from the pre-family baseline. No product command is rerun after terminal metadata
unless closeout unexpectedly changes a product/test byte, which is itself a
forbidden-diff failure.

## Documentation Updates Required

Exactly the documentation and closure files listed under **Exact Single-Writer
Ownership**. No other documentation is modified without a fresh ownership
amendment and reconcile PASS.
