/**
 * The normalized Solution Kit rollback authority (TASK-551-05-L01, landing the
 * TASK-551-05-L03 contract).
 *
 * Three tables that make a rollback claim a relational identity rather than a
 * JSON read of `options`:
 *
 *   - `solution_kit_starter_apply_owners` pins WHO ran an apply for a package
 *     with a live (unreleased) owner row, as one composite identity.
 *   - `solution_kit_legacy_template_evidence` owns every apply-side template
 *     operation that cannot be represented by `solution_kit_install_items`.
 *   - `solution_kit_legacy_rollback_progress` owns the per-position rollback
 *     outcome of one source run, bound to the evidence row it restores.
 *
 * Every foreign key here is `ON DELETE RESTRICT`: deleting a source run, an
 * actor or an evidence row that still owns authority must fail rather than
 * orphan it. The named checks are the full state matrices of the L03 contract;
 * the tests that pin them are owned by TASK-551-05-L03.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./identity";
import { solutionKitInstallRuns } from "./operations";

const STARTER_CONTRACT = "coderso.starter-content-rollback@v1";
const PROGRESS_CONTRACT = "coderso.legacy-template-rollback-progress@v1";

const HEX64 = "^[0-9a-f]{64}$";
const ASCII_1_96 = "^[ -~]{1,96}$";

/**
 * Inline a contract byte as a SQL literal. Generated check DDL is executed
 * verbatim, so a drizzle `sql` parameter would land as an unbound `$1` and a
 * raw splice would lose its quotes; every named check below goes through this
 * helper instead.
 */
const sqlLiteral = (value: string) => sql.raw(`'${value.replace(/'/g, "''")}'`);

export const solutionKitStarterApplyOwners = pgTable(
  "solution_kit_starter_apply_owners",
  {
    sourceRunId: uuid("source_run_id")
      .notNull()
      .references(() => solutionKitInstallRuns.id, { onDelete: "restrict" }),
    packageKey: text("package_key").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    contract: text("contract").notNull(),
    definitionDigest: text("definition_digest").notNull(),
    phase: text("phase").notNull(),
    envelope: jsonb("envelope").notNull(),
    envelopeDigest: text("envelope_digest").notNull(),
    releasedAt: timestamp("released_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sourceRunId] }),
    // The sole active-owner uniqueness predicate.
    uniqueIndex("solution_kit_starter_apply_owners_active_idx")
      .on(t.packageKey, t.actorId)
      .where(sql`released_at IS NULL`),
    foreignKey({
      name: "solution_kit_starter_apply_owners_source_identity_fk",
      columns: [t.sourceRunId, t.packageKey, t.actorId],
      foreignColumns: [
        solutionKitInstallRuns.id,
        solutionKitInstallRuns.kitId,
        solutionKitInstallRuns.actorId,
      ],
    }).onDelete("restrict"),
    check(
      "solution_kit_starter_apply_owners_state_chk",
      sql`${t.contract} = ${sqlLiteral(STARTER_CONTRACT)}
        AND octet_length(${t.packageKey}) BETWEEN 1 AND 128
        AND ${t.definitionDigest} ~ ${sqlLiteral(HEX64)}
        AND ${t.envelopeDigest} ~ ${sqlLiteral(HEX64)}
        AND jsonb_typeof(${t.envelope}) = 'object'
        AND ${t.envelope} ->> 'contract' = ${t.contract}
        AND ${t.envelope} ->> 'definitionDigest' = ${t.definitionDigest}
        AND ${t.envelope} ->> 'phase' = ${t.phase}
        AND ${t.phase} IN ('before_captured', 'core_applying', 'core_applied', 'templates_applying', 'templates_applied', 'shell_write_prepared', 'shell_write_applied', 'complete')
        AND ((${t.releasedAt} IS NULL AND ${t.envelope} -> 'active' = 'true'::jsonb)
          OR (${t.releasedAt} IS NOT NULL AND ${t.phase} = 'complete' AND ${t.envelope} -> 'active' = 'false'::jsonb))`
    ),
  ]
);

export const solutionKitLegacyTemplateEvidence = pgTable(
  "solution_kit_legacy_template_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceRunId: uuid("source_run_id")
      .notNull()
      .references(() => solutionKitInstallRuns.id, { onDelete: "restrict" }),
    sourcePosition: integer("source_position").notNull(),
    templateKey: text("template_key").notNull(),
    templateId: uuid("template_id"),
    planDigest: text("plan_digest").notNull(),
    operation: text("operation").notNull(),
    status: text("status").notNull(),
    beforeSnapshot: jsonb("before_snapshot"),
    afterSnapshot: jsonb("after_snapshot"),
    rollbackAction: jsonb("rollback_action"),
    safeErrorCode: text("safe_error_code"),
    evidenceDigest: text("evidence_digest").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("solution_kit_legacy_template_evidence_source_position_key").on(
      t.sourceRunId,
      t.sourcePosition
    ),
    uniqueIndex("solution_kit_legacy_template_evidence_source_key").on(
      t.sourceRunId,
      t.templateKey
    ),
    // The composite progress-FK target. A unique CONSTRAINT, not an index: a
    // foreign key can only be created once the unique key it references
    // exists, so this member belongs to the transactional migration itself and
    // is asserted — never rebuilt — by the online-index manifest.
    unique("solution_kit_legacy_template_evidence_identity_key").on(
      t.id,
      t.sourceRunId,
      t.sourcePosition,
      t.evidenceDigest,
      t.status
    ),
    foreignKey({
      name: "solution_kit_legacy_template_evidence_plan_fk",
      columns: [t.sourceRunId, t.planDigest],
      foreignColumns: [solutionKitInstallRuns.id, solutionKitInstallRuns.legacyTemplatePlanDigest],
    }).onDelete("restrict"),
    check(
      "solution_kit_legacy_template_evidence_state_chk",
      sql`${t.sourcePosition} BETWEEN 0 AND 511
        AND octet_length(${t.templateKey}) BETWEEN 1 AND 128
        AND ${t.planDigest} ~ ${sqlLiteral(HEX64)}
        AND ${t.evidenceDigest} ~ ${sqlLiteral(HEX64)}
        AND (${t.safeErrorCode} IS NULL OR ${t.safeErrorCode} ~ ${sqlLiteral(ASCII_1_96)})
        AND ${t.operation} IN ('create', 'update', 'noop')
        AND ${t.status} IN ('success', 'failed', 'skipped')
        AND (${t.beforeSnapshot} IS NULL OR jsonb_typeof(${t.beforeSnapshot}) = 'object')
        AND (${t.afterSnapshot} IS NULL OR jsonb_typeof(${t.afterSnapshot}) = 'object')
        AND (${t.status} = 'success' AND ${t.templateId} IS NOT NULL AND ${t.safeErrorCode} IS NULL
           OR ${t.status} <> 'success' AND ${t.afterSnapshot} IS NULL AND ${t.rollbackAction} IS NULL)
        AND (${t.status} <> 'failed' OR ${t.safeErrorCode} IS NOT NULL)
        AND (${t.status} <> 'skipped' OR ${t.safeErrorCode} IS NULL)
        AND (${t.operation} <> 'create' OR ${t.beforeSnapshot} IS NULL AND ${t.afterSnapshot} IS NOT NULL AND ${t.rollbackAction} IS NOT NULL)
        AND (${t.operation} <> 'update' OR ${t.beforeSnapshot} IS NOT NULL AND ${t.afterSnapshot} IS NOT NULL AND ${t.rollbackAction} IS NOT NULL)
        AND (${t.operation} <> 'noop' OR ${t.beforeSnapshot} IS NOT NULL AND ${t.afterSnapshot} IS NOT NULL AND ${t.beforeSnapshot} = ${t.afterSnapshot} AND ${t.rollbackAction} IS NULL)`
    ),
  ]
);

export const solutionKitLegacyRollbackProgress = pgTable(
  "solution_kit_legacy_rollback_progress",
  {
    rollbackRunId: uuid("rollback_run_id")
      .notNull()
      .references(() => solutionKitInstallRuns.id, { onDelete: "restrict" }),
    sourceRunId: uuid("source_run_id")
      .notNull()
      .references(() => solutionKitInstallRuns.id, { onDelete: "restrict" }),
    sourceEvidenceId: uuid("source_evidence_id").notNull(),
    contract: text("contract").notNull(),
    sourceStatus: text("source_status").notNull(),
    sourcePosition: integer("source_position").notNull(),
    rollbackPosition: integer("rollback_position").notNull(),
    state: text("state").notNull(),
    sourceEvidenceDigest: text("source_evidence_digest").notNull(),
    sourceAfterDigest: text("source_after_digest").notNull(),
    rollbackTargetDigest: text("rollback_target_digest"),
    mutationInvalidationEventKey: text("mutation_invalidation_event_key"),
    compensationInvalidationEventKey: text("compensation_invalidation_event_key"),
    progressDigest: text("progress_digest").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.rollbackRunId, t.sourcePosition] }),
    uniqueIndex("solution_kit_legacy_rollback_progress_rollback_position_idx").on(
      t.rollbackRunId,
      t.rollbackPosition
    ),
    index("solution_kit_legacy_rollback_progress_source_idx").on(t.sourceRunId, t.sourcePosition),
    index("solution_kit_legacy_rollback_progress_source_evidence_idx").on(t.sourceEvidenceId),
    foreignKey({
      name: "solution_kit_legacy_progress_rollback_relation_fk",
      columns: [t.rollbackRunId, t.sourceRunId],
      foreignColumns: [solutionKitInstallRuns.id, solutionKitInstallRuns.rollbackOfRunId],
    }).onDelete("restrict"),
    foreignKey({
      name: "solution_kit_legacy_progress_source_evidence_fk",
      columns: [
        t.sourceEvidenceId,
        t.sourceRunId,
        t.sourcePosition,
        t.sourceEvidenceDigest,
        t.sourceStatus,
      ],
      foreignColumns: [
        solutionKitLegacyTemplateEvidence.id,
        solutionKitLegacyTemplateEvidence.sourceRunId,
        solutionKitLegacyTemplateEvidence.sourcePosition,
        solutionKitLegacyTemplateEvidence.evidenceDigest,
        solutionKitLegacyTemplateEvidence.status,
      ],
    }).onDelete("restrict"),
    check(
      "solution_kit_legacy_progress_state_chk",
      sql`${t.contract} = ${sqlLiteral(PROGRESS_CONTRACT)}
        AND ${t.sourceStatus} = 'success'
        AND ${t.sourcePosition} BETWEEN 0 AND 511
        AND ${t.rollbackPosition} BETWEEN 0 AND 511
        AND ${t.sourceEvidenceDigest} ~ ${sqlLiteral(HEX64)}
        AND ${t.sourceAfterDigest} ~ ${sqlLiteral(HEX64)}
        AND ${t.progressDigest} ~ ${sqlLiteral(HEX64)}
        AND (${t.rollbackTargetDigest} IS NULL OR ${t.rollbackTargetDigest} ~ ${sqlLiteral(HEX64)})
        AND (${t.mutationInvalidationEventKey} IS NULL OR octet_length(${t.mutationInvalidationEventKey}) BETWEEN 1 AND 128)
        AND (${t.compensationInvalidationEventKey} IS NULL OR octet_length(${t.compensationInvalidationEventKey}) BETWEEN 1 AND 128)
        AND ${t.state} IN ('rollback_committed', 'source_restored', 'failed_no_mutation')
        AND (${t.state} <> 'failed_no_mutation' OR ${t.rollbackTargetDigest} IS NULL AND ${t.mutationInvalidationEventKey} IS NULL AND ${t.compensationInvalidationEventKey} IS NULL)
        AND (${t.state} <> 'rollback_committed' OR ${t.rollbackTargetDigest} IS NOT NULL AND ${t.mutationInvalidationEventKey} IS NOT NULL AND ${t.compensationInvalidationEventKey} IS NULL)
        AND (${t.state} <> 'source_restored' OR ${t.rollbackTargetDigest} IS NOT NULL AND ${t.mutationInvalidationEventKey} IS NOT NULL AND ${t.compensationInvalidationEventKey} IS NOT NULL)`
    ),
  ]
);
