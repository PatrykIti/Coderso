import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";

export const meta = {
  name: "task-551-author-audit",
  description:
    "TASK-551 database/query/cache research, authoring, one complete drift round plus affected repeats, and final reconcile",
  phases: [
    { title: "Research" },
    { title: "Author" },
    { title: "Complete round" },
    { title: "Affected repeats" },
    { title: "Final reconcile" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const TREE = "TASK-551";
const CHANGELOG = 1263;
const execFileAsync = promisify(execFile);
const WORKFLOW_GUARD_PATHS = ["_docs/_workflows/task-551-author-audit.mjs"];
const REQUIRED_HEADINGS = [
  "## Overview",
  "## Sub-Tasks",
  "## Testing Requirements",
  "## Documentation Updates Required",
];
const CHILD_LEAF_DISTRIBUTION = [2, 2, 3, 2, 3, 3, 2, 3, 4, 2, 0];

const TASK_FILES = [
  "TASK-551_Scalable_Database_Query_And_Cache_Optimization.md",
  "TASK-551-01-Performance-Baseline-Query-Inventory-And-Budgets.md",
  "TASK-551-01-L01-Production-Query-Inventory-And-Ownership-Matrix.md",
  "TASK-551-01-L02-Small-Large-Fixtures-Baselines-And-Budgets.md",
  "TASK-551-02-Pool-Timeouts-Lifecycle-And-Query-Telemetry.md",
  "TASK-551-02-L01-Validated-Database-Configuration-And-Cluster-Budget.md",
  "TASK-551-02-L02-Pool-Lifecycle-Timeouts-And-Sanitized-Query-Telemetry.md",
  "TASK-551-03-Bounded-Read-Models-Keyset-Batching-And-N-Plus-One.md",
  "TASK-551-03-L01-Shared-Keyset-Cursor-And-Bounded-Read-Contracts.md",
  "TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md",
  "TASK-551-03-L03-Set-Based-Aggregates-Batching-And-N-Plus-One-Removal.md",
  "TASK-551-04-Canonical-Search-Vectors-And-Bounded-Retrieval.md",
  "TASK-551-04-L01-Canonical-FTS-Trigram-And-Ranked-SQL-Contract.md",
  "TASK-551-04-L02-Bounded-Assistant-Documentation-Candidates.md",
  "TASK-551-05-Evidence-Driven-Indexes-Constraints-And-Explain.md",
  "TASK-551-05-L01-Schema-Split-Indexes-And-Concurrency-Constraints.md",
  "TASK-551-05-L02-Sanitized-Explain-Plan-And-Constraint-Verification.md",
  "TASK-551-05-L03-Normalized-Solution-Kit-Rollback-Authority.md",
  "TASK-551-06-Retention-Pruning-Revision-Concurrency-And-Partition-Readiness.md",
  "TASK-551-06-L01-Append-Heavy-Retention-And-Bounded-Pruners.md",
  "TASK-551-06-L02-Concurrency-Safe-Revisions-And-Retention.md",
  "TASK-551-06-L03-Maintenance-Scheduling-Partition-Readiness-And-Recovery.md",
  "TASK-551-07-Typed-Local-First-Server-Cache.md",
  "TASK-551-07-L01-Typed-Cache-Contract-Envelope-Keys-And-Eligibility.md",
  "TASK-551-07-L02-Byte-Bounded-Memory-LRU-And-Singleflight.md",
  "TASK-551-08-Redis-Durable-Invalidation-And-Distributed-Coalescing.md",
  "TASK-551-08-L01-Redis-Adapter-And-Failure-Semantics.md",
  "TASK-551-08-L02-Durable-Outbox-Generations-And-PubSub.md",
  "TASK-551-08-L03-Distributed-Lease-And-Multi-Replica-Parity.md",
  "TASK-551-09-Hot-Path-Adoption-And-Cache-Correctness.md",
  "TASK-551-09-L01-Warm-Public-Read-Models-And-Zero-Query-Hits.md",
  "TASK-551-09-L02-Page-Entry-Post-And-SEO-Invalidation.md",
  "TASK-551-09-L03-Shell-Theme-Settings-Redirect-Form-And-Listing-Invalidation.md",
  "TASK-551-09-L04-Admin-Identity-And-Security-Cache-Hardening.md",
  "TASK-551-10-Performance-Fault-Gates-Documentation-And-Closure.md",
  "TASK-551-10-L01-Small-Large-Load-Fault-Security-And-Redis-Smoke-Gates.md",
  "TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md",
  "TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md",
];

const RESEARCH_SCOPES = [
  "Inventory every direct DB caller, its query shape, cardinality, projection, transaction and test owner.",
  "Inspect schema/migrations/index usage, search expressions, constraints, retention and concurrency races.",
  "Inspect public/server/Admin cache paths, invalidation coverage, identity isolation and hot-hit query counts.",
  "Verify Bun native Redis, lifecycle, failure semantics, tests/gates/docs and active task collisions.",
];

const LAND_ORDER = [
  "551-01-L01(initial)",
  "551-01-L02",
  "551-02-L01",
  "551-02-L02",
  "551-08-L03(initial)",
  "551-05-L01",
  "551-05-L03",
  "551-05-L02",
  "551-03-L01",
  "551-06-L01",
  "551-06-L02",
  "551-06-L03",
  "551-07-L01",
  "551-09-L04(initial)",
  "551-03-L02",
  "551-07-L02",
  "551-08-L01",
  "551-08-L02",
  "551-08-L03(final)",
  "551-03-L03",
  "551-04-L01",
  "551-04-L02",
  "551-09-L01",
  "551-09-L02",
  "551-09-L03",
  "551-09-L04(final)",
  "551-01-L01(final)",
  "551-10-L01",
  "post-audit/fix/affected-gates/aggregate+smoke",
  "final-drift",
  "551-10-L02",
];

const LOCKED_CONTRACT = `
PostgreSQL is authoritative. Growing lists/searches are narrow, bounded, deterministic keyset reads;
query/index bytes match, constraints/transactions own races, and small/large evidence is mandatory.
Single-replica default is a count+byte memory LRU; Redis is optional shared storage with no persistent
local value cache. Global Redis outage bypasses DB/render. Safe public coherence is bounded-eventual,
never linearizable: old safe bytes last only through durable delivery or measured TTL. Poll <=250 ms,
healthy lag p99 <=1 s, known lag >5 s degrades readiness/bypasses, HTML TTL <=600 s, all TTL <=3,600 s.
Admin preview bypass gives read-after-write; security/private stays fail-closed DB-authoritative.
No KEYS/unbounded SCAN. Redis commits exactly one same-tx outbox row; memory commits zero and one awaited
post-commit bump. Pub/Sub only accelerates; mutations invalidate old/new identities after commit.
Secrets, auth/RBAC, private/password, preview/draft and nonce output are excluded; decrypted SecuritySettings
is never cached. HTML TTL 0 bypasses manifest/HTML policy/generation/store but preserves bootstrap.
Every public request first reads authoritative SecuritySettings. Structural routes total one query;
mutable routes add one root+nested validator over <=128 tuples/101 roots/16,384 bytes and total two,
returning one aggregate/no bodies; unavailable/change/restriction fails before value GET.
No-fill exclusions cover commerce and form/booking/analytics/request nonces/tokens/unknown dependencies;
public anti-abuse remains. Admin scope binds deployment, 128-bit tab, auth-generation nonce, epoch/user/
permissions. 09-L04 INITIAL installs authority before 03/04; FINAL inventories module caches. Rotation
precedes auth; storage failure forces persistent misses; settingsRoutes alone maps redacted conflict,
form actions stay outside render dependency/invalidation, auth payloads stay unchanged. Changelog ${CHANGELOG} is closure-only.
Exactly 38 files = parent + 11 children + 26 leaves; land order is ${LAND_ORDER.join(" -> ")}; 551-11
is sidecar and 01-L01 alone writes both inventory phases. 02-L02 owns lifecycle registry,
runtimeEntrypoint, prod/dev and dedicated sessions. Entrypoint alone start/closes, handles signals,
listens, drains HTTP gracefully <=10 s then forces and reverse-closes; adapters select mode and Vite
participates. Total <=15 s; each close gets RuntimeCloseContext{absoluteDeadline,signal}; non-DB
<=5 s, DB alone min(10 s, remaining budget), no race/detach. Startup rollback is awaited, never
listens after failure/signal, and no participant calls server.stop. One fleet parser serves pool/
identity/migration: runtime 1..256 default 1, worker 0..256 default 0, pool default 10, migration
reserve 3, planned 1*10 + 0*10 + 3 = 13 below availability. Pure identity opens no client; sessions
are coderso:runtime|worker|maintenance:<id> or coderso:migration:<operationUuid>.
03 owns cursor keyring/load/register/require; routes/index registers it at module evaluation. 06 owns
retention participation without dockerStart and zero-arg-run withRevisionParentLock(identity,tx,run)
plus allocateRevision(input,tx). 08-L03 alone owns httpServer, composes cache/retention/backup at
module evaluation, preserves cursor registration, never loads keyring or edits entrypoints, and
exports singleton runtime.cache. Public keys are only mode/cache/invalidation.applyAfterCommit/health.
Cache contracts pin branded entries/TTLs, full store results, one controller, singleflight
1,024/16..10,000 and four-policy capacity. Memory's 64-entry expiry+eviction cap skips victim 65.
Final-path+epoch+shareScopeDigest keys identity-cleaned outcome promises, never caller values;
ineligible bypasses and only strict published lets joiners resolve, else each loads no-fill.
getOrLoad alone captures generations and accepts finite-reason no_fill or positive/negative fill
with independent TTLs. Loaders get {trigger,companion}; disabled reasons are ineligible|
singleflight_saturated|coherence_bypass|generation_unavailable|transport_unavailable|
distributed_wait_timeout|coordinator_closed|not_published_retry. Outcomes map absent/rejected/
disabled only to store_absent_no_publication/store_value_rejected/fill_disabled, never trigger.
Manifest/HTML fills only true absence; writes stay hidden. Committed callers await applyAfterCommit;
resolution follows local observation/fence, never fire-and-forget/direct epoch mutation.
Public HTML pins both companion directions, atomic fill and uncached returnValue; only positive or
finite-reason no_fill, never negative. Exclusion returns authoritative no-write output. public-html-manifest is
non-authorizing metadata with mutableVisibilityGate:not_required; HTML requires current strictly_public
root+nested validation and refreshed eligibility is distinct post-render context. Method+URL dispatch
preserves all booking paths including slots GET, Forms submission/upload and analytics beacon at every
method before cache; only unmatched GET/HEAD enters and each request reads SecuritySettings once.
Both Redis writes share one strict pre-command envelope/fillKind/ceiling validator; malformed bundles
issue zero commands and companion TTL stays independent. Distributed fill uses only atomic
putIfGenerationsAndLeaseOwned proving token+generations; only written fills, other/uncertain outcomes
return authoritative bytes, generation-only write is forbidden and release is cleanup. Watermarks
ignore older/equal; nested collectors share one eventKey. Only that event's durable processed signal
after bump+conditional DB completion clears its fence; broad recovery/PubSub/other event cannot, and
duplicate observations advance epochs without clearing.
Only unresolved-event and active-attempt tokens remain, capped 4,096 each with no settled tombstones;
saturation bypasses without rejecting callbacks, attempt tokens settle after callbacks cannot report,
and recovery needs both <=3,072. >100,000 settled events stay bounded. Redis fences durable drain until
healthy/no pending/claimed rows; only safe-integer epoch/drain-generation overflow lasts to restart.
TASK-551-10 consumes five light/dark 03-L02 visible-effect UI smokes with screenshots and zero
console errors plus infrastructure smoke. TASK-551-10-L02 owns _docs/CMS_API.md and _docs/SEARCH_SPEC.md.

TASK-551-01 fixtures run one family scenario at a time with exact integer target/support counts,
UUIDv5 identities, ten-row grouped list timestamps and unique append timestamps. Fixed
distributions are users 80/10/10 with five roles/every tenth multi-role; content 50/30/10/10;
entry 70/20/10; forms 60/30/10; submissions 70/20/10; media 80/20 and 10% null folder;
five booking statuses at 20%; search uses the exact per-family integer common/rare table and
hidden/miss zero, never percentage rounding; equal-sort groups of ten. Timing uses pools 2/10, three repetitions
of 5 warmups plus 30 samples, calibration 20 plus 100, p95 spread divided by max(median,0.1)
with explicit all-zero handling and a 20 percent cap, normalized calibration in 0.80..1.20,
and ceilToTenth(max(floor, median*1.25)); consumers use only the stored ceilings.
Summary/facet asOf is 2026-01-15T12:00:00.000Z. Submission ordinal%4===0 uses 1..6 days before
and all others 8..37 days before, yielding rolling-seven-day 500/25,000 and spam 200/10,000.
Booking cycles UTC/New_York/Tokyo; modulo-100 buckets 0..9/10..19/20..59/60..99 mean same-day
past/same-day future/next 1..40/prior 1..40, end +60 minutes, yielding today 400/20,000 and
upcoming/past-current 1,000/50,000 each, independent of host timezone. Fixtures also pin exact
author/type-author/role/post-media tags, webhook event/delivery, latest autosave and public
dependency 128-tuples/101-roots/16,384 bytes; retention clock is 2036-01-01 with every missing-
family count and batch edges 499/500/501/2,000/2,001. Inventory starts at 34 planned: 32 named Admin
plus cache-outbox-oldest-unprocessed and public-html-
dependencies-128. Plan registry is 37 IDs/38 cases/76 profile receipts: the 32 once plus webhooks-
created-keyset, webhook-deliveries-parent-keyset, webhooks-event-batch, page-latest-autosave, and
cache-outbox-oldest-unprocessed. TASK-551-02 shared fleet defaults are runtime 1, worker 0, pool 10,
migration reserve 3 and planned 13 by 1*10 + 0*10 + 3, strictly below availability. Its Bun test is
tests/integration/server/task551DatabaseLifecycle.test.ts; phase deadlines are
2_000/5_000/10_000/15_000 ms and DB close is 10 seconds. Late acquisition releases once.
Telemetry is bounded to six families, five outcomes, 12 duration cells including overflow,
nine row cells including overflow, 3,240 cells per fingerprint and 44 pool cells, with
saturating counters and deterministic snapshot/reset; measurement and pool probing are opt-in.
Exact constants are QUERY_FAMILIES, QUERY_OUTCOMES, QUERY_DURATION_BUCKET_MAX_MS,
ROWS_RETURNED_BUCKET_MAX, POOL_WAIT_BUCKET_MAX_MS, POOL_OUTCOMES,
MAX_QUERY_FINGERPRINTS=512 and MAX_COUNTER_VALUE=Number.MAX_SAFE_INTEGER.
client.ts exports assertMaintenanceSessionAffinity. DB_MAINTENANCE_MODE is primary|direct|session,
pool max is 2..4, and the maintenance URL is secret/budgeted. Primary startup never probes;
off+primary+pool1 is valid with scheduler disabled and verifyDatabaseSessions checks only that
session. Explicit direct/session probes once at DB
startup and reuses its lifecycle result; enabled scheduler awaits it before timer/listen and fails
below two sessions or with transaction+primary.
Known-interval pg_stat_statements receipts run before prioritization and before/after comparison,
never reset shared stats, sanitize SQL, and use only application|migration|maintenance|
external_diagnostic|unknown. Owner Render evidence records sanitized 4m51 row_to_json(t)::text ~ ?
UNION and 30-60s+ access_logs regex shapes; external_diagnostic needs operator evidence, else unknown.
Exclude them from app decisions; never index one-off scans; use read-only strict-timeout/prefer-replica diagnostics.
Dedicated sessions expose only signal-aware static execute/transaction/liveness/cancel-and-
rollback. Retention lock, every batch transaction and unlock use one backend PID; close aborts,
cancels active SQL and confirms rollback/termination within 4,500 ms before cache/DB close.
Lock loss maps only to retention_lock_lost, with no overlap/partial summary/detached work, under
the shared 5-second participant ceiling.

TASK-551-05-L01 solely owns seven SEARCH_VECTOR_SQL and five trigram source literals using
immutable-safe coalesce(...) || ' ' || ... concatenation, and proves every closed dependency
through pg_proc.provolatile = 'i'. It atomically owns schema exports, migration, snapshot,
journal and generator/drift guards. The installed Drizzle DSL cannot express the booking GiST
exclusion, so BOOKING_RESERVATION_EXCLUSION_SQL is the deeply immutable custom-migration seam:
CREATE EXTENSION IF NOT EXISTS btree_gist, then ALTER TABLE bookings ADD CONSTRAINT
bookings_active_resource_window_excl EXCLUDE USING gist (resource_id WITH =,
tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed')). The
rollback SQL is ALTER TABLE bookings DROP CONSTRAINT IF EXISTS
bookings_active_resource_window_excl and preserves btree_gist. The snapshot intentionally omits
only that exclusion; live pg_constraint contype = 'x', exact SQL,
clean/prior/rollback/forward behavior, extension preservation, zero generator drift and no
duplicate add/generated drop are mandatory. This is atomic AGENTS compliance, not DSL support.
The closed index catalog includes all form/booking/list/retention members and assistant-ingest
started_at. It pins pages_author_list_updated_id_idx, role-leading user_roles_role_user_idx, and
posts_tags_gin_idx/media_tags_gin_idx as jsonb_path_ops GIN against exact parameterized @>
predicates. Read-performance owns cache_outbox_unprocessed_age_idx(created_at,id) WHERE
processed_at IS NULL; readOldestUnprocessedAge/cache_outbox_oldest_unprocessed orders created_at,id
LIMIT 1 across claimed/backed-off rows with 1k/100k EXPLAIN and write budgets. Sole v2
rollout-forward drains exact app identities, applies the guarded transaction and keeps the old
max(version)+1 binary stopped through the durable revision-integrity barrier. External mode admits
only the digest-pinned compatible TASK-551 binary during read-index builds; offline-single stays
cold through final catalog. First new traffic makes rollback forward-fix only. Index DDL is never
transactional. One reserved physical migration session plus the sole
createTask551ReservedDrizzleClient(poolClient,reserved) are mandatory. Direct
drizzle(reserved) is invalid on postgres.js 3.4.9; only drizzle(adaptedReserved)
reaches Drizzle 0.45.2. Pin identical immutable pool .options with shared
parser/serializer maps, callable forwarding and .unsafe()/.values() parity on
the reserved handle, same-handle empty-option .begin, zero pool SQL/begin/.unsafe()
dispatch after reserve, exact coderso.task551_operation_id,
coderso.task551_receipt_v2 and coderso.task551_receipt_sha256 GUCs, one PID
across GUC set/guard/DDL/receipt/journal, successful RESET/same-PID/one-release/
normal-end, poison/hard-end on unknown state, and static SQL validation of the
SHA-256-bound canonical v2 receipt of 1..65,536 UTF-8 bytes inside the migrator
transaction. Clean/prior/replay/reverse, failure rollback, repeat-zero-transition
and status/recovery pass.

After 06-L01/L02/L03 services, 03-L02 solely owns all page/detail revision route, schema,
client and UI adoption of the exact summary envelope {items,nextCursor,hasMore}. It also owns
the freshly rescanned complete consumer graph for pagesClient, detailPagesClient, entriesClient,
postsClient, adminUsersClient, formsClient, mediaClient and bookingClient, bounded server-side picker/search/
load-more state, formReadService as form-list owner with exact FormListItem fields
id,name,slug,status,description,submissionAccess,updatedAt. bookingReadService owns paginated
reservations/resources/services/blackouts, capped-100 service-resource/schedule arrays and
31-day/500-slot preview.
Existing Reservations/Resources/Services tabs consume narrow items, Services keeps derived
submissionAccess, edits await point detail and Availability/SlotPreview use bounded pickers.
Submission payload uses one authorized parent-bound point query only on explicit expansion,
stays component-local/uncached and aborts/clears on close/unmount/logout/auth change. Success/error
headers are exact Cache-Control value "private, no-store, max-age=0", Pragma "no-cache" and
Expires "0", and the client uses
cache:no-store. Media list
name derives originalName -> title -> sanitized key basename -> asset; raw key stays omitted and
media/utils.ts consumes name directly. Exact extraction stems are BookingOverviewPanel, MediaLibraryFolderState/Results, UsersRolesContent,
DetailTemplateRevisionPanel, MenuDesignCanvas/Inspector/DataSources, MenuEditorWorkspace,
PostEditorMediaControls, ContentListSource/PresentationEditors, CtaBannerContentEditors,
EntryTeaserSource/PresentationEditors, FeatureGridItemEditors, FooterNavigation/BrandEditors,
GalleryMosaicItemEditors, HeroContent/Media/LayoutEditors, LogoCloudItemEditors,
NavigationItem/PresentationEditors, PostsFeedSourceEditors, RichTextContent/LayoutEditors,
SectionContent/LayoutEditors, TeamMember/LayoutEditors and TestimonialItemEditors, plus
all eight named page-editor split suites, plus every cohesive split needed to keep files <=1,000 lines,
two direct graph suites, five direct revision suites and visible-effect UI smoke. Raw arrays,
auto-fetch-all, silent first-page truncation and heavy-body fallbacks are forbidden. 06-L02's
revision summaries are page {id,pageId,version,kind,title,slug,createdAt,
createdBy:{id,name,email}|null} and detail {id,detailPageId,version,kind,createdAt,
createdBy:string|null}; typed {items,nextCursor,hasMore} envelopes use {cursor?,limit?},
default/max 50/100 and version DESC,id DESC. Bodies are point-only; invented reason is forbidden.
Every family uses the two-segment <payload>.<mac> cursor and code-owned 1..5-field KeysetSpec ending
UUID id; previous reverses SQL/nulls then output and public faults map generically. Metric envelopes
are {items,nextCursor,hasMore,summary,facets}: arbitrary-filter matchingTotal is null with exactness
not_computed and no filtered COUNT. Fixed summaries/facets are exact in one read-only REPEATABLE
READ authorized/parent snapshot. Each page/summary/facet SQL has its own 01 budget and 05 receipt;
page + aggregate + relation facet stays at most three statements without hidden pages.
Legacy booking-page.test.tsx and media-library.test.tsx are deleted. Exact owners are
bookingPageTestFixtures.tsx plus booking loading-pagination/mutations/calendar suites, and
mediaLibraryTestFixtures.tsx plus media loading-pagination/selection-folders/upload-edit suites.
06-L01 alone owns Bun-free searchHistoryContract.ts and its direct Vitest, removes the real private
pruneHistory declaration/call, and lands actor/UUIDv5-idempotent recordSearch. 04-L01 makes search GET
write-free and owns sole internal POST /admin/api/search/history with session actor, content:read,
CSRF, admin_write, strict four-key body and 409 conflict. searchClient/useSearchResults reuse one
UUID per normalized UI intent/retry; there is no public/API-key/GET mutation alias.
06-L01 preserves analytics
upgrade compatibility: ANALYTICS_RETENTION_DAYS absent/malformed/non-finite 365, finite floor
and clamp 30..1095 with the exact Number(raw) truth table; only
RETENTION_ANALYTICS_ENABLED enables it and age aliases reject. Both
ANALYTICS_PRUNE_INLINE_DISABLED and ANALYTICS_PRUNE_INLINE_ENABLED are separate warning-once
raw-value-free deprecated no-ops. RETENTION_DRY_RUN is the sole lowercase boolean; direct dry-
run has no scheduler advisory lock, scheduled use takes exactly one replica advisory, and both
perform no destructive-row-lock/mutation/publication/progress.
Request-path inline pruning remains zero.
Search v1 has no cursor: five arms cap exact-email then FTS then non-overlap trigram at 51; at most
255 reach tier-before-score global dedup/rank and 51 leave. L01 alone exports
buildTask551PrefixTsquery plus shared constants; Admin and assistant bind literal
to_tsquery('simple',$1) once in an input CTE and reuse that tsquery for every
vector predicate/rank, while assistant expandedTerms stay reranker-only. Shared
NFKC/Unicode/punctuation plus 2/200-code-point, 800-byte, 16-token and
64-code-point-per-token bounds reject local parsers, raw interpolation,
websearch_to_tsquery, plainto_tsquery, or a second tsquery bind. Trigram uses
GIN % after static transaction-local SET LOCAL pg_trgm.similarity_threshold='0.300'.
No LIKE/ILIKE/regex fallback.
Page autosave parent-locks and selects latest version DESC,id DESC LIMIT 1; equality writes nothing,
change allocates then deletes only that predecessor, while old history is scheduler-only and
100k/50-writer tests pin query budgets.

AdminCacheScopePreimageV3 order is {v,deploymentIdentity,authIncarnation,authGenerationNonce,
authEpoch,userId,permissions,roles}. Its 367-byte vector digest is
6c69458d5fdc22634a5fca20609e3accb4a6fe606905af2b2c522900770afbf7; nonce-only 222... digest is
4214d494f425d2f595de703cd19662a2513d0d85871bff748bdb5d5cb728611d and rejects old storage/events/
delayed installs. Arrays are separately normalized/byte-sorted, never delimiter concatenation.
Security-settings writes set local lock timeout 2s and take advisory (551,904) before same-tx
read/merge/write. Redis writes exactly one same-tx outbox row; memory writes zero and performs exactly
one awaited post-commit generation bump. Both map lock/deadlock conflict and expose observation/fence.

An effective force/recover advances each affected coherence epoch once; an identical-state
report is a no-op. Every accepted local or Pub/Sub invalidation_observed, duplicates included,
advances affected epochs, never clears a fence or authorizes stale/private data. Retain no settled
tombstones: unresolved-event/active-attempt sets cap independently at 4,096; saturation temporarily
bypasses all families without rejecting callbacks, recovers when both <=3,072, and >100,000 settled
events stay bounded. Redis durable drain remains fenced until healthy/no pending/claimed rows; only
safe-integer epoch/drain-generation overflow stays forced until restart. No second epoch mutator exists.
Pub/Sub contains only { eventKey, generationDigest }; the subscriber bounded-point-reads the
outbox row for finite tags and emits no observation on missing, malformed or failed reads.
TASK-551-05-L01's one migration triple lands the normalized Solution Kit rollback authority
(solution_kit_starter_apply_owners, solution_kit_legacy_template_evidence,
solution_kit_legacy_rollback_progress, plus rollback_of_run_id ON DELETE RESTRICT and
template-plan/proof columns) and its named checks/indexes byte-for-byte as declared by
TASK-551-05-L03; no authority shape may be invented outside the L03 contract bytes and no
authority predicate may use options/summary/JSON/nullable-actor loopholes.

Every executable 01..09 leaf owns its exact literal canonical argv manifest/digest with exit
zero, no skip and positive test discovery. New default-lane TASK551 integration suites live in
tests/integration/server, never a legacy non-default integration tree. Each
09 leaf additionally owns every direct existing suite in its literal commands. 10 consumes
the four ordered direct-suite handoffs and owns only
aggregate/full gates and docs; broad rediscovery cannot replace a targeted receipt or transfer
test ownership.
No product implementation begins until TASK-511, TASK-493, TASK-517 and TASK-518 are
terminal. The sole substitute is a fresh exact serialized handoff audit proving all
schema, core/db/migrations/meta/_journal.json, .env.example, publicSite, entry, SEO, import and lifecycle source/test,
migration and documentation paths byte-disjoint; wildcard, partial or stale ownership blocks.
`;

const COMMON = `
Repository: ${ROOT}. Report current HEAD and dirty status. Read root AGENTS.md,
_docs/_TASKS/README.md, README.md, CONTRIBUTING.md, _docs/ARCHITECTURE.md,
_docs/CMS_SPEC.md, _docs/CMS_API.md, _docs/ORM_SPEC.md, _docs/DATA_MODEL.md,
_docs/TESTING_STRATEGY.md, _docs/SECURITY_SPEC.md, relevant source/tests, every TASK-551
contract, and current git diff. Ground every path/symbol against current bytes; use grep -an
or direct reads for large files. Never expose env values, credentials, SQL binds, raw logs,
cached bodies, submissions or user data. Reports are evidence, not authority.
${LOCKED_CONTRACT}
`;

const RESEARCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "anchors", "risks"],
  properties: {
    summary: { type: "string" },
    anchors: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
  },
};

const AUTHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["file", "summary", "anchors", "openQuestions", "changedPaths"],
  properties: {
    file: { type: "string" },
    summary: { type: "string" },
    anchors: { type: "array", items: { type: "string" } },
    openQuestions: { type: "array", items: { type: "string" } },
    changedPaths: { type: "array", items: { type: "string" } },
  },
};

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["schema", "pass", "summary", "findings", "errors"],
  properties: {
    schema: { const: "coderso.task551.audit-result@v1" },
    pass: { type: "boolean" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
    errors: { type: "array", items: { type: "string" } },
  },
};

const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "schema",
    "ownerTaskId",
    "pass",
    "summary",
    "changedPaths",
    "fixed",
    "rejected",
    "errors",
  ],
  properties: {
    schema: { const: "coderso.task551.fix-result@v1" },
    ownerTaskId: { type: "string", pattern: "^TASK-551(?:-[0-9]{2})?(?:-L[0-9]{2})?$" },
    pass: { type: "boolean" },
    summary: { type: "string" },
    changedPaths: { type: "array", items: { type: "string" } },
    fixed: { type: "array", items: { type: "string" } },
    rejected: { type: "array", items: { type: "string" } },
    errors: { type: "array", items: { type: "string" } },
  },
};

function requireAllResults(label, expected, results, options = {}) {
  const min = options.min ?? expected;
  if (!Array.isArray(results) || results.length < min || results.length !== expected) {
    throw new Error(`${label}: expected ${expected} results, got ${results?.length ?? 0}`);
  }
  const missing = results.flatMap((result, index) => (result ? [] : [index]));
  if (missing.length > 0) {
    throw new Error(`${label}: missing results at indexes ${missing.join(",")}`);
  }
  return results;
}

function highMedium(result) {
  return result.findings.filter(
    (finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM"
  );
}

function validateAuditResult(label, result, { final = false } = {}) {
  const blocking = highMedium(result).length > 0 || result.errors.length > 0;
  const expectedPass = final ? !blocking && result.findings.length === 0 : !blocking;
  if (result.pass !== expectedPass) {
    throw new Error(`${label}: pass=${result.pass} is inconsistent with findings/errors`);
  }
  return result;
}

function validateFixResults(label, expectedOwners, results) {
  requireAllResults(label, expectedOwners.length, results);
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    if (result.ownerTaskId !== expectedOwners[index]) {
      throw new Error(
        `${label}: expected owner ${expectedOwners[index]}, got ${result.ownerTaskId}`
      );
    }
    if (!result.pass || result.errors.length > 0) {
      throw new Error(`${label}: fixer ${result.ownerTaskId} did not pass`);
    }
  }
  return results;
}

function countFindings(results) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const result of results) {
    for (const finding of result.findings) {
      counts[finding.severity.toLowerCase()] += 1;
    }
  }
  return counts;
}

function taskIdFor(file) {
  const match = file.match(/^TASK-(551(?:-\d{2})?(?:-L\d{2})?)/);
  if (!match) throw new Error("Cannot derive task id for " + file);
  return match[1];
}

function exactLineCount(source, line) {
  return source.split(/\r?\n/u).filter((candidate) => candidate === line).length;
}

function normalizeRepoPath(value) {
  if (typeof value !== "string" || value.length === 0) return "";
  const clean = value.replace(/\\/g, "/").replace(/^\.\//u, "");
  const absolute = resolve(isAbsolute(clean) ? clean : `${ROOT}/${clean}`);
  const repoRelative = relative(ROOT, absolute).replace(/\\/g, "/");
  if (
    repoRelative.length === 0 ||
    repoRelative === ".." ||
    repoRelative.startsWith("../") ||
    isAbsolute(repoRelative)
  ) {
    return "";
  }
  return repoRelative;
}

function taskRepoPath(file) {
  return `_docs/_TASKS/${file}`;
}

async function gitNullSeparated(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.split("\0").filter((entry) => entry.length > 0);
}

async function fingerprintPath(repoRelative) {
  const absolute = `${ROOT}/${repoRelative}`;
  try {
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) {
      const target = await readlink(absolute);
      throw new Error(`Mutation guard rejects symbolic links: ${repoRelative} -> ${target}`);
    }
    if (!stat.isFile()) return `other:${stat.mode}:${stat.size}`;
    const hash = createHash("sha256")
      .update(await readFile(absolute))
      .digest("hex");
    return `file:${stat.mode}:${stat.size}:${hash}`;
  } catch (error) {
    if (error?.code === "ENOENT") return "missing";
    throw error;
  }
}

async function fingerprintGitIndex() {
  const { stdout } = await execFileAsync("git", ["rev-parse", "--git-path", "index"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  const indexPath = resolve(ROOT, stdout.trim());
  return createHash("sha256")
    .update(await readFile(indexPath))
    .digest("hex");
}

async function snapshotWorktree() {
  const [tracked, untracked, indexSha256] = await Promise.all([
    gitNullSeparated(["diff", "--name-only", "--no-renames", "-z", "HEAD", "--"]),
    gitNullSeparated(["ls-files", "--others", "--exclude-standard", "-z"]),
    fingerprintGitIndex(),
  ]);
  const files = [...new Set([...tracked, ...untracked, ...WORKFLOW_GUARD_PATHS])].sort();
  const fingerprints = new Map();
  for (const file of files) fingerprints.set(file, await fingerprintPath(file));
  return { fingerprints, indexSha256 };
}

function changedSnapshotPaths(before, after) {
  const paths = [...new Set([...before.fingerprints.keys(), ...after.fingerprints.keys()])].sort();
  return paths.filter((file) => before.fingerprints.get(file) !== after.fingerprints.get(file));
}

function validateReportedChangedPaths(result, allowed, label, exactPath) {
  const reported = result.changedPaths.map(normalizeRepoPath).sort();
  if (reported.some((file) => file.length === 0) || reported.length !== new Set(reported).size) {
    throw new Error(`${label}: changedPaths contains an invalid or duplicate path`);
  }
  const allowedSet = new Set(allowed);
  const forbidden = reported.filter((file) => !allowedSet.has(file));
  if (forbidden.length > 0) {
    throw new Error(`${label}: changedPaths outside ownership: ${forbidden.join(",")}`);
  }
  if (exactPath && reported.length > 0 && (reported.length !== 1 || reported[0] !== exactPath)) {
    throw new Error(`${label}: may report only ${exactPath}`);
  }
  return reported;
}

async function validateMutationBatch(before, results, allowed, label, exactPaths = []) {
  const reported = [];
  for (let index = 0; index < results.length; index += 1) {
    reported.push(
      ...validateReportedChangedPaths(
        results[index],
        allowed,
        `${label} result ${index}`,
        exactPaths[index]
      )
    );
  }
  if (reported.length !== new Set(reported).size) {
    throw new Error(`${label}: multiple agents reported the same changed path`);
  }

  const after = await snapshotWorktree();
  if (before.indexSha256 !== after.indexSha256) {
    throw new Error(`${label}: an agent changed the git index`);
  }
  const changed = changedSnapshotPaths(before, after);
  const allowedSet = new Set(allowed);
  const forbidden = changed.filter((file) => !allowedSet.has(file));
  if (forbidden.length > 0) {
    throw new Error(`${label}: working-tree changes outside ownership: ${forbidden.join(",")}`);
  }
  const expected = [...reported].sort();
  if (
    changed.length !== expected.length ||
    changed.some((file, index) => file !== expected[index])
  ) {
    throw new Error(
      `${label}: changedPaths/diff mismatch; reported ${expected.join(",")}, changed ${changed.join(",")}`
    );
  }
  return after;
}

async function validateExactTaskGraphFiles() {
  if (TASK_FILES.length !== 38 || CHILD_LEAF_DISTRIBUTION.reduce((a, b) => a + b, 0) !== 26) {
    throw new Error("TASK-551 validator constants do not describe 38 files and 26 leaves");
  }
  const expected = [...TASK_FILES].sort();
  const onDisk = (await readdir(TASKS))
    .filter((file) => /^TASK-551(?:_|-).*\.md$/u.test(file))
    .sort();
  if (JSON.stringify(onDisk) !== JSON.stringify(expected)) {
    throw new Error("TASK-551 physical file set does not exactly match the frozen 38-file graph");
  }

  const leafCounts = Array.from({ length: 11 }, () => 0);
  const childIds = new Set();
  for (const file of TASK_FILES) {
    const source = await readFile(TASKS + "/" + file, "utf8");
    const taskId = "TASK-" + taskIdFor(file);
    if (
      !source.startsWith("# " + taskId + ":") ||
      exactLineCount(source, "# FileName: " + file) !== 1
    ) {
      throw new Error(file + ": H1 or FileName shape mismatch");
    }
    if (
      exactLineCount(source, "**Status:** ⏳ To Do") !== 1 ||
      !/^\*\*Changelog:\*\* 1263\b/mu.test(source)
    ) {
      throw new Error(file + ": status or changelog shape mismatch");
    }
    for (const heading of REQUIRED_HEADINGS) {
      if (exactLineCount(source, heading) !== 1) {
        throw new Error(file + ": required heading must appear exactly once: " + heading);
      }
    }

    const leaf = file.match(/^TASK-551-(\d{2})-L\d{2}-/u);
    const child = file.match(/^TASK-551-(\d{2})-(?!L\d{2}-)/u);
    if (leaf) {
      const childNumber = Number(leaf[1]);
      if (
        childNumber < 1 ||
        childNumber > 11 ||
        exactLineCount(source, `**Parent Subtask:** TASK-551-${leaf[1]}`) !== 1
      ) {
        throw new Error(file + ": leaf parent shape mismatch");
      }
      leafCounts[childNumber - 1] += 1;
    } else if (child) {
      childIds.add(child[1]);
      if (exactLineCount(source, "**Parent Task:** TASK-551") !== 1) {
        throw new Error(file + ": child parent shape mismatch");
      }
    } else if (file !== TASK_FILES[0]) {
      throw new Error(file + ": unrecognized task-file shape");
    }
  }
  if (
    childIds.size !== 11 ||
    JSON.stringify(leafCounts) !== JSON.stringify(CHILD_LEAF_DISTRIBUTION)
  ) {
    throw new Error("TASK-551 child/leaf distribution mismatch");
  }
}

function authorPrompt(file, research) {
  return `You are the scoped AUTHOR for ${TREE}. Edit only ${TASKS}/${file}.
${COMMON}
Use the grounded research: ${JSON.stringify(research)}. Follow the exact filename/H1/parent,
canonical To Do status and changelog ${CHANGELOG}. A leaf must be execution-ready with exact
single-writer and forbidden paths, helper/data/error pseudocode, security contract, regression
shape, correct Bun/Vitest/DB/Redis lanes, docs handoff and line-count gate. Every file must contain
exactly one each of these literal level-two headings: ${REQUIRED_HEADINGS.join(", ")}. Do not edit source,
tests, workflow, indexes, board or changelog. Return file exactly as ${file}, no unresolved open
question, and changedPaths as an empty array or only ${taskRepoPath(file)}, matching the real diff.`;
}

function auditPrompt(file, round) {
  return `You are a fresh-context READ-ONLY per-file drift auditor for ${file}, round ${round}.
Do not edit. ${COMMON}
Check the file against current source/tests/docs and its parent/children: completeness, stale
anchors, boundedness, exact ownership, API security, transaction ordering, migration artifacts,
cache failure/coherence semantics, implementation pseudocode, tests, gates and line limits.
Every finding needs current file:line evidence. Return schema
coderso.task551.audit-result@v1 with pass, summary, findings, and errors. pass is true only
when errors and HIGH/MEDIUM findings are empty; LOW findings may remain visible. An empty list
must summarize concrete checks.`;
}

function reconcilePrompt(round) {
  return `You are the ONE fresh-context READ-ONLY cross-file RECONCILE auditor for ${TREE},
round ${round}. Do not edit. Read all ${TASK_FILES.length} files: ${TASK_FILES.join(", ")}.
${COMMON}
Check only cross-file contradictions: single writers; shared types/env/envelopes/limits/errors/tags;
schema/search/outbox order; cache parity/security; handoffs; 38-file graph; ${LAND_ORDER.join(" -> ")};
and changelog ${CHANGELOG}. Reconcile 34 initial fingerprints (32 Admin + outbox + public HTML),
37 plan IDs/38 cases/76 receipts and their exact five non-Admin IDs; fleet defaults runtime1/worker0/
pool10/migration3/planned13; known-interval traffic classes/no reset and external diagnostic evidence;
one migration session, three exact GUCs and bounded SHA-256 v2 receipt; immutable vectors/GiST seam;
Unicode L/M/N/_ token:* to_tsquery grammar, GIN %, static 0.300 SET LOCAL and no fallback;
loader {trigger,companion}, exact disabled reasons/outcome mapping, manifest non-authority/distinct
eligibility, 4096/3072 no-tombstone hysteresis, durable Redis drain fence and overflow separation;
Admin scope nonce immediately after incarnation plus both exact vector digests; 06 before 03-L02,
its eight-client graph/UI smoke; analytics compatibility; event fence/PubSub point read; and each 09
literal argv/digest/zero/no-skip/positive-discovery receipt consumed by 10. Evidence must name both
contradictory files. Missing audit results are not a pass.`;
}

function perFileFixPrompt(file, round, findings) {
  return `You are the scoped task-contract FIXER for ${file}, round ${round}. Edit only
${TASKS}/${file}. ${COMMON}
Verify and fix these HIGH/MEDIUM findings: ${JSON.stringify(findings)}. Do not broaden scope or
touch source/tests/docs/workflows/indexes/changelog. Return schema
coderso.task551.fix-result@v1 with ownerTaskId ${taskIdFor(file)}, pass, summary, changedPaths,
fixed, rejected, and errors. changedPaths must be empty or only ${taskRepoPath(file)} and must match
the real diff. Report each fix or evidence-backed rejection.`;
}

function crossFixPrompt(round, findings) {
  return `You are the cross-file task-contract FIXER for ${TREE}, round ${round}. Edit only a
path in this exact frozen 38-path allowlist, and only when named by a verified finding:
${TASK_FILES.map(taskRepoPath).join(", ")}. ${COMMON}
Preserve a single owner and dependency-valid land order; align consumers to the owner. Never
edit source/tests/docs/workflows/indexes/changelog. Return schema
coderso.task551.fix-result@v1 with ownerTaskId TASK-551, pass, summary, changedPaths, fixed,
rejected, and errors. changedPaths may contain only exact TASK-551 task paths and must match the
real diff. Findings: ${JSON.stringify(findings)}.`;
}

phase("Research");
const research = requireAllResults(
  "research",
  RESEARCH_SCOPES.length,
  await parallel(
    RESEARCH_SCOPES.map(
      (scope, index) => () =>
        agent(`Fresh-context read-only research ${index + 1}. ${scope}\n${COMMON}`, {
          label: `research:${index + 1}`,
          phase: "Research",
          schema: RESEARCH_SCHEMA,
        })
    )
  )
);

phase("Author");
const authored = [];
for (let index = 0; index < TASK_FILES.length; index += 1) {
  const file = TASK_FILES[index];
  const before = await snapshotWorktree();
  const result = await agent(authorPrompt(file, research), {
    label: "author:" + taskIdFor(file),
    phase: "Author",
    schema: AUTHOR_SCHEMA,
  });
  if (!result || result.file !== file) {
    throw new Error(
      `author result ${index}: expected file ${file}, got ${result?.file ?? "missing"}`
    );
  }
  await validateMutationBatch(before, [result], [taskRepoPath(file)], `author:${taskIdFor(file)}`, [
    taskRepoPath(file),
  ]);
  authored.push(result);
}
requireAllResults("author", TASK_FILES.length, authored);

const openQuestions = authored.flatMap((result) => result.openQuestions);
if (openQuestions.length > 0) {
  throw new Error("Authoring left unresolved questions: " + JSON.stringify(openQuestions));
}
await validateExactTaskGraphFiles();

const roundEvidence = [];
const MAX_AFFECTED_REPEATS = 5;
let affectedFiles = TASK_FILES;
let roundPass = false;
for (let iteration = 0; !roundPass; iteration += 1) {
  if (iteration > MAX_AFFECTED_REPEATS) {
    throw new Error(
      `round-evidence: affected repeats exceeded ${MAX_AFFECTED_REPEATS}; persistent HIGH/MEDIUM findings must be escalated as a terminal non-passing result`
    );
  }
  const phaseName = iteration === 0 ? "Complete round" : "Affected repeats";
  phase(phaseName);
  const perFile = requireAllResults(
    `round-${iteration}-per-file`,
    affectedFiles.length,
    await parallel(
      affectedFiles.map(
        (file) => () =>
          agent(auditPrompt(file, iteration), {
            label: `audit:${taskIdFor(file)}:${iteration}`,
            phase: phaseName,
            schema: AUDIT_SCHEMA,
          })
      )
    )
  );
  perFile.forEach((result, index) =>
    validateAuditResult(`round-${iteration}-per-file:${affectedFiles[index]}`, result)
  );
  const reconcile = requireAllResults(
    `round-${iteration}-reconcile`,
    1,
    await parallel([
      () =>
        agent(reconcilePrompt(iteration), {
          label: `audit:reconcile:${iteration}`,
          phase: phaseName,
          schema: AUDIT_SCHEMA,
        }),
    ])
  )[0];
  validateAuditResult(`round-${iteration}-reconcile`, reconcile);
  const auditErrors = [...perFile, reconcile].flatMap((result) => result.errors);
  if (auditErrors.length > 0) {
    throw new Error(
      `round-${iteration}: audit errors make the round void: ${JSON.stringify(auditErrors)}`
    );
  }

  const perFileFindings = perFile.map((result) => highMedium(result));
  const crossFindings = highMedium(reconcile);
  const perFileFixJobs = [];
  for (let index = 0; index < affectedFiles.length; index += 1) {
    if (perFileFindings[index].length === 0) continue;
    const file = affectedFiles[index];
    perFileFixJobs.push({
      file,
      ownerTaskId: taskIdFor(file),
      run: () =>
        agent(perFileFixPrompt(file, iteration, perFileFindings[index]), {
          label: `fix:${taskIdFor(file)}:${iteration}`,
          phase: phaseName,
          schema: FIX_SCHEMA,
        }),
    });
  }

  let perFileFixed = [];
  if (perFileFixJobs.length > 0) {
    for (const job of perFileFixJobs) {
      const before = await snapshotWorktree();
      const result = validateFixResults(
        `round-${iteration}-per-file-fix:${job.ownerTaskId}`,
        [job.ownerTaskId],
        [await job.run()]
      )[0];
      await validateMutationBatch(
        before,
        [result],
        [taskRepoPath(job.file)],
        `round-${iteration}-per-file-fix:${job.ownerTaskId}`,
        [taskRepoPath(job.file)]
      );
      perFileFixed.push(result);
    }
    await validateExactTaskGraphFiles();
  }

  let crossFixed = [];
  if (crossFindings.length > 0) {
    const crossBefore = await snapshotWorktree();
    crossFixed = validateFixResults(
      `round-${iteration}-cross-fix`,
      ["TASK-551"],
      await parallel([
        () =>
          agent(crossFixPrompt(iteration, crossFindings), {
            label: `fix:reconcile:${iteration}`,
            phase: phaseName,
            schema: FIX_SCHEMA,
          }),
      ])
    );
    await validateMutationBatch(
      crossBefore,
      crossFixed,
      TASK_FILES.map(taskRepoPath),
      `round-${iteration}-cross-fix`
    );
    await validateExactTaskGraphFiles();
  }

  // Also validate rounds with no fixer jobs, and revalidate after both batches.
  await validateExactTaskGraphFiles();

  const findingCounts = countFindings([...perFile, reconcile]);
  roundEvidence.push({
    schema: "coderso.task551.audit-round@v1",
    round: iteration,
    scope: iteration === 0 ? "complete" : "affected",
    expectedPerFile: affectedFiles.length,
    returnedPerFile: perFile.length,
    reconcileReturned: true,
    findingCounts,
    fixerResults: [...perFileFixed, ...crossFixed].map(
      ({ ownerTaskId, pass, changedPaths, errors }) => ({
        ownerTaskId,
        pass,
        changedPaths,
        errors,
      })
    ),
    pass:
      findingCounts.high === 0 &&
      findingCounts.medium === 0 &&
      perFile.every((result) => result.errors.length === 0) &&
      reconcile.errors.length === 0,
  });

  roundPass =
    findingCounts.high === 0 &&
    findingCounts.medium === 0 &&
    perFile.every((result) => result.errors.length === 0) &&
    reconcile.errors.length === 0;

  const changedByFixers = [...perFileFixed, ...crossFixed].flatMap(
    (result) => result.changedPaths ?? []
  );
  const rejectedFiles = [];
  for (let index = 0; index < perFileFixJobs.length; index += 1) {
    if (
      perFileFixJobs[index] &&
      !changedByFixers.includes(taskRepoPath(perFileFixJobs[index].file))
    ) {
      rejectedFiles.push(perFileFixJobs[index].file);
    }
  }
  if (!roundPass && changedByFixers.length === 0 && rejectedFiles.length === 0) {
    throw new Error(
      `round-${iteration}: unresolved HIGH/MEDIUM findings with zero fixer changes: ` +
        JSON.stringify({ perFileFindings, crossFindings })
    );
  }
  affectedFiles = TASK_FILES.filter(
    (file) => changedByFixers.includes(taskRepoPath(file)) || rejectedFiles.includes(file)
  );
  if (affectedFiles.length === 0) {
    affectedFiles = TASK_FILES;
  }
}

phase("Final reconcile");
if (roundEvidence.length < 1) {
  throw new Error("round-evidence: at least one complete drift round is required");
}
const lastRound = roundEvidence[roundEvidence.length - 1];
if (!lastRound.pass) {
  throw new Error(
    "round-evidence: the terminal drift round must pass: " +
      JSON.stringify({ lastRound, nonPassing: roundEvidence.filter((e) => !e.pass).length })
  );
}
await validateExactTaskGraphFiles();
const finalResult = requireAllResults(
  "final-reconcile",
  1,
  await parallel([
    () =>
      agent(
        `${reconcilePrompt("final")} This is a fresh pass after all task mutations. Verify every
expected file exists, the graph is exactly 38 files, all round records are complete, and
there are zero findings of any severity and zero errors.`,
        {
          label: "audit:final-reconcile",
          phase: "Final reconcile",
          schema: AUDIT_SCHEMA,
        }
      ),
  ])
)[0];
validateAuditResult("final-reconcile", finalResult, { final: true });

if (!finalResult.pass || finalResult.findings.length > 0 || finalResult.errors.length > 0) {
  throw new Error(
    "TASK-551 final reconcile did not pass: " +
      JSON.stringify({ findings: finalResult.findings, errors: finalResult.errors })
  );
}

log(
  JSON.stringify({
    schema: "coderso.task551.author-audit@v1",
    pass: true,
    tree: TREE,
    expectedFiles: TASK_FILES.length,
    changelog: CHANGELOG,
    landOrder: LAND_ORDER,
    rounds: roundEvidence,
    finalReconcile: finalResult,
    errors: [],
  })
);
