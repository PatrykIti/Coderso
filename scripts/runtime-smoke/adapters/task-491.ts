import { randomBytes } from "node:crypto";

import {
  assertExactKeys,
  isPlainObject,
  resolveInsideRoot,
  SmokeError,
  type SmokeInput,
} from "../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../lifecycle";
import type { SupervisedServerResource } from "../server/supervised-server";
import type { WorkerPool } from "../workers/pool";
import type { SmokeAdapter, SmokeAdapterResult } from "./types";
import {
  assertTask491SafeProjection,
  validateExactTask491Observations,
  type Task491AcceptedObservations,
} from "./task-491/assertions";
import {
  createTask491BrowserRuntime,
  executeTask491Segments,
  materializeTask491BrowserDispatchPlan,
  type Task491BrowserRuntime,
} from "./task-491/browser-segments";
import {
  compareTask491RepositoryNeverThrow,
  createTask491CleanupResources,
  finalizeTask491ResourcesNeverThrow,
  preserveTask491PrimaryFailure,
  type Task491CleanupResources,
  type Task491FinalCleanupProof,
  type Task491FinalizationFailure,
} from "./task-491/cleanup";
import { task491ScenarioDescriptors } from "./task-491/descriptors";
import { createTask491WorkerPool, installTask491FixtureInBatches } from "./task-491/db-operations";
import { startTask491DevHost, task491TimingPolicy } from "./task-491/host";
import {
  assertExactTask491ScreenshotManifest,
  buildExactTask491ScreenshotManifest,
  EVIDENCE_ROOT,
  validateTask491ScreenshotOutputs,
  type Task491ScreenshotManifest,
} from "./task-491/output-manifest";
import {
  createTask491WorkerRegistry,
  TASK491_WORKER_DESCRIPTORS,
  type Task491InstallOutput,
} from "./task-491/worker-operations";
import { createTask491PrivateWorkspace, type Task491PrivateWorkspace } from "./task-491/workspace";
import { RuntimeSmokeRoutingSettingsLease } from "./routing-settings-lease";

export interface Task491AdapterProjectionInput {
  readonly accepted: Task491AcceptedObservations;
  readonly screenshots: SmokeAdapterResult["screenshots"];
  readonly proof: Task491FinalCleanupProof;
  readonly workers: WorkerPool;
  readonly repositorySnapshots: number;
}

export function assertExactTask491Invocation(value: unknown): void {
  if (!isPlainObject(value)) {
    throw new SmokeError("smoke_argument_invalid", "TASK-491 invocation is invalid");
  }
  assertExactKeys(value, ["command", "suite", "profile", "session"], "TASK-491 invocation");
  if (
    value.command !== "run" ||
    value.suite !== "task-491" ||
    (value.profile !== "fast" && value.profile !== "certification") ||
    typeof value.session !== "string"
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-491 invocation is invalid");
  }
}

export function projectTask491AdapterResult(
  input: Task491AdapterProjectionInput
): SmokeAdapterResult {
  const counters = input.workers.counters();
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: input.accepted.scenarios,
    screenshots: input.screenshots,
    consoleErrors: input.accepted.consoleErrors,
    cleanup: Object.freeze({
      deletedIntegrations: input.proof.cleanup.deletedRows,
      remainingIntegrationRows: input.proof.cleanup.remainingRows,
      terminalRemainingRows: input.proof.terminal.remainingRows,
      workerStarts: counters.starts,
      workerRequests: counters.requests,
      workerReconnects: counters.reconnects,
      databaseBatches: counters.databaseBatches,
      statements: counters.statements,
      rows: counters.rows,
      repositorySnapshots: input.repositorySnapshots,
    }),
  });
}

function requireProof(proof: Task491FinalCleanupProof | null): Task491FinalCleanupProof {
  if (proof === null) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-491 cleanup proof is absent");
  }
  return proof;
}

export async function runTask491Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask491Invocation(context.input);
  const descriptors = task491ScenarioDescriptors(context.input.profile);
  const manifest: Task491ScreenshotManifest = buildExactTask491ScreenshotManifest(context.input);
  assertExactTask491ScreenshotManifest(manifest, descriptors);
  const timing = task491TimingPolicy(context.input.profile);
  const before = await context.timing.measure("snapshot", "task491-before", () =>
    context.repository.snapshot(manifest.paths)
  );

  let workers: WorkerPool | null = null;
  let fixture: Task491InstallOutput | null = null;
  let cleanup: Task491CleanupResources | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Task491PrivateWorkspace | null = null;
  let browser: Task491BrowserRuntime | null = null;
  let browserResource: LifecycleResource | null = null;
  let accepted: Task491AcceptedObservations | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let primary: unknown | null = null;
  let finalProof: Task491FinalCleanupProof | null = null;
  let routingLease: RuntimeSmokeRoutingSettingsLease | null = null;
  let routingRestored = false;
  let authWindowPrepared = false;
  const leaseFailures: Task491FinalizationFailure[] = [];
  const authMarker = randomBytes(12).toString("hex");

  try {
    workers = await context.timing.measure("phase", "task491-workers", () =>
      createTask491WorkerPool(context, createTask491WorkerRegistry())
    );
    fixture = await context.timing.measure("phase", "task491-install", () =>
      installTask491FixtureInBatches(
        workers!,
        TASK491_WORKER_DESCRIPTORS.install,
        randomBytes(6).toString("hex")
      )
    );
    workers.recordDatabaseBatch(fixture.statements, fixture.rows);
    cleanup = createTask491CleanupResources({
      lifecycle: context.lifecycle,
      workers,
      descriptors: TASK491_WORKER_DESCRIPTORS,
    });
    // The dev host resolves the admin base path from the DB at boot, so the
    // routing targets must be applied BEFORE it spawns and restored once the
    // suite is done (shared runtime-smoke routing-settings lease).
    routingLease = new RuntimeSmokeRoutingSettingsLease();
    await context.timing.measure("phase", "routing-settings-apply", () => routingLease!.apply());
    // The admin SPA fires several /auth/* requests per boot and every one
    // consumes the shared auth rate-limit bucket (10 req/60s). The suite
    // boots the shell six times (auth warmup + five scored scenarios), so a
    // full run exceeds the window and the last boot 429s into a /admin/login
    // bounce. Shorten the auth bucket window BEFORE the dev host reads the
    // settings (its first request caches the patched value), then restore the
    // exact stored row on close (mirrors the proven TASK-490/TASK-488
    // auth-window pattern).
    await workers.dispatch(
      TASK491_WORKER_DESCRIPTORS.authPrepare,
      Object.freeze({ marker: authMarker })
    );
    authWindowPrepared = true;
    server = await context.timing.measure("phase", "task491-server", () =>
      startTask491DevHost(context, { timing })
    );
    workspace = await context.timing.measure("phase", "task491-workspace", () =>
      createTask491PrivateWorkspace(context)
    );
    const plan = await context.timing.measure("phase", "task491-browser-plan", () =>
      materializeTask491BrowserDispatchPlan({
        root: context.root,
        descriptors,
        manifest,
        fixture: fixture!,
        environment: process.env,
      })
    );
    browser = await context.timing.measure("phase", "task491-browser-start", () =>
      createTask491BrowserRuntime({
        context,
        workspace: workspace!.path,
        authStatePath: workspace!.authStatePath,
        plan,
        authTimeoutMs: timing.authTimeoutMs,
        dispatchTimeoutMs: timing.browserDispatchTimeoutMs,
        onResourceRegistered: (resource) => {
          browserResource = resource;
        },
      })
    );
    const observations = await context.timing.measure("phase", "task491-browser", () =>
      executeTask491Segments({
        plan,
        transport: browser!.transport,
        workers: workers!,
        checkpointDescriptor: TASK491_WORKER_DESCRIPTORS.checkpoint,
        descriptors,
        manifest,
        installedDigest: fixture!.installedDigest,
      })
    );
    screenshots = await context.timing.measure("phase", "task491-screenshots", () =>
      validateTask491ScreenshotOutputs(context.root, manifest)
    );
    accepted = validateExactTask491Observations({
      observations,
      descriptors,
      manifest,
      installedDigest: fixture.installedDigest,
      screenshots,
    });
  } catch (error) {
    primary = error;
  } finally {
    // Restore the ambient routing settings in finally so a failed suite can
    // never leave `site.adminPath` / `site.homepageId` pinned.
    if (routingLease !== null && !routingRestored) {
      try {
        await context.timing.measure("phase", "routing-settings-restore", () =>
          routingLease!.restore()
        );
        routingRestored = true;
      } catch (error) {
        leaseFailures.push(
          Object.freeze({ resource: "task491-routing-settings", phase: "close", error })
        );
      }
    }
    // Restore the exact security.settings row in finally, never-throw, so a
    // failed suite cannot leave the auth bucket window shortened.
    if (authWindowPrepared && workers !== null) {
      try {
        await workers.dispatch(
          TASK491_WORKER_DESCRIPTORS.authRestore,
          Object.freeze({ marker: authMarker })
        );
      } catch (error) {
        leaseFailures.push(
          Object.freeze({ resource: "task491-auth-window", phase: "close", error })
        );
      }
    }
    // The lease opens the postgres-js client in this process for its
    // snapshot/restore transactions; postgres-js keeps idle sockets alive, so
    // the client must be closed for the Node event loop to terminate after the
    // run (mirrors the proven TASK-490 lease teardown; the runner otherwise
    // hangs after writing its report).
    try {
      const { closeDatabase } = await import("../../../core/db/client");
      await closeDatabase();
    } catch (error) {
      leaseFailures.push(
        Object.freeze({ resource: "task491-routing-settings-db", phase: "close", error })
      );
    }
  }

  if (workers !== null) {
    const finalization = await context.timing.measure("cleanup", "task491-resources", () =>
      finalizeTask491ResourcesNeverThrow({
        browser: browserResource ?? browser?.transport ?? null,
        workspace,
        server,
        cleanup,
        workers,
        proofDescriptor: TASK491_WORKER_DESCRIPTORS.prove,
      })
    );
    finalProof = finalization.proof;
    primary = preserveTask491PrimaryFailure(
      primary,
      [...finalization.failures, ...leaseFailures],
      null
    );
  }

  if (primary === null) {
    const repositoryComparison = await context.timing.measure("snapshot", "task491-after", () =>
      compareTask491RepositoryNeverThrow({
        guard: context.repository,
        before,
        allowedPaths: manifest.paths,
      })
    );
    if (repositoryComparison.failure !== null) {
      primary = preserveTask491PrimaryFailure(primary, [], repositoryComparison.failure);
    }
  }

  if (primary !== null) {
    if (primary instanceof SmokeError) throw primary;
    throw new SmokeError("smoke_output_invalid", "TASK-491 adapter failed", { cause: primary });
  }
  if (accepted === null || screenshots === null || workers === null) {
    throw new SmokeError("smoke_output_invalid", "TASK-491 adapter execution is incomplete");
  }
  const result = projectTask491AdapterResult({
    accepted,
    screenshots,
    proof: requireProof(finalProof),
    workers,
    repositorySnapshots: context.repository.count(),
  });
  assertTask491SafeProjection(result, [
    process.env.CODERSO_PLAYWRIGHT_EMAIL ??
      process.env.PLAYWRIGHT_ADMIN_EMAIL ??
      process.env.ADMIN_EMAIL ??
      "",
    process.env.CODERSO_PLAYWRIGHT_PASSWORD ??
      process.env.PLAYWRIGHT_ADMIN_PASSWORD ??
      process.env.ADMIN_PASSWORD ??
      "",
    context.root,
    workspace?.path ?? "",
  ]);
  return result;
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-491",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask491Adapter,
  evidenceDirectory(input: SmokeInput, root: string) {
    return resolveInsideRoot(root, `${EVIDENCE_ROOT}/${input.session}`, "task_491_evidence");
  },
});

export default adapter;
