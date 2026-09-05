const INVALID_ERROR_MESSAGE = "database_baseline_invalid";

export const TASK551_FIXTURE_TARGET_CHILD_KEYS = [
  "TASK551_FIXTURE_DATABASE_URL",
  "TASK551_FIXTURE_DATABASE_NAME",
  "TASK551_FIXTURE_DATABASE_SENTINEL",
] as const;

export const TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME = "coderso02" as const;

export type Task551FixtureTargetChildValues = Readonly<{
  TASK551_FIXTURE_DATABASE_URL: string;
  TASK551_FIXTURE_DATABASE_NAME: typeof TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME;
  TASK551_FIXTURE_DATABASE_SENTINEL: string;
}>;

export type Task551FixtureTarget = Readonly<{
  url: string;
  expectedDatabaseName: typeof TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME;
  sentinel: string;
}>;

export type Task551FixtureTargetProof = Readonly<{
  rolledBack: true;
  currentDatabaseMatched: true;
  exactSingleMarkerMatched: true;
  boundSentinelByteMatched: true;
}>;

export type Task551FixtureTargetProofObservation = Readonly<{
  currentDatabaseMatched: boolean;
  markerCount: number;
  boundSentinelByteMatched: boolean;
}>;

export type Task551FixtureTargetReadOnlyTransaction = Readonly<{
  readFixtureTargetProof(
    input: Readonly<{
      expectedDatabaseName: typeof TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME;
      expectedSentinel: string;
      marker: "task551-baseline-v1";
      sentinelTable: "public.task551_fixture_sentinel";
    }>
  ): Promise<Task551FixtureTargetProofObservation>;
  rollback(): Promise<void>;
}>;

export type Task551FixtureTargetClient = Readonly<{
  beginReadOnlyTransaction(): Promise<Task551FixtureTargetReadOnlyTransaction>;
}>;

function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

function assertExactOwnKeys(value: Readonly<Record<string, unknown>>): void {
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== TASK551_FIXTURE_TARGET_CHILD_KEYS.length ||
    !ownKeys.every((key) => typeof key === "string") ||
    !TASK551_FIXTURE_TARGET_CHILD_KEYS.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key)
    )
  ) {
    invalid();
  }

  const expected = new Set<string>(TASK551_FIXTURE_TARGET_CHILD_KEYS);
  if (ownKeys.some((key) => typeof key === "string" && !expected.has(key))) {
    invalid();
  }
  for (const key of ownKeys) {
    if (typeof key !== "string") invalid();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      invalid();
    }
  }
}

function assertStrictString(value: unknown): string {
  if (typeof value !== "string") {
    invalid();
  }
  return value;
}

function assertFixtureUrl(value: string): string {
  const byteLength = new TextEncoder().encode(value).byteLength;
  if (value.length === 0 || byteLength > 4096) {
    invalid();
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint < 32 || codePoint === 127)) {
      invalid();
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    invalid();
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    invalid();
  }
  if (parsed.hash !== "" || (parsed.search !== "" && parsed.search !== "?sslmode=require")) {
    invalid();
  }
  if (parsed.hostname === "" || parsed.username === "" || parsed.pathname.length < 2) {
    invalid();
  }
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(parsed.pathname);
  } catch {
    invalid();
  }
  if (
    parsed.pathname !== `/${TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME}` ||
    decodedPathname !== `/${TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME}` ||
    decodedPathname.slice(1).includes("/")
  ) {
    invalid();
  }

  const authority = value.slice(value.indexOf("://") + 3).split(/[/?#]/u, 1)[0] ?? "";
  if ((authority.match(/@/gu) ?? []).length !== 1 || authority.includes(",")) {
    invalid();
  }

  let decodedUsername: string;
  let decodedPassword: string;
  try {
    decodedUsername = decodeURIComponent(parsed.username);
    decodedPassword = decodeURIComponent(parsed.password);
  } catch {
    invalid();
  }
  if (
    decodedUsername === "" ||
    /[,/@?#]/u.test(decodedUsername) ||
    /[,/@?#]/u.test(decodedPassword)
  ) {
    invalid();
  }

  return value;
}

function assertSentinel(value: string): string {
  const byteLength = new TextEncoder().encode(value).byteLength;
  if (byteLength < 32 || byteLength > 512 || value.includes("\u0000")) {
    invalid();
  }
  return value;
}

export function assertTask551FixtureTargetChildKeys(
  value: Readonly<Record<string, unknown>>
): Task551FixtureTargetChildValues {
  if (value === null || typeof value !== "object") {
    invalid();
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) {
    invalid();
  }
  assertExactOwnKeys(value);

  const databaseName = assertStrictString(value.TASK551_FIXTURE_DATABASE_NAME);
  if (databaseName !== TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME) {
    invalid();
  }
  const url = assertFixtureUrl(assertStrictString(value.TASK551_FIXTURE_DATABASE_URL));
  const sentinel = assertSentinel(assertStrictString(value.TASK551_FIXTURE_DATABASE_SENTINEL));

  return Object.freeze({
    TASK551_FIXTURE_DATABASE_URL: url,
    TASK551_FIXTURE_DATABASE_NAME: TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME,
    TASK551_FIXTURE_DATABASE_SENTINEL: sentinel,
  });
}

export function parseTask551FixtureTarget(
  value: Readonly<Record<string, unknown>>
): Task551FixtureTarget {
  const childValues = assertTask551FixtureTargetChildKeys(value);
  return Object.freeze({
    url: childValues.TASK551_FIXTURE_DATABASE_URL,
    expectedDatabaseName: childValues.TASK551_FIXTURE_DATABASE_NAME,
    sentinel: childValues.TASK551_FIXTURE_DATABASE_SENTINEL,
  });
}

async function readTargetProof(
  target: Task551FixtureTarget,
  client: Task551FixtureTargetClient
): Promise<Task551FixtureTargetProof> {
  let transaction: Task551FixtureTargetReadOnlyTransaction | undefined;
  let rollbackError = false;
  try {
    transaction = await client.beginReadOnlyTransaction();
    const observation = await transaction.readFixtureTargetProof({
      expectedDatabaseName: TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME,
      expectedSentinel: target.sentinel,
      marker: "task551-baseline-v1",
      sentinelTable: "public.task551_fixture_sentinel",
    });
    if (
      observation.currentDatabaseMatched !== true ||
      observation.markerCount !== 1 ||
      observation.boundSentinelByteMatched !== true
    ) {
      invalid();
    }
  } catch {
    invalid();
  } finally {
    if (transaction !== undefined) {
      try {
        await transaction.rollback();
      } catch {
        rollbackError = true;
      }
    }
  }
  if (rollbackError) {
    invalid();
  }
  return {
    rolledBack: true,
    currentDatabaseMatched: true,
    exactSingleMarkerMatched: true,
    boundSentinelByteMatched: true,
  };
}

export function assertTask551FixtureTarget(
  target: Task551FixtureTarget,
  client: Task551FixtureTargetClient
): Promise<Task551FixtureTargetProof> {
  return readTargetProof(target, client);
}

export function assertTask551FixtureTargetPostCleanup(
  target: Task551FixtureTarget,
  client: Task551FixtureTargetClient
): Promise<Task551FixtureTargetProof> {
  return readTargetProof(target, client);
}
