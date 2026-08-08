import { chmod, lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { BrowserTransport } from "../../../../browser/transport";
import { PlaywrightCliDispatcher } from "../../../../browser/playwright-cli-dispatcher";
import { SmokeError } from "../../../../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../../../../lifecycle";
import type { WorkerPoolCounters } from "../../../../workers/contracts";
import {
  TASK540_AUTH_PREPARE_DESCRIPTOR,
  TASK540_AUTH_RESTORE_DESCRIPTOR,
} from "../../auth-window";
import { createTask540NativeBrowser, task540BrowserSegmentIds } from "../browser/native-browser";
import { startTask540DevHost } from "../host/dev-host";
import { Task540NativeRuntime } from "../runtime/native-runtime";
import { executeTask540NativePlan } from "./executor";
import { Task540ExecutionMemory } from "./memory";
import { buildTask540NativePlan } from "./plan.mjs";
import { Task540NativeRuntimeActions } from "./runtime-actions";
import { createTask540NativeWorkerPool } from "./worker-pool";
import type { Task540NativeEvidence, Task540NativePlan } from "./contracts";

// Certification preserves the production auth window (up to 60 seconds), and
// each barrier waits one extra second before proving the next bounded epoch.
export const TASK540_RUN_CODE_TIMEOUT_MS = 90_000;

class Task540PrivateWorkspace implements LifecycleResource {
  readonly name = "task540-private-workspace";
  readonly path: string;
  #closed = false;

  private constructor(path: string) {
    this.path = path;
  }

  static async create(context: RuntimeSmokeContext): Promise<Task540PrivateWorkspace> {
    const root = await realpath(context.root);
    const path = await mkdtemp(join(root, ".runtime-smoke-task540-"));
    await chmod(path, 0o700);
    const canonical = await realpath(path);
    if (relative(root, canonical).startsWith("..")) {
      throw new SmokeError("smoke_repository_invalid", "TASK-540 workspace escapes root");
    }
    const workspace = new Task540PrivateWorkspace(canonical);
    context.lifecycle.register(workspace);
    return workspace;
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await rm(this.path, { recursive: true, force: true });
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#closed &&
      (await lstat(this.path).then(
        () => false,
        (error: NodeJS.ErrnoException) => error.code === "ENOENT"
      ))
    );
  }
}

export interface Task540NativeSuiteResult {
  readonly evidence: Task540NativeEvidence;
  readonly workerCounters: WorkerPoolCounters;
  readonly authWindowState: "restored" | "unchanged";
}

function secret(environment: NodeJS.ProcessEnv, name: "ADMIN_EMAIL" | "ADMIN_PASSWORD"): string {
  const value = environment[name];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 browser credentials are incomplete");
  }
  return value;
}

function preserveFailure(primary: unknown, cleanup: unknown): unknown {
  if (primary === undefined) return cleanup;
  if (primary instanceof SmokeError) {
    return new SmokeError(primary.code, primary.message, {
      cause: new AggregateError([primary, cleanup], "TASK-540 primary and cleanup failures"),
    });
  }
  return new SmokeError("smoke_output_invalid", "TASK-540 suite and cleanup failed", {
    cause: new AggregateError([primary, cleanup]),
  });
}

export async function runTask540NativeSuite(
  context: RuntimeSmokeContext,
  nonce: string,
  environment: NodeJS.ProcessEnv = process.env
): Promise<Task540NativeSuiteResult> {
  const plan = buildTask540NativePlan({ nonce }) as Task540NativePlan;
  const before = await context.repository.snapshot(plan.requiredScreenshotPaths);
  let pool: Awaited<ReturnType<typeof createTask540NativeWorkerPool>> | null = null;
  let workspace: Task540PrivateWorkspace | null = null;
  let transport: BrowserTransport | null = null;
  let authPrepared = false;
  let authRestored = false;
  let primary: unknown;
  let evidence: Task540NativeEvidence | undefined;
  try {
    pool = await createTask540NativeWorkerPool(context, environment);
    if (context.input.profile === "fast") {
      await context.timing.measure("phase", "auth-window-prepare", () =>
        pool!.dispatch(TASK540_AUTH_PREPARE_DESCRIPTOR, {})
      );
      authPrepared = true;
    }
    await startTask540DevHost(context, { environment });
    workspace = await Task540PrivateWorkspace.create(context);
    const dispatcher = new PlaywrightCliDispatcher({
      context,
      session: context.input.session,
      workspace: workspace.path,
      segments: task540BrowserSegmentIds(plan),
      runCodeTimeoutMs: TASK540_RUN_CODE_TIMEOUT_MS,
      runtimeEnvironment: environment,
    });
    transport = new BrowserTransport(context.input.session, dispatcher);
    context.lifecycle.register(transport);
    const memory = new Task540ExecutionMemory(plan);
    const runtime = new Task540NativeRuntime({
      root: context.root,
      plan,
      pool,
      lifecycle: context.lifecycle,
      memory,
      environment,
      hostReady: true,
    });
    const runtimeActions = new Task540NativeRuntimeActions({
      root: context.root,
      plan,
      runtime,
      memory,
    });
    const browser = createTask540NativeBrowser({
      root: context.root,
      plan,
      transport,
      native: dispatcher,
      session: context.input.session,
      secrets: {
        ADMIN_EMAIL: secret(environment, "ADMIN_EMAIL"),
        ADMIN_PASSWORD: secret(environment, "ADMIN_PASSWORD"),
      },
      memory,
    });
    evidence = await executeTask540NativePlan(plan, {
      executeRuntime: (action) => runtimeActions.execute(action),
      executeBrowser: (action) => browser.execute(action),
      assertBrowserDrained: () => browser.assertDrained(),
      finalizeCleanup: () => runtimeActions.finalizeCleanup(),
      measure: (kind, name, operation) => context.timing.measure(kind, name, operation),
      now: () => performance.now(),
    });
    if (authPrepared) {
      await context.timing.measure("phase", "auth-window-restore", () =>
        pool!.dispatch(TASK540_AUTH_RESTORE_DESCRIPTOR, {})
      );
      authRestored = true;
    }
    await transport.close();
    await workspace.close();
    const after = await context.repository.snapshot(plan.requiredScreenshotPaths);
    context.repository.assertUnchanged(before, after, plan.requiredScreenshotPaths);
  } catch (error) {
    primary = error;
  } finally {
    if (authPrepared && !authRestored && pool !== null) {
      try {
        await pool.dispatch(TASK540_AUTH_RESTORE_DESCRIPTOR, {});
        authRestored = true;
      } catch (error) {
        primary = preserveFailure(primary, error);
      }
    }
    for (const resource of [transport, workspace]) {
      if (resource === null) continue;
      try {
        await resource.close();
      } catch (error) {
        primary = preserveFailure(primary, error);
      }
    }
  }
  if (primary !== undefined) throw primary;
  if (evidence === undefined || pool === null) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 native suite evidence is absent");
  }
  return Object.freeze({
    evidence,
    workerCounters: pool.counters(),
    authWindowState: context.input.profile === "fast" ? "restored" : "unchanged",
  });
}
