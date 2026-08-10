# TASK-556-01-L01: Schema Migration Repository and Source Binding
# FileName: TASK-556-01-L01-Schema-Migration-Repository-And-Source-Binding.md

**Parent Task:** TASK-556
**Parent Subtask:** TASK-556-01
**Priority:** High
**Category:** PostgreSQL / Designer Persistence / Concurrency
**Estimated Effort:** Large
**Dependencies:** TASK-556 external terminal gate
**Start Receipt:** Recorded terminal schemas/repositories, migration journal, tests, HEAD/diff, and no conflicting writer
**Completion Receipt:** Reviewed owned diff plus every command and budget below green
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Extend the terminal Designer generation-run table with immutable
`code_owned_static` subtype columns, including exact `static_brief` JSONB. This makes the complete static shape
row-local and database-enforceable; no CHECK may claim to inspect another table.

## Sub-Tasks

None; this is an executable leaf.

## Exact Writer and Forbidden Paths

Sole writer paths:

- exact additive region in `core/db/tables/assistantDesigner.ts`;
- exact export line in `core/db/tables/assistantProducts.ts` and
  `core/db/schema.ts` only when the terminal facade requires it;
- `core/services/designer/staticSources/staticStarterErrorContract.ts` as the
  single closed domain-error union consumed by every later TASK-556 leaf;
- `core/services/designer/staticSources/staticGenerationPersistenceContract.ts`;
- `core/services/assistant/persistence/designer/staticSourceBindingRepository.ts`;
- `core/services/assistant/persistence/designer/staticGenerationRepository.ts`;
- exact additive post-TASK-414 static-alias successor region in
  `core/services/designer/workspacePurgeService.ts`;
- exact additive Designer V2 regions in
  `core/services/backups/designerBackupSection.ts` and
  `core/services/backups/designerRestoreSection.ts`;
- exact additive V1-read/V2-write discriminator regions in terminal
  `core/services/backups/backupTypes.ts`,
  `core/services/backups/backupArchive.ts`, and
  `core/services/backups/backupImport.ts`;
- one next-free `core/db/migrations/<NNNN>_*.sql`, matching
  `core/db/migrations/meta/<NNNN>_snapshot.json`, and one `_journal.json` append;
- `tests/unit/db/assistantDesignerStaticGenerationSchema.test.ts`;
- `tests/vitest/designer/designer-static-generation-persistence.test.ts`;
- exact additive successor cases in
  `tests/vitest/designer/designer-purge-policy.test.ts` and
  `tests/integration/designer/designer-reject-expiry.test.ts`;
- `tests/integration/server/task556StaticGenerationRepository.test.ts`;
- `tests/integration/server/task556StaticGenerationMigration.test.ts`;
- `tests/vitest/backups/designer-static-backup-contract.test.ts`;
- `tests/unit/backups/designerStaticBackupRestore.test.ts`;
- `tests/unit/backups/designerStaticArchiveIntegration.test.ts`;
- `tests/perf/designerStaticStarterPersistence.test.ts`.

Forbidden paths: every other region under `core/db/tables/**` and
`core/services/assistant/persistence/**`; every backup region outside the exact
V2 seams above; all `core/services/kits/**`,
`core/admin/**`, `core/server/routes/**`, `core/services/assistant/action*`,
`scripts/runtime-smoke*`, `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/**`,
`AGENTS.md`, root config, `_TMP*`, and all non-TASK-556 task files.

## Enforceable Persistence Contract

Add these nullable logical columns to the terminal generation run, adapted only
to landed naming conventions:

```ts
type StaticGenerationSubtypeV1 = Readonly<{
  staticSourceBindingId: string;
  staticSourceId: "formadom-studio";
  staticBindingSchema: "coderso.designer-code-owned-static-binding@v1";
  staticReleaseKey: "formadom-studio@1.0.0";
  staticReleaseVersion: "1.0.0";
  staticArtifactSha256: Sha256Hex;
  staticPackageFingerprint: Sha256Hex;
  staticReleaseDescriptorDigest: Sha256Hex;
  staticDesignerBriefDigest: Sha256Hex;
  staticContributionVersion: string;
  staticRegistryVersion: string;
  staticCompilerVersion: string;
  staticBindingDigest: Sha256Hex;
  staticSeedRequestDigest: Sha256Hex;
  staticBrief: DesignerBriefV1;
}>;
```

The migration atomically replaces terminal
`assistant_designer_generation_source_shape_ck` with the same name/versioned
source-kind definition extended by literal `code_owned_static`; tests pin every
pre-existing prompt-AI/Figma positive and negative. One additional row-local
CHECK, `assistant_designer_generation_static_shape_ck`, enforces:

- for `code_owned_static`, every static column is non-null and every provider/
  model field plus the terminal Figma source-grant/selection fields on the
  generation-run row is null;
- for every other source kind, every static column is null and existing terminal
  source rules remain unchanged; and
- literal/schema/digest grammar checks are row-local. `static_brief` is JSONB,
  `jsonb_typeof(static_brief) = 'object'`, and
  `octet_length(static_brief::text) <= 524288` is enforced in the same CHECK.
  The write contract separately requires terminal `normalizeDesignerBriefForWrite`
  plus canonical UTF-8 bytes <=524,288 before persistence. No subquery/function that
  reads another table is used, and no run CHECK claims to inspect a claim row.

Add these four nullable logical columns to the terminal generation claim:

```ts
type StaticGenerationClaimSubtypeV1 = Readonly<{
  staticSourceBindingId: string;
  staticBindingDigest: Sha256Hex;
  staticDesignerBriefDigest: Sha256Hex;
  staticSeedRequestDigest: Sha256Hex;
}>;
```

Named row-local CHECK
`assistant_designer_generation_claim_static_shape_ck` uses an exact all-null or
all-present truth table. When present, it additionally requires
`prepared_source_bind_status = 'bound'` and requires terminal
`source_execution_binding_schema`, `source_execution_binding_digest`,
`source_lease_id`, and `source_lease_fence` to be null. It reads no run/binding
row. Existing prompt-AI/Figma claims keep all four static fields null and retain
their terminal claim truth tables byte-for-byte. These four exact claim-column
names and `prepared_source_bind_status` are start-gate-recorded terminal names
(no TASK-414 contract pins them today): the external gate re-checks them against
the landed TASK-414 claim type (TASK-414-08-L02 `BoundDesignerGenerationClaim`)
and the physical claims table (TASK-414-03-L02
`assistant_designer_generation_claims`) before implementation, and a different
landed name hard-stops and amends this contract first, mirroring the lease-seam
clause below.

Add one current-root binding table:

```ts
type StaticSourceBindingV1 = Readonly<{
  id: string;
  ownerId: string;
  sourceId: "formadom-studio";
  releaseDescriptorDigest: Sha256Hex;
  workspaceId: string;
  seedRevisionId: string;
  seedGenerationRunId: string;
  currentStaticRevisionId: string;
  currentStaticGenerationRunId: string;
  designerBriefDigest: Sha256Hex;
  contributionVersion: string;
  registryVersion: string;
  compilerVersion: string;
  bindingDigest: Sha256Hex;
  seedRequestDigest: Sha256Hex;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>;
```

`assistant_designer_static_source_bindings` has one named unique constraint on
`(owner_id, source_id, release_descriptor_digest)` and positive CAS version. Its
current-root fields use exact composite FKs, never independent ID-only FKs:

- `(owner_id, workspace_id)` -> terminal workspace `(owner_id, id)`;
- `(owner_id, workspace_id, seed_revision_id)` -> terminal revision
  `(owner_id, workspace_id, id)`;
- `(owner_id, workspace_id, seed_revision_id, seed_generation_run_id)` ->
  terminal run `(owner_id, workspace_id, revision_id, id)`;
- the same revision/run tuples for `current_static_revision_id` and
  `current_static_generation_run_id`; and
- both `(owner_id, id, seed_generation_run_id, source_id,
  release_descriptor_digest, binding_digest, designer_brief_digest,
  contribution_version, registry_version, compiler_version,
  seed_request_digest)` and the same tuple using
  `current_static_generation_run_id` -> the static generation-run binding
  identity tuple defined below.

The seed pair identifies the original static attempt for the current root. The
current-static pair initially equals it and may CAS-advance only to that root's
single immutable retry; later prompt-AI/Figma generation never changes either
pair. A promoted-root fork CAS-replaces all root/pair/digest/version fields together.
The binding does not mirror the workspace's later active revision or own
lifecycle/package bytes. Once the seed run has its exact ready receipt, any
retained safe navigable workspace reopens by workspace identity while the
terminal Designer aggregate independently resolves its authoritative active
revision/version/state. A fully pruned binding may be recreated; partial FK
evidence conflicts.

The normalized `DesignerBriefV1` static compilation snapshot is owned by the
generation run's exact `static_brief` JSONB column, not by the binding and never by
an unvalidated generic blob. On initial dispatch, Transaction A validates it with
terminal `normalizeDesignerBriefForWrite`, verifies canonical UTF-8 size <=512 KiB,
writes the same normalized brief into the terminal seed revision where that
revision contract requires it, and proves its canonical digest equals
`static_designer_brief_digest`. The run value joins the other immutable static
identity columns and cannot change after dispatch. The bounded preflight projection
and authoritative Transaction A return that locked run brief, exact digest,
contribution/registry/compiler versions, and complete
`CodeOwnedStaticSourceBindingV1`. `takeover` reads the same run field;
`retry_failed` copies it from the locked failed run into the one new retry run.
Neither reads or compares current registry brief bytes. Only `new` and
`fork_promoted` may lazily read current frozen registry/compiler facts and persist a
new normalized run brief.

Add `assistant_designer_static_seed_requests` as the only idempotency alias table:

```ts
type StaticSeedRequestAliasV1 = Readonly<{
  id: string;
  ownerId: string;
  staticSourceBindingId: string;
  generationRunId: string;
  aliasKind: "dispatch" | "terminal_reopen";
  idempotencyKeyDigest: Sha256Hex;
  seedRequestDigest: Sha256Hex;
  purgeAfter: Date | null;
  createdAt: Date;
}>;
```

It contains no raw key/package/provider data and is selected only through bounded
projections. Named composite FK
`assistant_designer_static_seed_req_binding_run_request_fk` maps
`(owner_id, static_source_binding_id, generation_run_id, seed_request_digest)`
to the exact same tuple on the generation-run unique target. A direct composite
owner/binding FK and terminal delete actions also apply. Cross-owner,
cross-binding, mismatched-run, and mismatched-request-digest aliases therefore
fail in PostgreSQL, not only in service preflight. Named row-local CHECK
`assistant_designer_static_seed_request_alias_kind_ck` constrains `alias_kind`
and permits the exact alias kinds plus nullable `purge_after`; it does not compare
`purge_after` with `created_at`, because a late terminal alias inherits the run's
earlier fixed retention deadline rather than refreshing it from insertion time.
The locked service/terminalization protocol plus the deferred alias/run trigger
pair below, not a false cross-table CHECK, requires null while the referenced run
is live and non-null only after it is terminal.
The dispatch winner inserts one `dispatch` alias; a fresh live-collision loser
inserts nothing. A fresh key may insert the next `dispatch` alias only in the same
atomic operation that rotates an expired fence. Export
`MAX_STATIC_DISPATCH_ATTEMPTS_PER_RUN = 8` from
`staticGenerationPersistenceContract.ts`. Under the locked generation run, the
creation dispatch alias for a new, promoted-fork, or retry run is attempt 1 and
each successful expired-lease takeover is the next attempt. Live/unique-race
collision losers insert no alias and consume no
attempt. When eight dispatch aliases already exist, a would-be ninth attempt
returns terminal `designer_reconciliation_required` without an alias insert,
fence rotation, claim update, or compiler/stage dispatch. A run may retain at most 32
`terminal_reopen` aliases under its lock; the 33rd such key fails with
`designer_static_seed_request_limit`. Dispatch aliases do not consume that
separate reopen cap. The table is not a binding, workspace, receipt, or alternate
lifecycle owner.

Named indexes/constraints:

- `assistant_designer_static_binding_owner_source_release_uq` on the
  binding tuple above;
- `assistant_designer_static_source_bindings_owner_id_uq` on binding
  `(owner_id, id)` as the direct composite owner target;
- `assistant_designer_generation_static_binding_run_request_uq` on generation-
  run `(owner_id, static_source_binding_id, id, static_seed_request_digest)` as
  the alias FK target;
- `assistant_designer_generation_static_claim_identity_uq` on generation-run
  `(owner_id, static_source_binding_id, id, static_binding_digest,
  static_designer_brief_digest, static_seed_request_digest)` as the exact claim
  identity target;
- `assistant_designer_generation_static_binding_identity_uq` on generation-run
  `(owner_id, static_source_binding_id, id, static_source_id,
  static_release_descriptor_digest, static_binding_digest,
  static_designer_brief_digest, static_contribution_version,
  static_registry_version, static_compiler_version,
  static_seed_request_digest)` as both binding identity FK targets;
- `assistant_designer_generation_static_binding_fk` from nullable run
  `(owner_id, static_source_binding_id)` to binding `(owner_id, id)` and
  `assistant_designer_generation_claim_static_identity_fk` from the matching
  static claim tuple to the run identity target using default `MATCH SIMPLE`;
  the claim CHECK makes the nullable static portion all-null or all-present, so
  nonstatic claims skip this FK while static claims match every identity column;
- exact binding root FKs named
  `assistant_designer_static_source_bindings_owner_workspace_fk`,
  `assistant_designer_static_binding_owner_seed_revision_fk`,
  `assistant_designer_static_source_bindings_owner_seed_run_fk`,
  `assistant_designer_static_binding_owner_current_revision_fk`,
  `assistant_designer_static_source_bindings_owner_current_run_fk`, and
  `assistant_designer_static_source_bindings_seed_run_identity_fk` plus
  `assistant_designer_static_binding_current_run_identity_fk`; every
  binding-to-run root/identity FK and the run-to-binding FK is `DEFERRABLE
  INITIALLY DEFERRED`, with IDs allocated before inserts;
- `assistant_designer_static_seed_requests_owner_key_uq` on
  alias-table `(owner_id, idempotency_key_digest)`;
- `assistant_designer_static_seed_req_owner_binding_run_idx` on alias-table
  `(owner_id, static_source_binding_id, generation_run_id,
  seed_request_digest)` supports the complete child side of both composite
  binding/run FKs, FK validation, owner/binding retention joins, and the
  aliases-first binding delete path;
- `assistant_designer_static_seed_req_run_kind_created_id_idx` on
  `(generation_run_id, alias_kind, created_at, id)` supports only the locked
  terminal-reopen cap; and
- `assistant_designer_static_seed_req_purge_after_id_idx` on
  `(purge_after, id) WHERE purge_after IS NOT NULL` exactly supports global
  retention eligibility; and
- terminal workspace/revision/run ownership FKs remain authoritative.

The shared cross-table validator function is attached as the named deferred
constraint-trigger pair
`assistant_designer_static_consistency_from_run_ctrg` and
`assistant_designer_static_consistency_from_claim_ctrg`.
For every inserted/updated `code_owned_static` run, its INSERT-event claim must
be born `bound`, be the one exact owner/workspace/revision/run claim, match all
four static claim fields, and have provider/import/source-lease fields null. For
every nonstatic run, its claim's four static fields must be null. The trigger is
the cross-table invariant; neither row-local CHECK claims to perform that read.
The same migration adds deferred constraint triggers
`assistant_designer_static_alias_purge_from_alias_ctrg` and
`assistant_designer_static_alias_purge_from_run_ctrg`. They read the exact FK-
referenced run and enforce at commit that every alias of a live run has null
`purge_after` and every retained alias of a terminal run has
`purge_after = referenced_run_terminal_at + interval '30 days'`, using the exact
terminal timestamp column recorded at the start gate. Non-null-but-different is a
constraint failure. The run-status terminalization and set-based alias update therefore
commit together or not at all.

Every proposed PostgreSQL constraint/index/trigger identifier is exact, unique,
ASCII, and therefore has the same character and UTF-8 byte count. In particular,
the final shortened or newly introduced names are:

| Exact identifier | Kind | UTF-8 bytes |
|---|---|---:|
| `assistant_designer_static_seed_req_binding_run_request_fk` | FK | 57 |
| `assistant_designer_static_binding_owner_source_release_uq` | unique | 57 |
| `assistant_designer_static_binding_owner_seed_revision_fk` | FK | 56 |
| `assistant_designer_static_binding_owner_current_revision_fk` | FK | 59 |
| `assistant_designer_static_binding_current_run_identity_fk` | FK | 57 |
| `assistant_designer_static_consistency_from_run_ctrg` | constraint trigger | 51 |
| `assistant_designer_static_consistency_from_claim_ctrg` | constraint trigger | 53 |
| `assistant_designer_claim_static_identity_immutable_trg` | trigger | 54 |
| `assistant_designer_static_seed_request_alias_kind_ck` | CHECK | 52 |
| `assistant_designer_static_seed_req_owner_binding_run_idx` | index | 56 |
| `assistant_designer_static_seed_req_run_kind_created_id_idx` | index | 58 |
| `assistant_designer_static_seed_req_purge_after_id_idx` | partial index | 53 |
| `assistant_designer_static_alias_purge_from_alias_ctrg` | constraint trigger | 53 |
| `assistant_designer_static_alias_purge_from_run_ctrg` | constraint trigger | 51 |

Migration tests query `pg_catalog.pg_constraint`, `pg_catalog.pg_trigger`, and
`pg_catalog.pg_indexes` for the complete exact-name set, assert one expected row
per name and `octet_length(name) <= 63`, and reject every prefix/truncated or
unexpected collision. Composite FK definitions and both deferred constraint
trigger pairs (all four triggers) are compared structurally, so shortening a name
cannot weaken them. The catalog test also compares the exact ordered columns of
`assistant_designer_static_seed_req_owner_binding_run_idx` and proves every
alias-table composite FK has a matching child-side index prefix.

The raw idempotency key is hashed in memory through the shared digest helper and
never persisted. A new key for ready reopen inserts a capped `terminal_reopen`
alias; promoted-root fork, single retry, and expired-lease takeover insert a
`dispatch` alias instead of mutating historical key/run identity. A fresh key
that only observes a live claim inserts no row. Named trigger
`assistant_designer_generation_static_identity_immutable_trg` rejects UPDATEs to
any run static identity/digest column after insert; named
`assistant_designer_claim_static_identity_immutable_trg` does the
same for the four claim-local static fields. Alias identity fields are immutable;
`purge_after` has the sole one-way lifecycle transition from null to the computed
run-terminal retention timestamp. The run immutability trigger includes
`static_brief`; its normalized JSONB cannot be patched, replaced, or cleared after
the dispatch insert. Status/fence/CAS and binding-pointer fields keep
terminal lifecycle mutability. Static rows, stage, and receipts are deleted only
by terminal TASK-414 generation pruning in its established FK order. No new TTL,
pruner, cascade root, or orphan adoption is added. After a fully terminal-pruned
root, reseed may create a new root; any retained subtype/receipt means reopen or
typed conflict, never duplicate/adopt.
The terminal pruner's static contribution removes aliases first, then the
eligible unpromoted root's terminal claim/stage/receipt/revision/run descendants,
and the binding last in one deferred-FK transaction. It never cascades through a
retained current binding or deletes a promoted historical root. Pointer CAS to a
newer private root releases the old promoted run from the binding's current-run
FK without mutating the historical run-to-binding identity.
Aliases reuse terminal TASK-414's 30-day hash-only idempotency-tombstone class.
An alias inserted while its run is live has `purge_after = NULL`. In the same
locked transaction that terminalizes that run, every still-null referencing alias
gets `purge_after = terminal_at + 30 days`; an alias inserted later against an
already terminal run gets that same referenced `terminal_at + 30 days`, even when
the deadline is earlier than alias `created_at`. Replay, refresh, restore, or
reinsertion never moves the deadline. No live alias
is eligible. The terminal retention owner selects global eligibility only as
`purge_after <= database_clock`, keysets strictly by `(purge_after, id)`, orders by
that tuple, and deletes at most 256 aliases per transaction. It uses
`assistant_designer_static_seed_req_purge_after_id_idx`, never the run/kind cap
index or a generation-run scan. Pruning deletes only alias rows, never the
binding/run/receipt, and adds no timer/worker. TASK-556 adds the exact successor
region to terminal `workspacePurgeService.ts`: it invokes the bounded global alias
keyset before the existing workspace FK groups, preserves every pre-TASK-556 purge
branch byte-for-byte, and uses the repository helper rather than duplicating SQL.
Binding deletion is eligible only after its current unpromoted root is terminal-
prunable, every retained alias has independently expired, and every historical
static run/claim that still references the binding has been removed by terminal
TASK-414 retention. Every retained historical run, not only the current pointer,
therefore keeps the binding row until all references are terminal-pruned; a
retained promoted run keeps it as
bounded immutable provenance. No FK may cascade an alias, historical run, or
claim before its own policy boundary; a fully pruned binding means no referencing
static run, claim, alias, stage, or receipt remains.

The terminal generation claim must expose an owner-scoped fence and expiry that
can be locked and rotated atomically. Record their exact landed names in the start
receipt and reuse them; if TASK-414 lands no claim-lease seam, stop and correct
this contract rather than adding an uncoordinated second claim lifecycle. Static
leases last 120 seconds and use the database/transaction clock. Claim state is
not asserted by a run-row CHECK: Transaction A inserts a static claim as `bound`
with the exact four static fields and null source-execution/source-lease fields;
the claim CHECK, composite FK, named run/claim triggers, and fenced service
enforce subsequent transitions. Same-key or different-key requests observing
that live lease receive no dispatch authority. A later provider generation is
resolved separately from the binding's original/current static run pair and can
never become the static in-progress/takeover claim.

The TASK-414 backup V1 bytes remain readable. As the successor explicitly reserved by
terminal TASK-414, this leaf creates and owns `DesignerBackupSectionV2` with
discriminator `coderso.backup.designer@v2`, adds
only strict static binding/alias kind/fixed run-terminal-derived `purgeAfter`/
static-run version facts plus the normalized bounded `static_brief` and sanitized
terminal static-claim
identity record groups, and restores them in deferred-FK order. The claim group
contains the four exact static identity fields and a non-runnable terminal bound/
released projection only; worker identity, active lease/heartbeat/fence authority,
source-execution/lease fields, raw keys, artifact paths, and automatic resume are
absent. Restore creates no live dispatch authority. Restored complete staged work
may return to `ready`; incomplete/generating static work returns to bounded failed
review under the terminal restore matrix. V2 normalization rejects an unknown or
non-normalized brief, canonical brief bytes above 512 KiB, digest mismatch, and any
alias deadline not equal to its referenced run terminal timestamp plus 30 days.
Restore preserves that fixed deadline and never refreshes it from restore time.

## Query and Migration Budgets

- End-to-end exact same-key ready/failed replay: at most 3 SQL statements, zero
  accessor/compiler/write calls. Ready different-key reopen: at most 6 SQL
  statements including bounded alias insert. A new/retry/forked/takeover Transaction
  A uses at most 10 statements; the complete seed through Transaction B uses at
  most 24 statements plus two bounded set-based stage inserts and one bounded
  alias-lifecycle update at run terminalization. The locked takeover projection
  includes or performs one indexed dispatch-alias count capped at 8 within that
  Transaction-A budget; it never scans aliases beyond the ninth qualifying row.
- Lock order is static binding -> workspace -> current static revision -> current
  static generation run -> claim; the immutable original seed pair is read in
  the same bounded projection but a later provider run is never locked as the
  static claim. Lock wait timeout
  1,000 ms, statement timeout 2,000 ms, transaction target <=250 ms p95.
- Point queries return <=1 row and only identity/state/digest/CAS columns.
  The normalized `static_brief` is selected only for a classified dispatching
  takeover/retry and is bounded to 512 KiB; ordinary replay/reopen/list projections
  never load it.
- Representative 100-owner/10,000-run fixture: replay query <=10 ms p95 and <=25
  shared buffer hits after warmup; no sequential scan of the generation table.
  The service-level retained-replay budget (the whole retained replay flow, one
  value for the whole family) is exactly <=3 SQL statements and <=50 ms p95 with
  0 locks held across I/O; TASK-556-02-L02 and TASK-556-03-L01 quote this single
  budget verbatim and the perf gate `designerStaticStarterPersistence.test.ts`
  asserts it. The 10 ms fixture figure is the query-level floor, not the
  service-level budget.
- Global alias pruning uses batches of at most 256 and completes each delete
  transaction within <=100 ms p95. On a representative 1,000,000-alias fixture,
  the eligibility page is <=10 ms p95 and <=64 shared buffer hits after warmup.
  Sanitized `EXPLAIN (ANALYZE, BUFFERS)` must use the exact partial
  `(purge_after, id)` index with no sequential scan, run-only index, growing
  `OFFSET`, or generation-run predicate.
- Migration takes an ACCESS EXCLUSIVE lock only for additive columns/constraint
  metadata, target <=2 seconds on 100,000 representative rows, no table rewrite,
  no backfill, no volatile default: every new run/claim column is nullable with no
  default, both new tables are initially empty/additive, and the migration deploys
  before TASK-556 application code.
- Migration SQL is transactional and uses no `CREATE INDEX CONCURRENTLY`. Before
  application deployment, rollback drops alias/binding tables, all TASK-556
  triggers/functions, indexes/run-and-claim static columns and restores the exact terminal source CHECK in reverse
  dependency order. After any static row exists, rollback is forward-fix
  only; deploy ordering is migration -> compatible application -> smoke.
- Capture sanitized `EXPLAIN (ANALYZE, BUFFERS)` for key/release lookups and the
  global alias-retention keyset. Capture a representative owner/binding delete-
  eligibility and FK-validation plan that uses
  `assistant_designer_static_seed_req_owner_binding_run_idx` without a sequential
  alias-table scan before accepting the binding-prune budget.

## Implementation Pseudocode

```ts
export const MAX_STATIC_DISPATCH_ATTEMPTS_PER_RUN = 8;

function requirePersistedCompilationFacts(locked) {
  const staticBrief = requireNormalizedStaticBriefWithinBytes(
    locked.currentStaticRun.staticBrief,
    512 * 1024,
  );
  assertCanonicalBriefDigest(
    staticBrief,
    locked.currentStaticRun.staticDesignerBriefDigest,
  );
  return projectPersistedCompilationFacts(locked, staticBrief);
}

async function lockClassifyAndAliasStaticSeedTx(
  tx,
  binding,
  command,
  repo,
  getCurrentCompilationFacts,
) {
  const locked = await repo.lockBindingWorkspaceSeedRunAndClaimTx(tx, binding.id);
  const outcome = classifyReopenResumeTakeoverOrConflict(locked, command);
  switch (outcome.kind) {
    case "replay_ready":
    case "replay_failed":
      await repo.insertTerminalReopenAliasTx(
        tx,
        binding.id,
        outcome.historicalRunId,
        command,
        {
          cap: 32,
          purgeAfter: addDays(outcome.historicalRunTerminalAt, 30),
        },
      );
      return outcome;
    case "in_progress":
      return outcome; // fresh live losers persist nothing; no fence/dispatch
    case "takeover": {
      const persisted = requirePersistedCompilationFacts(locked);
      await repo.requireDispatchAttemptAvailableTx(
        tx,
        locked.currentStaticRunId,
        MAX_STATIC_DISPATCH_ATTEMPTS_PER_RUN,
        "designer_reconciliation_required",
      );
      const claim = await repo.insertDispatchAliasAndRotateExpiredFenceTx(
        tx, locked.currentStaticRunId, command, { leaseSeconds: 120 },
      );
      return projectDispatch(claim, persisted);
    }
    case "fork_promoted": {
      const current = getCurrentCompilationFacts();
      return repo.insertRootDispatchAliasAndCasBindingTx(
        tx, locked.binding, command, current,
      );
    }
    case "retry_failed":
      return repo.insertSingleRetryRevisionRunClaimAliasAndCasBindingTx(
        tx, locked.binding, command, requirePersistedCompilationFacts(locked),
      );
    case "reopen":
      await repo.insertTerminalReopenAliasTx(
        tx,
        binding.id,
        locked.receiptBoundStaticRunId,
        command,
        {
          cap: 32,
          purgeAfter: addDays(locked.receiptBoundStaticRunTerminalAt, 30),
        },
      );
      return outcome;
    case "new":
      throw staticError("designer_static_seed_constraint_conflict");
    default:
      return assertNever(outcome);
  }
}

export async function claimStaticSeedTx(
  tx,
  command,
  repo,
  getCurrentCompilationFacts,
) {
  const byKey = await repo.findRequestAliasByOwnerAndKeyTx(
    tx,
    command.ownerId,
    command.idempotencyKeyDigest,
  );
  if (byKey) {
    assertSameRequestAlias(byKey, command.seedRequestDigest);
    // Live is in-progress; expired nonterminal is a same-key conflict. No write.
    return repo.lockAndClassifyAliasHistoricalRunTx(tx, byKey, command);
  }

  const binding = await repo.findBindingByOwnerSourceReleaseTx(tx, command);
  if (binding) {
    return lockClassifyAndAliasStaticSeedTx(
      tx, binding, command, repo, getCurrentCompilationFacts,
    );
  }

  const current = getCurrentCompilationFacts();
  const ids = repo.allocateStaticRootIds();
  const attempt = await repo.tryInsertBindingRootAndAliasInSavepointTx(tx, {
    ...command,
    ...current,
    ids,
    aliasKind: "dispatch",
    sourceKind: "code_owned_static",
    staticBrief: requireNormalizedStaticBriefWithinBytes(
      current.designerBrief,
      512 * 1024,
    ),
    designerBriefDigest: current.designerBriefDigest,
    staticClaimIdentity: {
      staticSourceBindingId: ids.bindingId,
      staticBindingDigest: current.binding.bindingDigest,
      staticDesignerBriefDigest: current.designerBriefDigest,
      staticSeedRequestDigest: command.seedRequestDigest,
    },
    workspaceState: "generating",
    generationRunState: "claimed",
    claimState: "bound",
    claimLeaseSeconds: 120,
    startEventKind: "designer_generation_started",
  }); // named 23505 rolls the savepoint back, never the outer transaction
  if (attempt.kind === "inserted") return projectClaimed(attempt.root);

  // The savepoint is fully rolled back. A same-key winner may already be ready,
  // so immutable alias identity is authoritative before current binding state.
  const racedAlias = await repo.findRequestAliasByOwnerAndKeyTx(
    tx,
    command.ownerId,
    command.idempotencyKeyDigest,
  );
  if (racedAlias) {
    assertSameRequestAlias(racedAlias, command.seedRequestDigest);
    return repo.lockAndClassifyAliasHistoricalRunTx(tx, racedAlias, command);
  }
  const winner = await repo.findBindingWinnerAfterUniqueRaceTx(tx, command);
  return lockClassifyAndAliasStaticSeedTx(
    tx, winner, command, repo, getCurrentCompilationFacts,
  ); // a live race loser inserts no alias and does no TASK-556 package pass
}
```

**Data flow:** normalized server actor + trusted upstream release identities +
strict request identity -> key lookup -> binding lookup -> locked classification
-> persisted run `static_brief`/binding compilation facts for takeover/retry or lazy
current registry/compiler facts for new/promoted-fork -> one Transaction-A root/
revision/run/bound-claim/event/dispatch-alias insert or fenced classification ->
safe disposition. The generation run carries the selected normalized bounded
`DesignerBriefV1` in `static_brief`; the compatible seed revision carries the same
normalized value, while run, binding, claim, and alias carry matching digest identity.
Only `dispatch` carries a fence and compilation facts. No release file load,
compiler-side package pass, stage, or canonical write occurs inside the
transaction.

An alias always resolves its immutable historical generation run, even after the
binding pointer advances from a promoted root. Ready/failed replay projects the
original receipt-bound seed result; it never silently follows a newer root.
Physical state/event enum names are recorded from terminal TASK-414 at the start
gate and must map exactly to the logical `generating`/claimed/start projection
above rather than creating duplicate lifecycle values.

**Errors:** this leaf creates the closed `StaticStarterWorkspaceDomainErrorCode`
union for only TASK-556 persistence/registry/compiler/stage codes named across
the family. Terminal `designer_workspace_state_invalid`,
`designer_workspace_terminal`, and `designer_reconciliation_required` remain in
the terminal Designer error owner and are imported/delegated, never duplicated.
Its own stable cause-free subset is `designer_static_seed_invalid`,
`designer_static_seed_idempotency_conflict`, `designer_static_seed_in_progress`,
`designer_static_seed_owner_not_found`, `designer_static_seed_constraint_conflict`,
`designer_static_binding_version_conflict`,
`designer_static_seed_request_limit`,
and `designer_static_seed_migration_required`; hide cross-owner existence and raw
constraint/driver text.

## Tests

- Complete run and claim source-shape matrices, every mixed/null/foreign-source
  negative, prompt-AI/Figma byte parity, named terminal CHECK replacement,
  conditional composite claim FK, run/claim and alias-purge/run trigger pairs,
  binding/alias indexes, immutable trigger including `static_brief`, strict
  normalized JSON object and 512 KiB boundary/overflow, raw-key non-persistence,
  clean migration, terminal upgrade, snapshot/journal parity.
- Exact `pg_catalog` assertions cover every expected constraint/index/trigger
  name once, each displayed UTF-8 byte count, no PostgreSQL truncation/prefix
  collision, and unchanged enforceable composite FK/constraint-trigger bodies.
- Exact owner/workspace/revision/run binding FK negatives plus alias cross-owner,
  cross-binding, mismatched-run, and mismatched-`seedRequestDigest` DB failures.
- Same key/same request ready/failed replay; same key/different request conflict;
  same-key and other-key live-lease no-dispatch outcomes; other-key/same ready
  release reopen; expired-lease fenced
  takeover; named-race savepoint rollback followed by owner/key alias-first
  historical classification and binding lookup only when absent. A concurrency
  case pauses the loser until the same-key winner reaches ready, then proves the
  loser returns exact replay with no reopen alias, second dispatch, aborted outer
  transaction, or orphan workspace/revision. A different-key loser observes no
  alias and follows the binding live-collision path.
- Ready retained roots reopen with their recorded binding/compiler versions after
  registry evolution while returning current authoritative active revision/
  version/state; later provider claims never become static takeover candidates;
  incomplete incompatible bindings conflict and never rebuild.
- Takeover and single retry after literal brief plus contribution/registry/compiler
  evolution return and compile from the locked run `static_brief`/digest/version/
  binding projection; retry copies those exact normalized bytes to its new run.
  New and promoted-fork alone consume current facts.
- Promoted terminal root forks one new private root and CAS-swaps the binding;
  concurrent forks produce one winner while historical promoted rows remain.
- Different-key retry of a deterministic failure creates one immutable child
  revision/run/claim and dispatch fence; same-key replay keeps the original error.
- Same-key live returns in-progress and same-key expired returns conflict/fresh-key
  guidance with no write. A concurrent 33-key live-collision/race-to-cap attempt
  persists only the dispatch winner/current key; after DB-clock expiry a fresh
  key still inserts one takeover alias and rotates one fence. No loser consumes
  terminal-reopen capacity.
- Dispatch attempt tests prove initial dispatch is 1, seven successive expired-
  lease takeovers reach exactly 8, collision losers never increment the count,
  and concurrent would-be eighth/ninth takeovers produce one eighth winner. Every
  ninth attempt returns `designer_reconciliation_required` with no alias, fence
  rotation, claim mutation, current-facts read, compiler call, or stage dispatch.
- Legitimate `terminal_reopen` aliases have a separately locked 32/33 cap race;
  dispatch/takeover aliases do not consume that cap, exact key lookup resolves
  its immutable historical run, and raw keys never persist.
- Rollback leaves no root; retention/pruning and full-prune reseed semantics.
- Alias null-to-terminal `purgeAfter` transition and late terminal-alias/restore
  equality to the referenced run's terminal timestamp plus 30 days; insertion,
  replay, refresh, and restore-clock changes never extend it. Cover live exclusion,
  exact global `(purge_after,id)` partial-index keyset, additive
  `workspacePurgeService.ts` alias-first successor behavior, preservation of all
  earlier purge cases, batch/latency/buffer/EXPLAIN budgets, and rejection of
  generation-run/index scans. Historical promoted and other referenced runs
  preserve the binding until every reference is terminal-pruned.
- Exact query count, projection, lock/timeout/latency/buffer budgets and EXPLAIN evidence.
- Focused serial DB performance gate covers replay/new/race query counts and p95/
  buffer budgets with no competing load.
- Existing terminal source rows and bytes remain unchanged.
- Backup V1 read compatibility, V2 strict round-trip, unknown-group rejection,
  alias kind/fixed terminal-derived `purgeAfter`, normalized <=512 KiB
  `static_brief`, digest and persisted version-fact round-trip, oversized/unknown-
  brief rejection, sanitized terminal static-claim identity, no live-claim/raw-key
  restore, and no-auto-resume behavior.

## Security Contract

- **Visibility:** server-only DB contract; no endpoint.
- **Authentication/RBAC:** server actor only; no body owner; no authorization grant.
- **CSRF/rate:** n/a here; the later route uses the shared `admin_write` policy.
- **Validation:** row-local named CHECK, unique/FK constraints, strict digests/CAS/fence.
- **Anti-abuse:** no public write, nonce/HMAC/reCAPTCHA or external I/O.
- **Privacy:** `static_brief` remains server-side and only inside the encrypted
  Designer backup section; logs/errors/cache/evidence expose its digest, never its
  body. No package/provider/token/path/SQL leakage.

## Testing Requirements

After safe `.env` load and DB reachability:

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/designer/designer-static-generation-persistence.test.ts tests/vitest/designer/designer-purge-policy.test.ts tests/vitest/backups/designer-static-backup-contract.test.ts
bun test tests/unit/db/assistantDesignerStaticGenerationSchema.test.ts tests/unit/backups/designerStaticBackupRestore.test.ts tests/unit/backups/designerStaticArchiveIntegration.test.ts tests/integration/server/task556StaticGenerationMigration.test.ts tests/integration/server/task556StaticGenerationRepository.test.ts tests/integration/designer/designer-reject-expiry.test.ts
set -a && source .env && set +a && bun test --parallel=1 --timeout 360000 tests/perf/designerStaticStarterPersistence.test.ts
bun run scan:security:strict
git diff --check
```

Run the focused performance command with no other test, smoke, worker, or load
generator competing for the database. Run landed migration facade/parity/upgrade
commands, query-budget tests, and `wc -l` for every touched human-authored
production/test file; fail above 1,000.

## Documentation Updates Required

Record exact paths/symbols, migration tag, constraint/index names, query plans,
budgets, retention/reseed and deploy recovery for TASK-556-04-L02. Edit no docs,
task metadata, board, or changelog here.
