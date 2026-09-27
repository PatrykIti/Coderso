# TASK-551-05-L03: Normalized Solution Kit Rollback Authority
# FileName: TASK-551-05-L03-Normalized-Solution-Kit-Rollback-Authority.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-05
**Priority:** Critical
**Category:** Database / Schema / Migration / Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-551-05-L01 (sole schema/migration writer; lands all four authority tables), serialized TASK-489 handoff (first producers, not this leaf)
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Own the normalized Solution Kit rollback-authority contract that the serialized
TASK-489 handoff requires. The four schema surfaces below are ordinary
Drizzle/snapshot-owned schema added by TASK-551-05-L01's single generated
migration triple; this leaf owns their exact contract bytes, named checks,
mandatory index rows, and the authority test suite. It is not a later TASK-489
migration and nothing is inferred from `options` JSON. L01 remains the sole
atomic migration/snapshot/journal writer; this leaf writes no schema, no
migration, and no service code.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Contract:** this file is the authority contract. The four table definitions
are landed by TASK-551-05-L01's one migration triple through
`core/db/tables/solutionKitRollbackAuthority.ts`; this leaf owns only the
contract text, the named-check/catalog rows below, and the tests.

**Tests:** `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
(sole writer; catalog/migration/snapshot parity, state-matrix, named-check,
preflight, and source-guard tests). Fixture evidence uses literal deterministic
digest constants owned here; builder-parity evidence is verified by TASK-551-06-L01
after it lands (this leaf depends on no later leaf).

**Forbidden:** no edits to `core/db/schema.ts`, any `core/db/tables/**` module,
migration SQL/snapshot/journal, `scripts/task-551-online-indexes.ts`, the
online-index manifest, `kitInstaller.ts`, `templateInstaller.ts`, service
routes, clients, or cache code. TASK-551 owns only the empty-capable schema
contract and its fixture/test evidence; producers land in serialized TASK-489.

## Four Schema Surfaces (landed by TASK-551-05-L01)

1. `solution_kit_starter_apply_owners` has non-null primary key/FK
   `source_run_id -> solution_kit_install_runs.id ON DELETE RESTRICT`, non-null
   typed `package_key`, non-null `actor_id -> users.id ON DELETE RESTRICT`, and a composite FK
   `(source_run_id,package_key,actor_id) ->
   solution_kit_install_runs(id,kit_id,actor_id) ON DELETE RESTRICT`, backed by
   exact unique `solution_kit_runs_id_package_actor_key`. This makes source,
   package, and authenticated actor one relational identity rather than three
   independently plausible columns. Non-null `contract`, `definition_digest`,
   `phase`, strict object `envelope`, and `envelope_digest` carry exact
   `contract='coderso.starter-content-rollback@v1'`; `released_at` is nullable,
   and `created_at/updated_at` are non-null. Package key is 1..128 UTF-8 bytes;
   digests are lowercase 64-hex; phases are exactly `before_captured`,
   `core_applying`, `core_applied`, `templates_applying`, `templates_applied`,
   `shell_write_prepared`, `shell_write_applied`, `complete`; release requires
   `phase='complete'`. Unique partial
   `solution_kit_starter_apply_owners_active_idx(package_key,actor_id) WHERE
   released_at IS NULL` is the sole active-owner uniqueness predicate.
2. `solution_kit_legacy_template_evidence` owns every new apply-side template
   operation that cannot be represented by `solution_kit_install_items`. It has
   non-null UUID primary key `id`, non-null `source_run_id ->
   solution_kit_install_runs.id ON DELETE RESTRICT`, non-null integer
   `source_position` in `0..511`, non-null 1..128-byte `template_key`, nullable
   canonical UUID `template_id`, non-null lowercase-64-hex `plan_digest`,
   and composite FK `(source_run_id,plan_digest) ->
   solution_kit_install_runs(id,legacy_template_plan_digest) ON DELETE RESTRICT`;
   non-null closed `operation=create|update|noop`, non-null closed
   `status=success|failed|skipped`, strict
   nullable `before_snapshot/after_snapshot/rollback_action`, nullable reviewed
   `safe_error_code`, non-null lowercase 64-hex `evidence_digest`, and non-null
   timestamps. Unique
   `(source_run_id,source_position)` and `(source_run_id,template_key)` prevent a
   second identity. Successful create requires a non-null template ID, null before,
   plus after/action; successful update requires a non-null template ID, both
   snapshots, plus action; successful noop requires a non-null template ID and byte-
   identical before/after plus null action. Success has null safe error.
   Failed/skipped permits a canonical known template ID or null, has null after/
   action, failed requires one reviewed safe code, and skipped requires null code. A
   null ID means mutation never produced or authoritatively resolved a native identity
   and is ineligible for rollback progress. Snapshot/action JSON, strict input types,
   shared size constants, and evidence/progress digest recomputation use the literal
   deterministic constants owned by this leaf; TASK-551-06-L01 verifies builder
   parity after it lands.
   Serialized TASK-489 generic and Setup legacy apply paths will be the first
   producers, writing this row in the same transaction as template mutation,
   revision, and invalidation receipt. TASK-551 owns only the empty-capable
   schema, constraints, fixture evidence, and retention handoff; it does not edit
   `kitInstaller.ts` or `templateInstaller.ts`. `options` may remain historical input but
   is not new rollback or retention authority.
3. `solution_kit_legacy_rollback_progress` has non-null FKs
   `rollback_run_id/source_run_id -> solution_kit_install_runs.id ON DELETE
   RESTRICT`, non-null UUID `source_evidence_id`, composite FK `(rollback_run_id,source_run_id) ->
   solution_kit_install_runs(id,rollback_of_run_id) ON DELETE RESTRICT`, and
   non-null exact `source_status='success'`, and composite FK
   `(source_evidence_id,source_run_id,source_position,source_evidence_digest,
   source_status) -> solution_kit_legacy_template_evidence(id,source_run_id,
   source_position,evidence_digest,status) ON DELETE RESTRICT`; non-null exact
   `contract='coderso.legacy-template-rollback-progress@v1'`; non-null integer
   `source_position/rollback_position` in `0..511`; non-null closed
   `state=rollback_committed|source_restored|failed_no_mutation`; non-null lowercase
   64-hex `source_evidence_digest`, `source_after_digest`, nullable
   `rollback_target_digest`, nullable 1..128-byte
   `mutation_invalidation_event_key/compensation_invalidation_event_key`,
   non-null lowercase 64-hex `progress_digest`, and non-null timestamps. Primary key is
   `(rollback_run_id,source_position)` and unique
   `(rollback_run_id,rollback_position)`. The state check requires no target or
   event for `failed_no_mutation`, target+mutation event only for
   `rollback_committed`, and target+both events for `source_restored`.
4. `solution_kit_install_runs` changes `rollback_of_run_id` from `ON DELETE SET
   NULL` to `ON DELETE RESTRICT`; gains nullable typed
   `legacy_template_plan_version`, `legacy_template_plan_count`, and
   `legacy_template_plan_digest`; and gains nullable typed
   `rollback_proof_version`, `rollback_proof_kind`, and `rollback_proof_digest`.
   Template-plan columns are all-null for a run outside the high-level legacy
   template coordinator, or exactly version `1`, count `0..100`, and lowercase
   64-hex digest on `mode='apply'`. Generic/Setup high-level apply writes them at
   source-run creation before core/template mutation, including the empty-plan
   digest for zero seeds. Unique
   `solution_kit_runs_id_legacy_template_plan_key(id,
   legacy_template_plan_digest)` is the evidence FK target.
   Rollback proof columns are all-null or exactly version `1`, kind
   `complete|zero_net`, and a
   lowercase 64-hex digest. Existing historical terminal rows remain null and
   therefore cannot become TASK-489 retry authority. New running rows keep them
   null; TASK-489 terminal success/failed writes `complete`/`zero_net` in its
   locked terminal transaction. Named checks require rollback mode iff
   `rollback_of_run_id` is non-null. When proof is present, mode must be rollback,
   status/finished-at must be terminal, and only `success+complete` or
   `failed+zero_net` is valid; a running row or mismatched kind cannot carry proof.
   Unique `solution_kit_runs_id_rollback_relation_key(id,rollback_of_run_id)` is
   the composite FK target above.

The sole existing-FK action change in the entire TASK-551-05 migration scope is
this `solution_kit_install_runs.rollback_of_run_id` transition from
`ON DELETE SET NULL` to `ON DELETE RESTRICT`; migration/catalog tests pin it.

## Named Checks and Preflight

Named checks pin every grammar/state rule above. Migration preflight reports
bounded ID-only counts for legacy rollback rows with null sources, non-rollback
rows with sources, owner source/package/actor mismatch, duplicate template
identity/position, progress/evidence mismatch, and proof/status mismatch. Any
count aborts without rewriting customer rows; operator correction precedes a
complete rerun. Unique partial
`solution_kit_runs_active_rollback_source_idx(rollback_of_run_id) WHERE
mode='rollback' AND status='running' AND rollback_of_run_id IS NOT NULL` prevents
two running owners for one source. Migration preflight reports bounded synthetic/
ID-only counts for duplicate running rollback sources and aborts without rewriting
customer rows; operator correction precedes a complete rerun. Catalog tests prove
no active-owner/template-evidence/progress/proof index or check uses `options`,
`summary`, a JSON expression, or a nullable-actor uniqueness loophole.
The exact semantic constraints are named
`solution_kit_runs_rollback_relation_chk`,
`solution_kit_runs_legacy_template_plan_chk`,
`solution_kit_runs_rollback_proof_state_chk`,
`solution_kit_starter_apply_owners_source_identity_fk`,
`solution_kit_starter_apply_owners_state_chk`,
`solution_kit_legacy_template_evidence_state_chk`,
`solution_kit_legacy_progress_rollback_relation_fk`, and
`solution_kit_legacy_progress_source_evidence_fk`, and
`solution_kit_legacy_progress_state_chk`. Catalog tests compare their
full column lists, actions, and check definitions rather than checking names only.
The run relation check is exactly
`CHECK ((mode = 'rollback') = (rollback_of_run_id IS NOT NULL))`. The proof check
is exactly all three proof columns null, or version `1` with `mode='rollback'`,
`finished_at IS NOT NULL`, and either `(status='success' AND
rollback_proof_kind='complete')` or `(status='failed' AND
rollback_proof_kind='zero_net')`, plus the lowercase-64-hex digest check. This
permits historical terminal all-null proof but no semantically mismatched proof.

The owner state check is exactly the conjunction of the literal contract; package
key `octet_length` in `1..128`; lowercase-64-hex definition/envelope digests;
`jsonb_typeof(envelope)='object'`; `envelope->>'contract'=contract`;
`envelope->>'definitionDigest'=definition_digest`; `envelope->>'phase'=phase`;
the eight closed phases above;
and exact release parity
`(released_at IS NULL AND envelope->'active'='true'::jsonb) OR
(released_at IS NOT NULL AND phase='complete' AND
envelope->'active'='false'::jsonb)`. Digest-to-canonical-envelope equality
remains part of TASK-489's strict producer/parser because PostgreSQL does not own
that canonical JSON algorithm, but malformed SQL-enforceable outer state cannot be
stored.

The template-evidence state check is exactly the conjunction of source position
`0..511`, template-key `octet_length` in `1..128`, lowercase-64-hex plan/evidence
digests, nullable safe code constrained to `1..96` ASCII bytes, and this closed
matrix: every success has non-null `template_id`; successful create has null before
plus non-null object after/action; successful update has non-null object before/after/
action; successful noop has non-null object before/after with JSONB equality and null
action; every success has null safe code; failed/skipped may have a canonical UUID or
null `template_id`, have null after/action, failed has non-null safe code, and skipped
has null safe code. Recursive snapshot/action allowlists, byte
caps, and evidence/progress digest recomputation use the literal deterministic
constants owned by this leaf; TASK-551-06-L01 verifies builder parity after it
lands and TASK-489 producers consume them read-only.

The progress state check is exactly the conjunction of the literal contract and
`source_status='success'`; both positions in `0..511`; lowercase-64-hex source-
evidence/source-after/progress digests; nullable rollback-target digest either null
or lowercase 64-hex; each nullable invalidation event key either null or
`octet_length` in `1..128`; and this closed matrix: `failed_no_mutation` has null
target and both event keys null, `rollback_committed` has non-null target plus
mutation event and null compensation event, and `source_restored` has non-null
target plus both events. All columns identified as non-null above are asserted as
such in the generated snapshot and live catalog; nullable source-run actor state
cannot weaken active-owner uniqueness.

## Mandatory Solution Kit Index Rows (catalog, landed by TASK-551-05-L01)

| Name | Table | Ordered columns | Predicate |
|---|---|---|---|
| `solution_kit_runs_history_idx` | `solution_kit_install_runs` | `created_at DESC, id DESC` | none |
| `solution_kit_runs_successful_apply_order_idx` | `solution_kit_install_runs` | `kit_id ASC, created_at DESC, id DESC` | `mode='apply' AND status='success' AND finished_at IS NOT NULL` |
| `solution_kit_runs_successful_rollback_relation_idx` | `solution_kit_install_runs` | `kit_id ASC, rollback_of_run_id ASC, id ASC` | `mode='rollback' AND status='success' AND finished_at IS NOT NULL` |
| `solution_kit_runs_active_rollback_source_idx` | `solution_kit_install_runs` | `rollback_of_run_id ASC` | unique; `mode='rollback' AND status='running' AND rollback_of_run_id IS NOT NULL` |
| `solution_kit_runs_id_package_actor_key` | `solution_kit_install_runs` | `id ASC, kit_id ASC, actor_id ASC` | unique; composite owner-FK target |
| `solution_kit_runs_id_rollback_relation_key` | `solution_kit_install_runs` | `id ASC, rollback_of_run_id ASC` | unique; composite progress-FK target |
| `solution_kit_runs_id_legacy_template_plan_key` | `solution_kit_install_runs` | `id ASC, legacy_template_plan_digest ASC` | unique; composite template-evidence-FK target |
| `solution_kit_starter_apply_owners_active_idx` | `solution_kit_starter_apply_owners` | `package_key ASC, actor_id ASC` | unique; `released_at IS NULL` |
| `solution_kit_legacy_template_evidence_source_position_key` | `solution_kit_legacy_template_evidence` | `source_run_id ASC, source_position ASC` | unique |
| `solution_kit_legacy_template_evidence_source_key` | `solution_kit_legacy_template_evidence` | `source_run_id ASC, template_key ASC` | unique |
| `solution_kit_legacy_template_evidence_identity_key` | `solution_kit_legacy_template_evidence` | `id ASC, source_run_id ASC, source_position ASC, evidence_digest ASC, status ASC` | unique; composite progress-FK target |
| `solution_kit_legacy_rollback_progress_rollback_position_idx` | `solution_kit_legacy_rollback_progress` | `rollback_run_id ASC, rollback_position ASC` | unique |
| `solution_kit_legacy_rollback_progress_source_idx` | `solution_kit_legacy_rollback_progress` | `source_run_id ASC, source_position ASC` | none |
| `solution_kit_legacy_rollback_progress_source_evidence_idx` | `solution_kit_legacy_rollback_progress` | `source_evidence_id ASC` | none |

Every row above is emitted byte-for-byte by the closed online-index manifest and
created by the non-transactional companion, exactly as L01's general index
contract requires. No authority index uses `options`, `summary`, a JSON
expression, or a nullable-actor uniqueness loophole.

## Security Contract

- Database schema/migration contract only; no endpoint, auth, RBAC, CSRF,
  rate-limit, nonce/HMAC, or CAPTCHA changes.
- Constraints reinforce authorization-independent data integrity but do not
  replace route/service permission checks.
- Migration diagnostics include counts/IDs only when synthetic; production
  guidance must never emit customer fields, binds, tokens, hashes, or secrets.
- Tests exercise synthetic fixture rows only; no production data, secrets, or
  customer rows are read or written.
- The receipt stores only repository-relative paths, digests, catalog
  identifiers, numeric budgets, and completion state.

## Implementation Pseudocode

The implementation writer is the sole
`tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
suite. It consumes the schema landed by L01 through
`core/db/tables/solutionKitRollbackAuthority.ts`, the guarded
`core/db/schema.ts` facade, and L01's generated snapshot/migration/catalog
projection. It does not add a production authority service, migration, or
route. The test-local contract is the source for the exact
`EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY` projection consumed read-only by
L02.

```ts
type AuthorityConstraintName =
  | "solution_kit_runs_rollback_relation_chk"
  | "solution_kit_runs_legacy_template_plan_chk"
  | "solution_kit_runs_rollback_proof_state_chk"
  | "solution_kit_starter_apply_owners_source_identity_fk"
  | "solution_kit_starter_apply_owners_state_chk"
  | "solution_kit_legacy_template_evidence_state_chk"
  | "solution_kit_legacy_progress_rollback_relation_fk"
  | "solution_kit_legacy_progress_source_evidence_fk"
  | "solution_kit_legacy_progress_state_chk";

type AuthorityCatalogProjection = Readonly<{
  tables: readonly string[];
  columns: readonly Readonly<{
    table: string; name: string; sqlType: string;
    nullable: boolean; defaultSql: string | null;
  }>[];
  foreignKeys: readonly Readonly<{
    name: string; columns: readonly string[]; targetTable: string;
    targetColumns: readonly string[]; onDelete: "RESTRICT" | "SET NULL";
  }>[];
  checks: readonly Readonly<{
    name: AuthorityConstraintName; definition: string;
  }>[];
  indexes: readonly Readonly<{
    name: string; table: string; columns: readonly string[];
    predicate: string | null; unique: boolean;
  }>[];
}>;

type NormalizedRollbackAuthorityProjection = Readonly<{
  sourceRun: Readonly<{
    id: string; kitId: string; actorId: string;
    mode: "apply" | "rollback";
    status: "running" | "success" | "failed";
    finishedAt: string | null; rollbackOfRunId: string | null;
    legacyTemplatePlanVersion: 1 | null;
    legacyTemplatePlanCount: number | null;
    legacyTemplatePlanDigest: string | null;
  }>;
  activeStarterOwner: Readonly<{
    sourceRunId: string; packageKey: string; actorId: string;
    releasedAt: string | null;
  }> | null;
  sourceEvidence: readonly Readonly<{
    id: string; sourceRunId: string; sourcePosition: number;
    templateKey: string; templateId: string | null;
    planDigest: string; operation: "create" | "update" | "noop";
    status: "success" | "failed" | "skipped";
    evidenceDigest: string;
  }>[];
  rollbackProgress: readonly Readonly<{
    rollbackRunId: string; sourceRunId: string; sourceEvidenceId: string;
    sourcePosition: number; rollbackPosition: number;
    sourceEvidenceDigest: string; sourceStatus: "success";
    state: "rollback_committed" | "source_restored" | "failed_no_mutation";
  }>[];
  newerSuccessfulApplies: readonly Readonly<{
    id: string; hasTerminalSuccessfulRollback: boolean;
  }>[]; // bounded to the 513-row classifier sentinel
  rollbackOwners: readonly Readonly<{
    rollbackRunId: string;
    status: "running" | "success" | "failed";
    rollbackProofKind: "complete" | "zero_net" | null;
  }>[];
  contradictoryRelations: boolean;
}>;

type NormalizedAuthorityFixture = Readonly<{
  packageKey: string;
  sourceRunId: string;
  ids: Readonly<{
    runIds: readonly string[];
    ownerIds: readonly string[];
    evidenceIds: readonly string[];
    progressKeys: readonly Readonly<{
      rollbackRunId: string; sourcePosition: number;
    }>[];
  }>;
  projection: NormalizedRollbackAuthorityProjection;
}>;

type RollbackAuthorityDecision =
  | Readonly<{ action: "claim"; sourceRunId: string }>
  | Readonly<{ action: "resume"; rollbackRunId: string; code: "solution_kit_rollback_in_progress" }>
  | Readonly<{ action: "reject"; sourceRunId: string; code:
      | "solution_kit_already_rolled_back"
      | "solution_kit_rollback_source_superseded"
      | "solution_kit_rollback_relation_limit_exceeded" }>
  | Readonly<{ action: "recovery"; sourceRunId: string; code: "solution_kit_rollback_recovery_required" }>;

type AuthorityBoundaryError = Readonly<{
  code: "solution_kit_run_shape_invalid"
    | "solution_kit_starter_apply_recovery_required"
    | "solution_kit_rollback_in_progress"
    | "solution_kit_rollback_recovery_required"
    | "solution_kit_already_rolled_back"
    | "solution_kit_rollback_source_superseded"
    | "solution_kit_rollback_relation_limit_exceeded"
    | "solution_kit_operation_failed";
  constraint: AuthorityConstraintName | string | null;
}>;

type AuthorityFixtureReceipt = Readonly<{
  sourceRunId: string; rollbackRunId: string | null;
  ownerId: string | null; evidenceIds: readonly string[];
  progressCount: number; decision: RollbackAuthorityDecision;
}>;

const AUTHORITY_CONSTRAINT_ERROR_MAP: Readonly<Record<string, AuthorityBoundaryError["code"]>> = {
  solution_kit_starter_apply_owners_active_idx: "solution_kit_starter_apply_recovery_required",
  solution_kit_runs_active_rollback_source_idx: "solution_kit_rollback_in_progress",
  solution_kit_runs_rollback_relation_chk: "solution_kit_run_shape_invalid",
  solution_kit_runs_legacy_template_plan_chk: "solution_kit_run_shape_invalid",
  solution_kit_runs_rollback_proof_state_chk: "solution_kit_run_shape_invalid",
  solution_kit_starter_apply_owners_source_identity_fk: "solution_kit_run_shape_invalid",
  solution_kit_starter_apply_owners_state_chk: "solution_kit_run_shape_invalid",
  solution_kit_legacy_template_evidence_state_chk: "solution_kit_run_shape_invalid",
  solution_kit_legacy_progress_rollback_relation_fk: "solution_kit_run_shape_invalid",
  solution_kit_legacy_progress_source_evidence_fk: "solution_kit_run_shape_invalid",
  solution_kit_legacy_progress_state_chk: "solution_kit_run_shape_invalid",
};

function assertExactL01AuthorityInputs(input: Readonly<{
  schema: AuthorityCatalogProjection;
  snapshot: AuthorityCatalogProjection;
  migration: AuthorityCatalogProjection;
  catalog: AuthorityCatalogProjection;
}>): void {
  assertExactSolutionKitRollbackAuthority(input.schema, EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY);
  assertAuthorityMigrationSnapshotParity(input.schema, input.snapshot, input.migration);
  assertExactSolutionKitRollbackAuthority(input.catalog, EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY);
  assertNoOptionsJsonAuthorityPredicate(input.catalog);
}

function decideRollbackAuthority(
  input: NormalizedRollbackAuthorityProjection,
): RollbackAuthorityDecision {
  assertNormalizedAuthorityProjection(input); // reject unknown/state-mismatched rows before writes
  if (input.sourceRun.mode !== "apply" || input.sourceRun.status !== "success"
      || input.sourceRun.finishedAt === null || input.sourceRun.rollbackOfRunId !== null) {
    throw new AuthorityDomainError("solution_kit_run_shape_invalid");
  }
  const runningOwners = input.rollbackOwners.filter((owner) => owner.status === "running");
  const failedWithoutZeroNetProof = input.rollbackOwners.some((owner) =>
    owner.status === "failed" && owner.rollbackProofKind !== "zero_net"
  );
  if (input.contradictoryRelations || failedWithoutZeroNetProof || runningOwners.length > 1) {
    return { action: "recovery", sourceRunId: input.sourceRun.id,
      code: "solution_kit_rollback_recovery_required" };
  }
  if (runningOwners.length === 1) {
    return { action: "resume", rollbackRunId: runningOwners[0].rollbackRunId,
      code: "solution_kit_rollback_in_progress" };
  }
  if (input.rollbackOwners.some((owner) =>
    owner.status === "success" && owner.rollbackProofKind === "complete"
  )) {
    return { action: "reject", sourceRunId: input.sourceRun.id,
      code: "solution_kit_already_rolled_back" };
  }
  if (input.newerSuccessfulApplies.some((row) => !row.hasTerminalSuccessfulRollback)) {
    return { action: "reject", sourceRunId: input.sourceRun.id,
      code: "solution_kit_rollback_source_superseded" };
  }
  if (input.newerSuccessfulApplies.length === 513
      && input.newerSuccessfulApplies.every((row) => row.hasTerminalSuccessfulRollback)) {
    return { action: "reject", sourceRunId: input.sourceRun.id,
      code: "solution_kit_rollback_relation_limit_exceeded" };
  }
  return { action: "claim", sourceRunId: input.sourceRun.id };
}

function mapAuthorityBoundaryError(error: unknown): AuthorityBoundaryError {
  if (isAuthorityDomainError(error)) return { code: error.code, constraint: null };
  const constraint = readKnownPgConstraintName(error);
  const code = constraint === null
    ? "solution_kit_operation_failed"
    : AUTHORITY_CONSTRAINT_ERROR_MAP[constraint] ?? "solution_kit_operation_failed";
  return { code, constraint };
}

async function persistAuthorityFixtureTx(
  tx: DbTransaction,
  input: NormalizedAuthorityFixture,
): Promise<AuthorityFixtureReceipt> {
  const decision = decideRollbackAuthority(input.projection);
  if (decision.action !== "claim" && decision.action !== "resume") return {
    sourceRunId: input.projection.sourceRun.id, rollbackRunId: null,
    ownerId: null, evidenceIds: [], progressCount: 0, decision,
  };
  // Parent run first, then optional Setup owner/evidence, then progress. Every
  // insert and digest/state check uses this tx handle; no post-commit patch is allowed.
  const rollbackRunId = decision.action === "claim"
    ? await insertRollbackRunTx(tx, input)
    : decision.rollbackRunId;
  const ownerId = input.activeStarterOwner === null
    ? null
    : await insertStarterApplyOwnerTx(tx, input);
  const evidenceIds = await insertTemplateEvidenceBatchTx(tx, input);
  if (input.projection.rollbackProgress.length > 0) {
    await insertRollbackProgressBatchTx(tx, input, rollbackRunId, evidenceIds);
  }
  return { sourceRunId: input.projection.sourceRun.id, rollbackRunId,
    ownerId, evidenceIds, progressCount: input.projection.rollbackProgress.length, decision };
}

async function withAuthorityFixture<T>(
  db: Db,
  input: NormalizedAuthorityFixture,
  run: (tx: DbTransaction, receipt: AuthorityFixtureReceipt) => Promise<T>,
): Promise<T> {
  let receipt!: AuthorityFixtureReceipt;
  try {
    receipt = await db.transaction(async (tx) => {
      receipt = await persistAuthorityFixtureTx(tx, input);
      return receipt;
    }); // commit is the only boundary after which the receipt is observed
    return await db.transaction((tx) => run(tx, receipt));
  } catch (error) {
    throw mapAuthorityBoundaryError(error); // never expose driver text
  } finally {
    await cleanupAuthorityFixtureByOwnedIds(db, input.ids); // child-first, bounded IN lists
    await assertAuthorityFixtureHasZeroResidue(db, input.ids);
  }
}

async function raceAuthorityWriters(
  db: Db,
  input: NormalizedAuthorityFixture,
): Promise<Readonly<{ winners: number; mappedErrors: readonly AuthorityBoundaryError[] }>> {
  const barrier = createSynchronizedStartBarrier(2);
  const attempt = () => db.transaction(async (tx) => {
    await acquireCanonicalPackageLockThenSourceAdvisoryLock(tx, input.packageKey, input.sourceRunId);
    await barrier.arrive();
    return persistAuthorityFixtureTx(tx, input);
  });
  const results = await Promise.allSettled([attempt(), attempt()]);
  // The unique partial index is the final arbiter. A conflict may do one
  // bounded locked re-read/resume, never an unbounded retry or second claim.
  return summarizeRace(results, { maxRetries: 1, expectedWinners: 1 });
}
```

**Data flow:** L01 table/schema projection plus the generated snapshot,
migration, and live catalog → exact full-column/FK/check/index parity and
`options`-predicate guard → one normalized source/owner/evidence/progress
projection → bounded `(created_at,id)` newer-apply classifier (maximum 513
rows) → `claim`, `resume`, `already_rolled_back`, `source_superseded`, or
`relation_limit_exceeded` decision → one transaction-handle persistence
boundary → committed IDs/digests/counts only. The future TASK-489 seam keeps
`claimExactLegacyRollbackSourceTx`, template mutation/revision, and
`recordLegacyTemplateRollbackProgressTx` on the same transaction handle; its
cache/invalidation `applyAfterCommit` work is post-commit and is not added by
this schema-only leaf.

**Error handling and concurrency:** strict fixture parsing rejects unknown
fields, malformed digests, phase/state contradictions, evidence/progress
mismatches, and version/proof mismatches before insert. Named PostgreSQL
checks, FKs, and unique indexes are converted once by
`mapAuthorityConstraintError`; TASK-489's existing centralized `map*Error`
boundary owns transport mapping. Known duplicate active-owner and running-
rollback constraints map to `solution_kit_starter_apply_recovery_required`
and `solution_kit_rollback_in_progress`; other authority boundary failures map
to `solution_kit_run_shape_invalid`, with unexpected driver failures reduced to
`solution_kit_operation_failed`. The package lock then source-scoped
transaction advisory lock is acquired in that fixed order. Synchronized
writers prove one winner, one unique/version conflict, and at most one bounded
re-read; a failed transaction rolls back every child row and emits no
post-commit effect.

**Regression-test shape in
`tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`:**

- Happy-path round trips for empty, core-only, template-only, and mixed
  normalized fixtures, every template operation/status arm, every progress
  state, release parity, and valid terminal proof.
- Malformed catalog/schema mismatch cases for missing/reordered columns,
  nullability/default/type drift, FK action drift, weakened named checks,
  missing mandatory indexes, and any JSON `options` authority predicate.
- Constraint cases assert the exact named check/FK/index and the mapped
  machine-readable code for bad phase/digest/state, source/evidence/run
  mismatch, duplicate identity/position, and invalid proof/version.
- Concurrent duplicate active-owner and running-rollback claims, plus a
  simultaneous rollback/authority transition, use synchronized transactions
  and prove one winner, stable conflict mapping, locked resume, and no second
  source or rollback claim.
- Failure/rollback cases verify `ON DELETE RESTRICT`, transaction rollback,
  no residue after child-first fixture cleanup, and zero writes for every
  preflight or authority rejection.
- Query instrumentation asserts bounded fixture-ID reads, no N+1 writes,
  no whole-table cleanup, no `options` selection, and the 513-row relation
  sentinel. It records the expected bounded statement count for each
  projection path and fails on an unbounded read or a duplicate query.

## Testing Requirements

- Authority tests pin all three normalized tables, every FK/check/default/
  nullability rule, proof columns, active-owner and one-running-rollback unique
  partial indexes, plus the two successful relation indexes and all-runs history
  index. Concurrent duplicate owner/rollback inserts have one winner; malformed
  phases/digests/evidence/progress-state combinations fail at the database boundary;
  source, evidence, or related run deletion is restricted while authority remains.
  Source guards reject a JSON active-owner/evidence/progress/proof predicate
  anywhere in the landed repository.
- Migration/snapshot/live-catalog parity tests compare full column lists,
  actions, and check definitions, never names only; a generated drift pass emits
  no second DDL.
- Round-trip persistence tests cover every state matrix row above, including
  release parity and proof/status mismatch rejection.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
- Repeat the exact command after L01's migration-from-clean and migration-from-prior runs.
- L01's zero-drift `set -a && source .env && set +a && bun run db:generate` check before and after landing.
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`

## Documentation Updates Required

No shared docs. Supply the authority-table contract, named checks, index rows,
and fixture/test evidence to TASK-551-10-L02 and hand the producer seam to
serialized TASK-489.

## Quantified Acceptance

- Normalized Solution Kit owner/template-evidence/progress/proof authority and
  every named TASK-489 index/FK/check are migration/snapshot/catalog-identical.
  Tests reject source/package/actor mismatch, progress linked to another rollback
  or evidence row, proof/status mismatch, duplicate evidence identity, deletion
  that would orphan a rollback relation, and duplicate running owners; active/
  retry decisions require zero JSON predicate.
- This leaf and every file it touches stay at or below 1,000 physical lines.
- No production schema/migration/service file is modified by this leaf; the
  four authority surfaces are landed solely by TASK-551-05-L01's one migration
  triple, and a fresh `db:generate` produces no unexplained drift.


## Concurrency, catalog, and classifier execution addendum

> **Authoritative precedence.** This addendum is normative for TASK-551-05-L03 and explicitly supersedes any conflicting concurrency, catalog-projection, classifier, retry, or test pseudocode earlier in this file. The implementation and tests must follow this section.

### 1. Pre-lock two-writer barrier and bounded lock acquisition

The two candidate writers must rendezvous at a **pre-lock two-writer barrier** for the same authority/site/solution-kit key before either writer takes a database row lock. The barrier is coordination only:

1. Derive one stable barrier key from `(authorityId, siteId, solutionKitId)` and register a distinct writer token for each participant.
2. Wait for the second distinct writer with a bounded timeout. No transaction row lock, advisory lock, `FOR UPDATE`, or held database lock may exist while waiting at this barrier.
3. When the two-writer condition is reached, both writers release the barrier immediately and before lock acquisition. Release is idempotent and is also performed in `finally` when the barrier times out or the transaction fails.
4. After release, each writer independently performs bounded lock acquisition and then rereads authoritative state. The writers must not reacquire, wait at, or otherwise hold the two-writer barrier while a row or advisory lock is held.

This ordering is required to prevent lock-order inversion: **barrier, release, independent lock acquisition, reread, classify**. A barrier timeout is bounded and retryable; it must never leave a writer waiting indefinitely or retain a lock while waiting for its peer.

### 2. Locked authority loader, decisions, retries, and route mapping

The single owner of the locked reread and classifier input is the following exact helper signature:

```ts
loadRollbackAuthorityStateForUpdate(tx, input)
```

`tx` is the current transaction handle. `input` contains the normalized authority, site, solution-kit, expected authority version, expected rollback/apply identity, target version, and the optional descending-page cursor used to find newer applies. The helper must:

- reread the authority row and the relevant apply watermark **under the lock**, using `tx` rather than the global database client;
- select only the columns needed by the classifier and take the lock only after the pre-lock barrier has been released;
- classify from the locked reread, never from a pre-lock snapshot;
- return exactly one decision: `apply`, `resume`, `noop`, or `conflict`.

Decision rules:

| Decision | Locked-state condition | Required behavior |
| --- | --- | --- |
| `apply` | The authority/site/kit identity matches, the expected authority version is current, and no equal operation is already completed or in progress. | Create or advance the rollback apply idempotently. |
| `resume` | The same expected operation owns an existing pending/running apply at the current authority version. | Resume that operation; do not create a second apply. |
| `noop` | The requested target is already the authoritative target, or the same operation is already completed, and no newer conflicting apply exists. | Return the existing authoritative result without a write. |
| `conflict` | The locked authority identity changed, the expected authority version is stale, or a different newer apply owns the key. | Return a machine-readable conflict and do not overwrite the newer state. |

Use `rollback_authority_conflict` when the locked authority/site/kit ownership or authority identity does not match the normalized input. Use `rollback_version_conflict` when the identity matches but the expected authority/version or apply watermark is stale. These are terminal domain outcomes for the request and are not retried.

Database lock errors are normalized before they reach a route. SQLSTATE `40P01` maps to `rollback_deadlock`. A bounded lock wait or statement timeout (`55P03` or the configured statement-timeout result) maps to `rollback_lock_timeout`. Retry only those two transient lock outcomes, with `MAX_LOCK_RETRIES = 3` retries after the initial attempt, for at most four attempts total, and bounded backoff of 25 ms, 50 ms, and 100 ms (never more than 100 ms). Do not retry authority/version conflicts, unknown constraints, validation errors, or committed results. Every attempt releases the pre-lock barrier before acquiring a lock.

Routes use the centralized named mapper `mapRollbackAuthorityError` and never expose driver messages, SQL, constraint text, or bind values:

- `rollback_authority_conflict` and `rollback_version_conflict` map to HTTP `409`.
- `rollback_lock_timeout` and `rollback_deadlock` map to HTTP `503` with a bounded retry indication.
- `rollback_constraint_unknown` maps to HTTP `500` after fail-closed logging/telemetry.
- Any unrecognized database or domain error maps to the existing generic internal-error response.

### 3. Exact catalog projection and fail-closed named-constraint mapper

The catalog query must project this exact type and no additional fields:

```ts
type RollbackConstraintCatalogProjection = {
  sourceSchema: string;
  sourceTable: string;
  sourceColumns: string[];
  constraintName: string;
  referencedSchema: string | null;
  referencedTable: string | null;
  referencedColumns: string[];
  kind: "foreign_key" | "primary_key" | "unique" | "check" | "exclude";
  onUpdate: string | null;
  onDelete: string | null;
  ordinal: number;
};
```

The named mapper is `mapRollbackConstraintError(error)`. It extracts only the database constraint name, matches that name against the code-owned catalog allowlist, and maps recognized names to the corresponding machine-readable rollback error. It must fail closed when the name is absent, malformed, unknown, or inconsistent with the projected `(sourceSchema, sourceTable, sourceColumns, kind)` tuple: return `rollback_constraint_unknown`, abort the mutation, and do not infer meaning from a driver message, table name alone, ordinal alone, or constraint order. The mapper must preserve the exact `constraintName` for bounded redacted diagnostics only; it must never return raw database text to the client.

### 4. Bounded newer-apply classifier query

The classifier owns the following exact helper signature:

```ts
listNewerSolutionKitApplies(tx, input)
```

It issues one bounded query per page and selects only these columns:

```text
id, createdAt, authorityId, siteId, solutionKitId, version, status
```

The query applies all three equality filters, `authorityId`, `siteId`, and `solutionKitId`, plus the exclusive `newerThan` watermark and an optional descending cursor. The canonical SQL shape is:

```sql
SELECT
  id,
  created_at AS "createdAt",
  authority_id AS "authorityId",
  site_id AS "siteId",
  solution_kit_id AS "solutionKitId",
  version,
  status
FROM solution_kit_applies
WHERE authority_id = $authorityId
  AND site_id = $siteId
  AND solution_kit_id = $solutionKitId
  AND (created_at, id) > ($newerThanCreatedAt, $newerThanId)
  AND (
    $cursorCreatedAt IS NULL
    OR (created_at, id) < ($cursorCreatedAt, $cursorId)
  )
ORDER BY created_at DESC, id DESC
LIMIT $maxPagePlusOne;
```

`maxPage` is normalized to a bounded positive page size, with `MAX_PAGE = 100`; the query uses `maxPage + 1` only to determine `hasMore`, then returns at most `maxPage` rows. The `(createdAt, id)` pair is the stable unique cursor. There is no `COUNT`, `OFFSET`, per-row follow-up query, or unbounded read. The query budget is exactly one database query per requested page, and the total result is bounded by the number of requested pages. Mapping is pure in-memory projection to the selected camelCase fields, with `nextCursor` taken from the final returned row only when `hasMore` is true. Invalid cursor shape, mismatched cursor fields, or an out-of-range page is rejected before SQL.

### 5. Required test matrix and cleanup contract

The regression matrix must cover all of the following:

1. **Pre-lock no-deadlock:** two distinct writers reach the barrier, both release it, then independently acquire the lock; assert completion within the bound, no lock-order deadlock, and no barrier held during `FOR UPDATE`.
2. **Locked resume/conflict:** under a locked reread, assert same-operation `resume`, already-complete `noop`, stale-version `rollback_version_conflict`, and changed-authority `rollback_authority_conflict`; assert no duplicate or last-writer-wins overwrite.
3. **Retry and route mapping:** inject bounded timeout and deadlock outcomes, assert at most three retries with 25/50/100 ms backoff, then the exact `503` mapping; assert conflicts are not retried and map to `409`.
4. **Named FK and unknown constraint:** assert the known named foreign-key constraint maps through `mapRollbackConstraintError`; assert missing/unknown names return `rollback_constraint_unknown`, abort safely, and leak no driver text.
5. **Stable cursor and query count:** seed equal `createdAt` values with distinct ids, page in descending `(createdAt, id)` order, and assert no gaps or duplicates, correct authority/site/kit filtering, bounded page size, selected-column shape, and exactly one query per page.
6. **Cleanup:** use uniquely scoped fixtures, release every barrier and lock in `finally`, and delete only rows created by the test. Never truncate shared tables or use process-wide cleanup that can remove another suite's data.

### Addendum corrections

This subsection is authoritative and explicitly supersedes every conflicting line in the preceding addendum and any conflicting parent/L01/L03 wording. It corrects the implementation contract without widening the product surface.

#### 1. Production has no barrier

- Production has **no barrier**. `RollbackConcurrencyTestHook.beforeLock?: () => Promise<void>` is optional, injected only by focused tests, and `undefined` by default. The production writer proceeds alone and never waits for a test hook.
- The two-writer test may inject that hook and must use a bounded countdown barrier with a timeout. It must release all waiters and clean up in every `finally` path, including when one writer fails before arrival. A failed participant must actively release the other participant, and no test may wait indefinitely.
- The preceding pre-lock two-writer barrier requirement is superseded. There is no production rendezvous, production barrier key, or production synchronization primitive.

#### 2. Existing surface and single-writer ownership

There is no new route, schema, or runtime surface. The exact existing owner modules and tests named by the parent, L01, and L03 are:

- **Authority schema/table owner:** `core/db/tables/solutionKitRollbackAuthority.ts` (L01 owns the table module; L03 names it as read-only contract input).
- **Public schema facade:** `core/db/schema.ts` (the parent and L01 require the existing stable facade; L03 consumes it read-only).
- **Catalog verification:** `tests/integration/server/task551IndexAndConstraintCatalog.test.ts` (L01's named catalog suite).
- **Authority/schema parity suite:** `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` (L03's sole authority test writer).
- **Facade/type/parity tests already named by L01:** `tests/unit/db/schemaTableFacade.test.ts`, `tests/unit/db/schemaColumnTypeContracts.test.ts`, and `tests/integration/server/task551SchemaMigrationParity.test.ts`.
- **Authority service:** no service module is named by the parent, L01, or L03. L03 explicitly writes no service code.
- **Rollback query/classifier:** no production query/classifier module or separate test file is named by the parent, L01, or L03. The L03 pseudocode is not permission to add one.
- **Centralized error mapping:** no mapper module or new mapper test is named by the parent, L01, or L03. Any downstream route uses its already-existing centralized `map*Error` boundary.
- **Route:** no route or endpoint is named for this leaf. L01 explicitly forbids service/route/client/cache edits.

The descriptive helper names introduced by the superseded pseudocode, including `loadRollbackAuthorityStateForUpdate`, `mapRollbackConstraintError`, `mapRollbackAuthorityError`, `listNewerSolutionKitApplies`, `createSynchronizedStartBarrier`, `acquireCanonicalPackageLockThenSourceAdvisoryLock`, and `summarizeRace`, are not new exports or surfaces. If any name is retained, it must be a private helper in the existing owner module that already owns that behavior. Test-only barrier helpers belong privately in `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`; no production helper may be created for them. Any existing route remains orchestration-only and uses the existing centralized mapper. No new endpoint is allowed.

| Contract surface | Single writer | Prohibited parallel owner |
| --- | --- | --- |
| Authority table declarations | L01, in `core/db/tables/solutionKitRollbackAuthority.ts` | L03, routes, services, or a second table module |
| Stable schema facade | L01, in `core/db/schema.ts` | L03 or any new schema hierarchy |
| FK/index catalog verification | L01's `tests/integration/server/task551IndexAndConstraintCatalog.test.ts` | Route-local catalog copies or another catalog writer |
| Authority/schema parity and focused concurrency tests | L03, in `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | Production barriers, duplicate suites, or weakened assertions |
| Rollback service/query/error mapper/route | No writer in this parent/L01/L03 leaf; downstream existing owner only | Any new module, export, endpoint, or route-local mapper |

#### 3. Fail-closed FK allowlist

Every FK allowlist entry must contain these exact fields: `sourceSchema`, `sourceTable`, ordered `sourceColumns`, `constraintName`, `referencedSchema`, `referencedTable`, ordered `referencedColumns`, `kind`, `onUpdate`, and `onDelete`. For an FK allowlist entry, `kind` is exactly `foreign_key`; the source and referenced schema/table names, constraint name, and column arrays are compared exactly and position-by-position. Ordinal order is significant and must not be sorted or normalized away.

The only allowed values for `onUpdate` and `onDelete` are `NO ACTION`, `RESTRICT`, `CASCADE`, `SET NULL`, and `SET DEFAULT`. Validation must prove the exact referenced target and both exact actions, not merely the constraint name or source table. Unknown action or kind, unknown or malformed constraint, missing field, missing allowlist entry, duplicate entry, duplicate constraint, duplicate column ordinal, duplicate column identity, source mismatch, referenced-target mismatch, action mismatch, or ordinal drift fails closed. No best-effort match, driver-message inference, name-only match, or permissive fallback is allowed.

#### 4. Bounded classifier and persistence fence

The normalized classifier caps are explicit and inclusive at the valid boundary:

- `MAX_PAGE_SIZE = 100` for `pageSize`.
- `MAX_PAGES = 6`.
- `MAX_TOTAL_ROWS = 512` accepted classifier rows. The 513th row is the overflow sentinel and is not accepted.
- `MAX_QUERIES = 6`, with at most one bounded query per page.

The six-page cap is the minimum needed to cover the existing 512-row relation bound at a page size of 100. Each query may use `pageSize + 1` only to detect `hasMore`; it must never make the result unbounded. The classifier uses the stable descending `(createdAt, id)` cursor, tracks every canonical cursor pair, rejects a repeated cursor as a cycle, and terminates only on source exhaustion (`hasMore` false or a page shorter than `pageSize`). Invalid cursor shape, a missing progress cursor, cursor cycle, page-size overflow, page-count overflow, total-row overflow, query-count overflow, or non-terminating pagination fails with `rollback_classifier_limit` **before persistence**. No partial run, owner, evidence, progress, or other authority write may occur on that failure.

Focused tests must assert the exact boundary and one-over case independently for `pageSize` 100/101, `maxPages` 6/7, `maxTotalRows` 512/513, and `maxQueries` 6/7. They must also cover cursor-cycle detection, exhaustion termination, sentinel handling, no-write-on-limit, and cleanup after a failed writer. Boundary tests must not rely on another cap failing first.

#### 5. Closure checks and scope fence

Preserve the repository limit of at most 1,000 physical lines for every touched human-authored production or test file. Before closure, run and record the token, owner, barrier, FK, action, classifier-cap, test, status, fence, `wc`, and `git diff --check` checks. The status remains `⏳ To Do` until the actual owning implementation/closure workflow changes it. The scope fence is one-file-only for this correction: no source, route, schema, migration, runtime, test, board, changelog, or workflow file may be edited by this change.

## Workflow Dispatch Envelope

The leaf's only executable writer is its focused authority-schema suite. L11
supplies the generic private database-test capability; this envelope cannot
modify schema, migration, rollout, or service ownership.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-05-L03",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-05"
  },
  "allowlist": [
    "tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts",
    "tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts",
    "tests/integration/server/task551SolutionKitRollbackAuthoritySchema-support.ts"
  ],
  "forbiddenPaths": [
    "core/db/schema.ts",
    "core/db/tables/solutionKitRollbackAuthority.ts",
    "core/db/migrations/meta/_journal.json",
    "scripts/task-551-online-indexes.ts",
    "tests/integration/server/task551IndexAndConstraintCatalog.test.ts"
  ],
  "dependencies": ["TASK-551-05-L01:single"],
  "commands": [
    {
      "id": "rollback-authority-schema-test",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts", "tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts", "tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts"],
        "minimum": 2
      }
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
      "dependsOn": ["TASK-551-05-L01:single"],
      "commandIds": [
        "rollback-authority-schema-test",
        "core-lint-types",
        "core-lint",
        "diff-check"
      ]
    }
  ]
}
```

## Contract correction (2026-09-04, L03 preflight-count surface)

Reason. This contract mandates six bounded ID-only migration preflight counts
(:148-158): legacy rollback rows with null sources, non-rollback rows with
sources, owner source/package/actor mismatch, duplicate template
identity/position, progress/evidence mismatch, and proof/status mismatch — each
aborting without rewriting customer rows, with operator correction preceding a
complete rerun (:153-158). The same leaf is test-only: its sole executable
writer is `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
(:30-47, :787-791 allowlist; addendum correction 2 :741-762 names no production
preflight module, mapper, or route for this leaf and forbids creating one). The
admitted TASK-551-05-L01 state (receipt
`_docs/_workflows/_smoke/task-551/impl-05-l01.json`, all schema bytes landed,
runner 964 lines) already carries a preflight data-conflict surface in
`scripts/task-551-online-indexes.ts`: `PreflightConflicts` measures duplicate
revision-key groups and overlapping active booking windows, refused at zero
tolerance (:572-573), plus invalid booking windows refused as a data conflict
(:637), all folded into the canonical preflight digest by
`measurePreflightEvidence` (:638-641). Those are L01's own revision/booking
families. They are not the six authority counts above, and this contract's
earlier wording implied a surface no L03 writer may author.

Resolution.

1. The NO-REWRITE half is pinned where it is provable — in migration and
   catalog bytes. `0081_task551_search_indexes_constraints_outbox.sql` performs
   no `UPDATE` and no `DELETE` against `solution_kit_install_runs`: the only
   install-runs mutations in the migration are `ADD COLUMN` (six nullable
   columns, :144-149), the FK action swap executed as one `DROP CONSTRAINT` plus
   one re-`ADD CONSTRAINT` (:134, :166), three unique FK-target constraints
   (:154-156), and three named checks (:168-178). An aborted preflight
   therefore leaves every customer row byte-identical and a rerun after
   operator correction is complete, which is exactly the abort-without-rewrite
   semantics :153-158 requires. L03's suite asserts these bytes and refuses any
   data-rewriting statement in the migration.
2. The preflight surface that exists is asserted as it landed: the runner's
   data-conflict probes measure real counts, refuse on any nonzero value, and
   bind those counts into the canonical preflight digest. L03's suite models the
   six authority counts as in-file pure fixtures only (bounded ID-only inputs,
   refuse-on-nonzero, no rewrite on refusal) and never presents them as a
   production surface.
3. The six-count reporting surface itself is owner-routed residual. It belongs
   to the owner-executed real-database rollout path
   (`scripts/task-551-online-indexes.ts`, which L03 may not edit) and is flagged
   for TASK-551-10-L01's load/fault gate work. Until that flag is resolved, the
   contract's six counts are a producer obligation of the rollout owner, not a
   missing L03 deliverable; L03's allowlist stays at the one test file and no
   production preflight code is authored by this leaf.

Scope note. This section is a pure insertion (0 deletions); every other line of
this file is unchanged, the dispatch envelope and allowlist above are unchanged,
and no line of it widens L03's surface. The catalog guards at :159-160, the nine
named checks at :161-171, the relation check at :173, the SET NULL -> RESTRICT
transition at :142-144, and the addendum corrections at :730-785 all stand as
written.

## Dated Contract Corrections — 2026-09-26 (re-open note: result shape, worker-schema legs)

This note implements orchestrator dispositions **B1**, **C7** and **E2** (O3)
of `_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`.
Those dispositions are not re-decided here. It is append-only. Every earlier
sentence of this file stays binding except the ones quoted under
"Superseded sentences" below. The dispatch envelope (json fence `:787-860`)
is unchanged. Test anchors are for
`tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
(abbreviated "the suite") at HEAD `74fe8f4e`, where it has 2,182 lines.

### Verified facts (read from source at `74fe8f4e`; nothing executed)

- **L1 — result shape (B1).** `db` is drizzle over postgres-js
  (`core/db/client.ts:18`, `:91`). `db.execute` returns a `PgRaw` whose
  driver call is `client.unsafe(query, params)` when the query has no
  fields (`node_modules/drizzle-orm/pg-core/db.js:273-287`,
  `node_modules/drizzle-orm/postgres-js/session.js:31-34`). So it resolves
  to the postgres.js `Result`, which `extends Array` and has no `rows`
  property (`node_modules/postgres/src/result.js:1-15`). The suite's
  helper `:1012-1013` reads `(result as { rows: T[] }).rows`, which is
  `undefined`, and its docblock says the driver returns a `{ rows }`
  envelope. That is false.
- **L2 — `rowsOf` sites (untruncated grep).** `grep -c rowsOf` gives 10:
  the definition at `:1013` plus nine readers at `:1745` (`assertZeroResidue`,
  which runs in the `finally` of every DB leg and in `afterAll` `:1766-1771`),
  `:1799`, `:1831`, `:1853`, `:1860`, `:1880`, `:2099`, `:2142` and `:2163`.
  The only other `.rows` reads (`:824`, `:832`, `:833`) are on the in-memory
  `ClassifierPage` model (`:788`). They are not driver results and must not
  change. So every DB leg (`:1773`, `:1915`, `:1979`, `:2016`, `:2062`,
  `:2109`) fails from source today, in every schema.
- **L3 — online members in worker schemas (O3).** The lane runner re-migrates
  `bun_worker_<i>` from `_journal.json` only. The journal holds the
  transactional `0081_task551_search_indexes_constraints_outbox`
  (`core/db/migrations/meta/_journal.json:562`) and never the companion
  `0081_task551_online_indexes.sql` (0 journal matches). The 05-L01 note
  records the same fact (first note, F4). The four members the O3 legs name
  are all companion-only: `solution_kit_legacy_template_evidence_source_position_key`
  (companion `:21`, manifest `:145`),
  `solution_kit_legacy_template_evidence_source_key` (`:22`, `:156`),
  `solution_kit_starter_apply_owners_active_idx` (`:23`, `:166`) and
  `solution_kit_runs_active_rollback_source_idx` (`:81`, `:747`). The
  following are journaled in the transactional 0081 and so exist in every
  schema: the evidence primary key (`:53`; PostgreSQL's default name
  `solution_kit_legacy_template_evidence_pkey`),
  `solution_kit_legacy_template_evidence_identity_key` (`:68`),
  `solution_kit_starter_apply_owners_source_run_id_pk` (`:99`), the three
  `solution_kit_runs_id_*_key` uniques (`:154-156`) and every FK (`:157-166`).
- **L4 — what each O3 leg does without its member.**
  - `:1979` (identity): the `sameIdentity` probe (`:1990-1995`) is decided
    by the journaled primary key in every schema. The `samePosition`
    (`:1996-2001`) and `sameKey` (`:2002-2007`) probes use a fresh `id`, so
    no journaled unique covers them (`identity_key` includes `id`). They
    commit.
  - `:2016` (owner slot): the refused probe (`:2035-2040`) inserts an owner
    for a DIFFERENT `source_run_id` (`otherRun`). The primary key does not
    cover it, and the FK is satisfied by the fixture at `:2029-2034`. It
    commits.
  - `:2062` (race): both writers (`:2074-2079`) use distinct ids. The only
    journaled unique that names `rollback_of_run_id` is
    `solution_kit_runs_id_rollback_relation_key` `(id, rollback_of_run_id)`,
    which does not collide. Both commit, so `:2092-2095` fails.
- **L5 — the FK trap (`:2028`).** `solution_kit_starter_apply_owners_source_identity_fk`
  is `(source_run_id, package_key, actor_id) → solution_kit_install_runs(id, kit_id, actor_id)`
  (transactional 0081 `:165`; `core/db/tables/solutionKitRollbackAuthority.ts:80-88`).
  Worker schemas carry it too: the lane migrator rewrites
  `REFERENCES "public"` into the worker schema (`scripts/bun-lane-migrate.ts:77-81`). An owner row whose run has
  `kit_id <> package_key`, or another actor, is refused with 23503 by this
  FK. That happens before any unique index is consulted. The owners'
  primary key is `source_run_id` alone (`:99`), so two owners on ONE run are
  refused by the primary key (23505), and the active index never decides.
  The same trap made the 05-L01 concurrency apply-owner race unreachable.
  That is disposed by **E3** in 05-L01, not here.
- **L6 — fence.** The suite is the only path in this leaf's `allowlist`
  (`:801-803`). Every edit below is test-only inside that allowlist. No
  fence byte changes.

### Items (the ONE test-only edit to the suite)

**Item 1 — `rowsOf` (B1; the 05-L01 R1 item 1 rule).** Replace `:1012-1013`
with a file-local duplicate of the 05-L01 helper. The literal is kept, so one
grep finds every copy:

```ts
/** postgres-js via drizzle: `db.execute` resolves to the Result array itself; no `.rows` fallback. */
const rowsOf = <T>(result: unknown): T[] => {
  if (!Array.isArray(result)) throw new Error("catalog_result_not_array");
  return result as T[];
};
```

- The nine readers (L2) keep their call shape and read through the new
  helper. No reader adds `?? []`, `.rows`, or an `Array.isArray` fallback of
  its own.
- The `ClassifierPage` `.rows` sites (`:824`, `:832`, `:833`, and the
  `rows:` literals in the static half and `:2146-2148`) are untouched.
- Done-check (untruncated): `grep -c '{ rows: T\[\] }'` is `0`. Every
  `db.execute` result that is read goes through `rowsOf`, except
  `hasDb` (`:995`), which reads no rows. `grep -c 'catalog_result_not_array'`
  is `1`.

**Item 2 — worker-schema branches for the three O3 legs (E2; the 05-L01 R2.1
rule).** Add these file-local duplicates next to `rowsOf`:

```ts
const LANE_WORKER_SCHEMA = /^bun_worker_[0-9]+$/;
const sessionSchema = async (): Promise<string> => {
  const schema = rowsOf<{ schema: string | null }>(await db.execute(sql`select current_schema() as schema`))[0]?.schema;
  if (!schema) throw new Error("catalog_session_schema_missing"); // a failure, never a skip
  return schema;
};
/** Online guard members present in the session schema, sorted. */
const presentGuards = async (guards: readonly string[]): Promise<string[]> =>
  rowsOf<{ name: string }>(
    await db.execute(
      sql`select c.relname as name from pg_class c where c.relkind = 'i' and c.relnamespace = current_schema()::regnamespace and c.relname in ${guards} order by c.relname`
    )
  ).map((row) => row.name);
```

- `in ${guards}` is the drizzle list form. `any(${array})` is banned (05-L01
  **B4**).
- The branch is chosen by schema NAME, never by index presence. A worker
  schema asserts that its guards are ABSENT (`[]`). Every other schema
  first asserts that its guards are PRESENT (the sorted guard list), then
  runs the unchanged assertions. A missing member in `public` therefore
  fails, and a later change that replays the companion into workers fails
  loudly (05-L01 R2 re-open rule).
- A new static test asserts that each guard name below is a member of
  `TASK551_ONLINE_INDEX_MEMBERS`. The suite already imports it at `:16-19`.
  A renamed member then cannot silently empty a guard.
- `const worker = LANE_WORKER_SCHEMA.test(await sessionSchema());` is read
  once per leg, inside `try`, right after `seedFixture`.

Exact branch per leg:

- **`:1979` identity leg.** Guards:
  `["solution_kit_legacy_template_evidence_source_key", "solution_kit_legacy_template_evidence_source_position_key"]`.
  - Both branches: the committed evidence insert (`:1984-1989`) and the
    `sameIdentity` probe (`:1990-1995`) stay unchanged. The journaled
    primary key decides in every schema:
    `["23505", "solution_kit_legacy_template_evidence_pkey"]`.
  - Worker: `expect(await presentGuards(guards)).toEqual([])`, then leave
    the `try` block (the `finally` still runs) BEFORE `samePosition`. No
    journaled path decides the two remaining probes (L4), and running them
    would commit unreceipted rows.
  - Non-worker: `expect(await presentGuards(guards)).toEqual(guards)`, then
    `:1996-2007` run unchanged.
  - `assertReceipt("identity", 3)` is unchanged in both branches. The
    probes run through `db.execute`, not `run`.
- **`:2016` owner-slot leg.** Guards:
  `["solution_kit_starter_apply_owners_active_idx"]`.
  - Both branches: `:2022-2034` (owner on `fixture.sourceRun`, then
    `otherRun` seeded with `kit_id = fixture.packageKey` and the same actor,
    per L5), and the release plus re-insert `:2041-2053`, stay unchanged.
  - Worker: `expect(await presentGuards(guards)).toEqual([])`. Then the
    primary-key path replaces `:2035-2040`: `const duplicate =
    db.execute(insertOwner(fixture.sourceRun, "before_captured"));`, which
    rejects with
    `["23505", "solution_kit_starter_apply_owners_source_run_id_pk"]`. The
    `insertOwner(otherRun, …)` probe is NOT attempted before the release,
    because without the member it would commit.
  - Non-worker: `expect(await presentGuards(guards)).toEqual(guards)`, then
    `:2035-2040` run unchanged.
  - `assertReceipt("owner-slot", 5, 1)` is unchanged in both branches.
- **`:2062` race leg.** Guards:
  `["solution_kit_runs_active_rollback_source_idx"]`. No journaled
  PK/FK/unique path decides this race (L4). So, as in the 05-L01 R2.3
  revision race, the worker branch takes the whole leg.
  - Worker: `expect(await presentGuards(guards)).toEqual([])`, then leave
    the `try` BEFORE `pending` (`:2087`) is created. No writer runs.
  - Non-worker: `expect(await presentGuards(guards)).toEqual(guards)`, then
    `:2087-2099` run unchanged.
  - `:2103` becomes `assertReceipt("race", worker ? 2 : 3)`. The worker
    receipt holds only the two `seedFixture` inserts. `gate.release` in
    `finally` stays.
- **Every other DB leg runs unchanged in every schema.** The matrix
  (`:1773`), restrict (`:1915`) and sentinel (`:2109`) legs depend only on
  journaled checks, primary keys and FKs. The matrix progress rows use
  distinct `rollback_position` values, so the online
  `…_rollback_position_idx` never decides. The sentinel leg's bound is the
  in-file cap model, not an index. After this item, the suite's
  online-member inventory is exactly the three legs above.

**Item 3 — FK fixture rule (L5; binding for this suite and recorded for any
sibling that seeds `solution_kit_starter_apply_owners`).** Every seeded
owner row needs its own install run with `id = source_run_id`,
`kit_id = package_key` and `actor_id = actor_id`, seeded before the owner
insert and deleted child-first. A leg that means to exercise the active
index (`(package_key, actor_id) WHERE released_at IS NULL`) must use
DISTINCT `source_run_id` values. Otherwise the primary key decides first.
It must also use one `package_key`/actor pair across those runs, or the FK
refuses first. The `:2028` comment stays as the in-file statement of this
rule. The implementer may reflow it but must not drop it.

**Item 4 — handoff to 01-L01 v8 (row texts; 01-L01's writer copies them).**
The **V7-3** blocked row clears only when Items 1 AND 2 have landed in the
one edit, the orchestrator's disposition of **O-L03-2** below has landed,
and the suite's part-1 row meets the class table (**V5-6** rule). Part 1
runs in `public` (**V5-4** check 1, and **E3** check 4), so it proves only
the non-worker branches. The worker branches first execute in the FINAL
lane-runner run.

| Handoff reason (copy verbatim) | Delivered by | Clears when | Consumed at |
| --- | --- | --- | --- |
| `result-shape:tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` (**B1**, **C7**; **V7-3** row) | 05-L03 Items 1 and 2 (this note), one test-only edit | Items 1 and 2 landed, **O-L03-2** disposed and landed; part-1 row under `M-fixture` passes (0 failed, 0 skipped) after green **V5-4** checks | initial, **V5-9** step 6 |
| **V5-5 (a)** owner item, 05-L03 share (**O3**, **E2**) | 05-L03 Item 2 | the three worker branches (`:1979`, `:2016`, `:2062`) pass in the FINAL lane-runner run | FINAL only (**V7-7** step 8 as rewritten by **E2**); not an initial precondition |

Post-join **V7-4** row (**E2**), to be inserted as written:

| Suite | Lane prediction | Cause (anchor) | Clears when |
| --- | --- | --- | --- |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | absent while its **V7-3** row stands; after joining (05-L03 Items 1 and 2 plus **O-L03-2** landed) expected green in worker schemas through the Item 2 worker branches; a red is a finding | online members `…_source_position_key`, `…_source_key`, `…_apply_owners_active_idx`, `…_active_rollback_source_idx` are never in `bun_worker_*` (L3); worker branches at `:1979`, `:2016`, `:2062` | not in the red set once joined |

**Item 5 — scope.** The suite is the only allowlisted path (L6). No fence
edit, no source edit, no other test file. The dispatch precondition is
**O-L03-1** below.

### Gates for the implementer (fast)

- `./node_modules/.bin/eslint --max-warnings=0 <every touched suite file>`.
- DB-free proof:
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <every touched suite file>`.
  The static half passes. The DB legs skip through the `hasDb` connect probe
  (`:994-999`).
- `wc -l` (every touched file ≤ 1,000; see **O-L03-1**), `git diff --check`,
  and the Item 1 done-checks.
- The DB proof is the orchestrator's 01-L01 **V5-1** part-1 run under
  `M-fixture`, serialized. The worker branches are proven only by the
  01-L01 FINAL lane-runner run.

**Land order.** This edit is independent of the 05-L01 five-file edit.
Like that edit, it lands before 01-L01 initial **V5-9** step 4.

### Observations for orchestrator disposition (not decided here)

- **O-L03-1 (line gate; blocks dispatch).** The suite has 2,182 physical
  lines (01-L01 already records it and assigns the split to this leaf).
  This leaf's acceptance says "This leaf and every file it touches stay at
  or below 1,000 physical lines." (`:601`). The root rule requires a split
  by cohesive responsibility in the same change that touches an over-cap
  file. A split creates test files that are not in the one-path
  `allowlist` (`:801-803`). So Items 1-2 cannot close without an
  orchestrator-approved allowlist extension and a fence edit inside this
  leaf's json fence (`allowlist`, the `rollback-authority-schema-test`
  argv and its `positiveDiscovery` paths/minimum; no new occurrence; family
  inventory pinned 41/11/29/33). The implementer STOPs before editing
  until that exists. A suggested seam, not a decision, is the suite's own
  boundary: the DB-free static half (`:1015-1632`, including the in-file
  models) and the `testIfDb` live half (`:1633-2182`, from the `SCOPE` fixture block on). Shared fixtures and
  models would go into one test-support module. Each file must stay
  independently runnable.
- **O-L03-2 (constraint name read; blocks the V7-3 row).** `pgConstraint`
  (`:1003-1006`) reads `error.constraint` / `error.cause.constraint`.
  postgres.js 3.4.9 names the field `constraint_name`: see the error-field
  map at `node_modules/postgres/src/connection.js:46` (`110 : 'constraint_name'`),
  which is copied onto `PostgresError` by `Object.assign`
  (`node_modules/postgres/src/errors.js:1-6`). Drizzle wraps that error as
  `DrizzleQueryError.cause` (`node_modules/drizzle-orm/errors.js:10-19`).
  The repository reads `constraint_name`
  (`core/services/media/mediaFoldersService.ts:62`). So `pgConstraint` is
  always `null`, and every constraint-name assertion fails in every schema
  (`:1817`, `:1939`, `:1949`, `:1968`, `:1994`, `:2000`, `:2004`, `:2037`).
  The race writer (`:2082`) falls through to the SQLSTATE `"23505"`.
  Items 1 and 2 alone cannot make the part-1 row pass. The recommended
  fix, in the same test-only edit, reads `constraint_name` on the error and
  its `cause`, with no `.constraint` fallback. This note does not decide
  it.
- **O-L03-3 (catalog wording; no behaviour).** `:236-237` says every
  mandatory index row is "created by the non-transactional companion". Four
  of the fourteen rows (`solution_kit_runs_id_package_actor_key`,
  `…_id_rollback_relation_key`, `…_id_legacy_template_plan_key`,
  `solution_kit_legacy_template_evidence_identity_key`) are unique
  CONSTRAINTS in the transactional 0081 (`:68`, `:154-156`; table module
  comment `solutionKitRollbackAuthority.ts:136-139`). Item 2 relies on the
  L3 split, not on that sentence. Rewording it is left to the orchestrator.

### Superseded sentences (verbatim; superseded from this date)

1. `:567-569` (Testing Requirements): "Concurrent duplicate owner/rollback
   inserts have one winner; malformed
   phases/digests/evidence/progress-state combinations fail at the database boundary;
   source, evidence, or related run deletion is restricted while authority remains."
   Replacement: "In every non-worker schema, concurrent duplicate
   owner/rollback inserts have one winner. In a `bun_worker_*` schema, the
   owner-slot and race legs assert that their online guard members are
   absent (Item 2), and the owner-slot leg asserts the journaled primary-key
   refusal instead. Malformed phases/digests/evidence/progress-state
   combinations fail at the database boundary, and source, evidence, or
   related run deletion is restricted while authority remains, in every
   schema."
2. `:597-599` (Quantified Acceptance): "Tests reject source/package/actor
   mismatch, progress linked to another rollback
   or evidence row, proof/status mismatch, duplicate evidence identity, deletion
   that would orphan a rollback relation, and duplicate running owners;"
   Replacement: the same list, with "duplicate running owners" and the
   duplicate evidence position/key probes asserted in every non-worker
   schema. In a `bun_worker_*` schema, the absence of the online guard
   members is asserted instead (Item 2), and duplicate evidence identity is
   still rejected by the journaled primary key.

## Dated Contract Corrections — 2026-09-26 (note 2: O-L03-1 split, O-L03-2 constraint_name, restrict-leg order, labels)

This note writes out orchestrator disposition **H5** (and, for the row
labels, **H2**/**H4**) of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`
(Addendum H). It does not re-decide them. It is append-only, apart from the
one in-place fence amendment that **H5** authorizes (Item N2-3). Every
earlier sentence of this file stays binding except those quoted under
"Superseded sentences" below.

**Anchor rule.** The in-place fence amendment adds two lines after HEAD
`c237e05d` line `:802`. A cite of this file at a HEAD line `:N` with
`N ≥ 804` is now at `:N+2`. Lines `:1-801` do not move. Cites of this file
in the first note and in this note are HEAD `c237e05d` lines unless marked
"now". Test anchors are for
`tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
("the suite") at HEAD `c237e05d`. That file is byte-identical to `74fe8f4e`
(`git diff --stat 74fe8f4e HEAD` is empty for it) and has 2,182 lines.

### Verified facts (read from source at `c237e05d`; nothing executed)

- **N1 — `constraint_name` (O-L03-2).** postgres.js is 3.4.9
  (`node_modules/postgres/package.json:3`). Its ErrorResponse field map has
  `110 : 'constraint_name'` (`node_modules/postgres/src/connection.js:46`).
  `PostgresError` copies the fields onto itself as own data properties with
  `Object.assign(this, x)` (`node_modules/postgres/src/errors.js:1-6`).
  `DrizzleQueryError` stores the driver error as the own property `cause`
  (`node_modules/drizzle-orm/errors.js:10-19`). The repository precedent
  reads own data values through `readOwnDataValue` (`:27-36`) on the error
  and its `cause` chain, then compares `constraint_name`
  (`core/services/media/mediaFoldersService.ts:60-64`). The suite's
  `pgConstraint` (`:1003-1006`) reads `.constraint`, which the driver never
  sets. `pgCode` (`:1001-1002`) reads `code` on the error, then on `cause`.
- **N2 — restrict-leg trigger order.** Six FKs reference
  `solution_kit_install_runs.id` from the authority tables in the
  transactional 0081, in this creation order: progress `:157`, `:158`,
  `:159`; evidence `:161` (single-column `source_run_id`) and `:162`
  (`plan_fk`); owners `:163` (single-column `source_run_id`) and `:165`
  (`source_identity_fk`). `:166` is the self FK on `rollback_of_run_id`.
  RESTRICT triggers on one table fire in creation order (**H5**). The
  restrict leg (`:1926-1943`) inserts the owner row (`:1920-1925`), then the
  evidence row (`:1926-1931`), and only then deletes the source run
  (`:1933-1943`). At that point the evidence FK `:161` fires before the
  owners FK `:163`. So the first 23503 names
  `solution_kit_legacy_template_evidence_source_run_id_solution_kit_install_runs_id_fk`,
  not the owners key that `:1941` expects. The `:1932` comment reasons only
  about the owners' two keys. With only the owner row present, the owners
  keys `:163` and `:165` are the only RESTRICT candidates that hold a
  referencing row, and `:163` precedes `:165`. The first note lists `:1939`
  among the sites that fail only because of the field name
  (O-L03-2, HEAD `:1177-1178`). That is incomplete: the site also needs this
  reorder.
- **N3 — split seams (O-L03-1, as corrected by H5).** Suite regions:
  imports and header docblock `:1-47`; path, snapshot and SQL helpers
  `:49-110`; the exported exact projection `:111-566` (the value export is
  at `:444`); surface extractors (module, snapshot, 0081 bytes, companion)
  `:567-773`; in-file pure models `:774-990`; live gating and driver
  helpers `:991-1014`; static legs `:1015-1632` (14 `test(`); live
  `testIfDb` legs `:1633-2182` (6 `testIfDb(`, from the `SCOPE` fixture
  block on). The live half reads `CLASSIFIER_CAPS`,
  `modelBoundedNewerApplies`, `normalizedSql` and `dialect` from above
  `:991`. The static legs read the projection, the models, the surface
  extractors and the path helpers. The static legs make no `db`/`hasDb`
  call (0 matches in `:1015-1632`).
- **N4 — importers (import stability).** Two files outside this leaf's
  allowlist import from the suite path:
  `tests/perf/database-explain-plans.test.ts:68` (value
  `EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY`) and
  `tests/perf/fixtures/task551QueryPlanContracts.ts:37` (type
  `ExactL01SolutionKitRollbackAuthority`). No other file in `tests`,
  `scripts` or `core` names the suite path.
- **N5 — catalog rows (O-L03-3).** Ten of the fourteen mandatory index rows
  occur once in the companion `0081_task551_online_indexes.sql` and never in
  the transactional 0081. The other four,
  `solution_kit_runs_id_package_actor_key`,
  `solution_kit_runs_id_rollback_relation_key`,
  `solution_kit_runs_id_legacy_template_plan_key` and
  `solution_kit_legacy_template_evidence_identity_key`, never occur in the
  companion. They are unique CONSTRAINTS in the transactional 0081 (`:154`,
  `:155`, `:156`, `:68`), and the manifest asserts them without building
  them (`TASK551_ASSERTED_UNIQUE_CONSTRAINTS`,
  `tests/perf/fixtures/task551OnlineIndexManifest.ts:943-947`; table-module
  comment `core/db/tables/solutionKitRollbackAuthority.ts:136-139`).

### Items

**Item N2-1 — O-L03-2: `pgConstraint` reads `constraint_name` only (H5).**
Replace `:1003-1006` with this helper, in the file that hosts the live legs
(Item N2-3). It reads the own data value on the error, then on its `cause`,
which is the same two-level shape as `pgCode`. There is no `.constraint`
fallback and no deeper walk:

```ts
/** Own data property only: postgres.js copies ErrorResponse field `n` onto the error as `constraint_name`. */
const ownDataValue = (candidate: unknown, key: string): unknown => {
  if (typeof candidate !== "object" || candidate === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
};
const constraintNameOf = (candidate: unknown): string | null => {
  const value = ownDataValue(candidate, "constraint_name");
  return typeof value === "string" ? value : null;
};
/** The driver error, or drizzle's `DrizzleQueryError` whose own `cause` is the driver error. */
const pgConstraint = (error: unknown): string | null =>
  constraintNameOf(error) ?? constraintNameOf(ownDataValue(error, "cause"));
```

- `pgCode` (`:1001-1002`) is unchanged.
- Every caller keeps its call shape: `:1817`, `:1939`, `:1949`, `:1968`,
  `:1994`, `:2000`, `:2004`, `:2037` and the race writer `:2082`.
- Done-checks (untruncated): `grep -c 'constraint?: string'` is `0`.
  `grep -c '"constraint_name"'` is `1` across the split files.

**Item N2-2 — the restrict leg probes `sourceDelete` before the evidence row
exists (H5).** This replaces `:1920-1943`. The owner insert and the
source-run probe run first. The evidence insert follows the probe. Nothing
after `:1943` changes: the actor probe `:1944-1950`, the rollback-run and
progress inserts `:1951-1963`, the evidence probe `:1964-1970`, and the
`finally` (receipt `assertReceipt("restrict", 6)`: two seed inserts, owner,
evidence, rollback run, progress).

```ts
    await seedFixture("restrict");
    try {
      await run(
        "restrict",
        "insert",
        "solution_kit_starter_apply_owners",
        insertOwner(fixture.sourceRun, "before_captured")
      );
      // Probe before any evidence row exists: the evidence FKs (0081 :161-162) are created before the owners FK (:163)
      // and would fire first. With only the owner row present, the owners' single-column FK (:163) precedes the
      // composite source_identity_fk (:165), so its trigger decides.
      const sourceDelete = db.execute(
        sql`delete from solution_kit_install_runs where id = ${fixture.sourceRun}`
      );
      await expect(sourceDelete).rejects.toThrow();
      expect([
        pgCode(await rejection(sourceDelete)),
        pgConstraint(await rejection(sourceDelete)),
      ]).toEqual([
        "23503",
        "solution_kit_starter_apply_owners_source_run_id_solution_kit_install_runs_id_fk",
      ]);
      await run(
        "restrict",
        "insert",
        "solution_kit_legacy_template_evidence",
        insertEvidence(fixture.evidenceId, 0, "kept")
      );
      // … `:1944-1970` unchanged (actor probe, rollback run, progress, evidence probe).
```

- The expected constraint names stay as they are. A different name in the
  part-1 run is a finding for the orchestrator. The implementer must not
  re-baseline it.
- The leg runs in every schema. It depends only on journaled FKs (first
  note, Item 2, last bullet).

**Item N2-3 — O-L03-1: the split, with import stability (H5).** The same
test-only edit that lands Items 1, 2, N2-1 and N2-2 splits the suite into
three cohesive files:

| Path | Content (HEAD suite regions) | Budget (hard cap 1,000) |
| --- | --- | --- |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-support.ts` (new; not a test file) | the path/snapshot/SQL helpers that the projection and the live half need (`ROOT`, `SNAPSHOT`, the `Snapshot*` types, `parseSnapshot`, `snapshotTable`, `normalizedSql`, `dialect`, `renderSql`; from `:49-110`); the exact projection `:111-566` with every `export` kept; the in-file pure models `:774-990` with every `export` kept. It imports no `core/db/client`, no `bun:test`, and registers no test. | ≤ 820 |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts` (new) | the DB-free static legs `:1015-1632` (14 tests); the surface extractors `:567-773`; the static-only helpers from `:49-110` (`TRANSACTIONAL_MIGRATION`, `COMPANION_MIGRATION`, `PREVIOUS_SNAPSHOT`, `migrationBytes`, `companionBytes`, `renderDefault`, `walk`). It imports the support module and never imports `core/db/client`. | ≤ 950 |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` (original path, kept) | the live gating and driver helpers `:991-1014` with Item 1 (`rowsOf`) and Item N2-1 (`pgConstraint`); the Item 2 helpers (`LANE_WORKER_SCHEMA`, `sessionSchema`, `presentGuards`), the three guard lists, and the Item 2 static guard-membership test (it imports `TASK551_ONLINE_INDEX_MEMBERS`); the live `testIfDb` legs `:1633-2182` with Items 2 and N2-2; the re-exports below. | ≤ 780 |

- **Import stability.** The original path keeps exporting both symbols that
  N4 names, with these two lines:
  `export { EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY } from "./task551SolutionKitRollbackAuthoritySchema-support";`
  and
  `export type { ExactL01SolutionKitRollbackAuthority } from "./task551SolutionKitRollbackAuthoritySchema-support";`.
  The two importers stay byte-identical. They are outside this allowlist.
- **Independence.** Each test file runs on its own in its lane:
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <file>`.
  The static suite then passes with 0 skipped. The original path passes its
  static guard-membership test and skips its six DB legs through the `hasDb`
  probe. The header docblock `:20-47` is split with its content: the
  static paragraph goes to the static suite and the live paragraph stays.
  Both keep the "modelled IN THIS FILE ONLY" sentence, re-pointed to
  "in these test files only".
- **Balance.** The budgets are targets. Each file's hard cap is 1,000
  physical lines. The implementer may move the surface extractors
  (`:567-773`) to the support module only if both files then stay at or
  below 1,000. A fourth path, or a need to edit a file outside the
  allowlist, is a STOP and a further fence amendment. It is never a
  silent overflow.
- **No behaviour change.** Test names, assertions, fixture values and the
  static legs' bodies move byte-for-byte, apart from import lines and the
  items of the first note and this note.
- **In-place fence amendment (done in this change).** The dispatch
  envelope (now `:793-861`) was edited in place, and only in these keys:
  - `allowlist` (now `:801-805`) lists the original path, then
    `…Schema-static.test.ts`, then `…Schema-support.ts`.
  - The `rollback-authority-schema-test` `argv` (now `:818`) ends with the
    original path and then the static suite path.
  - Its `positiveDiscovery.paths` (now `:822`) holds the same two test
    paths, and `minimum` (now `:823`) is `2`.
  - `forbiddenPaths`, `dependencies`, the other three commands and
    `occurrences` are byte-identical. No occurrence was added.
  - The family preflight literal
    (`TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md:1173`), run with
    `$(git rev-parse HEAD)`, prints
    `{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}`.

**Item N2-4 — race leg `worker` declaration and step labels (H5, H2).**

- In the race leg (`:2062`), `worker` is declared as `let worker = false;`
  immediately before `try` and assigned inside `try` as the first statement
  after the gate setup: `worker = LANE_WORKER_SCHEMA.test(await sessionSchema());`.
  The `finally` reads it in `assertReceipt("race", worker ? 2 : 3)`.
- A `sessionSchema()` failure fails the leg. The leg never skips on it. In
  that case `finally` asserts the non-worker count `3` against two inserts,
  and that assertion failure may be the one reported. Either failure is a
  failed leg.
- The identity (`:1979`) and owner-slot (`:2016`) legs keep
  `const worker = …` inside `try`, as the first note says. Their `finally`
  does not read `worker`.
- Label corrections. "**E3** check 4" is now "**V5-4** check 4 (**V8-6**)".
  "**V7-7** step 8 as rewritten by **E2**" is now "**V8-8** step 7"
  (01-L01 v8 FINAL table).

**Item N2-5 — L5 reworded (H5).** PostgreSQL checks a unique index when it
inserts the row. It checks a foreign key in an AFTER ROW trigger at the end
of the statement. So a row that violates both a committed unique key and
the FK is refused with 23505, never 23503. In the owner fixtures of this
suite:

- Two owners on ONE `source_run_id` are refused by the owners' primary key
  (`:99`, 23505), and the active index never decides.
- An owner whose run has `kit_id <> package_key`, or another actor, and that
  meets no unique conflict, is refused with 23503 by
  `solution_kit_starter_apply_owners_source_identity_fk` when its statement
  ends.

The first note's Item 3 fixture rule stays binding as written.

**Item N2-6 — O-L03-3 decided: a wording correction, no behaviour change
(H5 scope).** The replacement sentence for HEAD `:236-238` is: "Ten of these
rows (every row except the four unique CONSTRAINTS
`solution_kit_runs_id_package_actor_key`,
`solution_kit_runs_id_rollback_relation_key`,
`solution_kit_runs_id_legacy_template_plan_key` and
`solution_kit_legacy_template_evidence_identity_key`) are emitted
byte-for-byte by the closed online-index manifest and created by the
non-transactional companion. The four constraints are created by the
transactional 0081 (`:68`, `:154-156`), because a foreign key can only
reference an existing unique key, and the manifest asserts them without
rebuilding them (`TASK551_ASSERTED_UNIQUE_CONSTRAINTS`); both paths follow
L01's general index contract." The catalog, the tests and the fence do not
change. The static legs already pin both sets (N5).

### Handoff rows for 01-L01 v9 (row texts; 01-L01's writer copies them)

Shared literal. This paragraph and 01-L01 v9 both write it byte-for-byte:

Clears when: 05-L03 Items 1 and 2 landed; O-L03-2 landed (`constraint_name` reader and the probe-before-evidence restrict leg); O-L03-1 split landed with import stability; every split test path is in the V5-1 part-1 set and passes under `M-fixture` with 0 failed, 0 skipped.

**Clearing rule (H5).** The **V7-3** blocked row for this leaf (**V8-5**
table, the SolutionKit row) clears only per the Shared literal. The split
test paths are `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
and `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts`.
The support module is not a test path. A part-1 row for the original path
alone never clears the row, because it runs only the live legs. The part-1
rows come after green **V5-4** checks, check 4 included (**V8-6**). Part 1
runs in `public`, so it proves only the non-worker branches. The worker
branches first run in the FINAL lane-runner run. Item 3 (the FK fixture
rule) is a rule, not a clearing item (**H4**).

| Handoff reason (copy verbatim) | Delivered by | Clears when | Consumed at |
| --- | --- | --- | --- |
| `result-shape:tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` (**B1**, **C7**; **V7-3** row, clearing per **V8-5**) | 05-L03 first note Items 1 and 2 and this note's Items N2-1 to N2-4, one test-only edit over the three allowlisted paths | Clears when: 05-L03 Items 1 and 2 landed; O-L03-2 landed (`constraint_name` reader and the probe-before-evidence restrict leg); O-L03-1 split landed with import stability; every split test path is in the V5-1 part-1 set and passes under `M-fixture` with 0 failed, 0 skipped. | initial, **V5-9** step 6 |
| **V5-5 (a)** owner item, 05-L03 share (**O3**, **E2**) | 05-L03 first note Item 2, in the original path | the three worker branches (`:1979`, `:2016`, `:2062`) pass in the FINAL lane-runner run | FINAL only (**V8-8** step 7); not an initial precondition |

Post-join row (**V8-7** table, replacing the first note's **V7-4** row; insert as written):

| Suite | Lane prediction | Cause (anchor) | Clears when |
| --- | --- | --- | --- |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` and `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts` | absent while their **V7-3** row stands; after joining, expected green: the static suite in every schema, and the original path in worker schemas through the Item 2 worker branches; a red is a finding | online members `…_source_position_key`, `…_source_key`, `…_apply_owners_active_idx`, `…_active_rollback_source_idx` are never in `bun_worker_*` (first note L3); worker branches at `:1979`, `:2016`, `:2062` | Clears when: 05-L03 Items 1 and 2 landed; O-L03-2 landed (`constraint_name` reader and the probe-before-evidence restrict leg); O-L03-1 split landed with import stability; every split test path is in the V5-1 part-1 set and passes under `M-fixture` with 0 failed, 0 skipped. |

### Gates for the implementer (fast; replaces the first note's list for this edit)

- `./node_modules/.bin/eslint --max-warnings=0` on the three allowlisted
  paths.
- DB-free proof of each test file on its own:
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <file>`.
  The static suite passes 14 tests with 0 skipped. The original path passes
  the guard-membership test and skips six DB legs.
- `wc -l` on the three paths: each ≤ 1,000 and within Item N2-3's budgets,
  or a recorded reason for any budget overrun under 1,000.
- `git diff --check`; the Item 1 and Item N2-1 done-checks.
- `grep -c 'EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY\|ExactL01SolutionKitRollbackAuthority'`
  on the original path is `≥ 2` (the two re-exports). The two importers
  (N4) are unchanged in `git diff`.
- The DB proof is the orchestrator's 01-L01 **V5-1** part-1 run under
  `M-fixture` over both test paths. The worker branches are proven only by
  the 01-L01 FINAL lane-runner run.

**Land order.** Unchanged from the first note. The edit is test-only, and
the fence `dependencies` still reads `TASK-551-05-L01:single`.

### Consequences outside this file (orchestrator follow-up; not decided here)

- **TASK-551-10-L01 fence.** Its `argv` and `positiveDiscovery.paths`
  (`TASK-551-10-L01…md:1272`, `:1274`) name only the original path. After
  the split, that gate would run the live legs but not the static suite.
  This is an owed mirror for the 10-L01 writer. It is the same shape as the
  O6 widening in **H6**.
- **TASK-551-05-L01 `forbiddenPaths`** (`TASK-551-05-L01…md:1077`) names
  only the original path. Adding the two new paths is optional hardening
  for the 05-L01 writer.
- **TASK-551-05-L02 rider comment.** The docblock at
  `tests/perf/database-explain-plans.test.ts:39-43` says that importing the
  suite registers "20 tests" (14 pass + 6 skip) in that file's run. After
  the split, the import registers only the original path's tests: the six
  `testIfDb` legs plus the Item 2 guard-membership test. The comment's
  counts go stale. The import itself is unaffected (N4). The file is
  outside this allowlist and the owner is 05-L02.

### Superseded sentences (verbatim, line breaks shown as single spaces; superseded from this date)

1. HEAD `:37-39` (Exact File Ownership): "**Tests:**
   `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
   (sole writer; catalog/migration/snapshot parity, state-matrix,
   named-check, preflight, and source-guard tests)." Replacement: the three
   allowlisted paths of Item N2-3 (sole writers, with the content split
   there).
2. HEAD `:236-238`: "Every row above is emitted byte-for-byte by the closed
   online-index manifest and created by the non-transactional companion,
   exactly as L01's general index contract requires." Replacement: Item
   N2-6.
3. HEAD `:256-258` (Implementation Pseudocode): "The implementation writer
   is the sole
   `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
   suite." Replacement: "The implementation writers are the three
   allowlisted paths of note 2, Item N2-3."
4. HEAD `:580` (Validation Commands): "`set -a && source .env && set +a &&
   bun test tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`"
   Replacement: the same command with both test paths.
5. HEAD `:747`: "**Authority/schema parity suite:**
   `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
   (L03's sole authority test writer)." Replacement: the static suite holds
   the parity legs, and the original path holds the live legs (Item N2-3).
6. HEAD `:761` (table row): "| Authority/schema parity and focused
   concurrency tests | L03, in
   `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
   | Production barriers, duplicate suites, or weakened assertions |"
   Replacement: the same row with "L03, in the three allowlisted paths of
   note 2, Item N2-3".
7. HEAD `:789`: "The leaf's only executable writer is its focused
   authority-schema suite." Replacement: "The leaf's executable writers are
   its focused authority-schema test files and their support module (note
   2, Item N2-3)."
8. HEAD `:907-908`: "L03's allowlist stays at the one test file and no
   production preflight code is authored by this leaf." Replacement: "L03's
   allowlist is the three test paths of note 2, and no production preflight
   code is authored by this leaf."
9. HEAD `:923-924` (first note): "The dispatch envelope (json fence
   `:787-860`) is unchanged." Replacement: Item N2-3's in-place fence
   amendment.
10. HEAD `:984-985` (first note, L5): "An owner row whose run has `kit_id <>
    package_key`, or another actor, is refused with 23503 by this FK. That
    happens before any unique index is consulted." Replacement: Item N2-5.
11. HEAD `:990-992` (first note, L6): "The suite is the only path in this
    leaf's `allowlist` (`:801-803`). Every edit below is test-only inside
    that allowlist. No fence byte changes." Replacement: "The allowlist
    (now `:801-805`) holds the three Item N2-3 paths. Every edit is
    test-only inside that allowlist."
12. HEAD `:1048-1049` (first note, Item 2), for the race leg only:
    "`const worker = LANE_WORKER_SCHEMA.test(await sessionSchema());` is
    read once per leg, inside `try`, right after `seedFixture`."
    Replacement: Item N2-4.
13. HEAD `:1113-1117` (first note, Item 4): "The **V7-3** blocked row clears
    only when Items 1 AND 2 have landed in the one edit, the orchestrator's
    disposition of **O-L03-2** below has landed, and the suite's part-1 row
    meets the class table (**V5-6** rule). Part 1 runs in `public`
    (**V5-4** check 1, and **E3** check 4), so it proves only the
    non-worker branches." Replacement: this note's clearing rule and the
    Shared literal.
14. HEAD `:1122` and `:1123` (first note, Item 4 table rows, both cells
    beginning `result-shape:…` and `**V5-5 (a)** owner item`). They are
    replaced by this note's two handoff rows. The row texts are not
    repeated here. They stand unchanged in the file as history.
15. HEAD `:1129` (first note, post-join **V7-4** row for the suite path).
    It is replaced by this note's post-join row.
16. HEAD `:1131-1132` (first note, Item 5): "The suite is the only
    allowlisted path (L6). No fence edit, no source edit, no other test
    file." Replacement: "The three Item N2-3 paths are the allowlist. The
    fence edit is Item N2-3's. No source edit and no other test file."
17. HEAD `:1164-1167` (first note, O-L03-1): "A suggested seam, not a
    decision, is the suite's own boundary: the DB-free static half
    (`:1015-1632`, including the in-file models) and the `testIfDb` live
    half (`:1633-2182`, from the `SCOPE` fixture block on). Shared fixtures
    and models would go into one test-support module." Replacement: Item
    N2-3 (projection `:111-566` and models `:774-990` are outside
    `:1015-1632`).
18. HEAD `:1183-1184` (first note, O-L03-2): "This note does not decide
    it." Replacement: decided by **H5**; see Items N2-1 and N2-2.

## Dated Contract Corrections — 2026-09-27 (note 3: trigger-order wording, anchors, labels, mirror bound)

This note writes out orchestrator disposition **J7** and, for the 10-L01
mirror bundle, **J9** of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`
(Addendum J). It does not re-decide them. It is append-only and makes no
fence edit: the dispatch envelope (`:793-861`) is byte-identical to HEAD
`a3d46bf1`. Every earlier sentence of this file stays binding except those
quoted under "Superseded sentences" below.

**Anchors in this note.** A bare cite of this file in this note is a line
at HEAD `a3d46bf1`. Note 2's fence amendment is already applied there, and
this note adds lines only after `:1620`, so no earlier line moves. Cites of
other files name the file.

### Items

**Item N3-1 — trigger-order wording (J7).** The replacement sentence for
note 2, N2 (`:1259`) is: "RESTRICT triggers on one table
fire in trigger-name order (`RI_ConstraintTrigger_a_<oid>`), which is creation order for these same-migration constraints
(**H5**)." The six FKs that
reference `solution_kit_install_runs.id` from the authority tables are
created by one migration, the transactional
`core/db/migrations/0081_task551_search_indexes_constraints_outbox.sql`
(`:157-159`, `:161`, `:162`, `:163`, `:165`). This is a wording correction,
with no behaviour change:

- The rest of N2 stays binding. So do the Item N2-2 code comment ("created
  before … and would fire first"; "precedes") and the expected constraint
  name `solution_kit_starter_apply_owners_source_run_id_solution_kit_install_runs_id_fk`.
- A different name in the part-1 run is still a finding for the
  orchestrator. The implementer never re-baselines it (Item N2-2).

**Item N3-2 — the anchor rule starts at `N ≥ 803` (J7).** The replacement
for the anchor rule's second and third sentences (`:1231-1232`) is: "A cite
of this file at a HEAD `c237e05d` line `:N` with `N ≥ 803` is now at
`:N+2`. Lines `:1-802` keep their numbers; line `:802` (the original path
in `allowlist`) gained only its trailing comma."

- Evidence: `git diff -U0 c237e05d a3d46bf1 -- <this file>` has the hunks
  `@@ -802 +802,3 @@`, `@@ -816 +818 @@`, `@@ -820,2 +822,2 @@` and
  `@@ -1216,0 +1219,402 @@`.
- HEAD `c237e05d` `:803`, the closing `],` of `allowlist`, is now `:805`.
  The earlier rule left it unmapped.
- The rest of the anchor rule stays binding: first-note and note-2 cites of
  this file are HEAD `c237e05d` lines unless marked "now", and test anchors
  are suite lines at HEAD `c237e05d`.

**Item N3-3 — the owners' primary key cite is a 0081 line (J7).** The
replacement for Item N2-5's first bullet (`:1451-1452`) is: "Two owners on
ONE `source_run_id` are refused by the owners' primary key
`solution_kit_starter_apply_owners_source_run_id_pk`
(`core/db/migrations/0081_task551_search_indexes_constraints_outbox.sql:99`,
23505), and the active index never decides." Under the anchor rule, the
bare `:99` pointed at a suite line. The fact and the second bullet are
unchanged.

**Item N3-4 — the V5-5 (a) share row's "Consumed at" cell (J7).** In note 2's
handoff table (`:1495`), the "Consumed at" cell names both FINAL steps that
read the row. **V8-8** step 7 checks that the owner item has landed. The
row's "Clears when" condition is met by the FINAL lane-runner run, which is
**V8-8** step 11
(`TASK-551-01-L01-Production-Query-Inventory-And-Ownership-Matrix.md`,
V8-8 FINAL table, steps 7 and 11). The replacement row (copy verbatim; only
the last cell differs from `:1495`):

| Handoff reason (copy verbatim) | Delivered by | Clears when | Consumed at |
| --- | --- | --- | --- |
| **V5-5 (a)** owner item, 05-L03 share (**O3**, **E2**) | 05-L03 first note Item 2, in the original path | the three worker branches (`:1979`, `:2016`, `:2062`) pass in the FINAL lane-runner run | V8-8 step 7 (landed check) and the FINAL lane-runner run (V8-8 step 11); not an initial precondition |

The `result-shape:` row (`:1494`), the Shared literal, the clearing rule
and the post-join row (`:1501`) are unchanged. Placing the post-join row
in 01-L01 belongs to 01-L01 v10 (**J4** (a)), not to this file.

**Item N3-5 — the 10-L01 owed mirror: full bundle and land-order bound
(J7, J9).** The replacement for note 2's first "Consequences" bullet
(`:1526-1530`, first and third sentences) is:

- The TASK-551-10-L01 `migration-and-plan-tests` command
  (`## Workflow Dispatch Envelope`, now
  `TASK-551-10-L01-Small-Large-Load-Fault-Security-And-Redis-Smoke-Gates.md:1270`)
  names only the original path. This holds for its `argv` (`:1272`), its
  `positiveDiscovery.paths` (`:1274`, which has `"minimum": 1`) and its
  validation command list (`## Exact Validation Commands`, the `bun test`
  block `:1062-1071`, original path at `:1065`).
- The owed mirror adds
  `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts`
  to the `argv`, to `positiveDiscovery.paths` and to the validation command
  list, and restates `minimum` under 10-L01's own rule.
- It is one bundle with the 05-L01 deployment split paths (**J9**; 05-L01
  fourth note, O6 widening). The 10-L01 writer writes it, never 05-L03. It
  is pending and not yet written.
- **Land-order bound.** The 05-L03 part of the mirror lands no later than
  the 05-L03 split edit (Item N2-3). The 05-L01 part keeps its own bound,
  which is no later than 05-L01 item 12.

The bullet's second sentence ("After the split, that gate would run the
live legs but not the static suite.") and fourth sentence ("It is the same
shape as the O6 widening in **H6**.") stay binding.

**Item N3-6 — the 05-L01 `forbiddenPaths` anchor (J7).** In note 2's
second "Consequences" bullet (`:1531`), the 05-L01 cite `:1077` becomes
`TASK-551-05-L01-Schema-Split-Indexes-And-Concurrency-Constraints.md:1080`.
That line holds the original path; the 05-L01 fourth note's `+3` shift
moved it. The rest of the bullet (optional hardening for the 05-L01 writer)
is unchanged.

### Superseded sentences (verbatim, line breaks shown as single spaces; superseded from this date)

1. `:1259` (note 2, N2): "RESTRICT triggers on one table fire in creation
   order (**H5**)." Replacement: Item N3-1.
2. `:1231-1232` (note 2, anchor rule): "A cite of this file at a HEAD line
   `:N` with `N ≥ 804` is now at `:N+2`." Replacement: Item N3-2.
3. `:1232` (note 2, anchor rule): "Lines `:1-801` do not move."
   Replacement: Item N3-2.
4. `:1451-1452` (note 2, Item N2-5, first bullet): "Two owners on ONE
   `source_run_id` are refused by the owners' primary key (`:99`, 23505),
   and the active index never decides." Replacement: Item N3-3.
5. `:1495` (note 2, handoff table, the V5-5 (a) share row, "Consumed at"
   cell): "FINAL only (**V8-8** step 7); not an initial precondition".
   Replacement: Item N3-4's row.
6. `:1526-1527` (note 2, Consequences, 10-L01 bullet): "**TASK-551-10-L01
   fence.** Its `argv` and `positiveDiscovery.paths`
   (`TASK-551-10-L01…md:1272`, `:1274`) name only the original path."
   Replacement: Item N3-5.
7. `:1529` (note 2, Consequences, 10-L01 bullet): "This is an owed mirror
   for the 10-L01 writer." Replacement: Item N3-5, which adds the bundle
   and the land-order bound.
8. `:1531-1532` (note 2, Consequences, 05-L01 bullet):
   "**TASK-551-05-L01 `forbiddenPaths`** (`TASK-551-05-L01…md:1077`) names
   only the original path." Replacement: the same sentence with
   `TASK-551-05-L01-Schema-Split-Indexes-And-Concurrency-Constraints.md:1080`
   (Item N3-6).
