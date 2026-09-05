import { describe, expect, test } from "bun:test";
const it = test;
import {
  assertExactTask551ReviewedCandidateTransition,
  buildTask551ReviewedCandidateTransitionInput,
  canonicalizeTask551Rfc8785,
  computeTask551ReviewableReceiptDigest,
  computeTask551RunnerDigest,
  normalizeTask551SanitizedCatalogProjection,
  parseCanonicalTask551BaselineCheckStdout,
  requireTask551LowercaseSha256,
  resolveTask551ExecutableScenarioSelector,
  TASK551_RUNNER_DIGEST_SOURCE_PATHS,
  type JsonValue,
  type Task551ReviewableFreezeReceiptV1,
} from "../../../scripts/task551DatabaseBaseline/digestContract";
import {
  fakeSha256,
  makeCandidateTransitionInput,
  makeReceipt,
  makeTransitionResult,
} from "./contractTestHelpers";

const digest = "c".repeat(64);
const TASK551_REVIEWED_PAIR_PERSISTENCE_SOURCE_PATH =
  "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts";
const successRecord = {
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
  reviewableReceiptDigest: digest,
  contractDigest: digest,
  fixtureDigest: digest,
  schemaDigest: digest,
  runnerDigest: digest,
  manifestScenarioResultDigest: digest,
} as const;

function invalid(action: () => unknown): void {
  expect(action).toThrow("database_baseline_invalid");
}

function recomputeReceiptDigest(
  receipt: Task551ReviewableFreezeReceiptV1
): Task551ReviewableFreezeReceiptV1 {
  const { reviewableReceiptDigest: _ignored, ...withoutDigest } = receipt;
  return {
    ...withoutDigest,
    reviewableReceiptDigest: computeTask551ReviewableReceiptDigest(withoutDigest, fakeSha256),
  } as Task551ReviewableFreezeReceiptV1;
}

function mutateReceipt(
  receipt: Task551ReviewableFreezeReceiptV1,
  mutate: (value: Record<string, unknown>) => void
): Task551ReviewableFreezeReceiptV1 {
  const value = structuredClone(receipt) as unknown as Record<string, unknown>;
  mutate(value);
  return value as unknown as Task551ReviewableFreezeReceiptV1;
}

describe("TASK-551 L02 digest contract", () => {
  it("canonicalizes object keys and resolves only executable selectors", () => {
    expect(new TextDecoder().decode(canonicalizeTask551Rfc8785({ b: 1, a: [true] }))).toBe(
      '{"a":[true],"b":1}'
    );
    const scenario = {
      id: "admin-pages-page",
      kind: "admin-shape" as const,
      targetStatementOrFamily: "admin-pages-page",
      minimumClosure: ["pages"],
      supportTables: ["users"],
      expectedTableCounts: { pages: { small: 1, large: 1 } },
      ownedKeyPredicate: {
        kind: "uuid-v5",
        scope: "validated-run-scope",
        profile: "selected-profile",
        scenario: "admin-pages-page",
        ordinal: "family-ordinal",
      },
      equalityParticipation: "admin-32" as const,
      statementShapeId: "admin-pages-page",
    };
    expect(resolveTask551ExecutableScenarioSelector({ kind: "all" }, [scenario])).toEqual([
      scenario,
    ]);
    invalid(() =>
      resolveTask551ExecutableScenarioSelector({ kind: "scenario", id: "missing" }, [scenario])
    );

    const scenarioNegatives = [
      { ...scenario, ownedKeyPredicate: { ...scenario.ownedKeyPredicate, scenario: "other" } },
      { ...scenario, ownedKeyPredicate: { ...scenario.ownedKeyPredicate, extra: true } },
      { ...scenario, statementShapeId: undefined },
      { ...scenario, targetStatementOrFamily: "" },
      { ...scenario, expectedTableCounts: { nested: { task551_fixture_sentinel: true } } },
      { ...scenario, minimumClosure: ["public.task551_fixture_sentinel"] },
    ];
    for (const candidate of scenarioNegatives) {
      invalid(() =>
        resolveTask551ExecutableScenarioSelector({ kind: "all" }, [candidate as never])
      );
    }

    const task489 = {
      id: "task489-predecessor",
      kind: "task489-predecessor" as const,
      targetStatementOrFamily: "solution_kit_install_runs_normalized",
      minimumClosure: ["solution_kit_install_runs"],
      supportTables: ["solution_kit_install_items"],
      expectedTableCounts: {
        bulkHistoryRuns: { small: 10000, large: 1000000 },
        boundedSupportRuns: 109890,
      },
      ownedKeyPredicate: {
        kind: "uuid-v5",
        scope: "validated-run-scope",
        profile: "selected-profile",
        scenario: "task489-predecessor",
        ordinal: "family-ordinal",
      },
      equalityParticipation: "deferred" as const,
    };
    expect(resolveTask551ExecutableScenarioSelector({ kind: "all" }, [task489, scenario])).toEqual([
      scenario,
    ]);
    for (const candidate of [
      { ...task489, minimumClosure: ["solution_kit_install_items"] },
      { ...task489, supportTables: ["solution_kit_install_runs"] },
      {
        ...task489,
        expectedTableCounts: {
          bulkHistoryRuns: { small: 10000, large: 1000000 },
          boundedSupportRuns: 109891,
        },
      },
      { ...task489, statementShapeId: "task489-predecessor" },
      { ...task489, equalityParticipation: "supplemental" },
    ]) {
      invalid(() =>
        resolveTask551ExecutableScenarioSelector({ kind: "all" }, [candidate as never, scenario])
      );
    }
  });

  it("normalizes a catalog without accepting sentinel metadata", () => {
    const catalog = normalizeTask551SanitizedCatalogProjection({
      version: "task551-sanitized-catalog@v1",
      tables: [
        {
          schema: "public",
          name: "z_table",
          columns: [
            { name: "z", postgresType: "text", nullable: true },
            { name: "a", postgresType: "uuid", nullable: false },
          ],
          constraints: [],
          indexes: [],
        },
      ],
    });
    expect(catalog.tables[0]?.columns.map((column: { name: string }) => column.name)).toEqual([
      "a",
      "z",
    ]);
    invalid(() =>
      normalizeTask551SanitizedCatalogProjection({
        version: "task551-sanitized-catalog@v1",
        tables: [
          {
            schema: "public",
            name: "public.task551_fixture_sentinel",
            columns: [],
            constraints: [],
            indexes: [],
          },
        ],
      })
    );
  });

  it("requires the exact finite runner source-hash map", () => {
    const zeroDigest = "0".repeat(64);
    expect(TASK551_RUNNER_DIGEST_SOURCE_PATHS).toContain(
      TASK551_REVIEWED_PAIR_PERSISTENCE_SOURCE_PATH
    );
    const sourceHashes = Object.fromEntries([
      ...TASK551_RUNNER_DIGEST_SOURCE_PATHS.map((path) => [path, "b".repeat(64)]),
      [TASK551_REVIEWED_PAIR_PERSISTENCE_SOURCE_PATH, "b".repeat(64)],
    ]);
    expect(computeTask551RunnerDigest(sourceHashes, fakeSha256)).toMatch(/^[0-9a-f]{64}$/u);
    invalid(() => requireTask551LowercaseSha256(zeroDigest));
    invalid(() =>
      computeTask551RunnerDigest(
        { ...sourceHashes, [TASK551_RUNNER_DIGEST_SOURCE_PATHS[0]]: zeroDigest },
        fakeSha256
      )
    );
    invalid(() => computeTask551RunnerDigest(sourceHashes, () => zeroDigest));
    invalid(() =>
      computeTask551RunnerDigest({ ...sourceHashes, extra: "b".repeat(64) }, fakeSha256)
    );
    invalid(() =>
      computeTask551RunnerDigest(
        { ...sourceHashes, [TASK551_RUNNER_DIGEST_SOURCE_PATHS[0]]: "A".repeat(64) },
        fakeSha256
      )
    );
  });

  it("hashes a complete receipt payload without review state or self digest", () => {
    const receipt = makeReceipt("small", "reviewed");
    let captured: Uint8Array | undefined;
    const result = computeTask551ReviewableReceiptDigest(receipt, (bytes) => {
      captured = new Uint8Array(bytes);
      return fakeSha256(bytes);
    });
    const { reviewState: _state, reviewableReceiptDigest: _self, ...payload } = receipt;
    expect(result).toBe(receipt.reviewableReceiptDigest);
    expect(new TextDecoder().decode(captured)).toBe(
      new TextDecoder().decode(canonicalizeTask551Rfc8785(payload as unknown as JsonValue))
    );
    expect(new TextDecoder().decode(captured)).not.toContain("postgres://");
    expect(new TextDecoder().decode(captured)).not.toContain("task551_fixture_sentinel");
  });

  it("accepts valid candidate and reviewed receipts but rejects semantic receipt failures", () => {
    for (const reviewState of ["candidate", "reviewed"] as const) {
      const receipt = makeReceipt("small", reviewState);
      expect(computeTask551ReviewableReceiptDigest(receipt, fakeSha256)).toBe(
        receipt.reviewableReceiptDigest
      );
    }
    const base = makeReceipt("small", "reviewed");
    const zeroDigest = "0".repeat(64);
    const missing = structuredClone(base) as Record<string, unknown>;
    delete missing.contractDigest;
    invalid(() => computeTask551ReviewableReceiptDigest(missing as never, fakeSha256));
    invalid(() =>
      computeTask551ReviewableReceiptDigest({ ...base, unknown: true } as never, fakeSha256)
    );
    invalid(() =>
      computeTask551ReviewableReceiptDigest(
        { ...base, reviewableReceiptDigest: "f".repeat(64) },
        fakeSha256
      )
    );
    for (const field of [
      "reviewableReceiptDigest",
      "contractDigest",
      "fixtureDigest",
      "schemaDigest",
      "runnerDigest",
    ] as const) {
      invalid(() =>
        computeTask551ReviewableReceiptDigest({ ...base, [field]: zeroDigest } as never, fakeSha256)
      );
    }
    invalid(() => computeTask551ReviewableReceiptDigest(base, () => zeroDigest));

    for (const field of [
      "rowsReadMax",
      "transferredBytesMax",
      "sharedBuffersMax",
      "p50MsMax",
      "p95MsMax",
      "p99MsMax",
    ] as const) {
      const value = mutateReceipt(base, (record) => {
        const statements = record.statementCeilings as Array<Record<string, unknown>>;
        const ceiling = statements[0]!["ceiling"] as Record<string, unknown>;
        ceiling[field] = Number.NaN;
      });
      invalid(() => computeTask551ReviewableReceiptDigest(value, fakeSha256));
    }
    const wrongPoolCapacity = mutateReceipt(base, (record) => {
      record.poolCapacity = 10;
    });
    invalid(() => computeTask551ReviewableReceiptDigest(wrongPoolCapacity, fakeSha256));
    const reordered = mutateReceipt(base, (record) => {
      const statements = record.statementCeilings as unknown[];
      [statements[0], statements[1]] = [statements[1], statements[0]];
    });
    invalid(() => computeTask551ReviewableReceiptDigest(reordered, fakeSha256));
  });

  it("accepts the exact candidate-to-reviewed transition and rejects changed semantics", () => {
    const input = makeCandidateTransitionInput();
    const result = makeTransitionResult(input);
    const inputBefore = JSON.stringify(input);
    const resultBefore = JSON.stringify(result);
    expect(
      assertExactTask551ReviewedCandidateTransition({ input, result, sha256Bytes: fakeSha256 })
    ).toEqual(result);
    expect(JSON.stringify(input)).toBe(inputBefore);
    expect(JSON.stringify(result)).toBe(resultBefore);

    invalid(() =>
      assertExactTask551ReviewedCandidateTransition({
        input,
        result: {
          ...result,
          capabilityReceipt: { ...result.capabilityReceipt, digest: "0".repeat(64) },
        } as never,
        sha256Bytes: fakeSha256,
      })
    );
    invalid(() =>
      assertExactTask551ReviewedCandidateTransition({
        input,
        result: {
          ...result,
          reviewed: result.reviewed.map((entry) => ({
            ...entry,
            candidateCanonicalReceiptDigest: "f".repeat(64),
          })),
        } as never,
        sha256Bytes: fakeSha256,
      })
    );
    invalid(() =>
      assertExactTask551ReviewedCandidateTransition({
        input: {
          ...input,
          candidates: input.candidates.map((candidate) => ({
            ...candidate,
            candidateCanonicalReceiptDigest: "0".repeat(64),
          })) as never,
        } as never,
        result,
        sha256Bytes: fakeSha256,
      })
    );
    invalid(() =>
      assertExactTask551ReviewedCandidateTransition({
        input,
        result: {
          ...result,
          reviewed: result.reviewed.map((entry) => ({
            ...entry,
            reviewedCanonicalReceiptDigest: "0".repeat(64),
          })),
        } as never,
        sha256Bytes: fakeSha256,
      })
    );
    invalid(() =>
      assertExactTask551ReviewedCandidateTransition({
        input,
        result: {
          ...result,
          reviewed: result.reviewed.map((entry) => ({
            ...entry,
            reviewedReceipt: recomputeReceiptDigest({
              ...entry.reviewedReceipt,
              platform: "changed",
            }),
          })),
        } as never,
        sha256Bytes: fakeSha256,
      })
    );

    for (const change of [
      (receipt: Task551ReviewableFreezeReceiptV1) => ({
        ...receipt,
        contractDigest: "d".repeat(64),
      }),
      (receipt: Task551ReviewableFreezeReceiptV1) => ({ ...receipt, scopeDigest: "changed-scope" }),
      (receipt: Task551ReviewableFreezeReceiptV1) => ({
        ...receipt,
        calibration: { ...receipt.calibration, medianMs: 2 },
      }),
      (receipt: Task551ReviewableFreezeReceiptV1) => ({
        ...receipt,
        poolWaitCeiling: { ...receipt.poolWaitCeiling, p95MsMax: 2 },
      }),
    ]) {
      const changed = result.reviewed.map((entry) => ({
        ...entry,
        reviewedReceipt: recomputeReceiptDigest(change(entry.reviewedReceipt)),
      }));
      invalid(() =>
        assertExactTask551ReviewedCandidateTransition({
          input,
          result: { ...result, reviewed: changed } as never,
          sha256Bytes: fakeSha256,
        })
      );
    }

    invalid(() =>
      buildTask551ReviewedCandidateTransitionInput(
        [
          { profile: "small", candidateReceipt: makeReceipt("small", "reviewed") },
          { profile: "large", candidateReceipt: makeReceipt("large") },
        ],
        fakeSha256
      )
    );
    invalid(() =>
      buildTask551ReviewedCandidateTransitionInput(
        [
          { profile: "large", candidateReceipt: makeReceipt("large") },
          { profile: "small", candidateReceipt: makeReceipt("small") },
        ] as unknown as Parameters<typeof buildTask551ReviewedCandidateTransitionInput>[0],
        fakeSha256
      )
    );
  });

  it("accepts one canonical success line and rejects framing, schema, and digest negatives", () => {
    const line = `${new TextDecoder().decode(canonicalizeTask551Rfc8785(successRecord))}\n`;
    expect(parseCanonicalTask551BaselineCheckStdout(line).pass).toBe(true);
    invalid(() => parseCanonicalTask551BaselineCheckStdout(`${line}\n`));
    invalid(() => parseCanonicalTask551BaselineCheckStdout(line.replace("\n", "\r\n")));
    invalid(() =>
      parseCanonicalTask551BaselineCheckStdout(line.replace('"pass":true', '"pass":false'))
    );
    invalid(() =>
      parseCanonicalTask551BaselineCheckStdout(line.replace(`"${digest}"`, `"${"A".repeat(64)}"`))
    );
    for (const field of [
      "reviewableReceiptDigest",
      "contractDigest",
      "fixtureDigest",
      "schemaDigest",
      "runnerDigest",
      "manifestScenarioResultDigest",
    ] as const) {
      const zeroRecord = structuredClone(successRecord) as Record<string, unknown>;
      zeroRecord[field] = "0".repeat(64);
      invalid(() =>
        parseCanonicalTask551BaselineCheckStdout(
          `${new TextDecoder().decode(canonicalizeTask551Rfc8785(zeroRecord as never))}\n`
        )
      );
    }
    invalid(() => parseCanonicalTask551BaselineCheckStdout(`${line.slice(0, -1)}{"extra":true}\n`));
    invalid(() =>
      parseCanonicalTask551BaselineCheckStdout(
        `${line.slice(0, -1).replace('"schema":', '"unknown":true,"schema":')}\n`
      )
    );
  });
});
