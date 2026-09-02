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
import { RuntimeSmokeRoutingSettingsLease } from "../../../routing-settings-lease";
import {
  archiveTask540Screenshots,
  assertExactTask540EvidenceDirectory,
  buildExactTask540ArchiveManifest,
  captureTask540FlatScreenshotBaseline,
  captureTask540GeneratedScreenshotObservations,
  restoreTask540FlatScreenshotBaseline,
  type Task540ArchiveManifest,
  type Task540ArchivedScreenshotResult,
  type Task540FlatScreenshotBaseline,
  type Task540GeneratedScreenshotObservations,
} from "../../output-manifest";
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
  readonly archivedScreenshots: readonly { readonly path: string; readonly sha256: string }[];
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
  if (primary === undefined) {
    return new SmokeError("smoke_cleanup_failed", "TASK-540 cleanup failed", { cause: cleanup });
  }
  if (primary instanceof SmokeError) {
    return new SmokeError(primary.code, primary.message, {
      cause: new AggregateError([primary, cleanup], "TASK-540 primary and cleanup failures"),
    });
  }
  return new SmokeError("smoke_output_invalid", "TASK-540 suite and cleanup failed", {
    cause: new AggregateError([primary, cleanup]),
  });
}

type Task540ArchivePhase = "archive-screenshots" | "archive-screenshots-restore-flat";
type Task540ArchivePhaseMeasure = <T>(
  phase: Task540ArchivePhase,
  operation: () => Promise<T>
) => Promise<T>;

export interface Task540ArchiveAndRestoreInput {
  readonly root: string;
  readonly smokeInput: RuntimeSmokeContext["input"];
  readonly manifest: Task540ArchiveManifest;
  readonly baseline: Task540FlatScreenshotBaseline;
  readonly nativeScreenshots: Task540NativeEvidence["screenshots"];
  readonly observations: Task540GeneratedScreenshotObservations;
  readonly measure: Task540ArchivePhaseMeasure;
}

export async function archiveAndRestoreTask540Screenshots(
  input: Task540ArchiveAndRestoreInput
): Promise<Task540ArchivedScreenshotResult> {
  let primary: unknown;
  let hasPrimary = false;
  let cleanup: unknown;
  let hasCleanup = false;
  let archive: Task540ArchivedScreenshotResult | undefined;
  try {
    archive = await input.measure("archive-screenshots", () =>
      archiveTask540Screenshots(
        input.root,
        input.smokeInput,
        input.manifest,
        input.nativeScreenshots,
        input.observations
      )
    );
    await assertExactTask540EvidenceDirectory(
      input.root,
      input.smokeInput,
      input.manifest,
      archive.archivedScreenshots
    );
  } catch (error) {
    primary = error;
    hasPrimary = true;
  } finally {
    const restore = () =>
      restoreTask540FlatScreenshotBaseline(
        input.root,
        input.manifest,
        input.baseline,
        input.observations
      );
    try {
      if (!hasPrimary) {
        await input.measure("archive-screenshots-restore-flat", restore);
      } else {
        await restore();
      }
    } catch (error) {
      cleanup = error;
      hasCleanup = true;
    }
  }
  if (hasCleanup) throw preserveFailure(hasPrimary ? primary : undefined, cleanup);
  if (hasPrimary) throw primary;
  if (archive === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 screenshot archive is absent");
  }
  return archive;
}

export async function finalizeTask540RoutingLease(input: {
  readonly routingLease: Pick<RuntimeSmokeRoutingSettingsLease, "restore"> | null;
  readonly routingRestored: boolean;
  readonly primary: unknown;
  readonly closeDatabase: () => Promise<void>;
}): Promise<Readonly<{ primary: unknown; routingRestored: boolean }>> {
  let primary = input.primary;
  let routingRestored = input.routingRestored;
  if (input.routingLease !== null && !routingRestored) {
    try {
      await input.routingLease.restore();
      routingRestored = true;
    } catch (error) {
      primary = preserveFailure(primary, error);
    }
  }
  if (input.routingLease !== null) {
    try {
      await input.closeDatabase();
    } catch (error) {
      primary = preserveFailure(primary, error);
    }
  }
  return Object.freeze({ primary, routingRestored });
}

export async function runTask540NativeSuite(
  context: RuntimeSmokeContext,
  nonce: string,
  environment: NodeJS.ProcessEnv = process.env
): Promise<Task540NativeSuiteResult> {
  const plan = buildTask540NativePlan({ nonce }) as Task540NativePlan;
  const manifest = buildExactTask540ArchiveManifest(context.input, plan.requiredScreenshotPaths);
  const flatScreenshotBaseline = await captureTask540FlatScreenshotBaseline(context.root, manifest);
  const guardPaths = Object.freeze([...manifest.sourcePaths, ...manifest.archivePaths]);
  const before = await context.repository.snapshot(guardPaths);
  let pool: Awaited<ReturnType<typeof createTask540NativeWorkerPool>> | null = null;
  let workspace: Task540PrivateWorkspace | null = null;
  let transport: BrowserTransport | null = null;
  let authPrepared = false;
  let authRestored = false;
  let routingLease: RuntimeSmokeRoutingSettingsLease | null = null;
  let routingRestored = false;
  let primary: unknown;
  let evidence: Task540NativeEvidence | undefined;
  let archivedScreenshots:
    readonly { readonly path: string; readonly sha256: string }[] | undefined;
  let generatedScreenshots: Awaited<
    ReturnType<typeof captureTask540GeneratedScreenshotObservations>
  > | null = null;
  try {
    pool = await createTask540NativeWorkerPool(context, environment);
    if (context.input.profile === "fast") {
      await context.timing.measure("phase", "auth-window-prepare", () =>
        pool!.dispatch(TASK540_AUTH_PREPARE_DESCRIPTOR, {})
      );
      authPrepared = true;
    }
    // The dev host resolves the admin base path from the DB at boot, so the
    // routing targets must be applied BEFORE it spawns and restored once the
    // plan is done (TASK-540 runtime-smoke fix).
    routingLease = new RuntimeSmokeRoutingSettingsLease();
    await context.timing.measure("phase", "routing-settings-apply", () => routingLease!.apply());
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
    generatedScreenshots = await context.timing.measure(
      "phase",
      "archive-screenshots-observe",
      () =>
        captureTask540GeneratedScreenshotObservations(context.root, manifest, evidence!.screenshots)
    );
    const archive = await archiveAndRestoreTask540Screenshots({
      root: context.root,
      smokeInput: context.input,
      manifest,
      baseline: flatScreenshotBaseline,
      nativeScreenshots: evidence!.screenshots,
      observations: generatedScreenshots,
      measure: (phase, operation) => context.timing.measure("phase", phase, operation),
    });
    archivedScreenshots = archive.archivedScreenshots;
    if (authPrepared) {
      await context.timing.measure("phase", "auth-window-restore", () =>
        pool!.dispatch(TASK540_AUTH_RESTORE_DESCRIPTOR, {})
      );
      authRestored = true;
    }
  } catch (error) {
    primary = error;
  } finally {
    if (routingLease !== null) {
      const finalized = await finalizeTask540RoutingLease({
        routingLease: {
          restore: () =>
            context.timing.measure("phase", "routing-settings-restore", () =>
              routingLease!.restore()
            ),
        },
        routingRestored,
        primary,
        closeDatabase: async () => {
          const { closeDatabase } = await import("../../../../../../core/db/client");
          await closeDatabase();
        },
      });
      primary = finalized.primary;
      routingRestored = finalized.routingRestored;
    }
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
    try {
      const after = await context.repository.snapshot(guardPaths);
      context.repository.assertUnchanged(before, after, manifest.archivePaths);
    } catch (error) {
      primary = preserveFailure(primary, error);
    }
  }
  if (primary !== undefined) throw primary;
  if (evidence === undefined || archivedScreenshots === undefined || pool === null) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 native suite evidence is absent");
  }
  return Object.freeze({
    evidence,
    archivedScreenshots,
    workerCounters: pool.counters(),
    authWindowState: context.input.profile === "fast" ? "restored" : "unchanged",
  });
}
