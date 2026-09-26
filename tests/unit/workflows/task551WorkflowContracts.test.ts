import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import type { Task551L11L03EvidenceProofV1 } from "../../../_docs/_workflows/lib/task-551-contract.mjs";

import {
  TASK551_05_L02_LINE_COUNT_PATHS,
  TASK551_05_L02_PROVENANCE,
  TASK551_05_L02_VALIDATION_PATHS,
  TASK551_DEFERRED_LITERAL_TARGET_PATHS,
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_EVIDENCE_ROW_IDS,
  TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS,
  TASK551_PLANNED_BUN_PATHS,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_DISCOVERY_ALLOWLIST,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_LINE_COUNT_PATHS,
  TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE,
  TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS,
  TASK551_PHASE_PROVENANCE,
  TASK551_PHASE_VALIDATION_PATHS,
  adaptTask551L02ClosureV2,
  adaptTask551L03ClosureV2,
  adaptTask551L04ClosureV2,
  buildTask55105L02PromotionAtNamedSeam,
  readTask55105L02PredecessorAtNamedSeam,
  captureTask551L01MaterializationBarrier,
  captureTask551L01PreClassifierBarrier,
  captureTask551MaterializedWorktreeSnapshot,
  captureTask551PreSpawnWorktreeSnapshot,
  createTask551L02CodeTestMaterializationClosureV1,
  createTask551NamedPhaseClosureV2,
  createTask551TaskGraphSnapshot,
  deriveTask551ClosedWorktreeSet,
  admitTask551WorkflowCompatibilityAuthorAuditV2,
  admitTask551WorkflowCompatibilityGraphV2,
  admitTask551WorkflowCompatibilityL02V2,
  requireExactActivePhaseSnapshotBeforeSpawn,
  requireTask551L01MaterializationBarrierBeforeL02,
  requireTask551L02CodeTestMaterializationClosureV1,
  requireTask551RecordedL02MaterializationForWorkflow,
  requireTask551LiteralUniquePaths,
  requireTask551PredecessorWorktreeSnapshotBeforeSpawn,
  task551CurrentWorktreeDigest,
  task551FullProvenanceClosureForSpawn,
  task551L11BarrierCurrentWorktreeDigest,
  task551L11BarrierSnapshotDigest,
  task551WorktreeSnapshotDigest,
  runTask551WorkflowCompatibilityBootstrapV2,
  validateTask551EvidenceValue,
  writeTask551EvidenceFileIfAbsent,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import {
  requireTask551TestDispatchTaskSnapshotForTests,
  runTask551AuthorAuditWorkflowForTests,
} from "../../../_docs/_workflows/task-551-author-audit.mjs";
import {
  createTask551TestExecutionSession,
  deriveTask551ImplementLandOrder,
  runTask551ImplementWorkflow,
  runTask551ImplementWorkflowForTests,
} from "../../../_docs/_workflows/task-551-implement.mjs";
import {
  requireTask551CommandReceiptV1,
  requireTask551LogicalArgvPreimageV1,
  runTask551BoundedChild,
} from "../../../_docs/_workflows/task-551-fix.mjs";

type Digest = Readonly<{ path: string; sha256: string }>;
type FileState = Digest & Readonly<{ kind: "regular" | "symlink" }>;
type MutableLogicalReceipt = Record<string, unknown> & {
  logicalArgv: { sha256: string; argCount: number; envFile: string };
};
type MutableCommandReceipt = Record<string, unknown> & {
  process: {
    status: string;
    result: string;
    exitCode: number;
    signalCode: string | number | null;
    stdoutBytes: number;
    stderrBytes: number;
    killStrategy: string;
  };
  discovery: { kind: string; discoveredTestCount: number | null; positive: boolean };
};
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Condition extends true> = Condition;
type Worktree = Readonly<{
  taskGraphDigest: string;
  taskFileDigests: readonly Digest[];
  files: readonly FileState[];
  discoveredByPhase: Readonly<Record<string, readonly string[]>>;
  closedByPhase: Readonly<Record<string, readonly string[]>>;
  deltaPaths: readonly string[];
}>;

const expectedL11SidecarPaths = [
  "_docs/_workflows/lib/task-551-contract.mjs",
  "_docs/_workflows/lib/task-551-evidence-contract.mjs",
  "_docs/_workflows/lib/task-551-evidence-filesystem.mjs",
  "_docs/_workflows/lib/task-551-worktree-compatibility.mjs",
  "_docs/_workflows/lib/task-551-l02-subgate-executor.mjs",
  "_docs/_workflows/lib/task-551-dispatch-contract.mjs",
  "_docs/_workflows/lib/task-551-contract.d.mts",
  "_docs/_workflows/task-551-author-audit.mjs",
  "_docs/_workflows/task-551-implement.mjs",
  "_docs/_workflows/task-551-fix.mjs",
  "_docs/_workflows/task-551-author-audit.d.mts",
  "_docs/_workflows/task-551-implement.d.mts",
  "_docs/_workflows/task-551-fix.d.mts",
  "_docs/_workflows/lib/task-551-evidence-contract.d.mts",
  "_docs/_workflows/lib/task-551-dispatch-primitives.mjs",
  "_docs/_workflows/lib/task-551-dispatch-envelope.mjs",
  "_docs/_workflows/lib/task-551-phase-provenance.mjs",
  "_docs/_workflows/lib/task-551-worktree-snapshot.mjs",
  "_docs/_workflows/lib/task-551-l01-barrier.mjs",
] as const;
const expectedL11SidecarTests = [
  "tests/unit/workflows/task551AuthorAudit.test.ts",
  "tests/unit/workflows/authorAuditDriftRounds.test.ts",
  "tests/unit/workflows/authorAuditBoundedChild.test.ts",
  "tests/unit/workflows/task551AuthorAuditFixtures.ts",
  "tests/unit/workflows/task551WorkflowContracts.test.ts",
  "tests/unit/workflows/task551EvidenceContract.test.ts",
  "tests/unit/workflows/dispatchContractCaps.test.ts",
] as const;

const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
const shaBytes = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const evidenceDigest = (value: string): `sha256:${string}` => `sha256:${sha(value)}`;
const logicalArgvVectors = [
  [
    "TASK-551-01-L03:single/focused-static-test",
    "l03-focused-test",
    null,
    ["bun", "--env-file=/dev/null", "test", "tests/perf/task551FixtureTargetBootstrap.test.ts"],
    "b1fac2a7f75c9fdbcbf6981c9f80037cd5b5b37664fe216280ced9491240d33e",
  ],
  [
    "TASK-551-01-L03:single/bootstrap-initialize",
    "l03-initialize",
    null,
    ["bun", "--env-file=/dev/null", "scripts/task-551-fixture-target-bootstrap.ts", "--initialize"],
    "e437a8dd410ac6e07adc44c760d5c9b16043c4f4ba85c192012db8e692b6acdc",
  ],
  [
    "TASK-551-01-L03:single/bootstrap-check",
    "l03-check",
    null,
    ["bun", "--env-file=/dev/null", "scripts/task-551-fixture-target-bootstrap.ts", "--check"],
    "d30d5864fa19ed4499fc32027e55928d04c9e893d28a88ed5c93657533e2c2f1",
  ],
  [
    "TASK-551-01-L02:single/isolated-projection-static-small",
    "l02-static-small-baseline",
    null,
    ["bun", "--env-file=/dev/null", "test", "tests/perf/database-query-baseline.test.ts"],
    "2815d24df727ca6d1f4f041f83fb7ec314daddfc22262c37e31b6cb00841b3f2",
  ],
  [
    "TASK-551-01-L02:single/isolated-digest-static-small",
    "l02-static-small-digest",
    null,
    [
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
    ],
    "ba58f5f52f16dc2297c279ed6ad9c753b5428fd7d0e6d7195878df64dd846f92",
  ],
  [
    "TASK-551-01-L02:single/isolated-projection-static-large",
    "l02-static-large-baseline",
    null,
    ["bun", "--env-file=/dev/null", "test", "tests/perf/database-query-baseline.test.ts"],
    "4b4dad497758771c0b9677c6f785159d7991d0efb6a411bc7362d0e5993f4b5d",
  ],
  [
    "TASK-551-01-L02:single/isolated-digest-static-large",
    "l02-static-large-digest",
    null,
    [
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
    ],
    "50d7922b408dc00f7b19c3ba881f19ed99bc4d1777e512a980e6ef58892ab5fa",
  ],
  [
    "TASK-551-01-L02:single/freeze-small",
    "l02-freeze",
    "small",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--freeze",
      "--profile",
      "small",
      "--all",
    ],
    "7715e8bec5ae79338c26a9c019a407d96edb37abde8a74cae5852c04ec56f0c5",
  ],
  [
    "TASK-551-01-L02:single/freeze-large",
    "l02-freeze",
    "large",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--freeze",
      "--profile",
      "large",
      "--all",
    ],
    "de8b09a38c79ccfe18391d4c3886e3c2586816adac11374e0090c3a80ec92523",
  ],
  [
    "TASK-551-01-L02:single/check-small",
    "l02-check",
    "small",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--check",
      "--profile",
      "small",
      "--all",
    ],
    "b1394617c96df87877b48b5c0092fe5e5ae4d05b8d188b14ead2b1d5e98b5c02",
  ],
  [
    "TASK-551-01-L02:single/check-large",
    "l02-check",
    "large",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--check",
      "--profile",
      "large",
      "--all",
    ],
    "f16d2763061f75d5ebe3b13a6b3bf5d83bd8335f6f61219851c42baab7209df8",
  ],
  [
    "TASK-551-05-L02:single/database-explain-plans-test",
    "05-l02-explain-plans-test",
    null,
    ["bun", "--env-file=/dev/null", "test", "tests/perf/database-explain-plans.test.ts"],
    "8dd18c1ce4a1e4b3e3fe4df8d2581e1cb14d21343de6e769724eda97367c4692",
  ],
  [
    "TASK-551-05-L02:single/task489-predecessor-plans-test",
    "05-l02-predecessor-test",
    null,
    [
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/task489-solution-kit-run-predecessor-plans.test.ts",
    ],
    "bfa35dc0e7de124153bea12a5ddc20d1ff5569bc8270b7b2ef16c7a20ad73f0f",
  ],
  [
    "TASK-551-05-L02:single/explain-plan-small-check",
    "05-l02-explain-small",
    "small",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-explain-plans.ts",
      "--scale",
      "small",
      "--check",
    ],
    "a597020cfd44aabed3811b48b23b9985653733c84dec4a5ee84294eee8b695ea",
  ],
  [
    "TASK-551-05-L02:single/explain-plan-large-check",
    "05-l02-explain-large",
    "large",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-explain-plans.ts",
      "--scale",
      "large",
      "--check",
    ],
    "8b3de77d6c72d2718396470bf0a51ce26354ea86acb50ac878d3889d2815abe0",
  ],
] as const;
const framedLogicalArgv = (fields: readonly string[]) => {
  const chunks = fields.map((field) => {
    const text = new TextEncoder().encode(field),
      frame = new Uint8Array(text.byteLength + 4);
    new DataView(frame.buffer).setUint32(0, text.byteLength, false);
    frame.set(text, 4);
    return frame;
  });
  const output = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
};
const freezeTestValue = <T>(value: T): T => {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) freezeTestValue(child);
    Object.freeze(value);
  }
  return value;
};
const clearEvidencePreflight = freezeTestValue({
  rows: TASK551_DURABLE_EVIDENCE_MANIFEST.map((_, index) => ({
    rowId: TASK551_EVIDENCE_ROW_IDS[index]!,
    terminalResult: "empty",
    telemetry: "recovery_empty",
  })),
  blockers: [],
  clear: true,
});
const taskFiles = Object.freeze<Digest[]>([
  Object.freeze({
    path: "_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md",
    sha256: sha("graph"),
  }),
]);
const auditSnapshot = createTask551TaskGraphSnapshot(taskFiles);
const allPaths = Object.freeze(
  [
    ...new Set([
      ...[...TASK551_PHASE_IMPORT_CLOSURE.values()].flat(),
      ...[...TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.values()].flat(),
    ]),
  ].sort()
);

function phasePaths(
  map: ReadonlyMap<string, readonly string[]>
): Record<string, readonly string[]> {
  return Object.fromEntries([...map.entries()].map(([phase, paths]) => [phase, [...paths]]));
}

function worktree(
  options: Readonly<{
    absent?: readonly string[];
    symlinks?: readonly string[];
    drift?: Readonly<Record<string, string>>;
    deltaPaths?: readonly string[];
    extra?: Readonly<Record<string, string>>;
    taskDigest?: string;
    taskFileDigests?: readonly Digest[];
  }> = {}
): Worktree {
  const absent = new Set(options.absent ?? []);
  const symlinks = new Set(options.symlinks ?? []);
  const drift = options.drift ?? {};
  const extra = Object.entries(options.extra ?? {}).map(([path, sha256]) =>
    Object.freeze({ path, sha256, kind: "regular" as const })
  );
  const currentTaskFiles = Object.freeze(
    (options.taskFileDigests ?? taskFiles).map((entry) =>
      Object.freeze({
        path: entry.path,
        sha256: options.taskDigest ?? entry.sha256,
      })
    )
  );
  const graph = createTask551TaskGraphSnapshot(currentTaskFiles).taskGraphDigest;
  return Object.freeze({
    taskGraphDigest: graph,
    taskFileDigests: currentTaskFiles,
    files: Object.freeze(
      [
        ...allPaths
          .filter((path) => !absent.has(path))
          .map((path) =>
            Object.freeze({
              path,
              sha256: drift[path] ?? sha(path),
              kind: symlinks.has(path) ? ("symlink" as const) : ("regular" as const),
            })
          ),
        ...extra,
      ].sort((left, right) => left.path.localeCompare(right.path))
    ),
    discoveredByPhase: phasePaths(TASK551_PHASE_DISCOVERY_ALLOWLIST),
    closedByPhase: phasePaths(TASK551_PHASE_CLOSED_ALLOWLIST),
    deltaPaths: Object.freeze([...(options.deltaPaths ?? [])].sort()),
  });
}

const classifierManifestPath = "tests/bun-lane-manifest.json";
const exactManifestPaths = TASK551_PLANNED_BUN_PATHS;

function digestFor(current: Worktree, path: string): Digest {
  const entry = current.files.find((file) => file.path === path);
  if (entry === undefined) throw new Error(`missing fixture path: ${path}`);
  return Object.freeze({ path, sha256: entry.sha256 });
}

function receipt(
  id: string,
  argv: readonly string[],
  worktreeDigest: string,
  discoveredTestCount: number | null = 1
) {
  return Object.freeze({
    id,
    argv: Object.freeze([...argv]),
    exitCode: 0,
    signalCode: null,
    timedOut: false as const,
    overflowed: false as const,
    discoveredTestCount,
    worktreeDigest,
  });
}

function barrierFixtures(
  options: Readonly<{ auxiliaryDrift?: boolean; auxiliaryDelta?: boolean }> = {}
) {
  const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
  const before = worktree({
    drift: {
      [classifierManifestPath]: sha("before-classifier"),
      ...(options.auxiliaryDrift ? { [auxiliary]: sha("auxiliary-before") } : {}),
    },
  });
  const after = worktree({
    drift: {
      [classifierManifestPath]: sha("after-classifier"),
      ...(options.auxiliaryDrift ? { [auxiliary]: sha("auxiliary-after") } : {}),
    },
    deltaPaths: [classifierManifestPath, ...(options.auxiliaryDelta ? [auxiliary] : [])],
  });
  const beforeWorktreeDigest = task551L11BarrierCurrentWorktreeDigest(before);
  const afterWorktreeDigest = task551L11BarrierCurrentWorktreeDigest(after);
  const l03Predecessor = captureTask551PreSpawnWorktreeSnapshot("l03", auditSnapshot, before);
  const l03ActiveSnapshot = captureTask551MaterializedWorktreeSnapshot(
    "l03",
    l03Predecessor,
    before
  );
  const l03Row = TASK551_DURABLE_EVIDENCE_MANIFEST[1]!;
  const manifest = digestFor(after, classifierManifestPath);
  return {
    before,
    after,
    input: {
      auditSnapshot,
      beforeClassifierWorktree: before,
      afterClassifierWorktree: after,
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
        beforeWorktreeDigest
      ),
      classifierReceipt: receipt(
        "l01-classifier",
        ["bun", "scripts/bun-lane-classify.ts"],
        afterWorktreeDigest,
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
            afterWorktreeDigest
          ),
          manifestSha256: manifest.sha256,
        }),
        Object.freeze({
          ...receipt(
            "l11-post-generator-membership-test",
            ["bun", "test", "tests/integration/server/task551BunLaneMembership.test.ts"],
            afterWorktreeDigest
          ),
          manifestSha256: manifest.sha256,
        }),
      ]),
      l03EvidenceProof: Object.freeze({
        path: l03Row.path,
        schema: l03Row.schema,
        phase: "l03-check" as const,
        taskId: "TASK-551-01-L03",
        accepted: true as const,
        acceptedEvidenceDigest: evidenceDigest("accepted-l03-check"),
        worktreeDigest: task551L11BarrierSnapshotDigest(l03ActiveSnapshot),
      }),
    },
  };
}

const l02EvidenceRoot = "_docs/_workflows/_smoke/task-551/audit-evidence";
const l02ProcessReceipt = () => ({
  status: "passed",
  result: "zero_exit",
  exitCode: 0,
  signalCode: null,
  stdoutBytes: 0,
  stderrBytes: 0,
});
function l03CheckEvidence(toolContractDigest = evidenceDigest("checked-tool-contract")) {
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

const workflowRepoRoot = path.resolve(import.meta.dir, "../../..");
const workflowDiscovery = () =>
  Object.fromEntries(
    ["sidecar", "l01", "l03", "l04", "l02", "05-l02"].map((phase) => [
      phase,
      [...TASK551_PHASE_IMPORT_CLOSURE.get(phase)!],
    ])
  );
const workflowGit = ({ argv, cwd }: { argv: readonly string[]; cwd: string }) =>
  new Promise<{ exitCode: number; stdout: Uint8Array; stderr: Uint8Array }>((resolve) =>
    execFile(argv[0]!, argv.slice(1), { cwd, encoding: "buffer" }, (error, stdout, stderr) =>
      resolve({
        exitCode: error === null ? 0 : typeof error?.code === "number" ? error.code : 1,
        stdout: Buffer.from(stdout ?? []),
        stderr: Buffer.from(stderr ?? []),
      })
    )
  );
async function executionFixture(occurrenceId: string) {
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

async function l02ExecutionFixture(absent: readonly string[] = []) {
  const fixture = await executionFixture("TASK-551-01-L02:single");
  await runL03Completion(fixture, null, l03CheckEvidence(), () => undefined, absent);
  return fixture;
}
function l02States(
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
function classifierResult(before: Worktree, after: Worktree) {
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
const l02EvidenceInput = () => ({
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
const task489Temporary = ".tmp/task-551/task489-predecessor-v1.json";
const task489CommitA = (sourceHead: string) =>
  freezeTestValue({
    sourceHead,
    createdAt: "2026-08-30T00:00:00.000Z",
    reviewedAt: "2026-08-30T00:00:00.000Z",
    promotedAt: "2026-08-30T00:00:00.000Z",
    ownerCapabilityReceiptDigest: sha("capability"),
  });
const task489Source = () => task489PredecessorEvidence();
async function withTask489Temporary<T>(run: (bytes: Uint8Array) => Promise<T>) {
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
const task489DeferredFiles = () =>
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
async function readyTask489Fixture() {
  const fixture = await executionFixture("TASK-551-05-L02:single");
  await materializeL02ForTask489(fixture);
  return fixture;
}
function task489Worktrees(
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
async function task489TerminalOutcome(
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
function task489Handoff(
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

describe("TASK-551 current-worktree snapshot contract", () => {
  test("types the durable writer digest directly into the L03 proof handoff", () => {
    const matches: Assert<
      Equal<
        Awaited<ReturnType<typeof writeTask551EvidenceFileIfAbsent>>["digest"],
        Task551L11L03EvidenceProofV1["acceptedEvidenceDigest"]
      >
    > = true;
    expect(matches).toBe(true);
  });

  test("derives immutable-worktree projections without commit terminology", () => {
    expect(TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.get("l01")).toEqual([
      "tests/bun-lane-manifest.json",
    ]);
    expect(TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get("l01")).toContain(
      "tests/bun-lane-manifest.json"
    );
    expect(deriveTask551ClosedWorktreeSet(["l01"])).toContain("tests/bun-lane-manifest.json");
    expect(deriveTask551ClosedWorktreeSet(["05-l02"])).not.toContain(
      ".tmp/task-551/task489-predecessor-v1.json"
    );
    expect(TASK551_05_L02_PROVENANCE?.phase).toBe("05-l02");
    expect(TASK551_05_L02_VALIDATION_PATHS).toEqual(TASK551_PHASE_IMPORT_CLOSURE.get("05-l02"));
    expect(TASK551_05_L02_LINE_COUNT_PATHS).toEqual(TASK551_PHASE_CLOSED_ALLOWLIST.get("05-l02"));
  });

  test("allows absent active L03 paths before its dispatcher, then captures and rechecks them", () => {
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    const absentActive = [...TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!, auxiliary];
    const before = worktree({ absent: absentActive });
    const predecessor = captureTask551PreSpawnWorktreeSnapshot("l03", auditSnapshot, before);
    expect(predecessor.activeDigests).toEqual([]);
    expect(predecessor.predecessorDigests.map(({ path }) => path)).not.toContain(auxiliary);
    expect(requireTask551PredecessorWorktreeSnapshotBeforeSpawn("l03", predecessor, before)).toBe(
      true
    );

    const after = worktree({ absent: [auxiliary] });
    const materialized = captureTask551MaterializedWorktreeSnapshot("l03", predecessor, after);
    expect(materialized.activeDigests.map((entry) => entry.path)).toEqual(
      TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get("l03")
    );
    expect(materialized.predecessorDigests.map(({ path }) => path)).not.toContain(auxiliary);
    expect(
      requireExactActivePhaseSnapshotBeforeSpawn(
        "l03",
        materialized.activeDigests,
        after,
        materialized
      )
    ).toBe(true);
  });

  test("excludes the direct L01 auxiliary gate from every successor snapshot and delta allowance", () => {
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    for (const phase of ["l03", "l04", "l02", "05-l02"]) {
      const predecessor = captureTask551PreSpawnWorktreeSnapshot(
        phase,
        auditSnapshot,
        worktree({ absent: [auxiliary] })
      );
      expect(predecessor.predecessorDigests.map(({ path }) => path)).not.toContain(auxiliary);
      expect(() =>
        captureTask551PreSpawnWorktreeSnapshot(
          phase,
          auditSnapshot,
          worktree({ deltaPaths: [auxiliary] })
        )
      ).toThrow(/foreign_delta/);
    }
  });

  test("fails closed on task graph, predecessor, active, symlink, and foreign-delta drift", () => {
    const baseline = worktree();
    const predecessor = captureTask551PreSpawnWorktreeSnapshot("l03", auditSnapshot, baseline);
    const active = captureTask551MaterializedWorktreeSnapshot("l03", predecessor, baseline);
    const predecessorPath = TASK551_PHASE_IMPORT_CLOSURE.get("l01")![0]!;
    const activePath = TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get("l03")![0]!;

    expect(() =>
      captureTask551PreSpawnWorktreeSnapshot(
        "l03",
        auditSnapshot,
        worktree({ taskDigest: sha("changed-task") })
      )
    ).toThrow(/task_graph_byte_drift/);
    expect(() =>
      requireTask551PredecessorWorktreeSnapshotBeforeSpawn(
        "l03",
        predecessor,
        worktree({ drift: { [predecessorPath]: sha("drift") } })
      )
    ).toThrow(/byte_drift/);
    expect(() =>
      requireExactActivePhaseSnapshotBeforeSpawn(
        "l03",
        active.activeDigests,
        worktree({ drift: { [activePath]: sha("drift") } }),
        active
      )
    ).toThrow(/byte_drift/);
    expect(() =>
      captureTask551PreSpawnWorktreeSnapshot(
        "l03",
        auditSnapshot,
        worktree({ symlinks: [predecessorPath] })
      )
    ).toThrow(/not_regular/);
    expect(() =>
      captureTask551PreSpawnWorktreeSnapshot(
        "l03",
        auditSnapshot,
        worktree({ deltaPaths: ["core/foreign.ts"] })
      )
    ).toThrow(/foreign_delta/);
  });

  test("uses literal exact path sets and a separate predecessor closure", () => {
    expect(task551FullProvenanceClosureForSpawn("l02")).toEqual([
      "sidecar",
      "l01",
      "l03",
      "l04",
      "l02",
    ]);
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    const capabilitySafetyPaths = [
      "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
    ];
    expect(TASK551_PHASE_PROVENANCE.find(({ phase }) => phase === "l01")?.ownedFiles).toEqual(
      expect.arrayContaining(capabilitySafetyPaths)
    );
    for (const projection of [
      TASK551_PHASE_IMPORT_CLOSURE,
      TASK551_PHASE_DISCOVERY_ALLOWLIST,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      TASK551_PHASE_VALIDATION_PATHS,
      TASK551_PHASE_LINE_COUNT_PATHS,
    ])
      expect(projection.get("l01")).toEqual(
        expect.arrayContaining([auxiliary, ...capabilitySafetyPaths])
      );
    expect(TASK551_PLANNED_BUN_PATHS).toHaveLength(9);
    expect(TASK551_PLANNED_BUN_PATHS).not.toContain(auxiliary);
    expect(TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS).toEqual([
      "tests/perf/database-query-inventory.test.ts",
      "tests/integration/server/task551BunLaneMembership.test.ts",
      "tests/perf/task551FixtureTargetBootstrap.test.ts",
      "tests/perf/database-query-baseline.test.ts",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
      "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
      "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts",
      "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
      "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts",
    ]);
    expect(TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS).not.toContain(auxiliary);
    expect(() =>
      requireTask551LiteralUniquePaths(["tests/a.test.ts", "tests/a.test.ts"], "test")
    ).toThrow(/duplicate_path/);
    expect(() => requireTask551LiteralUniquePaths(["../tests/a.test.ts"], "test")).toThrow(
      /traversal/
    );
    expect(() => requireTask551LiteralUniquePaths(["tests//a.test.ts"], "test")).toThrow(
      /traversal/
    );
  });

  test("keeps the direct L01 auxiliary gate out of every L11 barrier receipt and snapshot", () => {
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    const capabilitySafetyPaths = [
      "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
    ];
    for (const projection of [
      TASK551_PHASE_IMPORT_CLOSURE,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      TASK551_PHASE_VALIDATION_PATHS,
      TASK551_PHASE_LINE_COUNT_PATHS,
    ])
      expect(projection.get("l01")).toEqual(
        expect.arrayContaining([auxiliary, ...capabilitySafetyPaths])
      );

    const baseline = barrierFixtures(),
      changed = barrierFixtures({ auxiliaryDrift: true });
    const baselineState = captureTask551L01MaterializationBarrier(baseline.input);
    const changedState = captureTask551L01MaterializationBarrier(changed.input);
    expect(changedState.beforeWorktreeDigest).toBe(baselineState.beforeWorktreeDigest);
    expect(changedState.afterWorktreeDigest).toBe(baselineState.afterWorktreeDigest);
    expect(task551L11BarrierCurrentWorktreeDigest(changed.before)).toBe(
      baselineState.beforeWorktreeDigest
    );
    expect(task551CurrentWorktreeDigest(changed.before)).not.toBe(
      baselineState.beforeWorktreeDigest
    );
    expect(changedState.l01ActiveSnapshot.activeDigests.map(({ path }) => path)).toEqual(
      expect.arrayContaining(capabilitySafetyPaths)
    );
    for (const snapshot of [
      changedState.l03ActiveSnapshot,
      changedState.l04ActiveSnapshot,
      changedState.l01ActiveSnapshot,
      changedState.l02PredecessorSnapshot,
    ]) {
      expect(
        [...snapshot.predecessorDigests, ...snapshot.activeDigests].map(({ path }) => path)
      ).not.toContain(auxiliary);
    }

    const invalidL01 = Object.freeze({
      ...changedState.l01ActiveSnapshot,
      activeDigests: Object.freeze(
        [...changedState.l01ActiveSnapshot.activeDigests, digestFor(changed.after, auxiliary)].sort(
          (left, right) => left.path.localeCompare(right.path)
        )
      ),
    });
    expect(() =>
      requireTask551L01MaterializationBarrierBeforeL02(
        Object.freeze({ ...changedState, l01ActiveSnapshot: invalidL01 }),
        changed.after
      )
    ).toThrow(/barrier_state_invalid/);
    expect(() =>
      captureTask551L01MaterializationBarrier(
        barrierFixtures({ auxiliaryDrift: true, auxiliaryDelta: true }).input
      )
    ).toThrow(/foreign_delta/);
  });
});

describe("TASK-551 L11 compatibility bootstrap and generic barrier", () => {
  test("is descriptor-only, frozen, framed, and does not resolve deferred targets", async () => {
    const source = await readFile(
      new URL("../../../_docs/_workflows/lib/task-551-contract.mjs", import.meta.url),
      "utf8"
    );
    const receipt = runTask551WorkflowCompatibilityBootstrapV2();
    const values = [
      "coderso.task551.workflow-compatibility-descriptor@v2",
      receipt.schema,
      receipt.phase,
      receipt.descriptorSchema,
      ...receipt.sidecarPaths,
      ...receipt.plannedBunPaths,
      ...receipt.l02Subgates,
      receipt.workflowPrerequisite,
      "true",
    ];
    const frames = values.map((value) => {
      const text = new TextEncoder().encode(value),
        frame = new Uint8Array(text.byteLength + 4);
      new DataView(frame.buffer).setUint32(0, text.byteLength, false);
      frame.set(text, 4);
      return frame;
    });
    const framed = new Uint8Array(frames.reduce((size, frame) => size + frame.byteLength, 0));
    let offset = 0;
    for (const frame of frames) {
      framed.set(frame, offset);
      offset += frame.byteLength;
    }
    expect(source).not.toMatch(
      /^import.+scripts\/task551DatabaseBaseline|^import.+task-551-fixture-target-bootstrap/mu
    );
    expect(TASK551_DEFERRED_LITERAL_TARGET_PATHS).toHaveLength(5);
    expect(Object.keys(receipt)).toEqual([
      "schema",
      "phase",
      "descriptorSchema",
      "sidecarClosureSha256",
      "sidecarPaths",
      "plannedBunPaths",
      "l02Subgates",
      "workflowPrerequisite",
      "l04Phase",
    ]);
    expect(
      Object.isFrozen(receipt) &&
        Object.isFrozen(receipt.sidecarPaths) &&
        Object.isFrozen(receipt.plannedBunPaths)
    ).toBe(true);
    const sidecar = TASK551_PHASE_PROVENANCE[0]!;
    expect([sidecar.phase, sidecar.ownedFiles, sidecar.ownedTests]).toEqual([
      "sidecar",
      expectedL11SidecarPaths,
      expectedL11SidecarTests,
    ]);
    expect([
      expectedL11SidecarPaths.length + expectedL11SidecarTests.length,
      receipt.sidecarPaths.length,
    ]).toEqual([26, 19]);
    expect(
      TASK551_PHASE_PROVENANCE.reduce(
        (count, phase) => count + phase.ownedFiles.length + phase.ownedTests.length,
        0
      )
    ).toBe(88);
    expect(receipt.sidecarPaths).toEqual(expectedL11SidecarPaths);
    expect(receipt.plannedBunPaths).toEqual(exactManifestPaths);
    expect(receipt.sidecarClosureSha256).toBe(shaBytes(framed));
    const loader = `const targets = new Set(${JSON.stringify(TASK551_DEFERRED_LITERAL_TARGET_PATHS)}); export async function resolve(specifier, context, nextResolve) { if ([...targets].some((target) => specifier.endsWith(target))) throw new Error("deferred-target-resolved"); return nextResolve(specifier, context); }`;
    const program = `import { runTask551WorkflowCompatibilityBootstrapV2 } from ${JSON.stringify(new URL("../../../_docs/_workflows/lib/task-551-contract.mjs", import.meta.url).href)}; runTask551WorkflowCompatibilityBootstrapV2();`;
    const cold = await workflowGit({
      argv: [
        "node",
        "--experimental-loader",
        `data:text/javascript,${encodeURIComponent(loader)}`,
        "--input-type=module",
        "--eval",
        program,
      ],
      cwd: workflowRepoRoot,
    });
    expect(cold.exitCode).toBe(0);
  });

  test("binds every logical argv vector to its context and rejects receipt/frame mutations", async () => {
    const calls: string[][] = [],
      receipts: Array<Record<string, unknown>> = [];
    const spawn = (argv: string[]) => {
      calls.push(argv);
      const empty = async function* () {
        /* deliberately empty */
      };
      return {
        pid: calls.length,
        stdout: empty(),
        stderr: empty(),
        exited: Promise.resolve(0),
        signalCode: null,
      };
    };
    for (const [
      commandContextId,
      logicalCommandId,
      profile,
      argv,
      expectedDigest,
    ] of logicalArgvVectors) {
      const fields = [
        "coderso.task551.logical-argv-preimage@v1",
        "coderso.task551.logical-argv@v1",
        commandContextId,
        logicalCommandId,
        String(argv.length),
        ...argv,
      ];
      const preimage = framedLogicalArgv(fields);
      expect(shaBytes(preimage)).toBe(expectedDigest);
      expect(requireTask551LogicalArgvPreimageV1(preimage)).toEqual({
        contractId: "coderso.task551.logical-argv@v1",
        sha256: expectedDigest,
        argCount: argv.length,
        envFile: "--env-file=/dev/null",
      });
      const result = await runTask551BoundedChild({
        commandContextId,
        logicalCommandId,
        ...(profile === null ? {} : { profile }),
        bunExecutablePath: "/trusted/bun",
        env: { PATH: "/bin" },
        cwd: "/repo",
        discovery: Object.freeze(
          argv[2] === "test"
            ? { kind: "test-paths", discoveredTestCount: 1, positive: true }
            : { kind: "not-applicable", discoveredTestCount: null, positive: false }
        ),
        spawn,
      });
      const receipt = result.commandReceipt as Record<string, unknown>;
      expect(Object.keys(receipt)).toEqual([
        "schema",
        "logicalCommandId",
        "commandContextId",
        "logicalArgv",
        "process",
        "discovery",
      ]);
      expect(Object.isFrozen(receipt) && Object.isFrozen(receipt.logicalArgv as object)).toBe(true);
      expect(receipt.logicalArgv).toEqual({
        contractId: "coderso.task551.logical-argv@v1",
        sha256: expectedDigest,
        argCount: argv.length,
        envFile: "--env-file=/dev/null",
      });
      expect(receipt).not.toHaveProperty("argv");
      expect(receipt).not.toHaveProperty("preimage");
      expect(receipt).not.toHaveProperty("env");
      expect(requireTask551CommandReceiptV1(receipt)).toBe(true);
      receipts.push(receipt);
    }
    expect(calls).toHaveLength(15);
    for (const [index, vector] of logicalArgvVectors.entries())
      expect(calls[index]).toEqual(["/trusted/bun", ...vector[3].slice(1)]);
    expect(logicalArgvVectors[3]![3]).toEqual(logicalArgvVectors[5]![3]);
    expect(logicalArgvVectors[3]![4]).not.toBe(logicalArgvVectors[5]![4]);
    const copy = (mutate: (value: MutableLogicalReceipt) => void) => {
      const value = JSON.parse(JSON.stringify(receipts[3])) as MutableLogicalReceipt;
      mutate(value);
      return freezeTestValue(value);
    };
    const mutations = [
      (value: MutableLogicalReceipt) => {
        value.logicalArgv.sha256 = value.logicalArgv.sha256.toUpperCase();
      },
      (value: MutableLogicalReceipt) => {
        Object.assign(value, {
          commandContextId: logicalArgvVectors[5]![0],
          logicalCommandId: logicalArgvVectors[5]![1],
        });
      },
      (value: MutableLogicalReceipt) => {
        value.logicalArgv.argCount += 1;
      },
      (value: MutableLogicalReceipt) => {
        value.logicalArgv.envFile = "--env-file=.env";
      },
      (value: MutableLogicalReceipt) => {
        value.argv = ["bun"];
      },
      (value: MutableLogicalReceipt) => {
        value.preimage = "raw";
      },
    ];
    for (const mutate of mutations)
      expect(() => requireTask551CommandReceiptV1(copy(mutate))).toThrow();
    const receiptCopy = (mutate: (value: MutableCommandReceipt) => void) => {
      const value = JSON.parse(JSON.stringify(receipts[3])) as MutableCommandReceipt;
      mutate(value);
      return freezeTestValue(value);
    };
    const numericSignal = receiptCopy((value) => {
      value.process.status = "failed";
      value.process.result = "nonzero_exit";
      value.process.exitCode = 0;
      value.process.signalCode = 9;
      value.process.killStrategy = "process_group";
    });
    expect(requireTask551CommandReceiptV1(numericSignal)).toBe(true);
    const receiptMutations = [
      (value: MutableCommandReceipt) => {
        value.process.status = "passed";
        value.process.result = "zero_exit";
        value.process.signalCode = 9;
      },
      (value: MutableCommandReceipt) => {
        value.process.status = "failed";
        value.process.result = "zero_exit";
        value.process.exitCode = 1;
      },
      (value: MutableCommandReceipt) => {
        value.process.status = "failed";
        value.process.result = "nonzero_exit";
        value.process.exitCode = 0;
        value.process.signalCode = null;
      },
      (value: MutableCommandReceipt) => {
        value.process.status = "failed";
        value.process.result = "nonzero_exit";
        value.process.exitCode = 1;
        value.process.signalCode = 9;
      },
      (value: MutableCommandReceipt) => {
        value.process.status = "failed";
        value.process.result = "nonzero_exit";
        value.process.exitCode = 1;
        value.process.killStrategy = "unbounded-kill-strategy";
      },
      (value: MutableCommandReceipt) => {
        value.process.stdoutBytes = 1_048_577;
      },
      (value: MutableCommandReceipt) => {
        value.process.stderrBytes = 1_048_577;
      },
      (value: MutableCommandReceipt) => {
        value.discovery.discoveredTestCount = 1_048_577;
      },
      (value: MutableCommandReceipt) => {
        value.process.status = "failed";
        value.process.result = "nonzero_exit";
        value.process.exitCode = 0;
        value.process.signalCode = 256;
      },
    ];
    for (const mutate of receiptMutations)
      expect(() => requireTask551CommandReceiptV1(receiptCopy(mutate))).toThrow(
        /logical_argv_receipt_invalid/
      );
    const [, command, , argv] = logicalArgvVectors[3]!;
    const malformedFrames = [
      framedLogicalArgv(
        [
          "coderso.task551.logical-argv-preimage@v1",
          "coderso.task551.logical-argv@v1",
          logicalArgvVectors[3]![0],
          command,
          String(argv.length),
          ...argv,
        ].slice(0, -1)
      ),
      framedLogicalArgv([
        "coderso.task551.logical-argv-preimage@v1",
        "coderso.task551.logical-argv@v1",
        logicalArgvVectors[3]![0],
        command,
        "04",
        ...argv,
      ]),
      framedLogicalArgv([
        "coderso.task551.logical-argv-preimage@v1",
        "coderso.task551.logical-argv@v1",
        logicalArgvVectors[3]![0],
        command,
        String(argv.length),
        argv[1]!,
        argv[0]!,
        ...argv.slice(2),
      ]),
      framedLogicalArgv([
        "coderso.task551.logical-argv-preimage@v1",
        "coderso.task551.logical-argv@v1",
        logicalArgvVectors[3]![0],
        command,
        String(argv.length + 1),
        ...argv,
        "extra",
      ]),
      new Uint8Array([255, 255, 255, 255]),
      new Uint8Array(16_385),
    ];
    for (const frame of malformedFrames)
      expect(() => requireTask551LogicalArgvPreimageV1(frame)).toThrow();
    await expect(
      runTask551BoundedChild({
        commandContextId: "TASK-551-01-L02:single/freeze-small",
        logicalCommandId: "l02-freeze",
        profile: "large",
        bunExecutablePath: "/trusted/bun",
        env: { PATH: "/bin" },
        cwd: "/repo",
        discovery: Object.freeze({
          kind: "not-applicable",
          discoveredTestCount: null,
          positive: false,
        }),
        spawn,
      })
    ).rejects.toThrow(/command_profile_crossed/);
  });

  test("requires current bytes before any named seam can resolve a target", async () => {
    const l03Path = TASK551_DEFERRED_LITERAL_TARGET_PATHS[0]!,
      l04Path = TASK551_DEFERRED_LITERAL_TARGET_PATHS[1]!;
    const l03 = worktree({ extra: { [l03Path]: sha("l03") } }),
      l04 = worktree({ extra: { [l04Path]: sha("l04") } });
    const l02 = worktree({
      extra: Object.fromEntries(
        TASK551_DEFERRED_LITERAL_TARGET_PATHS.slice(2).map((path) => [path, sha(path)])
      ),
    });
    await expect(
      adaptTask551L03ClosureV2(createTask551NamedPhaseClosureV2("l03", l03))
    ).rejects.toThrow(/l03_tool_contract_digest_invalid/);
    await expect(
      adaptTask551L04ClosureV2(createTask551NamedPhaseClosureV2("l04", l04))
    ).rejects.toThrow(/l04_bootstrap_provenance_invalid/);
    await expect(
      adaptTask551L02ClosureV2(createTask551L02CodeTestMaterializationClosureV1(l02))
    ).rejects.toThrow(/l02_code_test_materialization_closure_invalid/);
    await expect(
      adaptTask551L03ClosureV2(
        createTask551NamedPhaseClosureV2("l03", l03),
        worktree({ extra: { [l03Path]: sha("stale") } })
      )
    ).rejects.toThrow(/l03_tool_contract_digest_invalid/);
  });

  test("keeps the predecessor parser at one closure-then-byte-checked facade seam", async () => {
    const facade = await readFile(
      new URL("../../../_docs/_workflows/lib/task-551-contract.mjs", import.meta.url),
      "utf8"
    );
    const evidence = await readFile(
      new URL("../../../_docs/_workflows/lib/task-551-evidence-contract.mjs", import.meta.url),
      "utf8"
    );
    const target = TASK551_DEFERRED_LITERAL_TARGET_PATHS[4]!,
      files = Object.fromEntries(
        TASK551_DEFERRED_LITERAL_TARGET_PATHS.map((path) => [path, sha(path)])
      );
    const current = worktree({ extra: files }),
      closure = createTask551NamedPhaseClosureV2("05-l02", current),
      materialization = createTask551L02CodeTestMaterializationClosureV1(current);
    const drifted = worktree({ extra: { ...files, [target]: sha("predecessor-byte-drift") } });
    const requireClosure = facade.indexOf(
      'requireTask551NamedPhaseClosureV2(closure, "05-l02", currentWorktree)'
    );
    const requireBytes = facade.indexOf(
      "requireTask551L02CodeTestMaterializationClosureV1(l02Materialization, currentWorktree)"
    );
    const parser = facade.indexOf(
      'await import("../../../tests/perf/fixtures/task489SolutionKitRunPredecessor.ts")'
    );
    expect(requireClosure).toBeGreaterThan(-1);
    expect(requireBytes).toBeGreaterThan(requireClosure);
    expect(parser).toBeGreaterThan(requireBytes);
    expect(evidence).not.toContain("task489SolutionKitRunPredecessor");
    expect(facade).not.toContain("verifyTask551Task489PredecessorEvidence");
    await expect(
      readTask55105L02PredecessorAtNamedSeam(closure, materialization, drifted)
    ).rejects.toThrow(/05_l02_predecessor_seam_invalid/);
    await withTask489Temporary(async (bytes) => {
      const current = worktree({ extra: files }),
        foreign = createTask551NamedPhaseClosureV2("05-l02", current);
      const materialized = createTask551L02CodeTestMaterializationClosureV1(current);
      for (const candidate of [undefined, foreign]) {
        await expect(
          readTask55105L02PredecessorAtNamedSeam(candidate, materialized, current)
        ).rejects.toThrow(/05_l02_predecessor_seam_invalid/);
      }
      await expect(
        readTask55105L02PredecessorAtNamedSeam(foreign, materialized, drifted)
      ).rejects.toThrow(/05_l02_predecessor_seam_invalid/);
      expect(await readFile(task489Temporary)).toEqual(bytes);
    });
  });

  test("limits the post-materialization owner-host import to the composition root", async () => {
    const root = "../../../_docs/_workflows/",
      host = "reviewedPairOwnerHost.ts";
    const paths = [
      "task-551-implement.mjs",
      "lib/task-551-contract.mjs",
      "lib/task-551-evidence-contract.mjs",
      "lib/task-551-evidence-filesystem.mjs",
      "lib/task-551-worktree-compatibility.mjs",
      "lib/task-551-l02-subgate-executor.mjs",
      "lib/task-551-dispatch-contract.mjs",
      "lib/task-551-dispatch-primitives.mjs",
      "lib/task-551-dispatch-envelope.mjs",
      "lib/task-551-phase-provenance.mjs",
      "lib/task-551-worktree-snapshot.mjs",
      "lib/task-551-l01-barrier.mjs",
      "task-551-author-audit.mjs",
      "task-551-fix.mjs",
    ];
    const sources = await Promise.all(
      paths.map(
        async (item) =>
          [item, await readFile(new URL(`${root}${item}`, import.meta.url), "utf8")] as const
      )
    );
    const implement = new Map(sources).get("task-551-implement.mjs")!,
      literal = `await import("../../scripts/task551DatabaseBaseline/${host}")`;
    const gate = "const l02Materialization = requireTask551L02CodeTestMaterializationClosureV1(";
    const outer = implement.slice(
      implement.indexOf("export async function runTask551ImplementWorkflow(input) {")
    );
    const bootstrap = "const receipt = runTask551WorkflowCompatibilityBootstrapV2();";
    expect(outer.indexOf(bootstrap)).toBeGreaterThan(-1);
    for (const laterAccess of [
      "const config = requireTask551ImplementInput",
      "requireTask551ProductionDispatchPermit",
      "await bootstrapTask551EvidenceStorageForOwnerWorkflowHost",
      "await awaitTask551EvidencePreflight",
      gate,
      literal,
    ]) {
      expect(outer.indexOf(laterAccess)).toBeGreaterThan(outer.indexOf(bootstrap));
    }
    expect(implement).not.toContain('from "./lib/task-551-evidence-contract.mjs"');
    expect(implement.indexOf(gate)).toBeGreaterThan(-1);
    expect(implement.indexOf(literal)).toBeGreaterThan(implement.indexOf(gate));
    expect(implement).toMatch(/admitTask551WorkflowCompatibilityAuthorAuditV2\(receipt/u);
    expect(implement).toMatch(/admitTask551WorkflowCompatibilityGraphV2\(receipt, authorAudit/u);
    expect(implement).toMatch(/admitTask551WorkflowCompatibilityL02V2\(receipt, graph/u);
    expect(implement.match(/(?:await )?import\([^)]*reviewedPairOwnerHost\.ts/u)).toHaveLength(1);
    for (const [, source] of sources.filter(([item]) => item !== "task-551-implement.mjs"))
      expect(source).not.toMatch(/(?:from\s+|import\()\s*["'][^"']*reviewedPairOwnerHost\.ts/u);
  });

  test("requires the full opaque receipt epoch machine, including retry and foreign-proof failures", () => {
    const code = "task551_workflow_compatibility_bootstrap_invalid",
      invalid = new RegExp(code);
    const receipt = runTask551WorkflowCompatibilityBootstrapV2();
    const reject = (operation: () => unknown) => expect(operation).toThrow(code);
    reject(() =>
      admitTask551WorkflowCompatibilityAuthorAuditV2(undefined, (complete) => complete())
    );
    reject(() =>
      admitTask551WorkflowCompatibilityGraphV2(receipt, undefined, (complete) => complete())
    );
    reject(() =>
      admitTask551WorkflowCompatibilityL02V2(receipt, undefined, (complete) => complete())
    );
    reject(() =>
      admitTask551WorkflowCompatibilityAuthorAuditV2(Object.freeze({ ...receipt }), (complete) =>
        complete()
      )
    );
    reject(() => admitTask551WorkflowCompatibilityAuthorAuditV2(receipt, () => true));
    const author = admitTask551WorkflowCompatibilityAuthorAuditV2(receipt, (complete) =>
      complete()
    );
    reject(() => admitTask551WorkflowCompatibilityAuthorAuditV2(receipt, (complete) => complete()));
    reject(() =>
      admitTask551WorkflowCompatibilityGraphV2(receipt, Object.freeze({}), (complete) => complete())
    );
    reject(() => admitTask551WorkflowCompatibilityGraphV2(receipt, author, () => undefined));
    const graph = admitTask551WorkflowCompatibilityGraphV2(receipt, author, (complete) =>
      complete()
    );
    reject(() =>
      admitTask551WorkflowCompatibilityGraphV2(receipt, author, (complete) => complete())
    );
    reject(() => admitTask551WorkflowCompatibilityL02V2(receipt, author, (complete) => complete()));
    reject(() => admitTask551WorkflowCompatibilityL02V2(receipt, graph, () => undefined));
    const l02 = admitTask551WorkflowCompatibilityL02V2(receipt, graph, (complete) => complete());
    expect(Object.isFrozen(author) && Object.isFrozen(graph) && Object.isFrozen(l02)).toBe(true);
    reject(() => admitTask551WorkflowCompatibilityL02V2(receipt, graph, (complete) => complete()));
    const foreignReceipt = runTask551WorkflowCompatibilityBootstrapV2();
    const foreignAuthor = admitTask551WorkflowCompatibilityAuthorAuditV2(
      foreignReceipt,
      (complete) => complete()
    );
    const currentReceipt = runTask551WorkflowCompatibilityBootstrapV2();
    reject(() =>
      admitTask551WorkflowCompatibilityAuthorAuditV2(foreignReceipt, (complete) => complete())
    );
    reject(() =>
      admitTask551WorkflowCompatibilityGraphV2(currentReceipt, foreignAuthor, (complete) =>
        complete()
      )
    );
    const oldReceipt = runTask551WorkflowCompatibilityBootstrapV2();
    const oldAuthor = admitTask551WorkflowCompatibilityAuthorAuditV2(oldReceipt, (complete) =>
      complete()
    );
    runTask551WorkflowCompatibilityBootstrapV2();
    expect(() =>
      admitTask551WorkflowCompatibilityGraphV2(oldReceipt, oldAuthor, (complete) => complete())
    ).toThrow(invalid);

    const reentrant = runTask551WorkflowCompatibilityBootstrapV2();
    let replacement: ReturnType<typeof runTask551WorkflowCompatibilityBootstrapV2> | undefined;
    expect(() =>
      admitTask551WorkflowCompatibilityAuthorAuditV2(reentrant, (complete) => {
        replacement = runTask551WorkflowCompatibilityBootstrapV2();
        return complete();
      })
    ).toThrow(invalid);
    const freshAuthor = admitTask551WorkflowCompatibilityAuthorAuditV2(replacement!, (complete) =>
      complete()
    );
    const freshGraph = admitTask551WorkflowCompatibilityGraphV2(
      replacement!,
      freshAuthor,
      (complete) => complete()
    );
    expect(
      admitTask551WorkflowCompatibilityL02V2(replacement!, freshGraph, (complete) => complete())
    ).toBeDefined();

    const graphEpoch = runTask551WorkflowCompatibilityBootstrapV2(),
      graphAuthor = admitTask551WorkflowCompatibilityAuthorAuditV2(graphEpoch, (complete) =>
        complete()
      );
    expect(() =>
      admitTask551WorkflowCompatibilityGraphV2(graphEpoch, graphAuthor, (complete) => {
        replacement = runTask551WorkflowCompatibilityBootstrapV2();
        return complete();
      })
    ).toThrow(invalid);
    const recoveredAuthor = admitTask551WorkflowCompatibilityAuthorAuditV2(
      replacement!,
      (complete) => complete()
    );
    expect(
      admitTask551WorkflowCompatibilityGraphV2(replacement!, recoveredAuthor, (complete) =>
        complete()
      )
    ).toBeDefined();

    const l02Epoch = runTask551WorkflowCompatibilityBootstrapV2(),
      l02Author = admitTask551WorkflowCompatibilityAuthorAuditV2(l02Epoch, (complete) =>
        complete()
      ),
      l02Graph = admitTask551WorkflowCompatibilityGraphV2(l02Epoch, l02Author, (complete) =>
        complete()
      );
    expect(() =>
      admitTask551WorkflowCompatibilityL02V2(l02Epoch, l02Graph, (complete) => {
        replacement = runTask551WorkflowCompatibilityBootstrapV2();
        return complete();
      })
    ).toThrow(invalid);
    const finalAuthor = admitTask551WorkflowCompatibilityAuthorAuditV2(replacement!, (complete) =>
        complete()
      ),
      finalGraph = admitTask551WorkflowCompatibilityGraphV2(replacement!, finalAuthor, (complete) =>
        complete()
      );
    expect(
      admitTask551WorkflowCompatibilityL02V2(replacement!, finalGraph, (complete) => complete())
    ).toBeDefined();
  });

  test("keeps all deferred bytes out of generic fingerprints while requiring nine test paths", () => {
    const deferred = TASK551_DEFERRED_LITERAL_TARGET_PATHS[0]!;
    const left = worktree({ extra: { [deferred]: sha("deferred-left") }, deltaPaths: [deferred] });
    const right = worktree({
      extra: { [deferred]: sha("deferred-right") },
      deltaPaths: [deferred],
    });
    const metadataDeferred = Object.freeze({
      ...left,
      discoveredByPhase: {
        ...left.discoveredByPhase,
        l02: [...left.discoveredByPhase.l02!, deferred],
      },
      closedByPhase: { ...left.closedByPhase, l02: [...left.closedByPhase.l02!, deferred] },
    });
    const forbiddenSnapshot = Object.freeze({
      ...auditSnapshot,
      predecessorDigests: Object.freeze([
        Object.freeze({ path: deferred, sha256: sha("deferred") }),
      ]),
    });
    const fixtures = barrierFixtures();
    const pre = captureTask551L01PreClassifierBarrier({
      auditSnapshot,
      currentWorktree: fixtures.before,
      l03EvidenceProof: fixtures.input.l03EvidenceProof,
    });
    const state = captureTask551L01MaterializationBarrier(fixtures.input);
    expect(task551CurrentWorktreeDigest(left)).toBe(task551CurrentWorktreeDigest(right));
    expect(task551CurrentWorktreeDigest(left)).toBe(task551CurrentWorktreeDigest(metadataDeferred));
    expect(() =>
      worktree({ taskFileDigests: [...taskFiles, { path: deferred, sha256: sha("deferred") }] })
    ).toThrow(/deferred_target_in_generic_snapshot/);
    expect(() => task551WorktreeSnapshotDigest(forbiddenSnapshot)).toThrow(
      /deferred_target_in_generic_snapshot/
    );
    expect(Object.keys(pre)).toEqual([
      "taskGraphDigest",
      "taskFileDigests",
      "beforeWorktreeDigest",
      "l03WorktreeSnapshotDigest",
      "l03EvidenceProof",
      "l03ActiveSnapshot",
      "l04ActiveSnapshot",
    ]);
    expect(Object.isFrozen(state.l04ActiveSnapshot)).toBe(true);
    expect(state.manifest.task551Paths).toEqual(exactManifestPaths);
    expect(requireTask551L01MaterializationBarrierBeforeL02(state, fixtures.after)).toBe(true);
    expect(() =>
      captureTask551L01PreClassifierBarrier({
        auditSnapshot,
        currentWorktree: worktree({
          absent: [exactManifestPaths[8]!],
          drift: { [classifierManifestPath]: sha("before-classifier") },
        }),
        l03EvidenceProof: fixtures.input.l03EvidenceProof,
      })
    ).toThrow(/not_regular/);
    for (const paths of [
      [...exactManifestPaths, "tests/extra.test.ts"],
      exactManifestPaths.slice(1),
    ]) {
      expect(() =>
        captureTask551L01MaterializationBarrier({
          ...fixtures.input,
          manifest: { ...fixtures.input.manifest, task551Paths: paths },
        })
      ).toThrow(/manifest_invalid/);
    }
  });
});

describe("TASK-551 L02 injected subgates", () => {
  test("parses the L02-only prerequisite and orders classifier then reviewed transition", async () => {
    const fixture = await l02ExecutionFixture(),
      states = l02States(fixture.snapshot),
      events: string[] = [];
    let current: Worktree = states.before;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l02",
      testExecutionSession: fixture.session,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        events.push("leaf");
        current = states.afterLeaf;
        return { changedPaths: states.leafChanges };
      },
      gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) => {
        events.push(gate.operation);
        return {
          exitCode: 0,
          signalCode: null,
          timedOut: false,
          overflowed: false,
          discoveredTestCount: gate.kind === "test" ? 1 : null,
        };
      },
      evidencePreflight: async () => {
        events.push("preflight");
        return clearEvidencePreflight;
      },
      l02PreBarrierMaterializer: async () => {
        events.push("materializer");
        return states.materializer;
      },
      classifierBarrierRunner: async () => {
        events.push("classifier");
        current = states.afterClassifier;
        return classifierResult(states.before, states.afterClassifier);
      },
      l02ReviewedTransitionRunner: async () => {
        events.push("review");
        return true;
      },
      ...l02EvidenceInput(),
    });
    expect(fixture.node.workflowPrerequisites).toEqual(["TASK-551-11:compatibility-bootstrap@v2"]);
    expect(fixture.node.subgates.map(({ kind }) => kind)).toEqual([
      "classifier-materialization",
      "reviewed-pair-transition",
    ]);
    expect(result.pass).toBe(true);
    for (const callback of ["materializer", "classifier", "review"])
      expect(events[events.indexOf(callback) - 1]).toBe("preflight");
    expect(events.indexOf("review")).toBeGreaterThan(events.indexOf("freeze-large"));
    expect(events.indexOf("review")).toBeLessThan(events.indexOf("check-small"));
  });

  test("keeps the direct L01 auxiliary gate out of actual L03-to-L02 successor state", async () => {
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    const fixture = await l02ExecutionFixture([auxiliary]),
      states = l02States(fixture.snapshot, [auxiliary]);
    let current: Worktree = states.before;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l02",
      testExecutionSession: fixture.session,
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
  });

  test("stops at the reviewed transition with zero check dispatches", async () => {
    const fixture = await l02ExecutionFixture(),
      states = l02States(fixture.snapshot),
      events: string[] = [];
    let current: Worktree = states.before;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l02",
      testExecutionSession: fixture.session,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        current = states.afterLeaf;
        return { changedPaths: states.leafChanges };
      },
      gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) => {
        events.push(gate.operation);
        return {
          exitCode: 0,
          signalCode: null,
          timedOut: false,
          overflowed: false,
          discoveredTestCount: gate.kind === "test" ? 1 : null,
        };
      },
      l02PreBarrierMaterializer: async () => states.materializer,
      classifierBarrierRunner: async () => {
        current = states.afterClassifier;
        return classifierResult(states.before, states.afterClassifier);
      },
      l02ReviewedTransitionRunner: async () => false,
      ...l02EvidenceInput(),
    });
    expect(result).toMatchObject({
      pass: false,
      code: "task551_l02_reviewed_transition_failed",
      gateId: "command:check-small",
    });
    expect(events.filter((event) => event.startsWith("check-"))).toEqual([]);
  });

  test("preflights the L02 prefix fixer immediately before its injected invocation", async () => {
    const fixture = await l02ExecutionFixture(),
      states = l02States(fixture.snapshot);
    let current: Worktree = states.before;
    let preflightCount = 0,
      preflightCountAtFix = 0;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l02",
      testExecutionSession: fixture.session,
      maxFixRounds: 1,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        current = states.afterLeaf;
        return { changedPaths: states.leafChanges };
      },
      gateRunner: async ({ gate }: { gate: { kind: string } }) => ({
        exitCode: 1,
        signalCode: null,
        timedOut: false,
        overflowed: false,
        discoveredTestCount: gate.kind === "test" ? 1 : null,
      }),
      evidencePreflight: async () => {
        preflightCount += 1;
        return clearEvidencePreflight;
      },
      fixAgent: async () => {
        preflightCountAtFix = preflightCount;
        return { status: "error" };
      },
      l02PreBarrierMaterializer: async () => states.materializer,
      classifierBarrierRunner: async () => {
        current = states.afterClassifier;
        return classifierResult(states.before, states.afterClassifier);
      },
      l02ReviewedTransitionRunner: async () => true,
      ...l02EvidenceInput(),
    });
    expect(result.pass).toBe(false);
    expect(preflightCountAtFix).toBe(3);
  });
});

describe("TASK-551 implementation workflow", () => {
  test("disposes every L03 source before child await with no post-disposal access", async () => {
    const fixture = await executionFixture("TASK-551-01-L03:single"),
      [node] = deriveTask551ImplementLandOrder(fixture.dispatch, ["TASK-551-01-L03:single"]);
    const closed = TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!,
      bundle = l03CheckEvidence();
    const before = worktree({ taskFileDigests: fixture.snapshot.taskFileDigests, absent: closed }),
      after = worktree({ taskFileDigests: fixture.snapshot.taskFileDigests, deltaPaths: closed });
    let current = before,
      sourceAccessCount = 0,
      sourceDisposed = false,
      postDisposeViolations = 0,
      supplierCalls = 0,
      disposalCalls = 0,
      sourceGateAwaits = 0;
    const disposed = new WeakSet<object>();
    const sourceFor = (operation: string) => {
      const source = {};
      Object.defineProperty(source, "snapshot", {
        enumerable: true,
        get: () => {
          sourceAccessCount += 1;
          if (disposed.has(source)) {
            postDisposeViolations += 1;
            throw new Error("source-disposed");
          }
          return operation;
        },
      });
      return Object.freeze(source);
    };
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [node!.id],
      phase: "l03",
      testExecutionSession: fixture.session,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        current = after;
        return { changedPaths: closed };
      },
      phaseSourceProvider: async ({ operation }: { operation: string }) => {
        supplierCalls += 1;
        return sourceFor(operation);
      },
      phaseChildStarter: ({
        operation,
        source,
      }: {
        operation: string;
        source: { snapshot: string };
      }) => {
        expect(source.snapshot).toBe(operation);
        return Object.freeze({});
      },
      phaseResourceDisposer: ({ source }: { source: object }) => {
        disposed.add(source);
        disposalCalls += 1;
        sourceDisposed = true;
      },
      gateRunner: async ({ gate }: { gate: { kind: string; requiresSource?: boolean } }) => {
        if (gate.requiresSource) {
          const expected = sourceGateAwaits + 1;
          expect(disposalCalls).toBe(expected);
          expect(sourceDisposed).toBe(true);
          await Promise.resolve();
          sourceGateAwaits = expected;
          expect(disposalCalls).toBe(expected);
        }
        return {
          exitCode: 0,
          signalCode: null,
          timedOut: false,
          overflowed: false,
          discoveredTestCount: gate.kind === "test" ? 1 : null,
        };
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
    expect({ sourceAccessCount, sourceDisposed, postDisposeViolations }).toEqual({
      sourceAccessCount: 2,
      sourceDisposed: true,
      postDisposeViolations: 0,
    });
    expect({ supplierCalls, disposalCalls, sourceGateAwaits }).toEqual({
      supplierCalls: 2,
      disposalCalls: 2,
      sourceGateAwaits: 2,
    });
  });

  test("preflights the generic fixer immediately before its injected invocation", async () => {
    const fixture = await executionFixture("TASK-551-01-L03:single"),
      closed = TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!;
    let current = worktree({ taskFileDigests: fixture.snapshot.taskFileDigests, absent: closed });
    let preflightCount = 0,
      preflightCountAtFix = 0;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l03",
      testExecutionSession: fixture.session,
      maxFixRounds: 1,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        current = worktree({
          taskFileDigests: fixture.snapshot.taskFileDigests,
          deltaPaths: closed,
        });
        return { changedPaths: closed };
      },
      phaseSourceProvider: async () => Object.freeze({}),
      phaseChildStarter: () => Object.freeze({}),
      phaseResourceDisposer: () => undefined,
      gateRunner: async ({ gate }: { gate: { kind: string } }) => ({
        exitCode: 1,
        signalCode: null,
        timedOut: false,
        overflowed: false,
        discoveredTestCount: gate.kind === "test" ? 1 : null,
      }),
      evidencePreflight: async () => {
        preflightCount += 1;
        return clearEvidencePreflight;
      },
      fixAgent: async () => {
        preflightCountAtFix = preflightCount;
        return { status: "error" };
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
          { manifestRow: TASK551_DURABLE_EVIDENCE_MANIFEST[1]!, value: l03CheckEvidence().value },
        ],
      },
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
    expect(result.pass).toBe(false);
    expect(preflightCountAtFix).toBe(3);
  });

  test("keeps the public executor closed to a test-only audit permit", async () => {
    const fixture = await l02ExecutionFixture();
    await expect(
      runTask551ImplementWorkflow({
        authorAuditDispatch: fixture.dispatch,
        scheduledOccurrenceIds: [fixture.node.id],
      })
    ).rejects.toThrow(/author_audit_dispatch_untrusted/);
  });

  test("rejects injected terminal evidence before the 05-L02 producer can write", async () => {
    const fixture = await readyTask489Fixture();
    let writes = 0;
    await expect(
      runTask551ImplementWorkflowForTests({
        authorAuditDispatch: fixture.dispatch,
        scheduledOccurrenceIds: [fixture.node.id],
        phase: "05-l02",
        testExecutionSession: fixture.session,
        currentWorktreeSnapshotProvider: async () =>
          worktree({
            taskFileDigests: fixture.snapshot.taskFileDigests,
            extra: task489DeferredFiles(),
          }),
        leafDispatcher: async () => ({ changedPaths: [task489Temporary] }),
        gateRunner: async () => ({
          exitCode: 0,
          signalCode: null,
          timedOut: false,
          overflowed: false,
          discoveredTestCount: 1,
        }),
        runtimeOutputObserver: async () => [task489Temporary],
        evidenceByPhase: { "05-l02": [] },
        evidenceWriter: async () => {
          writes += 1;
          return {} as never;
        },
        commitAObserver: async () => task489CommitA("c".repeat(40)),
        terminalFenceObserver: async () => ({}),
      })
    ).rejects.toThrow(/terminal_evidence_injected/);
    expect(writes).toBe(0);
  });

  test("runs the four 05-L02 outcomes, then parses once and writes row ten before row eleven", async () => {
    await withTask489Temporary(async (sourceBytes) => {
      const fixture = await readyTask489Fixture(),
        { before, after } = task489Worktrees(fixture, sourceBytes),
        writes: Array<{ path: string; bytes: Uint8Array }> = [],
        values: unknown[] = [],
        events: string[] = [];
      let current: Worktree = before,
        terminalCalls = 0;
      expect(() =>
        requireTask551L02CodeTestMaterializationClosureV1(
          requireTask551RecordedL02MaterializationForWorkflow(
            fixture.dispatch,
            fixture.snapshot.taskGraphDigest
          ),
          after
        )
      ).not.toThrow();
      const result = await runTask551ImplementWorkflowForTests({
        authorAuditDispatch: fixture.dispatch,
        scheduledOccurrenceIds: [fixture.node.id],
        phase: "05-l02",
        testExecutionSession: fixture.session,
        currentWorktreeSnapshotProvider: async () => current,
        leafDispatcher: async () => {
          events.push("leaf");
          current = after;
          return { changedPaths: [task489Temporary] };
        },
        gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) => {
          events.push(gate.operation);
          return task489TerminalOutcome(fixture.node.id, gate);
        },
        runtimeOutputObserver: async ({ operation }: { operation: string }) => {
          events.push(`runtime:${operation}`);
          return [task489Temporary];
        },
        evidenceWriter: async ({
          manifestRow,
          value,
        }: {
          manifestRow: { path: string; phase: string };
          value: unknown;
        }) => {
          const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
          writes.push({ path: manifestRow.path, bytes });
          values.push(value);
          events.push(`write:${manifestRow.phase}`);
          return freezeTestValue({
            path: manifestRow.path,
            phase: manifestRow.phase,
            digest: `sha256:${shaBytes(bytes)}`,
            bytes: bytes.byteLength,
            action: "committed_no_replace",
          });
        },
        commitAObserver: async () => {
          events.push("commit-a");
          return task489CommitA("c".repeat(40));
        },
        terminalFenceObserver: async (input: { sourceHead: string }) => {
          terminalCalls += 1;
          events.push("terminal");
          return task489Handoff(input.sourceHead, writes);
        },
      });
      expect(result.pass).toBe(true);
      expect(terminalCalls).toBe(1);
      expect(events.slice(0, 6)).toEqual([
        "commit-a",
        "leaf",
        "database-explain-plans-test",
        "task489-predecessor-plans-test",
        "explain-plan-small-check",
        "explain-plan-large-check",
      ]);
      expect(events.indexOf("write:task489-predecessor")).toBeLessThan(
        events.indexOf("write:task489-predecessor-promotion")
      );
      expect(events.at(-1)).toBe("terminal");
      expect(writes).toHaveLength(2);
      const promotion = JSON.parse(new TextDecoder().decode(writes[1]!.bytes));
      expect(promotion.sourceDigest).toBe(shaBytes(sourceBytes));
      expect(promotion.predecessor.digest).toBe(shaBytes(writes[0]!.bytes));
      const clone = freezeTestValue(JSON.parse(JSON.stringify(values[0])));
      const forged = freezeTestValue({
        predecessorValue: clone,
        digest: shaBytes(sourceBytes),
        token: Object.freeze({}),
      });
      expect(() =>
        buildTask55105L02PromotionAtNamedSeam(
          forged,
          task489CommitA("c".repeat(40)),
          freezeTestValue({
            path: writes[0]!.path,
            digest: `sha256:${shaBytes(writes[0]!.bytes)}`,
            action: "committed_no_replace",
          })
        )
      ).toThrow(/predecessor_seam_invalid/);
      await expect(writeTask551EvidenceFileIfAbsent("task489Predecessor", clone)).rejects.toThrow(
        /canonical_predecessor_value_invalid/
      );
    });
  });

  test("rejects missing, reordered, duplicate, and failed outcomes before parser or durable writes", async () => {
    await withTask489Temporary(async (sourceBytes) => {
      for (const mode of ["missing", "reordered", "duplicate", "failed"] as const) {
        const fixture = await readyTask489Fixture(),
          { before, after } = task489Worktrees(fixture, sourceBytes);
        let current: Worktree = before,
          writes = 0,
          terminals = 0;
        await expect(
          runTask551ImplementWorkflowForTests({
            authorAuditDispatch: fixture.dispatch,
            scheduledOccurrenceIds: [fixture.node.id],
            phase: "05-l02",
            testExecutionSession: fixture.session,
            currentWorktreeSnapshotProvider: async () => current,
            leafDispatcher: async () => {
              current = after;
              return { changedPaths: [task489Temporary] };
            },
            gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) => {
              if (mode === "missing" && gate.operation === "database-explain-plans-test")
                return freezeTestValue({
                  gateResult: {
                    exitCode: 0,
                    signalCode: null,
                    timedOut: false,
                    overflowed: false,
                    discoveredTestCount: 1,
                  },
                }) as never;
              if (mode === "reordered" && gate.operation === "database-explain-plans-test")
                return task489TerminalOutcome(
                  fixture.node.id,
                  gate,
                  "task489-predecessor-plans-test"
                );
              if (mode === "duplicate" && gate.operation === "task489-predecessor-plans-test")
                return task489TerminalOutcome(fixture.node.id, gate, "database-explain-plans-test");
              return task489TerminalOutcome(
                fixture.node.id,
                gate,
                gate.operation,
                mode === "failed"
              );
            },
            runtimeOutputObserver: async () => [task489Temporary],
            evidenceWriter: async () => {
              writes += 1;
              return {} as never;
            },
            commitAObserver: async () => task489CommitA("c".repeat(40)),
            terminalFenceObserver: async () => {
              terminals += 1;
              return {};
            },
          })
        ).rejects.toThrow(/05_l02_post_cleanup_target_proof_invalid/);
        expect({ writes, terminals }).toEqual({ writes: 0, terminals: 0 });
      }
    });
  });

  test("rejects a row-ten receipt digest before row eleven and a mismatched terminal handoff after both writes", async () => {
    await withTask489Temporary(async (sourceBytes) => {
      const fixture = await readyTask489Fixture(),
        states = task489Worktrees(fixture, sourceBytes);
      let current: Worktree = states.before,
        writes = 0,
        terminals = 0;
      await expect(
        runTask551ImplementWorkflowForTests({
          authorAuditDispatch: fixture.dispatch,
          scheduledOccurrenceIds: [fixture.node.id],
          phase: "05-l02",
          testExecutionSession: fixture.session,
          currentWorktreeSnapshotProvider: async () => current,
          leafDispatcher: async () => {
            current = states.after;
            return { changedPaths: [task489Temporary] };
          },
          gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) =>
            task489TerminalOutcome(fixture.node.id, gate),
          runtimeOutputObserver: async () => [task489Temporary],
          evidenceWriter: async ({
            manifestRow,
          }: {
            manifestRow: { path: string; phase: string };
          }) => {
            writes += 1;
            return freezeTestValue({
              path: manifestRow.path,
              phase: manifestRow.phase,
              digest: evidenceDigest("wrong-row-ten"),
              bytes: 1,
              action: "committed_no_replace",
            });
          },
          commitAObserver: async () => task489CommitA("c".repeat(40)),
          terminalFenceObserver: async () => {
            terminals += 1;
            return {};
          },
        })
      ).rejects.toThrow(/evidence_receipt_digest_mismatch/);
      expect({ writes, terminals }).toEqual({ writes: 1, terminals: 0 });

      const next = await readyTask489Fixture(),
        nextStates = task489Worktrees(next, sourceBytes),
        evidence: Array<{ path: string; bytes: Uint8Array }> = [];
      current = nextStates.before;
      await expect(
        runTask551ImplementWorkflowForTests({
          authorAuditDispatch: next.dispatch,
          scheduledOccurrenceIds: [next.node.id],
          phase: "05-l02",
          testExecutionSession: next.session,
          currentWorktreeSnapshotProvider: async () => current,
          leafDispatcher: async () => {
            current = nextStates.after;
            return { changedPaths: [task489Temporary] };
          },
          gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) =>
            task489TerminalOutcome(next.node.id, gate),
          runtimeOutputObserver: async () => [task489Temporary],
          evidenceWriter: async ({
            manifestRow,
            value,
          }: {
            manifestRow: { path: string; phase: string };
            value: unknown;
          }) => {
            const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
            evidence.push({ path: manifestRow.path, bytes });
            return freezeTestValue({
              path: manifestRow.path,
              phase: manifestRow.phase,
              digest: `sha256:${shaBytes(bytes)}`,
              bytes: bytes.byteLength,
              action: "committed_no_replace",
            });
          },
          commitAObserver: async () => task489CommitA("c".repeat(40)),
          terminalFenceObserver: async (input: { sourceHead: string }) => {
            const predecessor = JSON.parse(new TextDecoder().decode(evidence[0]!.bytes));
            predecessor.statementReceipts[0].profileResults[0].planDigest = sha(
              "different-terminal-predecessor"
            );
            const predecessorBytes = new TextEncoder().encode(`${JSON.stringify(predecessor)}\n`),
              promotion = JSON.parse(new TextDecoder().decode(evidence[1]!.bytes));
            promotion.predecessor.digest = shaBytes(predecessorBytes);
            return task489Handoff(input.sourceHead, [
              { path: evidence[0]!.path, bytes: predecessorBytes },
              {
                path: evidence[1]!.path,
                bytes: new TextEncoder().encode(`${JSON.stringify(promotion)}\n`),
              },
            ]);
          },
        })
      ).rejects.toThrow(/terminal_handoff_mismatch/);
      expect(evidence).toHaveLength(2);
    });
  });
});
