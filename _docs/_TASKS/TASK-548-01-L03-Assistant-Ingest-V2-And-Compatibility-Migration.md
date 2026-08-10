# TASK-548-01-L03: Assistant Ingest V2 and Compatibility Migration
# FileName: TASK-548-01-L03-Assistant-Ingest-V2-And-Compatibility-Migration.md

**Parent Subtask:** TASK-548-01
**Priority:** Critical
**Category:** Assistant / Database / Migration / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-01-L02; the complete terminal TASK-551 family
(parent `✅ Done`, every physical descendant terminal, board/changelog
synchronized, changelog 1263 present and valid) with the exact serialized
handoff exports present: TASK-551-02-L02's dedicated-session API
(`withDedicatedDatabaseSession`,
`withDedicatedDatabaseAdvisoryLock`,
`assertDedicatedDatabaseSessionBudget`), TASK-551-04-L02's
`docsDbRetriever.ts`/`assistantDocsCandidateQuery.ts` successor handoff, and
TASK-551-05-L01's byte-for-byte
`SEARCH_VECTOR_SQL.assistantDocs`/`SEARCH_VECTOR_SQL.assistantDocChunks`
expressions. The current-state derivation through the TASK-548-08 dispatch
gate's `deriveAndVerifyTask551CurrentTerminalStateV1` (no expected-HEAD
receipt and no unique historical commit/hash authority) is a dispatch gate
described in TASK-548-08's Complete Terminal TASK-551 Family Gate section, not
a task edge.
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Switch the existing DB-only assistant reindex from runtime Markdown parsing to
the packaged `DocsDistributionBundleV2`. Persist stable identity,
locale/version/route/permission and
capability/visual/example references in a separate cohesive V2 table set
(`core/db/tables/assistantDocsV2.ts`), then atomically replace one complete
corpus snapshot. The legacy `assistant_docs`/`assistant_doc_chunks` tables,
their current generated vectors/indexes, unique `source_path`, legacy ingest
runs, legacy reads and `ON CONFLICT(source_path)` remain byte/DDL-compatible
and are never enriched in place. Persist the bundle's separate
atomic-control/composed-workflow
relation against that same snapshot so Guide can resolve both directions
without a second corpus or API. Binary assets remain packaged files and are never stored in
PostgreSQL.

Preserve existing assistant readiness, retrieval and support behavior during the
migration. The v1 database rows remain readable until the first successful v2
reindex; a failed migration/reindex must leave the prior complete corpus
available. Do not add a runtime filesystem fallback, external docs request or
new API route.

Production owns the exact loader
`loadPackagedDocsDistributionBundleV2(): Promise<DocsDistributionBundleV2>`.
L03-owned build/server-only `packages/docs-contracts/src/nodeLoader.ts` is an
exact named alias of L02's package-private atomic function; L01 excludes it and
TASK-548-02-L02 later exports it only as
`@coderso/docs-contracts/node-loader`. L02 already owns the permanent Core named
alias `core/services/documentation/packagedDocsDistributionBundleV2.ts` through
the confined repo-relative preactivation edge. Both entries expose the same
function reference and are zero-input; no capability, URL/path/options, environment or
`process.cwd()` participates. `nodeLoader.ts` aliases L02's package-private
zero-input `guardAndLoadFixedDocsWorkspaceBundleV2(): Promise<DocsDistributionBundleV2>`
without a wrapper or second read. That
transaction derives all fixed URLs from its own module, holds the exact bundle
handle across full journal/temp/backup inventory, strict optional migration-
report/sourceHash/artifact linkage, bounded same-handle read/normalization and
final rescan, then closes in reverse. Thus there is no guard→load replacement
window or second production byte-loader seam. Persistence and Help/portal
projections independently re-normalize the returned object. Explicit tools own
workspace-pair recovery through
`recoverDocsWorkspaceArtifactPromotionV1()` or `bun run docs:recover`.
Compiler checks call the same atomic loader once; write/recovery tools alone use
L02's separate inspector/recovery APIs. Production startup/reindex never call them.
The package-private owner validates its derived exact lexical app-root child,
then performs an inode-held no-follow walk from the filesystem
root through every parent component and the final file. Each directory handle
stays open while its child is opened relative to that handle; every hop uses
`O_NOFOLLOW`, directory hops also use `O_DIRECTORY`, and the final regular-file
handle is the only handle used for the bounded read. On the supported Linux
Node/Bun runtime, the narrow adapter uses `/proc/self/fd/<parent-fd>/<component>`
as the held-directory capability path, accepts one prevalidated path component
only, and fails closed if that facility is unavailable; it never falls back to
an ordinary pathname walk. Before/after `fstat` checks cover the held parent
handles and final handle, which close in reverse order. There is no
`lstat`/`realpath`/validate-then-reopen sequence. A missing, linked, replaced,
non-regular, concurrently mutated or differently cased component maps to
`assistant_docs_bundle_invalid` without fallback.
The loader boundary is import-time side-effect-free and Node+Bun compatible:
the private owner imports exact `node:fs`/`node:fs/promises` plus Bun-free
contracts, while the public loader imports only that owner. It contains zero
`Bun.*`, DB, settings, server, Core or assistant-runtime coupling. This permits the same source in
`core/vite.config.ts` and the portal server build; neither receives a copy.
Static graph tests reject this Node subpath from browser/client entries. This
leaf owns only its public alias source, not L02's Core shim or later manifest wiring.

## Storage Contract

At implementation start allocate the next free migration number after reading
`core/db/migrations/meta/_journal.json`; do not preselect `0070` because other
streams may land first. Ship the SQL file, matching `meta/*_snapshot.json` and
`meta/_journal.json` entry together.

The V2 storage is a separate cohesive table set that never shares or mutates
the legacy V1 tables. `assistant_docs`, `assistant_doc_chunks`, their current
generated vectors/indexes, unique `source_path`, legacy ingest runs, legacy
reads and `ON CONFLICT(source_path)` remain byte/DDL-compatible; no V2 column,
predicate, generated vector or index is ever added to them. The next-free
migration ships one cohesive new schema module
`core/db/tables/assistantDocsV2.ts` (re-exported by the existing thin
`core/db/schema.ts` facade; no second `core/db/schema/` hierarchy) with the
exact tables below. V2 ingest, backfill and search touch only these V2 tables;
old binaries can never see V2 rows because the legacy symbols read only the
frozen V1 tables.

- `assistant_docs_v2_snapshots` — one immutable V2 snapshot identity per row.
  PK `snapshot_id uuid default gen_random_uuid()`, `generation bigint not
  null` allocated from the dedicated PostgreSQL sequence
  `assistant_docs_v2_snapshot_generation_seq` (`nextval`, never `max+1` and
  never "prior active + 1"), `source_hash text not null`, `corpus_version text
  not null`, `lifecycle text not null CHECK (lifecycle IN ('building',
  'prepared','active','inactive'))`, `canonical_persisted_bytes bigint not
  null`,
  `created_at timestamptz not null default now()`, `activated_at timestamptz`,
  `deactivated_at timestamptz`, plus the immutable provenance FK
  `producer_run_id uuid not null` →
  `assistant_docs_v2_ingest_runs(run_id)` (`ON DELETE RESTRICT`, never
  deferrable): the exact producing run that persisted this snapshot (the
  terminal `cutover_backfill` run for the backfill-created
  building/prepared snapshot; the `activated` run for a post-fence new active
  snapshot). The snapshot stores its producer exactly once and never changes
  it. The FK graph is ACYCLIC: ingest runs are standalone parent rows and
  carry NO `snapshot_id` column and NO `snapshot_producer_run_id`
  self-reference — runs never FK to snapshots. The run ↔ snapshot linkage and
  the exact outcome/changed live in the separate
  `assistant_docs_v2_ingest_run_results` table (see below), so there is no
  `DEFERRABLE INITIALLY DEFERRED` constraint, no insert-order dance, no
  self-reference and no fake Drizzle claim. Exact lifecycle
  CHECKs
  `assistant_docs_v2_snapshots_deactivated_chk CHECK ((deactivated_at IS NOT NULL) = (lifecycle = 'inactive'))`
  and
  `assistant_docs_v2_snapshots_activated_chk CHECK (lifecycle <> 'active' OR activated_at IS NOT NULL)` —
  `deactivated_at` is set exactly when a former building/prepared/active
  snapshot is demoted to `inactive`, and it is the only retention eligibility
  clock for inactive snapshots (see the retention policy below).
  Three global constant-expression partial unique indexes enforce exactly one
  building, one prepared and one active V2 snapshot installation-wide:
  `assistant_docs_v2_snapshots_building_once_key ON assistant_docs_v2_snapshots
  ((true)) WHERE lifecycle = 'building'`,
  `assistant_docs_v2_snapshots_prepared_once_key ON assistant_docs_v2_snapshots
  ((true)) WHERE lifecycle = 'prepared'` and
  `assistant_docs_v2_snapshots_active_once_key ... ((true)) WHERE lifecycle =
  'active'`. `building` = the resumable backfill is mid-flight: the sole
  `cutover_backfill` run committed this snapshot row FIRST (under the ingest
  advisory lock) and its bounded child batches are still writing; `building`
  is created ONLY by the cutover backfill command (the sole preactivation
  producer), counts toward the installation capacity exactly like every other
  retained lifecycle state, and is never served by any consumer; `prepared` =
  fence not passed, backfill closure reached: immutable until activation,
  retirement or rollback; `active` = the single active-pointer
  target;
  `inactive` = deactivated former prepared/active snapshots (retained
  for the retention window, then eligible for pruning); a `building` snapshot
  is NEVER converted to `inactive` — every incomplete-building disposal
  (explicit backfill abort, the destructive legacy-resume transition, or the
  source-drift reset) atomically CASes the pending `cutover_backfill` run to
  `failed`, DELETES the building cohort (children/run-result rows cascade) and
  frees the pending run slot/snapshot-byte capacity in the same transaction,
  and NEVER updates the pointer's `legacy_acl_snapshot_id` (an explicit abort
  deletes only the never-bound cohort — an initial abort leaves NULL and a
  replacement abort retains the prior valid binding; the source-drift reset
  retains the old binding; ONLY the destructive legacy-resume transition
  clears the binding — see the backfill paragraph and the fence rows). Exact lifecycle
  transitions:
  none → `building` pre-fence (backfill command only); `building` → `prepared`
  in the backfill closure transaction; `building` → DELETED (cohort cascade)
  on every incomplete-building disposal — never `inactive`; `prepared` → `inactive`
  when atomically superseded by a new pre-fence backfill or retired by the
  source-drift reset; `prepared` → `active` during cutover
  activation; post-fence replacement activation demotes the prior `active` →
  `inactive` (with `deactivated_at` set) FIRST and only then inserts the new
  `none` → `active` row in the same transaction (one-active ordering: a second
  active row is never inserted before the demotion); `active` → `inactive` on
  replacement or rollback.
  A new pre-fence backfill atomically retires the prior prepared snapshot
  (`prepared` → `inactive`) before creating its own building row. Pointer,
  lifecycle,
  activation-event and
  run finalization always commit in one transaction, so the status read model
  exposes exactly zero or one building/prepared snapshot.
- `assistant_docs_v2_documents` — PK `id bigint generated always as identity`,
  FK `snapshot_id` → `assistant_docs_v2_snapshots(snapshot_id)`
  (`ON DELETE CASCADE`), exact
  `(doc_id, locale)` per snapshot with unique
  `assistant_docs_v2_documents_snapshot_doc_locale_key (snapshot_id, doc_id,
  locale)`, plus stable `slug`, BCP-47 `locale`, `corpus_version`,
  `product_version_range text not null` (the canonical source string, kept for
  display/round-trip only) plus the six derived integer bound columns
  `product_version_lower_major`, `product_version_lower_minor`,
  `product_version_lower_patch` (inclusive lower) and
  `product_version_upper_major`, `product_version_upper_minor`,
  `product_version_upper_patch` (exclusive upper) — each
  `int not null CHECK (product_version_* BETWEEN 0 AND 2147483647)` with the
  exact lexicographic lower < upper tuple CHECK (see the exact
  product-version range persistence and filtering section below),
  `keywords_json jsonb not null` (the normalized unique UTF-8 byte-order
  sorted keyword array, persisted so the imported
  `SEARCH_VECTOR_SQL.assistantDocs` expression resolves byte-for-byte on the
  V2 table; a document with zero keywords stores the exact empty JSON array
  `'[]'::jsonb`), nullable canonical `admin_path`, exact
  `authorization_disposition text CHECK (authorization_disposition IN
  ('eligible','deny_all'))`, exact nullable `permission_requirement jsonb`,
  bounded `capability_ids jsonb`, `publication_targets jsonb`, `source_path
  text not null`, canonical `document_sha256` and existing title/summary/
  audience/product-area columns;
- `assistant_docs_v2_sections` — FK `snapshot_id` (`ON DELETE CASCADE`), unique
  `(snapshot_id, doc_id, locale, section_id)`, stable `section_id`,
  `heading`, `level smallint CHECK (level BETWEEN 1 AND 4)`, `plain_text`;
- `assistant_docs_v2_chunks` — FK `snapshot_id` (`ON DELETE CASCADE`), unique
  `(snapshot_id, doc_id, locale, section_id, chunk_index)`, deterministic
  `chunk_index`, stable deterministic `chunk_id text not null` (derived from
  the exact `(snapshot_id, doc_id, locale, section_id, chunk_index)` identity;
  never raw path bytes), `heading_path text[] not null` (the bounded ORDERED
  heading chain of the owning sections, e.g.
  `ARRAY['Setup','Accounts']` — a bounded `text[]`/`string[]` array exactly,
  NEVER a scalar string; bounded by an exact immutable table CHECK,
  `array_length` between `0` and `8` and every element at most `256` UTF-8
  bytes; the persisted array projects element-for-element byte-for-byte to the
  evidence `headingPath: readonly string[]` and to the composer's
  array-shaped `DocsChunk.headingPath`), `heading`, `content`,
  `line_start`, `line_end`,
  `normalized_text`, `token_count` plus the bounded exact `token_counts jsonb`
  per-lexeme count record (both persisted; `token_counts` is MANDATORY and
  bounded for every V2 chunk row — no nullable/default fallback and no
  derive-at-read repair; see the evidence record below),
  `evidence_search_text` (non-null only on
  `chunk_index = 0`, empty on later chunks, 16 KiB UTF-8 per-section cap),
  and ONE stored generated chunk vector `search_vector` whose SQL is exactly
  the imported TASK-551 `SEARCH_VECTOR_SQL.assistantDocChunks` heading/content
  expression PLUS the single additive evidence weight term below, with one V2
  GIN index `assistant_docs_v2_chunks_search_vector_idx`. The previously
  drafted unused separate legacy-chunk V2 column/index
  (`search_vector` + `search_vector_v2`) is REMOVED from this handoff: the V2
  chunk table has exactly one generated vector and one production GIN index.
  The document vector
  lives on `assistant_docs_v2_documents.search_vector` using the exact
  imported `SEARCH_VECTOR_SQL.assistantDocs` expression with index
  `assistant_docs_v2_documents_search_vector_idx`. TASK-551 vector
  EXPRESSIONS are imported from their exact owners byte-for-byte; only the V2
  column/index names are distinct and the additive evidence term is the ONLY
  TASK-548-owned delta;
- `assistant_docs_v2_visuals` — FK `snapshot_id` (`ON DELETE CASCADE`),
  unique `(snapshot_id,
  visual_id)`, exact localized owner `(doc_id, locale, section_id)`, confined
  `asset_path`, `media_type` (`image/png` only), `sha256`, `width`, `height`,
  `alt`, `caption`, bounded `scenario_step_search_text jsonb` (compiler-derived
  projection only);
- `assistant_docs_v2_examples` — FK `snapshot_id` (`ON DELETE CASCADE`),
  unique `(snapshot_id,
  example_id)`, exact localized owner, `title`, `language` (closed
  `json|typescript|bash|text`), `body`, `explanation`;
- `assistant_docs_v2_capability_relations` and
  `assistant_docs_v2_capability_relation_members` — FK `snapshot_id`
  (`ON DELETE CASCADE`);
  relations carry `relation_id`, `relation_kind` (`atomic|workflow`),
  `product_area_capability_id`, `expected_outcome` and ordered atom membership;
  members carry `member_kind` (`atomic|workflow|section`), `member_id`,
  `position` and the exact localized `(doc_id, locale, section_id)` binding.
  Relational lookup rows/indexes support atom → workflows and workflow →
  ordered atoms; every row binds the same snapshot identity/source hash and no
  relation stores an href, prose, permission grant, or publication override;
- `assistant_docs_v2_ingest_runs` — standalone parent row: PK `run_id uuid
  default gen_random_uuid()`, NO `snapshot_id` column and NO
  `snapshot_producer_run_id` self-reference — runs never FK to snapshots
  (acyclic model; the run ↔ snapshot linkage lives in
  `assistant_docs_v2_ingest_run_results` below),
  `request_kind text not null CHECK (request_kind IN
  ('startup','manual','cutover_backfill'))` — the exact request source,
  `result_kind text CHECK (result_kind IN ('prepared','unchanged','activated'))`
  — the exact persisted ingest-result union member kind for successful
  terminal runs, bundle
  `source_hash text not null`, `corpus_version`, nullable `actor_id`, exact
  status enum
  `status text not null CHECK (status IN ('pending','prepared','unchanged','activated','failed'))`,
  nullable `changed boolean` — the exact literal `changed` flag of the
  committed result — `requested_at timestamptz not null` (request timing) and
  nullable
  `terminal_at timestamptz`. The row additionally stores the exact request
  identity fields needed for reconciliation and committed-result
  reconstruction: `force boolean not null`, `source_hash text not null`,
  `requested_at timestamptz not null` and `actor_id` — the exact inputs
  the rolling-hour `force:true` same-hash cooldown queries (`force = true AND
  source_hash = <bundle hash> AND requested_at > now() - interval '1 hour'`).
  ONE explicit SQL truth-table CHECK replaces every boolean equivalence and
  pins the complete `(status × terminal_at × result_kind × changed)` matrix so
  reconciliation can reconstruct the strict `AssistantDocsIngestResultV2`
  member exactly:
  `assistant_docs_v2_ingest_runs_status_matrix_chk CHECK (
    (status = 'pending' AND terminal_at IS NULL AND result_kind IS NULL AND changed IS NULL)
    OR (status = 'failed' AND terminal_at IS NOT NULL AND result_kind IS NULL AND changed IS NULL)
    OR (status = 'prepared' AND terminal_at IS NOT NULL AND result_kind = 'prepared' AND changed IS NOT NULL)
    OR (status = 'unchanged' AND terminal_at IS NOT NULL AND result_kind = 'unchanged' AND changed = false)
    OR (status = 'activated' AND terminal_at IS NOT NULL AND result_kind = 'activated' AND changed = true))`
  — `pending` always has `terminal_at`/`result_kind`/`changed` NULL; `failed`
  is terminal with `result_kind`/`changed` NULL; `prepared` is terminal and
  accepts `changed` true or false; `unchanged` is terminal with
  `changed = false`; `activated` is terminal with `changed = true`. Valid/
  invalid row fixtures pin every status exactly once (invalid: `pending` with
  any terminal/result/changed value, `failed` with a `result_kind` or
  `changed`, `prepared` with `result_kind <> 'prepared'` or `changed` NULL,
  `unchanged` with `changed` true or a missing `result_kind`, `activated` with
  `changed` false or a missing `result_kind`, and any `terminal_at` NULL row
  with a non-pending status).
  Resumable backfill state lives on the run: nullable `backfill_cursor text`
  (bounded opaque stable keyset cursor), nullable `backfill_progress jsonb`
  (bounded durable progress record `{ batchesCommitted, rowsCopied,
  childrenComplete }`) and nullable `backfill_plan_sha256 text` (lowercase
  64-hex digest of the exact frozen-V1→V2 plan), all bound by the exact
  all-or-none CHECK
  `assistant_docs_v2_ingest_runs_backfill_state_chk CHECK (
  ((backfill_cursor IS NULL) = (backfill_progress IS NULL)) AND
  ((backfill_cursor IS NULL) = (backfill_plan_sha256 IS NULL)) AND
  ((request_kind <> 'cutover_backfill') = (backfill_cursor IS NULL)))`
  (the three columns are all NULL or all set together, and only
  `cutover_backfill` runs carry backfill state — a `cutover_backfill` run
  carries all three from its durable start checkpoint onward). The exact
  `(status, result_kind, changed, run_result.snapshot_id, request_kind,
  request identity)` tuple — with `run_result.snapshot_id` joined from
  `assistant_docs_v2_ingest_run_results` — is what
  reconciliation reconstructs and what retention pins reference.
  `prepared` is a TERMINAL run state: a pre-fence run finalizes exactly once
  as `prepared` and is never transitioned, re-finalized or promoted again —
  activation records a separate
  `assistant_docs_v2_activation_events` row instead (see below). A named
  partial unique index
  `assistant_docs_v2_ingest_runs_pending_once_key ((true)) WHERE
  status = 'pending'` permits at most one installation-wide ingest run with
  `status = 'pending'`; allocation maps its constraint race to the existing
  reconciliation path, never a second run;
- `assistant_docs_v2_ingest_run_results` — the ACYCLIC run ↔ snapshot
  linkage: PK `result_id uuid default gen_random_uuid()`, non-null FK
  `run_id` → `assistant_docs_v2_ingest_runs(run_id)` (`ON DELETE CASCADE`),
  non-null FK `snapshot_id` → `assistant_docs_v2_snapshots(snapshot_id)`
  (`ON DELETE CASCADE`), exact `result_kind text not null CHECK (result_kind
  IN ('prepared','unchanged','activated'))`, exact `changed boolean not null`,
  `created_at timestamptz not null default now()`, unique
  `assistant_docs_v2_ingest_run_results_run_once_key (run_id)` (one result row
  per run). The result row stores the exact outcome/changed of the committed
  run and is written in the SAME transaction as the terminal run write and the
  snapshot lifecycle transition; it is the ONLY run → snapshot reference.
  Ordinary expired reuse/failed runs delete together with their result rows
  (CASCADE); a retained snapshot's producer run is pinned by
  `snapshots.producer_run_id` (`ON DELETE RESTRICT`) until that snapshot is
  deleted;
- `assistant_docs_v2_legacy_acl` — the V2-owned authorization map over the
  frozen V1 corpus (see the era-aware facade section): PK `acl_id bigint
  generated always as identity`, non-null FK `snapshot_id` →
  `assistant_docs_v2_snapshots(snapshot_id)` (`ON DELETE CASCADE`), non-null
  `source_path text` (exact frozen V1 `assistant_docs.source_path`), exact
  `authorization_disposition text CHECK (authorization_disposition IN
  ('eligible','deny_all'))`, nullable `permission_requirement jsonb`,
  `publication_targets jsonb`, `capability_ids jsonb`, exact canonical
  `doc_id text not null` and BCP-47 `locale text not null` (the stable
  translation-family identity and canonical locale of the owning localized
  document), plus the six normalized inclusive-lower/exclusive-upper SemVer
  bound integers `product_version_lower_major/minor/patch` and
  `product_version_upper_major/minor/patch` (each
  `int not null CHECK (product_version_* BETWEEN 0 AND 2147483647)`) with the
  exact lexicographic lower < upper CHECK
  `assistant_docs_v2_legacy_acl_version_range_chk CHECK (
  (product_version_lower_major, product_version_lower_minor, product_version_lower_patch)
  < (product_version_upper_major, product_version_upper_minor, product_version_upper_patch))`,
  unique
  `assistant_docs_v2_legacy_acl_snapshot_path_key (snapshot_id, source_path)`.
  The ACL is populated and then CLOSED during the immutable backfill from the
  strict legacy context catalog (one row per frozen V1 `source_path`, derived
  by the same reviewed exact source-path map that classifies the V2 snapshot —
  the canonical `doc_id`, `locale` and the six bound integers come from the
  exact legacy catalog/bundle mapping for that source path, never guessed or
  parsed in SQL;
  the ACL exists for ACL classification only — it is never a V2 content
   source); it receives NO writes after backfill closure, survives activation
   and the `v2_activated → v1_frozen`
   rollback row (its owning snapshot is demoted, never deleted), and is
   deleted only with its snapshot row (CASCADE) — the active pointer's
   `legacy_acl_snapshot_id` names the snapshot owning the closed ACL, so a
   delete while bound fails on the pointer's `ON DELETE RESTRICT` FK and the
   V1-era facade joins exactly that snapshot (never a stale or mixed ACL);
   the V1-era facade SQL joins the frozen V1 rows to this ACL on
   `source_path` and then filters the ACL row's exact canonical `locale` plus
   the parameterized lexicographic product-version tuple predicates against
   its six bound columns BEFORE title/body projection and `LIMIT`, so the
   frozen legacy corpus is served with the same executable
   locale/version semantics as V2 (the legacy V1 rows themselves carry no
   locale/version columns);
   the destructive legacy-resume transition to `v1_active` clears the binding
   explicitly (Guide unavailable until a fresh freeze + backfill recreates
   it);
- `assistant_docs_v2_activation_events` — exact append-only activation audit
  table: PK `event_id uuid default gen_random_uuid()`, non-null FK
  `snapshot_id` → `assistant_docs_v2_snapshots(snapshot_id)` (`ON DELETE
  RESTRICT`; the promoted prepared snapshot), non-null FK `run_id` →
  `assistant_docs_v2_ingest_runs(run_id)` (`ON DELETE RESTRICT`) — the exact
  PRODUCING run named by that snapshot's immutable
  `assistant_docs_v2_snapshots.producer_run_id` (the terminal
  `cutover_backfill` run for the cutover activation — it stays terminal as
  `prepared` and is never transitioned again; the run finalized `activated`
  for a replacement activation), so every event links snapshot AND exact
  producer run, `event_kind text not null CHECK (event_kind IN
  ('cutover_activation','replacement_activation'))`, nullable
  `previous_v2_snapshot_id` (the demoted predecessor, NULL for the cutover
  activation), and `event_at timestamptz not null default now()`. Cutover
  activation atomically inserts its `cutover_activation` event in the same
  transaction as the snapshot `prepared → active` promotion, the active
  pointer switch and the cutover CAS; ordinary post-fence activations insert
  `replacement_activation` in the same transaction as demotion + new-row
  insertion + pointer/predecessor update + run finalization. Events are audit
  rows only: they never participate in authorization, are never referenced by
  reconciliation, are never pinned, and are pruned by the bounded 30-day
  retention window (from `event_at`) under the retention policy below —
  while an event is unexpired it pins its `run_id` (see the retention-pin
  rules below), and the explicit `ON DELETE RESTRICT` FKs on the event's
  `snapshot_id`/`run_id` make the exact cohort prune order (expired events →
  snapshot with all children and run-result rows cascading → now-unreferenced
  producer run) the only legal delete path, never an
  orphaning delete. This
  leaf owns the table, its migration artifacts, the event insert helpers and
  the audit fixtures in `tests/integration/server/assistantDocsIngestV2.test.ts`;
- `assistant_docs_v2_active_pointer` — one single-row active pointer: PK
  `id bigint CHECK (id = 1)`, `era text not null CHECK (era IN ('v1','v2'))`,
  nullable `snapshot_id` FK to `assistant_docs_v2_snapshots`, `generation
  bigint not null`, nullable `previous_v2_snapshot_id` FK to
  `assistant_docs_v2_snapshots(snapshot_id)` (the exact immediate predecessor
  of the current active V2 snapshot; independently nullable — no CHECK ties it
  to `era` — it is NULL in `era = 'v1'` and for the first
  V2 activation), nullable   `legacy_acl_snapshot_id` FK to
  `assistant_docs_v2_snapshots(snapshot_id)` (`ON DELETE RESTRICT`, never
  deferrable) — the durable binding naming the snapshot that owns the CLOSED
  `assistant_docs_v2_legacy_acl` the era-aware facade MUST join in the V1 era
  (NULL before the first backfill final transaction, after an initial
  backfill abort (the never-bound initial cohort is deleted and NULL stays
  NULL), or after the destructive legacy-resume
  transition cleared it; the V1 facade joins exactly this ACL
  snapshot, so an unbound pointer authorizes zero V1 rows rather than a stale
  or mixed ACL): the cutover backfill's durable start transaction NEVER
  binds/rebinds it — an initial backfill with no prior binding leaves it NULL
  (so the initial backfill stays not-ready while its cohort is assembled) and
  a source-drift REPLACEMENT backfill retains/pins the old valid ACL binding
  while the new building cohort/ACL is assembled; only the backfill's FINAL
  `building → prepared` transaction atomically binds (initial) or rebinds
  (replacement) it to the new complete closed-ACL prepared snapshot;
  activation, replacement activations, the `v2_activated → v1_frozen` rollback
  row and the source-drift
  reset PRESERVE it (the ACL survives so the facade keeps serving the frozen
  V1 corpus on both sides of the pointer switch and through preactivation
  rollback); explicit abort leaves any retained prior binding UNTOUCHED (an
  initial abort leaves NULL) — the never-bound building cohort is never named
  by the pointer; the
  destructive legacy-resume transition to `v1_active` clears it too (Guide is
  then unavailable until a fresh freeze + backfill recreates the binding);
  it
  is cleared only by those two explicit paths — no automatic path releases
  it, and while it names a snapshot
  that snapshot is retention-pinned (see the retention policy), nullable scalar `legacy_frozen_source_hash text` and
  `legacy_frozen_at timestamptz` (named V1 freeze metadata stored OUTSIDE
  `snapshot`; never a V2 identity; written only as a pair — both NULL or both
  non-NULL — for example by the freeze transition when it records the frozen
  V1 hash, and cleared together by activation; the
  `v2_activated → v1_frozen` rollback re-records the pair because the frozen
  V1 corpus remains immutable and safely readable, while the destructive
  legacy-resume transition to `v1_active` clears it), `updated_at
  timestamptz not null`, with the exact per-era cross-field CHECKs:
  `assistant_docs_v2_active_pointer_era_chk CHECK ((era = 'v1' AND snapshot_id IS NULL) OR (era = 'v2' AND snapshot_id IS NOT NULL))`
  so `era = 'v1'` PERMANENTLY
  names the frozen legacy pointer with `snapshot_id` NULL (never any V2 row)
  and `era = 'v2'` always names one real
  active V2 snapshot, plus
  `assistant_docs_v2_active_pointer_legacy_meta_chk CHECK ((era = 'v1' AND (legacy_frozen_source_hash IS NULL) = (legacy_frozen_at IS NULL)) OR (era = 'v2' AND legacy_frozen_source_hash IS NULL AND legacy_frozen_at IS NULL))`.
  Valid-invalid insert fixtures pin the matrix: valid `v1` with both legacy
  fields NULL, valid `v1` with both legacy fields set, valid `v2` with a
  non-null `snapshot_id` and both legacy fields NULL; invalid `v1` with a
  non-null `snapshot_id`, invalid `v2` with `snapshot_id` NULL, and invalid
  split legacy pairs (`legacy_frozen_source_hash` set with
  `legacy_frozen_at` NULL and vice versa, in either era) all fail closed.
  The initial row is `era = 'v1'`, `snapshot_id` NULL,
  `previous_v2_snapshot_id` NULL, `legacy_acl_snapshot_id` NULL, both legacy
  fields NULL; the explicit
  `v2_activated → v1_frozen` rollback row restores the frozen V1 pointer shape
  (`era = 'v1'`, `snapshot_id` NULL, `previous_v2_snapshot_id` cleared, the
  legacy scalar metadata pair re-recorded — the V1 corpus stays frozen)
  while PRESERVING `legacy_acl_snapshot_id`,
  so every rollback fixture ends byte-valid
  under both CHECKs with the ACL binding intact; the destructive legacy-resume
  transition to `v1_active` restores the initial both-legacy-NULL shape but
  clears the ACL binding, so it is never a normal rollback.
  Pointer/lifecycle/run finalization update this row
  atomically with the snapshot `lifecycle` transition and the terminal run
  row; activation, replacement and rollback update
  `previous_v2_snapshot_id` atomically in that same transaction, and
  `legacy_acl_snapshot_id` is written only by the backfill's FINAL
  `building → prepared` transaction (the atomic bind on an initial backfill or
  rebind on a source-drift replacement), the abort transaction (never a clear
  of a retained binding: an initial abort leaves NULL and a replacement abort
  leaves the old binding untouched — the never-bound cohort is not named), or
  the destructive legacy-resume transition
  (clear);
- `assistant_docs_v2_cutover` — one single-row persisted fence (see the V2
  activation fence section for its exact columns: `revision`,
  `rollout_generation`, nullable `deployment_identity`, structured
  `consumers`, bounded `rollout_receipt` and evidence columns).

The cutover backfill command `bun scripts/docs/migrate-assistant-docs-v2.ts`
is the SOLE preactivation producer: it is the only code that creates or
replaces a building/prepared V2 snapshot before activation. It runs only after
the `v1_active → v1_frozen` freeze transition and under the same ingest advisory
lock; it loads the fixed packaged bundle exactly once (for the exact
`sourceHash`, corpus version and capability composition) and ALWAYS
materializes the V2 snapshot content — documents/sections/chunks/visuals/
examples/evidence/capability relation rows under the exact reviewed source-
path classification — from that one normalized bundle plus the exact in-memory
plan built from it. The immutable frozen V1 rows are used ONLY to build and
validate the legacy ACL classification (the strict legacy context catalog maps
frozen `source_path` → `authorization_disposition`/`permission_requirement`/
targets/capability IDs) and as the shadow-parity baseline; they are NEVER a V2
content source. A fresh installation with zero V1 rows therefore still
persists the exact bundle document/section/chunk/visual/example counts and
evidence closure, and the shadow comparison over zero legacy rows completes
immediately. Unknown,
unmapped and protected paths receive `authorization_disposition = 'deny_all'`
in the ACL/classification only.
The backfill is RESUMABLE: under the advisory lock the command first commits
ONE durable start transaction that inserts a `pending` run with
`request_kind = 'cutover_backfill'`, inserts the sole `building` snapshot
(`producer_run_id` = that run, through the acyclic RESTRICT FK), and populates
`assistant_docs_v2_legacy_acl` from the strict legacy context catalog (bounded
set-based rows derived from the same reviewed source-path map; the ACL is
closed — no further writes — once the backfill completes), WITHOUT touching
the active-pointer `legacy_acl_snapshot_id`: an initial backfill with no prior
binding leaves it NULL (so the initial backfill stays not-ready while its
cohort is assembled) and a source-drift REPLACEMENT backfill retains/pins the
old valid ACL binding while the new building cohort/ACL is assembled (a
concurrent replacement `building` snapshot never invalidates an existing
binding); only the backfill's FINAL `building → prepared` transaction
atomically binds (initial) or rebinds (replacement) the pointer to the new
complete closed-ACL prepared snapshot (see the active-pointer section). The same transaction
stores the bounded durable cursor/progress/plan/sourceHash on the run
(`backfill_cursor`, `backfill_progress`, `backfill_plan_sha256`; `source_hash`
is the run's own column). It then writes the child rows (documents/sections/
chunks/visuals/examples/capability relations) in SEPARATE bounded transactions
of at most 500 rows or 4 MiB each, every batch binding the exact
`backfill_plan_sha256` and `source_hash` on every inserted row (via the
snapshot identity and the run's stored plan/hash) and CAS-updating the run's
`backfill_progress`/`backfill_cursor`. A crash at any point resumes the SAME
run and SAME building snapshot: the next invocation re-reads the durable
cursor/progress under the advisory lock and continues from the last committed
batch (the pending partial-unique index and the global
`lifecycle = 'building'` constant-expression partial unique index keep exactly
one backfill run/snapshot). In its FINAL transaction the command verifies full
closure (final keyset with zero unclassified rows, every deny-all fixture,
referential/locale/evidence closure, the exact plan digest, AND
bundle-plan-persisted identity: the persisted document/chunk/evidence closure
must match the loaded bundle and in-memory plan exactly — a mismatch rejects
closure and never advances the fence) and atomically
transitions `building → prepared`, CAS-finalizes the run as terminal
`prepared` with `result_kind = 'prepared'`, `changed = true` and
`terminal_at` set, inserts the exact `assistant_docs_v2_ingest_run_results`
row (run, snapshot, `prepared`, `changed = true`), atomically binds (initial
backfill: NULL → the new prepared snapshot) or rebinds (source-drift
replacement: old binding → the new prepared snapshot) the active-pointer
`legacy_acl_snapshot_id` to that complete closed-ACL snapshot, and advances
the cutover
row `v1_frozen → backfill_complete` itself, returning the command receipt
`{ aborted: false, replayed: false, result: <the new prepared result> }`.
An explicit `--abort` (under the
same advisory lock) IMMEDIATELY DELETES the never-served building snapshot
cohort — the snapshot row and all its children/run-result rows cascade — in
one transaction, marks the standalone run `failed` with a bounded safe
diagnostic/cursor receipt (`terminal_at` set, the opaque
`backfill_cursor`/`backfill_progress` retained as the safe cursor receipt),
leaves any retained prior `legacy_acl_snapshot_id` binding UNTOUCHED (an
initial abort leaves NULL — the never-bound building cohort is never named by
the pointer, so abort never clears a binding it does not own),
and frees the snapshot/byte capacity ceilings in that SAME transaction, so a
fresh backfill may start; the aborted cohort is NEVER converted to a 30-day
inactive row, and abort is one of exactly three incomplete-building disposal
paths (with the destructive legacy-resume transition and the source-drift
reset) that delete a `building` snapshot with the same atomic disposal
shape. A
same-hash replay is a pure command receipt: when the fence is already at or
past `backfill_complete` and a complete prepared snapshot exists whose
producing `cutover_backfill` run has the same `source_hash` AND
`backfill_plan_sha256` as the currently loaded bundle/plan, the command
returns `{ aborted: false, replayed: true, result: <the ORIGINAL persisted
prepared result> }` — preserving the original `changed: true` — and creates
NO run, writes NO rows and performs NO state transition; the FIRST completion
returns `replayed: false`. The startup/manual ingest-service prepared reuse
(`changed: false`, a new `startup`/`manual` run row) is a separate path and
never describes the backfill command's replay. A
different-hash rerun (only after the explicit source-drift reset described in
the fence section) retires the prior prepared snapshot and replaces
it with a new terminal `cutover_backfill` run, building snapshot and ACL.
Startup and manual
reindex never produce a building/prepared snapshot at any preactivation state
(see the preactivation-producer rules below).
`assistant_docs_v2_documents` also stores the link inputs: the exact targets,
slug, locale, admin path and permission requirement needed to derive Help,
official and CMS actions without a bundle join; authors still cannot persist
arbitrary consumer URLs. PNG bytes remain packaged, but the DB keeps every
confined asset path/hash/dimension/alt/caption needed to project a grounded
visual card without reopening the corpus bundle.

### Exact product-version range persistence and filtering

TASK-548-01-L01 owns the ONE canonical range grammar
(`>=MAJOR.MINOR.PATCH <MAJOR.MINOR.PATCH`: ASCII decimal with no leading zeros
except single `0`, no prerelease/build metadata, no extra whitespace, lower <
upper) and its exact normalizer/parser owner with tests. This leaf persists on
`assistant_docs_v2_documents` the canonical source string
(`product_version_range text not null`, display/round-trip only) plus the six
derived integer bound columns — inclusive lower
`product_version_lower_major/minor/patch` and exclusive upper
`product_version_upper_major/minor/patch` — each
`int not null CHECK (product_version_* BETWEEN 0 AND 2147483647)` with the
exact lexicographic check
`assistant_docs_v2_documents_version_range_chk CHECK (
(product_version_lower_major, product_version_lower_minor, product_version_lower_patch)
< (product_version_upper_major, product_version_upper_minor, product_version_upper_patch))`.
Bounds are derived ONLY by L01's exact parser from the canonical string during
ingest normalization; a range that fails the grammar or overflows an int
column fails ingest before run allocation. The same six normalized bound
integers plus the exact canonical `doc_id`/`locale` are persisted per frozen
`source_path` on `assistant_docs_v2_legacy_acl` from the exact legacy
catalog/bundle mapping, so the era-aware facade's V1 branch applies the same
parameterized locale/version predicates against the joined ACL row (see the
legacy ACL table section). Statement 1 of Guide retrieval
parses `searchContext.productVersion` once into three bounded integers
(`major`, `minor`, `patch`; 0..2147483647, malformed/overflow fails closed as
`assistant_docs_search_context_invalid` before SQL) and binds them as distinct
`$2` (`version_major`), `$3` (`version_minor`) and `$4` (`version_patch`)
aliases in the ONE shared input CTE whose `$1` is the exact normalized prefix
tsquery (`to_tsquery('simple',$1)` — the preserved TASK-551 bind contract);
`snapshot_id`, `locale` and any remaining parameters use later distinct
numbers (`$5`, ...), and no bind number is ever rebound or reused. The
parameterized lexicographic tuple predicates compare the six bound columns
against those CTE aliases —
`(product_version_lower_major, product_version_lower_minor, product_version_lower_patch) <= (input.version_major, input.version_minor, input.version_patch)`
AND
`(product_version_upper_major, product_version_upper_minor, product_version_upper_patch) > (input.version_major, input.version_minor, input.version_patch)` —
BEFORE any projection, rank or candidate `LIMIT`, using the composite index
`assistant_docs_v2_documents_product_version_idx (snapshot_id ASC, locale ASC,
product_version_lower_major ASC, product_version_lower_minor ASC,
product_version_lower_patch ASC, product_version_upper_major ASC,
product_version_upper_minor ASC, product_version_upper_patch ASC, doc_id ASC)`.
The B-tree leads with the exact equality predicates the candidate query always
applies — the active-snapshot join's `snapshot_id` and the exact `locale`
predicate — and only then the normalized lower/upper tuple columns, finishing
with the stable `doc_id` tiebreaker; range columns are NEVER first, so the
planner can use the equality prefix and a bounded index scan instead of a
range-leading scan. The candidate query is the bounded active-snapshot join
(single exact `snapshot_id`); `EXPLAIN (ANALYZE, BUFFERS)` fixtures pin this
index name and an index-scan plan for the exact
`snapshot_id = <active> AND locale = <locale> AND (lower_major, lower_minor,
lower_patch) <= (input.version_major, input.version_minor,
input.version_patch) AND (upper_major, upper_minor, upper_patch) >
(input.version_major, input.version_minor, input.version_patch)`
predicate shape (with `snapshot_id`/`locale` bound at the later distinct
numbers `$5`/`$6`) with fixed row-scan/transferred-byte budgets. The
source string is never parsed in SQL and no
`product_version_range` cast/scan enters the candidate query. Tests cover the
lower/upper boundary tuples, malformed and overflow ranges, the six persisted
bound columns and CHECKs, the parameterized tuple predicates before
projection/LIMIT, and sanitized representative small/large
`EXPLAIN (ANALYZE, BUFFERS)` evidence using that composite index with fixed
row-scan/transferred-byte budgets.

### Exact V2 section chunker owner (`assistantDocsChunkerV2`)

This leaf owns one exact pure Bun-free chunker
`core/services/assistant/assistantDocsChunkerV2.ts` (imports only pure
contracts; no DB, settings, server, provider or Bun edge). It is the ONLY
chunker for every V2 snapshot: startup/manual ingest, the cutover backfill
command and the shadow-parity baseline all feed the same bounded section lines
through this one module, and no competing split algorithm exists anywhere in
the V2 path. The algorithm is pinned to the current DB retrieval semantics
(the exact legacy ingest shape the existing `docsDbRetriever` consumes) and is
fully deterministic:

- Section input lines are LF-normalized (`\r?\n` → `\n`); content chunks
  accumulate at stable exact line boundaries (`line_start`/`line_end` in the
  section's own coordinate space, persisted unchanged).
- One content chunk holds at most `1,200` UTF-16 code units (the legacy
  `maxChunkChars` measure); a single line longer than the cap fails closed
  with `assistant_docs_chunk_oversized` — never split mid-line.
- `chunk_index` is deterministic per section (0-based); `chunk_id` is the
  stable deterministic identity derived from the exact
  `(snapshot_id, doc_id, locale, section_id, chunk_index)` tuple — never raw
  path bytes.
- `heading_path` is the exact ordered heading chain (the bounded
  `text[]`/`string[]` array, NEVER a scalar string), `0..8` entries, each at
  most `256` UTF-8 bytes, per the immutable table CHECK.
- `normalized_text` is the canonical `normalizeDocsText()` owner applied to
  the joined `heading path + " " + content` exactly like the legacy
  `headingTrail + content` semantics.
- `token_counts` counts REPEATED normalized tokens of length `> 1` over that
  same combined text: no synonym expansion, no dedup and no stopword rewrite
  (the V1 expand/stopword layers are deliberately NOT inherited);
  `token_count` is the sum of the per-lexeme counts. A chunk is rejected when
  the total exceeds `4,096` tokens, when it would produce more than `4,096`
  distinct keys, when a key exceeds `128` UTF-8 bytes, when any count exceeds
  `4,096`, or when the lexicographically key-sorted serialized JSON exceeds
  `262,144` UTF-8 bytes (all fail closed before any row is written).
- The same migration ships one named SQL validation function/CHECK pair that
  validates the persisted chunk row against this contract — stable
  `chunk_id`/`chunk_index`/`line_start`/`line_end`, the bounded ordered
  `heading_path` array, and the bounded `token_count`/`token_counts` shape —
  so a chunk row no chunker could have produced fails at persistence time.

Tests: golden parity fixtures pin the exact line-boundary accumulation, the
`1,200` UTF-16 unit cap, the overlong-line failure, stable
`chunk_id`/`chunk_index`/`line_start`/`line_end`, the ordered bounded
`heading_path`, the `normalizeDocsText` heading-path + content semantics, and
the repeated-token `token_counts`/`token_count` semantics against the current
`docsDbRetriever` expectations, plus malformed/Unicode (astral, combining,
CRLF) and oversize (tokens/keys/bytes/serialized-JSON) rejection fixtures.
Bundle sections feed this one chunker and nothing else.

The exact ingest result contract is:

```ts
// Transaction-verified pointer/status closure captured INSIDE the ingest
// finalization transaction (under the advisory lock) and committed with it.
// After the lock is released the caller may verify snapshot-by-id provenance
// but never requires the DB pointer to still be current.
type AssistantDocsIngestPointerClosureV2 =
  | Readonly<{ era: "v1"; snapshot: null }>
  | Readonly<{ era: "v2"; snapshot: AssistantDocsSnapshotIdentityV2 }>;

type AssistantDocsIngestResultV2 =
  | Readonly<{
      kind: "prepared"; // cutover fence not passed: snapshot persisted, inactive
      changed: boolean; // true = NEW prepared snapshot written by the cutover
                        // backfill command (sole preactivation producer);
                        // false = existing prepared snapshot reused for the
                        // same sourceHash
      snapshot: AssistantDocsSnapshotIdentityV2; // prepared snapshot identity
      activeSnapshot: null; // frozen V1 pointer carries NO V2 identity
      closure: { era: "v1"; snapshot: null }; // pointer/status at COMMIT
      docCount: number; chunkCount: number; totalTokens: number;
      finishedAt: string; buildDurationMs: number;
    }>
  | Readonly<{
      kind: "unchanged"; // fence passed: same-hash no-op, active pointer kept
      changed: false;
      snapshot: AssistantDocsSnapshotIdentityV2; // === active identity at COMMIT
      closure: { era: "v2"; snapshot: AssistantDocsSnapshotIdentityV2 };
      docCount: number; chunkCount: number; totalTokens: number;
      finishedAt: string; buildDurationMs: number;
    }>
  | Readonly<{
      kind: "activated"; // fence passed: new snapshot activated
      changed: true;
      snapshot: AssistantDocsSnapshotIdentityV2; // === new active identity at COMMIT
      closure: { era: "v2"; snapshot: AssistantDocsSnapshotIdentityV2 };
      docCount: number; chunkCount: number; totalTokens: number;
      finishedAt: string; buildDurationMs: number;
    }>
  | Readonly<{
      kind: "deferred_cutover_backfill"; // internal startup/manual-reindex
      // result ONLY at fence states `v1_active`/`v1_frozen`: the sole
      // preactivation producer is the cutover backfill command, so the caller
      // performs NO bundle load, NO ingest run allocation and NO snapshot
      // creation; startup logs the bounded result, the reindex service maps
      // it to the bounded operator-required conflict
      changed: false;
      snapshot: null; // no V2 snapshot exists yet
      activeSnapshot: null;
      closure: { era: "v1"; snapshot: null };
      docCount: 0; chunkCount: 0; totalTokens: 0;
      finishedAt: string; buildDurationMs: number;
    }>;
export function normalizeAssistantDocsIngestResultV2(
  value: unknown
): AssistantDocsIngestResultV2;
// ONE canonical closure helper (replaces every stale assertSame/status helper
// chain): it verifies the result's OWN transaction-verified closure and
// cross-member invariants only — `prepared` requires `closure.era === "v1"`
// with `closure.snapshot === null` and the prepared `snapshot` identity;
// `unchanged`/`activated` require `closure.era === "v2"` with
// `closure.snapshot` equal to the member `snapshot`; `deferred_cutover_backfill`
// requires the literal v1 null closure. It never reads the database and never
// requires the active pointer to still be current after lock release.
export function assertAssistantDocsIngestResultClosureV2(
  result: AssistantDocsIngestResultV2
): void;
```

`prepared` carries `changed: false` when the caller reused the one complete
inactive prepared snapshot for the same `sourceHash` (startup/manual ingest at
the later preactivation states, or an idempotent backfill rerun) and
`changed: true` only when the cutover backfill command wrote a new prepared
snapshot — startup/manual reindex NEVER writes a new prepared snapshot, so it
can never be a second preactivation producer; its `activeSnapshot` member is
the literal `null` (the frozen V1 pointer is never a V2 identity) and its
`closure` records the committed `era: "v1"` pointer/status exactly as the
finalization transaction verified it under the advisory lock. `unchanged`
and `activated` are reachable
only after the cutover fence is `v2_activated`; their `snapshot` must equal
the active pointer identity AND their `closure` records that same committed
identity. `deferred_cutover_backfill` is reachable ONLY at
`v1_active`/`v1_frozen` (returned before bundle load, run allocation or any
snapshot write) and requires the literal `snapshot: null`,
`activeSnapshot: null`, `changed: false`, the literal v1 null closure and zero
counts.
`normalizeAssistantDocsIngestResultV2` checks
each member independently and never derives `changed` from the member kind
(`changed === (kind === "activated")` is forbidden): `prepared` accepts
`changed` true or false with `activeSnapshot: null` and the v1 closure,
`unchanged` requires
`changed: false` and the v2 closure equal to the member snapshot,
`activated` requires `changed: true` and the same v2 closure, and
`deferred_cutover_backfill` requires exactly `changed: false`,
`snapshot: null`, `activeSnapshot: null`, the literal v1 null closure and zero
counts. Post-commit verification uses the ONE canonical
`assertAssistantDocsIngestResultClosureV2` (the result is immutable after
commit; snapshot-by-id provenance may be re-checked against the persisted
rows, but no stale helper re-asserts pointer currency).

The DB owner also exposes the exact active-pointer era union and the strict
status read model consumed by kind-aware reindex verification
(TASK-548-03-L03 imports these types/normalizer; no other definition exists):

```ts
type AssistantDocsActivePointerV2 =
  | Readonly<{
      era: "v1";
      snapshot: null; // PERMANENT: the frozen legacy pointer never names a V2 row
      legacyFrozenSourceHash: string | null; // named scalar metadata OUTSIDE snapshot
      legacyFrozenAt: string | null;
    }>
  | Readonly<{
      era: "v2";
      snapshot: AssistantDocsSnapshotIdentityV2;
      legacyFrozenSourceHash: null;
      legacyFrozenAt: null;
    }>;

type AssistantDocsGuideReadinessV2 =
  | Readonly<{
      state: "ready";
      era: "v1" | "v2";
      evidenceSnapshot: AssistantDocsSnapshotIdentityV2;
    }>
  | Readonly<{
      state: "not_ready";
      reason:
        | "legacy_acl_unbound"
        | "building"
        | "active_snapshot_missing"
        | "cutover_not_ready";
    }>;

type AssistantDocsDbStatusV2 = Readonly<{
  schema: "coderso.assistant-docs-db-status@v2";
  activePointer: AssistantDocsActivePointerV2;
  preparedSnapshot: AssistantDocsSnapshotIdentityV2 | null;
  buildingSnapshot: AssistantDocsSnapshotIdentityV2 | null;
  // equality invariant: indexBuilding === (buildingSnapshot !== null AND a
  // pending `request_kind='cutover_backfill'` run exists). The backfill's
  // durable start transaction commits the pending run AND the sole building
  // snapshot atomically, so the conjunction is exactly "backfill mid-flight";
  // explicit abort deletes the building cohort and terminalizes the run, so
  // both sides flip to false together. indexBuilding never implies
  // guideReadiness/indexReady.
  indexBuilding: boolean;
  guideReadiness: AssistantDocsGuideReadinessV2;
  docCount: number;
  chunkCount: number;
  totalTokens: number;
  lastReindexAt: string | null;
}>;
export function normalizeAssistantDocsDbStatusV2(
  value: unknown
): AssistantDocsDbStatusV2;
export function readAssistantDocsDbStatusV2(): Promise<AssistantDocsDbStatusV2>;
```

`AssistantDocsActivePointerV2` is the only way callers name the active era:
`era: "v1"` PERMANENTLY names the frozen legacy pointer with `snapshot: null`
(the schema CHECK
`assistant_docs_v2_active_pointer_era_chk ((era = 'v1' AND snapshot_id IS NULL) OR (era = 'v2' AND snapshot_id IS NOT NULL))`
and the TypeScript
union agree byte-for-byte; no impossible V2 identity is ever attributed to
V1), and `era: "v2"` names the active V2
snapshot. Named V1 freeze metadata (optional `legacyFrozenSourceHash` /
`legacyFrozenAt` scalars) lives in separate fields OUTSIDE `snapshot` and is
never a V2 identity; the legacy pair is both-NULL-or-both-non-NULL in `v1`
and both-NULL in `v2` per the exact `assistant_docs_v2_active_pointer_legacy_meta_chk`.
The DB owner materializes it in the single-row
`assistant_docs_v2_active_pointer` table whose era/`snapshot_id` CHECK makes a
mixed or dangling pointer impossible; `readAssistantDocsDbStatusV2` reads that
pointer row, the one `lifecycle = 'prepared'` snapshot identity (exactly zero
or one row by the global constant-expression partial unique index), the one
`lifecycle = 'building'` snapshot identity (exactly zero or one row by the
building partial unique index — surfaced so the status read model can report
an in-flight backfill while `preparedSnapshot` stays the complete prepared
identity), the presence of a pending `request_kind='cutover_backfill'` run
(for the exact `indexBuilding` equality invariant), the single-row cutover
record, and
bounded count aggregates in one read-only repeatable-read snapshot; it never
loads document/chunk bodies. The same read derives the strict
`AssistantDocsGuideReadinessV2` union from the pointer era, the
ACL-binding/lifecycle closure and the complete active snapshot — never from
row counts — with the exact truth table:
`{ state: "ready", era: "v1", evidenceSnapshot }` only when the pointer era is
`v1` AND the V1 corpus remains immutable/frozen (the cutover record is at/past
`v1_frozen` — never `v1_active`, where the trigger guards are not yet
installed) AND `legacy_acl_snapshot_id` names a retained snapshot that owns
the CLOSED `assistant_docs_v2_legacy_acl`. V1 readiness does NOT depend on the
ordinal cutover state: every frozen state (`v1_frozen`, `backfill_complete`,
`shadow_parity_clean`, `consumers_ready`) qualifies identically, and a
concurrent replacement `building` snapshot does NOT invalidate an existing
binding (the never-bound building cohort is never named by the pointer, so a
replacement backfill keeps V1 ready with no gap while its new cohort/ACL is
assembled) — that bound ACL snapshot's
exact identity is the evidence snapshot the V1 facade's ready result uses;
`{ state: "ready", era: "v2", evidenceSnapshot }` only when the pointer era is
`v2` AND the named active snapshot row exists with `lifecycle = 'active'` and
the exact `{ snapshotId, generation, sourceHash }` the pointer names (a
complete active V2 pointer/snapshot); otherwise `not_ready` with the exact
reason — `cutover_not_ready` when the cutover record is missing, malformed or
contradictory with the pointer (fail closed, never guessed, including a `v1`
pointer carrying a non-NULL binding while the cutover record is still exactly
`v1_active` — the immutable/frozen condition fails closed), `building` when a
`building` snapshot exists AND the pointer has no complete closed-ACL binding
(INITIAL backfill mid-flight: the never-bound building cohort is not yet
named by the pointer, and the binding is set only by the final
`building → prepared` transaction; a concurrent REPLACEMENT backfill with a
retained old valid binding stays ready and never reports this reason),
`legacy_acl_unbound` when the pointer era is `v1`
with `legacy_acl_snapshot_id` NULL (pre-first-backfill, an initial backfill
abort — abort never sets or clears the binding, so NULL stays NULL — or the
destructive legacy-resume transition cleared it; pre-backfill fails closed
too), and `active_snapshot_missing` when the pointer era is `v2` but the named
active snapshot row is missing/incomplete. The strict normalizer
`normalizeAssistantDocsDbStatusV2` enforces the same equality invariant
(`indexBuilding` must equal `buildingSnapshot !== null && pendingCutoverBackfill`),
verifies every `ready` member's era/evidence identity against the
`activePointer` and cutover record (a `v1`-ready requires the v1 pointer, the
frozen/immutable cutover state and the ACL binding, a
`v2`-ready requires the v2 pointer naming the evidence snapshot, and a
`ready` member with a mismatched or absent pointer identity is rejected) and
rejects any drift. The status service projects `indexBuilding` unchanged
into the parent `AssistantStatusResponseV2.indexBuilding`; it never implies
`guideReadiness`/`indexReady`, and the parent service derives
`guideReady === indexReady === (guideReadiness.state === "ready")` exactly
from the union — never from `docCount`/`chunkCount`.

The DB owner exposes exactly two recursively strict evidence projections.
`AssistantDocsLocalizedEvidenceV2` is the UNRANKED base: it contains the same
`snapshotId`, generation, `sourceHash` and corpus version; exact
`(docId, locale, sectionId, chunkIndex)`; bounded source/title; the
complete persisted chunk record (stable `chunkId`, full ordered
`headingPath: readonly string[]` — the bounded ordered `text[]`/`string[]`
projection of `assistant_docs_v2_chunks.heading_path`, never a scalar string —
`heading`, `content`, `lineStart`, `lineEnd`, `normalizedText`, `tokenCount`,
bounded exact `tokenCounts` — MANDATORY: the strict normalizer REJECTS
missing/malformed `tokenCounts` and no caller, adapter or projection may
derive or repair it);
the normalized permission/capability/link inputs; and the complete ordered
visual/example records for that localized section. It NEVER carries
query-derived fields.
`AssistantDocsRankedLocalizedEvidenceV2` extends/wraps that exact base with
the query-derived fields consumed by the current `DocsSearchHit` contract:
`snippet`, `score`, `matchedTerms` and the exact
`rankingSignals` shape (`textScore`, `domainScore`, `intentScore`,
`phraseScore`, `domainPenalty`, `matchedQueryCoverage`). Only search-result
records use the ranked wrapper; capability relation sections use the unranked
base and never invent score/query terms. Unknown fields,
cross-owner records, mixed snapshot identities or mismatched source hashes fail
closed in both strict normalizers. These are the only per-question Guide
enrichment sources; the ranked records are the only
input to the server-only Guide composer adapter, while the unranked base is
the only input to relation-card projection. They may contain confined
packaged asset metadata, but never PNG bytes, provider data, arbitrary HTML or
an authored URL.

`docId` is translation-family identity, so the same value is valid in multiple
locales and immutable snapshots. Every document, section, chunk, visual,
example, source-path, and capability-relation PK/FK/unique constraint includes
the owning `snapshot_id`. Use exact document uniqueness on
`(snapshot_id, doc_id, locale)` and exact chunk uniqueness on
`(snapshot_id, doc_id, locale, section_id, chunk_index)`; reject only duplicate
snapshot-scoped tuples, not a cross-locale or cross-snapshot `docId`. A
`force: true` generation with an identical source hash therefore coexists with
retained immutable snapshots without a uniqueness collision. Do not store PNG
bytes, arbitrary HTML, authored external URLs or provider data.
Every retrieval hit and Guide-facing source/evidence projection carries
`snapshotId`, generation, `sourceHash`, `docId`, canonical `locale`,
`sectionId` and `chunkIndex`; it must never reduce that identity to
`docId + sectionId`. The internal hit carries the exact normalized
`permissionRequirement`, `capabilityIds`, link inputs and complete ordered
visual/example records required for server re-authorization and response
projection; only authorized browser responses may omit the requirement.
Visual/example IDs remain bundle-global but are materialized only after the
exact localized document/section join succeeds during ingest.

Only documents whose exact `publicationTargets` contains both `assistant` and
`embedded-help` may be persisted, chunked or returned by Guide retrieval. An
`assistant`-only source fails ingest/coverage because every Guide answer must
have an authorized full Help destination. `embedded-help`-only and
`public-docs`-only records remain in the shared bundle but never enter the
assistant snapshot.

Activation, the single-row active-pointer update
(`assistant_docs_v2_active_pointer` era/snapshot/generation/
`previous_v2_snapshot_id`), the snapshot
`lifecycle` transition (`prepared → active`, or — for ordinary post-fence
activation — the prior `active → inactive` demotion BEFORE the new `active`
insertion), the exact activation-event insertion, and successful-run
finalization commit in the same DB transaction. One-active ordering is exact:
a second active row is never inserted before the prior active row is demoted,
and any later-step failure rolls the demotion back with the transaction. The
prepared run itself is terminal as `prepared` and is never transitioned or
finalized again. Retrieval selects through the
active pointer and requires every joined row to match its exact
`{ snapshotId, generation, sourceHash }`. Guide records and capability
relations are authorization-sensitive and therefore use no server value cache,
browser cache, Redis value, stale-while-revalidate path, or `cacheBus` event.
Every question resolves the active pointer and authorization DB-authoritatively
inside statement 1. Failed activation exposes no new rows. Thus each query sees
one complete old or new snapshot, never mixed metadata. During the one-time
legacy→V2 cutover window, per-run activation additionally requires the
persisted V2 activation fence to be exactly `v2_activated` (see the V2
activation fence section below): ingest may prepare and persist inactive V2
snapshots, but the active pointer remains the frozen V1 legacy pointer until
the fence passes. Before the fence no V2 row is served by any consumer and the
legacy symbol serves only the frozen V1 snapshot; after the fence, per-run
activation proceeds normally. `force: false` may no-op only when
the active pointer's `sourceHash` equals the strictly loaded bundle hash;
`force: true` may create a new generation with the same hash but cannot weaken
validation.

## Cross-Process Ingest Contract

After the serialized consumer cutover, startup and authenticated manual reindex
call the same `ingestPackagedAssistantDocsV2` entrypoint and acquire the same PostgreSQL
session advisory lock before bundle load, run allocation or an ingest
transaction. The exact signed 64-bit key is
`ASSISTANT_DOCS_INGEST_ADVISORY_LOCK_KEY_V2 = 0x434f444552534f32n`.
Acquisition delegates exactly to terminal TASK-551's
`withDedicatedDatabaseAdvisoryLock` with conflict code
`assistant_docs_reindex_conflict`; this leaf never acquires/releases/discards a
raw connection. A false acquire invokes no callback and performs no filesystem
or DB mutation. The advisory-lock callback's `lockSession` owns ONLY
lock/liveness; every read, the durable pending-run allocation, the
snapshot/finalization transaction and the ambiguous-commit reconciliation run
on their own independent dedicated sessions reserved via
`withDedicatedDatabaseSession` (see the session-separation section below), and
one bounded no-throw retention pass follows after commit.
TASK-551 alone unlocks normally or terminates/awaits the backend
on false, error, abort, session loss or ambiguous unlock. No process-local mutex,
ordinary pooled session-lock query, startup-only key, route-only key, or hidden
client is an authority. Process death closes the session and releases the lock.

The terminal TASK-551 maintenance-mode matrix is part of Guide readiness, with
the Guide two-session budget (`lock owner + one work/reconcile session`):
`off + primary` requires `DB_POOL_MAX >= 3` (two dedicated sessions plus one
retained ordinary-query headroom slot); `transaction + primary` is
incapable; `direct|session` requires a maintenance pool of at least 2 while the
primary keeps its own headroom. The ingest boundary validates this budget
through terminal TASK-551-02-L02's exact public
`assertDedicatedDatabaseSessionBudget` helper (lock owner 1, one work/reconcile
session, one ordinary headroom slot where applicable) — this leaf imports and
calls that helper and never re-implements the per-mode matrix.
`database_maintenance_session_unavailable` maps to
`assistant_docs_db_unavailable` before bundle read or run allocation. Deployment
docs must either preserve a capable default or configure `direct|session`; a
pool-one primary receives an explicit not-ready/startup failure, never a process
mutex or unsafe pooled fallback.

Before bundle load or new run allocation, the advisory-lock holder performs a
bounded preflight over the sole possible pending run. It reconciles that run's
stored request identity (`request_kind`, `actor_id`, `force`, `source_hash`,
`requested_at`)
against the run result, active pointer, and complete snapshot on a
fresh read-only connection. Coherent committed evidence atomically CAS-settles
the recovered run's terminal state (`prepared`/`unchanged`/`activated` per the
reconstructed committed result) and frees the pending partial-unique slot;
proven non-commit CAS-
transitions the old run to failed and likewise frees the slot. The current
invocation then ALWAYS continues to its own one fixed bundle load and its own
admission/run — a recovered result is never returned as the current request's
answer. Unreadable
or contradictory evidence remains pending and blocks with outcome unknown;
the partial unique index independently prevents another generation/run.

Every new ingest run is allocated as `pending` in its own bounded
dedicated-session transaction and COMMITted while the advisory lock is still
held (durable-pending protocol): a crash before that commit leaves no pending
row, a crash after it leaves a real durable pending row that the next
advisory-lock holder reconciles, and the partial unique index remains the
concurrency backstop. Snapshot mutation and the terminal (success, unchanged,
prepared or failed) transition run in a SEPARATE second transaction and every
terminal write is conditional on the pending state. A lost/error COMMIT response is
not proof of rollback. While the advisory lock is still held, the ingest opens a
fresh PostgreSQL connection and reconciles the run, active pointer, and complete
snapshot closure in one read-only snapshot. A coherent committed activation
requires the run's exact `{ snapshotId, generation, sourceHash }`, the identical
active pointer, and complete closed rows; a committed unchanged result requires
its exact run result and the still-matching active identity; a committed
prepared result requires its exact run result and the complete inactive
prepared snapshot. Every committed result (`prepared`, `unchanged` or
`activated`, as the strict `AssistantDocsIngestResultV2` union)
is reconstructed directly and EXACTLY from the persisted provenance tuple —
`(status, result_kind, changed, run_result.snapshot_id, request_kind,
request identity)`, with `run_result.snapshot_id` joined from the ACYCLIC
`assistant_docs_v2_ingest_run_results` row (runs carry no snapshot FK) — so a
`prepared` member is reconstructed with
its literal `changed` flag and its producing `cutover_backfill` run identity,
an `unchanged` member with `changed = false`, and an `activated` member with
`changed = true`; the `deferred_cutover_backfill` member is never persisted as
a run kind (it performs no run allocation). Only a still-pending run plus proven absence
of a committed active/snapshot result for that run is `not_committed` and may
transition pending → failed. Contradictory or
unreadable evidence remains pending, returns a bounded
`assistant_docs_ingest_failed` outcome-unknown diagnostic and is never rewritten
as failed or allowed to trigger a second generation under the held lock.

### Preactivation producer rules

Exactly one code path may create or replace a building/prepared V2 snapshot
before activation: the cutover backfill command
`bun scripts/docs/migrate-assistant-docs-v2.ts` under the same ingest advisory
lock (see the backfill paragraph above). `ingestPackagedAssistantDocsV2`
(startup and authenticated manual reindex) applies these exact rules by fence
state, after the session budget and the bounded fence-state read, and BEFORE
pending reconciliation, pruning, bundle load or run allocation:

- `v1_active` or `v1_frozen`: return the bounded internal
  `deferred_cutover_backfill` result — no bundle load, no pending-run
  allocation, no capacity/prune work and no snapshot write. Startup logs the
  bounded result; `reindexAssistantDocs` (TASK-548-03-L03) maps it to the
  bounded operator-required conflict (see below). Manual reindex can therefore
  never become a second preactivation producer, and a residual pending row at
  these states is reconciled only by the backfill command on its next run.
- `backfill_complete`, `shadow_parity_clean` or `consumers_ready`: load the
  fixed packaged bundle exactly once and compare its `sourceHash` with the one
  complete prepared snapshot. Same hash → `prepared` with `changed: false`
  (prepared reuse; a normal `startup`/`manual` run row is allocated and
  finalized with its acyclic `assistant_docs_v2_ingest_run_results` row
  pointing at the existing prepared snapshot — never a second producer). Different hash →
  a public `assistant_docs_cutover_required` conflict (the stable seventh
  public error, mapped HTTP 409 by TASK-548-03-L03) BEFORE run allocation or any
  snapshot write: the operator must run the explicit source-drift reset
  (`resetAssistantDocsV2CutoverSourceDriftV1`, from `backfill_complete`/
  `shadow_parity_clean`/`consumers_ready` back to `v1_frozen`) and then rerun
  the SAME backfill
  command, which replaces the prepared snapshot. A same-hash `force:true`
  inside the rolling-hour cooldown still fails before allocation; the
  `force:true` flag can never weaken the producer rules.
- `v2_activated`: unchanged normal packaged startup/manual ingest (prepared
  reuse/new no longer applies; only `unchanged`/`activated` outcomes).

The backfill command itself refuses to run before `v1_frozen` (freeze-first)
and is the only preactivation producer; the cutover CAS rows advance
`v1_frozen → backfill_complete` only after that command's final
keyset/closure, and the source-drift reset row never creates a snapshot by
itself. Add startup-before-freeze fixtures (startup at `v1_active` and at
`v1_frozen` returns `deferred_cutover_backfill` with zero bundle-load/run/
snapshot side effects and the backfill command refuses before `v1_frozen`),
concurrent backfill/startup fixtures (two processes racing under the same
advisory lock: the backfill command wins the sole producer role; startup
either waits and then reuses the new prepared snapshot or returns the bounded
conflict, and exactly one prepared snapshot and one terminal
`cutover_backfill` run ever exist), and hash-drift fixtures (startup/manual at
`backfill_complete`/`shadow_parity_clean`/`consumers_ready` with a changed
packaged hash returns the public `assistant_docs_cutover_required` conflict, the
explicit reset + backfill rerun replaces the prepared snapshot, and the
prepared state is never re-created by any other path).

### V2 activation fence and persisted cutover state

The legacy→V2 cutover is one persisted, fail-closed state machine; no code path
infers the era from row counts, nullable columns, a process flag or the active
pointer alone. This leaf may compile V2 snapshot plans at any time — the
cutover backfill command is the SOLE preactivation producer that persists them —
but it cannot activate them (move the active pointer) until the V1 freeze
(`v1_active → v1_frozen`), the backfill closure
(`v1_frozen → backfill_complete`), the shadow parity comparison
(`backfill_complete → shadow_parity_clean`) and the consumer declarations
(`shadow_parity_clean → consumers_ready`) are complete, and every V2 consumer
declares readiness.

This leaf owns the single-row table `assistant_docs_v2_cutover` with exact
columns: `id bigint` (primary key, `CHECK (id = 1)` — the table is locked to
exactly one row), `state text not null` (check-constrained to the exact six
states), `revision bigint not null` (generation-aware CAS/ABA protection:
increments by exactly one on EVERY successful transition, including rollback
and source-drift reset), `rollout_generation bigint not null` (stable through
one rollout; increments only on rollback, source-drift reset, or a new
rollout), `updated_at timestamptz not null`,
`deployment_identity text` (NULL iff `state = 'v1_active'`, non-null for every
later state via a CHECK constraint — the identity of the deployment/operator
that advanced the state), optional `backfill_finished_at`, optional
`shadow_parity_run_id` / `shadow_parity_source_hash`, optional `activated_at`,
`rollout_receipt jsonb not null default 'null'::jsonb` (exact bounded
deployment rollout receipt, see below), and `consumers jsonb not null`
mapping consumer id → exact structured
`{ deploymentIdentity: string; rolloutGeneration: number; readyAt: string }`
entries (reject-unknown consumer ids, reject unknown entry keys). The initial
row is `v1_active`, `revision` `1`, `rollout_generation` `1`,
`deployment_identity` NULL, `rollout_receipt` null.

The rollout receipt is the exact bounded evidence required before
`consumers_ready` and is recorded ONLY after the era-aware facade is deployed
on every replica while the authoritative pointer era is still `v1` (it proves
that exact deployed facade build — `servingBuildSha256` — serves everywhere
and zero V1-only replicas are serving; it is never a facade-deployment
precondition, because no receipt can exist for a build that is not yet
deployed): `{ schema:
"coderso.assistant-docs-v2-rollout-receipt@v1", deploymentIdentity,
rolloutGeneration, verifiedReplicaCount, servingBuildSha256, verifiedAt,
evidenceRef }` (reject-unknown, bounded sizes, hashes lowercase 64-hex). It
proves that every serving replica runs the V2-compatible build and zero
V1-only replicas are serving; no mixed live old/new serving claim exists
without this persisted evidence, and the transition to `consumers_ready`
verifies the receipt's `deploymentIdentity`/`rolloutGeneration` match the
cutover row exactly.

Exact states and transitions (every transition is one pending-only CAS UPDATE
`WHERE state = <from> AND revision = <expectedRevision>` with `RETURNING`;
a zero-row update is a conflict and fails closed with no side effects).
`revision` is the generation-aware CAS/ABA counter: it starts at `1`,
increments by exactly one on every successful transition (including rollback
and source-drift reset), and every CAS carries the exact `expectedRevision`
read immediately before the write, so stale replicas and interleaved
transitions always conflict instead of clobbering. `rollout_generation` is
separate: stable through one complete rollout, incremented only on the
explicit rollback row, a source-drift reset, or the start of a new rollout;
consumer entries bind the exact `rolloutGeneration` they were declared
against:

| From | To | Required evidence, verified in the same transaction |
| --- | --- | --- |
| `v1_active` (initial) | `v1_frozen` (V1 freeze) | the V1 freeze gate below passed: the DB trigger guards on `assistant_docs`/`assistant_doc_chunks` are installed (rejecting every legacy INSERT/DELETE/UPDATE once the state is past `v1_active`; no V2-shaped write is ever permitted on V1 tables), the `SHARE ROW EXCLUSIVE` drain with `SET LOCAL lock_timeout='5s'` in THIS transition waits out in-flight legacy writers (a `55P03` timeout maps to the bounded `assistant_docs_v1_freeze_lock_timeout` conflict and the operator reruns; no automatic retry), and the legacy startup producer removal static gate passed. Current V1 rows are then frozen as the one legacy snapshot; the bounded resumable backfill runs ONLY after this transition, reading the immutable frozen V1 rows solely for legacy ACL classification and the shadow-parity baseline — never as a V2 content source |
| `v1_frozen` | `backfill_complete` | the cutover backfill command (the SOLE preactivation producer, under the same advisory lock) reached its final keyset with zero unclassified rows, every deny-all fixture verified, referential/locale/evidence closure passed, and the bundle-plan-persisted identity matched (the persisted doc/chunk/evidence closure equals the loaded bundle and in-memory plan); its durable start transaction committed the pending `request_kind='cutover_backfill'` run, the sole `building` snapshot and the `assistant_docs_v2_legacy_acl` rows (with the bounded cursor/progress/plan/sourceHash on the run) WITHOUT touching the pointer's `legacy_acl_snapshot_id` — an initial backfill keeps it NULL (stays not-ready mid-flight) and a source-drift replacement retains the old valid binding (stays ready, no gap), bounded child batches materialized rows ONLY from the bundled plan (each binding planSha/sourceHash) and CAS-updated the run's progress, and the FINAL transaction atomically transitions `building → prepared`, CAS-finalizes the terminal `prepared` run (exact `result_kind`/`changed`), inserts the exact `assistant_docs_v2_ingest_run_results` row, atomically binds (initial) or rebinds (replacement) the pointer's `legacy_acl_snapshot_id` to that complete closed-ACL prepared snapshot, and CAS-advances the cutover row itself (backfill evidence is verified HERE, after the freeze; frozen V1 rows are read only for ACL classification and the shadow baseline — no backfill content work ever runs against mutable V1 rows) |
| `backfill_complete` | `shadow_parity_clean` | one read-only shadow comparison run over the frozen legacy snapshot vs the prepared V2 inactive snapshot completed with zero authorized-result mismatches and records exact `shadowParityRunId`/`shadowParitySourceHash` |
| `shadow_parity_clean` | `consumers_ready` | the persisted bounded deployment rollout receipt (`rollout_receipt`) proves zero serving V1-only replicas and matches the row's `deploymentIdentity`/`rolloutGeneration`, AND every consumer in the code-owned `ASSISTANT_DOCS_V2_CONSUMER_IDS_V1` set declared ready via `declareAssistantDocsV2ConsumerReadyV1`; unknown, missing, conflicting declarations, or a missing/mismatched receipt fail |
| `consumers_ready` | `v2_activated` | the activation transaction below: CAS plus active-pointer switch plus `prepared → active` lifecycle transition plus the exact `cutover_activation` event insertion (the source prepared run stays terminal as `prepared`; it is never transitioned or finalized again) commit atomically |
| `v2_activated` | `v1_frozen` (explicit rollback row) | operator rollback: CAS with `expectedRevision`, increments `revision` and `rollout_generation`, demotes the active V2 snapshot (`active → inactive` with `deactivated_at` set), clears `previous_v2_snapshot_id`, re-records the legacy scalar metadata pair (the V1 corpus stays frozen), restores the frozen V1 pointer (`assistant_docs_v2_active_pointer` era `v1`, `snapshot_id` NULL), and atomically clears `consumers`, `rollout_receipt`, `backfill_finished_at`, `shadow_parity_run_id`/`shadow_parity_source_hash` and `activated_at` evidence before any retry; the DB trigger guards stay installed, the frozen V1 rows stay immutable and safely readable, and the ACL rows survive (their snapshot is demoted, never deleted) with the pointer's `legacy_acl_snapshot_id` binding preserved, so the era-aware facade keeps serving the frozen V1 corpus with exactly one backend — no Guide gap and no re-enabled legacy writes |
| `v1_frozen` or `backfill_complete` or `shadow_parity_clean` or `consumers_ready` | `v1_active` (explicit destructive legacy-resume transition; NEVER the normal rollback) | explicit operator decision to resume MUTABLE legacy V1 — not rollback: CAS with `expectedRevision`, increments `revision` AND `rollout_generation`, retires every prepared/inactive V2 snapshot artifact (retired rows become retention-eligible with `deactivated_at`; a never-served mid-flight `building` snapshot is NEVER retired to `inactive` — it is DISPOSED atomically: CAS the pending `cutover_backfill` run to `failed` with `terminal_at` set, DELETE the building snapshot cohort (children/run-result rows cascade), and free the pending run slot/snapshot-byte capacity in the same transaction; the never-bound building cohort is never named by the pointer, so its disposal never touches the binding), clears `consumers`, `rollout_receipt`, `backfill_finished_at`, `shadow_parity_run_id`/`shadow_parity_source_hash` and `activated_at` (cutover-row evidence only — `assistant_docs_v2_activation_events` rows stay immutable with their RESTRICT pins until `event_at + 30d` pruner eligibility), CLEARS the pointer's `legacy_acl_snapshot_id` binding (Guide becomes unavailable — the facade has no ACL to join and fails readiness with zero authorized rows), and restores `v1_active` so the trigger guards re-permit legacy writes — re-enabling writes happens ONLY through this explicit destructive operator action, including from `v1_frozen` after a `v2_activated → v1_frozen` rollback; legacy rows written after this transition are NOT covered by a closed ACL and are never served by the facade until a fresh freeze + backfill recreates the binding |
| `backfill_complete` or `shadow_parity_clean` or `consumers_ready` | `v1_frozen` (executable source-drift reset) | the prepared snapshot's `sourceHash` no longer matches the recorded `shadowParitySourceHash`/`rollout_receipt`: `resetAssistantDocsV2CutoverSourceDriftV1` CAS-resets to `v1_frozen` with `expectedRevision` (so the SAME backfill command may rerun — it refuses before `v1_frozen`), increments `revision` AND `rollout_generation`, atomically clears the stale parity/readiness evidence and rollout receipt (`shadow_parity_run_id`/`shadow_parity_source_hash`, `consumers`, `rollout_receipt`, `backfill_finished_at`), retires the stale prepared snapshot (`prepared → inactive` with `deactivated_at` set; a mid-flight `building` snapshot is never retired to `inactive` — it is DISPOSED atomically: CAS the pending `cutover_backfill` run to `failed` with `terminal_at` set, DELETE the building snapshot cohort (children/run-result rows cascade), and free the pending run slot/snapshot-byte capacity in the same transaction; the never-bound building cohort is never named by the pointer, so its disposal never touches the retained `legacy_acl_snapshot_id` binding), and the operator reruns backfill/shadow parity against the new hash (the frozen V1 rows stay immutable; the reset row never creates a snapshot by itself; the rerun's durable start RETAINS the old binding and only its FINAL transaction rebinds the pointer to the new complete closed-ACL snapshot) |

The exact consumer set is `ASSISTANT_DOCS_V2_CONSUMER_IDS_V1 = ["startup_ingest",
"db_retriever_v2", "reindex_service", "status_service"] as const`. The cutover
record carries one code-owned `deploymentIdentity` (a stable per-deployment
constant, e.g. `ASSISTANT_DOCS_V2_DEPLOYMENT_IDENTITY_V1`). Each named consumer
declares readiness with its `consumerId`, that `deploymentIdentity` and the
current `rollout_generation` as `expectedRolloutGeneration`; the declaration is
idempotent for the same `(consumerId, deploymentIdentity,
expectedRolloutGeneration)` across replicas and restarts (a repeated
declaration is a no-op success and never fails at construction — it refreshes
`readyAt` and keeps the stored `deploymentIdentity`/`rolloutGeneration`
unchanged), while a
conflicting deployment identity or rollout generation fails closed. Revision
rules: `revision` increments by exactly one on every successful CAS
transition (including the rollback row and source-drift reset);
`rollout_generation` is stable through one rollout and increments only on
rollback, source-drift reset, or a new rollout; consumer entries store the
`rolloutGeneration` they were declared against and become stale (fail) when a
rollback/reset/new rollout changed `rollout_generation`. Adding or
removing a consumer is a task-contract amendment.

Exact owner/helper shapes (all owned by this leaf):

```ts
type AssistantDocsV2CutoverStateV1 =
  | "v1_active" | "v1_frozen" | "backfill_complete" | "shadow_parity_clean"
  | "consumers_ready" | "v2_activated";
type AssistantDocsV2ConsumerEntryV1 = Readonly<{
  deploymentIdentity: string;
  rolloutGeneration: number;
  readyAt: string;
}>;
type AssistantDocsV2RolloutReceiptV1 = Readonly<{
  schema: "coderso.assistant-docs-v2-rollout-receipt@v1";
  deploymentIdentity: string;
  rolloutGeneration: number;
  verifiedReplicaCount: number;
  servingBuildSha256: string;
  verifiedAt: string;
  evidenceRef: string;
}>;
type AssistantDocsV2CutoverRecordV1 = Readonly<{
  state: AssistantDocsV2CutoverStateV1;
  revision: number;               // increments on EVERY transition (CAS/ABA)
  rolloutGeneration: number;      // stable per rollout; increments on rollback/
                                  // source-drift reset/new rollout only
  deploymentIdentity: string | null; // null iff state === "v1_active"
  consumers: Readonly<Record<string, AssistantDocsV2ConsumerEntryV1>>;
  rolloutReceipt: AssistantDocsV2RolloutReceiptV1 | null;
  backfillFinishedAt: string | null; shadowParityRunId: string | null;
  shadowParitySourceHash: string | null; activatedAt: string | null;
}>;
readAssistantDocsV2CutoverStateV1(tx): Promise<AssistantDocsV2CutoverRecordV1>;
casTransitionAssistantDocsV2CutoverStateV1(tx, input: {
  from: AssistantDocsV2CutoverStateV1;
  expectedRevision: number;
  to: AssistantDocsV2CutoverStateV1;
  evidence?: { shadowParityRunId: string; shadowParitySourceHash: string } | null;
  clearEvidence?: boolean; // rollback/source-drift reset rows: clears consumers/
                           // rollout receipt/backfill/shadow/activation evidence
}): Promise<AssistantDocsV2CutoverRecordV1>;
// pending-only CAS on (state, revision); conflict fails closed
declareAssistantDocsV2ConsumerReadyV1(tx, input: {
  consumerId: string;
  deploymentIdentity: string;
  expectedRolloutGeneration: number;
}): Promise<void>;
// idempotent for the same (consumerId, deploymentIdentity, rolloutGeneration)
requireAssistantDocsV2ActivationFenceV1(): Promise<AssistantDocsV2CutoverRecordV1>;
// resolves the single row; state must be exactly `v2_activated`, else the
// internal sentinel `assistant_docs_v2_consumer_not_ready` with zero evidence
activateAssistantDocsV2CutoverV1(input: {
  lockSession: DedicatedDatabaseSession;
  preparedSnapshot: AssistantDocsSnapshotIdentityV2;
  expectedRevision: number;
}): Promise<AssistantDocsV2CutoverRecordV1>;
rollbackAssistantDocsV2CutoverV1(input: {
  lockSession: DedicatedDatabaseSession;
  expectedRevision: number;
}): Promise<AssistantDocsV2CutoverRecordV1>;
// explicit operator rollback from `v2_activated` to `v1_frozen`: increments
// `revision` AND `rollout_generation`, demotes the active V2 snapshot,
// re-records the legacy scalar metadata pair, restores the frozen V1 pointer,
// and clears consumers/rollout receipt/backfill/shadow/`activated_at`
// cutover-row evidence (activation-event rows stay immutable until the
// `event_at + 30d` pruner eligibility) — while PRESERVING the trigger
// guards, the immutable frozen V1 rows and the
// pointer's `legacy_acl_snapshot_id` binding, so the facade keeps serving the
// frozen V1 corpus with no Guide gap and legacy writes stay frozen. It never
// re-enables mutable legacy V1.
// explicit DESTRUCTIVE legacy-resume transition (NOT normal rollback) from
// ANY preactivation state
// (`v1_frozen | backfill_complete | shadow_parity_clean | consumers_ready`)
// back to `v1_active`: increments `revision` AND `rollout_generation`, retires
// prepared/inactive V2 artifacts (retired rows become retention-eligible with
// `deactivated_at`; a never-served mid-flight `building` snapshot is NEVER
// retired to `inactive` — it is DISPOSED atomically: CAS the pending
// `cutover_backfill` run to `failed` with `terminal_at` set, DELETE the
// building snapshot cohort (children/run-result rows cascade), and free the
// pending run slot/snapshot-byte capacity in the same transaction (the
// never-bound building cohort is never named by the pointer, so its disposal
// never touches the binding), clears
// consumers/rollout receipt/
// backfill/shadow/`activated_at` cutover-row evidence (activation-event rows
// stay immutable until `event_at + 30d` pruner eligibility), CLEARS the
// pointer's
// `legacy_acl_snapshot_id` binding (Guide unavailable until a fresh
// freeze + backfill recreates it), and re-enables mutable legacy
// writes only through that explicit destructive operator action
rollbackAssistantDocsV2CutoverPreActivationV1(input: {
  lockSession: DedicatedDatabaseSession;
  expectedRevision: number;
}): Promise<AssistantDocsV2CutoverRecordV1>;
resetAssistantDocsV2CutoverSourceDriftV1(input: {
  lockSession: DedicatedDatabaseSession;
  expectedRevision: number;
}): Promise<AssistantDocsV2CutoverRecordV1>;
// executable source-drift reset from `backfill_complete | shadow_parity_clean |
// consumers_ready` back to `v1_frozen`: CAS with `expectedRevision`, increments
// `revision` AND `rollout_generation`, atomically clears stale parity/readiness
// evidence and the rollout receipt, retires the prepared snapshot
// (`prepared → inactive` with `deactivated_at` set; a mid-flight `building`
// snapshot is never retired to `inactive` — it is DISPOSED atomically: CAS
// the pending `cutover_backfill` run to `failed` with `terminal_at` set,
// DELETE the building snapshot cohort (children/run-result rows cascade), and
// free the pending run slot/snapshot-byte capacity in the same transaction;
// the never-bound building cohort is never named by the pointer, so its
// disposal never touches the retained `legacy_acl_snapshot_id` binding),
// and returns the fence to
// `v1_frozen` so the SAME cutover backfill command reruns (it refuses before
// `v1_frozen`; the rerun's durable start RETAINS the old binding and only its
// FINAL `building → prepared` transaction rebinds the pointer to the new
// complete closed-ACL snapshot). The reset row never creates a snapshot by
// itself.
```

The shadow-parity gate is one read-only comparison run that executes a bounded
deterministic authorized query corpus against the frozen legacy snapshot and
the prepared V2 inactive snapshot and requires exact result-set identity (same
authorized `(docId, locale, sectionId, chunkIndex)` tuples and equal authorized
evidence projections) for every query. Any mismatch, missing result or
unreadable side keeps the current state and blocks
`backfill_complete → shadow_parity_clean`. The recorded
`shadowParitySourceHash` must equal the prepared snapshot's `sourceHash`.

`activateAssistantDocsV2CutoverV1` is the only transition to `v2_activated` and
the only code that moves the active pointer from the frozen V1 pointer to a V2
snapshot: in one
transaction it re-reads the cutover row AND the active pointer, requires the
pointer `era` to be exactly `v1` (proving there is NO V2 active before
promotion — never insert a second active row before the prior one is demoted),
CAS-transitions
`consumers_ready → v2_activated` with its exact `expectedRevision`, switches
the active pointer row (`assistant_docs_v2_active_pointer` era `v2`,
`snapshot_id`, `previous_v2_snapshot_id` NULL — the cutover has no V2
predecessor) to the exact
prepared snapshot whose `sourceHash` equals the recorded
`shadowParitySourceHash` (missing/ambiguous prepared snapshot fails closed),
transitions that snapshot `prepared → active` (the global constant-expression
partial unique index makes a second active V2 snapshot impossible), and
atomically inserts the exact `cutover_activation` row in
`assistant_docs_v2_activation_events` (linked to that prepared snapshot and
its exact producing run named by the snapshot's immutable
`producer_run_id` — the terminal `cutover_backfill` run). The producing run
itself remains TERMINAL as
`prepared` and is never transitioned or finalized again. Pre-fence ingest runs
finalize with `finishPendingDocsIngestRunPreparedV2` (success,
`activated: false`, snapshot kept inactive) and never touch the active pointer;
a run attempting activation before the fence fails closed with the internal
cutover sentinel.

For ordinary post-cutover new activation (per-run activation inside
`finalizeAssistantDocsIngestRunV2`), one-active ordering is exact: within the
one finalization transaction the prior active V2 row is FIRST demoted
(`active → inactive` with `deactivated_at` set), then the sequence-allocated
new active row is inserted, then the pointer is switched with
`previous_v2_snapshot_id` set to the demoted predecessor, the current run is
finalized as `activated`, and the exact `replacement_activation` event row is
inserted. A second active row is NEVER inserted before the demotion; if any
later step fails, the transaction rolls the demotion back with everything
else.

### V1 freeze gate and legacy producer removal

The V1 freeze is DB-authoritative and works for binaries predating this task:
writes can never corrupt the frozen V1 tables. Activation additionally
requires the persisted deployment rollout receipt (zero serving V1-only
replicas), and a rogue unsupported old binary after activation may only read
stale frozen V1 — it can never see V2 rows or mutate V1.

The L03 migration installs exact row-level PostgreSQL trigger guards on the
legacy V1 corpus tables. Enumerated trigger paths (one trigger function plus
one trigger per path, all owned by this leaf's migration):

- `assistant_docs`: `BEFORE INSERT`, `BEFORE UPDATE`, `BEFORE DELETE`;
- `assistant_doc_chunks`: `BEFORE INSERT`, `BEFORE UPDATE`, `BEFORE DELETE`.

Each trigger resolves the single `assistant_docs_v2_cutover` row and applies
the exact operation-specific rule: whenever the cutover state is NOT exactly
`v1_active`, `BEFORE INSERT` rejects based on NEW, `BEFORE DELETE` rejects
based on OLD, and `BEFORE UPDATE` rejects every legacy OLD/NEW mutation — the
trigger raises a typed `assistant_docs_v1_frozen` error before any mutation
lands. There is NO permitted V2-shaped write on either V1 table: V2 rows live
only in the separate `assistant_docs_v2_*` tables, and while the state IS
`v1_active` legacy V1 writes remain fully compatible (including legacy
`INSERT ... ON CONFLICT (source_path) DO UPDATE` upserts). A missing or
malformed cutover row fails closed.

The `v1_active → v1_frozen` freeze transition transaction runs in this exact
order: (1) `SET LOCAL lock_timeout='5s'`, then `LOCK TABLE assistant_docs,
assistant_doc_chunks IN SHARE ROW EXCLUSIVE MODE` (a mode conflicting with
every legacy writer), which waits at most five seconds for
all in-flight old writes to commit/rollback — a `55P03` timeout maps to the
bounded `assistant_docs_v1_freeze_lock_timeout` conflict and the operator
reruns the transition; there is NO automatic retry; (2) re-verify the freeze
evidence (the trigger guards are installed on both legacy tables and the
legacy producer removal static gate passed; no backfill has started against
mutable rows); (3) CAS-advance the cutover row to
`v1_frozen` with the exact `expectedRevision`. After the table lock
releases, queued and new old-binary writes run the trigger and fail before
mutation with `assistant_docs_v1_frozen`; current V1 rows are then frozen as
the one legacy snapshot and the bounded resumable backfill runs ONLY after
the freeze, reading those immutable rows solely for legacy ACL classification
and the shadow-parity baseline — never as a V2 content source. The `v1_frozen → backfill_complete` transition runs
after the backfill and re-verifies the final keyset with zero unclassified
rows, the deny-all fixtures, and referential/locale/evidence closure before
its CAS with the exact `expectedRevision`. The trigger is the freeze
authority, so no binary-side preflight can be required of stale deployments
for the freeze itself; the deployment rollout receipt (zero serving V1-only
replicas) is the separate evidence required before `consumers_ready`, not an
all-replicas write preflight.

TASK-548-01-L03 remains the sole TASK-548 writer of the final legacy producer
removal in the same leaf: the one-line
`initializeDocsIndexOnBootIfEnabled` import/fire-and-forget call removal in
`core/server/httpServer.ts` and the retired source-root startup export removal
in `core/services/assistant/docsIndexService.ts`. The removal is a code-hygiene
and static-gate step, NOT the freeze authority — the DB triggers are. The
freeze gate statically rejects any `docsIndexService` legacy startup export
import from `core/server/httpServer.ts` and proves `startHttpServer` performs
only the awaited packaged startup path (`runStartupAssistantDocsReindex` ->
`ingestPackagedAssistantDocsV2`); `dockerStart.ts` stays the sole awaited
packaged startup owner and is never edited.

Exact ownership: this leaf edits `core/server/httpServer.ts` (one-line legacy
import/call removal), `core/services/assistant/docsIndexService.ts` (retired
source-root startup export removal), adds the focused Bun test
`tests/unit/server/httpServerDocsStartupRemoval.test.ts` (proves the import
graph/call is gone and only the awaited packaged path remains), and covers the
DB freeze in `tests/integration/server/assistantDocsIngestV2.test.ts` with:
trigger fixtures for every enumerated path (legacy INSERT/UPDATE/DELETE on
both tables rejected with `assistant_docs_v1_frozen` when the state is past
`v1_active`; no V2-shaped write on V1 exists in any state), old-binary
negative fixtures (a process running a pre-task binary performs legacy
`INSERT`, `UPDATE`, `DELETE`, and `INSERT ... ON CONFLICT (source_path) DO
UPDATE` upserts — all rejected with `assistant_docs_v1_frozen` once the state
is past `v1_active`, while its legacy READS of frozen V1 stay permitted;
attempted V1→V2, V2→V1 and cross-row UPDATE rewrites are rejected; after
activation the rogue old binary may only read stale frozen V1, never V2 rows
or mutate V1), table-lock fixtures
(the transition transaction's `SHARE ROW EXCLUSIVE` lock with
`SET LOCAL lock_timeout='5s'` drains in-flight legacy
writers before the CAS; a held writer makes the transition fail with the
bounded `assistant_docs_v1_freeze_lock_timeout` conflict and the operator
reruns — no automatic retry), race fixtures (a writer queued behind the lock runs
the trigger after release and fails before mutation), trigger idempotence
across replicas/restarts, and migration rollback behavior (rolling the
migration back
drops the triggers and the cutover/lifecycle artifacts; rolling back the
cutover row to `v1_active` keeps the triggers installed and re-permits legacy
writes). It does not edit `dockerStart.ts`, install a process hook, or claim
that dead legacy code is a valid retirement.

Fail-closed behavior:

- A missing/malformed/duplicate cutover row, unknown state, unknown consumer,
  conflicting deployment identity or rollout generation, CAS conflict on
  `(state, revision)`, missing evidence, missing/mismatched rollout receipt or
  failed gate keeps the current
  state; nothing advances and no read mixes eras.
- Before `v2_activated`, the direct V2 retriever `searchAssistantDocsDbV2` and
  every other V2-only consumer
  return the internal sentinel `assistant_docs_v2_consumer_not_ready` with
  zero evidence; the era-aware facade serves Guide over the ACL-covered frozen
  V1 corpus (one backend, never both) ONLY after TASK-548-03-L03's gated
  consumer cutover deploys it — until those facade bytes are deployed (through
  `v1_active`/`v1_frozen`/`building`/pre-backfill) the legacy service remains
  serving, and the legacy symbol continues to serve
  only the frozen V1
  legacy snapshot. Once the facade is deployed, every V1-era ready result uses
  the prepared/ACL snapshot identity named by the pointer's
  `legacy_acl_snapshot_id` as its exact authorization/evidence snapshot; a
  facade binary starting without that binding fails readiness with zero
  authorized rows (`assistant_docs_v2_consumer_not_ready`), which the
  canonical deploy order (freeze → backfill → parity → facade deployment →
  rollout receipt → consumer readiness → activation) prevents. After `v2_activated`, the legacy symbol denies V2 with the
  same sentinel until TASK-548-03-L03 removes it. There is no mixed V1/V2
  read in either direction, and V2 rows are invisible to old binaries.
- A fresh installation still walks the same six states
  (`v1_active → v1_frozen → backfill_complete → shadow_parity_clean →
  consumers_ready → v2_activated`; backfill over zero
  legacy rows and the empty shadow comparison complete immediately); there is
  exactly one code path.
- Rollback after activation is the explicit `v2_activated → v1_frozen`
  rollback row:
  `rollbackAssistantDocsV2CutoverV1` CAS-transitions with `expectedRevision`,
  increments `revision` and `rollout_generation`, demotes the active V2
  snapshot (`active → inactive` with `deactivated_at` set), clears
  `previous_v2_snapshot_id`, re-records the legacy scalar metadata pair,
  restores the frozen
  V1 pointer
  (`assistant_docs_v2_active_pointer` era `v1`, `snapshot_id` NULL), and
  atomically
  clears `consumers`, `rollout_receipt`, `backfill_finished_at`,
  `shadow_parity_run_id`/`shadow_parity_source_hash` and `activated_at` before
  any retry — while the trigger guards stay installed, the frozen V1 rows stay
  immutable and safely readable, and the pointer's `legacy_acl_snapshot_id`
  binding stays preserved so the facade keeps serving the frozen V1 corpus
  with exactly one backend (no Guide gap); it never re-enables mutable legacy
  writes and never
  rewrites source Markdown or guessing authorization.
- Resuming MUTABLE legacy V1 is a SEPARATE destructive/maintenance
  transition, never normal rollback:
  `rollbackAssistantDocsV2CutoverPreActivationV1` from any preactivation state
  (`v1_frozen | backfill_complete | shadow_parity_clean | consumers_ready`,
  including `v1_frozen` reached by the post-activation rollback row) to
  `v1_active`, with `expectedRevision`, `revision` AND
  `rollout_generation` increments, V2 artifact/evidence retirement (prepared/
  inactive rows become retention-eligible with `deactivated_at`; any
  never-served mid-flight `building` cohort is DISPOSED atomically — binding
  clear, pending `cutover_backfill` run CAS-failed, cohort deleted with
  cascades, pending slot/capacity freed — never `building → inactive`), the
  pointer's `legacy_acl_snapshot_id` binding CLEARED (Guide unavailable until
  a fresh freeze + backfill recreates the ACL), and legacy writes re-enabled
  only at `v1_active`. This transition is destructive/maintenance-only and is
  never described as or substituted for normal rollback.

Deploy/land order (serialized): (1) this leaf lands the migration (cutover row
initialized `v1_active`, the trigger guards on the legacy tables, the V2
snapshot lifecycle column/check (`activated_at`/`deactivated_at` CHECKs) plus
the immutable acyclic `producer_run_id` provenance FK (`ON DELETE RESTRICT`,
never deferrable), the three global
constant-expression
partial unique indexes (`building`/`prepared`/`active`), the run
exact status enum/`requested_at`/`terminal_at`/`actor_id`/`force`/`source_hash`
plus `request_kind`/`result_kind`/`changed`/`backfill_cursor`/
`backfill_progress`/`backfill_plan_sha256` columns and the ONE status-matrix
CHECK on `assistant_docs_v2_ingest_runs`, the `assistant_docs_v2_ingest_run_results`
and `assistant_docs_v2_legacy_acl` tables, the `assistant_docs_v2_activation_events`
table, `keywords_json` and the six product-version bound columns with CHECKs on
`assistant_docs_v2_documents`, the active-pointer row with
`previous_v2_snapshot_id` and the legacy scalar metadata columns, and the
cohesive `core/db/tables/assistantDocsV2.ts`
module with the separate V2 tables), the
legacy producer removal from `httpServer.ts`/`docsIndexService.ts` with its
focused tests, the resumable V2 backfill command, the shadow-parity command,
the fence helpers and pre-fence consumer refusals; (2) the operator runs the
freeze transition (`v1_active → v1_frozen` with the `SHARE ROW EXCLUSIVE` +
`SET LOCAL lock_timeout='5s'` drain), then the resumable cutover backfill command (it loads the
fixed packaged bundle once and materializes every V2 child row from that
bundle plus the exact in-memory plan — the immutable frozen V1 rows are read
only for legacy ACL classification and the shadow-parity baseline; the command
commits the
pending `cutover_backfill` run + sole `building` snapshot + ACL rows
first with the bounded cursor/progress/plan/sourceHash on the run, WITHOUT
touching the pointer's `legacy_acl_snapshot_id` (initial: stays NULL; source-
drift replacement: old valid binding retained), writes the
child batches in separate ≤500-row/4 MiB transactions (every batch binding
planSha/sourceHash) with CAS progress
updates, and in its final transaction verifies closure (including the
bundle-plan-persisted identity match) and atomically
transitions `building → prepared`, finalizes the terminal `prepared` run with
the exact `assistant_docs_v2_ingest_run_results` row, binds (initial) or
rebinds (replacement) the pointer's `legacy_acl_snapshot_id` to that complete
closed-ACL prepared snapshot, and advances
`v1_frozen → backfill_complete` itself; an explicit abort deletes the
never-served building snapshot cohort, marks the run `failed` with a bounded
safe diagnostic/cursor receipt, and frees capacity in the same transaction
while leaving any retained prior binding UNTOUCHED (an initial abort leaves
NULL)),
then shadow parity (or the fast
fresh-install
path); (3) TASK-548-03-L03 lands the consumer cutover (service/routes/tests
switch to the era-aware facade `searchAssistantDocsAuthoritativeV2`, which
keeps Guide available over the ACL-covered frozen V1 corpus before
activation) — this
cutover is DISPATCH/DEPLOY-GATED on the cutover row being EXACTLY
`shadow_parity_clean` (never merely at/past
`backfill_complete`) with exactly one complete prepared snapshot, the pointer's
closed `legacy_acl_snapshot_id` binding (non-NULL, naming the ACL-owning
snapshot), and facade code compatible with the row's
`deploymentIdentity`/`rolloutGeneration` — never a preexisting rollout
receipt, which is recorded only for that exact facade build AFTER it is
deployed on every replica; before those facade bytes are
deployed the legacy service remains serving Guide (including at
`v1_active`/`v1_frozen`/`building` — no facade binary is ever dispatched
pre-gate, and `backfill_complete` alone never authorizes the facade dispatch).
Once deployed, every V1-era ready result uses the
prepared/ACL snapshot identity named by `legacy_acl_snapshot_id` as its exact
authorization/evidence snapshot, and a facade binary starting without that
binding fails readiness with zero authorized rows; the operator then records
the exact bounded deployment rollout receipt for that exact facade build
(`servingBuildSha256`, zero serving V1-only replicas), which remains the
mandatory evidence for `consumers_ready` and activation — the canonical deploy order
(freeze → backfill → parity → facade deployment → rollout receipt → consumer
readiness → activation) prevents an availability gap; first-start,
pre-backfill and serialized-deployment fixtures pin this contract.
The facade dispatch happens inside TASK-548-08's deploy-gated facade phase
(`task548-foundation-migration-resume`), which verifies the exact
committed/deployed foundation bytes and the EXACT `shadow_parity_clean` DB
state before any 02/03 dispatch, and the consumer-cutover phase
(`task548-consumer-cutover-resume`) verifies the exact facade deployment, the
rollout receipt for that build, consumers ready, and the DB state EXACTLY
`v2_activated` before any 04/05/06 dispatch.
Then every consumer declares readiness idempotently against that
`rolloutGeneration`; (4) the operator runs
`bun scripts/docs/activate-assistant-docs-v2-cutover.ts` (from
`consumers_ready` only; anything else fails closed; the activation transaction
proves the pointer era is `v1`, promotes the sole prepared row, switches the
pointer with `previous_v2_snapshot_id` NULL, and inserts the exact
`cutover_activation` event while the source prepared run stays terminal as
`prepared`; activation/rollback switch ONLY the DB pointer — the facade and the
closed ACL stay in place, so Guide remains available on both sides of the
switch); (5) post-activation
reindex uses the normal per-run activation transaction with the fence asserted
unchanged (one-active ordering: demote the prior active row, then insert the
new active row, then update pointer/predecessor and finalize the current run);
(6) rollback uses `bun scripts/docs/rollback-assistant-docs-v2-cutover.ts`
(exact `v2_activated → v1_frozen` row, revision and rollout-generation
increments, active-V2 demotion, evidence clear,
frozen V1 pointer restore with the trigger guards, the frozen V1 rows, the
`legacy_acl_snapshot_id` binding and the facade kept in place — V1 stays
immutable and safely readable, no Guide gap, no re-enabled legacy writes),
the destructive legacy-resume transition
(`rollbackAssistantDocsV2CutoverPreActivationV1` from any pre-fence state —
including `v1_frozen` after the post-activation rollback — back to
`v1_active`, which CLEARS the ACL binding and marks Guide unavailable until a
fresh freeze + backfill recreates it; never the normal rollback path), and
the executable source-drift reset
(`resetAssistantDocsV2CutoverSourceDriftV1` from
`backfill_complete`/`shadow_parity_clean`/`consumers_ready` back to
`v1_frozen`, retiring the prepared snapshot (`prepared → inactive`) and
DISPOSING any mid-flight `building` cohort (run CAS-failed,
cohort delete with cascades, capacity freed — never `building → inactive`;
the never-bound cohort is never named by the pointer, so its disposal never
touches the retained `legacy_acl_snapshot_id` binding)
while clearing evidence and receipt before the SAME backfill command reruns,
whose durable start RETAINS the old binding and whose FINAL transaction
rebinds the pointer to the new complete closed-ACL snapshot).

### Exact ingest retention, capacity, and pruning policy

This leaf exports one `ASSISTANT_DOCS_INGEST_RETENTION_POLICY_V2` with exact
PostgreSQL-UTC clocks and constants: prune batch `100`, terminal ingest-run
retention `30 days` from `terminal_at`, activation-event retention
`30 days` from `event_at`, and inactive snapshot retention
`30 days` from `deactivated_at`. Reads and searches never refresh a retention clock.
It also exports one `ASSISTANT_DOCS_INSTALLATION_CAPACITY_V2`: at most `64`
retained snapshots, `4 GiB` aggregate canonical persisted bytes across EVERY
retained V2 lifecycle state (`building` + `prepared` + `active` + `inactive`
snapshots — a mid-flight `building` snapshot counts toward both ceilings
exactly like a complete one), and
`10,000` retained ingest runs. A same-source-hash
`force:true` is accepted at most once per rolling hour (cooldown keyed on the
loaded bundle's `sourceHash` and checked only after the bundle is loaded).

Every snapshot row stores exact `canonical_persisted_bytes`, calculated from the
same normalized rows/UTF-8 framing that insertion uses and rechecked after
write. Capacity reads use exactly one pinned bounded counter query over
`assistant_docs_v2_snapshots` —
`SELECT count(*) AS retained_snapshot_count, coalesce(sum(canonical_persisted_bytes), 0) AS aggregate_bytes FROM assistant_docs_v2_snapshots WHERE lifecycle IN ('building','prepared','active','inactive')`
(covering every retained lifecycle state) plus the indexed run count; they
never cast JSON, never `SELECT *`, and never scan document/chunk bodies.
Admission runs under
the same advisory lock, loads the fixed bundle exactly once, and computes its
`sourceHash` and the complete plan's exact persisted bytes BEFORE any
hash-specific cooldown check and BEFORE capacity admission:

1. before bundle load or run allocation, reconcile the sole pending run, run at
   most four oldest-first eligible prune batches, then check the run-count
   ceiling and pending-run state. A still-full run budget fails
   `assistant_docs_capacity_exceeded` with zero bundle load/allocation. The
   snapshot-count and aggregate-byte ceilings are intentionally NOT checked
   here: a same-hash no-op consumes zero snapshots/bytes and must not be
   blocked by them;
2. the preactivation producer gate ran first (see the preactivation producer
   rules): this admission path is reached only for post-backfill prepared
   reuse or post-activation outcomes. After the one fixed bundle is loaded and
   normalized, compute its
   `sourceHash` and the plan's exact `canonicalPersistedBytes`, then:
   a. enforce the `force:true` same-hash rolling-hour cooldown keyed on that
      `sourceHash` (applies to `force:true` even when the prepared snapshot is
      reused);
   b. resolve the active pointer AND the one complete prepared
      snapshot (the global `lifecycle = 'prepared'` invariant allows at most
      one, for any source hash) (both read under the advisory lock before
      run allocation and re-verified inside the allocating transaction) and
      compute the exact deltas:
      - `unchanged`: fence passed, `force:false`, active hash equals the
        bundle hash → `additionalSnapshots: 0, additionalBytes: 0,
        additionalRuns: 1`;
      - `prepared` reuse: fence not passed, state is at or past
        `backfill_complete`, one complete prepared snapshot for
        the bundle hash already exists → `additionalSnapshots: 0,
        additionalBytes: 0, additionalRuns: 1` for both `force:false` and
        `force:true`;
      - preactivation drift: fence not passed, state at/past
        `backfill_complete`, prepared hash differs → NO deltas and the public
        `assistant_docs_cutover_required` conflict (mapped HTTP 409) before
        run allocation or any
        snapshot write;
      - `prepared` new is NOT REACHABLE through startup/manual ingest: the
        cutover backfill command is the sole preactivation producer and
        computes the identical one-snapshot/one-run deltas internally under
        the same lock (`additionalSnapshots: 1, additionalBytes: <exact plan
        canonicalPersistedBytes>, additionalRuns: 1`; a prior different-hash
        prepared snapshot is atomically retired (`prepared → inactive`) inside
        the same durable start transaction before the new `building` row
        is inserted — because the capacity aggregate covers every retained
        lifecycle state, the retired snapshot was already counted and only the
        new snapshot's exact persisted bytes enter `additionalBytes`);
      - `activated` new: fence passed, no matching active snapshot →
        `additionalSnapshots: 1, additionalBytes: <exact plan
        canonicalPersistedBytes>, additionalRuns: 1`;
   c. in the allocating dedicated-session transaction, re-read the fence, the
      active/prepared identity and all counters, recompute and assert the exact
      same deltas, then allocate the pending run and snapshot only after
      admissibility. No pruning occurs after this check, no capacity
      failure creates a run, and the run is allocated only after admissibility.

A same-hash `unchanged` no-op and a same-hash `prepared` reuse therefore never
consume snapshot/byte budget and succeed even at a full snapshot or byte
ceiling; a new building/prepared/activated snapshot consumes exactly one
snapshot and
its exact persisted bytes; a `force:true` same-hash run inside the rolling-hour
cooldown fails before run allocation even when it would reuse the prepared
snapshot. Duplicate building/prepared snapshots are prevented by explicit DB
invariants: the global constant-expression partial unique indexes
`assistant_docs_v2_snapshots_building_once_key ((true)) WHERE
lifecycle = 'building'` and
`assistant_docs_v2_snapshots_prepared_once_key ((true)) WHERE
lifecycle = 'prepared'` permit at most one building and one prepared V2
snapshot installation-wide, so two concurrent
pre-fence producers can never create two building/prepared snapshots (any
source hash);
a different-hash pre-fence backfill must first atomically retire the current
prepared snapshot, and
the constraint race maps to the existing reconciliation path, never a second
snapshot.

This prevents a ceiling deadlock: eligible terminal rows/snapshots are pruned
before admission, while an installation with no eligible space fails explicitly
without deleting protected evidence. The active snapshot and its normalized
rows are never eligible; a `building` snapshot is never eligible while its
`cutover_backfill` run is still pending. The exact immediate predecessor named
by the active
pointer's `previous_v2_snapshot_id` is the sole automatic rollback pin and
remains ineligible until a newer
activation replaces it. The snapshot currently named by the active pointer's
`legacy_acl_snapshot_id` (the durable binding to the snapshot owning the
CLOSED `assistant_docs_v2_legacy_acl` the V1-era facade joins) is excluded
from retention eligibility alongside the active, immediate-predecessor,
building/prepared and pending pins: the ACL pin is PRESERVED through
activation, replacement activations, the `v2_activated → v1_frozen` rollback
row and source drift, so the facade keeps serving the frozen V1 corpus through
every pointer switch and preactivation rollback; the named snapshot is
released from the pin only by an atomic switch to a newly closed ACL (the
source-drift rerun's FINAL `building → prepared` transaction rebinds
`legacy_acl_snapshot_id` to the new complete closed-ACL snapshot — its
durable start RETAINS the old binding while the new building cohort/ACL is
assembled, so the pin survives the whole replacement backfill)
or by an explicit rollback-retirement (the destructive
legacy-resume transition clears the binding in the SAME
transaction that deletes/retires the named cohort; the abort transaction
never clears a retained binding — a never-bound building cohort is not named,
an initial abort leaves NULL) — no automatic path
releases it. Other inactive snapshots become eligible at exactly
`deactivated_at + 30 days`.
An outcome-unknown `pending` run and the exact snapshot/run identities needed by
its reconciliation are never automatically pruned. Terminal runs become
eligible at `terminal_at + 30 days` only when they are not the active or
immediate-predecessor
run, no pending reconciliation references them, AND no retention pin applies:
a run is pinned while any retained snapshot (any `building`/`prepared`/`active`/
`inactive`
lifecycle state) names it as `producer_run_id`, while the one prepared or
building snapshot
state exists, while the active pointer's `legacy_acl_snapshot_id` binding names
a retained snapshot (the ACL-pinned snapshot is ineligible, so its producer run
stays pinned with it), or while any unexpired
`assistant_docs_v2_activation_events` row
references it via `run_id`; `assistant_docs_v2_activation_events`
rows become eligible at `event_at + 30 days` and are themselves never pinned.
The FK graph is ACYCLIC and the delete semantics are exact: every
snapshot-owned child table (`documents`, `sections`, `chunks`, `visuals`,
`examples`, `capability_relations`, `capability_relation_members`,
`assistant_docs_v2_legacy_acl`) and every
`assistant_docs_v2_ingest_run_results` row cascades with its snapshot
(`ON DELETE CASCADE`), and each run-result row cascades with its run; the
remaining RESTRICT FKs are `snapshots.producer_run_id` → runs and
`activation_events.snapshot_id`/`activation_events.run_id`. The exact cohort
prune order is therefore events → snapshot (children and result rows cascade)
→ now-unreferenced producer run; ordinary expired reuse/failed runs delete
with their result rows cascading, and any out-of-order delete fails
closed instead of orphaning provenance. V2 defines
no operator/legal
hold table or implicit indefinite hold; a future hold product requires its own
schema/API/security task rather than an unowned predicate. Eligibility queries
use the partial indexes `assistant_docs_v2_snapshots_inactive_eligible_idx
(deactivated_at ASC, snapshot_id ASC) WHERE lifecycle = 'inactive'`,
`assistant_docs_v2_ingest_runs_terminal_eligible_idx (terminal_at ASC, run_id ASC)
WHERE status <> 'pending'`, and
`assistant_docs_v2_activation_events_retention_idx (event_at ASC, event_id ASC)`.
The pointer-named pins cannot live in a partial index on
`assistant_docs_v2_snapshots` (a partial-index predicate may reference only the
indexed table), so the snapshot selector's exact SQL predicate additionally
excludes them.

Every prune selector repeatedly claims the oldest currently eligible stable
per-table `(eligible_at ASC, <PK>)` page — `(deactivated_at, snapshot_id)` for
snapshots, `(terminal_at, run_id)` for runs, `(event_at, event_id)` for events
— of at most 100 with `FOR UPDATE SKIP LOCKED`,
selects only consumed columns, and deletes in FK-safe set-based batches in the
events → snapshots → runs cohort order (children and run-result rows cascade
with their snapshot; a producer run is deleted only after no retained snapshot
names it, so its RESTRICT pin is already gone). The snapshot selector reads the
single-row `assistant_docs_v2_active_pointer` and excludes every pinned
identity in its exact eligibility predicate — the active `snapshot_id`, the
immediate predecessor `previous_v2_snapshot_id`, the `legacy_acl_snapshot_id`
ACL-binding pin (the snapshot currently named by the binding stays ineligible
while bound, through activation/replacement/rollback/source drift, until the
atomic rebind to a newly closed ACL or the destructive legacy-resume clear —
the sole clear path; an explicit abort never updates the binding), every
`lifecycle IN ('building','prepared')` snapshot (already outside
the `lifecycle = 'inactive'` eligible pool) and every snapshot/run identity a
pending reconciliation references — so the pruner never selects a protected or
still-served snapshot, no out-of-order delete repeatedly fails on the
pointer's `ON DELETE RESTRICT` FK, and the ACL snapshot is never deleted while
bound. A
persisted cursor is cycle-local only: reaching the end starts a fresh oldest-
eligible cycle, so a row skipped under a concurrent lock is eventually revisited
instead of being permanently passed. Crash recovery may repeat a batch but can
never skip one; idempotent delete/receipt semantics absorb the repeat. The
internal operator command
`bun scripts/docs/prune-assistant-docs-v2.ts --max-batches <1..100>` uses the
same selector and advisory-lock owner, prints bounded counts only, and cannot
override eligibility.

Ship concurrent-lock/eventual-prune, stable-pagination, fixed-query-count,
persisted-byte parity and sanitized representative small/large
`EXPLAIN (ANALYZE, BUFFERS)` tests. Retention-eligibility fixtures pin the exact
`deactivated_at + 30d` (inactive snapshots), `terminal_at + 30d` (terminal
runs) and `event_at + 30d` (activation events) clocks plus the active,
immediate-predecessor (`previous_v2_snapshot_id`), the ACL-binding
(`active_pointer.legacy_acl_snapshot_id` — the snapshot currently named by the
binding stays ineligible while bound), pending/pending-referenced,
producer-run (`snapshots.producer_run_id` over every retained lifecycle state,
including the building/prepared states) and unexpired-event-run
(`activation_events.run_id`) pins, and prove the events → snapshots → runs
cohort prune order plus `ON DELETE CASCADE` child/result propagation and
`ON DELETE RESTRICT` failures for every out-of-order delete. Exact ACL-pin
fixtures prove the binding is PRESERVED through activation, replacement
activations and the `v2_activated → v1_frozen` rollback row (the ACL-owning
snapshot stays retained and the V1 facade keeps serving on both sides of every
pointer switch), through the source-drift reset and the whole replacement
rerun (the retired prepared ACL
snapshot stays pinned until the rerun's FINAL `building → prepared`
transaction atomically
rebinds `legacy_acl_snapshot_id` to the new complete closed-ACL snapshot;
the rerun's durable start never touches the retained binding), and that the
snapshot selector excludes the bound identity so a pruner run past the bound
snapshot's `deactivated_at + 30d` repeatedly finds zero eligible ACL rows —
never a repeated `ON DELETE RESTRICT` failure and never an ACL deletion; the
binding is cleared ONLY by the destructive legacy-resume transition, which
deletes/retires the named cohort in the same transaction that clears the
binding (an explicit `--abort` NEVER updates the binding — it deletes only the
never-bound building cohort — and the source-drift rerun's atomic rebind
switches the pin), and
after an explicit release (destructive legacy-resume clear, or the source-drift
rerun's atomic rebind) the retired ACL-owning snapshot becomes eligible only at
the exact `deactivated_at + 30d` clock.
Admission fixtures hit each ceiling, create
newly eligible rows at a full ceiling, and prove pre-admission pruning permits
the next run while active, immediate-predecessor, ACL-pinned
(`active_pointer.legacy_acl_snapshot_id`), pending, producer-pinned and
ambiguous evidence
remain untouched. Capacity-counter fixtures pin the exact bounded aggregate
query over every retained lifecycle state (`building` + `prepared` + `active` +
`inactive`),
prove a building/prepared snapshot counts toward both ceilings exactly like an
active
one, and prove the backfill command's different-hash `building` replacement
atomically retires the
prior prepared before inserting (never a second building/prepared row, never a
duplicate-byte charge), while startup/manual ingest at the same states only
ever reuses (`additionalSnapshots: 0`) or fails with the public
`assistant_docs_cutover_required` conflict.

### Exact no-cache and startup-cutover owner

This leaf is the sole TASK-548 writer of
`core/server/startupAssistantDocs.ts` and
`tests/vitest/server/startupAssistantDocs.test.ts`. The existing
`runStartupAssistantDocsReindex()` export remains the stable zero-required-
argument entry used unchanged by `core/server/dockerStart.ts`; this leaf does not
edit `dockerStart.ts`. Startup removes its source-root walk/fingerprint, settings
state row and two-int startup-only lock. It may inspect the existing enable/skip
environment flag only to decide whether to call
`ingestPackagedAssistantDocsV2({ actorId: null, force: false, signal,
requestKind: "startup" })`; no
source-root, cwd, image-version or caller bytes/path can reach ingest, and the
`signal` is the server-owned timeout-only composition
(`composeAssistantDocsIngestAbortSignalV1()`); startup adds no
lifecycle/shutdown signal because `dockerStart.ts` precedes the runtime
entrypoint. At `v1_active`/`v1_frozen` that call returns the bounded internal
`deferred_cutover_backfill` result (startup logs it; the sole preactivation
producer is the cutover backfill command); at the later preactivation states it
may only same-hash reuse the existing prepared snapshot, and a changed packaged
hash returns the public `assistant_docs_cutover_required` conflict. A configured legacy
source-root override fails as `assistant_startup_docs_source_override_forbidden`
before filesystem or DB mutation rather than being ignored.

Because Guide data can be permission-gated, this leaf deliberately creates no
server-cache family, invalidation outbox, worker, scheduler, timer, lifecycle
participant, Pub/Sub event, or browser `cacheBus` message. Startup performs only
the one awaited packaged ingest call above. Per-question readiness, active
identity, publication eligibility and RBAC are resolved from PostgreSQL; cache
configuration and Redis availability cannot change Guide correctness.

### Server-owned cancellation composition and session separation

This leaf owns the Bun-free `core/services/assistant/assistantDocsAbortSignal.ts`
with exact exports:

```ts
export const ASSISTANT_DOCS_INGEST_TIMEOUT_MS = 120_000 as const;
export const ASSISTANT_DOCS_INGEST_RECONCILIATION_TIMEOUT_MS = 15_000 as const;
export const ASSISTANT_DOCS_INGEST_STATEMENT_TIMEOUT_MS = 30_000 as const;
export function composeAssistantDocsIngestAbortSignalV1(input: {
  timeoutMs?: number;
}): AbortSignal; // AbortSignal.timeout(timeoutMs); never retains a timer
```

The composition is timeout-owned only and is the only ingest cancellation
signal: both startup and the reindex route build exactly
`composeAssistantDocsIngestAbortSignalV1()` (the default
`ASSISTANT_DOCS_INGEST_TIMEOUT_MS`). There is no process-lifecycle or
request-disconnect signal to compose: `dockerStart.ts` runs before the runtime
entrypoint exists and the Admin router context carries no request
`AbortSignal`, so claiming either would be unimplementable. No signal is passed
into the fixed loader: `loadPackagedDocsDistributionBundleV2()` stays
zero-argument, and the caller checks `signal.aborted` immediately before the
call and immediately after it returns (before using the returned bundle);
`assertNotAborted(signal)` after the one bounded load fails closed as
`assistant_docs_ingest_failed` (`cancelled`). An abort during any phase fails
closed with the bounded `assistant_docs_ingest_failed` safe reason `cancelled`,
never a partial snapshot or active-pointer change, and the advisory lock
releases per TASK-551 semantics. There is no extra signal handler or lifecycle
participant.

Session separation is exact and reuses terminal TASK-551's
`withDedicatedDatabaseSession` and `withDedicatedDatabaseAdvisoryLock` unchanged
(this leaf never amends TASK-551 and
never uses `lockSession` for mutation or reconciliation):

- the advisory-lock callback's `lockSession` owns ONLY lock/liveness:
  `lockSession.assertAlive(signal)` at phase boundaries; it executes no
  statement and runs no transaction;
- pending-run allocation commits in its OWN independent work session reserved
  via `withDedicatedDatabaseSession` (its own bounded transaction, see the
  durable-pending-run protocol below);
- snapshot mutation plus CAS terminal run finalization uses a LATER independent
  work session reserved via `withDedicatedDatabaseSession`;
- every read helper (pending preflight, prune, run budget, cooldown, ingest
  identity, capacity projection) reserves its own short-lived
  `withDedicatedDatabaseSession` read-only session;
- on error or ambiguous COMMIT, after the failed session has confirmed
  rollback or termination (its `withDedicatedDatabaseSession` finally block
  runs `cancelActiveAndRollback`), the ingest reserves a FRESH independent
  work session for one read-only repeatable-read reconciliation while
  `lockSession` remains alive and healthy, awaited with
  `composeAssistantDocsIngestAbortSignalV1({ timeoutMs:
  ASSISTANT_DOCS_INGEST_RECONCILIATION_TIMEOUT_MS })` — a bounded
  reconciliation-only timeout so the caller timeout can never leave outcome
  unknown without an attempted settlement; no detached/unawaited work exists.

Guide ingest therefore requires and validates a two-session maintenance
budget (`lock owner + one independent work/reconcile session concurrently`)
in ALL modes through terminal TASK-551-02-L02's exact public
`assertDedicatedDatabaseSessionBudget` helper:
`off + primary` requires `DB_POOL_MAX >= 3` (two dedicated sessions plus one
retained ordinary-query headroom slot); `direct|session` requires a
maintenance pool of at least 2 while the primary keeps its own headroom;
`transaction + primary` remains unavailable. `assertAssistantDocsIngestSessionBudgetV2()`
wraps that exact shared helper and runs before any bundle
read or run allocation, mapping incapability
(`database_maintenance_session_unavailable`) to `assistant_docs_db_unavailable`;
a pool-one primary receives an explicit not-ready/startup failure, never a
process mutex or unsafe pooled fallback.

Exact caller/dependency signatures (all include the signal; none pass it to
the loader):

```ts
ingestPackagedAssistantDocsV2(input: {
  actorId: string | null; force?: boolean; signal: AbortSignal;
  requestKind?: "startup" | "manual"; // persisted as the run's request_kind
                                      // (default "manual")
}): Promise<AssistantDocsIngestResultV2>;
ingestDocsDistributionBundleV2(inputBundle: DocsDistributionBundleV2, input: {
  actorId: string | null; force: boolean;
  requestKind: "startup" | "manual" | "cutover_backfill";
  lockSession: DedicatedDatabaseSession;
  signal: AbortSignal; plan: AssistantDocsSnapshotPlanV2;
  admissionDeltas: { additionalSnapshots: 0 | 1; additionalBytes: number; additionalRuns: 1 };
}): Promise<AssistantDocsIngestResultV2>;
// TASK-548-03-L03-owned service/route signatures:
AssistantServiceDeps["ingestPackagedAssistantDocsV2"] // includes signal: AbortSignal
reindexAssistantDocs(input: { actorId?: string | null; force?: boolean; signal: AbortSignal }, overrides?)
```

`ingestDocsDistributionBundleV2` is the internal persistence core invoked ONLY
by the guarded post-cutover producer: the packaged
entrypoint `ingestPackagedAssistantDocsV2` (which loaded the
fixed packaged bundle exactly once and built its own plan/admission data
internally). The cutover backfill command `migrate-assistant-docs-v2.ts` is the
SOLE preactivation producer but does NOT route its children through this core's
Phase A/B: it owns the resumable durable-start + child-batch + closure
transactions (`runCutoverAssistantDocsBackfillV2`) and invokes the shared
capacity/admission delta helpers only for its `prepared-new` projection. The
TASK-548-01
compiler/promote/check flow never calls it
directly; no caller outside those guarded producers may supply
`plan`/`admissionDeltas`.

TASK-548-03-L03 is the serialized consumer-cutover owner for
`assistantService.ts`/`assistantRoutes.ts`/tests only: it switches them to V2
and proves no second Markdown producer/startup call remains. That switch is
DISPATCH/DEPLOY-GATED: it may dispatch only when the persisted cutover row is
EXACTLY `shadow_parity_clean` (never merely at/past
`backfill_complete`) with exactly one complete prepared snapshot, the
pointer's closed `legacy_acl_snapshot_id` binding, and facade code compatible
with the row's `deploymentIdentity`/`rolloutGeneration` — never a preexisting
rollout receipt (the receipt is recorded for that exact facade build after
deployment and stays mandatory for `consumers_ready`/activation); before those facade bytes are deployed the legacy service
remains serving Guide (including through `v1_active`/`v1_frozen`/`building`).
Once deployed, the facade's V1 ready result uses the prepared/ACL snapshot
identity as its exact authorization/evidence snapshot, and a facade binary
starting without the binding fails readiness with zero authorized rows — the
canonical deploy order prevents an availability gap (first-start,
pre-backfill and serialized-deployment fixtures pin this contract). The facade
dispatch belongs to TASK-548-08's deploy-gated facade phase
(`task548-foundation-migration-resume`), which verifies the committed/deployed
foundation bytes and the EXACT `shadow_parity_clean` DB state first; the
consumer-cutover phase (`task548-consumer-cutover-resume`) verifies the exact
facade deployment, the rollout receipt for that build, consumers ready and the
DB state EXACTLY `v2_activated` before any 04/05/06 dispatch. The legacy startup
producer removal from `core/server/httpServer.ts` and
`core/services/assistant/docsIndexService.ts` is owned by this leaf before the
V1 freeze (see the V1 freeze gate section); this leaf does not edit
`dockerStart.ts` or install a process hook.

## Server Permission Filtering Contract

This leaf owns the Bun-free/server-only permission snapshot normalizer and
evaluator in a focused
`core/services/assistant/docsPermissionSnapshot.ts` module. It also owns the
required permission-aware signature and implementation of
`searchAssistantDocsDbV2` in `docsDbRetriever.ts` while preserving the bounded
legacy symbol only for the compile-green cutover described below.
TASK-548-03-L03 later wires the
authenticated route and service to these pure exports; no browser-supplied
context is a trusted permission source.

The exact exported contract is:

```ts
export type AssistantDocsPermissionSnapshotV1 = {
  state: "ready";
  permissions: readonly string[];
};

export function normalizeAssistantDocsPermissionSnapshotV1(
  value: unknown
): AssistantDocsPermissionSnapshotV1;

export function satisfiesAssistantDocsPermissionRequirementV1(
  requirement: DocsPermissionRequirementV1 | null,
  snapshot: AssistantDocsPermissionSnapshotV1
): boolean;

export function authorizesAssistantDocsDocumentV2(
  disposition: "eligible" | "deny_all",
  requirement: DocsPermissionRequirementV1 | null,
  snapshot: AssistantDocsPermissionSnapshotV1
): boolean;

export type AssistantDocsSnapshotIdentityV2 = Readonly<{
  snapshotId: string;
  generation: number;
  sourceHash: string;
  corpusVersion: string;
}>;

// UNRANKED base: the complete PERSISTED evidence record. It carries the full
// persisted chunk identity (chunkId/headingPath/lineStart/lineEnd/content/
// normalizedText/tokenCount/tokenCounts) plus document/section/metadata and
// never contains query-derived fields. headingPath is the bounded ORDERED
// array exactly (never a scalar string); tokenCounts is MANDATORY and bounded
// — the normalizer rejects missing/malformed values and nothing derives or
// repairs them.
export type AssistantDocsLocalizedEvidenceV2 = Readonly<{
  schema: "coderso.assistant-docs-localized-evidence@v2";
  snapshot: AssistantDocsSnapshotIdentityV2;
  document: Pick<
    DocsDocumentV2,
    | "docId" | "locale" | "slug" | "title" | "summary" | "sourcePath"
    | "productVersionRange" | "adminPath" | "permissionRequirement"
    | "capabilityIds" | "publicationTargets"
  > & {
    documentSha256: string;
    authorizationDisposition: "eligible";
  };
  section: Pick<DocsSectionV2, "sectionId" | "heading" | "level">;
  chunk: {
    chunkId: string;           // stable deterministic chunk identity
    chunkIndex: number;
    headingPath: readonly string[]; // bounded ORDERED heading chain; never scalar
    heading: string;
    content: string;           // persisted chunk body (assistant_docs_v2_chunks.content)
    lineStart: number;
    lineEnd: number;
    normalizedText: string;
    tokenCount: number;
    tokenCounts: Readonly<Record<string, number>>; // bounded exact per-lexeme counts;
                                                   // mandatory, no fallback
  };
  visuals: readonly (DocsVisualV1 & { docId: string; locale: string })[];
  examples: readonly (DocsExampleV1 & { docId: string; locale: string })[];
}>;

// RANKED wrapper: extends/wraps the exact unranked base with the query-derived
// fields needed by the current DocsSearchHit contract (see the Guide composer
// adapter in TASK-548-03-L03). Search-result records use this wrapper; relation
// sections use the unranked base and never invent score/query terms.
export type AssistantDocsRankedLocalizedEvidenceV2 = Readonly<
  AssistantDocsLocalizedEvidenceV2 & {
    snippet: string;
    score: number;
    matchedTerms: readonly string[];
    rankingSignals: Readonly<{
      textScore: number;
      domainScore: number;
      intentScore: number;
      phraseScore: number;
      domainPenalty: number;
      matchedQueryCoverage: number;
    }>;
  }
>;

export type AssistantDocsDbSearchOptionsV2 = {
  topK?: number;
  candidateLimit?: number;
  minScore?: number;
  searchContext: AssistantDocsGuideSearchContextV1;
  includeSelectedSectionRelations?: boolean;
  maxRelations?: number;
};

export type AssistantDocsSearchLimitsV2 = {
  topK: number;
  candidateLimit: number;
  minScore: number;
  includeSelectedSectionRelations: boolean; // relation enablement lives ONLY
  // in the normalized search limits/options — never on searchContext
  maxRelations: number;
};

export function normalizeAssistantDocsSearchLimitsV2(
  options: Pick<AssistantDocsDbSearchOptionsV2,
    "topK" | "candidateLimit" | "minScore" |
    "includeSelectedSectionRelations" | "maxRelations">,
  bounds: {
    defaultTopK: number; maxTopK: number;
    defaultCandidateLimit: number; maxCandidateLimit: number;
    defaultMinScore: number; defaultMaxRelations: number; maxRelations: number;
  }
): AssistantDocsSearchLimitsV2;

export type AssistantDocsDbSearchResultV2 =
  | Readonly<{ state: "empty_query"; records: readonly [] }>
  | Readonly<{
      state: "ready";
      snapshot: AssistantDocsSnapshotIdentityV2;
      records: readonly AssistantDocsRankedLocalizedEvidenceV2[];
      relations: readonly AssistantDocsAuthorizedCapabilityRelationV1[];
    }>;

export type AssistantDocsCapabilityRelationQueryV1 =
  | Readonly<{ kind: "atomic"; controlIds: readonly string[] }>
  | Readonly<{ kind: "workflow"; workflowIds: readonly string[] }>
  | Readonly<{
      kind: "sections";
      sections: readonly DocsCapabilitySectionIdentityV1[];
    }>;

export type AssistantDocsAuthorizedCapabilityRelationV1 = Readonly<{
  relationKind: "atomic" | "workflow";
  relationId: string;
  productAreaCapabilityId: DocsCapabilityIdV1;
  expectedOutcome: string | null;
  orderedAtomicControlIds: readonly string[];
  sections: readonly AssistantDocsLocalizedEvidenceV2[]; // unranked base only
}>;

export function normalizeAssistantDocsSnapshotIdentityV2(
  value: unknown
): AssistantDocsSnapshotIdentityV2;

export function normalizeAssistantDocsLocalizedEvidenceV2(
  value: unknown
): AssistantDocsLocalizedEvidenceV2;

export function normalizeAssistantDocsRankedLocalizedEvidenceV2(
  value: unknown
): AssistantDocsRankedLocalizedEvidenceV2;

export function assertEveryEvidenceMatchesSnapshotIdentityV2(
  records: readonly AssistantDocsLocalizedEvidenceV2[],
  snapshot: AssistantDocsSnapshotIdentityV2
): void;

export function searchAssistantDocsDbV2(
  query: string,
  options: AssistantDocsDbSearchOptionsV2
): Promise<AssistantDocsDbSearchResultV2>;

// Era-aware authoritative facade (deployed by TASK-548-03-L03 before
// activation through the gated consumer cutover): statement 1 resolves the
// active pointer AND the persisted cutover row inside its own result in ONE
// read-only repeatable-read transaction and selects EXACTLY ONE backend —
// when the pointer era is `v1` (before activation or after rollback) a bounded
// V1 query over the frozen `assistant_docs`/`assistant_doc_chunks` rows that
// JOINS `assistant_docs_v2_legacy_acl` on `source_path` (returning that ACL
// snapshot's identity as the ready result's exact authorization/evidence
// snapshot) and applies SQL
// authorization (`authorization_disposition`, `permission_requirement` against
// `searchContext.permissionSnapshot`, and the `assistant` AND `embedded-help`
// publication-target conjunction) BEFORE title/body projection and `LIMIT`;
// when the pointer era is `v2` it delegates to the V2 retriever. It NEVER
// queries or falls back to both backends and performs NO separate
// era/pointer preflight read. Guide remains available through the
// whole cutover: activation/rollback switch ONLY the DB pointer.
export function searchAssistantDocsAuthoritativeV2(
  query: string,
  options: AssistantDocsDbSearchOptionsV2
): Promise<AssistantDocsDbSearchResultV2>;

export function lookupAuthorizedAssistantDocsCapabilityRelationsV1(input: {
  snapshot: AssistantDocsSnapshotIdentityV2;
  query: AssistantDocsCapabilityRelationQueryV1;
  searchContext: AssistantDocsGuideSearchContextV1; // single permission/locale/
  // productVersion/capability owner for every related document/member
  maxRelations: number;
}): Promise<readonly AssistantDocsAuthorizedCapabilityRelationV1[]>;
```

The snapshot normalizer is recursively exact-key and accepts only the displayed
`state: "ready"` object. It validates permissions against
`listPermissionIds()` from the canonical permission catalog, rejects unknown
values, duplicates, missing/malformed arrays, unknown keys and every wildcard
mix, and returns a unique sorted array. The exact sole-member `["*"]` is the
only wildcard form. Ready `[]` is valid. A missing/malformed input throws the
typed machine error `assistant_docs_permission_snapshot_invalid` before any DB
query, hit, source, visual or example lookup.

`authorizesAssistantDocsDocumentV2` returns false for `deny_all` before wildcard
or requirement evaluation; even exact `permissions: ["*"]` cannot satisfy it.
For `eligible`, the evaluator first normalizes the exact owner
`DocsPermissionRequirementV1 | null`. Null succeeds for a ready empty snapshot;
the normalized non-null shape is exactly
`{ mode: "allOf" | "anyOf"; permissions: string[] }`. Mode `allOf` requires
every entry in `permissions`; mode `anyOf` requires at least one; and sole
`["*"]` satisfies either non-null form. The owner normalizer rejects an unknown
mode before evaluation. Empty authored non-null arrays, unknown permissions and
authored `*` remain invalid.

`searchAssistantDocsDbV2` has no permissionless overload or default snapshot
and no duplicated permission option: the strict `options.searchContext` is the
single owner of the permission snapshot, locale, product version, capability
context and bounded query. The retriever normalizes `options.searchContext`
through `normalizeAssistantDocsGuideSearchContextV1` and asserts the normalized
`searchContext.query` equals the normalized `query` argument BEFORE the
tokenless and SQL branches (context/query drift and every invalid context field
fail closed with `assistant_docs_search_context_invalid` before any statement).
It imports terminal TASK-551's exact query normalizer, one-CTE prefix tsquery,
reranker and candidate ceilings without copying their expressions, and imports
the exact `SEARCH_VECTOR_SQL.assistantDocs`/`SEARCH_VECTOR_SQL.assistantDocChunks`
EXPRESSIONS byte-for-byte from their TASK-551 owners. As the explicit serialized
successor, this leaf lands those expressions as generated columns on the
SEPARATE V2 tables only — `assistant_docs_v2_documents.search_vector` (index
`assistant_docs_v2_documents_search_vector_idx`) and the ONE combined
`assistant_docs_v2_chunks.search_vector` (index
`assistant_docs_v2_chunks_search_vector_idx`) — with distinct V2 names and zero
changes to the V1 tables' columns or indexes. The V2 chunk table has exactly ONE
generated chunk vector whose SQL is EXACTLY the imported TASK-551 legacy
heading/content expression PLUS the single additive evidence weight term below
(the previously drafted separate legacy-chunk V2 column/index is REMOVED from
this handoff):

```sql
setweight(to_tsvector('simple', coalesce(heading, '')), 'A') ||
setweight(to_tsvector('simple', coalesce(content, '')), 'B') ||
setweight(to_tsvector('simple', coalesce(evidence_search_text, '')), 'C')
```

The V2 candidate query uses the imported document vector and this single
combined V2 chunk vector, both on the V2 tables, with bounded deterministic
dedup/rank over one candidate set; query predicates reference generated
columns directly and never touch the V1 tables.
`evidence_search_text` is deterministic NFC/plain text made from the section's
visual alt/caption, the compiler-derived `scenarioStepSearchText` projection
(never raw scenario DSL/fixture bytes) and example title/body/explanation,
separated by one LF in stable ID order. It is stored only on the section's
`chunkIndex = 0`, is empty on later chunks, has a 16 KiB UTF-8 per-section cap,
and participates in the aggregate ingest byte budget. No OCR, JSON cast,
external asset read, scenario-file read, or unindexed evidence scan exists.

`topK` defaults to 5 and is clamped to 1..10; candidate limit defaults to 100
and is capped at 200; `minScore` defaults to 0.01 and must be finite in 0..1.
`includeSelectedSectionRelations` defaults false and must be boolean;
`maxRelations` defaults to 32 and is clamped to 1..64 only when enrichment is
enabled. Both fields are normalized into `AssistantDocsSearchLimitsV2` by
`normalizeAssistantDocsSearchLimitsV2` from the search options and are the
ONLY source of pipeline relation enablement — `searchContext` never carries or
reads a relation flag. Unknown option keys or invalid/tokenless input fail
before SQL; a valid tokenless query returns `state: "empty_query"` with zero
statements.

The statement-count metric counts ONLY application data SQL statements issued
through the transaction handle: BEGIN/COMMIT/ROLLBACK, `SET`/`SET LOCAL` and
other protocol/configuration commands never count. The complete per-question
matrix is exact: invalid options/context or a tokenless query 0; the direct V2
retriever's `requiredEra` mismatch (statement 1 resolves the authoritative era
and fails closed with the internal `assistant_docs_v2_consumer_not_ready`
sentinel and zero evidence) exactly 1 — the candidate statement is the ONLY
statement executed; ready plain retrieval 2; ready enriched retrieval with
selected hits 3; and ready enriched retrieval with zero selected hits 2 (the
relation statement is never issued for an empty selection). The
successful-path shorthand `0/2/3` always means exactly those paths
(empty/tokenless 0, plain 2, enriched-with-selected-hits 3) and never hides
the controlled mismatch=1 on the direct path.

One non-empty Guide retrieval executes at most three statements in one
read-only repeatable-read snapshot (this per-question read path is not under
the ingest advisory lock, so it is not bound by the ingest session-separation
rule, which applies to all advisory-lock ingest DB work). The COMPLETE
pipeline — candidate stage, deterministic Bun rerank, selected-evidence stage,
optional relations — is extracted into ONE transaction-scoped helper
`searchAssistantDocsPipelineV2(tx, input): Promise<AssistantDocsDbSearchResultV2>`
that BOTH the direct V2 retriever `searchAssistantDocsDbV2` and the era-aware
facade `searchAssistantDocsAuthoritativeV2` invoke inside their own
`db.transaction(...)`. The helper ALWAYS returns the full declared
`AssistantDocsDbSearchResultV2` (`empty_query` or `ready` with the snapshot,
ranked records and authorized relations); no caller ever receives raw candidate
rows. Era/pointer/ACL resolution is folded INTO statement 1: the candidate
statement joins the single active-pointer row, resolves and returns the
authoritative era/pointer/ACL identity inside its own result, and enforces the
pipeline's optional `requiredEra` on that resolved era (the direct V2
retriever passes `requiredEra: "v2"` and fails closed with the internal
`assistant_docs_v2_consumer_not_ready` sentinel and zero evidence when the
pointer is still `v1`; the facade passes no `requiredEra` and accepts either
era). Neither public entrypoint performs a separate era/pointer preflight
read — `readAssistantDocsActiveEraV2` is never called as its own statement —
so the successful-path 0/2/3 statement counts hold on both paths (plus the
direct path's controlled mismatch=1 when statement 1 fails the `requiredEra`
gate) and no
consumer mixes eras in either direction:

1. one candidate statement resolves the authoritative era/pointer/ACL from the
   single active-pointer row it joins and selects the
   exact era's rows: in era `v2` it joins the active pointer, exact snapshot
   rows, the
   imported document vector and V2 chunk vector (both on the V2 tables),
   publication targets,
   `authorization_disposition = 'eligible'`, the permission requirement from
   `searchContext.permissionSnapshot`, the exact `searchContext.locale`
   predicate and the product-version compatibility predicate; in era `v1`
   (before activation/after rollback) the SAME statement shape joins the
    frozen `assistant_docs`/`assistant_doc_chunks` rows to the EXACT
    `assistant_docs_v2_legacy_acl` snapshot named by the active pointer's
    `legacy_acl_snapshot_id` on `source_path` and returns that ACL snapshot's
    own `{ snapshotId, generation, sourceHash }` identity as the ready result's
    exact authorization/evidence snapshot, and applies the same SQL
    authorization (`authorization_disposition`, `permission_requirement`
    against `searchContext.permissionSnapshot`, and the `assistant` AND
    `embedded-help` publication-target conjunction) — the exact
    `locale = searchContext.locale` predicate and the parameterized
    lexicographic product-version tuple predicates — compared against the
    shared input CTE's `$2`/`$3`/`$4` version aliases
    (`input.version_major`/`input.version_minor`/`input.version_patch`), with
    `$1` reserved for the exact normalized prefix tsquery and locale/snapshot
    binds at later distinct numbers —
    `(product_version_lower_major, product_version_lower_minor, product_version_lower_patch) <= (input.version_major, input.version_minor, input.version_patch)`
    AND
    `(product_version_upper_major, product_version_upper_minor, product_version_upper_patch) > (input.version_major, input.version_minor, input.version_patch)`
    are applied against the joined ACL row's own canonical `locale` and six
    normalized bound columns (`searchContext.productVersion` parsed once into
    three bounded integers; see the exact product-version range persistence
    and filtering section and the legacy ACL table section — the frozen V1
    rows themselves carry no locale/version columns). The
    parameterized authorization, locale and version predicates
    run in PostgreSQL
    before title/keywords/heading/content/evidence-search projection, rank, and
    candidate `LIMIT`. It projects at most 200 authorized bounded rows with the
   exact TASK-551 reranker/citation fields plus the exact full
   `DocsChunk`/`DocsSearchHit` field set consumed by the current composer
   adapter contract: `chunk_id`, `heading_path`, `heading`, `content`,
   `line_start`, `line_end`,
   `normalized_text`, `token_count`, `token_counts`, `snippet`, `score`,
   `matched_terms` and the six
   `ranking_signals` members (`text_score`, `domain_score`, `intent_score`,
   `phrase_score`, `domain_penalty`, `matched_query_coverage`). The statement
   enforces the pipeline's optional `requiredEra` on the resolved era BEFORE
   returning candidates (a required `v2` while the pointer is still `v1`
   fails closed with the internal sentinel and zero evidence). The inherited
   intent/BM25 reranker
   selects at most `topK` in Bun, then the deterministic capability-context
   ordering (evidence whose document `capabilityIds` intersects
   `searchContext.capabilityIds` first — the capability IDs are passed into
   the reranking step) applies with the same score DESC,
   source path ASC, chunk index ASC, chunk row ID ASC tie breaking within each
   class;
2. one bounded evidence statement loads the complete persisted
   base chunk record from EXACTLY the era selected in statement 1 (V1 rows or
   V2 rows — never both), reauthorizing and loading (stable `chunk_id`, full
   `heading_path`, `heading`,
   `content`, `line_start`, `line_end`, `normalized_text`, `token_count`,
   bounded exact `token_counts`) plus text/link/visual/
   example metadata only for those selected at-most-10 exact candidate tuples;
   the ranked search record (`AssistantDocsRankedLocalizedEvidenceV2`) is
   assembled by wrapping that statement-2 base with the statement-1
   query-derived `snippet`/`score`/`matched_terms`/`ranking_signals` fields;
   on the V1 branch `visuals`/`examples` are the exact empty tuples and
   `tokenCounts` is computed with the exact same deterministic bounded
   tokenizer that V2 ingest uses over the persisted `normalized_text` (the
   ONLY sanctioned derivation site — normalizers and the composer adapter
   never derive or repair anything), so every facade record still carries
   mandatory bounded `tokenCounts`;
3. only when atomic/workflow enrichment was requested (from the normalized
   limits/options — never from `searchContext`), one bounded relation
   statement loads at most 64 relations for at most 32 IDs, takes the
   normalized `AssistantDocsGuideSearchContextV1` as its single permission/
   locale/productVersion/capability owner, applies the exact locale and
   lexicographic product-version predicates to every related document/member
   before projection, and independently
   reauthorizes every localized member; relation sections are projected from
   the unranked base records only and never invent score/query terms.

Readiness/active-pointer resolution is part of statement 1's own result, never
a fourth preflight; spies prove `readAssistantDocsActiveEraV2` is never called
as a separate statement by either public entrypoint (the authoritative
era/pointer/ACL identity comes from statement 1's result only).
Unauthorized title/body/chunk/source/visual/example bytes never enter
Bun, ranking, telemetry, or response projection. Query instrumentation asserts
the successful-path 0/2/3 statements for empty-query/plain/
enriched-with-selected-hits retrieval on
BOTH the direct V2 path and the era-aware facade's V1/V2 branches, plus the
direct path's controlled mismatch=1 (statement 1 executes and fails the
`requiredEra` gate; no evidence statement runs);
an enriched zero-hit request remains at 2 and never issues an empty relation
query, and no dual-backend fallback exists. Every branch rejects N+1.
Every later server enrichment helper accepts the same explicit snapshot and
fresh permission snapshot and must not open or accept a distribution bundle.

For compile-green sequential delivery, this leaf adds the V2 export while
preserving the existing legacy `searchAssistantDocsDb(query, options?)` symbol
for existing callers. That legacy symbol may read only a frozen legacy-v1 active
snapshot and must return typed `assistant_docs_v2_consumer_not_ready` without
evidence when V2 is active. The direct V2 retriever
`searchAssistantDocsDbV2` itself refuses with the same internal sentinel and
zero evidence before the cutover fence passes (the active pointer is still the
frozen V1 legacy snapshot; see the V2
activation fence section), so no consumer mixes eras in either direction.
TASK-548-03-L03 atomically switches
`assistantService.ts`, routes, and tests to the era-aware facade
`searchAssistantDocsAuthoritativeV2`, then
removes the legacy runtime/startup ingest and compatibility search callsites;
the facade keeps Guide available over the ACL-covered frozen V1 corpus before
activation and over the active V2 snapshot after activation, and never queries
both. No leaf ships a permissionless V2 read or dual-writes both ingest paths.

The facade's V1 branch runs the SAME shared `searchAssistantDocsPipelineV2(tx,
input)` with its authoritative era resolved inside statement 1 (the ACL-joined
bounded V1 candidate statement joining the EXACT ACL snapshot named by the
active pointer's `legacy_acl_snapshot_id` on `source_path` and returning that
ACL snapshot's own `{ snapshotId, generation, sourceHash }` identity as the
ready result's exact authorization/evidence snapshot — an unbound pointer
authorizes zero V1 rows and fails readiness; the statement also applies the
exact `locale` predicate and the parameterized lexicographic product-version
tuple predicates against the joined ACL row's own canonical `locale` and six
normalized bound columns before projection/LIMIT, so the frozen legacy corpus
is filtered with the same executable locale/version semantics as V2), statement 2
loading the selected authorized V1 evidence (projecting the SAME strict
evidence DTOs: `headingPath` is the exact ordered `string[]` projection of the
V1 `heading_path` JSON array (element-for-element, byte-for-byte),
`visuals`/`examples` are the exact empty tuples (the frozen V1 corpus has no
visual/example records), and — because V1 rows lack `token_counts` — the V1
projection computes `tokenCounts` with the exact same deterministic bounded
tokenizer that V2 ingest uses over the persisted `normalized_text`; this
facade projection is the ONLY sanctioned derivation site (normalizers and the
composer adapter never derive or repair anything), so every facade record
still carries mandatory bounded `tokenCounts`), and optional statement 3
loading authorized relations — never a single-statement path and never a
dual-backend query. It applies the identical TASK-551
prefix-tsquery/reranker/citation contract, and
never loads document/chunk bodies before authorization. Unauthorized bytes
(title, snippet, body, source identity) never enter Bun on either branch.
Query instrumentation pins the successful-path 0/2/3 statement counts on BOTH
facade branches (empty-query 0, plain 2, enriched-with-selected-hits 3; an enriched
zero-hit request stays at 2 and never issues an empty relation query) with no
era/pointer preflight statement on either branch; the direct V2 path adds the
controlled mismatch=1 (statement 1 executes and fails the `requiredEra` gate).

Relation lookup is a bounded batch (maximum 32 requested IDs and 64 returned
relations) against the exact active snapshot already returned by search. It
takes the normalized `AssistantDocsGuideSearchContextV1` as its SINGLE
permission/locale/productVersion/capability owner (never a bare permission
snapshot), joins only exact persisted `{ docId, locale, sectionId }` identities,
requires both `assistant` and `embedded-help` targets, applies the exact
`searchContext.locale` predicate and the parameterized lexicographic
product-version tuple predicates (from `searchContext.productVersion` parsed
once into three bounded integers) to EVERY related document/member BEFORE
projection, and independently evaluates every
section owner's current permission requirement before returning that relation.
Atomic lookup returns authorized containing workflows; workflow lookup returns
its exact ordered atoms only when each projected atom has independently
authorized section evidence. An ineligible, wrong-locale or out-of-range member
is omitted with no ID/title/
route leak; the service never substitutes an area-only mapping. List queries are
stable/bounded and avoid N+1 through one relation/member/evidence batch.

### Guide search context (pure strict DTO)

This leaf owns one pure, browser-safe strict DTO
`core/services/assistant/assistantDocsSearchContext.ts` (imports only pure
owners: `docsPermissionSnapshot.ts` and the exact L01 capability catalog shim/
`@coderso/docs-contracts` capability owner; no DB, settings, server, provider
or Bun edge):

```ts
type AssistantDocsGuideSearchContextV1 = Readonly<{
  schema: "coderso.assistant-docs-guide-search-context@v1";
  locale: string;                     // canonical BCP-47, server-resolved
  productVersion: string;             // exact SemVer, server-resolved
  canonicalAdminRoute: string | null; // canonical default-base admin path, server-resolved
  capabilityIds: readonly string[];   // catalog-validated, unique, sorted, at most 32
  query: string;                      // bounded normalized query
  permissionSnapshot: AssistantDocsPermissionSnapshotV1; // normalized server snapshot
}>;
export function normalizeAssistantDocsGuideSearchContextV1(
  value: unknown
): AssistantDocsGuideSearchContextV1;
export function buildAssistantDocsGuideSearchContextV1(input: {
  locale: string; productVersion: string; canonicalAdminRoute: string | null;
  capabilityIds: readonly string[]; query: string;
  permissionSnapshot: AssistantDocsPermissionSnapshotV1;
}): AssistantDocsGuideSearchContextV1;
```

The normalizer is recursively exact-key and rejects unknown keys, a
noncanonical locale, malformed SemVer, a noncanonical admin path, unknown/
duplicate/out-of-bounds capability IDs, an over-bounded query and any
permission-snapshot mismatch with the typed internal sentinel
`assistant_docs_search_context_invalid` before any DB work. The browser never
sends this DTO: the request carries only bounded advisory hints
(`context.page` / `context.locale`), validated by the later transport contract
schema; authorization, version and route resolution are server-owned.

Threading contract:

- Guide request: the route accepts only the transport-owned bounded hint
  schema and never accepts `productVersion`, capability IDs, a canonical
  route, permissions, roles or snapshot fields.
- Server validation/resolution (TASK-548-03-L03): the service resolves the
  canonical BCP-47 locale (validated user preference, default-locale
  fallback), the installed `productVersion` through the same owner as
  `resolveGuideOfficialDocsContextV1`, the canonical admin route/surface from
  the page hint through TASK-548-03-L01's route-registry seam and
  `resolveAdminRoutePath` (null when unresolvable), the resolved route
  descriptor's `capabilityIds` validated against the exact capability catalog,
  and the normalized permission snapshot; then
  `buildAssistantDocsGuideSearchContextV1` produces the strict DTO.
- DB options: `searchAssistantDocsDbV2(query, options)` AND the era-aware
  facade `searchAssistantDocsAuthoritativeV2(query, options)` both require
  `options.searchContext` and nothing else: each normalizes the
  context first, asserts the normalized `searchContext.query` equals the
  normalized `query` argument (context/query drift is a server invariant
  violation, `assistant_docs_search_context_invalid` before SQL), and uses
  `searchContext.permissionSnapshot` as the single snapshot owner — there is
  no separate permission option and no caller-side permission argument. The
  facade additionally applies the same strict context to its V1 branch
  (authorization, exact locale and lexicographic product-version predicates
  against the ACL-joined frozen V1 rows before projection/LIMIT).
  Optional relation enablement comes ONLY from the normalized
  `options.includeSelectedSectionRelations`/`options.maxRelations`
  (`AssistantDocsSearchLimitsV2`) — the context DTO never carries or reads a
  relation flag.
- Exact filtering: statement 1 adds an exact `locale = searchContext.locale`
  predicate and the product-version compatibility predicate: the strict
  context's `productVersion` is parsed once into three bounded integers,
  bound as the distinct `$2`/`$3`/`$4` aliases of the one input CTE (whose
  `$1` is the exact normalized prefix tsquery; locale and any remaining binds
  use later distinct numbers — no rebind/collision), and applied as
  parameterized lexicographic tuple predicates against those CTE aliases
  `(product_version_lower_major, product_version_lower_minor, product_version_lower_patch) <= (input.version_major, input.version_minor, input.version_patch)`
  AND
  `(product_version_upper_major, product_version_upper_minor, product_version_upper_patch) > (input.version_major, input.version_minor, input.version_patch)`
  (the persisted six bound columns must contain the parsed version);
  authorization predicates are
  unchanged and the source `product_version_range` string is never parsed in
  SQL.
- Exact reranking: after the inherited intent/BM25 reranker selects at most
  `topK`, apply deterministic capability-context ordering — evidence whose
  document `capabilityIds` intersects `searchContext.capabilityIds` sorts
  first, and within each class the existing deterministic tie-break (score
  DESC, source path ASC, chunk index ASC, chunk row ID ASC) is preserved.
- Help result/action behavior: the canonical locale from the context is the
  only Help deep-link locale (evidence is already that locale; a mismatch
  fails closed), the official action uses `searchContext.productVersion` as
  its version, and `canonicalAdminRoute`/`capabilityIds` never alter
  authorization — the document `permissionRequirement` plus the normalized
  snapshot remain the sole authorization.

Tests: context normalization matrix (unknown keys, noncanonical locale,
malformed version, noncanonical route, unknown/duplicate/oversized capability
IDs, query bounds, snapshot mismatch, sentinel before DB), context/query drift
rejection, exact locale and parameterized lexicographic product-version tuple
predicates before projection/LIMIT with the `assistant_docs_v2_documents_product_version_idx`
index/EXPLAIN contract (equality-prefixed `(snapshot_id, locale, …)` leading
columns, lower/upper boundary, malformed/overflow, and a pinned index-scan plan
that never leads with a range column), capability-
context rerank determinism and stability, Help deep-link locale and official
version behavior, and browser-hint forgery rejection at the route level.

## File-Size and Ownership Gate

At the audited HEAD, `core/db/schema.ts` is a 43-line public facade and
`core/db/tables/assistant.ts` is the authoritative legacy assistant table owner.
Do not create a second `core/db/schema/` hierarchy. After terminal TASK-551, this
leaf is the serialized successor for ONLY the new cohesive V2 table definitions
(`core/db/tables/assistantDocsV2.ts`, re-exported by the existing facade),
matching facade export, and next-free migration artifacts. It never adds V2
columns, predicates, generated vectors or indexes to the legacy
`assistant_docs`/`assistant_doc_chunks` tables: their byte/DDL shape, current
generated vectors/indexes, unique `source_path`, legacy ingest runs and
`ON CONFLICT(source_path)` semantics stay untouched. It imports TASK-551's
byte-identical document vector EXPRESSION and the legacy chunk heading/content
EXPRESSION from their exact
owners and lands them on the V2 tables with distinct generated-column/index
names, combining the imported chunk expression with the single additive
evidence term into the ONE `assistant_docs_v2_chunks.search_vector` column and
its ONE GIN index (no separate legacy-chunk V2 column/index). The
terminal TASK-551 handoff is amended to authorize precisely this additive
successor; any other expression/index change requires a new joint contract
amendment instead of being silently respelled.

`core/services/assistant/docsIngestService.ts` is 847 lines at task authoring.
Extract bundle loading/validation and DB persistence into focused modules before
new behavior would push it over the limit. Do not modify the already oversized
`tests/integration/routes/assistant.test.ts`; add focused independent test files.

This leaf exclusively owns
`packages/docs-contracts/src/nodeLoader.ts`, pure DB ingest/retriever/schema
migration, `docsPermissionSnapshot.ts`,
`assistantDocsSearchContext.ts`, `assistantDocsAbortSignal.ts`,
`assistantDocsChunkerV2.ts` (the ONE V2 section chunker, see the exact V2
section chunker owner section), terminal
`assistantDocsCandidateQuery.ts` as a serialized successor,
`scripts/docs/migrate-assistant-docs-v2.ts`,
`scripts/docs/activate-assistant-docs-v2-cutover.ts`,
`scripts/docs/rollback-assistant-docs-v2-cutover.ts`,
`core/server/startupAssistantDocs.ts` and its focused Vitest suite,
the legacy startup producer removal in `core/server/httpServer.ts` (one-line
`initializeDocsIndexOnBootIfEnabled` import/call removal) and
`core/services/assistant/docsIndexService.ts` (retired source-root startup
export removal) with the focused
`tests/unit/server/httpServerDocsStartupRemoval.test.ts` plus the stale-binary
freeze fixtures in `tests/integration/server/assistantDocsIngestV2.test.ts`,
the seven public typed `assistant_docs_*` errors (including the stable
`assistant_docs_cutover_required` for manual preactivation/backfill/source-
drift operator action, mapped HTTP 409 by TASK-548-03-L03 and never collapsed
into a generic 500) plus the two internal
sentinels (`assistant_docs_v2_consumer_not_ready`,
`assistant_docs_search_context_invalid`) and their tests, and the
`AssistantDocsIngestResultV2` union. It must not edit the
L02 private report/fixed/public-guard sources or Core report/guard/loader shims, manifests,
`core/vite.config.ts`, `core/server/dockerStart.ts`,
`core/server/routes/assistantRoutes.ts`,
`core/services/assistant/assistantService.ts`, or route-level error-map tests.
After this dependency lands, TASK-548-03-L03 is the sole TASK-548 writer of
both existing orchestration modules and maps this leaf's typed errors once.
Terminal TASK-551-04-L02 hands `docsDbRetriever.ts` and
`assistantDocsCandidateQuery.ts` to this leaf as a serialized successor. This
leaf preserves its exact query normalizer, one-input CTE/document-vector branch,
candidate bounds, reranker fields, deterministic ordering, quality fixtures and
plan budgets while adding the snapshot/authorization predicate and exact V2
chunk/evidence branch above. Terminal TASK-551-02-L02 hands over no source file:
this leaf imports only its dedicated-session API. These explicit handoffs remove
concurrent shared-file ownership.

The migration creates the cohesive V2 table set (snapshots, documents,
sections, chunks, visuals, examples, capability relations/members, V2 ingest
runs, the acyclic run-results table, the legacy ACL table, activation events,
the single-row active pointer, and the cutover row),
then the resumable cutover backfill command materializes
one V2 snapshot from the one normalized fixed packaged bundle plus the exact
in-memory plan in bounded snapshot-scoped batches and
validates closure before V2 activation; it NEVER copies
the frozen V1 rows into the V2 snapshot (V1 rows are read only for the legacy
ACL classification and the shadow-parity baseline, so a fresh install with
zero V1 rows still persists the exact bundle doc/chunk/evidence closure). Existing V1
rows become one frozen
legacy snapshot and are never modified in place. A reviewed exact source-path map assigns publication targets,
permission requirements and `eligible` for that ACL classification only;
unknown, unmapped, malformed, or
protected paths receive `deny_all` and no nullable/public compatibility
interpretation. The cutover backfill command
`bun scripts/docs/migrate-assistant-docs-v2.ts --batch-size <1..500> [--abort]`
is the SOLE preactivation producer: it runs under the same ingest advisory
lock, uses stable opaque plan-batch keysets over the in-memory plan, commits at most 500
rows or 4 MiB per transaction (every batch binding the exact planSha/sourceHash
on every inserted row), prints only bounded counts/cursor/source hashes,
and is idempotent after interruption (crash resume reuses the SAME pending run
and SAME `building` snapshot from the durable cursor/progress stored on the
run). It runs ONLY after the
`v1_active → v1_frozen` freeze transition (it refuses before `v1_frozen`),
loads the fixed packaged bundle exactly once and materializes every V2 child
row from that bundle plus the exact in-memory plan — the immutable frozen V1
rows are read only for the legacy ACL classification and the shadow-parity
baseline — and in its durable start
transaction persists the pending `request_kind='cutover_backfill'` run,
inserts the sole `building` snapshot, populates the
`assistant_docs_v2_legacy_acl` rows WITHOUT touching the pointer's
`legacy_acl_snapshot_id` (an initial backfill leaves it NULL; a source-drift
replacement retains the old valid binding) and stores the bounded
cursor/progress/plan/sourceHash on the run; its final
transaction verifies closure (including the bundle-plan-persisted identity
match) and atomically transitions `building → prepared`,
finalizes the terminal `prepared` run (with exact `result_kind`/`changed`),
inserts the exact `assistant_docs_v2_ingest_run_results` row, binds (initial)
or rebinds (replacement) the pointer's `legacy_acl_snapshot_id` to that
complete closed-ACL prepared snapshot, and advances
`v1_frozen → backfill_complete` itself; an explicit `--abort` DELETES the
never-served building snapshot cohort (children cascade), marks the run
`failed` with a bounded safe diagnostic/cursor receipt, and frees capacity in
the same transaction while leaving any retained prior binding UNTOUCHED (an
initial abort leaves NULL). A same-hash/plan rerun at/after `backfill_complete`
returns the replay receipt `{ replayed: true, result: <original persisted
prepared result>` (preserving the original `changed: true`, creating no run
and performing no state transition), and a different-hash rerun (only after the
explicit source-drift reset back to `v1_frozen`) retires and replaces it.
`v1_frozen →
backfill_complete` is blocked until all rows are
classified, deny-all fixtures are verified, referential/locale/evidence closure
passes, and the backfill reached its final keyset. This is
exactly the persisted `v1_active → v1_frozen → backfill_complete →
shadow_parity_clean`
fence of the V2 activation fence section; the operator advances the cutover
row only through `casTransitionAssistantDocsV2CutoverStateV1` (or the backfill
command's own final transition), never through a
heuristic.

Expected locks, rewrite risk, deploy ordering, forward recovery, rollback
limitations and sanitized representative `EXPLAIN (ANALYZE, BUFFERS)` evidence
are recorded in the migration receipt. The generated-column/index DDL lands in
the same migration writer as schema/snapshot/journal metadata. If PostgreSQL
requires `CREATE INDEX CONCURRENTLY`, it is an explicit non-transactional
operations phase that completes before V2 activation; it is never placed in
transactional SQL. Rollback after activation uses the explicit
`v2_activated → v1_frozen` row (active-V2 demotion, revision and
rollout-generation increments, V2 evidence clear, frozen V1 pointer restore
with the trigger guards, the frozen V1 rows, the `legacy_acl_snapshot_id`
binding and the facade kept in place — V1 stays immutable and safely readable,
legacy writes are never re-enabled);
resuming mutable legacy V1 is the separate destructive/maintenance transition
(`rollbackAssistantDocsV2CutoverPreActivationV1` from any pre-fence state →
`v1_active`, revision and
rollout-generation increments, V2 evidence clear, ACL binding CLEARED, legacy
writes re-enabled
only at `v1_active`; Guide stays unavailable until a fresh freeze + backfill
recreates the binding — never the normal rollback path);
rollback never
rewrites source Markdown or guesses authorization.

## Security Contract

- **Endpoint visibility:** unchanged internal admin
  `POST /admin/api/assistant/reindex` route family (`/assistant/reindex` inside
  the admin router); no public docs endpoint.
- **Auth/RBAC:** authenticated admin session and `settings:write`, unchanged.
- **CSRF:** required for the POST through existing admin unsafe-method
  middleware/client behavior.
- **Rate limit:** existing `assistant` bucket, unchanged.
- **Validation:** the reindex request is the strict
  `AssistantReindexRequestV2` (`{ force?: boolean }`) owned by the transport
  contract module (TASK-548-03-L03) and imported by
  `core/server/validation/assistantSchemas.ts`, preserving the live strict
  contract at `assistantSchemas.ts:29-35`.
  `additionalProperties: false` remains mandatory, client `{}` remains valid,
  and `force` must be boolean when present. Independently verify bundle schema,
  sourceHash, referential integrity, limits and packaged asset confinement
  before a DB transaction.
- **Anti-abuse:** nonce/HMAC and CAPTCHA are not applicable to this internal
  session write. Enforce bundle/doc/chunk/asset-ref caps and one guarded reindex
  at a time.
- **RBAC retrieval:** persist exact
  `authorizationDisposition: "eligible" | "deny_all"` and
  `permissionRequirement: DocsPermissionRequirementV1 | null`. `deny_all`
  rejects every session, including exact `["*"]`; it is the only legacy
  representation for unknown/unmapped/protected source paths. For `eligible`,
  null has no document-level restriction, so an authenticated session with an
  empty permission snapshot satisfies null. `allOf` requires every listed
  permission and `anyOf` requires at least one; empty/partial snapshots deny an
  unsatisfied non-null requirement. The exact live ready snapshot `["*"]`
  satisfies every valid eligible requirement; duplicate/mixed wildcard or
  other malformed snapshots fail closed. Authored requirements continue to
  forbid `*` and cannot author `deny_all`.
  The required server snapshot is normalized through
  `normalizeAssistantDocsPermissionSnapshotV1` before a DB query. Never expose
  a deny-all or protected document/title/chunk/source/visual/example.
- **Capability context:** persist `capabilityIds` exactly and apply bounded,
  deterministic capability filtering/ranking before optional provider work.
  Persist the separate composition relation under the same snapshot; relation
  lookups reauthorize every exact section and cannot grant CMS permissions or
  disclose an ineligible atom/workflow.
  L02's `sourceHash` includes canonical bytes of all three composition source
  registries. Therefore the equal-hash unchanged branch covers documents and
  relations together: a catalog-only change must allocate and activate a new
  complete snapshot and can never be skipped as unchanged.
- **Secrets/privacy:** do not store/log image bytes, credentials, source bodies
  in errors or external provider data.
- **Aggregate ingest budgets:** one normalized bundle may contribute at most
  4,096 assistant documents, 65,536 sections, 262,144 chunks, 131,072 visual+
  example evidence rows, and 512 MiB of total persisted canonical UTF-8/text+
  metadata bytes. A set-based insert batch contains at most 500 rows and 4 MiB
  of binds. The plan is rejected before run allocation when any aggregate limit
  fails; there is no per-document-only loophole, N+1 insert, or unbounded bind
  payload.

## Implementation Pseudocode

```ts
// packages/docs-contracts/src/nodeLoader.ts
export {
  guardAndLoadFixedDocsWorkspaceBundleV2 as loadPackagedDocsDistributionBundleV2,
} from "./nodeFixedWorkspace.ts";

// L02's Core shim already exports the same private function under the same alias;
// L03 does not edit or wrap it.

type AssistantDocsIngestOutcomeReconciliationV2 =
  | { state: "committed"; result: AssistantDocsIngestResultV2 }
  | { state: "not_committed" }
  | { state: "indeterminate"; safeCode: "assistant_docs_ingest_failed" };

declare function reconcileAssistantDocsIngestOutcomeV2(input: {
  ingestRunId: string;
  expectedSourceHash: string;
  signal: AbortSignal; // bounded reconciliation-only timeout
}): Promise<AssistantDocsIngestOutcomeReconciliationV2>;
// reserves a FRESH independent dedicated session for one read-only
// repeatable-read reconciliation; never reuses lockSession.

type AssistantDocsAdmissionDeltasV2 = Readonly<{
  kind:
    | "unchanged" | "prepared-reuse" | "activated-new"
    // `prepared-new` is reachable ONLY through the cutover backfill command
    // (the sole preactivation producer); startup/manual ingest never computes
    // it. The two guard kinds below are never allocated as runs.
    | "prepared-new" | "deferred-cutover-backfill" | "cutover-backfill-required";
  additionalSnapshots: 0 | 1;
  additionalBytes: number;
  additionalRuns: 1;
}>;

function computeAssistantDocsAdmissionDeltasV2(input: {
  force: boolean;
  fenceState: AssistantDocsV2CutoverStateV1;
  bundleHash: string;
  activeHash: string | null;
  preparedHash: string | null;
  newSnapshotBytes: number;
}): AssistantDocsAdmissionDeltasV2 {
  // Preactivation producer rules: startup/manual ingest at v1_active/v1_frozen
  // returns the bounded `deferred_cutover_backfill` result BEFORE bundle load
  // or run allocation (see ingestPackagedAssistantDocsV2); this guard is the
  // same fail-closed rule for any caller that reaches delta computation.
  if (input.fenceState === "v1_active" || input.fenceState === "v1_frozen") {
    return { kind: "deferred-cutover-backfill", additionalSnapshots: 0, additionalBytes: 0, additionalRuns: 1 };
  }
  const fencePassed = input.fenceState === "v2_activated";
  if (fencePassed && !input.force && input.activeHash === input.bundleHash) {
    return { kind: "unchanged", additionalSnapshots: 0, additionalBytes: 0, additionalRuns: 1 };
  }
  if (!fencePassed) {
    if (input.preparedHash === input.bundleHash) {
      // reuse the one complete prepared snapshot for both force values
      // (the global `lifecycle = 'prepared'` invariant: at most one prepared
      // snapshot installation-wide; the producing run is the terminal
      // `cutover_backfill` run, never the reuse run)
      return { kind: "prepared-reuse", additionalSnapshots: 0, additionalBytes: 0, additionalRuns: 1 };
    }
    // preactivation hash drift after backfill/parity: bounded operator-required
    // conflict BEFORE run allocation or any snapshot write; the operator must
    // run the explicit source-drift reset and rerun the same backfill command.
    return { kind: "cutover-backfill-required", additionalSnapshots: 0, additionalBytes: 0, additionalRuns: 1 };
  }
  return { kind: "activated-new", additionalSnapshots: 1, additionalBytes: input.newSnapshotBytes, additionalRuns: 1 };
}

// Durable pending-run allocation: one INDEPENDENT mutation session reserved via
// withDedicatedDatabaseSession, one bounded transaction, COMMITted while the
// advisory lock remains held. The lockSession owns only lock/liveness.
async function allocatePendingAssistantDocsIngestRunV2(input: {
  actorId: string | null;
  force: boolean;
  requestKind: "startup" | "manual" | "cutover_backfill";
  signal: AbortSignal;
  plan: AssistantDocsSnapshotPlanV2;
  admissionDeltas: {
    additionalSnapshots: 0 | 1;
    additionalBytes: number;
    additionalRuns: 1;
  };
  bundle: DocsDistributionBundleV2;
}): Promise<string> {
  return withDedicatedDatabaseSession(async (session) =>
    session.transaction({
      signal: input.signal,
      statementTimeoutMs: ASSISTANT_DOCS_INGEST_STATEMENT_TIMEOUT_MS,
      run: async (tx) => {
        const fence = await readAssistantDocsV2CutoverStateV1(tx);
        const active = await readActiveAssistantDocsSnapshotV2(tx);
        const prepared = await resolvePreparedAssistantDocsSnapshotBySourceHashV2(
          tx,
          input.bundle.sourceHash
        );
        const counters = await readAssistantDocsCapacityCountersV2(tx);
        const deltas = computeAssistantDocsAdmissionDeltasV2({
          force: input.force,
          fenceState: fence.state,
          bundleHash: input.bundle.sourceHash,
          activeHash: active?.sourceHash ?? null,
          preparedHash: prepared?.sourceHash ?? null,
          newSnapshotBytes: input.plan.canonicalPersistedBytes,
        });
        assertExactAdmissionDeltasV2(deltas, input.admissionDeltas, counters);
        const run = await createPendingDocsIngestRunV2(tx, {
          sourceHash: input.bundle.sourceHash,
          corpusVersion: input.bundle.corpusVersion,
          actorId: input.actorId,
          force: input.force,
          requestKind: input.requestKind,
          requestedAt: nowUtcIso(),
          // Runs are standalone parents: NO snapshot_id column exists; the
          // run ↔ snapshot linkage lands in
          // `assistant_docs_v2_ingest_run_results` at finalization (acyclic).
        });
        return run.id; // COMMIT makes the pending row durable
      },
    })
  );
  // Crash before this COMMIT leaves no pending row; crash after it leaves a
  // real durable pending row that the next advisory-lock holder reconciles.
  // The pending partial unique index remains the concurrency backstop.
}

// Snapshot mutation + CAS terminal run finalization in a SECOND independent
// mutation session, one bounded transaction.
async function finalizeAssistantDocsIngestRunV2(input: {
  runId: string;
  actorId: string | null;
  force: boolean;
  requestKind: "startup" | "manual" | "cutover_backfill";
  signal: AbortSignal;
  plan: AssistantDocsSnapshotPlanV2;
  admissionDeltas: {
    additionalSnapshots: 0 | 1;
    additionalBytes: number;
    additionalRuns: 1;
  };
  bundle: DocsDistributionBundleV2;
}): Promise<AssistantDocsIngestResultV2> {
  return withDedicatedDatabaseSession(async (session) =>
    session.transaction({
      signal: input.signal,
      statementTimeoutMs: ASSISTANT_DOCS_INGEST_STATEMENT_TIMEOUT_MS,
      run: async (tx) => {
        const fence = await readAssistantDocsV2CutoverStateV1(tx);
        const active = await lockActiveAssistantDocsSnapshotV2(tx);
        const prepared = await resolvePreparedAssistantDocsSnapshotBySourceHashV2(
          tx,
          input.bundle.sourceHash
        );
        const counters = await readAssistantDocsCapacityCountersV2(tx);
        const deltas = computeAssistantDocsAdmissionDeltasV2({
          force: input.force,
          fenceState: fence.state,
          bundleHash: input.bundle.sourceHash,
          activeHash: active?.sourceHash ?? null,
          preparedHash: prepared?.sourceHash ?? null,
          newSnapshotBytes: input.plan.canonicalPersistedBytes,
        });
        assertExactAdmissionDeltasV2(deltas, input.admissionDeltas, counters);
        if (deltas.kind === "unchanged") {
          // Terminal write CAS-sets `result_kind = 'unchanged'` and
          // `changed = false`, then inserts the exact
          // `assistant_docs_v2_ingest_run_results` row (run, active snapshot,
          // `unchanged`, false).
          return finishPendingDocsIngestRunUnchangedV2(tx, input.runId, active, counters);
        }
        if (deltas.kind === "prepared-reuse") {
          // Terminal write CAS-sets `result_kind = 'prepared'` and
          // `changed = false`, then inserts the exact run-result row (run,
          // prepared snapshot, `prepared`, false). The result row names the
          // prepared snapshot directly (acyclic); the snapshot's immutable
          // producer remains the terminal `cutover_backfill` run.
          return finishPendingDocsIngestRunPreparedReuseV2(
            tx, input.runId, prepared, counters
          );
        }
        if (deltas.kind === "cutover-backfill-required") {
          // Unreachable here: the guarded entrypoint throws the public
          // `assistant_docs_cutover_required` conflict BEFORE run allocation
          // (no run exists).
          throw domainError("assistant_docs_cutover_required", {
            safeReason: "cutover_backfill_required",
          });
        }
        if (deltas.kind === "prepared-new") {
          // Unreachable through this core: the resumable backfill command (the
          // sole preactivation producer) owns its own durable-start + child-
          // batch + closure transactions (`runCutoverAssistantDocsBackfillV2`)
          // and never routes children through Phase A/B here. Fail closed —
          // no other caller may allocate a building/prepared snapshot.
          throw domainError("assistant_docs_cutover_required", {
            safeReason: "cutover_backfill_required",
          });
        }
        if (deltas.kind === "activated-new") {
          // ONE-active ordering: demote the prior active V2 row FIRST
          // (active → inactive with deactivated_at set). A second active row
          // is never inserted before the demotion; if any later step fails,
          // the transaction rolls the demotion back with everything else.
          await demoteActiveAssistantDocsSnapshotV2(tx, active);
        }
        const identity = await allocateInactiveDocsSnapshotV2(tx, {
          sourceHash: input.bundle.sourceHash,
          corpusVersion: input.bundle.corpusVersion,
          generation: await nextAssistantDocsV2SnapshotGenerationV2(tx),
          // generation comes from the dedicated
          // assistant_docs_v2_snapshot_generation_seq; never max+1 and never
          // prior-active+1.
          lifecycle: "active",
          producerRunId: input.runId, // immutable provenance; acyclic RESTRICT FK
        });
        await insertAssistantDocsSnapshotPlanV2(tx, identity, input.plan);
        await insertAssistantDocsCapabilityCompositionV1(
          tx,
          identity,
          input.plan.capabilityComposition,
        );
        await assertPersistedAssistantDocsSnapshotClosureV2(tx, identity);
        const summary = summarizeSnapshot(identity, input.plan);
        // One-active ordering (post-fence activation): after the demotion and
        // insert, update the pointer and predecessor, finalize the current
        // run, and record the replacement activation event — all in this same
        // transaction, so a later failure rolls the demotion back too.
        await activateCorpusSnapshotV2(tx, identity); // switches the pointer
        //   and sets previous_v2_snapshot_id = the demoted predecessor
        // Terminal write CAS-sets `result_kind = 'activated'` and
        // `changed = true`, then inserts the exact run-result row (run,
        // snapshot, `activated`, true).
        await finishPendingDocsIngestRunSuccessV2(tx, input.runId, summary);
        await recordAssistantDocsV2ActivationEventV2(tx, {
          eventKind: "replacement_activation",
          snapshotId: identity.snapshotId,
          runId: identity.producerRunId, // the exact producing run (this run)
          previousV2SnapshotId: active?.snapshotId ?? null,
        });
        return summary;
      },
    })
  );
}

export async function ingestDocsDistributionBundleV2(
  inputBundle: DocsDistributionBundleV2,
  input: {
    actorId: string | null;
    force: boolean;
    requestKind: "startup" | "manual" | "cutover_backfill";
    lockSession: DedicatedDatabaseSession;
    signal: AbortSignal;
    plan: AssistantDocsSnapshotPlanV2;
    admissionDeltas: {
      additionalSnapshots: 0 | 1;
      additionalBytes: number;
      additionalRuns: 1;
    };
  }
): Promise<AssistantDocsIngestResultV2> {
  // This independent trust boundary deliberately normalizes a second time.
  const bundle = normalizeDocsDistributionBundleV2(inputBundle);
  assertBundleAssetRefsArePackaged(bundle);
  const assistantDocuments = selectDocumentsForPublicationTarget(
    bundle.documents,
    "assistant"
  );
  assertEveryGuideDocumentAlsoTargetsEmbeddedHelp(assistantDocuments);
  assertAssistantDocsPlanMatchesBundleV2(input.plan, bundle);
  const plan = input.plan; // built exactly once by the caller after bundle load
  assertCompleteLocalizedEvidenceClosureV2(plan);
  assertNotAborted(input.signal);
  await lockSession.assertAlive(input.signal); // lockSession: liveness only
  await assertAssistantDocsIngestSessionBudgetV2({ signal: input.signal });
  await assertProjectedAssistantDocsCapacityV2({
    signal: input.signal,
    ...input.admissionDeltas,
  });
  // Phase A: durable pending-run allocation (independent mutation session #1).
  const runId = await allocatePendingAssistantDocsIngestRunV2({
    actorId: input.actorId,
    force: input.force,
    requestKind: input.requestKind,
    signal: input.signal,
    plan,
    admissionDeltas: input.admissionDeltas,
    bundle,
  });
  let committedResult: AssistantDocsIngestResultV2;
  try {
    // Phase B: snapshot mutation + CAS terminal run finalization (independent
    // mutation session #2).
    committedResult = await finalizeAssistantDocsIngestRunV2({
      runId,
      actorId: input.actorId,
      force: input.force,
      requestKind: input.requestKind,
      signal: input.signal,
      plan,
      admissionDeltas: input.admissionDeltas,
      bundle,
    });
  } catch (error) {
    const domainError = normalizeDocsIngestError(error);
    const resolution = await settleAssistantDocsIngestOutcomeReconciliationV2(
      () => reconcileAssistantDocsIngestOutcomeV2({
        ingestRunId: runId,
        expectedSourceHash: bundle.sourceHash,
        signal: composeAssistantDocsIngestAbortSignalV1({
          timeoutMs: ASSISTANT_DOCS_INGEST_RECONCILIATION_TIMEOUT_MS,
        }),
      })
    );
    if (resolution.state === "committed") {
      committedResult = resolution.result;
    } else {
      if (resolution.state === "not_committed") {
        const diagnosticPersistence = await settleDocsIngestDiagnostic(() =>
          finishPendingDocsIngestRunFailedV2(
            runId,
            toSafeIngestDiagnostic(domainError)
          )
        );
        attachSafeDiagnosticPersistenceEvidence(
          domainError, diagnosticPersistence
        );
      } else {
        attachSafeIngestOutcomeUnknownEvidence(domainError);
      }
      throw domainError;
    }
  }
  await settleAssistantDocsRetentionMaintenanceV2(() =>
    pruneOneEligibleAssistantDocsBatchV2()
  );
  return committedResult;
}

export async function ingestPackagedAssistantDocsV2(input: {
  actorId: string | null;
  force?: boolean;
  signal: AbortSignal;
  requestKind?: "startup" | "manual"; // persisted as the run's request_kind
                                      // (default "manual"; the backfill
                                      // command passes "cutover_backfill" to
                                      // the ingest core directly)
}): Promise<AssistantDocsIngestResultV2> {
  const request = normalizePackagedAssistantDocsIngestInputV2({
    actorId: input.actorId,
    force: input.force,
    requestKind: input.requestKind,
  });
  const signal = requireAbortSignal(input.signal);
  return withAssistantDocsIngestAdvisoryLockV2(signal, async (lockSession) => {
      await lockSession.assertAlive(signal); // lockSession: liveness only
      // Session budget is validated BEFORE any bundle read or run allocation.
      await assertAssistantDocsIngestSessionBudgetV2({ signal });
      // Preactivation producer gate (decision: ONE producer only). At
      // v1_active/v1_frozen the call returns the bounded internal
      // deferred_cutover_backfill result — no bundle load, no pending
      // reconciliation/prune, no run allocation, no snapshot write. Manual
      // reindex therefore can never become a second preactivation producer.
      const fenceState = await readAssistantDocsV2CutoverStateV1ReadOnly({ signal });
      if (fenceState === "v1_active" || fenceState === "v1_frozen") {
        return deferredCutoverBackfillResultV2();
      }
      const pending = await reconcileSolePendingRunBeforeAllocationV2({ signal });
      if (pending.state === "outcome_unknown") {
        // Contradictory/unreadable evidence stays pending and blocks; the
        // partial unique index independently prevents another generation/run.
        throw domainError("assistant_docs_ingest_failed", {
          safeReason: "pending_outcome_unknown",
        });
      }
      // The recovered pending row was CAS-terminalized (prepared/unchanged/
      // activated/failed per the committed evidence) and its pending
      // partial-unique slot is free. The CURRENT invocation ALWAYS continues
      // to its own one fixed bundle load and its own admission/run; a
      // recovered result is never returned as this request's answer.
      // Stage 1 (no bundle load): run-count ceiling + pending reconciliation.
      await pruneEligibleAssistantDocsBeforeAdmissionV2({
        signal,
        maxBatches: 4,
      });
      await assertAssistantDocsRunBudgetAdmissionV2({ signal });
      // Load the fixed packaged bundle exactly once (zero-argument loader;
      // the signal is never passed into it): check abort before the call and
      // immediately after it returns, before using the bundle.
      assertNotAborted(signal);
      const packaged = await loadPackagedDocsDistributionBundleV2();
      assertNotAborted(signal);
      const bundle = normalizeDocsDistributionBundleV2(packaged);
      const assistantDocuments = selectDocumentsForPublicationTarget(
        bundle.documents,
        "assistant"
      );
      assertEveryGuideDocumentAlsoTargetsEmbeddedHelp(assistantDocuments);
      const plan = buildAssistantDocsSnapshotPlanV2({
        bundle,
        documents: assistantDocuments,
        capabilityComposition:
          normalizeDocsCapabilityCompositionCatalogV1(
            bundle.capabilityComposition,
          ),
      });
      await assertAssistantDocsSameHashForceCooldownV2({
        signal,
        force: request.force ?? false,
        sourceHash: bundle.sourceHash,
      });
      const identity = await readAssistantDocsIngestIdentityV2({ signal });
      // returns { active, prepared, fenceState } in one read-only snapshot on
      // an independent session
      const deltas = computeAssistantDocsAdmissionDeltasV2({
        force: request.force ?? false,
        fenceState: identity.fenceState,
        bundleHash: bundle.sourceHash,
        activeHash: identity.active?.sourceHash ?? null,
        preparedHash: identity.prepared?.sourceHash ?? null,
        newSnapshotBytes: plan.canonicalPersistedBytes,
      });
      if (deltas.kind === "cutover-backfill-required") {
        // Preactivation hash drift after backfill/parity: public
        // `assistant_docs_cutover_required` conflict BEFORE run allocation or
        // any snapshot write. The operator must run the explicit source-drift
        // reset and rerun the SAME backfill command.
        throw domainError("assistant_docs_cutover_required", {
          safeReason: "cutover_backfill_required",
        });
      }
      const admissionDeltas = {
        additionalSnapshots: deltas.additionalSnapshots,
        additionalBytes: deltas.additionalBytes,
        additionalRuns: deltas.additionalRuns,
      };
      await assertProjectedAssistantDocsCapacityV2({
        signal,
        ...admissionDeltas,
      });
      return ingestDocsDistributionBundleV2(bundle, {
        actorId: request.actorId,
        force: request.force ?? false,
        requestKind: request.requestKind,
        lockSession,
        signal,
        plan,
        admissionDeltas,
      });
  });
}

async function reconcileSolePendingRunBeforeAllocationV2(input: {
  signal: AbortSignal;
}): Promise<
  | { state: "none" }
  | { state: "outcome_unknown" }
> {
  const pending = await loadAtMostOnePendingDocsIngestRunV2({ signal: input.signal });
  if (pending === null) return { state: "none" };
  const resolution = await settleAssistantDocsIngestOutcomeReconciliationV2(
    () => reconcileAssistantDocsIngestOutcomeV2({
      ingestRunId: pending.id,
      expectedSourceHash: pending.sourceHash,
      signal: composeAssistantDocsIngestAbortSignalV1({
        timeoutMs: ASSISTANT_DOCS_INGEST_RECONCILIATION_TIMEOUT_MS,
      }),
    })
  );
  if (resolution.state === "committed") {
    // Atomically CAS-settle the recovered run row to its committed terminal
    // state (prepared/unchanged/activated per the reconstructed result),
    // freeing the pending partial-unique slot. The current invocation NEVER
    // returns this recovered result as its own answer; it always proceeds to
    // its own bundle load and admission/run.
    const settled = await settleRecoveredDocsIngestRunV2({
      ingestRunId: pending.id,
      result: resolution.result,
      signal: input.signal,
    });
    if (!settled) return { state: "outcome_unknown" };
    return { state: "none" };
  }
  if (resolution.state === "not_committed") {
    const failed = await finishPendingDocsIngestRunFailedV2(
      pending.id,
      { safeCode: "assistant_docs_ingest_failed" },
    );
    if (!failed) return { state: "outcome_unknown" };
    return { state: "none" };
  }
  return { state: "outcome_unknown" };
}

export async function withAssistantDocsIngestAdvisoryLockV2<T>(
  signal: AbortSignal,
  use: (session: DedicatedDatabaseSession) => Promise<T>
): Promise<T> {
  try {
    return await withDedicatedDatabaseAdvisoryLock({
      key: ASSISTANT_DOCS_INGEST_ADVISORY_LOCK_KEY_V2,
      signal,
      conflictCode: "assistant_docs_reindex_conflict",
      run: use,
    });
  } catch (error) {
    if (isDatabaseMaintenanceSessionUnavailable(error)) {
      throw new Error("assistant_docs_db_unavailable");
    }
    throw error;
  }
}

// Resumable cutover backfill (the SOLE preactivation producer). Runs only
// after `v1_frozen` (refuses before it with the public
// `assistant_docs_cutover_required` error); the immutable frozen V1 rows are
// read ONLY for legacy ACL classification and the shadow-parity baseline —
// every V2 child row is materialized from the one normalized fixed packaged
// bundle plus the exact in-memory plan. `--abort` IMMEDIATELY DELETES the
// never-served building snapshot cohort (children/run-result rows cascade),
// marks the standalone run `failed` with a bounded safe diagnostic/cursor
// receipt, and frees snapshot/byte capacity in the SAME transaction; the
// cohort is never converted to a 30-day inactive row. A same-hash/plan replay
// at/after `backfill_complete` returns the ORIGINAL persisted prepared result
// (`replayed: true`) without creating a run or transitioning state. Crash at
// any phase resumes the SAME run and SAME building snapshot from the
// durable cursor/progress/plan/sourceHash stored on the run.
type AssistantDocsCutoverBackfillReceiptV2 =
  | Readonly<{
      aborted: false;
      replayed: boolean; // true = the complete prepared sourceHash/plan was
                         // already persisted; the result is the ORIGINAL
                         // persisted prepared result (changed: true)
      result: AssistantDocsIngestResultV2; // `prepared`, changed: true
    }>
  | Readonly<{
      aborted: true;
      replayed: false;
      result: null;
      diagnostic: Readonly<{
        safeCode: "assistant_docs_ingest_failed";
        safeReason: "cutover_backfill_aborted";
      }>;
      cursor: string | null; // bounded opaque stable keyset cursor receipt
    }>;
export async function runCutoverAssistantDocsBackfillV2(input: {
  signal: AbortSignal;
  abort?: boolean;
}): Promise<AssistantDocsCutoverBackfillReceiptV2> {
  return withAssistantDocsIngestAdvisoryLockV2(input.signal, async (lockSession) => {
    await lockSession.assertAlive(input.signal);
    await assertAssistantDocsIngestSessionBudgetV2({ signal: input.signal });
    const fence = await readAssistantDocsV2CutoverStateV1ReadOnly({ signal: input.signal });
    if (input.abort) {
      // Explicit abort: DELETE the never-served building cohort, mark the
      // standalone run failed with the bounded safe diagnostic/cursor receipt,
      // and free capacity in ONE transaction (see abortPendingCutoverBackfillV2
      // below). Idempotent: nothing to abort returns a no-op abort receipt.
      return abortPendingCutoverBackfillV2({ signal: input.signal });
    }
    // Same-hash/plan replay: at/after backfill_complete with a complete
    // prepared snapshot whose producing `cutover_backfill` run has the same
    // source_hash AND backfill_plan_sha256 as the currently loaded bundle and
    // in-memory plan, return the ORIGINAL persisted prepared result
    // (changed: true) — no new run, no rows, no state transition.
    if (fence !== "v1_frozen") {
      const replay = await tryReplayCompletedCutoverBackfillV2({
        signal: input.signal,
      });
      if (replay !== null) {
        return { aborted: false, replayed: true, result: replay };
      }
      if (fence === "v1_active") {
        // Freeze-first: refuse before v1_frozen; the fence state is CAS-
        // advanced to backfill_complete only by this command's own final
        // transaction.
        throw domainError("assistant_docs_cutover_required", {
          safeReason: "cutover_backfill_fence_invalid",
        });
      }
      // At backfill_complete/shadow_parity_clean/consumers_ready with a
      // different hash/plan: the operator must run the explicit source-drift
      // reset back to `v1_frozen` and then rerun this command.
      throw domainError("assistant_docs_cutover_required", {
        safeReason: "cutover_backfill_required",
      });
    }
    const pending = await loadAtMostOnePendingDocsIngestRunV2({ signal: input.signal });
    if (pending === null) {
      // Durable start transaction (independent dedicated session): load the
      // fixed packaged bundle exactly once and build the exact in-memory plan
      // from it; insert the pending `cutover_backfill` run + sole `building`
      // snapshot (producer_run_id = the run, acyclic RESTRICT) + CLOSED
      // `assistant_docs_v2_legacy_acl` rows derived from the strict legacy
      // context catalog (ACL classification only — never a V2 content source)
      // + initial cursor/progress/plan/sourceHash on the run, WITHOUT touching
      // the active-pointer `legacy_acl_snapshot_id` (an initial backfill
      // leaves it NULL — stays not-ready mid-flight; a source-drift
      // replacement retains the old valid binding — stays ready, no gap; the
      // binding is set/rebound only by the FINAL transaction below). COMMIT
      // makes all of it durable; a crash before COMMIT leaves nothing.
      await startCutoverBackfillV2({ signal: input.signal });
    }
    // One bounded child batch per independent transaction (≤ 500 rows / 4 MiB),
    // each materializing rows ONLY from the in-memory plan/bundle (never from
    // V1 rows), binding the exact planSha/sourceHash on every inserted row via
    // the snapshot identity, and CAS-updating the run's
    // backfill_progress/backfill_cursor. The batch selector re-reads the
    // durable cursor so crash resume continues exactly after the last
    // committed batch (idempotent repeats, never skips).
    let progress = await readCutoverBackfillProgressV2({ signal: input.signal });
    while (!progress.childrenComplete) {
      const batch = await materializeNextCutoverBackfillBatchV2({
        cursor: progress.cursor,
        plan: await loadCutoverBackfillPlanV2({ signal: input.signal }),
        signal: input.signal,
      });
      if (batch === null) break;
      progress = await commitCutoverBackfillBatchV2({
        batch,
        expectedProgress: progress,
        signal: input.signal,
      }); // CAS on backfill_progress; conflict = concurrent writer, fail closed
    }
    // Final transaction: verify full closure (final keyset, zero unclassified
    // rows, deny-all fixtures, referential/locale/evidence closure, exact plan
    // digest, AND bundle-plan-persisted identity: the persisted doc/chunk/
    // evidence closure must match the loaded bundle and in-memory plan exactly
    // — a mismatch rejects closure and never advances the fence) and atomically
    // `building → prepared`, CAS-finalize the run as terminal `prepared`
    // (result_kind='prepared'/changed=true/terminal_at), insert the exact
    // `assistant_docs_v2_ingest_run_results` row, atomically bind (initial:
    // NULL → the new prepared snapshot) or rebind (source-drift replacement:
    // old binding → the new prepared snapshot) the active-pointer
    // `legacy_acl_snapshot_id` to that complete closed-ACL snapshot, and
    // CAS-advance the cutover
    // row `v1_frozen → backfill_complete`; the first completion returns
    // `replayed: false`.
    return { aborted: false, replayed: false, result: await finalizeCutoverBackfillV2({ signal: input.signal }) };
  });
}

async function tryReplayCompletedCutoverBackfillV2(input: {
  signal: AbortSignal;
}): Promise<AssistantDocsIngestResultV2 | null> {
  // At/after `backfill_complete`: load the fixed packaged bundle exactly once,
  // compute sourceHash/planSha256, resolve the ONE complete prepared snapshot
  // and its producing terminal `cutover_backfill` run; when the run's
  // source_hash AND backfill_plan_sha256 both match, reconstruct the ORIGINAL
  // persisted `prepared` result from the run-result provenance tuple —
  // preserving the original `changed: true` — and return it. Otherwise return
  // null (hash/plan drift; operator action required).
}

async function abortPendingCutoverBackfillV2(input: {
  signal: AbortSignal;
}): Promise<AssistantDocsCutoverBackfillReceiptV2> {
  // ONE independent dedicated-session transaction: DELETE the never-served
  // `building` snapshot (documents/sections/chunks/visuals/examples/
  // capability relations/ACL/run-result rows cascade) WITHOUT touching the
  // pointer's `legacy_acl_snapshot_id` — a never-bound building cohort is
  // never named by the pointer, so an initial abort leaves NULL and a
  // replacement abort leaves the old valid binding untouched; CAS-finalize the
  // standalone `cutover_backfill` run as `failed` with `terminal_at` set,
  // retaining the bounded opaque `backfill_cursor`/`backfill_progress` as the
  // safe cursor receipt, and free the snapshot/byte capacity counters in the
  // same transaction. The cohort is NEVER converted to a 30-day inactive row;
  // an initial binding is created only by the next backfill's FINAL
  // transaction. Nothing
  // to abort is a no-op abort receipt.
}

export function normalizeAssistantDocsPermissionSnapshotV1(
  value: unknown
): AssistantDocsPermissionSnapshotV1 {
  const record = assertExactObjectKeys(value, ["state", "permissions"]);
  if (record.state !== "ready" || !Array.isArray(record.permissions)) {
    throw new Error("assistant_docs_permission_snapshot_invalid");
  }
  const permissions = assertBoundedStringArray(record.permissions);
  assertNoDuplicates(permissions);
  const known = new Set(listPermissionIds());
  if (
    permissions.includes("*")
      ? permissions.length !== 1
      : permissions.some((permission) => !known.has(permission))
  ) {
    throw new Error("assistant_docs_permission_snapshot_invalid");
  }
  return {
    state: "ready",
    permissions: permissions[0] === "*" ? ["*"] : [...permissions].sort(),
  };
}

export function satisfiesAssistantDocsPermissionRequirementV1(
  requirement: DocsPermissionRequirementV1 | null,
  inputSnapshot: AssistantDocsPermissionSnapshotV1
): boolean {
  const snapshot = normalizeAssistantDocsPermissionSnapshotV1(inputSnapshot);
  const normalized = normalizeDocsPermissionRequirementV1(requirement);
  if (normalized === null || snapshot.permissions[0] === "*") return true;
  const granted = new Set(snapshot.permissions);
  if (normalized.mode === "allOf") {
    return normalized.permissions.every((permission) => granted.has(permission));
  }
  return normalized.permissions.some((permission) => granted.has(permission));
}

export function authorizesAssistantDocsDocumentV2(
  disposition: "eligible" | "deny_all",
  requirement: DocsPermissionRequirementV1 | null,
  snapshot: AssistantDocsPermissionSnapshotV1
): boolean {
  if (disposition === "deny_all") return false;
  return satisfiesAssistantDocsPermissionRequirementV1(requirement, snapshot);
}

// ONE transaction-scoped pipeline shared by the direct V2 retriever AND the
// era-aware facade. It ALWAYS returns the complete declared
// `AssistantDocsDbSearchResultV2` (empty_query, or ready with snapshot +
// ranked records + authorized relations); raw candidate rows never leave this
// helper. Statement 1 RESOLVES and returns the authoritative era/pointer/ACL
// inside its own result and enforces the optional `requiredEra` on the
// resolved era, statement 2 loads
// the selected authorized evidence from EXACTLY that era, and optional
// statement 3 loads authorized relations — successful-path 0/2/3 statement
// counts (application-data statements through tx only; BEGIN/COMMIT/SET and
// protocol commands never count), plus the direct path's controlled
// mismatch=1 when statement 1 fails the `requiredEra` gate, no
// separate era/pointer preflight read and
// no dual-backend fallback.
async function searchAssistantDocsPipelineV2(
  tx: Transaction,
  input: {
    query: string;
    searchContext: AssistantDocsGuideSearchContextV1;
    limits: AssistantDocsSearchLimitsV2;
    requiredEra?: "v1" | "v2"; // optional. The direct V2 retriever passes
                               // "v2"; the facade passes nothing. Statement 1
                               // resolves the authoritative era from the
                               // active-pointer row it joins and enforces
                               // requiredEra on that resolved era (a mismatch
                               // fails closed with the internal
                               // `assistant_docs_v2_consumer_not_ready`
                               // sentinel and zero evidence).
  }
): Promise<AssistantDocsDbSearchResultV2> {
  // ONE era-resolving candidate statement: joins the single active-pointer
  // row, returns the authoritative era plus the exact era's candidates, and
  // enforces `requiredEra` on the resolved era before returning (the direct
  // V2 retriever's required `v2` fails closed while the pointer is still
  // `v1`). No `readAssistantDocsActiveEraV2` preflight exists.
  const { era, candidates } = await selectAuthorizedEraCandidatesV2(tx, {
    query: input.query,
    searchContext: input.searchContext,
    permissionSnapshot: input.searchContext.permissionSnapshot,
    candidateLimit: input.limits.candidateLimit,
    minScore: input.limits.minScore,
    requiredEra: input.requiredEra,
  }); // era "v1": the ACL-joined bounded V1 candidate statement joining the
      // EXACT ACL snapshot named by the active pointer's
      // `legacy_acl_snapshot_id` on `source_path` (an unbound pointer
      // authorizes zero V1 rows; SQL authorization (disposition/permission/
      // publication targets) runs BEFORE title/body projection and LIMIT, and
      // the ACL snapshot's own identity is the ready result's exact
      // authorization/evidence snapshot); era "v2": the active-V2 candidate
      // statement (active/readiness + SQL authorization + locale/version
      // predicates + indexed candidate LIMIT)
  const active = normalizeAssistantDocsSnapshotIdentityV2(candidates.snapshot);
  const selected = rerankAssistantDocsCandidatesV2(
    input.query,
    candidates.records,
    { capabilityIds: input.searchContext.capabilityIds }
  ).slice(0, input.limits.topK);
  // Statement 2: selected authorized evidence from exactly the era resolved in
  // statement 1 (V1 rows or V2 rows, never both). On the V1 branch visuals/
  // examples are the exact empty tuples and tokenCounts is computed with the
  // exact deterministic V2-ingest tokenizer over the persisted
  // normalized_text (the ONLY sanctioned derivation site).
  const hits = (await selectAuthorizedLocalizedEvidenceV2(tx, {
    active,
    era,
    permissionSnapshot: input.searchContext.permissionSnapshot,
    candidates: selected,
  })).map(normalizeAssistantDocsRankedLocalizedEvidenceV2);
  assertEveryEvidenceMatchesSnapshotIdentityV2(hits, active);
  // Optional statement 3: authorized relations (unranked base sections only).
  // Enablement comes ONLY from the normalized limits/options
  // (`input.limits.includeSelectedSectionRelations`), never from searchContext.
  const relations = input.limits.includeSelectedSectionRelations && hits.length > 0
    ? await selectAuthorizedAssistantDocsCapabilityRelationsV1(tx, {
        snapshot: active,
        query: {
          kind: "sections",
          sections: hits.map(toExactDocsCapabilitySectionIdentityV1),
        },
        searchContext: input.searchContext, // single permission/locale/
        // productVersion/capability owner; the statement applies the exact
        // locale and lexicographic product-version predicates to every related
        // document/member before projection
        maxRelations: input.limits.maxRelations,
      })
    : [];
  return { state: "ready", snapshot: active, records: hits, relations };
}

export async function searchAssistantDocsDbV2(
  query: string,
  options: AssistantDocsDbSearchOptionsV2
): Promise<AssistantDocsDbSearchResultV2> {
  // Normalize the strict context BEFORE the tokenless and SQL branches; the
  // context is the single owner of the permission snapshot, locale, version,
  // capability context and bounded query.
  const searchContext = normalizeAssistantDocsGuideSearchContextV1(
    options.searchContext
  );
  assertEqualNormalizedQuery(
    normalizeAssistantDocsQueryV1(query),
    searchContext.query
  ); // context/query drift fails closed before SQL
  const limits = normalizeAssistantDocsSearchLimitsV2(options, {
    defaultTopK: 5,
    maxTopK: 10,
    defaultCandidateLimit: 100,
    maxCandidateLimit: 200,
    defaultMinScore: 0.01,
    defaultMaxRelations: 32,
    maxRelations: 64,
  });
  if (isTokenlessAssistantDocsQueryV2(query)) {
    return emptyAssistantDocsSearchResultWithoutSql();
  }
  return db.transaction(
    { isolationLevel: "repeatable read", readOnly: true },
    async (tx) => {
      // Direct V2-only path: the fence must be passed and the active pointer
      // era `v2`. Statement 1 itself resolves/returns the authoritative
      // era/pointer/ACL and enforces this requiredEra; a pre-fence/legacy
      // pointer fails closed with the internal not-ready sentinel and zero
      // evidence (no consumer mixes eras). There is NO separate preflight:
      // `readAssistantDocsActiveEraV2` is never called as its own statement.
      return searchAssistantDocsPipelineV2(tx, {
        query,
        searchContext,
        limits,
        requiredEra: "v2",
      });
    }
  );
}

// Era-aware authoritative facade (deployed by TASK-548-03-L03 before
// activation through the gated consumer cutover): ONE read-only repeatable-read
// transaction selects EXACTLY ONE backend — never both, never a fallback.
// Statement 1 resolves and returns the authoritative era/pointer/ACL inside
// its own result (era `v1`: one ACL-joined bounded V1 statement against
// the ACL snapshot named by the pointer's `legacy_acl_snapshot_id`, with SQL
// authorization applied BEFORE title/body projection and LIMIT, returning that
// ACL snapshot's identity as the ready result's exact authorization/evidence
// snapshot; era `v2`: the
// active-V2 candidate statement), then statement 2 loads the selected
// authorized evidence from exactly that era and optional statement 3 loads
// authorized relations — successful-path 0/2/3 statement counts on both
// branches (application-data statements through tx only; the direct V2 path
// additionally has its controlled mismatch=1), no
// era/pointer preflight statement, and the
// helper ALWAYS returns the complete `AssistantDocsDbSearchResultV2`, never
// raw candidate rows.
export async function searchAssistantDocsAuthoritativeV2(
  query: string,
  options: AssistantDocsDbSearchOptionsV2
): Promise<AssistantDocsDbSearchResultV2> {
  const searchContext = normalizeAssistantDocsGuideSearchContextV1(
    options.searchContext
  );
  assertEqualNormalizedQuery(
    normalizeAssistantDocsQueryV1(query),
    searchContext.query
  ); // context/query drift fails closed before SQL
  const limits = normalizeAssistantDocsSearchLimitsV2(options, {
    defaultTopK: 5, maxTopK: 10, defaultCandidateLimit: 100,
    maxCandidateLimit: 200, defaultMinScore: 0.01,
    defaultMaxRelations: 32, maxRelations: 64,
  });
  if (isTokenlessAssistantDocsQueryV2(query)) {
    return emptyAssistantDocsSearchResultWithoutSql();
  }
  return db.transaction(
    { isolationLevel: "repeatable read", readOnly: true },
    async (tx) => {
      // Statement 1 resolves and returns the authoritative era/pointer/ACL in
      // its own result; no preflight read, never two backend statements, and
      // the shared pipeline always returns the complete result.
      return searchAssistantDocsPipelineV2(tx, {
        query,
        searchContext,
        limits,
      });
    }
  );
}
```

`ingestPackagedAssistantDocsV2` is the sole post-cutover runtime/reindex
dependency. Its strict server input is only `{ actorId, force?, signal,
requestKind? }` (`requestKind` is `"startup"` | `"manual"`, default
`"manual"`, and is persisted as the run's `request_kind`; it is never a
request-body field);
`signal` is the timeout-owned `composeAssistantDocsIngestAbortSignalV1()`
result and is never a request-body field; there is no lifecycle or
request-disconnect composition (dockerStart precedes the runtime entrypoint and
the Admin router context has no request signal). The signal is never passed
into the fixed loader: `loadPackagedDocsDistributionBundleV2()` stays
zero-argument, and the caller checks `signal.aborted` before the call and
immediately after it returns. All ingest DB work runs through independent
`withDedicatedDatabaseSession` sessions with `{ signal, statementTimeoutMs }`
(pending allocation, finalization and reconciliation each on their own
session; `lockSession` owns only lock/liveness and never executes a
statement), never global `db.transaction`; cancellation fails closed as
`assistant_docs_ingest_failed` with safe reason `cancelled`, never a partial
snapshot or active-pointer change. `force` may reingest identical
packaged bundle but never bypasses the single-ingest lock. It calls the exact
zero-argument packaged loader once and passes that returned normalized bundle
directly to the ingest core; it never accepts/reads settings, `sourceRoot`,
repository Markdown, provider/model state, a caller-supplied path/bytes, an
environment path override, or `process.cwd()`.

**Data flow:** actor/force/request-kind metadata → session-budget validation
(before bundle
read) → the shared cross-process advisory lock (lockSession: liveness only) →
preactivation producer gate (a bounded fence-state read: at
`v1_active`/`v1_frozen` return the bounded internal
`deferred_cutover_backfill` result with zero bundle-load/run/snapshot side
effects; at later preactivation states only same-hash prepared reuse is
reachable and hash drift fails with the public `assistant_docs_cutover_required`
conflict) →
sole-pending-run preflight (CAS-settle the recovered pending row as
prepared/unchanged/activated/failed per the persisted
`(status, result_kind, changed, run_result.snapshot_id, request_kind, request
identity)` provenance — the run's snapshot linkage joined from the acyclic
`assistant_docs_v2_ingest_run_results` row — and free its pending slot; the current
invocation ALWAYS proceeds to its own bundle load and admission/run — never an
early return of a recovered result) → two `assertNotAborted` checks
around the one zero-input loader call (which holds the bundle across
hazard/report-link inventory,
bounded same-handle parsing/normalization and final rescan; the signal never
enters it) → ingest persistence
boundary independently revalidates that normalized bundle → exact `assistant`
target filter → complete in-memory document/section/chunk/evidence plan →
PHASE A: durable `pending`-run allocation COMMITted in its own independent
dedicated-session transaction (persists `request_kind` plus the request
identity; re-reads fence/active/prepared/counters,
recomputes and asserts the exact deltas; crash between phases leaves a durable
pending row for the next holder) → PHASE B: a second independent
dedicated-session transaction writes and closure-checks an inactive snapshot or
reuses the prepared one (the snapshot stores its immutable acyclic
`producer_run_id`; the run CAS-sets `result_kind`/`changed`/`terminal_at` and
the exact `assistant_docs_v2_ingest_run_results` row is inserted with the run
and snapshot — the ONLY run → snapshot reference), then CAS-finalizes the strict
`AssistantDocsIngestResultV2` (`prepared` with changed true/false without
touching the pointer — the run is terminal and never re-finalized, or
post-fence `unchanged`/`activated` where one-active ordering applies: the prior
active row is demoted FIRST, then the new active row is inserted, then the
pointer/predecessor update, run finalization and the replacement activation
event commit together, so any later failure rolls the demotion back) → on
error, a FRESH independent
session runs the one read-only repeatable-read reconciliation awaited with the
bounded reconciliation-only timeout → one bounded no-throw retention
pass.
Readers select only through one active
`{ snapshotId, generation, sourceHash }` and resolve it from PostgreSQL for each
question; before activation (and after rollback) the era-aware facade serves
the ACL-joined frozen V1 corpus with exactly one backend; no cache or event
delivery participates. Startup compares the packaged bundle hash, not a
Markdown-only filesystem fingerprint. Every startup/reindex calls
`loadPackagedDocsDistributionBundleV2()` exactly once (except the
`deferred_cutover_backfill` pre-freeze branch, which loads nothing) and cannot invoke public
inspection/recovery/pair APIs. A runtime package containing the valid
bundle and no `.tmp`, migration report, workspace journal, staging file or
backup must start, hash-check and reindex successfully.
For a query, unknown server snapshot → exact snapshot/catalog normalization
before DB access → the era-aware facade selects exactly one backend and runs
the shared transaction-scoped pipeline (statement 1, the era-resolving candidate
statement that resolves and returns the authoritative era/pointer/ACL from the
active-pointer row it joins and enforces the optional `requiredEra`: V1 — one ACL-joined bounded statement against the ACL snapshot
named by the pointer's `legacy_acl_snapshot_id` with SQL authorization before
projection/LIMIT, returning that ACL snapshot's identity as the ready result's
exact authorization/evidence snapshot; V2 — one active-snapshot candidate SQL with authorization
before text projection and bounded vector rank/limit; there is NO separate
era/pointer preflight statement) →
statement 2, one selected-evidence batch from exactly that era
(complete persisted base chunk record) →
optional statement 3, one relation batch (unranked base sections) → source,
visual/example
and action-input projection
from that same snapshot. The pipeline always returns the complete
`AssistantDocsDbSearchResultV2` with the successful-path 0/2/3 statement
counts (application-data statements through tx only, excluding BEGIN/COMMIT/
ROLLBACK/SET and protocol commands; the direct path adds its controlled
mismatch=1); there is no
permissionless retrieval,
filesystem/bundle load, Markdown parse, projection-constructor call or external
docs request in the per-query path.

**Compatibility:** the migration creates the separate cohesive V2 table set
and the cutover backfill command (the sole preactivation producer) runs only
after the `v1_active → v1_frozen` freeze; the V2 snapshot content is ALWAYS
materialized from the one normalized fixed packaged bundle plus the exact
in-memory plan, never by
copying the immutable frozen V1 rows (the frozen V1 rows are read only for the
legacy ACL classification and the shadow-parity baseline, and a fresh install
with zero V1 rows still persists the exact bundle document/chunk/evidence
closure); no
nullable/backfilled V2 field is ever added to the V1 tables, which stay
byte/DDL-compatible. The backfill uses a frozen, reviewed map of
trusted legacy `source_path` to exact publication targets and permission
requirements for that ACL/classification only. Unknown/unmapped/protected
source paths become deny-all rows
in the ACL classification
and are never interpreted as public/null permission. Tests pin users,
roles, API keys, backups, settings, and other protected Guide sources. A
successful v2 reindex promotes strict non-null v2 identity for the active
snapshot. Until TASK-548-03-L03 switches all consumers, the legacy symbol can
read only that frozen legacy snapshot and denies V2 as consumer-not-ready;
after the consumer cutover, the era-aware facade serves Guide over the
ACL-covered frozen V1 corpus (before activation and after rollback) and over
the active V2 snapshot (after activation) with exactly one backend; the
internal `assistant_docs_v2_consumer_not_ready` sentinel is retained through
preactivation and the service maps it to the public `assistant_index_missing`/
503 + `docs_not_ready` status (never removed before activation).
This leaf removes the legacy startup producer (V1 freeze gate: DB trigger
guards are the authority, the producer removal is the static gate); TASK-548-03-L03
then removes the parallel legacy runtime ingest/search callsites after
restart/rollback tests pass; source Markdown is never destructively
rewritten during runtime.

**Error handling:** normalize invalid/missing/tampered bundle to
`assistant_docs_bundle_invalid`, DB failure to
`assistant_docs_ingest_failed`, lock conflict to
`assistant_docs_reindex_conflict`, unavailable DB to
`assistant_docs_db_unavailable`, and a full/bounded capacity rejection to
`assistant_docs_capacity_exceeded`; malformed trusted permission input is
`assistant_docs_permission_snapshot_invalid`, malformed resolved search
context is the internal `assistant_docs_search_context_invalid`, cancellation
is `assistant_docs_ingest_failed` with safe reason `cancelled`, the bounded
manual-preactivation/backfill/source-drift operator-required conflict is the
SEVENTH PUBLIC error `assistant_docs_cutover_required` (TASK-548-03-L03 maps
it to HTTP 409; it is never collapsed into a generic 500, and startup logs
the internal `deferred_cutover_backfill` result WITHOUT any HTTP mapping — the
deferred result remains non-HTTP), and a
pre-cutover legacy caller or pre-fence V2 consumer observing the other era
maps to `assistant_docs_v2_consumer_not_ready` without evidence. Public
mapping (TASK-548-03-L03, one centralized switch): the internal context
sentinel maps to public `ApiError` code `validation_error` with HTTP 400 and
bounded details (never the sentinel code); the internal
`assistant_docs_v2_consumer_not_ready` is retained through preactivation and
the service maps it to the existing public `assistant_index_missing` with HTTP
503 and status `docs_not_ready` (never leaking the internal code).
`normalizeDocsIngestError` preserves ALL SEVEN public typed machine errors —
`assistant_docs_bundle_invalid`, `assistant_docs_ingest_failed`,
`assistant_docs_reindex_conflict`, `assistant_docs_db_unavailable`,
`assistant_docs_capacity_exceeded`,
`assistant_docs_permission_snapshot_invalid` and
`assistant_docs_cutover_required` — with service-level round-trip
tests for every member (including `assistant_docs_capacity_exceeded` and
`assistant_docs_cutover_required`, which are
never dropped or collapsed into a generic 500); the permission normalizer owns the
permission-snapshot error at its own boundary. Unknown
storage errors normalize only to
`assistant_docs_ingest_failed`. TASK-548-03-L03 alone maps them at the existing
route boundary after this leaf lands. Never return internal paths, permission
inventories or SQL details. Run allocation creates only `pending`; allocation
failure has no fictional diagnostic update. Every terminal write is a
pending-only compare-and-set. After a transaction error, fresh-connection
reconciliation is settled separately and cannot mask the normalized domain
error: coherent committed evidence reconstructs success (including the exact
`changed` flag and producer provenance), proven non-commit may
write failed, and unreadable/contradictory evidence stays pending with only a
bounded outcome-unknown diagnostic. A committed active snapshot is therefore
never reclassified as failed, including when the COMMIT response is lost.
The post-commit retention pass is outside that `try/catch` and passes through a
no-throw settler. A pruning failure records only bounded safe maintenance
evidence and cannot turn a committed activation into an apparent ingest
failure. No cache, outbox, browser event, scheduler or worker participates.

**Regression-test shape:** verify full round-trip of every new field, migration
from v1 rows, exact duplicate `(snapshotId, docId, locale)` rejection,
same-`docId` different-locale and same-identity different-snapshot acceptance,
`force: true` same-hash generation coexistence, permission/capability metadata,
locale-bearing hit/source evidence, complete visual/example/link/provenance
records and localized asset refs, startup hash
skip/reindex, a catalog-only source mutation with identical document/assets
requiring a new source hash and relation snapshot, stale-row pruning, concurrent reindex
serialization, rollback after mid-write failure and continued reads from the
previous snapshot. Test the exact snapshot normalizer and required retriever
signature: null plus ready empty-snapshot success, ready empty denial for every
non-null requirement, invalid empty non-null requirements, partial/full
`{ mode: "allOf", permissions }`, every
`{ mode: "anyOf", permissions }` branch, exact sole `["*"]` full access, and
rejection of unknown requirement mode plus missing/malformed/unknown-key/
unknown-permission/duplicate/mixed-wildcard snapshots before the first DB query.
Prove unknown/protected legacy paths backfill deny-all and cannot leak users,
roles, API keys, backups, settings, or other protected content. Prove
unauthorized rows never reach title/text/evidence projection, Bun ranking, hits,
sources, or evidence metadata. Query-count fixtures count ONLY application
data SQL statements issued through the transaction handle (BEGIN/COMMIT/
ROLLBACK, `SET` and protocol commands never count) and assert the FULL matrix:
invalid options/context and tokenless queries 0; the direct V2 retriever's
`requiredEra` mismatch exactly 1 (statement 1 executes and fails closed with
the internal sentinel — no evidence statement runs); ready plain 2; ready
enriched-with-selected-hits 3; ready enriched zero-hit 2. For
tokenless/plain/enriched-with-selected-hits
search assert
the successful-path 0/2/3 statements (an enriched zero-hit request stays at 2 and never
issues an empty relation query), candidate default/max 100/200, top-K
default/max 5/10,
relations default 32/max 64 (enabled only through the normalized
`AssistantDocsSearchLimitsV2.includeSelectedSectionRelations`/`maxRelations`
options — never from `searchContext`),
for the V1-era facade branch (before activation and after rollback the facade
runs the shared pipeline's successful-path 0/2/3 counts — statement 1 is the SINGLE
ACL-joined bounded V1 candidate query with SQL
authorization before title/body projection and LIMIT, statement 2 loads the
selected authorized V1 evidence, and optional statement 3 loads relations;
the branch is NEVER a single-statement path — and the V2 branch keeps
its successful-path 0/2/3 statements; one-backend query-count fixtures prove the facade NEVER
queries both and that the direct path's mismatch is exactly 1), plus spies proving neither public entrypoint issues a separate
era/pointer preflight statement (`readAssistantDocsActiveEraV2` is never
called as its own query; the authoritative era/pointer/ACL identity comes from
statement 1's own result on both paths), zero-unauthorized-bytes fixtures across the whole cutover
(deny-all and requirement-failing V1 rows cannot leak title/snippet/body even
when the pointer is still `v1`), activation/rollback pointer-switch fixtures
(the facade flips backend on the DB pointer switch only, with no Guide gap),
the byte-identical TASK-551 document
vector identity and the exact SINGLE combined V2 chunk vector/index/query
identity (imported legacy heading/content expression plus the additive
evidence term; no separate legacy-chunk V2 column/index exists). Search for terms present only in visual alt/caption, the compiled
`scenarioStepSearchText` projection and example title/body/explanation and
prove the correct authorized localized
section is selected without JSON scans, scenario-file reads or cross-locale leakage. Capture sanitized small/large
`EXPLAIN (ANALYZE, BUFFERS)` evidence with fixed row-scan/transferred-byte/p95
budgets and no growing-table sequential scan. Route/security/error-map coverage belongs only
to the later TASK-548-03-L03 writer. Add target-leak fixtures proving `assistant`+`embedded-help`
multi-target documents persist/retrieve while `assistant`-only,
`embedded-help`-only and
`public-docs`-only documents never create rows, chunks, hits or evidence
cards, and `public-docs` remains additional-only for Guide eligibility.
Use two locale rows sharing `docId` and `sectionId` to prove retrieval,
visual/example enrichment and emitted evidence never cross-join.
Inject activation, success-finalization, retention-maintenance and failed-
diagnostic failures. Prove activation/run success are atomic and each query
returns only one complete old/new `sourceHash`. Make post-commit retention throw
and prove the snapshot/run remain successful, no failed-run diagnostic write
occurs, and a later bounded maintenance pass remains idempotent.
Drop the transaction connection immediately before COMMIT, after PostgreSQL
commits but before the client receives its response, and after an unchanged-run
COMMIT. Under the still-held advisory lock, prove a fresh connection reconciles
the exact run/active/snapshot identity: committed activation/unchanged results
are returned and enter the no-throw retention pass, while only a pending row with proven
absence may compare-and-set to failed. Contradictory/unreadable evidence stays
pending and cannot allocate a second generation. Fail run allocation with
DB-unavailable and unknown storage errors; assert exact normalized codes, zero
diagnostic write and no masking. Exercise mutating
workspace promotion recovery only in repository write/recovery fixtures and the
read-only hazard inspector in `--check` fixtures. Build a production
package fixture that deliberately omits `.tmp`, the migration report, journal,
staging and backup files; prove startup/hash-skip/reindex succeeds from the
packaged bundle alone and no runtime call attempts workspace recovery. Tamper
remove, symlink or differently-case that packaged bundle and prove
`assistant_docs_bundle_invalid` without a Markdown, report, journal or network
fallback. At every parent/bundle/report/journal hop, swap directory/file/link
before and after open, initial inventory, report read/linkage, bundle read/
normalization and final inventory. The loader must reject or return complete
bytes from the continuously held bundle inode, never escape/reopen/mix phases.
Pin parent/final device/inode/type/link-count/size/mtime/ctime and reverse-order
close. Unavailable `/proc/self/fd` fails closed without pathname fallback.
For `{ force: false }` and `{ force: true }`, spies prove the exact packaged
ingest API invokes only
`loadPackagedDocsDistributionBundleV2(): Promise<DocsDistributionBundleV2>`
once, passes its returned object to the independently normalizing ingest core,
and never resolves a second loader, runtime settings, source roots, Markdown or
a provider. Pass a malformed value cast as `DocsDistributionBundleV2` directly
to the ingest core and prove it rejects before run allocation or any DB call.
Run the exact packaged-loader test with initial working directories at the
repository root, `core/`, and `packages/docs-portal/`; all must resolve identical
bytes/hash through the package/Core aliases of the exact same private function.
Repeat in final Docker from an unrelated cwd with no path environment variable.
Spy that no capability/URL/path/options API exists, `process.cwd()` is never read,
and the L02 publication-projection constructor independently normalizes the
loader result at its own boundary without causing another file read.
Statically pin both alias imports by reference identity and reject any wrapper,
second byte reader, or `docsMigrationReport.ts` public/barrel export.
Run a Node-environment import/read fixture with `globalThis.Bun` absent and
assert zero DB/settings/server imports; after L02 wires the consumer,
`bun --cwd core build:admin` must execute `core/vite.config.ts` with this exact
module and identical `sourceHash`.
Run two real processes/connections racing startup and manual reindex against
both an empty database and an already-populated active snapshot. Prove the same
pinned advisory key and acquisition order, exactly one winner, conflict before
bundle read/run allocation/DB mutation, release after success/error/process
death, later acquisition, and one complete active snapshot without duplicate
generation/run artifacts. Crash during resumable compatibility backfill and
retention pruning, resume from the last opaque stable keyset cursor, and prove
no duplicate or omitted row. Independently alter every disposition, permission,
publication target, locale, snapshot identity, evidence-search field and cursor
component; malformed values fail closed before activation. Run crash-resume
pruning fixtures for terminal runs, active/inactive snapshots, outcome-unknown
rows, active/immediate-predecessor pins, stable keyset boundaries and
concurrent inserts; pin bounded query counts and sanitized representative
small/large plans.
Add capacity/no-op/reuse fixtures: at full snapshot and byte ceilings with a
matching active hash, `force:false` same-hash `unchanged` succeeds with
`additionalSnapshots: 0, additionalBytes: 0` (prove only the unchanged run row
is added); a new `activated` snapshot at the same ceiling fails
before run allocation with `assistant_docs_capacity_exceeded` (and the backfill
command's `prepared` replacement at a full ceiling fails identically before its
run allocation); at the post-backfill preactivation states
(`backfill_complete`/`shadow_parity_clean`/`consumers_ready`)
pre-fence
same-hash `force:false` AND `force:true` reuse the one complete prepared
snapshot with `additionalSnapshots: 0, additionalBytes: 0` and `changed:
false`; `force:true` same-hash inside the rolling
hour fails before allocation (also when reuse would apply) and outside it
succeeds; two concurrent pre-fence processes of one bundle never create
duplicate building/prepared snapshots — the backfill command is the SOLE
producer and
startup/manual ingest can never allocate a `building`/`prepared` run (global
constant-expression partial unique invariants over
`lifecycle = 'building'` and `lifecycle = 'prepared'`, constraint race maps to
reconciliation); the backfill command's different-hash rerun atomically retires the prior
prepared (`prepared → inactive`) before inserting and never creates a second
building/prepared row; the pinned capacity counter query covers every retained
lifecycle state (`building` + `prepared` + `active` + `inactive`) and a
building/prepared snapshot
counts toward both ceilings exactly like an active one; a mid-flight
`building` snapshot at a full ceiling blocks the backfill's durable start
transaction with `assistant_docs_capacity_exceeded` before any child batch
(and the pinned full-ceiling abort test proves `--abort` frees the ceiling IN
THE SAME transaction by deleting the never-served building snapshot cohort —
the capacity counters drop immediately and a fresh backfill's durable start
succeeds at the previously full ceiling); spies prove the fixed bundle
loads exactly once, hash/bytes are computed before cooldown and admission, and
the allocating dedicated-session transaction re-reads fence/active/prepared/
counters and recomputes and asserts the exact deltas before run/snapshot
allocation.
Add preactivation-producer fixtures (decision: ONE producer only):
startup-before-freeze — at `v1_active` and at `v1_frozen` startup (and manual
reindex) returns the bounded internal `deferred_cutover_backfill` result with
zero bundle-load, zero pending-run allocation, zero prune/capacity work and
zero snapshot writes (spies prove `loadPackagedDocsDistributionBundleV2` and
`createPendingDocsIngestRunV2` are never called), and the backfill command
refuses to run before `v1_frozen`; concurrent backfill/startup — two processes
racing under the same advisory lock prove the backfill command is the only
producer (exactly one terminal `request_kind='cutover_backfill'` run, one
`building`-then-`prepared` snapshot and one closed ACL set
exist; startup after the race either reuses the prepared
snapshot same-hash or returns the bounded conflict, and a pending backfill run
is reconciled by the backfill command's own rerun, never by startup); hash
drift — startup/manual at `backfill_complete`/`shadow_parity_clean`/
`consumers_ready` with a changed packaged hash returns the public
`assistant_docs_cutover_required` conflict BEFORE run allocation or any
snapshot write, the
explicit source-drift reset row
(`resetAssistantDocsV2CutoverSourceDriftV1`) CAS-returns the fence to
`v1_frozen` from any of `backfill_complete`/`shadow_parity_clean`/
`consumers_ready`, clears the stale parity/readiness evidence and rollout
receipt, retires the prepared/building snapshot, and only the SAME backfill
command rerun replaces the
prepared snapshot; manual reindex can never become a second preactivation
producer at any preactivation state.
Add resumable-backfill fixtures: kill the command after the durable start
transaction (pending run + `building` snapshot + closed ACL rows + initial
cursor/progress on the run), after each child batch, and before the final
closure transaction; every rerun resumes the SAME run and SAME building
snapshot from the last CAS-committed `backfill_progress`/`backfill_cursor` with
no duplicate or omitted row and never a second building snapshot; the global
`lifecycle = 'building'` partial unique index blocks a second concurrent
backfill; the final transaction's closure verification (final keyset, zero
unclassified rows, deny-all fixtures, referential/locale/evidence closure,
exact plan digest, AND the bundle-plan-persisted identity match) fails closed
on any gap and `--abort` DELETES the never-served building snapshot cohort
(children/run-result rows cascade), marks the run `failed` with a bounded safe
diagnostic/cursor receipt, NEVER updates the pointer's
`legacy_acl_snapshot_id` (an initial abort leaves NULL; a replacement abort
retains the prior valid binding — V1 readiness stays `ready` on that bound
ACL snapshot with its retention pin intact), and frees capacity in the same
transaction (then a fresh backfill starts; the cohort is never converted to a
30-day inactive row).
Add acyclic-FK/catalog fixtures: `assistant_docs_v2_ingest_runs` has NO
snapshot FK and NO `snapshot_producer_run_id` column; the ONLY run → snapshot
reference is `assistant_docs_v2_ingest_run_results` (`run_id` CASCADE +
`snapshot_id` CASCADE, unique per run, exact `result_kind`/`changed`);
`snapshots.producer_run_id` and both activation-event FKs are
`ON DELETE RESTRICT`; every snapshot-owned child table and the legacy ACL
cascade; catalog/crash tests pin the cohort prune order (expired events →
snapshot with children/results/ACL cascading → now-unreferenced producer run)
and that ordinary expired reuse/failed runs delete with their result rows
cascading.
Add run-provenance fixtures (reuse/new/backfill/activation/rollback): every run
row persists `request_kind` (`startup`/`manual`/`cutover_backfill`),
`result_kind`/`changed` per the exact ONE status-matrix CHECK — valid rows:
`pending` (`terminal_at`/`result_kind`/`changed` NULL), `failed` (terminal,
`result_kind`/`changed` NULL), `prepared` (`changed` true or false),
`unchanged` (`changed = false`), `activated` (`changed = true`); invalid rows
(pending with any terminal/result/changed value, failed with a `result_kind`,
prepared with `result_kind <> 'prepared'` or `changed` NULL, unchanged with
`changed` true, activated with `changed` false, and any `terminal_at` NULL
non-pending row) all fail the CHECK — the backfill-created prepared snapshot
names its terminal `cutover_backfill`
producer run through `snapshots.producer_run_id` (`ON DELETE RESTRICT`, no
deferrable/cyclic pair), a reuse run links the same prepared snapshot through
its acyclic run-result row (never a self-reference), a replacement-activated
snapshot
names its activating run, and the activation event's `run_id` equals the
snapshot's immutable `producer_run_id` for both event kinds; rollback keeps
all provenance rows intact; reconciliation reconstructs the exact union member
(including `changed`) from the persisted tuple after lost COMMIT; retention
pins runs referenced by any retained snapshot (`producer_run_id`), the
building/prepared state, or an unexpired activation event, and out-of-order
deletes
fail on the `ON DELETE RESTRICT` FKs while the events → snapshots → runs cohort
prune order succeeds.
Add result-union fixtures: every ingest path returns the strict
`AssistantDocsIngestResultV2` union carrying its transaction-verified
`closure`; `prepared` (changed true/false) carries
the prepared snapshot identity, the literal `activeSnapshot: null` and the
`closure: { era: "v1", snapshot: null }` (the
frozen V1 pointer carries no V2 identity; the prepared RUN is terminal and is
never transitioned or finalized again),
`unchanged`/`activated` require the fence passed, their snapshot equals the
active pointer identity, and their `closure` records that exact committed v2
identity; the new `deferred_cutover_backfill` member requires the
literal `snapshot: null`, `activeSnapshot: null`, `changed: false`, the literal
v1 null closure and zero
counts, is reachable ONLY at `v1_active`/`v1_frozen`, and is never persisted
as a run kind; the ONE canonical
`assertAssistantDocsIngestResultClosureV2` verifies each member's own closure
and cross-member invariants without any DB read, and reindex verification
never re-asserts pointer currency after the advisory lock is released
(snapshot-by-id provenance re-checks only); lost-COMMIT reconciliation
reconstructs the exact union member
and never reports a `prepared` result as failure.
Add cutover-fence fixtures: pin the full six-state matrix (`v1_active →
v1_frozen → backfill_complete → shadow_parity_clean → consumers_ready →
v2_activated`), `(state, revision)`
CAS conflicts (two writers with the same `expectedRevision`, one wins, zero
side effects; a stale `expectedRevision` always loses), the explicit
`v2_activated → v1_frozen` rollback row (revision and rollout-generation
increments, active-V2 demotion `active → inactive` with `deactivated_at`,
atomic evidence
clear, `previous_v2_snapshot_id` clear, legacy scalar metadata pair
re-recorded, frozen V1 pointer restore, retry
allowed; the trigger guards stay installed, the frozen V1 rows stay immutable
and safely readable, and the closed ACL binding plus the facade keep serving
the frozen V1 corpus with
exactly one backend — no Guide gap, no re-enabled legacy writes), the
destructive legacy-resume transition
(`rollbackAssistantDocsV2CutoverPreActivationV1` from every pre-fence state —
including `v1_frozen` reached by the post-activation rollback — to
`v1_active`: revision AND rollout-generation increments, V2 cutover-row
evidence clear (`consumers`, rollout receipt, `backfill_finished_at`, parity
fields and `activated_at` — `assistant_docs_v2_activation_events` rows stay
immutable with their `snapshot_id`/`run_id` RESTRICT pins until `event_at +
30d` pruner eligibility; the destructive-resume/retention fixtures prove
unexpired events are never deleted by the resume and the events → snapshots →
runs cohort prune order still requires expired events first), the pointer's
`legacy_acl_snapshot_id` binding
CLEARED, Guide unavailable until a fresh freeze + backfill recreates the
binding, legacy writes re-enabled only at `v1_active`; never the normal
rollback), the
executable source-drift reset row
(`resetAssistantDocsV2CutoverSourceDriftV1` from
`backfill_complete`/`shadow_parity_clean`/`consumers_ready` back to `v1_frozen`
with stale parity/readiness/rollout-receipt clear, prepared retirement and
mid-flight `building` DISPOSAL (run CAS-failed, cohort deleted
with cascades, capacity freed — never `building → inactive`; the never-bound
cohort is never named by the pointer, so its disposal never touches the
retained `legacy_acl_snapshot_id` binding, which the rerun's FINAL
`building → prepared` transaction rebinds to the new complete closed-ACL
snapshot), and the SAME
backfill command rerun),
the rollout-receipt gate before `consumers_ready` (missing/mismatched receipt
blocks; receipt proves zero serving V1-only replicas), readiness idempotency for the same
`(consumerId, deploymentIdentity, expectedRolloutGeneration)` across replicas
and restarts with no duplicate-at-construction failure and conflicting
identity/generation rejection, unknown states/consumers, missing shadow
evidence, shadow-parity mismatch blocks, pre-fence producer-gated ingest
outcomes (at `v1_active`/`v1_frozen`: the bounded `deferred_cutover_backfill`
result with no pointer change and no V2 row served; at the later preactivation
states: same-hash prepared reuse only, drift → the public
`assistant_docs_cutover_required` conflict; sentinel
`assistant_docs_v2_consumer_not_ready`), post-fence legacy-symbol denial,
activation atomicity (crash between pointer switch and finalization recovers to
the committed pair), one-active ordering fixtures (the prior active row is
demoted with `deactivated_at` before the sequence-allocated new active row is
inserted; a second active row is never inserted before the demotion and any
later-step failure rolls the demotion back with the transaction), exact
activation-event fixtures (cutover activation inserts exactly one
`cutover_activation` row linked to the prepared snapshot and its exact
producing run — the snapshot's immutable `producer_run_id`, the terminal
`cutover_backfill` run — while the run stays terminal `prepared`; ordinary replacement
activation inserts `replacement_activation` with the demoted
`previous_v2_snapshot_id`; no run is ever transitioned/finalized twice; event
retention/pruning at `event_at + 30d`), fresh-install fast path, rollback of
inactive V2 artifacts
and restart idempotency at every state.
Add V1-freeze fixtures: prove the new binary has no legacy producer call
(static import-graph test in
`tests/unit/server/httpServerDocsStartupRemoval.test.ts`), and prove the
DB-authoritative freeze for every enumerated trigger path on
`assistant_docs`/`assistant_doc_chunks` (legacy INSERT/UPDATE/DELETE rejected
with `assistant_docs_v1_frozen` once the cutover row is past `v1_active`; no
V2-shaped write on V1 in any state; while `v1_active` legacy writes including
`ON CONFLICT (source_path)` upserts remain compatible), the `v1_active →
v1_frozen` freeze transition's `SHARE ROW EXCLUSIVE` table lock with
`SET LOCAL lock_timeout='5s'` drains in-flight
legacy writers before the CAS (lock/race fixtures: a writer queued behind the
lock runs the trigger after release and fails before mutation; a held writer
makes the transition fail with the bounded `assistant_docs_v1_freeze_lock_timeout`
conflict and the operator reruns — no automatic retry), the `v1_frozen → backfill_complete` final-keyset/closure gate (the cutover
backfill command — the SOLE preactivation producer — runs only
after the freeze and materializes V2 rows from the loaded bundle plus the
in-memory plan, reading the immutable frozen V1 rows only for ACL
classification and the shadow baseline; a zero-row final keyset or an
unclassified row blocks the transition and the command's own
durable-start + batch + final run/snapshot/result-row/state-advance
transactions), old-binary negative
fixtures (a pre-task binary's legacy INSERT/UPDATE/DELETE and
`INSERT ... ON CONFLICT (source_path) DO UPDATE` upserts are rejected, its
legacy reads of frozen V1 stay permitted, attempted V1→V2/V2→V1/cross-row
UPDATE rewrites are rejected, and after activation it may only read stale
frozen V1 — never V2 rows or mutation), trigger idempotence across replicas and
restarts, and migration rollback behavior (dropping the migration drops the
triggers and cutover/lifecycle artifacts; the `v2_activated → v1_frozen`
rollback row
keeps the triggers installed with the frozen V1 rows immutable and re-permits
legacy writes NEVER, while the destructive legacy-resume transition
re-permits legacy writes only when the state
returns to `v1_active`). `dockerStart.ts` keeps the sole awaited packaged
startup path.
Add durable-pending/session fixtures: prove the `pending` run is allocated and
COMMITted in its own bounded dedicated-session transaction while the advisory
lock is held (spies prove a second independent session for
snapshot/finalization and never `lockSession` statements); kill the process
between the pending COMMIT and the finalization transaction and prove the next
advisory-lock holder reconciles AND CAS-terminalizes the durable pending row
(prepared/unchanged/activated/failed per the committed evidence), frees the
pending partial-unique slot, and then ALWAYS proceeds to its own bundle load
and admission/run — never an early return of the recovered result; `force:true`
and newer-package regressions prove the current request's own admission/run
executes after recovery; kill it before the
pending COMMIT and prove no pending row exists; on a finalization error the
failed session confirms rollback/termination, a FRESH independent session
performs the one read-only repeatable-read reconciliation awaited with the
bounded reconciliation-only timeout (never detached), and outcome is never left
unknown without attempted settlement. Validate the two-session maintenance
budget in every mode before bundle read through terminal TASK-551-02-L02's
exact `assertDedicatedDatabaseSessionBudget` helper and map incapability to
`assistant_docs_db_unavailable`. Pin the cutover `deployment_identity`
null/state constraint, the consumer-entry `{ deploymentIdentity,
rolloutGeneration, readyAt }` shape and rollout-generation staleness, the
rollout receipt gate before `consumers_ready`, `revision` increment on every
transition with `rollout_generation` stable per rollout, the run exact status
enum (`pending|prepared|unchanged|activated|failed`) with the exact
`request_kind` (`startup|manual|cutover_backfill`),
`requested_at`/`terminal_at` nullability and `actor_id`, the run
`force`/`source_hash` columns against the rolling-hour cooldown, the exact
ONE status-matrix CHECK with every valid/invalid row pinned (no boolean
equivalence remains), the run `backfill_cursor`/`backfill_progress`/
`backfill_plan_sha256` columns and their backfill-state CHECK, the
`assistant_docs_v2_ingest_run_results` table (unique-per-run, CASCADE FKs,
exact outcome/changed) and the acyclic provenance (runs have NO snapshot FK,
no `snapshot_producer_run_id`, no deferrable/cyclic pair),
the active-pointer per-era CHECK matrix (valid `v1` both-legacy-NULL, valid
`v1` both-legacy-set, valid `v2` snapshot non-null + legacy both NULL; invalid
`v1` with snapshot, invalid `v2` without snapshot, and split legacy pairs fail
closed; the initial row restores the byte-valid both-legacy-NULL `v1` shape
and the `v2_activated → v1_frozen` rollback restores the byte-valid `v1`
shape with the legacy pair re-recorded — V1 stays frozen),
and every snapshot `lifecycle` transition (`building|prepared|active|inactive`)
with the
`activated_at`/`deactivated_at` CHECKs plus the
three global constant-expression partial unique
`(true) WHERE lifecycle = 'building'` / `(true) WHERE lifecycle = 'prepared'` /
`(true) WHERE lifecycle = 'active'`
indexes, the dedicated `assistant_docs_v2_snapshot_generation_seq`, the
`previous_v2_snapshot_id` predecessor updates on
activation/replacement/rollback, the `assistant_docs_v2_legacy_acl`
populated/closed during backfill (unique per `(snapshot_id, source_path)`,
CASCADE with its snapshot, zero writes after closure, surviving rollback), and
the retention-eligibility partial indexes
(`snapshot_id`/`run_id`/`event_id` PK tiebreakers);
migration
snapshot/journal artifacts carry all of the above atomically.
Add search-context fixtures: normalization matrix, context/query drift
rejection before the tokenless/SQL branches, the context as the single
permission-snapshot owner (no separate option), exact locale and parameterized
lexicographic product-version tuple
statement predicates (lower/upper boundary, malformed/overflow; the
equality-prefixed `(snapshot_id, locale, …)` `assistant_docs_v2_documents_product_version_idx`
index/EXPLAIN contract with a pinned index-scan plan that never leads with a
range column), capability-
context rerank determinism, Help deep-link locale and official version
behavior, and route-level rejection of browser-supplied versions, capabilities,
routes, permissions and snapshots.
Add document-field fixtures: `keywords_json` round-trip, reject-unknown and
byte-budget tests prove the normalized unique ordered keyword array persists on
`assistant_docs_v2_documents.keywords_json`, the imported
`SEARCH_VECTOR_SQL.assistantDocs` expression resolves byte-for-byte, and
title/keyword-only hits return the correct authorized rows without JSON casts;
full chunk-record round trips prove stable `chunk_id`, `heading_path` (the
bounded ordered `text[]` — element-for-element byte-for-byte into the
`headingPath: readonly string[]` evidence field; scalar-string and
out-of-bounds fixtures fail the immutable array CHECK),
`heading`, `content`, `line_start`/`line_end`, `normalized_text`,
`token_count` and bounded exact `token_counts` persist and project unchanged
(missing/malformed `token_counts` fixtures fail the strict normalizers — no
fallback, no derive-at-read repair).
Add evidence-split fixtures: `normalizeAssistantDocsLocalizedEvidenceV2`
round-trips the complete persisted base (chunkId/ordered headingPath/content/
lineStart/lineEnd/normalizedText/tokenCount/tokenCounts plus document/section/
visual/example metadata), REJECTS a scalar `headingPath` string and any
missing/malformed `tokenCounts` (mandatory, no fallback), and REJECTS any
query-derived field (`snippet`,
`score`, `matchedTerms`, `rankingSignals`, or an invented
query-term/score canary); `normalizeAssistantDocsRankedLocalizedEvidenceV2`
wraps that exact base with the query-derived `snippet`/`score`/`matchedTerms`/
`rankingSignals` and rejects unknown keys, mixed snapshots, cross-owner
records and mismatched source hashes; search-result records (`state: "ready"`
`records`) are ranked while relation `sections` are the unranked base and
never carry score/query terms; exact projection/authorization tests prove the
Guide primary-answer/composer path consumes ranked records and relation cards
consume base records.
Add cancellation fixtures: abort during lock acquisition, immediately before
and after the one zero-argument bundle load, and each dedicated-session
execute/transaction phase; prove bounded `assistant_docs_ingest_failed`
(`cancelled`), no partial snapshot/pointer change, advisory-lock release, the
loader itself never receives a signal, and no global `db.transaction` call
under the advisory lock.

## Sub-Tasks

- [ ] Add the cohesive `core/db/tables/assistantDocsV2.ts` owner (V2 snapshots,
  documents, sections, chunks, visuals, examples, capability relations/members,
  ingest runs, the acyclic run-results table, the legacy ACL table, activation
  events, active pointer, cutover row) plus thin schema
  facade re-export and complete next-free migration artifacts (SQL +
  `meta/*_snapshot.json` + `meta/_journal.json` entry atomically); the legacy
  `core/db/tables/assistant.ts` owner and V1 tables stay byte/DDL-compatible;
  import terminal TASK-551 vector expressions, add the single combined V2
  chunk vector/index (imported legacy heading/content expression plus the
  additive evidence term; no separate legacy-chunk V2 column/index),
  the single-row `assistant_docs_v2_cutover` table (with
  `deploymentIdentity` null/state constraint, `revision`,
  `rollout_generation`, structured `consumers` entries, bounded
  `rollout_receipt` and evidence columns) initialized `v1_active` with the six
  exact states (`v1_active | v1_frozen | backfill_complete |
  shadow_parity_clean | consumers_ready | v2_activated`), the
  `assistant_docs_v2_active_pointer` single row with
  `previous_v2_snapshot_id` and the legacy scalar metadata columns plus the
  exact per-era CHECKs (v1: `snapshot_id` NULL, legacy pair both NULL or both
  set; v2: `snapshot_id` non-null, legacy pair both NULL), the snapshot
  `lifecycle` column/check (`building|prepared|active|inactive`) plus the
  `activated_at`/`deactivated_at` CHECKs, the
  immutable ACYCLIC `producer_run_id` provenance FK (`ON DELETE RESTRICT`,
  never deferrable) and
  the three global constant-expression partial
  unique (`true`) `WHERE lifecycle = 'building'` / `WHERE lifecycle = 'prepared'`
  / `WHERE lifecycle = 'active'`
  indexes, the dedicated snapshot-generation sequence, the run exact status
  enum (`pending|prepared|unchanged|activated|failed`) with
  `requested_at`/`terminal_at`/`actor_id`/`force`/`source_hash` plus
  `request_kind`/`result_kind`/`changed`/`backfill_cursor`/
  `backfill_progress`/`backfill_plan_sha256` columns and the ONE status-matrix
  CHECK (every valid/invalid row pinned), the
  `assistant_docs_v2_ingest_run_results` (unique per run, CASCADE FKs, exact
  outcome/changed), the `assistant_docs_v2_legacy_acl` (populated/closed during
  backfill, unique per `(snapshot_id, source_path)`, CASCADE), the
  `assistant_docs_v2_activation_events` audit table,
  `keywords_json` and the six product-version bound columns with CHECKs on
  `assistant_docs_v2_documents` plus the equality-prefixed
  `assistant_docs_v2_documents_product_version_idx`, the bounded ordered
  `heading_path text[]` array CHECK on `assistant_docs_v2_chunks`, and the V1
  freeze trigger
  guards on
  `assistant_docs`/`assistant_doc_chunks` (all enumerated paths).
- [ ] Add the zero-input Node package named alias; consume L02's existing Core
  alias unchanged and make
  reindex/startup ingest through the sole atomic
  `loadPackagedDocsDistributionBundleV2(): Promise<DocsDistributionBundleV2>`
  seam; independently re-normalize its
  result at the ingest persistence boundary without another load/read or
  workspace transaction dependency.
- [ ] Extend retriever row mapping for stable IDs and permission/visual/example
  source/link/provenance metadata plus exact capability IDs; own the two strict
  evidence normalizers — the unranked `AssistantDocsLocalizedEvidenceV2` base
  (complete persisted chunk identity: chunkId/headingPath/content/lineStart/
  lineEnd/normalizedText/tokenCount/tokenCounts) and the ranked
  `AssistantDocsRankedLocalizedEvidenceV2` wrapper (query-derived snippet/
  score/matchedTerms/rankingSignals) — with search records ranked and relation
  sections unranked; add the exact
  required server permission snapshot normalizer/evaluator, the pure
  `assistantDocsSearchContext.ts` strict DTO and active-identity
  authorized retrieval without exposing unauthorized content or reading the
  packaged corpus per question.
- [ ] Commit the active-pointer row, the snapshot `lifecycle` transition and
  success atomically; reconcile
  ambiguous COMMIT responses from a fresh connection with pending-only
  transitions, use no Guide value cache/outbox/worker, and run bounded retention
  maintenance through a no-throw post-commit settler.
- [ ] Guard startup and manual ingest with the one pinned PostgreSQL session
  advisory lock, using conflict-before-work and release/discard semantics;
  thread the timeout-owned `AbortSignal` through lock, dedicated-session
  execute/transaction and the two checks around the one fixed bundle load.
- [ ] Replace the source-root startup fingerprint/lock with one awaited packaged
  ingest call composed with the timeout-only signal, add no
  worker/timer/lifecycle participant, and leave
  `dockerStart.ts` unchanged.
- [ ] Remove the legacy `initializeDocsIndexOnBootIfEnabled` import/fire-and-
  forget call from `core/server/httpServer.ts` and the retired source-root
  startup export from `core/services/assistant/docsIndexService.ts`, install
  the DB-authoritative V1 freeze trigger guards, land the focused
  `tests/unit/server/httpServerDocsStartupRemoval.test.ts`,
  and prove the V1 freeze gate (trigger/lock/race/old-binary fixtures show no
  old/new binary mutates V1 after freeze)
  before `v1_active → v1_frozen`; TASK-548-03-L03 does not edit those
  files.
- [ ] Add the resumable cutover backfill command
  `scripts/docs/migrate-assistant-docs-v2.ts`
  as the SOLE preactivation producer (runs only after `v1_frozen`, loads the
  fixed packaged bundle once, commits the durable start transaction — pending
  `request_kind='cutover_backfill'` run + sole `building` snapshot + closed
  `assistant_docs_v2_legacy_acl` rows + bounded cursor/progress/plan/sourceHash
  on the run — materializes every child row from the loaded bundle plus the
  in-memory plan (never from V1 rows) in separate ≤500-row/4 MiB
  transactions with CAS progress updates, and in its final transaction
  verifies closure (including the bundle-plan-persisted identity match) and
  atomically transitions `building → prepared`,
  finalizes the terminal `prepared` run with the exact run-result row, and
  advances `v1_frozen → backfill_complete`; crash resumes the SAME run and
  building snapshot; `--abort` DELETES the never-served building snapshot
  cohort, marks the run `failed` with a bounded safe diagnostic/cursor
  receipt, and frees capacity in the same transaction; same-hash/plan reruns
  at/after `backfill_complete` return the replay receipt
  (`replayed: true`, the original persisted prepared result with its
  `changed: true`, no run, no rows, no state transition),
  different-hash reruns replace after the explicit source-drift reset
  back to `v1_frozen`),
  the
  read-only shadow-parity gate, the persisted `assistant_docs_v2_cutover`
  fence helpers with `expectedRevision` CAS
  (`casTransitionAssistantDocsV2CutoverStateV1`,
  `declareAssistantDocsV2ConsumerReadyV1`,
  `requireAssistantDocsV2ActivationFenceV1`,
  `rollbackAssistantDocsV2CutoverV1`,
  `rollbackAssistantDocsV2CutoverPreActivationV1`,
  `resetAssistantDocsV2CutoverSourceDriftV1` — the executable source-drift
  reset from `backfill_complete`/`shadow_parity_clean`/`consumers_ready` back
  to `v1_frozen`, retiring the prepared snapshot and DISPOSING any mid-flight
  `building` cohort (never `building → inactive`) while clearing
  evidence and receipt before the same backfill reruns), the rollout-receipt
  gate before
  `consumers_ready`, the activation command
  `scripts/docs/activate-assistant-docs-v2-cutover.ts`, the rollback command
  `scripts/docs/rollback-assistant-docs-v2-cutover.ts` and the
  forward/rollback runbook; the freeze transition (`v1_active → v1_frozen`)
  drains legacy writers before the backfill runs against the immutable frozen
  V1 rows, `v1_frozen → backfill_complete` requires the final keyset/closure,
  unknown, protected and unmapped rows persist
  explicit `deny_all` and no V2 row is served before `v2_activated` (the
  era-aware facade serves the ACL-covered frozen V1 corpus instead); startup
  and manual reindex never produce a building/prepared snapshot (pre-freeze
  they return
  the bounded `deferred_cutover_backfill` result; at the later preactivation
  states they only same-hash reuse or fail with the public
  `assistant_docs_cutover_required` conflict).
- [ ] Enforce exact capacity deltas for the reachable outcomes (`unchanged`,
  `prepared` reuse at post-backfill preactivation states, `activated` new;
  `prepared` new is reachable ONLY through the cutover backfill command), the
  preactivation drift conflict before allocation, the `force:true`
  same-hash rolling-hour cooldown after bundle load, the prepared-reuse path
  resolved by `sourceHash`, the global constant-expression partial unique
  prepared-snapshot invariant (with atomic retirement of a prior different-hash
  prepared snapshot on backfill replacement), the pinned capacity counter query
  over every retained
  lifecycle state, and run/snapshot allocation only after admissibility
  inside the durable pending-run allocation transaction.
- [ ] Implement the durable-pending protocol with separated sessions: allocate
  and COMMIT the `pending` run in one independent dedicated-session
  transaction (persisting `request_kind` plus the request identity), perform
  snapshot mutation plus CAS terminal run finalization in
  a second independent dedicated-session transaction (persist the snapshot's
  immutable ACYCLIC `producer_run_id` and the run's exact
  `result_kind`/`changed`/`terminal_at` plus the exact
  `assistant_docs_v2_ingest_run_results` row — no snapshot FK on runs, no
  deferrable/cyclic pair; one-active ordering:
  demote the prior active row before inserting the new active row, then update
  pointer/predecessor, finalize the current run and record the replacement
  activation event atomically), run every read helper on
  its own short-lived session, keep `lockSession` for lock/liveness only,
  validate the two-session maintenance budget before bundle read, and await
  the fresh-session reconciliation with the bounded reconciliation-only
  timeout; the pre-allocation reconciliation CAS-terminalizes the recovered
  pending row (prepared/unchanged/activated/failed per the persisted
  `(status, result_kind, changed, run_result.snapshot_id, request_kind, request
  identity)` provenance) and frees its pending slot
  while the current invocation ALWAYS proceeds to its own bundle load and
  admission/run — never an early return of a recovered result.
- [ ] Return the strict `AssistantDocsIngestResultV2` union (`prepared` with
  changed true/false, `unchanged`, `activated`, plus the bounded internal
  `deferred_cutover_backfill` member at `v1_active`/`v1_frozen`) from every
  ingest path, each member carrying its transaction-verified pointer/status
  `closure` captured under the advisory lock/commit, and
  reconcile ambiguous COMMITs to that same union; expose the ONE canonical
  `assertAssistantDocsIngestResultClosureV2` helper (no stale
  assertSame/status helper chains, no post-lock pointer-currency assertion)
  plus `AssistantDocsActivePointerV2`/`AssistantDocsDbStatusV2` (with the
  strict `AssistantDocsGuideReadinessV2` union) and their
  normalizer for status/verification consumers.
- [ ] Add the era-aware facade `searchAssistantDocsAuthoritativeV2` and the
  V2-owned `assistant_docs_v2_legacy_acl` table (populated/closed during the
  immutable backfill from the strict legacy context catalog): statement 1
  resolves the pointer/cutover row inside its own result and selects exactly one
  backend — before activation/after rollback a bounded V1 query joins the ACL
  (returning that ACL snapshot's identity as the ready result's exact
  authorization/evidence snapshot)
  and applies SQL authorization before title/body projection/LIMIT, and when
  the pointer era is `v2` the V2 query runs; never both and never a separate
  era/pointer preflight statement. TASK-548-03-L03
  deploys the facade before activation through the gated consumer cutover so
  Guide remains available and
  activation/rollback switch ONLY the DB pointer. The direct
  `searchAssistantDocsDbV2` may retain the internal not-ready sentinel
  (enforced via its `requiredEra: "v2"` statement-1 gate).
- [ ] Export all seven typed `assistant_docs_*` errors (including
  `assistant_docs_cutover_required`, the stable public error for manual
  preactivation/backfill/source-drift operator action) plus the two internal
  sentinels for the serialized TASK-548-03-L03 route/service writer; do not
  edit either orchestration module.
- [ ] Add
  `tests/integration/server/assistantDocsIngestV2.test.ts` and focused Vitest
  ingest/retriever coverage plus
  `tests/vitest/assistant/docsPermissionSnapshot.test.ts` and
  `tests/vitest/assistant/assistantDocsChunkerV2.test.ts` (golden parity
  against the current `docsDbRetriever` chunk semantics plus
  malformed/Unicode/oversize fixtures); use uniquely scoped
  DB fixtures and delete only owned rows. Pin the one status-matrix CHECK
  (every valid/invalid row), the acyclic FK/catalog and cohort prune order,
  the resumable-backfill crash matrix, the facade no-gap/zero-unauthorized-
  bytes/activation/rollback/one-backend query-count fixtures plus
  first-start/pre-backfill/serialized-deployment fixtures (a fresh install and
  every pre-backfill state never see a facade binary; the TASK-548-03-L03
  consumer cutover dispatches only at the EXACT `shadow_parity_clean` state —
  never merely at/past `backfill_complete` — with one
  complete prepared snapshot, the closed `legacy_acl_snapshot_id` binding and
  facade code compatible with the row's `deploymentIdentity`/
  `rolloutGeneration` — never a preexisting rollout receipt, which is recorded
  for that exact facade build after deployment and stays the mandatory
  `consumers_ready`/activation evidence; a facade binary starting without the binding
  fails readiness with zero authorized rows, which the canonical deploy order
  prevents — no availability gap), the bounded
  ordered `heading_path text[]` round trips, the mandatory no-fallback
  `tokenCounts` rejection fixtures, and the closure-helper fixtures.

## Testing Requirements

- Before DB tests: `set -a && source .env && set +a`
- `bunx vitest run --config vitest.config.ts tests/vitest/assistant/docsIngestService.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/docsPermissionSnapshot.test.ts tests/vitest/assistant/assistantDocsChunkerV2.test.ts tests/vitest/server/startupAssistantDocs.test.ts tests/vitest/documentation`
- `bun test tests/unit/server/httpServerDocsStartupRemoval.test.ts` (legacy
  producer removal + V1 freeze static gate)
- fixed-loader cwd matrix from repo root, `core/`, and
  `packages/docs-portal/`, Node/Vite-config import fixture, plus the final
  Docker smoke from an unrelated cwd
- `bun test tests/integration/server/assistantDocsIngestV2.test.ts` when
  `DATABASE_URL` is reachable
- terminal TASK-551 assistant-vector/query identity tests plus the V2
  single-combined-chunk-vector identity (imported legacy heading/content
  expression + additive evidence term, one GIN index), successful-path 0/2/3
  facade/V2
  statement plus direct-path mismatch=1 fixtures,
  authorization-before-projection, evidence-only term, query-plan,
  and legacy deny-all migration fixtures
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- migration generation/drift verification, restart smoke and the canonical
  NUL-safe line-count gate over the leaf write set (identical contract in
  every TASK-548 task file):

  ```bash
  # Canonical NUL-safe line-count gate over the leaf write set (identical
  # contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  # with exit 1, including a non-newline final line). The verified pre-family
  # baseline is the pinned commit 963733cae23456622bea1eef1b734723aaab2350;
  # commits/staging cannot narrow the measured scope.
  TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
  git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
  failed=0
  while IFS= read -r -d '' f; do
    lines=$(awk 'END { print NR }' "$f")
    if [ "$lines" -gt 1000 ]; then
      printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
      failed=1
    fi
  done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|tsx|js|jsx|cjs|mjs|mts|cts)$' | sort -zu)
  exit "$failed"
  ```
- production-package smoke with the bundle present and every `.tmp`/report/
  journal/staging/backup artifact absent; from an unrelated working directory,
  startup and reindex must still pass through the fixed module-relative loader
- adversarial every-component no-follow handle swap matrix, two-process
  advisory-lock race, process death immediately after pending-run allocation,
  durable-pending crash fixtures (kill between the pending COMMIT and the
  finalization transaction → next holder reconciles AND CAS-terminalizes the
  durable row (prepared/unchanged/activated/failed) and then ALWAYS proceeds to
  its own bundle load and admission/run — never an early return of the
  recovered result, with `force:true`/newer-package regressions; kill
  before the pending COMMIT → no row), pre-allocation pending reconciliation,
  lost-COMMIT-response reconciliation, separated-session fixtures (lockSession
  never executes a statement; pending allocation, finalization and
  reconciliation each use independent `withDedicatedDatabaseSession` sessions;
  two-session budget validated before bundle read),
  partial-unique fencing (global building/prepared/active constant-expression
  partial
  indexes), resumable migration interruption (kill after the durable start
  transaction, after each child batch and before the closure transaction;
  reruns resume the SAME run and SAME building snapshot from the CAS-committed
  `backfill_cursor`/`backfill_progress` with no duplicate/omitted row, and
  `--abort` DELETES the never-served building snapshot cohort and frees
  capacity in the same transaction — never a 30-day inactive conversion), the
  persisted
  six-state cutover-fence matrix (`v1_active → v1_frozen → backfill_complete →
  shadow_parity_clean → consumers_ready → v2_activated`; `(state, revision)`
  CAS conflicts, the rollout-receipt
  gate, idempotent
  consumer readiness with conflicting-identity rejection, the explicit
  `v2_activated → v1_frozen` rollback row with revision/rollout-generation
  increments, active-V2 demotion and preserved trigger guards/frozen V1 rows/
  `legacy_acl_snapshot_id` binding (no Guide gap, no re-enabled legacy writes),
  the destructive legacy-resume transition rows to
  `v1_active` (ACL binding cleared, Guide unavailable until a fresh freeze +
  backfill, never the normal rollback), the executable source-drift reset row to `v1_frozen`, pre-fence
  producer-gated outcomes (deferred at `v1_active`/`v1_frozen`; same-hash
  prepared-reuse or the public `assistant_docs_cutover_required` conflict at the
  later preactivation states), shadow
  mismatch blocks, activation atomicity, one-active ordering fixtures,
  activation-event fixtures (event `run_id` = the snapshot's exact
  `producer_run_id` for both event kinds), fresh-install fast path, rollback),
  preactivation-producer fixtures (startup-before-freeze at
  `v1_active`/`v1_frozen` returns `deferred_cutover_backfill` with zero
  bundle-load/run/snapshot side effects; concurrent backfill/startup under the
  same advisory lock proves the backfill command is the sole producer; hash
  drift at `backfill_complete`/`shadow_parity_clean`/`consumers_ready` returns
  the public `assistant_docs_cutover_required` conflict before allocation and
  only
  the explicit reset (back to `v1_frozen`) + backfill rerun replaces the
  prepared snapshot),
  the V1 freeze gate (freeze transition `v1_active → v1_frozen` with
  `SHARE ROW EXCLUSIVE` + `SET LOCAL lock_timeout='5s'` drain and
  trigger/lock-timeout/race/old-binary negative fixtures
  for every
  enumerated legacy write path, including `ON CONFLICT (source_path)` upsert,
  V1→V2/V2→V1/cross-row attempted updates, and legacy reads of frozen V1; the
  `v1_frozen → backfill_complete` final-keyset/closure gate proves the backfill
  command — the sole preactivation producer — creates the terminal
  `cutover_backfill` run + sole `building`→`prepared` snapshot + closed ACL
  rows and advances the state only
  against immutable frozen rows),
  exact capacity deltas for the reachable admission
  outcomes plus the
  same-hash `force:true` cooldown, the `AssistantDocsIngestResultV2` union
  round trips (including the `deferred_cutover_backfill` member and every
  member's transaction-verified `closure` through the ONE canonical
  `assertAssistantDocsIngestResultClosureV2`),
  `normalizeDocsIngestError` round trips for all seven public errors including
  `assistant_docs_capacity_exceeded` and `assistant_docs_cutover_required`
  (mapped HTTP 409; never collapsed into a generic 500),
  `AssistantDocsDbStatusV2`/`AssistantDocsActivePointerV2`
  round trips (era-v1 pointer permanently `snapshot: null` with the named
  legacy scalar metadata outside `snapshot`; active-pointer per-era CHECK
  matrix) plus the exact `AssistantDocsGuideReadinessV2` union fixtures —
  ready v1 only with the immutable/frozen v1 era (cutover record at/past
  `v1_frozen`, never `v1_active`) AND the closed/pinned
  `legacy_acl_snapshot_id` ACL snapshot (its exact identity is the
  `evidenceSnapshot`), with ordinal-cutover-state independence (V1 ready is
  identical at `v1_frozen`/`backfill_complete`/`shadow_parity_clean`/
  `consumers_ready`) and replacement-backfill continuity fixtures (a
  concurrent `building` snapshot with a retained old valid binding stays
  ready; the initial mid-flight backfill with no prior binding stays
  not-ready; a replacement-abort fixture proves aborting a replacement
  backfill deletes only the never-bound cohort while the retained binding
  stays untouched and V1 readiness remains `ready` on it), ready v2 only with
  the complete active V2
  pointer/snapshot, and every `not_ready` reason
  (`legacy_acl_unbound` for the never-bound initial states (pre-first-backfill;
  an initial abort leaves NULL — abort never sets or clears the binding) or the
  destructive legacy-resume clear,
  `building` for an initial mid-flight backfill only (never for a replacement
  backfill with a retained binding), `active_snapshot_missing`,
  `cutover_not_ready` including the `v1_active` pointer with a non-NULL
  binding) pinned with the
  strict normalizer rejecting ready/pointer identity mismatches and proving
  the status service derives `guideReady === indexReady ===
  (guideReadiness.state === "ready")` — never from row counts — `keywords_json`
  round-trip/reject-unknown/byte-budget/search-vector fixtures, the
  six product-version bound columns and parameterized lexicographic tuple
  predicates with the equality-prefixed index/EXPLAIN contract, full chunk-record
  (`chunk_id`/ordered `heading_path` array/`heading`/`content`/`line_start`/
  `line_end`/
  `normalized_text`/`token_count`/mandatory `token_counts`) round trips plus the
  base-vs-ranked evidence normalizer fixtures (scalar `headingPath` and
  missing/malformed `tokenCounts` rejected — no fallback), the one status-
  matrix CHECK valid/invalid fixtures, run status-enum/
  `request_kind`/`result_kind`/`changed`/`backfill_cursor`/
  `backfill_progress`/`backfill_plan_sha256`/
  `terminal_at`/`actor_id` fixtures with the acyclic run-results model (no
  deferrable/cyclic pair), the legacy-ACL fixtures (populated/closed during
  backfill, unique per `(snapshot_id, source_path)`, zero post-closure writes,
  survives rollback; canonical `doc_id`/`locale` and the six normalized
  bound integers derived from the exact legacy catalog/bundle mapping with
  the lexicographic lower < upper CHECK, so the V1 branch's exact-locale and
  parameterized version predicates filter BEFORE projection/LIMIT), the
  era-aware facade fixtures (before activation and
  after rollback statement 1 is exactly ONE ACL-joined V1 candidate statement
  with SQL
  authorization before projection/LIMIT, followed by the shared pipeline's
  evidence and optional relation statements — successful-path 0/2/3 counts on both
  branches (application-data statements through tx only; the direct path adds
  its controlled mismatch=1), never a single-statement path; era `v2` the V2 statements; never
  both; no-gap and zero-unauthorized-bytes across the activation/rollback
  switch; no era/pointer preflight statement — spies prove
  `readAssistantDocsActiveEraV2` is never called as its own query on either
  public path, and the V1 ready result carries the prepared/ACL snapshot
  identity named by `legacy_acl_snapshot_id` as its exact authorization/
  evidence snapshot), first-start/pre-backfill/serialized-deployment fixtures
  (the TASK-548-03-L03 consumer cutover gate: EXACTLY `shadow_parity_clean` —
  never merely at/past `backfill_complete` — +
  one complete prepared snapshot + closed `legacy_acl_snapshot_id` binding +
  facade code compatible with the row's `deploymentIdentity`/
  `rolloutGeneration` — never a preexisting rollout receipt (recorded for that
  exact facade build after deployment; mandatory for `consumers_ready`/
  activation only); pre-gate states never see a facade binary and
  the legacy service keeps serving; a facade binary starting without the
  binding fails readiness with zero authorized rows),
  predecessor (`previous_v2_snapshot_id`)
  and activation-event fixtures, search-context normalization/drift/rerank
  fixtures, relation-lookup fixtures proving the helper takes the normalized
  `AssistantDocsGuideSearchContextV1` as its single permission/locale/
  productVersion/capability owner, applies the exact locale and lexicographic
  product-version predicates to every related document/member before
  projection, and omits wrong-locale/out-of-range members without leaking
  identity; pipeline fixtures proving relation enablement comes ONLY from the
  normalized limits/options (`includeSelectedSectionRelations`/
  `maxRelations`) and never from `searchContext` (enriched-with-selected-hits
  successful-path 0/2/3 statement counts unchanged on both facade branches, with an enriched
  zero-hit request fixed at 2, and the direct path's mismatch fixed at 1),
  cancellation during lock/load/persistence with no signal into the loader, and
  bounded crash-resume
  retention matrix (`deactivated_at + 30d` / `terminal_at + 30d` /
  `event_at + 30d` eligibility clocks plus active/immediate-predecessor/
  ACL-binding (`active_pointer.legacy_acl_snapshot_id`)/
  producer-run/unexpired-event-run/
  pending pins and the events → snapshots → runs cohort prune order with
  CASCADE child/result/ACL propagation and RESTRICT out-of-order failures,
  including rollback/replacement/source-drift/30-day/capacity ACL-pin fixtures
  proving the bound ACL snapshot is never deleted, the pruner never repeatedly
  fails on the pointer's RESTRICT FK, and the pin survives until the atomic
  rebind or the destructive legacy-resume clear (the sole clear path — an
  explicit abort never updates the binding), plus replacement-abort fixtures
  proving the retained binding and its retention pin survive an aborted
  replacement while the never-bound cohort is deleted)

## Documentation Updates Required

Send verified schema, migration, startup and reindex behavior to TASK-548
closure for `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
`_docs/ARCHITECTURE.md`, `_docs/SECURITY_SPEC.md` and
`docs/develop/assistant.md`. Record explicitly that permission-sensitive Guide
retrieval is PostgreSQL-authoritative and has no server/browser cache or
invalidation outbox; `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` need
no new Guide family.
