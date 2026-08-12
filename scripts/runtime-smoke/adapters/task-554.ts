import { createHash, randomBytes } from "node:crypto";
import { chmod, lstat, mkdir, mkdtemp, realpath, readdir, rmdir, rm, unlink } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

import { resolveInsideRoot, SmokeError } from "../contracts";
import {
  createAdminAuthStorageState,
  type AdminAuthStorageStateResult,
} from "../browser/admin-auth";
import { BrowserTransport } from "../browser/transport";
import { PlaywrightCliDispatcher } from "../browser/playwright-cli-dispatcher";
import { compileBrowserDispatchPlan } from "../browser/segment-compiler";
import type { BrowserActionFrame, BrowserRunCodeDispatch } from "../browser/contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../lifecycle";
import {
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
  startSupervisedServer,
  type SupervisedServerResource,
} from "../server/supervised-server";
import type { SmokeAdapter, SmokeAdapterResult, SmokeScenarioResult } from "./types";
import {
  TASK554_SCENARIOS,
  TASK554_VARIANTS,
  assertTask554BrowserReceipt,
  buildTask554FixtureSpecs,
  materializeTask554BrowserAction,
  type Task554ActorKind,
  type Task554BrowserFixture,
  type Task554ScenarioDescriptor,
} from "./task-554/browser-actions";
import {
  assertExactTask554Invocation,
  assertExactTask554ScreenshotManifest,
  buildExactTask554ScreenshotManifest,
  validateTask554ScreenshotOutputs,
} from "./task-554/output-manifest";
import {
  TASK554_WORKER_DESCRIPTORS,
  assertTask554FixtureMatrix,
  createTask554InstallInput,
  createTask554RecoveryAuthority,
  createTask554WorkerPool,
  createTask554WorkerRegistry,
  type Task554ActorCredentials,
  type Task554CleanupOutput,
  type Task554InstallOutput,
  type Task554ProofOutput,
  type Task554RecoveryAuthority,
} from "./task-554/worker-operations";
import type { WorkerPool } from "../workers/pool";

export { assertExactTask554Invocation } from "./task-554/output-manifest";

const ADMIN_ORIGIN = "http://127.0.0.1:5173";
const FRONT_ORIGIN = "http://127.0.0.1:3000";
const ADMIN_AUTH_FAILURE =
  /^(?:credentials_missing|login_network_failed|login_failed:[3-5]\d{2}|session_cookie_(?:missing|invalid))$/u;

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

export function assertTask554AdminAuthOutcome(
  outcome: unknown
): asserts outcome is AdminAuthStorageStateResult {
  if (outcome === null || typeof outcome !== "object" || Array.isArray(outcome)) {
    throw new SmokeError("smoke_output_invalid", "TASK-554 authentication output is invalid");
  }
  const value = outcome as Record<string, unknown>;
  if (value.attempted !== true) {
    throw new SmokeError("smoke_output_invalid", "TASK-554 authentication output is invalid");
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
    throw new SmokeError("smoke_authentication_failed", "TASK-554 authentication failed");
  }
  throw new SmokeError("smoke_output_invalid", "TASK-554 authentication output is invalid");
}

export async function awaitTask554AdminAuthentication(
  authentication: Promise<AdminAuthStorageStateResult>,
  unexpectedServerExit: Promise<never>
): Promise<void> {
  const outcome = await Promise.race([authentication, unexpectedServerExit]);
  assertTask554AdminAuthOutcome(outcome);
}

interface Task554ProjectionInput {
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly screenshots: SmokeAdapterResult["screenshots"];
  readonly cleanup: Task554CleanupOutput;
  readonly proof: Task554ProofOutput;
  readonly workers: WorkerPool;
  readonly repositorySnapshots: number;
}

interface Task554WorkspaceParentDirectory {
  readonly path: string;
  readonly dev: number | bigint;
  readonly ino: number | bigint;
  readonly uid: number | bigint;
  readonly mode: number | bigint;
}

interface Task554WorkspaceParent {
  readonly path: string;
  readonly created: readonly Task554WorkspaceParentDirectory[];
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function workspaceParentDirectory(
  path: string,
  info: Awaited<ReturnType<typeof lstat>>
): Task554WorkspaceParentDirectory {
  return Object.freeze({
    path,
    dev: info.dev,
    ino: info.ino,
    uid: info.uid,
    mode: info.mode,
  });
}

function isSameWorkspaceParentDirectory(
  expected: Task554WorkspaceParentDirectory,
  actual: Awaited<ReturnType<typeof lstat>>
): boolean {
  return (
    expected.dev === actual.dev &&
    expected.ino === actual.ino &&
    expected.uid === actual.uid &&
    expected.mode === actual.mode
  );
}

async function removeCreatedTask554WorkspaceParents(
  root: string,
  created: readonly Task554WorkspaceParentDirectory[]
): Promise<void> {
  for (const expected of [...created].reverse()) {
    const info = await lstat(expected.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info === null) continue;
    const canonical = await realpath(expected.path).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-554 workspace parent changed", {
        cause: error,
      });
    });
    if (
      info.isSymbolicLink() ||
      !info.isDirectory() ||
      canonical !== expected.path ||
      !isWithin(root, canonical) ||
      !isSameWorkspaceParentDirectory(expected, info)
    ) {
      throw new SmokeError("smoke_repository_invalid", "TASK-554 workspace parent changed");
    }
    if ((await readdir(expected.path)).length > 0) continue;
    try {
      await rmdir(expected.path);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTEMPTY") continue;
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 workspace parent cleanup failed", {
        cause: error,
      });
    }
  }
}

async function createTask554WorkspaceParent(root: string): Promise<Task554WorkspaceParent> {
  let directory = root;
  const processUid = typeof process.getuid === "function" ? process.getuid() : null;
  const created: Task554WorkspaceParentDirectory[] = [];
  try {
    for (const [index, component] of [".tmp", "runtime-smoke"].entries()) {
      const candidate = join(directory, component);
      let info = await lstat(candidate).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      let wasCreated = false;
      if (info === null) {
        await mkdir(candidate, { mode: 0o700 }).catch((error: unknown) => {
          throw new SmokeError("smoke_repository_invalid", "TASK-554 workspace parent is invalid", {
            cause: error,
          });
        });
        wasCreated = true;
        info = await lstat(candidate).catch((error: unknown) => {
          throw new SmokeError("smoke_repository_invalid", "TASK-554 workspace parent is invalid", {
            cause: error,
          });
        });
      }
      const canonical = await realpath(candidate).catch((error: unknown) => {
        throw new SmokeError("smoke_repository_invalid", "TASK-554 workspace parent is invalid", {
          cause: error,
        });
      });
      const expectedUid = processUid ?? info.uid;
      if (
        info.isSymbolicLink() ||
        !info.isDirectory() ||
        canonical !== candidate ||
        !isWithin(root, canonical) ||
        (index === 1 && (info.uid !== expectedUid || (info.mode & 0o777) !== 0o700))
      ) {
        throw new SmokeError("smoke_repository_invalid", "TASK-554 workspace parent is invalid");
      }
      if (wasCreated) created.push(workspaceParentDirectory(candidate, info));
      directory = candidate;
    }
    return Object.freeze({ path: directory, created: Object.freeze(created) });
  } catch (error) {
    try {
      await removeCreatedTask554WorkspaceParents(root, created);
    } catch (cleanupError) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 workspace setup cleanup failed", {
        cause: new AggregateError([error, cleanupError]),
      });
    }
    throw error;
  }
}

export class Task554Workspace implements LifecycleResource {
  readonly name: string;
  readonly path: string;
  readonly #root: string;
  readonly #createdParents: readonly Task554WorkspaceParentDirectory[];
  #closed = false;

  private constructor(
    session: string,
    path: string,
    root: string,
    createdParents: readonly Task554WorkspaceParentDirectory[]
  ) {
    this.name = `task554-workspace-${session}`;
    this.path = path;
    this.#root = root;
    this.#createdParents = createdParents;
  }

  static async create(context: RuntimeSmokeContext): Promise<Task554Workspace> {
    context.lifecycle.assertAccepting();
    const root = await realpath(context.root).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-554 workspace root is unavailable", {
        cause: error,
      });
    });
    resolveInsideRoot(root, ".tmp/runtime-smoke", "TASK-554 workspace root");
    const parent = await createTask554WorkspaceParent(root);
    const parentInfo = await lstat(parent.path);
    const uid = typeof process.getuid === "function" ? process.getuid() : parentInfo.uid;
    if (
      !isWithin(root, parent.path) ||
      parentInfo.isSymbolicLink() ||
      !parentInfo.isDirectory() ||
      parentInfo.uid !== uid ||
      (parentInfo.mode & 0o777) !== 0o700
    ) {
      throw new SmokeError("smoke_repository_invalid", "TASK-554 workspace parent is invalid");
    }
    let candidate: string | null = null;
    try {
      candidate = await mkdtemp(join(parent.path, `${context.input.session}-task554-`));
      await chmod(candidate, 0o700);
      const [canonical, info] = await Promise.all([realpath(candidate), lstat(candidate)]);
      if (
        canonical !== candidate ||
        !isWithin(root, canonical) ||
        info.isSymbolicLink() ||
        !info.isDirectory() ||
        info.uid !== uid ||
        (info.mode & 0o777) !== 0o700
      ) {
        throw new SmokeError("smoke_repository_invalid", "TASK-554 workspace is not private");
      }
      const workspace = new Task554Workspace(
        context.input.session,
        canonical,
        root,
        parent.created
      );
      context.lifecycle.register(workspace);
      return workspace;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      if (candidate !== null) {
        try {
          await rm(candidate, { recursive: true, force: true });
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      try {
        await removeCreatedTask554WorkspaceParents(root, parent.created);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      if (cleanupErrors.length > 0) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-554 workspace setup cleanup failed", {
          cause: new AggregateError([error, ...cleanupErrors]),
        });
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    await rm(this.path, { recursive: true, force: true });
    await removeCreatedTask554WorkspaceParents(this.#root, this.#createdParents);
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

export function createTask554PrivateWorkspace(
  context: RuntimeSmokeContext
): Promise<Task554Workspace> {
  return Task554Workspace.create(context);
}

class Task554FixtureCleanup implements LifecycleResource {
  readonly name = "task554-fixture-cleanup";
  readonly #workers: WorkerPool;
  readonly #authority: Task554RecoveryAuthority;
  #output: Task554CleanupOutput | null = null;
  #closed: Promise<void> | null = null;

  constructor(workers: WorkerPool, authority: Task554RecoveryAuthority) {
    this.#workers = workers;
    this.#authority = authority;
  }

  output(): Task554CleanupOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closed ??= this.#closeOnce();
    return this.#closed;
  }

  async #closeOnce(): Promise<void> {
    const output = await this.#workers.dispatch(
      TASK554_WORKER_DESCRIPTORS.cleanup,
      this.#authority
    );
    this.#output = output as Task554CleanupOutput;
    this.#workers.recordDatabaseBatch(this.#output.statements, this.#output.rows);
    if (
      this.#output.preIdentityAbsenceProved !== true ||
      this.#output.identityAbsenceProved !== true ||
      this.#output.settingsRestored !== true
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 fixture cleanup proof is incomplete");
    }
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#output?.preIdentityAbsenceProved === true && this.#output.identityAbsenceProved === true
    );
  }
}

function actorCredentials(marker: string): readonly Task554ActorCredentials[] {
  const password = () => randomBytes(24).toString("base64url");
  return Object.freeze([
    Object.freeze({
      kind: "writer",
      email: `task554-${marker}-writer@smoke.invalid`,
      password: password(),
    }),
    Object.freeze({
      kind: "publisher",
      email: `task554-${marker}-publisher@smoke.invalid`,
      password: password(),
    }),
  ]);
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

function task554Host(context: RuntimeSmokeContext): Promise<SupervisedServerResource> {
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
      Object.freeze({ id: "task554-front-ready", check: () => ready(`${FRONT_ORIGIN}/`) }),
      Object.freeze({ id: "task554-admin-ready", check: () => ready(`${ADMIN_ORIGIN}/admin/`) }),
    ]),
    family: "task554-dev-host",
    readinessTimeoutMs: context.input.profile === "fast" ? 120_000 : 240_000,
  });
}

function manifestDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sourceReceipt(frame: BrowserActionFrame): unknown {
  if (frame.status !== "success")
    throw new SmokeError("smoke_output_invalid", "TASK-554 browser action failed");
  return frame.output;
}

function fixtureKey(scenarioId: string, variantId: string): string {
  return `${scenarioId}/${variantId}`;
}

function assertTask554CompletedReceipts(
  profile: "fast" | "certification",
  completed: readonly Readonly<{ readonly scenarioId: string; readonly variantId: string }>[]
): void {
  const expected = buildTask554FixtureSpecs(profile);
  if (
    completed.length !== expected.length ||
    completed.some(
      (receipt, index) =>
        receipt.scenarioId !== expected[index]?.scenarioId ||
        receipt.variantId !== expected[index]?.variantId
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-554 browser receipt matrix is incomplete");
  }
}

function assertPostProjection(
  output: unknown,
  descriptor: Task554ScenarioDescriptor,
  fixture: Task554BrowserFixture
): void {
  const expectedSeo = Object.hasOwn(descriptor.metadata, "seo")
    ? String((descriptor.metadata.seo as { readonly description: string }).description)
    : descriptor.baseline.seoDescription;
  const expectedStatus =
    descriptor.expectedResponseStatus === 200
      ? descriptor.expectedStatus
      : descriptor.baseline.status;
  const expectedScheduledAt =
    descriptor.expectedResponseStatus === 200
      ? descriptor.expectedScheduledAt
      : descriptor.baseline.scheduledAt;
  if (
    output === null ||
    typeof output !== "object" ||
    Array.isArray(output) ||
    (output as { postId?: unknown }).postId !== fixture.postId ||
    (output as { status?: unknown }).status !== expectedStatus ||
    (output as { scheduledAt?: unknown }).scheduledAt !== expectedScheduledAt ||
    (output as { seoDescription?: unknown }).seoDescription !== expectedSeo ||
    (output as { rows?: unknown }).rows !== 1
  )
    throw new SmokeError("smoke_output_invalid", "TASK-554 persisted Post projection drifted");
}

export function assertTask554SafeProjection(
  result: SmokeAdapterResult,
  privateValues: readonly string[]
): void {
  const encoded = JSON.stringify(result);
  if (privateValues.some((value) => value.length > 0 && encoded.includes(value))) {
    throw new SmokeError("smoke_output_invalid", "TASK-554 report leaked private material");
  }
}

export function projectTask554AdapterResult(input: Task554ProjectionInput): SmokeAdapterResult {
  if (input.cleanup.settingsRestored !== true || input.proof.settingsRestored !== true) {
    throw new SmokeError(
      "smoke_cleanup_failed",
      "TASK-554 admin path restoration proof is incomplete"
    );
  }
  const counters = input.workers.counters();
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: input.scenarios,
    screenshots: input.screenshots,
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      postChildrenRemoved: input.cleanup.postChildrenRemoved,
      accessLogsRemoved: input.cleanup.accessLogsRemoved,
      loginAuditRowsRemoved: input.cleanup.loginAuditRowsRemoved,
      sessionsRemoved: input.cleanup.sessionsRemoved,
      userRolesRemoved: input.cleanup.userRolesRemoved,
      postsRemoved: input.cleanup.postsRemoved,
      usersRemoved: input.cleanup.usersRemoved,
      rolesRemoved: input.cleanup.rolesRemoved,
      workerStarts: counters.starts,
      workerRequests: counters.requests,
      databaseBatches: counters.databaseBatches,
      statements: counters.statements,
      rows: counters.rows,
      pageErrors: 0,
      repositorySnapshots: input.repositorySnapshots,
      settingsRestored: true,
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

export async function runTask554Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask554Invocation(context.input);
  const manifest = buildExactTask554ScreenshotManifest(context.input);
  assertExactTask554ScreenshotManifest(context.input, manifest);
  const before = await context.timing.measure("snapshot", "task554-before", () =>
    context.repository.snapshot(manifest.paths)
  );
  const marker = randomBytes(12).toString("hex");
  const recoveryKey = randomBytes(32).toString("base64url");
  const recoveryAuthority = createTask554RecoveryAuthority({
    profile: context.input.profile,
    runMarker: marker,
    recoveryKey,
  });
  const credentials = actorCredentials(marker);
  let workers: WorkerPool | null = null;
  let install: Task554InstallOutput | null = null;
  let cleanup: Task554FixtureCleanup | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Task554Workspace | null = null;
  let transport: BrowserTransport | null = null;
  let dispatcher: PlaywrightCliDispatcher | null = null;
  let primary: unknown | null = null;
  let scenarios: readonly SmokeScenarioResult[] | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let terminal: Task554ProofOutput | null = null;

  try {
    workers = await createTask554WorkerPool(context, createTask554WorkerRegistry());
    cleanup = new Task554FixtureCleanup(workers, recoveryAuthority);
    context.lifecycle.register(cleanup);
    install = (await workers.dispatch(
      TASK554_WORKER_DESCRIPTORS.install,
      createTask554InstallInput({
        profile: context.input.profile,
        runMarker: marker,
        recoveryKey,
        actors: credentials,
      })
    )) as Task554InstallOutput;
    assertTask554FixtureMatrix(context.input.profile, install.fixtures);
    workers.recordDatabaseBatch(install.statements, install.rows);
    server = await task554Host(context);
    workspace = await Task554Workspace.create(context);
    const fixtureMap = new Map(
      install.fixtures.map((fixture) => [
        fixtureKey(fixture.scenarioId, fixture.variantId),
        fixture,
      ])
    );
    const planActions = install.fixtures.map((fixture, index) =>
      Object.freeze({
        id: `task554-action-${String(index + 1).padStart(2, "0")}`,
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
      // The run-code process itself needs more than the shared 30s default:
      // the supervised dev host compiles the admin editor modules on first
      // load (30-60s), and in-page waits alone do not extend the process
      // budget. Set to the shared maximum (300s); the scenario assertions
      // still fail closed.
      runCodeTimeoutMs: 300_000,
    });
    transport = new BrowserTransport(context.input.session, dispatcher);
    context.lifecycle.register(transport);
    const authPaths = new Map<Task554ActorKind, string>();
    for (const actor of credentials) {
      const path = join(workspace.path, `${actor.kind}-auth.json`);
      await awaitTask554AdminAuthentication(
        createAdminAuthStorageState({
          adminUrl: `${ADMIN_ORIGIN}/admin`,
          workspace: workspace.path,
          storageStatePath: path,
          environment: Object.freeze({
            CODERSO_PLAYWRIGHT_EMAIL: actor.email,
            CODERSO_PLAYWRIGHT_PASSWORD: actor.password,
          }),
        }),
        server.waitForUnexpectedExit()
      );
      authPaths.set(actor.kind, path);
    }
    // Warm up the supervised dev host's first-load module compilation before
    // the scored scenarios: a fresh vite re-optimizes dependencies on first
    // load (30-60s+), which would otherwise consume the first scenario's
    // bounded waits. The warmup opens the first fixture's Classic editor and
    // waits for the metadata panel; the compile happens once, then every
    // scenario runs warm. The warmup frame is not a scored receipt.
    const warmupFixture = install.fixtures[0];
    const warmupDescriptor = TASK554_SCENARIOS.find(({ id }) => id === warmupFixture?.scenarioId);
    const warmupAuth = warmupDescriptor === undefined ? undefined : authPaths.get(warmupDescriptor.actor);
    if (warmupFixture !== undefined && warmupDescriptor !== undefined && warmupAuth !== undefined) {
      await dispatcher.loadStorageState(warmupAuth);
      const warmupSource = `async (page) => {
        await page.goto("${ADMIN_ORIGIN}/admin/posts/${warmupFixture.postId}?editor=classic", { waitUntil: "domcontentloaded", timeout: 60000 });
        const panel = page.locator('[data-entry-metadata-panel="true"]:visible');
        await panel.waitFor({ state: "visible", timeout: 120000 });
        return { warmed: true };
      }`;
      const warmupSegment: BrowserRunCodeDispatch = Object.freeze({
        schemaVersion: 1,
        kind: "run-code",
        segmentId: "segment-warmup",
        scenarioId: warmupDescriptor.id,
        actionIds: Object.freeze(["task554-action-warmup"]),
        estimatedSourceBytes: Buffer.byteLength(warmupSource),
      });
      const warmupFrames = await transport.runSegment(
        Object.freeze({
          segment: warmupSegment,
          actions: Object.freeze([{ actionId: "task554-action-warmup", source: warmupSource }]),
        }),
        Object.freeze({
          runId: marker,
          manifestSha256: manifestDigest(manifest),
          scenarioId: warmupDescriptor.id,
          segmentId: warmupSegment.segmentId,
          actionIds: warmupSegment.actionIds,
        })
      );
      if (warmupFrames.length !== 1 || warmupFrames[0]!.status !== "success") {
        throw new SmokeError("smoke_output_invalid", "TASK-554 warmup could not converge");
      }
    }
    const scenarioTimes = new Map(TASK554_SCENARIOS.map(({ id }) => [id, 0]));
    const completedReceipts: Array<
      Readonly<{ readonly scenarioId: string; readonly variantId: string }>
    > = [];
    let loadedActor: Task554ActorKind | null = null;
    for (const [index, fixture] of install.fixtures.entries()) {
      const descriptor = TASK554_SCENARIOS.find(({ id }) => id === fixture.scenarioId);
      const variant = TASK554_VARIANTS.find(({ id }) => id === fixture.variantId);
      const segment = segments[index];
      if (
        descriptor === undefined ||
        variant === undefined ||
        segment === undefined ||
        segment.actionIds.length !== 1
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-554 browser plan drifted");
      }
      if (loadedActor !== descriptor.actor) {
        const authPath = authPaths.get(descriptor.actor);
        if (authPath === undefined)
          throw new SmokeError("smoke_output_invalid", "TASK-554 actor storage state is absent");
        await dispatcher.loadStorageState(authPath);
        loadedActor = descriptor.actor;
      }
      const resolved = fixtureMap.get(fixtureKey(fixture.scenarioId, fixture.variantId));
      if (resolved === undefined)
        throw new SmokeError("smoke_output_invalid", "TASK-554 browser fixture is absent");
      const screenshot = manifest.entries.find(
        ({ scenarioId }) => scenarioId === descriptor.id
      )?.path;
      const screenshotPath =
        context.input.profile === "certification" && variant.id !== descriptor.canonicalVariant
          ? null
          : (screenshot ?? null);
      const started = performance.now();
      const source = materializeTask554BrowserAction({
        descriptor,
        fixture: resolved,
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
      if (frames.length !== 1)
        throw new SmokeError(
          "smoke_output_invalid",
          "TASK-554 browser frame cardinality is invalid"
        );
      assertTask554BrowserReceipt(sourceReceipt(frames[0]!), descriptor, resolved, variant);
      const projection = await workers.dispatch(
        TASK554_WORKER_DESCRIPTORS.read,
        Object.freeze({ postId: resolved.postId })
      );
      workers.recordDatabaseBatch(
        (projection as { statements: number }).statements,
        (projection as { rows: number }).rows
      );
      assertPostProjection(projection, descriptor, resolved);
      completedReceipts.push(
        Object.freeze({ scenarioId: fixture.scenarioId, variantId: fixture.variantId })
      );
      scenarioTimes.set(
        descriptor.id,
        (scenarioTimes.get(descriptor.id) ?? 0) + Math.ceil(performance.now() - started)
      );
    }
    assertTask554CompletedReceipts(context.input.profile, completedReceipts);
    scenarios = Object.freeze(
      TASK554_SCENARIOS.map(({ id }) =>
        Object.freeze({ id, pass: true, elapsedMs: scenarioTimes.get(id) ?? 0 })
      )
    );
    screenshots = await validateTask554ScreenshotOutputs(context.root, context.input, manifest);
  } catch (error) {
    primary = error;
    // A failed session must contain only report.json for the workflow's
    // failure-code reader; remove this run's screenshot PNGs best-effort
    // (bounded owned paths under the session directory).
    for (const relativePath of manifest.paths) {
      const pngPath = resolveInsideRoot(context.root, relativePath, "task_554_failed_png");
      await unlink(pngPath).catch(() => undefined);
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
        TASK554_WORKER_DESCRIPTORS.prove,
        recoveryAuthority
      )) as Task554ProofOutput;
      workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (
        terminal.fixturesAbsent !== true ||
        terminal.identitiesAbsent !== true ||
        terminal.settingsRestored !== true
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-554 terminal proof is incomplete");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null) {
    try {
      await workers.close();
      if (!(await workers.proveAbsent()))
        throw new SmokeError("smoke_cleanup_failed", "TASK-554 worker remained active");
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  let afterFailure: unknown | null = null;
  try {
    const after = await context.timing.measure("snapshot", "task554-after", () =>
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
      "TASK-554 adapter failed",
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
    throw new SmokeError("smoke_output_invalid", "TASK-554 adapter execution is incomplete");
  }
  const result = projectTask554AdapterResult({
    scenarios,
    screenshots,
    cleanup: cleanupOutput,
    proof: terminal,
    workers,
    repositorySnapshots: context.repository.count(),
  });
  assertTask554SafeProjection(result, [
    ...credentials.map(({ password }) => password),
    ...credentials.map(({ email }) => email),
    process.env.AUTH_PASSWORD_PEPPER ?? "",
    recoveryKey,
    context.root,
    workspace?.path ?? "",
  ]);
  return result;
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-554",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask554Adapter,
});

export default adapter;
