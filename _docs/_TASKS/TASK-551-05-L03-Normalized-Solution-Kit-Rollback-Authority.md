# TASK-551-05-L03: Normalized Solution Kit Rollback Authority
# FileName: TASK-551-05-L03-Normalized-Solution-Kit-Rollback-Authority.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-05
**Priority:** Critical
**Category:** Database / Schema / Migration / Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-551-05-L01 (sole schema/migration writer; lands all four authority tables), serialized TASK-489 handoff (first producers, not this leaf)
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

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
