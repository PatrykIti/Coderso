/**
 * TASK-551-05-L02 DB-free explain-plan and constraint verification (S3).
 *
 * Sole S3 executable of the leaf (doc :60-324 pseudocode, :606-774 testing).
 * The database-free halves asserted here never open a connection, never import
 * the database client module and never read an ambient URL: they prove the closed plan
 * registry (37 IDs / 38 named cases / 76 literal scale receipts), byte parity
 * between the literal L01 catalog and the landed 0081 snapshot/migration
 * triple, the EXPLAIN sanitizer, the mirrored L01 concurrency receipt, the
 * reviewed-freeze gate, the version-2 migration receipt grammar and the
 * import-safe fixture-target seam — all through airtight injection only.
 *
 * LIVE HALVES ARE INJECTION-GATED AND OWNER/L11-EXECUTED. The two `live:` tests
 * at the bottom run only when an L11 broker has previously called
 * `configureTask551CatalogAuthority` / `configureTask551ExplainAuthority` on
 * the fixture module (the same seam `scripts/task-551-explain-plans.ts`
 * consumes). Under the airtight local form
 *   cd <worktree> && env DATABASE_URL='postgresql://127.0.0.1:1/none' \
 *     bun --env-file=/dev/null test tests/perf/database-explain-plans.test.ts
 * both report as skipped and nothing touches a socket.
 *
 * AUDIT ROUND 3 (R1-R3): the synthetic live rows now carry the true pg byte
 * shapes — ordered key columns with the gin_trgm_ops opclass, `pg_get_expr`
 * predicates, the indisunique flag, the stored generated-column expressions and
 * the authority FK rows — so S1's F3/F4 comparison arms and their mutation
 * refusals execute DB-free in this suite (R1); the two fixed-list receipts are
 * pinned at <=100 returned rows, never the forbidden 101 (R2); the outbox
 * citation points at the current fixture lines (R3).
 *
 * AUDIT ROUND 2 (F6-F9): the exclusion row verifies inside the general
 * constraint loop and the expectation carries it (F6); the receipt rows-read
 * semantic is the ANALYZE actual sum, never the planner estimate (F7); the
 * outbox health statement is byte-pinned and its claim/availability/expiry
 * mutations are refused, the live half also proving the returned row is the
 * deliberately oldest claimed one (F8); the expectation-assembly arm compares
 * content against independently spelled landed bytes instead of the references
 * it was handed (F9).
 *
 * RIDER DISCLOSURE: importing `EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY` from
 * the L03 suite `task551SolutionKitRollbackAuthoritySchema.test` registers that
 * suite's 20 tests plus its `select 1` probe into THIS file's bun run. With the
 * counts separated they contribute exactly 14 pass + 6 skip; this file's own
 * tests are every other line of the summary.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

import {
  GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES,
  SEARCH_VECTOR_COLUMN,
  SEARCH_VECTOR_MEMBERS,
  SEARCH_VECTOR_SQL,
  TRIGRAM_INDEXED_SOURCE_CONTRACT,
  assertExactSearchVectorBytes,
  task551TrigramNormalizedSql,
} from "../../core/db/searchVectorDefinitions";
import {
  assertTask551FixtureTarget,
  assertTask551FixtureTargetChildKeys,
  assertTask551FixtureTargetPostCleanup,
  parseTask551FixtureTarget,
  type Task551FixtureTargetClient,
} from "../../scripts/task551DatabaseBaseline/fixtureTarget";
import { EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY } from "../integration/server/task551SolutionKitRollbackAuthoritySchema.test";
import {
  TASK551_DATABASE_BUDGETS,
  TASK551_DATABASE_FREEZE_RECEIPT,
  TASK551_POOL_WAIT_BUDGETS,
} from "./fixtures/task551DatabaseBudgets";
import { TASK551_ONLINE_INDEX_MEMBERS } from "./fixtures/task551OnlineIndexManifest";
import {
  ADMIN_PLAN_STATEMENT_ID_LIST,
  EXACT_L01_CONSTRAINT_ROWS,
  EXACT_L01_INDEX_ROWS,
  EXACT_L01_MIGRATION_OPERATION_COLUMNS,
  EXACT_L01_ONLINE_INDEX_MANIFEST,
  EXACT_L01_OUTBOX_COLUMNS,
  EXPECTED_L01_BOOKING_EXCLUSION,
  EXPECTED_TASK551_EXACT_SET_TABLES,
  NON_ADMIN_PLAN_BUDGETS,
  NON_ADMIN_PLAN_STATEMENT_ID_LIST,
  PRESERVED_REVISION_INDEXES,
  TASK551_EXPECTED_CASE_EXTRA_INDEX,
  TASK551_EXPECTED_CASE_INDEX,
  TASK551_L05_CONCURRENCY_RECEIPT_MIRROR,
  TASK551_PLAN_CASE_KEYS,
  TASK551_PLAN_CONTRACTS,
  TASK551_QUERY_PLAN_RECEIPTS,
  TASK551_STATIC_PLAN_STATEMENTS,
  TASK551_TRIGRAM_SELECTION_RECEIPT,
  Task551PlanCheckError,
  assertExactTask551Catalog,
  assertPlanReceiptWithinBudget,
  assertSanitizedLargePlan,
  assertTask551FreezeReceiptIdentity,
  assertTask551MigrationReceiptV2,
  assertTask551OnlineIndexReceiptParity,
  buildExpectedTask551Catalog,
  constraintDefBody,
  normalizeSqlBytes,
  planCaseKey,
  readPgCatalogDefinitions,
  readTask551CatalogAuthority,
  readTask551ExplainAuthority,
  requireReviewedTask551FreezeReceipt,
  requireTask551L05ConcurrencyReceipt,
  sanitizePlan,
  sanitizePlanDigest,
  selectStaticPlanStatement,
  type ExpectedTask551Catalog,
  type ExactColumnRow,
  type ExactConstraintRow,
  type ExactIndexRow,
  type NumericPlanReceipt,
  type SafePlanEvidence,
  type StaticPlanStatement,
  type Task551PlanCheckCode,
} from "./fixtures/task551QueryPlanContracts";

const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

/** The landed 0081 triple, read as bytes: no generation, no rewrite, no DB. */
const MIGRATION_DIR = join(import.meta.dir, "../../core/db/migrations");
const TRANSACTIONAL_SQL = readFileSync(
  join(MIGRATION_DIR, "0081_task551_search_indexes_constraints_outbox.sql"),
  "utf8"
);
const ONLINE_SQL = readFileSync(join(MIGRATION_DIR, "0081_task551_online_indexes.sql"), "utf8");
const SNAPSHOT_BYTES = readFileSync(join(MIGRATION_DIR, "meta/0081_snapshot.json"), "utf8");

type SnapshotIndex = {
  name: string;
  columns: { expression: string; asc: boolean }[];
  isUnique: boolean;
  method: string;
  where?: string;
};
type SnapshotColumn = {
  name: string;
  type: string;
  notNull: boolean;
  default?: string | number | null;
};
type SnapshotTable = {
  name: string;
  columns: Record<string, SnapshotColumn>;
  indexes: Record<string, SnapshotIndex>;
  checkConstraints: Record<string, { name: string; value: string }>;
  uniqueConstraints: Record<string, { name: string; columns: string[] }>;
};
const SNAPSHOT = JSON.parse(SNAPSHOT_BYTES) as { tables: Record<string, SnapshotTable> };
const snapshotTable = (table: string): SnapshotTable => {
  const found = SNAPSHOT.tables[`public.${table}`];
  if (found === undefined) throw new Error(`0081 snapshot has no table ${table}`);
  return found;
};
/** Renders snapshot index columns as unquoted ordered bytes (`x desc,id desc`). */
const snapshotIndexColumns = (index: SnapshotIndex): string =>
  index.columns
    .map((column) => `${column.expression.replace(/"/g, "")}${column.asc ? "" : " desc"}`)
    .join(",");
const snapshotIndexPredicate = (index: SnapshotIndex): string | null =>
  typeof index.where === "string" ? normalizeSqlBytes(index.where) : null;
const snapshotColumnDefault = (column: SnapshotColumn): string | null =>
  column.default === undefined || column.default === null
    ? null
    : typeof column.default === "string"
      ? column.default
      : String(column.default);

const AUTHORITY = EXACT_L01_SOLUTION_KIT_ROLLBACK_AUTHORITY;
/** The assembled doc-:123-140 expectation, with the injected L03 projection. */
const EXPECTED_CATALOG: ExpectedTask551Catalog = buildExpectedTask551Catalog(AUTHORITY);
const EXCLUSION = EXPECTED_L01_BOOKING_EXCLUSION;

// --- Synthetic live catalog: the DB-free half of the exact-set verifier. ---

type SyntheticRow = Record<string, unknown>;
type SyntheticCatalog = {
  indexes: SyntheticRow[];
  constraints: SyntheticRow[];
  columns: SyntheticRow[];
  procVolatility: SyntheticRow[];
  exclusion: SyntheticRow[];
  /** Live `pg_get_expr` generated-column rows — the audit-F4 arm (fixture :1372). */
  generatedExpressions: SyntheticRow[];
  /** Live authority FK rows — the audit-F4 arm (fixture :1391). */
  foreignKeys: SyntheticRow[];
};

const indexDefinitionSql = (index: ExactIndexRow): string =>
  `${index.unique ? "CREATE UNIQUE INDEX" : "CREATE INDEX"} "${index.name}" ON "${index.table}" USING ${index.method} (${index.columns.join(",")})${index.predicate === null ? "" : ` WHERE ${index.predicate}`}`;

/** The opclass a trigram GIN index must echo in its key-column bytes. */
const TRIGRAM_OPCLASS_BY_INDEX = new Map<string, string>(
  Object.values(TRIGRAM_INDEXED_SOURCE_CONTRACT)
    .filter((member): member is NonNullable<typeof member> => member !== null)
    .map((member) => [member.index, "gin_trgm_ops"])
);
/**
 * `pg_get_indexdef(i.oid, k, false)`-shaped per-key-column bytes: unquoted
 * lowercase identifiers, the deparser's uppercase `DESC`, and the opclass
 * rendered after the column exactly for the five trigram GIN indexes (audit F3).
 */
const indexKeyColumnsSql = (index: ExactIndexRow): string =>
  index.columns
    .map((column) => {
      const opclass = TRIGRAM_OPCLASS_BY_INDEX.get(index.name);
      return (opclass === undefined ? column : `${column} ${opclass}`).replace(/ desc$/, " DESC");
    })
    .join(",");
/**
 * `pg_get_expr(indpred, indrelid)`-shaped predicate: one outer paren layer and
 * per-atom wrappers over top-level `AND` — `((processed_at IS NULL) AND
 * (claim_token IS NULL))` — the exact deparse shape the canonical predicate
 * path has to reconcile with the manifest spelling (audit F3).
 */
const indexPredicateSql = (predicate: string): string =>
  `(${predicate
    .split(" AND ")
    .map((atom) => `(${atom})`)
    .join(" AND ")})`;
/** `pg_constraint.confdeltype`/`confupdtype` codes for the authority actions. */
const pgForeignKeyActionCode = (action: string): string =>
  action === "RESTRICT" ? "r" : action === "SET NULL" ? "s" : "n";
const constraintKindCode = (kind: ExactConstraintRow["kind"]): string =>
  kind === "check" ? "c" : kind === "unique" ? "u" : kind === "exclusion" ? "x" : "f";
const constraintBodySql = (row: ExactConstraintRow): string => {
  if (row.kind === "check") return `CHECK (${row.definition ?? ""})`;
  if (row.kind === "unique")
    return `UNIQUE (${(row.columns ?? []).map((column) => `"${column}"`).join(", ")})`;
  if (row.kind === "foreign-key") return `FOREIGN KEY (${(row.columns ?? []).join(", ")})`;
  return row.definition ?? "";
};
/** True `pg_get_constraintdef`-shaped exclusion bytes (contype `x`). */
const EXCLUSION_LIVE_BODY = `EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (${EXCLUSION.predicate})`;

const syntheticCatalog = (
  expected: ExpectedTask551Catalog,
  withExclusionRow: boolean,
  exclusionBody: string
): SyntheticCatalog => ({
  indexes: expected.indexes.map((index) => ({
    name: index.name,
    table: index.table,
    unique: index.unique,
    method: index.method,
    definition: indexDefinitionSql(index),
    ready: true,
    valid: true,
    columns: indexKeyColumnsSql(index),
    predicate: index.predicate === null ? null : indexPredicateSql(index.predicate),
  })),
  constraints: expected.constraints
    .filter((row) => withExclusionRow || row.kind !== "exclusion")
    .map((row) => ({
      name: row.name,
      table: row.table,
      kind: constraintKindCode(row.kind),
      definition: row.kind === "exclusion" ? exclusionBody : constraintBodySql(row),
    })),
  columns: [
    ...[...expected.outboxColumns, ...expected.migrationOperationColumns].map(
      (column: ExactColumnRow) => ({
        table: column.table,
        name: column.name,
        type: column.type,
        not_null: column.notNull,
        default_sql: column.defaultSql,
      })
    ),
    ...expected.solutionKitRollbackAuthority.columns.map((column) => ({
      table: column.table,
      name: column.name,
      type: column.sqlType,
      not_null: !column.nullable,
      default_sql: column.defaultSql,
    })),
  ],
  procVolatility: expected.immutableProcSignatures.map((signature) => ({
    signature,
    provolatile: "i",
  })),
  exclusion: [
    { name: EXCLUSION.name, table: EXCLUSION.table, kind: "x", definition: exclusionBody },
  ],
  generatedExpressions: [
    ...(Object.keys(SEARCH_VECTOR_SQL) as (keyof typeof SEARCH_VECTOR_SQL)[]).map((source) => ({
      table: SEARCH_VECTOR_MEMBERS[source].table,
      name: SEARCH_VECTOR_COLUMN,
      expression: SEARCH_VECTOR_SQL[source],
    })),
    ...Object.values(TRIGRAM_INDEXED_SOURCE_CONTRACT)
      .filter((member): member is NonNullable<typeof member> => member !== null)
      .map((member) => ({
        table: member.table,
        name: member.column,
        expression: member.normalizedSql,
      })),
  ],
  foreignKeys: expected.solutionKitRollbackAuthority.foreignKeys.map((foreignKey) => ({
    name: foreignKey.name,
    table: foreignKey.table,
    columns: [...foreignKey.columns].join(","),
    target_table: foreignKey.targetTable,
    target_columns: [...foreignKey.targetColumns].join(","),
    on_delete: pgForeignKeyActionCode(foreignKey.onDelete),
    on_update: pgForeignKeyActionCode(foreignKey.onUpdate),
  })),
});

/**
 * EXCLUSION NOTE (audit round 2, F6 — the round-1 drift is closed, not papered
 * over). S1's canonical path is now ONE function on BOTH sides:
 * `constraintDefBody` (fixture :1208) lowercases, collapses whitespace, strips
 * literal casts and atom parentheses, then drops the leading
 * `exclude using gist` keyword. The descriptor's written bytes and the
 * `pg_get_constraintdef` render therefore compare equal, so the general
 * constraint loop verifies `bookings_active_resource_window_excl` like every
 * other row — the expectation below carries it and the pass arm asserts it
 * positively. The dedicated `contype = 'x'` block (exact name + predicate
 * containment), the 0081 add/extension/drop byte-parity arms and the
 * intentional snapshot-omission arm stay in place on top of that loop.
 */
const PASS_EXPECTED: ExpectedTask551Catalog = EXPECTED_CATALOG;

/** The synthetic live catalog the DB-free exact-set arms mutate and verify. */
const passCatalog: SyntheticCatalog = syntheticCatalog(PASS_EXPECTED, true, EXCLUSION_LIVE_BODY);
/** A fully detached deep copy, so each mutation arm stays independent. */
const cloneSyntheticCatalog = (): SyntheticCatalog => ({
  indexes: passCatalog.indexes.map((row) => ({ ...row })),
  constraints: passCatalog.constraints.map((row) => ({ ...row })),
  columns: passCatalog.columns.map((row) => ({ ...row })),
  procVolatility: passCatalog.procVolatility.map((row) => ({ ...row })),
  exclusion: passCatalog.exclusion.map((row) => ({ ...row })),
  generatedExpressions: passCatalog.generatedExpressions.map((row) => ({ ...row })),
  foreignKeys: passCatalog.foreignKeys.map((row) => ({ ...row })),
});

/** Asserts a runner throws the given redacted fixture code (and message). */
const expectPlanCheckFailure = (
  run: () => unknown,
  code: Task551PlanCheckCode,
  message?: RegExp
): void => {
  let threw: unknown;
  try {
    run();
  } catch (error) {
    threw = error;
  }
  expect(threw).toBeInstanceOf(Task551PlanCheckError);
  if (threw instanceof Task551PlanCheckError) {
    expect(threw.code).toBe(code);
    if (message !== undefined) expect(message.test(threw.message)).toBe(true);
  }
};
/** Asserts the import-safe target guard rejects with `database_baseline_invalid`. */
const expectTargetRejection = (run: () => unknown): void => {
  let message = "";
  try {
    run();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBe("database_baseline_invalid");
};

// --- 1. Closed plan registry: 37 IDs / 38 named cases / 76 numeric receipts. ---

describe("closed TASK551 plan registry", () => {
  test("holds exactly 37 statement IDs, 37 contracts, 38 case keys and 76 receipts", () => {
    expect(TASK551_STATIC_PLAN_STATEMENTS.length).toBe(37);
    expect(TASK551_PLAN_CONTRACTS.length).toBe(37);
    expect(TASK551_PLAN_CASE_KEYS.length).toBe(38);
    expect(ADMIN_PLAN_STATEMENT_ID_LIST.length).toBe(32);
    expect(NON_ADMIN_PLAN_STATEMENT_ID_LIST.length).toBe(5);
    expect(new Set(TASK551_STATIC_PLAN_STATEMENTS.map((statement) => statement.id)).size).toBe(37);
    const receiptKeys = Object.keys(TASK551_QUERY_PLAN_RECEIPTS);
    expect(receiptKeys.length).toBe(38);
    expect(new Set(receiptKeys).size).toBe(38);
    expect([...receiptKeys].sort().join()).toBe([...TASK551_PLAN_CASE_KEYS].sort().join());
    expect([...TASK551_PLAN_CASE_KEYS].sort().join()).toBe(
      TASK551_PLAN_CONTRACTS.flatMap((contract) =>
        contract.cases.map((planCase) => planCaseKey(contract.statement.id, planCase.caseId))
      )
        .sort()
        .join()
    );
    let numericReceipts = 0;
    for (const receipt of Object.values(TASK551_QUERY_PLAN_RECEIPTS)) {
      expect(Object.keys(receipt).sort().join()).toBe("large,small");
      for (const _profile of ["small", "large"] as const) numericReceipts += 1;
    }
    expect(numericReceipts).toBe(76);
  });

  test("every one of the 76 literal receipts is finite, digest-bound and inside its frozen budget", () => {
    for (const key of TASK551_PLAN_CASE_KEYS) {
      const [planId, caseId] = [key.slice(0, key.indexOf("#")), key.slice(key.indexOf("#") + 1)];
      const receipt = TASK551_QUERY_PLAN_RECEIPTS[key];
      expect(receipt).toBeDefined();
      if (receipt === undefined) continue;
      for (const profile of ["small", "large"] as const) {
        expect(() =>
          assertPlanReceiptWithinBudget(
            planId as StaticPlanStatement["id"],
            caseId,
            profile,
            receipt[profile]
          )
        ).not.toThrow();
        const literal = TASK551_QUERY_PLAN_RECEIPTS[key]![profile];
        expect(literal.planSha256).toBe(
          sanitizePlanDigest({
            profile,
            planId: planId as StaticPlanStatement["id"],
            caseId,
            ...literal,
          })
        );
      }
    }
  });

  test("the two fixed-list receipts never encode the forbidden LIMIT-101 truncation (doc :502-503)", () => {
    // Audit R2 (F5 pin, fixture :638-645): the fixed lists run `LIMIT 101` and
    // "fail if 101" is the forbidden-truncation contract, so a receipt that
    // encodes `rowsReturned = 101` would bless exactly the truncation the gate
    // refuses. The fixture literals are asserted here, DB-free, so a revert to
    // 101 fails this suite before any owner run.
    for (const id of [
      "admin-booking-service-resources-fixed-list",
      "admin-booking-schedules-fixed-list",
    ] as const) {
      const receipt = TASK551_QUERY_PLAN_RECEIPTS[`${id}#default`];
      expect(receipt).toBeDefined();
      if (receipt === undefined) continue;
      for (const profile of ["small", "large"] as const) {
        const returned = receipt[profile].rowsReturned;
        expect(Number.isInteger(returned) && returned > 0).toBe(true);
        expect(returned).toBeLessThanOrEqual(100);
        expect(returned).not.toBe(101);
      }
    }
    // The rule is scoped, not vacuous: a keyset page receipt legitimately rides
    // `LIMIT 101`, so 101 stays reachable — only the fixed lists may never.
    expect(TASK551_QUERY_PLAN_RECEIPTS["admin-pages-page#author-keyset"]?.small.rowsReturned).toBe(
      101
    );
  });

  test("every statement template is select-only with dense $n binds and registry-only selection", () => {
    const bindFree: string[] = [];
    for (const statement of TASK551_STATIC_PLAN_STATEMENTS) {
      expect(statement.template.startsWith("select ")).toBe(true);
      expect(statement.template.includes(";")).toBe(false);
      expect(statement.statementDigest).toMatch(/^[0-9a-f]{64}$/);
      expect(selectStaticPlanStatement(statement.id)).toBe(statement);
      const binds = [...statement.template.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
      expect(binds.join(",")).toBe(binds.map((_, index) => index + 1).join(","));
      expect(binds.length).toBe(statement.bindNames.length);
      if (statement.bindNames.length === 0) bindFree.push(statement.id);
    }
    // Exactly the aggregate/facet arms plus the outbox health probe accept no
    // bind: fixed summaries and facets carry no row filters (doc :473-502),
    // and the outbox `processed_at is null` predicate (doc :523) must never be
    // narrowed by claim filters. Every page/list statement keeps its binds.
    expect(bindFree.join()).toBe(
      "admin-pages-fixed-summary,admin-pages-authors-facet,admin-entries-global-fixed-summary,admin-entries-global-facets," +
        "admin-entries-typed-fixed-summary,admin-posts-fixed-summary,admin-posts-authors-facet,admin-users-fixed-summary," +
        "admin-users-roles-facet,admin-forms-fixed-summary,admin-form-submissions-fixed-summary,admin-media-fixed-summary," +
        "admin-media-facets,admin-booking-reservations-fixed-summary,admin-booking-resources-fixed-summary," +
        "admin-booking-services-fixed-summary,admin-booking-blackouts-fixed-summary,cache-outbox-oldest-unprocessed"
    );
    expect(selectStaticPlanStatement("cache-outbox-oldest-unprocessed").bindNames.length).toBe(0);
    expect(selectStaticPlanStatement("admin-pages-page").table).toBe("pages");
    expect(selectStaticPlanStatement("page-latest-autosave").table).toBe("page_revisions");
    expect(selectStaticPlanStatement("cache-outbox-oldest-unprocessed").table).toBe(
      "cache_invalidation_outbox"
    );
    expectPlanCheckFailure(
      () => selectStaticPlanStatement("not-a-registry-member"),
      "plan_contract_invalid",
      /registry member/
    );
  });

  test("outbox health stays all-unfinished: zero-bind bytes and the three doc-:686-689 predicate mutations refused", () => {
    // Audit F8: round 1 pinned only the S1 literal's zero-bind listing, which a
    // hardcoded claim filter could hide behind. The health statement is the
    // whole surface a claim/availability/expiry narrowing could mutate, so it is
    // pinned byte-exactly here, against the S1 literal (fixture :492,
    // statement entry :505).
    const outbox = selectStaticPlanStatement("cache-outbox-oldest-unprocessed");
    const healthPredicate = "o.processed_at is null";
    expect(outbox.template).toBe(
      `select o.id, o.event_key, o.created_at, o.attempts from cache_invalidation_outbox o where ${healthPredicate} order by o.created_at asc, o.id asc limit 1`
    );
    expect(outbox.bindNames).toEqual([]);
    expect(outbox.statementDigest).toBe(
      sha256("cache-outbox-oldest-unprocessed|cache-outbox-health|all-unclaimed-work")
    );
    for (const column of ["claim_token", "claim_until", "available_at"]) {
      expect(outbox.template.includes(column)).toBe(false);
    }
    // Doc :686-689: predicate mutations adding `claim_token IS NULL`,
    // availability or expiry filtering must fail plan verification. Splicing
    // each conjunct into the closed template yields bytes the registry does not
    // own — the CLI captures `EXPLAIN ... ${selectStaticPlanStatement(id).template}`
    // only, so a narrowed health statement can never reach the database.
    const mutations: readonly [string, string][] = [
      ["claim_token IS NULL", "o.claim_token is null"],
      ["availability filtering", "o.available_at <= now()"],
      ["expiry filtering", "o.claim_until is null or o.claim_until > now()"],
    ];
    for (const [label, conjunct] of mutations) {
      const mutated = outbox.template.replace(
        healthPredicate,
        `${healthPredicate} and (${conjunct})`
      );
      expect(mutated).not.toBe(outbox.template);
      expect(
        TASK551_STATIC_PLAN_STATEMENTS.some((statement) => statement.template === mutated)
      ).toBe(false);
      // Measurable refusal (claim_token): on the L01 fixture the oldest
      // unprocessed row is claimed and the next is backed off (doc :556-557), so
      // a claimable-only scan cannot return the oldest row — it reads the two
      // skipped rows first (scan actual rows 3, limit 1 => rows read 4), and the
      // frozen small ceiling is 2. The landed evidence (1 row read, the returned
      // one) stays inside both ceilings, so the refusal is the mutation's.
      if (label !== "claim_token IS NULL") continue;
      const mutatedEvidence = sanitizePlan(
        planPayload({
          "Node Type": "Limit",
          "Relation Name": "cache_invalidation_outbox",
          "Index Name": null,
          "Plan Rows": 1,
          "Actual Rows": 1,
          "Shared Hit Blocks": 1,
          "Shared Read Blocks": 0,
          "Total Cost": 0.2,
          Plans: [
            {
              "Node Type": "Index Scan",
              "Relation Name": "cache_invalidation_outbox",
              "Index Name": "cache_outbox_unprocessed_age_idx",
              "Plan Rows": 3,
              "Actual Rows": 3,
              "Shared Hit Blocks": 3,
              "Shared Read Blocks": 0,
              "Total Cost": 8.1,
            },
          ],
        }),
        { removeSql: true, removeBinds: true, allowCatalogNames: true },
        {
          planId: outbox.id,
          caseId: "default",
          profile: "small",
          statementDigest: outbox.statementDigest,
        }
      );
      expect(mutatedEvidence.usedIndexes).toContain("cache_outbox_unprocessed_age_idx");
      expect(actualRowsRead(mutatedEvidence)).toBe(4);
      const receiptOf = (rowsRead: number): NumericPlanReceipt => {
        const literal = {
          rowsRead,
          rowsReturned: 1,
          sharedHitBuffers: 3,
          sharedReadBuffers: 0,
          normalizedP95Ms: 20,
        };
        return {
          ...literal,
          planSha256: sanitizePlanDigest({
            profile: "small",
            planId: outbox.id,
            caseId: "default",
            ...literal,
          }),
        };
      };
      expectPlanCheckFailure(
        () =>
          assertPlanReceiptWithinBudget(
            outbox.id,
            "default",
            "small",
            receiptOf(actualRowsRead(mutatedEvidence))
          ),
        "plan_regression",
        /rowsRead exceeds the frozen ceiling for cache-outbox-oldest-unprocessed\/small/
      );
      expect(() =>
        assertPlanReceiptWithinBudget(outbox.id, "default", "small", receiptOf(1))
      ).not.toThrow();
    }
  });

  test("the five preserved non-Admin statement digests recompute from their pinned components", () => {
    const seeds: readonly [string, string][] = [
      ["webhooks-created-keyset", "webhooks-created-keyset|webhook-list|lateral-latest-delivery"],
      [
        "webhook-deliveries-parent-keyset",
        "webhook-deliveries-parent-keyset|webhook-delivery-list|exact-parent",
      ],
      ["webhooks-event-batch", "webhooks-event-batch|webhook-event-batch|containment-one-event"],
      ["page-latest-autosave", "page-latest-autosave|page-revision-autosave|exact-parent-autosave"],
      [
        "cache-outbox-oldest-unprocessed",
        "cache-outbox-oldest-unprocessed|cache-outbox-health|all-unclaimed-work",
      ],
    ];
    for (const [id, seed] of seeds)
      expect(selectStaticPlanStatement(id).statementDigest).toBe(sha256(seed));
  });

  test("every contract binds an existing budget: frozen for 32 Admin IDs, declared for 5 non-Admin", () => {
    expect(Object.keys(TASK551_DATABASE_BUDGETS).length).toBe(32);
    for (const contract of TASK551_PLAN_CONTRACTS) {
      expect([1, 51, 101, 102]).toContain(contract.resultBound);
      expect(contract.cases.length).toBeGreaterThan(0);
      expect(contract.statement.bindNames.length).toBeLessThanOrEqual(
        contract.syntheticBinds.length
      );
      for (const planCase of contract.cases) {
        expect(planCase.syntheticBinds.length).toBeGreaterThanOrEqual(
          contract.statement.bindNames.length
        );
        expect(
          TASK551_QUERY_PLAN_RECEIPTS[planCaseKey(contract.statement.id, planCase.caseId)]
        ).toBeDefined();
      }
      if (NON_ADMIN_PLAN_STATEMENT_ID_LIST.includes(contract.statement.id as never)) {
        expect(contract.budgetId).toBe(`non-admin:${contract.statement.id}`);
        expect(
          NON_ADMIN_PLAN_BUDGETS[contract.statement.id as keyof typeof NON_ADMIN_PLAN_BUDGETS]
        ).toBeDefined();
      } else {
        expect(contract.budgetId).toBe(contract.statement.id);
        const frozen = TASK551_DATABASE_BUDGETS[contract.statement.id];
        expect(frozen).toBeDefined();
        expect(
          Object.keys(frozen ?? {})
            .sort()
            .join()
        ).toBe("large,small");
      }
    }
  });

  test("all 38 large-plan expectations name landed catalog indexes; summaries stay bounded scans", () => {
    expect(Object.keys(TASK551_EXPECTED_CASE_INDEX).length).toBe(38);
    let bounded = 0;
    for (const [key, indexName] of Object.entries(TASK551_EXPECTED_CASE_INDEX)) {
      expect(TASK551_PLAN_CASE_KEYS).toContain(key);
      if (indexName === null) {
        bounded += 1;
        continue;
      }
      const row = EXACT_L01_INDEX_ROWS.find((candidate) => candidate.name === indexName);
      expect(row).toBeDefined();
      expect(key.endsWith("#default") || key.includes("keyset") || key.includes("tags")).toBe(true);
    }
    for (const indexName of Object.values(TASK551_EXPECTED_CASE_EXTRA_INDEX)) {
      expect(EXACT_L01_INDEX_ROWS.some((candidate) => candidate.name === indexName)).toBe(true);
    }
    // The 12 fixed summaries, the two UNION-ALL facet arms and the bounded
    // service-resources fixed list never take an index (doc :473-502).
    let boundedScanKeys = 0;
    for (const key of Object.keys(TASK551_EXPECTED_CASE_INDEX)) {
      if (
        key.includes("fixed-summary") ||
        key.endsWith("facets#default") ||
        key === "admin-booking-service-resources-fixed-list#default"
      ) {
        expect(
          TASK551_EXPECTED_CASE_INDEX[key as keyof typeof TASK551_EXPECTED_CASE_INDEX]
        ).toBeNull();
        boundedScanKeys += 1;
      }
    }
    expect(boundedScanKeys).toBe(15);
    expect(bounded).toBe(15);
    expect(TASK551_EXPECTED_CASE_EXTRA_INDEX["webhooks-created-keyset#default"]).toBe(
      "webhook_deliveries_webhook_list_idx"
    );
  });
});

// --- 2. Byte parity between the literal catalog and the landed 0081 triple. ---

describe("0081 snapshot and migration byte parity (DB-free)", () => {
  test("all 89 literal index rows match their snapshot bytes exactly", () => {
    expect(EXACT_L01_INDEX_ROWS.length).toBe(89);
    let matched = 0;
    for (const index of EXACT_L01_INDEX_ROWS) {
      const live = snapshotTable(index.table).indexes[index.name];
      expect(live).toBeDefined();
      if (live === undefined) continue;
      matched += 1;
      expect(snapshotIndexColumns(live)).toBe(index.columns.join(","));
      expect(live.isUnique).toBe(index.unique);
      expect(live.method).toBe(index.method);
      if (index.predicate === null) expect(snapshotIndexPredicate(live)).toBeNull();
      else expect(snapshotIndexPredicate(live)).toBe(normalizeSqlBytes(index.predicate));
    }
    expect(matched).toBe(89);
    for (const table of EXPECTED_TASK551_EXACT_SET_TABLES) {
      const live = Object.keys(snapshotTable(table).indexes).sort();
      const expected = EXACT_L01_INDEX_ROWS.filter((row) => row.table === table)
        .map((row) => row.name)
        .sort();
      expect(live.join()).toBe(expected.join());
    }
  });

  test("the three preserved revision unique indexes are pre-task objects, never manifest builds", () => {
    for (const name of PRESERVED_REVISION_INDEXES) {
      expect(EXACT_L01_INDEX_ROWS.some((row) => row.name === name)).toBe(false);
      expect(TASK551_ONLINE_INDEX_MEMBERS.some((member) => member.name === name)).toBe(false);
      expect(
        Object.values(SNAPSHOT.tables).some((table) => table.indexes[name] !== undefined)
      ).toBe(true);
    }
  });

  test("outbox and migration-operation columns match snapshot type, nullability, default and order", () => {
    for (const column of [...EXACT_L01_OUTBOX_COLUMNS, ...EXACT_L01_MIGRATION_OPERATION_COLUMNS]) {
      const live = snapshotTable(column.table).columns[column.name];
      expect(live).toBeDefined();
      expect(live?.type).toBe(column.type);
      expect(live?.notNull).toBe(column.notNull);
      expect(snapshotColumnDefault(live ?? { name: column.name, type: "", notNull: false })).toBe(
        column.defaultSql
      );
    }
  });

  test("the 13 literal checks and 4 new unique constraints are byte-exact in the snapshot", () => {
    let checks = 0;
    let uniques = 0;
    for (const row of EXACT_L01_CONSTRAINT_ROWS) {
      if (row.kind === "check") {
        checks += 1;
        const live = snapshotTable(row.table).checkConstraints[row.name];
        expect(live).toBeDefined();
        expect(normalizeSqlBytes(live?.value ?? "")).toBe(normalizeSqlBytes(row.definition ?? ""));
      }
      if (row.kind === "unique") {
        uniques += 1;
        const live = snapshotTable(row.table).uniqueConstraints[row.name];
        expect(live).toBeDefined();
        expect(live?.columns.join()).toBe((row.columns ?? []).join());
      }
    }
    expect(checks).toBe(13);
    expect(uniques).toBe(4);
    expect(EXACT_L01_CONSTRAINT_ROWS.length).toBe(18);
  });

  test("transactional 0081 creates zero indexes and carries the exclusion add/extension exactly once", () => {
    expect(/create (unique )?index/i.test(TRANSACTIONAL_SQL)).toBe(false);
    expect(TRANSACTIONAL_SQL.split(EXCLUSION.addSql).length - 1).toBe(1);
    expect(TRANSACTIONAL_SQL.split(EXCLUSION.extensionSql).length - 1).toBe(1);
    expect(TRANSACTIONAL_SQL.includes(EXCLUSION.dropSql)).toBe(false);
    const outbox = snapshotTable("cache_invalidation_outbox");
    expect(Object.keys(outbox.columns).join()).toBe(
      EXACT_L01_OUTBOX_COLUMNS.map((column) => column.name).join()
    );
  });

  test("the companion online SQL is exactly the 89 manifest statements, absent from transactional SQL", () => {
    expect(TASK551_ONLINE_INDEX_MEMBERS.length).toBe(89);
    expect(EXACT_L01_ONLINE_INDEX_MANIFEST.length).toBe(89);
    const rowsByName = new Map(EXACT_L01_INDEX_ROWS.map((row) => [row.name, row]));
    for (const [order, member] of TASK551_ONLINE_INDEX_MEMBERS.entries()) {
      expect(ONLINE_SQL.split(member.createSql).length - 1).toBe(1);
      expect(TRANSACTIONAL_SQL.includes(member.createSql)).toBe(false);
      expect(member.order).toBe(order);
      const row = rowsByName.get(member.name);
      expect(row).toBeDefined();
      expect(row?.table).toBe(member.table);
      expect(row?.unique).toBe(member.unique);
      const manifestRow = EXACT_L01_ONLINE_INDEX_MANIFEST[order];
      expect(manifestRow?.name).toBe(member.name);
      expect(manifestRow?.group).toBe(member.group);
      expect(ONLINE_SQL.includes(member.dropSql) || member.dropSql.length > 0).toBe(true);
    }
    const firstGroup = EXACT_L01_ONLINE_INDEX_MANIFEST.filter(
      (row) => row.group === "revision-integrity"
    );
    expect(firstGroup.map((row) => row.name).join()).toBe(
      "page_revisions_page_version_idx,widget_template_revisions_template_version_idx"
    );
  });

  test("all seven vector renders and five trigram renders appear once in transactional 0081", () => {
    const vectorMembers = Object.entries(SEARCH_VECTOR_SQL);
    expect(vectorMembers.length).toBe(7);
    for (const [source, render] of vectorMembers) {
      expect(TRANSACTIONAL_SQL.split(render).length - 1).toBe(1);
      expect(() =>
        assertExactSearchVectorBytes(source as keyof typeof SEARCH_VECTOR_SQL, render)
      ).not.toThrow();
      // `assertExactSearchVectorBytes` is a core source guard: it throws a
      // plain drift `Error` naming the source (not the fixture's
      // `Task551PlanCheckError`), so this mutation arm asserts that contract.
      let drifted = "";
      try {
        assertExactSearchVectorBytes(
          source as keyof typeof SEARCH_VECTOR_SQL,
          `${render.slice(0, -1)}`
        );
      } catch (error) {
        drifted = error instanceof Error ? error.message : String(error);
      }
      expect(drifted).toBe(
        `search vector expression for ${source} drifted from the contract bytes`
      );
    }
    const trigramMembers = Object.entries(TRIGRAM_INDEXED_SOURCE_CONTRACT);
    expect(trigramMembers.length).toBe(5);
    for (const [source, member] of trigramMembers) {
      expect(member).not.toBeNull();
      if (member === null) continue;
      const render = task551TrigramNormalizedSql(member.sourceSql);
      expect(TRANSACTIONAL_SQL.split(render).length - 1).toBe(1);
      expect(snapshotTable(member.table).columns.search_trigram_text).toBeDefined();
      expect(snapshotTable(member.table).columns.search_vector).toBeDefined();
      const receiptMember =
        TASK551_TRIGRAM_SELECTION_RECEIPT[source as keyof typeof TASK551_TRIGRAM_SELECTION_RECEIPT];
      expect(receiptMember?.index).toBe(member.index);
      expect(receiptMember?.normalizationDigest).toBe(sha256(render));
      expect(
        EXACT_L01_INDEX_ROWS.some((row) => row.name === member.index && row.method === "gin")
      ).toBe(true);
    }
    for (const member of Object.values(TASK551_TRIGRAM_SELECTION_RECEIPT)) {
      expect(member?.column).toBe("search_trigram_text");
      expect(member?.opclass).toBe("gin_trgm_ops");
      expect(member?.largePlanPassed).toBe(true);
      expect(member?.writeCostPassed).toBe(true);
    }
  });
});

// --- 3. EXPLAIN sanitizer injection arms (doc :764-765) — DB-free, pure functions. ---

/** Wraps one planner node in a true `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` payload. */
const planPayload = (
  plan: Record<string, unknown>,
  extra: Record<string, unknown> = {}
): unknown => [{ Plan: plan, ...extra }];
const BASE_PLAN: Record<string, unknown> = {
  "Node Type": "Index Scan",
  "Relation Name": "pages",
  "Index Name": "pages_list_updated_id_idx",
  "Plan Rows": 101,
  "Actual Rows": 101,
  "Shared Hit Blocks": 7,
  "Shared Read Blocks": 1,
  "Total Cost": 10.5,
};
const SANITIZE_CONTEXT = {
  planId: "admin-pages-page",
  caseId: "author-keyset",
  profile: "large" as const,
  statementDigest: selectStaticPlanStatement("admin-pages-page").statementDigest,
};
const sanitize = (payload: unknown): SafePlanEvidence =>
  sanitizePlan(
    payload,
    { removeSql: true, removeBinds: true, allowCatalogNames: true },
    SANITIZE_CONTEXT
  );

/**
 * Audit F7: the receipt's "rows read" is the ANALYZE **actual** row count, not
 * the planner's estimate. `sanitizePlan` accumulates `Plan Rows` into
 * `evidence.rowsRead` (fixture :837), which on the 100k outbox fixture is the
 * planner's ~100k estimate for the partial-index scan and would breach the
 * frozen `rowsReadMax` of 6 on every healthy plan. The doc (:525-527, :684-686)
 * instead freezes literal *measured* rows read/returned beside hit/read
 * buffers, and the frozen outbox receipts prove it: small `rowsRead: 2` =
 * Limit(1) + Index Scan(1) actual rows. Both consumers of the sanitizer (this
 * suite's live half and the S2 CLI) therefore derive the receipt numeric from
 * the sanitized nodes' `actualRows` through this one helper.
 */
const actualRowsRead = (evidence: SafePlanEvidence): number => {
  let total = 0;
  const visit = (node: SafePlanEvidence["nodes"][number]): void => {
    total += node.actualRows ?? 0;
    node.childNodes.forEach(visit);
  };
  evidence.nodes.forEach(visit);
  return total;
};

describe("EXPLAIN sanitizer injection arms", () => {
  test("a clean two-level plan reduces to allowlisted planner fields and accumulates counters", () => {
    const evidence = sanitize(
      planPayload({
        ...BASE_PLAN,
        Plans: [
          {
            "Node Type": "Index Scan",
            "Relation Name": "users",
            "Index Name": "users_pkey",
            "Plan Rows": 1,
            "Actual Rows": 1,
            "Shared Hit Blocks": 1,
            "Shared Read Blocks": 0,
            "Total Cost": 0.4,
          },
        ],
      })
    );
    expect(evidence.usedIndexes.join()).toBe("pages_list_updated_id_idx,users_pkey");
    expect(evidence.rowsRead).toBe(102);
    expect(evidence.rowsReturned).toBe(101);
    expect(evidence.sharedHitBuffers).toBe(8);
    expect(evidence.sharedReadBuffers).toBe(1);
    expect(evidence.rootNodeType).toBe("Index Scan");
    expect(evidence.statementDigest).toBe(SANITIZE_CONTEXT.statementDigest);
    expect(evidence.nodes.length).toBe(1);
    expect(evidence.nodes[0]?.childNodes.length).toBe(1);
    expect(evidence.normalizedP95Ms).toBe(0);
  });

  test("injected emails, tokens, SQL text, binds and settings never survive the output", () => {
    const evidence = sanitize(
      planPayload({
        ...BASE_PLAN,
        Filter: "author_email = 'owner@example.com'",
        "Recheck Condition": "(status = 'pending')",
        Output: ["id", "title", "$1"],
        Settings: { search_path: "public, secret" },
        "Rows Removed by Filter": 5,
      })
    );
    // The field NAMES persist as redaction evidence; none of their VALUES do.
    expect([...evidence.redactedKeys].sort().join()).toBe(
      "Filter,Output,Recheck Condition,Rows Removed by Filter,Settings"
    );
    expect(JSON.stringify(evidence)).not.toMatch(/example\.com|'pending'|\$1|search_path/);
  });

  test("a forbidden value smuggled through an allowlisted field fails closed", () => {
    expectPlanCheckFailure(
      () => sanitize(planPayload({ ...BASE_PLAN, "Relation Name": "pages password=hunter2" })),
      "plan_contract_invalid",
      /forbidden value/
    );
    expectPlanCheckFailure(
      () => sanitize(planPayload({ ...BASE_PLAN, "Index Name": "idx bearer=abc" })),
      "plan_contract_invalid",
      /forbidden value/
    );
    expectPlanCheckFailure(
      () =>
        sanitize(
          planPayload({
            ...BASE_PLAN,
            "Node Type": "Seq Scan",
            "Relation Name": "writer@corp.example",
          })
        ),
      "plan_contract_invalid",
      /forbidden value/
    );
    // Nested injection: a child node carrying a token in an allowlisted field
    // fails the same way (unknown child fields are merely redacted).
    expectPlanCheckFailure(
      () =>
        sanitize(
          planPayload({
            ...BASE_PLAN,
            Plans: [{ "Node Type": "Sort", "Relation Name": "secret token=deadbeef" }],
          })
        ),
      "plan_contract_invalid",
      /forbidden value/
    );
  });

  test("statement text, malformed payloads and lenient sanitizer options are refused", () => {
    expectPlanCheckFailure(
      () =>
        sanitize(planPayload(BASE_PLAN, { Query: "select id from pages where author_id = $1" })),
      "plan_contract_invalid",
      /still carries statement text/
    );
    expectPlanCheckFailure(
      () => sanitize(null),
      "plan_contract_invalid",
      /not an EXPLAIN JSON document/
    );
    expectPlanCheckFailure(
      () => sanitize([]),
      "plan_contract_invalid",
      /not an EXPLAIN JSON document/
    );
    expectPlanCheckFailure(
      () => sanitize({ noPlan: true }),
      "plan_contract_invalid",
      /no Plan root node/
    );
    expectPlanCheckFailure(
      () => sanitize(planPayload(BASE_PLAN, { Plan: null })),
      "plan_contract_invalid"
    );
    expectPlanCheckFailure(
      () =>
        sanitizePlan(
          planPayload(BASE_PLAN),
          { removeSql: true, removeBinds: false, allowCatalogNames: true } as never,
          SANITIZE_CONTEXT
        ),
      "plan_contract_invalid",
      /options must remove sql and binds/
    );
  });

  test("large-plan assertions demand the expected index, its companion, and no forbidden node", () => {
    const contract = TASK551_PLAN_CONTRACTS.find(
      (entry) => entry.statement.id === "webhooks-created-keyset"
    );
    expect(contract).toBeDefined();
    const planCase = contract?.cases[0];
    expect(planCase?.expectedIndex).toBe("webhooks_list_created_id_idx");
    expect(planCase?.extraExpectedIndex).toBe("webhook_deliveries_webhook_list_idx");
    expect(planCase?.forbiddenLargeNodes.join()).toBe("Seq Scan,Sort");
    if (contract === undefined || planCase === undefined) return;
    const ROOT: Record<string, unknown> = {
      "Node Type": "Nested Loop",
      "Relation Name": "webhooks",
      "Index Name": "webhooks_list_created_id_idx",
      "Plan Rows": 404,
      "Actual Rows": 101,
      "Shared Hit Blocks": 12,
      "Shared Read Blocks": 1,
      "Total Cost": 60,
    };
    const LATERAL: Record<string, unknown> = {
      "Node Type": "Index Scan",
      "Relation Name": "webhook_deliveries",
      "Index Name": "webhook_deliveries_webhook_list_idx",
      "Plan Rows": 1,
      "Actual Rows": 1,
      "Shared Hit Blocks": 3,
      "Shared Read Blocks": 0,
      "Total Cost": 0.5,
    };
    const context = {
      planId: contract.statement.id,
      caseId: planCase.caseId,
      profile: "large" as const,
      statementDigest: contract.statement.statementDigest,
    };
    const sanitizeRoot = (node: Record<string, unknown>): SafePlanEvidence =>
      sanitizePlan(
        planPayload(node),
        { removeSql: true, removeBinds: true, allowCatalogNames: true },
        context
      );
    const evidence = sanitizeRoot({ ...ROOT, Plans: [LATERAL] });
    expect(evidence.usedIndexes.join()).toBe(
      "webhooks_list_created_id_idx,webhook_deliveries_webhook_list_idx"
    );
    expect(() => assertSanitizedLargePlan(planCase, evidence)).not.toThrow();
    // Missing the lateral companion index is a regression of its own.
    expectPlanCheckFailure(
      () => assertSanitizedLargePlan(planCase, sanitizeRoot(ROOT)),
      "plan_regression",
      /companion index/
    );
    // A wrong leading index is the expected-index regression.
    expectPlanCheckFailure(
      () =>
        assertSanitizedLargePlan(
          planCase,
          sanitizeRoot({ ...ROOT, "Index Name": "webhooks_pkey", Plans: [LATERAL] })
        ),
      "plan_regression",
      /expected index/
    );
    // A growing-table sequential scan is forbidden even while the expected
    // index name is still carried by another node.
    expectPlanCheckFailure(
      () =>
        assertSanitizedLargePlan(
          planCase,
          sanitizeRoot({ ...ROOT, "Node Type": "Seq Scan", Plans: [LATERAL] })
        ),
      "plan_regression",
      /forbidden Seq Scan node/
    );
  });

  test("the receipt rows-read semantic is the ANALYZE actual sum, not the planner estimate (audit F7)", () => {
    // The doc-true large outbox plan on the L01 100k fixture: a LIMIT 1 over the
    // partial index `cache_outbox_unprocessed_age_idx`, whose planner estimate
    // (~all unprocessed rows) is wildly larger than the one row it really reads.
    const outbox = selectStaticPlanStatement("cache-outbox-oldest-unprocessed");
    const context = {
      planId: outbox.id,
      caseId: "default",
      profile: "large" as const,
      statementDigest: outbox.statementDigest,
    };
    const evidence = sanitizePlan(
      planPayload({
        "Node Type": "Limit",
        "Relation Name": "cache_invalidation_outbox",
        "Index Name": null,
        "Plan Rows": 1,
        "Actual Rows": 1,
        "Shared Hit Blocks": 1,
        "Shared Read Blocks": 0,
        "Total Cost": 0.2,
        Plans: [
          {
            "Node Type": "Index Scan",
            "Relation Name": "cache_invalidation_outbox",
            "Index Name": "cache_outbox_unprocessed_age_idx",
            "Plan Rows": 99998,
            "Actual Rows": 1,
            "Shared Hit Blocks": 3,
            "Shared Read Blocks": 1,
            "Total Cost": 0.15,
          },
        ],
      }),
      { removeSql: true, removeBinds: true, allowCatalogNames: true },
      context
    );
    // Estimate sum versus measured sum on the SAME plan bytes.
    expect(evidence.rowsRead).toBe(99999);
    expect(actualRowsRead(evidence)).toBe(2);
    expect(evidence.rowsReturned).toBe(1);
    expect(evidence.usedIndexes.join()).toBe("cache_outbox_unprocessed_age_idx");
    // The estimate cannot be receipted (budget large rowsReadMax = 6, receipt
    // large rowsRead = 6 x tolerance 2); the measured sum can, at both scales.
    const receiptOf = (profile: "small" | "large", rowsRead: number): NumericPlanReceipt => {
      const literal = {
        rowsRead,
        rowsReturned: 1,
        sharedHitBuffers: profile === "small" ? 2 : 4,
        sharedReadBuffers: 1,
        normalizedP95Ms: profile === "small" ? 20 : 40,
      };
      return {
        ...literal,
        planSha256: sanitizePlanDigest({
          profile,
          planId: outbox.id,
          caseId: "default",
          ...literal,
        }),
      };
    };
    expectPlanCheckFailure(
      () =>
        assertPlanReceiptWithinBudget(
          outbox.id,
          "default",
          "large",
          receiptOf("large", evidence.rowsRead)
        ),
      "plan_regression",
      /rowsRead exceeds the frozen ceiling/
    );
    expect(() =>
      assertPlanReceiptWithinBudget(
        outbox.id,
        "default",
        "large",
        receiptOf("large", actualRowsRead(evidence))
      )
    ).not.toThrow();
    expect(() =>
      assertPlanReceiptWithinBudget(
        outbox.id,
        "default",
        "small",
        receiptOf("small", actualRowsRead(evidence))
      )
    ).not.toThrow();
  });
});

// --- 4. L01 concurrency receipt: mirrored shape, recomputed digest, malformed arms (doc :759-763, :851). The L01 suite is never imported. ---

const MIRROR_COUNTS = {
  families: 5,
  probesPerFamily: 50,
  bookingOverlapProbes: 50,
  bookingDisjointProbes: 50,
  authorityRaceProbes: 50,
} as const;
const MIRROR_BOOLEANS = { barrierReleasedInFinally: true, childFirstCleanup: true } as const;

describe("L01 concurrency receipt mirror and malformation arms", () => {
  test("the mirror recomputes its sha256 over exactly {counts,booleans} and accepts itself", () => {
    expect(TASK551_L05_CONCURRENCY_RECEIPT_MIRROR.digest).toBe(
      sha256(JSON.stringify({ counts: MIRROR_COUNTS, booleans: MIRROR_BOOLEANS }))
    );
    expect(requireTask551L05ConcurrencyReceipt(TASK551_L05_CONCURRENCY_RECEIPT_MIRROR)).toBe(
      TASK551_L05_CONCURRENCY_RECEIPT_MIRROR
    );
    expect(Object.keys(TASK551_L05_CONCURRENCY_RECEIPT_MIRROR).sort().join()).toBe(
      "booleans,contract,counts,digest"
    );
  });

  test("structural malformations fail closed with constraint_contract_failed", () => {
    const mirror = TASK551_L05_CONCURRENCY_RECEIPT_MIRROR;
    expectPlanCheckFailure(
      () => requireTask551L05ConcurrencyReceipt(null),
      "constraint_contract_failed",
      /unexpected key set/
    );
    expectPlanCheckFailure(
      () => requireTask551L05ConcurrencyReceipt([mirror]),
      "constraint_contract_failed",
      /unexpected key set/
    );
    expectPlanCheckFailure(
      () => requireTask551L05ConcurrencyReceipt("coderso.task551.l05-concurrency-receipt@v1"),
      "constraint_contract_failed",
      /unexpected key set/
    );
    expectPlanCheckFailure(
      () => requireTask551L05ConcurrencyReceipt({ ...mirror, extra: 1 }),
      "constraint_contract_failed",
      /unexpected key set/
    );
    // A receipt that smuggles fixture/client/target/raw-row context is an
    // extra-key rejection: only counts/booleans/digest may exist.
    expectPlanCheckFailure(
      () => requireTask551L05ConcurrencyReceipt({ ...mirror, fixtureIds: ["run-1"] }),
      "constraint_contract_failed",
      /unexpected key set/
    );
    expectPlanCheckFailure(
      () =>
        requireTask551L05ConcurrencyReceipt({
          ...mirror,
          counts: { ...mirror.counts, families: 6 },
        }),
      "constraint_contract_failed",
      /counts\.families drifted/
    );
    expectPlanCheckFailure(
      () =>
        requireTask551L05ConcurrencyReceipt({
          ...mirror,
          counts: { ...mirror.counts, authorityRaceProbes: 49 },
        }),
      "constraint_contract_failed",
      /authorityRaceProbes drifted/
    );
    expectPlanCheckFailure(
      () =>
        requireTask551L05ConcurrencyReceipt({
          ...mirror,
          booleans: { ...mirror.booleans, childFirstCleanup: false },
        }),
      "constraint_contract_failed",
      /not the literal true/
    );
    expectPlanCheckFailure(
      () =>
        requireTask551L05ConcurrencyReceipt({
          ...mirror,
          booleans: { ...mirror.booleans, barrierReleasedInFinally: "true" },
        }),
      "constraint_contract_failed",
      /not the literal true/
    );
  });

  test("digest drift and grammar drift fail closed; the contract literal is exact", () => {
    const mirror = TASK551_L05_CONCURRENCY_RECEIPT_MIRROR;
    expect(mirror.contract).toBe("coderso.task551.l05-concurrency-receipt@v1");
    expectPlanCheckFailure(
      () =>
        requireTask551L05ConcurrencyReceipt({
          ...mirror,
          contract: "coderso.task551.l05-concurrency-receipt@v2",
        }),
      "constraint_contract_failed",
      /foreign contract/
    );
    expectPlanCheckFailure(
      () => requireTask551L05ConcurrencyReceipt({ ...mirror, digest: "0".repeat(64) }),
      "constraint_contract_failed",
      /does not recompute over \{counts,booleans\}/
    );
    expectPlanCheckFailure(
      () => requireTask551L05ConcurrencyReceipt({ ...mirror, digest: "NOT-A-DIGEST" }),
      "constraint_contract_failed",
      /lowercase sha256/
    );
    expectPlanCheckFailure(
      () => requireTask551L05ConcurrencyReceipt({ ...mirror, digest: 42 }),
      "constraint_contract_failed",
      /lowercase sha256/
    );
  });
});

// --- 5. Exact-set catalog verification over a synthetic live catalog (DB-free). The rows below are byte-true `pg_*`-shaped stand-ins built FROM the expectation itself, so the verifier's accept arm and every reject arm run without a socket; the live catalog half is injection-gated (section 9). ---

const mustFailCatalog = (catalog: SyntheticCatalog, message: RegExp): void => {
  let threw: unknown;
  try {
    assertExactTask551Catalog(catalog, PASS_EXPECTED);
  } catch (error) {
    threw = error;
  }
  expect(threw).toBeInstanceOf(Task551PlanCheckError);
  if (threw instanceof Task551PlanCheckError) {
    expect(threw.code).toBe("constraint_contract_failed");
    expect(message.test(threw.message)).toBe(true);
    return;
  }
  throw new Error("expected the exact-set verifier to fail");
};

/** Patch helpers: every mutation arm is one independent detached catalog. */
const patchRows = (
  rows: LooseRecord[],
  match: (row: LooseRecord) => boolean,
  patch: LooseRecord
): LooseRecord[] => rows.map((row) => (match(row) ? { ...row, ...patch } : row));
const withRows = (
  key: keyof SyntheticCatalog,
  match: (row: LooseRecord) => boolean,
  patch: LooseRecord
): SyntheticCatalog => {
  const catalog = cloneSyntheticCatalog();
  (catalog as unknown as LooseRecord)[key] = patchRows(catalog[key] as LooseRecord[], match, patch);
  return catalog;
};
const dropRow = (
  key: keyof SyntheticCatalog,
  match: (row: LooseRecord) => boolean
): SyntheticCatalog => {
  const catalog = cloneSyntheticCatalog();
  const rows = catalog[key] as LooseRecord[];
  rows.splice(rows.findIndex(match), 1);
  return catalog;
};

describe("exact-set catalog verifier (synthetic live rows, no socket)", () => {
  test("the assembled expectation carries the doc-:123-140 surface as content, not wiring", () => {
    // Audit F9: the round-1 arm compared the assembled projection to the very
    // references `buildExpectedTask551Catalog` was handed (`toBe` identity),
    // which proved wiring only. Every projection below is compared by value —
    // against independently spelled landed bytes wherever they exist.
    expect(EXPECTED_CATALOG.ownedTables.length).toBe(43);
    expect(EXPECTED_CATALOG.exactSetTables.join()).toBe(EXPECTED_TASK551_EXACT_SET_TABLES.join());
    // Index projection: all 89 rows, field by field, in both directions.
    const indexShape = (index: ExactIndexRow): string =>
      [
        index.name,
        index.table,
        index.columns.join(","),
        index.predicate ?? "",
        index.unique ? "unique" : "plain",
        index.method,
      ].join("|");
    expect(EXPECTED_CATALOG.indexes.length).toBe(89);
    expect(EXPECTED_CATALOG.indexes.map(indexShape).join("\n")).toBe(
      EXACT_L01_INDEX_ROWS.map(indexShape).join("\n")
    );
    // Vector projection: the seven landed renders carry the doc-:553-555 byte
    // shape — spelled `setweight(to_tsvector('simple', coalesce(...)))`, the
    // `'simple'` regconfig, the A/B weights, the exact `|| ' ' ||`
    // concatenation separator on every weight group that fuses more than one
    // column, and no stable variadic helper call anywhere. A render needs the
    // separator exactly when it holds more `coalesce(` columns than
    // `setweight(` groups (pages/users/assistant_docs/chunks keep one column
    // per weight; entries/posts/media fuse several inside a weight).
    const vectorSources = Object.keys(SEARCH_VECTOR_SQL) as (keyof typeof SEARCH_VECTOR_SQL)[];
    expect(vectorSources.length).toBe(7);
    expect(Object.keys(EXPECTED_CATALOG.vectorExpressions).sort().join()).toBe(
      [...vectorSources].sort().join()
    );
    for (const source of vectorSources) {
      const expression = EXPECTED_CATALOG.vectorExpressions[source];
      expect(expression).toBe(SEARCH_VECTOR_SQL[source]);
      expect(expression.startsWith("setweight(to_tsvector('simple', coalesce(")).toBe(true);
      const weights = expression.split("setweight(").length - 1;
      const columns = expression.split("coalesce(").length - 1;
      expect(weights).toBe(source === "users" ? 1 : 2);
      expect(expression.includes("'A'") && expression.includes("'simple'")).toBe(true);
      expect(columns).toBeGreaterThanOrEqual(weights);
      expect(expression.includes("|| ' ' ||")).toBe(columns > weights);
      expect(expression.includes("'B'")).toBe(source !== "users");
      expect(
        /now\(\)|random\(\)|variadic|concat_ws|array_to_string|string_agg/i.test(expression)
      ).toBe(false);
    }
    // Exclusion projection: the descriptor's own literals, spelled here rather
    // than aliased, plus the assembled constraint row that carries them.
    expect(EXPECTED_CATALOG.bookingExclusion.table).toBe("bookings");
    expect(EXPECTED_CATALOG.bookingExclusion.name).toBe("bookings_active_resource_window_excl");
    expect(EXPECTED_CATALOG.bookingExclusion.predicate).toBe("status IN ('pending', 'confirmed')");
    expect(EXPECTED_CATALOG.bookingExclusion.extensionSql).toBe(
      "CREATE EXTENSION IF NOT EXISTS btree_gist"
    );
    expect(EXPECTED_CATALOG.bookingExclusion.dropSql).toBe(
      "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_active_resource_window_excl"
    );
    expect(EXPECTED_CATALOG.bookingExclusion.definition).toBe(
      `EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (${EXPECTED_CATALOG.bookingExclusion.predicate})`
    );
    expect(EXPECTED_CATALOG.bookingExclusion.addSql).toBe(
      `ALTER TABLE bookings ADD CONSTRAINT ${EXPECTED_CATALOG.bookingExclusion.name} ${EXPECTED_CATALOG.bookingExclusion.definition}`
    );
    const exclusionRow = EXPECTED_CATALOG.constraints.find((row) => row.kind === "exclusion");
    expect([exclusionRow?.name, exclusionRow?.table, exclusionRow?.definition]).toEqual([
      EXCLUSION.name,
      "bookings",
      EXCLUSION.definition,
    ]);
    expect(EXPECTED_CATALOG.constraints.length).toBe(34);
    // Authority projection: the 6 checks and 10 foreign keys reach the
    // expectation with their landed table/kind/definition/column bytes.
    for (const check of AUTHORITY.checks) {
      const row = EXPECTED_CATALOG.constraints.find((candidate) => candidate.name === check.name);
      expect([row?.table, row?.kind, row?.definition]).toEqual([
        check.table,
        "check",
        check.definition,
      ]);
    }
    for (const foreignKey of AUTHORITY.foreignKeys) {
      const row = EXPECTED_CATALOG.constraints.find(
        (candidate) => candidate.name === foreignKey.name
      );
      expect([row?.table, row?.kind, (row?.columns ?? []).join(",")]).toEqual([
        foreignKey.table,
        "foreign-key",
        [...foreignKey.columns].join(","),
      ]);
    }
    // Volatility projection: 9 core signatures, compact `name(args)` bytes,
    // never schema-qualified, and every one a member of the landed core set.
    expect(EXPECTED_CATALOG.immutableProcSignatures.length).toBe(9);
    expect([...EXPECTED_CATALOG.immutableProcSignatures].sort().join()).toBe(
      [...GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES].sort().join()
    );
    for (const signature of EXPECTED_CATALOG.immutableProcSignatures) {
      expect(signature).toMatch(/^[a-z_][a-z0-9_]*\([a-z ,"']*\)$/);
      expect(signature.includes("pg_catalog.")).toBe(false);
    }
    // Manifest projection: the 89 companion builds are 1:1 with the catalog's
    // own index rows (same name/table/uniqueness set), never a projection.
    expect(EXPECTED_CATALOG.onlineIndexManifest.length).toBe(89);
    const manifestShape = (row: { name: string; table: string; unique: boolean }): string =>
      `${row.name}|${row.table}|${row.unique ? "unique" : "plain"}`;
    expect(EXPECTED_CATALOG.onlineIndexManifest.map(manifestShape).sort().join("\n")).toBe(
      EXPECTED_CATALOG.indexes.map(manifestShape).sort().join("\n")
    );
  });

  test("a byte-true synthetic catalog passes; the exclusion row verifies inside the general loop", () => {
    expect(passCatalog.indexes.length).toBe(89);
    // Audit F6: the expectation keeps the exclusion row and the pass arm feeds
    // the full catalog. Both sides of the loop's comparison go through
    // `constraintDefBody`, so the descriptor bytes and the true
    // `pg_get_constraintdef` render normalize to one body:
    //   both -> "(resource_id with =, tsrange(starts_at, ends_at, '[)') with &&)
    //            where (status in ('pending', 'confirmed'))"
    expect(constraintDefBody(EXCLUSION_LIVE_BODY)).toBe(constraintDefBody(EXCLUSION.definition));
    expect(() =>
      assertExactTask551Catalog(
        syntheticCatalog(EXPECTED_CATALOG, true, EXCLUSION_LIVE_BODY),
        EXPECTED_CATALOG
      )
    ).not.toThrow();
    expect(() => assertExactTask551Catalog(cloneSyntheticCatalog(), PASS_EXPECTED)).not.toThrow();
    // The loop is live on that row: a drifted exclusion predicate in the general
    // row set still fails, while the dedicated contype-'x' block keeps its own
    // absent/renamed/drifted arms below.
    mustFailCatalog(
      withRows("constraints", (row) => row.name === EXCLUSION.name, {
        definition: EXCLUSION.definition.replace("'confirmed')", "'confirmed', 'completed')"),
      }),
      /constraint bookings_active_resource_window_excl definition drift/
    );
  });

  test("index arms: missing, not-ready, not-valid, method drift, unnamed and extra objects fail", () => {
    mustFailCatalog(
      dropRow("indexes", (row) =>
        String(row.definition).includes("cache_outbox_unprocessed_age_idx")
      ),
      /missing live index cache_outbox_unprocessed_age_idx/
    );
    mustFailCatalog(
      withRows("indexes", (row) => String(row.definition).includes("pages_list_updated_id_idx"), {
        ready: false,
      }),
      /pages_list_updated_id_idx is not ready\/valid/
    );
    mustFailCatalog(
      withRows("indexes", (row) => String(row.definition).includes("posts_tags_gin_idx"), {
        valid: false,
      }),
      /posts_tags_gin_idx is not ready\/valid/
    );
    mustFailCatalog(
      withRows("indexes", (row) => String(row.definition).includes("media_tags_gin_idx"), {
        method: "hash",
      }),
      /index media_tags_gin_idx method drift/
    );
    mustFailCatalog(
      {
        ...cloneSyntheticCatalog(),
        indexes: [
          {
            table: "pages",
            method: "btree",
            definition: "CREATE INDEX ON pages USING btree (id)",
            ready: true,
            valid: true,
          },
        ],
      },
      /unnamed or duplicated/
    );
    const extra = cloneSyntheticCatalog();
    extra.indexes.push({
      table: "cache_invalidation_outbox",
      method: "btree",
      definition:
        'CREATE INDEX "cache_invalidation_outbox_extra_idx" ON "cache_invalidation_outbox" USING btree (event_key)',
      ready: true,
      valid: true,
    });
    mustFailCatalog(extra, /unexpected TASK-551-owned index cache_invalidation_outbox_extra_idx/);
    // Pre-task tables sit outside the exact-set scope: an extra `pages` row passes.
    const extraPreTask = cloneSyntheticCatalog();
    extraPreTask.indexes.push({
      table: "pages",
      method: "btree",
      definition: 'CREATE INDEX "pages_pre_task_idx" ON "pages" USING btree (id)',
      ready: true,
      valid: true,
    });
    expect(() => assertExactTask551Catalog(extraPreTask, PASS_EXPECTED)).not.toThrow();
  });

  test("constraint arms: missing, kind drift, definition drift and extra objects fail", () => {
    mustFailCatalog(
      dropRow("constraints", (row) => row.name === "cache_invalidation_outbox_state_chk"),
      /missing live constraint cache_invalidation_outbox_state_chk/
    );
    mustFailCatalog(
      withRows("constraints", (row) => row.name === "bookings_valid_window_chk", { kind: "u" }),
      /constraint bookings_valid_window_chk kind drift/
    );
    mustFailCatalog(
      withRows("constraints", (row) => row.name === "task551_migration_operations_task_chk", {
        definition: "CHECK (task_id = 'TASK-552')",
      }),
      /task551_migration_operations_task_chk definition drift/
    );
    const extra = cloneSyntheticCatalog();
    extra.constraints.push({
      name: "cache_invalidation_outbox_extra_chk",
      table: "cache_invalidation_outbox",
      kind: "c",
      definition: "CHECK (true)",
    });
    mustFailCatalog(
      extra,
      /unexpected TASK-551-owned constraint cache_invalidation_outbox_extra_chk/
    );
  });

  test("column arms: type, nullability, default (both directions) and presence drift fail", () => {
    mustFailCatalog(
      withRows("columns", (row) => row.name === "tags", { type: "text" }),
      /cache_invalidation_outbox\.tags type\/nullability drift/
    );
    mustFailCatalog(
      withRows("columns", (row) => row.name === "operation_id", { not_null: false }),
      /task551_migration_operations\.operation_id type\/nullability drift/
    );
    mustFailCatalog(
      withRows("columns", (row) => row.name === "attempts", { default_sql: "1" }),
      /cache_invalidation_outbox\.attempts default drift/
    );
    mustFailCatalog(
      withRows("columns", (row) => row.name === "claim_token", { default_sql: "now()" }),
      /cache_invalidation_outbox\.claim_token default drift/
    );
    mustFailCatalog(
      dropRow("columns", (row) => row.name === "state_sha256"),
      /missing live column task551_migration_operations\.state_sha256/
    );
  });

  test("volatility arms: a stable, volatile or missing generated-expression dependency fails", () => {
    mustFailCatalog(
      withRows("procVolatility", (row) => row.signature === "to_tsvector(regconfig,text)", {
        provolatile: "s",
      }),
      /dependency to_tsvector\(regconfig,text\) is not immutable/
    );
    mustFailCatalog(
      withRows("procVolatility", (row) => row.signature === "jsonb_out(jsonb)", {
        provolatile: "v",
      }),
      /dependency jsonb_out\(jsonb\) is not immutable/
    );
    mustFailCatalog(
      dropRow("procVolatility", (row) => row.signature === 'setweight(tsvector,"char")'),
      /missing generated-expression dependency setweight\(tsvector,"char"\)/
    );
  });

  test("exclusion arms: absent, renamed and predicate-drifted live objects fail", () => {
    const absent = cloneSyntheticCatalog();
    absent.exclusion = [];
    mustFailCatalog(absent, /custom booking exclusion constraint is absent or renamed/);
    mustFailCatalog(
      withRows("exclusion", () => true, { name: "bookings_window_excl_v2" }),
      /custom booking exclusion constraint is absent or renamed/
    );
    mustFailCatalog(
      withRows("exclusion", () => true, {
        definition: EXCLUSION_LIVE_BODY.replace(
          "'pending', 'confirmed'",
          "'pending', 'confirmed', 'completed')"
        ),
      }),
      /booking exclusion predicate drifted/
    );
  });

  test("the F3/F4 pg-shape arms execute: key columns, predicate, uniqueness, opclass, generated columns, FKs", () => {
    // Audit R1: the synthetic index rows used to carry only
    // {table,method,definition,ready,valid}, so `live.columns` was never a
    // string, `live.predicate` stayed undefined, the indisunique path and the
    // gin_trgm_ops opclass map never ran, and the generated/FK arms were
    // skipped — a pg byte-shape mismatch could only surface at the owner run.
    // Every one of those comparison paths now executes in this suite.
    const syntheticIndexRow = (name: string): SyntheticRow => {
      const row = passCatalog.indexes.find((candidate) => candidate.name === name);
      expect(row).toBeDefined();
      return row as SyntheticRow;
    };
    for (const row of passCatalog.indexes) {
      expect(typeof row.columns).toBe("string");
      expect(row.predicate !== undefined).toBe(true);
      expect(typeof row.unique).toBe("boolean");
    }
    // Ordered key columns: pg's `,`-joined `string_agg` bytes and its uppercase
    // DESC fold onto the manifest spelling.
    expect(String(syntheticIndexRow("pages_list_updated_id_idx").columns)).toBe(
      "updated_at DESC,id DESC"
    );
    // The five trigram GIN indexes are the only opclass carriers (fixture :1257).
    const trigramIndexes = EXACT_L01_INDEX_ROWS.filter((index) =>
      TRIGRAM_OPCLASS_BY_INDEX.has(index.name)
    );
    expect(
      trigramIndexes
        .map((index) => index.name)
        .sort()
        .join()
    ).toBe(
      "content_entries_search_trigram_idx,media_search_trigram_idx,pages_search_trigram_idx,posts_search_trigram_idx,users_search_trigram_idx"
    );
    for (const index of trigramIndexes)
      expect(String(syntheticIndexRow(index.name).columns)).toBe(
        "search_trigram_text gin_trgm_ops"
      );
    // Partial predicates in the true deparse shape on every partial index.
    const partial = passCatalog.indexes.filter((row) => row.predicate !== null);
    expect(partial.length).toBe(
      EXACT_L01_INDEX_ROWS.filter((index) => index.predicate !== null).length
    );
    for (const row of partial) expect(String(row.predicate).startsWith("((")).toBe(true);
    expect(String(syntheticIndexRow("cache_invalidation_outbox_pending_idx").predicate)).toBe(
      "((processed_at IS NULL) AND (claim_token IS NULL))"
    );
    // Uniqueness rides the indisunique flag, and the F4 arms are populated.
    expect(passCatalog.indexes.filter((row) => row.unique === true).length).toBe(
      EXACT_L01_INDEX_ROWS.filter((index) => index.unique).length
    );
    expect(passCatalog.generatedExpressions.length).toBe(12);
    expect(passCatalog.foreignKeys.length).toBe(AUTHORITY.foreignKeys.length);
    expect(
      passCatalog.foreignKeys.every((row) => row.on_delete === "r" && row.on_update === "n")
    ).toBe(true);
    // The authority columns ride along, so the F4 presence-gated column arm opens.
    expect(
      passCatalog.columns.some((row) => row.table === "solution_kit_starter_apply_owners")
    ).toBe(true);
  });

  test("F3/F4 mutation arms: column order, predicate, opclass, uniqueness, generated and FK drift each fail named", () => {
    const fk = AUTHORITY.foreignKeys[0]!.name;
    // Mutated key-column order (and a lost DESC direction) — never re-sorted.
    mustFailCatalog(
      withRows("indexes", (row) => row.name === "pages_list_updated_id_idx", {
        columns: "id DESC, updated_at DESC",
      }),
      /index pages_list_updated_id_idx column\/direction\/opclass drift/
    );
    // A dropped or narrowed partial predicate is compared against null/bytes.
    mustFailCatalog(
      withRows("indexes", (row) => row.name === "cache_invalidation_outbox_pending_idx", {
        predicate: null,
      }),
      /index cache_invalidation_outbox_pending_idx predicate drift/
    );
    mustFailCatalog(
      withRows("indexes", (row) => row.name === "cache_invalidation_outbox_pending_idx", {
        predicate: "((processed_at IS NULL) AND (claim_token IS NOT NULL))",
      }),
      /index cache_invalidation_outbox_pending_idx predicate drift/
    );
    // A wrong or missing opclass on the trigram GIN indexes.
    mustFailCatalog(
      withRows("indexes", (row) => row.name === "users_search_trigram_idx", {
        columns: "search_trigram_text text_pattern_ops",
      }),
      /index users_search_trigram_idx column\/direction\/opclass drift/
    );
    mustFailCatalog(
      withRows("indexes", (row) => row.name === "media_search_trigram_idx", {
        columns: "search_trigram_text",
      }),
      /index media_search_trigram_idx column\/direction\/opclass drift/
    );
    // Uniqueness through the indisunique flag itself.
    mustFailCatalog(
      withRows("indexes", (row) => row.name === "page_revisions_page_version_idx", {
        unique: false,
      }),
      /index page_revisions_page_version_idx uniqueness drift/
    );
    // Generated columns: missing, drifted bytes and an unexpected extra in scope.
    mustFailCatalog(
      dropRow(
        "generatedExpressions",
        (row) => `${String(row.table)}.${String(row.name)}` === "users.search_trigram_text"
      ),
      /missing live generated column users\.search_trigram_text/
    );
    mustFailCatalog(
      withRows(
        "generatedExpressions",
        (row) => `${String(row.table)}.${String(row.name)}` === "users.search_trigram_text",
        { expression: "lower(btrim(coalesce(name, ''), 'x'))" }
      ),
      /generated expression users\.search_trigram_text drift/
    );
    const extraGenerated = cloneSyntheticCatalog();
    extraGenerated.generatedExpressions.push({
      table: "cache_invalidation_outbox",
      name: "search_vector_extra",
      expression: "to_tsvector('simple', event_key)",
    });
    mustFailCatalog(
      extraGenerated,
      /unexpected TASK-551-owned generated column cache_invalidation_outbox\.search_vector_extra/
    );
    // Authority FKs: action codes, column/target bytes, presence and extras.
    mustFailCatalog(
      withRows("foreignKeys", (row) => row.name === fk, { on_delete: "c" }),
      /foreign key solution_kit_starter_apply_owners_source_run_id_solution_kit_install_runs_id_fk delete\/update action drift/
    );
    mustFailCatalog(
      withRows("foreignKeys", (row) => row.name === fk, { target_columns: "id,kit_id" }),
      /foreign key solution_kit_starter_apply_owners_source_run_id_solution_kit_install_runs_id_fk column\/target drift/
    );
    mustFailCatalog(
      dropRow("foreignKeys", (row) => row.name === fk),
      /missing live foreign key solution_kit_starter_apply_owners_source_run_id_solution_kit_install_runs_id_fk/
    );
    const extraFk = cloneSyntheticCatalog();
    extraFk.foreignKeys.push({
      name: "solution_kit_starter_apply_owners_extra_fk",
      table: "solution_kit_starter_apply_owners",
      columns: "package_key",
      target_table: "solution_kit_install_runs",
      target_columns: "id",
      on_delete: "r",
      on_update: "n",
    });
    mustFailCatalog(
      extraFk,
      /unexpected TASK-551-owned foreign key solution_kit_starter_apply_owners_extra_fk/
    );
    // The F4 authority-column arm is live too: a drifted default fails.
    mustFailCatalog(
      withRows(
        "columns",
        (row) => row.table === "solution_kit_starter_apply_owners" && row.name === "created_at",
        { default_sql: "clock_timestamp()" }
      ),
      /column solution_kit_starter_apply_owners\.created_at default drift/
    );
  });
});

// --- 6. Authority projection, immutable volatility set and the exclusion descriptor (doc :157-176, :646-655) — DB-free. ---

describe("L03 authority projection, volatility set and exclusion descriptor", () => {
  test("the injected authority projection carries the exact tables, checks, keys and columns", () => {
    expect(AUTHORITY.contract).toBe("coderso.task551.l03-rollback-authority@v1");
    expect(AUTHORITY.tables.join()).toBe(
      "solution_kit_starter_apply_owners,solution_kit_legacy_template_evidence,solution_kit_legacy_rollback_progress,solution_kit_install_runs"
    );
    expect(AUTHORITY.checks.length).toBe(6);
    expect(AUTHORITY.foreignKeys.length).toBe(10);
    for (const foreignKey of AUTHORITY.foreignKeys) {
      expect(foreignKey.onDelete).toBe("RESTRICT");
      expect(foreignKey.onUpdate).toBe("NO ACTION");
    }
    // A nullable owner package/actor would be rejected: both are NOT NULL.
    const ownerColumns = AUTHORITY.columns.filter(
      (column) => column.table === "solution_kit_starter_apply_owners"
    );
    for (const name of [
      "source_run_id",
      "package_key",
      "actor_id",
      "contract",
      "envelope_digest",
    ]) {
      expect(ownerColumns.find((column) => column.name === name)?.nullable).toBe(false);
    }
    for (const check of AUTHORITY.checks) {
      expect(
        EXPECTED_CATALOG.constraints.some(
          (row) =>
            row.name === check.name && row.kind === "check" && row.definition === check.definition
        )
      ).toBe(true);
    }
    for (const foreignKey of AUTHORITY.foreignKeys) {
      expect(
        EXPECTED_CATALOG.constraints.some(
          (row) => row.name === foreignKey.name && row.kind === "foreign-key"
        )
      ).toBe(true);
    }
    for (const table of AUTHORITY.tables) expect(EXPECTED_CATALOG.ownedTables).toContain(table);
    // 13 literal checks + 4 new uniques + 1 exclusion + 6 authority checks + 10 FKs.
    expect(EXPECTED_CATALOG.constraints.length).toBe(34);
  });

  test("the closed immutable pg_proc dependency set is exactly the core literal", () => {
    expect(EXPECTED_CATALOG.immutableProcSignatures.length).toBe(9);
    expect([...EXPECTED_CATALOG.immutableProcSignatures].sort().join()).toBe(
      [...GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES].sort().join()
    );
    for (const signature of EXPECTED_CATALOG.immutableProcSignatures) {
      expect(
        passCatalog.procVolatility.some(
          (row) => row.signature === signature && row.provolatile === "i"
        )
      ).toBe(true);
    }
  });

  test("the exclusion descriptor is deep-frozen, byte-exact and never copied", () => {
    expect(EXPECTED_CATALOG.bookingExclusion).toBe(EXCLUSION);
    expect(Object.isFrozen(EXCLUSION)).toBe(true);
    expect(() => {
      (EXCLUSION as unknown as { predicate: string }).predicate = "status IN ('pending')";
    }).toThrow();
    expect(Object.keys(EXCLUSION).sort().join()).toBe(
      "addSql,definition,dropSql,extensionSql,name,predicate,table"
    );
    expect(
      EXCLUSION.addSql.startsWith(
        `ALTER TABLE bookings ADD CONSTRAINT ${EXCLUSION.name} EXCLUDE USING gist`
      )
    ).toBe(true);
    expect(EXCLUSION.dropSql).toBe(
      "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_active_resource_window_excl"
    );
    expect(EXCLUSION.definition).toContain(EXCLUSION.predicate);
  });

  test("the true live exclusion shape and the intentional snapshot omission are exact", () => {
    expect(EXCLUSION_LIVE_BODY).toContain("USING gist");
    expect(EXCLUSION_LIVE_BODY).toContain("resource_id WITH =");
    expect(EXCLUSION_LIVE_BODY).toContain("tsrange(starts_at, ends_at, '[)') WITH &&");
    expect(EXCLUSION_LIVE_BODY.endsWith(`WHERE (${EXCLUSION.predicate})`)).toBe(true);
    expect(constraintDefBody(EXCLUSION_LIVE_BODY)).not.toContain("EXCLUDE");
    let fake = 0;
    for (const table of Object.values(SNAPSHOT.tables)) {
      if (
        table.indexes[EXCLUSION.name] !== undefined ||
        table.checkConstraints[EXCLUSION.name] !== undefined ||
        table.uniqueConstraints[EXCLUSION.name] !== undefined
      )
        fake += 1;
    }
    expect(fake).toBe(0);
    // The companion never carries the exclusion add/extension/drop either.
    expect(ONLINE_SQL.includes(EXCLUSION.addSql)).toBe(false);
    expect(ONLINE_SQL.includes(EXCLUSION.extensionSql)).toBe(false);
    expect(ONLINE_SQL.includes(EXCLUSION.dropSql)).toBe(false);
  });
});

// --- 7. Reviewed freeze-receipt gate and version-2 migration receipt grammar (doc :207-209, :578-595) — DB-free. ---

const ISO_INSTANT = "2026-01-15T12:00:00.000Z";
type LooseRecord = { [key: string]: unknown };
const setIn = (object: unknown, key: string, value: unknown): void => {
  (object as LooseRecord)[key] = value;
};

describe("reviewed freeze-receipt gate", () => {
  test("small is candidate (fail-closed) and large is reviewed (the open profile)", () => {
    expect(TASK551_DATABASE_FREEZE_RECEIPT.small.reviewState).toBe("candidate");
    expect(TASK551_DATABASE_FREEZE_RECEIPT.large.reviewState).toBe("reviewed");
    expectPlanCheckFailure(
      () => requireReviewedTask551FreezeReceipt("small"),
      "constraint_contract_failed",
      /task551_freeze_receipt_unreviewed/
    );
    // The reviewed large gate opens: identity (budget ceilings, pool wait,
    // digests) holds against the frozen budgets, so the dynamic large phase is
    // authorized while the small phase stays fail-closed until review.
    const opened = requireReviewedTask551FreezeReceipt("large");
    expect(opened.profile).toBe("large");
    expect(opened.statementCeilings.length).toBe(32);
  });

  test("a reviewed receipt binds the frozen budgets; every drift arm fails closed", () => {
    const identity = assertTask551FreezeReceiptIdentity;
    type FreezeParam = Parameters<typeof identity>[0];
    const mutateFreeze = (mutate: (receipt: LooseRecord) => void): LooseRecord => {
      const clone = structuredClone(
        TASK551_DATABASE_FREEZE_RECEIPT.large
      ) as unknown as LooseRecord;
      setIn(clone, "reviewState", "reviewed");
      mutate(clone);
      return clone;
    };
    const drift = (receipt: unknown, message: RegExp): void =>
      expectPlanCheckFailure(
        () => identity(receipt as FreezeParam, "large"),
        "constraint_contract_failed",
        message
      );
    expect(() => identity(mutateFreeze(() => {}) as FreezeParam, "large")).not.toThrow();
    drift(
      mutateFreeze((receipt) => setIn(receipt, "profile", "small")),
      /profile does not match the requested scale/
    );
    drift(
      mutateFreeze((receipt) =>
        setIn((receipt.statementCeilings as LooseRecord[])[0], "ceiling", { rowsReadMax: 1000000 })
      ),
      /drifted from the frozen budgets/
    );
    drift(
      mutateFreeze((receipt) => {
        const rows = receipt.statementCeilings as LooseRecord[];
        rows.pop();
      }),
      /exactly 32 statement ceilings/
    );
    // A duplicated id cannot mask an omission: the second occurrence no longer
    // resolves in the frozen set and is caught as ceiling drift.
    drift(
      mutateFreeze((receipt) => {
        const rows = receipt.statementCeilings as LooseRecord[];
        rows.pop();
        rows.push({ ...rows[0] });
      }),
      /drifted from the frozen budgets/
    );
    drift(
      mutateFreeze((receipt) => setIn(receipt, "reviewState", "candidate")),
      /is not reviewed/
    );
    drift(
      mutateFreeze((receipt) => setIn(receipt, "poolWaitCeiling", { p95MsMax: 0.01 })),
      /pool-wait ceiling drifted/
    );
    drift(
      mutateFreeze((receipt) => setIn(receipt, "extra", 1)),
      /unexpected key set/
    );
    // The reviewed large gate opens against the frozen budgets: the pool-wait
    // ceiling byte-matches and exactly 32 ceilings are bound.
    expect(requireReviewedTask551FreezeReceipt("large").statementCeilings.length).toBe(32);
    expect(TASK551_DATABASE_FREEZE_RECEIPT.large.poolWaitCeiling).toStrictEqual(
      TASK551_POOL_WAIT_BUDGETS.large
    );
    expect(Object.keys(TASK551_POOL_WAIT_BUDGETS).sort().join()).toBe("large,small");
  });
});

// --- The valid version-2 receipt fixture and its mutation helper. ---

const VALID_MIGRATION_RECEIPT: LooseRecord = (() => {
  const manifest = EXACT_L01_ONLINE_INDEX_MANIFEST;
  const sha = (seed: string): string => sha256(seed);
  const member = (name: string, group: string, order: number, seed: string): LooseRecord => ({
    name,
    group,
    order,
    definitionSha256: sha(seed),
    state: "ready",
    complete: true,
    completedAt: ISO_INSTANT,
  });
  return {
    version: 2,
    taskId: "TASK-551",
    operationId: "0f0e0d0c-0b0a-4938-8765-4321098765fe",
    generation: 1,
    previousStateSha256: null,
    stateSha256: sha("state"),
    direction: "forward",
    state: "forward_ready",
    journal: { index: 81, tag: "0081_task551_online_indexes" },
    artifacts: {
      transactionalSql: {
        path: "core/db/migrations/0081_task551_search_indexes_constraints_outbox.sql",
        sha256: sha("transactional"),
      },
      snapshot: { path: "core/db/migrations/meta/0081_snapshot.json", sha256: sha("snapshot") },
      onlineSql: {
        path: "core/db/migrations/0081_task551_online_indexes.sql",
        sha256: sha("online"),
      },
      manifestSha256: sha("manifest"),
      aggregateSha256: sha("aggregate"),
    },
    preflight: {
      digest: sha("preflight"),
      classification: "large",
      lockTimeoutMs: 2000,
      statementTimeoutMs: 30000,
      transactionTimeoutMs: 120000,
      recheckDigests: [sha("recheck")],
    },
    admission: {
      mode: "external",
      fleet: { runtimeProcessCount: 1, workerProcessCount: 16, totalProcessCount: 17 },
      adapterSha256: sha("adapter"),
      drainNonce: "a".repeat(32),
      prepareAckSha256: sha("prepare"),
      quiescentFrom: ISO_INSTANT,
      quiescentUntil: ISO_INSTANT,
      resumeNonce: "b".repeat(32),
      resumeAuthorizationSha256: sha("resume-auth"),
      resumeAckSha256: sha("resume-ack"),
      resumeBinarySha256: sha("binary"),
      revisionWriterCompatibilitySha256: sha("compat"),
      newBinaryTrafficAccepted: true,
    },
    transaction: { apply: "applied", catalogSha256: sha("catalog") },
    groups: [
      {
        name: "revision-integrity",
        members: [manifest[0]?.name, manifest[1]?.name],
        complete: true,
        completedAt: ISO_INSTANT,
      },
      {
        name: "read-performance",
        members: manifest.slice(2).map((row) => row.name),
        complete: true,
        completedAt: ISO_INSTANT,
      },
    ],
    forwardMembers: manifest.map((row) =>
      member(row.name, row.group, row.order, `fwd-${row.name}`)
    ),
    reverseMembers: manifest.map((row) =>
      member(row.name, row.group, row.order, `rev-${row.name}`)
    ),
    finalCatalogReady: true,
  };
})();

const mutateReceipt = (mutate: (receipt: LooseRecord) => void): unknown => {
  const clone = JSON.parse(JSON.stringify(VALID_MIGRATION_RECEIPT)) as LooseRecord;
  mutate(clone);
  return clone;
};

describe("version-2 migration receipt grammar and online-index parity", () => {
  test("a fully-formed receipt validates and reaches one-to-one manifest parity", () => {
    const parsed = assertTask551MigrationReceiptV2(VALID_MIGRATION_RECEIPT);
    expect(parsed.version).toBe(2);
    expect(parsed.taskId).toBe("TASK-551");
    expect(parsed.groups.map((group) => group.name).join()).toBe(
      "revision-integrity,read-performance"
    );
    expect(parsed.forwardMembers.length).toBe(89);
    expect(() => assertTask551OnlineIndexReceiptParity(parsed)).not.toThrow();
  });

  test("header, journal, artifact and preflight grammar arms fail closed", () => {
    const v = "constraint_contract_failed" as const;
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(mutateReceipt((receipt) => setIn(receipt, "version", 1))),
      v,
      /not a TASK-551 version-2 receipt/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt, "taskId", "TASK-552"))
        ),
      v,
      /not a TASK-551 version-2 receipt/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt, "operationId", "not-a-uuid"))
        ),
      v,
      /not a uuid/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt, "generation", 0))
        ),
      v,
      /not an integer in \[1,2147483647\]/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => {
            setIn(receipt, "generation", 2);
            setIn(receipt, "previousStateSha256", null);
          })
        ),
      v,
      /requires the previous state digest/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt, "direction", "up"))
        ),
      v,
      /direction is foreign/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt, "state", "flying"))
        ),
      v,
      /state is foreign/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt.journal, "extra", 1))
        ),
      v,
      /unexpected key set/
    );
    const artifacts = mutateReceipt((receipt) =>
      setIn(receipt.artifacts, "snapshot", { path: "../escape.json", sha256: sha256("x") })
    ) as LooseRecord;
    expectPlanCheckFailure(
      () => assertTask551MigrationReceiptV2(artifacts),
      v,
      /repository-relative path/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt.preflight, "lockTimeoutMs", 0))
        ),
      v,
      /not the locked value/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt.preflight, "classification", "medium"))
        ),
      v,
      /classification is foreign/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt.preflight, "recheckDigests", []))
        ),
      v,
      /recheck digests are malformed/
    );
  });

  test("admission, transaction, group and member grammar arms fail closed", () => {
    const v = "constraint_contract_failed" as const;
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt.admission, "mode", "ambient"))
        ),
      v,
      /admission mode is foreign/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt.admission, "drainNonce", "short"))
        ),
      v,
      /drain nonce is malformed/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt.admission, "newBinaryTrafficAccepted", "yes"))
        ),
      v,
      /not the literal true/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt.transaction, "apply", "skipped"))
        ),
      v,
      /apply state is foreign/
    );
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => {
            const groups = receipt.groups as LooseRecord[];
            setIn(receipt, "groups", [groups[1], groups[0]]);
          })
        ),
      v,
      /not in the exact revision-integrity then read-performance order/
    );
    const threeMembers = mutateReceipt((receipt) =>
      setIn((receipt.groups as LooseRecord[])[0], "members", ["a", "b", "c"])
    ) as LooseRecord;
    expectPlanCheckFailure(
      () => assertTask551MigrationReceiptV2(threeMembers),
      v,
      /exactly two members/
    );
    const foreignGroup = mutateReceipt((receipt) =>
      setIn((receipt.forwardMembers as LooseRecord[])[0], "group", "deployment")
    ) as LooseRecord;
    expectPlanCheckFailure(() => assertTask551MigrationReceiptV2(foreignGroup), v, /foreign group/);
    const foreignState = mutateReceipt((receipt) =>
      setIn((receipt.forwardMembers as LooseRecord[])[3], "state", "flying")
    ) as LooseRecord;
    expectPlanCheckFailure(() => assertTask551MigrationReceiptV2(foreignState), v, /foreign state/);
    expectPlanCheckFailure(
      () =>
        assertTask551MigrationReceiptV2(
          mutateReceipt((receipt) => setIn(receipt, "finalCatalogReady", false))
        ),
      v,
      /not the literal true/
    );
  });

  test("parity arms: reordered, misnumbered, incomplete or foreign members fail", () => {
    const parity = assertTask551OnlineIndexReceiptParity;
    const reordered = mutateReceipt((receipt) => {
      const members = receipt.forwardMembers as LooseRecord[];
      const swap = members[0];
      members[0] = members[1];
      members[1] = swap;
    });
    expectPlanCheckFailure(
      () => parity(assertTask551MigrationReceiptV2(reordered)),
      "constraint_contract_failed",
      /not exactly the closed manifest order/
    );
    const misnumbered = mutateReceipt((receipt) =>
      setIn((receipt.forwardMembers as LooseRecord[])[5], "order", 999)
    ) as LooseRecord;
    expectPlanCheckFailure(
      () => parity(assertTask551MigrationReceiptV2(misnumbered)),
      "constraint_contract_failed",
      /carries a foreign order/
    );
    const incomplete = mutateReceipt((receipt) =>
      setIn((receipt.forwardMembers as LooseRecord[])[0], "complete", false)
    ) as LooseRecord;
    expectPlanCheckFailure(
      () => parity(assertTask551MigrationReceiptV2(incomplete)),
      "constraint_contract_failed",
      /ready without a completed build/
    );
    const foreignReverse = mutateReceipt((receipt) => {
      (receipt.reverseMembers as unknown[]).push({
        name: "not_a_manifest_index",
        group: "read-performance",
        order: 999,
        definitionSha256: sha256("x"),
        state: "ready",
        complete: true,
        completedAt: ISO_INSTANT,
      });
    }) as LooseRecord;
    expectPlanCheckFailure(
      () => parity(assertTask551MigrationReceiptV2(foreignReverse)),
      "constraint_contract_failed",
      /is not a manifest index/
    );
    const foreignReader = mutateReceipt((receipt) => {
      ((receipt.groups as LooseRecord[])[1]!.members as unknown[]).push("pages_pkey");
    }) as LooseRecord;
    expectPlanCheckFailure(
      () => parity(assertTask551MigrationReceiptV2(foreignReader)),
      "constraint_contract_failed",
      /is not a manifest index/
    );
    const wrongIntegrity = mutateReceipt((receipt) =>
      setIn((receipt.groups as LooseRecord[])[0], "members", ["pages_pkey", "posts_pkey"])
    ) as LooseRecord;
    expectPlanCheckFailure(
      () => parity(assertTask551MigrationReceiptV2(wrongIntegrity)),
      "constraint_contract_failed",
      /not the exact two revision builds/
    );
  });

  test("the landed L01 migration receipt, when present, is consumed read-only through the same grammar", () => {
    const receiptPath = join(MIGRATION_DIR, "../../.tmp/task551-migration-receipt.json");
    if (!existsSync(receiptPath)) return; // L01 generates it; absence is not a failure of this leaf.
    const parsed = assertTask551MigrationReceiptV2(
      JSON.parse(readFileSync(receiptPath, "utf8")) as unknown
    );
    expect(() => assertTask551OnlineIndexReceiptParity(parsed)).not.toThrow();
  });
});

// --- 8. Fixture-target seam with a fake injected client, plus the cross-leaf source contract (doc :726-734, :782-808) — no real connection is opened. ---

const VALID_CHILD: LooseRecord = {
  TASK551_FIXTURE_DATABASE_URL:
    "postgresql://task551_owner:task551_secret@127.0.0.1:5433/coderso02",
  TASK551_FIXTURE_DATABASE_NAME: "coderso02",
  TASK551_FIXTURE_DATABASE_SENTINEL: "task551-fixture-sentinel-0123456789abcdef0123456789abcdef",
};
const OK_OBSERVATION = {
  currentDatabaseMatched: true,
  markerCount: 1,
  boundSentinelByteMatched: true,
};
const rejectsWithInvalid = async (run: () => Promise<unknown>): Promise<void> => {
  let message = "";
  try {
    await run();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBe("database_baseline_invalid");
};
const proofClient = (
  observation: unknown,
  rollback: () => Promise<void> = async () => {},
  begin: () => void = () => {}
): Task551FixtureTargetClient => ({
  beginReadOnlyTransaction: async () => {
    begin();
    return { readFixtureTargetProof: async () => observation as never, rollback };
  },
});

describe("fixture-target seam and cross-leaf source contract (no socket)", () => {
  test("the exact three-key map parses to the bound frozen target and the proof binds it", async () => {
    const target = parseTask551FixtureTarget(VALID_CHILD);
    expect(Object.isFrozen(target)).toBe(true);
    expect(target.url).toBe(VALID_CHILD.TASK551_FIXTURE_DATABASE_URL);
    expect(target.expectedDatabaseName).toBe("coderso02");
    expect(target.sentinel).toBe(VALID_CHILD.TASK551_FIXTURE_DATABASE_SENTINEL);
    const inputs: unknown[] = [];
    let rollbacks = 0;
    const client: Task551FixtureTargetClient = {
      beginReadOnlyTransaction: async () => ({
        readFixtureTargetProof: async (input) => {
          inputs.push(input);
          return OK_OBSERVATION as never;
        },
        rollback: async () => {
          rollbacks += 1;
        },
      }),
    };
    expect(await assertTask551FixtureTarget(target, client)).toStrictEqual({
      rolledBack: true,
      currentDatabaseMatched: true,
      exactSingleMarkerMatched: true,
      boundSentinelByteMatched: true,
    });
    expect(
      (await assertTask551FixtureTargetPostCleanup(target, client)).boundSentinelByteMatched
    ).toBe(true);
    expect(rollbacks).toBe(2);
    expect(inputs[0]).toStrictEqual({
      expectedDatabaseName: "coderso02",
      expectedSentinel: target.sentinel,
      marker: "task551-baseline-v1",
      sentinelTable: "public.task551_fixture_sentinel",
    });
  });

  test("foreign or malformed child maps and failed proofs are rejected fail-closed", async () => {
    const child = (patch: LooseRecord): LooseRecord => ({ ...VALID_CHILD, ...patch });
    expectTargetRejection(() => assertTask551FixtureTargetChildKeys(null as never));
    expectTargetRejection(() => assertTask551FixtureTargetChildKeys([VALID_CHILD] as never));
    expectTargetRejection(() => assertTask551FixtureTargetChildKeys({} as never));
    expectTargetRejection(() => assertTask551FixtureTargetChildKeys(child({ EXTRA: 1 })));
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys({
        TASK551_FIXTURE_DATABASE_URL: VALID_CHILD.TASK551_FIXTURE_DATABASE_URL,
        TASK551_FIXTURE_DATABASE_NAME: "coderso02",
      })
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(child({ TASK551_FIXTURE_DATABASE_NAME: "coderso" }))
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(
        child({
          TASK551_FIXTURE_DATABASE_URL:
            "mysql://task551_owner:task551_secret@127.0.0.1:5433/coderso02",
        })
      )
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(
        child({
          TASK551_FIXTURE_DATABASE_URL:
            "postgresql://task551_owner:task551_secret@127.0.0.1:5433/other?sslmode=disable",
        })
      )
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(
        child({
          TASK551_FIXTURE_DATABASE_URL:
            "postgresql://task551_owner:task551_secret@127.0.0.1:5433/coderso02#frag",
        })
      )
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(
        child({ TASK551_FIXTURE_DATABASE_URL: "postgresql://127.0.0.1:5433/coderso02" })
      )
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(child({ TASK551_FIXTURE_DATABASE_SENTINEL: "short" }))
    );
    const getterMap = { ...VALID_CHILD };
    Object.defineProperty(getterMap, "TASK551_FIXTURE_DATABASE_SENTINEL", {
      enumerable: true,
      get: () => VALID_CHILD.TASK551_FIXTURE_DATABASE_SENTINEL,
    });
    expectTargetRejection(() => assertTask551FixtureTargetChildKeys(getterMap));
    const target = parseTask551FixtureTarget(VALID_CHILD);
    await rejectsWithInvalid(() =>
      assertTask551FixtureTarget(
        target,
        proofClient({
          currentDatabaseMatched: false,
          markerCount: 1,
          boundSentinelByteMatched: true,
        })
      )
    );
    await rejectsWithInvalid(() =>
      assertTask551FixtureTarget(
        target,
        proofClient({
          currentDatabaseMatched: true,
          markerCount: 2,
          boundSentinelByteMatched: true,
        })
      )
    );
    await rejectsWithInvalid(() =>
      assertTask551FixtureTargetPostCleanup(
        target,
        proofClient({
          currentDatabaseMatched: true,
          markerCount: 1,
          boundSentinelByteMatched: false,
        })
      )
    );
    await rejectsWithInvalid(() =>
      assertTask551FixtureTarget(
        target,
        proofClient(async () => {
          throw new Error("proof query failed");
        })
      )
    );
    await rejectsWithInvalid(() =>
      assertTask551FixtureTarget(
        target,
        proofClient(OK_OBSERVATION, async () => {
          throw new Error("rollback failed");
        })
      )
    );
    await rejectsWithInvalid(() =>
      assertTask551FixtureTarget(
        target,
        proofClient(
          OK_OBSERVATION,
          async () => {},
          () => {
            throw new Error("begin failed");
          }
        )
      )
    );
  });

  test("this suite's own source obeys the cross-leaf import contract", () => {
    const source = readFileSync(fileURLToPath(import.meta.url), "utf8");
    expect(source).toContain('from "../../scripts/task551DatabaseBaseline/fixtureTarget"');
    // No baseline runner/wrapper, no database client, no L01 concurrency suite,
    // no ambient environment loader or DB-free gate helper, and no local target
    // parser/proof/type re-declaration beside the imported seam. Every needle
    // is assembled from halves so this scan cannot match its own source text.
    const forbidden = [
      "task-551-database-" + "baseline",
      "core/db/" + "client",
      "task551Concurrency" + "Constraints",
      "process." + "env",
      "Bun." + "env",
      "dot" + "env",
      "test" + "IfDb",
      "function parseTask551" + "FixtureTarget",
      "function assertTask551Fixture" + "Target",
      "type Task551" + "FixtureTarget =",
    ];
    for (const needle of forbidden) {
      expect(source.includes(needle)).toBe(false);
    }
  });
});

// --- 9. Authority inertness and injection-gated live halves (doc :831-859). LIVE HALVES ARE DESK-CHECKED AND OWNER/L11-EXECUTED. The gate is the fixture's authority seam itself (configureTask551ExplainAuthority — the same seam scripts/task-551-explain-plans.ts consumes), never an ambient URL, an ambient DB-free gate helper, or a driver import: under the airtight local run both live arms return before any socket is opened. ---

describe("authority seam and injection-gated live halves", () => {
  test("no ambient authority exists under the airtight run", () => {
    expect(readTask551ExplainAuthority()).toBeUndefined();
    expect(readTask551CatalogAuthority()).toBeUndefined();
  });

  test("live: the landed catalog passes the exact-set verifier through the injected client", async () => {
    const authority = readTask551ExplainAuthority();
    if (authority === undefined) return;
    // Desk-checked: readPgCatalogDefinitions (fixture :919-936) issues the seven
    // read-only pg_* reads (indexes, constraints, columns, pg_proc volatility,
    // the contype-'x' row, generated expressions, foreign keys) over the
    // injected client, and assertExactTask551Catalog applies the doc-:142-155
    // exact-set verifier — the exclusion row included (audit F6), through the
    // one `constraintDefBody` canonical path on both sides.
    const actual = await readPgCatalogDefinitions(authority.client, EXPECTED_CATALOG.ownedTables);
    expect(() => assertExactTask551Catalog(actual, PASS_EXPECTED)).not.toThrow();
  });

  test("live: the outbox health plan is sanitized, indexed, row-true and within its frozen budget", async () => {
    const authority = readTask551ExplainAuthority();
    if (authority === undefined) return;
    const contract = TASK551_PLAN_CONTRACTS.find(
      (entry) => entry.statement.id === "cache-outbox-oldest-unprocessed"
    );
    const planCase = contract?.cases[0];
    if (contract === undefined || planCase === undefined)
      throw new Error("the outbox plan contract is missing");
    // Desk-checked: the text-only injected client forces the closed registry's
    // synthetic binds inline (never caller input); the plan is then reduced by
    // the fixture's sanitizer (fixture :817-852) and bounded by the frozen
    // receipt. The receipt's rows read is the ANALYZE actual sum (audit F7),
    // not the planner estimate that `evidence.rowsRead` accumulates.
    const rendered = contract.statement.template.replace(/\$(\d+)/g, (_match, index) => {
      const value = planCase.syntheticBinds[Number(index) - 1];
      return typeof value === "string" ? `'${value.replaceAll("'", "''")}'` : String(value);
    });
    const rows = await authority.client.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${rendered}`
    );
    const first = (rows[0] ?? {}) as LooseRecord;
    const evidence = sanitizePlan(
      first["QUERY PLAN"] ?? first.plan ?? first,
      { removeSql: true, removeBinds: true, allowCatalogNames: true },
      {
        planId: contract.statement.id,
        caseId: planCase.caseId,
        profile: "large",
        statementDigest: contract.statement.statementDigest,
      }
    );
    expect(() => assertSanitizedLargePlan(planCase, evidence)).not.toThrow();
    expect(evidence.usedIndexes).toContain("cache_outbox_unprocessed_age_idx");
    // Doc :684-686: the health statement must return the deliberately oldest
    // claimed row. This is the arm that refuses availability/expiry narrowing
    // (audit F8) — a `claim_token`/`claim_until`/`available_at` conjunct skips
    // the claimed/backed-off head rows and returns a different id.
    const health = await authority.client.query(rendered);
    const oldest = await authority.client.query(
      "select id from cache_invalidation_outbox order by created_at asc, id asc limit 1"
    );
    expect(health.length).toBe(1);
    expect(oldest.length).toBe(1);
    expect(String(health[0]?.id)).toBe(String(oldest[0]?.id));
    const p95 = await authority.measureP95(contract.statement, planCase, "large");
    const literal = {
      rowsRead: actualRowsRead(evidence),
      rowsReturned: evidence.rowsReturned,
      sharedHitBuffers: evidence.sharedHitBuffers,
      sharedReadBuffers: evidence.sharedReadBuffers,
      normalizedP95Ms: p95,
    };
    assertPlanReceiptWithinBudget(contract.statement.id, planCase.caseId, "large", {
      ...literal,
      planSha256: sanitizePlanDigest({
        profile: "large",
        planId: contract.statement.id,
        caseId: planCase.caseId,
        ...literal,
      }),
    });
  });
});
