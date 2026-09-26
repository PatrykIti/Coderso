import { execFile } from "node:child_process";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect } from "bun:test";

import {
  TASK551_DEFERRED_LITERAL_TARGET_PATHS,
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_IMPORT_CLOSURE,
  task551L11BarrierCurrentWorktreeDigest,
  validateTask551EvidenceValue,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import {
  requireTask551TestDispatchTaskSnapshotForTests,
  runTask551AuthorAuditWorkflowForTests,
} from "../../../_docs/_workflows/task-551-author-audit.mjs";
import {
  createTask551TestExecutionSession,
  deriveTask551ImplementLandOrder,
  runTask551ImplementWorkflowForTests,
} from "../../../_docs/_workflows/task-551-implement.mjs";
import { runTask551BoundedChild } from "../../../_docs/_workflows/task-551-fix.mjs";
import {
  type Digest,
  type Worktree,
  classifierManifestPath,
  digestFor,
  evidenceDigest,
  exactManifestPaths,
  freezeTestValue,
  receipt,
  sha,
  shaBytes,
  worktree,
} from "./task551WorkflowContractsFixtures.js";

const l02EvidenceRoot = "_docs/_workflows/_smoke/task-551/audit-evidence";
export const l02ProcessReceipt = () => ({
  status: "passed",
  result: "zero_exit",
  exitCode: 0,
  signalCode: null,
  stdoutBytes: 0,
  stderrBytes: 0,
});
export function l03CheckEvidence(toolContractDigest = evidenceDigest("checked-tool-contract")) {
  const row = TASK551_DURABLE_EVIDENCE_MANIFEST[1]!;
  const value = {
    schema: row.schema,
    taskId: "TASK-551-01-L03",
    phase: "l03-check",
    pass: true,
    noLeak: true,
    producer: {
      schema: "coderso.task551.fixture-bootstrap-check@v1",
      taskId: "TASK-551-01-L03",
      mode: "check",
      pass: true,
      markerCount: 1,
      targetProof: "current-database-and-single-marker",
      noLeak: true,
      toolContractDigest,
    },
    focusedTestReceipt: l02ProcessReceipt(),
    checkCommandReceipt: l02ProcessReceipt(),
  };
  const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
  return Object.freeze({
    value,
    receipt: Object.freeze({
      path: row.path,
      phase: row.phase,
      digest: `sha256:${shaBytes(bytes)}`,
      bytes: bytes.byteLength,
      action: "committed_no_replace",
    }),
    bytes,
  });
}
const l02StatementIds = [
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
const l02Ceiling = () => ({
  queryCountMax: 1,
  rowsReadMax: 1,
  rowsReturnedMax: 1,
  transferredBytesMax: 1,
  sharedBuffersMax: 1,
  p50MsMax: 1,
  p95MsMax: 1,
  p99MsMax: 1,
});
function l02Reviewable(profile: "small" | "large", reviewState: "candidate" | "reviewed") {
  return {
    reviewableReceiptDigest: sha(`${profile}-${reviewState}-reviewable`),
    reviewState,
    profile,
    provenanceCommit: "a".repeat(40),
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
    statementCeilings: l02StatementIds.map((statementId) => ({
      statementId,
      ceiling: l02Ceiling(),
    })),
    poolWaitCeiling: l02Ceiling(),
  };
}
function l02EvidenceValue(row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number]) {
  const root = {
    schema: row.schema,
    taskId: "TASK-551-01-L02",
    phase: row.phase,
    ...(row.profile === undefined ? {} : { profile: row.profile }),
  };
  if (row.phase === "l02-static")
    return {
      ...root,
      pass: true,
      noLeak: true,
      focusedTests: [l02ProcessReceipt(), l02ProcessReceipt()],
      manifestSha256: sha(`static-${row.profile}`),
    };
  if (row.phase === "l02-freeze-candidate")
    return {
      ...root,
      pass: true,
      noLeak: true,
      candidateReceipt: l02Reviewable(row.profile as "small" | "large", "candidate"),
      candidateCanonicalReceiptDigest: sha(`candidate-${row.profile}`),
      freezeCommandReceipt: l02ProcessReceipt(),
    };
  if (row.phase === "l02-reviewed-candidates")
    return {
      ...root,
      pass: true,
      noLeak: true,
      reviewed: {
        schema: "coderso.task551.reviewed-candidate-transition-result@v1",
        capabilityReceipt: {
          schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
          digest: sha("capability"),
        },
        reviewed: ["small", "large"].map((profile) => ({
          profile,
          candidateCanonicalReceiptDigest: sha(`candidate-${profile}`),
          reviewedReceipt: l02Reviewable(profile as "small" | "large", "reviewed"),
          reviewedCanonicalReceiptDigest: sha(`reviewed-${profile}`),
        })),
      },
    };
  return {
    ...root,
    pass: true,
    noLeak: true,
    staticEvidencePath: `${l02EvidenceRoot}/l02-static-${row.profile}.json`,
    candidatePath: `${l02EvidenceRoot}/l02-freeze-candidate-${row.profile}.json`,
    reviewedCandidatesPath: `${l02EvidenceRoot}/l02-reviewed-candidates.json`,
    checkCommandReceipt: l02ProcessReceipt(),
    immutableDigests: {
      reviewableReceiptDigest: sha("reviewable"),
      contractDigest: sha("contract"),
      fixtureDigest: sha("fixture"),
      schemaDigest: sha("schema"),
      runnerDigest: sha("runner"),
      manifestScenarioResultDigest: sha("scenario"),
    },
    targetProof: "current-database-and-single-marker",
  };
}
function l02EvidenceRequests() {
  return TASK551_DURABLE_EVIDENCE_MANIFEST.filter((row) => row.phase.startsWith("l02-")).map(
    (manifestRow) => {
      const value = l02EvidenceValue(manifestRow),
        error = validateTask551EvidenceValue(manifestRow, value);
      if (error !== null) throw new Error(`${manifestRow.phase}:${error}`);
      return { manifestRow, value };
    }
  );
}

export const workflowRepoRoot = path.resolve(import.meta.dir, "../../..");
const workflowDiscovery = () =>
  Object.fromEntries(
    ["sidecar", "l01", "l03", "l04", "l02", "05-l02"].map((phase) => [
      phase,
      [...TASK551_PHASE_IMPORT_CLOSURE.get(phase)!],
    ])
  );
export const workflowGit = ({ argv, cwd }: { argv: readonly string[]; cwd: string }) =>
  new Promise<{ exitCode: number; stdout: Uint8Array; stderr: Uint8Array }>((resolve) =>
    execFile(argv[0]!, argv.slice(1), { cwd, encoding: "buffer" }, (error, stdout, stderr) =>
      resolve({
        exitCode: error === null ? 0 : typeof error?.code === "number" ? error.code : 1,
        stdout: Buffer.from(stdout ?? []),
        stderr: Buffer.from(stderr ?? []),
      })
    )
  );
export async function executionFixture(occurrenceId: string) {
  const audit = await runTask551AuthorAuditWorkflowForTests({
    discoveredByPhase: workflowDiscovery(),
    auditAgent: () => ({ status: "completed" as const, findings: [] }),
    reconcileAgent: () => ({ status: "completed" as const, findings: [] }),
    gitCommandTransport: workflowGit,
    testRepoRoot: workflowRepoRoot,
  });
  if (!audit.pass) throw new Error("task551_test_audit_failed");
  const [dispatch] = deriveTask551ImplementLandOrder(audit.dispatch, [occurrenceId]);
  return {
    dispatch: audit.dispatch,
    node: dispatch!,
    snapshot: requireTask551TestDispatchTaskSnapshotForTests(audit.dispatch),
    session: createTask551TestExecutionSession(audit.dispatch, {
      targetOccurrenceId: dispatch!.id,
      seededCompletedOccurrenceIds: dispatch!.dependsOn,
    }),
  };
}
async function runL03Completion(
  fixture: Awaited<ReturnType<typeof executionFixture>>,
  events: string[] | null = null,
  bundle = l03CheckEvidence(),
  onEvidenceWrite: (phase: string) => void = () => undefined,
  absent: readonly string[] = []
) {
  const [node] = deriveTask551ImplementLandOrder(fixture.dispatch, ["TASK-551-01-L03:single"]);
  const closed = TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!;
  const before = worktree({
    taskFileDigests: fixture.snapshot.taskFileDigests,
    absent: [...closed, ...absent],
  });
  const after = worktree({
    taskFileDigests: fixture.snapshot.taskFileDigests,
    absent,
    deltaPaths: closed,
  });
  let current = before;
  const result = await runTask551ImplementWorkflowForTests({
    authorAuditDispatch: fixture.dispatch,
    scheduledOccurrenceIds: [node!.id],
    phase: "l03",
    testExecutionSession: createTask551TestExecutionSession(fixture.dispatch, {
      targetOccurrenceId: node!.id,
      seededCompletedOccurrenceIds: node!.dependsOn,
    }),
    currentWorktreeSnapshotProvider: async () => current,
    leafDispatcher: async () => {
      events?.push("leaf");
      current = after;
      return { changedPaths: closed };
    },
    gateRunner: async ({
      gate,
      child,
    }: {
      gate: { operation: string; kind: string };
      child?: object;
    }) => {
      events?.push(`gate:${gate.operation}:${child === undefined ? "none" : "child"}`);
      return {
        exitCode: 0,
        signalCode: null,
        timedOut: false,
        overflowed: false,
        discoveredTestCount: gate.kind === "test" ? 1 : null,
      };
    },
    phaseSourceProvider: async ({ operation }: { operation: string }) => {
      events?.push(`source:${operation}`);
      return { operation };
    },
    phaseChildStarter: ({ operation }: { operation: string }) => {
      events?.push(`start:${operation}`);
      return Object.freeze({});
    },
    phaseResourceDisposer: ({ operation }: { operation: string }) => {
      events?.push(`dispose:${operation}`);
    },
    evidenceByPhase: {
      l03: [
        {
          manifestRow: TASK551_DURABLE_EVIDENCE_MANIFEST[0]!,
          value: {
            schema: TASK551_DURABLE_EVIDENCE_MANIFEST[0]!.schema,
            taskId: "TASK-551-01-L03",
            phase: "l03-initialize",
            pass: true,
            noLeak: true,
            commandReceipt: l02ProcessReceipt(),
          },
        },
        { manifestRow: TASK551_DURABLE_EVIDENCE_MANIFEST[1]!, value: bundle.value },
      ],
    },
    evidenceWriter: async ({
      manifestRow,
      value,
    }: {
      manifestRow: { path: string; phase: string };
      value: unknown;
    }) => {
      onEvidenceWrite(manifestRow.phase);
      const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
      return Object.freeze({
        path: manifestRow.path,
        phase: manifestRow.phase,
        digest: `sha256:${shaBytes(bytes)}`,
        bytes: bytes.byteLength,
        action: "committed_no_replace",
      });
    },
  });
  expect(result.pass).toBe(true);
  return { bundle, before, after, closed };
}

export async function l02ExecutionFixture(absent: readonly string[] = []) {
  const fixture = await executionFixture("TASK-551-01-L02:single");
  await runL03Completion(fixture, null, l03CheckEvidence(), () => undefined, absent);
  return fixture;
}
export function l02States(
  snapshot: Readonly<{ taskFileDigests: readonly Digest[] }>,
  absent: readonly string[] = []
) {
  const extra = Object.fromEntries(
    TASK551_DEFERRED_LITERAL_TARGET_PATHS.slice(2).map((path) => [path, sha(path)])
  );
  const before = worktree({
    taskFileDigests: snapshot.taskFileDigests,
    absent,
    drift: { [classifierManifestPath]: sha("before-classifier") },
    extra,
  });
  const afterClassifier = worktree({
    taskFileDigests: snapshot.taskFileDigests,
    absent,
    drift: { [classifierManifestPath]: sha("after-classifier") },
    deltaPaths: [classifierManifestPath],
    extra,
  });
  const afterLeaf = worktree({
    taskFileDigests: snapshot.taskFileDigests,
    absent,
    drift: { [classifierManifestPath]: sha("after-classifier") },
    deltaPaths: [classifierManifestPath],
    extra,
  });
  const l03 = l03CheckEvidence();
  const materializer = Object.freeze({
    l03CheckEvidence: Object.freeze({ receipt: l03.receipt, bytes: l03.bytes }),
  });
  return { before, afterClassifier, afterLeaf, leafChanges: Object.freeze([]), materializer };
}
export function classifierResult(before: Worktree, after: Worktree) {
  const beforeDigest = task551L11BarrierCurrentWorktreeDigest(before),
    afterDigest = task551L11BarrierCurrentWorktreeDigest(after),
    manifest = digestFor(after, classifierManifestPath);
  return Object.freeze({
    fourTestReceipt: receipt(
      "l01-four-test-prerequisite",
      [
        "bun",
        "--env-file=/dev/null",
        "test",
        "tests/perf/task551FixtureTargetBootstrap.test.ts",
        "tests/perf/database-query-baseline.test.ts",
        "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
        "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
      ],
      beforeDigest
    ),
    classifierReceipt: receipt(
      "l01-classifier",
      ["bun", "scripts/bun-lane-classify.ts"],
      afterDigest,
      null
    ),
    manifest: Object.freeze({
      path: classifierManifestPath,
      sha256: manifest.sha256,
      task551Paths: exactManifestPaths,
    }),
    postGeneratorReceipts: Object.freeze([
      Object.freeze({
        ...receipt(
          "l11-post-generator-manifest-test",
          ["bun", "test", "tests/unit/toolchain/bunLaneManifest.test.ts"],
          afterDigest
        ),
        manifestSha256: manifest.sha256,
      }),
      Object.freeze({
        ...receipt(
          "l11-post-generator-membership-test",
          ["bun", "test", "tests/integration/server/task551BunLaneMembership.test.ts"],
          afterDigest
        ),
        manifestSha256: manifest.sha256,
      }),
    ]),
  });
}
export const l02EvidenceInput = () => ({
  evidenceByPhase: { l02: l02EvidenceRequests() },
  evidenceWriter: async ({
    manifestRow,
    value,
  }: {
    manifestRow: { path: string; phase: string };
    value: unknown;
  }) => {
    const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
    return Object.freeze({
      path: manifestRow.path,
      phase: manifestRow.phase,
      digest: `sha256:${shaBytes(bytes)}`,
      bytes: bytes.byteLength,
      action: "committed_no_replace",
    });
  },
});
const task489Companions = [
  "task489-runs-all-keyset",
  "task489-runs-package-keyset",
  "task489-effective-supersession",
  "task489-active-starter-owner",
  "task489-safe-detail",
] as const;
const task489Cases = [
  [task489Companions[0], "default", ["task489-runs-all-keyset/default"]],
  [task489Companions[0], "relation-heavy-101", ["task489-runs-all-keyset/relation-heavy-101"]],
  [task489Companions[1], "default", ["task489-runs-package-keyset/default"]],
  [task489Companions[1], "relation-heavy-101", ["task489-runs-package-keyset/relation-heavy-101"]],
  [task489Companions[2], "newer-0", ["task489-effective-supersession/newer-0"]],
  [task489Companions[2], "newer-1", ["task489-effective-supersession/newer-1"]],
  [task489Companions[2], "newer-511", ["task489-effective-supersession/newer-511"]],
  [task489Companions[2], "newer-512", ["task489-effective-supersession/newer-512"]],
  [
    task489Companions[2],
    "newer-513-all-rolled",
    ["task489-effective-supersession/newer-513-all-rolled"],
  ],
  [
    task489Companions[2],
    "newer-513-unrolled-first",
    ["task489-effective-supersession/newer-513-unrolled-first"],
  ],
  [
    task489Companions[2],
    "newer-513-unrolled-middle",
    ["task489-effective-supersession/newer-513-unrolled-middle"],
  ],
  [
    task489Companions[2],
    "newer-513-unrolled-last",
    ["task489-effective-supersession/newer-513-unrolled-last"],
  ],
  [task489Companions[3], "active-owner", ["task489-active-starter-owner/active-owner"]],
  [
    task489Companions[4],
    "point-plus-items",
    ["task489-safe-detail/run-point", "task489-safe-detail/items-page"],
  ],
] as const;
function task489PredecessorEvidence() {
  return {
    schema: "coderso.task551.task489-predecessor@v1",
    pass: true,
    noLeak: true,
    companionIds: [...task489Companions],
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
    logicalCases: task489Cases.map(([companionId, logicalCaseId, statementIds]) => ({
      companionId,
      logicalCaseId,
      statementIds: [...statementIds],
    })),
    statementReceipts: task489Cases.flatMap(([companionId, logicalCaseId, statementIds]) =>
      statementIds.map((statementId) => ({
        companionId,
        logicalCaseId,
        statementId,
        profileResults: ["small", "large"].map((profile) => ({
          profile,
          planDigest: sha(`${statementId}-${profile}`),
          queryCount: 1,
          rowsRead: 0,
          rowsReturned: 0,
          transferredBytes: 0,
          sharedBuffers: 0,
          p50Ms: 0,
          p95Ms: 0,
          p99Ms: 0,
        })),
      }))
    ),
  };
}
export const task489Temporary = ".tmp/task-551/task489-predecessor-v1.json";
export const task489CommitA = (sourceHead: string) =>
  freezeTestValue({
    sourceHead,
    createdAt: "2026-08-30T00:00:00.000Z",
    reviewedAt: "2026-08-30T00:00:00.000Z",
    promotedAt: "2026-08-30T00:00:00.000Z",
    ownerCapabilityReceiptDigest: sha("capability"),
  });
const task489Source = () => task489PredecessorEvidence();
export async function withTask489Temporary<T>(run: (bytes: Uint8Array) => Promise<T>) {
  const bytes = new TextEncoder().encode(`${JSON.stringify(task489Source())}\n`),
    directory = ".tmp/task-551";
  await mkdir(directory, { recursive: true });
  await writeFile(task489Temporary, bytes, { flag: "wx" });
  try {
    return await run(bytes);
  } finally {
    await unlink(task489Temporary);
  }
}
export const task489DeferredFiles = () =>
  Object.fromEntries(
    TASK551_DEFERRED_LITERAL_TARGET_PATHS.slice(2).map((path) => [path, sha(path)])
  );
async function materializeL02ForTask489(fixture: Awaited<ReturnType<typeof executionFixture>>) {
  await runL03Completion(fixture);
  const [node] = deriveTask551ImplementLandOrder(fixture.dispatch, ["TASK-551-01-L02:single"]),
    states = l02States(fixture.snapshot);
  let current = states.before;
  const result = await runTask551ImplementWorkflowForTests({
    authorAuditDispatch: fixture.dispatch,
    scheduledOccurrenceIds: [node!.id],
    phase: "l02",
    testExecutionSession: createTask551TestExecutionSession(fixture.dispatch, {
      targetOccurrenceId: node!.id,
      seededCompletedOccurrenceIds: node!.dependsOn,
    }),
    currentWorktreeSnapshotProvider: async () => current,
    leafDispatcher: async () => {
      current = states.afterLeaf;
      return { changedPaths: states.leafChanges };
    },
    gateRunner: async ({ gate }: { gate: { kind: string } }) => ({
      exitCode: 0,
      signalCode: null,
      timedOut: false,
      overflowed: false,
      discoveredTestCount: gate.kind === "test" ? 1 : null,
    }),
    l02PreBarrierMaterializer: async () => states.materializer,
    classifierBarrierRunner: async () => {
      current = states.afterClassifier;
      return classifierResult(states.before, states.afterClassifier);
    },
    l02ReviewedTransitionRunner: async () => true,
    ...l02EvidenceInput(),
  });
  expect(result.pass).toBe(true);
}
export async function readyTask489Fixture() {
  const fixture = await executionFixture("TASK-551-05-L02:single");
  await materializeL02ForTask489(fixture);
  return fixture;
}
export function task489Worktrees(
  fixture: Awaited<ReturnType<typeof executionFixture>>,
  bytes: Uint8Array
) {
  const drift = { [classifierManifestPath]: sha("after-classifier") };
  const before = worktree({
    taskFileDigests: fixture.snapshot.taskFileDigests,
    drift,
    extra: task489DeferredFiles(),
  });
  const after = worktree({
    taskFileDigests: fixture.snapshot.taskFileDigests,
    drift,
    extra: { ...task489DeferredFiles(), [task489Temporary]: shaBytes(bytes) },
    deltaPaths: [task489Temporary],
  });
  return { before, after };
}
const task489Logical: Record<string, string> = {
  "database-explain-plans-test": "05-l02-explain-plans-test",
  "task489-predecessor-plans-test": "05-l02-predecessor-test",
  "explain-plan-small-check": "05-l02-explain-small",
  "explain-plan-large-check": "05-l02-explain-large",
};
export async function task489TerminalOutcome(
  dispatchId: string,
  gate: { operation: string; kind: string },
  operation = gate.operation,
  failed = false
) {
  const empty = async function* () {
    /* redacted empty streams */
  };
  const profile = operation.includes("small")
    ? "small"
    : operation.includes("large")
      ? "large"
      : undefined;
  const child = await runTask551BoundedChild({
    commandContextId: `${dispatchId}/${operation}`,
    logicalCommandId: task489Logical[operation]!,
    ...(profile === undefined ? {} : { profile }),
    bunExecutablePath: "/trusted/bun",
    env: { PATH: "/bin" },
    cwd: "/repo",
    discovery: Object.freeze(
      gate.kind === "test"
        ? { kind: "test-paths", discoveredTestCount: 1, positive: true }
        : { kind: "not-applicable", discoveredTestCount: null, positive: false }
    ),
    spawn: () => ({
      pid: 1,
      stdout: empty(),
      stderr: empty(),
      exited: Promise.resolve(0),
      signalCode: null,
    }),
  });
  return freezeTestValue({
    gateResult: {
      exitCode: failed ? 1 : 0,
      signalCode: null,
      timedOut: false,
      overflowed: false,
      discoveredTestCount: gate.kind === "test" ? 1 : null,
    },
    terminalOutcome: {
      schema: "coderso.task551.05-l02-child-outcome@v1",
      group: {
        schema: "coderso.task551.redacted-command-group@v1",
        context: { dispatchId, logicalCommandId: task489Logical[operation]! },
        commandReceipt: child.commandReceipt,
      },
      postCleanupTargetProof: {
        rolledBack: true,
        currentDatabaseMatched: true,
        exactSingleMarkerMatched: true,
        boundSentinelByteMatched: true,
      },
    },
  });
}
export function task489Handoff(
  sourceHead: string,
  writes: readonly { path: string; bytes: Uint8Array }[]
) {
  const terminalHeadFiles = writes.map(({ path, bytes }) => ({
    path,
    tracked: true as const,
    kind: "regular" as const,
    bytes,
  }));
  return {
    sourceHead,
    terminalHead: "d".repeat(40),
    terminalParentHead: sourceHead,
    commitBChangedPaths: terminalHeadFiles.map(({ path }) => path),
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
