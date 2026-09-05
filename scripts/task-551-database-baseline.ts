import { createHash } from "node:crypto";
import {
  assertTask551FixtureTargetChildKeys,
  parseTask551FixtureTarget,
  TASK551_FIXTURE_TARGET_CHILD_KEYS,
  type Task551FixtureTargetChildValues,
} from "./task551DatabaseBaseline/fixtureTarget";
import {
  canonicalizeTask551Rfc8785,
  parseCanonicalTask551BaselineCheckStdout,
  resolveTask551ExecutableScenarioSelector,
  type Task551BaselineCheckSuccessRecord,
  type Task551CanonicalSelector,
} from "./task551DatabaseBaseline/digestContract";
import {
  runTask551DatabaseBaseline,
  type Task551DatabaseBaselineRunDeps,
  type Task551DatabaseBaselineRunResult,
  type Task551ReviewedPairWriteResult,
} from "./task551DatabaseBaseline/runner";
import { openTask551PostgresTransport } from "./task551DatabaseBaseline/postgresTransport";
import { TASK551_SCENARIOS, type ScaleProfile } from "../tests/perf/fixtures/task551DatabaseScale";

export const FROZEN_INVALID_CODE = "database_baseline_invalid" as const;
export const TASK551_CLI_ENV_FILE_ARGUMENT = "--env-file=/dev/null" as const;

type Task551CliMode = "freeze" | "check";
type Task551CliSelection = Readonly<{
  mode: Task551CliMode;
  profile: ScaleProfile;
  selector: Task551CanonicalSelector;
}>;

type Task551CliProcessEnvironment = Readonly<Record<string, string | undefined>>;
export type Task551CliOutput = Readonly<{
  stdout: (value: string) => void;
  stderr: (value: string) => void;
}>;
export type Task551CliResult =
  | Readonly<{
      exitCode: 0;
      record: Task551BaselineCheckSuccessRecord;
      writeResult?: never;
    }>
  | Readonly<{
      exitCode: 0;
      record?: never;
      writeResult: Task551ReviewedPairWriteResult;
    }>
  | Readonly<{
      exitCode: 1;
      record?: never;
      writeResult?: never;
    }>;

function failInvalid(): never {
  throw new Error(FROZEN_INVALID_CODE);
}

const TASK551_CLI_OS_TRANSPORT_KEY_NAMES = ["PATH", "TMPDIR", "LANG", "LC_ALL", "TZ"] as const;
const TASK551_CLI_CHILD_TRANSPORT_KEY_NAMES = new Set<string>([
  ...TASK551_FIXTURE_TARGET_CHILD_KEYS,
  ...TASK551_CLI_OS_TRANSPORT_KEY_NAMES,
]);
const TASK551_CLI_FIXTURE_KEY_SET = new Set<string>(TASK551_FIXTURE_TARGET_CHILD_KEYS);

function isDataPropertyDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor & { value: unknown } {
  return (
    descriptor !== undefined &&
    descriptor.enumerable === true &&
    Object.prototype.hasOwnProperty.call(descriptor, "value") &&
    descriptor.get === undefined &&
    descriptor.set === undefined
  );
}

function snapshotL11InjectedFixtureTargetForCli(
  childProcessEnvironment: Task551CliProcessEnvironment
): Task551FixtureTargetChildValues {
  if (childProcessEnvironment === null || typeof childProcessEnvironment !== "object")
    failInvalid();
  const prototype = Object.getPrototypeOf(childProcessEnvironment);
  if (prototype !== null && prototype !== Object.prototype) failInvalid();

  const names = Reflect.ownKeys(childProcessEnvironment);
  const stringNames = names.filter((name): name is string => typeof name === "string");
  if (
    names.length < TASK551_FIXTURE_TARGET_CHILD_KEYS.length ||
    names.length > TASK551_CLI_CHILD_TRANSPORT_KEY_NAMES.size ||
    stringNames.length !== names.length ||
    stringNames.some((name) => !TASK551_CLI_CHILD_TRANSPORT_KEY_NAMES.has(name)) ||
    TASK551_FIXTURE_TARGET_CHILD_KEYS.some((name) => !stringNames.includes(name))
  ) {
    failInvalid();
  }

  const fixtureDescriptors: Partial<
    Record<(typeof TASK551_FIXTURE_TARGET_CHILD_KEYS)[number], PropertyDescriptor>
  > = {};
  for (const name of names) {
    if (typeof name !== "string") failInvalid();
    const descriptor = Object.getOwnPropertyDescriptor(childProcessEnvironment, name);
    if (!isDataPropertyDescriptor(descriptor)) failInvalid();
    if (TASK551_CLI_FIXTURE_KEY_SET.has(name)) {
      fixtureDescriptors[name as (typeof TASK551_FIXTURE_TARGET_CHILD_KEYS)[number]] = descriptor;
    }
  }

  const readFixtureValue = (name: (typeof TASK551_FIXTURE_TARGET_CHILD_KEYS)[number]): string => {
    const descriptor = fixtureDescriptors[name];
    if (!isDataPropertyDescriptor(descriptor)) failInvalid();
    const value = descriptor.value;
    if (typeof value !== "string") failInvalid();
    return value;
  };

  return assertTask551FixtureTargetChildKeys({
    TASK551_FIXTURE_DATABASE_URL: readFixtureValue("TASK551_FIXTURE_DATABASE_URL"),
    TASK551_FIXTURE_DATABASE_NAME: readFixtureValue("TASK551_FIXTURE_DATABASE_NAME") as "coderso02",
    TASK551_FIXTURE_DATABASE_SENTINEL: readFixtureValue("TASK551_FIXTURE_DATABASE_SENTINEL"),
  });
}

function parseCliSelection(argv: readonly string[]): Task551CliSelection {
  const mode = argv[0];
  const profile = argv[2];
  if (argv.length < 4 || (mode !== "--freeze" && mode !== "--check") || argv[1] !== "--profile")
    failInvalid();
  if (profile !== "small" && profile !== "large") failInvalid();
  const selectedMode: Task551CliMode = mode === "--freeze" ? "freeze" : "check";
  if (argv[3] === "--all" && argv.length === 4)
    return { mode: selectedMode, profile, selector: { kind: "all" } };
  if (
    argv[3] === "--scenario" &&
    argv.length === 5 &&
    typeof argv[4] === "string" &&
    argv[4].length > 0
  ) {
    return { mode: selectedMode, profile, selector: { kind: "scenario", id: argv[4] } };
  }
  return failInvalid();
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function isTask551BaselineCheckSuccessRecord(
  value: Task551DatabaseBaselineRunResult
): value is Task551BaselineCheckSuccessRecord {
  return value !== undefined && isPlainObject(value) && "mode" in value && value.mode === "check";
}

function isTask551ReviewedPairWriteResult(
  value: Task551DatabaseBaselineRunResult
): value is Task551ReviewedPairWriteResult {
  if (!isPlainObject(value)) return false;
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== 2 ||
    keys.some(
      (key) => typeof key !== "string" || (key !== "committed" && key !== "cleanupFailures")
    ) ||
    !("committed" in value) ||
    value.committed !== true ||
    !("cleanupFailures" in value) ||
    !Array.isArray(value.cleanupFailures)
  )
    return false;
  return value.cleanupFailures.every((failure) => {
    if (!isPlainObject(failure)) return false;
    const failureKeys = Reflect.ownKeys(failure);
    return (
      failureKeys.length === 1 &&
      failureKeys[0] === "kind" &&
      (failure.kind === "temporary-unlink" || failure.kind === "lock-release")
    );
  });
}

export async function runTask551DatabaseBaselineMain(
  argv: readonly string[],
  fixtureTargetSubmap: Task551FixtureTargetChildValues,
  deps: Task551DatabaseBaselineRunDeps,
  output: Task551CliOutput
): Promise<Task551CliResult> {
  try {
    const selection = parseCliSelection(argv);
    resolveTask551ExecutableScenarioSelector(selection.selector, TASK551_SCENARIOS);
    const target = parseTask551FixtureTarget(fixtureTargetSubmap);
    const result = await runTask551DatabaseBaseline(
      {
        mode: selection.mode,
        profile: selection.profile,
        selector: selection.selector,
        target,
        scenarios: TASK551_SCENARIOS,
      },
      { ...deps, sha256Bytes: deps.sha256Bytes ?? sha256Bytes }
    );
    if (selection.mode === "check") {
      if (!isTask551BaselineCheckSuccessRecord(result)) failInvalid();
      const line = new TextDecoder().decode(canonicalizeTask551Rfc8785(result));
      parseCanonicalTask551BaselineCheckStdout(`${line}\n`);
      output.stdout(`${line}\n`);
      return { exitCode: 0, record: result };
    }
    if (!isTask551ReviewedPairWriteResult(result)) failInvalid();
    return { exitCode: 0, writeResult: result };
  } catch {
    output.stderr(`${FROZEN_INVALID_CODE}\n`);
    return { exitCode: 1 };
  }
}

async function runCliEntryFromL11ChildProcess(
  childArgv: readonly string[],
  childProcessEnvironment: Task551CliProcessEnvironment,
  output: Task551CliOutput
): Promise<Task551CliResult> {
  const fixtureTargetSubmap = snapshotL11InjectedFixtureTargetForCli(childProcessEnvironment);
  const profile = childArgv[2];
  if (profile !== "small" && profile !== "large") failInvalid();
  const deps: Task551DatabaseBaselineRunDeps = {
    openTransport: (target) => openTask551PostgresTransport(target, profile),
  };
  return runTask551DatabaseBaselineMain(childArgv, fixtureTargetSubmap, deps, output);
}

async function runCliEntryWithCanonicalFailure(
  childArgv: readonly string[],
  childProcessEnvironment: Task551CliProcessEnvironment,
  output: Task551CliOutput
): Promise<Task551CliResult> {
  try {
    return await runCliEntryFromL11ChildProcess(childArgv, childProcessEnvironment, output);
  } catch {
    output.stderr(`${FROZEN_INVALID_CODE}\n`);
    return { exitCode: 1 };
  }
}

if (import.meta.main) {
  const childArgv = process.argv.slice(2);
  const childProcessEnvironment = process.env as Task551CliProcessEnvironment;
  void runCliEntryWithCanonicalFailure(childArgv, childProcessEnvironment, {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  }).then((result) => {
    process.exitCode = result.exitCode;
  });
}
