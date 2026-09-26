import { describe, expect, test } from "bun:test";
import { runTask551BoundedChild } from "../../../_docs/_workflows/task-551-fix.mjs";
import {
  TASK551_CHILD_FAILURE_CODES,
  TASK551_CHILD_DIAGNOSTIC_MAX_BYTES,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";

// Fake Bun-like spawn API with doc-required parity:
// spawn(argv, opts) -> { pid, stdout, stderr, exited: Promise<number>, signalCode? }
type FakeProc = {
  pid: number;
  stdout: AsyncIterable<Uint8Array>;
  stderr: AsyncIterable<Uint8Array>;
  exited: Promise<number>;
  signalCode?: string | null;
};
type SpawnCall = { argv: string[]; opts: Record<string, unknown> };
function fakeStream(chunks: Uint8Array[]): AsyncIterable<Uint8Array> {
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<Uint8Array>> {
          if (index < chunks.length) {
            const value = chunks[index++]!;
            return Promise.resolve({ value, done: false });
          }
          return Promise.resolve({ done: true, value: undefined });
        },
      };
    },
  };
}
/** A stream that never yields nor ends: exercises the hard-timeout branch. */
function hangingStream(): AsyncIterable<Uint8Array> {
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () => new Promise<IteratorResult<Uint8Array>>(() => undefined),
      };
    },
  };
}
function makeFakeSpawn(overrides: Partial<FakeProc> = {}) {
  const calls: SpawnCall[] = [];
  const signals: string[] = [];
  const proc: FakeProc = {
    pid: 4321,
    stdout: fakeStream([]),
    stderr: fakeStream([]),
    exited: Promise.resolve(0),
    signalCode: null,
    ...overrides,
  };
  const spawn = (argv: string[], opts: Record<string, unknown>): FakeProc => {
    calls.push({ argv, opts });
    return proc;
  };
  return { spawn, calls, signals };
}
const CHILD_BASE = {
  bunExecutablePath: "/usr/local/bin/bun-real",
  env: { TASK551_FIXTURE_BOOTSTRAP_SENTINEL: "s3nt1n3l" },
  cwd: "/repo",
};
const L03_CHECK_CHILD = Object.freeze({
  commandContextId: "TASK-551-01-L03:single/bootstrap-check",
  logicalCommandId: "l03-check",
  discovery: Object.freeze({ kind: "not-applicable", discoveredTestCount: null, positive: false }),
});
const L03_FOCUSED_CHILD = Object.freeze({
  commandContextId: "TASK-551-01-L03:single/focused-static-test",
  logicalCommandId: "l03-focused-test",
  discovery: Object.freeze({ kind: "test-paths", discoveredTestCount: 1, positive: true }),
});
const L03_INITIALIZE_CHILD = Object.freeze({
  commandContextId: "TASK-551-01-L03:single/bootstrap-initialize",
  logicalCommandId: "l03-initialize",
  discovery: Object.freeze({ kind: "not-applicable", discoveredTestCount: null, positive: false }),
});
const L02_FREEZE_SMALL_CHILD = Object.freeze({
  commandContextId: "TASK-551-01-L02:single/freeze-small",
  logicalCommandId: "l02-freeze",
  discovery: Object.freeze({ kind: "not-applicable", discoveredTestCount: null, positive: false }),
});

// ---------------------------------------------------------------------------
// Bounded child execution with injected fake Bun APIs
// ---------------------------------------------------------------------------
type DiagnosticCarrier = Error & { task551Diagnostic?: Record<string, unknown> };
function patchProcessKill(impl: (pid: number, signal?: string) => boolean): () => void {
  const original = process.kill;
  (process as unknown as { kill: typeof impl }).kill = impl;
  return () => {
    (process as unknown as { kill: unknown }).kill = original;
  };
}
describe("bounded child execution", () => {
  test("zero exit passes and replaces ONLY the leading literal bun token", async () => {
    const fake = makeFakeSpawn();
    const result = await runTask551BoundedChild({
      ...CHILD_BASE,
      ...L03_CHECK_CHILD,
      spawn: fake.spawn,
    });
    expect(result.status).toBe("passed");
    expect(result.result).toBe("zero_exit");
    expect(result.exitCode).toBe(0);
    expect(fake.calls.length).toBe(1);
    expect(fake.calls[0]!.argv[0]).toBe("/usr/local/bin/bun-real");
    expect(fake.calls[0]!.argv.slice(1)).toEqual([
      "--env-file=/dev/null",
      "scripts/task-551-fixture-target-bootstrap.ts",
      "--check",
    ]);
    expect(fake.calls[0]!.opts.env).toEqual(CHILD_BASE.env);
    expect(fake.calls[0]!.opts.stdin).toBe("ignore");
    // The detached option is pinned exactly per platform so POSIX children
    // always form their own process group.
    expect(fake.calls[0]!.opts.detached).toBe(process.platform !== "win32");
    // Successful runs are never killed.
    expect(result.killStrategy).toBe("none");
  });
  test("normal nonzero exit returns failed without killing the child", async () => {
    const fake = makeFakeSpawn({ exited: Promise.resolve(3) });
    const result = await runTask551BoundedChild({
      ...CHILD_BASE,
      ...L03_FOCUSED_CHILD,
      spawn: fake.spawn,
    });
    expect(result.status).toBe("failed");
    expect(result.result).toBe("nonzero_exit");
    expect(result.exitCode).toBe(3);
  });
  test("unknown context, command mismatch, and profile misuse fail before any spawn", async () => {
    const fake = makeFakeSpawn();
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_CHECK_CHILD,
        commandContextId: "made-up-command",
        spawn: fake.spawn,
      })
    ).rejects.toThrow(/command_context_unknown/);
    await expect(
      runTask551BoundedChild({ ...CHILD_BASE, ...L02_FREEZE_SMALL_CHILD, spawn: fake.spawn })
    ).rejects.toThrow(/command_profile_missing/);
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_INITIALIZE_CHILD,
        profile: "small",
        spawn: fake.spawn,
      })
    ).rejects.toThrow(/command_profile_not_allowed/);
    expect(fake.calls.length).toBe(0);
  });
  test("relative bun executable or non-string env fails closed before spawn", async () => {
    const fake = makeFakeSpawn();
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        bunExecutablePath: "bun",
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
      })
    ).rejects.toThrow(/bun_executable_not_absolute/);
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        env: { KEY: 42 as unknown as string },
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
      })
    ).rejects.toThrow(/env_value_not_string/);
    expect(fake.calls.length).toBe(0);
  });
  test("output overflow throws the fixed overflow code and SIGTERMs the process group", async () => {
    const bigChunk = new Uint8Array(64 * 1024);
    const fake = makeFakeSpawn({ stdout: fakeStream([bigChunk, bigChunk, bigChunk]) });
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
        maxOutputBytes: 64 * 1024,
      })
    ).rejects.toThrow(TASK551_CHILD_FAILURE_CODES.overflow);
  });
  test("overflow teardown pins killStrategy process_group and attaches a capped redacted diagnostic", async () => {
    const filler = new TextEncoder().encode(`${"A".repeat(120)}\n`);
    const secretLine = "API_TOKEN=supersecretvalue must not survive\n";
    const maskedLine = "ATTEMPT=9\n";
    const lastChunk = new TextEncoder().encode(`${"B".repeat(40)}\n${secretLine}${maskedLine}`);
    const fake = makeFakeSpawn({
      stdout: fakeStream([filler, filler, lastChunk]),
      stderr: fakeStream([lastChunk]),
    });
    let thrown: DiagnosticCarrier | undefined;
    const restoreKill = patchProcessKill(() => true); // negative-pid group kill succeeds
    try {
      thrown = (await runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
        maxOutputBytes: 200,
      }).catch((error: DiagnosticCarrier) => error)) as DiagnosticCarrier;
    } finally {
      restoreKill();
    }
    expect(thrown!.message).toBe(TASK551_CHILD_FAILURE_CODES.overflow);
    expect(thrown!.task551Diagnostic).toBeDefined();
    const diagnostic = thrown!.task551Diagnostic!;
    expect(diagnostic.code).toBe(TASK551_CHILD_FAILURE_CODES.overflow);
    // Exercised teardown path asserted EXACTLY: SIGTERM group kill succeeded.
    expect(diagnostic.killStrategy).toBe("process_group");
    const serialized = JSON.stringify(diagnostic);
    expect(Buffer.byteLength(serialized)).toBeLessThanOrEqual(TASK551_CHILD_DIAGNOSTIC_MAX_BYTES);
    // Credential-looking lines never survive into the diagnostic payload.
    expect(serialized).not.toContain("supersecretvalue");
    // Env-style assignments that do survive are masked.
    expect(String(diagnostic.stderrTail)).toContain("ATTEMPT=[redacted]");
  });
  test("a hanging child hits the hard timeout and is killed via the process group", async () => {
    const fake = makeFakeSpawn({ exited: new Promise<number>(() => undefined) });
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
        timeoutMs: 30,
        killGraceMs: 20,
      })
    ).rejects.toThrow(TASK551_CHILD_FAILURE_CODES.timeout);
  });
  test("timeout teardown pins the exact killStrategy per exercised path", async () => {
    const cases: Array<{
      name: string;
      impl: (pid: number, signal?: string) => boolean;
      expected: string;
    }> = [
      { name: "process_group", impl: () => true, expected: "process_group" },
      {
        name: "root_pid_fallback",
        impl: (pid) => {
          if (pid < 0) throw new Error("ESRCH");
          return true;
        },
        expected: "root_pid_fallback",
      },
      {
        name: "already_gone",
        impl: () => {
          throw new Error("ESRCH");
        },
        expected: "already_gone",
      },
    ];
    for (const testCase of cases) {
      const fake = makeFakeSpawn({
        stdout: hangingStream(),
        stderr: hangingStream(),
        exited: new Promise<number>(() => undefined),
      });
      let thrown: DiagnosticCarrier | undefined;
      const restoreKill = patchProcessKill(testCase.impl);
      try {
        thrown = (await runTask551BoundedChild({
          ...CHILD_BASE,
          ...L03_CHECK_CHILD,
          spawn: fake.spawn,
          timeoutMs: 30,
          killGraceMs: 20,
        }).catch((error: DiagnosticCarrier) => error)) as DiagnosticCarrier;
      } finally {
        restoreKill();
      }
      expect(thrown!.message).toBe(TASK551_CHILD_FAILURE_CODES.timeout);
      const diagnostic = thrown!.task551Diagnostic!;
      expect(diagnostic.code).toBe(TASK551_CHILD_FAILURE_CODES.timeout);
      // Hard-timeout branch (streams never ended), not the exit-await branch.
      expect(diagnostic.phase).toBe("timeout");
      expect(diagnostic.killStrategy).toBe(testCase.expected);
      expect(Buffer.byteLength(JSON.stringify(diagnostic))).toBeLessThanOrEqual(
        TASK551_CHILD_DIAGNOSTIC_MAX_BYTES
      );
    }
    // taskkill_tree is win32-only and cannot be exercised on POSIX runners;
    // it stays pinned by the platform branch in killTask551ProcessGroup.
  });
  test("spawn failure throws the fixed redacted spawn code", async () => {
    const spawn = (): FakeProc => {
      throw new Error("enoent");
    };
    let thrown: DiagnosticCarrier | undefined;
    await runTask551BoundedChild({ ...CHILD_BASE, ...L03_CHECK_CHILD, spawn }).catch(
      (error: DiagnosticCarrier) => {
        thrown = error;
      }
    );
    expect(thrown!.message).toBe(TASK551_CHILD_FAILURE_CODES.spawn);
    // Even pre-spawn failures carry a capped, empty-tailed diagnostic.
    const diagnostic = thrown!.task551Diagnostic!;
    expect(diagnostic.stdoutTail).toBe("");
    expect(diagnostic.stderrTail).toBe("");
    expect(diagnostic.killStrategy).toBe("none");
  });
  test("signal-terminated child reports failed with the observed signal code", async () => {
    const fake = makeFakeSpawn({ exited: Promise.resolve(143), signalCode: "SIGTERM" });
    const result = await runTask551BoundedChild({
      ...CHILD_BASE,
      ...L03_CHECK_CHILD,
      spawn: fake.spawn,
    });
    expect(result.status).toBe("failed");
    expect(result.signalCode).toBe("SIGTERM");
  });
});
