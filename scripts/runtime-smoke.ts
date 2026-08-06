import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRuntimeSmokeArgs } from "./runtime-smoke/cli";
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
  try {
    const adapter = await descriptor.loadFixedAdapter(root);
    adapterResult = await timing.measure("suite", input.suite, () =>
      adapter.run({ input, root, lifecycle, timing, processes, repository })
    );
  } catch (error) {
    primary = mapSmokeError(error);
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
  (dependencies.writeJson ?? ((value) => process.stdout.write(value)))(encodeReportJson(report));
  (dependencies.writeMarkdown ?? ((value) => process.stderr.write(value)))(
    encodeReportMarkdown(report)
  );
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
    process.stderr.write(`${JSON.stringify({ code: failure.code })}\n`);
    process.exitCode = 1;
  });
}
