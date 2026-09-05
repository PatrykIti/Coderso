import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
const it = test;
import {
  runTask551DatabaseBaselineMain,
  type Task551CliResult,
} from "../../../scripts/task-551-database-baseline";
import {
  buildTask551ContractDigestInput,
  buildTask551FixtureDigestInput,
  canonicalizeTask551Rfc8785,
  computeTask551ContractDigest,
  computeTask551FixtureDigest,
  computeTask551ReviewableReceiptDigest,
  computeTask551RunnerDigest,
  computeTask551SchemaDigest,
  parseCanonicalTask551BaselineCheckStdout,
  TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION,
  TASK551_RUNNER_DIGEST_SOURCE_PATHS,
  type Task551ReviewableFreezeReceiptV1,
} from "../../../scripts/task551DatabaseBaseline/digestContract";
import {
  assertTask551FixtureTarget,
  assertTask551FixtureTargetChildKeys,
  assertTask551FixtureTargetPostCleanup,
  parseTask551FixtureTarget,
  TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME,
  type Task551FixtureTargetClient,
  type Task551FixtureTargetChildValues,
  type Task551FixtureTargetProofObservation,
} from "../../../scripts/task551DatabaseBaseline/fixtureTarget";
import type {
  Task551DatabaseBaselineRunDeps,
  Task551DatabaseTargetTransport,
  Task551ReviewedPairWriteResult,
  Task551ScenarioMeasurement,
} from "../../../scripts/task551DatabaseBaseline/runner";
import {
  MEASUREMENT,
  TASK551_SCENARIO_MANIFEST_VERSION,
  TASK551_SCENARIOS,
  TASK551_SCALE_COUNTS,
  TASK551_SCALE_DISTRIBUTIONS,
} from "../fixtures/task551DatabaseScale";
import {
  TASK551_ADMIN_READ_PLANNED_IDS,
  TASK551_ADMIN_READ_STATEMENT_SHAPES,
} from "../fixtures/task551AdminReadStatementShapes";
import {
  TASK551_DATABASE_BUDGETS,
  TASK551_POOL_WAIT_BUDGETS,
} from "../fixtures/task551DatabaseBudgets";
import {
  installTask551ActiveGenerationMemoryStateForFocusedTest,
  resetTask551ActiveGenerationFilesystemForFocusedTest,
} from "../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationStore";
import { makeTask551ActiveGenerationStateV2 } from "./freezeCandidateGenerationTestHelpers";
import { fakeSha256, makeReceipt, validTask551SourceHashes } from "./contractTestHelpers";
const childValues = {
  TASK551_FIXTURE_DATABASE_URL:
    "postgres://fixture_user:fixture_password@127.0.0.1/coderso02?sslmode=require",
  TASK551_FIXTURE_DATABASE_NAME: TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME,
  TASK551_FIXTURE_DATABASE_SENTINEL: "s".repeat(32),
} as const;
const target = parseTask551FixtureTarget(childValues);
const validArgv = ["--check", "--profile", "small", "--scenario", "admin-pages-page"] as const;

function mainStaticDigests(sourceHashes: Readonly<Record<string, string>>): Readonly<{
  contractDigest: string;
  fixtureDigest: string;
  schemaDigest: string;
  runnerDigest: string;
}> {
  return {
    contractDigest: computeTask551ContractDigest(
      buildTask551ContractDigestInput({
        plannedIds: TASK551_ADMIN_READ_PLANNED_IDS,
        shapes: TASK551_ADMIN_READ_STATEMENT_SHAPES,
        measurement: MEASUREMENT,
      }),
      fakeSha256
    ),
    fixtureDigest: computeTask551FixtureDigest(
      buildTask551FixtureDigestInput({
        manifestVersion: TASK551_SCENARIO_MANIFEST_VERSION,
        scenarios: TASK551_SCENARIOS,
        scaleCounts: TASK551_SCALE_COUNTS,
        distributions: TASK551_SCALE_DISTRIBUTIONS,
      }),
      fakeSha256
    ),
    schemaDigest: computeTask551SchemaDigest(
      TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION,
      fakeSha256
    ),
    runnerDigest: computeTask551RunnerDigest(sourceHashes, fakeSha256),
  };
}

function mainReviewedReceipt(
  profile: "small" | "large",
  sourceHashes: Readonly<Record<string, string>>
): Task551ReviewableFreezeReceiptV1 {
  const digests = mainStaticDigests(sourceHashes);
  const { reviewableReceiptDigest: _ignored, ...withoutDigest } = {
    ...makeReceipt(profile, "reviewed"),
    ...digests,
  };
  return {
    ...withoutDigest,
    reviewableReceiptDigest: computeTask551ReviewableReceiptDigest(withoutDigest, fakeSha256),
  } as Task551ReviewableFreezeReceiptV1;
}

function mainMeasurement(
  profile: "small" | "large",
  receipt: Task551ReviewableFreezeReceiptV1
): Task551ScenarioMeasurement {
  return {
    statementCeilings: TASK551_ADMIN_READ_PLANNED_IDS.map(
      (id) => TASK551_DATABASE_BUDGETS[id]![profile]
    ),
    poolWaitCeiling: TASK551_POOL_WAIT_BUDGETS[profile],
    calibrationMedianMs: receipt.calibration.medianMs,
    p95Repetitions: [1, 1, 1],
    runtimeContext: {
      provenanceCommit: receipt.provenanceCommit,
      platform: receipt.platform,
      arch: receipt.arch,
      cpuModel: receipt.cpuModel,
      logicalCpus: receipt.logicalCpus,
      memoryMb: receipt.memoryMb,
      postgresMajor: receipt.postgresMajor,
      postgresConfigDigest: receipt.postgresConfigDigest,
      bunVersion: receipt.bunVersion,
      poolCapacity: receipt.poolCapacity,
      containerMode: receipt.containerMode,
      scopeDigest: receipt.scopeDigest,
    },
  };
}

type MainExecution = Readonly<{
  result: Task551CliResult;
  stdout: string;
  stderr: string;
  opened: number;
  events: readonly string[];
  writeResults: readonly Task551ReviewedPairWriteResult[];
}>;

async function executeMain(): Promise<MainExecution> {
  const sourceHashes = validTask551SourceHashes(TASK551_RUNNER_DIGEST_SOURCE_PATHS);
  const reviewedReceipts = {
    small: mainReviewedReceipt("small", sourceHashes),
    large: mainReviewedReceipt("large", sourceHashes),
  } as const;
  // The runner reads its reviewed pair only from the private active-generation
  // store, so the focused install provides the durable reviewed state.
  installTask551ActiveGenerationMemoryStateForFocusedTest(
    makeTask551ActiveGenerationStateV2("reviewed", reviewedReceipts.small, reviewedReceipts.large)
  );
  try {
    return await runMainWithInstalledState(reviewedReceipts);
  } finally {
    resetTask551ActiveGenerationFilesystemForFocusedTest();
  }
}

async function runMainWithInstalledState(reviewedReceipts: {
  small: Task551ReviewableFreezeReceiptV1;
  large: Task551ReviewableFreezeReceiptV1;
}): Promise<MainExecution> {
  const events: string[] = [];
  const writeResults: Task551ReviewedPairWriteResult[] = [];
  let opened = 0;
  const client = {
    beginReadOnlyTransaction: async () => ({
      readFixtureTargetProof: async (input: Readonly<Record<string, unknown>>) => {
        expect(input).toEqual({
          expectedDatabaseName: "coderso02",
          expectedSentinel: childValues.TASK551_FIXTURE_DATABASE_SENTINEL,
          marker: "task551-baseline-v1",
          sentinelTable: "public.task551_fixture_sentinel",
        });
        events.push("proof");
        return { currentDatabaseMatched: true, markerCount: 1, boundSentinelByteMatched: true };
      },
      rollback: async () => {
        events.push("rollback");
      },
    }),
  };
  const transport: Task551DatabaseTargetTransport = {
    client,
    close: async () => {
      events.push("close");
    },
    executeScenario: async () => {
      events.push("execute");
    },
    measureScenario: async ({ profile }) => {
      events.push("measure");
      return mainMeasurement(profile, reviewedReceipts[profile]);
    },
    cleanupScenario: async () => {
      events.push("cleanup");
    },
  };
  const deps: Task551DatabaseBaselineRunDeps = {
    sha256Bytes: fakeSha256,
    sourceHashes: validTask551SourceHashes(TASK551_RUNNER_DIGEST_SOURCE_PATHS),
    openTransport: async (actualTarget) => {
      expect(actualTarget).toEqual(target);
      opened += 1;
      return transport;
    },
    buildCandidateReceipt: async ({ profile }) => makeReceipt(profile),
    onReviewedPairWriteResult: (result) => {
      writeResults.push(result);
    },
  };
  let stdout = "";
  let stderr = "";
  const result = await runTask551DatabaseBaselineMain(validArgv, childValues, deps, {
    stdout: (value) => {
      stdout += value;
    },
    stderr: (value) => {
      stderr += value;
    },
  });
  return { result, stdout, stderr, opened, events, writeResults };
}

type FakeClientOptions = Readonly<{
  observation?: Task551FixtureTargetProofObservation;
  beginFailure?: boolean;
  readFailure?: boolean;
  rollbackFailure?: boolean;
}>;

type FakeClientState = {
  beginCalls: number;
  readCalls: number;
  rollbackCalls: number;
  rolledBack: boolean;
};

function fakeClient(options: FakeClientOptions = {}): {
  client: Task551FixtureTargetClient;
  state: FakeClientState;
} {
  const state: FakeClientState = {
    beginCalls: 0,
    readCalls: 0,
    rollbackCalls: 0,
    rolledBack: false,
  };
  const client: Task551FixtureTargetClient = {
    beginReadOnlyTransaction: async () => {
      state.beginCalls += 1;
      if (options.beginFailure) throw new Error("fake begin failure");
      return {
        readFixtureTargetProof: async (input) => {
          expect(input).toEqual({
            expectedDatabaseName: "coderso02",
            expectedSentinel: childValues.TASK551_FIXTURE_DATABASE_SENTINEL,
            marker: "task551-baseline-v1",
            sentinelTable: "public.task551_fixture_sentinel",
          });
          state.readCalls += 1;
          if (options.readFailure) throw new Error("fake read failure");
          return (
            options.observation ?? {
              currentDatabaseMatched: true,
              markerCount: 1,
              boundSentinelByteMatched: true,
            }
          );
        },
        rollback: async () => {
          state.rollbackCalls += 1;
          if (options.rollbackFailure) throw new Error("fake rollback failure");
          state.rolledBack = true;
        },
      };
    },
  };
  return { client, state };
}

function withOwnDescriptor(
  value: Record<string, unknown>,
  key: string,
  descriptor: PropertyDescriptor
): Record<string, unknown> {
  Object.defineProperty(value, key, descriptor);
  return value;
}

async function runInvalidMainTarget(
  targetInput: object
): Promise<{ opened: number; stdout: string; stderr: string; exitCode: 0 | 1 }> {
  let opened = 0;
  let stdout = "";
  let stderr = "";
  const result = await runTask551DatabaseBaselineMain(
    validArgv,
    targetInput as Task551FixtureTargetChildValues,
    {
      openTransport: async () => {
        opened += 1;
        throw new Error("openTransport must not run");
      },
    },
    {
      stdout: (value) => {
        stdout += value;
      },
      stderr: (value) => {
        stderr += value;
      },
    }
  );
  return { opened, stdout, stderr, exitCode: result.exitCode };
}

describe("TASK-551 L02 fixture target seam", () => {
  it("is import-safe and keeps the guarded environment boundary in the allowed sources", () => {
    const fixtureSource = readFileSync(
      new URL("../../../scripts/task551DatabaseBaseline/fixtureTarget.ts", import.meta.url),
      "utf8"
    );
    const cliSource = readFileSync(
      new URL("../../../scripts/task-551-database-baseline.ts", import.meta.url),
      "utf8"
    );
    const runnerSource = readFileSync(
      new URL("../../../scripts/task551DatabaseBaseline/runner.ts", import.meta.url),
      "utf8"
    );

    expect(fixtureSource).toContain("Reflect.ownKeys");
    expect(fixtureSource).toContain("getOwnPropertyDescriptor");
    expect(fixtureSource).not.toMatch(
      /process\.env|Bun\.env|from ["']postgres["']|dotenv|readFileSync|db\/client/u
    );
    expect(cliSource).not.toContain("dotenv");
    expect(cliSource).toContain("Reflect.ownKeys(childProcessEnvironment)");
    expect(cliSource).toContain("Object.getOwnPropertyDescriptor(childProcessEnvironment, name)");
    expect(cliSource).not.toContain("Object.keys(childProcessEnvironment)");
    expect(cliSource).not.toContain("childProcessEnvironment[name]");
    expect(cliSource).not.toContain(
      'Object.getOwnPropertyDescriptor(childProcessEnvironment, "PATH")'
    );
    expect(cliSource).not.toMatch(
      /export (?:async )?function snapshotL11InjectedFixtureTargetForCli/u
    );
    expect(cliSource).not.toMatch(/export (?:async )?function runCliEntryFromL11ChildProcess/u);
    expect(cliSource).toContain("if (import.meta.main)");
    expect(cliSource).toContain(
      "const childProcessEnvironment = process.env as Task551CliProcessEnvironment"
    );
    expect(cliSource.match(/process\.env/gu) ?? []).toHaveLength(1);
    expect(cliSource.match(/process\.argv/gu)?.length).toBe(1);
    expect(runnerSource).not.toContain("defaultExecuteScenario");
    expect(runnerSource).not.toContain("defaultCleanupScenario");
    expect(runnerSource.indexOf("await lifecycle.measureScenario")).toBeLessThan(
      runnerSource.indexOf("await lifecycle.cleanupScenario")
    );
  });

  it("accepts only allowlisted OS names without reading, copying, or passing their values", () => {
    const cliSource = readFileSync(
      new URL("../../../scripts/task-551-database-baseline.ts", import.meta.url),
      "utf8"
    );
    const snapshotStart = cliSource.indexOf("function snapshotL11InjectedFixtureTargetForCli");
    const snapshotEnd = cliSource.indexOf("\nfunction parseCliSelection", snapshotStart);
    expect(snapshotStart).toBeGreaterThanOrEqual(0);
    expect(snapshotEnd).toBeGreaterThan(snapshotStart);
    const snapshotSource = cliSource.slice(snapshotStart, snapshotEnd);
    const allowedOsNames = ["PATH", "TMPDIR", "LANG", "LC_ALL", "TZ"] as const;

    expect(cliSource).toContain("...TASK551_CLI_OS_TRANSPORT_KEY_NAMES");
    expect(snapshotSource).toContain("const names = Reflect.ownKeys(childProcessEnvironment)");
    expect(
      snapshotSource.indexOf("const names = Reflect.ownKeys(childProcessEnvironment)")
    ).toBeLessThan(snapshotSource.indexOf("Object.getOwnPropertyDescriptor"));
    for (const name of allowedOsNames) {
      expect(cliSource).toContain(`"${name}"`);
    }
    expect(snapshotSource).not.toMatch(/childProcessEnvironment\s*\[/u);
    expect(snapshotSource).not.toContain("...childProcessEnvironment");
    expect(snapshotSource).not.toMatch(/return\s+childProcessEnvironment/u);
    expect(snapshotSource).toContain("const value = descriptor.value");
    expect(snapshotSource).not.toMatch(/(?:PATH|TMPDIR|LANG|LC_ALL|TZ)\s*:/u);
    expect(snapshotSource).toContain("return assertTask551FixtureTargetChildKeys({");
    expect(snapshotSource).toContain("TASK551_FIXTURE_DATABASE_URL: readFixtureValue");
    expect(snapshotSource).toContain("TASK551_FIXTURE_DATABASE_NAME: readFixtureValue");
    expect(snapshotSource).toContain("TASK551_FIXTURE_DATABASE_SENTINEL: readFixtureValue");
  });

  it("rejects generic, DB3, bootstrap, OS, and unknown child keys before target parsing", async () => {
    const invalidChildKeys = [
      ["DATABASE_URL3", "postgres://db3.invalid/coderso02"],
      ["DATABASE_URL", "postgres://generic.invalid/coderso02"],
      ["DATABASE_DIRECT_URL", "postgres://direct.invalid/coderso02"],
      ["TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL", "postgres://bootstrap.invalid/coderso02"],
      ["PATH", "/poison"],
      ["TASK551_EXTRA", "poison"],
    ] as const;

    for (const [key, value] of invalidChildKeys) {
      const result = await runInvalidMainTarget({ ...childValues, [key]: value });
      expect(result).toEqual({
        opened: 0,
        stdout: "",
        stderr: "database_baseline_invalid\n",
        exitCode: 1,
      });
    }
  });

  it("strictly validates direct fixture keys, own data descriptors, and values", () => {
    expect(assertTask551FixtureTargetChildKeys(childValues)).toEqual(childValues);
    const malformed: readonly Record<string, unknown>[] = [
      { ...childValues, DATABASE_URL: "poison" },
      { ...childValues, TASK551_FIXTURE_DATABASE_NAME: "other" },
      { ...childValues, TASK551_FIXTURE_DATABASE_SENTINEL: "short" },
      { ...childValues, TASK551_FIXTURE_DATABASE_URL: undefined },
      { ...childValues, TASK551_FIXTURE_DATABASE_NAME: 1 },
      { ...childValues, TASK551_FIXTURE_DATABASE_SENTINEL: null },
      {
        TASK551_FIXTURE_DATABASE_NAME: childValues.TASK551_FIXTURE_DATABASE_NAME,
        TASK551_FIXTURE_DATABASE_SENTINEL: childValues.TASK551_FIXTURE_DATABASE_SENTINEL,
      },
    ];
    for (const value of malformed)
      expect(() => assertTask551FixtureTargetChildKeys(value)).toThrow("database_baseline_invalid");

    const nonEnumerable = withOwnDescriptor({ ...childValues }, "TASK551_FIXTURE_DATABASE_URL", {
      value: childValues.TASK551_FIXTURE_DATABASE_URL,
      enumerable: false,
      configurable: true,
      writable: true,
    });
    expect(() => assertTask551FixtureTargetChildKeys(nonEnumerable)).toThrow(
      "database_baseline_invalid"
    );

    const accessor = { ...childValues };
    Object.defineProperty(accessor, "TASK551_FIXTURE_DATABASE_URL", {
      get: () => childValues.TASK551_FIXTURE_DATABASE_URL,
      enumerable: true,
      configurable: true,
    });
    expect(() => assertTask551FixtureTargetChildKeys(accessor)).toThrow(
      "database_baseline_invalid"
    );

    const symbolValue = { ...childValues, [Symbol("unknown")]: "poison" };
    expect(() => assertTask551FixtureTargetChildKeys(symbolValue)).toThrow(
      "database_baseline_invalid"
    );
    const inherited = Object.create({ inherited: "poison" }) as Record<string, unknown>;
    Object.assign(inherited, childValues);
    expect(() => assertTask551FixtureTargetChildKeys(inherited)).toThrow(
      "database_baseline_invalid"
    );
  });

  it("rejects malformed URLs and target names before any client can be used", () => {
    const invalidUrls = [
      "",
      "http://fixture_user:fixture_password@127.0.0.1/coderso02",
      "postgres://fixture_user:fixture_password@127.0.0.1/",
      "postgres://fixture_user:fixture_password@127.0.0.1/coderso02?x=1",
      "postgres://fixture_user:fixture_password@127.0.0.1/coderso02/extra",
      "postgres://fixture_user:fixture_password@127.0.0.1/coderso03",
      "postgres://fixture_user:fixture_password@127.0.0.1/%63oderso02",
      "postgres://fixture_user:fixture_password@127.0.0.1/coderso02%2Fextra",
      "postgres://fixture_user:fixture_password@127.0.0.1/%E2%98%83",
      "postgres://fixture_user:fixture_password@127.0.0.1/coderso02%F0%80%80%80",
    ];
    for (const url of invalidUrls)
      expect(() =>
        parseTask551FixtureTarget({ ...childValues, TASK551_FIXTURE_DATABASE_URL: url })
      ).toThrow("database_baseline_invalid");
    const urlPrefix = "postgres://fixture_user:";
    const urlSuffix = "@127.0.0.1/coderso02";
    const asciiBudget = 4096 - urlPrefix.length - urlSuffix.length;
    const multibyteUrl = `${urlPrefix}${"é".repeat(Math.floor(asciiBudget / 2) + 1)}${urlSuffix}`;
    expect(multibyteUrl.length).toBeLessThanOrEqual(4096);
    expect(new TextEncoder().encode(multibyteUrl).byteLength).toBeGreaterThan(4096);
    expect(() =>
      parseTask551FixtureTarget({ ...childValues, TASK551_FIXTURE_DATABASE_URL: multibyteUrl })
    ).toThrow("database_baseline_invalid");
    expect(() =>
      parseTask551FixtureTarget({ ...childValues, TASK551_FIXTURE_DATABASE_NAME: "coderso03" })
    ).toThrow("database_baseline_invalid");
    expect(() =>
      parseTask551FixtureTarget({
        ...childValues,
        TASK551_FIXTURE_DATABASE_SENTINEL: "\u0000".repeat(32),
      })
    ).toThrow("database_baseline_invalid");
  });

  it("rejects an invalid caller-built runner target before opening an injected transport", async () => {
    let opened = 0;
    await expect(
      runTask551DatabaseBaselineMain(
        validArgv,
        {
          ...childValues,
          TASK551_FIXTURE_DATABASE_URL:
            "postgres://fixture_user:fixture_password@127.0.0.1/%63oderso02",
        },
        {
          openTransport: async () => {
            opened += 1;
            throw new Error("must not open");
          },
        },
        { stdout: () => {}, stderr: () => {} }
      )
    ).resolves.toEqual({ exitCode: 1 });
    expect(opened).toBe(0);
  });

  it("frames an injected check result without spawning the guarded CLI or opening a database", async () => {
    const sourceHashes = validTask551SourceHashes(TASK551_RUNNER_DIGEST_SOURCE_PATHS);
    const expectedDigests = mainStaticDigests(sourceHashes);
    const expectedReviewedReceipt = mainReviewedReceipt("small", sourceHashes);

    const check = await executeMain();
    expect(check.result.exitCode).toBe(0);
    const checkRecord = parseCanonicalTask551BaselineCheckStdout(check.stdout);
    expect(check.result).toEqual({ exitCode: 0, record: checkRecord });
    expect(check.stdout).toBe(
      `${new TextDecoder().decode(canonicalizeTask551Rfc8785(checkRecord))}\n`
    );
    expect(check.stderr).toBe("");
    expect(check.opened).toBe(1);
    expect(check.events).toEqual([
      "proof",
      "rollback",
      "execute",
      "measure",
      "cleanup",
      "proof",
      "rollback",
      "close",
    ]);
    expect(check.writeResults).toEqual([]);
    expect(checkRecord).toMatchObject({
      schema: "coderso.task551.database-baseline-check@v1",
      taskId: "TASK-551-01-L02",
      mode: "check",
      profile: "small",
      pass: true,
      fixtureTargetPreflight: {
        rolledBack: true,
        currentDatabaseMatched: true,
        exactSingleMarkerMatched: true,
        boundSentinelByteMatched: true,
      },
      ...expectedDigests,
      reviewableReceiptDigest: expectedReviewedReceipt.reviewableReceiptDigest,
    });
    for (const secret of Object.values(childValues)) expect(check.stdout).not.toContain(secret);
  });

  it("proves the target through a rolled-back injected transaction", async () => {
    const setup = fakeClient();
    await expect(assertTask551FixtureTarget(target, setup.client)).resolves.toEqual({
      rolledBack: true,
      currentDatabaseMatched: true,
      exactSingleMarkerMatched: true,
      boundSentinelByteMatched: true,
    });
    await expect(assertTask551FixtureTargetPostCleanup(target, setup.client)).resolves.toEqual({
      rolledBack: true,
      currentDatabaseMatched: true,
      exactSingleMarkerMatched: true,
      boundSentinelByteMatched: true,
    });
    expect(setup.state).toEqual({
      beginCalls: 2,
      readCalls: 2,
      rollbackCalls: 2,
      rolledBack: true,
    });
  });

  it("fails closed for every proof observation and transaction failure while preserving rollback", async () => {
    const failures: readonly FakeClientOptions[] = [
      { beginFailure: true },
      { readFailure: true },
      {
        observation: {
          currentDatabaseMatched: false,
          markerCount: 1,
          boundSentinelByteMatched: true,
        },
      },
      {
        observation: {
          currentDatabaseMatched: true,
          markerCount: 0,
          boundSentinelByteMatched: true,
        },
      },
      {
        observation: {
          currentDatabaseMatched: true,
          markerCount: 2,
          boundSentinelByteMatched: true,
        },
      },
      {
        observation: {
          currentDatabaseMatched: true,
          markerCount: 1,
          boundSentinelByteMatched: false,
        },
      },
      { rollbackFailure: true },
    ];
    for (const options of failures) {
      for (const proof of [assertTask551FixtureTarget, assertTask551FixtureTargetPostCleanup]) {
        const setup = fakeClient(options);
        await expect(proof(target, setup.client)).rejects.toThrow("database_baseline_invalid");
        if (options.beginFailure) {
          expect(setup.state.rollbackCalls).toBe(0);
        } else {
          expect(setup.state.rollbackCalls).toBe(1);
        }
      }
    }
  });

  it("rejects poisoned direct target maps before target parsing or transport connection", async () => {
    const poisoned = {
      ...childValues,
      DATABASE_URL: "postgres://poison.invalid/coderso02",
      DATABASE_DIRECT_URL: "poison",
    };
    const result = await runInvalidMainTarget(poisoned);
    expect(result).toEqual({
      opened: 0,
      stdout: "",
      stderr: "database_baseline_invalid\n",
      exitCode: 1,
    });

    const bootstrap = { ...childValues, TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL: "poison" };
    const bootstrapResult = await runInvalidMainTarget(bootstrap);
    expect(bootstrapResult.opened).toBe(0);
    expect(bootstrapResult.stderr).toBe("database_baseline_invalid\n");
  });

  it("rejects inherited, non-enumerable, accessor, symbol, and non-string direct target members", async () => {
    let inheritedReads = 0;
    const inheritedPrototype = {} as Record<string, unknown>;
    Object.defineProperty(inheritedPrototype, "TASK551_EXTRA", {
      enumerable: true,
      get: () => {
        inheritedReads += 1;
        throw new Error("inherited getter must not run");
      },
    });
    const inherited = Object.create(inheritedPrototype) as Record<string, unknown>;
    inherited.TASK551_FIXTURE_DATABASE_NAME = childValues.TASK551_FIXTURE_DATABASE_NAME;
    inherited.TASK551_FIXTURE_DATABASE_SENTINEL = childValues.TASK551_FIXTURE_DATABASE_SENTINEL;
    inherited.TASK551_FIXTURE_DATABASE_URL = childValues.TASK551_FIXTURE_DATABASE_URL;
    expect((await runInvalidMainTarget(inherited)).opened).toBe(0);
    expect(inheritedReads).toBe(0);

    let unknownReads = 0;
    const unknown = { ...childValues } as Record<string, unknown>;
    Object.defineProperty(unknown, "TASK551_EXTRA", {
      enumerable: true,
      get: () => {
        unknownReads += 1;
        throw new Error("unknown getter must not run");
      },
    });
    expect((await runInvalidMainTarget(unknown)).opened).toBe(0);
    expect(unknownReads).toBe(0);

    const nonEnumerable = withOwnDescriptor({ ...childValues }, "TASK551_FIXTURE_DATABASE_URL", {
      value: childValues.TASK551_FIXTURE_DATABASE_URL,
      enumerable: false,
      configurable: true,
      writable: true,
    });
    expect((await runInvalidMainTarget(nonEnumerable)).opened).toBe(0);

    let accessorReads = 0;
    const accessor = { ...childValues };
    Object.defineProperty(accessor, "TASK551_FIXTURE_DATABASE_URL", {
      get: () => {
        accessorReads += 1;
        throw new Error("getter must not run");
      },
      enumerable: true,
      configurable: true,
    });
    expect((await runInvalidMainTarget(accessor)).opened).toBe(0);
    expect(accessorReads).toBe(0);

    const symbolValue = { ...childValues, [Symbol("poison")]: "poison" };
    expect((await runInvalidMainTarget(symbolValue)).opened).toBe(0);

    const nonString = { ...childValues };
    Object.defineProperty(nonString, "TASK551_FIXTURE_DATABASE_URL", {
      value: 42,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    expect((await runInvalidMainTarget(nonString)).opened).toBe(0);
  });
});
