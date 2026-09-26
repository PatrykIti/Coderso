import { describe, expect, test } from "bun:test";
import {
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_TERMINAL_HANDOFF_PATHS,
  recoverTask551EvidenceRoot,
  sha256Task551Bytes,
  validateTask551EvidenceValue,
  verifyTask551TerminalCommittedHeadHandoff,
  writeTask551EvidenceFileIfAbsent,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import type { Task551TerminalCommittedHeadHandoffInputV1 } from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import { publishTask551PhaseEvidence } from "../../../_docs/_workflows/task-551-implement.mjs";
import { createTask551EvidenceTestHarnessForTests } from "../../../_docs/_workflows/lib/task-551-evidence-contract.mjs";
import {
  evidenceValueFor,
  processReceipt,
  promotion,
  sha,
  sourceHead,
  terminalHead,
} from "./task551EvidenceContractFixtures.js";

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
