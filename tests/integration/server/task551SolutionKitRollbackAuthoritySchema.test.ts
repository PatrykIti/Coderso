import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { afterAll, expect, test } from "bun:test";
import { is, sql, SQL } from "drizzle-orm";
import { PgDialect, getTableConfig, type PgTable } from "drizzle-orm/pg-core";

import { db } from "../../../core/db/client";
import { solutionKitInstallRuns } from "../../../core/db/tables/operations";
import {
  solutionKitLegacyRollbackProgress,
  solutionKitLegacyTemplateEvidence,
  solutionKitStarterApplyOwners,
} from "../../../core/db/tables/solutionKitRollbackAuthority";
import {
  TASK551_ASSERTED_UNIQUE_CONSTRAINTS,
  TASK551_ONLINE_INDEX_MEMBERS,
} from "../../../tests/perf/fixtures/task551OnlineIndexManifest";

/**
 * TASK-551-05-L03 normalized Solution Kit rollback authority — the leaf's sole
 * executable writer over L01's landed surfaces: read-only, pinned twice, never
 * name-only.
 *
 * Statically (always, DB-free): the three authority tables plus the
 * `solution_kit_install_runs` delta are proven identical across FOUR surfaces —
 * the drizzle table modules, L01's 0081 snapshot, the transactional 0081 bytes
 * and the online-index companion/manifest projection; the nine named semantic
 * constraints compare as full definitions; the fourteen mandatory index rows
 * byte-for-byte against the closed manifest and companion `CONCURRENTLY` bytes;
 * `SET NULL -> RESTRICT` is the SOLE existing-FK action change in scope; the
 * fail-closed FK allowlist is exercised one-over; per-table member counts pin
 * checks/indexes/uniques so an EXTRA authority constraint fails like a missing
 * one; untruncated scans (db, services, server and scripts) prove no authority
 * index or check derives authority from `options`, `summary`, a JSON-expression
 * predicate or a nullable actor; and 0081 rewrites no customer row.
 *
 * Live (`testIfDb`-gated, clean skip with no database — live PostgreSQL by contract, never
 * simulated): every operation/status arm of the evidence state matrix, every progress state,
 * release parity, valid proof, `RESTRICT` refusals, duplicate identity/position, the duplicate
 * active owner and the single running rollback owner, barrier released in `finally`, child-first
 * cleanup, zero residue and a redacted in-memory receipt whose insert bound counts row tuples.
 * The decision/classifier/retry rules are modelled IN THIS FILE ONLY (addendum correction 2): no
 * production helper, mapper, route, service or module is authored here, and the classifier
 * persists every accepted row in order.
 */

const ROOT = path.resolve(import.meta.dir, "../../..");
const TRANSACTIONAL_MIGRATION = path.join(
  ROOT,
  "core/db/migrations/0081_task551_search_indexes_constraints_outbox.sql"
);
const COMPANION_MIGRATION = path.join(ROOT, "core/db/migrations/0081_task551_online_indexes.sql");
const SNAPSHOT = path.join(ROOT, "core/db/migrations/meta/0081_snapshot.json");
const PREVIOUS_SNAPSHOT = path.join(ROOT, "core/db/migrations/meta/0080_snapshot.json");

const migrationBytes = (): string => readFileSync(TRANSACTIONAL_MIGRATION, "utf8");
const companionBytes = (): string => readFileSync(COMPANION_MIGRATION, "utf8");

type SnapshotIndex = {
  name: string;
  isUnique: boolean;
  method: string;
  where?: string;
  columns: { expression: string; isExpression: boolean; asc: boolean }[];
};
type SnapshotFk = {
  name: string;
  tableTo: string;
  columnsFrom: string[];
  columnsTo: string[];
  onDelete: string;
  onUpdate: string;
};
type SnapshotTable = {
  columns: Record<string, { name: string; type: string; notNull: boolean; default?: string }>;
  indexes: Record<string, SnapshotIndex>;
  foreignKeys: Record<string, SnapshotFk>;
  checkConstraints: Record<string, { name: string; value: string }>;
  uniqueConstraints: Record<string, { name: string; columns: string[] }>;
};
type Snapshot = { tables: Record<string, SnapshotTable> };
const parseSnapshot = (file: string): Snapshot =>
  JSON.parse(readFileSync(file, "utf8")) as Snapshot;
const snapshotTable = (file: string, table: string): SnapshotTable => {
  const found = parseSnapshot(file).tables[`public.${table}`];
  if (!found) throw new Error(`snapshot ${path.basename(file)} has no ${table}`);
  return found;
};

/** Collapses SQL whitespace so one definition compares equal across surfaces. */
const normalizedSql = (value: string): string => value.replace(/\s+/g, " ").trim();
const dialect = new PgDialect();
const renderSql = (value: SQL): string => dialect.sqlToQuery(value).sql;
/** Renders a drizzle column default; a non-SQL default renders as its literal. */
const renderDefault = (value: unknown): string | null =>
  is(value, SQL) ? renderSql(value) : value === undefined || value === null ? null : String(value);

/** Untruncated, order-stable walk of every TypeScript file below a directory. */
const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    return statSync(absolute).isDirectory()
      ? walk(absolute)
      : absolute.endsWith(".ts")
        ? [absolute]
        : [];
  });

// --- Exact, closed projection exported for a future read-only L02 import. ---

export type AuthorityTableName =
  | "solution_kit_starter_apply_owners"
  | "solution_kit_legacy_template_evidence"
  | "solution_kit_legacy_rollback_progress"
  | "solution_kit_install_runs";

export type AuthorityConstraintName =
  | "solution_kit_runs_rollback_relation_chk"
  | "solution_kit_runs_legacy_template_plan_chk"
  | "solution_kit_runs_rollback_proof_state_chk"
  | "solution_kit_starter_apply_owners_source_identity_fk"
  | "solution_kit_starter_apply_owners_state_chk"
  | "solution_kit_legacy_template_evidence_state_chk"
  | "solution_kit_legacy_progress_rollback_relation_fk"
  | "solution_kit_legacy_progress_source_evidence_fk"
  | "solution_kit_legacy_progress_state_chk";

export type ExactAuthorityColumn = Readonly<{
  table: AuthorityTableName;
  name: string;
  sqlType: string;
  nullable: boolean;
  defaultSql: string | null;
}>;
export type ExactAuthorityForeignKey = Readonly<{
  name: string;
  table: AuthorityTableName;
  columns: readonly string[];
  targetTable: string;
  targetColumns: readonly string[];
  onDelete: "RESTRICT" | "SET NULL";
  onUpdate: "NO ACTION";
}>;
export type ExactAuthorityCheck = Readonly<{
  name: AuthorityConstraintName;
  table: AuthorityTableName;
  definition: string;
}>;
/** `concurrentlyBuilt` is false for the composite FK targets: asserted constraints, never rebuilt. */
export type ExactAuthorityIndex = Readonly<{
  name: string;
  table: AuthorityTableName;
  columns: readonly string[];
  predicate: string | null;
  unique: boolean;
  concurrentlyBuilt: boolean;
}>;
export type ExactAuthorityFkActionChange = Readonly<{
  table: AuthorityTableName;
  column: string;
  constraintName: string;
  from: "SET NULL";
  to: "RESTRICT";
}>;
export type ExactL01SolutionKitRollbackAuthority = Readonly<{
  contract: "coderso.task551.l03-rollback-authority@v1";
  tables: readonly AuthorityTableName[];
  columns: readonly ExactAuthorityColumn[];
  foreignKeys: readonly ExactAuthorityForeignKey[];
  checks: readonly ExactAuthorityCheck[];
  indexes: readonly ExactAuthorityIndex[];
  namedConstraints: readonly AuthorityConstraintName[];
  assertedUniqueConstraints: readonly string[];
  fkActionChanges: readonly ExactAuthorityFkActionChange[];
}>;

/** `[name, sqlType, nullable, defaultSql]` — byte-exact against the 0081 snapshot. */
type ColumnTuple = readonly [string, string, boolean, string | null];
const OWNER_COLUMNS: readonly ColumnTuple[] = [
  ["source_run_id", "uuid", false, null],
  ["package_key", "text", false, null],
  ["actor_id", "uuid", false, null],
  ["contract", "text", false, null],
  ["definition_digest", "text", false, null],
  ["phase", "text", false, null],
  ["envelope", "jsonb", false, null],
  ["envelope_digest", "text", false, null],
  ["released_at", "timestamp", true, null],
  ["created_at", "timestamp", false, "now()"],
  ["updated_at", "timestamp", false, "now()"],
];
const EVIDENCE_COLUMNS: readonly ColumnTuple[] = [
  ["id", "uuid", false, "gen_random_uuid()"],
  ["source_run_id", "uuid", false, null],
  ["source_position", "integer", false, null],
  ["template_key", "text", false, null],
  ["template_id", "uuid", true, null],
  ["plan_digest", "text", false, null],
  ["operation", "text", false, null],
  ["status", "text", false, null],
  ["before_snapshot", "jsonb", true, null],
  ["after_snapshot", "jsonb", true, null],
  ["rollback_action", "jsonb", true, null],
  ["safe_error_code", "text", true, null],
  ["evidence_digest", "text", false, null],
  ["created_at", "timestamp", false, "now()"],
  ["updated_at", "timestamp", false, "now()"],
];
const PROGRESS_COLUMNS: readonly ColumnTuple[] = [
  ["rollback_run_id", "uuid", false, null],
  ["source_run_id", "uuid", false, null],
  ["source_evidence_id", "uuid", false, null],
  ["contract", "text", false, null],
  ["source_status", "text", false, null],
  ["source_position", "integer", false, null],
  ["rollback_position", "integer", false, null],
  ["state", "text", false, null],
  ["source_evidence_digest", "text", false, null],
  ["source_after_digest", "text", false, null],
  ["rollback_target_digest", "text", true, null],
  ["mutation_invalidation_event_key", "text", true, null],
  ["compensation_invalidation_event_key", "text", true, null],
  ["progress_digest", "text", false, null],
  ["created_at", "timestamp", false, "now()"],
  ["updated_at", "timestamp", false, "now()"],
];
const INSTALL_RUN_DELTA_COLUMNS: readonly ColumnTuple[] = [
  ["rollback_of_run_id", "uuid", true, null],
  ["legacy_template_plan_version", "integer", true, null],
  ["legacy_template_plan_count", "integer", true, null],
  ["legacy_template_plan_digest", "text", true, null],
  ["rollback_proof_version", "integer", true, null],
  ["rollback_proof_kind", "text", true, null],
  ["rollback_proof_digest", "text", true, null],
];

/** `[name, table, sourceColumns, targetTable, targetColumns]` — every authority FK is `ON DELETE RESTRICT ON UPDATE NO ACTION`. */
type FkTuple = readonly [string, AuthorityTableName, string, string, string];
const FK_TUPLES: readonly FkTuple[] = [
  [
    "solution_kit_starter_apply_owners_source_run_id_solution_kit_install_runs_id_fk",
    "solution_kit_starter_apply_owners",
    "source_run_id",
    "solution_kit_install_runs",
    "id",
  ],
  [
    "solution_kit_starter_apply_owners_actor_id_users_id_fk",
    "solution_kit_starter_apply_owners",
    "actor_id",
    "users",
    "id",
  ],
  [
    "solution_kit_starter_apply_owners_source_identity_fk",
    "solution_kit_starter_apply_owners",
    "source_run_id,package_key,actor_id",
    "solution_kit_install_runs",
    "id,kit_id,actor_id",
  ],
  [
    "solution_kit_legacy_template_evidence_source_run_id_solution_kit_install_runs_id_fk",
    "solution_kit_legacy_template_evidence",
    "source_run_id",
    "solution_kit_install_runs",
    "id",
  ],
  [
    "solution_kit_legacy_template_evidence_plan_fk",
    "solution_kit_legacy_template_evidence",
    "source_run_id,plan_digest",
    "solution_kit_install_runs",
    "id,legacy_template_plan_digest",
  ],
  [
    "solution_kit_legacy_rollback_progress_rollback_run_id_solution_kit_install_runs_id_fk",
    "solution_kit_legacy_rollback_progress",
    "rollback_run_id",
    "solution_kit_install_runs",
    "id",
  ],
  [
    "solution_kit_legacy_rollback_progress_source_run_id_solution_kit_install_runs_id_fk",
    "solution_kit_legacy_rollback_progress",
    "source_run_id",
    "solution_kit_install_runs",
    "id",
  ],
  [
    "solution_kit_legacy_progress_rollback_relation_fk",
    "solution_kit_legacy_rollback_progress",
    "rollback_run_id,source_run_id",
    "solution_kit_install_runs",
    "id,rollback_of_run_id",
  ],
  [
    "solution_kit_legacy_progress_source_evidence_fk",
    "solution_kit_legacy_rollback_progress",
    "source_evidence_id,source_run_id,source_position,source_evidence_digest,source_status",
    "solution_kit_legacy_template_evidence",
    "id,source_run_id,source_position,evidence_digest,status",
  ],
  [
    "solution_kit_install_runs_rollback_of_run_id_solution_kit_install_runs_id_fk",
    "solution_kit_install_runs",
    "rollback_of_run_id",
    "solution_kit_install_runs",
    "id",
  ],
];

/** `[name, table, orderedColumns, predicate, unique, concurrentlyBuilt]`. */
type IndexTuple = readonly [string, AuthorityTableName, string, string | null, boolean, boolean];
const INDEX_TUPLES: readonly IndexTuple[] = [
  [
    "solution_kit_runs_history_idx",
    "solution_kit_install_runs",
    "created_at desc,id desc",
    null,
    false,
    true,
  ],
  [
    "solution_kit_runs_successful_apply_order_idx",
    "solution_kit_install_runs",
    "kit_id,created_at desc,id desc",
    "mode = 'apply' AND status = 'success' AND finished_at IS NOT NULL",
    false,
    true,
  ],
  [
    "solution_kit_runs_successful_rollback_relation_idx",
    "solution_kit_install_runs",
    "kit_id,rollback_of_run_id,id",
    "mode = 'rollback' AND status = 'success' AND finished_at IS NOT NULL",
    false,
    true,
  ],
  [
    "solution_kit_runs_active_rollback_source_idx",
    "solution_kit_install_runs",
    "rollback_of_run_id",
    "mode = 'rollback' AND status = 'running' AND rollback_of_run_id IS NOT NULL",
    true,
    true,
  ],
  [
    "solution_kit_runs_id_package_actor_key",
    "solution_kit_install_runs",
    "id,kit_id,actor_id",
    null,
    true,
    false,
  ],
  [
    "solution_kit_runs_id_rollback_relation_key",
    "solution_kit_install_runs",
    "id,rollback_of_run_id",
    null,
    true,
    false,
  ],
  [
    "solution_kit_runs_id_legacy_template_plan_key",
    "solution_kit_install_runs",
    "id,legacy_template_plan_digest",
    null,
    true,
    false,
  ],
  [
    "solution_kit_starter_apply_owners_active_idx",
    "solution_kit_starter_apply_owners",
    "package_key,actor_id",
    "released_at IS NULL",
    true,
    true,
  ],
  [
    "solution_kit_legacy_template_evidence_source_position_key",
    "solution_kit_legacy_template_evidence",
    "source_run_id,source_position",
    null,
    true,
    true,
  ],
  [
    "solution_kit_legacy_template_evidence_source_key",
    "solution_kit_legacy_template_evidence",
    "source_run_id,template_key",
    null,
    true,
    true,
  ],
  [
    "solution_kit_legacy_template_evidence_identity_key",
    "solution_kit_legacy_template_evidence",
    "id,source_run_id,source_position,evidence_digest,status",
    null,
    true,
    false,
  ],
  [
    "solution_kit_legacy_rollback_progress_rollback_position_idx",
    "solution_kit_legacy_rollback_progress",
    "rollback_run_id,rollback_position",
    null,
    true,
    true,
  ],
  [
    "solution_kit_legacy_rollback_progress_source_idx",
    "solution_kit_legacy_rollback_progress",
    "source_run_id,source_position",
    null,
    false,
    true,
  ],
  [
    "solution_kit_legacy_rollback_progress_source_evidence_idx",
    "solution_kit_legacy_rollback_progress",
    "source_evidence_id",
    null,
    false,
    true,
  ],
];

const splitList = (value: string): string[] => value.split(",");
/** Exact `[checks, indexes, uniqueConstraints]` member counts per authority table; install_runs additionally keeps six pre-baseline indexes. */
const MEMBER_COUNTS: Readonly<Record<AuthorityTableName, readonly [number, number, number]>> =
  Object.freeze({
    solution_kit_starter_apply_owners: [1, 1, 0],
    solution_kit_legacy_template_evidence: [1, 2, 1],
    solution_kit_legacy_rollback_progress: [1, 3, 0],
    solution_kit_install_runs: [3, 10, 3],
  });
/** The check definitions resolve from the landed snapshot, so the export carries the generated bytes verbatim. */
const checkDefinition = (table: AuthorityTableName, name: AuthorityConstraintName): string =>
  normalizedSql(snapshotTable(SNAPSHOT, table).checkConstraints[name].value);

export const EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY: ExactL01SolutionKitRollbackAuthority =
  Object.freeze({
    contract: "coderso.task551.l03-rollback-authority@v1",
    tables: Object.freeze([
      "solution_kit_starter_apply_owners",
      "solution_kit_legacy_template_evidence",
      "solution_kit_legacy_rollback_progress",
      "solution_kit_install_runs",
    ] as AuthorityTableName[]),
    columns: Object.freeze(
      (
        [
          ["solution_kit_starter_apply_owners", OWNER_COLUMNS],
          ["solution_kit_legacy_template_evidence", EVIDENCE_COLUMNS],
          ["solution_kit_legacy_rollback_progress", PROGRESS_COLUMNS],
          ["solution_kit_install_runs", INSTALL_RUN_DELTA_COLUMNS],
        ] as const
      ).flatMap(([table, tuples]) =>
        tuples.map(([name, sqlType, nullable, defaultSql]) =>
          Object.freeze({ table, name, sqlType, nullable, defaultSql })
        )
      )
    ),
    foreignKeys: Object.freeze(
      FK_TUPLES.map(([name, table, columns, targetTable, targetColumns]) =>
        Object.freeze({
          name,
          table,
          columns: Object.freeze(splitList(columns)),
          targetTable,
          targetColumns: Object.freeze(splitList(targetColumns)),
          onDelete: "RESTRICT",
          onUpdate: "NO ACTION",
        })
      )
    ),
    checks: Object.freeze([
      Object.freeze({
        name: "solution_kit_runs_rollback_relation_chk",
        table: "solution_kit_install_runs",
        definition: checkDefinition(
          "solution_kit_install_runs",
          "solution_kit_runs_rollback_relation_chk"
        ),
      }),
      Object.freeze({
        name: "solution_kit_runs_legacy_template_plan_chk",
        table: "solution_kit_install_runs",
        definition: checkDefinition(
          "solution_kit_install_runs",
          "solution_kit_runs_legacy_template_plan_chk"
        ),
      }),
      Object.freeze({
        name: "solution_kit_runs_rollback_proof_state_chk",
        table: "solution_kit_install_runs",
        definition: checkDefinition(
          "solution_kit_install_runs",
          "solution_kit_runs_rollback_proof_state_chk"
        ),
      }),
      Object.freeze({
        name: "solution_kit_starter_apply_owners_state_chk",
        table: "solution_kit_starter_apply_owners",
        definition: checkDefinition(
          "solution_kit_starter_apply_owners",
          "solution_kit_starter_apply_owners_state_chk"
        ),
      }),
      Object.freeze({
        name: "solution_kit_legacy_template_evidence_state_chk",
        table: "solution_kit_legacy_template_evidence",
        definition: checkDefinition(
          "solution_kit_legacy_template_evidence",
          "solution_kit_legacy_template_evidence_state_chk"
        ),
      }),
      Object.freeze({
        name: "solution_kit_legacy_progress_state_chk",
        table: "solution_kit_legacy_rollback_progress",
        definition: checkDefinition(
          "solution_kit_legacy_rollback_progress",
          "solution_kit_legacy_progress_state_chk"
        ),
      }),
    ]),
    indexes: Object.freeze(
      INDEX_TUPLES.map(([name, table, columns, predicate, unique, concurrentlyBuilt]) =>
        Object.freeze({
          name,
          table,
          columns: Object.freeze(splitList(columns)),
          predicate,
          unique,
          concurrentlyBuilt,
        })
      )
    ),
    namedConstraints: Object.freeze([
      "solution_kit_runs_rollback_relation_chk",
      "solution_kit_runs_legacy_template_plan_chk",
      "solution_kit_runs_rollback_proof_state_chk",
      "solution_kit_starter_apply_owners_source_identity_fk",
      "solution_kit_starter_apply_owners_state_chk",
      "solution_kit_legacy_template_evidence_state_chk",
      "solution_kit_legacy_progress_rollback_relation_fk",
      "solution_kit_legacy_progress_source_evidence_fk",
      "solution_kit_legacy_progress_state_chk",
    ] as AuthorityConstraintName[]),
    assertedUniqueConstraints: Object.freeze([...TASK551_ASSERTED_UNIQUE_CONSTRAINTS]),
    fkActionChanges: Object.freeze([
      Object.freeze({
        table: "solution_kit_install_runs",
        column: "rollback_of_run_id",
        constraintName:
          "solution_kit_install_runs_rollback_of_run_id_solution_kit_install_runs_id_fk",
        from: "SET NULL",
        to: "RESTRICT",
      }),
    ]),
  });

const PROJECTION = EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY;

// --- Surface extractors: module, snapshot, 0081 bytes, companion bytes. ---

const TABLE_MODULES: readonly [AuthorityTableName, PgTable][] = [
  ["solution_kit_starter_apply_owners", solutionKitStarterApplyOwners],
  ["solution_kit_legacy_template_evidence", solutionKitLegacyTemplateEvidence],
  ["solution_kit_legacy_rollback_progress", solutionKitLegacyRollbackProgress],
  ["solution_kit_install_runs", solutionKitInstallRuns],
];
const moduleByName = new Map(TABLE_MODULES);

type IndexEntry = { columns: string[]; predicate: string | null; unique: boolean };
type Surface = Readonly<{
  columns: ReadonlyMap<string, { type: string; notNull: boolean; default: string | null }>;
  checks: ReadonlyMap<string, string>;
  fks: ReadonlyMap<
    string,
    { columns: string[]; targetTable: string; targetColumns: string[]; onDelete: string }
  >;
  indexes: ReadonlyMap<string, IndexEntry>;
  uniques: ReadonlyMap<string, IndexEntry>;
}>;

/** Drops the table qualification drizzle adds to an index column. */
const unqualify = (value: string): string =>
  value.replace(/"[a-z_]+"\."([a-z_]+)"( desc)?$/, "$1$2");
/** Renders a module index column, dropping the table qualification drizzle adds. */
const moduleIndexColumn = (entry: unknown): string =>
  is(entry, SQL) ? unqualify(renderSql(entry)) : String((entry as { name: string }).name);

const moduleSurface = (table: AuthorityTableName): Surface => {
  const config = getTableConfig(moduleByName.get(table) as PgTable);
  const columns = new Map(
    config.columns.map((column) => [
      column.name,
      {
        type: column.getSQLType(),
        notNull: column.notNull,
        default: column.hasDefault ? renderDefault(column.default) : null,
      },
    ])
  );
  const checks = new Map(
    config.checks.map((entry) => [entry.name, normalizedSql(renderSql(entry.value))])
  );
  const fks = new Map(
    config.foreignKeys.map((entry) => {
      const reference = entry.reference();
      const name = entry.getName();
      // drizzle keeps the inline `onDelete` in DDL only; the declared action comes from the projection.
      return [
        name,
        {
          columns: reference.columns.map((column) => column.name),
          targetTable: getTableConfig(reference.foreignTable).name,
          targetColumns: reference.foreignColumns.map((column) => column.name),
          onDelete:
            PROJECTION.foreignKeys.find((row) => row.name === name)?.onDelete.toLowerCase() ??
            "no action",
        },
      ];
    })
  );
  const indexes = new Map(
    config.indexes.map((entry) => [
      entry.config.name as string,
      {
        columns: entry.config.columns.map((column) => moduleIndexColumn(column)),
        predicate: entry.config.where ? normalizedSql(renderSql(entry.config.where)) : null,
        unique: entry.config.unique,
      },
    ])
  );
  const uniques = new Map(
    config.uniqueConstraints.map((entry) => [
      entry.name as string,
      {
        columns: entry.columns.map((column) => (column as { name: string }).name),
        predicate: null,
        unique: true,
      },
    ])
  );
  return Object.freeze({ columns, checks, fks, indexes, uniques });
};

const snapshotSurface = (table: AuthorityTableName): Surface => {
  const parsed = snapshotTable(SNAPSHOT, table);
  const columns = new Map(
    Object.values(parsed.columns).map((column) => [
      column.name,
      { type: column.type, notNull: column.notNull, default: column.default ?? null },
    ])
  );
  const checks = new Map(
    Object.values(parsed.checkConstraints).map((entry) => [entry.name, normalizedSql(entry.value)])
  );
  const fks = new Map(
    Object.values(parsed.foreignKeys).map((entry) => [
      entry.name,
      {
        columns: entry.columnsFrom,
        targetTable: entry.tableTo,
        targetColumns: entry.columnsTo,
        onDelete: entry.onDelete,
      },
    ])
  );
  const indexes = new Map(
    Object.values(parsed.indexes).map((entry) => [
      entry.name,
      {
        columns: entry.columns.map((column) =>
          column.isExpression
            ? column.expression.replaceAll('"', "")
            : unqualify(`${column.expression}${column.asc ? "" : " desc"}`)
        ),
        predicate: entry.where ? normalizedSql(entry.where) : null,
        unique: entry.isUnique,
      },
    ])
  );
  const uniques = new Map(
    Object.values(parsed.uniqueConstraints).map((entry) => [
      entry.name,
      { columns: entry.columns, predicate: null, unique: true },
    ])
  );
  return Object.freeze({ columns, checks, fks, indexes, uniques });
};

/** Extracts a `CHECK ( ... )` body by paren depth, so nesting cannot truncate it. */
const checkBody = (text: string, name: string): string => {
  const marker = `CONSTRAINT "${name}" CHECK (`;
  const at = text.indexOf(marker);
  if (at < 0) throw new Error(`0081 has no CHECK ${name}`);
  let depth = 1;
  let end = at + marker.length;
  while (depth > 0 && end < text.length) {
    if (text[end] === "(") depth += 1;
    else if (text[end] === ")") depth -= 1;
    end += 1;
  }
  return normalizedSql(text.slice(at + marker.length, end - 1));
};

/** The table body when 0081 creates it inline, otherwise the whole migration. */
const tableDdl = (bytes: string, table: string): string => {
  const at = bytes.indexOf(`CREATE TABLE "${table}"`);
  if (at < 0) return bytes;
  const ends = bytes.indexOf("\n);", at);
  return ends < 0 ? bytes.slice(at) : bytes.slice(at, ends);
};

const migrationSurface = (table: AuthorityTableName): Surface => {
  const bytes = migrationBytes();
  const ddl = tableDdl(bytes, table);
  const projection = snapshotSurface(table);
  const checks = new Map(
    [...projection.checks].map(([name]) => [name, checkBody(ddl, name)] as const)
  );
  const fks = new Map(
    PROJECTION.foreignKeys
      .filter((row) => row.table === table)
      .map((row) => {
        const action = bytes.match(
          new RegExp(`"${row.name}"[\\s\\S]{0,600}?ON DELETE (restrict|set null|cascade|no action)`)
        );
        if (!action) throw new Error(`0081 has no FOREIGN KEY ${row.name}`);
        return [row.name, { ...projection.fks.get(row.name)!, onDelete: action[1] }] as const;
      })
  );
  const indexes = new Map(
    PROJECTION.indexes
      .filter((row) => row.table === table && !row.concurrentlyBuilt)
      .map((row) => {
        // The three install-runs targets are `ADD CONSTRAINT`; the evidence identity target is
        // inline in its CREATE TABLE body. Both spell the constraint name then `UNIQUE(`.
        const found = bytes.match(new RegExp(`"${row.name}" UNIQUE\\(([a-z_," ]+)\\)`));
        if (!found) throw new Error(`0081 has no UNIQUE ${row.name}`);
        return [
          row.name,
          {
            columns: found[1].split(",").map((part) => part.trim().replaceAll('"', "")),
            predicate: null,
            unique: true,
          },
        ] as const;
      })
  );
  return Object.freeze({
    columns: projection.columns,
    checks,
    fks,
    indexes,
    uniques: projection.uniques,
  });
};

/** Composes the snapshot index entry into the exact companion/manifest bytes. */
const composeIndex = (table: string, entry: SnapshotIndex): string =>
  `CREATE ${entry.isUnique ? "UNIQUE " : ""}INDEX CONCURRENTLY "${entry.name}" ON "${table}" USING ${entry.method} (${entry.columns
    .map((column) =>
      column.isExpression ? column.expression : `"${column.expression}"${column.asc ? "" : " desc"}`
    )
    .join(",")})${entry.where ? ` WHERE ${entry.where}` : ""}`;

// --- In-file pure models (addendum correction 2: test-only, never prod). ---

export const CLASSIFIER_CAPS = Object.freeze({
  pageSize: 100,
  maxPages: 6,
  maxTotalRows: 512,
  maxQueries: 6,
} as const);
export const ROLLBACK_CLASSIFIER_LIMIT = "rollback_classifier_limit" as const;
export const MAX_LOCK_RETRIES = 3;
export const LOCK_RETRY_BACKOFF_MS: readonly number[] = Object.freeze([25, 50, 100]);

export type ClassifierCursor = Readonly<{ createdAt: string; id: string }>;
export type ClassifierRow = Readonly<{ id: string; createdAt: string }>;
export type ClassifierPage = Readonly<{ rows: readonly ClassifierRow[]; hasMore: boolean }>;
export type ClassifierCap = "pageSize" | "maxPages" | "maxTotalRows" | "maxQueries" | "cursor";
export type ClassifierInput = Readonly<{
  fetchPage: (cursor: ClassifierCursor | null) => Promise<ClassifierPage>;
  persist: (row: ClassifierRow) => Promise<void>;
  pageSize?: number;
  maxPages?: number;
  maxQueries?: number;
}>;
export type ClassifierLimitError = Error & { code: string; cap: ClassifierCap };

const classifierLimit = (cap: ClassifierCap): ClassifierLimitError =>
  Object.assign(new Error(`${ROLLBACK_CLASSIFIER_LIMIT}: ${cap}`), {
    code: ROLLBACK_CLASSIFIER_LIMIT,
    cap,
  }) as ClassifierLimitError;

/** Bounded descending-cursor classifier: persists every accepted row in order, refuses one-over every cap first. */
export const modelBoundedNewerApplies = async (
  input: ClassifierInput
): Promise<ClassifierRow[]> => {
  const pageSize = input.pageSize ?? CLASSIFIER_CAPS.pageSize;
  const maxPages = input.maxPages ?? CLASSIFIER_CAPS.maxPages;
  const maxQueries = input.maxQueries ?? CLASSIFIER_CAPS.maxQueries;
  if (pageSize > CLASSIFIER_CAPS.pageSize) throw classifierLimit("pageSize");
  if (maxPages > CLASSIFIER_CAPS.maxPages) throw classifierLimit("maxPages");
  if (maxQueries > CLASSIFIER_CAPS.maxQueries) throw classifierLimit("maxQueries");
  const accepted: ClassifierRow[] = [];
  const seen = new Set<string>();
  let cursor: ClassifierCursor | null = null;
  // One bounded query per page, so both budgets advance together while EACH one still bounds the loop
  // on its own: a 7th-query need refuses as `maxQueries`, a page past a smaller page budget as `maxPages`.
  for (let page = 1; ; page += 1) {
    if (page > maxQueries) throw classifierLimit("maxQueries");
    if (page > maxPages) throw classifierLimit("maxPages"); // non-terminating pagination
    const next = await input.fetchPage(cursor);
    for (const row of next.rows) {
      const key = `${row.createdAt}|${row.id}`;
      if (seen.has(key)) throw classifierLimit("cursor");
      seen.add(key);
      if (accepted.length + 1 > CLASSIFIER_CAPS.maxTotalRows) throw classifierLimit("maxTotalRows");
      accepted.push(row);
      await input.persist(row);
    }
    const last = next.rows.at(-1);
    if (!next.hasMore || next.rows.length < pageSize || !last) return accepted;
    cursor = { createdAt: last.createdAt, id: last.id };
  }
};

export type AuthorityDecision = "apply" | "resume" | "noop" | "conflict";
export type AuthorityProjection = Readonly<{
  identityMatches: boolean;
  versionCurrent: boolean;
  sameOperationCompletedOrRunning: boolean;
  sameOperationPending: boolean;
  targetAlreadyAuthoritative: boolean;
  newerConflictingApply: boolean;
}>;
/** Locked-reread decision table: conflict, resume, noop, then claim. */
export const modelRollbackAuthorityDecision = (input: AuthorityProjection): AuthorityDecision => {
  if (!input.identityMatches || input.newerConflictingApply || !input.versionCurrent)
    return "conflict";
  if (input.sameOperationPending) return "resume";
  if (input.sameOperationCompletedOrRunning || input.targetAlreadyAuthoritative) return "noop";
  return "apply";
};

/** The closed set of constraint/index names that map to a domain conflict code. */
const AUTHORITY_CODED_NAMES: readonly string[] = Object.freeze([
  "solution_kit_starter_apply_owners_source_identity_fk",
  "solution_kit_legacy_progress_rollback_relation_fk",
  "solution_kit_legacy_progress_source_evidence_fk",
  "solution_kit_legacy_template_evidence_plan_fk",
  "solution_kit_install_runs_rollback_of_run_id_solution_kit_install_runs_id_fk",
  "solution_kit_starter_apply_owners_active_idx",
  "solution_kit_runs_active_rollback_source_idx",
  "solution_kit_legacy_template_evidence_source_position_key",
  "solution_kit_legacy_template_evidence_source_key",
  "solution_kit_legacy_template_evidence_identity_key",
]);
export const AUTHORITY_CONSTRAINT_CODES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(AUTHORITY_CODED_NAMES.map((name) => [name, "rollback_authority_conflict"]))
);
/** Fails closed: absent, unknown or non-catalog names never map to a domain code. */
export const modelAuthorityConstraintCode = (constraint: string | null): string =>
  (constraint !== null && AUTHORITY_CONSTRAINT_CODES[constraint]) || "rollback_constraint_unknown";

export type LockFailure = Readonly<{
  kind: "deadlock" | "lock_timeout" | "authority_conflict" | "version_conflict";
}>;
export type LockRetryResult = Readonly<{
  attempts: number;
  backoff: readonly number[];
  httpStatus: 409 | 503 | 200;
  code: string;
}>;
const LOCK_CODES = Object.freeze({
  deadlock: { code: "rollback_deadlock", httpStatus: 503 as const },
  lock_timeout: { code: "rollback_lock_timeout", httpStatus: 503 as const },
  authority_conflict: { code: "rollback_authority_conflict", httpStatus: 409 as const },
  version_conflict: { code: "rollback_version_conflict", httpStatus: 409 as const },
});
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
/** Retries only the two transient lock outcomes; conflicts are terminal at 409. */
export const modelLockRetry = async (
  attempt: () => Promise<LockFailure | null>
): Promise<LockRetryResult> => {
  const backoff: number[] = [];
  for (let round = 0; round <= MAX_LOCK_RETRIES; round += 1) {
    const failure = await attempt();
    if (failure === null) return { attempts: round, backoff, httpStatus: 200, code: "ok" };
    if (
      failure.kind === "authority_conflict" ||
      failure.kind === "version_conflict" ||
      round === MAX_LOCK_RETRIES
    ) {
      const mapped = LOCK_CODES[failure.kind];
      return {
        attempts: round + (failure.kind === "deadlock" || failure.kind === "lock_timeout" ? 1 : 0),
        backoff,
        httpStatus: mapped.httpStatus,
        code: mapped.code,
      };
    }
    const delay = LOCK_RETRY_BACKOFF_MS[round];
    backoff.push(delay);
    await sleep(delay);
  }
  throw new Error("unreachable");
};

export type FkAllowlistEntry = ExactAuthorityForeignKey & {
  sourceSchema: "public";
  referencedSchema: string | null;
  kind: "foreign_key";
  ordinal: number;
};
const sameOrder = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((name, index) => name === right[index]);

/** Fail-closed FK allowlist: exact target, both exact actions and the exact ordinal order, position-by-position. */
export const modelAssertFkAllowlist = (
  entries: readonly FkAllowlistEntry[],
  expected?: readonly ExactAuthorityForeignKey[]
): void => {
  if (entries.length === 0) throw new Error("empty allowlist");
  if (expected && entries.length !== expected.length) throw new Error("allowlist size drift");
  const allowed = new Set(["NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT"]);
  const seen = new Set<string>();
  entries.forEach((entry, ordinal) => {
    if (entry.kind !== "foreign_key") throw new Error(`kind ${entry.kind}`);
    if (!allowed.has(entry.onDelete) || !allowed.has(entry.onUpdate))
      throw new Error("unknown action");
    if (entry.sourceSchema !== "public" || entry.columns.length === 0)
      throw new Error("source shape");
    if (!entry.targetTable || entry.targetColumns.length !== entry.columns.length)
      throw new Error("target shape");
    if (entry.ordinal !== ordinal) throw new Error("ordinal drift");
    if (new Set(entry.columns).size !== entry.columns.length)
      throw new Error("duplicate column ordinal");
    if (new Set(entry.targetColumns).size !== entry.targetColumns.length)
      throw new Error("duplicate target ordinal");
    const identity = `${entry.name}#${entry.columns.join(",")}`;
    if (seen.has(identity)) throw new Error("duplicate entry");
    seen.add(identity);
    const reference = expected?.[ordinal];
    if (!reference) return;
    const drift =
      entry.name !== reference.name
        ? "name"
        : entry.table !== reference.table
          ? "source table"
          : !sameOrder(entry.columns, reference.columns)
            ? "source column"
            : entry.targetTable !== reference.targetTable
              ? "referenced table"
              : !sameOrder(entry.targetColumns, reference.targetColumns)
                ? "referenced column"
                : entry.onDelete !== reference.onDelete || entry.onUpdate !== reference.onUpdate
                  ? "action"
                  : null;
    if (drift) throw new Error(`${drift} drift`);
  });
};

export type AuthorityPreflightCounts = Readonly<{
  legacyRollbackRowsWithNullSource: number;
  nonRollbackRowsWithSource: number;
  ownerSourcePackageActorMismatch: number;
  duplicateTemplateIdentityOrPosition: number;
  progressEvidenceMismatch: number;
  proofStatusMismatch: number;
  duplicateRunningRollbackSources: number;
}>;
/** Any nonzero count aborts the migration before a single customer row is rewritten. */
export const modelAssertAuthorityPreflight = (counts: AuthorityPreflightCounts): void => {
  const nonzero = Object.entries(counts).filter((entry) => entry[1] !== 0);
  if (nonzero.length > 0)
    throw new Error(
      `task551_preflight_conflicts: ${nonzero.map(([name, value]) => `${name}=${value}`).join(", ")}`
    );
};

// --- Live-half gating: clean skip when no database is reachable. ---

process.env.DATABASE_URL ??= "postgres://localhost/nextless_test";
const hasDb = await db.execute(sql`select 1`).then(
  () => true,
  () => false
);
const testIfDb = hasDb ? test : test.skip;

const pgCode = (error: unknown): string =>
  (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code ?? "";
const pgConstraint = (error: unknown): string | null =>
  (error as { constraint?: string })?.constraint ??
  (error as { cause?: { constraint?: string } })?.cause?.constraint ??
  null;
const rejection = async (outcome: Promise<unknown>): Promise<unknown> =>
  outcome.then(
    () => null,
    (error: unknown) => error
  );
/** The driver returns a `{ rows }` envelope whose declared type omits it. */
const rowsOf = <T>(result: unknown): T[] => (result as { rows: T[] }).rows;

// --- Static half — always runs, DB-free. ---

test("the exported authority projection is complete, closed and self-consistent", () => {
  expect([
    PROJECTION.tables.length,
    PROJECTION.columns.length,
    PROJECTION.foreignKeys.length,
    PROJECTION.checks.length,
    PROJECTION.indexes.length,
    PROJECTION.namedConstraints.length,
    PROJECTION.assertedUniqueConstraints.length,
    PROJECTION.fkActionChanges.length,
  ]).toEqual([4, 49, 10, 6, 14, 9, 4, 1]);
  expect(PROJECTION.contract).toBe("coderso.task551.l03-rollback-authority@v1");
  for (const name of PROJECTION.namedConstraints)
    expect(
      PROJECTION.checks.some((entry) => entry.name === name) ||
        PROJECTION.foreignKeys.some((entry) => entry.name === name),
      name
    ).toBe(true);
  for (const entry of [...PROJECTION.columns, ...PROJECTION.indexes])
    expect(PROJECTION.tables).toContain(entry.table);
  expect(Object.isFrozen(PROJECTION)).toBe(true);
});

test("every authority surface is identical across module, snapshot and 0081 bytes", () => {
  for (const table of PROJECTION.tables) {
    const mod = moduleSurface(table);
    const snap = snapshotSurface(table);
    const mig = migrationSurface(table);
    const projected = PROJECTION.columns.filter((column) => column.table === table);
    const wholeTable = table !== "solution_kit_install_runs";
    for (const column of projected) {
      const moduleColumn = mod.columns.get(column.name);
      const snapColumn = snap.columns.get(column.name);
      expect(
        [moduleColumn?.type, moduleColumn?.notNull, moduleColumn?.default ?? null],
        `${table}.${column.name}`
      ).toEqual([column.sqlType, !column.nullable, column.defaultSql]);
      expect(
        [snapColumn?.type, snapColumn?.notNull, snapColumn?.default ?? null],
        `${table}.${column.name}`
      ).toEqual([column.sqlType, !column.nullable, column.defaultSql]);
    }
    // A whole-table projection covers every column; the install-runs one is the delta.
    if (wholeTable) expect(mod.columns.size, table).toBe(projected.length);
    expect(snap.columns.size, table).toBe(mod.columns.size);
    for (const [name, entry] of mod.checks) {
      expect(snap.checks.get(name), `${table} ${name}`).toBe(entry);
      expect(mig.checks.get(name), `${table} ${name}`).toBe(entry);
    }
    const projectedFks = PROJECTION.foreignKeys.filter((row) => row.table === table);
    if (wholeTable) expect(mod.fks.size, table).toBe(projectedFks.length);
    for (const row of projectedFks) {
      const entry = mod.fks.get(row.name);
      expect(
        [entry?.columns, entry?.targetTable, entry?.targetColumns, entry?.onDelete],
        row.name
      ).toEqual([row.columns, row.targetTable, row.targetColumns, "restrict"]);
      expect([snap.fks.get(row.name), mig.fks.get(row.name)], row.name).toEqual([entry, entry]);
    }
    for (const [name, entry] of mod.indexes) {
      expect(
        [
          snap.indexes.get(name)?.columns,
          snap.indexes.get(name)?.predicate,
          snap.indexes.get(name)?.unique,
        ],
        `${table} ${name}`
      ).toEqual([entry.columns, entry.predicate, entry.unique]);
    }
    for (const [name, entry] of mod.uniques)
      expect([snap.uniques.get(name)?.columns, mig.indexes.get(name)?.columns], name).toEqual([
        entry.columns,
        entry.columns,
      ]);
    // Exact member counts per table: an EXTRA authority check/index/unique fails like a missing one.
    expect([mod.checks.size, mod.indexes.size, mod.uniques.size], `${table} module`).toEqual([
      ...MEMBER_COUNTS[table],
    ]);
    expect([snap.checks.size, snap.indexes.size, snap.uniques.size], `${table} snapshot`).toEqual([
      ...MEMBER_COUNTS[table],
    ]);
    expect(
      PROJECTION.checks.filter((row) => row.table === table),
      `${table} projected checks`
    ).toHaveLength(MEMBER_COUNTS[table][0]);
    expect(
      PROJECTION.indexes.filter((row) => row.table === table),
      `${table} projected rows`
    ).toHaveLength(
      MEMBER_COUNTS[table][1] +
        MEMBER_COUNTS[table][2] -
        (table === "solution_kit_install_runs" ? 6 : 0)
    );
  }
});

test("the install-runs delta is six new nullable columns plus the pre-existing FK column, with three uniques and three checks", () => {
  const table = "solution_kit_install_runs";
  const bytes = migrationBytes();
  const delta = PROJECTION.columns.filter((column) => column.table === table);
  expect(delta).toHaveLength(7);
  for (const column of delta) {
    expect(column.nullable, column.name).toBe(true);
    expect(column.defaultSql, column.name).toBeNull();
    // Six of the seven are new ADD COLUMNs; `rollback_of_run_id` only changes its FK action.
    if (column.name !== "rollback_of_run_id")
      expect(bytes).toContain(`ADD COLUMN "${column.name}" ${column.sqlType}`);
  }
  expect(moduleSurface(table).checks.size).toBe(3);
  expect(snapshotSurface(table).checks.size).toBe(3);
  expect(migrationSurface(table).checks.size).toBe(3);
  const uniques = PROJECTION.indexes
    .filter((row) => row.table === table && !row.concurrentlyBuilt)
    .map((row) => row.name);
  expect([...snapshotSurface(table).uniques.keys()].sort()).toEqual([...uniques].sort());
  for (const name of uniques) expect(bytes).toContain(`ADD CONSTRAINT "${name}" UNIQUE(`);
});

test("the fourteen mandatory index rows are byte-accurate across snapshot, companion and manifest", () => {
  const companion = companionBytes();
  const members = new Map(TASK551_ONLINE_INDEX_MEMBERS.map((member) => [member.name, member]));
  for (const row of PROJECTION.indexes) {
    const surface = snapshotSurface(row.table);
    const snap = row.concurrentlyBuilt
      ? surface.indexes.get(row.name)
      : surface.uniques.get(row.name);
    expect(snap, row.name).toBeDefined();
    expect([snap?.columns, snap?.predicate ?? null, snap?.unique], row.name).toEqual([
      row.columns,
      row.predicate,
      row.unique,
    ]);
    if (!row.concurrentlyBuilt) {
      expect(
        [
          members.has(row.name),
          PROJECTION.assertedUniqueConstraints.includes(row.name),
          companion.includes(row.name),
        ],
        row.name
      ).toEqual([false, true, false]);
      continue;
    }
    const member = members.get(row.name);
    expect(member, row.name).toBeDefined();
    expect([member?.unique, member?.table], row.name).toEqual([row.unique, row.table]);
    const composed = composeIndex(
      row.table,
      snapshotTable(SNAPSHOT, row.table).indexes[row.name] as SnapshotIndex
    );
    expect(composed, row.name).toBe(member?.createSql);
    // The companion carries the CREATE bytes; the guarded DROP is orchestrator-only.
    expect(
      [companion.includes(`${composed};`), companion.includes("DROP INDEX")],
      row.name
    ).toEqual([true, false]);
  }
  expect(PROJECTION.indexes.filter((row) => row.concurrentlyBuilt)).toHaveLength(10);
  expect(PROJECTION.indexes.filter((row) => !row.concurrentlyBuilt)).toHaveLength(4);
});

test("the nine named constraints and the relation check are byte-exactly the landed definitions", () => {
  const relation = PROJECTION.checks.find(
    (entry) => entry.name === "solution_kit_runs_rollback_relation_chk"
  );
  expect(relation?.definition).toBe(
    normalizedSql(
      '("solution_kit_install_runs"."mode" = \'rollback\') = ("solution_kit_install_runs"."rollback_of_run_id" IS NOT NULL)'
    )
  );
  const closedGrammar: Record<string, readonly string[]> = {
    solution_kit_runs_legacy_template_plan_chk: ["BETWEEN 0 AND 100", "= 1", "^[0-9a-f]{64}$"],
    solution_kit_runs_rollback_proof_state_chk: [
      "'complete'",
      "'zero_net'",
      "finished_at",
      "^[0-9a-f]{64}$",
    ],
    solution_kit_starter_apply_owners_state_chk: [
      "coderso.starter-content-rollback@v1",
      "shell_write_applied",
    ],
    solution_kit_legacy_progress_state_chk: [
      "coderso.legacy-template-rollback-progress@v1",
      "failed_no_mutation",
      "source_restored",
    ],
  };
  for (const entry of PROJECTION.checks) {
    const mod = moduleSurface(entry.table).checks.get(entry.name);
    const snap = snapshotSurface(entry.table).checks.get(entry.name);
    expect(
      [mod, entry.definition, migrationSurface(entry.table).checks.get(entry.name)],
      entry.name
    ).toEqual([snap, snap, snap]);
    for (const fragment of closedGrammar[entry.name] ?? [])
      expect(entry.definition.includes(fragment), `${entry.name}: ${fragment}`).toBe(true);
  }
});

test("SET NULL to RESTRICT is the sole existing FK action change in the migration scope", () => {
  const bytes = migrationBytes();
  const [change] = PROJECTION.fkActionChanges;
  const before =
    parseSnapshot(PREVIOUS_SNAPSHOT).tables[`public.${change.table}`].foreignKeys[
      change.constraintName
    ];
  const after = snapshotTable(SNAPSHOT, change.table).foreignKeys[change.constraintName];
  expect([before.onDelete, after.onDelete, after.onUpdate, change.from, change.to]).toEqual([
    "set null",
    "restrict",
    before.onUpdate,
    "SET NULL",
    "RESTRICT",
  ]);
  expect(bytes).toContain(`DROP CONSTRAINT "${change.constraintName}"`);
  expect(bytes).toMatch(
    new RegExp(`ADD CONSTRAINT "${change.constraintName}" [\\s\\S]{0,400}ON DELETE restrict`)
  );
  // The swap is the only FK action change anywhere in the migration scope.
  const previous = parseSnapshot(PREVIOUS_SNAPSHOT).tables;
  const changed = Object.entries(parseSnapshot(SNAPSHOT).tables).flatMap(([key, current]) =>
    Object.entries(current.foreignKeys)
      .filter(
        ([name, currentFk]) =>
          previous[key]?.foreignKeys[name] &&
          previous[key]?.foreignKeys[name]?.onDelete !== currentFk.onDelete
      )
      .map(([name]) => name)
  );
  expect(changed).toEqual([change.constraintName]);
  expect(bytes).not.toMatch(/ON DELETE (set null|cascade)/);
});

test("the fail-closed FK allowlist validates exact entries and refuses every one-over drift", () => {
  const build = (): FkAllowlistEntry[] =>
    PROJECTION.foreignKeys.map((entry, ordinal) => ({
      ...entry,
      sourceSchema: "public",
      referencedSchema: entry.targetTable === "users" ? "public" : null,
      kind: "foreign_key",
      ordinal,
    }));
  const allowlist = build();
  expect(() => modelAssertFkAllowlist(allowlist, PROJECTION.foreignKeys)).not.toThrow();
  expect(allowlist.every((entry) => entry.onDelete === "RESTRICT")).toBe(true);
  expect(
    allowlist.filter((entry) => entry.targetTable === "solution_kit_install_runs")
  ).toHaveLength(8);
  const oneOver = (mutate: (entry: FkAllowlistEntry) => void): void => {
    for (let index = 0; index < allowlist.length; index += 1) {
      const draft = build();
      mutate(draft[index] as FkAllowlistEntry);
      expect(
        () => modelAssertFkAllowlist(draft, PROJECTION.foreignKeys),
        `index ${index}`
      ).toThrow();
    }
  };
  oneOver((entry) => Object.assign(entry, { onDelete: "CASCADE" }));
  oneOver((entry) => Object.assign(entry, { onUpdate: "CASCADE" }));
  oneOver((entry) => Object.assign(entry, { kind: "unique" as const }));
  oneOver((entry) => Object.assign(entry, { targetTable: "elsewhere" }));
  oneOver((entry) => Object.assign(entry, { ordinal: entry.ordinal + 1 }));
  oneOver((entry) => Object.assign(entry, { columns: entry.columns.slice(0, -1) }));
  oneOver((entry) => Object.assign(entry, { targetColumns: entry.targetColumns.slice(0, -1) }));
  expect(() =>
    modelAssertFkAllowlist([...allowlist, allowlist[0] as FkAllowlistEntry], PROJECTION.foreignKeys)
  ).toThrow();
  expect(() => modelAssertFkAllowlist([])).toThrow();
  expect(() => modelAssertFkAllowlist(allowlist.slice(0, -1), PROJECTION.foreignKeys)).toThrow();
  // Position-by-position: every entry equals its declared reference exactly.
  allowlist.forEach((entry, ordinal) => {
    const reference = PROJECTION.foreignKeys[ordinal];
    expect([
      entry.name,
      entry.table,
      entry.columns,
      entry.targetColumns,
      entry.onDelete,
      entry.onUpdate,
    ]).toEqual([
      reference?.name,
      reference?.table,
      reference?.columns,
      reference?.targetColumns,
      reference?.onDelete,
      reference?.onUpdate,
    ]);
  });
  const sourceIdentity = allowlist.find(
    (entry) => entry.name === "solution_kit_starter_apply_owners_source_identity_fk"
  );
  expect([sourceIdentity?.columns, sourceIdentity?.targetColumns]).toEqual([
    ["source_run_id", "package_key", "actor_id"],
    ["id", "kit_id", "actor_id"],
  ]);
});

test("0081 rewrites no customer row and the in-file preflight model refuses any nonzero count", () => {
  const bytes = migrationBytes();
  const runs = "solution_kit_install_runs";
  expect(bytes).not.toMatch(new RegExp(`update\\s[^;]{0,400}"?${runs}`, "i"));
  expect(bytes).not.toMatch(new RegExp(`delete\\s+from[^;]{0,400}"?${runs}`, "i"));
  expect(bytes.toLowerCase()).not.toContain("truncate");
  const mutations = bytes
    .split("--> statement-breakpoint")
    .map((statement) => normalizedSql(statement).toLowerCase())
    .filter((statement) => /^(update|delete|insert|truncate)\b/.test(statement));
  expect(mutations).toEqual([]);
  const clean: AuthorityPreflightCounts = {
    legacyRollbackRowsWithNullSource: 0,
    nonRollbackRowsWithSource: 0,
    ownerSourcePackageActorMismatch: 0,
    duplicateTemplateIdentityOrPosition: 0,
    progressEvidenceMismatch: 0,
    proofStatusMismatch: 0,
    duplicateRunningRollbackSources: 0,
  };
  expect(() => modelAssertAuthorityPreflight(clean)).not.toThrow();
  for (const key of Object.keys(clean) as (keyof AuthorityPreflightCounts)[]) {
    expect(() => modelAssertAuthorityPreflight({ ...clean, [key]: 1 })).toThrow(
      new RegExp(`${key}=1`)
    );
  }
});

test("no authority index or check derives authority from options, summary or a nullable actor", () => {
  // Contract scope is "anywhere in the landed repository": db, services, server and scripts too.
  const scanTargets = [
    ...walk(path.join(ROOT, "core/db")),
    ...walk(path.join(ROOT, "core/services")),
    ...walk(path.join(ROOT, "core/server")),
    ...walk(path.join(ROOT, "scripts")),
  ];
  expect(scanTargets.length).toBeGreaterThan(150);
  const authorityNames = [
    ...PROJECTION.indexes.map((row) => row.name),
    ...PROJECTION.namedConstraints,
  ];
  const forbidden = [
    /options\s*->/i,
    /->>?\s*'options/i,
    /jsonb_extract_path/i,
    /summary\s*->/i,
    /->>?\s*'summary/i,
  ];
  const offenders: string[] = [];
  for (const file of scanTargets) {
    const text = readFileSync(file, "utf8");
    for (const name of authorityNames) {
      const at = text.indexOf(name);
      if (
        at >= 0 &&
        forbidden.some((pattern) => pattern.test(text.slice(Math.max(0, at - 400), at + 800)))
      )
        offenders.push(`${path.relative(ROOT, file)}:${name}`);
    }
  }
  expect(offenders).toEqual([]);
  // The active-owner predicate is released_at-based: no nullable-actor loophole.
  const ownersActive = PROJECTION.indexes.find(
    (row) => row.name === "solution_kit_starter_apply_owners_active_idx"
  );
  const runsActive = PROJECTION.indexes.find(
    (row) => row.name === "solution_kit_runs_active_rollback_source_idx"
  );
  expect(ownersActive?.predicate).toBe("released_at IS NULL");
  expect(ownersActive?.predicate?.toLowerCase()).not.toContain("actor_id");
  expect(ownersActive?.columns).toEqual(["package_key", "actor_id"]);
  expect(runsActive?.predicate).toBe(
    "mode = 'rollback' AND status = 'running' AND rollback_of_run_id IS NOT NULL"
  );
  for (const table of [
    "solution_kit_starter_apply_owners",
    "solution_kit_legacy_template_evidence",
    "solution_kit_legacy_rollback_progress",
  ] as const) {
    for (const definition of moduleSurface(table).checks.values()) {
      expect([
        definition.toLowerCase().includes("options"),
        definition.toLowerCase().includes("summary"),
      ]).toEqual([false, false]);
    }
  }
});

test("the decision table resolves claim, resume, reject and recovery exactly as contracted", () => {
  const base: AuthorityProjection = {
    identityMatches: true,
    versionCurrent: true,
    sameOperationCompletedOrRunning: false,
    sameOperationPending: false,
    targetAlreadyAuthoritative: false,
    newerConflictingApply: false,
  };
  expect(modelRollbackAuthorityDecision(base)).toBe("apply");
  expect(modelRollbackAuthorityDecision({ ...base, sameOperationPending: true })).toBe("resume");
  expect(modelRollbackAuthorityDecision({ ...base, targetAlreadyAuthoritative: true })).toBe(
    "noop"
  );
  expect(modelRollbackAuthorityDecision({ ...base, sameOperationCompletedOrRunning: true })).toBe(
    "noop"
  );
  expect(modelRollbackAuthorityDecision({ ...base, versionCurrent: false })).toBe("conflict");
  expect(modelRollbackAuthorityDecision({ ...base, identityMatches: false })).toBe("conflict");
  expect(modelRollbackAuthorityDecision({ ...base, newerConflictingApply: true })).toBe("conflict");
  expect(
    modelRollbackAuthorityDecision({ ...base, newerConflictingApply: true, versionCurrent: false })
  ).toBe("conflict");
});

test("the constraint map is closed: recognized names map, plan_fk maps, unknown names fail closed", () => {
  for (const [name, code] of Object.entries(AUTHORITY_CONSTRAINT_CODES))
    expect(modelAuthorityConstraintCode(name), name).toBe(code);
  expect(modelAuthorityConstraintCode("totally_unknown_constraint")).toBe(
    "rollback_constraint_unknown"
  );
  expect(modelAuthorityConstraintCode("")).toBe("rollback_constraint_unknown");
  expect(modelAuthorityConstraintCode(null)).toBe("rollback_constraint_unknown");
  const mapped = new Set(Object.keys(AUTHORITY_CONSTRAINT_CODES));
  expect(mapped.has("solution_kit_legacy_template_evidence_plan_fk")).toBe(true);
  expect(mapped.size).toBe(10);
  for (const name of PROJECTION.namedConstraints) {
    if (PROJECTION.foreignKeys.some((row) => row.name === name))
      expect(mapped.has(name), name).toBe(true);
  }
});

test("the classifier caps fail one-over independently at 100/101, 6/7, 512/513 and 6/7 with no write", async () => {
  const syntheticRows = (total: number, seed: string): ClassifierRow[] =>
    Array.from({ length: total }, (_unused, index) => ({
      id: `${seed}-${String(index).padStart(4, "0")}`,
      createdAt: `2026-01-01T00:00:${String(index % 60).padStart(2, "0")}`,
    }));
  const pageOf =
    (rows: readonly ClassifierRow[], size: number) => async (): Promise<ClassifierPage> => ({
      rows: rows.slice(0, size),
      hasMore: rows.length > size,
    });
  const persist = async (): Promise<void> => {
    throw new Error("a refusal that accepts no row must never persist");
  };
  await expect(
    modelBoundedNewerApplies({
      fetchPage: pageOf(syntheticRows(101, "big"), 101),
      persist,
      pageSize: 101,
    })
  ).rejects.toThrow(/rollback_classifier_limit: pageSize/);
  await expect(
    modelBoundedNewerApplies({
      fetchPage: pageOf(syntheticRows(20, "p"), 10),
      persist,
      maxPages: 7,
    })
  ).rejects.toThrow(/rollback_classifier_limit: maxPages/);
  const wide = syntheticRows(600, "w");
  const slicePage =
    (
      source: readonly ClassifierRow[],
      size: number,
      count: (cursor: ClassifierCursor | null) => void
    ) =>
    async (cursor: ClassifierCursor | null): Promise<ClassifierPage> => {
      count(cursor);
      const start = cursor ? source.findIndex((row) => row.id === cursor.id) + 1 : 0;
      return { rows: source.slice(start, start + size), hasMore: start + size < source.length };
    };
  // The row cap refuses the 513th row AFTER persisting the 512 admissible ones.
  let widePersisted = 0;
  await expect(
    modelBoundedNewerApplies({
      fetchPage: slicePage(wide, 100, () => {}),
      persist: async () => {
        widePersisted += 1;
      },
    })
  ).rejects.toThrow(/rollback_classifier_limit: maxTotalRows/);
  expect(widePersisted).toBe(CLASSIFIER_CAPS.maxTotalRows);
  await expect(
    modelBoundedNewerApplies({
      fetchPage: pageOf(syntheticRows(8, "q"), 2),
      persist,
      pageSize: 2,
      maxPages: 7,
    })
  ).rejects.toThrow(/rollback_classifier_limit/);
  // The query budget is independent: requesting 7 is refused before any query.
  let refusedQueries = 0;
  const counting = async (): Promise<ClassifierPage> => {
    refusedQueries += 1;
    return { rows: [], hasMore: false };
  };
  await expect(
    modelBoundedNewerApplies({ fetchPage: counting, persist, maxQueries: 7 })
  ).rejects.toThrow(/rollback_classifier_limit: maxQueries/);
  expect(refusedQueries).toBe(0);
  let seventhQueries = 0,
    seventhPersisted = 0;
  await expect(
    modelBoundedNewerApplies({
      fetchPage: slicePage(syntheticRows(481, "q7"), 80, () => (seventhQueries += 1)),
      persist: async () => {
        seventhPersisted += 1;
      },
      pageSize: 80,
    })
  ).rejects.toThrow(/rollback_classifier_limit: maxQueries/);
  expect(seventhQueries).toBe(CLASSIFIER_CAPS.maxQueries);
  expect(seventhPersisted).toBe(6 * 80);
  // Exactly at every boundary the classifier accepts, descending by (createdAt, id).
  const boundary = syntheticRows(512, "ok");
  let boundaryQueries = 0;
  const exact = await modelBoundedNewerApplies({
    fetchPage: slicePage(boundary, 100, () => (boundaryQueries += 1)),
    persist: async () => {},
  });
  expect(exact).toHaveLength(512);
  expect(boundaryQueries).toBe(CLASSIFIER_CAPS.maxQueries);
});

test("cursor pagination terminates on exhaustion, refuses cycles, and never persists on a limit", async () => {
  const rows: ClassifierRow[] = Array.from({ length: 12 }, (_unused, index) => ({
    id: `c-${String(index).padStart(2, "0")}`,
    createdAt: "2026-02-02T00:00:00",
  }));
  const window =
    (source: readonly ClassifierRow[], size: number, sideEffect: () => void) =>
    async (cursor: ClassifierCursor | null): Promise<ClassifierPage> => {
      sideEffect();
      const start = cursor ? source.findIndex((row) => row.id === cursor.id) + 1 : 0;
      return { rows: source.slice(start, start + size), hasMore: start + size < source.length };
    };
  let queries = 0;
  const persistedIds: string[] = [];
  const collected = await modelBoundedNewerApplies({
    fetchPage: window(rows, 5, () => (queries += 1)),
    persist: async (row) => {
      persistedIds.push(row.id);
    },
    pageSize: 5,
  });
  expect(collected).toHaveLength(12);
  expect(persistedIds).toEqual(collected.map((row) => row.id));
  expect(queries).toBe(3);
  // A full page repeating the same pairs is a cursor cycle, not exhaustion.
  let cycleReads = 0;
  const cyclePage = async (): Promise<ClassifierPage> => {
    cycleReads += 1;
    return { rows: rows.slice(0, 5), hasMore: true };
  };
  await expect(
    modelBoundedNewerApplies({ fetchPage: cyclePage, persist: async () => {}, pageSize: 5 })
  ).rejects.toThrow(/rollback_classifier_limit: cursor/);
  expect(cycleReads).toBe(2);
  // Non-terminating pagination stops at the page budget: the accepted prefix is persisted once, the repeated page is not.
  let persisted = 0;
  const neverEnding = async (): Promise<ClassifierPage> => ({
    rows: rows.slice(0, 5),
    hasMore: true,
  });
  await expect(
    modelBoundedNewerApplies({
      fetchPage: neverEnding,
      persist: async () => {
        persisted += 1;
      },
      pageSize: 5,
      maxPages: 1,
    })
  ).rejects.toThrow(/rollback_classifier_limit/);
  expect(persisted).toBe(5);
});

test("lock retries are bounded to 25/50/100 ms and map 409/503 exactly as contracted", async () => {
  let deadlockRounds = 0;
  const deadlocked = await modelLockRetry(async () =>
    (deadlockRounds += 1) <= 2 ? { kind: "deadlock" } : null
  );
  expect(deadlocked.backoff).toEqual([25, 50]);
  expect(deadlocked.attempts).toBe(2);
  expect(deadlocked.code).toBe("ok");
  let timeoutRounds = 0;
  const exhausted = await modelLockRetry(async () => {
    timeoutRounds += 1;
    return { kind: "lock_timeout" };
  });
  expect(timeoutRounds).toBe(4);
  expect([exhausted.backoff, exhausted.httpStatus, exhausted.code]).toEqual([
    [25, 50, 100],
    503,
    "rollback_lock_timeout",
  ]);
  expect([LOCK_RETRY_BACKOFF_MS, MAX_LOCK_RETRIES, Math.max(...LOCK_RETRY_BACKOFF_MS)]).toEqual([
    [25, 50, 100],
    3,
    100,
  ]);
  let conflictRounds = 0;
  const conflicted = await modelLockRetry(async () => {
    conflictRounds += 1;
    return { kind: "version_conflict" };
  });
  expect([conflictRounds, conflicted.backoff, conflicted.httpStatus, conflicted.code]).toEqual([
    1,
    [],
    409,
    "rollback_version_conflict",
  ]);
  const authority = await modelLockRetry(async () => ({ kind: "authority_conflict" }));
  expect([authority.httpStatus, authority.code]).toEqual([409, "rollback_authority_conflict"]);
});

// --- Live half — DB-gated fixtures and round trips. ---

const SCOPE = "task551-rollback-authority";
// Run-scoped fixture prefix: a shared DB can hold other processes' rows, so every predicate below is run-bounded.
const RUN = `${SCOPE}-${crypto.randomUUID().slice(0, 8)}`;
const digestOf = (seed: string): string => createHash("sha256").update(seed).digest("hex");
const unique = (suffix: string): string =>
  `${RUN}-${Date.now()}-${Math.random().toString(36).slice(2)}-${suffix}`;
const PLAN_DIGEST = digestOf("plan");
const fixture = {
  userId: crypto.randomUUID(),
  sourceRun: crypto.randomUUID(),
  rollbackRun: crypto.randomUUID(),
  secondRollbackRun: crypto.randomUUID(),
  evidenceId: crypto.randomUUID(),
  templateId: crypto.randomUUID(),
  packageKey: `${RUN}-package`,
};
const ownerEnvelope = (phase: string, active: boolean): string =>
  JSON.stringify({
    contract: "coderso.starter-content-rollback@v1",
    definitionDigest: digestOf("d"),
    phase,
    active,
  });
// Landed `solution_kit_starter_apply_owners_state_chk` couples both phase carriers: `envelope ->> 'phase' = phase`
// and the release arm `released_at IS NOT NULL AND phase = 'complete' AND envelope -> 'active' = 'false'`, so release
// must move the phase column and the envelope phase together or the UPDATE raises 23514 on that named check.
const releaseOwner = (runId: string): SQL =>
  sql`update solution_kit_starter_apply_owners set released_at = now() at time zone 'utc', phase = 'complete', envelope = ${ownerEnvelope("complete", false)}::jsonb where source_run_id = ${runId}`;
const insertOwner = (runId: string, phase: string): SQL =>
  sql`insert into solution_kit_starter_apply_owners (source_run_id, package_key, actor_id, contract, definition_digest, phase, envelope, envelope_digest) values (${runId}, ${fixture.packageKey}, ${fixture.userId}, 'coderso.starter-content-rollback@v1', ${digestOf("d")}, ${phase}, ${ownerEnvelope(phase, true)}::jsonb, ${digestOf("env")})`;
// Landed `solution_kit_legacy_template_evidence_state_chk`: success => `template_id IS NOT NULL AND
// safe_error_code IS NULL`, create => `before IS NULL AND after/action NOT NULL` — both satisfied here.
const insertEvidence = (id: string, position: number, key: string): SQL =>
  sql`insert into solution_kit_legacy_template_evidence (id, source_run_id, source_position, template_key, template_id, plan_digest, operation, status, before_snapshot, after_snapshot, rollback_action, evidence_digest) values (${id}, ${fixture.sourceRun}, ${position}, ${key}, ${fixture.templateId}, ${PLAN_DIGEST}, 'create', 'success', null, '{}'::jsonb, '{}'::jsonb, ${digestOf(`e${position}`)})`;

/** Redacted in-memory receipt: per-path write counts — a scoped WHERE for a delete, a row-tuple bound for a write, never by fiat. */
type ReceiptEntry = {
  path: string;
  kind: "insert" | "update" | "delete";
  target: string;
  bounded: boolean;
};
const receipt: ReceiptEntry[] = [];
const resetReceipt = (): void => {
  receipt.length = 0;
};
const boundedWrite = (kind: ReceiptEntry["kind"], statement: SQL): boolean => {
  const text = normalizedSql(dialect.sqlToQuery(statement).sql).toUpperCase();
  if (kind === "delete") return /\bWHERE\b/.test(text);
  // The write bound is the top-level value TUPLE count, not VALUES clauses (one clause, many tuples).
  const body = text.slice(text.indexOf("VALUES") + 6);
  let depth = 0;
  let tuples = 0;
  for (const character of body)
    if (character === "(") tuples += ++depth === 1 ? 1 : 0;
    else if (character === ")") depth -= 1;
  return tuples <= CLASSIFIER_CAPS.pageSize;
};
/** Executes and tallies one statement, so every path's write count is measured. */
const run = async (
  path: string,
  kind: ReceiptEntry["kind"],
  target: string,
  statement: SQL
): Promise<void> => {
  await db.execute(statement);
  receipt.push({ path, kind, target, bounded: boundedWrite(kind, statement) });
};

const childFirstCleanup = async (path: string): Promise<void> => {
  const statements: readonly [string, SQL][] = [
    [
      "solution_kit_legacy_rollback_progress",
      sql`delete from solution_kit_legacy_rollback_progress where rollback_run_id in (${fixture.rollbackRun}, ${fixture.secondRollbackRun}) or source_run_id = ${fixture.sourceRun}`,
    ],
    [
      "solution_kit_legacy_template_evidence",
      sql`delete from solution_kit_legacy_template_evidence where source_run_id = ${fixture.sourceRun}`,
    ],
    [
      "solution_kit_starter_apply_owners",
      sql`delete from solution_kit_starter_apply_owners where source_run_id = ${fixture.sourceRun} or actor_id = ${fixture.userId}`,
    ],
    [
      "solution_kit_install_runs",
      sql`delete from solution_kit_install_runs where id in (${fixture.rollbackRun}, ${fixture.secondRollbackRun}, ${fixture.sourceRun}) or kit_id like ${`${RUN}%`}`,
    ],
    ["users", sql`delete from users where id = ${fixture.userId}`],
  ];
  for (const [table, statement] of statements) await run(path, "delete", table, statement);
};

const seedFixture = async (path: string): Promise<void> => {
  await run(
    path,
    "insert",
    "users",
    sql`insert into users (id, email, password_hash, status) values (${fixture.userId}, ${unique("user")}, 'seed', 'active')`
  );
  // Carries the template-plan proof so the evidence plan FK matches (plan_chk: v1, 0..100, hex64).
  await run(
    path,
    "insert",
    "solution_kit_install_runs",
    sql`insert into solution_kit_install_runs (id, kit_id, mode, status, actor_id, legacy_template_plan_version, legacy_template_plan_count, legacy_template_plan_digest) values (${fixture.sourceRun}, ${fixture.packageKey}, 'apply', 'success', ${fixture.userId}, 1, 5, ${PLAN_DIGEST})`
  );
};

const assertZeroResidue = async (): Promise<void> => {
  const result = await db.execute(
    sql`select (select count(*) from solution_kit_starter_apply_owners where package_key = ${fixture.packageKey}) + (select count(*) from solution_kit_legacy_template_evidence where source_run_id = ${fixture.sourceRun}) + (select count(*) from solution_kit_legacy_rollback_progress where source_run_id = ${fixture.sourceRun}) + (select count(*) from solution_kit_install_runs where kit_id like ${`${RUN}%`}) as total`
  );
  expect(Number(rowsOf<{ total: string | number }>(result)[0]?.total)).toBe(0);
};

/** Per-path receipt proof: exact committed write counts, five child-first deletes, every entry bounded. */
const assertReceipt = (path: string, inserts: number, updates = 0): void => {
  const mine = receipt.filter((entry) => entry.path === path);
  expect([
    mine.filter((entry) => entry.kind === "insert").length,
    mine.filter((entry) => entry.kind === "update").length,
  ]).toEqual([inserts, updates]);
  expect(mine.filter((entry) => entry.kind === "delete").map((entry) => entry.target)).toEqual([
    "solution_kit_legacy_rollback_progress",
    "solution_kit_legacy_template_evidence",
    "solution_kit_starter_apply_owners",
    "solution_kit_install_runs",
    "users",
  ]);
  for (const entry of mine)
    expect(entry.bounded, `${path}:${entry.kind}:${entry.target}`).toBe(true);
};

afterAll(async () => {
  if (!hasDb) return;
  resetReceipt();
  await childFirstCleanup("afterAll");
  await assertZeroResidue();
});

testIfDb(
  "the evidence state matrix round-trips every admissible success arm and refuses the impossible non-success arms",
  async () => {
    await seedFixture("matrix");
    try {
      // Landed `solution_kit_legacy_template_evidence_state_chk`: success => template_id NOT NULL and safe_error_code
      // NULL; non-success => after/action NULL; create => before NULL and after/action NOT NULL; update/noop => after NOT NULL too.
      const arms: readonly (readonly [
        string,
        string,
        string | null,
        string | null,
        string | null,
      ])[] = [
        ["create", "success", null, "{}", "{}"],
        ["update", "success", "{}", "{}", "{}"],
        ["noop", "success", "{}", "{}", null],
      ];
      for (const [position, [operation, status, before, after, rollback]] of arms.entries()) {
        await run(
          "matrix",
          "insert",
          "solution_kit_legacy_template_evidence",
          sql`insert into solution_kit_legacy_template_evidence (id, source_run_id, source_position, template_key, template_id, plan_digest, operation, status, before_snapshot, after_snapshot, rollback_action, evidence_digest) values (${crypto.randomUUID()}, ${fixture.sourceRun}, ${position}, ${`${operation}-${position}`}, ${fixture.templateId}, ${PLAN_DIGEST}, ${operation}, ${status}, ${before}::jsonb, ${after}::jsonb, ${rollback}::jsonb, ${digestOf(`e${position}`)})`
        );
      }
      const stored = rowsOf<{ operation: string; status: string; safe_error_code: string | null }>(
        await db.execute(
          sql`select operation, status, safe_error_code from solution_kit_legacy_template_evidence where source_run_id = ${fixture.sourceRun} order by source_position`
        )
      );
      expect(stored.map((row) => [row.operation, row.status, row.safe_error_code])).toEqual(
        arms.map(([operation, status]) => [operation, status, null])
      );
      // The two remaining matrix arms cannot exist: refused by the named check (23514), never an index/FK.
      const impossible: readonly (readonly [string, string, string | null])[] = [
        ["update", "failed", "review_required"],
        ["noop", "skipped", null],
      ];
      for (const [index, [operation, status, safeError]] of impossible.entries()) {
        const refused = db.execute(
          sql`insert into solution_kit_legacy_template_evidence (id, source_run_id, source_position, template_key, plan_digest, operation, status, safe_error_code, evidence_digest) values (${crypto.randomUUID()}, ${fixture.sourceRun}, ${10 + index}, ${`${operation}-refused`}, ${PLAN_DIGEST}, ${operation}, ${status}, ${safeError}, ${digestOf(`r${index}`)})`
        );
        await expect(refused).rejects.toThrow();
        expect([pgCode(await rejection(refused)), pgConstraint(await rejection(refused))]).toEqual([
          "23514",
          "solution_kit_legacy_template_evidence_state_chk",
        ]);
      }
      // Release parity: an unreleased owner is active, a released one is not.
      await run(
        "matrix",
        "insert",
        "solution_kit_starter_apply_owners",
        insertOwner(fixture.sourceRun, "complete")
      );
      const activeOwners = async (): Promise<number> =>
        Number(
          rowsOf<{ n: number }>(
            await db.execute(
              sql`select count(*)::int as n from solution_kit_starter_apply_owners where package_key = ${fixture.packageKey} and released_at is null`
            )
          )[0]?.n
        );
      expect(await activeOwners()).toBe(1);
      await run(
        "matrix",
        "update",
        "solution_kit_starter_apply_owners",
        releaseOwner(fixture.sourceRun)
      );
      expect(await activeOwners()).toBe(0);
      // A terminal rollback run carries valid success+complete proof.
      await run(
        "matrix",
        "insert",
        "solution_kit_install_runs",
        sql`insert into solution_kit_install_runs (id, kit_id, mode, status, actor_id, rollback_of_run_id, finished_at, rollback_proof_version, rollback_proof_kind, rollback_proof_digest) values (${fixture.rollbackRun}, ${fixture.packageKey}, 'rollback', 'success', ${fixture.userId}, ${fixture.sourceRun}, now() at time zone 'utc', 1, 'complete', ${digestOf("proof")})`
      );
      expect(
        rowsOf<{ rollback_proof_kind: string }>(
          await db.execute(
            sql`select rollback_proof_kind from solution_kit_install_runs where id = ${fixture.rollbackRun}`
          )
        )[0]
      ).toEqual({ rollback_proof_kind: "complete" });
      // Every rollback progress state round-trips against a success evidence row.
      const evidence = rowsOf<{ id: string; source_position: number; evidence_digest: string }>(
        await db.execute(
          sql`select id, source_position, evidence_digest from solution_kit_legacy_template_evidence where source_run_id = ${fixture.sourceRun} and status = 'success' order by source_position`
        )
      );
      const states = ["rollback_committed", "source_restored", "failed_no_mutation"] as const;
      for (const [index, state] of states.entries()) {
        const row = evidence[index] as {
          id: string;
          source_position: number;
          evidence_digest: string;
        };
        const terminal = state !== "failed_no_mutation";
        await run(
          "matrix",
          "insert",
          "solution_kit_legacy_rollback_progress",
          sql`insert into solution_kit_legacy_rollback_progress (rollback_run_id, source_run_id, source_evidence_id, contract, source_status, source_position, rollback_position, state, source_evidence_digest, source_after_digest, rollback_target_digest, mutation_invalidation_event_key, compensation_invalidation_event_key, progress_digest) values (${fixture.rollbackRun}, ${fixture.sourceRun}, ${row.id}, 'coderso.legacy-template-rollback-progress@v1', 'success', ${row.source_position}, ${index}, ${state}, ${row.evidence_digest}, ${digestOf(`a${index}`)}, ${terminal ? digestOf(`t${index}`) : null}, ${terminal ? `evt-${index}` : null}, ${state === "source_restored" ? `cmp-${index}` : null}, ${digestOf(`p${index}`)})`
        );
      }
      const progress = rowsOf<{
        state: string;
        rollback_target_digest: string | null;
        mutation_invalidation_event_key: string | null;
        compensation_invalidation_event_key: string | null;
      }>(
        await db.execute(
          sql`select state, rollback_target_digest, mutation_invalidation_event_key, compensation_invalidation_event_key from solution_kit_legacy_rollback_progress where rollback_run_id = ${fixture.rollbackRun} order by rollback_position`
        )
      );
      expect(progress).toHaveLength(3);
      for (const row of progress) {
        expect(
          [
            row.rollback_target_digest !== null,
            row.mutation_invalidation_event_key !== null,
            row.compensation_invalidation_event_key !== null,
          ],
          row.state
        ).toEqual(
          row.state === "failed_no_mutation"
            ? [false, false, false]
            : row.state === "rollback_committed"
              ? [true, true, false]
              : [true, true, true]
        );
      }
    } finally {
      await childFirstCleanup("matrix");
      assertReceipt("matrix", 10, 1);
      await assertZeroResidue();
    }
  }
);

testIfDb(
  "RESTRICT refuses to orphan authority: source run, actor and evidence deletion each fail",
  async () => {
    await seedFixture("restrict");
    try {
      await run(
        "restrict",
        "insert",
        "solution_kit_starter_apply_owners",
        insertOwner(fixture.sourceRun, "before_captured")
      );
      await run(
        "restrict",
        "insert",
        "solution_kit_legacy_template_evidence",
        insertEvidence(fixture.evidenceId, 0, "kept")
      );
      // 0081 creates the single-column source_run_id FK before the composite one, so its trigger fires first.
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
      // `owners.actor_id -> users.id ON DELETE RESTRICT`: this user's only RESTRICT referencer (install_runs.actor_id is SET NULL).
      const actorDelete = db.execute(sql`delete from users where id = ${fixture.userId}`);
      await expect(actorDelete).rejects.toThrow();
      expect([
        pgCode(await rejection(actorDelete)),
        pgConstraint(await rejection(actorDelete)),
      ]).toEqual(["23503", "solution_kit_starter_apply_owners_actor_id_users_id_fk"]);
      // Deleting an evidence row still owning progress authority: refused.
      await run(
        "restrict",
        "insert",
        "solution_kit_install_runs",
        sql`insert into solution_kit_install_runs (id, kit_id, mode, status, actor_id, rollback_of_run_id) values (${fixture.rollbackRun}, ${fixture.packageKey}, 'rollback', 'running', ${fixture.userId}, ${fixture.sourceRun})`
      );
      await run(
        "restrict",
        "insert",
        "solution_kit_legacy_rollback_progress",
        sql`insert into solution_kit_legacy_rollback_progress (rollback_run_id, source_run_id, source_evidence_id, contract, source_status, source_position, rollback_position, state, source_evidence_digest, source_after_digest, progress_digest) values (${fixture.rollbackRun}, ${fixture.sourceRun}, ${fixture.evidenceId}, 'coderso.legacy-template-rollback-progress@v1', 'success', 0, 0, 'failed_no_mutation', ${digestOf("e0")}, ${digestOf("a0")}, ${digestOf("p0")})`
      );
      const evidenceDelete = db.execute(
        sql`delete from solution_kit_legacy_template_evidence where id = ${fixture.evidenceId}`
      );
      await expect(evidenceDelete).rejects.toThrow();
      expect(pgConstraint(await rejection(evidenceDelete))).toBe(
        "solution_kit_legacy_progress_source_evidence_fk"
      );
    } finally {
      await childFirstCleanup("restrict");
      assertReceipt("restrict", 6);
      await assertZeroResidue();
    }
  }
);

testIfDb(
  "duplicate evidence identity, position and key are each refused with exact constraint names",
  async () => {
    await seedFixture("identity");
    try {
      await run(
        "identity",
        "insert",
        "solution_kit_legacy_template_evidence",
        insertEvidence(fixture.evidenceId, 7, "shared-key")
      );
      const sameIdentity = db.execute(insertEvidence(fixture.evidenceId, 7, "shared-key"));
      await expect(sameIdentity).rejects.toThrow();
      expect([
        pgCode(await rejection(sameIdentity)),
        pgConstraint(await rejection(sameIdentity)),
      ]).toEqual(["23505", "solution_kit_legacy_template_evidence_pkey"]);
      const samePosition = db.execute(insertEvidence(crypto.randomUUID(), 7, "other-key"));
      await expect(samePosition).rejects.toThrow();
      expect([
        pgCode(await rejection(samePosition)),
        pgConstraint(await rejection(samePosition)),
      ]).toEqual(["23505", "solution_kit_legacy_template_evidence_source_position_key"]);
      const sameKey = db.execute(insertEvidence(crypto.randomUUID(), 8, "shared-key"));
      await expect(sameKey).rejects.toThrow();
      expect([pgCode(await rejection(sameKey)), pgConstraint(await rejection(sameKey))]).toEqual([
        "23505",
        "solution_kit_legacy_template_evidence_source_key",
      ]);
    } finally {
      await childFirstCleanup("identity");
      assertReceipt("identity", 3);
      await assertZeroResidue();
    }
  }
);

testIfDb(
  "a duplicate active owner is refused with the active-owner constraint name and a released slot is reusable",
  async () => {
    await seedFixture("owner-slot");
    const otherRun = crypto.randomUUID();
    try {
      await run(
        "owner-slot",
        "insert",
        "solution_kit_starter_apply_owners",
        insertOwner(fixture.sourceRun, "before_captured")
      );
      // Landed `solution_kit_starter_apply_owners_source_identity_fk` (source_run_id,package_key,actor_id) -> install_runs(id,kit_id,actor_id): the second run needs the SAME kit_id or the FK — not the index under test — refuses first.
      await run(
        "owner-slot",
        "insert",
        "solution_kit_install_runs",
        sql`insert into solution_kit_install_runs (id, kit_id, mode, status, actor_id) values (${otherRun}, ${fixture.packageKey}, 'apply', 'running', ${fixture.userId})`
      );
      const refused = db.execute(insertOwner(otherRun, "before_captured"));
      await expect(refused).rejects.toThrow();
      expect([pgCode(await rejection(refused)), pgConstraint(await rejection(refused))]).toEqual([
        "23505",
        "solution_kit_starter_apply_owners_active_idx",
      ]);
      // A released owner frees the (package_key, actor_id) slot.
      await run(
        "owner-slot",
        "update",
        "solution_kit_starter_apply_owners",
        releaseOwner(fixture.sourceRun)
      );
      await run(
        "owner-slot",
        "insert",
        "solution_kit_starter_apply_owners",
        insertOwner(otherRun, "before_captured")
      );
    } finally {
      await childFirstCleanup("owner-slot");
      assertReceipt("owner-slot", 5, 1);
      await assertZeroResidue();
    }
  }
);

testIfDb(
  "two writers race one running rollback source: one winner, barrier released in finally",
  async () => {
    await seedFixture("race");
    const gate: { release?: (value: void | PromiseLike<void>) => void } = {};
    const barrier = new Promise<void>((resolveWith) => {
      gate.release = resolveWith;
    });
    const writer = (runId: string) => async (): Promise<string | null> => {
      await barrier;
      try {
        // Landed partial unique index `solution_kit_runs_active_rollback_source_idx` on rollback_of_run_id.
        await run(
          "race",
          "insert",
          "solution_kit_install_runs",
          sql`insert into solution_kit_install_runs (id, kit_id, mode, status, actor_id, rollback_of_run_id) values (${runId}, ${fixture.packageKey}, 'rollback', 'running', ${fixture.userId}, ${fixture.sourceRun})`
        );
        return null;
      } catch (error) {
        return pgConstraint(error) ?? (pgCode(error) === "" ? "unknown" : pgCode(error));
      }
    };

    try {
      const pending = [writer(fixture.rollbackRun), writer(fixture.secondRollbackRun)].map(
        (entry) => entry()
      );
      gate.release?.(undefined);
      const outcomes = await Promise.all(pending);
      expect(outcomes.filter((outcome) => outcome === null)).toHaveLength(1);
      expect(outcomes.find((outcome) => outcome !== null)).toBe(
        "solution_kit_runs_active_rollback_source_idx"
      );
      const running = await db.execute(
        sql`select count(*)::int as n from solution_kit_install_runs where rollback_of_run_id = ${fixture.sourceRun} and mode = 'rollback' and status = 'running'`
      );
      expect(Number(rowsOf<{ n: number }>(running)[0]?.n)).toBe(1);
    } finally {
      gate.release?.(undefined);
      await childFirstCleanup("race");
      assertReceipt("race", 3);
      await assertZeroResidue();
    }
  }
);

testIfDb(
  "the 513-row relation sentinel refuses in at most MAX_QUERIES pages and writes nothing",
  async () => {
    resetReceipt();
    await seedFixture("sentinel");
    const sentinelKit = `${RUN}-sentinel`;
    try {
      const base = sql`'2026-03-04 05:00:00'::timestamp`;
      const sentinelRows = Array.from({ length: 513 }, (_unused, index) => ({
        id: crypto.randomUUID(),
        offset: index,
      }));
      for (let offset = 0; offset < sentinelRows.length; offset += 100) {
        const batch = sentinelRows.slice(offset, offset + 100);
        await run(
          "sentinel",
          "insert",
          "solution_kit_install_runs",
          sql`insert into solution_kit_install_runs (id, kit_id, mode, status, created_at)
        values ${sql.join(
          batch.map(
            (row) =>
              sql`(${row.id}, ${sentinelKit}, 'apply', 'success', ${base} + (${row.offset} * interval '1 second'))`
          ),
          sql`, `
        )}`
        );
      }
      const page = async (cursor: ClassifierCursor | null): Promise<ClassifierPage> => {
        // A non-uuid placeholder bound against `id` in `(created_at, id) < ($1::timestamp, $2)` throws 22P02 first.
        const result = await db.execute(
          sql`select id, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at from solution_kit_install_runs where kit_id = ${sentinelKit} and (created_at, id) < (${cursor?.createdAt ?? "9999-12-31 23:59:59"}::timestamp, ${cursor?.id ?? "ffffffff-ffff-ffff-ffff-ffffffffffff"}) order by created_at desc, id desc limit ${CLASSIFIER_CAPS.pageSize + 1}`
        );
        const rows = rowsOf<{ id: string; created_at: string }>(result).map((row) => ({
          id: row.id,
          createdAt: row.created_at,
        }));
        return {
          rows: rows.slice(0, CLASSIFIER_CAPS.pageSize),
          hasMore: rows.length > CLASSIFIER_CAPS.pageSize,
        };
      };
      let queries = 0;
      const instrumented = async (cursor: ClassifierCursor | null): Promise<ClassifierPage> => {
        queries += 1;
        return page(cursor);
      };
      await expect(
        modelBoundedNewerApplies({ fetchPage: instrumented, persist: async () => {} })
      ).rejects.toThrow(/rollback_classifier_limit: maxTotalRows/);
      expect(queries).toBe(CLASSIFIER_CAPS.maxQueries);
      const residual = await db.execute(
        sql`select count(*)::int as n from solution_kit_install_runs where kit_id = ${sentinelKit}`
      );
      expect(Number(rowsOf<{ n: number }>(residual)[0]?.n)).toBe(513);
      // The insert bound is the tuple count, not the VALUES clause count: one-over tuples is unbounded.
      expect(
        [CLASSIFIER_CAPS.pageSize, CLASSIFIER_CAPS.pageSize + 1].map((count) =>
          boundedWrite(
            "insert",
            sql`insert into t values ${sql.join(
              Array.from({ length: count }, () => sql`(1)`),
              sql`, `
            )}`
          )
        )
      ).toEqual([true, false]);
    } finally {
      await childFirstCleanup("sentinel");
      assertReceipt("sentinel", 8);
      await assertZeroResidue();
    }
  }
);
