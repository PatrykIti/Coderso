# TASK-551-11: Workflow, Audit, and Evidence Sidecar
# FileName: TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Workflow / Audit / Evidence / Collision Safety
**Estimated Effort:** Large
**Dependencies:** None; runs throughout TASK-551 and gates every product dispatch
**Status:** ⏳ To Do
**Changelog:** 1263 pinned (closure only)

---

## Overview

Own the reproducible TASK-551 multi-agent workflow: grounded research, authoring,
at least five sequential contract drift-audit rounds, strict implementation
dispatch in child/leaf order, per-leaf gates, independent post-audit lenses,
two-process Redis-smoke dispatch, fresh final drift, and structured evidence.

This is an orchestration sidecar with no product leaf. It never implements or
fixes database, query, migration, cache, route, service, UI, product test,
product/developer documentation, task-status, board, or changelog behavior.
Every verified finding is returned to the exact single-writer leaf; TASK-551-10-L02
alone performs final documentation and metadata closure.

## Exact Single-Writer Ownership

This child may create or edit only:

- `_docs/_workflows/lib/task-551-contract.mjs`;
- `_docs/_workflows/task-551-author-audit.mjs`;
- `_docs/_workflows/task-551-implement.mjs`;
- `_docs/_workflows/task-551-fix.mjs`;
- `tests/unit/workflows/task551AuthorAudit.test.ts`;
- `tests/unit/workflows/task551WorkflowContracts.test.ts`;
- `_docs/_workflows/_smoke/task-551/audit-evidence/*.json`;
- the 37 `TASK-551*.md` contract files during research/authoring/drift-fix
  rounds only, with no status/board/changelog transitions and no edits after
  implementation starts except evidence-backed contract corrections that rerun
  the required audits.

The audit-evidence directory is separate from
`_docs/_workflows/_smoke/task-551/runtime/redis-smoke-v1.json`, which is written
only by TASK-551-10-L01. This sidecar verifies the runtime evidence schema/hash
read-only and never rewrites it.

Forbidden paths are every `core/**`, `tests/**` path outside the two workflow
tests, migration, product/developer doc outside the TASK-551 contract files,
task board, changelog, runtime-smoke, package/lock, CI, release-gate, and
product evidence path. Agents never stage or commit. The repository owner owns
commits.

## Frozen Task Graph and Land Order

The workflow requires exactly 37 TASK-551 files: one parent, 11 children, and 25
leaves distributed `2,2,3,2,2,3,2,3,4,2,0`. Missing, duplicate, extra,
misnamed, wrong-H1, wrong-FileName, wrong-parent, noncanonical status, or
non-1263 task metadata fails before implementation. Every file must contain each
literal level-two heading exactly once: `Overview`, `Sub-Tasks`,
`Testing Requirements`, and `Documentation Updates Required`.

TASK-551-11 runs throughout, while compile-green dispatch executes strictly:

```text
01-L01(initial) → 01-L02 → 02-L01 → 02-L02 → 08-L03(initial) →
05-L01 → 05-L02 → 03-L01 → 06-L01 → 06-L02 →
06-L03 → 07-L01 → 09-L04(initial) → 03-L02 → 03-L03 →
04-L01 → 04-L02 → 07-L02 → 08-L01 → 08-L02 → 08-L03(final) →
09-L01 → 09-L02 → 09-L03 → 09-L04(final) → 01-L01(final) → 10-L01 →
post-audit/fix/affected-gates/aggregate+smoke → final-drift →
10-L02 docs/changelog/status/board closure
```

The explicit interleave is mandatory: 06 services land after 03-L01 and before
03-L02; 04 begins only after 03-L03. Within every non-interleaved child, leaves
run numerically in the displayed order. TASK-551-01-L01 remains the sole
inventory-artifact writer in both dispatches; no later leaf edits its files.
The workflow loads the initial receipt for implementation, re-dispatches L01
after 09, then requires the replacement `phase: "final"` receipt to match the
current production caller set with zero planned deltas before 10-L01. It rejects
any overlapping writer or undeclared changed path and re-reads shared bytes
immediately before dispatch.

## Authoring Drift-Audit Contract

Before any product implementation:

1. Research agents independently ground DB callers/schema/migrations, query and
   search paths, pool/retention/concurrency, memory cache/public runtime, Redis/
   outbox, Admin/security cache, tests/gates/docs, and active task collisions.
2. Authors write only their assigned task contract. Every executable leaf must
   include exact ownership/forbidden paths, helper/function pseudocode, data flow,
   error handling, regression shape, security contract, DB/Redis fixture safety,
   and correct commands. Every one of the 37 files must contain the four literal
   required level-two headings validated above.
3. Run at least five sequential rounds. Each round dispatches one read-only
   per-file audit for every one of the 37 files plus exactly one cross-file
   reconcile audit.
4. Require every expected structured result. A timeout, malformed/missing result,
   or absent reconcile makes the whole round void; it is never a clean pass.
5. Verify every finding locally. Dispatch per-file fixers plus one cross-file
   fixer for real HIGH/MEDIUM findings, restricted to named task files. Record
   LOW findings and apply the parent's strict TASK-9999 eligibility policy.
6. After five completed rounds, run one fresh final reconcile. Product dispatch
   requires zero findings of any severity and zero audit errors.

The reconcile checks only cross-file contradictions: exact writer/forbidden
paths, shared type/helper/error/schema/key/tag/env names, clamp/budget values,
test/evidence paths, migration ownership (including the full
`core/db/migrations/meta/_journal.json` path), fixture profiles, Redis behavior,
TASK-511/517/493/518 handoffs, land order, 37-file graph, and changelog 1263.
It explicitly pins `withDedicatedDatabaseSession`, `PaginationCursorKeyring`,
`loadPaginationCursorKeyring`,
`registerPaginationCursorLifecycleParticipant`,
`requirePaginationCursorKeyring`,
`createRetentionSchedulerLifecycleParticipant`,
`registerComposedHttpRuntimeParticipants`, `getServerCacheRuntime`, the exact
invalidation `stopClaiming`/`drain`/`close` handle, and the exact revision calls
`withRevisionParentLock(identity, tx, run)` with zero-argument `run` plus
`allocateRevision(input, tx)`. 02-L02 owns registry, `runtimeEntrypoint.ts`,
`prod.ts`, and `dev.ts`: thin adapters execute awaited lifecycle start,
after first registering mode participants (Vite included), then synchronous
listen, await signal, graceful/forced HTTP drain and reverse lifecycle close,
with partial-start rollback and no listen after startup signal/failure. 03-L02 owns all
of `routes/index.ts` and registers the cursor participant at module evaluation.
06 owns retention participation without `dockerStart.ts`. 08-L03 alone owns
`httpServer.ts`, calls the idempotent composition seam at module
evaluation for cache/retention/existing backup, preserves the already-registered
cursor, never loads/injects its keyring, and never edits either entrypoint.

The reconcile pins owner handoffs at their exact granularity. TASK-551-01 uses
one deterministic family scenario at a time, exact target/support counts,
UUIDv5/ordinal timestamps, pool `2/10`, three repetitions of `5+30`, calibration
`20+100`, p95 spread denominator `max(median,0.1)` with all-zero handling, 20%
cap, normalization `0.80..1.20`, and
`ceilToTenth(max(floor, median*1.25))`; only its stored ceilings are consumed.
All fixed status/visibility/relation distributions, ten-row tie groups, unique
append timestamps, and exact per-family integer common/rare search table with
hidden/miss zero are shared literally; percentage-derived search counts fail.
Summary/facet `asOf` is `2026-01-15T12:00:00.000Z`. Submission ordinal `%4===0`
uses 1..6 days before and all others 8..37 days before (rolling seven days
`500/25,000`, spam `200/10,000`). Booking cycles UTC/New_York/Tokyo and modulo-
100 same-day-past/same-day-future/next-1..40/prior-1..40 with +60-minute end,
yielding today `400/20,000`, upcoming/past-current `1,000/50,000` each.
The fixture reconcile also pins author/type-author/role/tag, webhook event/
delivery, latest-autosave and 128-tuple/101-root/16,384-byte dependency cases;
the `2036-01-01` retention clock, all missing-family cutoff/anchor/child-first
counts, and `499/500/501/2,000/2,001` batch edges.
Initial inventory is 34 planned fingerprints: 32 named Admin plus
`cache-outbox-oldest-unprocessed` and `public-html-dependencies-128`. The plan
registry is 37 IDs/38 cases/76 small+large receipts: those 32 once plus
`webhooks-created-keyset`, `webhook-deliveries-parent-keyset`,
`webhooks-event-batch`, `page-latest-autosave`, and the outbox fingerprint.
TASK-551-02 pins a shared parser: runtime `1..256` default `1`, workers `0..256`
default `0`, pool default `10`, migration reserve `3`, and default planned
`1*10 + 0*10 + 3 = 13`, strictly below validated availability; the Bun path is
`tests/integration/server/task551DatabaseLifecycle.test.ts`, deadlines
`2_000/5_000/10_000/15_000 ms` plus 10-second DB close, release-once late
acquisition, and fixed telemetry cardinality 3,240 cells per fingerprint plus 44
pool cells with saturating counters and deterministic snapshot/reset. Exact
registry names are `QUERY_FAMILIES`, `QUERY_OUTCOMES`,
`QUERY_DURATION_BUCKET_MAX_MS`, `ROWS_RETURNED_BUCKET_MAX`,
`POOL_WAIT_BUCKET_MAX_MS`, `POOL_OUTCOMES`, `MAX_QUERY_FINGERPRINTS=512`, and
`MAX_COUNTER_VALUE=Number.MAX_SAFE_INTEGER`.
Also pin exported `assertMaintenanceSessionAffinity()`, maintenance modes
`primary|direct|session`, pool max `2..4`, and secret URL/budget inclusion.
Primary startup never probes; disabled-scheduler `off+primary+pool1` passes and
`verifyDatabaseSessions` checks only that session.
Explicit direct/session probes once at DB start and reuses the lifecycle result;
enabled scheduler awaits it before timer/listen and fails below two or with transaction+primary.
Pure `databaseApplicationIdentity.ts` owns strict runtime/worker kind, separate
runtime `1..256`/worker `0..256` counts, globally unique replica IDs and exact
every-session `coderso:runtime|worker|maintenance:<id>` or
`coderso:migration:<operationUuid>` names; a pure import opens no DB client.
Known-interval `pg_stat_statements` receipts run before prioritization and before/
after comparison, sanitize SQL and never reset shared stats; classes are exactly
`application|migration|maintenance|external_diagnostic|unknown`. Owner Render
evidence retains only the 4m51 `row_to_json(t)::text ~ ?` UNION and 30–60s+
`access_logs` regex shapes. Operator evidence permits `external_diagnostic`, else
`unknown`; exclude from application decisions and never index a one-off scan.
Dedicated sessions expose signal-aware static execute/transaction/liveness/
cancel-and-rollback only. Retention lock, every batch and unlock use one backend
PID; close aborts/cancels and confirms rollback/termination within 4,500 ms
before cache/DB close. Lock loss is only `retention_lock_lost`, with no overlap,
partial summary or detached work, under the 5-second participant ceiling.
Every lifecycle close receives cancellable
`RuntimeCloseContext{absoluteDeadline,signal}`. The absolute shutdown is 15
seconds; non-DB closes are at most 5 seconds, and DB is the sole exception at
`min(10 seconds, remaining budget)` with no outer race or detached teardown.

TASK-551-05-L01 solely owns all seven byte-exact `SEARCH_VECTOR_SQL` and five
trigram source literals built with immutable-safe
`coalesce(...) || ' ' || ...`, their closed `pg_proc.provolatile = 'i'` function/
operator proof, and the deeply immutable
`BOOKING_RESERVATION_EXCLUSION_SQL`. The same one writer lands schema exports/
descriptor, exact extension/add custom SQL, generated snapshot/journal and tests
atomically. The installed Drizzle DSL cannot represent the GiST exclusion, so
the snapshot intentionally omits only it; exact live `pg_constraint.contype =
'x'`, clean/prior/rollback/forward, extension preservation, generator zero-
drift, and no duplicate-add/generated-drop guards are mandatory. The expanded
closed catalog includes all form/booking/list/retention members and assistant-
ingest `started_at`, exact page/entry/typed-entry/post author composites,
role-leading `user_roles_role_user_idx`, webhook list/delivery/latest-autosave
members, and `posts_tags_gin_idx`/`media_tags_gin_idx`/
`webhooks_events_gin_idx` as `jsonb_path_ops` GIN with exact predicates. The
read-performance catalog includes `cache_outbox_unprocessed_age_idx(created_at,id)
WHERE processed_at IS NULL`; `readOldestUnprocessedAge` fingerprint
`cache_outbox_oldest_unprocessed` scans claimed/backed-off rows by created-at/id
`LIMIT 1`, with 1k/100k EXPLAIN and insert/claim/retry/complete budgets. The
sole version-2 `rollout-forward` drains exact app identities, applies the guarded
transaction and keeps the old `max(version)+1` binary stopped through the durable
page/content/widget revision-integrity barrier; it never resumes. External mode
then admits only the digest-pinned compatible TASK-551 binary during read-index
builds; offline-single stays cold through final catalog. First compatible traffic
makes rollback forward-fix only. Transactional SQL creates no index; run
rollout-forward twice (second zero-DDL/transition), then `status`. No file may
pretend the DSL represents it or split the artifact ownership. One reserved
physical session plus L01's sole
`createTask551ReservedDrizzleClient(poolClient,reserved)` are mandatory. Direct
`drizzle(reserved)` is invalid on postgres.js 3.4.9; only
`drizzle(adaptedReserved)` reaches Drizzle 0.45.2. Pin identical immutable pool
`.options` with shared parser/serializer maps, callable forwarding and
`.unsafe()`/`.values()` parity on the reserved handle, same-handle empty-option
`.begin`, zero pool SQL/`begin`/`.unsafe()` dispatch after reserve, exact GUCs
`coderso.task551_operation_id`, `coderso.task551_receipt_v2`, and
`coderso.task551_receipt_sha256`, one PID across GUC set/guard/DDL/receipt/
journal, successful RESET/same-PID/one-release/normal-end, poison/hard-end on
unknown state, and static SQL validation of the SHA-256-bound canonical v2
receipt (1..65,536 UTF-8 bytes) inside the migrator transaction. Clean/prior/
replay/reverse, failure rollback, and repeat/status/recovery gates are exact.

After 06-L03, TASK-551-03-L02 alone adopts 06-L02's page
`{id,pageId,version,kind,title,slug,createdAt,createdBy:{id,name,email}|null}` and
detail `{id,detailPageId,version,kind,createdAt,createdBy:string|null}` envelopes,
rejecting invented `reason`, through route/schema/client/UI, and owns a freshly rescanned
complete eight-client consumer graph after 09-L04 INITIAL authority and 08-L03
INITIAL header receipts, bounded server-side picker/search/load-
more state, `formReadService` as form-list owner with exact FormListItem fields
`id,name,slug,status,description,submissionAccess,updatedAt`. `bookingReadService`
owns paginated reservations/resources/services/blackouts, capped-100 service-
resource/schedule arrays, and 31-day/500-slot preview.
Existing Reservations/Resources/Services tabs consume narrow items, Services
keeps derived `submissionAccess`, edits await point detail, and Availability/
SlotPreview use bounded pickers. Submission payload uses one authorized parent-
bound point query only on explicit expansion, stays component-local/uncached,
and aborts/clears on close/unmount/logout/auth change. Success/error responses
set exact `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, and `Expires: 0` headers;
the client passes `cache:"no-store"`. Media list `name` derives
originalName→title→sanitized key basename→asset; raw key is omitted and
`media/utils.ts` consumes name directly. Exact extraction stems are
`BookingOverviewPanel`, `MediaLibraryFolderState/Results`, `UsersRolesContent`, `DetailTemplateRevisionPanel`, `MenuDesignCanvas/Inspector/DataSources`, `MenuEditorWorkspace`, `PostEditorMediaControls`, `ContentListSource/PresentationEditors`, `CtaBannerContentEditors`, `EntryTeaserSource/PresentationEditors`, `FeatureGridItemEditors`, `FooterNavigation/BrandEditors`, `GalleryMosaicItemEditors`, `HeroContent/Media/LayoutEditors`, `LogoCloudItemEditors`, `NavigationItem/PresentationEditors`, `PostsFeedSourceEditors`, `RichTextContent/LayoutEditors`, `SectionContent/LayoutEditors`, `TeamMember/LayoutEditors`, and `TestimonialItemEditors`; all eight named page-editor split suites and every cohesive
>1,000-line split, two direct consumer-graph
suites, five revision suites, and the UI smoke. Raw-array, auto-fetch-all, silent
first-page truncation and heavy-body fallbacks are forbidden. Every family uses
L01's two-segment cursor/code-owned `KeysetSpec`; previous reverses SQL/nulls and
output, while public parse/spec/signature faults map generically. Each metric-
bearing envelope is `{items,nextCursor,hasMore,summary,facets}` with arbitrary-
filter `matchingTotal:null`/`exactness:"not_computed"` and no filtered `COUNT`.
Fixed summaries and author/content-type/role/folder/tag facets are exact in one
read-only `REPEATABLE READ` authorized/parent snapshot. Strict facet pages use
`{items,nextCursor,hasMore}`, default/max `50/100`, and no auto-fetch. One page
query + one fixed aggregate row + at most one bounded relation-facet batch is at
most three separately inventoried/budgeted/planned SQL statements; page
concatenation, per-row lookup, and auth leakage
fail the audit. Legacy booking/media monoliths are deleted; exact owners are
`bookingPageTestFixtures.tsx` plus booking `loading-pagination|mutations|calendar`
and `mediaLibraryTestFixtures.tsx` plus media `loading-pagination|selection-folders|upload-edit` suites.
TASK-551-06-L01 alone owns Bun-free `searchHistoryContract.ts` plus direct
Vitest, removes the real `pruneHistory` declaration/call and lands actor/UUIDv5-
idempotent `recordSearch`. TASK-551-04-L01 makes GET write-free and owns the
sole internal `POST /admin/api/search/history` with session actor, `content:read`, CSRF,
`admin_write`, strict four-key body/409 conflict, plus one UI-intent UUID reuse;
no public/API-key/GET mutation alias exists. TASK-551-06-L01 also preserves analytics compatibility exactly: canonical
`ANALYTICS_RETENTION_DAYS` with absent/malformed/non-finite 365 and finite floor+
clamp `30..1095`, enablement only through `RETENTION_ANALYTICS_ENABLED`, rejected
age aliases and the complete `Number(raw)` truth table. Both deprecated
`ANALYTICS_PRUNE_INLINE_DISABLED` and `ANALYTICS_PRUNE_INLINE_ENABLED` are
separate warning-once/raw-value-free no-ops. `RETENTION_DRY_RUN` alone parses
lowercase booleans; direct use has no scheduler advisory, scheduled use takes
exactly one replica advisory, and both have zero destructive-row-lock/mutation/
publication/progress. Inline request pruning is zero.
Search v1 has no cursor: five source arms each cap exact-email→FTS→non-overlap
trigram at 51, at most 255 reach tier-first global dedup/rank and 51 leave; arm
plan budgets do not depend on final top-k. L01 alone exports
`buildTask551PrefixTsquery` plus shared constants; Admin and assistant bind
literal `to_tsquery('simple',$1)` once in an input CTE and reuse that tsquery
for every vector predicate/rank, while assistant `expandedTerms` stay reranker-
only. Shared NFKC/Unicode/punctuation plus 2/200-code-point, 800-byte, 16-token,
and 64-code-point-per-token bounds reject local parsers, raw interpolation,
`websearch_to_tsquery`, `plainto_tsquery`, or a second tsquery bind. Trigram
uses GIN `%` under transaction-local static
`SET LOCAL pg_trgm.similarity_threshold='0.300'`, with no LIKE/ILIKE/regex
fallback, and closure must update `_docs/SEARCH_SPEC.md`. Page autosave parent-locks, selects one
latest autosave by version/id, reuses equality without writes or allocates then
deletes only that predecessor; old history is scheduler-only and 100k/50-writer
tests pin two/six-statement budgets.

The reconcile also pins policy-branded conditional-entry fields and concrete-
policy envelope lifetime, complete store interface/normalized outcomes including
unknown physical Redis outcome, one coherence controller and exact signals,
single-flight default/range `1_024`/`16..10_000` plus permanent forced-bypass
at safe-integer epoch overflow, canonical final-path-key+current-epoch+branded
full-context `shareScopeDigest` identity, and identity-cleaned shared fill-outcome
promises only—never `Promise<TResult>` or caller values. Ineligible/unbranded
requests bypass registry/read/lease/fill; the owner keeps its result, and only a
strictly decoded `published` outcome proving successful positive/eligible-negative
conditional publication lets a joiner call its own resolver. Every `not_published`
path runs an authoritative no-fill loader per joiner, every distributed result,
the public runtime's exact `mode/cache/invalidation.applyAfterCommit/health`
keys with control capabilities private, four-policy startup capacity catalog,
the singleton `getServerCacheRuntime().cache` field, fixed positive runtime-
snapshot bootstrap when public HTML TTL is zero, one outer event key through all
nested collectors, mutable root+nested validation, and Admin INITIAL installation
authority plus FINAL exhaustive module-cache matrix, deployment + 128-bit tab
incarnation + cross-tab auth-generation nonce + epoch + user/permissions scope.
Every public request has exactly one authoritative SecuritySettings read before
security/rate middleware. Safe structural routes total one query; mutable detail/
list routes add one root+nested validator over 128 tuples/16,384 bytes/101 roots
and total two, returning one aggregate row/no bodies; unavailable/change/
restriction fails before value GET. Secret settings remain never cached. Exact no-fill
exclusions are commerce data plus form/booking/analytics/request nonce/token and
unknown dynamic dependency; every dependency is tagged, gated, or excluded.

`ServerCache.getOrLoad(ServerCacheLoadRequest<TCached,TResult>)` is the only load/
fill owner: it captures primary plus finite fill-fence generations before load.
Its strict result is finite-reason `no_fill` with only `returnValue` and zero
encode/write, or `fill` with `fillKind:positive|negative`, cache/return values and
a branded optional companion. Positive primary/companion entries independently
sample their own policy TTLs and may differ; negative uses its negative TTL and no companion.
Both store write primitives remain hidden from consumers.
Loader triggers are exact backend-null `store_absent`, coarse evicted
`store_value_rejected`, or exact `fill_disabled(ineligible|
singleflight_saturated|coherence_bypass|generation_unavailable|
transport_unavailable|distributed_wait_timeout|coordinator_closed|
not_published_retry)`. Every loader gets `{trigger, companion}` and shared
outcomes map absent/rejected/disabled only to `store_absent_no_publication`/
`store_value_rejected`/`fill_disabled`, never the trigger object. Disabled fill
publishes nothing and public HTML refills only true absence. Memory shares one 64-entry expiry+
eviction cap and atomically skips a required 65th-victim insertion.
Both Redis writes reuse one pre-command validator that strictly decodes every
envelope, matches `fillKind`, selects the correct policy ceiling, and rejects any
forged/malformed one/two-entry bundle with zero Redis commands.
Every committed invalidation caller awaits `applyAfterCommit(plan)` before
success; it resolves only after local observation or an affected-tag force fence,
with no fire-and-forget or direct epoch mutation.
Redis commits persist exactly one same-transaction outbox row; memory commits
persist zero and perform exactly one awaited post-commit generation bump.
Public HTML pins manifest-primary+HTML-companion and HTML-primary+refreshed-
manifest-companion directions, both-or-neither fill, and uncached return value.
Its loaders use positive fill or finite-reason `no_fill`, never negative; an
excluded render returns authoritative output without throw, encode, or write.
`public-html-manifest` is non-authorizing metadata with `mutableVisibilityGate:"not_required"`;
HTML requires current `strictly_public` root+nested validation, and refreshed
eligibility is recomputed in a distinct post-render context.

A distributed owner fills only through atomic
`putIfGenerationsAndLeaseOwned`, which proves the random lease token and all
expected generations before one/two writes. Only `written` fills. Generation
change, lease loss, unavailable, or renew uncertainty yields authoritative bytes
without fill; generation-only store write is forbidden and release is cleanup.
Method+URL dispatch preserves every booking path/method including slots GET,
Forms submission/upload at every method, and analytics beacon at every method
before cache normalization/read/write. Existing handler security/method behavior
is authoritative; only unmatched GET/HEAD enters cache and each request reads
SecuritySettings once. Admin scope is fixed-order `AdminCacheScopePreimageV3`
`{v,deploymentIdentity,authIncarnation,authGenerationNonce,authEpoch,userId,
permissions,roles}`. Its 367-byte vector hashes to
`6c69458d5fdc22634a5fca20609e3accb4a6fe606905af2b2c522900770afbf7`;
nonce-only `222...` hashes to
`4214d494f425d2f595de703cd19662a2513d0d85871bff748bdb5d5cb728611d`
and rejects old storage/events/delayed installs. Arrays remain separately
normalized/byte-sorted, never delimiter concatenation. Security-settings writes
take the same-tx 2-second local timeout and advisory `(551,904)` before merge,
then Redis writes one same-tx outbox row while memory writes zero and performs
one awaited post-commit bump. Both map conflicts and expose observation/fence
before returning.
`settingsRoutes.ts` alone maps security conflict to the exact redacted 409;
form actions are absent from public render dependency/invalidation surfaces.
Source observation tokens ignore older/equal completions; current-token identical
force/recover is a no-op. Event-keyed observations, duplicates included, advance
epochs but clear no fence. Only the same event's durable-processed signal after
generation bump plus conditional DB completion clears its failed-post-commit
fence; broad recovery/PubSub/another event cannot. No settled tombstone registry
exists: unresolved events and active attempts cap independently at 4,096,
saturate to temporary all-family bypass without rejecting callbacks, and recover
when both are at most 3,072. Attempt tokens settle only after no callback can
report. More than 100,000 settled events stay bounded. Redis
also fences durable drain until healthy/no pending/claimed rows. Only safe-integer
epoch/drain-generation overflow remains restart-fail-closed. Pub/Sub carries only `{ eventKey, generationDigest }`;
the subscriber bounded-point-reads the outbox row for finite tags and emits no
observation on missing/malformed/read failure.

Every author/fixer mutation batch is guarded by the exact changed-path contract:
snapshot all pre-existing tracked dirty and untracked paths plus the explicitly
ignored author-workflow path, fingerprint file SHA-256/mode or symlink target,
and fingerprint the full git index; take before/after snapshots; require author
`result.file` to equal its assigned filename; require each author/per-file fixer
`changedPaths` to be empty or its one assigned task path; restrict the cross
fixer to the exact frozen 37 task paths; and require the sorted union of reports
to equal the actual fingerprint delta exactly. Any index mutation or out-of-
scope delta fails. Run the exact task-graph validator after each fixer batch/
round and immediately before final reconcile. Author prompts must require
`changedPaths`.

Any task/source/test/gate/doc contract change after the PASS invalidates that
PASS for the changed contract and requires fresh affected-file audits plus a
fresh reconcile before dispatch.

## Implementation and Gate Orchestration

- Before the first product dispatch, require TASK-511, TASK-493, TASK-517, and
  TASK-518 terminal. The only substitute is the parent's fresh exact serialized
  audit proving byte-disjoint schema/`core/db/migrations/meta/_journal.json`/
  `.env.example`/publicSite/entry/
  SEO/import/lifecycle source, test, migration and documentation paths. Recheck
  it before every affected leaf; unknown/wildcard/stale ownership blocks.
- Dispatch one executable leaf at a time in the exact order. Provide its current
  on-disk ownership allowlist and explicit forbidden-path set.
- After each leaf, require every exact literal command from its current task
  manifest plus `bun --cwd core lint:types` and `bun --cwd core lint`; canonical
  argv/digest, zero exit/no skip, and positive test discovery are mandatory.
  New default-lane TASK551 integration paths are under `tests/integration/server`,
  never a legacy non-default integration tree. A fixer loop may run at
  most three rounds and may edit only the same leaf-owned paths.
- Prefer source correction. A test expectation changes only for an intended
  contract change and never weakens a behavior/security/performance assertion.
- Before any migration leaf, require a fresh journal read and exact migration
  writer. Before TASK-551-09 public runtime dispatch, require TASK-517's relevant
  writer terminal and read current bytes.
- After TASK-551-09 targeted gates pass, re-dispatch TASK-551-01-L01 alone in
  final phase. Require a current source-tree digest, exact discovered/fixture set
  equality, zero planned deltas, and a `phase: "final"` receipt. Only then dispatch
  TASK-551-10-L01; 10-L01 consumes and never edits the inventory artifacts.
- At the initial and final collision gates, classify TASK-511, TASK-493,
  TASK-517, and TASK-518 as terminal verified or covered by that one exact
  serialized all-path handoff. A narrower or stale assumed state blocks.
- TASK-551-10-L01 runs the aggregate gate only after 01..09 targeted receipts and
  the final inventory receipt are current. It also consumes the five-scenario
  TASK-551-03-L02 visible-effect UI smoke in light/dark with ten screenshots and
  zero console errors. Required DB/Redis/UI infrastructure absence is a failure,
  not a skip.
- Every 01..09 executable leaf owns its literal targeted manifest. Each 09 leaf
  additionally owns and runs every direct existing suite named in its
  literal Validation Commands. Its implementation receipt records the exact
  canonical argv manifest and digest, zero exit, no skip, and positive test
  discovery. TASK-551-10 validates those four ordered handoffs and runs only
  aggregate/full ownership; broad rediscovery never authorizes a targeted test
  edit, rebaseline, or ownership transfer. This explicitly preserves L02's split
  entry/SEO suites and singular `postMutationService.ts`, L03's import/export and
  detail-page suites, L04's Admin-boundary plus read-only `cacheRefresh` lane,
  and L01's booking/forms/analytics anti-abuse suites.

## Post-Audit and Final Drift

After 01..09, the final inventory refresh, and the initial L01 aggregate/UI/Redis
smoke gate, dispatch exactly five fresh read-only post-audit lenses:

1. `scope-query-inventory` — every DB caller has one disposition/writer; bounded
   projections, pagination/search/aggregate and active handoffs are complete.
2. `persistence-concurrency-migrations` — constraints, transactions, revisions,
   retention, journal artifacts, locking/backfill and rollback behavior.
3. `cache-coherence-security` — memory/Redis parity, key/envelope limits,
   eligibility, after-commit/outbox generations, bounded-eventual public-cache
   behavior, outage/lease behavior, identity and secret isolation. Globally
   unavailable Redis must bypass on every replica; ambiguous/partial delivery may
   expose only safe public old-generation data until delivery or the measured hard
   TTL. Security/private data stays fail-closed and DB-authoritative.
4. `performance-reliability-test-integrity` — frozen budgets, plans/query counts,
   fixture realism/cleanup, fault tests, no weakened assertions or false skips.
5. `cross-stream-doc-task-closure` — ownership, TASK-511/517/493/518 state,
   release-gate/runtime evidence, docs, 37-file graph, status order, board and
   changelog 1263 readiness.

Every finding includes current `file:line` evidence. Verified HIGH/MEDIUM
findings return once to their exact original owners, followed by affected
targeted gates and a fresh L01 aggregate/full/smoke pass. LOW findings are fixed
unless they satisfy the strict zero-impact policy; performance/reliability/
security/data/test residuals cannot enter TASK-9999.

After all fixes and fresh aggregate gates, run a separate final read-only drift
against the current working tree, task graph, receipts, docs plan, board and
changelog reservation. Only a zero-finding current-tree PASS authorizes
TASK-551-10-L02. A metadata-only closure crash/retry must re-read current indexes
and validate the existing changes as the same deterministic plan; it cannot
reuse stale substantive audit results after a product byte changes.

## Structured Evidence Schemas

All workflow results use strict reject-unknown schemas and sanitized evidence:

```ts
type Task551AuditFindingV1 = Readonly<{
  severity: "HIGH" | "MEDIUM" | "LOW";
  area: string;
  finding: string;
  evidence: string; // current file:line, no raw data
  recommendation: string;
}>;

type Task551AuditResultV1 = Readonly<{
  schema: "coderso.task551.audit-result@v1";
  pass: boolean;
  summary: string;
  findings: readonly Task551AuditFindingV1[];
  errors: readonly string[];
}>;

type Task551FixResultV1 = Readonly<{
  schema: "coderso.task551.fix-result@v1";
  ownerTaskId: string;
  pass: boolean;
  summary: string;
  changedPaths: readonly string[];
  fixed: readonly string[];
  rejected: readonly string[];
  errors: readonly string[];
}>;

type Task551RoundFixerResultV1 = Readonly<{
  ownerTaskId: string;
  pass: boolean;
  changedPaths: readonly string[];
  errors: readonly string[];
}>;

type Task551RoundEvidenceV1 = Readonly<{
  schema: "coderso.task551.audit-round@v1";
  round: 1 | 2 | 3 | 4 | 5;
  expectedPerFile: 37;
  returnedPerFile: 37;
  reconcileReturned: true;
  findingCounts: Readonly<{ high: number; medium: number; low: number }>;
  fixerResults: readonly Task551RoundFixerResultV1[];
  pass: boolean;
}>;

type Task551AuthorAuditResultV1 = Readonly<{
  schema: "coderso.task551.author-audit@v1";
  pass: boolean;
  tree: "TASK-551";
  expectedFiles: 37;
  changelog: 1263;
  landOrder: readonly [
    "551-01-L01(initial)", "551-01-L02", "551-02-L01", "551-02-L02",
    "551-08-L03(initial)", "551-05-L01", "551-05-L02", "551-03-L01",
    "551-06-L01", "551-06-L02", "551-06-L03", "551-07-L01",
    "551-09-L04(initial)", "551-03-L02", "551-03-L03", "551-04-L01",
    "551-04-L02", "551-07-L02", "551-08-L01", "551-08-L02",
    "551-08-L03(final)", "551-09-L01", "551-09-L02", "551-09-L03",
    "551-09-L04(final)", "551-01-L01(final)",
    "551-10-L01", "post-audit/fix/affected-gates/aggregate+smoke",
    "final-drift", "551-10-L02"
  ];
  rounds: readonly Task551RoundEvidenceV1[];
  finalReconcile: Task551AuditResultV1;
  errors: readonly string[];
}>;

type Task551PostAuditEvidenceV1 = Readonly<{
  schema: "coderso.task551.post-audit@v1";
  pass: boolean;
  lenses: readonly {
    id: "scope-query-inventory" | "persistence-concurrency-migrations" |
      "cache-coherence-security" | "performance-reliability-test-integrity" |
      "cross-stream-doc-task-closure";
    result: Task551AuditResultV1;
  }[];
  affectedOwners: readonly string[];
  rerunGateIds: readonly string[];
  errors: readonly string[];
}>;

type Task551GateCommandReceiptV1 = Readonly<{
  id: string;
  argv: readonly string[];
  exitCode: 0;
  durationMs: number;
  skipped: false;
  skipReason: null;
  discoveredTestCount: number | null; // positive for test commands; null otherwise
}>;

type Task551ImplementationReceiptV1 = Readonly<{
  taskId: string;
  pass: boolean;
  changedPaths: readonly string[];
  gateIds: readonly string[];
  targetedCommandManifest: Readonly<{
    sha256: string;
    commands: readonly Task551GateCommandReceiptV1[];
    directExistingSuitePaths: readonly string[];
  }>;
}>;

type Task551WorkflowResultV1 = Readonly<{
  schema: "coderso.task551.workflow-result@v1";
  pass: boolean;
  summary: string;
  rounds: readonly Task551RoundEvidenceV1[];
  finalReconcile: Task551AuditResultV1;
  implementationReceipts: readonly Task551ImplementationReceiptV1[];
  postAudit: Task551PostAuditEvidenceV1;
  finalDrift: Task551AuditResultV1;
  runtimeEvidenceSha256: Readonly<{
    redis: string;
    adminListUi: string;
  }>;
  errors: readonly string[];
}>;
```

`task-551-author-audit.mjs` emits `Task551AuthorAuditResultV1`; later workflow
scripts consume it rather than inventing a second round/fixer/final-reconcile
shape. Fix agents return the full `Task551FixResultV1`, but round evidence maps
each result to the exact four-field `Task551RoundFixerResultV1`; embedded round
objects do not repeat a `schema`, summary, finding, or rejection field. Audit
`pass` is true only when `errors` and HIGH/MEDIUM findings are empty;
the final reconcile additionally requires zero findings of any severity. Fix
results use the exact V1 owner/path/result shape above. Validate exact lens
IDs/order, five rounds, result cardinality, file ownership, finite counts,
canonical task IDs and lowercase SHA-256. Evidence contains no
prompt transcript, provider metadata, env value, connection URL, SQL/bind,
cached body, Redis key, cookie/token, raw log, PII, or secret.

## Security Contract

- **Visibility/routes:** workflow/test evidence only; no endpoint or route change.
- **Auth/RBAC/CSRF/rate limit:** agents cannot change these contracts. Audits
  verify the existing behavior and route failures to the owning leaf.
- **Validation:** strict schemas, exact phase/lens/task/file membership, bounded
  evidence, ownership allowlists, forbidden-path checks, and all-results guards.
- **Agent egress:** no secret, credential, private provider key, raw sensitive
  log, submission, cached body, unredacted user data, or live bind value enters a
  prompt/result/evidence file.
- **Mutation authority:** auditors are read-only; fixers edit only verified
  task/source owner paths; agents never stage, commit, push, tag, deploy, flush
  Redis, truncate DB tables, or clean another process's files.

## Implementation Pseudocode

```ts
async function runTask551Workflow(): Promise<Task551WorkflowResultV1> {
  const graph = await requireExactTask551Graph(37, [2,2,3,2,2,3,2,3,4,2,0]);
  const research = await requireAllResults(await runGroundedResearchScopes());
  await runScopedAuthors(graph, research);

  const rounds = [];
  for (let round = 1 as 1 | 2 | 3 | 4 | 5; round <= 5; round++) {
    const perFile = requireAllResults(await auditEveryTaskFile(graph));
    const reconcile = requireOneResult(await auditCrossFileReconcile(graph));
    const verified = await verifyFindingsLocally(perFile, reconcile);
    const fixes = await runScopedTaskFixersForHighMedium(verified);
    rounds.push(normalizeRoundEvidence(round, perFile, reconcile, fixes));
  }
  const finalReconcile = requireClean(await runFreshFinalReconcile(graph));

  const implementationReceipts = [];
  const compileGreenThrough09 = [
    graph.task55101L01Initial, graph.task55101L02,
    graph.task55102L01, graph.task55102L02,
    graph.task55108L03Initial,
    graph.task55105L01, graph.task55105L02,
    graph.task55103L01,
    graph.task55106L01, graph.task55106L02, graph.task55106L03,
    graph.task55107L01, graph.task55109L04Initial,
    graph.task55103L02, graph.task55103L03,
    graph.task55104L01, graph.task55104L02,
    graph.task55107L02,
    graph.task55108L01, graph.task55108L02, graph.task55108L03Final,
    graph.task55109L01, graph.task55109L02,
    graph.task55109L03, graph.task55109L04Final,
  ] as const;
  for (const leaf of compileGreenThrough09) {
    implementationReceipts.push(await dispatchLeafAndRequireTargetedGates(
      leaf, { requireExactTargetedCommandManifest: true }
    ));
  }
  implementationReceipts.push(await dispatchLeafAndRequireTargetedGates(
    graph.task55101L01, {
      phase: "final",
      requireCurrentExactSet: true,
      requireExactTargetedCommandManifest: true,
    }
  ));
  requireCurrentFinalInventoryReceipt(implementationReceipts.at(-1));
  requireExactTask55109DirectSuiteReceipts(implementationReceipts, {
    owners: ["551-09-L01", "551-09-L02", "551-09-L03", "551-09-L04"],
    requireCanonicalArgv: true,
    requireManifestDigest: true,
    requireZeroExitNoSkipAndPositiveDiscovery: true,
  });
  const initialAggregate = await dispatchTask55110L01();
  const postAudit = await runFivePostAuditLenses(initialAggregate);
  if (!postAudit.pass) await fixExactOwnersOnceAndRerunAffectedThenAggregate(postAudit);

  const finalDrift = requireClean(await runFreshCurrentTreeFinalDrift());
  await dispatchTask55110L02({ finalDrift });
  return normalizeWorkflowResult({ rounds, finalReconcile,
    implementationReceipts, postAudit, finalDrift });
}
```

**Data flow:** HEAD/status/diff + docs/source/tests/current task state → grounded
research/authors → five complete audit/reconcile/fix rounds → final reconcile
→ sequential implementation through 09 and targeted gates → final 01-L01
inventory refresh → L01 aggregate plus Admin UI/Redis smoke gate → five post-
audit lenses/fixes/reruns → fresh final drift → L02 closeout.

**Error handling:** missing/malformed result, false clean, stale audit, ownership
violation, unexpected changed path, failed/required-skipped gate, invalid
evidence, missing service, task-graph drift, or unresolved finding terminates the
phase. Resume only from freshly validated current state; do not infer success
from an incomplete prior run.

**Regression-test shape:** workflow tests assert exact 37-file graph and leaf
distribution, five sequential rounds, 37/37 per-file results plus one reconcile
per round, all four required headings, final reconcile, strict land order plus
the post-09 L01 final refresh, per-leaf gate/fix cap, collision
owner verification, forbidden-path enforcement, five post-audit lenses, L01
Redis and Admin-list UI evidence hash verification, L02-only metadata authority,
structured schema rejection, and non-zero failure on every false-clean condition.

## Sub-Tasks

- None. This is the workflow/audit sidecar and intentionally has no product leaf.

## Testing Requirements

- Validate the exact 37-file membership, H1, `# FileName`, parent fields,
  canonical status, changelog 1263, child/leaf distribution, and all four literal
  required headings before accepting author output or final reconcile.
- Require five complete 37/37 rounds plus one reconcile each, exact structured
  result shapes, and a fresh zero-finding final reconcile.
- Test the initial and post-09 final TASK-551-01-L01 dispatches, zero planned
  deltas in the final receipt, the exact displayed interleave
  `01-L01(initial)→01-L02→02-L01→02-L02→08-L03(initial)→05-L01→05-L02→
  03-L01→06-L01→06-L02→06-L03→07-L01→09-L04(initial)→03-L02→03-L03→
  04-L01→04-L02→07-L02→08-L01→08-L02→08-L03(final)→09-L01→09-L02→
  09-L03→09-L04(final)→01-L01(final)→10-L01`,
  and failure on a missing/stale refresh.
- Validate every executable 01..09 leaf's exact literal argv manifest/SHA-256,
  zero exit/no skip, and positive test discovery. Separately pin every 09 direct-
  existing-suite list; reject broad aggregate discovery as owner replacement.
- Validate both Redis and Admin-list UI smoke hashes, five UI scenarios in both
  themes, ten screenshots, and zero console errors before L02 dispatch.
- Test dirty/untracked/ignored-workflow and git-index before/after guards,
  exact author `file`, per-agent assigned-only `changedPaths`, combined-report/
  actual-delta equality, cross-fixer exact-37 allowlisting, rejection of index
  or out-of-scope mutation, and task-graph validation after every fixer batch
  and before final reconcile.

## Exact Validation Commands

```bash
node --check _docs/_workflows/lib/task-551-contract.mjs
node --check _docs/_workflows/task-551-author-audit.mjs
node --check _docs/_workflows/task-551-implement.mjs
node --check _docs/_workflows/task-551-fix.mjs
bun test tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/task551WorkflowContracts.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Also run the workflow's exact task-graph/H1/FileName/parent/status/changelog,
forbidden-path, all-results, structured-schema, line-count, and smoke-evidence
hash self-tests. Re-run a named failure once in isolation before classification.

## Documentation Updates Required

Record concise audit summaries that materially changed implementation in the
owning TASK-551 task and changelog 1263 through TASK-551-10-L02. This child writes
only its structured audit evidence and never edits the final documentation.
