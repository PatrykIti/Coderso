import { createHash, randomBytes } from "node:crypto";
import { join } from "node:path";

import { resolveInsideRoot, SmokeError, type SmokeInput } from "../contracts";
import { appendDiagnostics } from "../diagnostics";
import {
  createAdminAuthStorageState,
  type AdminAuthStorageStateResult,
} from "../browser/admin-auth";
import { RuntimeSmokeRoutingSettingsLease } from "./routing-settings-lease";
import { BrowserTransport } from "../browser/transport";
import { PlaywrightCliDispatcher } from "../browser/playwright-cli-dispatcher";
import { compileBrowserDispatchPlan } from "../browser/segment-compiler";
import type { BrowserActionFrame, BrowserRunCodeDispatch } from "../browser/contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../lifecycle";
import type { SupervisedServerResource } from "../server/supervised-server";
import type { SmokeAdapter, SmokeAdapterResult, SmokeScenarioResult } from "./types";
import {
  TASK490_SCENARIOS,
  TASK490_VARIANTS,
  assertTask490BrowserReceipt,
  buildTask490FixtureSpecs,
  materializeTask490BrowserAction,
  type Task490BrowserFixture,
  type Task490ScenarioDescriptor,
  type Task490Variant,
} from "./task-490/browser-actions";
import {
  buildExactTask490ScreenshotManifest,
  assertExactTask490ScreenshotManifest,
  validateTask490ScreenshotOutputs,
  TASK490_EVIDENCE_ROOT,
} from "./task-490/output-manifest";
import { startTask490DevHost } from "./task-490/host";
import { createTask490PrivateWorkspace } from "./task-490/workspace";
import {
  TASK490_WORKER_DESCRIPTORS,
  createTask490InstallInput,
  createTask490RecoveryAuthority,
  createTask490WorkerPool,
  createTask490WorkerRegistry,
  type Task490CleanupOutput,
  type Task490InstallOutput,
  type Task490ProofOutput,
  type Task490RecoveryAuthority,
} from "./task-490/worker-operations";
import type { WorkerPool } from "../workers/pool";

export {
  assertExactTask490ScreenshotManifest,
  buildExactTask490ScreenshotManifest,
} from "./task-490/output-manifest";

const ADMIN_ORIGIN = "http://127.0.0.1:5173";
const ADMIN_AUTH_FAILURE =
  /^(?:credentials_missing|login_network_failed|login_failed:[3-5]\d{2}|session_cookie_(?:missing|invalid))$/u;

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

export function assertTask490AdminAuthOutcome(
  outcome: unknown
): asserts outcome is AdminAuthStorageStateResult {
  if (outcome === null || typeof outcome !== "object" || Array.isArray(outcome)) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 authentication output is invalid");
  }
  const value = outcome as Record<string, unknown>;
  if (value.attempted !== true) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 authentication output is invalid");
  }
  if (
    value.authenticated === true &&
    hasExactKeys(value, ["attempted", "authenticated", "sessionValue"]) &&
    typeof value.sessionValue === "string" &&
    value.sessionValue.length > 0 &&
    Buffer.byteLength(value.sessionValue) <= 16 * 1024 &&
    !value.sessionValue.includes("\0")
  ) {
    return;
  }
  if (
    value.authenticated === false &&
    hasExactKeys(value, ["attempted", "authenticated", "error"]) &&
    typeof value.error === "string" &&
    ADMIN_AUTH_FAILURE.test(value.error)
  ) {
    throw new SmokeError("smoke_authentication_failed", "TASK-490 authentication failed");
  }
  throw new SmokeError("smoke_output_invalid", "TASK-490 authentication output is invalid");
}

export async function awaitTask490AdminAuthentication(
  authentication: Promise<AdminAuthStorageStateResult>,
  unexpectedServerExit: Promise<never>
): Promise<void> {
  const outcome = await Promise.race([authentication, unexpectedServerExit]);
  assertTask490AdminAuthOutcome(outcome);
}

class Task490FixtureCleanup implements LifecycleResource {
  readonly name = "task490-fixture-cleanup";
  readonly #workers: WorkerPool;
  readonly #authority: Task490RecoveryAuthority;
  #output: Task490CleanupOutput | null = null;
  #closed: Promise<void> | null = null;

  constructor(workers: WorkerPool, authority: Task490RecoveryAuthority) {
    this.#workers = workers;
    this.#authority = authority;
  }

  output(): Task490CleanupOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closed ??= this.#closeOnce();
    return this.#closed;
  }

  async #closeOnce(): Promise<void> {
    const output = (await this.#workers.dispatch(
      TASK490_WORKER_DESCRIPTORS.cleanup,
      this.#authority
    )) as Task490CleanupOutput;
    this.#output = output;
    this.#workers.recordDatabaseBatch(output.statements, output.rows);
    if (output.fixtureAbsenceProved !== true || output.identityAbsenceProved !== true) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-490 fixture cleanup proof is incomplete");
    }
  }

  async proveAbsent(): Promise<boolean> {
    return this.#output?.fixtureAbsenceProved === true;
  }
}

export function assertExactTask490Invocation(value: unknown): asserts value is SmokeInput {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new SmokeError("smoke_argument_invalid", "TASK-490 invocation is invalid");
  }
  const input = value as Record<string, unknown>;
  if (
    input.command !== "run" ||
    input.suite !== "task-490" ||
    (input.profile !== "fast" && input.profile !== "certification") ||
    typeof input.session !== "string" ||
    input.session.length === 0 ||
    !/^[a-z0-9][a-z0-9_-]{2,63}$/u.test(input.session)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-490 invocation is invalid");
  }
}

function manifestDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sourceReceipt(frame: BrowserActionFrame): unknown {
  if (frame.status !== "success") {
    console.error(
      `[DIAG] frame failure actionId=${frame.actionId} code=${frame.failureCode ?? "none"}`
    );
    throw new SmokeError("smoke_output_invalid", "TASK-490 browser action failed");
  }
  return frame.output;
}

function fixtureKey(scenarioId: string, variantId: string): string {
  return `${scenarioId}/${variantId}`;
}

function assertTask490CompletedReceipts(
  profile: "fast" | "certification",
  completed: readonly Readonly<{ readonly scenarioId: string; readonly variantId: string }>[]
): void {
  const expected = buildTask490FixtureSpecs(profile);
  if (
    completed.length !== expected.length ||
    completed.some(
      (receipt, index) =>
        receipt.scenarioId !== expected[index]?.scenarioId ||
        receipt.variantId !== expected[index]?.variantId
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 browser receipt matrix is incomplete");
  }
}

function buildTask490BrowserFixtures(input: {
  readonly profile: "fast" | "certification";
  readonly install: Task490InstallOutput;
}): readonly Task490BrowserFixture[] {
  return Object.freeze(
    buildTask490FixtureSpecs(input.profile).map((entry) =>
      Object.freeze({
        scenarioId: entry.scenarioId,
        variantId: entry.variantId,
        formId: input.install.formId,
        submissionId: input.install.submissionId,
        adminOrigin: ADMIN_ORIGIN,
        adminPath: input.install.adminPath,
        runMarker: input.install.runMarker,
      })
    )
  );
}

export function assertTask490SafeProjection(
  result: SmokeAdapterResult,
  privateValues: readonly string[]
): void {
  const encoded = JSON.stringify(result);
  if (privateValues.some((value) => value.length > 0 && encoded.includes(value))) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 report leaked private material");
  }
}

export function projectTask490AdapterResult(input: {
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly screenshots: SmokeAdapterResult["screenshots"];
  readonly cleanup: Task490CleanupOutput;
  readonly proof: Task490ProofOutput;
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
      formsRemoved: input.cleanup.formsRemoved,
      formFieldsRemoved: input.cleanup.formFieldsRemoved,
      submissionsRemoved: input.cleanup.submissionsRemoved,
      sessionsRemoved: input.cleanup.sessionsRemoved,
      auditLogsRemoved: input.cleanup.auditLogsRemoved,
      accessLogsRemoved: input.cleanup.accessLogsRemoved,
      userRolesRemoved: input.cleanup.userRolesRemoved,
      usersRemoved: input.cleanup.usersRemoved,
      rolesRemoved: input.cleanup.rolesRemoved,
      workerStarts: counters.starts,
      workerRequests: counters.requests,
      databaseBatches: counters.databaseBatches,
      statements: counters.statements,
      rows: counters.rows,
      pageErrors: 0,
      repositorySnapshots: input.repositorySnapshots,
      fixturesAbsent: input.proof.fixturesAbsent,
      identitiesAbsent: input.proof.identitiesAbsent,
    }),
  });
}

async function closeAndProve(resource: LifecycleResource | null): Promise<void> {
  if (resource === null) return;
  await resource.close();
  if (!(await resource.proveAbsent())) {
    throw new SmokeError("smoke_cleanup_failed", `${resource.name} remained active`);
  }
}

export async function runTask490Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask490Invocation(context.input);
  const manifest = buildExactTask490ScreenshotManifest(context.input);
  assertExactTask490ScreenshotManifest(context.input, manifest);
  const before = await context.timing.measure("snapshot", "task490-before", () =>
    context.repository.snapshot(manifest.paths)
  );
  const marker = randomBytes(12).toString("hex");
  const recoveryKey = randomBytes(32).toString("base64url");
  const recoveryAuthority = createTask490RecoveryAuthority({
    profile: context.input.profile,
    runMarker: marker,
    recoveryKey,
  });
  const password = randomBytes(24).toString("base64url");
  const email = `task490-${marker}-admin@smoke.invalid`;
  let workers: WorkerPool | null = null;
  let install: Task490InstallOutput | null = null;
  let cleanup: Task490FixtureCleanup | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Awaited<ReturnType<typeof createTask490PrivateWorkspace>> | null = null;
  let routingLease: RuntimeSmokeRoutingSettingsLease | null = null;
  let authWindowPrepared = false;
  let transport: BrowserTransport | null = null;
  let dispatcher: PlaywrightCliDispatcher | null = null;
  let scenarios: readonly SmokeScenarioResult[] | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let terminal: Task490ProofOutput | null = null;
  let primary: unknown | null = null;

  try {
    workers = await createTask490WorkerPool(context, createTask490WorkerRegistry());
    cleanup = new Task490FixtureCleanup(workers, recoveryAuthority);
    context.lifecycle.register(cleanup);
    // The dev host resolves the admin base path from the DB at boot and this
    // suite's auth/fixtures require /admin, so apply the shared routing
    // settings lease BEFORE the install reads settings and the host spawns.
    routingLease = new RuntimeSmokeRoutingSettingsLease();
    await routingLease.apply();
    install = (await workers.dispatch(
      TASK490_WORKER_DESCRIPTORS.install,
      createTask490InstallInput({
        authority: recoveryAuthority,
        credential: Object.freeze({ email, password }),
      })
    )) as Task490InstallOutput;
    workers.recordDatabaseBatch(install.statements, install.rows);
    if (install.adminPath !== "/admin") {
      throw new SmokeError(
        "smoke_authentication_failed",
        "TASK-490 requires the default admin path (/admin)"
      );
    }
    // The admin SPA fires several /auth/* requests per boot and every one
    // consumes the shared auth rate-limit bucket (10 req/60s). The suite
    // boots the shell six times (warmup + five scored scenarios), so a full
    // run exceeds the window and the last boot 429s into a /admin/login
    // bounce. Shorten the auth bucket window BEFORE the dev host reads the
    // settings (its first request caches the patched value), then restore the
    // exact stored row on close (mirrors the proven TASK-540/TASK-488
    // auth-window pattern).
    await workers.dispatch(
      TASK490_WORKER_DESCRIPTORS.authPrepare,
      Object.freeze({ marker: marker })
    );
    authWindowPrepared = true;
    server = await startTask490DevHost(context);
    workspace = await createTask490PrivateWorkspace(context);
    const authPath = join(workspace.path, "admin-auth.json");
    await awaitTask490AdminAuthentication(
      createAdminAuthStorageState({
        adminUrl: `${ADMIN_ORIGIN}/admin`,
        workspace: workspace.path,
        storageStatePath: authPath,
        environment: Object.freeze({
          CODERSO_PLAYWRIGHT_EMAIL: email,
          CODERSO_PLAYWRIGHT_PASSWORD: password,
        }),
      }),
      server.waitForUnexpectedExit()
    );
    const fixtures = buildTask490BrowserFixtures({
      profile: context.input.profile,
      install,
    });
    const planActions = fixtures.map((fixture, index) =>
      Object.freeze({
        id: `task490-action-${String(index + 1).padStart(2, "0")}`,
        scenarioId: fixture.scenarioId,
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
      segments: segments.map(({ segmentId }) => segmentId),
      // The run-code process needs more than the shared 30s default: the
      // supervised dev host compiles the admin modules on first load (30-60s).
      runCodeTimeoutMs: 300_000,
    });
    transport = new BrowserTransport(context.input.session, dispatcher);
    context.lifecycle.register(transport);
    await dispatcher.loadStorageState(authPath);
    // Warm up first-load module compilation before the scored scenarios so
    // their bounded waits are not consumed by a cold vite optimize pass.
    const warmupFixture = fixtures[0];
    const warmupVariant = TASK490_VARIANTS.find(({ id }) => id === warmupFixture?.variantId);
    const warmupSegment = segments[0];
    const warmupActionId = warmupSegment?.actionIds[0];
    if (
      warmupFixture !== undefined &&
      warmupVariant !== undefined &&
      warmupSegment !== undefined &&
      warmupActionId !== undefined
    ) {
      const warmupSource = `async (page) => {
        await page.setViewportSize(${JSON.stringify(warmupVariant.viewport)});
        await page.goto("${ADMIN_ORIGIN}${install.adminPath}/advanced/forms/${install.formId}/submissions", { waitUntil: "domcontentloaded", timeout: 180000 });
        await page.waitForFunction(() => document.body.innerText.includes("Form submissions"), undefined, { timeout: 120000 });
        return { warmed: true };
      }`;
      const warmupFrames = await transport.runSegment(
        Object.freeze({
          segment: warmupSegment,
          actions: Object.freeze([{ actionId: warmupActionId, source: warmupSource }]),
        }),
        Object.freeze({
          runId: marker,
          manifestSha256: manifestDigest(manifest),
          scenarioId: warmupFixture.scenarioId,
          segmentId: warmupSegment.segmentId,
          actionIds: warmupSegment.actionIds,
        })
      );
      if (warmupFrames.length !== 1 || warmupFrames[0]!.status !== "success") {
        const retryFrames = await transport
          .runSegment(
            Object.freeze({
              segment: warmupSegment,
              actions: Object.freeze([{ actionId: warmupActionId, source: warmupSource }]),
            }),
            Object.freeze({
              runId: marker,
              manifestSha256: manifestDigest(manifest),
              scenarioId: warmupFixture.scenarioId,
              segmentId: warmupSegment.segmentId,
              actionIds: warmupSegment.actionIds,
            })
          )
          .catch(() => []);
        if (retryFrames.length !== 1 || retryFrames[0]!.status !== "success") {
          throw new SmokeError("smoke_output_invalid", "TASK-490 warmup could not converge");
        }
      }
    }
    const scenarioTimes = new Map(TASK490_SCENARIOS.map(({ id }) => [id, 0]));
    const completedReceipts: Array<
      Readonly<{ readonly scenarioId: string; readonly variantId: string }>
    > = [];
    for (const [index, fixture] of fixtures.entries()) {
      const descriptor: Task490ScenarioDescriptor | undefined = TASK490_SCENARIOS.find(
        ({ id }) => id === fixture.scenarioId
      );
      const variant: Task490Variant | undefined = TASK490_VARIANTS.find(
        ({ id }) => id === fixture.variantId
      );
      const segment = segments[index];
      if (
        descriptor === undefined ||
        variant === undefined ||
        segment === undefined ||
        segment.actionIds.length !== 1
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-490 browser plan drifted");
      }
      const screenshot = manifest.entries.find(
        ({ scenarioId }) => scenarioId === descriptor.id
      )?.path;
      const screenshotPath =
        context.input.profile === "certification" && variant.id !== descriptor.canonicalVariant
          ? null
          : (screenshot ?? null);
      const started = performance.now();
      const source = materializeTask490BrowserAction({
        descriptor,
        fixture,
        variant,
        screenshotPath,
      });
      const frames = await transport.runSegment(
        Object.freeze({
          segment,
          actions: Object.freeze([{ actionId: segment.actionIds[0]!, source }]),
        }),
        Object.freeze({
          runId: marker,
          manifestSha256: manifestDigest(manifest),
          scenarioId: descriptor.id,
          segmentId: segment.segmentId,
          actionIds: segment.actionIds,
        })
      );
      if (frames.length !== 1) {
        throw new SmokeError(
          "smoke_output_invalid",
          "TASK-490 browser frame cardinality is invalid"
        );
      }
      assertTask490BrowserReceipt(sourceReceipt(frames[0]!), descriptor, fixture, variant);
      completedReceipts.push(
        Object.freeze({ scenarioId: fixture.scenarioId, variantId: fixture.variantId })
      );
      scenarioTimes.set(
        descriptor.id,
        (scenarioTimes.get(descriptor.id) ?? 0) + Math.ceil(performance.now() - started)
      );
    }
    assertTask490CompletedReceipts(context.input.profile, completedReceipts);
    scenarios = Object.freeze(
      TASK490_SCENARIOS.map(({ id }) =>
        Object.freeze({ id, pass: true, elapsedMs: scenarioTimes.get(id) ?? 0 })
      )
    );
    screenshots = await validateTask490ScreenshotOutputs(context.root, context.input, manifest);
  } catch (error) {
    primary = error;
    const diagLines: string[] = [
      `=== TASK-490 adapter failure ${new Date().toISOString()} ===`,
      `primary=${primary instanceof SmokeError ? primary.code : "unknown"} :: ${primary instanceof Error ? primary.message : String(primary)}`,
    ];
    if (server !== null) {
      try {
        const log = server.snapshotLogs();
        diagLines.push(`server stdout tail: ${log.stdout.slice(-4000)}`);
        diagLines.push(`server stderr tail: ${log.stderr.slice(-4000)}`);
        console.error(`[server-log] stdout=${log.stdout.length}B stderr=${log.stderr.length}B`);
      } catch {}
    }
    appendDiagnostics(context.root, context.input.session, diagLines);
  }

  const cleanupErrors: unknown[] = [];
  if (routingLease !== null) {
    try {
      await routingLease.restore();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  // The lease opens the postgres-js client in this process for its
  // snapshot/restore transactions; postgres-js keeps idle sockets alive, so
  // the client must be closed for the Node event loop to terminate after the
  // run (the lease imports core/db/client lazily to keep the module DB-free).
  if (routingLease !== null) {
    try {
      const { closeDatabase } = await import("../../../core/db/client");
      await closeDatabase();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (authWindowPrepared && workers !== null) {
    try {
      await workers.dispatch(TASK490_WORKER_DESCRIPTORS.authRestore, Object.freeze({ marker }));
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  for (const resource of [transport, workspace, server, cleanup] as const) {
    try {
      await closeAndProve(resource);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null && cleanup !== null) {
    try {
      terminal = (await workers.dispatch(
        TASK490_WORKER_DESCRIPTORS.prove,
        recoveryAuthority
      )) as Task490ProofOutput;
      workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (terminal.fixturesAbsent !== true || terminal.identitiesAbsent !== true) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-490 terminal proof is incomplete");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null) {
    try {
      await workers.close();
      if (!(await workers.proveAbsent()))
        throw new SmokeError("smoke_cleanup_failed", "TASK-490 worker remained active");
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  let afterFailure: unknown | null = null;
  try {
    const after = await context.timing.measure("snapshot", "task490-after", () =>
      context.repository.snapshot(manifest.paths)
    );
    context.repository.assertUnchanged(before, after, manifest.paths);
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
      "TASK-490 adapter failed",
      { cause: new AggregateError(errors) }
    );
  }
  const cleanupOutput = cleanup?.output() ?? null;
  if (
    workers === null ||
    cleanupOutput === null ||
    terminal === null ||
    scenarios === null ||
    screenshots === null ||
    install === null
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 adapter execution is incomplete");
  }
  const result = projectTask490AdapterResult({
    scenarios,
    screenshots,
    cleanup: cleanupOutput,
    proof: terminal,
    workers,
    repositorySnapshots: context.repository.count(),
  });
  assertTask490SafeProjection(result, [
    password,
    email,
    recoveryKey,
    process.env.AUTH_PASSWORD_PEPPER ?? "",
    context.root,
    workspace?.path ?? "",
  ]);
  return result;
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-490",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask490Adapter,
  evidenceDirectory(input: SmokeInput, root: string) {
    return resolveInsideRoot(
      root,
      `${TASK490_EVIDENCE_ROOT}/${input.session}`,
      "task_490_evidence"
    );
  },
});

export default adapter;
