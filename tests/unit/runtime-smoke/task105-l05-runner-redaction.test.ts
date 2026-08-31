import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { renameSync } from "node:fs";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { SmokeError, serializePublicSmokeFailure } from "../../../scripts/runtime-smoke/contracts";
import {
  RuntimeLifecycle,
  type RuntimeSmokeContext,
} from "../../../scripts/runtime-smoke/lifecycle";
import { runRuntimeSmoke } from "../../../scripts/runtime-smoke";
import type { SmokeSuiteDescriptor } from "../../../scripts/runtime-smoke/registry";
import type {
  SmokeAdapter,
  SmokeAdapterResult,
} from "../../../scripts/runtime-smoke/adapters/types";

const SENTINEL = "TASK105_L05_SECRET_SENTINEL";

function privateFailure(): Error {
  const cause = new Error(`${SENTINEL}: cause`);
  cause.stack = `${SENTINEL}: cause stack`;
  const failure = new Error(`${SENTINEL}: message`, { cause });
  failure.stack = `${SENTINEL}: stack`;
  return failure;
}

function sessionId(): string {
  return `task105-redact-${randomUUID().replaceAll("-", "")}`;
}

function successfulAdapterResult(): SmokeAdapterResult {
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: Object.freeze([]),
    screenshots: Object.freeze([]),
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({}),
  });
}

function descriptorFor(adapter: SmokeAdapter): SmokeSuiteDescriptor {
  return Object.freeze({
    id: "task-105-l05",
    adapterPath: "test-only",
    async loadFixedAdapter(): Promise<SmokeAdapter> {
      return adapter;
    },
  });
}

interface RedactionCapture {
  readonly stdout: string;
  readonly stderr: string;
  readonly diagnostics: string;
  readonly report: unknown;
  readonly evidence: string;
}

async function runWithPrivateFailure(
  boundary: "runner" | "lifecycle" | "worker"
): Promise<RedactionCapture> {
  const root = process.cwd();
  const session = sessionId();
  const evidenceDirectory = join(root, "_docs/_workflows/_smoke/evidence/task-105", session);
  const stdout: string[] = [];
  const stderr: string[] = [];
  const diagnostics: string[] = [];
  const lifecycle = new RuntimeLifecycle();
  const adapter: SmokeAdapter = Object.freeze({
    suiteId: "task-105-l05",
    supportedProfiles: Object.freeze(["fast"] as const),
    evidenceSessionPolicy: "exclusive",
    async run(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
      context.lifecycle.register({
        name: `task105-redaction-${boundary}`,
        async close() {
          if (boundary === "lifecycle") throw privateFailure();
        },
        async proveAbsent() {
          if (boundary === "lifecycle") throw privateFailure();
          return true;
        },
      });
      if (boundary === "runner") throw privateFailure();
      if (boundary === "worker") {
        const failure = serializePublicSmokeFailure({
          boundary: "worker",
          phase: "settings_restore",
          stableCode: "worker_dispatch_failed",
        });
        throw new SmokeError(failure.code, failure.message);
      }
      return successfulAdapterResult();
    },
  });

  try {
    const report = await runRuntimeSmoke(
      ["run", "--suite", "task-105-l05", "--profile", "fast", "--session", session],
      {
        root,
        writeJson: (value) => stdout.push(value),
        writeMarkdown: (value) => stderr.push(value),
        task105L05RedactionSeams: {
          requireDescriptor: () => descriptorFor(adapter),
          createLifecycle: () => lifecycle,
          loadAdapter: async () => adapter,
          appendDiagnostics: (_root, _session, lines) => diagnostics.push(...lines),
        },
      }
    );
    return Object.freeze({
      stdout: stdout.join(""),
      stderr: stderr.join(""),
      diagnostics: diagnostics.join("\n"),
      report,
      evidence: await readFile(join(evidenceDirectory, "report.json"), "utf8"),
    });
  } finally {
    await rm(evidenceDirectory, { recursive: true, force: true });
  }
}

function expectNoSentinel(capture: RedactionCapture): void {
  for (const publicOutput of [
    capture.stdout,
    capture.stderr,
    capture.diagnostics,
    JSON.stringify(capture.report),
    capture.evidence,
  ]) {
    expect(publicOutput).not.toContain(SENTINEL);
  }
}

test("TASK-105 L05 serializes only the closed public failure vocabulary", () => {
  expect(
    serializePublicSmokeFailure({
      boundary: "worker",
      phase: "settings_restore",
      stableCode: "worker_dispatch_failed",
    })
  ).toEqual({
    code: "smoke_process_failed",
    message: "TASK-105 L05 worker settings_restore failed (worker_dispatch_failed)",
  });
  expect(() =>
    serializePublicSmokeFailure({
      boundary: "worker",
      phase: SENTINEL,
      stableCode: SENTINEL,
    } as never)
  ).toThrow(SmokeError);
});

test("TASK-105 L05 runner-primary redacts private message, cause, and stack", async () => {
  const capture = await runWithPrivateFailure("runner");

  expectNoSentinel(capture);
  expect(capture.stderr).toContain("TASK-105 L05 runner failed (runner_failed)");
  expect(capture.report).toMatchObject({
    pass: false,
    failures: [{ code: "smoke_process_failed" }],
  });
});

test("TASK-105 L05 lifecycle cleanup redacts private message, cause, and stack", async () => {
  const capture = await runWithPrivateFailure("lifecycle");

  expectNoSentinel(capture);
  expect(capture.stderr).toContain("TASK-105 L05 lifecycle failed (lifecycle_failed)");
  expect(capture.report).toMatchObject({
    pass: false,
    failures: [{ code: "smoke_process_failed" }],
    cleanup: {
      pass: false,
      failures: [
        { resource: "task105-redaction-lifecycle", phase: "close", code: "smoke_cleanup_failed" },
        { resource: "task105-redaction-lifecycle", phase: "absence", code: "smoke_cleanup_failed" },
      ],
    },
  });
});

test("TASK-105 L05 preserves a trusted worker projection over the runner fallback", async () => {
  const capture = await runWithPrivateFailure("worker");

  expect(capture.stderr).toContain(
    "TASK-105 L05 worker settings_restore failed (worker_dispatch_failed)"
  );
  expect(capture.stderr).not.toContain("TASK-105 L05 runner failed (runner_failed)");
  expect(capture.report).toMatchObject({
    pass: false,
    failures: [{ code: "smoke_process_failed" }],
  });
});

test("TASK-105 L05 cannot report a pass when a required lifecycle resource was never registered", async () => {
  const root = process.cwd();
  const session = sessionId();
  const sessionDirectory = join(root, "_docs/_workflows/_smoke/evidence/task-105", session);
  const adapter: SmokeAdapter = Object.freeze({
    suiteId: "task-105-l05",
    supportedProfiles: Object.freeze(["fast"] as const),
    evidenceSessionPolicy: "exclusive",
    async run(): Promise<SmokeAdapterResult> {
      return successfulAdapterResult();
    },
  });
  try {
    const report = await runRuntimeSmoke(
      ["run", "--suite", "task-105-l05", "--profile", "fast", "--session", session],
      {
        root,
        writeJson: () => undefined,
        writeMarkdown: () => undefined,
        task105L05RedactionSeams: {
          requireDescriptor: () => descriptorFor(adapter),
          loadAdapter: async () => adapter,
          appendDiagnostics: () => undefined,
        },
      }
    );
    expect(report.pass).toBe(false);
    expect(report.suiteCleanup).toMatchObject({
      contract: "task-105-l05-liveness-v1",
      processSupervisor: true,
      workerPool: false,
      devHost: false,
      browserDispatch: false,
      workspace: false,
      fixtureCleanup: false,
      cleanupPass: true,
      cleanupFailures: 0,
    });
  } finally {
    await rm(sessionDirectory, { recursive: true, force: true });
  }
});

test("TASK-105 L05 refuses a report identity swap before its final claimed write", async () => {
  const root = process.cwd();
  const session = sessionId();
  const sessionDirectory = join(root, "_docs/_workflows/_smoke/evidence/task-105", session);
  const replacement = join(root, `.task105-report-replacement-${session}.json`);
  const adapter: SmokeAdapter = Object.freeze({
    suiteId: "task-105-l05",
    supportedProfiles: Object.freeze(["fast"] as const),
    evidenceSessionPolicy: "exclusive",
    async run(): Promise<SmokeAdapterResult> {
      return successfulAdapterResult();
    },
  });
  try {
    const replacementBytes = "replacement-must-not-be-truncated\n";
    await writeFile(replacement, replacementBytes, { mode: 0o600 });
    await expect(
      runRuntimeSmoke(
        ["run", "--suite", "task-105-l05", "--profile", "fast", "--session", session],
        {
          root,
          writeJson: () => undefined,
          writeMarkdown: () => undefined,
          task105L05RedactionSeams: {
            requireDescriptor: () => descriptorFor(adapter),
            loadAdapter: async () => adapter,
            beforeEvidenceReportWrite(reportPath) {
              renameSync(replacement, reportPath);
            },
          },
        }
      )
    ).rejects.toThrow(SmokeError);
    await expect(readFile(join(sessionDirectory, "report.json"), "utf8")).resolves.toBe(
      replacementBytes
    );
  } finally {
    await rm(replacement, { force: true });
    await rm(sessionDirectory, { recursive: true, force: true });
  }
});

test("TASK-105 L05 direct-invocation catch emits only the closed runner projection", async () => {
  const nonRepository = await mkdtemp(join(tmpdir(), "task105-direct-redaction-"));
  try {
    const repo = process.cwd();
    const result = spawnSync(
      "node",
      [
        resolve(repo, "node_modules/tsx/dist/cli.mjs"),
        resolve(repo, "scripts/runtime-smoke.ts"),
        "run",
        "--suite",
        "task-105-l05",
        "--profile",
        "fast",
        "--session",
        "task105-direct-r1",
      ],
      { cwd: nonRepository, encoding: "utf8" }
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toBe(
      `${JSON.stringify({ code: "smoke_process_failed", message: "TASK-105 L05 runner failed (runner_failed)" })}\n`
    );
    expect(result.stderr).not.toContain("cause");
  } finally {
    await rm(nonRepository, { recursive: true, force: true });
  }
});
