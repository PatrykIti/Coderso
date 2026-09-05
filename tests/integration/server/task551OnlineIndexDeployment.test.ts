import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import postgres from "postgres";
import { buildDatabaseApplicationName } from "../../../core/db/databaseApplicationIdentity";
import { BOOKING_RESERVATION_EXCLUSION_SQL } from "../../../core/db/bookingReservationExclusion";
import {
  TASK551_MIGRATION_GUCS,
  TASK551_MIGRATION_RECEIPT_MAX_BYTES,
  TASK551_MIGRATION_STATE_LITERALS,
  type Task551MigrationReceipt,
} from "../../../core/db/schema";
import {
  appendHealthRecheck,
  assertAdapterDigestReproduced,
  assertArtifactsReproduced,
  assertHealthCeilings,
  assertPreflightReproduced,
  autoscalingEnabled,
  canonicalPreflightDigest,
  casReceipt,
  canonicalIndexShape,
  classifyMeasured,
  consumePredecisionInterval,
  createTask551ReservedDrizzleClient,
  freeDiskBytes,
  injectFreeDiskBytes,
  parseAdapterAck,
  parseOrchestratorArgs,
  readReceiptMirror,
  readWriteCostEvidence,
  requireReleaseDigest,
  resolveTask551Artifacts,
  reverseAuthorizationSha256,
  TASK551_ORCHESTRATOR_ERROR_CODES,
  transactionalReverseTargets,
  transactionalStatements,
  writeReceiptMirror,
  type TouchedMeasure,
} from "../../../scripts/task-551-online-indexes";
import {
  buildIntervalReceipt,
  canonicalJson,
  INTERVAL_NAME_PURPOSES,
  sha256Hex,
  type OperatorEvidence,
  type PgStatIntervalReceipt,
  type PgStatSnapshot,
} from "../../../scripts/task-551-pg-stat-interval";
import {
  TASK551_EXCLUSION_CONSTRAINT_NAME,
  TASK551_ONLINE_INDEX_MEMBERS,
  TASK551_REVISION_INTEGRITY_MEMBERS,
} from "../../../tests/perf/fixtures/task551OnlineIndexManifest";
/**
 * TASK-551-05-L01 online index DEPLOYMENT gate — entirely database-free.
 *
 * The rollout orchestrator (`scripts/task-551-online-indexes.ts`) may only ever run against the disposable validation database, so this suite proves the
 * deployment contract statically and behaviorally without one: the argv contract of the dispatched commands, the closed 20 fail-codes, the journal-driven
 * artifact resolution and its 0081 invariants, the canonical member gate (whose catalog lookup admits the plain index flavour all 89 members use), the
 * receipt CAS, the strict 0600 mirror and the reserved Drizzle adapter; and — driven rather than narrated — the strict GUC guard grammar, the atomic
 * no-conflict receipt insert, the guarded phase-4 apply and its `transaction_apply_pending` recovery, the cutover ack gate whose irreversible flag rides
 * the external cutover alone, the write-cost gate, the autoscaling input, the per-table classification, the :186-189 health ceilings and the canonical
 * preflight digest that binds them (reproduced before phase 2, rechecked after DDL), the L02 `task551-predecision-clean` interval consumed before any
 * read-index candidate freezes, the advisory-lock admission proved against the INSTALLED parser's runtime boolean, the shared poisoned-lease guard that
 * ends the pool exactly once, the quiescence proof, the nonce-bound reverse window with all four of its resumable states, the three-way member
 * classification, and the state matrix where every version-2 state owns exactly one defined behavior under each command. No test opens a connection,
 * sources an environment file, or reaches the network; the one `postgres(...)` handle built for the parser probe is never connected and is ended at once.
 */
const RUNNER_PATH = path.resolve(import.meta.dir, "../../../scripts/task-551-online-indexes.ts");
const CONTRACT_PATH = path.resolve(
  import.meta.dir,
  "../../../_docs/_TASKS/TASK-551-05-L01-Schema-Split-Indexes-And-Concurrency-Constraints.md"
);
const MIGRATIONS_DIR = path.resolve(import.meta.dir, "../../../core/db/migrations");
const MANIFEST_PATH = path.resolve(
  import.meta.dir,
  "../../../tests/perf/fixtures/task551OnlineIndexManifest.ts"
);
const PERF_TEST_PATH = path.resolve(
  import.meta.dir,
  "../../../tests/perf/database-index-write-overhead.test.ts"
);
const MIGRATION_TAG = "0081_task551_search_indexes_constraints_outbox",
  ONLINE_TAG = "0081_task551_online_indexes";
const JOURNAL_INDEX = 81,
  JOURNAL_ENTRY_COUNT = 80;
type Json = Record<string, unknown>;
const runnerSource = (): string => readFileSync(RUNNER_PATH, "utf8"),
  contractSource = (): string => readFileSync(CONTRACT_PATH, "utf8");
const companionSql = (): string =>
  readFileSync(path.join(MIGRATIONS_DIR, `${ONLINE_TAG}.sql`), "utf8");
const transactionalSql = (): string =>
  readFileSync(path.join(MIGRATIONS_DIR, `${MIGRATION_TAG}.sql`), "utf8");
const perfSource = (): string => readFileSync(PERF_TEST_PATH, "utf8");
const manifestSha256 = sha256Hex(readFileSync(MANIFEST_PATH, "utf8"));
const snapshotTables = (): Json =>
  (
    JSON.parse(
      readFileSync(
        path.join(MIGRATIONS_DIR, `meta/${MIGRATION_TAG.split("_")[0]}_snapshot.json`),
        "utf8"
      )
    ) as Json
  ).tables as Json;
/** All seven commanded test paths of the contract's single test battery. */
const COMMANDED_TEST_PATHS: readonly string[] = [
  "tests/integration/server/task551SchemaMigrationParity.test.ts",
  "tests/integration/server/task551SearchVectorMigration.test.ts",
  "tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts",
  "tests/integration/server/task551IndexAndConstraintCatalog.test.ts",
  "tests/integration/server/task551ConcurrencyConstraints.test.ts",
  "tests/integration/server/task551OnlineIndexDeployment.test.ts",
  "tests/perf/database-index-write-overhead.test.ts",
];
/** Pins every needle into the runner's CURRENT bytes with a readable label. */
const pinRunner = (needles: readonly (readonly [string, string])[]): void => {
  const source = runnerSource();
  for (const [needle, label] of needles) expect(source.includes(needle), label).toBe(true);
};
/** The runner body between two declaration headers, for branch-level analysis. */
const runnerBetween = (from: string, to: string): string => {
  const source = runnerSource();
  const start = source.indexOf(from);
  const end = source.indexOf(to);
  expect(start, `${from} exists`).toBeGreaterThan(-1);
  expect(end, `${to} exists`).toBeGreaterThan(start);
  return source.slice(start, end);
};
/** Parses one closed runner state list, expanding its spreads. */
const runnerStateList = (name: string, depth = 0): readonly string[] => {
  const literal = new RegExp(
    `const ${name}: readonly ReceiptState\\[\\] = \\[([\\s\\S]*?)\\];`
  ).exec(runnerSource());
  expect(literal, `${name} is a closed list literal`).not.toBeNull();
  return (literal as RegExpExecArray)[1].split(",").flatMap((entry) => {
    const item = entry.trim().replace(/"/g, "");
    if (!item.startsWith("...")) return item.length > 0 ? [item] : [];
    expect(depth, "state lists do not recurse").toBe(0);
    return [...runnerStateList(item.slice(3), 1)];
  });
};
const codes = TASK551_ORCHESTRATOR_ERROR_CODES;
/** A minimal but shape-valid version-2 receipt for the mirror/CAS behaviours. */
const minimalReceipt = (
  state: string,
  overrides: Readonly<Record<string, unknown>> = {}
): Task551MigrationReceipt =>
  ({
    version: 2,
    taskId: "TASK-551",
    operationId: "11111111-2222-3333-4444-555555555555",
    generation: 1,
    previousStateSha256: null,
    stateSha256: sha256Hex("seed"),
    direction: "forward",
    state,
    ...overrides,
  }) as unknown as Task551MigrationReceipt;
type ReservedSession = Parameters<typeof createTask551ReservedDrizzleClient>[1];
type PoolClient = Parameters<typeof createTask551ReservedDrizzleClient>[0];
type GuardedPlan = NonNullable<Parameters<typeof createTask551ReservedDrizzleClient>[2]>;
type AdapterAck = ReturnType<typeof parseAdapterAck>;
interface RecordedCall {
  readonly text: string;
  readonly params: readonly unknown[];
}
type TaggedCall = (
  strings: readonly string[],
  ...values: readonly unknown[]
) => {
  values: () => Promise<unknown>;
  catch: (onRejected: (error: unknown) => undefined) => Promise<unknown>;
};
/** Records every tagged/unsafe statement of a reserved backend. */
const recordSession = (
  tagged: TaggedCall
): { session: ReservedSession; calls: RecordedCall[]; failOn: { text: string | null } } => {
  const calls: RecordedCall[] = [];
  const failOn: { text: string | null } = { text: null };
  const session = ((strings: readonly string[], ...values: readonly unknown[]) => {
    calls.push({ text: strings.join("?"), params: values });
    return tagged(strings, values);
  }) as unknown as ReservedSession;
  Object.defineProperty(session, "unsafe", {
    value: (query: string, ...params: readonly unknown[]): Promise<unknown> => {
      calls.push({ text: query, params });
      if (failOn.text !== null && query === failOn.text)
        return Promise.reject(new Error(`forced failure of ${query.slice(0, 24)}`));
      return Promise.resolve([]);
    },
    writable: false,
  });
  Object.defineProperty(session, "release", { value: async (): Promise<void> => undefined });
  return { session, calls, failOn };
};
/** A reserved backend whose tagged queries answer from an ordered needle table. */
const makeScriptedSession = (
  rows: readonly (readonly [string, readonly unknown[]])[]
): { session: ReservedSession; calls: RecordedCall[] } => {
  const calls: RecordedCall[] = [];
  const session = ((strings: readonly string[], ...values: readonly unknown[]) => {
    const text = strings.join("?").replace(/\s+/g, " ");
    calls.push({ text, params: values });
    return {
      values: async () => rows.find(([needle]) => text.includes(needle))?.[1] ?? [],
      catch: async () => undefined,
    };
  }) as unknown as ReservedSession;
  return { session, calls };
};
/** A reserved backend whose tagged queries record and return nothing. */
const makeReservedSession = (): {
  session: ReservedSession;
  calls: RecordedCall[];
  failOn: { text: string | null };
} => recordSession(() => ({ values: async () => [], catch: async () => undefined }));
const makePoolClient = (): { pool: PoolClient; options: Json } => {
  const options: Json = { parsers: {}, serializers: {} };
  return {
    pool: { options, end: async (): Promise<void> => undefined } as unknown as PoolClient,
    options,
  };
};
/** The four text-rendered :186-189 health columns: `[in recovery, lag seconds, oldest transaction seconds, invalid booking windows]`. */
type HealthRow = readonly [string, string | null, string, string];
/** The needle table every preflight measurement needs: health columns, the two conflict counts and the per-table measurement. */
const measureNeedles = (
  health: HealthRow,
  rows: readonly TouchedMeasure[]
): readonly (readonly [string, readonly unknown[]])[] => [
  ["pg_is_in_recovery()::text", [health]],
  ["having count(*) > 1", [["0"]]],
  ["tsrange", [["0"]]],
  [
    "pg_total_relation_size",
    rows.map((table) => [table.name, String(table.bytes), String(table.rows)]),
  ],
];
const makeMeasuredSession = (health: HealthRow, rows: readonly TouchedMeasure[]): ReservedSession =>
  makeScriptedSession(measureNeedles(health, rows)).session;
/** The frozen artifact/preflight block a resumed mirror carries, shared by the resume-path tests. */
const frozenReceipt = (state: string, preflight: Json = {}): Task551MigrationReceipt => {
  const a = resolveTask551Artifacts(manifestSha256);
  return minimalReceipt(state, {
    journal: { index: a.journalIndex, tag: a.tag },
    artifacts: {
      transactionalSql: { path: a.transactionalPath, sha256: a.transactionalSha256 },
      snapshot: { path: a.snapshotPath, sha256: a.snapshotSha256 },
      onlineSql: { path: a.onlinePath, sha256: a.onlineSha256 },
      manifestSha256: a.manifestSha256,
      aggregateSha256: a.aggregateSha256,
    },
    preflight: {
      digest: a.aggregateSha256,
      classification: "small",
      lockTimeoutMs: 2_000,
      statementTimeoutMs: 30_000,
      transactionTimeoutMs: 120_000,
      recheckDigests: [a.transactionalSha256],
      ...preflight,
    },
  });
};
describe("task551 online index deployment: argv contract", () => {
  test("the orchestrator argv grammar is fail-closed about commands, flags and modes", () => {
    expect(
      parseOrchestratorArgs([
        "rollout-forward",
        "--receipt",
        ".tmp/task551-migration-receipt.json",
        "--admission-mode",
        "offline-single",
      ])
    ).toEqual({
      command: "rollout-forward",
      receiptPath: ".tmp/task551-migration-receipt.json",
      admissionMode: "offline-single",
    });
    expect(
      parseOrchestratorArgs(["status", "--receipt", ".tmp/task551-migration-receipt.json"])
    ).toEqual({
      command: "status",
      receiptPath: ".tmp/task551-migration-receipt.json",
      admissionMode: null,
    });
    // Every refusal names its closed code, and only a rollout may carry a mode.
    expect(() => parseOrchestratorArgs(["migrate", "--receipt", "x"])).toThrow(codes.usage);
    expect(() =>
      parseOrchestratorArgs(["rollout-forward", "--receipt", "x", "--mode", "external"])
    ).toThrow(codes.usage);
    expect(() =>
      parseOrchestratorArgs(["rollout-forward", "--admission-mode", "external"])
    ).toThrow(codes.usage);
    expect(() =>
      parseOrchestratorArgs([
        "rollout-forward",
        "--receipt",
        "x",
        "--admission-mode",
        "best-effort",
      ])
    ).toThrow(codes.admissionModeInvalid);
    expect(
      parseOrchestratorArgs(["rollout-reverse", "--receipt", "x", "--admission-mode", "external"])
        .admissionMode
    ).toBe("external");
  });
  test("the contract's validation battery commands exactly the seven owned test files", () => {
    const contract = contractSource();
    const envelopeArgv = `"argv": ["bun", "--env-file=/dev/null", "test", ${COMMANDED_TEST_PATHS.map((testPath) => `"${testPath}"`).join(", ")}]`;
    const rolloutArgv =
      '"argv": ["bun", "--env-file=/dev/null", "scripts/task-551-online-indexes.ts", "rollout-forward", "--receipt", ".tmp/task551-migration-receipt.json", "--admission-mode", "offline-single"]';
    expect(
      contract.includes(`bun test ${COMMANDED_TEST_PATHS.join(" ")}`),
      "the validation command lists all seven paths in order"
    ).toBe(true);
    expect(
      contract.includes(envelopeArgv),
      "the dispatch envelope argv is --env-file=/dev/null"
    ).toBe(true);
    expect(
      contract.includes('"tests/integration/server/task551OnlineIndexDeployment.test.ts",'),
      "this suite is on the static allowlist"
    ).toBe(true);
    expect(
      contract.includes(rolloutArgv),
      "rollout-forward is dispatched in offline-single mode"
    ).toBe(true);
    expect(
      contract.includes('"rollout-forward-idempotence"'),
      "the mandatory rerun is dispatched"
    ).toBe(true);
    expect(
      contract.includes(
        '"argv": ["bun", "--env-file=/dev/null", "scripts/task-551-online-indexes.ts", "status", "--receipt", ".tmp/task551-migration-receipt.json"]'
      ),
      "status is the only read-only command"
    ).toBe(true);
    // Generic migration paths are named exactly once, inside the prohibition sentence.
    expect(contract.split("drizzle-kit migrate").length - 1).toBe(1);
    expect(
      contract.includes(
        "`bun run db:migrate`, `drizzle-kit migrate`, startup migration, direct SQL, and"
      ),
      "the generic paths sit in the not-valid-rollout-paths list"
    ).toBe(true);
  });
  test("the 20% write gate is part of the same battery and is enforced, not narrated", () => {
    const perf = perfSource();
    expect(perf.includes("const P95_REGRESSION_CEILING = 1.2;"), "the ceiling is exactly 20%").toBe(
      true
    );
    expect(
      (perf.match(/toBeLessThanOrEqual\(\s*P95_REGRESSION_CEILING\s*\)/g) ?? []).length,
      "insert and update p95 deltas are both gated"
    ).toBeGreaterThanOrEqual(2);
    expect(
      perf.includes("const STORAGE_BUDGET_BYTES = 512 * 1024 * 1024;"),
      "the L01 storage budget is pinned"
    ).toBe(true);
    expect((perf.match(/testIfDb\(/g) ?? []).length, "both measured tests are testIfDb-gated").toBe(
      2
    );
    expect(
      perf.includes("const measured = await measureAllGroups();"),
      "the storage test measures its own groups"
    ).toBe(true);
    expect(perf.includes("report.push"), "no test writes into a shared report array").toBe(false);
    expect(perf.includes("const report"), "the cascaded report array is gone").toBe(false);
  });
});
describe("task551 online index deployment: closed fail-closed codes", () => {
  test("exactly twenty codes exist and none can be added or renamed silently", () => {
    expect(codes).toEqual({
      usage: "task551_orchestrator_usage_invalid",
      journalNotUnique: "task551_journal_not_unique_pending",
      artifactMissing: "task551_artifact_missing",
      artifactDigestChanged: "task551_artifact_digest_changed",
      receiptInvalid: "task551_receipt_invalid",
      receiptConflict: "task551_migration_receipt_conflict",
      admissionModeInvalid: "task551_admission_mode_invalid",
      offlineSingleDenied: "task551_offline_single_denied",
      adapterInvalid: "task551_admission_adapter_invalid",
      adapterPrepareFailed: "task551_adapter_prepare_failed",
      adapterResumeFailed: "task551_adapter_resume_failed",
      quiescenceFailed: "task551_quiescence_failed",
      activityVisibilityInvalid: "task551_migration_activity_visibility_invalid",
      preflightFailed: "task551_preflight_failed",
      dataConflict: "task551_preflight_data_conflict",
      memberInvalid: "task551_online_member_invalid",
      reverseForbidden: "task551_reverse_forbidden",
      catalogMismatch: "task551_final_catalog_mismatch",
      reservedAdapterIncompatible: "task551_reserved_drizzle_adapter_incompatible",
      leasePoisoned: "task551_reserved_lease_poisoned",
    });
    for (const code of Object.values(codes)) expect(code).toMatch(/^task551_[a-z0-9_]+$/);
    expect(Object.freeze(Object.values(codes))).toHaveLength(20);
    // Every code is reachable in the runner, and no bare-string code exists.
    const source = runnerSource();
    const referenced = [
      ...source.matchAll(/TASK551_ORCHESTRATOR_ERROR_CODES\.([A-Za-z0-9]+)/g),
    ].map((match) => match[1]);
    for (const key of Object.keys(codes))
      expect(referenced.includes(key), `${key} is raised somewhere`).toBe(true);
    for (const key of referenced)
      expect(Object.hasOwn(codes, key), `${key} is a member of the closed set`).toBe(true);
    expect([...source.matchAll(/\bfail\(\s*"/g)], "no uncoded fail() exists").toEqual([]);
    expect([...source.matchAll(/new Error\(\s*`task551_/g)], "refusals go through fail()").toEqual(
      []
    );
  });
});
describe("task551 online index deployment: journal-driven artifact resolution", () => {
  const artifacts = resolveTask551Artifacts(manifestSha256);
  test("0081 is the unique journal tail, the companion is unjournaled, and the artifact carries exactly one seam", () => {
    expect(artifacts.journalIndex).toBe(JOURNAL_INDEX);
    expect(artifacts.tag).toBe(MIGRATION_TAG);
    const journal = JSON.parse(
      readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8")
    ) as { entries: { idx: number; tag: string }[] };
    expect(journal.entries).toHaveLength(JOURNAL_ENTRY_COUNT);
    expect(journal.entries.at(-1)).toMatchObject({ idx: JOURNAL_INDEX, tag: MIGRATION_TAG });
    expect(journal.entries.filter((entry) => entry.tag === MIGRATION_TAG)).toHaveLength(1);
    expect(
      journal.entries.some((entry) => entry.tag === ONLINE_TAG),
      "the online companion is never a Drizzle journal member"
    ).toBe(false);
    expect(existsSync(artifacts.onlinePath)).toBe(true);
    const sql = transactionalSql();
    expect(artifacts.transactionalStatements.length).toBeGreaterThan(0);
    expect(artifacts.transactionalStatements).toEqual(transactionalStatements(sql));
    for (const forbidden of ["CONCURRENTLY", "CREATE INDEX", "DROP INDEX"])
      expect(
        sql.includes(forbidden),
        `${forbidden} never appears in the transactional artifact`
      ).toBe(false);
    expect(
      sql.split(BOOKING_RESERVATION_EXCLUSION_SQL.extensionSql).length - 1,
      "the btree_gist extension seam appears exactly once"
    ).toBe(1);
    expect(
      sql.split(BOOKING_RESERVATION_EXCLUSION_SQL.addSql).length - 1,
      "the exclusion seam appears exactly once"
    ).toBe(1);
    const last =
      artifacts.transactionalStatements[artifacts.transactionalStatements.length - 1] ?? "";
    expect(
      last.replace(/;\s*$/, ""),
      "the exclusion seam is the artifact tail, applied last inside the guarded transaction"
    ).toBe(BOOKING_RESERVATION_EXCLUSION_SQL.addSql.replace(/;\s*$/, ""));
  });
  test("every artifact digest is the file's own content digest and the aggregate binds all of them", () => {
    expect(artifacts.transactionalSha256).toBe(sha256Hex(transactionalSql()));
    expect(artifacts.onlineSha256).toBe(sha256Hex(companionSql()));
    expect(artifacts.manifestSha256).toBe(manifestSha256);
    expect(artifacts.aggregateSha256).toBe(
      sha256Hex(
        canonicalJson({
          journal: { index: artifacts.journalIndex, tag: artifacts.tag },
          transactionalSha256: artifacts.transactionalSha256,
          snapshotSha256: artifacts.snapshotSha256,
          onlineSha256: artifacts.onlineSha256,
          manifestSha256: artifacts.manifestSha256,
        })
      )
    );
    // A different manifest cannot reuse the aggregate: the swap is caught.
    expect(resolveTask551Artifacts(sha256Hex("a different manifest")).aggregateSha256).not.toBe(
      artifacts.aggregateSha256
    );
  });
  test("the derived touched-table set names the real assistant tables and only snapshot tables", () => {
    const touched = artifacts.touchedTables;
    expect(touched).toContain("assistant_doc_ingest_runs");
    expect(touched).toContain("assistant_action_executions");
    expect(touched).toContain("assistant_doc_chunks");
    expect(touched.includes("assistant_ingest_runs")).toBe(false);
    expect(touched.includes("assistant_executions")).toBe(false);
    const tables = snapshotTables();
    for (const table of touched)
      expect(Object.hasOwn(tables, `public.${table}`), `${table} exists in the 0081 snapshot`).toBe(
        true
      );
    expect(new Set(touched).size, "the touched set has no duplicate").toBe(touched.length);
    expect([...touched].sort()).toEqual(touched);
    expect(
      touched.length,
      "43 touched tables: the transactional family plus every member table"
    ).toBe(43);
    for (const member of TASK551_ONLINE_INDEX_MEMBERS)
      expect(touched.includes(member.table), `${member.table} is measured for classification`).toBe(
        true
      );
  });
});
describe("task551 online index deployment: canonical member gate", () => {
  /** The manifest's own closed statement grammar: `CREATE [UNIQUE] INDEX CONCURRENTLY …`. */
  const MANIFEST_GRAMMAR =
    /^CREATE (UNIQUE )?INDEX CONCURRENTLY "([^"]+)" ON "([^"]+)" USING ([a-z]+) \(([^)]*)\)(?: WHERE (.+))?$/;
  /** Renders one manifest column / predicate atom the way the server echoes it in `pg_get_indexdef`. */
  const renderColumn = (raw: string): string => {
    const column = /^"([a-z_0-9]+)"(?: (desc|[a-z_0-9]+_ops))?$/.exec(raw.trim());
    if (column === null) throw new Error(`unrenderable manifest column ${raw}`);
    return `${column[1]}${column[2] === undefined ? "" : column[2] === "desc" ? " DESC" : ` ${column[2]}`}`;
  };
  const renderPredicateAtom = (raw: string): string => {
    const text = raw.trim();
    const isNull = /^([a-z_0-9]+) IS (NOT )?NULL$/.exec(text);
    if (isNull !== null)
      return `(${isNull[1]} IS ${isNull[2] === undefined ? "" : `${isNull[2]} `}NULL)`;
    const equals = /^([a-z_0-9]+) = '([^']+)'$/.exec(text);
    if (equals !== null) return `(${equals[1]} = '${equals[2]}'::text)`;
    const inList = /^([a-z_0-9]+) IN \(([^)]*)\)$/.exec(text);
    if (inList !== null)
      return `(${inList[1]} = ANY (ARRAY[${inList[2]
        .split(",")
        .map((literal) => `${literal.trim()}::text`)
        .join(", ")}]))`;
    throw new Error(`unrenderable manifest predicate atom ${text}`);
  };
  /** A programmatic `pg_get_indexdef` model: the manifest bytes as the server would render them. */
  const serverRendering = (createSql: string): string => {
    const parsed = MANIFEST_GRAMMAR.exec(createSql);
    if (parsed === null) throw new Error(`unrenderable manifest statement ${createSql}`);
    const [, unique, name, table, method, columns, predicate] = parsed;
    return (
      `CREATE ${unique ?? ""}INDEX ${name} ON public.${table} USING ${method} (${columns.split(",").map(renderColumn).join(", ")})` +
      (predicate === undefined
        ? ""
        : ` WHERE ${predicate.split(" AND ").map(renderPredicateAtom).join(" AND ")}`)
    );
  };
  test("the closed 89-member manifest is ordered, unique, grouped and byte-present in the companion", () => {
    const companion = companionSql();
    expect(TASK551_ONLINE_INDEX_MEMBERS.length, "the closed manifest holds every 0081 member").toBe(
      89
    );
    expect(
      new Set(TASK551_ONLINE_INDEX_MEMBERS.map((member) => member.name)).size,
      "member names are unique"
    ).toBe(89);
    for (const [order, member] of TASK551_ONLINE_INDEX_MEMBERS.entries()) {
      expect(member.order).toBe(order);
      expect(["revision-integrity", "read-performance"]).toContain(member.group);
      expect(member.dropSql).toBe(`DROP INDEX CONCURRENTLY IF EXISTS "${member.name}"`);
      expect(
        companion.includes(member.createSql),
        `${member.name} is a verbatim companion line`
      ).toBe(true);
      expect(
        transactionalSql().includes(`"${member.name}"`),
        `${member.name} is absent from the transactional artifact`
      ).toBe(false);
    }
    expect(
      TASK551_ONLINE_INDEX_MEMBERS.slice(0, TASK551_REVISION_INTEGRITY_MEMBERS.length).map(
        (member) => member.name
      ),
      "the immutable first group is exactly the two revision unique indexes in contract order"
    ).toEqual([...TASK551_REVISION_INTEGRITY_MEMBERS]);
    for (const member of TASK551_ONLINE_INDEX_MEMBERS.slice(0, 2))
      expect([member.group, member.unique]).toEqual(["revision-integrity", true]);
  });
  test("every one of the 89 members survives a generated pg_get_indexdef rendering in canonical shape", () => {
    // The generator is bound to two independently pinned server renderings first.
    const memberSql = (name: string): string =>
      TASK551_ONLINE_INDEX_MEMBERS.find((member) => member.name === name)!.createSql;
    expect(serverRendering(memberSql("webhook_deliveries_retry_idx"))).toBe(
      "CREATE INDEX webhook_deliveries_retry_idx ON public.webhook_deliveries USING btree (status, created_at, id) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]))"
    );
    expect(serverRendering(memberSql("assistant_ingest_source_success_idx"))).toBe(
      "CREATE INDEX assistant_ingest_source_success_idx ON public.assistant_doc_ingest_runs USING btree (source_root, started_at DESC, id DESC) WHERE (status = 'success'::text)"
    );
    for (const member of TASK551_ONLINE_INDEX_MEMBERS) {
      const rendered = serverRendering(member.createSql);
      const live = canonicalIndexShape(rendered);
      const expected = canonicalIndexShape(member.createSql);
      expect(
        rendered.startsWith(
          `CREATE ${member.unique ? "UNIQUE " : ""}INDEX ${member.name} ON public.`
        )
      ).toBe(true);
      expect(rendered, "the rendering is a transformation, never the manifest bytes").not.toBe(
        member.createSql
      );
      for (const key of [
        "unique",
        "name",
        "schema",
        "table",
        "method",
        "columns",
        "predicate",
      ] as const)
        expect(canonicalJson(live[key]), `${member.name}: ${key} shape`).toBe(
          canonicalJson(expected[key])
        );
    }
  });
  test("whitespace/case variants agree, a non-index statement refuses, and every shape drift refuses", () => {
    // Whitespace, comments, quoting and case cannot create a phantom drift.
    expect(
      canonicalIndexShape(
        `/* probe */ Create Unique Index "PAGE_REVISIONS_PAGE_VERSION_IDX"\n        on public.page_revisions using btree (page_id, version)`
      )
    ).toEqual(canonicalIndexShape(TASK551_ONLINE_INDEX_MEMBERS[0].createSql));
    expect(() => canonicalIndexShape("CREATE TABLE t (id integer)")).toThrow(codes.memberInvalid);
    expect(() => canonicalIndexShape("select 1")).toThrow(codes.memberInvalid);
    const member = TASK551_ONLINE_INDEX_MEMBERS[0];
    // A dropped UNIQUE still parses: it is a drift caught by shape comparison.
    expect(canonicalIndexShape(member.createSql.replace("CREATE UNIQUE", "CREATE")).unique).toBe(
      false
    );
    const reference = canonicalIndexShape(member.createSql);
    for (const [statement, label] of [
      [
        "CREATE INDEX page_revisions_page_version_idx ON public.page_revisions USING btree (version, page_id)",
        "column order drift",
      ],
      [
        "CREATE UNIQUE INDEX page_revisions_page_version_idx ON public.page_revisions USING btree (page_id)",
        "column set drift",
      ],
      [
        "CREATE UNIQUE INDEX page_revisions_page_version_idx ON public.content_revisions USING btree (page_id, version)",
        "table drift",
      ],
      [
        "CREATE UNIQUE INDEX page_revisions_page_version_idx ON public.page_revisions USING gist (page_id, version)",
        "method drift",
      ],
    ] as const)
      expect(canonicalJson(canonicalIndexShape(statement)), label).not.toBe(
        canonicalJson(reference)
      );
    // The preserved revision index is pinned exactly and is never a manifest member.
    const preserved = canonicalIndexShape(
      "CREATE INDEX content_revisions_entry_version_idx ON public.content_revisions USING btree (entry_id, version)"
    );
    expect(preserved).toEqual({
      unique: false,
      name: "content_revisions_entry_version_idx",
      schema: "public",
      table: "content_revisions",
      method: "btree",
      columns: ["I:ENTRY_ID", "I:VERSION"],
      predicate: null,
    });
    expect(
      TASK551_ONLINE_INDEX_MEMBERS.some((entry) => entry.name === preserved.name),
      "the already-committed member is asserted, never rebuilt or dropped"
    ).toBe(false);
    expect(
      transactionalSql().includes(`"${preserved.name}"`),
      "the preserved member is not re-created by the migration"
    ).toBe(false);
  });
});
describe("task551 online index deployment: reserved Drizzle adapter", () => {
  test("the adapted handle exposes the pool's identical .options and forwards every statement to the reserved backend", async () => {
    const { session, calls } = makeReservedSession();
    const { pool, options } = makePoolClient();
    const adapted = await createTask551ReservedDrizzleClient(pool, session);
    const descriptor = Object.getOwnPropertyDescriptor(adapted, "options");
    expect(descriptor?.writable).toBe(false);
    expect(descriptor?.configurable).toBe(false);
    expect(adapted.options, ".options is the identical pool object, never a clone").toBe(options);
    await session.unsafe("select 1");
    calls.length = 0;
    // `.end()` stays usable and delegates to the pool, never to the reserved lease.
    await adapted.end();
    expect(calls.filter((call) => call.text.includes("end"))).toEqual([]);
  });
  test("begin is non-reentrant on the reserved backend, rolls back a callback failure, and poisons on a failed rollback", async () => {
    const { session, calls } = makeReservedSession();
    const adapted = await createTask551ReservedDrizzleClient(makePoolClient().pool, session);
    let handed: unknown = null;
    await adapted.begin(async (client: unknown) => {
      handed = client;
    });
    expect(calls.map((call) => call.text)).toEqual(["BEGIN", "COMMIT"]);
    expect(handed, "the callback receives the same adapted callable identity").toBe(adapted);
    calls.length = 0;
    await adapted.begin("", async () => undefined);
    expect(calls.map((call) => call.text)).toEqual(["BEGIN", "COMMIT"]);
    calls.length = 0;
    // A nonempty option string and a non-function callback are refused before any BEGIN.
    for (const [label, begin] of [
      ["a nonempty option string", () => adapted.begin("read write", async () => undefined)],
      [
        "a non-function callback",
        () => adapted.begin("not-a-callback" as unknown as () => Promise<void>),
      ],
    ] as const) {
      await expect(begin()).rejects.toThrow(codes.reservedAdapterIncompatible);
      expect(calls, `${label} is refused before BEGIN`).toEqual([]);
    }
    // A begin inside the callback is refused by the lease state itself, and the outer transaction is rolled back.
    calls.length = 0;
    await expect(adapted.begin(async () => adapted.begin(async () => undefined))).rejects.toThrow(
      codes.reservedAdapterIncompatible
    );
    expect(
      calls.map((call) => call.text),
      "the outer transaction is rolled back"
    ).toEqual(["BEGIN", "ROLLBACK"]);
    const original = new Error("statement failed");
    await expect(
      adapted.begin(async () => {
        throw original;
      })
    ).rejects.toBe(original);
    expect(calls.slice(-1)[0]?.text).toBe("ROLLBACK");
    // A failed ROLLBACK leaves the outcome unknown: the lease is poisoned and no further statement may be dispatched.
    const poisoned = makeReservedSession();
    const poisonedAdapter = await createTask551ReservedDrizzleClient(
      makePoolClient().pool,
      poisoned.session
    );
    poisoned.failOn.text = "ROLLBACK";
    await expect(
      poisonedAdapter.begin(async () => {
        throw original;
      })
    ).rejects.toBe(original);
    expect(
      () => poisonedAdapter.unsafe("select 1"),
      "the poisoned lease refuses synchronously"
    ).toThrow(codes.leasePoisoned);
  });
  test("a poisoned lease runs no unlock, no release and no further statement, and the pool ends exactly once", async () => {
    pinRunner([
      [
        "const leaseGuard: { poisoned: boolean; ended: boolean } = { poisoned: false, ended: false };",
        "the poison state is shared by the adapter and the command's own exit path",
      ],
      [
        "function poisonLease(): void { leaseGuard.poisoned = true; }",
        "poisoning is one irreversible flag",
      ],
      [
        "async function endPoolOnce(): Promise<void> { if (leaseGuard.ended || reservedPool === null) return;",
        "the pool end is guarded against a second run",
      ],
      [
        "leaseGuard.ended = true; await reservedPool.end({ timeout: 0 }).catch(() => undefined);}",
        "the pool is ended immediately, with timeout 0",
      ],
      [
        "if (leaseGuard.poisoned) { await endPoolOnce(); return; } if (operationId !== null) await releaseAdvisoryLock(session, operationId).catch(() => undefined);",
        "a poisoned exit path performs no unlock and no release, and ends the pool",
      ],
      [
        "try { await resetVerifyTask551Gucs(session, pid); } catch (error) { poisonLease(); await endPoolOnce(); throw error; }};",
        "a failed reset-and-verify poisons the lease and ends the pool before the error propagates",
      ],
      [
        "reservedPool = pool; leaseGuard.poisoned = false; leaseGuard.ended = false;",
        "each newly opened reserved session restarts the exactly-once clock, so one ended pool can never silence a later session's end",
      ],
      [
        "} finally { await closeReserved(session, receipt.operationId); }}",
        "both rollouts exit through the one poisoned-aware close path, never a bespoke teardown",
      ],
      [
        'state.inTransaction = false; try { await reserved.unsafe("ROLLBACK"); } catch { state.poisoned = true; poisonLease(); }',
        "an unknown-outcome rollback poisons the adapter lease AND the shared guard",
      ],
    ]);
    // Behavioral: after the failed-rollback poison, neither the adapter nor the begin path can dispatch another statement.
    const poisoned = makeReservedSession();
    const adapter = await createTask551ReservedDrizzleClient(
      makePoolClient().pool,
      poisoned.session
    );
    poisoned.failOn.text = "ROLLBACK";
    await expect(
      adapter.begin(async () => {
        throw new Error("statement failed");
      })
    ).rejects.toThrow("statement failed");
    expect(poisoned.calls.at(-1)?.text, "the last attempted SQL is the rollback that failed").toBe(
      "ROLLBACK"
    );
    expect(
      () => adapter.unsafe("select pg_advisory_unlock(hashtext('purpose'), hashtext('operation'))"),
      "no unlock can be dispatched"
    ).toThrow(codes.leasePoisoned);
    await expect(
      adapter.begin(async () => undefined),
      "no begin can be dispatched either"
    ).rejects.toThrow(codes.leasePoisoned);
    expect(
      poisoned.calls.filter((call) => call.text.includes("pg_advisory_unlock")),
      "no unlock SQL was ever issued on the poisoned lease"
    ).toEqual([]);
    expect(
      [...runnerSource().matchAll(/await closeReserved\(session, receipt\.operationId\)/g)],
      "the forward and the reverse rollouts both close through it"
    ).toHaveLength(2);
  });
  test("the advisory lock and the backend pid admit the installed parser's runtime shapes, never an assumed render", async () => {
    pinRunner([
      [
        "async function takeAdvisoryLock(session: ReservedSession, operationId: string): Promise<void> {",
        "the lease is one dedicated step",
      ],
      [
        "const locked = await values<[boolean | string]>(session`select pg_try_advisory_lock(hashtext(${ADVISORY_LOCK_PURPOSE}), hashtext(${operationId}))`); const granted = locked[0]?.[0];",
        "the grant is read raw from the row, before any text render",
      ],
      [
        'if (granted !== true && granted !== "true" && granted !== "t") fail(TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned, "the rollout advisory lock is held elsewhere");',
        "the runtime boolean is the admitted shape, with the two legacy text shapes beside it",
      ],
      [
        "select pg_advisory_unlock(hashtext(${ADVISORY_LOCK_PURPOSE}), hashtext(${operationId}))",
        "the paired unlock releases exactly the two-key lock that was taken",
      ],
      [
        "await takeAdvisoryLock(session, receipt.operationId);",
        "both rollouts take the lock before their first state step",
      ],
    ]);
    expect(
      [...runnerSource().matchAll(/select pg_try_advisory_lock/g)],
      "the lock is taken at exactly one SQL site (the lease step, not a narration)"
    ).toHaveLength(1);
    // The premise is the INSTALLED dependency, not a memory of it: OID 16 parses `t` into the JS boolean `true`.
    const client = postgres("postgresql://127.0.0.1:1/none", {
      max: 1,
      fetch_types: false,
    }) as unknown as {
      options: { parsers: Record<string, (raw: string) => unknown> };
      end: (input: { timeout: number }) => Promise<void>;
    };
    try {
      const parsed = client.options.parsers[16]("t");
      expect(parsed, "the installed bool parser yields the runtime boolean `true`").toBe(true);
      expect(
        parsed === "true" || parsed === "t",
        "so the boolean arm of the guard is the load-bearing one"
      ).toBe(false);
      expect(client.options.parsers[16]("f")).toBe(false);
      expect(
        client.options.parsers[16]("true"),
        "a string render is NOT the runtime shape, which is why the string arms exist"
      ).toBe(false);
      const pidShape = client.options.parsers[23]("4242");
      expect(pidShape, "int4 — pg_backend_pid's OID — parses into the JS number domain").toBe(4242);
      expect(
        pidShape === "4242",
        "so the same-backend proof can only compare numbers, never a String render"
      ).toBe(false);
      expect(
        client.options.parsers[25],
        "text has no registered parser, so a ::text render arrives as the raw server string — the standby gate's own premise"
      ).toBeUndefined();
    } finally {
      await client.end({ timeout: 0 });
    }
  });
  test("the installed migrator only ever receives the adapted reserved handle, and the journal-insert recognizer is live", () => {
    pinRunner([
      [
        "const adapted = await createTask551ReservedDrizzleClient(pool, session, plan);",
        "the reserved handle is adapted before the migrator runs",
      ],
      [
        "await migrate(drizzle(adapted), { migrationsFolder: MIGRATIONS_FOLDER });",
        "the installed migrator is bound to the adapted handle",
      ],
      [
        'import { migrate } from "drizzle-orm/postgres-js/migrator";',
        "the installed migrator is used, never a hand-rolled one",
      ],
      [
        "function isDrizzleJournalInsert(statement: string): boolean {",
        "the migrator's journal insert is recognized by a named structural predicate",
      ],
      [
        'tokenizeSqlFragment(statement, TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned).slice(0, 5).join(" ") === "I:INSERT I:INTO I:DRIZZLE . I:__DRIZZLE_MIGRATIONS"',
        "the recognizer compares I:-tagged tokens against a token-spelled head, so quoting, case and whitespace cannot bypass it",
      ],
      [
        "if (plan.progress.insertRan && !plan.progress.journaled && isDrizzleJournalInsert(statement)) { plan.progress.journaled = true; return plan.session.unsafe(query, ...parameters); }",
        "exactly one journal insert is forwarded after the receipt insert, with the migrator's own parameters",
      ],
      [
        "await reserved`select set_config('application_name', ${buildDatabaseApplicationName(\"migration\", operationId)}, false)`;",
        "the migration identity is set on the reserved backend",
      ],
      [
        "select pg_try_advisory_lock(hashtext(${ADVISORY_LOCK_PURPOSE}), hashtext(${operationId}))",
        "the dedicated advisory lock is taken on the reserved session",
      ],
    ]);
    const source = runnerSource();
    expect(source.includes("drizzle(reserved)"), "direct drizzle(reserved) is forbidden").toBe(
      false
    );
    expect(
      source.includes("postgres(target, { max: 1,"),
      "the migration session is one max-1 client"
    ).toBe(true);
    expect(
      buildDatabaseApplicationName("migration", "11111111-2222-3333-4444-555555555555"),
      "operationId = GUC = migration application_name"
    ).toBe("coderso:migration:11111111-2222-3333-4444-555555555555");
  });
});
describe("task551 online index deployment: in-transaction GUC guard and receipt insert", () => {
  test("the first statement of the guarded transaction reads every GUC strictly and rejects the rest", () => {
    pinRunner([
      [
        "guc_operation text := current_setting('${gucs[0]}', true); guc_receipt text := current_setting('${gucs[1]}', true);",
        "operation and receipt GUCs are read with strict current_setting",
      ],
      [
        "guc_digest text := current_setting('${gucs[2]}', true); application text := current_setting('application_name', true);",
        "the digest GUC and application_name are read strictly",
      ],
      [
        "if guc_operation is null or guc_receipt is null or guc_digest is null or guc_operation = '' or guc_receipt = '' or guc_digest = '' or application is null then",
        "missing or empty GUCs refuse before any DDL",
      ],
      [
        "if octet_length(convert_to(guc_receipt, 'UTF8')) > ${TASK551_MIGRATION_RECEIPT_MAX_BYTES}",
        "the receipt GUC is bounded by the same byte ceiling as the row",
      ],
      [
        "if guc_operation !~ '${UUID_GRAMMAR.source}' or guc_digest !~ '${HEX64.source}'",
        "the operation and digest GUCs must match their grammars",
      ],
      [
        "if application <> 'coderso:migration:' || guc_operation then",
        "a different-session setup cannot pass: application_name must be this migration",
      ],
      [
        "begin receipt := guc_receipt::jsonb; exception when others then raise exception 'task551_receipt_invalid: the receipt GUC is not JSON'; end;",
        "a non-JSON receipt is a refusal, not a crash",
      ],
      [
        "if guc_digest <> encode(sha256(convert_to(guc_receipt, 'UTF8')), 'hex') or receipt ->> 'stateSha256' is distinct from guc_digest",
        "the core SHA-256 is recomputed over the exact receipt text",
      ],
      [
        "receipt ->> 'operationId' is distinct from guc_operation or receipt ->> 'version' is distinct from '2' or receipt ->> 'taskId' is distinct from 'TASK-551'",
        "operation, version and task are bound to the session",
      ],
      [
        "or receipt ->> 'state' is distinct from '${state}' or receipt ->> 'generation' is distinct from '${generation}'",
        "the guard binds the exact successor state and generation",
      ],
      [
        "coalesce(receipt ->> 'previousStateSha256', '') is distinct from '${previousStateSha256}'",
        "the CAS chain is bound inside the transaction",
      ],
      [
        "spec := ${sqlText(JSON.stringify(RECEIPT_SPEC))}::jsonb; frames := jsonb_build_array(jsonb_build_array(spec, receipt));",
        "the exact recursive key/type/bounds grammar is embedded in the guard",
      ],
      [
        "while jsonb_array_length(frames) > 0 loop",
        "the grammar is evaluated as a recursive frame walk",
      ],
      ["where not (expected ? object_key)", "unknown receipt keys are refused"],
      ["where not (value ? object_key)", "missing receipt keys are refused"],
    ]);
    expect(Object.values(TASK551_MIGRATION_GUCS)).toEqual([
      "coderso.task551_operation_id",
      "coderso.task551_receipt_v2",
      "coderso.task551_receipt_sha256",
    ]);
    expect(TASK551_MIGRATION_RECEIPT_MAX_BYTES).toBe(65_536);
  });
  test("the final statement inserts the receipt atomically with no conflict clause and requires one row", () => {
    const source = runnerSource();
    pinRunner([
      [
        "insert into task551_migration_operations (operation_id, task_id, generation, direction, state, receipt, previous_state_sha256, state_sha256)",
        "the receipt row is created by the guarded transaction itself",
      ],
      ["get diagnostics inserted = row_count;", "the insert proves its own row count"],
      [
        "if inserted <> 1 then raise exception 'task551_migration_receipt_conflict: the receipt insert did not produce exactly one row'; end if;",
        "anything but exactly one row refuses",
      ],
      [
        "if (!plan.progress.guardRan || !plan.progress.insertRan || !plan.progress.journaled || plan.progress.applied !== plan.statements.length)",
        "a partially driven transaction cannot be reported as applied",
      ],
      [
        "select to_regclass(${qualifiedName})",
        "absent relations are probed, never raised as 42P01",
      ],
      [
        'await reserved.unsafe(`reset "${name}"`);',
        "each GUC is statically reset on the exit path",
      ],
      [
        "if (!(await relationExists(session, RECEIPT_TABLE))) fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict",
        "a cold pre-0081 database is refused instead of crashing on the missing relation",
      ],
      [
        'if (existing === undefined) fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict, "the receipt row is absent; only the guarded transaction may create it");',
        "no receipt row is ever written from outside the transaction",
      ],
      [
        "select set_config(${TASK551_MIGRATION_GUCS.operationId}, ${gucValues.operationId}, false),",
        "the three GUCs are parameterized and session-local",
      ],
      [
        "if (cleared === undefined || Number(cleared[3]) !== expectedPid)",
        "the reset is proven on the same backend, in the int4 parser's number domain — never against a String render no int4 row can equal",
      ],
      [
        'if (cleared.slice(0, 3).some((value) => value !== "" && value !== null))',
        "a surviving GUC poisons the lease instead of leaking to pool reuse",
      ],
    ]);
    expect(
      /on\s+conflict/i.test(source),
      "no ON CONFLICT clause exists anywhere in the runner"
    ).toBe(false);
    // Importing the runner performs no I/O and reads no environment.
    const mainIndex = source.indexOf("async function main(): Promise<void>");
    expect(mainIndex).toBeGreaterThan(0);
    for (const match of source.matchAll(/process\.env/g))
      expect(match.index ?? 0, "process.env is read only on the main() dispatch").toBeGreaterThan(
        mainIndex
      );
  });
});
describe("task551 online index deployment: phase-4 guarded apply and crash recovery", () => {
  const artifacts = resolveTask551Artifacts(manifestSha256);
  const guardSql = "do $task551_guard$ strict GUC receipt guard $task551_guard$;";
  const insertSql =
    "do $task551_receipt_insert$ atomic already-applied receipt insert $task551_receipt_insert$;";
  const journalInsert =
    "insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)";
  /** A guarded plan over the real artifact statements, with a chosen starting progress. */
  const makePlan = (
    session: ReservedSession,
    applied = 0,
    insertRan = false,
    journaled = false
  ): GuardedPlan =>
    ({
      statements: artifacts.transactionalStatements,
      guardSql,
      insertSql,
      session,
      progress: { guardRan: false, applied, insertRan, journaled },
    }) as unknown as GuardedPlan;
  const unsafe = (
    adapted: PoolClient
  ): ((query: string, ...params: readonly unknown[]) => Promise<unknown>) =>
    adapted.unsafe as (query: string, ...params: readonly unknown[]) => Promise<unknown>;
  test("the successor the call site precomputes is transaction_applied, chained, and verified against the landed row", () => {
    const pending = minimalReceipt("transaction_apply_pending", {
      generation: 7,
      previousStateSha256: sha256Hex("drain_confirmed"),
    });
    // Exactly the runner's phase-4 precompute (contract :239-246).
    const successor = casReceipt(pending, "transaction_apply_pending", {
      state: "transaction_applied",
      transaction: { apply: "applied", catalogSha256: null },
    });
    expect(successor.state).toBe("transaction_applied");
    expect([successor.generation, successor.previousStateSha256, successor.transaction]).toEqual([
      pending.generation + 1,
      pending.stateSha256,
      { apply: "applied", catalogSha256: null },
    ]);
    pinRunner([
      [
        'if (receipt.state !== "transaction_applied") fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptInvalid, "the transactional receipt is not the transaction_applied successor");',
        "the plan builder refuses a receipt in any other state — the guard is never relaxed",
      ],
      [
        'const successor = casReceipt(receipt, "transaction_apply_pending", { state: "transaction_applied", transaction: { apply: "applied", catalogSha256: null } });',
        "the successor is precomputed at the phase-4 call site, before the migrator runs",
      ],
      [
        "await applyBoundTransactionalMigration(successor, artifacts, session);",
        "the precomputed successor is the receipt bound into the three GUCs",
      ],
      [
        'if (row === null || row.stateSha256 !== successor.stateSha256) fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict, "the guarded insert did not land this receipt");',
        "the landed row's digest is verified before the catalog digest is CASed",
      ],
      [
        'await step("transaction_applied", { transaction: { apply: "applied", catalogSha256: await catalogDigest(session) } });',
        "the catalog digest is CASed only onto the verified successor",
      ],
    ]);
    // A wrong-state receipt cannot reach that call site: the CAS refuses to re-derive the successor from an
    // already-advanced expectation; it does not police the patch's state (the plan-builder refusal above does), but it always rebinds the chain and the generation.
    expect(() =>
      casReceipt(successor, "transaction_apply_pending", { state: "transaction_applied" })
    ).toThrow(codes.receiptConflict);
    expect(() =>
      casReceipt(pending, "transaction_applied", { state: "transaction_applied" })
    ).toThrow(codes.receiptConflict);
    const renamed = casReceipt(pending, "transaction_apply_pending", { state: "drain_confirmed" });
    expect([
      renamed.previousStateSha256,
      renamed.generation,
      renamed.stateSha256 === renamed.previousStateSha256,
    ]).toEqual([pending.stateSha256, pending.generation + 1, false]);
  });
  test("the guarded plan drives the artifact guard-first, recognizes the journal insert, and commits only after it", async () => {
    const { session, calls } = makeReservedSession();
    const plan = makePlan(session);
    const adapted = await createTask551ReservedDrizzleClient(makePoolClient().pool, session, plan);
    await adapted.begin(async () => {
      for (const statement of artifacts.transactionalStatements) await unsafe(adapted)(statement);
      expect(plan.progress.applied, "every artifact statement passed the guard").toBe(
        artifacts.transactionalStatements.length
      );
      expect(
        plan.progress.insertRan,
        "the receipt insert ran once the last artifact statement landed"
      ).toBe(true);
      expect(plan.progress.journaled, "nothing is journaled before the migrator's own insert").toBe(
        false
      );
      await unsafe(adapted)(journalInsert, sha256Hex("0081"), 0);
      expect(
        plan.progress.journaled,
        "the migrator's journal insert is recognized and forwarded, never refused"
      ).toBe(true);
    });
    expect(calls[0].text).toBe("BEGIN");
    expect(calls[1].text).toBe(guardSql);
    expect(
      calls.slice(2, 2 + artifacts.transactionalStatements.length).map((call) => call.text)
    ).toEqual([...artifacts.transactionalStatements]);
    expect(calls[2 + artifacts.transactionalStatements.length]).toEqual({
      text: insertSql,
      params: [],
    });
    expect(
      calls[3 + artifacts.transactionalStatements.length],
      "the journal insert lands with the migrator's own parameters"
    ).toEqual({ text: journalInsert, params: [sha256Hex("0081"), 0] });
    expect(
      calls[calls.length - 1].text,
      "the recognized transaction commits, never rolls back"
    ).toBe("COMMIT");
    // Recognition is structural, so another spelling of the same insert is recognized too — but only after the receipt insert, and only once.
    const quoted = makeReservedSession();
    const quotedPlan = makePlan(
      quoted.session,
      artifacts.transactionalStatements.length,
      true,
      false
    );
    const quotedAdapter = await createTask551ReservedDrizzleClient(
      makePoolClient().pool,
      quoted.session,
      quotedPlan
    );
    await quotedAdapter.begin(async () => {
      await unsafe(quotedAdapter)(
        'INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
        sha256Hex("0081"),
        0
      );
      expect(
        quotedPlan.progress.journaled,
        "a re-quoted, re-cased spelling is still the migrator's insert"
      ).toBe(true);
    });
    expect(quoted.calls[quoted.calls.length - 1]?.text).toBe("COMMIT");
  });
  test("a drifted artifact statement refuses, and any statement the plan does not own poisons the lease", async () => {
    const drifted = makeReservedSession();
    const driftedAdapter = await createTask551ReservedDrizzleClient(
      makePoolClient().pool,
      drifted.session,
      makePlan(drifted.session)
    );
    await expect(
      driftedAdapter.begin(async () =>
        unsafe(driftedAdapter)("create table something_else (id integer)")
      )
    ).rejects.toThrow(codes.artifactDigestChanged);
    expect(
      drifted.calls.map((call) => call.text),
      "the drifted transaction never commits"
    ).toEqual(["BEGIN", guardSql, "ROLLBACK"]);
    // After the artifact stream, the receipt insert and the journal row, nothing else may run: the refusal is the contracted lease poison, and the open transaction is rolled back.
    const intruder = makeReservedSession();
    const intruderPlan = makePlan(
      intruder.session,
      artifacts.transactionalStatements.length,
      true,
      true
    );
    const intruderAdapter = await createTask551ReservedDrizzleClient(
      makePoolClient().pool,
      intruder.session,
      intruderPlan
    );
    await expect(
      intruderAdapter.begin(async () => unsafe(intruderAdapter)("select 1"))
    ).rejects.toThrow(codes.leasePoisoned);
    expect(
      intruder.calls.map((call) => call.text).includes("ROLLBACK"),
      "the poisoned transaction is rolled back, never committed"
    ).toBe(true);
    // A second journal insert is not the plan's either: exactly one is owned.
    const replayed = makeReservedSession();
    const replayAdapter = await createTask551ReservedDrizzleClient(
      makePoolClient().pool,
      replayed.session,
      makePlan(replayed.session, artifacts.transactionalStatements.length, true, true)
    );
    await expect(
      replayAdapter.begin(async () => unsafe(replayAdapter)(journalInsert, sha256Hex("0081"), 0))
    ).rejects.toThrow(codes.leasePoisoned);
    expect(replayed.calls.map((call) => call.text).includes("ROLLBACK")).toBe(true);
  });
  test("transaction_apply_pending recovery reruns phase 4 only when nothing committed, and never through the recheck", () => {
    pinRunner([
      [
        'if (mirror !== null && receipt.state === "transaction_apply_pending") {',
        "a mirror frozen before the guarded commit owns a recovery branch of its own",
      ],
      [
        "// :246-249 — this mirror reruns phase 4 only when nothing committed, under the frozen budgets, and never through the post-DDL recheck.",
        "the branch says so",
      ],
      [
        "await assertNothingCommitted(session, artifacts, receipt.operationId);",
        "the rerun is gated on a nothing-committed proof, never on the mirror alone",
      ],
      [
        "await setSessionBudgets(session, receipt.preflight);",
        "the rerun re-applies the frozen budgets verbatim",
      ],
      [
        "async function assertNothingCommitted(session: ReservedSession, artifacts: Task551Artifacts, operationId: string): Promise<void> {",
        "the nothing-committed proof is one closed probe set",
      ],
      [
        "const code = TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict;",
        "every committed residue refuses with the same fail-closed code",
      ],
      [
        'if (await relationExists(session, RECEIPT_TABLE) && (await readReceiptRow(session, operationId)) !== null) fail(code, "the guarded transaction already committed this operation\'s receipt row; the phase-4 rerun is forbidden");',
        "a landed receipt row forbids the rerun",
      ],
      [
        "const applied = await values<[string]>(session`select 1 from drizzle.__drizzle_migrations where hash = ${artifacts.transactionalSha256} limit 1`);",
        "the journal is probed by the artifact's own content hash",
      ],
      [
        'if (applied.length > 0) fail(code, "the 0081 journal row is already applied, so the transactional phase cannot rerun");',
        "a journaled 0081 forbids the rerun",
      ],
      [
        'if (await relationExists(session, "public.cache_invalidation_outbox")) fail(code, "a transactional-artifact table already exists, so phase 4 is not rerunnable");',
        "an artifact table is committed residue, never a reason to rerun",
      ],
    ]);
    const source = runnerSource();
    const recovery = source.indexOf(
      'if (mirror !== null && receipt.state === "transaction_apply_pending") {'
    );
    expect(recovery, "the recovery branch precedes the phase-4 handler").toBeGreaterThan(-1);
    expect(
      source.indexOf('if (receipt.state === "transaction_apply_pending") {'),
      "the phase-4 handler exists"
    ).toBeGreaterThan(recovery);
    // Nothing is committed at transaction_apply_pending, so it is admitted and recovered, but never rechecked.
    expect(
      runnerStateList("FORWARD_RESUMABLE_STATES"),
      "the frozen mirror is still admitted"
    ).toContain("transaction_apply_pending");
    expect(runnerStateList("DDL_RECHECK_STATES")).toEqual([
      "transaction_applied",
      "revision_integrity_building",
      "revision_integrity_ready",
      "resume_authorized",
      "resume_completed",
      "read_performance_building",
    ]);
    expect(
      runnerStateList("DDL_RECHECK_STATES"),
      "the guarded rerun, not a ceiling recheck, owns this state"
    ).not.toContain("transaction_apply_pending");
    expect(
      runnerStateList("DDL_RECHECK_STATES"),
      "no pre-DDL state is ever rechecked"
    ).not.toContain("resolved");
  });
});
describe("task551 online index deployment: admission adapter argv, nonce and echo validation", () => {
  test("the adapter argv is the contract's flag form, and only resume carries the authorization digest", () => {
    const source = runnerSource();
    const contract = contractSource().replace(/\s+/g, " ");
    const contractFlags = (anchor: RegExp): readonly string[] =>
      contract.match(anchor)?.[0].match(/--[a-z0-9-]+/g) ?? [];
    expect(
      contractFlags(/`prepare --operation-id [^`]*`/),
      "the contract's prepare argv flags"
    ).toEqual(["--operation-id", "--nonce", "--receipt-sha256"]);
    expect(
      contractFlags(/`resume --operation-id [^`]*`/),
      "the contract's resume argv flags"
    ).toEqual(["--operation-id", "--nonce", "--receipt-sha256", "--authorization-sha256"]);
    // The runner implements exactly those flags, in that order, with runner-held values.
    expect(
      source.includes(
        'const argv = [action, "--operation-id", operationId, "--nonce", nonce, "--receipt-sha256", receiptSha256];'
      ),
      "the prepare/resume argv is the contract's flag form"
    ).toBe(true);
    expect(
      source.includes(
        'if (action === "resume") argv.push("--authorization-sha256", authorizationSha256 ?? "");'
      ),
      "only the resume invocation appends the authorization flag"
    ).toBe(true);
    expect(
      source.includes("execFile(path, argv, { timeout:"),
      "execFile consumes exactly that argv"
    ).toBe(true);
    // No other flag literal exists in the adapter invocation path, so no adapter- or receipt-supplied string can become an argument boundary.
    expect(
      [
        ...runnerBetween(
          "function runAdmissionAdapter",
          "/** Phase-3 visibility prerequisite"
        ).matchAll(/"(--[a-z0-9-]+)"/g),
      ].map((match) => match[1])
    ).toEqual(["--operation-id", "--nonce", "--receipt-sha256", "--authorization-sha256"]);
    pinRunner([
      [
        'import { execFile } from "node:child_process";',
        "execFile is the only child-process import",
      ],
      [
        'maxBuffer: BUDGETS.adapterStdoutMaxBytes, encoding: "utf8", windowsHide: true }',
        "stdout is byte-capped and the window layer is hidden",
      ],
      [
        "if (stderr.length > BUDGETS.adapterStderrMaxBytes) fail(TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid",
        "stderr beyond its ceiling refuses",
      ],
      [
        "adapterPrepareTimeoutMs: 120_000, adapterResumeTimeoutMs: 180_000",
        "prepare gets 120s and resume 180s",
      ],
      [
        "adapterStdoutMaxBytes: 16 * 1024, adapterStderrMaxBytes: 16 * 1024",
        "both streams are capped at 16 KiB",
      ],
      [
        "if (!offline && adapterPath === undefined) fail(TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid",
        "external mode without an adapter refuses",
      ],
      [
        'if (stats === null || !path.startsWith("/") || !stats.isFile() || (stats.mode & 0o500) !== 0o500 || (stats.mode & 0o022) !== 0)',
        "the adapter executable is absolute, regular, owner-executable, not group/world writable",
      ],
      [
        'return createHash("sha256").update(readFileSync(path)).digest("hex");',
        "the CONTENT bytes are pinned, never the path string",
      ],
      [
        'const pinnedSha = adapterSha === "" ? admissionAdapterSha256(adapterPath as string) : adapterSha;',
        "a resumed external mirror re-derives the digest once and compares it, never blind-persists a re-derivation",
      ],
      [
        'if (receipt.admission.adapterSha256 !== null && receipt.admission.adapterSha256 !== derivedSha256) fail(TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid, "the admission adapter\'s content does not reproduce the digest frozen in the receipt");',
        "drift from the frozen digest refuses — adapterSha256 is never silently overwritten",
      ],
      [
        "assertAdapterDigestReproduced(receipt, pinnedSha);",
        "phase 2 compares through the one shared refusal",
      ],
      [
        "if (receipt.admission.prepareAckSha256 !== null) fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict,",
        "a mirror that already records a prepare acknowledgement refuses instead of re-running prepare over it",
      ],
      [
        "adapterSha256: pinnedSha, prepareAckSha256: sha256Hex(canonicalJson(ack))",
        "the compared digest is exactly what the drain transition persists",
      ],
      [
        'const resumeSha = adapterSha === "" ? admissionAdapterSha256(adapterPath as string) : adapterSha;',
        "the phase-6 cutover re-derives the env-path bytes' digest exactly as phase 2 does",
      ],
      [
        "assertAdapterDigestReproduced(receipt, resumeSha);",
        "and compares the prepare-time pin before the resume adapter executes",
      ],
      [
        "export function assertAdapterDigestReproduced(receipt: Task551MigrationReceipt, derivedSha256: string): void {",
        "one named refusal, from the closed code set, serves both phases",
      ],
    ]);
    expect(
      [...source.matchAll(/(?<![.\w])(?:spawn|spawnSync|execSync|exec)\s*\(/g)],
      "no shell or spawn path exists"
    ).toEqual([]);
  });
  test("the prepare-time adapter pin is re-derived and compared before the adapter executes in BOTH phases, so a binary swapped between phase 2 and phase 6 never runs unverified", () => {
    const pinned = minimalReceipt("resume_authorized", {
      admission: { adapterSha256: sha256Hex("adapter-bytes") },
    });
    expect(
      () => assertAdapterDigestReproduced(pinned, sha256Hex("adapter-bytes")),
      "the pinned content reproduces"
    ).not.toThrow();
    expect(
      () => assertAdapterDigestReproduced(pinned, sha256Hex("swapped-binary")),
      "a binary swapped after prepare refuses before it can execute"
    ).toThrow(codes.adapterInvalid);
    expect(
      () =>
        assertAdapterDigestReproduced(
          minimalReceipt("resolved", { admission: { adapterSha256: null } }),
          sha256Hex("swapped-binary")
        ),
      "an unpinned receipt does not refuse — phase 2 derives and persists it"
    ).not.toThrow();
    const cutover = runnerBetween(
      'if (receipt.state === "resume_authorized") {',
      'if (receipt.state === "resume_completed")'
    );
    const compareAt = cutover.indexOf("assertAdapterDigestReproduced(receipt, resumeSha);");
    expect(compareAt, "the cutover compare is present").toBeGreaterThan(-1);
    expect(
      cutover.indexOf("await runAdmissionAdapter("),
      "the resume adapter executes only after the pin reproduces"
    ).toBeGreaterThan(compareAt);
  });
});
describe("task551 online index deployment: cutover evidence", () => {
  const OP_ID = "11111111-2222-3333-4444-555555555555";
  const NONCE = "A".repeat(43);
  const RECEIPT_SHA = sha256Hex("receipt");
  const AUTH_SHA = sha256Hex("authorization");
  const FLEET = { runtimeProcessCount: 2, workerProcessCount: 1, totalProcessCount: 3 };
  const replica = (id: string, state: string): Json => ({ id, state, binarySha256: sha256Hex(id) });
  /** A shape-complete ack for the given phase, overridable field by field. */
  const ackJson = (
    action: "prepare" | "resume",
    overrides: Json = {},
    state = action === "prepare" ? "stopped" : "running"
  ): Json => ({
    version: 1,
    action,
    operationId: OP_ID,
    nonce: NONCE,
    receiptSha256: RECEIPT_SHA,
    ...(action === "prepare"
      ? { admissionStopped: true, workersDrained: true, maintenanceStopped: true }
      : { admissionResumed: true, workersResumed: true, authorizationSha256: AUTH_SHA }),
    runtimeReplicas: [replica("runtime-a", state), replica("runtime-b", state)],
    workerReplicas: [replica("worker-a", state)],
    completedAt: "2026-09-04T10:00:00.000Z",
    ...overrides,
  });
  const parse = (action: "prepare" | "resume", overrides: Json = {}, state?: string): AdapterAck =>
    parseAdapterAck(
      JSON.stringify(ackJson(action, overrides, state)),
      action,
      OP_ID,
      NONCE,
      RECEIPT_SHA,
      FLEET,
      AUTH_SHA
    );
  test("the per-phase replica gate is exact: prepare drains to stopped, resume proves running", () => {
    expect(
      parse("prepare").runtimeReplicas.map((item) => item.state),
      "a drained prepare"
    ).toEqual(["stopped", "stopped"]);
    expect(
      parse("resume").workerReplicas.map((item) => item.state),
      "a resumed fleet"
    ).toEqual(["running"]);
    expect(
      () => parse("prepare", {}, "running"),
      "a prepare ack whose runtime is still running"
    ).toThrow(codes.adapterInvalid);
    expect(
      () => parse("resume", {}, "stopped"),
      "a resume ack whose worker is still stopped"
    ).toThrow(codes.adapterInvalid);
    pinRunner([
      [
        'const expectedState = action === "prepare" ? "stopped" : "running";',
        "the expected replica state is derived from the phase, never from the ack",
      ],
      [
        'assertReplica(ack.runtimeReplicas, "runtimeReplicas", expectedState, fleet.runtimeProcessCount);',
        "the runtime array is gated on the configured runtime count",
      ],
      [
        'assertReplica(ack.workerReplicas, "workerReplicas", expectedState, fleet.workerProcessCount);',
        "the worker array is gated on the configured worker count",
      ],
    ]);
  });
  test("fleet-count lengths, id grammars, digests and cross-array uniqueness are all required", () => {
    for (const [label, run] of [
      [
        "an under-declared runtime array",
        () => parse("prepare", { runtimeReplicas: [replica("runtime-a", "stopped")] }),
      ],
      [
        "an over-declared worker array",
        () =>
          parse("resume", {
            workerReplicas: [replica("worker-a", "running"), replica("worker-b", "running")],
          }),
      ],
      [
        "an empty worker array under a non-zero count",
        () => parse("prepare", { workerReplicas: [] }),
      ],
      [
        "an id repeated across the two arrays",
        () => parse("prepare", { workerReplicas: [replica("runtime-a", "stopped")] }),
      ],
      [
        "a foreign replica id",
        () =>
          parse("prepare", {
            runtimeReplicas: [replica("-bad id", "stopped"), replica("runtime-b", "stopped")],
          }),
      ],
      [
        "a non-digest binary sha",
        () =>
          parse("resume", {
            runtimeReplicas: [
              { id: "runtime-a", state: "running", binarySha256: "abc" },
              replica("runtime-b", "running"),
            ],
          }),
      ],
      ["a foreign ack key", () => parse("prepare", { injection: "1; drop table" })],
      ["a downgraded ack version", () => parse("prepare", { version: 2 })],
      [
        "a drifted action echo",
        () =>
          parseAdapterAck(
            JSON.stringify(ackJson("prepare")),
            "resume",
            OP_ID,
            NONCE,
            RECEIPT_SHA,
            FLEET,
            AUTH_SHA
          ),
      ],
      [
        "a drifted operation echo",
        () =>
          parseAdapterAck(
            JSON.stringify(ackJson("prepare")),
            "prepare",
            "22222222-2222-3333-4444-555555555555",
            NONCE,
            RECEIPT_SHA,
            FLEET
          ),
      ],
      [
        "a drifted nonce echo",
        () =>
          parseAdapterAck(
            JSON.stringify(ackJson("prepare")),
            "prepare",
            OP_ID,
            "B".repeat(43),
            RECEIPT_SHA,
            FLEET
          ),
      ],
      [
        "a drifted receipt digest echo",
        () =>
          parseAdapterAck(
            JSON.stringify(ackJson("prepare")),
            "prepare",
            OP_ID,
            NONCE,
            sha256Hex("other"),
            FLEET
          ),
      ],
      [
        "a non-canonical completedAt",
        () => parse("prepare", { completedAt: "2026-09-04 10:00:00" }),
      ],
      [
        "an ack beyond the stdout byte ceiling",
        () => parse("prepare", { completedAt: `2026-09-04T10:00:00.000Z${"x".repeat(17 * 1024)}` }),
      ],
      [
        "an unknown adapter action",
        () =>
          parseAdapterAck(
            JSON.stringify(ackJson("prepare")),
            "drain",
            OP_ID,
            NONCE,
            RECEIPT_SHA,
            FLEET
          ),
      ],
    ] as const)
      expect(run, label).toThrow(codes.adapterInvalid);
    pinRunner([
      [
        'if (new Set(ids).size !== ids.length) fail(TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid, "a replica id repeats across the runtime and worker arrays");',
        "cross-array id uniqueness is a refusal, not a deduplication",
      ],
      [
        "!REPLICA_ID_GRAMMAR.test(replica.id) || !HEX64.test(replica.binarySha256)",
        "replica ids and binary digests must match their grammars",
      ],
      [
        'if (Buffer.byteLength(text, "utf8") > BUDGETS.adapterStdoutMaxBytes || Object.keys(ack).some((key) => !(ALLOWED_ACK_KEYS as readonly string[]).includes(key)))',
        "the byte ceiling and the closed key set are one gate",
      ],
      [
        "Object.keys(ack).some((key) => !(ALLOWED_ACK_KEYS as readonly string[]).includes(key))",
        "unknown ack keys are foreign objects",
      ],
    ]);
  });
  test("the drained/resumed booleans and the echoed authorization digest fail closed, and the flag rides the cutover", () => {
    for (const [label, code, run] of [
      [
        "a prepare ack that is not fully drained",
        codes.adapterPrepareFailed,
        () => parse("prepare", { workersDrained: false }),
      ],
      [
        "a prepare ack without maintenance stopped",
        codes.adapterPrepareFailed,
        () => parse("prepare", { maintenanceStopped: false }),
      ],
      [
        "a resume ack that is not fully resumed",
        codes.adapterResumeFailed,
        () => parse("resume", { admissionResumed: false }),
      ],
      [
        "a resume ack without an authorization digest",
        codes.adapterResumeFailed,
        () => parse("resume", { authorizationSha256: undefined }),
      ],
      [
        "a resume ack with a non-digest authorization",
        codes.adapterResumeFailed,
        () => parse("resume", { authorizationSha256: "nothex" }),
      ],
      [
        "a resume ack echoing a foreign authorization digest",
        codes.adapterResumeFailed,
        () =>
          parseAdapterAck(
            JSON.stringify(ackJson("resume")),
            "resume",
            OP_ID,
            NONCE,
            RECEIPT_SHA,
            FLEET,
            sha256Hex("foreign")
          ),
      ],
    ] as const)
      expect(run, label).toThrow(code);
    // The passing resume is the only shape that returns, and it carries the runner's own authorization digest back out;
    // a prepare ack carries no authorization key at all.
    expect(parse("resume").authorizationSha256).toBe(AUTH_SHA);
    expect(
      (parse("prepare") as unknown as Json).authorizationSha256,
      "prepare carries no authorization key"
    ).toBeUndefined();
    pinRunner([
      [
        'if (receipt.state === "resume_authorized") {',
        "the cutover is reachable only from resume_authorized",
      ],
      [
        "let admission = { ...receipt.admission, newBinaryTrafficAccepted: true };",
        "the irreversible flag is set only on the resume_authorized continuation",
      ],
      [
        'await step("resume_authorized", { state: "resume_completed", admission });',
        "the flag is persisted only after the awaited adapter acknowledgement",
      ],
      [
        "if (replica.binarySha256 !== receipt.admission.resumeBinarySha256) fail(TASK551_ORCHESTRATOR_ERROR_CODES.adapterResumeFailed, `${replica.id} does not run the authorized binary`);",
        "every resumed replica must run the authorized binary digest",
      ],
      ["newBinaryTrafficAccepted: false }", "a seeded receipt never carries the flag"],
      [
        'if (receipt.admission.mode === "offline-single") {',
        "offline-single never enters the resume/cutover machinery",
      ],
      [
        'await step("revision_integrity_ready", { state: "read_performance_building" });}',
        "offline-single stays cold into the read-performance group",
      ],
    ]);
    const source = runnerSource();
    const flag = source.indexOf("newBinaryTrafficAccepted: true");
    expect(flag, "the irreversible flag is produced at exactly one site").toBe(
      source.lastIndexOf("newBinaryTrafficAccepted: true")
    );
    expect(source.slice(flag), "the flagged successor is resume_completed").toContain(
      'state: "resume_completed"'
    );
  });
  test("offline-single's terminal is the real forward_ready transition, and external alone pins the release digests", () => {
    const forwardReady = minimalReceipt("forward_ready", {
      generation: 9,
      previousStateSha256: sha256Hex("read-performance-group"),
    });
    // Exactly the transition the runner CASes after its final catalog gate: a new state, a rebound chain, nothing else.
    const terminal = casReceipt(forwardReady, "forward_ready", {
      state: "operator_resume_authorized",
    });
    expect(terminal.state).toBe("operator_resume_authorized");
    expect([terminal.generation, terminal.previousStateSha256]).toEqual([
      forwardReady.generation + 1,
      forwardReady.stateSha256,
    ]);
    expect(
      () => casReceipt(terminal, "forward_ready", { state: "operator_resume_authorized" }),
      "the terminal is itself CAS-guarded"
    ).toThrow(codes.receiptConflict);
    expect(
      runnerStateList("TERMINAL_FORWARD_STATES"),
      "both forward terminals are closed-listed"
    ).toEqual(["forward_ready", "operator_resume_authorized"]);
    pinRunner([
      [
        'if (offline) await step("forward_ready", { state: "operator_resume_authorized" });',
        "offline-single persists its terminal only after forward_ready and only in offline mode",
      ],
      [
        'if (receipt.state === "forward_ready") { await verifyFinalCatalog(session, true);',
        "that terminal is produced only after the final catalog gate",
      ],
      [
        "export function requireReleaseDigest(env: Environment, name: string): string {",
        "the release digests are read through one required helper",
      ],
      [
        'resumeBinarySha256: requireReleaseDigest(env, "TASK551_RESUME_BINARY_SHA256")',
        "the resumed binary digest is pinned into the resume_authorized receipt",
      ],
      [
        'revisionWriterCompatibilitySha256: requireReleaseDigest(env, "TASK551_REVISION_WRITER_COMPATIBILITY_SHA256")',
        "the revision-writer compatibility digest is pinned beside it",
      ],
    ]);
    // The offline terminal is produced at exactly one call site, and it is the offline-gated one.
    expect(
      [...runnerSource().matchAll(/state: "operator_resume_authorized"/g)],
      "one production site only"
    ).toHaveLength(1);
    expect(
      requireReleaseDigest(
        { TASK551_RESUME_BINARY_SHA256: sha256Hex("bin") },
        "TASK551_RESUME_BINARY_SHA256"
      )
    ).toBe(sha256Hex("bin"));
    for (const [label, env] of [
      ["an absent release digest", {}],
      ["a non-digest release digest", { TASK551_RESUME_BINARY_SHA256: "ABC" }],
      ["an empty release digest", { TASK551_RESUME_BINARY_SHA256: "" }],
    ] as const)
      expect(() => requireReleaseDigest(env, "TASK551_RESUME_BINARY_SHA256"), label).toThrow(
        codes.adapterResumeFailed
      );
  });
});
describe("task551 online index deployment: write-cost gate and autoscaling eligibility", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "task551-write-cost-"));
  afterAll(() => rmSync(directory, { recursive: true, force: true }));
  let sequence = 0;
  /** Writes one evidence document and returns its path — the only thing the environment carries. */
  const evidencePath = (body: unknown): string => {
    sequence += 1;
    const target = path.join(directory, `evidence-${String(sequence)}.json`);
    writeFileSync(target, typeof body === "string" ? body : JSON.stringify(body), { mode: 0o600 });
    return target;
  };
  const evidence = (overrides: Json = {}): Json => ({
    source: "live-traffic",
    writers: 16,
    invariantErrors: 0,
    deadlockErrors: 0,
    p95RegressionRatio: 1.2,
    ...overrides,
  });
  test("external mode fails closed without evidence and consumes only live-traffic evidence inside every ceiling", () => {
    expect(
      () => readWriteCostEvidence({}, "external"),
      "no evidence variable is a refusal, not a pass"
    ).toThrow(codes.preflightFailed);
    expect(() => readWriteCostEvidence({ TASK551_WRITE_COST_EVIDENCE: "" }, "external")).toThrow(
      codes.preflightFailed
    );
    expect(() =>
      readWriteCostEvidence(
        { TASK551_WRITE_COST_EVIDENCE: path.join(directory, "absent.json") },
        "external"
      )
    ).toThrow(codes.preflightFailed);
    expect(
      readWriteCostEvidence({ TASK551_WRITE_COST_EVIDENCE: evidencePath(evidence()) }, "external")
    ).toEqual({
      source: "live-traffic",
      writers: 16,
      invariantErrors: 0,
      deadlockErrors: 0,
      p95RegressionRatio: 1.2,
    });
    pinRunner([
      [
        'const requiredSource = mode === "external" ? "live-traffic" as const : "rehearsal" as const;',
        "the required evidence source is the admission mode",
      ],
      [
        "if (evidence.writers !== 16 || !Number.isInteger(evidence.writers)) fail(code, `the write-cost evidence covers ${String(evidence.writers)} representative writers, not 16`);",
        "exactly 16 representative writers",
      ],
      [
        'if (evidence.invariantErrors !== 0 || evidence.deadlockErrors !== 0) fail(code, "the write-cost evidence records an invariant or deadlock error");',
        "zero invariant and deadlock errors",
      ],
      [
        'ratio > 1.2) fail(code, "the write-cost p95 regression is absent or above the 20% ceiling");',
        "at most a 20% p95 regression",
      ],
    ]);
    const source = runnerSource();
    expect(
      source.indexOf("readWriteCostEvidence(env, receipt.admission.mode);"),
      "the gate is consumed before forward_ready"
    ).toBeLessThan(source.indexOf('await step(null, { state: "forward_ready"'));
    for (const [label, body] of [
      ["a rehearsal document under external mode", evidence({ source: "rehearsal" })],
      ["fifteen writers", evidence({ writers: 15 })],
      ["a fractional writer count", evidence({ writers: 16.5 })],
      ["one invariant error", evidence({ invariantErrors: 1 })],
      ["one deadlock", evidence({ deadlockErrors: 2 })],
      ["a 21% p95 regression", evidence({ p95RegressionRatio: 1.21 })],
      ["a negative ratio", evidence({ p95RegressionRatio: -1 })],
      ["a non-numeric ratio", evidence({ p95RegressionRatio: "1.2" })],
      ["a foreign key set", { ...evidence(), extra: 1 }],
      [
        "a missing key",
        (() => {
          const partial = evidence();
          delete partial.writers;
          return partial;
        })(),
      ],
      ["an oversize document", evidence({ source: `live-traffic${"x".repeat(17 * 1024)}` })],
      ["a non-JSON document", "{ not json"],
    ] as const)
      expect(
        () =>
          readWriteCostEvidence({ TASK551_WRITE_COST_EVIDENCE: evidencePath(body) }, "external"),
        label
      ).toThrow(codes.preflightFailed);
  });
  test("offline-single accepts rehearsal evidence only, and has no evidence of its own by default", () => {
    expect(
      readWriteCostEvidence(
        { TASK551_WRITE_COST_EVIDENCE: evidencePath(evidence({ source: "rehearsal" })) },
        "offline-single"
      ).source
    ).toBe("rehearsal");
    for (const [label, body] of [
      ["live-traffic evidence under offline mode", evidence()],
      ["the same ceilings apply offline", evidence({ writers: 0 })],
      ["an error-bearing rehearsal", evidence({ source: "rehearsal", deadlockErrors: 1 })],
    ] as const)
      expect(
        () =>
          readWriteCostEvidence(
            { TASK551_WRITE_COST_EVIDENCE: evidencePath(body) },
            "offline-single"
          ),
        label
      ).toThrow(codes.preflightFailed);
    expect(
      () => readWriteCostEvidence({}, "offline-single"),
      "offline-single has no default evidence either"
    ).toThrow(codes.preflightFailed);
  });
  test("autoscaling/scale-to-zero is an exact environment declaration that makes external admission mandatory", () => {
    expect(autoscalingEnabled({}), "absent is disabled").toBe(false);
    expect(
      autoscalingEnabled({ TASK551_AUTOSCALING_ENABLED: "false" }),
      "`false` is disabled"
    ).toBe(false);
    expect(autoscalingEnabled({ TASK551_AUTOSCALING_ENABLED: "true" }), "`true` is enabled").toBe(
      true
    );
    for (const [label, env] of [
      ["a truthy non-literal", { TASK551_AUTOSCALING_ENABLED: "1" }],
      ["a differently cased literal", { TASK551_AUTOSCALING_ENABLED: "TRUE" }],
      ["an empty declaration", { TASK551_AUTOSCALING_ENABLED: "" }],
      ["a prose declaration", { TASK551_AUTOSCALING_ENABLED: "yes" }],
    ] as const)
      expect(() => autoscalingEnabled(env), label).toThrow(codes.preflightFailed);
    pinRunner([
      [
        "export function autoscalingEnabled(env: Environment): boolean {",
        "the eligibility input is one named, exported seam",
      ],
      [
        'if (value === undefined || value === "false") return false;',
        "absent or `false` is disabled",
      ],
      ['if (value === "true") return true;', "`true` is enabled"],
      [
        'if (offline && autoscalingEnabled(env)) fail(TASK551_ORCHESTRATOR_ERROR_CODES.offlineSingleDenied, "autoscaling/scale-to-zero is enabled, so external admission is mandatory");',
        "enabled autoscaling forbids offline-single",
      ],
      [
        "const fleet = parseDatabaseFleetConfig(env);",
        "the fleet counts come from the L01 parser, never from an inference",
      ],
    ]);
  });
});
describe("task551 online index deployment: per-table classification and health recheck", () => {
  const artifacts = resolveTask551Artifacts(manifestSha256);
  const MiB = 1024 * 1024;
  const measure = (name: string, bytes: number, rows: number): TouchedMeasure => ({
    name,
    bytes,
    rows,
  });
  test("small requires EVERY touched table inside both ceilings and the combined size inside its own", () => {
    expect(classifyMeasured([measure("pages", 1, 1)]), "a single tiny table").toBe("small");
    expect(
      classifyMeasured([
        measure("a", 256 * MiB, 100_000),
        measure("b", 256 * MiB, 100_000),
        measure("c", 256 * MiB, 100_000),
        measure("d", 256 * MiB, 100_000),
      ]),
      "every table exactly at its ceilings and the combined size exactly at 1 GiB is still small"
    ).toBe("small");
    expect(
      classifyMeasured([measure("pages", 1, 100_001)]),
      "one table over the row ceiling is large"
    ).toBe("large");
    expect(
      classifyMeasured([measure("posts", 256 * MiB + 1, 1)]),
      "one table over the byte ceiling is large"
    ).toBe("large");
    expect(
      classifyMeasured([
        measure("a", 256 * MiB, 10),
        measure("b", 256 * MiB, 10),
        measure("c", 256 * MiB, 10),
        measure("d", 256 * MiB, 10),
        measure("e", 256 * MiB, 10),
      ]),
      "every table inside its own ceilings but a combined size over 1 GiB is large"
    ).toBe("large");
    expect(
      classifyMeasured([measure("pages", 1, 1), measure("posts", 1, 200_000)]),
      "the violation may sit in any member"
    ).toBe("large");
    pinRunner([
      [
        'export function classifyMeasured(tables: readonly TouchedMeasure[]): "small" | "large" {',
        "the closed small/large rule is one exported seam",
      ],
      [
        'return tables.every((table) => table.rows <= BUDGETS.smallTableRows && table.bytes <= BUDGETS.smallTableBytes) && combined <= BUDGETS.combinedBytes ? "small" : "large";',
        "the rule is per table for both ceilings and combined for the size",
      ],
      [
        "smallTableRows: 100_000, smallTableBytes: 256 * 1024 * 1024, combinedBytes: 1024 * 1024 * 1024,",
        "the three ceilings are the contract's numbers",
      ],
    ]);
  });
  test("a resumed mirror reproduces the journal and artifact digests, and the preflight digest beside them pre-DDL", () => {
    const bound = frozenReceipt("transaction_applied");
    const drifted = (mutate: (copy: Json) => void): Task551MigrationReceipt => {
      const copy = structuredClone(bound) as unknown as Json;
      mutate(copy);
      return copy as unknown as Task551MigrationReceipt;
    };
    expect(
      () => assertArtifactsReproduced(bound, artifacts),
      "a faithful mirror reproduces"
    ).not.toThrow();
    for (const [label, code, receipt] of [
      [
        "a foreign journal index",
        codes.journalNotUnique,
        drifted((copy) => {
          (copy.journal as Json).index = 80;
        }),
      ],
      [
        "a foreign journal tag",
        codes.journalNotUnique,
        drifted((copy) => {
          (copy.journal as Json).tag = "0080_other";
        }),
      ],
      [
        "a drifted transactional digest",
        codes.artifactDigestChanged,
        drifted((copy) => {
          ((copy.artifacts as Json).transactionalSql as Json).sha256 = sha256Hex("drift");
        }),
      ],
      [
        "a drifted snapshot digest",
        codes.artifactDigestChanged,
        drifted((copy) => {
          ((copy.artifacts as Json).snapshot as Json).sha256 = sha256Hex("drift");
        }),
      ],
      [
        "a drifted companion digest",
        codes.artifactDigestChanged,
        drifted((copy) => {
          ((copy.artifacts as Json).onlineSql as Json).sha256 = sha256Hex("drift");
        }),
      ],
      [
        "a drifted companion path",
        codes.artifactDigestChanged,
        drifted((copy) => {
          ((copy.artifacts as Json).onlineSql as Json).path = "core/db/migrations/other.sql";
        }),
      ],
      [
        "a drifted manifest digest",
        codes.artifactDigestChanged,
        drifted((copy) => {
          (copy.artifacts as Json).manifestSha256 = sha256Hex("drift");
        }),
      ],
      [
        "a drifted aggregate digest",
        codes.artifactDigestChanged,
        drifted((copy) => {
          (copy.artifacts as Json).aggregateSha256 = sha256Hex("drift");
        }),
      ],
    ] as const)
      expect(() => assertArtifactsReproduced(receipt, artifacts), label).toThrow(code);
    // Adjudicated (round 6): the artifact proof no longer compares the preflight digest — the canonical preflight digest binds measured health
    // evidence (:186-188), so that reproduction moved to the pre-DDL states and is refused there instead.
    expect(
      () =>
        assertArtifactsReproduced(
          drifted((copy) => {
            (copy.preflight as Json).digest = sha256Hex("drift");
          }),
          artifacts
        ),
      "a foreign preflight digest is the pre-DDL branch's refusal, not the artifact proof's"
    ).not.toThrow();
    pinRunner([
      [
        "if (mirror !== null) assertArtifactsReproduced(receipt, artifacts);",
        "every resumed mirror reproduces the resolved artifacts before one statement runs",
      ],
      [
        'const PRE_DDL_REPRODUCE_STATES: readonly ReceiptState[] = ["resolved", "preflight_passed"];',
        "exactly the two pre-DDL states must reproduce the canonical preflight digest",
      ],
      [
        "if (mirror !== null && PRE_DDL_REPRODUCE_STATES.includes(receipt.state)) {",
        "that reproduction is its own pre-DDL branch, not part of the artifact proof",
      ],
      [
        "await assertPreflightReproduced(session, receipt, artifacts.touchedTables, consumePredecisionIntervalFiles().digest); }",
        "the branch re-measures the evidence and compares the canonical digest",
      ],
    ]);
    expect(
      runnerBetween("export function assertArtifactsReproduced", "// --- Receipt").includes(
        "preflight.digest"
      ),
      "the artifact proof does not compare the preflight digest"
    ).toBe(false);
  });
  test("a post-DDL resume re-measures every touched table, re-quires the health ceilings and appends one recheck digest", async () => {
    const measured = artifacts.touchedTables.map((name, index) =>
      measure(name, 2_000 + index, 100 * (index + 1))
    );
    const sessionFor = (
      rows: readonly TouchedMeasure[],
      health: HealthRow = ["f", "0", "4", "0"]
    ): ReservedSession => makeMeasuredSession(health, rows);
    const receipt = frozenReceipt("transaction_applied");
    const rechecked = await appendHealthRecheck(
      sessionFor(measured),
      receipt,
      artifacts.touchedTables
    );
    expect(
      [
        rechecked.classification,
        rechecked.lockTimeoutMs,
        rechecked.statementTimeoutMs,
        rechecked.transactionTimeoutMs,
      ],
      "the frozen classification and budgets are never recomputed"
    ).toEqual([
      "small",
      receipt.preflight.lockTimeoutMs,
      receipt.preflight.statementTimeoutMs,
      receipt.preflight.transactionTimeoutMs,
    ]);
    expect(rechecked.recheckDigests, "exactly one digest is appended").toHaveLength(
      receipt.preflight.recheckDigests.length + 1
    );
    expect(
      rechecked.recheckDigests.slice(0, -1),
      "the frozen digests are carried verbatim"
    ).toEqual(receipt.preflight.recheckDigests);
    expect(rechecked.recheckDigests.at(-1)).toMatch(/^[0-9a-f]{64}$/);
    pinRunner([
      [
        "const digest = sha256Hex(canonicalJson({ at: nowUtc(), aggregateSha256: receipt.artifacts.aggregateSha256, bytes: measured.bytes, tables: measured.tables,",
        "the appended digest binds the per-table measurement, never one aggregate number",
      ],
      [
        "coalesce(pg_total_relation_size(c.oid), 0), c.reltuples",
        "the measurement reads per-table bytes and the planner's row estimate",
      ],
      [
        "c.relname = any(${[...touchedTables]}) and c.relkind = 'r'",
        "exactly the touched set is measured, ordinary tables only",
      ],
      [
        "if (row === undefined) fail(TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed, `the touched table ${name} does not exist`);",
        "a missing touched table refuses instead of measuring a partial family",
      ],
      [
        "if (!Number.isFinite(estimate) || estimate < 0) fail(TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed, `${name} has no analyzed row estimate`);",
        "a never-analyzed table refuses instead of reading as empty",
      ],
      [
        "if (tables.length !== rows.length) fail(TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed, `${String(rows.length)} measured rows for ${String(tables.length)} touched tables`);",
        "one aggregate row can no longer satisfy the measurement",
      ],
      [
        'if (classifyMeasured(measured.tables) === "large" && receipt.preflight.classification === "small") {',
        "the frozen classification must still cover the live counts",
      ],
      [
        '"the live counts no longer fit the frozen small classification; the rollout stops instead of loosening a budget"',
        "no budget is loosened to fit",
      ],
      [
        "if (mirror !== null && DDL_RECHECK_STATES.includes(receipt.state)) {",
        "the recheck is appended only for mirrors frozen after DDL",
      ],
      [
        "await setSessionBudgets(session, receipt.preflight);",
        "the session budgets are re-applied from the frozen receipt, never recomputed",
      ],
      [
        "await step(null, { preflight: await appendHealthRecheck(session, receipt, artifacts.touchedTables) });",
        "the fresh recheck digest is CASed into the receipt",
      ],
      [
        "maxLagSeconds: 5, maxOldestTransactionSeconds: 30,",
        "the :186-189 timing ceilings are the contract's numbers",
      ],
      [
        "async function measureHealthCeilings(session: ReservedSession): Promise<PreflightHealth> {",
        "the health bundle is one closed measurement",
      ],
      [
        "(case when pg_is_in_recovery() then extract(epoch from (now() - pg_last_xact_replay_timestamp())) else 0 end)::text",
        "lag is the standby's replay age, and zero on the primary, read as text",
      ],
      [
        "(select count(*) from public.bookings where ends_at < starts_at)::text",
        "the invalid-window count is read as text, so no bigint OID shape can surprise the runtime",
      ],
      [
        'const inRecovery = row[0] === "t" || row[0] === "true";',
        "bool::text arrives as the server's own 't'/'f' render — text OID 25 has no registered parser — never the assumed \"true\"",
      ],
      [
        'if (inRecovery && row[1] === null) fail(TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed, "the standby has replayed no transaction, so replication lag is unbounded");',
        "a standby that replayed nothing is unbounded, never zero",
      ],
      [
        "if (!Number.isFinite(lagSeconds) || lagSeconds < 0 || !Number.isFinite(Number(row[2])) || Number(row[2]) < 0 || !Number.isFinite(Number(row[3]))) {",
        "every health column is domain-checked as its text-rendered number",
      ],
      [
        "const health = await measureHealthCeilings(session); assertHealthCeilings(health); const conflicts = await measureDataConflicts(session); assertDataConflicts(conflicts);",
        "the captured evidence re-quires every ceiling and conflict invariant before it is bound",
      ],
      [
        "if (health.lagSeconds > BUDGETS.maxLagSeconds) fail(TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed, `replication lag ${health.lagSeconds}s exceeds the ${BUDGETS.maxLagSeconds}s ceiling`);",
        "the replication-lag ceiling refuses",
      ],
      [
        "if (health.oldestTransactionSeconds > BUDGETS.maxOldestTransactionSeconds) fail(TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed, `the oldest transaction ${health.oldestTransactionSeconds}s exceeds the ${BUDGETS.maxOldestTransactionSeconds}s ceiling`);",
        "the oldest-transaction ceiling refuses",
      ],
      [
        "if (health.invalidBookingWindows > 0) fail(TASK551_ORCHESTRATOR_ERROR_CODES.dataConflict, `${health.invalidBookingWindows} booking windows end before they start`);",
        "a corrupt window is a data conflict, never a warning",
      ],
    ]);
    // M8 regression: one aggregate row for the whole family is a refusal, never a measurement.
    await expect(
      appendHealthRecheck(
        sessionFor([measure("every touched table in one row", 43_000, 4_300)]),
        receipt,
        artifacts.touchedTables
      )
    ).rejects.toThrow(codes.preflightFailed);
    // An extra row is a foreign measurement, a vanished table is a partial family, and an unanalyzed table is unreadable.
    await expect(
      appendHealthRecheck(
        sessionFor([...measured, measure("pages_shadow", 1, 1)]),
        receipt,
        artifacts.touchedTables
      )
    ).rejects.toThrow(codes.preflightFailed);
    await expect(
      appendHealthRecheck(sessionFor(measured.slice(1)), receipt, artifacts.touchedTables)
    ).rejects.toThrow(codes.preflightFailed);
    await expect(
      appendHealthRecheck(
        sessionFor(
          measured.map((row, index) => (index === 0 ? measure(row.name, row.bytes, -1) : row))
        ),
        receipt,
        artifacts.touchedTables
      )
    ).rejects.toThrow(codes.preflightFailed);
    // A live large count under a frozen small receipt refuses instead of loosening a budget.
    await expect(
      appendHealthRecheck(
        sessionFor(
          measured.map((row, index) => (index === 3 ? measure(row.name, row.bytes, 100_001) : row))
        ),
        receipt,
        artifacts.touchedTables
      )
    ).rejects.toThrow(codes.preflightFailed);
    // The :186-189 health ceilings are re-required on the very same path, before anything is appended.
    await expect(
      appendHealthRecheck(
        sessionFor(measured, ["false", "9", "4", "0"]),
        receipt,
        artifacts.touchedTables
      ),
      "a lag over the 5s ceiling refuses the recheck"
    ).rejects.toThrow(codes.preflightFailed);
    await expect(
      appendHealthRecheck(
        sessionFor(measured, ["false", "0", "31", "0"]),
        receipt,
        artifacts.touchedTables
      ),
      "an oldest transaction over the 30s ceiling refuses"
    ).rejects.toThrow(codes.preflightFailed);
    await expect(
      appendHealthRecheck(
        sessionFor(measured, ["false", "0", "4", "1"]),
        receipt,
        artifacts.touchedTables
      ),
      "a corrupt booking window refuses as a data conflict"
    ).rejects.toThrow(codes.dataConflict);
    await expect(
      appendHealthRecheck(
        sessionFor(measured, ["true", null, "0", "0"]),
        receipt,
        artifacts.touchedTables
      ),
      'the deliberate "true" admission is fail-closed too: a standby with a null lag refuses under either render'
    ).rejects.toThrow(codes.preflightFailed);
    await expect(
      appendHealthRecheck(
        sessionFor(measured, ["t", null, "0", "0"]),
        receipt,
        artifacts.touchedTables
      ),
      "the real 't' render refuses a standby whose replay lag is null, never reading it as 0s"
    ).rejects.toThrow(codes.preflightFailed);
    expect(
      (
        await appendHealthRecheck(
          sessionFor(measured, ["f", "0", "4", "0"]),
          receipt,
          artifacts.touchedTables
        )
      ).recheckDigests,
      "the real 'f' primary render proceeds beside it"
    ).toHaveLength(receipt.preflight.recheckDigests.length + 1);
    await expect(
      appendHealthRecheck(
        sessionFor(measured, ["f", "nope", "0", "0"]),
        receipt,
        artifacts.touchedTables
      ),
      "a health column outside its own domain refuses"
    ).rejects.toThrow(codes.preflightFailed);
  });
  test("the :186-189 gate itself admits its exact boundaries and refuses beyond them", () => {
    expect(
      () =>
        assertHealthCeilings({
          lagSeconds: 5,
          oldestTransactionSeconds: 30,
          invalidBookingWindows: 0,
        }),
      "5s and 30s are inside the ceilings"
    ).not.toThrow();
    expect(
      () =>
        assertHealthCeilings({
          lagSeconds: 5.5,
          oldestTransactionSeconds: 30,
          invalidBookingWindows: 0,
        }),
      "a lag past the 5s ceiling refuses"
    ).toThrow(codes.preflightFailed);
    expect(
      () =>
        assertHealthCeilings({
          lagSeconds: 0,
          oldestTransactionSeconds: 30.5,
          invalidBookingWindows: 0,
        }),
      "an oldest transaction past the 30s ceiling refuses"
    ).toThrow(codes.preflightFailed);
    expect(
      () =>
        assertHealthCeilings({
          lagSeconds: 0,
          oldestTransactionSeconds: 0,
          invalidBookingWindows: 1.5,
        }),
      "a window total that is not a count refuses before the conflict code is reached"
    ).toThrow(codes.preflightFailed);
    expect(
      () =>
        assertHealthCeilings({
          lagSeconds: 0,
          oldestTransactionSeconds: 0,
          invalidBookingWindows: 1,
        }),
      "one corrupt window is still the data-conflict refusal"
    ).toThrow(codes.dataConflict);
    pinRunner([
      [
        'if (!Number.isInteger(health.invalidBookingWindows) || health.invalidBookingWindows < 0) fail(TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed, "the invalid booking window count is not a count");',
        "the count-domain refusal precedes the data-conflict refusal",
      ],
    ]);
  });
  test("the data-conflict probes are schema-qualified, search_path-independent like every other catalog probe in the runner", () => {
    const conflicts = runnerBetween(
      "async function measureDataConflicts",
      "export function assertDataConflicts"
    );
    const qualified = [
      "from public.page_revisions",
      "from public.content_revisions",
      "from public.widget_template_revisions",
      "from public.bookings a join public.bookings b",
    ];
    expect(
      qualified.every((probe) => conflicts.includes(probe)),
      "all four probes measure public objects only"
    ).toBe(true);
    for (const unqualified of [
      "from page_revisions",
      "from content_revisions",
      "from widget_template_revisions",
      "from bookings ",
    ])
      expect(conflicts.includes(unqualified), `${unqualified} never appears unqualified`).toBe(
        false
      );
  });
});
describe("task551 online index deployment: the canonical preflight digest and its :186-189 binding", () => {
  const artifacts = resolveTask551Artifacts(manifestSha256);
  const MiB = 1024 * 1024;
  const measure = (name: string, bytes: number, rows: number): TouchedMeasure => ({
    name,
    bytes,
    rows,
  });
  type Health = {
    readonly lagSeconds: number;
    readonly oldestTransactionSeconds: number;
    readonly invalidBookingWindows: number;
  };
  const touched = ["pages", "posts"];
  const rows = [measure("pages", 2 * MiB, 900), measure("posts", 3 * MiB, 1_200)];
  const healthy: HealthRow = ["f", "0", "12", "0"];
  const intervalSha = sha256Hex("interval");
  /** Round 8: the suite injects ONE fixed `statfs` reading for this whole describe, so the digest producer, its reproduction and every drift comparison read a single value — no assertion ever compares two live `statfs` readings, and the positive and negative pre-DDL cases are deterministic by construction. */
  const fixedFreeBytes = (): number => freeDiskBytes();
  beforeAll(() => injectFreeDiskBytes(1024 * 1024 * 1024));
  afterAll(() => injectFreeDiskBytes(null));
  /** The canonical digest of exactly the evidence a scripted session hands back. */
  const digestOf = (
    health: Health,
    tables: readonly TouchedMeasure[] = rows,
    predecisionSha256 = intervalSha,
    freeBytes = fixedFreeBytes()
  ): string =>
    canonicalPreflightDigest({
      aggregateSha256: artifacts.aggregateSha256,
      classification: "small",
      lockTimeoutMs: 2_000,
      statementTimeoutMs: 30_000,
      transactionTimeoutMs: 120_000,
      predecisionSha256,
      health,
      conflicts: { duplicateRevisionGroups: 0, overlappingBookingWindows: 0 },
      tables,
      bytes: tables.reduce((total, table) => total + table.bytes, 0),
      freeBytes,
    });
  const health = (
    lagSeconds: number,
    oldestTransactionSeconds: number,
    invalidBookingWindows = 0
  ): Health => ({ lagSeconds, oldestTransactionSeconds, invalidBookingWindows });
  test("lag, the oldest transaction, the invalid windows, the interval and the tables are all bound into one closed hash", () => {
    // One injected reading for the whole comparison set: only the named evidence input may move between these digests, never the disk.
    const freeBytes = fixedFreeBytes();
    expect(freeBytes, "the whole describe reads the one injected reading, never a live mount").toBe(
      1024 * 1024 * 1024
    );
    const digest = digestOf(health(0, 12), rows, intervalSha, freeBytes);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    const reordered: Record<string, unknown> = {};
    for (const key of Object.keys(
      digestOf(health(0, 12), rows, intervalSha, freeBytes) &&
        ({
          aggregateSha256: artifacts.aggregateSha256,
          classification: "small",
          lockTimeoutMs: 2_000,
          statementTimeoutMs: 30_000,
          transactionTimeoutMs: 120_000,
          predecisionSha256: intervalSha,
          health: health(0, 12),
          conflicts: { duplicateRevisionGroups: 0, overlappingBookingWindows: 0 },
          tables: rows,
          bytes: rows.reduce((total, table) => total + table.bytes, 0),
          freeBytes,
        } as Record<string, unknown>)
    ).reverse())
      reordered[key] = (
        {
          aggregateSha256: artifacts.aggregateSha256,
          classification: "small",
          lockTimeoutMs: 2_000,
          statementTimeoutMs: 30_000,
          transactionTimeoutMs: 120_000,
          predecisionSha256: intervalSha,
          health: health(0, 12),
          conflicts: { duplicateRevisionGroups: 0, overlappingBookingWindows: 0 },
          tables: rows,
          bytes: rows.reduce((total, table) => total + table.bytes, 0),
          freeBytes,
        } as Record<string, unknown>
      )[key];
    expect(
      canonicalPreflightDigest(reordered as Parameters<typeof canonicalPreflightDigest>[0]),
      "the hash is canonical, never insertion-ordered"
    ).toBe(digest);
    expect(
      canonicalPreflightDigest({
        aggregateSha256: artifacts.aggregateSha256,
        classification: "small",
        lockTimeoutMs: 2_000,
        statementTimeoutMs: 30_000,
        transactionTimeoutMs: 120_000,
        predecisionSha256: intervalSha,
        health: health(1, 12),
        conflicts: { duplicateRevisionGroups: 0, overlappingBookingWindows: 0 },
        tables: rows,
        bytes: rows.reduce((total, table) => total + table.bytes, 0),
        freeBytes,
      }),
      "a one-second lag drift changes the digest"
    ).not.toBe(digest);
    expect(
      digestOf(health(0, 13), rows, intervalSha, freeBytes),
      "a one-second oldest-transaction drift changes it"
    ).not.toBe(digest);
    expect(
      digestOf(health(0, 12, 2), rows, intervalSha, freeBytes),
      "an invalid-window drift changes it"
    ).not.toBe(digest);
    expect(
      digestOf(health(0, 12), [rows[0]!, measure("posts", 3 * MiB, 1_201)], intervalSha, freeBytes),
      "a per-table drift changes it"
    ).not.toBe(digest);
    expect(
      digestOf(health(0, 12), rows, sha256Hex("another interval"), freeBytes),
      "a different pre-decision interval changes it"
    ).not.toBe(digest);
    expect(
      digestOf(health(0, 12), rows, intervalSha, freeBytes + 1),
      "a free-disk drift changes it — bound through the seam, never re-measured beside the runner's own read"
    ).not.toBe(digest);
    pinRunner([
      [
        'export function canonicalPreflightDigest(input: { aggregateSha256: string; classification: "small" | "large"; conflicts: PreflightConflicts; lockTimeoutMs: number;',
        "the canonical digest is one closed input shape",
      ],
      [
        "predecisionSha256: string; health: PreflightHealth; tables: readonly TouchedMeasure[]; bytes: number; freeBytes: number }): string {",
        "health, the interval digest, the tables and the free disk are bound beside the frozen budgets",
      ],
      [
        "return sha256Hex(canonicalJson(input));}",
        "the binding is one canonical SHA-256 over the whole bundle",
      ],
    ]);
  });
  test("a resumed pre-DDL command reproduces that digest and refuses any evidence drift before phase 2", async () => {
    const receipt = frozenReceipt("resolved");
    receipt.preflight.digest = digestOf(health(0, 12), rows, intervalSha, fixedFreeBytes()); // the digest binds the suite's one injected reading, and the runner's own measurement inside the gate reads that same injected value
    await expect(
      assertPreflightReproduced(makeMeasuredSession(healthy, rows), receipt, touched, intervalSha),
      "the same evidence reproduces"
    ).resolves.toBeUndefined();
    injectFreeDiskBytes(1024 * 1024 * 1024 + 1);
    await expect(
      assertPreflightReproduced(makeMeasuredSession(healthy, rows), receipt, touched, intervalSha),
      "a drifted INJECTED reading refuses — the gate reads the seam, never a second live statfs"
    ).rejects.toThrow(codes.preflightFailed);
    injectFreeDiskBytes(1024 * 1024 * 1024);
    injectFreeDiskBytes(Number.NaN);
    expect(
      () => freeDiskBytes(),
      "a NON-FINITE injected reading refuses through the SAME finite/positive guard a bad live read hits — the seam never bypasses the gate"
    ).toThrow(codes.preflightFailed);
    injectFreeDiskBytes(1024 * 1024 * 1024);
    await expect(
      assertPreflightReproduced(
        makeMeasuredSession(["f", "2", "12", "0"], rows),
        receipt,
        touched,
        intervalSha
      ),
      "a lag drift is a refusal, not an update"
    ).rejects.toThrow(codes.preflightFailed);
    await expect(
      assertPreflightReproduced(
        makeMeasuredSession(["f", "0", "13", "0"], rows),
        receipt,
        touched,
        intervalSha
      ),
      "an oldest-transaction drift refuses"
    ).rejects.toThrow(codes.preflightFailed);
    await expect(
      assertPreflightReproduced(
        makeMeasuredSession(healthy, [rows[0]!, measure("posts", 3 * MiB, 1_201)]),
        receipt,
        touched,
        intervalSha
      ),
      "a table drift refuses"
    ).rejects.toThrow(codes.preflightFailed);
    await expect(
      assertPreflightReproduced(
        makeMeasuredSession(healthy, rows),
        receipt,
        touched,
        sha256Hex("another interval")
      ),
      "a foreign interval digest refuses"
    ).rejects.toThrow(codes.preflightFailed);
    pinRunner([
      [
        'if (digest !== receipt.preflight.digest) fail(TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed, "the canonical preflight digest does not reproduce its captured evidence");',
        "any evidence drift refuses while nothing has been written yet",
      ],
      [
        "export async function assertPreflightReproduced(session: ReservedSession, receipt: Task551MigrationReceipt, touchedTables: readonly string[], predecisionSha256: string): Promise<void> {",
        "the reproduction is one named gate over re-measured evidence",
      ],
    ]);
  });
});
describe("task551 online index deployment: the L02 pre-decision interval consumed before candidates freeze", () => {
  const PURPOSE = INTERVAL_NAME_PURPOSES["task551-predecision-clean"];
  const identity = {
    serverIdentitySha256: sha256Hex("server"),
    databaseIdentitySha256: sha256Hex("database"),
    postgresMajor: 16,
    extensionVersion: "1.5.1",
    statsReset: "2026-09-01T06:00:00.000Z",
  };
  const counter = (queryId: string, calls: number): PgStatSnapshot["counters"][number] => ({
    queryId,
    calls,
    rows: calls * 10,
    totalPlanMs: calls * 2,
    totalExecMs: calls * 5,
  });
  const startSnapshot = (capturedAt = "2026-09-04T10:00:00.000Z"): PgStatSnapshot => ({
    version: 1,
    boundary: "start",
    name: "task551-predecision-clean",
    purpose: PURPOSE,
    capturedAt,
    identity,
    counters: [counter("900000000000001", 3), counter("900000000000002", 1)],
  });
  const endSnapshot = (start: PgStatSnapshot, bump = 0): PgStatSnapshot => ({
    ...start,
    boundary: "end",
    capturedAt: "2026-09-04T10:04:00.000Z",
    counters: start.counters.map((item) => ({
      ...item,
      calls: item.calls + 4 + bump,
      rows: item.rows + 40,
      totalPlanMs: item.totalPlanMs + 8,
      totalExecMs: item.totalExecMs + 20,
    })),
  });
  const evidenceFor = (
    start: PgStatSnapshot,
    sourceClass: "application" | "external_diagnostic" = "application"
  ): OperatorEvidence => ({
    diagnosticsEndedAt: "2026-09-04T09:00:00.000Z",
    classifications: start.counters.map((item, index) => ({
      queryId: item.queryId,
      sourceClass: index === 1 ? sourceClass : "application",
      classificationEvidenceId: "operator-ack-1",
      purpose: PURPOSE,
      recordedAt: "2026-09-04T09:30:00.000Z",
    })),
  });
  const bytes = (value: unknown): Buffer => Buffer.from(canonicalJson(value));
  const consume = (
    start: PgStatSnapshot,
    receipt: PgStatIntervalReceipt,
    evidence: OperatorEvidence
  ): { digest: string; statsReset: string } =>
    consumePredecisionInterval(bytes(start), bytes(receipt), bytes(evidence));
  const refuses =
    (
      start: PgStatSnapshot,
      receipt: PgStatIntervalReceipt,
      evidence: OperatorEvidence
    ): (() => void) =>
    () =>
      consume(start, receipt, evidence);
  const fixture = (
    sourceClass: "application" | "external_diagnostic" = "application",
    bump = 0
  ) => {
    const start = startSnapshot();
    const evidence = evidenceFor(start, sourceClass);
    return {
      start,
      evidence,
      receipt: buildIntervalReceipt({ start, end: endSnapshot(start, bump), evidence }),
    };
  };
  test("a clean application-only interval is consumed, and its digest is stable, bound and different for a different interval", () => {
    const { start, receipt, evidence } = fixture();
    const consumed = consume(start, receipt, evidence);
    expect(consumed.statsReset, "the echoed reset stamp is the interval identity's own").toBe(
      identity.statsReset
    );
    expect(consumed.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(
      consume(start, receipt, evidence).digest,
      "the same interval recomputes the same digest"
    ).toBe(consumed.digest);
    const moved = fixture("application", 9);
    expect(
      consume(moved.start, moved.receipt, moved.evidence).digest,
      "a different interval yields a different digest"
    ).not.toBe(consumed.digest);
    const driftedStart = startSnapshot("2026-09-04T10:01:00.000Z");
    const drifted = buildIntervalReceipt({
      start: driftedStart,
      end: endSnapshot(driftedStart),
      evidence: evidenceFor(driftedStart),
    });
    expect(
      consume(driftedStart, drifted, evidenceFor(driftedStart)).digest,
      "so the digest cannot be replayed across intervals"
    ).not.toBe(consumed.digest);
  });
  test("every non-clean, foreign or mis-bound interval refuses before any read-index candidate is frozen", () => {
    const { start, receipt, evidence } = fixture();
    const driftedStart = startSnapshot("2026-09-04T10:01:00.000Z");
    const foreign = buildIntervalReceipt({
      start: driftedStart,
      end: endSnapshot(driftedStart),
      evidence: evidenceFor(driftedStart),
    });
    const diagnostic = fixture("external_diagnostic");
    expect(
      refuses({ ...start, boundary: "end" }, receipt, evidence),
      "a non-start boundary is not this interval's start"
    ).toThrow(codes.preflightFailed);
    expect(
      refuses(start, receipt, { ...evidence, diagnosticsEndedAt: "2026-09-04T11:00:00.000Z" }),
      "an interval that started inside the diagnostics refuses"
    ).toThrow(codes.preflightFailed);
    expect(
      () => consumePredecisionInterval(bytes(start), Buffer.from("{ not json"), bytes(evidence)),
      "a non-JSON interval receipt refuses"
    ).toThrow(codes.preflightFailed);
    expect(
      refuses(start, { ...receipt, extra: 1 } as unknown as PgStatIntervalReceipt, evidence),
      "a foreign receipt key set refuses"
    ).toThrow(codes.preflightFailed);
    expect(
      refuses(start, foreign, evidence),
      "a receipt bound to another start snapshot refuses"
    ).toThrow(codes.preflightFailed);
    expect(
      refuses(start, { ...receipt, statsReset: "2026-09-02T06:00:00.000Z" }, evidence),
      "a stats reset inside the interval refuses"
    ).toThrow(codes.preflightFailed);
    expect(
      refuses(start, { ...receipt, serverIdentitySha256: sha256Hex("another server") }, evidence),
      "a server identity change inside the interval refuses"
    ).toThrow(codes.preflightFailed);
    expect(
      refuses(start, { ...receipt, cleanAfterDiagnostics: false }, evidence),
      "a polluted interval refuses"
    ).toThrow(codes.preflightFailed);
    expect(
      refuses(
        start,
        {
          ...receipt,
          deltas: receipt.deltas.map((delta) => ({ ...delta, callsDelta: delta.callsDelta + 1 })),
        },
        evidence
      ),
      "tampered deltas do not recompute"
    ).toThrow(codes.preflightFailed);
    expect(
      refuses(diagnostic.start, diagnostic.receipt, diagnostic.evidence),
      "a diagnostic-driven candidate refuses, excluded query ids with it"
    ).toThrow(codes.preflightFailed);
  });
  test("phase 1 consumes the interval before the preflight digest is bound and before any group can freeze a candidate", () => {
    pinRunner([
      [
        'const PREDECISION_INTERVAL_NAME = "task551-predecision-clean";',
        "exactly L02's closed interval name is consumed",
      ],
      [
        "export function consumePredecisionInterval(startBytes: Buffer, receiptBytes: Buffer, evidenceBytes: Buffer): { digest: string; statsReset: string } {",
        "the byte-bound form is the sealed entry point",
      ],
      [
        'const start = decodeSnapshot(startBytes); if (start.name !== PREDECISION_INTERVAL_NAME || start.boundary !== "start") refuse("the start snapshot is not this interval\'s start boundary");',
        "the start bytes are decoded by L02's own strict decoder and must be this interval's start",
      ],
      [
        'if (new Date(start.capturedAt) <= new Date(evidence.diagnosticsEndedAt)) refuse("the interval started before the operator\'s diagnostics ended");',
        "the interval must postdate the operator's diagnostics",
      ],
      [
        'if (receipt === null || typeof receipt !== "object" || Object.keys(receipt).sort().join(",") !== INTERVAL_RECEIPT_KEYS.join(",")) refuse("the interval receipt carries a foreign key set");',
        "the collector's closed key set is enforced",
      ],
      [
        '(receipt.start as { snapshotSha256?: unknown }).snapshotSha256 !== sha256Hex(canonicalJson(start))) refuse("the receipt is not bound to this start snapshot");',
        "the receipt is byte-bound to the start snapshot",
      ],
      [
        'refuse("the counters were reset or the identity changed inside the interval");',
        "a reset or identity drift inside the interval refuses",
      ],
      [
        'if (receipt.cleanAfterDiagnostics !== true) refuse("the interval is not clean after diagnostics");',
        "a polluted interval refuses",
      ],
      [
        'refuse("the receipt does not recompute from its own start snapshot");',
        "the receipt is recomputed through L02's own buildIntervalReceipt, never trusted",
      ],
      [
        'refuse("the interval carries a diagnostic or unknown-driven candidate");',
        "only application-driven candidates may pass",
      ],
      [
        "const predecision = consumePredecisionIntervalFiles(); const evidence = await measurePreflightEvidence(session, artifacts.touchedTables);",
        "phase 1 consumes the interval before measuring the preflight evidence",
      ],
      [
        "predecisionSha256: predecision.digest, ...evidence }),",
        "the interval digest is bound into the canonical preflight digest",
      ],
      [
        'await step("resolved", { state: "preflight_passed", preflight });}',
        "the candidates freeze only at the preflight_passed transition",
      ],
    ]);
    const source = runnerSource();
    expect(
      source.indexOf("const predecision = consumePredecisionIntervalFiles()"),
      "the interval is consumed before the revision group can freeze its first candidate"
    ).toBeLessThan(source.indexOf('if (receipt.state === "revision_integrity_building")'));
  });
});
describe("task551 online index deployment: quiescence and visibility", () => {
  test("the drain window and the two role-named probes are proven, closed-world and role-scoped, before anything is trusted", () => {
    pinRunner([
      ["probeIntervalMs: 250,", "the sample interval is 250ms"],
      [
        "quiescenceWindowMs: 5_000, quiescenceDeadlineMs: 120_000,",
        "a continuous 5s window inside a 120s deadline",
      ],
      [
        "where pid <> pg_backend_pid() and backend_type = 'client backend' and datname = current_database() and usename = current_user",
        "the sample is closed-world AND role-scoped: only another session of the same database and application role is an intruder",
      ],
      [
        "if (intruders.length > 0) { quietSince = null; if (Date.now() > deadline) fail(TASK551_ORCHESTRATOR_ERROR_CODES.quiescenceFailed",
        "an intruder resets the window and the deadline fails closed",
      ],
      [
        "if (Date.now() - quietSince >= BUDGETS.quiescenceWindowMs) return new Date(quietSince).toISOString();",
        "only a full quiet window authorizes the next phase",
      ],
      [
        "const quiescentFrom = await proveQuiescence(session, target, true);",
        "the drain window is proven before the transactional phase",
      ],
      [
        "await proveQuiescence(session, target, offline);",
        "offline-single proves the same quiescence before phase 2",
      ],
      [
        "async function assertQuietCompletion(session: ReservedSession, offline: boolean): Promise<void> {",
        "the completion-time recheck is one named gate",
      ],
      [
        "if (!offline) return;",
        "external mode, whose adapter owns the drain, needs no completion recheck",
      ],
      [
        "const intruders = await sampleRoleSessions(session);",
        "the completion recheck re-reads the same role-scoped sample",
      ],
      [
        '`an application session appeared before command completion: ${intruders.slice(0, 8).join(" | ")}`',
        "no app/worker/maintenance session may appear before command completion in offline-single",
      ],
      [
        "await assertQuietCompletion(session, offline);",
        "every forward rollout re-proves quiescence at command completion",
      ],
      [
        'const VISIBILITY_PROBES: readonly (readonly ["runtime" | "worker", string])[] = [["runtime", "rollout-probe-runtime"], ["worker", "rollout-probe-worker"]];',
        "exactly one runtime and one worker probe",
      ],
      [
        'if (row === undefined || row[1] === "" || row[1] !== identity || row[2] !== name) fail(code, `${name} is not visible under the application role`);',
        "redacted, foreign-role or missing identity is never an empty result",
      ],
      [
        "if (observed.has(row[0])) fail(code, `${name} does not hold a distinct backend`);",
        "both probes must hold distinct backends",
      ],
      [
        'if (observed.size !== VISIBILITY_PROBES.length) fail(code, "the probes did not yield distinct backends");',
        "the probe set is complete",
      ],
      [
        "if ((await values<[string]>(session`select pid from pg_stat_activity where application_name = ${name}`)).length > 0) fail(code, `${name} survived the probe release`);",
        "both probes must be gone after they close",
      ],
      [
        "fail(code, error instanceof Error ? error.message : String(error));",
        "any visibility failure is the contracted refusal",
      ],
    ]);
    expect(
      buildDatabaseApplicationName("runtime", "probe"),
      "probe names come from the same L02 identity builder"
    ).toBe("coderso:runtime:probe");
    expect(buildDatabaseApplicationName("worker", "probe")).toBe("coderso:worker:probe");
    expect(buildDatabaseApplicationName("maintenance", "probe")).toBe("coderso:maintenance:probe");
  });
});
describe("task551 online index deployment: receipt CAS, mirror and pre-transaction gating", () => {
  test("one compare-and-set transition binds the whole successor, and pre-transaction states persist to the mirror alone", () => {
    const resolved = minimalReceipt("resolved");
    const preflight = casReceipt(resolved, "resolved", { state: "preflight_passed" });
    expect([preflight.generation, preflight.state, preflight.previousStateSha256]).toEqual([
      resolved.generation + 1,
      "preflight_passed",
      resolved.stateSha256,
    ]);
    // The new digest is recomputed over the canonical successor body — the exact object the runner builds.
    expect(preflight.stateSha256).toBe(
      sha256Hex(
        canonicalJson({
          ...resolved,
          state: "preflight_passed",
          generation: resolved.generation + 1,
          previousStateSha256: resolved.stateSha256,
        })
      )
    );
    expect(
      runnerSource().includes(
        "return { ...successor, stateSha256: sha256Hex(canonicalJson(successor)) };"
      )
    ).toBe(true);
    // The expectation is the CAS: an already-advanced receipt cannot be advanced again; `null` is the member-progress form.
    expect(() => casReceipt(preflight, "resolved", { state: "drain_requested" })).toThrow(
      codes.receiptConflict
    );
    expect(
      casReceipt(preflight, null, { finalCatalogReady: false }).state,
      "a null expectation is the member-progress form"
    ).toBe("preflight_passed");
    pinRunner([
      [
        "const PRE_TRANSACTION_STATES: readonly ReceiptState[] =",
        "the pre-transaction states are a closed list",
      ],
      [
        '["resolved", "preflight_passed", "drain_requested", "drain_confirmed", "transaction_apply_pending", "reverse_complete"]',
        "mirror-only states cover everything before phase 4 and after reverse",
      ],
      [
        "persistRow = !PRE_TRANSACTION_STATES.includes(current.state)",
        "row persistence is derived from the state, never from a guess",
      ],
      [
        'const TERMINAL_FORWARD_STATES: readonly ReceiptState[] = ["forward_ready", "operator_resume_authorized"];',
        "the terminal rerun verifies and transitions nothing",
      ],
      [
        'if (receipt.admission.mode !== (spec.admissionMode ?? "external")) fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict, "the receipt was seeded under a different admission mode");',
        "a mirror cannot be replayed under another admission mode",
      ],
    ]);
  });
  test("the mirror is strict 0600 canonical JSON and the reader refuses a foreign shape", () => {
    const target = mkdtempSync(path.join(tmpdir(), "task551-deployment-"));
    const receiptPath = path.join(target, "nested", "receipt.json");
    try {
      const receipt = minimalReceipt("resolved", { finalCatalogReady: false });
      writeReceiptMirror(receiptPath, receipt);
      expect(readFileSync(receiptPath, "utf8")).toBe(`${canonicalJson(receipt)}\n`);
      expect(statSync(receiptPath).mode & 0o777, "the mirror is written 0600").toBe(0o600);
      expect(readReceiptMirror(receiptPath)).toEqual(receipt);
      expect(readReceiptMirror(path.join(target, "absent.json"))).toBeNull();
      expect(
        () =>
          writeReceiptMirror(
            path.join(target, "big.json"),
            minimalReceipt("resolved", {
              padding: "x".repeat(TASK551_MIGRATION_RECEIPT_MAX_BYTES + 1),
            })
          ),
        "an oversize mirror refuses"
      ).toThrow(codes.receiptInvalid);
      // A mirror that a foreign process rewrote is refused on read, per broken invariant, instead of being adopted.
      for (const [label, broken] of [
        ["a downgraded version", minimalReceipt("resolved", { version: 1 })],
        ["a foreign task id", minimalReceipt("resolved", { taskId: "TASK-552" })],
        ["an unknown direction", minimalReceipt("resolved", { direction: "sideways" })],
        ["a non-digest state hash", minimalReceipt("resolved", { stateSha256: "not-a-digest" })],
      ] as const) {
        const brokenPath = path.join(target, `broken-${label.replace(/\W+/g, "-")}.json`);
        writeFileSync(brokenPath, `${JSON.stringify(broken)}\n`, { mode: 0o600 });
        expect(() => readReceiptMirror(brokenPath), label).toThrow(codes.receiptInvalid);
      }
      writeFileSync(path.join(target, "truncated.json"), "{ not json", { mode: 0o600 });
      expect(() => readReceiptMirror(path.join(target, "truncated.json"))).toThrow();
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
describe("task551 online index deployment: offline-single, reverse window and artifact reversal", () => {
  const artifacts = resolveTask551Artifacts(manifestSha256);
  const NONCE = "A".repeat(43);
  test("offline-single is the cold single-runtime path, the reverse window is nonce-bound, and every resume re-applies the frozen budgets", () => {
    pinRunner([
      [
        'const OFFLINE_SINGLE_ACK = "all-coderso-processes-stopped";',
        "the exact environment acknowledgement literal",
      ],
      [
        "if (env.TASK551_OFFLINE_SINGLE_ACK !== OFFLINE_SINGLE_ACK) fail(TASK551_ORCHESTRATOR_ERROR_CODES.offlineSingleDenied",
        "a missing or foreign ack refuses",
      ],
      [
        "if (fleet.runtimeProcessCount !== 1 || fleet.workerProcessCount !== 0) fail(TASK551_ORCHESTRATOR_ERROR_CODES.offlineSingleDenied",
        "exactly one runtime and zero workers",
      ],
      [
        'if (await relationExists(session, RECEIPT_TABLE)) fail(TASK551_ORCHESTRATOR_ERROR_CODES.offlineSingleDenied, "the receipt table exists, so this is not a cold upgrade");',
        "offline-single is a cold upgrade only",
      ],
      ["adapterSha256: null", "offline-single pins no adapter"],
      [
        'const offline = spec.admissionMode === "offline-single";',
        "the mode is read from the argv, never inferred",
      ],
      [
        'const REVERSE_START_STATES: readonly ReceiptState[] = ["transaction_applied", "revision_integrity_building", "revision_integrity_ready", "resume_authorized", "read_performance_building", "forward_ready", "operator_resume_authorized"];',
        "the reverse window is a closed list of the post-commit, pre-cutover states",
      ],
      [
        'const REVERSE_CONTINUATION_STATES: readonly ReceiptState[] = [...REVERSE_START_STATES, "reverse_drain_requested", "reverse_drain_confirmed", "reverse_indexes_building", "reverse_transaction_pending"];',
        "a reverse continues through its own four states",
      ],
      [
        'if (receipt.admission.newBinaryTrafficAccepted) fail(TASK551_ORCHESTRATOR_ERROR_CODES.reverseForbidden, "compatible-binary traffic was already admitted");',
        "the flag gate refuses before the window gate: reverse is forward-fix only after the cutover",
      ],
      [
        'if (env.TASK551_REVERSE_AUTHORIZATION !== reverseAuthorizationSha256(receipt)) fail(TASK551_ORCHESTRATOR_ERROR_CODES.reverseForbidden, "the nonce-bound reverse authorization is absent or foreign");',
        "a replayed or foreign authorization cannot drive a reverse",
      ],
      [
        "if (!REVERSE_CONTINUATION_STATES.includes(receipt.state)) fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict, `a ${receipt.state} receipt has no reverse continuation; forward owns it`);",
        "reverse refuses every mirror outside the contracted window",
      ],
      [
        "if (!REVERSE_START_STATES.includes(receipt.state)) {",
        "a resume landing past the start branch is a reverse continuation of its own",
      ],
      [
        "if (REVERSE_START_STATES.includes(receipt.state)) { await setSessionBudgets(session, receipt.preflight);",
        "and the entering branch re-applies them verbatim too, never recomputing a ceiling",
      ],
      [
        'await step(null, { state: "reverse_drain_requested", direction: "reverse", reverseMembers: reverseMemberSeed() });}',
        "the entering transition seeds the full ordered member list",
      ],
    ]);
    expect(
      runnerStateList("REVERSE_CONTINUATION_STATES"),
      "the cutover state is never reverse-admissible"
    ).not.toContain("resume_completed");
    expect(runnerStateList("REVERSE_START_STATES")).toEqual([
      "transaction_applied",
      "revision_integrity_building",
      "revision_integrity_ready",
      "resume_authorized",
      "read_performance_building",
      "forward_ready",
      "operator_resume_authorized",
    ]);
    // Every non-start continuation — reverse_transaction_pending included — takes the budget re-apply branch, so no reverse resume runs on recomputed budgets.
    for (const state of [
      "reverse_drain_requested",
      "reverse_drain_confirmed",
      "reverse_indexes_building",
      "reverse_transaction_pending",
    ])
      expect(
        runnerStateList("REVERSE_START_STATES"),
        `${state} re-applies the frozen budgets`
      ).not.toContain(state);
    // The reverse authorization is bound to this operation's id and drain nonce: neither a foreign operation nor a replayed nonce can produce the same digest.
    const receipt = minimalReceipt("drain_confirmed", { admission: { drainNonce: NONCE } });
    const expected = reverseAuthorizationSha256(receipt);
    expect(expected).toBe(
      sha256Hex(
        canonicalJson({
          operationId: receipt.operationId,
          nonce: receipt.admission.drainNonce,
          direction: "reverse",
        })
      )
    );
    expect(
      reverseAuthorizationSha256(
        minimalReceipt("drain_confirmed", {
          operationId: "22222222-2222-3333-4444-555555555555",
          admission: { drainNonce: NONCE },
        })
      )
    ).not.toBe(expected);
    expect(
      reverseAuthorizationSha256(
        minimalReceipt("drain_confirmed", { admission: { drainNonce: "B".repeat(43) } })
      )
    ).not.toBe(expected);
  });
  test("the reversal is derived from the artifact, includes the receipt table, and never the exclusion seam", () => {
    const targets = transactionalReverseTargets(artifacts.transactionalStatements);
    expect(targets, "the artifact's own objects are all derived").toHaveLength(40);
    expect(
      targets.some(
        (target) => target.kind === "table" && target.name === "task551_migration_operations"
      ),
      "the receipt table is reversed with the artifact"
    ).toBe(true);
    expect(
      targets.some((target) => target.name === TASK551_EXCLUSION_CONSTRAINT_NAME),
      "the exclusion seam is reversed only through its descriptor dropSql"
    ).toBe(false);
    expect(
      new Set(targets.map((target) => `${target.kind}:${target.table}:${target.name}`)).size,
      "no target repeats"
    ).toBe(targets.length);
    for (const target of targets) {
      expect(["constraint", "column", "table"]).toContain(target.kind);
      expect(artifacts.touchedTables, `${target.table} is a measured table`).toContain(
        target.table
      );
    }
    // An artifact that no longer creates the receipt table cannot be reversed safely.
    const stripped = artifacts.transactionalStatements.filter(
      (statement) => !statement.includes('CREATE TABLE "task551_migration_operations"')
    );
    expect(stripped).toHaveLength(artifacts.transactionalStatements.length - 1);
    expect(() => transactionalReverseTargets(stripped)).toThrow(codes.artifactDigestChanged);
    expect(
      runnerBetween("async function rolloutReverse", "async function writeStatus").includes(
        "for (const member of [...TASK551_ONLINE_INDEX_MEMBERS].reverse())"
      ),
      "online members are dropped in recorded reverse order"
    ).toBe(true);
    expect(
      [...runnerSource().matchAll(/await session\.unsafe\(member\.createSql\);/g)].length,
      "the manifest bytes are the executable build truth"
    ).toBe(1);
    pinRunner([
      [
        "if (await relationExists(session, RECEIPT_TABLE)) await reverseTransactionalArtifact(session, artifacts);",
        "the transactional reversal runs only while the receipt table still exists",
      ],
      [
        "where c.conname = ${TASK551_EXCLUSION_CONSTRAINT_NAME} and c.contype = 'x' and n.nspname = 'public'",
        "the seam probes are namespace-scoped: a same-named foreign-schema constraint can neither false-pass the forward proof nor false-fail the reverse",
      ],
      [
        "where c.contype = 'u' and n.nspname = 'public' and c.conname = any(",
        "so is the composite-unique probe — the seam proof counts public objects only",
      ],
      [
        'if (await relationExists(session, RECEIPT_TABLE)) fail(TASK551_ORCHESTRATOR_ERROR_CODES.catalogMismatch, "the receipt table survived the reverse");',
        "a surviving receipt table refuses instead of completing",
      ],
      [
        'RECEIPT_TABLE.split(".")[1])) {\n    fail(TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged, "the artifact no longer creates the receipt table, so a reverse could not remove it"); }',
        "a reverse without the receipt table is a refusal, never a partial cleanup",
      ],
      [
        "const order = { constraint: 0, column: 1, table: 2 } as const;",
        "constraints, then columns, then tables, in dependency-safe order",
      ],
      [
        "await session.unsafe(BOOKING_RESERVATION_EXCLUSION_SQL.dropSql);",
        "the exclusion is removed only through its descriptor dropSql",
      ],
      [
        "if ((await values<[string]>(session`select 1 from drizzle.__drizzle_migrations where hash = ${artifacts.transactionalSha256} limit 1`)).length > 0) await dropJournalRow(session, artifacts.transactionalSha256);",
        "the journal row is removed by its content hash when present",
      ],
      [
        "await verifyFinalCatalog(session, false);",
        "reverse proves the catalog empty before completing",
      ],
      [
        'await step("reverse_transaction_pending", { state: "reverse_complete", finalCatalogReady: false }, false);',
        "reverse_complete persists to the mirror alone",
      ],
      [
        'if (name === PRESERVED_MEMBER_SHAPE.name) fail(TASK551_ORCHESTRATOR_ERROR_CODES.reverseForbidden, "the preserved revision index is never dropped");',
        "the preserved member is never dropped",
      ],
      [
        'if (member.dropSql !== `DROP INDEX CONCURRENTLY IF EXISTS "${name}"`)',
        "a foreign dropSql refuses",
      ],
      [
        "if (await indexCatalogRow(session, name) !== null) fail(TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid, `${name} survived its concurrent drop`);",
        "a surviving index refuses its own drop completion",
      ],
      [
        "if (removed.length !== 1) fail(TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,",
        "exactly one journal row must match the transactional hash",
      ],
    ]);
    expect(runnerSource().includes("DROP EXTENSION"), "btree_gist is deliberately preserved").toBe(
      false
    );
  });
  test("the member lookup admits the plain index flavour, and a pre-existing member is still classified three ways", () => {
    const source = runnerSource();
    // Round 6: the fixed lookup is derived from the CURRENT bytes and evaluated, never enshrined as one stale rendering.
    const flavours = [...source.matchAll(/relkind in \('([^']+)', '([^']+)'\)/g)].map(
      (match) => [match[1], match[2]] as const
    );
    expect(
      flavours.length,
      "the member lookup and the final catalog scan use the same two-flavour form"
    ).toBe(2);
    const admits = (relkind: string): boolean =>
      flavours.some(([left, right]) => relkind === left || relkind === right);
    for (const [plain, partitioned] of flavours)
      expect([plain, partitioned], "both index flavours, plain first").toEqual(["i", "I"]);
    expect(admits("i"), "a plain btree member row resolves — all 89 members are plain").toBe(true);
    expect(admits("I"), "a partitioned index row still resolves").toBe(true);
    expect(admits("r"), "an ordinary table row is never mistaken for an index").toBe(false);
    expect(source.includes("relkind = 'I'"), "no partitioned-only equality pin survives").toBe(
      false
    );
    expect(source.includes("relkind = 'i'"), "no single-flavour equality pin survives either").toBe(
      false
    );
    expect(
      source.includes(
        "where c.relname = ${name} and n.nspname = 'public' and c.relkind in ('i', 'I')"
      ),
      "the member row is resolved by exact name, schema and both flavours"
    ).toBe(true);
    const body = runnerBetween("async function buildMember", "async function dropMember");
    expect(
      body.includes(
        "const member = manifestMember(name); const existing = await indexCatalogRow(session, name);"
      ),
      "the classification reads the live catalog row for the exact member name"
    ).toBe(true);
    pinRunner([
      [
        "const expected = canonicalIndexShape(member.createSql);",
        "the expected shape comes from the manifest bytes",
      ],
      [
        "if (canonicalJson(canonicalIndexShape(existing.definition)) !== canonicalJson(expected) || expected.name !== name) fail(TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid, `${name} is a foreign or wrongly shaped object and is never adopted or dropped`);",
        "a foreign or wrongly shaped object refuses instead of being adopted or dropped",
      ],
      [
        "if (existing.ready && existing.valid) return;",
        "a valid identical member skips without a rebuild",
      ],
      [
        'await session.unsafe(`drop index concurrently if exists "${name}"`);',
        "task-owned invalid residue drops concurrently first",
      ],
      [
        "if (await indexCatalogRow(session, name) !== null) fail(TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid, `${name} survived its invalid-residue drop`);",
        "the residue drop is proven before the rebuild",
      ],
      [
        "await session.unsafe(`set statement_timeout = '${BUDGETS.onlineMemberMs}'`);",
        "each member build runs under the 30-minute ceiling",
      ],
      [
        "await session.unsafe(member.createSql);",
        "the manifest bytes are the executable build truth",
      ],
      [
        "if (row === null || !row.valid || !row.ready) fail(TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid, `${name} is not valid and ready after its concurrent build`);",
        "indisready/indisvalid must both be true",
      ],
      [
        "assertMemberDefinition(row.definition, member.createSql, name);",
        "the built index is compared to the manifest bytes in canonical shape",
      ],
    ]);
    // The three ways are ordered, and the classification always precedes any destructive statement.
    const refuseAt = body.indexOf("is a foreign or wrongly shaped object");
    const skipAt = body.indexOf("if (existing.ready && existing.valid) return;");
    const dropAt = body.indexOf("drop index concurrently if exists");
    const buildAt = body.indexOf("await session.unsafe(member.createSql);");
    expect(
      [refuseAt, skipAt, dropAt, buildAt],
      "refuse, then skip, then rebuild — no drop precedes its classification"
    ).toEqual([...[refuseAt, skipAt, dropAt, buildAt]].sort((left, right) => left - right));
    expect(
      canonicalIndexShape(TASK551_ONLINE_INDEX_MEMBERS[0].createSql).name,
      "the residue branch is reachable only for a member the manifest owns"
    ).toBe("page_revisions_page_version_idx");
  });
});
describe("task551 online index deployment: the locked state machine shape", () => {
  const forwardBody = runnerBetween(
    "async function rolloutForward",
    "async function rolloutReverse"
  );
  const reverseBody = runnerBetween("async function rolloutReverse", "async function writeStatus");
  const dispatches = (body: string): string[] =>
    [...body.matchAll(/receipt\.state === "([a-z_]+)"/g)].map((match) => match[1]);
  test("every reverse continuation state owns a handler — the four-state loop is closed, with no silent state", () => {
    const reverseHandled = new Set(dispatches(reverseBody));
    // Round 6 un-enshrinement: `reverse_indexes_building` is handled by the shared ordered-drop branch, not exempted from it.
    for (const state of [
      "reverse_drain_requested",
      "reverse_drain_confirmed",
      "reverse_indexes_building",
      "reverse_transaction_pending",
    ])
      expect(reverseHandled.has(state), `${state} has a reverse handler`).toBe(true);
    expect(
      dispatches(forwardBody).filter((state) => state.startsWith("reverse_")),
      "the forward rollout never dispatches a reverse state"
    ).toEqual([]);
    expect(reverseHandled, "reverse dispatches nothing outside its own four states").toEqual(
      new Set([
        "reverse_drain_requested",
        "reverse_drain_confirmed",
        "reverse_indexes_building",
        "reverse_transaction_pending",
      ])
    );
    // Each handled state advances: the entering transition, the drain proof, the shared drop branch and the artifact reversal each step to a successor.
    expect(
      reverseBody.includes(
        'if (receipt.state === "reverse_drain_requested") { await proveQuiescence(session, target, true);'
      ),
      "the drain request is proven quiescent before confirmation"
    ).toBe(true);
    expect(
      reverseBody.includes(
        'if (receipt.state === "reverse_drain_confirmed") await step("reverse_drain_confirmed", { state: "reverse_indexes_building" });'
      ),
      "the drain confirmation enters the building state"
    ).toBe(true);
    expect(
      reverseBody.includes(
        'await step(null, { state: "reverse_transaction_pending", transaction: { apply: "reversed", catalogSha256: null } });}'
      ),
      "the drop branch terminates in reverse_transaction_pending"
    ).toBe(true);
    expect(
      reverseBody.includes(
        'await step("reverse_transaction_pending", { state: "reverse_complete", finalCatalogReady: false }, false);}'
      ),
      "and reverse_transaction_pending completes to the mirror-only terminal"
    ).toBe(true);
    // Every reverse continuation — reverse_transaction_pending included — re-applies the frozen budgets before its first statement.
    const continuationAt = reverseBody.indexOf(
      "if (!REVERSE_START_STATES.includes(receipt.state)) {"
    );
    const reapplyAt = reverseBody.indexOf(
      "await setSessionBudgets(session, receipt.preflight);}",
      continuationAt
    );
    expect(continuationAt, "the continuation budget branch exists").toBeGreaterThan(-1);
    expect(
      reapplyAt,
      "it re-applies the frozen budgets verbatim, never a recomputed ceiling"
    ).toBeGreaterThan(continuationAt);
    expect(
      reverseBody.indexOf("await proveQuiescence(session, target, true);"),
      "so a reverse resume never runs one statement on recomputed budgets"
    ).toBeGreaterThan(reapplyAt);
    // A state with no dispatch cannot be resumed by either rollout: the terminals and the pre-commit states stay inert.
    for (const inert of [
      "resolved",
      "operator_resume_authorized",
      "reverse_complete",
      "resume_completed",
    ])
      expect(
        dispatches(reverseBody).includes(inert) && dispatches(forwardBody).includes(inert),
        `${inert} is not resumable from both directions`
      ).toBe(false);
  });
  test("the runner's admitted receipt states are exactly the core closed state-literal set", () => {
    const literals: readonly string[] = TASK551_MIGRATION_STATE_LITERALS;
    // The in-transaction guard admits only these literals as `${state}`, so a state the runner steps to but that core does not name could never be persisted.
    for (const list of [
      "PRE_TRANSACTION_STATES",
      "TERMINAL_FORWARD_STATES",
      "FORWARD_RESUMABLE_STATES",
      "DDL_RECHECK_STATES",
      "REVERSE_START_STATES",
      "REVERSE_CONTINUATION_STATES",
    ])
      for (const state of runnerStateList(list))
        expect(literals, `${state} is a core state literal`).toContain(state);
    const admitted = new Set(
      [
        "PRE_TRANSACTION_STATES",
        "TERMINAL_FORWARD_STATES",
        "FORWARD_RESUMABLE_STATES",
        "REVERSE_CONTINUATION_STATES",
      ].flatMap((name) => [...runnerStateList(name)])
    );
    expect(
      [...admitted].sort(),
      "the union of the runner's closed lists is the whole core set, no more and no less"
    ).toEqual([...literals].sort());
  });
  test("both building loops CAS-persist progress around each concurrent statement, and the ordered drop loop reseeds exactly once", () => {
    pinRunner([
      [
        'if (memberState(receipt, name) !== "building") await step(null, { forwardMembers: memberReceipt(receipt, "forwardMembers", name, "building") });',
        "the drained group CAS-persists `building` before each build",
      ],
      [
        'if (memberState(receipt, member.name) !== "building") await step(null, { forwardMembers: memberReceipt(receipt, "forwardMembers", member.name, "building") });',
        "so does the read-performance loop",
      ],
      [
        'await buildMember(session, name); await step(null, { forwardMembers: memberReceipt(receipt, "forwardMembers", name, "ready") });}',
        "and `ready` after it",
      ],
      [
        'for (const name of TASK551_REVISION_INTEGRITY_MEMBERS) { if (memberState(receipt, name) === "ready") continue;',
        "a finished member is never rebuilt",
      ],
      [
        "if (receipt.reverseMembers.length !== TASK551_ONLINE_INDEX_MEMBERS.length) {",
        "a foreign or partial member list reseeds",
      ],
      [
        'await step(null, { state: "reverse_indexes_building", reverseMembers: reverseMemberSeed() });}',
        "the reseed is itself a persisted state, not a silent local variable",
      ],
      [
        "for (const member of [...TASK551_ONLINE_INDEX_MEMBERS].reverse()) {",
        "the drop loop walks the locked reverse order",
      ],
      [
        'if (reverseMemberState(receipt, member.name) === "dropped") continue; await dropMember(session, member.name);',
        "a member already recorded as dropped is never dropped twice",
      ],
      [
        'await step(null, { reverseMembers: memberReceipt(receipt, "reverseMembers", member.name, "dropped") }); }',
        "and each drop CAS-persists its own `dropped`",
      ],
      [
        'if (receipt.state === "reverse_drain_confirmed") await step("reverse_drain_confirmed", { state: "reverse_indexes_building" }); if (receipt.reverseMembers.length !== TASK551_ONLINE_INDEX_MEMBERS.length) {',
        "the entering transition is hoisted ahead of the loop, so a mid-group resume re-enters it without re-proving the drain",
      ],
      [
        "function reverseMemberSeed(): Task551OnlineIndexMemberReceipt[] { return TASK551_ONLINE_INDEX_MEMBERS.map(",
        "the seed is a closed synchronous function over the manifest order",
      ],
    ]);
    // The `building` CAS precedes its concurrent build in both loops, and the dropped CAS follows each drop — persistence order is the resume guarantee.
    for (const body of [forwardBody]) {
      for (const nameForm of ["name", "member.name"]) {
        const cas = body.indexOf(`memberState(receipt, ${nameForm}) !== "building"`);
        const build = body.indexOf(
          nameForm === "name"
            ? "await buildMember(session, name)"
            : "await buildMember(session, member.name)"
        );
        expect(cas, "the building CAS is present").toBeGreaterThan(-1);
        expect(build).toBeGreaterThan(cas);
      }
    }
    expect(
      reverseBody.indexOf('reverseMemberState(receipt, member.name) === "dropped"')
    ).toBeLessThan(reverseBody.indexOf("await dropMember(session, member.name)"));
    expect(reverseBody.indexOf("await dropMember(session, member.name)")).toBeLessThan(
      reverseBody.indexOf('memberReceipt(receipt, "reverseMembers", member.name, "dropped")')
    );
    expect(
      [...reverseBody.matchAll(/reverseMemberSeed\(\)/g)].length,
      "the seed appears in the entering transition and in the reseed guard only"
    ).toBe(2);
    expect(
      [...forwardBody.matchAll(/await buildMember\(session, /g)].length,
      "exactly two build sites, one per group"
    ).toBe(2);
    expect(
      [
        ...forwardBody.matchAll(
          /await step\(null, \{ forwardMembers: memberReceipt\(receipt, "forwardMembers", (?:member\.)?name, "ready"\) \}\);/g
        ),
      ].length,
      "each build site CAS-persists ready"
    ).toBe(2);
  });
});
