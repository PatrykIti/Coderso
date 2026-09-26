import { describe, expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  deriveTask551AuditScopes,
  requireTask551ProductionDispatchTaskSnapshot,
  requireTask551TestDispatchTaskSnapshotForTests,
  runTask551AuthorAuditWorkflow,
  runTask551AuthorAuditWorkflowForTests,
  runTask551DriftAuditRound,
} from "../../../_docs/_workflows/task-551-author-audit.mjs";
import { createTask551TaskGraphSnapshot } from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import {
  type Finding,
  completed,
  currentTask551DispatchSnapshot,
  fullDiscovery,
  highFinding,
  lowFinding,
  uniqueTempDir,
} from "./task551AuthorAuditFixtures.js";

async function runFixtureGit(repo: string, args: string[]) {
  await new Promise<void>((resolve, reject) =>
    execFile("git", args, { cwd: repo }, (error) => (error === null ? resolve() : reject(error)))
  );
}
type FixtureGitRuntime = {
  testRepoRoot: string;
  gitCommandTransport: ({
    argv,
    cwd,
  }: {
    argv: readonly string[];
    cwd: string;
  }) => Promise<{ exitCode: number; stdout: Uint8Array; stderr: Uint8Array }>;
};
async function withTask551GitRepo<T>(
  transform: (
    files: Awaited<ReturnType<typeof currentTask551DispatchSnapshot>>["taskFiles"]
  ) => Awaited<ReturnType<typeof currentTask551DispatchSnapshot>>["taskFiles"] = (files) => files,
  afterCommit: ((repo: string) => Promise<void>) | null = null,
  fixture: (runtime: FixtureGitRuntime) => Promise<T>
) {
  const repo = await uniqueTempDir("git");
  try {
    const files = transform((await currentTask551DispatchSnapshot()).taskFiles);
    for (const file of files) {
      const destination = path.join(repo, file.path);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.text);
    }
    // A single committed product path lets the test prove dirty source paths are
    // irrelevant here; every other future phase source deliberately stays absent.
    const productPath = path.join(repo, "scripts/task-551-fixture-target-bootstrap.ts");
    await mkdir(path.dirname(productPath), { recursive: true });
    await writeFile(productPath, "fixture\n");
    await runFixtureGit(repo, ["init", "--quiet"]);
    await runFixtureGit(repo, ["add", "--all"]);
    await runFixtureGit(repo, [
      "-c",
      "user.email=task551@example.invalid",
      "-c",
      "user.name=Task 551",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    ]);
    if (afterCommit !== null) await afterCommit(repo);
    return await fixture({
      testRepoRoot: repo,
      gitCommandTransport: ({ argv, cwd }) =>
        new Promise((resolve) =>
          execFile(argv[0]!, argv.slice(1), { cwd, encoding: "buffer" }, (error, stdout, stderr) =>
            resolve({
              exitCode: error === null ? 0 : typeof error?.code === "number" ? error.code : 1,
              stdout: Buffer.from(stdout ?? []),
              stderr: Buffer.from(stderr ?? []),
            })
          )
        ),
    });
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Orchestrated drift rounds over injected agents
// ---------------------------------------------------------------------------
describe("drift-round orchestration", () => {
  const SCOPES = deriveTask551AuditScopes();
  test("one complete clean round passes with a reconcile result", async () => {
    const auditAgent = (_scope: string) => ({
      status: "completed" as const,
      findings: [] as const,
    });
    const reconcileAgent = (_results: readonly unknown[]) => ({
      status: "completed" as const,
      findings: [] as const,
    });
    const evaluation = await runTask551DriftAuditRound({
      scopes: SCOPES.slice(0, 5),
      auditAgent,
      reconcileAgent,
      timeoutMs: 1_000,
    });
    expect(evaluation.valid).toBe(true);
    expect(evaluation.pass).toBe(true);
    expect(evaluation.missingScopes).toEqual([]);
  });
  test("a throwing audit agent becomes a captured error result, round invalid", async () => {
    const auditAgent = (scope: string) => {
      if (scope === SCOPES[0]) throw new Error("agent crashed");
      return { status: "completed" as const, findings: [] as const };
    };
    const evaluation = await runTask551DriftAuditRound({
      scopes: SCOPES.slice(0, 3),
      auditAgent,
      reconcileAgent: () => ({ status: "completed" as const, findings: [] as const }),
      timeoutMs: 1_000,
    });
    expect(evaluation.valid).toBe(false);
    expect(evaluation.pass).toBe(false);
    expect(evaluation.invalidScopes).toContain(`${SCOPES[0]}:error`);
  });
  test("reconcile receives an immutable snapshot, not mutable agent result objects", async () => {
    let snapshot: unknown;
    const evaluation = await runTask551DriftAuditRound({
      scopes: SCOPES.slice(0, 2),
      auditAgent: (scope) => ({
        status: "completed" as const,
        findings: scope === SCOPES[0] ? [lowFinding] : [],
      }),
      reconcileAgent: (results) => {
        snapshot = results;
        expect(Object.isFrozen(results)).toBe(true);
        expect(Object.isFrozen(results[0])).toBe(true);
        expect(Object.isFrozen(results[0]!.findings)).toBe(true);
        expect(() => Array.prototype.push.call(results, {})).toThrow();
        expect(() => Array.prototype.push.call(results[0]!.findings, {})).toThrow();
        return { status: "completed" as const, findings: [] as const };
      },
      timeoutMs: 1_000,
    });
    expect(evaluation.pass).toBe(true);
    expect(snapshot).toBeDefined();
  });
  test("an agent exceeding the bounded timeout is captured as timeout, not a pass", async () => {
    const slowAgent = (): Promise<{ status: "completed"; findings: readonly Finding[] }> =>
      new Promise(() => setTimeout(() => undefined, 250));
    const evaluation = await runTask551DriftAuditRound({
      scopes: [SCOPES[0]],
      auditAgent: slowAgent,
      reconcileAgent: () => ({ status: "completed" as const, findings: [] as const }),
      timeoutMs: 20,
    });
    expect(evaluation.valid).toBe(false);
    expect(evaluation.invalidScopes).toEqual([`${SCOPES[0]}:timeout`]);
  });
  test("workflow rejects caller-supplied authority and returns no task source", async () => {
    let calls = 0;
    const agents = {
      discoveredByPhase: fullDiscovery(),
      auditAgent: () => {
        calls += 1;
        return completed();
      },
      reconcileAgent: () => {
        calls += 1;
        return completed();
      },
    };
    await expect(runTask551AuthorAuditWorkflow({ ...agents, head: {} })).rejects.toThrow(
      /snapshot_authority_forbidden/
    );
    await expect(
      runTask551AuthorAuditWorkflow({
        ...agents,
        taskSnapshot: await currentTask551DispatchSnapshot(),
      })
    ).rejects.toThrow(/snapshot_authority_forbidden/);
    await expect(
      runTask551AuthorAuditWorkflow({ ...agents, gitCommandTransport: async () => ({}) })
    ).rejects.toThrow(/input_unknown_key/);
    expect(calls).toBe(0);
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const outcome = await runTask551AuthorAuditWorkflowForTests({ ...agents, ...fixture });
      expect(outcome.pass).toBe(true);
      expect(outcome.dispatch.inventory.occurrenceCount).toBe(33);
      expect(JSON.stringify(outcome.dispatch)).not.toContain("Workflow Dispatch Envelope");
    });
  });
  test("permit-bound task snapshots are copied, realm-bound, source-free, and stale-safe", async () => {
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const agents = {
        discoveredByPhase: fullDiscovery(),
        auditAgent: () => completed(),
        reconcileAgent: () => completed(),
        ...fixture,
      };
      const first = await runTask551AuthorAuditWorkflowForTests(agents);
      expect(first.pass).toBe(true);

      const snapshot = requireTask551TestDispatchTaskSnapshotForTests(first.dispatch);
      const expected = {
        taskGraphDigest: snapshot.taskGraphDigest,
        taskFileDigests: snapshot.taskFileDigests.map(({ path: taskPath, sha256 }) => ({
          path: taskPath,
          sha256,
        })),
      };
      expect(createTask551TaskGraphSnapshot(snapshot.taskFileDigests).taskGraphDigest).toBe(
        snapshot.taskGraphDigest
      );
      expect(snapshot.taskFileDigests.map(({ path: taskPath }) => taskPath)).toEqual(
        first.dispatch.taskFiles.map(({ path: taskPath }) => taskPath).sort()
      );
      expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
      expect(Object.keys(snapshot).sort()).toEqual(["taskFileDigests", "taskGraphDigest"]);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.taskFileDigests)).toBe(true);
      expect(Object.isFrozen(snapshot.taskFileDigests[0]!)).toBe(true);
      expect(JSON.stringify(snapshot)).not.toContain("Workflow Dispatch Envelope");
      expect(JSON.stringify(snapshot)).not.toContain("coderso.task551.workflow-dispatch");
      expect(() =>
        Object.defineProperty(snapshot, "taskGraphDigest", { value: "0".repeat(64) })
      ).toThrow();
      expect(() =>
        Object.defineProperty(snapshot.taskFileDigests[0]!, "sha256", { value: "0".repeat(64) })
      ).toThrow();
      expect(requireTask551TestDispatchTaskSnapshotForTests(first.dispatch)).toEqual(expected);

      expect(() => requireTask551TestDispatchTaskSnapshotForTests(Object.freeze({}))).toThrow(
        /test_author_audit_task_snapshot_untrusted/
      );
      expect(() => requireTask551ProductionDispatchTaskSnapshot(first.dispatch)).toThrow(
        /author_audit_task_snapshot_untrusted/
      );

      const second = await runTask551AuthorAuditWorkflowForTests(agents);
      expect(second.pass).toBe(true);
      expect(() => requireTask551TestDispatchTaskSnapshotForTests(first.dispatch)).toThrow(
        /test_author_audit_task_snapshot_untrusted_stale/
      );
      expect(requireTask551TestDispatchTaskSnapshotForTests(second.dispatch)).toEqual(expected);
    });
  });
  test("test runtime uses its fixture root; sourceHead is parser compatibility only", async () => {
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const calls: Array<{ argv: readonly string[]; env: Record<string, string>; shell: boolean }> =
        [];
      const compatibleHead = "a".repeat(40);
      const outcome = await runTask551AuthorAuditWorkflowForTests({
        discoveredByPhase: fullDiscovery(),
        auditAgent: () => completed(),
        reconcileAgent: () => completed(),
        gitCommandTransport: async (request) => {
          calls.push(request);
          if (request.argv.includes("HEAD^{commit}")) {
            return {
              exitCode: 0,
              stdout: Buffer.from(`${compatibleHead}\n`),
              stderr: Buffer.alloc(0),
            };
          }
          return fixture.gitCommandTransport(request);
        },
        testRepoRoot: fixture.testRepoRoot,
      });
      expect(outcome.pass).toBe(true);
      expect(outcome.dispatch.sourceHead).toBe(compatibleHead);
      expect(calls.length).toBe(2);
      for (const call of calls) {
        expect(path.isAbsolute(call.argv[0]!)).toBe(true);
        expect(call.argv.slice(1, 8)).toEqual([
          "--no-pager",
          "-c",
          "core.pager=cat",
          "-c",
          "credential.helper=",
          "-c",
          "core.askPass=",
        ]);
        expect(call.shell).toBe(false);
        expect(Object.getPrototypeOf(call.env)).toBe(null);
        expect(Object.keys(call.env).sort()).toEqual(
          [
            "GIT_ASKPASS",
            "GIT_CONFIG_COUNT",
            "GIT_CONFIG_GLOBAL",
            "GIT_CONFIG_NOSYSTEM",
            "GIT_CONFIG_SYSTEM",
            "GIT_PAGER",
            "GIT_TERMINAL_PROMPT",
            "HOME",
            "LANG",
            "LC_ALL",
            "PAGER",
          ].sort()
        );
        expect(Object.hasOwn(call.env, "PATH")).toBe(false);
        expect(Object.hasOwn(call.env, "GIT_DIR")).toBe(false);
      }
      expect(
        calls.some((call) => call.argv.includes("cat-file") || call.argv.includes("status"))
      ).toBe(false);
    });
  });
  test("capture rejects a changed reported fixture root before agents", async () => {
    const agents = () => {
      throw new Error("agent must not run");
    };
    await withTask551GitRepo(undefined, null, async (fixture) => {
      await expect(
        runTask551AuthorAuditWorkflowForTests({
          discoveredByPhase: fullDiscovery(),
          auditAgent: agents,
          reconcileAgent: agents,
          gitCommandTransport: async (request) => {
            if (request.argv.includes("--show-toplevel")) {
              return {
                exitCode: 0,
                stdout: Buffer.from("/unexpected-root\n"),
                stderr: Buffer.alloc(0),
              };
            }
            return fixture.gitCommandTransport(request);
          },
          testRepoRoot: fixture.testRepoRoot,
        })
      ).rejects.toThrow(/capture_root_mismatch/);
    });
  });
  test("capture accepts current task bytes while product paths may be dirty or untracked", async () => {
    await withTask551GitRepo(
      undefined,
      async (repo) => {
        const parentPath = path.join(
          repo,
          "_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md"
        );
        const parent = await readFile(parentPath, "utf8");
        await writeFile(
          parentPath,
          parent.replace("**Status:** ⏳ To Do", "**Status:** 🚧 In Progress")
        );
        await writeFile(
          path.join(repo, "scripts/task-551-fixture-target-bootstrap.ts"),
          "dirty fixture\n"
        );
        await writeFile(
          path.join(repo, "scripts/untracked-product-source.ts"),
          "untracked fixture\n"
        );
      },
      async (fixture) => {
        const outcome = await runTask551AuthorAuditWorkflowForTests({
          discoveredByPhase: fullDiscovery(),
          auditAgent: () => completed(),
          reconcileAgent: () => completed(),
          ...fixture,
        });
        expect(outcome.pass).toBe(true);
        expect(outcome.dispatch.taskFiles.find((file) => file.taskId === "TASK-551")?.status).toBe(
          "🚧 In Progress"
        );
      }
    );
  });
  test("capture fails closed on a missing, symlinked, or post-capture-drifted task file", async () => {
    const missingPath = "_docs/_TASKS/TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md";
    const taskFile = (repo: string) => path.join(repo, missingPath);
    const input = (
      fixture: FixtureGitRuntime,
      auditAgent: (
        scope: string
      ) => ReturnType<typeof completed> | Promise<ReturnType<typeof completed>> = () => completed()
    ) =>
      runTask551AuthorAuditWorkflowForTests({
        discoveredByPhase: fullDiscovery(),
        auditAgent,
        reconcileAgent: () => completed(),
        ...fixture,
      });
    await withTask551GitRepo(
      undefined,
      async (repo) => rm(taskFile(repo)),
      async (fixture) => {
        await expect(input(fixture)).rejects.toThrow(/graph_envelope_task_set/);
      }
    );
    await withTask551GitRepo(
      undefined,
      async (repo) => {
        await rm(taskFile(repo));
        await symlink("TASK-551_Scalable_Database_Query_And_Cache_Optimization.md", taskFile(repo));
      },
      async (fixture) => {
        await expect(input(fixture)).rejects.toThrow(/capture_task_file_not_regular/);
      }
    );
    let mutated = false;
    await withTask551GitRepo(undefined, null, async (fixture) => {
      await expect(
        input(fixture, async () => {
          if (!mutated) {
            mutated = true;
            const file = taskFile(fixture.testRepoRoot);
            await writeFile(file, `${await readFile(file, "utf8")}\n`);
          }
          return completed();
        })
      ).rejects.toThrow(/task551_task_graph_byte_drift/);
    });
    expect(mutated).toBe(true);
  });
  test("workflow loop: HIGH in round one, targeted re-audit passes in round two", async () => {
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const failingScope = SCOPES[3];
      const seenScopes = new Map<string, number>();
      const outcome = await runTask551AuthorAuditWorkflowForTests({
        discoveredByPhase: fullDiscovery(),
        ...fixture,
        auditAgent: (scope) => ({
          status: "completed",
          findings:
            scope === failingScope &&
            (seenScopes.set(scope, (seenScopes.get(scope) ?? 0) + 1), seenScopes.get(scope) === 1)
              ? [highFinding]
              : [],
        }),
        reconcileAgent: () => completed(),
        timeoutMs: 1_000,
        maxRounds: 3,
      });
      expect(outcome.rounds).toBe(2);
      expect(outcome.pass).toBe(true);
      expect(outcome.dispatch.inventory.occurrenceCount).toBe(33);
      expect(Object.isFrozen(outcome.dispatch)).toBe(true);
    });
  });
  test("workflow fails closed when a blocking finding persists to maxRounds", async () => {
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const outcome = await runTask551AuthorAuditWorkflowForTests({
        discoveredByPhase: fullDiscovery(),
        ...fixture,
        auditAgent: () => completed([highFinding]),
        reconcileAgent: () => completed(),
        timeoutMs: 1_000,
        maxRounds: 2,
      });
      expect(outcome.pass).toBe(false);
      expect(outcome.evaluation?.blockingFindings.length).toBeGreaterThan(0);
    });
  });
});
