import { readFileSync, readdirSync } from "node:fs";
import { afterEach, describe, expect, test } from "bun:test";
import * as freezeCandidateGenerationStore from "../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationStore";
import {
  computeTask551ActiveGenerationClosureBindingsForStore,
  installTask551ActiveGenerationFilesystemForFocusedTest,
  installTask551ActiveGenerationMemoryStateForFocusedTest,
  readTask551ActiveGenerationStateForStore,
  refuseTask551LegacyActiveInputForStore,
  resetTask551ActiveGenerationFilesystemForFocusedTest,
  serializeTask551ActiveGenerationStateV2,
  sha256Task551ActiveGenerationBytesForStore,
  TASK551_ACTIVE_GENERATION_ARCHIVE_PATH,
  TASK551_ACTIVE_GENERATION_LOCK_PATH,
  TASK551_ACTIVE_GENERATION_PARENT,
  TASK551_ACTIVE_GENERATION_STATE_PATH,
  TASK551_ACTIVE_GENERATION_TEMP_PATH,
  verifyTask551ActiveGenerationArchiveForStore,
  withTask551ActiveGenerationStoreLock,
  writeTask551ActiveGenerationStateForStore,
  type Task551ActiveGenerationFilesystemOps,
  type Task551ActiveGenerationStoreReadResult,
} from "../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationStore";
import {
  createTask551L02OwnerCapabilityFactory as createFacadeLegacyFactory,
  createTask551ReviewedPairPersistence as createFacadeLegacyPersistence,
  defaultTask551ReviewedPairPersistence,
  parseTask551L02ActiveStateTransitionReceiptV2,
  parseTask551L02ReviewedStateAttestationV2,
  transitionJustFrozenCandidatesAfterL02HumanApproval as transitionFacadeLegacy,
} from "../../../scripts/task551DatabaseBaseline/reviewedPairPersistence";
import * as facade from "../../../scripts/task551DatabaseBaseline/reviewedPairPersistence";
import {
  createTask551L02OwnerCapabilityFactory as createRunnerLegacyFactory,
  createTask551ReviewedPairPersistence as createRunnerLegacyPersistence,
  transitionJustFrozenCandidatesAfterL02HumanApproval as transitionRunnerLegacy,
} from "../../../scripts/task551DatabaseBaseline/runner";
import * as runner from "../../../scripts/task551DatabaseBaseline/runner";
import {
  createTask551CandidateReceiptWriterForFocusedTest,
  defaultReadReceipt,
  installTask551L02ReviewedTransitionFocusedStorageForTest,
  readTask551L02ReviewedStateAttestationForCheck,
  registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition,
  resetTask551L02ReviewedTransitionForFocusedTest,
  runL02OwnedReviewedTransition,
  verifyTask551L02OwnerApprovalRuntimeBrandForFocusedTest,
} from "../../../scripts/task551DatabaseBaseline/reviewedPairTransition";
import * as ownerHost from "../../../scripts/task551DatabaseBaseline/reviewedPairOwnerHost";
import {
  buildExactTask551ReviewedResultByChangingOnlyReviewState,
  buildTask551ReviewedCandidateTransitionInput,
  canonicalizeTask551Rfc8785,
  computeTask551ReviewableReceiptDigest,
  type JsonValue,
  type Task551LowercaseSha256,
  type Task551ReviewableFreezeReceiptV1,
  type Task551ScaleProfile,
} from "../../../scripts/task551DatabaseBaseline/digestContract";
import {
  TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2,
  TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2,
  TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_SCHEMA_V2,
  TASK551_L02_REVIEWED_STATE_ATTESTATION_KEYS_V2,
  TASK551_L02_REVIEWED_STATE_ATTESTATION_SCHEMA_V2,
  type Task551L02ActiveStateTransitionReceiptV2,
  type Task551L02ReviewedStateAttestationV2,
} from "../../../scripts/task551DatabaseBaseline/receiptContract";
import { extractTask551DatabaseFreezeReceiptObjectSpan } from "../../../scripts/task551DatabaseBaseline/reviewedPairReceiptSource";
import {
  parseTask551FreezeCandidateGenerationBootstrapV2,
  TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2,
} from "../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap";
import {
  computeTask551ActiveGenerationStateDigestV2,
  initialTask551FreezeCandidateGenerationStateV2,
  parseTask551FreezeCandidateGenerationStateV2,
  task551AwaitingLargeStateV2,
  task551ReadyForReviewStateV2,
  task551ReviewedStateV2,
  type Task551FreezeCandidateGenerationStateV2,
} from "./freezeCandidateGenerationState";
import { parseTask551ReviewedPairV2 } from "./freezeCandidateGenerationFixture";
import { makeTask551ActiveGenerationStateV2 } from "./freezeCandidateGenerationTestHelpers";
import { fakeSha256, makeReceipt } from "./contractTestHelpers";

const snapshotDigest = "d".repeat(64);
const archiveUrl = new URL("./freezeReceipts.ts", import.meta.url);
type FocusedIo = Parameters<typeof installTask551L02ReviewedTransitionFocusedStorageForTest>[0];
type ReviewedReceipt = Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "reviewed" }>;
type CandidateReceipt = Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "candidate" }>;

function stateDigestOf(state: Task551FreezeCandidateGenerationStateV2): Task551LowercaseSha256 {
  return computeTask551ActiveGenerationStateDigestV2(state, fakeSha256) as Task551LowercaseSha256;
}

function candidateInput(
  small: Task551ReviewableFreezeReceiptV1,
  large: Task551ReviewableFreezeReceiptV1
) {
  return buildTask551ReviewedCandidateTransitionInput(
    [
      { profile: "small", candidateReceipt: small },
      { profile: "large", candidateReceipt: large },
    ],
    fakeSha256
  );
}

function requestFor(
  small: Task551ReviewableFreezeReceiptV1,
  large: Task551ReviewableFreezeReceiptV1
) {
  const input = candidateInput(small, large);
  return {
    worktreeSnapshotDigest: snapshotDigest,
    smallCandidateCanonicalDigest: input.candidates[0].candidateCanonicalReceiptDigest,
    largeCandidateCanonicalDigest: input.candidates[1].candidateCanonicalReceiptDigest,
  } as const;
}

function reviewedResultFor(
  small: Task551ReviewableFreezeReceiptV1,
  large: Task551ReviewableFreezeReceiptV1
) {
  return buildExactTask551ReviewedResultByChangingOnlyReviewState({
    input: candidateInput(small, large),
    capabilityReceipt: {
      schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
      digest: "c".repeat(64),
    },
    sha256Bytes: fakeSha256,
  });
}

function reviewedReceiptsOf(
  small: Task551ReviewableFreezeReceiptV1,
  large: Task551ReviewableFreezeReceiptV1
): readonly [ReviewedReceipt, ReviewedReceipt] {
  const reviewed = reviewedResultFor(small, large).reviewed.map(
    (entry) => entry.reviewedReceipt as ReviewedReceipt
  );
  return [reviewed[0]!, reviewed[1]!];
}

// Rescoping recomputes the self digest and keeps the receipt's review state,
// so a rescoped candidate is still exactly a candidate.
function receiptWithScope(receipt: CandidateReceipt, scopeDigest: string): CandidateReceipt {
  const { reviewableReceiptDigest: _ignored, ...withoutDigest } = { ...receipt, scopeDigest };
  return {
    ...withoutDigest,
    reviewableReceiptDigest: computeTask551ReviewableReceiptDigest(withoutDigest, fakeSha256),
  } as CandidateReceipt;
}

function readyForReviewSetup(small = makeReceipt("small"), large = makeReceipt("large")) {
  const [smallReviewed, largeReviewed] = reviewedReceiptsOf(small, large);
  const readyState = task551ReadyForReviewStateV2(small, large);
  return {
    small,
    large,
    readyState,
    reviewedState: task551ReviewedStateV2(readyState, smallReviewed, largeReviewed),
    request: requestFor(small, large),
  };
}

// The focused replacement for the private storage authority is a state cell:
// exactly one validated v2 state plus the recorded mutation order.
function stateCell(
  initial: Task551FreezeCandidateGenerationStateV2,
  options: Readonly<{
    acceptedSnapshotDigest?: Task551LowercaseSha256;
    now?: () => number;
    writeFailure?: boolean;
  }> = {}
): {
  input: FocusedIo;
  events: string[];
  state: () => Task551FreezeCandidateGenerationStateV2;
  stateDigest: () => Task551LowercaseSha256;
  reads: () => number;
  writes: () => number;
  locks: () => number;
  replaceState: (next: Task551FreezeCandidateGenerationStateV2) => void;
} {
  let current = initial;
  let reads = 0;
  let writes = 0;
  let locks = 0;
  const events: string[] = [];
  const read = (): Task551ActiveGenerationStoreReadResult =>
    Object.freeze({ state: current, stateDigest: stateDigestOf(current), absent: false });
  const set = (next: Task551FreezeCandidateGenerationStateV2) => {
    current = next;
  };
  const input = {
    withLock: <T>(callback: () => T): T => {
      locks += 1;
      events.push("lock");
      return callback();
    },
    readState: () => {
      reads += 1;
      events.push("read");
      return read();
    },
    writeState: (next: Task551FreezeCandidateGenerationStateV2) => {
      if (options.writeFailure) throw new Error("injected write failure");
      writes += 1;
      events.push("write");
      set(next);
      return read();
    },
    sha256Bytes: fakeSha256,
    now: options.now ?? (() => 100),
    readAcceptedSnapshotDigest: (registered: Task551LowercaseSha256) =>
      options.acceptedSnapshotDigest ?? registered,
  };
  return {
    input: input as FocusedIo,
    events,
    state: () => current,
    replaceState: set,
    stateDigest: () => stateDigestOf(current),
    reads: () => reads,
    writes: () => writes,
    locks: () => locks,
  };
}

type FakeEntry =
  | Readonly<{ kind: "directory" }>
  | Readonly<{ kind: "file"; bytes: Uint8Array }>
  | Readonly<{ kind: "symlink" }>;

function parentLayout(): Map<string, FakeEntry> {
  const entries = new Map<string, FakeEntry>();
  for (const directory of [".tmp", ".tmp/task-551", TASK551_ACTIVE_GENERATION_PARENT]) {
    entries.set(directory, { kind: "directory" });
  }
  return entries;
}

function entryBytes(entries: Map<string, FakeEntry>, path: string): Uint8Array {
  const found = entries.get(path);
  if (found === undefined || found.kind !== "file") {
    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  }
  return found.bytes;
}

function fakeFilesystem(entries: Map<string, FakeEntry>): Task551ActiveGenerationFilesystemOps {
  const missing = (): Error => Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  return {
    lstatSync: (path) => {
      const found = entries.get(path);
      if (found === undefined) throw missing();
      return {
        isDirectory: found.kind === "directory",
        isFile: found.kind === "file",
        isSymbolicLink: found.kind === "symlink",
      };
    },
    readFileSync: (path) => entryBytes(entries, path),
    readTextSync: (path) => new TextDecoder().decode(entryBytes(entries, path)),
    readChildNamesSync: (path) => {
      if (!entries.has(path)) throw missing();
      const prefix = `${path}/`;
      return [...entries.keys()]
        .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
        .map((key) => key.slice(prefix.length));
    },
    openExclusiveWriteSync: (path) => {
      if (entries.has(path)) throw Object.assign(new Error("EEXIST"), { code: "EEXIST" });
      let payload: Uint8Array | undefined;
      return {
        write: (bytes) => {
          payload = bytes;
        },
        flush: () => undefined,
        close: () => entries.set(path, { kind: "file", bytes: payload ?? new Uint8Array() }),
      };
    },
    renameSync: (from, to) => {
      const found = entries.get(from);
      if (found === undefined) throw missing();
      entries.delete(from);
      entries.set(to, found);
    },
    unlinkSync: (path) => {
      if (!entries.delete(path)) throw missing();
    },
  };
}

function withEntries(entries: Map<string, FakeEntry>): void {
  installTask551ActiveGenerationFilesystemForFocusedTest(fakeFilesystem(entries));
}

function orderedByKeys(
  keys: readonly string[],
  source: Record<string, unknown>
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  for (const key of keys) ordered[key] = source[key];
  return ordered;
}

function canonicalTransitionReceipt(
  fields: Omit<Task551L02ActiveStateTransitionReceiptV2, "transitionId">
): Task551L02ActiveStateTransitionReceiptV2 {
  const withoutId = orderedByKeys(
    TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2.filter((key) => key !== "transitionId"),
    fields as Record<string, unknown>
  );
  const transitionId = fakeSha256(
    canonicalizeTask551Rfc8785(withoutId as unknown as JsonValue)
  ) as Task551LowercaseSha256;
  return orderedByKeys(TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2, {
    ...withoutId,
    transitionId,
  }) as unknown as Task551L02ActiveStateTransitionReceiptV2;
}

// The full three-edge identifier chain derived from the documented canonical
// projection alone: the digest of the exact canonical payload without its own
// identifier, in canonical key order.
function expectedChain(small: CandidateReceipt, large: CandidateReceipt) {
  const bindings = computeTask551ActiveGenerationClosureBindingsForStore();
  const base = {
    schema: TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_SCHEMA_V2,
    version: 2 as const,
    generationId: initialTask551FreezeCandidateGenerationStateV2.generationId,
    archiveSha256: bindings.archiveSha256,
    l02ClosureSha256: bindings.l02ClosureSha256,
    bootstrapSourceSha256: bindings.bootstrapSourceSha256,
  };
  const readyState = task551ReadyForReviewStateV2(small, large);
  const [smallReviewed, largeReviewed] = reviewedReceiptsOf(small, large);
  const reviewedState = task551ReviewedStateV2(readyState, smallReviewed, largeReviewed);
  const awaitingLargeDigest = stateDigestOf(task551AwaitingLargeStateV2(small));
  const readyDigest = stateDigestOf(readyState);
  const reviewedDigest = stateDigestOf(reviewedState);
  const edges = [
    ["freeze-small", 1, "awaiting-small", "absent", "awaiting-large", awaitingLargeDigest],
    ["freeze-large", 2, "awaiting-large", awaitingLargeDigest, "ready-for-review", readyDigest],
    ["review", 3, "ready-for-review", readyDigest, "reviewed", reviewedDigest],
  ] as const;
  const receipts: Task551L02ActiveStateTransitionReceiptV2[] = [];
  for (const [operation, sequence, beforeState, beforeDigest, afterState, afterDigest] of edges) {
    receipts.push(
      canonicalTransitionReceipt({
        ...base,
        operation,
        sequence,
        beforeState,
        beforeStateDigest: beforeDigest,
        afterState,
        afterStateDigest: afterDigest,
        previousTransitionId: receipts[receipts.length - 1]?.transitionId ?? null,
      })
    );
  }
  const [first, second, third] = receipts;
  const attestation = orderedByKeys(TASK551_L02_REVIEWED_STATE_ATTESTATION_KEYS_V2, {
    schema: TASK551_L02_REVIEWED_STATE_ATTESTATION_SCHEMA_V2,
    version: 2,
    state: "reviewed",
    sequence: 3,
    transitionId: third!.transitionId,
    stateDigest: reviewedDigest,
    generationId: initialTask551FreezeCandidateGenerationStateV2.generationId,
    archiveSha256: bindings.archiveSha256,
    l02ClosureSha256: bindings.l02ClosureSha256,
    bootstrapSourceSha256: bindings.bootstrapSourceSha256,
  }) as unknown as Task551L02ReviewedStateAttestationV2;
  return {
    bindings,
    first: first!,
    second: second!,
    third: third!,
    attestation,
    reviewedState,
    readyDigest,
    reviewedDigest,
    smallReviewed,
    largeReviewed,
  };
}

// Installs a reviewed state as the durable store bytes, replacing any focused
// filesystem or memory cell left over from an earlier assertion.
function installReviewedState(state: Task551FreezeCandidateGenerationStateV2): void {
  resetTask551ActiveGenerationFilesystemForFocusedTest();
  const [small, large] = state.receipts.map((slot) => slot.receipt as ReviewedReceipt);
  installTask551ActiveGenerationMemoryStateForFocusedTest(
    makeTask551ActiveGenerationStateV2("reviewed", small!, large!)
  );
}

// A factory returning the synchronous review channel for one host lifecycle.
function hostApprove(expiresAtUnixMs = 1_000) {
  return () => () => Object.freeze({ approved: true as const, expiresAtUnixMs });
}

async function runApprovedTransition(request: ReturnType<typeof requestFor>) {
  ownerHost.replaceTask551OwnerReviewFactoryForFocusedTest(hostApprove());
  return ownerHost.runTask551L02OwnerHostInSameRealm(async () => {
    registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
    return runL02OwnedReviewedTransition(request);
  });
}

afterEach(() => {
  ownerHost.resetTask551OwnerReviewFactoryForFocusedTest();
  resetTask551L02ReviewedTransitionForFocusedTest();
  resetTask551ActiveGenerationFilesystemForFocusedTest();
});

// Export-surface contract: the facade closure is exactly the L11 handoff plus
// the fail-closed legacy authorities, and the runner never re-exports the
// transition implementation, its owner-host ingress, or the non-declared hook.
const task551FacadeSurfaceKeys = [
  "createTask551L02OwnerCapabilityFactory",
  "createTask551ReviewedPairPersistence",
  "defaultTask551ReviewedPairPersistence",
  "parseTask551L02ActiveStateTransitionReceiptV2",
  "parseTask551L02ReviewedStateAttestationV2",
  "registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition",
  "runL02OwnedReviewedTransition",
  "transitionJustFrozenCandidatesAfterL02HumanApproval",
];
const task551RunnerSurfaceKeys = [
  "TASK551_DATABASE_BASELINE_DIGEST_VERSION",
  "createTask551L02OwnerCapabilityFactory",
  "createTask551ReviewedPairPersistence",
  "runTask551DatabaseBaseline",
  "transitionJustFrozenCandidatesAfterL02HumanApproval",
];

describe("TASK-551 L02 reviewed-pair facade", () => {
  test("exposes exactly the contracted facade and runner export closures", () => {
    expect(Object.keys(facade).sort()).toEqual(task551FacadeSurfaceKeys);
    expect(Object.keys(runner).sort()).toEqual(task551RunnerSurfaceKeys);
    // No declaration file may exist to re-declare the non-declared registration
    // hook or a private transition/owner-host export as a public surface.
    expect(
      readdirSync(new URL("../../../scripts/task551DatabaseBaseline", import.meta.url)).filter(
        (name) => name.endsWith(".d.ts") || name.endsWith(".d.mts")
      )
    ).toEqual([]);
  });

  test("fails every legacy facade and runner authority before any persistence activity", () => {
    const legacyAuthorities = [
      createFacadeLegacyPersistence,
      defaultTask551ReviewedPairPersistence,
      transitionFacadeLegacy,
      createFacadeLegacyFactory,
      createRunnerLegacyPersistence,
      transitionRunnerLegacy,
      createRunnerLegacyFactory,
    ];
    for (const authority of legacyAuthorities) {
      expect(() => authority()).toThrow("l02_owned_reviewed_transition_legacy_migration_required");
    }
  });

  test("verifies the pinned archive as the exact checked-in bytes with one receipt declaration", () => {
    const archiveText = readFileSync(archiveUrl, "utf8");
    const archiveBytes = readFileSync(archiveUrl);
    expect(TASK551_ACTIVE_GENERATION_ARCHIVE_PATH).toBe(
      "tests/perf/task551DatabaseBaseline/freezeReceipts.ts"
    );
    expect(sha256Task551ActiveGenerationBytesForStore(archiveBytes)).toBe(
      TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2
    );
    expect(TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2.archive).toEqual({
      path: TASK551_ACTIVE_GENERATION_ARCHIVE_PATH,
      sha256: TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2,
    });
    expect(() =>
      parseTask551FreezeCandidateGenerationBootstrapV2(
        TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2
      )
    ).not.toThrow();
    const span = extractTask551DatabaseFreezeReceiptObjectSpan(archiveText);
    expect(span.objectStart).toBeGreaterThan(0);
    expect(span.objectEnd).toBeGreaterThan(span.objectStart);
    expect(() =>
      extractTask551DatabaseFreezeReceiptObjectSpan(`${archiveText}\n${archiveText}`)
    ).toThrow("database_baseline_invalid");
    expect(() => verifyTask551ActiveGenerationArchiveForStore()).not.toThrow();
  });

  test("exposes no archive writer and leaves the archive bytes untouched while the state mutates", () => {
    const archiveBefore = readFileSync(archiveUrl);
    expect(
      Object.keys(freezeCandidateGenerationStore)
        .filter((name) => /archive/i.test(name))
        .sort()
    ).toEqual(
      [
        "TASK551_ACTIVE_GENERATION_ARCHIVE_PATH",
        "verifyTask551ActiveGenerationArchiveForStore",
      ].sort()
    );
    installTask551ActiveGenerationMemoryStateForFocusedTest("absent");
    const small = makeReceipt("small");
    const written = withTask551ActiveGenerationStoreLock(() =>
      writeTask551ActiveGenerationStateForStore(task551AwaitingLargeStateV2(small))
    );
    expect(written.absent).toBe(false);
    expect(written.state.state).toBe("awaiting-large");
    expect(written.state.receipts[0]!.receipt).toEqual(small);
    expect(readFileSync(archiveUrl).equals(archiveBefore)).toBe(true);
  });

  test("narrows only the durable reviewed pair through the private store authority", () => {
    const setup = readyForReviewSetup();
    installReviewedState(setup.reviewedState);
    expect(defaultReadReceipt("small")).toEqual(setup.reviewedState.receipts[0]!.receipt);
    expect(defaultReadReceipt("large")).toEqual(setup.reviewedState.receipts[1]!.receipt);
    resetTask551ActiveGenerationFilesystemForFocusedTest();
    installTask551ActiveGenerationMemoryStateForFocusedTest(setup.readyState);
    expect(() => defaultReadReceipt("small")).toThrow("database_baseline_invalid");
    expect(() => defaultReadReceipt("medium" as Task551ScaleProfile)).toThrow(
      "database_baseline_invalid"
    );
  });

  test("refuses a legacy pair storage or archive writer as an active input", () => {
    for (const legacy of [
      { withLock: () => undefined },
      { readSnapshot: () => undefined },
      { writeExactPair: () => undefined },
      { writeCandidateReceipt: () => undefined },
    ]) {
      expect(() => refuseTask551LegacyActiveInputForStore(legacy)).toThrow(
        "l02_active_generation_migration_required"
      );
    }
    expect(() => refuseTask551LegacyActiveInputForStore({ unrelated: true })).not.toThrow();
    expect(() => refuseTask551LegacyActiveInputForStore(null)).not.toThrow();
  });

  test("accepts only raw lowercase three-digest requests and default-denies without an owner host", async () => {
    const setup = readyForReviewSetup();
    const storage = stateCell(setup.readyState);
    installTask551L02ReviewedTransitionFocusedStorageForTest(storage.input);
    registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
    await expect(runL02OwnedReviewedTransition(setup.request)).rejects.toThrow(
      "l02_owned_reviewed_transition_approval_denied"
    );
    expect(storage.writes()).toBe(0);
    await expect(
      runL02OwnedReviewedTransition({
        ...setup.request,
        worktreeSnapshotDigest: "D".repeat(64),
      } as never)
    ).rejects.toThrow("l02_owned_reviewed_transition_invalid");
  });

  test("uses a runtime Symbol brand inside the private sealed approval lifecycle", () => {
    expect(verifyTask551L02OwnerApprovalRuntimeBrandForFocusedTest()).toBe(true);
  });
  test("rejects duplicate registration, snapshot mismatch, and replay without exposing private state", async () => {
    const setup = readyForReviewSetup();
    const storage = stateCell(setup.readyState);
    installTask551L02ReviewedTransitionFocusedStorageForTest(storage.input);
    registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
    expect(() =>
      registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition("e".repeat(64))
    ).toThrow("l02_owned_reviewed_transition_snapshot_registration_reused");
    await expect(
      runL02OwnedReviewedTransition({
        ...setup.request,
        worktreeSnapshotDigest: "e".repeat(64),
      })
    ).rejects.toThrow("l02_owned_reviewed_transition_snapshot_mismatch");
    // A refused digest never consumes the registration; only a run that gets
    // past the snapshot checks does, so the replay lands on the reused code.
    await expect(runL02OwnedReviewedTransition(setup.request)).rejects.toThrow(
      "l02_owned_reviewed_transition_approval_denied"
    );
    await expect(runL02OwnedReviewedTransition(setup.request)).rejects.toThrow(
      "l02_owned_reviewed_transition_snapshot_registration_reused"
    );
    expect(storage.writes()).toBe(0);
  });

  test("rejects a registered snapshot that no longer matches the lock-time accepted snapshot", async () => {
    const setup = readyForReviewSetup();
    const storage = stateCell(setup.readyState, { acceptedSnapshotDigest: "e".repeat(64) });
    installTask551L02ReviewedTransitionFocusedStorageForTest(storage.input);
    registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
    await expect(runL02OwnedReviewedTransition(setup.request)).rejects.toThrow(
      "l02_owned_reviewed_transition_snapshot_mismatch"
    );
    expect(storage.reads()).toBe(0);
    expect(storage.writes()).toBe(0);
  });

  test("rejects a registration superseded during owner review as stale", async () => {
    const setup = readyForReviewSetup();
    const storage = stateCell(setup.readyState);
    installTask551L02ReviewedTransitionFocusedStorageForTest(storage.input);
    ownerHost.replaceTask551OwnerReviewFactoryForFocusedTest(() => () => {
      registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition("e".repeat(64));
      return Object.freeze({ approved: true as const, expiresAtUnixMs: 1_000 });
    });
    await expect(
      ownerHost.runTask551L02OwnerHostInSameRealm(async () => {
        registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
        return runL02OwnedReviewedTransition(setup.request);
      })
    ).rejects.toThrow("l02_owned_reviewed_transition_snapshot_registration_stale");
    expect(storage.writes()).toBe(0);
  });
});

describe("TASK-551 L02 active-v2 receipt matrix", () => {
  test("accepts exactly the awaiting-small absent state and the three legal state-receipt edges", () => {
    const small = makeReceipt("small");
    const large = makeReceipt("large");
    const legal = [
      initialTask551FreezeCandidateGenerationStateV2,
      task551AwaitingLargeStateV2(small),
      task551ReadyForReviewStateV2(small, large),
      task551ReviewedStateV2(
        task551ReadyForReviewStateV2(small, large),
        ...reviewedReceiptsOf(small, large)
      ),
    ];
    for (const state of legal) {
      expect(
        parseTask551FreezeCandidateGenerationStateV2(JSON.parse(JSON.stringify(state)), fakeSha256)
      ).toEqual(state);
    }
    const illegal: readonly object[] = [
      { ...initialTask551FreezeCandidateGenerationStateV2, state: "awaiting-large" },
      { ...initialTask551FreezeCandidateGenerationStateV2, state: "reviewed" },
      { ...task551AwaitingLargeStateV2(small), state: "awaiting-small" },
      { ...task551AwaitingLargeStateV2(small), state: "reviewed" },
      { ...task551ReadyForReviewStateV2(small, large), state: "awaiting-large" },
      { ...task551ReadyForReviewStateV2(small, large), state: "reviewed" },
    ];
    for (const state of illegal) {
      expect(() =>
        parseTask551FreezeCandidateGenerationStateV2(JSON.parse(JSON.stringify(state)), fakeSha256)
      ).toThrow("database_baseline_invalid");
    }
  });

  test("exposes a reviewed pair only from a reviewed state and never from a candidate state", () => {
    const setup = readyForReviewSetup();
    expect(
      parseTask551ReviewedPairV2(JSON.parse(JSON.stringify(setup.reviewedState)), fakeSha256)
    ).toEqual({
      small: setup.reviewedState.receipts[0]!.receipt,
      large: setup.reviewedState.receipts[1]!.receipt,
    });
    expect(() =>
      parseTask551ReviewedPairV2(JSON.parse(JSON.stringify(setup.readyState)), fakeSha256)
    ).toThrow("database_baseline_invalid");
  });

  test("derives every edge identifier from the canonical payload without its own field", () => {
    const setup = readyForReviewSetup();
    const chain = expectedChain(setup.small, setup.large);
    for (const receipt of [chain.first, chain.second, chain.third]) {
      expect(parseTask551L02ActiveStateTransitionReceiptV2(receipt)).toEqual(receipt);
      const withoutId = orderedByKeys(
        TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2.filter((key) => key !== "transitionId"),
        receipt as unknown as Record<string, unknown>
      );
      expect(fakeSha256(canonicalizeTask551Rfc8785(withoutId as unknown as JsonValue))).toBe(
        receipt.transitionId
      );
    }
    expect(chain.first.previousTransitionId).toBeNull();
    expect(chain.first.beforeStateDigest).toBe("absent");
    expect(chain.second.previousTransitionId).toBe(chain.first.transitionId);
    expect(chain.second.beforeStateDigest).toBe(chain.first.afterStateDigest);
    expect(chain.third.previousTransitionId).toBe(chain.second.transitionId);
    expect(chain.third.beforeStateDigest).toBe(chain.readyDigest);
    expect(chain.third.afterStateDigest).toBe(chain.reviewedDigest);
  });

  test("binds the check attestation to the review edge and to the reviewed state digest", () => {
    const setup = readyForReviewSetup();
    const chain = expectedChain(setup.small, setup.large);
    expect(parseTask551L02ReviewedStateAttestationV2(chain.attestation)).toEqual(chain.attestation);
    expect(chain.attestation.sequence).toBe(3);
    expect(chain.attestation.transitionId).toBe(chain.third.transitionId);
    expect(chain.attestation.stateDigest).toBe(chain.reviewedDigest);
    installReviewedState(chain.reviewedState);
    expect(readTask551L02ReviewedStateAttestationForCheck()).toEqual(chain.attestation);
    // A durable state drift moves the sealed review edge with it: an older
    // attestation can never be replayed against a different reviewed state.
    const drifted = readyForReviewSetup(receiptWithScope(setup.small, "drift-scope"), setup.large);
    installReviewedState(drifted.reviewedState);
    const driftedAttestation = readTask551L02ReviewedStateAttestationForCheck();
    expect(driftedAttestation).not.toEqual(chain.attestation);
    expect(driftedAttestation.stateDigest).not.toBe(chain.attestation.stateDigest);
    expect(driftedAttestation.transitionId).not.toBe(chain.attestation.transitionId);
  });

  test("rejects reordered, replayed, and skipped identifiers and every wrong edge field", () => {
    const setup = readyForReviewSetup();
    const chain = expectedChain(setup.small, setup.large);
    const reordered: Record<string, unknown> = {};
    for (const key of [...TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2].reverse()) {
      reordered[key] = (chain.third as unknown as Record<string, unknown>)[key];
    }
    expect(() =>
      parseTask551L02ActiveStateTransitionReceiptV2(
        reordered as unknown as Task551L02ActiveStateTransitionReceiptV2
      )
    ).toThrow("database_baseline_invalid");
    const drifts: readonly Partial<
      Record<keyof Task551L02ActiveStateTransitionReceiptV2, unknown>
    >[] = [
      { transitionId: chain.second.transitionId },
      { previousTransitionId: chain.third.transitionId },
      { previousTransitionId: null },
      { operation: "freeze-small" },
      { sequence: 2 },
      { sequence: 4 },
      { beforeState: "awaiting-small" },
      { beforeStateDigest: "absent" },
      { afterState: "awaiting-large" },
      { afterStateDigest: "absent" },
      { version: 3 },
      { generationId: "task551-freeze-candidate-generation" },
      { archiveSha256: "0".repeat(64) },
      { schema: "coderso.task551.l02-active-state-transition-receipt@v1" },
    ];
    for (const drift of drifts) {
      const drifted = { ...chain.third, ...drift } as Task551L02ActiveStateTransitionReceiptV2;
      expect(() => parseTask551L02ActiveStateTransitionReceiptV2(drifted)).toThrow(
        "database_baseline_invalid"
      );
    }
    // The remaining own values are digest-shaped, so the already-reduced
    // normalizer accepts their shape: their binding to reality is owned by the
    // derivation (identifier from the exact canonical payload) and by the check
    // path, which re-derives every digest from durable state and repository
    // bytes instead of trusting a received value.
    for (const drift of [
      { afterStateDigest: chain.readyDigest },
      { l02ClosureSha256: "2".repeat(64) },
      { bootstrapSourceSha256: "1".repeat(64) },
    ] as const) {
      const drifted = { ...chain.third, ...drift } as Task551L02ActiveStateTransitionReceiptV2;
      expect(parseTask551L02ActiveStateTransitionReceiptV2(drifted)).toEqual(drifted);
      expect(drifted).not.toEqual(chain.third);
    }
    const keyCount = TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2.length;
    expect(Object.keys(chain.third)).toHaveLength(keyCount);
    const missingOne = { ...chain.third } as Record<string, unknown>;
    delete missingOne[TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2[keyCount - 1]!];
    expect(() =>
      parseTask551L02ActiveStateTransitionReceiptV2(
        missingOne as unknown as Task551L02ActiveStateTransitionReceiptV2
      )
    ).toThrow("database_baseline_invalid");
    const attestationDrifts: readonly Partial<
      Record<keyof Task551L02ReviewedStateAttestationV2, unknown>
    >[] = [
      { sequence: 2 },
      { state: "ready-for-review" },
      { version: 3 },
      { archiveSha256: "0".repeat(64) },
      { schema: "coderso.task551.l02-reviewed-state-attestation@v1" },
    ];
    for (const drift of attestationDrifts) {
      expect(() =>
        parseTask551L02ReviewedStateAttestationV2({ ...chain.attestation, ...drift })
      ).toThrow("database_baseline_invalid");
    }
  });

  test("binds every receipt to the real repository archive, bootstrap, and L02 closure bytes", () => {
    const setup = readyForReviewSetup();
    const chain = expectedChain(setup.small, setup.large);
    expect(chain.bindings.archiveSha256).toBe(TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2);
    expect(chain.bindings.bootstrapSourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(chain.bindings.l02ClosureSha256).toMatch(/^[0-9a-f]{64}$/);
    // A state drift moves the review edge identifier and the attestation digest
    // with it: a receipt can never outlive its exact reviewed state.
    expect(chain.third.afterStateDigest).toBe(stateDigestOf(setup.reviewedState));
    expect(chain.attestation.stateDigest).toBe(chain.reviewedDigest);
  });
});

describe("TASK-551 L02 store authority paths and atomic re-read", () => {
  test("reads an absent state as awaiting-small only before the first small freeze", () => {
    withEntries(parentLayout());
    const read = readTask551ActiveGenerationStateForStore({ allowAbsent: true });
    expect(read.absent).toBe(true);
    expect(read.state).toEqual(initialTask551FreezeCandidateGenerationStateV2);
    expect(read.stateDigest).toBe("absent");
    expect(() => readTask551ActiveGenerationStateForStore({ allowAbsent: false })).toThrow(
      "database_baseline_invalid"
    );
  });

  test("fails closed on a stale lock, stale temp, foreign child, symlink, or nonregular state", () => {
    const poison: readonly (readonly [string, FakeEntry])[] = [
      [TASK551_ACTIVE_GENERATION_LOCK_PATH, { kind: "file", bytes: new Uint8Array() }],
      [TASK551_ACTIVE_GENERATION_TEMP_PATH, { kind: "file", bytes: new Uint8Array() }],
      [`${TASK551_ACTIVE_GENERATION_PARENT}/rogue`, { kind: "file", bytes: new Uint8Array() }],
      [TASK551_ACTIVE_GENERATION_STATE_PATH, { kind: "symlink" }],
      [TASK551_ACTIVE_GENERATION_STATE_PATH, { kind: "directory" }],
      [TASK551_ACTIVE_GENERATION_PARENT, { kind: "symlink" }],
      [".tmp/task-551", { kind: "file", bytes: new Uint8Array() }],
    ];
    for (const [path, entry] of poison) {
      resetTask551ActiveGenerationFilesystemForFocusedTest();
      const entries = parentLayout();
      entries.set(path, entry);
      withEntries(entries);
      expect(() => readTask551ActiveGenerationStateForStore({ allowAbsent: true })).toThrow(
        "database_baseline_invalid"
      );
    }
    const intact = parentLayout();
    resetTask551ActiveGenerationFilesystemForFocusedTest();
    intact.set(TASK551_ACTIVE_GENERATION_STATE_PATH, {
      kind: "file",
      bytes: serializeTask551ActiveGenerationStateV2(
        initialTask551FreezeCandidateGenerationStateV2
      ),
    });
    withEntries(intact);
    const read = readTask551ActiveGenerationStateForStore({ allowAbsent: false });
    expect(read.absent).toBe(false);
    expect(read.state).toEqual(initialTask551FreezeCandidateGenerationStateV2);
    expect(read.stateDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  test("removes the exact lock and temp paths on a successful atomic write and re-read", () => {
    const entries = parentLayout();
    entries.set(TASK551_ACTIVE_GENERATION_STATE_PATH, {
      kind: "file",
      bytes: serializeTask551ActiveGenerationStateV2(
        initialTask551FreezeCandidateGenerationStateV2
      ),
    });
    withEntries(entries);
    const next = task551AwaitingLargeStateV2(makeReceipt("small"));
    const written = withTask551ActiveGenerationStoreLock(() =>
      writeTask551ActiveGenerationStateForStore(next)
    );
    expect(written.state).toEqual(next);
    expect(written.stateDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(entries.has(TASK551_ACTIVE_GENERATION_LOCK_PATH)).toBe(false);
    expect(entries.has(TASK551_ACTIVE_GENERATION_TEMP_PATH)).toBe(false);
    expect([...entries.keys()].filter((path) => path.endsWith(".blocked"))).toEqual([]);
    expect(entries.get(TASK551_ACTIVE_GENERATION_STATE_PATH)).toEqual({
      kind: "file",
      bytes: serializeTask551ActiveGenerationStateV2(written.state),
    });
  });

  test("releases the lock and removes the temp path when the mutation or callback throws", () => {
    const entries = parentLayout();
    entries.set(TASK551_ACTIVE_GENERATION_STATE_PATH, {
      kind: "file",
      bytes: serializeTask551ActiveGenerationStateV2(
        initialTask551FreezeCandidateGenerationStateV2
      ),
    });
    const base = fakeFilesystem(entries);
    installTask551ActiveGenerationFilesystemForFocusedTest({
      ...base,
      renameSync: (from, to) => base.renameSync(from, `${to}.blocked`),
    });
    expect(() =>
      withTask551ActiveGenerationStoreLock(() =>
        writeTask551ActiveGenerationStateForStore(task551AwaitingLargeStateV2(makeReceipt("small")))
      )
    ).toThrow("database_baseline_invalid");
    expect(entries.has(TASK551_ACTIVE_GENERATION_LOCK_PATH)).toBe(false);
    expect(entries.has(TASK551_ACTIVE_GENERATION_TEMP_PATH)).toBe(false);
    // The rename never landed, so the durable state is still exactly the
    // previous bytes and no partial state file exists.
    expect(entries.get(TASK551_ACTIVE_GENERATION_STATE_PATH)).toEqual({
      kind: "file",
      bytes: serializeTask551ActiveGenerationStateV2(
        initialTask551FreezeCandidateGenerationStateV2
      ),
    });
    const plain = parentLayout();
    resetTask551ActiveGenerationFilesystemForFocusedTest();
    withEntries(plain);
    expect(() =>
      withTask551ActiveGenerationStoreLock(() => {
        throw new Error("workflow failure");
      })
    ).toThrow("workflow failure");
    expect(plain.has(TASK551_ACTIVE_GENERATION_LOCK_PATH)).toBe(false);
  });
});

describe("TASK-551 L02 owner host and atomic reviewed transition", () => {
  test("invokes the owner exactly once under the lock, approves once, and revokes after success", async () => {
    const setup = readyForReviewSetup();
    const storage = stateCell(setup.readyState);
    installTask551L02ReviewedTransitionFocusedStorageForTest(storage.input);
    let reviews = 0;
    let invocations = 0;
    ownerHost.replaceTask551OwnerReviewFactoryForFocusedTest(() => (ownerRequest) => {
      reviews += 1;
      expect(ownerRequest).toEqual({
        schema: "coderso.task551.l02-owner-review-request@v1",
        ...setup.request,
      });
      storage.events.push("review");
      return Object.freeze({ approved: true as const, expiresAtUnixMs: 1_000 });
    });
    const result = await ownerHost.runTask551L02OwnerHostInSameRealm(async (...received) => {
      invocations += 1;
      expect(received).toEqual([]);
      registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
      const first = await runL02OwnedReviewedTransition(setup.request);
      // One approval per host lifecycle: the registration is consumed and the
      // durable state is reviewed, so a second transition cannot run again.
      await expect(runL02OwnedReviewedTransition(setup.request)).rejects.toThrow(
        "l02_owned_reviewed_transition_snapshot_registration_reused"
      );
      return first;
    });
    expect(reviews).toBe(1);
    expect(invocations).toBe(1);
    // The successful transition takes the lock once for its full sequence; the
    // refused second transition inside the same lifecycle takes it once more.
    expect(storage.events).toEqual(["lock", "read", "review", "read", "write", "read", "lock"]);
    expect(storage.writes()).toBe(1);
    expect(result.capabilityReceipt).toEqual({
      schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
      digest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(result.stateTransitionReceipt.operation).toBe("review");
    expect(result.stateTransitionReceipt.sequence).toBe(3);
    expect(result.stateTransitionReceipt.afterStateDigest).toBe(storage.stateDigest());
    expect(storage.state()).toEqual(setup.reviewedState);
    // A fresh host lifecycle with a fresh registration still cannot transition
    // the reviewed state again: only the ready state is a legal review edge.
    await expect(
      ownerHost.runTask551L02OwnerHostInSameRealm(async () => {
        registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
        return runL02OwnedReviewedTransition(setup.request);
      })
    ).rejects.toThrow("l02_owned_reviewed_transition_candidate_mismatch");
    expect(storage.writes()).toBe(1);
  });

  test("revokes the owner ingress when the wrapped workflow throws", async () => {
    const setup = readyForReviewSetup();
    const storage = stateCell(setup.readyState);
    installTask551L02ReviewedTransitionFocusedStorageForTest(storage.input);
    let reviews = 0;
    ownerHost.replaceTask551OwnerReviewFactoryForFocusedTest(() => () => {
      reviews += 1;
      return Object.freeze({ approved: false });
    });
    await expect(
      ownerHost.runTask551L02OwnerHostInSameRealm(async () => {
        throw new Error("workflow failure");
      })
    ).rejects.toThrow("workflow failure");
    expect(reviews).toBe(0);
    // The throwing lifecycle installed no surviving ingress: the next host
    // lifecycle falls back to the default deny and no state is mutated.
    await expect(
      ownerHost.runTask551L02OwnerHostInSameRealm(async () => {
        registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
        return runL02OwnedReviewedTransition(setup.request);
      })
    ).rejects.toThrow("l02_owned_reviewed_transition_approval_denied");
    expect(reviews).toBe(0);
    expect(storage.writes()).toBe(0);
  });

  test("rejects a sealed approval that expires before consumption", async () => {
    const setup = readyForReviewSetup();
    let nowCall = 0;
    const storage = stateCell(setup.readyState, {
      now: () => {
        nowCall += 1;
        return nowCall === 1 ? 100 : 200;
      },
    });
    installTask551L02ReviewedTransitionFocusedStorageForTest(storage.input);
    ownerHost.replaceTask551OwnerReviewFactoryForFocusedTest(hostApprove(150));
    await expect(
      ownerHost.runTask551L02OwnerHostInSameRealm(async () => {
        registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
        return runL02OwnedReviewedTransition(setup.request);
      })
    ).rejects.toThrow("l02_owned_reviewed_transition_expired");
    expect(storage.writes()).toBe(0);
  });

  test("re-reads candidate state under the lock and rejects a changed pair before any write", async () => {
    const setup = readyForReviewSetup();
    const changedSmall = receiptWithScope(setup.small, "changed-scope");
    const storage = stateCell(setup.readyState);
    installTask551L02ReviewedTransitionFocusedStorageForTest(storage.input);
    let reviews = 0;
    ownerHost.replaceTask551OwnerReviewFactoryForFocusedTest(() => () => {
      reviews += 1;
      storage.replaceState(task551ReadyForReviewStateV2(changedSmall, setup.large));
      return Object.freeze({ approved: true as const, expiresAtUnixMs: 1_000 });
    });
    await expect(
      ownerHost.runTask551L02OwnerHostInSameRealm(async () => {
        registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(snapshotDigest);
        return runL02OwnedReviewedTransition(setup.request);
      })
    ).rejects.toThrow("l02_owned_reviewed_transition_candidate_mismatch");
    expect(storage.locks()).toBe(1);
    expect(storage.reads()).toBe(2);
    expect(reviews).toBe(1);
    expect(storage.writes()).toBe(0);
  });

  test("round-trips candidate persistence, then atomically persists both reviewed receipts", async () => {
    const cell = stateCell(initialTask551FreezeCandidateGenerationStateV2);
    const writer = createTask551CandidateReceiptWriterForFocusedTest(fakeSha256, cell.input);
    const changedSmall = receiptWithScope(makeReceipt("small"), "candidate-round-trip");
    await expect(writer.writeCandidateReceipt(changedSmall)).resolves.toEqual({
      committed: true,
      cleanupFailures: [],
    });
    expect(cell.state().state).toBe("awaiting-large");
    expect(cell.state().receipts[0]!.receipt).toEqual(changedSmall);
    const large = makeReceipt("large");
    cell.replaceState(task551ReadyForReviewStateV2(changedSmall, large));
    const readyDigest = cell.stateDigest();
    installTask551L02ReviewedTransitionFocusedStorageForTest(cell.input);
    const result = await runApprovedTransition(requestFor(changedSmall, large));
    expect(result.reviewed.map((entry) => entry.profile)).toEqual(["small", "large"]);
    expect(result.stateTransitionReceipt.beforeStateDigest).toBe(readyDigest);
    expect(cell.state().state).toBe("reviewed");
    expect(cell.writes()).toBe(2);
    expect(
      parseTask551ReviewedPairV2(JSON.parse(JSON.stringify(cell.state())), fakeSha256)
    ).toEqual({
      small: cell.state().receipts[0]!.receipt,
      large: cell.state().receipts[1]!.receipt,
    });
  });

  test("writes only the legal next candidate edge and never a partial state", async () => {
    const small = makeReceipt("small");
    const cell = stateCell(task551AwaitingLargeStateV2(small));
    const writer = createTask551CandidateReceiptWriterForFocusedTest(fakeSha256, cell.input);
    await expect(writer.writeCandidateReceipt(small)).rejects.toThrow("database_baseline_invalid");
    expect(cell.writes()).toBe(0);
    // The large candidate is exactly the legal next edge from awaiting-large.
    const large = makeReceipt("large");
    await expect(writer.writeCandidateReceipt(large)).resolves.toEqual({
      committed: true,
      cleanupFailures: [],
    });
    expect(cell.state().state).toBe("ready-for-review");
    expect(cell.state().receipts).toEqual(task551ReadyForReviewStateV2(small, large).receipts);
    // A third edge does not exist: the ready state accepts no candidate write.
    await expect(writer.writeCandidateReceipt(receiptWithScope(large, "again"))).rejects.toThrow(
      "database_baseline_invalid"
    );
    expect(cell.writes()).toBe(1);
    const brokenDigest = {
      ...makeReceipt("small"),
      reviewableReceiptDigest: "0".repeat(64),
    } as Task551ReviewableFreezeReceiptV1;
    const fresh = stateCell(initialTask551FreezeCandidateGenerationStateV2);
    const freshWriter = createTask551CandidateReceiptWriterForFocusedTest(fakeSha256, fresh.input);
    await expect(freshWriter.writeCandidateReceipt(brokenDigest)).rejects.toThrow(
      "database_baseline_invalid"
    );
    expect(fresh.writes()).toBe(0);
  });

  test("maps an atomic reviewed-pair write failure to the fixed redacted conflict", async () => {
    const setup = readyForReviewSetup();
    const storage = stateCell(setup.readyState, { writeFailure: true });
    installTask551L02ReviewedTransitionFocusedStorageForTest(storage.input);
    await expect(runApprovedTransition(setup.request)).rejects.toThrow(
      "l02_owned_reviewed_transition_conflict"
    );
    expect(storage.writes()).toBe(0);
  });
});
