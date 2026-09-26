import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import {
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_EVIDENCE_VALUE_DESCRIPTORS,
  TASK551_L10_PROJECTION_KEYS,
  TASK551_L10_RESULT_FIELDS,
  TASK551_TERMINAL_HANDOFF_PATHS,
  buildTask551L10EvidenceProjection,
  recoverTask551EvidenceRoot,
  sha256Task551Bytes,
  validateTask551EvidenceBytes,
  validateTask551EvidenceValue,
  verifyTask551TerminalCommittedHeadHandoff,
  writeTask551EvidenceFileIfAbsent,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import type { Task551TerminalCommittedHeadHandoffInputV1 } from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import * as task551ContractRuntime from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import { publishTask551PhaseEvidence } from "../../../_docs/_workflows/task-551-implement.mjs";
import { createTask551EvidenceTestHarnessForTests } from "../../../_docs/_workflows/lib/task-551-evidence-contract.mjs";

const sha = (seed: string) => createHash("sha256").update(seed).digest("hex");
const sourceHead = "a".repeat(40);
const terminalHead = "b".repeat(40);
const sourceDigest = sha("task551-evidence-source");
const timestamp = "2026-08-29T00:00:00.000Z";
const evidenceRoot = "_docs/_workflows/_smoke/task-551/audit-evidence";
type MutableEvidence = Record<string, unknown> & { commandReceipt: Record<string, unknown> };
function isEvidenceRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function requireEvidenceRecord(value: unknown): Record<string, unknown> {
  if (!isEvidenceRecord(value)) throw new Error("test evidence fixture must be an own-data record");
  return value;
}
function isMutableEvidence(value: unknown): value is MutableEvidence {
  return isEvidenceRecord(value) && isEvidenceRecord(value.commandReceipt);
}
function requireMutableEvidence(value: unknown): MutableEvidence {
  if (!isMutableEvidence(value))
    throw new Error("test evidence fixture must include commandReceipt");
  return value;
}
type TerminalCommittedHeadInput = Readonly<{
  sourceHead: string;
  terminalHead: string;
  terminalParentHead: string;
  commitBChangedPaths: readonly string[];
  terminalHeadFiles: readonly Readonly<{
    path: string;
    tracked: true;
    kind: "regular";
    bytes: Uint8Array;
  }>[];
  currentTreeFiles: readonly Readonly<{
    path: string;
    tracked: true;
    kind: "regular";
    bytes: Uint8Array;
    dirty: false;
    replaced: false;
  }>[];
}>;
type MutableTerminalCommittedHeadInput = {
  sourceHead: string;
  terminalHead: string;
  terminalParentHead: string;
  commitBChangedPaths: string[];
  terminalHeadFiles: Array<{
    path: string;
    tracked: boolean;
    kind: "regular" | "symlink";
    bytes: Uint8Array;
  }>;
  currentTreeFiles: Array<{
    path: string;
    tracked: boolean;
    kind: "regular" | "symlink";
    bytes: Uint8Array;
    dirty: boolean;
    replaced: boolean;
  }>;
};
const processReceipt = () => ({
  status: "passed",
  result: "zero_exit",
  exitCode: 0,
  signalCode: null,
  stdoutBytes: 0,
  stderrBytes: 0,
});

function terminalCommittedHeadInput(): TerminalCommittedHeadInput {
  const predecessorBytes = new TextEncoder().encode(
    `${JSON.stringify(evidenceValueFor(TASK551_DURABLE_EVIDENCE_MANIFEST[9]!))}\n`
  );
  const promoted = promotion();
  const promotionBytes = new TextEncoder().encode(
    `${JSON.stringify({
      ...promoted,
      predecessor: { ...promoted.predecessor, digest: sha256Task551Bytes(predecessorBytes) },
    })}\n`
  );
  const terminalHeadFiles = TASK551_TERMINAL_HANDOFF_PATHS.map((path, index) => ({
    path,
    tracked: true as const,
    kind: "regular" as const,
    bytes: index === 0 ? predecessorBytes : promotionBytes,
  }));
  return {
    sourceHead,
    terminalHead,
    terminalParentHead: sourceHead,
    commitBChangedPaths: [...TASK551_TERMINAL_HANDOFF_PATHS],
    terminalHeadFiles,
    currentTreeFiles: terminalHeadFiles.map(({ path, bytes }) => ({
      path,
      tracked: true as const,
      kind: "regular" as const,
      bytes: new Uint8Array(bytes),
      dirty: false as const,
      replaced: false as const,
    })),
  };
}

function mutableTerminalCommittedHeadInput(): MutableTerminalCommittedHeadInput {
  const input = terminalCommittedHeadInput();
  return {
    sourceHead: input.sourceHead,
    terminalHead: input.terminalHead,
    terminalParentHead: input.terminalParentHead,
    commitBChangedPaths: [...input.commitBChangedPaths],
    terminalHeadFiles: input.terminalHeadFiles.map((file) => ({
      ...file,
      bytes: new Uint8Array(file.bytes),
    })),
    currentTreeFiles: input.currentTreeFiles.map((file) => ({
      ...file,
      bytes: new Uint8Array(file.bytes),
    })),
  };
}

async function expectTerminalCommittedHeadRejection(input: unknown) {
  await expect(
    verifyTask551TerminalCommittedHeadHandoff(input as Task551TerminalCommittedHeadHandoffInputV1)
  ).rejects.toThrow("task551_terminal_committed_head_invalid");
}

describe("terminal committed-HEAD handoff verifier", () => {
  test("accepts only a direct Commit A to Commit B pair without exposing bytes", async () => {
    await expect(
      verifyTask551TerminalCommittedHeadHandoff(terminalCommittedHeadInput())
    ).resolves.toBe(true);
  });

  test("rejects same or invalid Commit A/B heads", async () => {
    const sameHead = mutableTerminalCommittedHeadInput();
    sameHead.terminalHead = sourceHead;
    await expectTerminalCommittedHeadRejection(sameHead);
    const invalidHead = mutableTerminalCommittedHeadInput();
    invalidHead.sourceHead = "not-a-git-sha";
    await expectTerminalCommittedHeadRejection(invalidHead);
  });

  test("requires Commit B's trusted parent to be Commit A", async () => {
    const input = mutableTerminalCommittedHeadInput();
    input.terminalParentHead = "c".repeat(40);
    await expectTerminalCommittedHeadRejection(input);
  });

  test("rejects malformed or missing trusted terminal parents", async () => {
    for (const parent of ["not-a-git-sha", "0".repeat(40)]) {
      const input = mutableTerminalCommittedHeadInput();
      input.terminalParentHead = parent;
      await expectTerminalCommittedHeadRejection(input);
    }
    const missingParent = mutableTerminalCommittedHeadInput();
    Reflect.deleteProperty(missingParent, "terminalParentHead");
    await expectTerminalCommittedHeadRejection(missingParent);
  });

  test("requires Commit B to change exactly the two literal terminal paths", async () => {
    const [predecessorPath, promotionPath] = TASK551_TERMINAL_HANDOFF_PATHS;
    for (const changedPaths of [
      ["unexpected-path", promotionPath],
      [predecessorPath, promotionPath, "unexpected-path"],
      [predecessorPath],
      [predecessorPath, predecessorPath],
    ]) {
      const input = mutableTerminalCommittedHeadInput();
      input.commitBChangedPaths = changedPaths;
      await expectTerminalCommittedHeadRejection(input);
    }
  });

  test("rejects untracked or symlink terminal entries in either snapshot", async () => {
    const mutations: Array<[string, (input: MutableTerminalCommittedHeadInput) => void]> = [
      [
        "untracked HEAD",
        (input) => {
          input.terminalHeadFiles[0]!.tracked = false;
        },
      ],
      [
        "symlink HEAD",
        (input) => {
          input.terminalHeadFiles[0]!.kind = "symlink";
        },
      ],
      [
        "untracked current tree",
        (input) => {
          input.currentTreeFiles[0]!.tracked = false;
        },
      ],
      [
        "symlink current tree",
        (input) => {
          input.currentTreeFiles[0]!.kind = "symlink";
        },
      ],
    ];
    for (const [, mutate] of mutations) {
      const input = mutableTerminalCommittedHeadInput();
      mutate(input);
      await expectTerminalCommittedHeadRejection(input);
    }
  });

  test("rejects current-byte drift plus dirty or replaced current inputs", async () => {
    const byteDrift = mutableTerminalCommittedHeadInput();
    byteDrift.currentTreeFiles[0]!.bytes[0] ^= 0xff;
    await expectTerminalCommittedHeadRejection(byteDrift);
    const dirty = mutableTerminalCommittedHeadInput();
    dirty.currentTreeFiles[0]!.dirty = true;
    await expectTerminalCommittedHeadRejection(dirty);
    const replaced = mutableTerminalCommittedHeadInput();
    replaced.currentTreeFiles[0]!.replaced = true;
    await expectTerminalCommittedHeadRejection(replaced);
  });

  test("rejects inherited and unknown own record fields", async () => {
    const inherited = Object.assign(
      Object.create({ inherited: true }),
      mutableTerminalCommittedHeadInput()
    );
    await expectTerminalCommittedHeadRejection(inherited);
    const topLevelUnknown = Object.assign(mutableTerminalCommittedHeadInput(), {
      unexpected: true,
    });
    await expectTerminalCommittedHeadRejection(topLevelUnknown);
    const unknown = mutableTerminalCommittedHeadInput();
    Object.assign(unknown.currentTreeFiles[0]!, { unexpected: true });
    await expectTerminalCommittedHeadRejection(unknown);
  });
});

describe("owner-private durable writer and evidence-root recovery", () => {
  test("has no ambient root API and a closed test context writes no-replace evidence", async () => {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[0]!,
      value = writerEvidenceValue(row);
    const harness = await evidenceTestHarness();
    await expect(recoverTask551EvidenceRoot()).rejects.toThrow(/storage_uninstalled/);
    await expect(
      (recoverTask551EvidenceRoot as (input: unknown) => Promise<unknown>)({ repoRoot: "/tmp" })
    ).rejects.toThrow(/recovery_request_invalid/);
    await expect(
      (writeTask551EvidenceFileIfAbsent as unknown as (input: unknown) => Promise<unknown>)({
        manifestRow: row,
        value,
      })
    ).rejects.toThrow(/write_request_invalid/);
    const receipt = await harness.write("l03Initialize", value);
    expect(receipt.action).toBe("committed_no_replace");
    expect(receipt.digest).toBe(
      `sha256:${sha256Task551Bytes(new TextEncoder().encode(`${JSON.stringify(value)}\n`))}`
    );
    expect((await harness.write("l03Initialize", value)).action).toBe(
      "destination_eexist_race_committed"
    );
    const staticRow = TASK551_DURABLE_EVIDENCE_MANIFEST[2]!;
    await harness.write("l02StaticSmall", staticWriterEvidenceValue(staticRow, sha("static-a")));
    expect((await harness.recover()).clear).toBe(true);
    await expect(
      harness.write("l02StaticSmall", staticWriterEvidenceValue(staticRow, sha("static-b")))
    ).rejects.toThrow(/destination_exists_no_replace/);
    expect((await harness.recover()).clear).toBe(false);
  });

  test("retains a writer quarantine witness across a post-unlink directory-sync fault", async () => {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[2]!,
      value = staticWriterEvidenceValue(row, sha("writer-a")),
      harness = await evidenceTestHarness();
    await harness.faults([{ operationIndex: 74, occurrence: 4, operation: "fsync" }]);
    await expect(harness.write("l02StaticSmall", value)).rejects.toThrow(/evidence_write_failed/);
    await harness.faults([]);
    expect((await harness.recover()).clear).toBe(true);
    expect((await harness.write("l02StaticSmall", value)).action).toBe(
      "destination_eexist_race_committed"
    );
    await expect(
      harness.write("l02StaticSmall", staticWriterEvidenceValue(row, sha("writer-b")))
    ).rejects.toThrow(/destination_exists_no_replace/);
  });

  test("foreign, nonregular, writable, invalid, and private entries block without canonical repair", async () => {
    for (const fault of [
      "foreign-entry",
      "symlink-row",
      "canonical-directory",
      "canonical-writable-row",
      "invalid-row",
      "private-entry",
    ]) {
      const harness = await evidenceTestHarness();
      await harness.faults([fault]);
      const first = await harness.recover(),
        second = await harness.recover();
      expect(first.clear).toBe(false);
      expect(second).toEqual(first);
      await expect(
        harness.write("l03Initialize", writerEvidenceValue(TASK551_DURABLE_EVIDENCE_MANIFEST[0]!))
      ).rejects.toThrow(/recovery_blocked/);
    }
  });

  test("fails closed when a captured canonical ancestor drifts", async () => {
    for (const fault of ["ancestor-drift", "canonical-writable-root"]) {
      const harness = await evidenceTestHarness();
      await harness.faults([fault]);
      const first = await harness.recover(),
        second = await harness.recover();
      expect(first).toEqual({
        rows: [],
        blockers: [
          { scope: "global-root", code: "task551_evidence_recovery_blocked_foreign_entry" },
        ],
        clear: false,
      });
      expect(second).toEqual(first);
      await expect(
        harness.write("l03Initialize", writerEvidenceValue(TASK551_DURABLE_EVIDENCE_MANIFEST[0]!))
      ).rejects.toThrow(/recovery_blocked_foreign_entry/);
    }
  });

  test("rejects a preexisting private nested directory that is not exactly 0700", async () => {
    const harness = await evidenceTestHarness();
    await harness.faults(["private-category-mode"]);
    expect((await harness.recover()).clear).toBe(false);
  });

  test("quarantines sealed stale staging deterministically and blocks multiple or conflicting sources", async () => {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[0]!,
      value = writerEvidenceValue(row);
    const one = await evidenceTestHarness();
    await one.stage("l03Initialize", value);
    const discarded = await one.recover();
    expect(discarded.clear).toBe(true);
    expect(discarded.rows.find((entry) => entry.rowId === "l03Initialize")?.terminalResult).toBe(
      "discarded_retryable"
    );
    expect(await one.recover()).toEqual(discarded);

    const many = await evidenceTestHarness();
    await many.stage("l03Initialize", value, 2);
    const blocked = await many.recover();
    expect(blocked.clear).toBe(false);
    expect(blocked.rows.find((entry) => entry.rowId === "l03Initialize")?.telemetry).toBe(
      "blocked_multiple_stale_temps"
    );
    expect(await many.recover()).toEqual(blocked);

    const conflict = await evidenceTestHarness(),
      conflictRow = TASK551_DURABLE_EVIDENCE_MANIFEST[2]!;
    await conflict.write(
      "l02StaticSmall",
      staticWriterEvidenceValue(conflictRow, sha("conflict-a"))
    );
    await conflict.stage(
      "l02StaticSmall",
      staticWriterEvidenceValue(conflictRow, sha("conflict-b"))
    );
    expect((await conflict.recover()).clear).toBe(false);
  });

  test("reopens the same private v1 group and resumes ordered durability faults without replacement", async () => {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[0]!,
      value = writerEvidenceValue(row);
    const staged = await evidenceTestHarness();
    await staged.stage("l03Initialize", value);
    const restarted = await staged.restart(),
      recovered = await restarted.recover();
    expect(recovered.clear).toBe(true);
    expect(recovered.rows.find((entry) => entry.rowId === "l03Initialize")?.terminalResult).toBe(
      "discarded_retryable"
    );
    for (const [operationIndex, occurrence, operation] of [
      [33, 1, "link"],
      [40, 1, "fsync"],
      [57, 1, "unlink"],
      [64, 2, "fsync"],
    ] as const) {
      const harness = await evidenceTestHarness();
      await harness.stage("l03Initialize", value);
      await harness.faults([{ operationIndex, occurrence, operation }]);
      const blocked = await harness.recover();
      expect(blocked.rows.find((entry) => entry.rowId === "l03Initialize")?.telemetry).toBe(
        "durability_blocked"
      );
      if (operationIndex === 64) {
        const resumed = await harness.restart();
        await resumed.faults([{ operationIndex: 55, occurrence: 2, operation: "fsync" }]);
        expect(
          (await resumed.recover()).rows.find((entry) => entry.rowId === "l03Initialize")?.telemetry
        ).toBe("durability_blocked");
        await resumed.faults([]);
        expect((await resumed.recover()).clear).toBe(true);
        continue;
      }
      await harness.faults([]);
      expect((await harness.recover()).clear).toBe(true);
    }
  });
});

describe("strict canonical rows and recovery boundaries", () => {
  test("forged or mismatched manifest rows never bind by path alone", () => {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[0]!;
    const forged = { ...row, keys: [...row.keys] };
    expect(validateTask551EvidenceValue(forged, writerEvidenceValue(row))).toMatch(
      /manifest_not_canonical/
    );
    expect(
      validateTask551EvidenceValue({ ...row, schema: "forged" }, writerEvidenceValue(row))
    ).toMatch(/manifest_not_canonical/);
    expect(() =>
      publishTask551PhaseEvidence({ manifestRow: forged, value: writerEvidenceValue(row) })
    ).toThrow(/not_canonical/);
  });
  test("public recovery rejects all path, filesystem, and run-state injection", async () => {
    for (const value of [
      undefined,
      { repoRoot: "/tmp" },
      { tempRoot: "/tmp" },
      { fs: {} },
      { runId: "../escape" },
    ]) {
      await expect(
        (recoverTask551EvidenceRoot as (input?: unknown) => Promise<unknown>)(value)
      ).rejects.toThrow(/recovery_request_invalid/);
    }
  });
});
const adminStatementIds = [
  "admin-pages-page",
  "admin-pages-fixed-summary",
  "admin-pages-authors-facet",
  "admin-entries-global-page",
  "admin-entries-global-fixed-summary",
  "admin-entries-global-facets",
  "admin-entries-typed-page",
  "admin-entries-typed-fixed-summary",
  "admin-entries-typed-authors-facet",
  "admin-posts-page",
  "admin-posts-fixed-summary",
  "admin-posts-authors-facet",
  "admin-users-page",
  "admin-users-fixed-summary",
  "admin-users-roles-facet",
  "admin-forms-page",
  "admin-form-submissions-page",
  "admin-form-submissions-fixed-summary",
  "admin-media-page",
  "admin-media-fixed-summary",
  "admin-media-facets",
  "admin-booking-reservations-page",
  "admin-booking-reservations-fixed-summary",
  "admin-booking-resources-page",
  "admin-booking-resources-fixed-summary",
  "admin-booking-services-page",
  "admin-booking-services-fixed-summary",
  "admin-booking-blackouts-page",
  "admin-booking-blackouts-fixed-summary",
  "admin-booking-service-resources-fixed-list",
  "admin-booking-schedules-fixed-list",
];
const ceiling = () => ({
  queryCountMax: 1,
  rowsReadMax: 1,
  rowsReturnedMax: 1,
  transferredBytesMax: 1,
  sharedBuffersMax: 1,
  p50MsMax: 1,
  p95MsMax: 1,
  p99MsMax: 1,
});
function reviewableReceipt(profile: "small" | "large", reviewState: "candidate" | "reviewed") {
  return {
    reviewableReceiptDigest: sha(`${profile}-${reviewState}-reviewable`),
    reviewState,
    profile,
    provenanceCommit: sourceHead,
    contractDigest: sha("contract"),
    fixtureDigest: sha("fixture"),
    schemaDigest: sha("schema"),
    runnerDigest: sha("runner"),
    platform: "linux",
    arch: "x64",
    cpuModel: "redacted-cpu",
    logicalCpus: 2,
    memoryMb: 1024,
    postgresMajor: 16,
    postgresConfigDigest: sha("postgres-config"),
    bunVersion: "1.4.0",
    poolCapacity: profile === "small" ? 2 : 10,
    containerMode: "container",
    scopeDigest: sha("scope"),
    calibration: { warmups: 20, samples: 100, medianMs: 1 },
    statementCeilings: adminStatementIds.map((statementId) => ({
      statementId,
      ceiling: ceiling(),
    })),
    poolWaitCeiling: ceiling(),
  };
}
const companions = [
  "task489-runs-all-keyset",
  "task489-runs-package-keyset",
  "task489-effective-supersession",
  "task489-active-starter-owner",
  "task489-safe-detail",
] as const;
const logicalCases = [
  [companions[0], "default", ["task489-runs-all-keyset/default"]],
  [companions[0], "relation-heavy-101", ["task489-runs-all-keyset/relation-heavy-101"]],
  [companions[1], "default", ["task489-runs-package-keyset/default"]],
  [companions[1], "relation-heavy-101", ["task489-runs-package-keyset/relation-heavy-101"]],
  [companions[2], "newer-0", ["task489-effective-supersession/newer-0"]],
  [companions[2], "newer-1", ["task489-effective-supersession/newer-1"]],
  [companions[2], "newer-511", ["task489-effective-supersession/newer-511"]],
  [companions[2], "newer-512", ["task489-effective-supersession/newer-512"]],
  [companions[2], "newer-513-all-rolled", ["task489-effective-supersession/newer-513-all-rolled"]],
  [
    companions[2],
    "newer-513-unrolled-first",
    ["task489-effective-supersession/newer-513-unrolled-first"],
  ],
  [
    companions[2],
    "newer-513-unrolled-middle",
    ["task489-effective-supersession/newer-513-unrolled-middle"],
  ],
  [
    companions[2],
    "newer-513-unrolled-last",
    ["task489-effective-supersession/newer-513-unrolled-last"],
  ],
  [companions[3], "active-owner", ["task489-active-starter-owner/active-owner"]],
  [
    companions[4],
    "point-plus-items",
    ["task489-safe-detail/run-point", "task489-safe-detail/items-page"],
  ],
] as const;
function predecessorPayload() {
  return {
    schema: "coderso.task551.task489-predecessor@v1",
    pass: true,
    companionIds: [...companions],
    fixtureCounts: {
      bulkHistoryRuns: { small: 10_000, large: 1_000_000 },
      boundedSupportRuns: 109_890,
      totalRuns: { small: 119_890, large: 1_109_890 },
      syntheticActorUsers: 100,
      safeDetailItems: 513,
      activeStarterOwners: 1,
      templateEvidenceRows: 1,
      rollbackProgressRows: 1,
    },
    logicalCases: logicalCases.map(([companionId, logicalCaseId, statementIds]) => ({
      companionId,
      logicalCaseId,
      statementIds: [...statementIds],
    })),
    statementReceipts: logicalCases.flatMap(([companionId, logicalCaseId, statementIds]) =>
      statementIds.map((statementId) => ({
        companionId,
        logicalCaseId,
        statementId,
        profileResults: [
          {
            profile: "small",
            planDigest: sha(`${statementId}-small`),
            queryCount: 1,
            rowsRead: 0,
            rowsReturned: 0,
            transferredBytes: 0,
            sharedBuffers: 0,
            p50Ms: 0,
            p95Ms: 0,
            p99Ms: 0,
          },
          {
            profile: "large",
            planDigest: sha(`${statementId}-large`),
            queryCount: 1,
            rowsRead: 0,
            rowsReturned: 0,
            transferredBytes: 0,
            sharedBuffers: 0,
            p50Ms: 0,
            p95Ms: 0,
            p99Ms: 0,
          },
        ],
      }))
    ),
  };
}
function promotion() {
  return {
    schemaVersion: "coderso.task551.task489-predecessor-promotion@v1",
    sourceTask: "TASK-551-05-L02",
    sourcePhase: "05-l02",
    sourceProfile: null,
    sourceScenario: "task489-predecessor",
    sourceHead,
    sourceDigest,
    predecessor: {
      sourcePath: ".tmp/task-551/task489-predecessor-v1.json",
      durablePath: `${evidenceRoot}/task489-predecessor-v1.json`,
      schemaVersion: "coderso.task551.task489-predecessor@v1",
      digest: sha("predecessor"),
    },
    promotionState: "promoted",
    promotionDecision: "accept",
    promotionReason: "exact-byte-match-after-owner-review",
    validationSummaries: {
      sourceIdentity: "passed",
      predecessorBytes: "passed",
      atomicNoReplace: "passed",
      terminalHead: "passed",
    },
    createdAt: timestamp,
    reviewedAt: timestamp,
    promotedAt: timestamp,
    ownerCapabilityReceiptDigest: sha("capability"),
  };
}
function l03Producer() {
  return {
    schema: "coderso.task551.fixture-bootstrap-check@v1",
    taskId: "TASK-551-01-L03",
    mode: "check",
    pass: true,
    markerCount: 1,
    targetProof: "current-database-and-single-marker",
    noLeak: true,
    toolContractDigest: `sha256:${sha("bootstrap-tool")}`,
  };
}
function immutableDigests() {
  return {
    reviewableReceiptDigest: sha("reviewable"),
    contractDigest: sha("contract"),
    fixtureDigest: sha("fixture"),
    schemaDigest: sha("schema"),
    runnerDigest: sha("runner"),
    manifestScenarioResultDigest: sha("scenario"),
  };
}
function resultFor(row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number]) {
  if (row.phase === "l03-initialize")
    return { pass: true, noLeak: true, commandReceipt: processReceipt() };
  if (row.phase === "l03-check")
    return {
      pass: true,
      noLeak: true,
      producer: l03Producer(),
      focusedTestReceipt: processReceipt(),
      checkCommandReceipt: processReceipt(),
    };
  if (row.phase === "l02-static")
    return {
      pass: true,
      noLeak: true,
      focusedTests: [processReceipt(), processReceipt()],
      manifestSha256: sha(`static-${row.profile}`),
    };
  if (row.phase === "l02-freeze-candidate")
    return {
      pass: true,
      noLeak: true,
      candidateReceipt: reviewableReceipt(row.profile as "small" | "large", "candidate"),
      candidateCanonicalReceiptDigest: sha(`candidate-${row.profile}`),
      freezeCommandReceipt: processReceipt(),
    };
  if (row.phase === "l02-reviewed-candidates")
    return {
      pass: true,
      noLeak: true,
      reviewed: {
        schema: "coderso.task551.reviewed-candidate-transition-result@v1",
        capabilityReceipt: {
          schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
          digest: sha("capability"),
        },
        reviewed: [
          {
            profile: "small",
            candidateCanonicalReceiptDigest: sha("candidate-small"),
            reviewedReceipt: reviewableReceipt("small", "reviewed"),
            reviewedCanonicalReceiptDigest: sha("reviewed-small"),
          },
          {
            profile: "large",
            candidateCanonicalReceiptDigest: sha("candidate-large"),
            reviewedReceipt: reviewableReceipt("large", "reviewed"),
            reviewedCanonicalReceiptDigest: sha("reviewed-large"),
          },
        ],
      },
    };
  return {
    pass: true,
    noLeak: true,
    staticEvidencePath: `${evidenceRoot}/l02-static-${row.profile}.json`,
    candidatePath: `${evidenceRoot}/l02-freeze-candidate-${row.profile}.json`,
    reviewedCandidatesPath: `${evidenceRoot}/l02-reviewed-candidates.json`,
    checkCommandReceipt: processReceipt(),
    immutableDigests: immutableDigests(),
    targetProof: "current-database-and-single-marker",
  };
}
function evidenceValueFor(row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number]) {
  if (row.phase === "task489-predecessor") {
    const payload = predecessorPayload();
    return {
      schema: payload.schema,
      pass: payload.pass,
      noLeak: true,
      companionIds: payload.companionIds,
      fixtureCounts: payload.fixtureCounts,
      logicalCases: payload.logicalCases,
      statementReceipts: payload.statementReceipts,
    };
  }
  if (row.phase === "task489-predecessor-promotion") return promotion();
  return {
    schema: row.schema,
    taskId: row.phase.startsWith("l03-") ? "TASK-551-01-L03" : "TASK-551-01-L02",
    phase: row.phase,
    ...(row.profile === undefined ? {} : { profile: row.profile }),
    ...resultFor(row),
  };
}
function projectionInput(
  row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number],
  result: unknown = resultFor(row)
) {
  return { manifestRow: row, taskId: "TASK-551-11", sourceHead, sourceDigest, timestamp, result };
}
async function evidenceTestHarness() {
  return createTask551EvidenceTestHarnessForTests();
}
function writerEvidenceValue(
  row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number],
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  if (row !== TASK551_DURABLE_EVIDENCE_MANIFEST[0]) throw new Error("test fixture row unsupported");
  return {
    schema: row.schema,
    taskId: "TASK-551-01-L03",
    phase: "l03-initialize",
    pass: true,
    noLeak: true,
    commandReceipt: processReceipt(),
    ...overrides,
  };
}
function staticWriterEvidenceValue(
  row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number],
  manifestSha256: string
): Record<string, unknown> {
  if (row !== TASK551_DURABLE_EVIDENCE_MANIFEST[2]) throw new Error("test fixture row unsupported");
  return {
    schema: row.schema,
    taskId: "TASK-551-01-L02",
    phase: "l02-static",
    profile: "small",
    pass: true,
    noLeak: true,
    focusedTests: [processReceipt(), processReceipt()],
    manifestSha256,
  };
}

describe("TASK-551 evidence decoder and L10 projection", () => {
  test("binds eleven deeply frozen descriptors to manifest identity through the facade", async () => {
    expect(TASK551_EVIDENCE_VALUE_DESCRIPTORS).toHaveLength(11);
    for (const [index, descriptor] of TASK551_EVIDENCE_VALUE_DESCRIPTORS.entries()) {
      expect(descriptor.manifestRow).toBe(TASK551_DURABLE_EVIDENCE_MANIFEST[index]);
      expect(descriptor.path).toBe(TASK551_DURABLE_EVIDENCE_MANIFEST[index]?.path);
      expect(Object.isFrozen(descriptor)).toBe(true);
      expect(Object.isFrozen(descriptor.root)).toBe(true);
      expect(Object.isFrozen(descriptor.root.fields)).toBe(true);
    }
    expect(
      TASK551_EVIDENCE_VALUE_DESCRIPTORS.map((descriptor) => descriptor.expectedTaskId)
    ).toEqual([
      "TASK-551-01-L03",
      "TASK-551-01-L03",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-05-L02",
      "TASK-551-05-L02",
    ]);
    const [facadeSource, helperSource, implementSource, declarationSource] = await Promise.all([
      readFile(
        new URL("../../../_docs/_workflows/lib/task-551-contract.mjs", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../../_docs/_workflows/lib/task-551-evidence-contract.mjs", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../../_docs/_workflows/task-551-implement.mjs", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../../_docs/_workflows/lib/task-551-contract.d.mts", import.meta.url),
        "utf8"
      ),
    ]);
    expect(facadeSource).toContain('from "./task-551-evidence-contract.mjs"');
    expect(facadeSource).toMatch(
      /export async function bootstrapTask551EvidenceStorageForOwnerWorkflowHost\(\)/u
    );
    expect(declarationSource).not.toContain("bootstrapTask551EvidenceStorageForOwnerWorkflowHost");
    expect(implementSource).toContain("bootstrapTask551EvidenceStorageForOwnerWorkflowHost");
    expect(implementSource).not.toContain('from "./lib/task-551-evidence-contract.mjs"');
    const declaredNames = new Set(
      [
        ...declarationSource.matchAll(
          /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|function|class|interface|type)\s+([A-Za-z0-9_]+)/gmu
        ),
      ].map(([, name]) => name)
    );
    const ownerOnlyRuntimeExport = "bootstrapTask551EvidenceStorageForOwnerWorkflowHost";
    expect(
      Object.keys(task551ContractRuntime).filter(
        (name) => name !== ownerOnlyRuntimeExport && !declaredNames.has(name)
      )
    ).toEqual([]);
    const declaredValueNames = new Set(
      [
        ...declarationSource.matchAll(
          /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|function|class|enum)\s+([A-Za-z0-9_]+)/gmu
        ),
      ].map(([, name]) => name)
    );
    expect([...declaredValueNames].filter((name) => !(name in task551ContractRuntime))).toEqual([]);
    expect(helperSource).not.toMatch(/from\s+["'][^"']*task-551-contract\.mjs["']/u);
    expect(helperSource).not.toMatch(/task489SolutionKitRunPredecessor/u);
    expect(helperSource).toContain(
      "ownerEvidenceStorageBootstrap = installTask551EvidenceStorageForOwner("
    );
    expect(helperSource).toContain(
      "arguments.length !== 0 || ownerEvidenceStorageBootstrap !== undefined"
    );
  });

  test("keeps test-only declaration imports and the owner bridge closed", async () => {
    const base = "../../../_docs/_workflows/";
    const [
      authorDeclaration,
      implementDeclaration,
      fixDeclaration,
      evidenceDeclaration,
      authorTest,
      authorDriftTest,
      authorBoundedTest,
      authorFixtures,
      workflowTest,
      workflowBootstrapTest,
      workflowSubgatesTest,
      workflowImplementationTest,
      workflowFixtures,
      workflowExecutionFixtures,
      evidenceTest,
      capsTest,
      authorSource,
      implementSource,
      fixSource,
    ] = await Promise.all([
      readFile(new URL(`${base}task-551-author-audit.d.mts`, import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-implement.d.mts`, import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-fix.d.mts`, import.meta.url), "utf8"),
      readFile(new URL(`${base}lib/task-551-evidence-contract.d.mts`, import.meta.url), "utf8"),
      readFile(new URL("./task551AuthorAudit.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./authorAuditDriftRounds.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./authorAuditBoundedChild.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551AuthorAuditFixtures.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551WorkflowContracts.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./workflowContractsBootstrap.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./workflowContractsSubgates.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./workflowContractsImplementation.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551WorkflowContractsFixtures.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551WorkflowExecutionFixtures.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551EvidenceContract.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./dispatchContractCaps.test.ts", import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-author-audit.mjs`, import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-implement.mjs`, import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-fix.mjs`, import.meta.url), "utf8"),
    ]);
    const declaredValues = (source: string) =>
      [
        ...source.matchAll(
          /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|function|class|enum)\s+([A-Za-z0-9_]+)/gmu
        ),
      ]
        .map(([, name]) => name)
        .sort();
    expect(declaredValues(authorDeclaration)).toEqual(
      [
        "TASK551_RECONCILE_SCOPE",
        "deriveTask551AuditScopes",
        "evaluateTask551DriftRound",
        "normalizeTask551AuditResult",
        "planTask551Reaudit",
        "preflightTask551AuthorAuditDispatch",
        "requireTask551AuthoredScope",
        "requireTask551ProductionDispatchTaskSnapshot",
        "requireTask551ResearchGrounding",
        "requireTask551TestDispatchTaskSnapshotForTests",
        "runTask551AuthorAuditWorkflow",
        "runTask551AuthorAuditWorkflowForTests",
        "runTask551DriftAuditRound",
      ].sort()
    );
    expect(declaredValues(implementDeclaration)).toEqual(
      [
        "createTask551TestExecutionSession",
        "deriveTask551ImplementLandOrder",
        "publishTask551PhaseEvidence",
        "runTask551ImplementWorkflow",
        "runTask551ImplementWorkflowForTests",
      ].sort()
    );
    expect(declaredValues(fixDeclaration)).toEqual(
      [
        "requireTask551CommandReceiptV1",
        "requireTask551LogicalArgvPreimageV1",
        "runTask551BoundedChild",
      ].sort()
    );
    expect(declaredValues(evidenceDeclaration)).toEqual([
      "createTask551EvidenceTestHarnessForTests",
    ]);
    for (const source of [
      authorDeclaration,
      implementDeclaration,
      fixDeclaration,
      evidenceDeclaration,
    ])
      expect(source).not.toMatch(
        /(?:declare\s+(?:global|module)|export\s+\*|bootstrapTask551EvidenceStorageForOwnerWorkflowHost)/u
      );
    const privateImports = (source: string) =>
      [
        ...source.matchAll(
          /from\s+["']([^"']+_docs\/_workflows\/(?:task-551-(?:author-audit|implement|fix)|lib\/task-551-evidence-contract)\.mjs)["']/gu
        ),
      ]
        .map(([, specifier]) => specifier)
        .sort();
    expect([
      privateImports(authorTest),
      privateImports(authorDriftTest),
      privateImports(authorBoundedTest),
      privateImports(authorFixtures),
      privateImports(workflowTest),
      privateImports(workflowBootstrapTest),
      privateImports(workflowSubgatesTest),
      privateImports(workflowImplementationTest),
      privateImports(workflowFixtures),
      privateImports(workflowExecutionFixtures),
      privateImports(evidenceTest),
      privateImports(capsTest),
    ]).toEqual([
      [`${base}task-551-author-audit.mjs`],
      [`${base}task-551-author-audit.mjs`],
      [`${base}task-551-fix.mjs`],
      [],
      [],
      [`${base}task-551-fix.mjs`],
      [`${base}task-551-implement.mjs`],
      [`${base}task-551-implement.mjs`],
      [],
      [
        `${base}task-551-author-audit.mjs`,
        `${base}task-551-fix.mjs`,
        `${base}task-551-implement.mjs`,
      ].sort(),
      [`${base}lib/task-551-evidence-contract.mjs`, `${base}task-551-implement.mjs`].sort(),
      [`${base}task-551-author-audit.mjs`],
    ]);
    const bridge = "bootstrapTask551EvidenceStorageForOwnerWorkflowHost";
    expect(
      [authorSource, implementSource, fixSource].filter((source) => source.includes(bridge))
    ).toEqual([implementSource]);
  });

  test("accepts only closed, detached evidence shapes and rejects hostile nested data", async () => {
    for (const row of TASK551_DURABLE_EVIDENCE_MANIFEST) {
      expect(validateTask551EvidenceValue(row, evidenceValueFor(row))).toBeNull();
    }
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[0]!;
    const valid = requireEvidenceRecord(evidenceValueFor(row));
    expect(validateTask551EvidenceBytes(row, Buffer.from(`${JSON.stringify(valid)}\n`))).toBeNull();
    expect(
      validateTask551EvidenceBytes(
        row,
        Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(`${JSON.stringify(valid)}\n`)])
      )
    ).toBe("task551_evidence_json_invalid");
    expect(validateTask551EvidenceBytes(row, Buffer.alloc(1_048_577, 0x20))).toBe(
      "task551_evidence_bytes_invalid"
    );
    expect(
      validateTask551EvidenceValue(row, {
        ...valid,
        commandReceipt: { DATABASE_URL: "postgres://leak" },
      })
    ).toBe("task551_evidence_value_invalid");
    expect(
      validateTask551EvidenceValue(row, {
        ...valid,
        commandReceipt: { ...requireEvidenceRecord(valid.commandReceipt), arbitrary: "nested" },
      })
    ).toBe("task551_evidence_value_invalid");
    const nullPrototype = Object.assign(Object.create(null), valid);
    expect(validateTask551EvidenceValue(row, nullPrototype)).toBe("task551_evidence_value_invalid");
    const inheritedPrototype = Object.assign(Object.create({ inherited: true }), valid);
    expect(validateTask551EvidenceValue(row, inheritedPrototype)).toBe(
      "task551_evidence_value_invalid"
    );
    const accessor = requireMutableEvidence(evidenceValueFor(row));
    delete accessor.commandReceipt.stdoutBytes;
    Object.defineProperty(accessor.commandReceipt, "stdoutBytes", {
      enumerable: true,
      get: () => 0,
    });
    expect(validateTask551EvidenceValue(row, accessor)).toBe("task551_evidence_value_invalid");
    const symbol = requireMutableEvidence(evidenceValueFor(row));
    Object.defineProperty(symbol.commandReceipt, Symbol("hidden"), {
      enumerable: true,
      value: true,
    });
    expect(validateTask551EvidenceValue(row, symbol)).toBe("task551_evidence_value_invalid");
    const cycle = requireMutableEvidence(evidenceValueFor(row));
    cycle.commandReceipt.loop = cycle.commandReceipt;
    expect(validateTask551EvidenceValue(row, cycle)).toBe("task551_evidence_value_invalid");
    const staticRow = TASK551_DURABLE_EVIDENCE_MANIFEST[2]!;
    const sparse = requireEvidenceRecord(evidenceValueFor(staticRow));
    const focusedTestsWithHole = [processReceipt()];
    focusedTestsWithHole.length = 2;
    sparse.focusedTests = focusedTestsWithHole;
    expect(validateTask551EvidenceValue(staticRow, sparse)).toBe("task551_evidence_value_invalid");
    const oversized = requireMutableEvidence(evidenceValueFor(row));
    oversized.commandReceipt.stdoutBytes = 1_048_577;
    expect(validateTask551EvidenceValue(row, oversized)).toBe("task551_evidence_value_invalid");

    const freezeRow = TASK551_DURABLE_EVIDENCE_MANIFEST[4]!;
    for (const forbiddenText of [
      "Bearer live-credential",
      "mysql://user:password@host",
      "select secret from bindings",
      "API key capabilities",
    ]) {
      const candidate = requireEvidenceRecord(evidenceValueFor(freezeRow));
      requireEvidenceRecord(candidate.candidateReceipt).cpuModel = forbiddenText;
      expect(validateTask551EvidenceValue(freezeRow, candidate)).toBe(
        "task551_evidence_value_invalid"
      );
    }

    const promotionRow = TASK551_DURABLE_EVIDENCE_MANIFEST[10]!;
    const invalidPromotion = requireEvidenceRecord(promotion());
    invalidPromotion.sourceHead = "Bearer live-credential";
    invalidPromotion.createdAt = "Bearer live-credential";
    expect(validateTask551EvidenceValue(promotionRow, invalidPromotion)).toBe(
      "task551_evidence_value_invalid"
    );
  });

  test("projects every accepted L10 evidence branch as an exact frozen fourteen-key envelope", () => {
    for (const row of TASK551_DURABLE_EVIDENCE_MANIFEST.slice(0, 9)) {
      const envelope = buildTask551L10EvidenceProjection(projectionInput(row));
      expect(Object.keys(envelope)).toEqual(TASK551_L10_PROJECTION_KEYS);
      expect(envelope.status).toBe("accepted");
      expect(envelope.profile).toBe(row.profile ?? null);
      expect(envelope.noLeak).toBe(true);
      expect(envelope.predecessor).toBeNull();
      expect(envelope.promotion).toBeNull();
      expect(Object.keys(requireEvidenceRecord(envelope.result))).toEqual(
        TASK551_L10_RESULT_FIELDS[row.phase]!
      );
      expect(Object.isFrozen(envelope)).toBe(true);
      expect(Object.isFrozen(envelope.result)).toBe(true);
    }
    const initializeRow = TASK551_DURABLE_EVIDENCE_MANIFEST[0]!;
    const receipt = processReceipt();
    const projection = buildTask551L10EvidenceProjection(
      projectionInput(initializeRow, { pass: true, noLeak: true, commandReceipt: receipt })
    );
    const projectionResult = requireEvidenceRecord(projection.result);
    const projectionReceipt = requireEvidenceRecord(projectionResult.commandReceipt);
    receipt.stdoutBytes = 37;
    expect(projectionReceipt.stdoutBytes).toBe(0);
    expect(Object.isFrozen(projectionReceipt)).toBe(true);
    expect(Reflect.set(projectionReceipt, "stdoutBytes", 17)).toBe(false);
    expect(() =>
      buildTask551L10EvidenceProjection({ ...projectionInput(initializeRow), status: "rejected" })
    ).toThrow(/projection_identity_invalid/);
    const staticRow = TASK551_DURABLE_EVIDENCE_MANIFEST[2]!;
    const staticResult = requireEvidenceRecord(resultFor(staticRow));
    expect(() =>
      buildTask551L10EvidenceProjection(
        projectionInput(staticRow, { ...staticResult, unexpected: true })
      )
    ).toThrow(/projection_value_invalid/);
    const { manifestSha256: _missing, ...missingResult } = staticResult;
    expect(() =>
      buildTask551L10EvidenceProjection(projectionInput(staticRow, missingResult))
    ).toThrow(/projection_value_invalid/);
    const aliasedReceipt = processReceipt();
    expect(() =>
      buildTask551L10EvidenceProjection(
        projectionInput(staticRow, {
          pass: true,
          noLeak: true,
          focusedTests: [aliasedReceipt, aliasedReceipt],
          manifestSha256: sha("alias"),
        })
      )
    ).toThrow(/projection_value_invalid/);
  });

  test("requires the closed terminal predecessor and promotion pair with null-only terminal fields", () => {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[10]!;
    const predecessor = predecessorPayload();
    const terminal = buildTask551L10EvidenceProjection({
      manifestRow: row,
      taskId: "TASK-551-11",
      sourceHead,
      sourceDigest,
      timestamp,
      result: null,
      predecessor,
      promotion: promotion(),
    });
    expect(Object.keys(terminal)).toEqual(TASK551_L10_PROJECTION_KEYS);
    expect(terminal.profile).toBeNull();
    expect(terminal.result).toBeNull();
    expect(terminal.noLeak).toBeNull();
    expect(Object.isFrozen(terminal.predecessor)).toBe(true);
    expect(Object.isFrozen(terminal.promotion)).toBe(true);
    const base = {
      manifestRow: row,
      taskId: "TASK-551-11",
      sourceHead,
      sourceDigest,
      timestamp,
      result: null,
    };
    expect(() =>
      buildTask551L10EvidenceProjection({ ...base, predecessor: {}, promotion: promotion() })
    ).toThrow(/projection_(?:value|terminal)_invalid/);
    expect(() => buildTask551L10EvidenceProjection({ ...base, predecessor })).toThrow(
      /terminal_invalid/
    );
    expect(() =>
      buildTask551L10EvidenceProjection({
        ...base,
        predecessor,
        promotion: { ...promotion(), extra: true },
      })
    ).toThrow(/projection_value_invalid/);
    expect(() =>
      buildTask551L10EvidenceProjection({
        ...base,
        predecessor,
        promotion: { ...promotion(), sourceDigest: sha("other") },
      })
    ).toThrow(/terminal_invalid/);
  });
});
