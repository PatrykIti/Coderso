import { readFile } from "node:fs/promises";

import { describe, expect, test } from "bun:test";

import {
  TASK551_DEFERRED_LITERAL_TARGET_PATHS,
  TASK551_PHASE_PROVENANCE,
  adaptTask551L02ClosureV2,
  adaptTask551L03ClosureV2,
  adaptTask551L04ClosureV2,
  readTask55105L02PredecessorAtNamedSeam,
  captureTask551L01MaterializationBarrier,
  captureTask551L01PreClassifierBarrier,
  createTask551L02CodeTestMaterializationClosureV1,
  createTask551NamedPhaseClosureV2,
  admitTask551WorkflowCompatibilityAuthorAuditV2,
  admitTask551WorkflowCompatibilityGraphV2,
  admitTask551WorkflowCompatibilityL02V2,
  requireTask551L01MaterializationBarrierBeforeL02,
  task551CurrentWorktreeDigest,
  task551WorktreeSnapshotDigest,
  runTask551WorkflowCompatibilityBootstrapV2,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import {
  requireTask551CommandReceiptV1,
  requireTask551LogicalArgvPreimageV1,
  runTask551BoundedChild,
} from "../../../_docs/_workflows/task-551-fix.mjs";
import {
  auditSnapshot,
  barrierFixtures,
  classifierManifestPath,
  exactManifestPaths,
  expectedL11SidecarPaths,
  expectedL11SidecarTests,
  framedLogicalArgv,
  freezeTestValue,
  logicalArgvVectors,
  sha,
  shaBytes,
  taskFiles,
  worktree,
} from "./task551WorkflowContractsFixtures.js";
import {
  task489Temporary,
  withTask489Temporary,
  workflowGit,
  workflowRepoRoot,
} from "./task551WorkflowExecutionFixtures.js";

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
    ]).toEqual([31, 19]);
    expect(
      TASK551_PHASE_PROVENANCE.reduce(
        (count, phase) => count + phase.ownedFiles.length + phase.ownedTests.length,
        0
      )
    ).toBe(93);
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
