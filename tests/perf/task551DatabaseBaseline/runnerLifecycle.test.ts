import { describe, expect, test } from "bun:test";
import {
  buildTask551ContractDigestInput,
  buildTask551FixtureDigestInput,
  computeTask551ContractDigest,
  computeTask551FixtureDigest,
  computeTask551ManifestScenarioResultDigest,
  computeTask551ReviewableReceiptDigest,
  computeTask551RunnerDigest,
  computeTask551SchemaDigest,
  TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION,
  TASK551_RUNNER_DIGEST_SOURCE_PATHS,
  type Task551ReviewableFreezeReceiptV1,
} from "../../../scripts/task551DatabaseBaseline/digestContract";
import {
  installTask551ActiveGenerationMemoryStateForFocusedTest,
  resetTask551ActiveGenerationFilesystemForFocusedTest,
} from "../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationStore";
import {
  runTask551DatabaseBaseline,
  type Task551DatabaseBaselineRunDeps,
  type Task551DatabaseTargetTransport,
  type Task551ScenarioMeasurement,
} from "../../../scripts/task551DatabaseBaseline/runner";
import {
  TASK551_ADMIN_READ_PLANNED_IDS,
  TASK551_ADMIN_READ_STATEMENT_SHAPES,
} from "../fixtures/task551AdminReadStatementShapes";
import {
  MEASUREMENT,
  TASK551_SCENARIO_MANIFEST_VERSION,
  TASK551_SCENARIOS,
  TASK551_SCALE_COUNTS,
  TASK551_SCALE_DISTRIBUTIONS,
} from "../fixtures/task551DatabaseScale";
import {
  TASK551_DATABASE_BUDGETS,
  TASK551_POOL_WAIT_BUDGETS,
} from "../fixtures/task551DatabaseBudgets";
import { makeTask551ActiveGenerationStateV2 } from "./freezeCandidateGenerationTestHelpers";
import { fakeSha256, makeReceipt, validTask551SourceHashes } from "./contractTestHelpers";

const target = {
  url: "postgres://fixture_user:fixture_password@127.0.0.1/coderso02?sslmode=require",
  expectedDatabaseName: "coderso02" as const,
  sentinel: "s".repeat(32),
};
const scenario = TASK551_SCENARIOS.find((candidate) => candidate.kind === "admin-shape")!;
const selector = { kind: "scenario" as const, id: scenario.id };

type RunOptions = Readonly<{
  executeFailure?: boolean;
  measureFailure?: boolean;
  cleanupFailure?: boolean;
  staleReceipt?: boolean;
  state?: "awaiting-small" | "awaiting-large" | "ready-for-review" | "reviewed";
  durableState?: object;
}>;

function measurement(profile: "small" | "large"): Task551ScenarioMeasurement {
  const reviewed = makeReceipt(profile, "reviewed");
  return {
    statementCeilings: TASK551_ADMIN_READ_PLANNED_IDS.map(
      (id) => TASK551_DATABASE_BUDGETS[id]![profile]
    ),
    poolWaitCeiling: TASK551_POOL_WAIT_BUDGETS[profile],
    calibrationMedianMs: 1,
    p95Repetitions: [1, 1, 1],
    runtimeContext: {
      provenanceCommit: reviewed.provenanceCommit,
      platform: reviewed.platform,
      arch: reviewed.arch,
      cpuModel: reviewed.cpuModel,
      logicalCpus: reviewed.logicalCpus,
      memoryMb: reviewed.memoryMb,
      postgresMajor: reviewed.postgresMajor,
      postgresConfigDigest: reviewed.postgresConfigDigest,
      bunVersion: reviewed.bunVersion,
      poolCapacity: reviewed.poolCapacity,
      containerMode: reviewed.containerMode,
      scopeDigest: "fresh-scope",
    },
  };
}

function staticDigests(profile: "small" | "large", sourceHashes: Readonly<Record<string, string>>) {
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
        scenarios: [scenario],
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
    manifestScenarioResultDigest: computeTask551ManifestScenarioResultDigest(
      {
        profile,
        selector,
        scenarios: [scenario],
      },
      fakeSha256
    ),
  };
}

function reviewedReceipt(
  profile: "small" | "large",
  digests: Readonly<Record<string, string>>
): Task551ReviewableFreezeReceiptV1 {
  const { reviewableReceiptDigest: _ignored, ...withoutDigest } = {
    ...makeReceipt(profile, "reviewed"),
    contractDigest: digests.contractDigest,
    fixtureDigest: digests.fixtureDigest,
    schemaDigest: digests.schemaDigest,
    runnerDigest: digests.runnerDigest,
  };
  return {
    ...withoutDigest,
    reviewableReceiptDigest: computeTask551ReviewableReceiptDigest(withoutDigest, fakeSha256),
  } as Task551ReviewableFreezeReceiptV1;
}

function durableStateForRun(
  mode: "freeze" | "check",
  options: RunOptions
): Task551FreezeCandidateStateInput {
  // Focused installs may inject deliberately foreign durable bytes; the store
  // authority owns every rejection path for them.
  if (options.durableState !== undefined) {
    return options.durableState as Task551FreezeCandidateStateInput;
  }
  const sourceHashes = validTask551SourceHashes(TASK551_RUNNER_DIGEST_SOURCE_PATHS);
  const state = options.state ?? (mode === "freeze" ? "awaiting-small" : "reviewed");
  if (state !== "reviewed") return makeTask551ActiveGenerationStateV2(state);
  const stale = options.staleReceipt === true;
  const base = reviewedReceipt("small", staticDigests("small", sourceHashes));
  const small = stale
    ? ({ ...base, runnerDigest: "c".repeat(64) } as Task551ReviewableFreezeReceiptV1)
    : base;
  return makeTask551ActiveGenerationStateV2(
    "reviewed",
    small as Parameters<typeof makeTask551ActiveGenerationStateV2>[1],
    reviewedReceipt("large", staticDigests("large", sourceHashes)) as Parameters<
      typeof makeTask551ActiveGenerationStateV2
    >[2]
  );
}

type Task551FreezeCandidateStateInput = Parameters<
  typeof installTask551ActiveGenerationMemoryStateForFocusedTest
>[0];

function makeRun(mode: "freeze" | "check", options: RunOptions = {}) {
  const events: string[] = [];
  let proofCalls = 0;
  const client = {
    beginReadOnlyTransaction: async () => ({
      readFixtureTargetProof: async () => {
        events.push("proof");
        proofCalls += 1;
        return {
          currentDatabaseMatched: true,
          markerCount: 1,
          boundSentinelByteMatched: true,
        };
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
      if (options.executeFailure) throw new Error("injected execute failure");
    },
    measureScenario: async () => {
      events.push("measure");
      if (options.measureFailure) throw new Error("injected measure failure");
      return measurement("small");
    },
    cleanupScenario: async () => {
      events.push("cleanup");
      if (options.cleanupFailure) throw new Error("injected cleanup failure");
    },
  };
  const deps: Task551DatabaseBaselineRunDeps = {
    sha256Bytes: fakeSha256,
    sourceHashes: validTask551SourceHashes(TASK551_RUNNER_DIGEST_SOURCE_PATHS),
    openTransport: async () => transport,
    buildCandidateReceipt: async () => {
      events.push("candidate");
      return makeReceipt("small");
    },
  };
  const durableState = durableStateForRun(mode, options);
  return {
    deps,
    events,
    proofCalls: () => proofCalls,
    durableState,
  };
}

const runInput = (mode: "freeze" | "check") => ({
  mode,
  profile: "small" as const,
  selector,
  target,
  scenarios: [scenario],
});

async function run(mode: "freeze" | "check", options: RunOptions = {}) {
  const setup = makeRun(mode, options);
  try {
    installTask551ActiveGenerationMemoryStateForFocusedTest(setup.durableState as never);
    const result = await runTask551DatabaseBaseline(runInput(mode), setup.deps);
    return { ...setup, result };
  } finally {
    resetTask551ActiveGenerationFilesystemForFocusedTest();
  }
}

async function expectRefusedBeforeAnyOperation(
  mode: "freeze" | "check",
  options: RunOptions,
  expectedMessage: string
): Promise<void> {
  const setup = makeRun(mode, options);
  let opened = 0;
  const deps: Task551DatabaseBaselineRunDeps = {
    ...setup.deps,
    openTransport: async () => {
      opened += 1;
      throw new Error("must not open a transport");
    },
  };
  try {
    installTask551ActiveGenerationMemoryStateForFocusedTest(setup.durableState as never);
    await expect(runTask551DatabaseBaseline(runInput(mode), deps)).rejects.toThrow(expectedMessage);
  } finally {
    resetTask551ActiveGenerationFilesystemForFocusedTest();
  }
  expect(opened).toBe(0);
  expect(setup.events).toEqual([]);
  expect(setup.proofCalls()).toBe(0);
}

describe("TASK-551 L02 concrete runner lifecycle", () => {
  test("checks reviewed receipts without candidate-write effects", async () => {
    const check = await run("check");
    expect(check.result).toMatchObject({ pass: true, mode: "check", profile: "small" });
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
  });

  test("freezes the small candidate and leaves the candidate-write result", async () => {
    const freeze = await run("freeze");
    expect(freeze.result).toMatchObject({ committed: true, cleanupFailures: [] });
    expect(freeze.events).toEqual([
      "proof",
      "rollback",
      "execute",
      "measure",
      "cleanup",
      "candidate",
      "proof",
      "rollback",
      "close",
    ]);
  });

  test("refuses a legacy or non-v2 durable state with the fixed migration code", async () => {
    const legacyStates: readonly object[] = [
      {},
      { legacy: true },
      { schema: "coderso.task551.freeze-candidate-generation-state@v1" },
      {
        schema: "coderso.task551.freeze-candidate-generation-state@v2",
        generationId: "task551-freeze-candidate-generation",
      },
    ];
    for (const durableState of legacyStates) {
      await expectRefusedBeforeAnyOperation(
        "check",
        { durableState },
        "l02_active_generation_migration_required"
      );
      await expectRefusedBeforeAnyOperation(
        "freeze",
        { durableState },
        "l02_active_generation_migration_required"
      );
    }
  });

  test("refuses a corrupt v2 durable state before any later check", async () => {
    await expectRefusedBeforeAnyOperation(
      "check",
      {
        durableState: {
          schema: "coderso.task551.freeze-candidate-generation-state@v2",
          generationId: "task551-freeze-candidate-generation-v2",
          state: "reviewed",
          receipts: [],
        },
      },
      "database_baseline_invalid"
    );
  });

  test("refuses every illegal entry state before any later check", async () => {
    for (const state of ["awaiting-small", "awaiting-large", "ready-for-review"] as const) {
      await expectRefusedBeforeAnyOperation("check", { state }, "database_baseline_invalid");
    }
    for (const state of ["awaiting-large", "ready-for-review", "reviewed"] as const) {
      await expectRefusedBeforeAnyOperation("freeze", { state }, "database_baseline_invalid");
    }
  });

  test("runs cleanup, post-cleanup proof, and transport close after scenario failures", async () => {
    for (const options of [
      { executeFailure: true },
      { measureFailure: true },
      { cleanupFailure: true },
    ]) {
      const setup = makeRun("check", options);
      try {
        installTask551ActiveGenerationMemoryStateForFocusedTest(setup.durableState as never);
        await expect(runTask551DatabaseBaseline(runInput("check"), setup.deps)).rejects.toThrow(
          "database_baseline_invalid"
        );
      } finally {
        resetTask551ActiveGenerationFilesystemForFocusedTest();
      }
      expect(setup.events).toContain("cleanup");
      expect(setup.events).toContain("close");
      expect(setup.proofCalls()).toBe(2);
    }
  });

  test("rejects every public candidate writer injection before it opens a transport", async () => {
    for (const candidateReceiptWriter of [
      () => undefined,
      { writeCandidateReceipt: 1 },
      { writeCandidateReceipt: async () => undefined, extra: true },
    ]) {
      const setup = makeRun("freeze");
      let opened = 0;
      const depsWithForbiddenCandidateWriter = {
        ...setup.deps,
        candidateReceiptWriter,
        openTransport: async () => {
          opened += 1;
          throw new Error("must not open");
        },
      };
      try {
        installTask551ActiveGenerationMemoryStateForFocusedTest(setup.durableState as never);
        await expect(
          runTask551DatabaseBaseline(
            runInput("freeze"),
            depsWithForbiddenCandidateWriter as unknown as Task551DatabaseBaselineRunDeps
          )
        ).rejects.toThrow("database_baseline_invalid");
      } finally {
        resetTask551ActiveGenerationFilesystemForFocusedTest();
      }
      expect(opened).toBe(0);
      expect(setup.events).toEqual([]);
    }
  });

  test("rejects retired reviewed-pair, receipt-map, and storage dependencies before target work", async () => {
    for (const [key, value] of [
      ["reviewedPairPersistence", { writeCandidateReceipt: async () => undefined }],
      ["readReviewableReceipt", async () => makeReceipt("small")],
      ["readState", async () => undefined],
      ["writeState", async () => undefined],
    ] as const) {
      const setup = makeRun("freeze");
      let opened = 0;
      const legacyDeps = {
        ...setup.deps,
        [key]: value,
        openTransport: async () => {
          opened += 1;
          throw new Error("must not open");
        },
      } as unknown as Task551DatabaseBaselineRunDeps;
      try {
        installTask551ActiveGenerationMemoryStateForFocusedTest(setup.durableState as never);
        await expect(runTask551DatabaseBaseline(runInput("freeze"), legacyDeps)).rejects.toThrow(
          "database_baseline_invalid"
        );
      } finally {
        resetTask551ActiveGenerationFilesystemForFocusedTest();
      }
      expect(opened).toBe(0);
      expect(setup.events).toEqual([]);
    }
  });

  test("rejects every bad reviewed receipt before a fixture operation", async () => {
    const sourceHashes = validTask551SourceHashes(TASK551_RUNNER_DIGEST_SOURCE_PATHS);
    const small = reviewedReceipt("small", staticDigests("small", sourceHashes));
    const large = reviewedReceipt("large", staticDigests("large", sourceHashes));
    for (const mutate of [
      (receipt: Task551ReviewableFreezeReceiptV1) => ({ ...receipt, profile: "large" }),
      (receipt: Task551ReviewableFreezeReceiptV1) =>
        ({ ...receipt, reviewState: "candidate" }) as Task551ReviewableFreezeReceiptV1,
      (receipt: Task551ReviewableFreezeReceiptV1) =>
        ({ ...receipt, runnerDigest: "d".repeat(64) }) as Task551ReviewableFreezeReceiptV1,
      (receipt: Task551ReviewableFreezeReceiptV1) => {
        const { reviewableReceiptDigest: _ignored, ...rest } = receipt;
        return rest as Task551ReviewableFreezeReceiptV1;
      },
    ]) {
      const setup = makeRun("check");
      try {
        installTask551ActiveGenerationMemoryStateForFocusedTest(
          makeTask551ActiveGenerationStateV2(
            "reviewed",
            mutate(small) as Parameters<typeof makeTask551ActiveGenerationStateV2>[1],
            large as Parameters<typeof makeTask551ActiveGenerationStateV2>[2]
          )
        );
        await expect(runTask551DatabaseBaseline(runInput("check"), setup.deps)).rejects.toThrow(
          "database_baseline_invalid"
        );
      } finally {
        resetTask551ActiveGenerationFilesystemForFocusedTest();
      }
      expect(setup.events).toEqual([]);
      expect(setup.proofCalls()).toBe(0);
    }
  });
});
