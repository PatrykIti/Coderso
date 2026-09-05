/**
 * The TASK-551 migration receipt table (TASK-551-05-L01).
 *
 * One row per rollout operation, written by `scripts/task-551-online-indexes.ts`
 * inside the guarded transactional expand and advanced from there by
 * compare-and-set transitions. The row is the single durable truth about where
 * a rollout stopped: recovery reads it together with the Drizzle journal and
 * the live catalog and never trusts a filesystem mirror alone.
 *
 * The receipt shape pinned here is version 2. Every transition executes one
 * `UPDATE ... WHERE operation_id = :id AND generation = :expected AND
 * state_sha256 = :expectedDigest` and requires exactly one returned row; zero
 * rows is `task551_migration_receipt_conflict`.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { DatabaseFleetConfig } from "../databaseConfig";

/** The three session GUCs the rollout sets on its reserved migration backend. */
export const TASK551_MIGRATION_GUCS = Object.freeze({
  operationId: "coderso.task551_operation_id",
  receipt: "coderso.task551_receipt_v2",
  receiptSha256: "coderso.task551_receipt_sha256",
});

/** Canonical-JSON byte ceiling for the receipt, both as GUC and as stored row. */
export const TASK551_MIGRATION_RECEIPT_MAX_BYTES = 65_536;

/**
 * The exact closed version-2 state union. This is the literal list the contract
 * type spells out — every state the rollout can persist, forward and reverse,
 * with no extra member invented to satisfy a prose count.
 */
export const TASK551_MIGRATION_STATE_LITERALS = Object.freeze([
  "resolved",
  "preflight_passed",
  "drain_requested",
  "drain_confirmed",
  "transaction_apply_pending",
  "transaction_applied",
  "revision_integrity_building",
  "revision_integrity_ready",
  "resume_authorized",
  "resume_completed",
  "operator_resume_authorized",
  "read_performance_building",
  "forward_ready",
  "reverse_drain_requested",
  "reverse_drain_confirmed",
  "reverse_indexes_building",
  "reverse_transaction_pending",
  "reverse_complete",
] as const);

export type Task551MigrationState = (typeof TASK551_MIGRATION_STATE_LITERALS)[number];

/** Receipt of one online index member across its build/reverse lifetime. */
export type Task551OnlineIndexMemberReceipt = Readonly<{
  name: string;
  group: "revision-integrity" | "read-performance";
  /** Zero-based position inside the closed manifest order. */
  order: number;
  definitionSha256: string;
  state: "pending" | "building" | "ready" | "dropped";
  complete: boolean;
  completedAt: string | null;
}>;

/**
 * The version-2 migration receipt. `fleet` is the exact
 * `parseDatabaseFleetConfig` result owned by TASK-551-02-L01 — consumed as a
 * type here and never re-parsed by the rollout tool.
 */
export type Task551MigrationReceipt = Readonly<{
  version: 2;
  taskId: "TASK-551";
  operationId: string;
  generation: number;
  previousStateSha256: string | null;
  stateSha256: string;
  direction: "forward" | "reverse";
  state: Task551MigrationState;
  journal: { index: number; tag: string };
  artifacts: {
    transactionalSql: { path: string; sha256: string };
    snapshot: { path: string; sha256: string };
    onlineSql: { path: string; sha256: string };
    manifestSha256: string;
    aggregateSha256: string;
  };
  preflight: {
    digest: string;
    classification: "small" | "large";
    lockTimeoutMs: 2_000;
    statementTimeoutMs: 30_000 | 300_000;
    transactionTimeoutMs: 120_000 | 900_000;
    recheckDigests: readonly string[];
  };
  admission: {
    mode: "external" | "offline-single";
    fleet: DatabaseFleetConfig;
    adapterSha256: string | null;
    drainNonce: string;
    prepareAckSha256: string | null;
    quiescentFrom: string | null;
    quiescentUntil: string | null;
    resumeNonce: string | null;
    resumeAuthorizationSha256: string | null;
    resumeAckSha256: string | null;
    resumeBinarySha256: string | null;
    revisionWriterCompatibilitySha256: string | null;
    newBinaryTrafficAccepted: boolean;
  };
  transaction: { apply: "pending" | "applied" | "reversed"; catalogSha256: string | null };
  groups: readonly [
    {
      name: "revision-integrity";
      members: readonly [
        "page_revisions_page_version_idx",
        "widget_template_revisions_template_version_idx",
      ];
      complete: boolean;
      completedAt: string | null;
    },
    {
      name: "read-performance";
      members: readonly string[];
      complete: boolean;
      completedAt: string | null;
    },
  ];
  forwardMembers: readonly Task551OnlineIndexMemberReceipt[];
  reverseMembers: readonly Task551OnlineIndexMemberReceipt[];
  finalCatalogReady: boolean;
}>;

const stateUnionSql = sql.raw(
  TASK551_MIGRATION_STATE_LITERALS.map((literal) => `'${literal}'`).join(", ")
);

export const task551MigrationOperations = pgTable(
  "task551_migration_operations",
  {
    operationId: uuid("operation_id").primaryKey(),
    taskId: text("task_id").notNull(),
    generation: integer("generation").notNull(),
    direction: text("direction").notNull(),
    state: text("state").notNull(),
    receipt: jsonb("receipt").$type<Task551MigrationReceipt>().notNull(),
    previousStateSha256: text("previous_state_sha256"),
    stateSha256: text("state_sha256").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check("task551_migration_operations_task_chk", sql`${t.taskId} = 'TASK-551'`),
    check(
      "task551_migration_operations_generation_chk",
      sql`${t.generation} BETWEEN 0 AND 2147483647`
    ),
    check(
      "task551_migration_operations_direction_chk",
      sql`${t.direction} IN ('forward', 'reverse')`
    ),
    check("task551_migration_operations_state_chk", sql`${t.state} IN (${stateUnionSql})`),
    check(
      "task551_migration_operations_state_sha256_chk",
      sql`${t.stateSha256} ~ '^[0-9a-f]{64}$'`
    ),
    check(
      "task551_migration_operations_receipt_version_chk",
      sql`${t.receipt} ->> 'version' = '2'`
    ),
    check(
      "task551_migration_operations_receipt_operation_chk",
      sql`${t.receipt} ->> 'operationId' = ${t.operationId}::text`
    ),
    // The stored JSON is byte-bounded; the canonical GUC input is bounded by
    // the writer's own `TASK551_MIGRATION_RECEIPT_MAX_BYTES` assertion before
    // it ever reaches this row.
    check(
      "task551_migration_operations_receipt_size_chk",
      sql`octet_length(${t.receipt}::text) BETWEEN 1 AND ${sql.raw(String(TASK551_MIGRATION_RECEIPT_MAX_BYTES))}`
    ),
  ]
);
