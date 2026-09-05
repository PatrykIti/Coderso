import canonicalize from "canonicalize";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

import {
  getTask551FixtureBootstrapToolContractDigest,
  getTask551FixtureBootstrapToolContractIdentity,
  task551FixtureBootstrapCliAdapterTestSeam,
  type Task551FixtureBootstrapClient,
  type Task551FixtureBootstrapCliProcessEnvironment,
  type Task551FixtureBootstrapCurrentDatabaseProof,
  type Task551FixtureBootstrapDeps,
  type Task551FixtureBootstrapEnvironment,
  type Task551FixtureBootstrapMarkerProof,
  type Task551FixtureBootstrapMarkerProofInput,
  type Task551FixtureBootstrapOutput,
  type Task551FixtureBootstrapReadOnlyTransaction,
  type Task551FixtureBootstrapReadWriteTransaction,
} from "../../scripts/task-551-fixture-target-bootstrap";

const INVALID = "fixture_bootstrap_invalid";
const FIXTURE_URL = "postgres://fixture-user@fixture-host/coderso02?sslmode=require";
const SENTINEL = "s".repeat(32);
const VALID_PROOF: Task551FixtureBootstrapMarkerProof = Object.freeze({
  exactRelationShapeMatched: true,
  tableRowCount: 1,
  markerCount: 1,
  boundSentinelByteMatched: true,
});
const EMPTY_PROOF: Task551FixtureBootstrapMarkerProof = Object.freeze({
  exactRelationShapeMatched: true,
  tableRowCount: 0,
  markerCount: 0,
  boundSentinelByteMatched: false,
});
const DUPLICATE_PROOF: Task551FixtureBootstrapMarkerProof = Object.freeze({
  exactRelationShapeMatched: true,
  tableRowCount: 2,
  markerCount: 2,
  boundSentinelByteMatched: true,
});

type FailurePoint =
  | "connect"
  | "read-only-read"
  | "read-only-rollback"
  | "read-write-read"
  | "insert"
  | "commit"
  | "read-write-rollback"
  | "close";
type HarnessOptions = Readonly<{
  currentDatabaseMatched?: boolean | "truthy";
  readOnlyProof?: Task551FixtureBootstrapMarkerProof;
  readWriteProofs?: readonly Task551FixtureBootstrapMarkerProof[];
  failAt?: FailurePoint | readonly FailurePoint[];
}>;
type Harness = Readonly<{
  deps: Task551FixtureBootstrapDeps;
  events: string[];
  connections: string[];
  markerInputs: Task551FixtureBootstrapMarkerProofInput[];
  insertInputs: { marker: "task551-baseline-v1"; expectedSentinel: string }[];
  closeCount: () => number;
}>;
type CapturedOutput = Readonly<{ chunks: string[]; output: Task551FixtureBootstrapOutput }>;
type BootstrapConstructionCalls = {
  driverLoaderCalls: number;
  factoryCalls: number;
  clientCalls: number;
  connectCalls: number;
};

function fixtureEnvironment(
  overrides: Readonly<Record<string, string | undefined>> = {}
): Task551FixtureBootstrapEnvironment {
  return Object.freeze({
    TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL: FIXTURE_URL,
    TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME: "coderso02",
    TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION: "INITIALIZE_TASK551_FIXTURE_TARGET",
    TASK551_FIXTURE_BOOTSTRAP_SENTINEL: SENTINEL,
    ...overrides,
  });
}

function captureOutput(): CapturedOutput {
  const chunks: string[] = [];
  return Object.freeze({
    chunks,
    output: Object.freeze({ write: (chunk: string) => chunks.push(chunk) }),
  });
}

function createHarness(options: HarnessOptions = {}): Harness {
  const events: string[] = [];
  const connections: string[] = [];
  const markerInputs: Task551FixtureBootstrapMarkerProofInput[] = [];
  const insertInputs: { marker: "task551-baseline-v1"; expectedSentinel: string }[] = [];
  let closeCount = 0;
  let readWriteIndex = 0;
  const failurePoints = new Set<FailurePoint>(
    options.failAt === undefined
      ? []
      : Array.isArray(options.failAt)
        ? options.failAt
        : [options.failAt]
  );
  const fail = (point: FailurePoint): void => {
    if (failurePoints.has(point)) throw new Error(`fake:${point}`);
  };
  const readOnlyTransaction: Task551FixtureBootstrapReadOnlyTransaction = Object.freeze({
    mode: "read-only" as const,
    readExactSentinelTableAndMarker: async (input: Task551FixtureBootstrapMarkerProofInput) => {
      events.push("read-only-read");
      markerInputs.push(input);
      fail("read-only-read");
      return options.readOnlyProof ?? VALID_PROOF;
    },
    rollback: async () => {
      events.push("read-only-rollback");
      fail("read-only-rollback");
    },
  });
  const readWriteTransaction: Task551FixtureBootstrapReadWriteTransaction = Object.freeze({
    mode: "read-write" as const,
    createExactSentinelTableIfAbsent: async (): Promise<void> => {
      events.push("ddl");
    },
    readExactSentinelTableAndMarker: async (input: Task551FixtureBootstrapMarkerProofInput) => {
      events.push("read-write-read");
      markerInputs.push(input);
      fail("read-write-read");
      const proof = options.readWriteProofs?.[readWriteIndex] ?? VALID_PROOF;
      readWriteIndex += 1;
      return proof;
    },
    insertCanonicalMarker: async (input) => {
      events.push("insert");
      insertInputs.push(input);
      fail("insert");
    },
    commit: async () => {
      events.push("commit");
      fail("commit");
    },
    rollback: async () => {
      events.push("read-write-rollback");
      fail("read-write-rollback");
    },
  });
  const client: Task551FixtureBootstrapClient = Object.freeze({
    proveExpectedDatabase: async (name: "coderso02") => {
      events.push(`proof:${name}`);
      const proof = {
        currentDatabaseMatched: options.currentDatabaseMatched ?? true,
      } as Task551FixtureBootstrapCurrentDatabaseProof;
      if (options.currentDatabaseMatched === "truthy") {
        Object.defineProperty(proof, "currentDatabaseMatched", {
          configurable: false,
          enumerable: true,
          value: "truthy",
          writable: false,
        });
      }
      return Object.freeze(proof);
    },
    beginReadOnlyTransaction: async () => {
      events.push("begin-read-only");
      return readOnlyTransaction;
    },
    beginReadWriteTransaction: async () => {
      events.push("begin-read-write");
      return readWriteTransaction;
    },
    close: async () => {
      closeCount += 1;
      events.push("close");
      fail("close");
    },
  });
  return Object.freeze({
    deps: Object.freeze({
      connect: async (databaseUrl: string) => {
        events.push("connect");
        connections.push(databaseUrl);
        fail("connect");
        return client;
      },
    }),
    events,
    connections,
    markerInputs,
    insertInputs,
    closeCount: () => closeCount,
  });
}

async function execute(
  argv: readonly string[],
  environment: Task551FixtureBootstrapEnvironment,
  harness: Harness = createHarness()
): Promise<
  Readonly<{
    result: Awaited<ReturnType<typeof task551FixtureBootstrapCliAdapterTestSeam.run>>;
    stdout: string[];
    stderr: string[];
    harness: Harness;
  }>
> {
  const stdout = captureOutput();
  const stderr = captureOutput();
  const result = await task551FixtureBootstrapCliAdapterTestSeam.run(
    argv,
    environment,
    () => harness.deps,
    stdout.output,
    stderr.output
  );
  return Object.freeze({ result, stdout: stdout.chunks, stderr: stderr.chunks, harness });
}

async function expectInvalidBeforeConnect(
  argv: readonly string[],
  environment: Task551FixtureBootstrapEnvironment
): Promise<void> {
  const execution = await execute(argv, environment);
  expect(execution.result).toEqual({ ok: false, code: INVALID });
  expect(execution.stdout).toEqual([]);
  expect(execution.stderr).toEqual([`${INVALID}\n`]);
  expect(execution.harness.connections).toEqual([]);
  expect(execution.harness.events).toEqual([]);
}

function createPoisonDependencyFactory(
  calls: BootstrapConstructionCalls
): () => Task551FixtureBootstrapDeps {
  return () => {
    calls.factoryCalls += 1;
    return Object.freeze({
      connect: async (_databaseUrl: string) => {
        calls.connectCalls += 1;
        calls.driverLoaderCalls += 1;
        calls.clientCalls += 1;
        throw new Error("construction-poison");
      },
    });
  };
}

async function expectInvalidBeforeConstruction(
  argv: readonly string[],
  environment: Task551FixtureBootstrapCliProcessEnvironment
): Promise<BootstrapConstructionCalls> {
  const calls: BootstrapConstructionCalls = {
    driverLoaderCalls: 0,
    factoryCalls: 0,
    clientCalls: 0,
    connectCalls: 0,
  };
  const stdout = captureOutput();
  const stderr = captureOutput();
  const result = await task551FixtureBootstrapCliAdapterTestSeam.run(
    argv,
    environment,
    createPoisonDependencyFactory(calls),
    stdout.output,
    stderr.output
  );
  expect(result).toEqual({ ok: false, code: INVALID });
  expect(calls).toEqual({
    driverLoaderCalls: 0,
    factoryCalls: 0,
    clientCalls: 0,
    connectCalls: 0,
  });
  expect(stdout.chunks).toEqual([]);
  expect(stderr.chunks).toEqual([`${INVALID}\n`]);
  return calls;
}

function urlWithByteLength(size: number): string {
  const prefix = "postgres://fixture-user:";
  const suffix = "@fixture-host/coderso02?sslmode=require";
  return `${prefix}${"p".repeat(size - Buffer.byteLength(prefix, "utf8") - Buffer.byteLength(suffix, "utf8"))}${suffix}`;
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/gu, " ").trim();
}

function splitTopLevelSqlExpressions(sql: string): readonly string[] {
  const expressions: string[] = [];
  let depth = 0;
  let inStringLiteral = false;
  let start = 0;
  for (let index = 0; index <= sql.length; index += 1) {
    const character = sql[index];
    if (character === "'") {
      if (inStringLiteral && sql[index + 1] === "'") index += 1;
      else inStringLiteral = !inStringLiteral;
      continue;
    }
    if (inStringLiteral) continue;
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (depth === 0 && (character === "," || index === sql.length)) {
      expressions.push(sql.slice(start, index).trim());
      start = index + 1;
    }
  }
  return expressions;
}

describe("TASK-551 L03 fixture target bootstrap", () => {
  test("exports a pure, independently canonicalized tool identity and digest", () => {
    const identity = getTask551FixtureBootstrapToolContractIdentity();
    const canonical = canonicalize(identity);
    expect(typeof canonical).toBe("string");
    const expected = `sha256:${createHash("sha256").update(canonical!, "utf8").digest("hex")}`;
    expect(identity).toEqual({
      schema: "coderso.task551.fixture-bootstrap-tool-contract@v1",
      taskId: "TASK-551-01-L03",
      checkRecordSchema: "coderso.task551.fixture-bootstrap-check@v1",
      checkMode: "check",
      checkMarkerCount: 1,
      checkTargetProof: "current-database-and-single-marker",
      checkNoLeak: true,
    });
    expect(Object.isFrozen(identity)).toBe(true);
    expect(getTask551FixtureBootstrapToolContractDigest()).toBe(expected);
    expect(getTask551FixtureBootstrapToolContractDigest()).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("keeps the production adapter private and lazy through the run-only seam", () => {
    const source = readFileSync(
      new URL("../../scripts/task-551-fixture-target-bootstrap.ts", import.meta.url),
      "utf8"
    );
    const count = (fragment: string): number => source.split(fragment).length - 1;
    const configIndex = source.indexOf("const config = parseBootstrapConfig(env);");
    const connectIndex = source.indexOf("client = await deps.connect(config.databaseUrl);");
    const catalogProof = source.match(
      /const READ_EXACT_SENTINEL_TABLE_AND_MARKER_SQL = `([\s\S]*?)`;/u
    )?.[1];

    expect(Object.keys(task551FixtureBootstrapCliAdapterTestSeam)).toEqual(["run"]);
    expect(source.match(/^export (?:const|function) [A-Za-z0-9_]+/gmu)).toEqual([
      "export function getTask551FixtureBootstrapToolContractIdentity",
      "export function getTask551FixtureBootstrapToolContractDigest",
      "export const task551FixtureBootstrapCliAdapterTestSeam",
    ]);
    expect(source).not.toMatch(
      /\bexport\s+(?:(?:type|interface)\s+Postgres[A-Za-z0-9_]*\b|type\s*\{[^}]*\bPostgres[A-Za-z0-9_]*\b[^}]*\}|\{[^}]*\b(?:type\s+)?Postgres[A-Za-z0-9_]*\b[^}]*\})/u
    );
    expect(source.match(/\bprocess\.[A-Za-z0-9_]+/gu)).toEqual([
      "process.argv",
      "process.env",
      "process.stdout",
      "process.stderr",
      "process.exitCode",
    ]);
    expect(source).toMatch(
      /if \(import\.meta\.main\) \{\s+const result = await runCliEntryFromL11ChildProcess\(\s+process\.argv\.slice\(2\),\s+process\.env,\s+createCliBootstrapDepsWithoutConnecting,\s+process\.stdout,\s+process\.stderr\s+\);\s+process\.exitCode = result\.ok \? 0 : 1;\s+\}/u
    );
    expect(source).not.toContain("createPostgresClientForTest");
    expect(source).toContain("function createTask551PostgresBootstrapClient(");
    expect(source).not.toMatch(/\bexport\b[^\n]*\bcreateTask551PostgresBootstrapClient\b/u);
    expect(source).toContain(
      "const pool = createPostgresClient(databaseUrl, TASK551_BOOTSTRAP_POSTGRES_OPTIONS);"
    );
    expect(count('await import("postgres")')).toBe(1);
    expect(source).toMatch(
      /function createCliBootstrapDepsWithoutConnecting\(\): Task551FixtureBootstrapDeps \{\s+return Object\.freeze\(\{\s+connect: async \(databaseUrl\) =>\s+createTask551PostgresBootstrapClient\(databaseUrl, await loadPostgresFactory\(\)\),\s+\}\);\s+\}/u
    );
    expect(configIndex).toBeGreaterThan(-1);
    expect(connectIndex).toBeGreaterThan(configIndex);
    expect(source).toContain('"SELECT current_database() = $1::text AS current_database_matched"');
    expect(source).toContain("if (expectedDatabaseName !== DATABASE_NAME) invalid();");
    const unsafeCallCount = (statement: string): number =>
      [...source.matchAll(new RegExp(`\\.unsafe\\(\\s*${statement}\\b`, "gu"))].length;
    for (const [statement, bindings] of [
      ["CURRENT_DATABASE_PROOF_SQL", "\\[\\s*expectedDatabaseName\\s*\\]"],
      ["CREATE_EXACT_SENTINEL_TABLE_SQL", undefined],
      [
        "READ_EXACT_SENTINEL_TABLE_AND_MARKER_SQL",
        "\\[\\s*input\\.marker,\\s*input\\.expectedSentinel,?\\s*\\]",
      ],
      [
        "INSERT_CANONICAL_MARKER_SQL",
        "\\[\\s*input\\.marker,\\s*input\\.expectedSentinel,?\\s*\\]",
      ],
    ] as const) {
      expect(unsafeCallCount(statement)).toBe(1);
      expect(source).toMatch(
        new RegExp(
          `\\.unsafe\\(\\s*${statement}${bindings === undefined ? "" : `,\\s*${bindings}`}\\s*\\)`,
          "u"
        )
      );
    }
    expect(source).toMatch(
      /const CREATE_EXACT_SENTINEL_TABLE_SQL = `\s+CREATE TABLE IF NOT EXISTS public\.task551_fixture_sentinel \(\s+marker text PRIMARY KEY CHECK \(marker = 'task551-baseline-v1'\),\s+sentinel text NOT NULL\s+\);\s+`;/u
    );
    expect(source).toMatch(
      /const INSERT_CANONICAL_MARKER_SQL = `\s+INSERT INTO public\.task551_fixture_sentinel \(marker, sentinel\)\s+VALUES \(\$1::text, \$2::text\)\s+`;/u
    );
    const catalogProjection = catalogProof?.match(/\)\s+SELECT\s+([\s\S]*)$/u)?.[1];
    const normalizedCatalogProof = normalizeSql(catalogProof ?? "");
    expect(catalogProjection).toBeDefined();
    expect(catalogProof?.match(/\$\d+/gu)).toEqual(["$1", "$2", "$2", "$1"]);
    expect(splitTopLevelSqlExpressions(catalogProjection ?? "").map(normalizeSql)).toEqual([
      "COALESCE((SELECT exact_relation_shape_matched FROM relation_contract), false) AS exact_relation_shape_matched",
      "(SELECT count(*)::integer FROM public.task551_fixture_sentinel) AS table_row_count",
      "(SELECT count(*)::integer FROM public.task551_fixture_sentinel WHERE marker = $1::text) AS marker_count",
      "COALESCE((SELECT count(*) = 1 AND bool_and( octet_length(convert_to(sentinel, 'UTF8')) = octet_length(convert_to($2::text, 'UTF8')) AND convert_to(sentinel, 'UTF8') = convert_to($2::text, 'UTF8')) FROM public.task551_fixture_sentinel WHERE marker = $1::text), false) AS bound_sentinel_byte_matched",
    ]);
    for (const safeguard of [
      "SELECT relation.oid AS relation_oid FROM pg_catalog.pg_class AS relation INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace WHERE namespace.nspname = 'public' AND relation.relname = 'task551_fixture_sentinel'",
      "FROM target_relation INNER JOIN pg_catalog.pg_class AS relation ON relation.oid = target_relation.relation_oid",
      "relation.relkind = 'r'",
      "relation.relpersistence = 'p'",
      "relation.relispartition = false",
      "relation.relhassubclass = false",
      "relation.relrowsecurity = false",
      "(SELECT count(*) FROM pg_catalog.pg_attribute AS attribute WHERE attribute.attrelid = relation.oid AND attribute.attnum > 0 AND NOT attribute.attisdropped) = 2",
      "EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute INNER JOIN pg_catalog.pg_type AS type ON type.oid = attribute.atttypid WHERE attribute.attrelid = relation.oid AND attribute.attnum = 1 AND attribute.attname = 'marker' AND type.oid = 'pg_catalog.text'::regtype AND attribute.attnotnull AND NOT attribute.atthasdef AND attribute.attidentity = '' AND attribute.attgenerated = '')",
      "EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute INNER JOIN pg_catalog.pg_type AS type ON type.oid = attribute.atttypid WHERE attribute.attrelid = relation.oid AND attribute.attnum = 2 AND attribute.attname = 'sentinel' AND type.oid = 'pg_catalog.text'::regtype AND attribute.attnotnull AND NOT attribute.atthasdef AND attribute.attidentity = '' AND attribute.attgenerated = '')",
      "(SELECT count(*) FROM pg_catalog.pg_constraint AS constraint WHERE constraint.conrelid = relation.oid) = 2",
      "EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS constraint WHERE constraint.conrelid = relation.oid AND constraint.contype = 'p' AND constraint.conkey = ARRAY[1]::smallint[] AND constraint.convalidated AND NOT constraint.condeferrable AND NOT constraint.condeferred)",
      "EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS constraint WHERE constraint.conrelid = relation.oid AND constraint.contype = 'c' AND constraint.convalidated AND pg_catalog.pg_get_constraintdef(constraint.oid, false) = 'CHECK ((marker = ''task551-baseline-v1''::text))')",
      "(SELECT count(*) FROM pg_catalog.pg_index AS index WHERE index.indrelid = relation.oid) = 1",
      "NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS trigger WHERE trigger.tgrelid = relation.oid AND NOT trigger.tgisinternal)",
    ])
      expect(normalizedCatalogProof).toContain(normalizeSql(safeguard));
    for (const fragment of [
      "max: 1",
      "prepare: false",
      "fetch_types: false",
      "debug: false",
      'application_name: "task551-fixture-bootstrap"',
      'client_encoding: "UTF8"',
      "onnotice: discardDriverEvent",
      "onnotify: discardDriverEvent",
      "onclose: discardDriverEvent",
      "onparameter: discardDriverEvent",
      'const BEGIN_READ_ONLY_SQL = "BEGIN READ ONLY";',
      'const BEGIN_READ_WRITE_SQL = "BEGIN";',
      'const COMMIT_SQL = "COMMIT";',
      'const ROLLBACK_SQL = "ROLLBACK";',
    ])
      expect(source).toContain(fragment);
    expect(source).not.toMatch(/\btimeout\s*:/u);
    expect(source).not.toContain("target_session_attrs");
    expect(source).not.toMatch(/\b(?:LISTEN|subscribe|subscription)\b/iu);
    expect(count("reserved = await pool.reserve()")).toBe(1);
    expect(count("active.release()")).toBe(1);
    expect(count("await pool.end()")).toBe(1);
    expect(source.match(/\.unsafe\(/gu)?.length).toBe(8);
    for (const transaction of [
      "BEGIN_READ_ONLY_SQL",
      "BEGIN_READ_WRITE_SQL",
      "COMMIT_SQL",
      "ROLLBACK_SQL",
    ])
      expect(count(transaction)).toBe(2);
  });

  test("rejects exact invalid URLs, descriptors, and sentinels before construction", async () => {
    const invalidUrls = [
      "mysql://fixture-user@fixture-host/coderso02",
      "postgres://fixture-user@/coderso02",
      "postgres://fixture-user@fixture-host",
      "postgres://fixture-user@fixture-host/coderso02/invalid?sslmode=require",
      "postgres://fixture-user@fixture-host/coderso02/extra?sslmode=require",
      "postgres://fixture-user@fixture-host/coderso02?",
      "postgres://fixture-user@fixture-host/coderso02#",
      "postgres://fixture-user@fixture-host/coderso02?sslmode=require&",
      "postgres://fixture-user@fixture-host/coderso02?sslmode=%72equire",
      "postgres://fixture-user@fixture-host,backup/coderso02?sslmode=require",
      "postgres://fixture-user@fixture-host%2Cbackup/coderso02?sslmode=require",
      "postgres://fixture-user@fixture-host@backup/coderso02?sslmode=require",
      "postgres://fixture-user@fixture-host%40backup/coderso02?sslmode=require",
      "postgres://fixture-user@fixture-host%2Fbackup/coderso02?sslmode=require",
      "postgres://fixture-user@fixture-host%3Fquery/coderso02?sslmode=require",
      "postgres://fixture-user@fixture-host%23fragment/coderso02?sslmode=require",
      "postgres://fixture-user@fixture-host/coderso02?sslmode=require&sslmode=require",
      "postgres://fixture-user@fixture-host/coderso02?SSLmode=require",
      "postgres://fixture-user@fixture-host/coderso02?database=other",
      "postgres://fixture-user@fixture-host/coderso02?user=other",
      "postgres://fixture-user@fixture-host/coderso02?application_name=override",
      "postgres://fixture-user@fixture-host/coderso02?client_encoding=SQL_ASCII",
      "postgres://fixture-user@fixture-host/coderso02?options=-c%20x=y",
      "postgres://fixture-user@fixture-host/coderso02?ssl=require",
      "postgres://fixture-user@fixture-host/coderso02?sslnegotiation=direct",
      "postgres://fixture-user@fixture-host/coderso02?timeout=1",
      "postgres://fixture-user@fixture-host/coderso02?target_session_attrs=primary",
      "postgres://fixture-user@fixture-host/?sslmode=require",
      "postgres://@fixture-host/coderso02?sslmode=require",
    ];
    for (const databaseUrl of invalidUrls)
      await expectInvalidBeforeConstruction(
        ["--check"],
        fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL: databaseUrl })
      );
    for (const environment of [
      fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_SENTINEL: "s".repeat(31) }),
      fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_SENTINEL: "s".repeat(513) }),
      fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME: "wrong" }),
      fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION: "wrong" }),
      fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL: "" }),
    ])
      await expectInvalidBeforeConstruction(["--check"], environment);
    const { TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL: _url, ...missingUrl } = fixtureEnvironment();
    for (const [argv, environment] of [
      [[], fixtureEnvironment()],
      [["--check", "--initialize"], fixtureEnvironment()],
      [["--check", "--check"], fixtureEnvironment()],
      [["--unknown"], fixtureEnvironment()],
      [["--check"], missingUrl],
      [["--check"], fixtureEnvironment({ EXTRA: "unexpected" })],
      [["--check"], fixtureEnvironment({ DATABASE_URL3: "ambient-source-must-not-be-used" })],
      [["--check"], fixtureEnvironment({ DATABASE_URL: "ambient-generic-must-not-be-used" })],
      [["--check"], fixtureEnvironment({ DATABASE_DIRECT_URL: "ambient-direct-must-not-be-used" })],
      [["--check"], fixtureEnvironment({ TASK551_EXTRA: "unexpected-task-value" })],
      [["--check"], fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_EXTRA: "unexpected-value" })],
      [["--check"], fixtureEnvironment({ PGHOST: "unexpected-value" })],
      [["--check"], fixtureEnvironment({ DB_URL: "unexpected-value" })],
    ] as const)
      await expectInvalidBeforeConstruction(argv, environment);

    let accessorReads = 0;
    const accessorEnvironment = { ...fixtureEnvironment() } as Record<string, string | undefined>;
    Object.defineProperty(accessorEnvironment, "TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL", {
      enumerable: true,
      get: () => {
        accessorReads += 1;
        throw new Error("accessor-value-must-not-run");
      },
    });
    const malformedEnvironment = { ...fixtureEnvironment() } as Task551FixtureBootstrapEnvironment;
    Object.defineProperty(malformedEnvironment, "TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL", {
      enumerable: false,
      value: FIXTURE_URL,
    });
    const hiddenEnvironment = { ...fixtureEnvironment() } as Record<string, string | undefined>;
    Object.defineProperty(hiddenEnvironment, "hidden-poison", {
      enumerable: false,
      get: () => {
        throw new Error("hidden-value-must-not-run");
      },
    });
    const symbolEnvironment = { ...fixtureEnvironment() } as Record<string, string | undefined> & {
      [key: symbol]: string;
    };
    symbolEnvironment[Symbol("unexpected")] = "symbol-poison";
    const inheritedPrototype = Object.create(null) as Record<string, string>;
    Object.defineProperty(inheritedPrototype, "inherited-poison", {
      enumerable: true,
      get: () => {
        throw new Error("inherited-value-must-not-run");
      },
    });
    const inheritedEnvironment = Object.assign(
      Object.create(inheritedPrototype),
      fixtureEnvironment()
    ) as Task551FixtureBootstrapEnvironment;
    for (const environment of [
      accessorEnvironment,
      malformedEnvironment,
      hiddenEnvironment,
      symbolEnvironment,
      inheritedEnvironment,
    ])
      await expectInvalidBeforeConstruction(["--check"], environment);
    expect(accessorReads).toBe(0);
    for (const key of ["DATABASE_URL3", "DATABASE_URL", "DATABASE_DIRECT_URL"]) {
      let reads = 0;
      const aliasEnvironment = { ...fixtureEnvironment() } as Record<string, string | undefined>;
      Object.defineProperty(aliasEnvironment, key, {
        enumerable: true,
        get: () => {
          reads += 1;
          throw new Error("alias-value-must-not-run");
        },
      });
      await expectInvalidBeforeConstruction(["--check"], aliasEnvironment);
      expect(reads).toBe(0);
    }
  });

  test("copies only owned child values and never retains or reads the transport object", async () => {
    const values = fixtureEnvironment();
    const childTarget = Object.freeze({
      ...values,
      PATH: "os-path-canary",
      TMPDIR: "os-tmp-canary",
      LANG: "os-lang-canary",
      LC_ALL: "os-lc-all-canary",
      TZ: "os-tz-canary",
    });
    let ownKeyEnumerations = 0;
    let propertyReads = 0;
    const descriptorReads: string[] = [];
    const child = new Proxy(childTarget, {
      get() {
        propertyReads += 1;
        throw new Error("child-value-getter-must-not-run");
      },
      ownKeys: (target) => {
        ownKeyEnumerations += 1;
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor: (target, key) => {
        if (typeof key === "string") descriptorReads.push(key);
        return Object.getOwnPropertyDescriptor(target, key);
      },
    }) as Task551FixtureBootstrapCliProcessEnvironment;
    const stdout = captureOutput();
    const stderr = captureOutput();
    let capturedArgv: readonly string[] | undefined;
    let capturedEnvironment: Task551FixtureBootstrapEnvironment | undefined;
    let factoryCalls = 0;
    const result = await task551FixtureBootstrapCliAdapterTestSeam.run(
      ["--check"],
      child,
      () => {
        factoryCalls += 1;
        throw new Error("dependency-factory-must-not-run");
      },
      stdout.output,
      stderr.output,
      async (argv, environment) => {
        capturedArgv = argv;
        capturedEnvironment = environment;
        return { ok: true };
      }
    );
    expect(result).toEqual({ ok: true });
    expect(capturedArgv).toEqual(["--check"]);
    expect(capturedEnvironment).toEqual(values);
    expect(capturedEnvironment).not.toBe(child);
    expect(Object.isFrozen(capturedEnvironment)).toBe(true);
    expect(Object.keys(capturedEnvironment ?? {})).toEqual(Object.keys(values));
    expect(ownKeyEnumerations).toBe(1);
    expect(propertyReads).toBe(0);
    expect(descriptorReads.sort()).toEqual(
      [...Object.keys(values), "PATH", "TMPDIR", "LANG", "LC_ALL", "TZ"].sort()
    );
    expect(factoryCalls).toBe(0);
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks).toEqual([]);
  });

  test("starts injected main only after the parent environment adapter returns", async () => {
    let adapterReturned = false;
    let mainStartedBeforeReturn = false;
    const promise = task551FixtureBootstrapCliAdapterTestSeam.run(
      ["--check"],
      fixtureEnvironment(),
      () => createHarness().deps,
      captureOutput().output,
      captureOutput().output,
      async (_argv, environment) => {
        if (!adapterReturned) mainStartedBeforeReturn = true;
        await Promise.resolve();
        expect(environment).toEqual(fixtureEnvironment());
        return { ok: true };
      }
    );
    adapterReturned = true;
    expect(await promise).toEqual({ ok: true });
    expect(mainStartedBeforeReturn).toBe(false);
  });

  test("enforces UTF-8 URL and sentinel bounds without leaking rejected canaries", async () => {
    const atLimit = urlWithByteLength(4_096);
    expect(Buffer.byteLength(atLimit, "utf8")).toBe(4_096);
    const accepted = await execute(
      ["--check"],
      fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL: atLimit })
    );
    expect(accepted.result).toEqual({ ok: true });
    expect(accepted.harness.connections).toEqual([atLimit]);
    expect(accepted.stderr).toEqual([]);

    const canary = "fixture-secret-canary";
    const rejected = await execute(
      ["--check"],
      fixtureEnvironment({
        TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL: `${urlWithByteLength(4_097)}${canary}`,
      })
    );
    expect(rejected.result).toEqual({ ok: false, code: INVALID });
    expect(rejected.harness.connections).toEqual([]);
    expect(rejected.stdout.join("") + rejected.stderr.join("")).not.toContain(canary);

    const sentinel512 = await execute(
      ["--check"],
      fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_SENTINEL: "s".repeat(512) })
    );
    expect(sentinel512.result).toEqual({ ok: true });

    const multibyteSentinel = "é".repeat(16);
    expect(Buffer.byteLength(multibyteSentinel, "utf8")).toBe(32);
    const multibyteAccepted = await execute(
      ["--check"],
      fixtureEnvironment({
        TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL:
          "postgresql://fixture-user:é@fixture-host/coderso02?sslmode=require",
        TASK551_FIXTURE_BOOTSTRAP_SENTINEL: multibyteSentinel,
      })
    );
    expect(multibyteAccepted.result).toEqual({ ok: true });
    await expectInvalidBeforeConnect(
      ["--check"],
      fixtureEnvironment({ TASK551_FIXTURE_BOOTSTRAP_SENTINEL: `${"é".repeat(15)}a` })
    );
  });

  test("accepts the query-free URL form without adding a driver preflight", async () => {
    const queryFree = await execute(
      ["--check"],
      fixtureEnvironment({
        TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL: "postgres://fixture-user@fixture-host/coderso02",
      })
    );
    expect(queryFree.result).toEqual({ ok: true });
    expect(queryFree.harness.connections).toEqual([
      "postgres://fixture-user@fixture-host/coderso02",
    ]);
  });

  test("checks an existing marker through read-only transaction and emits one fixed record", async () => {
    const harness = createHarness();
    const execution = await execute(["--check"], fixtureEnvironment(), harness);
    expect(execution.result).toEqual({ ok: true });
    expect(harness.events).toEqual([
      "connect",
      "proof:coderso02",
      "begin-read-only",
      "read-only-read",
      "read-only-rollback",
      "close",
    ]);
    expect(harness.closeCount()).toBe(1);
    expect(harness.markerInputs).toEqual([
      {
        marker: "task551-baseline-v1",
        sentinelTable: "public.task551_fixture_sentinel",
        expectedSentinel: SENTINEL,
      },
    ]);
    expect(execution.stderr).toEqual([]);
    expect(execution.stdout).toHaveLength(1);
    const record = JSON.parse(execution.stdout[0]!) as Record<string, unknown>;
    expect(record).toEqual({
      schema: "coderso.task551.fixture-bootstrap-check@v1",
      taskId: "TASK-551-01-L03",
      mode: "check",
      pass: true,
      markerCount: 1,
      targetProof: "current-database-and-single-marker",
      noLeak: true,
      toolContractDigest: getTask551FixtureBootstrapToolContractDigest(),
    });
    expect(Object.keys(record)).toHaveLength(8);
    expect(execution.stdout.join("")).not.toContain(SENTINEL);
    const recordMatchesCurrentContract = (candidate: Record<string, unknown>): boolean =>
      candidate.toolContractDigest === getTask551FixtureBootstrapToolContractDigest();
    expect(recordMatchesCurrentContract(record)).toBe(true);
    expect(
      recordMatchesCurrentContract({
        ...record,
        toolContractDigest: `sha256:${"0".repeat(64)}`,
      })
    ).toBe(false);
  });

  test("fails closed on malformed marker proofs while preserving read-only rollback", async () => {
    const mismatchedProof: Task551FixtureBootstrapMarkerProof = Object.freeze({
      exactRelationShapeMatched: true,
      tableRowCount: 2,
      markerCount: 1,
      boundSentinelByteMatched: true,
    });
    const execution = await execute(
      ["--check"],
      fixtureEnvironment(),
      createHarness({ readOnlyProof: mismatchedProof })
    );
    expect(execution.result).toEqual({ ok: false, code: INVALID });
    expect(execution.harness.events).toEqual([
      "connect",
      "proof:coderso02",
      "begin-read-only",
      "read-only-read",
      "read-only-rollback",
      "close",
    ]);
    expect(execution.stdout).toEqual([]);
    expect(execution.stderr).toEqual([`${INVALID}\n`]);

    const truthyProof: Task551FixtureBootstrapMarkerProof = {
      exactRelationShapeMatched: true,
      tableRowCount: 1,
      markerCount: 1,
      boundSentinelByteMatched: true,
    };
    Object.defineProperty(truthyProof, "boundSentinelByteMatched", {
      configurable: false,
      enumerable: true,
      value: 1,
      writable: false,
    });
    Object.freeze(truthyProof);
    const truthyExecution = await execute(
      ["--check"],
      fixtureEnvironment(),
      createHarness({ readOnlyProof: truthyProof })
    );
    expect(truthyExecution.result).toEqual({ ok: false, code: INVALID });
  });

  test("initializes only an exact empty marker state and stays silent", async () => {
    const harness = createHarness({ readWriteProofs: [EMPTY_PROOF, VALID_PROOF] });
    const execution = await execute(["--initialize"], fixtureEnvironment(), harness);
    expect(execution.result).toEqual({ ok: true });
    expect(harness.events).toEqual([
      "connect",
      "proof:coderso02",
      "begin-read-write",
      "ddl",
      "read-write-read",
      "insert",
      "read-write-read",
      "commit",
      "close",
    ]);
    expect(execution.stdout).toEqual([]);
    expect(execution.stderr).toEqual([]);
    expect(harness.closeCount()).toBe(1);
    expect(harness.insertInputs).toEqual([
      { marker: "task551-baseline-v1", expectedSentinel: SENTINEL },
    ]);
  });

  test("is idempotent for the exact existing marker and rejects target/proof drift", async () => {
    const idempotent = await execute(
      ["--initialize"],
      fixtureEnvironment(),
      createHarness({ readWriteProofs: [VALID_PROOF] })
    );
    expect(idempotent.result).toEqual({ ok: true });
    expect(idempotent.harness.events).toEqual([
      "connect",
      "proof:coderso02",
      "begin-read-write",
      "ddl",
      "read-write-read",
      "commit",
      "close",
    ]);

    const drift = await execute(
      ["--initialize"],
      fixtureEnvironment(),
      createHarness({ currentDatabaseMatched: false })
    );
    expect(drift.result).toEqual({ ok: false, code: INVALID });
    expect(drift.harness.events).toEqual(["connect", "proof:coderso02", "close"]);
    expect(drift.stdout).toEqual([]);
    expect(drift.stderr).toEqual([`${INVALID}\n`]);

    const truthyTarget = await execute(
      ["--initialize"],
      fixtureEnvironment(),
      createHarness({ currentDatabaseMatched: "truthy" })
    );
    expect(truthyTarget.result).toEqual({ ok: false, code: INVALID });
    expect(truthyTarget.harness.events).toEqual(["connect", "proof:coderso02", "close"]);
  });

  test("rolls back one failed transaction, redacts failures, and suppresses check output after close failure", async () => {
    const failedWrite = await execute(
      ["--initialize"],
      fixtureEnvironment(),
      createHarness({ failAt: "insert", readWriteProofs: [EMPTY_PROOF] })
    );
    expect(failedWrite.result).toEqual({ ok: false, code: INVALID });
    expect(failedWrite.harness.events).toEqual([
      "connect",
      "proof:coderso02",
      "begin-read-write",
      "ddl",
      "read-write-read",
      "insert",
      "read-write-rollback",
      "close",
    ]);
    expect(failedWrite.stdout).toEqual([]);
    expect(failedWrite.stderr).toEqual([`${INVALID}\n`]);

    const failedCommit = await execute(
      ["--initialize"],
      fixtureEnvironment(),
      createHarness({ failAt: "commit", readWriteProofs: [VALID_PROOF] })
    );
    expect(failedCommit.result).toEqual({ ok: false, code: INVALID });
    expect(failedCommit.harness.events).toEqual([
      "connect",
      "proof:coderso02",
      "begin-read-write",
      "ddl",
      "read-write-read",
      "commit",
      "read-write-rollback",
      "close",
    ]);

    const closeFailure = await execute(
      ["--check"],
      fixtureEnvironment(),
      createHarness({ failAt: "close" })
    );
    expect(closeFailure.result).toEqual({ ok: false, code: INVALID });
    expect(closeFailure.stdout).toEqual([]);
    expect(closeFailure.stderr).toEqual([`${INVALID}\n`]);
    expect(closeFailure.harness.closeCount()).toBe(1);

    const invalidEmptyState: Task551FixtureBootstrapMarkerProof = Object.freeze({
      exactRelationShapeMatched: true,
      tableRowCount: 0,
      markerCount: 1,
      boundSentinelByteMatched: false,
    });
    const invalidEmpty = await execute(
      ["--initialize"],
      fixtureEnvironment(),
      createHarness({ readWriteProofs: [invalidEmptyState] })
    );
    expect(invalidEmpty.result).toEqual({ ok: false, code: INVALID });
    expect(invalidEmpty.harness.events).toEqual([
      "connect",
      "proof:coderso02",
      "begin-read-write",
      "ddl",
      "read-write-read",
      "read-write-rollback",
      "close",
    ]);

    const duplicateAfterInsert = await execute(
      ["--initialize"],
      fixtureEnvironment(),
      createHarness({ readWriteProofs: [EMPTY_PROOF, DUPLICATE_PROOF] })
    );
    expect(duplicateAfterInsert.result).toEqual({ ok: false, code: INVALID });
    expect(duplicateAfterInsert.harness.events).toEqual([
      "connect",
      "proof:coderso02",
      "begin-read-write",
      "ddl",
      "read-write-read",
      "insert",
      "read-write-read",
      "read-write-rollback",
      "close",
    ]);
    expect(duplicateAfterInsert.harness.insertInputs).toEqual([
      { marker: "task551-baseline-v1", expectedSentinel: SENTINEL },
    ]);

    const combinedFailure = await execute(
      ["--initialize"],
      fixtureEnvironment(),
      createHarness({
        failAt: ["insert", "read-write-rollback", "close"],
        readWriteProofs: [EMPTY_PROOF],
      })
    );
    expect(combinedFailure.result).toEqual({ ok: false, code: INVALID });
    expect(combinedFailure.stdout).toEqual([]);
    expect(combinedFailure.stderr).toEqual([`${INVALID}\n`]);
    expect(combinedFailure.harness.closeCount()).toBe(1);
  });
});
