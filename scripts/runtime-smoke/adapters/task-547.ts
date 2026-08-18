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
  assertTask547SafeProjection,
  validateExactTask547Observations,
  type Task547AcceptedObservations,
} from "./task-547/assertions";
import {
  createTask547BrowserRuntime,
  executeTask547Segments,
  materializeTask547BrowserDispatchPlan,
  type Task547BrowserRuntime,
} from "./task-547/browser-segments";
import {
  compareTask547RepositoryNeverThrow,
  createTask547CleanupResources,
  finalizeTask547ResourcesNeverThrow,
  preserveTask547PrimaryFailure,
  type Task547CleanupResources,
  type Task547FinalCleanupProof,
  type Task547FinalizationFailure,
} from "./task-547/cleanup";
import { task547ScenarioDescriptors } from "./task-547/descriptors";
import { createTask547WorkerPool, installTask547FixtureInBatches } from "./task-547/fixture";
import { startTask547DevHost, task547TimingPolicy } from "./task-547/host";
import { RuntimeSmokeRoutingSettingsLease } from "./routing-settings-lease";
import {
  assertExactTask547ScreenshotManifest,
  buildExactTask547ScreenshotManifest,
  EVIDENCE_ROOT,
  validateTask547ScreenshotOutputs,
  type Task547ScreenshotManifest,
} from "./task-547/output-manifest";
import {
  createTask547WorkerRegistry,
  TASK547_WORKER_DESCRIPTORS,
  type Task547InstallOutput,
} from "./task-547/worker-operations";
import { createTask547PrivateWorkspace, type Task547PrivateWorkspace } from "./task-547/workspace";

export interface Task547AdapterProjectionInput {
  readonly accepted: Task547AcceptedObservations;
  readonly screenshots: SmokeAdapterResult["screenshots"];
  readonly proof: Task547FinalCleanupProof;
  readonly workers: WorkerPool;
  readonly repositorySnapshots: number;
}

export function assertExactTask547Invocation(value: unknown): void {
  if (!isPlainObject(value)) {
    throw new SmokeError("smoke_argument_invalid", "TASK-547 invocation is invalid");
  }
  assertExactKeys(value, ["command", "suite", "profile", "session"], "TASK-547 invocation");
  if (
    value.command !== "run" ||
    value.suite !== "task-547" ||
    (value.profile !== "fast" && value.profile !== "certification") ||
    typeof value.session !== "string"
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-547 invocation is invalid");
  }
}

export function projectTask547AdapterResult(
  input: Task547AdapterProjectionInput
): SmokeAdapterResult {
  const counters = input.workers.counters();
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: input.accepted.scenarios,
    screenshots: input.screenshots,
    consoleErrors: input.accepted.consoleErrors,
    cleanup: Object.freeze({
      deletedSubmissions: input.proof.submissions.deletedSubmissions,
      deletedActionRuns: input.proof.submissions.deletedActionRuns,
      restoredResourceSlots: input.proof.reset.restoredSlots.length,
      officialRollbackCalls: input.proof.rollback.officialRollbackCalls,
      priorSettingsRestored: input.proof.rollback.priorSettingsRestored,
      resourceAbsenceProved: input.proof.rollback.resourceAbsenceProved,
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

function requireProof(proof: Task547FinalCleanupProof | null): Task547FinalCleanupProof {
  if (proof === null) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-547 cleanup proof is absent");
  }
  return proof;
}

function privateProjectionValues(
  fixture: Task547InstallOutput,
  context: RuntimeSmokeContext,
  workspace: Task547PrivateWorkspace | null
): readonly string[] {
  return Object.freeze([
    fixture.sourceRunId,
    fixture.actorId,
    fixture.publicFormId,
    fixture.internalFormId,
    fixture.homePageId,
    fixture.projectsPageId,
    fixture.contactPageId,
    fixture.apiKeySecret,
    ...Object.values(fixture.markers),
    context.root,
    workspace?.path ?? "",
  ]);
}

export async function runTask547Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask547Invocation(context.input);
  const descriptors = task547ScenarioDescriptors(context.input.profile);
  const manifest: Task547ScreenshotManifest = buildExactTask547ScreenshotManifest(context.input);
  assertExactTask547ScreenshotManifest(manifest, descriptors);
  const timing = task547TimingPolicy(context.input.profile);
  const before = await context.timing.measure("snapshot", "task547-before", () =>
    context.repository.snapshot(manifest.paths)
  );

  let workers: WorkerPool | null = null;
  let fixture: Task547InstallOutput | null = null;
  let cleanup: Task547CleanupResources | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Task547PrivateWorkspace | null = null;
  let browser: Task547BrowserRuntime | null = null;
  let browserResource: LifecycleResource | null = null;
  let accepted: Task547AcceptedObservations | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let primary: unknown | null = null;
  let finalProof: Task547FinalCleanupProof | null = null;
  let routingLease: RuntimeSmokeRoutingSettingsLease | null = null;
  let routingRestored = false;
  const leaseFailures: Task547FinalizationFailure[] = [];

  try {
    workers = await context.timing.measure("phase", "task547-workers", () =>
      createTask547WorkerPool(context, createTask547WorkerRegistry())
    );
    fixture = await context.timing.measure("phase", "task547-install", () =>
      installTask547FixtureInBatches(
        workers!,
        TASK547_WORKER_DESCRIPTORS.install,
        randomBytes(6).toString("hex")
      )
    );
    workers.recordDatabaseBatch(fixture.statements, fixture.rows);
    cleanup = createTask547CleanupResources({
      lifecycle: context.lifecycle,
      workers,
      descriptors: TASK547_WORKER_DESCRIPTORS,
    });
    // The dev host resolves the admin base path from the DB at boot, so the
    // routing targets must be applied BEFORE it spawns and restored once the
    // suite is done (TASK-547 runtime-smoke fix, shared task-540 lease). The
    // browser scenarios hardcode `/admin` and the readiness probes hit `/` and
    // `/admin/`, which only hold while `site.adminPath` is pinned to `/admin`
    // and `site.homepageId` points at an existing published page. The fixture
    // is installed before this point, so pin the lease to the fixture's
    // FormaDom `page:home` instead of the first-published-page fallback, which
    // would point the front probes at an arbitrary leftover fixture page.
    routingLease = new RuntimeSmokeRoutingSettingsLease();
    await context.timing.measure("phase", "routing-settings-apply", () =>
      routingLease!.apply({ homepageId: fixture!.homePageId })
    );
    server = await context.timing.measure("phase", "task547-server", () =>
      startTask547DevHost(context, { timing })
    );
    workspace = await context.timing.measure("phase", "task547-workspace", () =>
      createTask547PrivateWorkspace(context)
    );
    const plan = await context.timing.measure("phase", "task547-browser-plan", () =>
      materializeTask547BrowserDispatchPlan({
        root: context.root,
        descriptors,
        manifest,
        fixture: fixture!,
      })
    );
    browser = await context.timing.measure("phase", "task547-browser-start", () =>
      createTask547BrowserRuntime({
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
    const observations = await context.timing.measure("phase", "task547-browser", () =>
      executeTask547Segments({
        plan,
        transport: browser!.transport,
        workers: workers!,
        checkpointDescriptor: TASK547_WORKER_DESCRIPTORS.checkpoint,
        descriptors,
        manifest,
        installedDigest: fixture!.installedDigest,
        refreshAdminAuth: browser!.refreshAuth,
      })
    );
    accepted = validateExactTask547Observations({
      observations,
      descriptors,
      manifest,
      installedDigest: fixture.installedDigest,
    });
  } catch (error) {
    primary = error;
  } finally {
    // Restore the ambient routing settings in finally so a failed suite can
    // never leave `site.adminPath` / `site.homepageId` pinned. The lease is
    // idempotent: when apply() never completed, restore() is a safe no-op.
    if (routingLease !== null && !routingRestored) {
      try {
        await context.timing.measure("phase", "routing-settings-restore", () =>
          routingLease!.restore()
        );
        routingRestored = true;
      } catch (error) {
        leaseFailures.push(
          Object.freeze({ resource: "task547-routing-settings", phase: "close", error })
        );
      }
    }
  }

  if (workers !== null) {
    const finalization = await context.timing.measure("cleanup", "task547-resources", () =>
      finalizeTask547ResourcesNeverThrow({
        browser: browserResource ?? browser?.transport ?? null,
        workspace,
        server,
        cleanup,
        workers,
        proofDescriptor: TASK547_WORKER_DESCRIPTORS.prove,
      })
    );
    finalProof = finalization.proof;
    primary = preserveTask547PrimaryFailure(
      primary,
      [...finalization.failures, ...leaseFailures],
      null
    );
  }

  if (primary === null && accepted !== null) {
    try {
      screenshots = await context.timing.measure("phase", "task547-screenshots", () =>
        validateTask547ScreenshotOutputs(context.root, manifest)
      );
    } catch (error) {
      primary = error;
    }
  }

  const repository = await context.timing.measure("snapshot", "task547-after", () =>
    compareTask547RepositoryNeverThrow({
      guard: context.repository,
      before,
      allowedPaths: manifest.paths,
    })
  );
  primary = preserveTask547PrimaryFailure(primary, [], repository.failure);
  if (primary !== null) throw primary;
  if (workers === null || fixture === null || accepted === null || screenshots === null) {
    throw new SmokeError("smoke_output_invalid", "TASK-547 execution is incomplete");
  }

  const result = projectTask547AdapterResult({
    accepted,
    screenshots,
    proof: requireProof(finalProof),
    workers,
    repositorySnapshots: context.repository.count(),
  });
  assertTask547SafeProjection(result, privateProjectionValues(fixture, context, workspace));
  return result;
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-547",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask547Adapter,
  evidenceDirectory(input: SmokeInput, root: string) {
    return resolveInsideRoot(root, `${EVIDENCE_ROOT}/${input.session}`, "task_547_evidence");
  },
});

export default adapter;
