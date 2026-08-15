import { createHash, randomBytes } from "node:crypto";
import { chmod, lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { join, relative } from "node:path";

import { resolveInsideRoot, SmokeError } from "../contracts";
import { appendDiagnostics } from "../diagnostics";
import { BrowserTransport } from "../browser/transport";
import { PlaywrightCliDispatcher } from "../browser/playwright-cli-dispatcher";
import { compileBrowserDispatchPlan } from "../browser/segment-compiler";
import {
  createAdminAuthStorageState,
  type AdminAuthStorageStateResult,
} from "../browser/admin-auth";
import type { BrowserActionFrame, BrowserRunCodeDispatch } from "../browser/contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../lifecycle";
import {
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
  startSupervisedServer,
  type SupervisedServerResource,
} from "../server/supervised-server";
import { requireManifestableScenarioResults } from "../visible-evidence";
import type { WorkerPool } from "../workers/pool";
import type { SmokeAdapterResult, SmokeScenarioResult } from "./types";
import {
  TASK511_SCENARIOS,
  TASK511_VARIANTS,
  assertTask511BrowserReceipt,
  materializeTask511BrowserAction,
  type Task511BrowserReceipt,
  type Task511ScenarioDescriptor,
  type Task511SessionConfig,
} from "./task-511/browser-actions";
import {
  assertExactTask511Invocation,
  assertExactTask511ScreenshotManifest,
  buildExactTask511ScreenshotManifest,
  validateTask511ScreenshotOutputs,
} from "./task-511/output-manifest";
import { buildTask511ScenarioResult } from "./task-511/scenarios";
import {
  TASK511_WORKER_DESCRIPTORS,
  createTask511CleanupInput,
  createTask511InstallInput,
  createTask511ProofInput,
  createTask511RecoveryAuthority,
  createTask511WorkerPool,
  createTask511WorkerRegistry,
  type Task511CleanupOutput,
  type Task511InstallOutput,
  type Task511ProofOutput,
  type Task511RecoveryAuthority,
} from "./task-511/worker-operations";

export { assertExactTask511Invocation } from "./task-511/output-manifest";

const ADMIN_ORIGIN = "http://127.0.0.1:5173";
const FRONT_ORIGIN = "http://127.0.0.1:3000";
const ADMIN_AUTH_FAILURE =
  /^(?:credentials_missing|login_network_failed|login_failed:[3-5]\d{2}|session_cookie_(?:missing|invalid))$/u;

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

export function assertTask511AdminAuthOutcome(
  outcome: unknown
): asserts outcome is AdminAuthStorageStateResult {
  if (outcome === null || typeof outcome !== "object" || Array.isArray(outcome)) {
    throw new SmokeError("smoke_output_invalid", "TASK-511 authentication output is invalid");
  }
  const value = outcome as Record<string, unknown>;
  if (value.attempted !== true) {
    throw new SmokeError("smoke_output_invalid", "TASK-511 authentication output is invalid");
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
    throw new SmokeError("smoke_authentication_failed", "TASK-511 authentication failed");
  }
  throw new SmokeError("smoke_output_invalid", "TASK-511 authentication output is invalid");
}

export async function awaitTask511AdminAuthentication(
  authentication: Promise<AdminAuthStorageStateResult>,
  unexpectedServerExit: Promise<never>
): Promise<void> {
  const outcome = await Promise.race([authentication, unexpectedServerExit]);
  assertTask511AdminAuthOutcome(outcome);
}

class Task511Workspace implements LifecycleResource {
  readonly name: string;
  readonly path: string;
  #closed = false;

  private constructor(session: string, path: string) {
    this.name = `task511-workspace-${session}`;
    this.path = path;
  }

  static async create(context: RuntimeSmokeContext): Promise<Task511Workspace> {
    context.lifecycle.assertAccepting();
    const root = await realpath(context.root).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-511 workspace root is unavailable", {
        cause: error,
      });
    });
    resolveInsideRoot(root, ".runtime-smoke-task511", "TASK-511 workspace root");
    let candidate: string | null = null;
    try {
      candidate = await mkdtemp(join(root, ".runtime-smoke-task511-"));
      await chmod(candidate, 0o700);
      const canonical = await realpath(candidate);
      const metadata = await lstat(canonical);
      const uid = typeof process.getuid === "function" ? process.getuid() : metadata.uid;
      if (
        relative(root, canonical).startsWith("..") ||
        canonical !== candidate ||
        metadata.isSymbolicLink() ||
        !metadata.isDirectory() ||
        metadata.uid !== uid ||
        (metadata.mode & 0o777) !== 0o700
      ) {
        throw new SmokeError("smoke_repository_invalid", "TASK-511 workspace is not private");
      }
      const workspace = new Task511Workspace(context.input.session, canonical);
      context.lifecycle.register(workspace);
      return workspace;
    } catch (error) {
      if (candidate !== null) {
        try {
          await rm(candidate, { recursive: true, force: true });
        } catch (cleanupError) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-511 workspace setup cleanup failed", {
            cause: new AggregateError([error, cleanupError]),
          });
        }
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    await rm(this.path, { recursive: true, force: true });
    this.#closed = true;
  }

  async proveAbsent(): Promise<boolean> {
    const entry = await lstat(this.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    return this.#closed && entry === null;
  }
}

export function createTask511PrivateWorkspace(
  context: RuntimeSmokeContext
): Promise<Task511Workspace> {
  return Task511Workspace.create(context);
}

class Task511FixtureCleanup implements LifecycleResource {
  readonly name = "task511-fixture-cleanup";
  readonly #workers: WorkerPool;
  readonly #authority: Task511RecoveryAuthority;
  readonly #backupIds: () => readonly string[];
  #output: Task511CleanupOutput | null = null;
  #closed: Promise<void> | null = null;

  constructor(
    workers: WorkerPool,
    authority: Task511RecoveryAuthority,
    backupIds: () => readonly string[]
  ) {
    this.#workers = workers;
    this.#authority = authority;
    this.#backupIds = backupIds;
  }

  output(): Task511CleanupOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closed ??= this.#closeOnce();
    return this.#closed;
  }

  async #closeOnce(): Promise<void> {
    const output = (await this.#workers.dispatch(
      TASK511_WORKER_DESCRIPTORS.cleanup,
      createTask511CleanupInput({
        authority: this.#authority,
        backupIds: this.#backupIds(),
      })
    )) as Task511CleanupOutput;
    this.#output = output;
    this.#workers.recordDatabaseBatch(output.statements, output.rows);
    if (
      output.preAbsenceProved !== true ||
      output.postAbsenceProved !== true ||
      output.scheduleRestored !== true ||
      output.avatarSettingsRestored !== true ||
      output.rateLimitRestored !== true
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-511 fixture cleanup proof is incomplete");
    }
  }

  async proveAbsent(): Promise<boolean> {
    return this.#output?.postAbsenceProved === true;
  }
}

function task511Credentials(marker: string): Readonly<{
  readonly email: string;
  readonly password: string;
  readonly passphrase: string;
}> {
  return Object.freeze({
    email: `task511-${marker}-admin@smoke.invalid`,
    password: randomBytes(24).toString("base64url"),
    passphrase: `wf511-${marker}-passphrase`,
  });
}

async function ready(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    await response.body?.cancel();
    return response.status === 200;
  } catch {
    return false;
  }
}

function task511Host(
  context: RuntimeSmokeContext,
  adminPath: string
): Promise<SupervisedServerResource> {
  return startSupervisedServer(context, {
    executable: Object.freeze({ kind: "path-literal", name: "coderso-dev-core-host" }),
    args: Object.freeze([context.root]),
    cwd: context.root,
    environment: Object.freeze({
      source: process.env,
      policy: CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
    }),
    ports: Object.freeze([3000, 5173, 5174]),
    readiness: Object.freeze([
      Object.freeze({ id: "task511-front-ready", check: () => ready(`${FRONT_ORIGIN}/`) }),
      Object.freeze({
        id: "task511-admin-ready",
        check: () => ready(`${ADMIN_ORIGIN}${adminPath}/`),
      }),
    ]),
    family: "task511-dev-host",
    readinessTimeoutMs: context.input.profile === "fast" ? 120_000 : 240_000,
  });
}

function manifestDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sourceReceipt(frame: BrowserActionFrame): unknown {
  if (frame.status !== "success") {
    console.error(
      `[DIAG] frame failure actionId=${frame.actionId} code=${frame.failureCode ?? "none"}`
    );
    throw new SmokeError("smoke_output_invalid", "TASK-511 browser action failed");
  }
  return frame.output;
}

function assertTask511CompletedReceipts(
  completed: readonly Readonly<{ readonly scenarioId: string; readonly variantId: string }>[]
): void {
  const expected: ReadonlyArray<Readonly<{ scenarioId: string; variantId: string }>> =
    TASK511_SCENARIOS.flatMap((descriptor) =>
      TASK511_VARIANTS.map((variant) =>
        Object.freeze({ scenarioId: descriptor.id, variantId: variant.id })
      )
    );
  if (
    completed.length !== expected.length ||
    completed.some(
      (receipt, index) =>
        receipt.scenarioId !== expected[index]?.scenarioId ||
        receipt.variantId !== expected[index]?.variantId
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-511 browser receipt matrix is incomplete");
  }
}

interface Task511ProjectionInput {
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly screenshots: SmokeAdapterResult["screenshots"];
  readonly cleanup: Task511CleanupOutput;
  readonly proof: Task511ProofOutput;
  readonly workers: WorkerPool;
  readonly repositorySnapshots: number;
}

export function assertTask511SafeProjection(
  result: SmokeAdapterResult,
  privateValues: readonly string[]
): void {
  const encoded = JSON.stringify(result);
  if (privateValues.some((value) => value.length > 0 && encoded.includes(value))) {
    throw new SmokeError("smoke_output_invalid", "TASK-511 report leaked private material");
  }
}

export function projectTask511AdapterResult(input: Task511ProjectionInput): SmokeAdapterResult {
  if (
    input.cleanup.scheduleRestored !== true ||
    input.cleanup.avatarSettingsRestored !== true ||
    input.cleanup.rateLimitRestored !== true ||
    input.proof.scheduleRestored !== true ||
    input.proof.avatarSettingsRestored !== true ||
    input.proof.rateLimitRestored !== true
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-511 restoration proof is incomplete");
  }
  const scenarios = requireManifestableScenarioResults(input.scenarios, input.screenshots);
  const counters = input.workers.counters();
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios,
    screenshots: input.screenshots,
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      backupRowsRemoved: input.cleanup.backupRowsRemoved,
      artifactFilesRemoved: input.cleanup.artifactFilesRemoved,
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
      scheduleRestored: true,
      avatarSettingsRestored: true,
      rateLimitRestored: true,
      backupsAbsent: input.proof.backupsAbsent,
      artifactsAbsent: input.proof.artifactsAbsent,
      actorAbsent: input.proof.actorAbsent,
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

export async function runTask511Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask511Invocation(context.input);
  const manifest = buildExactTask511ScreenshotManifest(context.input);
  assertExactTask511ScreenshotManifest(context.input, manifest);
  const before = await context.timing.measure("snapshot", "task511-before", () =>
    context.repository.snapshot(manifest.paths)
  );
  const marker = randomBytes(12).toString("hex");
  const recoveryKey = randomBytes(32).toString("base64url");
  const recoveryAuthority = createTask511RecoveryAuthority({
    profile: context.input.profile,
    runMarker: marker,
    recoveryKey,
  });
  const credentials = task511Credentials(marker);
  const createdBackupIds: string[] = [];
  let workers: WorkerPool | null = null;
  let install: Task511InstallOutput | null = null;
  let cleanup: Task511FixtureCleanup | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Task511Workspace | null = null;
  let transport: BrowserTransport | null = null;
  let dispatcher: PlaywrightCliDispatcher | null = null;
  let primary: unknown | null = null;
  let scenarioInputs: ReadonlyArray<{
    readonly descriptor: Task511ScenarioDescriptor;
    readonly variantId: (typeof TASK511_VARIANTS)[number]["id"];
    readonly receipt: Task511BrowserReceipt;
    readonly elapsedMs: number;
  }> | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let terminal: Task511ProofOutput | null = null;

  try {
    workers = await createTask511WorkerPool(context, createTask511WorkerRegistry());
    cleanup = new Task511FixtureCleanup(workers, recoveryAuthority, () => createdBackupIds);
    context.lifecycle.register(cleanup);
    install = (await workers.dispatch(
      TASK511_WORKER_DESCRIPTORS.install,
      createTask511InstallInput({
        profile: context.input.profile,
        runMarker: marker,
        recoveryKey,
        actor: { email: credentials.email, password: credentials.password },
      })
    )) as Task511InstallOutput;
    workers.recordDatabaseBatch(install.statements, install.rows);
    server = await task511Host(context, install.adminPath);
    workspace = await Task511Workspace.create(context);
    const config: Task511SessionConfig = Object.freeze({
      adminOrigin: ADMIN_ORIGIN,
      adminPath: install.adminPath,
      email: credentials.email,
      password: credentials.password,
      passphrase: credentials.passphrase,
      expectedScheduleBadge: install.scheduleEnabled ? "Auto-backup active" : "Auto-backup paused",
    });
    const planActions = TASK511_SCENARIOS.flatMap((descriptor, scenarioIndex) =>
      TASK511_VARIANTS.map((variant, variantIndex) =>
        Object.freeze({
          id: `task511-action-${String(
            scenarioIndex * TASK511_VARIANTS.length + variantIndex + 1
          ).padStart(2, "0")}`,
          scenarioId: descriptor.id,
          lane: "run-code" as const,
          captureOutputs: Object.freeze([
            `receipt-${String(scenarioIndex * TASK511_VARIANTS.length + variantIndex + 1).padStart(2, "0")}`,
          ]),
          isolated: true,
        })
      )
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
      // supervised dev host compiles the admin chunks on first load (30-60s)
      // and the create scenario performs a real encrypted backup synchronously.
      runCodeTimeoutMs: 300_000,
    });
    transport = new BrowserTransport(context.input.session, dispatcher);
    context.lifecycle.register(transport);
    const authPath = join(workspace.path, "admin-auth.json");
    await awaitTask511AdminAuthentication(
      createAdminAuthStorageState({
        adminUrl: `${ADMIN_ORIGIN}${install.adminPath}`,
        workspace: workspace.path,
        storageStatePath: authPath,
        environment: Object.freeze({
          CODERSO_PLAYWRIGHT_EMAIL: credentials.email,
          CODERSO_PLAYWRIGHT_PASSWORD: credentials.password,
        }),
      }),
      server.waitForUnexpectedExit()
    );
    // Warm up the supervised dev host's first-load module compilation before
    // the scored scenarios. The warmup opens the login page and waits for the
    // form; the compile happens once, then every scenario runs warm. The
    // warmup frame is not a scored receipt.
    const warmupSegment = segments[0];
    if (warmupSegment !== undefined) {
      const warmupActionId = warmupSegment.actionIds[0];
      if (warmupActionId === undefined)
        throw new SmokeError("smoke_output_invalid", "TASK-511 warmup segment is empty");
      const warmupSource = `async (page) => {
        await page.goto("${ADMIN_ORIGIN}${install.adminPath}/login", { waitUntil: "domcontentloaded", timeout: 180000 });
        await page.locator("#email").waitFor({ state: "visible", timeout: 120000 });
        return { warmed: true };
      }`;
      const runWarmup = async (): Promise<void> => {
        const warmupFrames = await transport!.runSegment(
          Object.freeze({
            segment: warmupSegment,
            actions: Object.freeze([{ actionId: warmupActionId, source: warmupSource }]),
          }),
          Object.freeze({
            runId: marker,
            manifestSha256: manifestDigest(manifest),
            scenarioId: "login",
            segmentId: warmupSegment.segmentId,
            actionIds: warmupSegment.actionIds,
          })
        );
        if (warmupFrames.length !== 1 || warmupFrames[0]!.status !== "success") {
          throw new SmokeError("smoke_output_invalid", "TASK-511 warmup could not converge");
        }
      };
      try {
        await runWarmup();
      } catch (error) {
        // The first Playwright dispatch after the dev-host start can crash
        // transiently (cold browser process); the warmup is read-only, so one
        // bounded retry is safe and keeps the scored scenarios authoritative.
        try {
          await runWarmup();
        } catch (retryError) {
          throw new SmokeError("smoke_output_invalid", "TASK-511 warmup could not converge", {
            cause: new AggregateError([error, retryError]),
          });
        }
      }
    }
    const collected: Array<{
      readonly descriptor: Task511ScenarioDescriptor;
      readonly variantId: (typeof TASK511_VARIANTS)[number]["id"];
      readonly receipt: Task511BrowserReceipt;
      readonly elapsedMs: number;
    }> = [];
    let storageLoaded = false;
    for (const [scenarioIndex, descriptor] of TASK511_SCENARIOS.entries()) {
      if (!storageLoaded && descriptor.id !== "login") {
        await dispatcher.loadStorageState(authPath);
        storageLoaded = true;
      }
      for (const [variantIndex, variant] of TASK511_VARIANTS.entries()) {
        const segmentIndex = scenarioIndex * TASK511_VARIANTS.length + variantIndex;
        const segment = segments[segmentIndex];
        if (segment === undefined || segment.actionIds.length !== 1) {
          throw new SmokeError("smoke_output_invalid", "TASK-511 browser plan drifted");
        }
        const screenshotPath =
          variant.id === descriptor.canonicalVariant
            ? (manifest.entries[scenarioIndex]?.path ?? null)
            : null;
        const started = performance.now();
        const source = materializeTask511BrowserAction({
          descriptor,
          variant,
          config,
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
            "TASK-511 browser frame cardinality is invalid"
          );
        }
        const receipt = sourceReceipt(frames[0]!);
        assertTask511BrowserReceipt(receipt);
        if (descriptor.id === "create-encrypted-backup" && receipt.createdBackupId !== null) {
          createdBackupIds.push(receipt.createdBackupId);
        }
        collected.push(
          Object.freeze({
            descriptor,
            variantId: variant.id,
            receipt,
            elapsedMs: Math.ceil(performance.now() - started),
          })
        );
      }
    }
    assertTask511CompletedReceipts(
      collected.map(({ descriptor, variantId }) =>
        Object.freeze({ scenarioId: descriptor.id, variantId })
      )
    );
    scenarioInputs = Object.freeze(collected);
    screenshots = await validateTask511ScreenshotOutputs(context.root, context.input, manifest);
  } catch (error) {
    primary = error;
    const diagLines: string[] = [
      `=== TASK-511 adapter failure ${new Date().toISOString()} ===`,
      `primary=${primary instanceof SmokeError ? primary.code : "unknown"} :: ${
        primary instanceof Error ? primary.message : String(primary)
      }`,
    ];
    if (server !== null) {
      try {
        const log = server.snapshotLogs();
        diagLines.push(`server stdout tail: ${log.stdout.slice(-4000)}`);
        diagLines.push(`server stderr tail: ${log.stderr.slice(-4000)}`);
        console.error(`[server-log] stdout=${log.stdout.length}B stderr=${log.stderr.length}B`);
      } catch {
        // Best-effort log snapshot; primary failure is still recorded below.
      }
    }
    appendDiagnostics(context.root, context.input.session, diagLines);
    // A failed session must contain only report.json for the workflow's
    // failure-code reader; remove this run's screenshot PNGs best-effort
    // (bounded owned paths under the session directory). Evidence-set
    // validation failures keep the PNGs so the failure stays inspectable.
    const evidenceSetFailure =
      primary instanceof SmokeError &&
      primary.message.includes("screenshot evidence set is invalid");
    if (!evidenceSetFailure) {
      for (const relativePath of manifest.paths) {
        const pngPath = resolveInsideRoot(context.root, relativePath, "task_511_failed_png");
        await import("node:fs/promises").then(({ unlink }) =>
          unlink(pngPath).catch(() => undefined)
        );
      }
    }
  }

  const cleanupErrors: unknown[] = [];
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
        TASK511_WORKER_DESCRIPTORS.prove,
        createTask511ProofInput({
          authority: recoveryAuthority,
          backupIds: createdBackupIds,
        })
      )) as Task511ProofOutput;
      workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (
        terminal.backupsAbsent !== true ||
        terminal.artifactsAbsent !== true ||
        terminal.scheduleRestored !== true ||
        terminal.avatarSettingsRestored !== true ||
        terminal.rateLimitRestored !== true ||
        terminal.actorAbsent !== true
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-511 terminal proof is incomplete");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null) {
    try {
      await workers.close();
      if (!(await workers.proveAbsent()))
        throw new SmokeError("smoke_cleanup_failed", "TASK-511 worker remained active");
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  let afterFailure: unknown | null = null;
  try {
    const after = await context.timing.measure("snapshot", "task511-after", () =>
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
      "TASK-511 adapter failed",
      { cause: new AggregateError(errors) }
    );
  }
  const cleanupOutput = cleanup?.output() ?? null;
  if (
    workers === null ||
    cleanupOutput === null ||
    terminal === null ||
    scenarioInputs === null ||
    screenshots === null ||
    install === null ||
    workspace === null
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-511 adapter execution is incomplete");
  }
  const scenarios: SmokeScenarioResult[] = scenarioInputs.map((input, index) =>
    buildTask511ScenarioResult({
      receipt: input.receipt,
      descriptor: input.descriptor,
      variantId: input.variantId,
      config: {
        adminOrigin: ADMIN_ORIGIN,
        adminPath: install!.adminPath,
        email: credentials.email,
        password: credentials.password,
        passphrase: credentials.passphrase,
        expectedScheduleBadge: install!.scheduleEnabled
          ? "Auto-backup active"
          : "Auto-backup paused",
      },
      screenshot:
        screenshots[index] === undefined
          ? null
          : { path: screenshots[index]!.path, sha256: screenshots[index]!.sha256 },
      elapsedMs: input.elapsedMs,
    })
  );
  const result = projectTask511AdapterResult({
    scenarios: Object.freeze(scenarios),
    screenshots,
    cleanup: cleanupOutput,
    proof: terminal,
    workers,
    repositorySnapshots: context.repository.count(),
  });
  assertTask511SafeProjection(result, [
    credentials.email,
    credentials.password,
    credentials.passphrase,
    marker,
    recoveryKey,
    context.root,
    workspace.path,
  ]);
  return result;
}

export interface Task511SmokeAdapter {
  readonly suiteId: "task-511";
  readonly supportedProfiles: readonly ("fast" | "certification")[];
  readonly run: (context: RuntimeSmokeContext) => Promise<SmokeAdapterResult>;
}

// The registry-owned SUITE_IDS union (contracts.ts) does not include this
// task yet; the orchestrator registers the adapter through its own dispatch
// surface. The local interface keeps the adapter's suite identity typed
// without touching the shared contracts module.
export const task511Adapter: Task511SmokeAdapter = Object.freeze({
  suiteId: "task-511",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask511Adapter,
});

export default task511Adapter;
