import { createHash } from "node:crypto";

import {
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_EVIDENCE_ROW_IDS,
  TASK551_PLANNED_BUN_PATHS,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_DISCOVERY_ALLOWLIST,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS,
  captureTask551MaterializedWorktreeSnapshot,
  captureTask551PreSpawnWorktreeSnapshot,
  createTask551TaskGraphSnapshot,
  task551L11BarrierCurrentWorktreeDigest,
  task551L11BarrierSnapshotDigest,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";

export type Digest = Readonly<{ path: string; sha256: string }>;
type FileState = Digest & Readonly<{ kind: "regular" | "symlink" }>;

export type Worktree = Readonly<{
  taskGraphDigest: string;
  taskFileDigests: readonly Digest[];
  files: readonly FileState[];
  discoveredByPhase: Readonly<Record<string, readonly string[]>>;
  closedByPhase: Readonly<Record<string, readonly string[]>>;
  deltaPaths: readonly string[];
}>;

export const expectedL11SidecarPaths = [
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
export const expectedL11SidecarTests = [
  "tests/unit/workflows/task551AuthorAudit.test.ts",
  "tests/unit/workflows/authorAuditDriftRounds.test.ts",
  "tests/unit/workflows/authorAuditBoundedChild.test.ts",
  "tests/unit/workflows/task551AuthorAuditFixtures.ts",
  "tests/unit/workflows/task551WorkflowContracts.test.ts",
  "tests/unit/workflows/workflowContractsBootstrap.test.ts",
  "tests/unit/workflows/workflowContractsSubgates.test.ts",
  "tests/unit/workflows/workflowContractsImplementation.test.ts",
  "tests/unit/workflows/task551WorkflowContractsFixtures.ts",
  "tests/unit/workflows/task551WorkflowExecutionFixtures.ts",
  "tests/unit/workflows/task551EvidenceContract.test.ts",
  "tests/unit/workflows/dispatchContractCaps.test.ts",
] as const;

export const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
export const shaBytes = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
export const evidenceDigest = (value: string): `sha256:${string}` => `sha256:${sha(value)}`;
export const logicalArgvVectors = [
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
export const framedLogicalArgv = (fields: readonly string[]) => {
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
export const freezeTestValue = <T>(value: T): T => {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) freezeTestValue(child);
    Object.freeze(value);
  }
  return value;
};
export const clearEvidencePreflight = freezeTestValue({
  rows: TASK551_DURABLE_EVIDENCE_MANIFEST.map((_, index) => ({
    rowId: TASK551_EVIDENCE_ROW_IDS[index]!,
    terminalResult: "empty",
    telemetry: "recovery_empty",
  })),
  blockers: [],
  clear: true,
});
export const taskFiles = Object.freeze<Digest[]>([
  Object.freeze({
    path: "_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md",
    sha256: sha("graph"),
  }),
]);
export const auditSnapshot = createTask551TaskGraphSnapshot(taskFiles);
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

export function worktree(
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

export const classifierManifestPath = "tests/bun-lane-manifest.json";
export const exactManifestPaths = TASK551_PLANNED_BUN_PATHS;

export function digestFor(current: Worktree, path: string): Digest {
  const entry = current.files.find((file) => file.path === path);
  if (entry === undefined) throw new Error(`missing fixture path: ${path}`);
  return Object.freeze({ path, sha256: entry.sha256 });
}

export function receipt(
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

export function barrierFixtures(
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
