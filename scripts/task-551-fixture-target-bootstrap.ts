import canonicalize from "canonicalize";
import { createHash } from "node:crypto";

const INVALID = "fixture_bootstrap_invalid";
const CONFIRMATION = "INITIALIZE_TASK551_FIXTURE_TARGET";
const DATABASE_NAME = "coderso02" as const;
const MARKER = "task551-baseline-v1" as const;
const URL_MAX_BYTES = 4_096;
const SENTINEL_MIN_BYTES = 32;
const SENTINEL_MAX_BYTES = 512;
const SSL_QUERY = "?sslmode=require";
const BOOTSTRAP_KEYS = [
  "TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL",
  "TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME",
  "TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION",
  "TASK551_FIXTURE_BOOTSTRAP_SENTINEL",
] as const;
const OS_TRANSPORT_KEYS = ["PATH", "TMPDIR", "LANG", "LC_ALL", "TZ"] as const;
const BOOTSTRAP_KEY_SET = new Set<string>(BOOTSTRAP_KEYS);
const CHILD_TRANSPORT_KEY_SET = new Set<string>([...BOOTSTRAP_KEYS, ...OS_TRANSPORT_KEYS]);
const FORBIDDEN_SOURCE_KEYS = new Set(["DATABASE_URL3", "DATABASE_URL", "DATABASE_DIRECT_URL"]);

const discardDriverEvent = (): void => undefined;
const TASK551_BOOTSTRAP_POSTGRES_OPTIONS = Object.freeze({
  max: 1,
  idle_timeout: 0,
  connect_timeout: 10,
  max_pipeline: 1,
  keep_alive: 0,
  prepare: false,
  fetch_types: false,
  debug: false,
  connection: Object.freeze({
    application_name: "task551-fixture-bootstrap",
    client_encoding: "UTF8",
  }),
  onnotice: discardDriverEvent,
  onnotify: discardDriverEvent,
  onclose: discardDriverEvent,
  onparameter: discardDriverEvent,
});

type BootstrapKey = (typeof BOOTSTRAP_KEYS)[number];
type BootstrapMode = "initialize" | "check";
type BootstrapDescriptorMap = ReadonlyMap<BootstrapKey, PropertyDescriptor>;
type BootstrapConfig = Readonly<{
  databaseUrl: string;
  databaseName: typeof DATABASE_NAME;
  sentinel: string;
}>;
type FixtureBootstrapCheckRecord = Readonly<{
  schema: "coderso.task551.fixture-bootstrap-check@v1";
  taskId: "TASK-551-01-L03";
  mode: "check";
  pass: true;
  markerCount: 1;
  targetProof: "current-database-and-single-marker";
  noLeak: true;
  toolContractDigest: `sha256:${string}`;
}>;

export type Task551FixtureBootstrapEnvironment = Readonly<Record<string, string | undefined>>;
export type Task551FixtureBootstrapCliProcessEnvironment = Readonly<
  Record<string, string | undefined>
>;
export type Task551FixtureBootstrapOutput = Readonly<{ write(chunk: string): void }>;
export type Task551FixtureBootstrapCurrentDatabaseProof = Readonly<{
  currentDatabaseMatched: boolean;
}>;
export type Task551FixtureBootstrapMarkerProofInput = Readonly<{
  marker: typeof MARKER;
  sentinelTable: "public.task551_fixture_sentinel";
  expectedSentinel: string;
}>;
export type Task551FixtureBootstrapMarkerProof = Readonly<{
  exactRelationShapeMatched: boolean;
  tableRowCount: number;
  markerCount: number;
  boundSentinelByteMatched: boolean;
}>;
export type Task551FixtureBootstrapReadOnlyTransaction = Readonly<{
  mode: "read-only";
  readExactSentinelTableAndMarker(
    input: Task551FixtureBootstrapMarkerProofInput
  ): Promise<Task551FixtureBootstrapMarkerProof>;
  rollback(): Promise<void>;
}>;
export type Task551FixtureBootstrapReadWriteTransaction = Readonly<{
  mode: "read-write";
  createExactSentinelTableIfAbsent(): Promise<void>;
  readExactSentinelTableAndMarker(
    input: Task551FixtureBootstrapMarkerProofInput
  ): Promise<Task551FixtureBootstrapMarkerProof>;
  insertCanonicalMarker(
    input: Readonly<{ marker: typeof MARKER; expectedSentinel: string }>
  ): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}>;
export type Task551FixtureBootstrapClient = Readonly<{
  proveExpectedDatabase(
    expectedDatabaseName: typeof DATABASE_NAME
  ): Promise<Task551FixtureBootstrapCurrentDatabaseProof>;
  beginReadOnlyTransaction(): Promise<Task551FixtureBootstrapReadOnlyTransaction>;
  beginReadWriteTransaction(): Promise<Task551FixtureBootstrapReadWriteTransaction>;
  close(): Promise<void>;
}>;
export type Task551FixtureBootstrapDeps = Readonly<{
  connect(databaseUrl: string): Promise<Task551FixtureBootstrapClient>;
}>;
export type Task551FixtureBootstrapCliResult =
  Readonly<{ ok: true }> | Readonly<{ ok: false; code: "fixture_bootstrap_invalid" }>;
export type Task551FixtureBootstrapMain = (
  argv: readonly string[],
  env: Task551FixtureBootstrapEnvironment,
  deps: Task551FixtureBootstrapDeps,
  stdout: Task551FixtureBootstrapOutput,
  stderr: Task551FixtureBootstrapOutput
) => Promise<Task551FixtureBootstrapCliResult>;
export type Task551FixtureBootstrapCliAdapterTestSeam = Readonly<{
  run(
    childArgv: readonly string[],
    childProcessEnvironment: Task551FixtureBootstrapCliProcessEnvironment,
    createDepsWithoutConnecting: () => Task551FixtureBootstrapDeps,
    stdout: Task551FixtureBootstrapOutput,
    stderr: Task551FixtureBootstrapOutput,
    invokeMain?: Task551FixtureBootstrapMain
  ): Promise<Task551FixtureBootstrapCliResult>;
}>;

type PostgresRow = Readonly<Record<string, unknown>>;
type PostgresQuery = Readonly<{
  unsafe<T extends PostgresRow = PostgresRow>(
    statement: string,
    bindings?: readonly unknown[]
  ): Promise<readonly T[]>;
}>;
type ReservedPostgresQuery = PostgresQuery & Readonly<{ release(): void }>;
type PostgresPool = PostgresQuery &
  Readonly<{
    reserve(): Promise<ReservedPostgresQuery>;
    end(): Promise<void>;
  }>;
type PostgresFactory = (
  databaseUrl: string,
  options: typeof TASK551_BOOTSTRAP_POSTGRES_OPTIONS
) => PostgresPool;
type TransactionState = "none" | "read-only" | "read-write" | "committed" | "rolled-back";

const CURRENT_DATABASE_PROOF_SQL =
  "SELECT current_database() = $1::text AS current_database_matched";
const BEGIN_READ_ONLY_SQL = "BEGIN READ ONLY";
const BEGIN_READ_WRITE_SQL = "BEGIN";
const COMMIT_SQL = "COMMIT";
const ROLLBACK_SQL = "ROLLBACK";
const CREATE_EXACT_SENTINEL_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS public.task551_fixture_sentinel (
    marker text PRIMARY KEY CHECK (marker = 'task551-baseline-v1'),
    sentinel text NOT NULL
  );
`;
const INSERT_CANONICAL_MARKER_SQL = `
  INSERT INTO public.task551_fixture_sentinel (marker, sentinel)
  VALUES ($1::text, $2::text)
`;
const READ_EXACT_SENTINEL_TABLE_AND_MARKER_SQL = `
  WITH target_relation AS (
    SELECT relation.oid AS relation_oid
    FROM pg_catalog.pg_class AS relation
    INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public' AND relation.relname = 'task551_fixture_sentinel'
  ), relation_contract AS (
    SELECT target_relation.relation_oid,
      (
        relation.relkind = 'r'
        AND relation.relpersistence = 'p'
        AND relation.relispartition = false
        AND relation.relhassubclass = false
        AND relation.relrowsecurity = false
        AND (SELECT count(*) FROM pg_catalog.pg_attribute AS attribute
          WHERE attribute.attrelid = relation.oid AND attribute.attnum > 0 AND NOT attribute.attisdropped) = 2
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute
          INNER JOIN pg_catalog.pg_type AS type ON type.oid = attribute.atttypid
          WHERE attribute.attrelid = relation.oid AND attribute.attnum = 1 AND attribute.attname = 'marker'
            AND type.oid = 'pg_catalog.text'::regtype AND attribute.attnotnull AND NOT attribute.atthasdef
            AND attribute.attidentity = '' AND attribute.attgenerated = '')
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute
          INNER JOIN pg_catalog.pg_type AS type ON type.oid = attribute.atttypid
          WHERE attribute.attrelid = relation.oid AND attribute.attnum = 2 AND attribute.attname = 'sentinel'
            AND type.oid = 'pg_catalog.text'::regtype AND attribute.attnotnull AND NOT attribute.atthasdef
            AND attribute.attidentity = '' AND attribute.attgenerated = '')
        AND (SELECT count(*) FROM pg_catalog.pg_constraint AS constraint WHERE constraint.conrelid = relation.oid) = 2
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS constraint
          WHERE constraint.conrelid = relation.oid AND constraint.contype = 'p'
            AND constraint.conkey = ARRAY[1]::smallint[] AND constraint.convalidated
            AND NOT constraint.condeferrable AND NOT constraint.condeferred)
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS constraint
          WHERE constraint.conrelid = relation.oid AND constraint.contype = 'c' AND constraint.convalidated
            AND pg_catalog.pg_get_constraintdef(constraint.oid, false) =
              'CHECK ((marker = ''task551-baseline-v1''::text))')
        AND (SELECT count(*) FROM pg_catalog.pg_index AS index WHERE index.indrelid = relation.oid) = 1
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS trigger
          WHERE trigger.tgrelid = relation.oid AND NOT trigger.tgisinternal)
      ) AS exact_relation_shape_matched
    FROM target_relation
    INNER JOIN pg_catalog.pg_class AS relation ON relation.oid = target_relation.relation_oid
  )
  SELECT
    COALESCE((SELECT exact_relation_shape_matched FROM relation_contract), false) AS exact_relation_shape_matched,
    (SELECT count(*)::integer FROM public.task551_fixture_sentinel) AS table_row_count,
    (SELECT count(*)::integer FROM public.task551_fixture_sentinel WHERE marker = $1::text) AS marker_count,
    COALESCE((SELECT count(*) = 1 AND bool_and(
      octet_length(convert_to(sentinel, 'UTF8')) = octet_length(convert_to($2::text, 'UTF8'))
      AND convert_to(sentinel, 'UTF8') = convert_to($2::text, 'UTF8'))
      FROM public.task551_fixture_sentinel WHERE marker = $1::text), false) AS bound_sentinel_byte_matched
`;

const TOOL_IDENTITY = Object.freeze({
  schema: "coderso.task551.fixture-bootstrap-tool-contract@v1",
  taskId: "TASK-551-01-L03",
  checkRecordSchema: "coderso.task551.fixture-bootstrap-check@v1",
  checkMode: "check",
  checkMarkerCount: 1,
  checkTargetProof: "current-database-and-single-marker",
  checkNoLeak: true,
} as const);

function invalid(): never {
  throw new Error(INVALID);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isDataPropertyDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor & { value: unknown } {
  return (
    descriptor !== undefined &&
    descriptor.enumerable === true &&
    hasOwn(descriptor, "value") &&
    descriptor.get === undefined &&
    descriptor.set === undefined
  );
}

function assertExactBootstrapEnvironmentKeySet(env: Task551FixtureBootstrapEnvironment): void {
  const prototype = Object.getPrototypeOf(env);
  if (prototype !== null && prototype !== Object.prototype) invalid();
  const names = Reflect.ownKeys(env);
  if (names.length !== BOOTSTRAP_KEYS.length || names.some((name) => typeof name !== "string"))
    invalid();
  for (const name of names) {
    if (typeof name !== "string" || FORBIDDEN_SOURCE_KEYS.has(name) || !BOOTSTRAP_KEY_SET.has(name))
      invalid();
  }
  for (const key of BOOTSTRAP_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(env, key);
    if (!isDataPropertyDescriptor(descriptor)) invalid();
  }
}

function assertExactL11CliBootstrapTransportKeyNames(
  childEnvironment: Task551FixtureBootstrapCliProcessEnvironment,
  names: readonly PropertyKey[]
): BootstrapDescriptorMap {
  const prototype = Object.getPrototypeOf(childEnvironment);
  if (prototype !== null && prototype !== Object.prototype) invalid();
  if (
    names.length < BOOTSTRAP_KEYS.length ||
    names.length > CHILD_TRANSPORT_KEY_SET.size ||
    names.some((name) => typeof name !== "string")
  )
    invalid();

  const descriptors = new Map<BootstrapKey, PropertyDescriptor>();
  for (const name of names) {
    if (
      typeof name !== "string" ||
      FORBIDDEN_SOURCE_KEYS.has(name) ||
      !CHILD_TRANSPORT_KEY_SET.has(name)
    )
      invalid();
    const descriptor = Object.getOwnPropertyDescriptor(childEnvironment, name);
    if (!isDataPropertyDescriptor(descriptor)) invalid();
    if (BOOTSTRAP_KEY_SET.has(name)) {
      descriptors.set(name as BootstrapKey, descriptor);
    }
  }
  for (const key of BOOTSTRAP_KEYS) {
    if (!descriptors.has(key)) invalid();
  }
  return descriptors;
}

function readOneOwnedCliBootstrapString(
  descriptors: BootstrapDescriptorMap,
  key: BootstrapKey
): string {
  const descriptor = descriptors.get(key);
  if (!isDataPropertyDescriptor(descriptor)) invalid();
  const value = descriptor.value;
  if (typeof value !== "string") invalid();
  return value;
}

function readOwnedString(env: Task551FixtureBootstrapEnvironment, key: BootstrapKey): string {
  const descriptor = Object.getOwnPropertyDescriptor(env, key);
  if (!isDataPropertyDescriptor(descriptor)) invalid();
  const value = descriptor.value;
  if (typeof value !== "string") invalid();
  return value;
}

function snapshotL11InjectedBootstrapEnvironmentForCli(
  childEnvironment: Task551FixtureBootstrapCliProcessEnvironment
): Task551FixtureBootstrapEnvironment {
  const names = Reflect.ownKeys(childEnvironment);
  const descriptors = assertExactL11CliBootstrapTransportKeyNames(childEnvironment, names);
  const snapshot: Task551FixtureBootstrapEnvironment = Object.freeze({
    TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL: readOneOwnedCliBootstrapString(
      descriptors,
      "TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL"
    ),
    TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME: readOneOwnedCliBootstrapString(
      descriptors,
      "TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME"
    ),
    TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION: readOneOwnedCliBootstrapString(
      descriptors,
      "TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION"
    ),
    TASK551_FIXTURE_BOOTSTRAP_SENTINEL: readOneOwnedCliBootstrapString(
      descriptors,
      "TASK551_FIXTURE_BOOTSTRAP_SENTINEL"
    ),
  });
  assertExactBootstrapEnvironmentKeySet(snapshot);
  return snapshot;
}

function parseMode(argv: readonly string[]): BootstrapMode {
  if (argv.length !== 1) invalid();
  if (argv[0] === "--initialize") return "initialize";
  if (argv[0] === "--check") return "check";
  return invalid();
}

function assertStrictPostgresConnectionString(databaseUrl: string): void {
  const scheme = databaseUrl.startsWith("postgres://")
    ? "postgres://"
    : databaseUrl.startsWith("postgresql://")
      ? "postgresql://"
      : undefined;
  if (!scheme) invalid();
  const authorityStart = scheme.length;
  const rawFragmentOffset = databaseUrl.indexOf("#", authorityStart);
  if (rawFragmentOffset !== -1) invalid();
  const rawQuestionOffset = databaseUrl.indexOf("?", authorityStart);
  const rawSearch = rawQuestionOffset === -1 ? "" : databaseUrl.slice(rawQuestionOffset);
  if (rawSearch !== "" && rawSearch !== SSL_QUERY) invalid();
  const rawSlashOffset = databaseUrl.indexOf("/", authorityStart);
  const rawAuthorityEnd = Math.min(
    rawSlashOffset === -1 ? databaseUrl.length : rawSlashOffset,
    rawQuestionOffset === -1 ? databaseUrl.length : rawQuestionOffset,
    rawFragmentOffset === -1 ? databaseUrl.length : rawFragmentOffset
  );
  const rawAuthority = databaseUrl.slice(authorityStart, rawAuthorityEnd);
  const firstRawAt = rawAuthority.indexOf("@");
  if (firstRawAt <= 0 || firstRawAt !== rawAuthority.lastIndexOf("@")) invalid();
  let decodedDriverAuthority: string;
  try {
    decodedDriverAuthority = decodeURIComponent(rawAuthority.slice(firstRawAt + 1));
  } catch {
    invalid();
  }
  if (decodedDriverAuthority.length === 0 || /[,@/?#]/u.test(decodedDriverAuthority)) invalid();
  const rawPathStart = rawSlashOffset;
  const rawPathEnd = Math.min(
    rawQuestionOffset === -1 ? databaseUrl.length : rawQuestionOffset,
    rawFragmentOffset === -1 ? databaseUrl.length : rawFragmentOffset
  );
  if (rawPathStart === -1 || databaseUrl.slice(rawPathStart, rawPathEnd) !== `/${DATABASE_NAME}`)
    invalid();
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    invalid();
  }
  if (
    (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
    parsed.hostname.length === 0 ||
    parsed.username.length === 0 ||
    parsed.pathname !== `/${DATABASE_NAME}` ||
    parsed.hash.length !== 0
  )
    invalid();
}

function parseBootstrapConfig(env: Task551FixtureBootstrapEnvironment): BootstrapConfig {
  assertExactBootstrapEnvironmentKeySet(env);
  const databaseUrl = readOwnedString(env, "TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL");
  const databaseName = readOwnedString(env, "TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME");
  const confirmation = readOwnedString(env, "TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION");
  const sentinel = readOwnedString(env, "TASK551_FIXTURE_BOOTSTRAP_SENTINEL");
  if (
    databaseName !== DATABASE_NAME ||
    confirmation !== CONFIRMATION ||
    Buffer.byteLength(databaseUrl, "utf8") === 0 ||
    Buffer.byteLength(databaseUrl, "utf8") > URL_MAX_BYTES ||
    Buffer.byteLength(sentinel, "utf8") < SENTINEL_MIN_BYTES ||
    Buffer.byteLength(sentinel, "utf8") > SENTINEL_MAX_BYTES
  )
    invalid();
  assertStrictPostgresConnectionString(databaseUrl);
  return Object.freeze({ databaseUrl, databaseName: DATABASE_NAME, sentinel });
}

export function getTask551FixtureBootstrapToolContractIdentity(): typeof TOOL_IDENTITY {
  return TOOL_IDENTITY;
}

export function getTask551FixtureBootstrapToolContractDigest(): `sha256:${string}` {
  const serialized = canonicalize(getTask551FixtureBootstrapToolContractIdentity());
  if (typeof serialized !== "string") invalid();
  const digest = createHash("sha256").update(serialized, "utf8").digest("hex");
  if (!/^[0-9a-f]{64}$/u.test(digest)) invalid();
  return `sha256:${digest}`;
}

function createCheckRecord(): FixtureBootstrapCheckRecord {
  return Object.freeze({
    schema: "coderso.task551.fixture-bootstrap-check@v1",
    taskId: "TASK-551-01-L03",
    mode: "check",
    pass: true,
    markerCount: 1,
    targetProof: "current-database-and-single-marker",
    noLeak: true,
    toolContractDigest: getTask551FixtureBootstrapToolContractDigest(),
  });
}

function markerProofInput(config: BootstrapConfig): Task551FixtureBootstrapMarkerProofInput {
  return {
    marker: MARKER,
    sentinelTable: "public.task551_fixture_sentinel",
    expectedSentinel: config.sentinel,
  };
}

function assertExactMarkerInput(input: Task551FixtureBootstrapMarkerProofInput): void {
  if (input.marker !== MARKER || input.sentinelTable !== "public.task551_fixture_sentinel")
    invalid();
}

function assertProofCounts(proof: Task551FixtureBootstrapMarkerProof): void {
  if (!Number.isSafeInteger(proof.tableRowCount) || proof.tableRowCount < 0) invalid();
  if (!Number.isSafeInteger(proof.markerCount) || proof.markerCount < 0) invalid();
}

function assertExistingMarkerProof(proof: Task551FixtureBootstrapMarkerProof): void {
  assertProofCounts(proof);
  if (
    proof.exactRelationShapeMatched !== true ||
    proof.tableRowCount !== 1 ||
    proof.markerCount !== 1 ||
    proof.boundSentinelByteMatched !== true
  ) {
    invalid();
  }
}

function assertEmptyMarkerProof(proof: Task551FixtureBootstrapMarkerProof): void {
  assertProofCounts(proof);
  if (
    proof.exactRelationShapeMatched !== true ||
    proof.tableRowCount !== 0 ||
    proof.markerCount !== 0 ||
    proof.boundSentinelByteMatched !== false
  ) {
    invalid();
  }
}

function normalizeCurrentDatabaseProof(
  rows: readonly PostgresRow[]
): Task551FixtureBootstrapCurrentDatabaseProof {
  return Object.freeze({
    currentDatabaseMatched: rows.length === 1 && rows[0]?.current_database_matched === true,
  });
}

function normalizeMarkerProof(rows: readonly PostgresRow[]): Task551FixtureBootstrapMarkerProof {
  const row = rows.length === 1 ? rows[0] : undefined;
  if (
    row === undefined ||
    typeof row.exact_relation_shape_matched !== "boolean" ||
    typeof row.table_row_count !== "number" ||
    typeof row.marker_count !== "number" ||
    typeof row.bound_sentinel_byte_matched !== "boolean"
  )
    invalid();
  return Object.freeze({
    exactRelationShapeMatched: row.exact_relation_shape_matched,
    tableRowCount: row.table_row_count,
    markerCount: row.marker_count,
    boundSentinelByteMatched: row.bound_sentinel_byte_matched,
  });
}

function createTask551PostgresBootstrapClient(
  databaseUrl: string,
  createPostgresClient: PostgresFactory
): Task551FixtureBootstrapClient {
  const pool = createPostgresClient(databaseUrl, TASK551_BOOTSTRAP_POSTGRES_OPTIONS);
  let reserved: ReservedPostgresQuery | undefined;
  let transactionState: TransactionState = "none";
  let targetProved = false;
  let released = false;
  let ended = false;

  const reserveForProof = async (): Promise<ReservedPostgresQuery> => {
    if (reserved !== undefined) return reserved;
    if (released || ended) invalid();
    reserved = await pool.reserve();
    return reserved;
  };
  const requireReserved = (state: "none" | "read-only" | "read-write"): ReservedPostgresQuery => {
    if (reserved === undefined || released || transactionState !== state) invalid();
    return reserved;
  };
  const releaseExactlyOnce = (): void => {
    if (released) return;
    if (reserved === undefined) invalid();
    const active = reserved;
    released = true;
    reserved = undefined;
    active.release();
  };
  const rollbackAndRelease = async (): Promise<void> => {
    if (transactionState === "committed" || transactionState === "rolled-back") return;
    const active = requireReserved(transactionState === "read-only" ? "read-only" : "read-write");
    let failed = false;
    try {
      await active.unsafe(ROLLBACK_SQL);
    } catch {
      failed = true;
    } finally {
      transactionState = "rolled-back";
      try {
        releaseExactlyOnce();
      } catch {
        failed = true;
      }
    }
    if (failed) invalid();
  };
  const readProof = async (
    mode: "read-only" | "read-write",
    input: Task551FixtureBootstrapMarkerProofInput
  ): Promise<Task551FixtureBootstrapMarkerProof> => {
    assertExactMarkerInput(input);
    const rows = await requireReserved(mode).unsafe(READ_EXACT_SENTINEL_TABLE_AND_MARKER_SQL, [
      input.marker,
      input.expectedSentinel,
    ]);
    return normalizeMarkerProof(rows);
  };

  return Object.freeze({
    proveExpectedDatabase: async (expectedDatabaseName) => {
      if (expectedDatabaseName !== DATABASE_NAME) invalid();
      const rows = await (
        await reserveForProof()
      ).unsafe(CURRENT_DATABASE_PROOF_SQL, [expectedDatabaseName]);
      const proof = normalizeCurrentDatabaseProof(rows);
      targetProved = proof.currentDatabaseMatched;
      return proof;
    },
    beginReadOnlyTransaction: async () => {
      if (!targetProved) invalid();
      await requireReserved("none").unsafe(BEGIN_READ_ONLY_SQL);
      transactionState = "read-only";
      return Object.freeze({
        mode: "read-only" as const,
        readExactSentinelTableAndMarker: (input: Task551FixtureBootstrapMarkerProofInput) =>
          readProof("read-only", input),
        rollback: rollbackAndRelease,
      });
    },
    beginReadWriteTransaction: async () => {
      if (!targetProved) invalid();
      await requireReserved("none").unsafe(BEGIN_READ_WRITE_SQL);
      transactionState = "read-write";
      return Object.freeze({
        mode: "read-write" as const,
        createExactSentinelTableIfAbsent: async () => {
          await requireReserved("read-write").unsafe(CREATE_EXACT_SENTINEL_TABLE_SQL);
        },
        readExactSentinelTableAndMarker: (input: Task551FixtureBootstrapMarkerProofInput) =>
          readProof("read-write", input),
        insertCanonicalMarker: async (
          input: Readonly<{ marker: typeof MARKER; expectedSentinel: string }>
        ) => {
          if (input.marker !== MARKER) invalid();
          await requireReserved("read-write").unsafe(INSERT_CANONICAL_MARKER_SQL, [
            input.marker,
            input.expectedSentinel,
          ]);
        },
        commit: async () => {
          await requireReserved("read-write").unsafe(COMMIT_SQL);
          transactionState = "committed";
          releaseExactlyOnce();
        },
        rollback: rollbackAndRelease,
      });
    },
    close: async () => {
      if (ended) return;
      ended = true;
      let failed = false;
      try {
        if (transactionState === "read-only" || transactionState === "read-write")
          await rollbackAndRelease();
        else if (reserved !== undefined && !released) releaseExactlyOnce();
      } catch {
        failed = true;
      } finally {
        try {
          await pool.end();
        } catch {
          failed = true;
        }
      }
      if (failed) invalid();
    },
  });
}

async function loadPostgresFactory(): Promise<PostgresFactory> {
  const postgresModule = await import("postgres");
  if (typeof postgresModule.default !== "function") invalid();
  return postgresModule.default as unknown as PostgresFactory;
}

function createCliBootstrapDepsWithoutConnecting(): Task551FixtureBootstrapDeps {
  return Object.freeze({
    connect: async (databaseUrl) =>
      createTask551PostgresBootstrapClient(databaseUrl, await loadPostgresFactory()),
  });
}

async function proveFixtureTarget(
  client: Task551FixtureBootstrapClient,
  config: BootstrapConfig
): Promise<void> {
  const proof = await client.proveExpectedDatabase(config.databaseName);
  if (proof.currentDatabaseMatched !== true) invalid();
}

async function validateReadOnly(
  client: Task551FixtureBootstrapClient,
  config: BootstrapConfig
): Promise<void> {
  const transaction = await client.beginReadOnlyTransaction();
  try {
    assertExistingMarkerProof(
      await transaction.readExactSentinelTableAndMarker(markerProofInput(config))
    );
  } finally {
    await transaction.rollback();
  }
}

async function initializeOrValidate(
  client: Task551FixtureBootstrapClient,
  config: BootstrapConfig
): Promise<void> {
  const transaction = await client.beginReadWriteTransaction();
  let committed = false;
  try {
    await transaction.createExactSentinelTableIfAbsent();
    const firstProof = await transaction.readExactSentinelTableAndMarker(markerProofInput(config));
    try {
      assertExistingMarkerProof(firstProof);
    } catch {
      assertEmptyMarkerProof(firstProof);
      await transaction.insertCanonicalMarker({
        marker: MARKER,
        expectedSentinel: config.sentinel,
      });
      assertExistingMarkerProof(
        await transaction.readExactSentinelTableAndMarker(markerProofInput(config))
      );
    }
    await transaction.commit();
    committed = true;
  } catch {
    if (!committed) await transaction.rollback();
    invalid();
  }
}

async function runBootstrap(
  argv: readonly string[],
  env: Task551FixtureBootstrapEnvironment,
  deps: Task551FixtureBootstrapDeps
): Promise<FixtureBootstrapCheckRecord | undefined> {
  let client: Task551FixtureBootstrapClient | undefined;
  try {
    const mode = parseMode(argv);
    const config = parseBootstrapConfig(env);
    client = await deps.connect(config.databaseUrl);
    await proveFixtureTarget(client, config);
    if (mode === "check") {
      await validateReadOnly(client, config);
      return createCheckRecord();
    }
    await initializeOrValidate(client, config);
    return undefined;
  } finally {
    if (client !== undefined) await client.close();
  }
}

function writeOnlyRedactedFailure(stderr: Task551FixtureBootstrapOutput): void {
  try {
    stderr.write(`${INVALID}\n`);
  } catch {
    return;
  }
}

async function main(
  argv: readonly string[],
  env: Task551FixtureBootstrapEnvironment,
  deps: Task551FixtureBootstrapDeps,
  stdout: Task551FixtureBootstrapOutput,
  stderr: Task551FixtureBootstrapOutput
): Promise<Task551FixtureBootstrapCliResult> {
  try {
    const record = await runBootstrap(argv, env, deps);
    if (record !== undefined) stdout.write(`${JSON.stringify(record)}\n`);
    return { ok: true };
  } catch {
    writeOnlyRedactedFailure(stderr);
    return { ok: false, code: INVALID };
  }
}

function runCliEntryFromL11ChildProcess(
  childArgv: readonly string[],
  childEnvironment: Task551FixtureBootstrapCliProcessEnvironment,
  createDepsWithoutConnecting: () => Task551FixtureBootstrapDeps,
  stdout: Task551FixtureBootstrapOutput,
  stderr: Task551FixtureBootstrapOutput,
  invokeMain: Task551FixtureBootstrapMain = main
): Promise<Task551FixtureBootstrapCliResult> {
  try {
    let env = snapshotL11InjectedBootstrapEnvironmentForCli(childEnvironment);
    let deps: Task551FixtureBootstrapDeps | undefined;
    const deferredDeps: Task551FixtureBootstrapDeps = Object.freeze({
      connect: (databaseUrl) => {
        deps ??= createDepsWithoutConnecting();
        return deps.connect(databaseUrl);
      },
    });
    return Promise.resolve()
      .then(() => invokeMain(childArgv, env, deferredDeps, stdout, stderr))
      .catch((): Task551FixtureBootstrapCliResult => {
        writeOnlyRedactedFailure(stderr);
        return { ok: false, code: INVALID };
      })
      .finally(() => {
        env = undefined as unknown as Task551FixtureBootstrapEnvironment;
        childEnvironment = undefined as unknown as Task551FixtureBootstrapCliProcessEnvironment;
      });
  } catch {
    writeOnlyRedactedFailure(stderr);
    return Promise.resolve({ ok: false, code: INVALID });
  }
}

export const task551FixtureBootstrapCliAdapterTestSeam = Object.freeze({
  run: runCliEntryFromL11ChildProcess,
} satisfies Task551FixtureBootstrapCliAdapterTestSeam);

if (import.meta.main) {
  const result = await runCliEntryFromL11ChildProcess(
    process.argv.slice(2),
    process.env,
    createCliBootstrapDepsWithoutConnecting,
    process.stdout,
    process.stderr
  );
  process.exitCode = result.ok ? 0 : 1;
}
