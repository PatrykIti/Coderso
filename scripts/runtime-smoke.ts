import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  writeFileSync,
} from "node:fs";
import { parseRuntimeSmokeArgs } from "./runtime-smoke/cli";
import { appendDiagnostics } from "./runtime-smoke/diagnostics";
import {
  SmokeError,
  mapSmokeError,
  serializePublicSmokeFailure,
  type SmokeInput,
} from "./runtime-smoke/contracts";
import {
  installLifecycleSignals,
  RuntimeLifecycle,
  type CleanupResult,
  type LifecycleResource,
} from "./runtime-smoke/lifecycle";
import { ProcessSupervisor, resolveExecutableOnPath } from "./runtime-smoke/process-supervisor";
import type { SmokeSuiteDescriptor } from "./runtime-smoke/registry";
import { RepositoryGuard, resolveCanonicalRepositoryRoot } from "./runtime-smoke/repository-guard";
import {
  createRuntimeSmokeReport,
  encodeReportJson,
  encodeReportMarkdown,
  type RuntimeSmokeReport,
} from "./runtime-smoke/report";
import { TimingRecorder } from "./runtime-smoke/timing";
import {
  isTask105L05LifecycleAttestation,
  type SmokeAdapter,
  type SmokeAdapterResult,
} from "./runtime-smoke/adapters/types";
import {
  claimExclusiveEvidenceReport,
  claimExclusiveEvidenceSession,
  type ClaimedEvidenceReport,
} from "./runtime-smoke/evidence-session";

/** Controlled test-only seams for the TASK-105 L05 runner redaction boundary. */
export interface Task105L05RunnerRedactionSeams {
  /** Test-only descriptor seam that avoids loading unrelated suite adapters. */
  readonly requireDescriptor?: (
    input: SmokeInput
  ) => SmokeSuiteDescriptor | Promise<SmokeSuiteDescriptor>;
  readonly loadAdapter?: (root: string) => Promise<SmokeAdapter>;
  readonly createLifecycle?: () => RuntimeLifecycle;
  readonly appendDiagnostics?: typeof appendDiagnostics;
  /** Test-only seam immediately before the final claimed-report write. */
  readonly beforeEvidenceReportWrite?: (reportPath: string) => void;
}

async function requireSmokeSuiteDescriptor(
  input: SmokeInput,
  seam: Task105L05RunnerRedactionSeams["requireDescriptor"] | undefined
): Promise<SmokeSuiteDescriptor> {
  if (seam !== undefined) return seam(input);
  const { staticSmokeRegistry } = await import("./runtime-smoke/registry");
  return staticSmokeRegistry.require(input);
}

export interface RuntimeSmokeDependencies {
  readonly root?: string;
  readonly writeJson?: (value: string) => void;
  readonly writeMarkdown?: (value: string) => void;
  readonly task105L05RedactionSeams?: Task105L05RunnerRedactionSeams;
}

function isTask105L05(input: SmokeInput): boolean {
  return input.suite === "task-105-l05";
}

function publicTask105L05Failure(boundary: "runner" | "lifecycle"): SmokeError {
  const failure = serializePublicSmokeFailure(
    boundary === "runner"
      ? { boundary, stableCode: "runner_failed" }
      : { boundary, stableCode: "lifecycle_failed" }
  );
  return new SmokeError(failure.code, failure.message);
}

const TASK105_L05_PUBLIC_FAILURE_MESSAGES = new Set<string>([
  serializePublicSmokeFailure({ boundary: "runner", stableCode: "runner_failed" }).message,
  serializePublicSmokeFailure({ boundary: "lifecycle", stableCode: "lifecycle_failed" }).message,
  ...(
    ["spawn", "protocol", "install", "settings_apply", "settings_restore", "close"] as const
  ).flatMap((phase) =>
    (
      [
        "worker_dispatch_failed",
        "worker_protocol_failed",
        "worker_unavailable",
        "worker_close_failed",
      ] as const
    ).map(
      (stableCode) => serializePublicSmokeFailure({ boundary: "worker", phase, stableCode }).message
    )
  ),
]);

const TASK105_L05_LIFECYCLE_RESOURCES = Object.freeze({
  processSupervisor: "process-supervisor",
  workerPool: "task-105-l05-worker-pool",
  devHost: "task-105-l05-dev-host",
  browserDispatch: "task-105-l05-browser-dispatch",
  workspace: "task-105-l05-workspace",
  fixtureCleanup: "task-105-l05-fixture-cleanup",
});

type Task105L05LifecycleReceiptKey = keyof typeof TASK105_L05_LIFECYCLE_RESOURCES;

interface Task105L05LifecycleRegistrationTracker {
  readonly isRegistered: (key: Task105L05LifecycleReceiptKey) => boolean;
}

function trackTask105L05LifecycleRegistrations(
  lifecycle: RuntimeLifecycle
): Task105L05LifecycleRegistrationTracker {
  const registered = new Set<string>();
  const register = lifecycle.register.bind(lifecycle);
  lifecycle.register = (resource: LifecycleResource): void => {
    register(resource);
    registered.add(resource.name);
  };
  return Object.freeze({
    isRegistered: (key: Task105L05LifecycleReceiptKey): boolean =>
      registered.has(TASK105_L05_LIFECYCLE_RESOURCES[key]),
  });
}

function isTrustedTask105L05PublicFailure(error: unknown): error is SmokeError {
  return (
    error instanceof SmokeError &&
    error.code === "smoke_process_failed" &&
    TASK105_L05_PUBLIC_FAILURE_MESSAGES.has(error.message)
  );
}

function task105L05SuiteCleanup(
  adapter: SmokeAdapterResult | null,
  cleanup: CleanupResult,
  registrations: Task105L05LifecycleRegistrationTracker
): Readonly<Record<string, boolean | number | string>> {
  const adapterAttestation =
    adapter !== null && isTask105L05LifecycleAttestation(adapter.cleanup) ? adapter.cleanup : null;
  const adapterRuntime = adapterAttestation !== null;
  const registered = Object.fromEntries(
    (Object.keys(TASK105_L05_LIFECYCLE_RESOURCES) as Task105L05LifecycleReceiptKey[]).map((key) => [
      key,
      registrations.isRegistered(key),
    ])
  ) as Record<Task105L05LifecycleReceiptKey, boolean>;
  return Object.freeze({
    contract: "task-105-l05-liveness-v1",
    adapterRuntime,
    ...registered,
    cleanupPass: cleanup.pass,
    cleanupFailures: cleanup.failures.length,
    receiptDigest: adapterAttestation?.receiptDigest ?? "",
    receiptConsoleErrors: adapterAttestation?.receiptConsoleErrors ?? -1,
    receiptPageErrors: adapterAttestation?.receiptPageErrors ?? -1,
  });
}

function task105L05LivenessPassed(
  receipt: Readonly<Record<string, boolean | number | string>>
): boolean {
  return (
    receipt.contract === "task-105-l05-liveness-v1" &&
    receipt.adapterRuntime === true &&
    (Object.keys(TASK105_L05_LIFECYCLE_RESOURCES) as Task105L05LifecycleReceiptKey[]).every(
      (key) => receipt[key] === true
    ) &&
    receipt.cleanupPass === true &&
    receipt.cleanupFailures === 0 &&
    typeof receipt.receiptDigest === "string" &&
    /^[a-f0-9]{64}$/u.test(receipt.receiptDigest) &&
    receipt.receiptConsoleErrors === 0 &&
    receipt.receiptPageErrors === 0
  );
}

function stableEvidenceNode(stats: ReturnType<typeof fstatSync>): string {
  return `${stats.dev}:${stats.ino}:${Number(stats.mode) & 0o7777}:${stats.nlink}`;
}

function precreateEvidenceReport(evidenceDirectory: string): string {
  mkdirSync(evidenceDirectory, { recursive: true, mode: 0o700 });
  const reportPath = resolve(evidenceDirectory, "report.json");
  let descriptor: number | undefined;
  try {
    try {
      descriptor = openSync(
        reportPath,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
        0o600
      );
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | null)?.code;
      if (code === "EEXIST") {
        const existing = lstatSync(reportPath);
        if (
          !existing.isFile() ||
          existing.isSymbolicLink() ||
          existing.nlink !== 1 ||
          (existing.mode & 0o777) !== 0o600
        ) {
          throw new SmokeError(
            "smoke_output_invalid",
            "evidence report already exists with invalid ownership"
          );
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
    descriptor = openSync(
      reportPath,
      constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW
    );
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.nlink !== 1 || (before.mode & 0o777) !== 0o600) {
      throw new SmokeError("smoke_output_invalid", "evidence report ownership is invalid");
    }
    writeFileSync(descriptor, json, "utf8");
    fchmodSync(descriptor, 0o600);
    const after = fstatSync(descriptor);
    const final = lstatSync(reportPath);
    if (
      stableEvidenceNode(before) !== stableEvidenceNode(after) ||
      stableEvidenceNode(after) !== stableEvidenceNode(final)
    ) {
      throw new SmokeError(
        "smoke_output_invalid",
        "evidence report identity changed while writing"
      );
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
  const task105L05Seams = isTask105L05(input) ? dependencies.task105L05RedactionSeams : undefined;
  const descriptor = await requireSmokeSuiteDescriptor(input, task105L05Seams?.requireDescriptor);
  const root = await resolveCanonicalRepositoryRoot(dependencies.root ?? process.cwd());
  const lifecycle = task105L05Seams?.createLifecycle?.() ?? new RuntimeLifecycle();
  const task105L05Registrations = isTask105L05(input)
    ? trackTask105L05LifecycleRegistrations(lifecycle)
    : null;
  const timing = new TimingRecorder();
  const processes = new ProcessSupervisor(root);
  lifecycle.register(processes);
  const repository = await RepositoryGuard.create(root, processes);
  const disposeSignals = installLifecycleSignals(lifecycle);
  let adapterResult: SmokeAdapterResult | null = null;
  let primary: SmokeError | null = null;
  let evidenceReportPath: string | null = null;
  let claimedTask105L05Report: ClaimedEvidenceReport | null = null;
  try {
    const adapter =
      task105L05Seams?.loadAdapter === undefined
        ? await descriptor.loadFixedAdapter(root)
        : await task105L05Seams.loadAdapter(root);
    const evidenceDirectory =
      adapter.evidenceSessionPolicy === "exclusive"
        ? isTask105L05(input)
          ? (claimedTask105L05Report = claimExclusiveEvidenceReport(input, root)).sessionDirectory
          : claimExclusiveEvidenceSession(input, root)
        : (adapter.evidenceDirectory?.(input, root) ?? null);
    evidenceReportPath =
      claimedTask105L05Report?.reportPath ??
      (evidenceDirectory === null ? null : precreateEvidenceReport(evidenceDirectory));
    adapterResult = await timing.measure("suite", input.suite, () =>
      adapter.run({ input, root, lifecycle, timing, processes, repository })
    );
  } catch (error) {
    primary = isTask105L05(input)
      ? isTrustedTask105L05PublicFailure(error)
        ? error
        : publicTask105L05Failure("runner")
      : mapSmokeError(error);
    if (!isTask105L05(input)) console.error(`[primary] ${primary.code} :: ${primary.message}`);
  } finally {
    disposeSignals();
  }
  const cleanup = await timing.measure("cleanup", "all", () => lifecycle.closeAllNeverThrow());
  const task105L05Cleanup =
    task105L05Registrations === null
      ? null
      : task105L05SuiteCleanup(adapterResult, cleanup, task105L05Registrations);
  if (isTask105L05(input) && primary === null && task105L05Cleanup !== null) {
    if (!task105L05LivenessPassed(task105L05Cleanup)) {
      primary = publicTask105L05Failure("lifecycle");
    }
  }
  const reportAdapter =
    task105L05Cleanup === null || adapterResult === null
      ? adapterResult
      : Object.freeze({ ...adapterResult, cleanup: task105L05Cleanup });
  const report = createRuntimeSmokeReport({
    request: input,
    adapter: reportAdapter,
    primary,
    cleanup,
    timings: timing.snapshot(),
    processCounters: processes.counters(),
    snapshots: repository.count(),
  });
  const json = encodeReportJson(report);
  const writeJson = dependencies.writeJson ?? ((value: string) => process.stdout.write(value));
  const writeMarkdown =
    dependencies.writeMarkdown ?? ((value: string) => process.stderr.write(value));
  writeJson(json);
  if (isTask105L05(input) && primary !== null) {
    writeMarkdown(`[primary] ${primary.code} :: ${primary.message}\n`);
  }
  writeMarkdown(encodeReportMarkdown(report));
  if (evidenceReportPath !== null) {
    task105L05Seams?.beforeEvidenceReportWrite?.(evidenceReportPath);
    if (claimedTask105L05Report !== null) claimedTask105L05Report.write(`${json}\n`);
    else writeEvidenceReport(evidenceReportPath, `${json}\n`);
  }
  (task105L05Seams?.appendDiagnostics ?? appendDiagnostics)(root, input.session, [
    `=== run finished ${new Date().toISOString()} ===`,
    `suite=${input.suite} profile=${input.profile} session=${input.session}`,
    `pass=${report.pass} serverUp=${report.serverUp}`,
    `failures=${JSON.stringify(report.failures)}`,
    `timings=${JSON.stringify(report.timings)}`,
    `processes=${JSON.stringify(report.processes)}`,
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
  // node_modules may be a symlink to a shared store (git worktrees commonly
  // link it to the primary checkout), so resolve its canonical location and
  // require the tsx CLI to come from that same canonical node_modules tree.
  const nodeModules = await realpath(resolve(root, "node_modules"));
  const tsxCli = await realpath(resolve(nodeModules, "tsx/dist/cli.mjs"));
  if (
    entry !== resolve(root, "scripts/runtime-smoke.ts") ||
    !tsxCli.startsWith(`${nodeModules}/`)
  ) {
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
    let task105L05 = false;
    try {
      task105L05 = parseRuntimeSmokeArgs(process.argv.slice(2)).suite === "task-105-l05";
    } catch {
      // Invalid invocation stays on the pre-existing generic diagnostic path.
    }
    if (task105L05) {
      const failure = serializePublicSmokeFailure({
        boundary: "runner",
        stableCode: "runner_failed",
      });
      process.stderr.write(`${JSON.stringify(failure)}\n`);
    } else {
      const failure = mapSmokeError(error);
      process.stderr.write(
        `${JSON.stringify({ code: failure.code, message: failure.message, cause: failure.cause instanceof Error ? failure.cause.message : String(failure.cause) })}\n`
      );
    }
    process.exitCode = 1;
  });
}
