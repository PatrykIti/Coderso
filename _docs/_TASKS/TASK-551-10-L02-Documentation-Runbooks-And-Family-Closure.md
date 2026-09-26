# TASK-551-10-L02: Documentation, Runbooks, and Family Closure
# FileName: TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md

**Parent Subtask:** TASK-551-10
**Priority:** High
**Category:** Documentation / Operations / Task Board / Changelog / Closure
**Estimated Effort:** Large
**Dependencies:** exact compile-green owner sequence
TASK-551-01-L01 INITIAL → TASK-551-01-L03 → TASK-551-01-L04 → TASK-551-01-L02 →
02-L01/L02/L03 →
08-L03 INITIAL → 05 → 03-L01 → 06-L01/L02/L03 →
07-L01 → 09-L04 INITIAL → 03-L02 → 07-L02 → 08-L01/L02/L03 FINAL →
03-L03 → 04 → 09-L01/L02/L03/L04 FINAL →
01-L01 final refresh complete;
TASK-551-10-L01 aggregate/full gates and Redis smoke PASS; TASK-551-11 post-
audit plus fresh final-drift PASS; every production owner terminal-ready with no
unresolved finding
**Status:** ⏳ To Do
**Changelog:** 1310 pinned (closure only)

---

## Overview

Publish the final database-performance and server-cache sources of truth,
document safe small-site and multi-replica operations, record measured outcomes
and collision handoffs, then close all 41 physical TASK-551 tasks and changelog
1310 without reopening any production, test, migration, gate, or workflow
contract.

This is the only TASK-551 status/board/changelog writer. The one and only
L11 → L10-L02 call is
`dispatchTask55110L02(suppliedTerminalHandoff: Task551L10L02DispatchInputV1)`;
it has no second L11-supplied argument. That reject-unknown terminal handoff's
only aggregate value is `Task551L10L02AggregateProjectionV1`, its only
TASK-489 value is the exact L11-owned
`Task551Task489PredecessorPromotionEvidenceV1`, and
its only final-drift value is
`Task551L10L02FinalDriftProjectionV1`. The aggregate projection is limited to a
current passing, approved redacted identity/status/profile/metric/runtime-digest
summary whose
`aggregateIdentity.task489PredecessorPromotionSha256` binds it to the promotion
record's `predecessor.digest`. The canonical record's exact top-level fields, in
order, are `schemaVersion`, `sourceTask`, `sourcePhase`, `sourceProfile`,
`sourceScenario`, `sourceHead`, `sourceDigest`, `predecessor`,
`promotionState`, `promotionDecision`, `promotionReason`, `validationSummaries`,
`createdAt`, `reviewedAt`, `promotedAt`, and `ownerCapabilityReceiptDigest`.
Its `schemaVersion` is `"coderso.task551.task489-predecessor-promotion@v1"`,
`sourceTask` is `"TASK-551-05-L02"`, `sourcePhase` is `"05-l02"`,
`sourceProfile` is required `null`, `sourceScenario` is `"task489-predecessor"`,
and `sourceHead` is a required non-null string. `sourceDigest`, the nested
`predecessor.digest`, and `ownerCapabilityReceiptDigest` are required lowercase
64-hex SHA-256 values. `predecessor` has exactly `sourcePath`, `durablePath`,
`schemaVersion`, and `digest`, with source path `.tmp/task-551/task489-predecessor-v1.json`,
durable path `_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json`,
and nested schema `"coderso.task551.task489-predecessor@v1"`. The enum values
are `promotionState:"promoted"`, `promotionDecision:"accept"`,
`promotionReason:"exact-byte-match-after-owner-review"`; `validationSummaries`
has exactly `sourceIdentity`, `predecessorBytes`, `atomicNoReplace`, and
`terminalHead`, each `"passed"`; and `createdAt`, `reviewedAt`, and `promotedAt`
are required non-null strings. Every field is required, unknown fields and all
legacy producer/pass or projection shapes are rejected, and no alias is used.
The final-drift projection has exactly its fixed `schema`, `clean:true`, a safe
`auditIdentity` containing only `head` and `currentTreeSha256`, and its own
lowercase `sha256`; it is not `Task551AuditResultV1` and cannot carry an audit
`summary`, `findings`, `errors`, or raw audit input.
Immediately before the first closure write, L10-L02 must read its own canonical
current HEAD/tree identity and require exact equality with that closed
`auditIdentity`; checking the HEAD or either digest's syntax alone is not
freshness proof. This local read-only check neither adds a handoff field nor
opens L11's private audit.

L10-L02 separately builds `Task551L10L02LocalClosureFactsV1` inside its own
closure boundary after validating local sources. It is not an L11 argument,
cannot be an alias-bearing second terminal handoff, and is a reject-unknown
closed schema of named redacted summary/attestation values only. Its exact
payload keys, aside from its fixed `schema`, are `l03FixtureBootstrapSummary`,
`l02BaselineCheckSummaries`, `l02FixtureBudgetSummary`,
`finalQueryInventorySummary`, `adminListUiSmokeSummary`,
`leafManifestAttestation`, `task55109DirectSuiteAttestation`,
`currentSourceDocumentationSummary`, `redisSmokeSummary`,
`postAuditSummary`, and `collisionStatusSummary`. Neither it nor any nested
summary can carry a full aggregate/promotion/final-drift value or an alias, predecessor metadata outside the
canonical handoff, a parser result, receipt bytes, commands, owner handoffs,
errors, raw evidence, an opaque map, byte carrier, `finalDrift`, full audit
result, audit `summary`, `findings`, or raw audit input. L02 rejects all of
those values and every unknown field before closure can write. It never opens
predecessor bytes, imports or invokes a predecessor parser, or accepts a
generated predecessor artifact. If documentation discovers a behavior that the
projections, local summaries, or current source cannot prove, closure stops and
returns the issue to the exact owning leaf; L02 never changes product code or
weakens copy to hide the gap.

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
- `_docs/_CHANGELOG/1310-<closure-date>-task-551-scalable-database-query-and-cache-optimization.md`;
- the single matching 1310 index row and next-free pointer in
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
- cursor rotation's strict optional `PAGINATION_CURSOR_RETIRED_KEYS` MAC-verifiable
  version/secret pairs and coarse `classifyPaginationCursorFailure` terminal class: default
  routes still expose generic invalid, while a later internal route may map only
  expired/explicitly retired continuation state to fixed refresh copy without
  exposing or distinguishing key versions;
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
- TASK-551-11's durable redacted fixture-check evidence is present, current,
  and accepted before any TASK-551-01-L02 fixture or budget evidence. It is
  the sole closure input for L03's ephemeral focused `--check` record and must
  carry its verified focused-test (positive discovery) plus `--check` command
  (null discovery) receipts, both zero-exit and non-skipped. TASK-551-11's
  matching durable redacted L02 baseline evidence must then cover both `small`
  and `large` profiles with the same paired-receipt rules. A missing, stale,
  malformed, leaked, or later-ordered L11 evidence object blocks closure rather
  than being inferred from producer stdout or L02's result;
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
  physical session, L01's sole
  `createTask551ReservedDrizzleClient(poolClient,reserved)`, invalid direct
  `drizzle(reserved)`, and required `drizzle(adaptedReserved)` on postgres.js
  3.4.9/Drizzle 0.45.2. Pin callable forwarding and `.unsafe()`/`.values()` parity
  on the reserved handle, identical immutable pool `.options` with shared
  parser/serializer maps, same-handle empty-option `.begin`, zero pool SQL/
  `begin`/`.unsafe()` dispatch after reserve, exact GUCs
  `coderso.task551_operation_id`,
  `coderso.task551_receipt_v2`, `coderso.task551_receipt_sha256`, one PID across
  GUC set/guard/DDL/receipt/journal, successful RESET/same-PID/one-release/
  normal-end, poison/hard-end on unknown state, canonical 1..65,536-byte UTF-8
  v2 receipt/SHA-256 validation, and clean/prior/replay/reverse/failure rollback/
  repeat/status/recovery gates;
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
- the normalized TASK-489 predecessor authority: exact
  `solution_kit_starter_apply_owners` and
  `solution_kit_legacy_template_evidence` and
  `solution_kit_legacy_rollback_progress` tables, typed run proof columns,
  typed high-level template-plan columns, composite relation FKs,
  `rollback_of_run_id ON DELETE RESTRICT`, active-owner/
  one-running-rollback/relation/history indexes and checks, no JSON owner/evidence/
  progress/proof predicate, and the dedicated five-ID companion plan receipt at
  10,000/1,000,000 runs. Record all fourteen logical cases, fifteen statement
  cases, thirty finite scale receipts, exact named indexes, relation-heavy
  101-candidate pages, two-statement detail, 512-plus-sentinel bounds, projection
  exclusions, and p95 results without adding them to the closed 37-ID TASK-551
  registry;
- Solution Kit retention's locked set-based active/retry graph preservation and
  child-first released/proof-complete pruning, terminal TASK-551-06's Bun-free
  install-item/template-state/template-evidence/template-progress/combined-progress
  digest owner with literal domain frames and exact state preimages
  plus canonical core/template global-position map with known vectors and independent
  retention recomputation, atomic <=2,000-row
  deletion of one complete failed owner at a time for unbounded retries, and one
  final atomic successful-relation/source graph, plus
  memory/Redis adoption proving
  every legacy and all-ten-kind full-site apply/rollback/compensation mutation
  commits its backend-specific invalidation receipt with the resource/run receipt
  and awaits the sole post-commit boundary;
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
Update `_docs/SEARCH_SPEC.md`: L01's `buildTask551PrefixTsquery` and constants are
the shared read-only token contract for Admin and assistant search. Unicode
`L/M/N/_` runs become byte-exact `token:*` joined by ` & `; one input CTE binds
literal `to_tsquery('simple',$1)` once and reuses that tsquery for every vector
predicate/rank, while assistant `expandedTerms` stay reranker-only. Shared
NFKC/Unicode/punctuation plus 2/200-code-point, 800-byte, 16-token, and
64-code-point-per-token bounds reject local parsers, raw interpolation,
`websearch_to_tsquery`, `plainto_tsquery`, or a second tsquery bind. Trigram
uses GIN `%` after static transaction-local
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

The complete family is exactly 41 physical task files:

- one parent;
- 11 technical children;
- 29 executable leaves distributed `4,3,3,2,3,3,2,3,4,2,0` across children
  01 through 11.

`TASK-551-01-L03` is child 01's third-numbered leaf (L03), dispatched second
after L01 and before L02. Final graph validation must
include its ID and require TASK-551-11's durable redacted L03 fixture-check
evidence before accepting its two durable redacted L02 profile-baseline objects
or any TASK-551-01-L02 fixture/budget evidence. Producer stdout is ephemeral and
never a closure input.

`TASK-551-02-L03` is child 02's third-numbered leaf (L03), dispatched after
L01 and L02. Final graph validation must include its ID and retain the complete
child-02 sequence `TASK-551-02-L01 → TASK-551-02-L02 → TASK-551-02-L03`.

Changelog 1310 must list the parent ID, every child ID, and every leaf ID before
any descendant becomes `✅ Done`. Apply terminal transitions descendants first,
then children, then the parent. No parent closes over an open descendant.

Read both indexes fresh immediately before closeout. Move only the TASK-551
parent board row from its current bucket to Done; descendants remain represented
through that row. Recompute statistics from the actual pre-close status of all
41 verified task files. For every non-Done node transitioning to Done, subtract
one from its real source bucket (`To Do` or `In Progress`) and add one to Done;
already-Done nodes contribute zero. Assert the per-bucket source counts, newly-
Done total, and graph total 41 before writing. Never assume `-41/+41`, leave an
In Progress count unchanged despite a real transition, or hardcode stale totals.

Create exactly one changelog 1310 file with the actual UTC closure date, list
all 41 IDs, before/after metrics, all command results and required skips (there
must be none), Redis version/smoke scenario outcomes, migration and security
evidence, collision handoffs, post-audit summary, docs, and explicit non-goals.
Add exactly one index row and advance the next-unreserved pointer without
disturbing other reservations.

**Closure authority is current state, not commit history.** Closure validates the
current source, tests, and docs, the current terminal statuses, board/changelog
1310 synchronization, and truthful receipts. The repository owner may create one
atomic closure commit containing the changelog 1310 file, its index row, all 41
task-file status edits, and the board row/statistics as operational hygiene, but
that commit's history — including any unique changelog ADD commit — is NOT an
immutable downstream handoff gate. No task-local tool derives, requires, or
verifies a closure commit as independent authority; no partial status is closed
before the changelog file exists, and TASK-548-08 consumes current-state
authority separately from any commit history.

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
- **TASK-489 terminal handoff:** the only terminal input is L11's strict,
  reject-unknown `Task551L10L02DispatchInputV1`: its
  `task551L10L01Aggregate` is exactly
  `Task551L10L02AggregateProjectionV1`, and its
  `task551L11Task489PredecessorPromotion` is exactly the L11-owned
  `Task551Task489PredecessorPromotionEvidenceV1`, while its
  `finalDrift` is exactly `Task551L10L02FinalDriftProjectionV1`. L02 permits
  only a current `pass:true` approved redacted aggregate
  identity/status/profile/metrics/runtime-digest summary, the promotion's exact
  16-field record with top-level order
  `["schemaVersion", "sourceTask", "sourcePhase", "sourceProfile",
  "sourceScenario", "sourceHead", "sourceDigest", "predecessor",
  "promotionState", "promotionDecision", "promotionReason",
  "validationSummaries", "createdAt", "reviewedAt", "promotedAt",
  "ownerCapabilityReceiptDigest"]`, nested predecessor order
  `["sourcePath", "durablePath", "schemaVersion", "digest"]`, and nested
  validation-summary order
  `["sourceIdentity", "predecessorBytes", "atomicNoReplace", "terminalHead"]`,
  plus the final drift's exact
  `{ schema, clean: true, auditIdentity: { head, currentTreeSha256 }, sha256 }`
  shape. It requires
  `aggregateIdentity.task489PredecessorPromotionSha256 === promotion.predecessor.digest`
  and rejects a full aggregate/promotion/final-drift alias, any promotion field
  outside the canonical nested location, any reduced or aliased promotion,
  parser result, receipt bytes, commands, owner handoffs, `Task551AuditResultV1`,
  audit `summary`, `findings`, `errors`, raw evidence, raw audit input, or any
  unknown field at every nested boundary. It opens neither temporary nor durable
  predecessor bytes, performs no predecessor hash or file-identity check, and
  imports, invokes, reconstructs, serializes, or inspects no predecessor parser
  result. TASK-551-10-L01 is the sole L10 consumer of durable-byte, hash, and
  parser aggregate validation; TASK-551-11 is the sole aggregate/final-drift
  handoff writer, and it passes the canonical promotion record unchanged.
- **Final-drift current-tree freshness:** before `writeNewChangelogAndIndexRow`
  (the first closure mutation), L10-L02 uses its own read-only canonical current
  HEAD/tree reader and a pure exact comparator to require both the returned
  current HEAD and `currentTreeSha256` equal
  `finalDrift.auditIdentity`. The reader implements the same canonical
  working-tree identity convention L11 used when
  `readAndRequireCurrentTreeIdentityBoundToFinalDrift` captured the projection,
  but receives neither the private audit nor any extra L11 value. A changed
  working tree under the same HEAD is `task551_l10_l02_final_drift_tree_mismatch`
  and aborts with zero closure writes; format-only validation is insufficient.
- **L10-L02-local closure facts:** `collectTask551L10L02LocalClosureFacts()` has
  no L11 parameter and produces only the separately typed,
  reject-unknown `Task551L10L02LocalClosureFactsV1`. Its closed nested summary
  schemas permit only declared scalar/enum/digest/attestation fields for the
  eleven named local facts; they permit no `Record`, opaque object, byte array,
  or extensible map. The local-facts validator recursively rejects
  `task551L10L01Aggregate`, `task551L11Task489PredecessorPromotion`,
  `aggregate`, `promotion`, `terminalHandoff`, `fullAggregate`,
  `fullPromotion`, `sourcePath`, `parserResult`,
  `receiptBytes`, `commands`, `ownerHandoffs`, `implementationHandoffs`,
  `ownerTargetedHandoffs`, `handoffs`, `finalDrift`, `fullFinalDrift`,
  `auditResult`, `auditResults`, `fullAudit`, `auditInput`, `auditInputs`, audit
  `summary`, `findings`, `errors`, `rawEvidence`, and raw audit input. Thus no
  second argument, local fact, or nested alias can smuggle a full L10 aggregate,
  L11 promotion, `finalDrift`, full audit result, audit `summary`, `findings`,
  or raw audit input into closure.
- **Operational safety:** runbooks never prescribe `FLUSHDB`, `FLUSHALL`, Redis
  `KEYS`, unbounded `SCAN`, table truncation, broad deletes, or unsafe index/
  partition operations.

## Implementation Pseudocode

```ts
type Task551Sha256 = string; // strict lowercase SHA-256, optional `sha256:` prefix
// L11 reduces its private `Task551AuditResultV1` only after it has required a
// clean final drift. This closed projection is the only final-drift value that
// crosses the L11 → L10-L02 terminal boundary.
type Task551L10L02FinalDriftProjectionV1 = Readonly<{
  schema: "coderso.task551.l10-l02.final-drift-projection@v1";
  clean: true;
  auditIdentity: Readonly<{
    head: string;
    currentTreeSha256: Task551Sha256;
  }>;
  sha256: Task551Sha256;
}>;
// This is L10-L02-local read-only infrastructure, not another L11 handoff
// value. It must use the same canonical path/order/serialization convention as
// L11's `readAndRequireCurrentTreeIdentityBoundToFinalDrift` capture.
type Task551L10L02CanonicalCurrentTreeIdentityV1 = Readonly<{
  head: string;
  currentTreeSha256: Task551Sha256;
}>;
type Task551L10L02ReadCanonicalCurrentTreeIdentity = () => Promise<
  Task551L10L02CanonicalCurrentTreeIdentityV1
>;
declare const readCanonicalTask551L10L02CurrentTreeIdentity:
  Task551L10L02ReadCanonicalCurrentTreeIdentity;
type Task551L10L02LocalClosureSummaryV1<TSubject extends string> = Readonly<{
  schema: "coderso.task551.l10-l02.local-closure-summary@v1";
  subject: TSubject;
  pass: true;
  sha256: Task551Sha256;
}>;
type Task551L10L02LocalClosureFactsV1 = Readonly<{
  schema: "coderso.task551.l10-l02.local-closure-facts@v1";
  l03FixtureBootstrapSummary: Task551L10L02LocalClosureSummaryV1<"l03-fixture-bootstrap">;
  l02BaselineCheckSummaries: readonly [
    Task551L10L02LocalClosureSummaryV1<"l02-baseline-check-small">,
    Task551L10L02LocalClosureSummaryV1<"l02-baseline-check-large">,
  ];
  l02FixtureBudgetSummary: Task551L10L02LocalClosureSummaryV1<"l02-fixture-budget">;
  finalQueryInventorySummary: Task551L10L02LocalClosureSummaryV1<"final-query-inventory">;
  adminListUiSmokeSummary: Task551L10L02LocalClosureSummaryV1<"admin-list-ui-smoke">;
  leafManifestAttestation: Task551L10L02LocalClosureSummaryV1<"leaf-manifests">;
  task55109DirectSuiteAttestation: Task551L10L02LocalClosureSummaryV1<"task551-09-direct-suites">;
  currentSourceDocumentationSummary: Task551L10L02LocalClosureSummaryV1<"current-source-documentation">;
  redisSmokeSummary: Task551L10L02LocalClosureSummaryV1<"redis-smoke">;
  postAuditSummary: Task551L10L02LocalClosureSummaryV1<"post-audit">;
  collisionStatusSummary: Task551L10L02LocalClosureSummaryV1<"collision-status">;
}>;
// Every local summary has exactly `schema`, `subject`, `pass`, and `sha256`.
// Detail validation happens before conversion to this closed attestation; none
// can embed argv, commands, raw receipts, owner-handoff objects, or byte data.

// This is the only L11 → L10-L02 entry point and it accepts exactly one
// metadata-only argument. Local facts are collected inside L10-L02, never
// supplied alongside this handoff or by L11.
async function dispatchTask55110L02(
  suppliedTerminalHandoff: Task551L10L02DispatchInputV1,
): Promise<void> {
  const terminalHandoff = requireStrictTask551L10L02TerminalHandoff(
    suppliedTerminalHandoff,
  );
  const localFacts = requireStrictTask551L10L02LocalClosureFacts(
    await collectTask551L10L02LocalClosureFacts(),
  );
  await closeTask551Metadata(terminalHandoff, localFacts);
}

async function closeTask551Metadata(
  terminalHandoff: Task551L10L02DispatchInputV1,
  localFacts: Task551L10L02LocalClosureFactsV1,
): Promise<void> {
  const aggregate = terminalHandoff.task551L10L01Aggregate;
  const promotion = terminalHandoff.task551L11Task489PredecessorPromotion;
  const finalDrift = terminalHandoff.finalDrift;
  const current = await readFreshTaskAndChangelogIndexes();
  const graph = await validateExactTask551Graph({
    parent: 1, children: 11, leaves: 29,
    leafDistribution: [4, 3, 3, 2, 3, 3, 2, 3, 4, 2, 0],
    requiredLeafIds: ["TASK-551-01-L03", "TASK-551-02-L03"],
  });
  requireL11FixtureBootstrapCheckEvidence(localFacts.l03FixtureBootstrapSummary, {
    producer: "TASK-551-01-L03", position: "before-task-551-01-l02",
    requireFocusedTestPositiveDiscovery: true,
    requireCheckCommandNullDiscovery: true,
  });
  requireL11DatabaseBaselineCheckEvidence(localFacts.l02BaselineCheckSummaries, {
    producer: "TASK-551-01-L02", profiles: ["small", "large"],
    prerequisite: "TASK-551-11 durable fixture-check evidence",
    requireFocusedTestPositiveDiscovery: true,
    requireCheckCommandNullDiscovery: true,
  });
  requireTask551L02FixtureAndBudgetEvidence(localFacts.l02FixtureBudgetSummary, {
    prerequisite: "TASK-551-11 durable L03 plus small/large L02 check evidence",
  });
  requireCurrentPassingLocalClosureFacts(localFacts, graph);
  requireCurrentFinalQueryInventoryReceipt(localFacts.finalQueryInventorySummary, {
    phase: "final", plannedDeltaCount: 0,
  });
  requireAdminListUiSmokeReceipt(localFacts.adminListUiSmokeSummary, {
    scenarioCount: 5, themes: ["light", "dark"], consoleErrors: 0,
  });
  requireExactPerLeafManifestAttestation(localFacts.leafManifestAttestation, {
    ownerRange: "TASK-551-01..09", requireLiteralArgvAlreadyValidated: true,
    exitCode: 0, skipped: false, requirePositiveTestDiscovery: true,
  });
  requireExactTask55109DirectSuiteAttestation(
    localFacts.task55109DirectSuiteAttestation,
    {
      ownerOrder: ["TASK-551-09-L01", "TASK-551-09-L02",
        "TASK-551-09-L03", "TASK-551-09-L04"],
      exitCode: 0, skipped: false, requirePositiveTestDiscovery: true,
    },
  );
  // L10-L01 alone opens, hashes, and parses the promoted durable receipt.
  // This leaf can see only L11's three already-redacted closed projections.
  requireCurrentApprovedTask551L10L02AggregateProjection(aggregate);
  requireExactTask551Task489PredecessorPromotionEvidenceV1(promotion);
  requireEqual(
    aggregate.aggregateIdentity.task489PredecessorPromotionSha256,
    promotion.predecessor.digest,
    "TASK-489 promotion SHA-256 binding",
  );
  requireClosedCleanTask551L10L02FinalDriftProjection(finalDrift);
  requireEveryDocumentMatchesCurrentSource(
    localFacts.currentSourceDocumentationSummary,
  );

  const changelog = buildTask551Changelog1310({
    taskIds: graph.allIds,
    metrics: aggregate.metrics,
    redisSmoke: localFacts.redisSmokeSummary,
    audits: localFacts.postAuditSummary,
    collisionStatus: localFacts.collisionStatusSummary,
  });
  const statusDelta = deriveCurrentStatusBucketDelta(graph.currentStatuses, {
    terminal: "Done", graphCount: 41,
  });
  // Keep this as the immediately preceding gate for the first mutation: a
  // changed working tree can retain HEAD yet invalidate L11's final drift.
  await requireExactTask551L10L02FinalDriftCurrentTreeBinding(
    finalDrift,
    readCanonicalTask551L10L02CurrentTreeIdentity,
  );
  await writeNewChangelogAndIndexRow(changelog); // fail on existing/collision
  await markDescendantsThenParentsDone(graph);
  await moveParentRowAndApplyVerifiedStatisticsDelta(current, statusDelta);
  await verifyExactClosureDiff(graph, changelog, statusDelta);
}

function requireStrictTask551L10L02TerminalHandoff(
  supplied: Task551L10L02DispatchInputV1,
): Task551L10L02DispatchInputV1 {
  const handoff = validateRejectUnknownTask551L10L02DispatchInputV1(supplied, {
    dispatchAllowedFields: [
      "task551L10L01Aggregate", "task551L11Task489PredecessorPromotion",
      "finalDrift",
    ],
    aggregateType: "Task551L10L02AggregateProjectionV1",
    promotionType: "Task551Task489PredecessorPromotionEvidenceV1",
    finalDriftType: "Task551L10L02FinalDriftProjectionV1",
    aggregateAllowedFields: [
      "schema", "pass", "aggregateIdentity", "status", "fixtureProfiles",
      "metrics", "runtimeEvidenceSha256",
    ],
    promotionAllowedFields: [
      "schemaVersion", "sourceTask", "sourcePhase", "sourceProfile",
      "sourceScenario", "sourceHead", "sourceDigest", "predecessor",
      "promotionState", "promotionDecision", "promotionReason",
      "validationSummaries", "createdAt", "reviewedAt", "promotedAt",
      "ownerCapabilityReceiptDigest",
    ],
    promotionPredecessorAllowedFields: ["sourcePath", "durablePath", "schemaVersion", "digest"],
    promotionValidationSummaryAllowedFields: ["sourceIdentity", "predecessorBytes", "atomicNoReplace", "terminalHead"],
    promotionRequiredValues: {
      schemaVersion: "coderso.task551.task489-predecessor-promotion@v1",
      sourceTask: "TASK-551-05-L02", sourcePhase: "05-l02", sourceProfile: null,
      sourceScenario: "task489-predecessor",
      predecessorSourcePath: ".tmp/task-551/task489-predecessor-v1.json",
      predecessorDurablePath: "_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json",
      predecessorSchemaVersion: "coderso.task551.task489-predecessor@v1",
      promotionState: "promoted", promotionDecision: "accept",
      promotionReason: "exact-byte-match-after-owner-review",
      validationSummaryValues: { sourceIdentity: "passed", predecessorBytes: "passed", atomicNoReplace: "passed", terminalHead: "passed" },
    },
    promotionDigestFields: ["sourceDigest", "predecessor.digest", "ownerCapabilityReceiptDigest"],
    finalDriftAllowedFields: ["schema", "clean", "auditIdentity", "sha256"],
    finalDriftAuditIdentityAllowedFields: ["head", "currentTreeSha256"],
    recursivelyForbiddenProjectionFields: [
      "parserResult", "receiptBytes",
      "commands", "ownerHandoffs", "errors", "rawEvidence", "summary",
      "findings", "rawAuditInput", "rawAuditInputs", "auditResult",
      "auditResults", "fullAudit", "fullFinalDrift", "audit", "evidence",
      "results", "lenses", "auditEvidence",
    ],
  });
  requireCurrentApprovedTask551L10L02AggregateProjection(
    handoff.task551L10L01Aggregate,
  );
  requireExactTask551Task489PredecessorPromotionEvidenceV1(
    handoff.task551L11Task489PredecessorPromotion,
  );
  requireEqual(
    handoff.task551L10L01Aggregate.aggregateIdentity
      .task489PredecessorPromotionSha256,
    handoff.task551L11Task489PredecessorPromotion.sha256,
    "TASK-489 promotion SHA-256 binding",
  );
  requireClosedCleanTask551L10L02FinalDriftProjection(handoff.finalDrift);
  // This validates projection schemas only; it never opens/hashes bytes or
  // imports, invokes, or observes a TASK-489 predecessor receipt parser.
  return handoff;
}

function requireClosedCleanTask551L10L02FinalDriftProjection(
  supplied: unknown,
): Task551L10L02FinalDriftProjectionV1 {
  const projection = validateRejectUnknownTask551L10L02FinalDriftProjectionV1(
    supplied,
    {
      allowedFields: ["schema", "clean", "auditIdentity", "sha256"],
      requiredSchema: "coderso.task551.l10-l02.final-drift-projection@v1",
      requiredClean: true,
      auditIdentityAllowedFields: ["head", "currentTreeSha256"],
      recursivelyForbiddenFields: [
        "pass", "summary", "findings", "errors", "rawAuditInput",
        "rawAuditInputs", "auditResult", "auditResults", "fullAudit",
        "fullFinalDrift", "audit", "evidence", "results", "lenses",
        "auditEvidence", "rawEvidence", "commands", "sourcePath",
        "parserResult", "receiptBytes",
      ],
    },
  );
  requireCurrentHeadIdentity(projection.auditIdentity.head);
  requireStrictTask551Sha256(projection.auditIdentity.currentTreeSha256);
  requireStrictTask551Sha256(projection.sha256);
  return projection;
}

async function requireExactTask551L10L02FinalDriftCurrentTreeBinding(
  finalDrift: Task551L10L02FinalDriftProjectionV1,
  readCurrentTreeIdentity: Task551L10L02ReadCanonicalCurrentTreeIdentity,
): Promise<void> {
  const current = await readCurrentTreeIdentity();
  // The reader returns one current canonical identity snapshot. Confirm the
  // observed HEAD is live, then use the pure comparator below for both fields.
  requireCurrentHeadIdentity(current.head);
  assertExactTask551L10L02FinalDriftCurrentTreeBinding(
    finalDrift.auditIdentity,
    current,
  );
}

function assertExactTask551L10L02FinalDriftCurrentTreeBinding(
  captured: Task551L10L02FinalDriftProjectionV1["auditIdentity"],
  current: Task551L10L02CanonicalCurrentTreeIdentityV1,
): void {
  // Pure value comparison: it opens no audit, evidence, receipt, or source
  // bytes and normalizes nothing. Both values must already be canonical.
  requireStrictTask551Sha256(captured.currentTreeSha256);
  requireStrictTask551Sha256(current.currentTreeSha256);
  requireEqual(captured.head, current.head, "TASK-551 final-drift HEAD mismatch");
  requireEqual(
    captured.currentTreeSha256,
    current.currentTreeSha256,
    "task551_l10_l02_final_drift_tree_mismatch",
  );
}

function requireStrictTask551L10L02LocalClosureFacts(
  supplied: unknown,
): Task551L10L02LocalClosureFactsV1 {
  return validateRejectUnknownTask551L10L02LocalClosureFacts(supplied, {
    allowedFields: [
      "schema", "l03FixtureBootstrapSummary", "l02BaselineCheckSummaries",
      "l02FixtureBudgetSummary", "finalQueryInventorySummary",
      "adminListUiSmokeSummary", "leafManifestAttestation",
      "task55109DirectSuiteAttestation", "currentSourceDocumentationSummary",
      "redisSmokeSummary", "postAuditSummary", "collisionStatusSummary",
    ],
    requireExactSummaryFields: ["schema", "subject", "pass", "sha256"],
    expectedSubjects: [
      "l03-fixture-bootstrap", "l02-baseline-check-small",
      "l02-baseline-check-large", "l02-fixture-budget",
      "final-query-inventory", "admin-list-ui-smoke", "leaf-manifests",
      "task551-09-direct-suites", "current-source-documentation",
      "redis-smoke", "post-audit", "collision-status",
    ],
    rejectUnknownFieldsAtEveryNestedBoundary: true,
    rejectOpaqueMapsAndByteCarriers: true,
    recursivelyForbiddenFields: [
      "task551L10L01Aggregate", "task551L11Task489PredecessorPromotion",
      "aggregate", "promotion", "terminalHandoff", "fullAggregate",
      "fullPromotion", "parserResult",
      "receiptBytes", "commands", "ownerHandoffs", "implementationHandoffs",
      "ownerTargetedHandoffs", "handoffs", "finalDrift", "fullFinalDrift",
      "auditResult", "auditResults", "fullAudit", "auditInput",
      "auditInputs", "summary", "findings", "errors", "rawEvidence",
      "rawAuditInput", "rawAuditInputs", "audit", "evidence", "results",
      "lenses", "auditEvidence",
    ],
  });
}
```

**Data flow:** final source/gate/audit/smoke receipts + TASK-551-11 durable
redacted L03 fixture-check evidence → its durable redacted L02 small/large
baseline-check evidence → private current TASK-551-10-L01 aggregate, the sole
L10 durable-byte/hash/parser consumer → L11
`buildTask55110L02MetadataOnlyDispatchInput` reduces the already-clean private
final drift to `Task551L10L02FinalDriftProjectionV1` with only its safe
head/tree identity and digest, alongside the existing aggregate/promotion
projections →
`dispatchTask55110L02(Task551L10L02DispatchInputV1)`, the sole L11 → L10-L02
call and sole cross-child argument → strict aggregate/promotion/final-drift
projection and SHA-binding validation. Independently, inside L10-L02 only,
`collectTask551L10L02LocalClosureFacts()` with no L11 argument → reject-unknown
`Task551L10L02LocalClosureFactsV1` named summary/attestation values only →
`closeTask551Metadata` receives the validated projection plus those local facts,
without opening bytes, hashing, or receiving a parser result → checked-in L02
fixture/budget artifacts → current-source docs and runbooks → strict 41-file
graph/index validation, including `TASK-551-02-L03` → build the changelog/status
plan → L10-L02's read-only
canonical current HEAD/tree snapshot plus pure exact comparison to the closed
final-drift `auditIdentity` immediately before the first write → changelog 1310
coverage → descendant-to-parent terminal metadata → board/statistics/index
verification.

**Error handling:** a stale/missing or non-passing approved aggregate
projection, promotion SHA-binding mismatch, missing/non-clean or malformed
`Task551L10L02FinalDriftProjectionV1`, a stale current HEAD/tree binding or
`task551_l10_l02_final_drift_tree_mismatch`, a second L11-supplied argument, a full
aggregate/promotion/final-drift alias, an unknown projection or local-fact field,
or any `Task551AuditResultV1`, audit `summary`, `findings`, `errors`, raw audit
input, predecessor metadata outside its canonical nested location, parser result, receipt bytes, commands,
owner handoffs, raw evidence, opaque map, or byte carrier at either boundary
aborts before the first closure write. Doc/source mismatch, open descendant,
duplicate/missing ID, changelog collision, wrong reservation/pointer, concurrent
index drift, unresolved finding, required skip, leaked sensitive value, broken
link, or unexpected diff also aborts closure. L02 never retries by opening durable
bytes, calculating a hash, invoking a predecessor parser, or accepting a generated
predecessor artifact. Re-read projections/current indexes after any conflict;
never overwrite or revert another task's bytes.

**Regression-test shape:** workflow/task-graph tests prove 41-file membership,
including `TASK-551-02-L03`, the leaf distribution, changelog coverage before terminal status, child-before-parent
closure, one board row move, current-status-derived per-bucket statistics deltas
for mixed To Do/In Progress/already-Done fixtures, graph-total preservation,
refusal to accept TASK-551-01-L02 fixture/budget evidence before L11's durable
redacted L03 object and both durable L02 profile objects, rejection of producer
stdout or a missing/nonpositive focused-test/non-null check-command receipt,
refusal of a missing, stale, failing, or noncanonical
`Task551L10L02AggregateProjectionV1` or
`Task551Task489PredecessorPromotionEvidenceV1`, a full aggregate/
promotion alias, an unknown/misplaced promotion field, or a predecessor-digest
binding mismatch. Pin Object.keys(promotion), Object.keys(promotion.predecessor),
and Object.keys(promotion.validationSummaries) to the exact ordered 16/4/4
field lists, then assert every fixed enum, required-null, path/schema, timestamp,
and lowercase digest value. They also prove the dispatcher accepts exactly one L11 argument,
the local-facts collector accepts no L11 argument, and the closed final-drift
projection accepts only its fixed schema, `clean:true`, safe `head`/
`currentTreeSha256` identity, and SHA-256 digest while rejecting
`Task551AuditResultV1`, `summary`, `findings`, `errors`, and raw audit inputs.
An isolated-worktree negative test captures a clean final-drift projection,
mutates a task-owned working-tree file without changing HEAD, then invokes the
real `dispatchTask55110L02` path. It must reject
`task551_l10_l02_final_drift_tree_mismatch` from the exact canonical
current-tree comparison and prove spies for the changelog, status, board, and
documentation writers recorded zero writes. A matching unchanged-tree case
proves the reader/comparator uses equality rather than merely validating SHA
syntax.
The closed local-facts schema rejects every aggregate/promotion/final-drift alias
plus predecessor metadata outside its canonical nested location, parser result, receipt bytes, commands,
owner handoffs, audit `summary`, `findings`, `errors`, raw audit input, raw
evidence, opaque maps, and byte carriers at every nested boundary. Tests prove
L02 opens no predecessor path, calculates no predecessor hash, imports or invokes
no predecessor parser, and never accepts a generated predecessor artifact or
forbidden carrier. They also prove it records only the allowed passing approved
redacted aggregate identity/status/profile/metrics/runtime-digest summary, fully
terminal promotion `durablePath`/hash/the legacy terminal identity field identity-proof fact, and
the clean final-drift projection, one 1310 index row, next-free reservation
preservation, status-only task edits, and refusal on stale/concurrent index bytes.

## Testing Requirements

- Invoke `dispatchTask55110L02` exactly once with one L11-built
  `Task551L10L02DispatchInputV1`; consume its current passing
  `Task551L10L02AggregateProjectionV1` only—not a full L01 aggregate—its
  existing promotion projection, and only
  `Task551L10L02FinalDriftProjectionV1` for final drift. Bind the aggregate's
  approved Redis/Admin-list UI-smoke digest summary to separately collected local
  summary attestations and TASK-551-01-L01's fresh final exact-set inventory
  receipt; never supply `Task551AuditResultV1` to L10-L02.
- Validate exactly one TASK-551-11-owned durable redacted L03 fixture-check
  object before its exactly two durable redacted L02 `small`/`large` baseline
  objects and before consuming any L02 fixture/budget receipt. Each object must
  prove strict no-leak/proof fields, a focused test with positive discovery, and
  a `--check` command with null discovery, zero exit and no skip. Include both
  producer leaves in the exact graph, status, changelog-coverage, and terminal-
  order checks; never consume producer stdout directly.
- Validate every executable 01..09 leaf's exact literal manifest locally before
  emitting only a closed manifest digest/attestation with zero exit, no skip, and
  positive test discovery; local closure facts never retain argv or commands.
  Separately validate all four 09 direct-suite ownership lists into their closed
  direct-suite attestation; closure reruns/edits none of them.
- Accept exactly one strict `Task551L10L02DispatchInputV1` from L11 with
  `task551L10L01Aggregate: Task551L10L02AggregateProjectionV1` and
  `task551L11Task489PredecessorPromotion:
  Task551Task489PredecessorPromotionEvidenceV1`, and
  `finalDrift: Task551L10L02FinalDriftProjectionV1`; reject full aliases, all
  unknown projection fields, `Task551AuditResultV1`, audit `summary`,
  `findings`, `errors`, raw audit inputs, predecessor metadata outside its canonical nested location, parser
  result, receipt bytes, commands, owner handoffs, and raw evidence. Assert the
  only permitted aggregate values are current `pass:true` approved redacted
  identity/status/profile/metric/runtime-digest data, the only permitted
  promotion value is the exact canonical 16-field `Task551Task489PredecessorPromotionEvidenceV1` record, and the only
  permitted final-drift values are its fixed schema, `clean:true`,
  `auditIdentity: { head, currentTreeSha256 }`, and SHA-256 digest. The
  aggregate's bound promotion SHA must equal the promotion SHA. L02 must not
  open a predecessor path, accept a generated predecessor artifact,
  calculate/recheck a hash, import or invoke a parser, or inspect/reconstruct a
  parser result; TASK-551-10-L01 alone owns that durable-byte/hash/parser
  aggregate consumption.
- Construct `Task551L10L02LocalClosureFactsV1` only inside L10-L02 through its
  zero-argument collector, then reject unknown root/nested fields and every
  aggregate/promotion alias, predecessor metadata outside its canonical nested location, parser result,
  receipt bytes, commands, owner handoffs, `finalDrift`, full audit result,
  audit `summary`, `findings`, `errors`, raw audit input, raw evidence, opaque
  map, and byte carrier. No second L11 input or local field may contain any
  terminal handoff alias.
- Validate all links/configuration/API tables against current source and reject
  any undocumented or speculative endpoint behavior.
- Run the workflow graph/status/changelog checks, link checker, lint/type checks,
  diff check, and complete touched production/test line-count gate below.
- Do not write terminal metadata when any receipt is stale, skipped, malformed,
  missing a screenshot/theme, carries a console error, has an unresolved finding,
  or when the sole final-drift terminal projection is not exact and `clean:true`.
- Immediately before the first closure writer, read L10-L02's canonical current
  HEAD/tree identity and require exact equality with final drift's closed
  `auditIdentity`; never accept a matching HEAD plus a merely well-formed digest.
  In an isolated worktree, mutate a task-owned file after final-drift capture but
  before dispatch and prove the real dispatcher rejects
  `task551_l10_l02_final_drift_tree_mismatch` with zero changelog, status, board,
  or documentation writes; retain the unchanged-tree positive case.
- Prepare exactly ONE reviewed closure scope for the owner (changelog 1310
  file + index row + all 41 task-file status edits, including TASK-551-02-L03,
  and board row/statistics) and
  never close/commit partial status before the changelog file exists; the
  changelog file's presence is a synchronization fact, not an immutable
  commit-history gate.
- Validate status statistics from the actual 41-node pre-close buckets; fixtures
  must cover the TASK-551-01 interim In Progress state and already-Done nodes,
  and must reject a hardcoded `To Do -41 / Done +41` assumption.

## Terminal-Handoff Acceptance Gate

Before any changelog, status, board, or documentation write, acceptance requires
one current L11-built `Task551L10L02DispatchInputV1` as the dispatcher's sole
argument and separately collected, strict `Task551L10L02LocalClosureFactsV1`.
The terminal projections have exactly the allowed shapes, the aggregate has
`pass:true` and approved redacted current metrics/identity, and the promotion SHA
matches the aggregate identity binding. The promotion must contain exactly the canonical 16-field
`Task551Task489PredecessorPromotionEvidenceV1` record with exact nested
predecessor and validation-summary fields; final drift must contain only
`{ schema, clean: true, auditIdentity: { head, currentTreeSha256 }, sha256 }`.
A second L11 argument, full aggregate/promotion/final-drift alias,
`Task551AuditResultV1`, audit `summary`, `findings`, `errors`, raw audit inputs,
`sourcePath`, parser result, receipt bytes, commands, owner
handoffs, raw evidence, opaque map, byte carrier, or any unknown
local/projection field is a hard failure. The acceptance test asserts dispatcher
arity one and a zero-argument local collector, spies on file/hash/parser APIs,
and proves L02 never calls them for either predecessor path. No terminal write is
acceptable without this gate. Immediately before the first writer, a local
read-only canonical current HEAD/tree reader and pure comparator must prove exact
equality to final drift's `auditIdentity`; a post-capture task-owned worktree
mutation with unchanged HEAD must reject
`task551_l10_l02_final_drift_tree_mismatch` and leave every writer uncalled.

## Exact Validation Commands

First run the strict terminal-handoff acceptance test above, including reject-
unknown shape and SHA-binding cases, then consume the current green L01
projection receipt and run closure-only checks:

```bash
node --check _docs/_workflows/task-551-author-audit.mjs
node --check _docs/_workflows/task-551-implement.mjs
node --check _docs/_workflows/task-551-fix.mjs
bun test tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/authorAuditDriftRounds.test.ts tests/unit/workflows/authorAuditBoundedChild.test.ts tests/unit/workflows/task551WorkflowContracts.test.ts tests/unit/workflows/workflowContractsBootstrap.test.ts tests/unit/workflows/workflowContractsSubgates.test.ts tests/unit/workflows/workflowContractsImplementation.test.ts tests/unit/workflows/task551EvidenceContract.test.ts tests/unit/workflows/evidenceContractMatrix.test.ts tests/unit/workflows/dispatchContractCaps.test.ts
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
Ownership**, plus `_docs/PAGE_MODEL.md` and
`docs/guide/screens/page-editor-preview-settings-and-history.md` (ownership
amendment 2026-09-25, "06-L02 R7 docs mirror" section below). No other
documentation is modified without a fresh ownership amendment and reconcile
PASS.

## Workflow Dispatch Envelope

The static allowlist is closed to the current documentation, task metadata, and
indexes. `task551-changelog-closure-entry` is the sole dynamic materialization
authority: before any writer runs, the trusted L11 resolver must return exactly
`{ changelogPath, closureReceiptPaths: [] }`, where `changelogPath` is the one
current-graph pinned 1310 path derived from a valid Gregorian UTC `YYYY-MM-DD`
date under `_docs/_CHANGELOG/`. Its sorted materialized result must equal only
that path; raw path/data, wildcard, extra/missing/duplicate, root escape,
symlink, non-1310, or stale graph rejects before every closure writer.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-10-L02",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-10"
  },
  "artifactPolicy": "task551-changelog-closure-entry",
  "allowlist": [
    "_docs/DATABASE_PERFORMANCE.md",
    "_docs/SERVER_CACHE.md",
    ".env.example",
    "README.md",
    "_docs/ARCHITECTURE.md",
    "_docs/CMS_API.md",
    "_docs/SEARCH_SPEC.md",
    "_docs/ORM_SPEC.md",
    "_docs/DATA_MODEL.md",
    "_docs/TESTING_STRATEGY.md",
    "_docs/SECURITY_SPEC.md",
    "_docs/CODERSO_RELEASE_GATES.md",
    "_docs/ADMIN_CACHE.md",
    "_docs/ADMIN_CACHE_MAP.md",
    "docs/develop/getting-started.md",
    "docs/develop/architecture.md",
    "docs/develop/runtime-model.md",
    "docs/develop/security.md",
    "docs/develop/testing.md",
    "_docs/PAGE_MODEL.md",
    "docs/guide/screens/page-editor-preview-settings-and-history.md",
    "_docs/_TASKS/TASK-551-01-L01-Production-Query-Inventory-And-Ownership-Matrix.md",
    "_docs/_TASKS/TASK-551-01-L02-Small-Large-Fixtures-Baselines-And-Budgets.md",
    "_docs/_TASKS/TASK-551-01-L03-Isolated-Fixture-Target-Bootstrap.md",
    "_docs/_TASKS/TASK-551-01-L04-Archive-Preserving-Freeze-Candidate-Generation-Bootstrap.md",
    "_docs/_TASKS/TASK-551-01-Performance-Baseline-Query-Inventory-And-Budgets.md",
    "_docs/_TASKS/TASK-551-02-L01-Validated-Database-Configuration-And-Cluster-Budget.md",
    "_docs/_TASKS/TASK-551-02-L02-Pool-Lifecycle-Timeouts-And-Sanitized-Query-Telemetry.md",
    "_docs/_TASKS/TASK-551-02-L03-Measure-Wiring-And-Pool-Telemetry-Gates.md",
    "_docs/_TASKS/TASK-551-02-Pool-Timeouts-Lifecycle-And-Query-Telemetry.md",
    "_docs/_TASKS/TASK-551-03-Bounded-Read-Models-Keyset-Batching-And-N-Plus-One.md",
    "_docs/_TASKS/TASK-551-03-L01-Shared-Keyset-Cursor-And-Bounded-Read-Contracts.md",
    "_docs/_TASKS/TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md",
    "_docs/_TASKS/TASK-551-03-L03-Set-Based-Aggregates-Batching-And-N-Plus-One-Removal.md",
    "_docs/_TASKS/TASK-551-04-Canonical-Search-Vectors-And-Bounded-Retrieval.md",
    "_docs/_TASKS/TASK-551-04-L01-Canonical-FTS-Trigram-And-Ranked-SQL-Contract.md",
    "_docs/_TASKS/TASK-551-04-L02-Bounded-Assistant-Documentation-Candidates.md",
    "_docs/_TASKS/TASK-551-05-Evidence-Driven-Indexes-Constraints-And-Explain.md",
    "_docs/_TASKS/TASK-551-05-L01-Schema-Split-Indexes-And-Concurrency-Constraints.md",
    "_docs/_TASKS/TASK-551-05-L02-Sanitized-Explain-Plan-And-Constraint-Verification.md",
    "_docs/_TASKS/TASK-551-05-L03-Normalized-Solution-Kit-Rollback-Authority.md",
    "_docs/_TASKS/TASK-551-06-L01-Append-Heavy-Retention-And-Bounded-Pruners.md",
    "_docs/_TASKS/TASK-551-06-L02-Concurrency-Safe-Revisions-And-Retention.md",
    "_docs/_TASKS/TASK-551-06-L03-Maintenance-Scheduling-Partition-Readiness-And-Recovery.md",
    "_docs/_TASKS/TASK-551-06-Retention-Pruning-Revision-Concurrency-And-Partition-Readiness.md",
    "_docs/_TASKS/TASK-551-07-L01-Typed-Cache-Contract-Envelope-Keys-And-Eligibility.md",
    "_docs/_TASKS/TASK-551-07-L02-Byte-Bounded-Memory-LRU-And-Singleflight.md",
    "_docs/_TASKS/TASK-551-07-Typed-Local-First-Server-Cache.md",
    "_docs/_TASKS/TASK-551-08-L01-Redis-Adapter-And-Failure-Semantics.md",
    "_docs/_TASKS/TASK-551-08-L02-Durable-Outbox-Generations-And-PubSub.md",
    "_docs/_TASKS/TASK-551-08-L03-Distributed-Lease-And-Multi-Replica-Parity.md",
    "_docs/_TASKS/TASK-551-08-Redis-Durable-Invalidation-And-Distributed-Coalescing.md",
    "_docs/_TASKS/TASK-551-09-Hot-Path-Adoption-And-Cache-Correctness.md",
    "_docs/_TASKS/TASK-551-09-L01-Warm-Public-Read-Models-And-Zero-Query-Hits.md",
    "_docs/_TASKS/TASK-551-09-L02-Page-Entry-Post-And-SEO-Invalidation.md",
    "_docs/_TASKS/TASK-551-09-L03-Shell-Theme-Settings-Redirect-Form-And-Listing-Invalidation.md",
    "_docs/_TASKS/TASK-551-09-L04-Admin-Identity-And-Security-Cache-Hardening.md",
    "_docs/_TASKS/TASK-551-10-L01-Small-Large-Load-Fault-Security-And-Redis-Smoke-Gates.md",
    "_docs/_TASKS/TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md",
    "_docs/_TASKS/TASK-551-10-Performance-Fault-Gates-Documentation-And-Closure.md",
    "_docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md",
    "_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md",
    "_docs/_TASKS/README.md",
    "_docs/_CHANGELOG/README.md"
  ],
  "forbiddenPaths": [
    "core/db/schema.ts",
    "core/server/publicSite.tsx",
    "tests/perf/task551DatabaseCachePerformanceGate.test.ts",
    "scripts/task551-redis-smoke.ts",
    ".github/workflows/coderso-pr-gates.yml",
    "_docs/_workflows/task-551-author-audit.mjs",
    "_docs/_workflows/_smoke/task-551/runtime/redis-smoke-v1.json"
  ],
  "dependencies": ["TASK-551-10-L01:single"],
  "commands": [
    {
      "id": "author-audit-syntax",
      "lane": "tooling",
      "argv": ["node", "--check", "_docs/_workflows/task-551-author-audit.mjs"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "implement-workflow-syntax",
      "lane": "tooling",
      "argv": ["node", "--check", "_docs/_workflows/task-551-implement.mjs"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "fix-workflow-syntax",
      "lane": "tooling",
      "argv": ["node", "--check", "_docs/_workflows/task-551-fix.mjs"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "workflow-contract-tests",
      "lane": "bun-test",
      "argv": ["bun", "test", "tests/unit/workflows/task551AuthorAudit.test.ts", "tests/unit/workflows/authorAuditDriftRounds.test.ts", "tests/unit/workflows/authorAuditBoundedChild.test.ts", "tests/unit/workflows/task551WorkflowContracts.test.ts", "tests/unit/workflows/workflowContractsBootstrap.test.ts", "tests/unit/workflows/workflowContractsSubgates.test.ts", "tests/unit/workflows/workflowContractsImplementation.test.ts", "tests/unit/workflows/task551EvidenceContract.test.ts", "tests/unit/workflows/evidenceContractMatrix.test.ts", "tests/unit/workflows/dispatchContractCaps.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "test-paths", "paths": ["tests/unit/workflows/task551AuthorAudit.test.ts", "tests/unit/workflows/authorAuditDriftRounds.test.ts", "tests/unit/workflows/authorAuditBoundedChild.test.ts", "tests/unit/workflows/task551WorkflowContracts.test.ts", "tests/unit/workflows/workflowContractsBootstrap.test.ts", "tests/unit/workflows/workflowContractsSubgates.test.ts", "tests/unit/workflows/workflowContractsImplementation.test.ts", "tests/unit/workflows/task551EvidenceContract.test.ts", "tests/unit/workflows/evidenceContractMatrix.test.ts", "tests/unit/workflows/dispatchContractCaps.test.ts"], "minimum": 10 }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "argv": ["git", "diff", "--check"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-10-L01:single"],
      "commandIds": ["author-audit-syntax", "implement-workflow-syntax", "fix-workflow-syntax", "workflow-contract-tests", "core-lint-types", "core-lint", "diff-check"]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-25 (03-L02 round-2 mirror)

Source: disposition R2-34 in
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round2-dispositions.md`
("10-L02 scenario count 8"), mirroring TASK-551-03-L02 C15 ("Runtime smoke").
This section is append-only and supersedes only the sentence quoted below. The
envelope, ownership, validation commands and every other clause are unchanged.

- **Superseded (`:536-537`, Required Documentation Content):** "the five
  TASK-551-03-L02 Admin-list visible-effect scenarios, light/dark screenshots,
  and zero-console-error receipt alongside the infrastructure smoke."
- **Now reads:** "the eight TASK-551-03-L02 Admin-list visible-effect scenarios
  of suite `task-551-admin-lists` (session `wf55103l02`), in this order:
  `pagination-next-previous`, `filter-reset`, `equal-sort-boundary`,
  `booking-dirty-refresh`, `extracted-views`, `page-history-load-more`,
  `offpage-selected-label`, `custom-screen-list-view`; each in light and dark
  with screenshots under `_docs/_workflows/_smoke/task-551/03-l02/wf55103l02/`,
  plus the zero-console-error receipt, alongside the infrastructure smoke."
- The documentation deliverable names exactly these eight ids. A five-scenario
  receipt or a missing id fails this item.

## Dated Contract Corrections — 2026-09-25 (06-L02 R7 docs mirror; append-only)

Sources: TASK-551-06-L02 "R7 amendments (round 2, 2026-09-25)" G1 (page
whole-family floor) and G5 (request-path handoff), the 06-L02 R7 re-audit B
reconciliation of the full-site lifecycle path, and TASK-551-03-L02 C17 v2
(round-2 items owed to this leaf). This section is append-only. Besides it,
only the envelope `allowlist` (two added paths) and the **Documentation Updates
Required** paragraph were edited in place; ownership, validation commands and
every other clause are unchanged. Anchors were verified on 2026-09-25 at HEAD
`9c5b6666` plus the uncommitted R6/R7 edits; the implementer re-reads every
anchor at closure because the owning 06-L02 R7 edits shift line numbers.

### Ownership amendment (two literal paths)

- `_docs/PAGE_MODEL.md` and
  `docs/guide/screens/page-editor-preview-settings-and-history.md` join this
  leaf's single-writer documentation set and its envelope `allowlist`. A grep
  over all 41 `TASK-551*.md` files found no other envelope listing either path
  (TASK-551-06-L02 names them only in prose, as a handoff to this leaf).
- Edits are limited to the revision-retention statements below; no formatter
  rewrite of either file. No envelope command lists documentation line
  counts, so no command changes; the production/test line-count gate is
  unaffected (both are documentation).

### Revision retention statements owed to the two docs

Precondition: 06-L02 R7 (R7-F1 plus G1) has landed and is green. The closure
writer verifies before writing that `resolveWholeFamilyRetentionPolicy`
exists in `core/services/content/revisionRetentionService.ts` and is applied in
`runRevisionFamilyRetention`; if it is absent, STOP (the scheduler statement
below would be false).

Current text to reconcile (verified anchors):

- `_docs/PAGE_MODEL.md:990-993` — "`settings.revisionRetention` controls
  publish revision retention: default 10, min 1, max 100";
- `_docs/PAGE_MODEL.md:2418-2420` (Revisions And Autosave) — "`publish`
  snapshots, governed by `settings.revisionRetention`; one latest `autosave`
  snapshot";
- `docs/guide/screens/page-editor-preview-settings-and-history.md:273-275` —
  "Revision retention is a page-level policy ...".

The two docs must state, consistently, exactly these facts:

1. **Per-page setting.** `settings.revisionRetention` is an integer 1..100,
   default 10 (`core/services/pages/revisionRetention.ts`:
   `DEFAULT_PAGE_REVISION_RETENTION`, `MIN_`/`MAX_PAGE_REVISION_RETENTION`;
   non-numeric values normalize to 10, out-of-range values clamp).
2. **Request path (publish and explicit prune).** On publish
   (`core/services/pages/pageService.ts:229-238` -> `pruneRevisionsTx`) and on
   the explicit `pruneRevisions(pageId, keep)` the page keeps its newest N
   revision rows counted across BOTH kinds (publish rows plus the single
   latest autosave row), where N is `settings.revisionRetention`. A row beyond
   those N is deleted only when it is also older than the family
   `maxAgeDays` (180 by default, `RETENTION_PAGE_REVISIONS_MAX_AGE_DAYS`,
   30..2555). Saving an autosave does not itself prune.
3. **Full-site lifecycle path.** The site-lifecycle publish
   (`pageService.ts:633-643`) keeps the N newest PUBLISH rows of the staged
   page (autosave rows are not counted toward N) and does not age-gate. The
   docs name both paths explicitly instead of the single "controls publish
   revision retention" sentence, so `PAGE_MODEL.md:990-993` and `:2419` no
   longer contradict the request-path behaviour in item 2.
4. **Scheduled whole-family job.** The `page_revisions` family pass
   (TASK-551-06-L03 scheduler -> `runRevisionFamilyRetention`) deletes only
   rows older than `maxAgeDays` that lie beyond a per-page floor of
   `max(RETENTION_PAGE_REVISIONS_KEEP_NEWEST_PER_PARENT, MAX_PAGE_REVISION_RETENTION)`,
   i.e. never below 100 for pages (family default 50, env bounds 1..500), so
   the scheduler never deletes a row a page's own setting could keep. Other
   revision families use their family value unchanged.
5. **Newest publish anchor.** The newest `kind='publish'` row of every page
   always survives every path (request, lifecycle, scheduled).
6. **Behaviour change.** Older publish rows ARE prunable once they are beyond
   the applicable floor and older than `maxAgeDays`. This is new after
   TASK-551-06-L02 R7: before it, a defect in the published-anchor predicate
   protected every publish row, so none was ever deleted. The changelog 1310
   entry records this as a user-visible behaviour change.

The guide (`page-editor-preview-settings-and-history.md`) states items 1, 2,
5 and 6 in end-user terms (keep a higher value for sensitive pages; rows older
than the retention age beyond the setting may be removed; the latest published
version is always kept) and may reference the scheduled job without env names.
`PAGE_MODEL.md` states all six items with the constant and env names.

### TASK-551-03-L02 C17 v2 items owed to this leaf

The earlier 2026-09-25 03-L02 round-2 mirror above covers only the eight-
scenario smoke receipt. TASK-551-03-L02 "R2-10 / R2-11 / R2-34 — C17 handoffs
v2" (its task file `:4173`, list at `:4212-4219`) keeps the Round-1 C17 list
for this leaf (`:2834-2839`: endpoint cursor/limit/error deltas, custom-screen
projection parameters, export-job routes, the booking split map, the Admin
cache delta for `_docs/ADMIN_CACHE.md`/`_docs/ADMIN_CACHE_MAP.md`, and the
`.env.example` entry) and adds the items below. None of them was recorded in
this file before this section. All target docs are already in this leaf's set;
`_docs/CMS_API.md` carries the route and error rows.

- **R2-01 `last_admin`:** the last-admin guard counts only `status =
  'active'` users holding a full-access role; a disabled or pending admin no
  longer counts, so it no longer prevents demoting or disabling the last
  active one. The loser code stays `last_admin` (409).
- **Fence 503 rows (R2-01):** `mapAdminUserError` and `mapAdminRoleError` map
  `native_cms_writer_fence_busy` and `native_cms_writer_recovery_required` to
  503 with the same code and fixed messages (03-L02 `:2973-2977`).
- **Comma-list query parameters (R2-04, 03-L02 `:3117`):** multi-value params
  are single-key comma lists (`ids=a,b`; also `fields`, `types`), bounded,
  strict tokens, duplicates rejected; a repeated key collapses to its last
  value at the transport and is not a supported form. This supersedes the
  Round-1 wording "`ids[]`".
- **Form export-job routes (R2-06, 03-L02 `:3266`):** INITIAL
  `POST /forms/:id/export-jobs` and `GET /forms/:id/export-jobs/:jobId`;
  FINAL `GET /forms/:id/export-jobs/:jobId/download?token=` (after
  TASK-551-08-L03 FINAL), with their `forms:read` RBAC and error codes.
- **Booking week (R2-18, 03-L02 `:3457`):** `GET /booking/reservations/week`
  (`booking:read`, bounded span, `booking_week_range_invalid` 400).
- **`PAGINATION_CURSOR_SECRET`:** the `.env.example` entry remains owed
  (purpose and size requirement, no real value), subject to the existing
  TASK-511-07 `.env.example` precondition.

Exact route paths, parameters, bounds and error codes are copied from the
landed 03-L02 source and its C17 v2 text at closure, never from this summary; a
mismatch is resolved in favour of the shipped source and recorded in the
changelog entry.

## Dated Contract Corrections — 2026-09-25 (03-L02 Round-3/4 docs mirror; append-only)

Source: orchestrator disposition R4-15 in
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round4-dispositions.md`
("TASK-551-10-L02 Round-3 mirror"), mirroring TASK-551-03-L02 "C17 v3 —
Handoffs" (its task file `:5577`, 10-L02 list at `:5591-5597`) and the
Round-3 items it cites: R3-07 (`:4730`), R3-09 (`:4790`), R3-11 (`:4838`),
R3-18 (`:5212`) and R3-26 (`:5381`, `displayField` bullet `:5413-5415`), plus
Round-4 disposition R4-08 (week cache). This section is append-only and
supersedes only the two sentences quoted below. The envelope, allowlist,
ownership, validation commands and every other clause are unchanged: every
target document named here (`.env.example`, `_docs/ADMIN_CACHE_MAP.md`,
`_docs/ADMIN_CACHE.md`, `_docs/CMS_API.md`) is already in this leaf's
**Exact Single-Writer Ownership** list (`:104`, `:115-116`) and envelope
`allowlist` (`:1222`, `:1232-1233`), so no fence edit is made. Anchors were
verified on 2026-09-25 at HEAD `9c5b6666` plus the uncommitted Round-3/4
edits; 03-L02 line numbers shift as that file grows (the C17 v2 heading cited
as `:4173` in the section above is now at `:4191`), so the closure writer
re-reads every anchor.

### Superseded sentences

- **Superseded (`:1476-1478`, "TASK-551-03-L02 C17 v2 items owed to this
  leaf"):** "**Fence 503 rows (R2-01):** `mapAdminUserError` and
  `mapAdminRoleError` map `native_cms_writer_fence_busy` and
  `native_cms_writer_recovery_required` to 503 with the same code and fixed
  messages (03-L02 `:2973-2977`)."
- **Now reads:** "**Fence 503 rows (R2-01, R3-11):** `mapAdminUserError`
  (`core/server/routes/adminUsersRoutes.ts`) and `mapAdminRoleError`
  (`core/server/routes/adminRolesRoutes.ts`) map all four writer-fence codes
  thrown by `core/db/nativeCmsWriterFence.ts` —
  `native_cms_writer_fence_busy`, `native_cms_writer_recovery_required`,
  `native_cms_writer_fence_failed` and `native_cms_writer_fence_lost` — to
  503 with the same code and a fixed message, never echoing driver text
  (03-L02 R3-11, `:4838-4851`). Backup's existing 409 busy row is unchanged."
- **Superseded (`:1494-1497`, closing paragraph of the same section):**
  "Exact route paths, parameters, bounds and error codes are copied from the
  landed 03-L02 source and its C17 v2 text at closure, never from this
  summary; a mismatch is resolved in favour of the shipped source and
  recorded in the changelog entry."
- **Now reads:** "Exact route paths, parameters, bounds, error codes, env
  names and cache keys are copied from the landed 03-L02 source and its
  latest dated C17 text at closure — C17 v3 (`:5577`), or a later dated C17
  v4 if 03-L02 lands one that supersedes it — never from this summary; C17 v2
  bullets apply only where C17 v3/v4 leaves them standing. A mismatch is
  resolved in favour of the shipped source and recorded in the changelog
  entry." (No C17 v4 heading exists in 03-L02 on 2026-09-25; the closure
  writer greps for it before copying.)

### Additional C17 v3 items owed to this leaf

These join the C17 v2 list above; none was recorded in this file before this
section.

- **`.env.example` export entries (R3-09).** Two entries, with purpose text
  and no real value, subject to the existing TASK-511-07 `.env.example`
  precondition (`:104`, `:134`):
  - `FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET` — HMAC key for export download
    tokens (`core/services/forms/submissionExportJob.ts:145-149`; operators
    generate 32 random bytes). REQUIRED for multi-replica deployments. When
    unset, a per-process random key is used (`:139-143`), so on a single
    replica a restart invalidates every outstanding token (403
    `submission_export_token_invalid`); this is documented behaviour, not a
    defect.
  - `FORM_SUBMISSIONS_EXPORT_DIR` — export artifact root (default
    `storage/exports`, resolved against the process cwd,
    `submissionExportJob.ts:132-135`). A multi-replica deployment MUST point
    every replica at the same shared directory; otherwise a token minted on
    one replica returns 403 on another or its artifact returns 404.
  - The existing `PAGINATION_CURSOR_SECRET` entry (C17 v2 bullet above) is
    written in the same edit: purpose (keyset cursor signing,
    `core/services/database/keysetCursor.ts:317`) and the at-least-32-
    decoded-bytes requirement, no real value.
- **`_docs/ADMIN_CACHE_MAP.md` week key (R3-07, R4-08).** A row for the
  booking week family `bookingReservationsWeek`, keyed as
  `buildAdminListCacheKey(cacheKeys.bookingReservationsList, "week", filters,
  null)` in `core/admin/services/bookingClient.ts` (no new `cachePolicy.ts`
  key; 03-L02 `:3495-3499`). Sources/invalidation: the same-tab create and
  status-update mutations clear it before their existing broadcast; a
  `bookingReservationsList` cacheBus event (same-tab or cross-tab) clears it;
  `clearBookingCache` clears it; the week Map, in-flight map and subscription
  are registered with `registerAdminModuleCacheReset` and guarded by the
  installation token; a completion after an invalidation is returned but
  never cached; `BookingPage` renders only the latest week request (request
  token) and force-revalidates the active week in the background on a list
  event. `_docs/ADMIN_CACHE.md` states the same rule in prose.
- **Admin users list is memory-only (R3-18).** `_docs/ADMIN_CACHE_MAP.md`
  and `_docs/ADMIN_CACHE.md` record that the Admin users list
  (`core/admin/services/adminUsersClient.ts`) is cached in memory only (memory
  key prefix `admin-users:list`, never a storage key): no
  `localStorage`/`sessionStorage` slot and no persisted first page, because
  rows carry PII; it is cleared by module cache reset and by every users
  mutation.
- **`relatedEntryResolver` `displayField` nested-path drop (R2-24, R3-26).**
  `_docs/CMS_API.md`, beside the custom-screen projection parameters already
  owed there (C17 v2 list above), records the visible behaviour change in
  `core/services/customScreens/relatedEntryResolver.ts`: a `displayField` is
  projected only when it is a top-level scalar key matching
  `ADMIN_LIST_FIELD_KEY_PATTERN`; a nested path is no longer resolved and the
  related entry's label falls back to the entry `title` (03-L02
  `:3849-3852`). The changelog entry lists it as a user-visible behaviour
  change. No Custom Screens guide page is in this leaf's set, so no other
  document is edited for it.

### Amendment (2026-09-25): Round-4/5 items

Source: orchestrator disposition R5-03 in
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round5-dispositions.md`
("10-L02 mirror adds the lowercase-only `ids` rule and the per-resource lock
note and replaces its "no C17 v4" sentence"), mirroring TASK-551-03-L02
"C17 v4 — Handoffs and owed mirrors" (its task file `:6561`, 10-L02 paragraph
`:6563-6569`: "Round 4 adds the lowercase-only `ids` rule to the `CMS_API`
delta (R4-03) and the per-resource reservation lock to the booking notes
(R4-01)."). This amendment is append-only and supersedes only the one
sentence quoted below. The envelope, allowlist, ownership, validation
commands and every other clause are unchanged: both target documents named
here (`_docs/CMS_API.md`, `_docs/DATABASE_PERFORMANCE.md`) are already in
this leaf's **Exact Single-Writer Ownership** list (`:102`, `:108`), so no
fence edit is made. Anchors were verified on 2026-09-25 at HEAD `9c5b6666`
plus the uncommitted Round-4/5 edits; 03-L02 line numbers shift as that file
grows (the C17 v3 heading cited as `:5577` in the section above is now at
`:5802`), so the closure writer re-reads every anchor.

#### Superseded sentence

- **Superseded (`:1545-1546`, "Superseded sentences" in the Round-3/4 docs
  mirror above, trailing the second "Now reads"):** "(No C17 v4 heading
  exists in 03-L02 on 2026-09-25; the closure writer greps for it before
  copying.)"
- **Now reads:** "03-L02 now carries "C17 v4 — Handoffs and owed mirrors"
  (`:6561` on 2026-09-25), which lists this leaf's owed items. Copy authority
  is the latest dated C17 heading in 03-L02 at closure: C17 v4 on 2026-09-25,
  or any later dated C17 heading that supersedes it. The closure writer greps
  03-L02 for every `C17 v` heading, copies from the highest dated one, and
  applies earlier C17 bullets only where that heading leaves them standing."
  C17 v4's own phrase "copy authority = C17 v3" describes the Round-3 mirror
  as recorded; it does not cap the rule above.

#### Round-4 items owed to this leaf

These join the C17 v2 and C17 v3 lists above; neither was recorded in this
file before this amendment.

- **Lowercase-only `ids` (R4-03; `CMS_API` delta).** `_docs/CMS_API.md`,
  beside the comma-list query-parameter row owed above (R2-04), records that
  every `ids` list accepts only lowercase canonical UUIDs: each token matches
  the fixed-width lowercase `U` class of the `ADMIN_LIST_PARAM_RULES` `ids`
  row (03-L02 R3-12 table, `:5089`), so an uppercase or mixed-case UUID is a
  pattern rejection → `validation_error` (400), and a repeated lowercase id
  stays a duplicate rejection → `validation_error` (03-L02 R4-03 table,
  `:6108-6109`; Security Contract rows (Round 4), `:6555-6556`). The Admin
  client serializer lowercases `ids` before its dedupe (`:5098`), so Admin UI
  requests are unaffected; direct API callers must send lowercase UUIDs. The
  changelog entry lists this as an API-visible tightening.
- **Per-resource reservation lock (R4-01; booking notes).**
  `_docs/DATABASE_PERFORMANCE.md`, under the concurrency-patterns and
  expected-error-mapping item (`:159-160`), and `_docs/CMS_API.md`, beside
  the booking rows owed above, record: the create and reactivation
  (`pending`/`confirmed`) reservation writes in
  `core/services/booking/bookingMutationService.ts` each run in one
  `read committed` transaction whose first statement is the exclusive
  transaction advisory lock `pg_advisory_xact_lock(551033,
  hashtext(resource_id))` (two-int4 form; namespace constant
  `BOOKING_RESOURCE_LOCK_NAMESPACE = 551_033`, never renumbered, taken by
  `acquireBookingResourceLock`; 03-L02 R4-01, `:5934-6040`, code block
  `:5973-5978`). The create preflight (reservation and blackout reads) runs
  on the transaction after the grant; reactivation keeps its no-preflight
  behaviour. A losing writer gets `booking_slot_unavailable` (409), either
  from the preflight or from the `23P01` exclusion backstop mapped to the
  same code, with no retry; the former bounded `40P01` retry is removed.
  Writers on different resources never wait on each other (a `hashtext`
  collision only over-serializes); blackouts and cancel/complete updates
  take no lock. `_docs/DATABASE_PERFORMANCE.md` names `551033` as the
  booking namespace, distinct from `551031`, `551032` and every other landed
  advisory-lock namespace (03-L02 collision inventory, `:6036-6040`). No
  other booking-lock wording exists in this file, so nothing earlier here is
  superseded by this bullet.

Exact namespace values, lock SQL, statuses and error codes are copied from
the landed 03-L02 source and its latest dated C17 text at closure, never
from this summary; a mismatch is resolved in favour of the shipped source
and recorded in the changelog entry.

### Amendment (2026-09-25): TASK-551-11 re-open ripples

Source: TASK-551-11 "Amendment v3 (2026-09-25): re-open scope after pre-audit"
(`TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md:1041` onward), handoff
bullet "**TASK-551-10-L02 (owner: 10-L02 closure).**" (`:1102`), plus the
orchestrator's v4 mandate that adds a seventh new test file,
`tests/unit/workflows/dispatchContractCaps.test.ts`. On 2026-09-25, at HEAD
`9c5b6666` plus the uncommitted re-open edits, the 11 file carries v3 only. Its
**V3-2** list names six new test files, and no text in it names
`dispatchContractCaps.test.ts`. This leaf takes the ten-file set from the v4
mandate. If v4 lands under another name, or without that file, the closure
writer uses the landed 11 list in place of the tenth path and records the
change in the changelog entry. This amendment is append-only. The only other
edits are the three in-place edits in item 1: the prose command and two
fields of one fence command. Every other clause, command, dependency and
occurrence is unchanged. Anchors were verified on 2026-09-25. Line numbers in
the 11 file shift as it grows, so the closure writer re-reads them.

#### 1. Family-closure sidecar test command covers all ten files

The re-open splits the three sidecar monoliths. The three original names stay,
because `scripts/task551QueryInventory/bunLane.ts:37-43` pins them in the
closed five-path `TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` list.
`:218-221` treats any other `task551`-named test as an unplanned stray. So
every new test file carries no `task551` token (11 **V3-2**). The new helper
modules are `task551AuthorAuditFixtures.ts`, `task551WorkflowContractsFixtures.ts`,
`task551WorkflowExecutionFixtures.ts` and `task551EvidenceContractFixtures.ts`.
They are not `*.test.ts`, so they are never argv or discovery paths. The new
lib modules are `task-551-dispatch-primitives.mjs`, `task-551-dispatch-envelope.mjs`,
`task-551-phase-provenance.mjs`, `task-551-worktree-snapshot.mjs` and
`task-551-l01-barrier.mjs`. None of them joins this leaf's commands. Running
only the three monoliths after the split would narrow coverage. The following
are therefore edited in place:

- **Prose command (`:1178`, "Exact Validation Commands").**
  - Superseded: "`bun test tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/task551WorkflowContracts.test.ts tests/unit/workflows/task551EvidenceContract.test.ts`"
  - Now reads: `bun test` over the ten paths listed below, in the same order.
- **Envelope command `workflow-contract-tests` (`:1320-1322`).**
  - Superseded argv: "`["bun", "test", "tests/unit/workflows/task551AuthorAudit.test.ts", "tests/unit/workflows/task551WorkflowContracts.test.ts", "tests/unit/workflows/task551EvidenceContract.test.ts"]`"
  - Superseded discovery: "`"paths": [<the same three>], "minimum": 1`"
  - Now: the argv is `bun`, `test` plus the ten paths (12 tokens, under the
    parser's 128-token argv cap). `positiveDiscovery.paths` lists the same ten
    paths, and `minimum` is `10`, equal to the path count, so a missing split
    file cannot pass as discovered.

The ten paths, in order (11 **V3-2** test order, with the v4 file last), all
under `tests/unit/workflows/`:

1. `task551AuthorAudit.test.ts`
2. `authorAuditDriftRounds.test.ts`
3. `authorAuditBoundedChild.test.ts`
4. `task551WorkflowContracts.test.ts`
5. `workflowContractsBootstrap.test.ts`
6. `workflowContractsSubgates.test.ts`
7. `workflowContractsImplementation.test.ts`
8. `task551EvidenceContract.test.ts`
9. `evidenceContractMatrix.test.ts`
10. `dispatchContractCaps.test.ts`

- **Environment form.** The command's `environmentProfile` is `none`. The
  parser (`task-551-dispatch-contract.mjs:554-556`) requires the
  `bun --env-file=/dev/null` prefix only for non-`none` profiles. Its literal-
  argv rule (`:480-487`) also rejects any `NAME=value` token, so a
  `DATABASE_URL` override cannot be carried in argv. The envelope argv
  therefore stays `bun test …`. The executable closure run is still the
  airtight DB-free form:
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <the ten paths>`.
  This matches the 11 **V3-6** gate, which expects 0 fail and 0 skip over the
  split files.
- **Precondition.** None of the seven new test files exists on disk on
  2026-09-25 (`tests/unit/workflows/` holds only the three monoliths). This
  leaf runs only after TASK-551-11 has landed every re-open step green, so a
  missing path fails `positiveDiscovery` and is not a skip.

#### 2. Frozen debt ceilings of the five 11-owned sidecar sources

The 11 re-open (**V3-1f**) records five UNTOUCHED sidecar sources as pre-
existing line debt. They are exempt from its per-path ≤999 cap until touched.
The next TASK-551-11 change that touches one of them must first split it to
≤999. Physical line counts (`wc -l`, 2026-09-25, HEAD `9c5b6666` working
tree) are frozen here as ceilings:

| Path | Frozen ceiling (lines) |
| --- | --- |
| `_docs/_workflows/lib/task-551-evidence-contract.mjs` | 1,562 |
| `_docs/_workflows/lib/task-551-evidence-filesystem.mjs` | 1,014 |
| `_docs/_workflows/task-551-author-audit.mjs` | 1,039 |
| `_docs/_workflows/task-551-implement.mjs` | 1,844 |
| `_docs/_workflows/task-551-fix.mjs` | 1,459 |

- **Superseded in part (`:1185-1186`, "Exact Validation Commands"):** "Verify
  line counts for every production/test file touched from the pre-family
  baseline."
- **Now reads:** For these five paths only, the family-closure line gate
  requires each file to be at or under its frozen ceiling above, not ≤1,000.
  A count above its ceiling is a failed gate. Every other production/test
  file touched from the pre-family baseline keeps the ≤1,000 gate, and the
  split paths keep the stricter 11 caps. The debt is owned by TASK-551-11:
  its next touch of any of the five splits it. This leaf never edits them.
  The same reading applies to the "complete touched production/test line-count
  gate" in "Terminal-Handoff Acceptance Gate" (`:1122-1123`).

#### 3. Task-file byte cap is 1 MiB

The 11 re-open (byte-cap amendment `:1033` onward and **V3-4**) raises
`TASK551_MAX_TASK_FILE_BYTES` from `512 * 1024` (524,288) to `1024 * 1024`
(1,048,576 bytes). The constant moves, `export`ed, into
`lib/task-551-dispatch-primitives.mjs`. Until step 1 of that re-open lands,
`task-551-dispatch-contract.mjs:96` still reads
`const TASK551_MAX_TASK_FILE_BYTES = 512 * 1024;`. After this amendment,
this file is about 108 KB, and the largest family file,
`TASK-551-03-L02…md`, is 522,753 bytes. This leaf's closure edits (status,
completion fields and receipts) fit under either cap. After the re-open
lands, the dispatch preflight rejects a task file above 1,048,576 UTF-8
bytes with `task551_dispatch_snapshot_file_text`.

### Amendment (2026-09-26): 01-L01 FINAL preconditions and interim red set

Source: orchestrator dispositions D5, D6 (i)/(ii) and D9 in
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`
(01-L01 v5 audit round, HEAD `66203e22`). The D-text is authoritative; this
section only mirrors it as family-closure preconditions. It is append-only:
no earlier sentence of this file is superseded (the file names no worker
database, lane-runner run or DB-gate concurrency rule before this section), and
the envelope, json fence, allowlist, dependencies and **Exact Validation
Commands** are unchanged. 01-L01 v6 owns the per-suite detail; the closure
writer re-reads it there, never from this summary.

#### Closure preconditions

- **Worker database resolved (D6 (ii)).** The owner item
  `lane-runner-worker-database` (01-L01 **V5-5**) is RESOLVED by the owner's
  2026-09-24 grant: the 01-L01 FINAL lane-runner worker database is the
  `DATABASE_URL` target of the root `.env`. The orchestrator sets
  `DATABASE_DIRECT_URL` to that target for the FINAL run only, in the closed
  `env -i` form; the `bun_worker_*` worker schemas are additive. It is not an
  open blocker of this leaf. This leaf's closure command surface is unchanged:
  it never runs the lane runner and consumes the 01-L01 FINAL result only
  through its existing `TASK-551-10-L01:single` dependency.
- **Interim red set is not a regression (D6 (i)).** Until the named fixes land,
  an interim `bun run test` red set is expected and is recorded per suite in
  01-L01 v6: `task551SearchVectorMigration` stays a BLOCKED row with an owner
  item for its leaf until its `pg_class` lookup is schema-qualified, and
  `task551RetentionJobService` is fixed by 06-L02 R13 (D5) and joins normally.
  That interim red set relaxes no gate here: the 10-L01 receipts this leaf
  consumes must still be green with no skips, as stated above.
- **`coderso02` prohibition (D6 (i)).** `bun run test`, and any lane-runner
  form, is FORBIDDEN against a `DATABASE_DIRECT_URL` that resolves to
  `coderso02`. A closure receipt produced that way is invalid.
- **One DB gate at a time (D9).** Family-wide, at most ONE `coderso02` DB gate
  runs at a time; DB-free (airtight) gates may run concurrently; the 01-L01
  **V5-4** checks re-run after any foreign DB gate. The FINAL lane-runner run
  on the `DATABASE_URL` target is serialized with every runtime smoke on that
  host. A receipt taken in breach of this rule is not current closure
  evidence.

#### 06-L04 reservation pointer (D5)

`TASK-551-06-L04` ("Per-parent retention batching") is RESERVED by 06-L02
(R12-2 follow-on). If it is allocated (the documented-limit branch of the
`many_parents_k` budget, or an orchestrator decision at 06-L02 closure), an
allocation step must land before this leaf's family closure: its task file,
an envelope whose `dependencies` include at least `TASK-551-06-L03:single`,
a land position before `TASK-551-10-L02:single`, and the update of the 41→42
family pins (including this file's counts, which that step, not this leaf,
edits). As a TASK-551-06 child it must then be terminal before TASK-551-06
and TASK-551 close. If it is never allocated, it stays reserved-unallocated,
this leaf closes over 41 files, and the closure receipt records that decision.

### Amendment (2026-09-26, fix note): direct endpoint, 06-L03 A8, exclusions

Source: Addendum C (C1, C2, C3 (b)/(e)/(j), C4) and Addendum A1 of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`.
Append-only; the envelope, json fence, allowlist, dependencies and **Exact
Validation Commands** are unchanged. Only the four sentences quoted below are
superseded; every other sentence of the section above stays binding.

- **Worker database (C1).** The 01-L01 FINAL lane-runner worker database is
  the direct (non-pooled) endpoint of the `DATABASE_URL` target of the root
  `.env`, i.e. the root `.env` `DATABASE_DIRECT_URL`. The orchestrator sets
  BOTH `DATABASE_URL` and `DATABASE_DIRECT_URL` to it (quoted shell
  variables, values never printed) for the FINAL run and its attribution
  re-runs only, in the closed `env -i` form, after the 01-L01 v7
  pre-provisioning boolean check (same host, same database, port not 6432,
  not `coderso02`; STOP on any FALSE). This leaf never runs that form.
- **FORBIDDEN is never a skip (C3 (j)).** A FORBIDDEN `true` result is an owner
  item to repoint `.env`, never a skipped gate.

#### Superseded sentences (quoted; superseded from this date)

1. `:1812-1815` "The owner item `lane-runner-worker-database` (01-L01 **V5-5**) is RESOLVED by the owner's 2026-09-24 grant: the 01-L01 FINAL lane-runner worker database is the `DATABASE_URL` target of the root `.env`." → "The owner item `lane-runner-worker-database` (01-L01 **V5-5**) is RESOLVED by the owner's 2026-09-24 grant: the 01-L01 FINAL lane-runner worker database is the direct (non-pooled) endpoint of the `DATABASE_URL` target of the root `.env` (C1)."
2. `:1815-1817` "The orchestrator sets `DATABASE_DIRECT_URL` to that target for the FINAL run only, in the closed `env -i` form; the `bun_worker_*` worker schemas are additive." → the **Worker database (C1)** bullet above; the `bun_worker_*` worker schemas stay additive.
3. `:1820-1825` "Until the named fixes land, an interim `bun run test` red set is expected and is recorded per suite in 01-L01 v6: `task551SearchVectorMigration` stays a BLOCKED row with an owner item for its leaf until its `pg_class` lookup is schema-qualified, and `task551RetentionJobService` is fixed by 06-L02 R13 (D5) and joins normally." → "Until the named fixes land, an interim `bun run test` red set is expected and is recorded per suite in 01-L01 v6 as amended by v7 (the V6-1 table and the V6-5/V6-8 blocked rows, per C3 (b)): six BLOCKED rows, namely the two catalog rendering rows, `task551SearchVectorMigration` and the three `result-shape:<path>` rows, each with the owner item named there; `task551RetentionJobService` is fixed by 06-L03 A8 (2026-09-26; Addendum A1) and joins normally."
4. `:1833-1835` "The FINAL lane-runner run on the `DATABASE_URL` target is serialized with every runtime smoke on that host." → "While the FINAL lane-runner run on the direct endpoint of the `DATABASE_URL` target and its attribution re-runs are in progress, no other `run-bun-parallel.ts`, `bun run test`/`test:bun`/`test:full`, `bun-lane-provision.ts`, dev host, runtime smoke or DB gate may use that target (C3 (e), C4)."

### Amendment (2026-09-26, fix note 2): attribution URLs, V7-4 table, blocked vs red

Source: Addendum E (E5 for 10-L02, citing E1 (d) and E4) of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`.
Append-only; the envelope, json fence, allowlist, dependencies and **Exact
Validation Commands** are unchanged. Only the four passages quoted below are
superseded; every other sentence of both sections above stays binding.

- **Attribution URLs (E4).** In the 01-L01 FINAL lane-runner run both
  `DATABASE_URL` and `DATABASE_DIRECT_URL` are `"$ROOT_DIRECT_URL"`; in its
  B/C/perf attribution re-runs `DATABASE_DIRECT_URL` is `"$ROOT_DIRECT_URL"`
  and `DATABASE_URL` is `"$WORKER_URL"` built from it; the `a` re-runs set
  neither key. Values are quoted shell variables and never printed.
- **Worker schema binding (E1 (d)).** Until the 02-L02 owner item
  `lane-worker-dedicated-schema-binding` lands, a lane run on the target
  executes production pruners against its `public` schema: every lane worker
  keeps a bare `DATABASE_DIRECT_URL` (`scripts/bun-lane-worker-url.ts:156`),
  which the 02-L02 R7.2 `off + primary` dedicated target dials. 01-L01 FINAL
  STOPs at the new **V7-7** step that 01-L01 v8 inserts between steps 8 and 9
  ("`lane-worker-dedicated-schema-binding` decided and landed, else STOP").
  This leaf never runs a lane form; it consumes that STOP only through its
  `TASK-551-10-L01:single` dependency.

#### Superseded sentences (quoted; superseded from this date)

1. `:1807-1808` "01-L01 v6 owns the per-suite detail; the closure writer re-reads it there, never from this summary." → "01-L01 v6 as amended by v7/v8 owns the per-suite detail; the closure writer re-reads it there, never from this summary."
2. `:1861-1866` (the E5 `:1862-1865` passage) "The orchestrator sets BOTH `DATABASE_URL` and `DATABASE_DIRECT_URL` to it (quoted shell variables, values never printed) for the FINAL run and its attribution re-runs only, in the closed `env -i` form, after the 01-L01 v7 pre-provisioning boolean check (same host, same database, port not 6432, not `coderso02`; STOP on any FALSE)." → "The orchestrator sets the keys of the **Attribution URLs (E4)** bullet of fix note 2 for the FINAL run and its attribution re-runs only, in the closed `env -i` form, after the 01-L01 **V7-1** pre-provisioning boolean check (same host, same database, port not 6432, not `coderso02`; STOP on any FALSE)."
3. `:1874` (fix note replacement 3) "Until the named fixes land, an interim `bun run test` red set is expected and is recorded per suite in 01-L01 v6 as amended by v7 (the V6-1 table and the V6-5/V6-8 blocked rows, per C3 (b)): six BLOCKED rows, namely the two catalog rendering rows, `task551SearchVectorMigration` and the three `result-shape:<path>` rows, each with the owner item named there; `task551RetentionJobService` is fixed by 06-L03 A8 (2026-09-26; Addendum A1) and joins normally." → "Until the named fixes land, an interim `bun run test` red set is expected and is recorded per suite in the 01-L01 **V7-4** table (as amended by v8): six suites are BLOCKED (absent from the manifest, so never red; **V5-6**/**V6-5**/**V7-3** rows), and the red rows are those the **V7-4** table names; any other red is a finding. `task551RetentionJobService` is fixed by 06-L03 A8 (2026-09-26; Addendum A1) and joins the manifest; its lane prediction is its **V7-4** row."
4. `:1874` (fix note quote-3 anchor) "`:1820-1825`" → "`:1821-1825`" (the quoted sentence starts on `:1821`; its text is verbatim and unchanged).
