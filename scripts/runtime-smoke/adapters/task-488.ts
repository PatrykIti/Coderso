import { randomBytes } from "node:crypto";

import { SmokeError, type SmokeInput } from "../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../lifecycle";
import type { SupervisedServerResource } from "../server/supervised-server";
import type { WorkerPool } from "../workers/pool";
import { requireManifestableScenarioResults } from "../visible-evidence";
import type { SmokeAdapter, SmokeAdapterResult } from "./types";
import {
  projectTask488ScenarioResults,
  validateExactTask488Observations,
  type Task488AcceptedObservations,
} from "./task-488/assertions";
import {
  createTask488BrowserRuntime,
  executeTask488Segments,
  materializeTask488BrowserDispatchPlan,
  type Task488BrowserRuntime,
} from "./task-488/browser-actions";
import { task488AdminCredentials } from "./task-488/browser-input";
import {
  compareTask488RepositoryNeverThrow,
  createTask488CleanupResources,
  finalizeTask488ResourcesNeverThrow,
  preserveTask488PrimaryFailure,
  restoreTask488AuthWindowNeverThrow,
  type Task488FinalCleanupProof,
} from "./task-488/cleanup";
import {
  createTask488FixtureSpec,
  createTask488WorkerPool,
  type Task488FixtureSpec,
} from "./task-488/fixture";
import { startTask488DevHost, task488TimingPolicy } from "./task-488/host";
import {
  assertExactTask488Invocation,
  assertExactTask488ScreenshotManifest,
  buildExactTask488ScreenshotManifest,
  task488EvidenceDirectory,
  validateTask488ScreenshotOutputs,
  type Task488ScreenshotManifest,
} from "./task-488/output-manifest";
import { createTask488PrivateWorkspace, type Task488PrivateWorkspace } from "./task-488/workspace";
import {
  TASK_488_WORKER_DESCRIPTORS,
  type Task488InstallOutput,
} from "./task-488/worker-operations";

export function projectTask488AdapterResult(input: {
  readonly scenarios: SmokeAdapterResult["scenarios"];
  readonly screenshots: SmokeAdapterResult["screenshots"];
  readonly proof: Task488FinalCleanupProof;
  readonly workers: WorkerPool;
  readonly repositorySnapshots: number;
}): SmokeAdapterResult {
  const counters = input.workers.counters();
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: input.scenarios,
    screenshots: input.screenshots,
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      deletedProducts: input.proof.cleanup.deletedProducts,
      deletedCollections: input.proof.cleanup.deletedCollections,
      productAbsenceProved: input.proof.terminal.productAbsent,
      collectionAbsenceProved: input.proof.terminal.collectionAbsent,
      adminPathUnchanged: input.proof.terminal.adminPathUnchanged,
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

function requireProof(proof: Task488FinalCleanupProof | null): Task488FinalCleanupProof {
  if (proof === null) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-488 cleanup proof is absent");
  }
  return proof;
}

function assertFixtureMatchesInstall(
  fixture: Task488FixtureSpec,
  install: Task488InstallOutput
): void {
  if (
    fixture.marker !== install.marker ||
    fixture.adminPath !== install.adminPath ||
    fixture.productSlug !== install.productSlug ||
    fixture.collectionSlug !== install.collectionSlug ||
    fixture.productTitle !== install.productTitle ||
    fixture.collectionName !== install.collectionName
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 fixture drifted from its install");
  }
}

function assertTask488SafeProjection(value: unknown, forbidden: readonly string[]): void {
  const unique = [...new Set(forbidden)].filter((item) => item.length > 0);
  if (unique.length === 0) return;
  const pending: unknown[] = [value];
  const seen = new Set<object>();
  let visited = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    visited += 1;
    if (visited > 100_000) {
      throw new SmokeError("smoke_output_invalid", "TASK-488 safe projection exceeds its bound");
    }
    if (typeof current === "string") {
      if (unique.some((secret) => current.includes(secret))) {
        throw new SmokeError(
          "smoke_output_invalid",
          "TASK-488 safe projection contains private material"
        );
      }
      continue;
    }
    if (current === null || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    pending.push(...Object.values(current));
  }
}

export async function runTask488Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask488Invocation(context.input);
  const manifest: Task488ScreenshotManifest = buildExactTask488ScreenshotManifest(context.input);
  assertExactTask488ScreenshotManifest(manifest, context.input);
  const timing = task488TimingPolicy(context.input.profile);
  const before = await context.timing.measure("snapshot", "task488-before", () =>
    context.repository.snapshot(manifest.paths)
  );

  let workers: WorkerPool | null = null;
  let install: Task488InstallOutput | null = null;
  let fixture: Task488FixtureSpec | null = null;
  let cleanup: ReturnType<typeof createTask488CleanupResources> | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Task488PrivateWorkspace | null = null;
  let browser: Task488BrowserRuntime | null = null;
  let browserResource: LifecycleResource | null = null;
  let accepted: Task488AcceptedObservations | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let primary: unknown | null = null;
  let finalProof: Task488FinalCleanupProof | null = null;

  try {
    workers = await context.timing.measure("phase", "task488-workers", () =>
      createTask488WorkerPool(context)
    );
    const marker = randomBytes(6).toString("hex");
    install = (await context.timing.measure("phase", "task488-install", () =>
      workers!.dispatch(TASK_488_WORKER_DESCRIPTORS.install, Object.freeze({ marker }))
    )) as Task488InstallOutput;
    workers.recordDatabaseBatch(install.statements, install.rows);
    fixture = createTask488FixtureSpec(install.marker, install.adminPath);
    assertFixtureMatchesInstall(fixture, install);
    cleanup = createTask488CleanupResources({
      lifecycle: context.lifecycle,
      workers,
      descriptors: TASK_488_WORKER_DESCRIPTORS,
      fixtureInputs: Object.freeze({
        productSlug: fixture.productSlug,
        collectionSlug: fixture.collectionSlug,
        adminPath: fixture.adminPath,
      }),
    });
    // The admin SPA fires several /auth/* requests per boot and every one
    // consumes the shared auth rate-limit bucket; ten scenario boots exceed a
    // 60s window, so the suite shortens the window BEFORE the dev host reads
    // the settings (its first request caches the patched value).
    await context.timing.measure("phase", "task488-auth-window", () =>
      workers!.dispatch(TASK_488_WORKER_DESCRIPTORS.authPrepare, Object.freeze({ marker }))
    );
    server = await context.timing.measure("phase", "task488-server", () =>
      startTask488DevHost(context, { adminPath: install!.adminPath, timing })
    );
    workspace = await context.timing.measure("phase", "task488-workspace", () =>
      createTask488PrivateWorkspace(context)
    );
    const credentials = task488AdminCredentials(process.env);
    const plan = await context.timing.measure("phase", "task488-browser-plan", () =>
      materializeTask488BrowserDispatchPlan({
        root: context.root,
        manifest,
        fixture: fixture!,
        credentials,
        fixtureDigest: fixture!.fixtureDigest,
      })
    );
    browser = await context.timing.measure("phase", "task488-browser-start", async () =>
      createTask488BrowserRuntime({
        context,
        workspace: workspace!.path,
        plan,
        dispatchTimeoutMs: timing.browserDispatchTimeoutMs,
        onResourceRegistered: (resource) => {
          browserResource = resource;
        },
      })
    );
    const observations = await context.timing.measure("phase", "task488-browser", () =>
      executeTask488Segments({
        plan,
        transport: browser!.transport,
        fixtureDigest: fixture!.fixtureDigest,
        manifest,
      })
    );
    accepted = validateExactTask488Observations({
      observations,
      manifest,
      fixtureDigest: fixture.fixtureDigest,
    });
  } catch (error) {
    primary = error;
  }

  if (workers !== null) {
    const authWindowFailures =
      fixture !== null
        ? await context.timing.measure("cleanup", "task488-auth-window-restore", () =>
            restoreTask488AuthWindowNeverThrow({
              workers,
              descriptor: TASK_488_WORKER_DESCRIPTORS.authRestore,
              marker: fixture!.marker,
            })
          )
        : Object.freeze([]);
    const finalization = await context.timing.measure("cleanup", "task488-resources", () =>
      finalizeTask488ResourcesNeverThrow({
        browser: browserResource ?? browser?.transport ?? null,
        workspace,
        server,
        cleanup,
        workers,
        proofDescriptor: TASK_488_WORKER_DESCRIPTORS.prove,
        proofInput:
          fixture !== null
            ? Object.freeze({
                productSlug: fixture.productSlug,
                collectionSlug: fixture.collectionSlug,
                adminPath: fixture.adminPath,
              })
            : undefined,
      })
    );
    finalProof = finalization.proof;
    primary = preserveTask488PrimaryFailure(
      primary,
      [...finalization.failures, ...authWindowFailures],
      null
    );
  }

  if (primary === null && accepted !== null) {
    try {
      screenshots = await context.timing.measure("phase", "task488-screenshots", () =>
        validateTask488ScreenshotOutputs(context.root, context.input, manifest)
      );
    } catch (error) {
      primary = error;
    }
  }

  const repository = await context.timing.measure("snapshot", "task488-after", () =>
    compareTask488RepositoryNeverThrow({
      guard: context.repository,
      before,
      allowedPaths: manifest.paths,
    })
  );
  primary = preserveTask488PrimaryFailure(primary, [], repository.failure);
  if (primary !== null) throw primary;
  if (workers === null || fixture === null || accepted === null || screenshots === null) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 execution is incomplete");
  }

  const projected = projectTask488ScenarioResults(accepted.observations, screenshots, context.root);
  const scenarios = requireManifestableScenarioResults(projected, screenshots);
  const result = projectTask488AdapterResult({
    scenarios,
    screenshots,
    proof: requireProof(finalProof),
    workers,
    repositorySnapshots: context.repository.count(),
  });
  const credentials = task488AdminCredentials(process.env);
  assertTask488SafeProjection(result, [
    credentials.email,
    credentials.password,
    context.root,
    workspace?.path ?? "",
    fixture.marker,
  ]);
  return result;
}

// Registered suites are enumerated in `contracts.ts` (`SUITE_IDS`) and
// `registry.ts`. TASK-488 registration is a separate board step outside this
// adapter's scope; the cast keeps this module type-clean until registration.
const adapter = Object.freeze({
  suiteId: "task-488",
  supportedProfiles: Object.freeze(["fast"] as const),
  run: runTask488Adapter,
  evidenceDirectory(input: SmokeInput, root: string) {
    return task488EvidenceDirectory(input, root);
  },
}) as unknown as SmokeAdapter;

export default adapter;
