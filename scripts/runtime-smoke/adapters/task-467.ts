// TASK-467 lazy widget editor smoke adapter: orchestrates the worker-created
// admin identity, the shared Playwright dispatch loop over the Widget Library
// drawer, strict receipt validation, screenshot evidence, and full cleanup.
import { createHash, randomBytes } from "node:crypto";

import { appendDiagnostics } from "../diagnostics";
import { resolveInsideRoot, SmokeError, type SmokeInput } from "../contracts";
import { BrowserTransport } from "../browser/transport";
import { PlaywrightCliDispatcher } from "../browser/playwright-cli-dispatcher";
import { compileBrowserDispatchPlan } from "../browser/segment-compiler";
import type { BrowserActionFrame, BrowserRunCodeDispatch } from "../browser/contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../lifecycle";
import {
  requireManifestableScenarioResults,
  type ManifestableSmokeScenarioResult,
} from "../visible-evidence";
import type { SmokeAdapter, SmokeAdapterResult } from "./types";
import { assertTask467AuthState, createTask467AuthState } from "./task-467/auth";
import { buildTask467Scenarios } from "./task-467/assertions";
import {
  materializeTask467BrowserAction,
  type Task467BrowserConfig,
} from "./task-467/browser-actions";
import {
  TASK467_ADMIN_URL,
  TASK467_BLOCK_CONTROL_ID,
  TASK467_CHUNK_GLOB,
  TASK467_FALLBACK_COLOR,
  TASK467_FALLBACK_COLOR_RGB,
  TASK467_SCENARIOS,
  TASK467_SCENARIO_IDS,
  TASK467_WIDGET_TYPE,
  validateTask467ReceiptShape,
  type Task467BrowserReceipt,
  type Task467ScenarioId,
} from "./task-467/contracts";
import {
  buildTask467EvidenceManifest,
  persistTask467Screenshots,
} from "./task-467/output-manifest";
import { createTask467PrivateWorkspace, type Task467Workspace } from "./task-467/workspace";
import {
  createTask467BootstrapInput,
  createTask467RecoveryAuthority,
  TASK467_WORKER_DESCRIPTORS,
  createTask467WorkerPool,
  createTask467WorkerRegistry,
  type Task467BootstrapOutput,
  type Task467CleanupOutput,
  type Task467ProofOutput,
  type Task467RecoveryAuthority,
} from "./task-467/worker-operations";
import { WorkerPool } from "../workers/pool";

function manifestDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sourceReceipt(frame: BrowserActionFrame): unknown {
  if (frame.status !== "success") {
    console.error(
      `[DIAG] frame failure actionId=${frame.actionId} code=${frame.failureCode ?? "none"}`
    );
    throw new SmokeError("smoke_output_invalid", "TASK-467 browser action failed");
  }
  return frame.output;
}

class Task467FixtureCleanup implements LifecycleResource {
  readonly name = "task467-fixture-cleanup";
  readonly #workers: WorkerPool;
  readonly #authority: Task467RecoveryAuthority;
  #output: Task467CleanupOutput | null = null;
  #closed: Promise<void> | null = null;

  constructor(workers: WorkerPool, authority: Task467RecoveryAuthority) {
    this.#workers = workers;
    this.#authority = authority;
  }

  output(): Task467CleanupOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closed ??= this.#closeOnce();
    return this.#closed;
  }

  async #closeOnce(): Promise<void> {
    const output = (await this.#workers.dispatch(
      TASK467_WORKER_DESCRIPTORS.cleanup,
      this.#authority
    )) as Task467CleanupOutput;
    this.#output = output;
    this.#workers.recordDatabaseBatch(output.statements, output.rows);
    if (
      output.preIdentityAbsenceProved !== true ||
      output.identityAbsenceProved !== true ||
      output.usersRemoved !== 1 ||
      output.rolesRemoved !== 1
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-467 fixture cleanup proof is incomplete");
    }
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#output?.preIdentityAbsenceProved === true && this.#output.identityAbsenceProved === true
    );
  }
}

async function closeAndProve(resource: LifecycleResource | null): Promise<void> {
  if (resource === null) return;
  await resource.close();
  if (!(await resource.proveAbsent())) {
    throw new SmokeError("smoke_cleanup_failed", `${resource.name} remained active`);
  }
}

async function ready(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    await response.body?.cancel();
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}

export async function runTask467Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  if (context.input.suite !== "task-467" || context.input.profile !== "fast") {
    throw new SmokeError("smoke_argument_invalid", "TASK-467 suite supports only the fast profile");
  }
  context.lifecycle.assertAccepting();
  const manifest = buildTask467EvidenceManifest(context.root, context.input.session);
  const before = await context.timing.measure("snapshot", "task467-before", () =>
    context.repository.snapshot(manifest.screenshotPaths)
  );
  const marker = randomBytes(12).toString("hex");
  const recoveryKey = randomBytes(32).toString("base64url");
  const authority = createTask467RecoveryAuthority({
    profile: "fast",
    runMarker: marker,
    recoveryKey,
  });
  const password = randomBytes(24).toString("base64url");
  const email = `task467-${marker}-admin@smoke.invalid`;
  let workers: WorkerPool | null = null;
  let cleanup: Task467FixtureCleanup | null = null;
  let bootstrap: Task467BootstrapOutput | null = null;
  let workspace: Task467Workspace | null = null;
  let transport: BrowserTransport | null = null;
  let dispatcher: PlaywrightCliDispatcher | null = null;
  let primary: unknown | null = null;
  let scenarios: readonly ManifestableSmokeScenarioResult[] | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let receipts: ReadonlyMap<Task467ScenarioId, Task467BrowserReceipt> | null = null;
  let terminal: Task467ProofOutput | null = null;

  try {
    const adminReady = await ready(`${TASK467_ADMIN_URL}/`);
    if (!adminReady) {
      throw new SmokeError(
        "smoke_process_failed",
        "TASK-467 admin dev server is not reachable; start the local dev stack first"
      );
    }
    workers = await createTask467WorkerPool(context, createTask467WorkerRegistry());
    cleanup = new Task467FixtureCleanup(workers, authority);
    context.lifecycle.register(cleanup);
    bootstrap = (await workers.dispatch(
      TASK467_WORKER_DESCRIPTORS.bootstrap,
      createTask467BootstrapInput({ authority, email, password })
    )) as Task467BootstrapOutput;
    workers.recordDatabaseBatch(bootstrap.statements, bootstrap.rows);
    workspace = await createTask467PrivateWorkspace(context);
    const authState = await createTask467AuthState({
      adminUrl: TASK467_ADMIN_URL,
      workspace: workspace.path,
      storageStatePath: workspace.authStatePath,
      adminEmail: email,
      adminPassword: password,
      environment: process.env,
    });
    assertTask467AuthState(authState);

    const planActions = TASK467_SCENARIO_IDS.map((scenarioId, index) =>
      Object.freeze({
        id: `task467-action-${String(index + 1).padStart(2, "0")}`,
        scenarioId,
        lane: "run-code" as const,
        captureOutputs: Object.freeze([`receipt-${String(index + 1).padStart(2, "0")}`]),
        isolated: true,
      })
    );
    const plan = compileBrowserDispatchPlan(planActions);
    const segments = plan.dispatches.filter(
      (dispatch): dispatch is BrowserRunCodeDispatch => dispatch.kind === "run-code"
    );
    dispatcher = new PlaywrightCliDispatcher({
      context,
      session: context.input.session,
      workspace: workspace.path,
      segments: Object.freeze([...segments.map(({ segmentId }) => segmentId), "task467-warmup"]),
      runCodeTimeoutMs: 300_000,
    });
    transport = new BrowserTransport(context.input.session, dispatcher);
    context.lifecycle.register(transport);
    await dispatcher.loadStorageState(workspace.authStatePath);

    const warmupSegment = Object.freeze({
      schemaVersion: 1,
      kind: "run-code",
      segmentId: "task467-warmup",
      scenarioId: "wizard-lazy-fallback",
      actionIds: Object.freeze(["task467-warmup-action"]),
      estimatedSourceBytes: 0,
    }) as BrowserRunCodeDispatch;
    const warmupExpectation = Object.freeze({
      runId: marker,
      manifestSha256: manifestDigest(manifest),
      scenarioId: "wizard-lazy-fallback",
      segmentId: warmupSegment.segmentId,
      actionIds: warmupSegment.actionIds,
    });
    const warmupSource = `async (page) => {
      await page.context().setExtraHTTPHeaders({ "User-Agent": ${JSON.stringify(`task467-smoke/${marker.slice(0, 8)}`)} }).catch(() => undefined);
      await page.goto(${JSON.stringify(`${TASK467_ADMIN_URL}/advanced/widgets`)}, { waitUntil: "domcontentloaded", timeout: 180000 });
      const url = page.url();
      const bodyText = await page.locator("body").innerText({ timeout: 30000 }).catch(() => "");
      const sectionButtons = await page.getByRole("button", { name: "Section", exact: true }).count();
      const heading = await page.locator("h1, h2").first().innerText({ timeout: 15000 }).catch(() => "");
      return { warmed: sectionButtons > 0, url, heading, sectionButtons, bodyPreview: bodyText.slice(0, 400) };
    }`;
    const warmupFrames = await transport.runSegment(
      Object.freeze({
        segment: warmupSegment,
        actions: Object.freeze([{ actionId: "task467-warmup-action", source: warmupSource }]),
      }),
      warmupExpectation
    );
    if (warmupFrames.length !== 1 || warmupFrames[0]?.status !== "success") {
      const retryFrames = await transport
        .runSegment(
          Object.freeze({
            segment: warmupSegment,
            actions: Object.freeze([{ actionId: "task467-warmup-action", source: warmupSource }]),
          }),
          warmupExpectation
        )
        .catch(() => []);
      if (retryFrames.length !== 1 || retryFrames[0]?.status !== "success") {
        throw new SmokeError("smoke_output_invalid", "TASK-467 warmup could not converge");
      }
    }

    const scenarioTimes = new Map<Task467ScenarioId, number>(
      TASK467_SCENARIO_IDS.map((scenarioId) => [scenarioId, 0])
    );
    const completedReceipts: { readonly scenarioId: Task467ScenarioId }[] = [];
    const receiptList: {
      readonly scenarioId: Task467ScenarioId;
      readonly receipt: Task467BrowserReceipt;
    }[] = [];
    const browserRunStartedAtEpochMs = Date.now();
    for (const [index, scenarioId] of TASK467_SCENARIO_IDS.entries()) {
      const segment = segments[index];
      const descriptor = TASK467_SCENARIOS.find(({ id }) => id === scenarioId);
      if (descriptor === undefined || segment === undefined || segment.actionIds.length !== 1) {
        throw new SmokeError("smoke_output_invalid", "TASK-467 browser plan drifted");
      }
      const config: Task467BrowserConfig = {
        scenarioId,
        adminUrl: TASK467_ADMIN_URL,
        widgetType: TASK467_WIDGET_TYPE,
        chunkGlob: TASK467_CHUNK_GLOB,
        fallbackColor: TASK467_FALLBACK_COLOR,
        fallbackColorRgb: TASK467_FALLBACK_COLOR_RGB,
        controlId: TASK467_BLOCK_CONTROL_ID,
        browserRunStartedAtEpochMs,
      };
      const started = performance.now();
      const source = materializeTask467BrowserAction(config);
      let frames;
      try {
        frames = await transport.runSegment(
          Object.freeze({
            segment,
            actions: Object.freeze([{ actionId: segment.actionIds[0] ?? "", source }]),
          }),
          Object.freeze({
            runId: marker,
            manifestSha256: manifestDigest(manifest),
            scenarioId: descriptor.id,
            segmentId: segment.segmentId,
            actionIds: segment.actionIds,
          })
        );
      } catch (error) {
        throw error;
      }
      if (frames.length !== 1 || frames[0] === undefined) {
        throw new SmokeError(
          "smoke_output_invalid",
          "TASK-467 browser frame cardinality is invalid"
        );
      }
      const frame = frames[0];
      const output = sourceReceipt(frame);
      const raw = output as { readonly ok?: unknown; readonly error?: unknown };
      if (raw.ok === false) {
        throw new SmokeError(
          "smoke_output_invalid",
          `TASK-467 scenario ${scenarioId} action failed: ${String(raw.error ?? "unknown").slice(0, 300)}`
        );
      }
      const receipt = validateTask467ReceiptShape(output, scenarioId);
      if (!receipt.ok) {
        throw new SmokeError(
          "smoke_output_invalid",
          `TASK-467 scenario ${scenarioId} failed: ${receipt.error ?? "receipt_ok_false"}`
        );
      }
      if (receipt.consoleErrorDelta !== 0) {
        throw new SmokeError(
          "smoke_output_invalid",
          `TASK-467 scenario ${scenarioId} emitted console errors`
        );
      }
      receiptList.push(Object.freeze({ scenarioId, receipt }));
      completedReceipts.push(Object.freeze({ scenarioId }));
      scenarioTimes.set(scenarioId, Math.ceil(performance.now() - started));
    }
    if (
      completedReceipts.length !== TASK467_SCENARIO_IDS.length ||
      completedReceipts.some(({ scenarioId }, index) => scenarioId !== TASK467_SCENARIO_IDS[index])
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-467 receipt matrix is incomplete");
    }
    receipts = new Map(receiptList.map(({ scenarioId, receipt }) => [scenarioId, receipt]));
    const screenshotMap = await persistTask467Screenshots({
      root: context.root,
      session: context.input.session,
      receipts,
    });
    screenshots = TASK467_SCENARIO_IDS.map((scenarioId) => {
      const screenshot = screenshotMap.get(scenarioId);
      if (screenshot === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-467 screenshot output is incomplete");
      }
      return screenshot;
    });
    const builtScenarios = buildTask467Scenarios({
      scenarioIds: TASK467_SCENARIO_IDS,
      receipts,
      screenshotsByScenario: screenshotMap,
      scenarioTimes,
    });
    scenarios = requireManifestableScenarioResults(builtScenarios, screenshots);
  } catch (error) {
    primary = error;
    appendDiagnostics(context.root, context.input.session, [
      `=== TASK-467 adapter failure ${new Date().toISOString()} ===`,
      `primary=${primary instanceof SmokeError ? primary.code : "unknown"} :: ${
        primary instanceof Error ? primary.message : String(primary)
      }`,
    ]);
  }

  const cleanupErrors: unknown[] = [];
  for (const resource of [transport, workspace, cleanup] as const) {
    try {
      await closeAndProve(resource);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null && cleanup !== null) {
    try {
      terminal = (await workers.dispatch(
        TASK467_WORKER_DESCRIPTORS.prove,
        authority
      )) as Task467ProofOutput;
      workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (terminal.identitiesAbsent !== true || terminal.receiptsAbsent !== true) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-467 terminal proof is incomplete");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null) {
    try {
      await workers.close();
      if (!(await workers.proveAbsent())) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-467 worker remained active");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  let afterFailure: unknown | null = null;
  try {
    const after = await context.timing.measure("snapshot", "task467-after", () =>
      context.repository.snapshot(manifest.screenshotPaths)
    );
    context.repository.assertUnchanged(before, after, manifest.screenshotPaths);
  } catch (error) {
    afterFailure = error;
  }
  if (primary !== null || cleanupErrors.length > 0 || afterFailure !== null) {
    const errors = [primary, ...cleanupErrors, afterFailure].filter(
      (error): error is unknown => error !== null
    );
    if (primary instanceof SmokeError && errors.length === 1) throw primary;
    throw new SmokeError(
      primary instanceof SmokeError ? primary.code : "smoke_cleanup_failed",
      "TASK-467 adapter failed",
      { cause: new AggregateError(errors) }
    );
  }
  if (
    workers === null ||
    cleanup === null ||
    terminal === null ||
    scenarios === null ||
    screenshots === null ||
    receipts === null ||
    bootstrap === null
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-467 adapter execution is incomplete");
  }
  const cleanupOutput = cleanup.output();
  if (cleanupOutput === null) {
    throw new SmokeError("smoke_output_invalid", "TASK-467 cleanup output is absent");
  }
  const result: SmokeAdapterResult = Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: scenarios as SmokeAdapterResult["scenarios"],
    screenshots,
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      sessionsRemoved: cleanupOutput.sessionsRemoved,
      auditRowsRemoved: cleanupOutput.auditRowsRemoved,
      accessLogsRemoved: cleanupOutput.accessLogsRemoved,
      userRolesRemoved: cleanupOutput.userRolesRemoved,
      usersRemoved: cleanupOutput.usersRemoved,
      rolesRemoved: cleanupOutput.rolesRemoved,
      workerStarts: workers.counters().starts,
      workerRequests: workers.counters().requests,
      databaseBatches: workers.counters().databaseBatches,
      statements: workers.counters().statements,
      rows: workers.counters().rows,
      pageErrors: 0,
      repositorySnapshots: context.repository.count(),
      identitiesAbsent: true,
      receiptsAbsent: true,
      scenariosPassed: TASK467_SCENARIO_IDS.length,
    }),
  });
  return result;
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-467" as SmokeInput["suite"],
  supportedProfiles: Object.freeze(["fast"] as const),
  run: runTask467Adapter,
  evidenceDirectory(input: SmokeInput, root: string) {
    return resolveInsideRoot(
      root,
      `_docs/_workflows/_smoke/task-467/${input.session.toLowerCase().replace(/[^a-z0-9_-]+/gu, "-")}`,
      "task_467_evidence"
    );
  },
});

export default adapter;
