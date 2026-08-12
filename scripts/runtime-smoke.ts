import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { closeSync, constants, fchmodSync, fstatSync, lstatSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseRuntimeSmokeArgs } from "./runtime-smoke/cli";
import { appendDiagnostics } from "./runtime-smoke/diagnostics";
import { mapSmokeError, type SmokeError } from "./runtime-smoke/contracts";
import { installLifecycleSignals, RuntimeLifecycle } from "./runtime-smoke/lifecycle";
import { ProcessSupervisor, resolveExecutableOnPath } from "./runtime-smoke/process-supervisor";
import { staticSmokeRegistry } from "./runtime-smoke/registry";
import { RepositoryGuard, resolveCanonicalRepositoryRoot } from "./runtime-smoke/repository-guard";
import {
  createRuntimeSmokeReport,
  encodeReportJson,
  encodeReportMarkdown,
  type RuntimeSmokeReport,
} from "./runtime-smoke/report";
import { TimingRecorder } from "./runtime-smoke/timing";
import type { SmokeAdapterResult } from "./runtime-smoke/adapters/types";

export interface RuntimeSmokeDependencies {
  readonly root?: string;
  readonly writeJson?: (value: string) => void;
  readonly writeMarkdown?: (value: string) => void;
}

function stableEvidenceNode(stats: ReturnType<typeof fstatSync>): string {
  return `${stats.dev}:${stats.ino}:${stats.mode & 0o7777}:${stats.nlink}`;
}

function precreateEvidenceReport(evidenceDirectory: string): string {
  mkdirSync(evidenceDirectory, { recursive: true, mode: 0o700 });
  const reportPath = resolve(evidenceDirectory, "report.json");
  let descriptor: number | undefined;
  try {
    try {
      descriptor = openSync(reportPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | null)?.code;
      if (code === "EEXIST") {
        const existing = lstatSync(reportPath);
        if (!existing.isFile() || existing.isSymbolicLink() || existing.nlink !== 1 || (existing.mode & 0o777) !== 0o600) {
          throw new SmokeError("smoke_output_invalid", "evidence report already exists with invalid ownership");
        }
        return reportPath;
      }
      throw error;
    }
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.nlink !== 1 || (before.mode & 0o777) !== 0o600) {
      throw new SmokeError("smoke_output_invalid", "evidence report ownership is invalid");
    }
    return reportPath;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function writeEvidenceReport(reportPath: string, json: string): void {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(reportPath, constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW);
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.nlink !== 1 || (before.mode & 0o777) !== 0o600) {
      throw new SmokeError("smoke_output_invalid", "evidence report ownership is invalid");
    }
    writeFileSync(descriptor, json, "utf8");
    fchmodSync(descriptor, 0o600);
    const after = fstatSync(descriptor);
    const final = lstatSync(reportPath);
    if (stableEvidenceNode(before) !== stableEvidenceNode(after) || stableEvidenceNode(after) !== stableEvidenceNode(final)) {
      throw new SmokeError("smoke_output_invalid", "evidence report identity changed while writing");
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export async function runRuntimeSmoke(
  argv: readonly string[],
  dependencies: RuntimeSmokeDependencies = {}
): Promise<RuntimeSmokeReport> {
  const input = parseRuntimeSmokeArgs(argv);
  const descriptor = staticSmokeRegistry.require(input);
  const root = await resolveCanonicalRepositoryRoot(dependencies.root ?? process.cwd());
  const lifecycle = new RuntimeLifecycle();
  const timing = new TimingRecorder();
  const processes = new ProcessSupervisor(root);
  lifecycle.register(processes);
  const repository = await RepositoryGuard.create(root, processes);
  const disposeSignals = installLifecycleSignals(lifecycle);
  let adapterResult: SmokeAdapterResult | null = null;
  let primary: SmokeError | null = null;
  let evidenceReportPath: string | null = null;
  try {
    const adapter = await descriptor.loadFixedAdapter(root);
    const evidenceDirectory = adapter.evidenceDirectory?.(input, root) ?? null;
    evidenceReportPath =
      evidenceDirectory === null ? null : precreateEvidenceReport(evidenceDirectory);
    adapterResult = await timing.measure("suite", input.suite, () =>
      adapter.run({ input, root, lifecycle, timing, processes, repository })
    );
  } catch (error) {
    primary = mapSmokeError(error);
    console.error(`[primary] ${primary.code} :: ${primary.message}`);
  } finally {
    disposeSignals();
  }
  const cleanup = await timing.measure("cleanup", "all", () => lifecycle.closeAllNeverThrow());
  const report = createRuntimeSmokeReport({
    request: input,
    adapter: adapterResult,
    primary,
    cleanup,
    timings: timing.snapshot(),
    processCounters: processes.counters(),
    snapshots: repository.count(),
  });
  const json = encodeReportJson(report);
  (dependencies.writeJson ?? ((value) => process.stdout.write(value)))(json);
  (dependencies.writeMarkdown ?? ((value) => process.stderr.write(value)))(
    encodeReportMarkdown(report)
  );
  if (evidenceReportPath !== null) {
    writeEvidenceReport(evidenceReportPath, `${json}\n`);
  }
  appendDiagnostics(root, input.session, [
    `=== run finished ${new Date().toISOString()} ===`,
    `suite=${input.suite} profile=${input.profile} session=${input.session}`,
    `pass=${report.pass} serverUp=${report.serverUp}`,
    `failures=${JSON.stringify(report.failures)}`,
    `timings=${JSON.stringify(report.timings)}`,
    `processes=${JSON.stringify(report.processCounters)}`,
    `scenarios=${JSON.stringify(report.scenarios)}`,
    `cleanup=${JSON.stringify(report.cleanup)}`,
    `evidenceReport=${evidenceReportPath}`,
    `=== end run ===`,
  ]);
  return report;
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return typeof entry === "string" && resolve(entry) === fileURLToPath(import.meta.url);
}

function isBunRuntime(): boolean {
  return typeof (globalThis as { readonly Bun?: unknown }).Bun === "object";
}

async function runNodeOwnedOrchestrator(argv: readonly string[]): Promise<number> {
  const root = await resolveCanonicalRepositoryRoot(process.cwd());
  const node = await resolveExecutableOnPath("node");
  const entry = await realpath(fileURLToPath(import.meta.url));
  const tsxCli = await realpath(resolve(root, "node_modules/tsx/dist/cli.mjs"));
  if (entry !== resolve(root, "scripts/runtime-smoke.ts") || !tsxCli.startsWith(`${root}/`)) {
    throw new Error("runtime smoke Node launcher identity drifted");
  }
  const child = spawn(node, [tsxCli, entry, ...argv], {
    cwd: root,
    env: process.env,
    shell: false,
    stdio: "inherit",
  });
  const forward = (signal: NodeJS.Signals): void => {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  };
  const onInterrupt = (): void => forward("SIGINT");
  const onTerminate = (): void => forward("SIGTERM");
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  try {
    return await new Promise<number>((resolveExit, rejectExit) => {
      child.once("error", rejectExit);
      child.once("exit", (code, signal) => resolveExit(signal === null ? (code ?? 1) : 1));
    });
  } finally {
    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onTerminate);
  }
}

async function main(): Promise<void> {
  if (isBunRuntime()) {
    process.exitCode = await runNodeOwnedOrchestrator(process.argv.slice(2));
    return;
  }
  const report = await runRuntimeSmoke(process.argv.slice(2));
  if (!report.pass) process.exitCode = 1;
}

if (isDirectExecution()) {
  void main().catch((error: unknown) => {
    const failure = mapSmokeError(error);
    process.stderr.write(
      `${JSON.stringify({ code: failure.code, message: failure.message, cause: failure.cause instanceof Error ? failure.cause.message : String(failure.cause) })}\n`
    );
    process.exitCode = 1;
  });
}
