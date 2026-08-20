import { createHash, randomBytes } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  readdir,
  rmdir,
  rm,
  unlink,
} from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

import { resolveInsideRoot, SmokeError, type SmokeInput } from "../contracts";
import { appendDiagnostics } from "../diagnostics";
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
  TASK493_SCENARIOS,
  TASK493_VARIANTS,
  assertTask493BrowserReceipt,
  buildTask493FixtureSpecs,
  materializeTask493BrowserAction,
  type Task493ActorKind,
  type Task493BrowserFixture,
  type Task493ScenarioDescriptor,
} from "./task-493/browser-actions";
import {
  assertExactTask493Invocation,
  assertExactTask493ScreenshotManifest,
  buildExactTask493ScreenshotManifest,
  validateTask493ScreenshotOutputs,
  EVIDENCE_ROOT,
} from "./task-493/output-manifest";
import {
  TASK493_WORKER_DESCRIPTORS,
  assertTask493FixtureMatrix,
  createTask493InstallInput,
  createTask493RecoveryAuthority,
  createTask493WorkerPool,
  createTask493WorkerRegistry,
  type Task493CleanupOutput,
  type Task493InstallOutput,
  type Task493ProofOutput,
  type Task493RecoveryAuthority,
} from "./task-493/worker-operations";
import type { WorkerPool } from "../workers/pool";

export { assertExactTask493Invocation } from "./task-493/output-manifest";

const ADMIN_ORIGIN = "http://127.0.0.1:5173";
const FRONT_ORIGIN = "http://127.0.0.1:3000";
const ADMIN_AUTH_FAILURE =
  /^(?:credentials_missing|login_network_failed|login_failed:[3-5]\d{2}|session_cookie_(?:missing|invalid))$/u;
const FIXTURE_IMPRESSIONS_PER_PAGE = 50;

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

export function assertTask493AdminAuthOutcome(
  outcome: unknown
): asserts outcome is AdminAuthStorageStateResult {
  if (outcome === null || typeof outcome !== "object" || Array.isArray(outcome)) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 authentication output is invalid");
  }
  const value = outcome as Record<string, unknown>;
  if (value.attempted !== true) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 authentication output is invalid");
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
    throw new SmokeError("smoke_authentication_failed", "TASK-493 authentication failed");
  }
  throw new SmokeError("smoke_output_invalid", "TASK-493 authentication output is invalid");
}

export async function awaitTask493AdminAuthentication(
  authentication: Promise<AdminAuthStorageStateResult>,
  unexpectedServerExit: Promise<never>
): Promise<void> {
  const outcome = await Promise.race([authentication, unexpectedServerExit]);
  assertTask493AdminAuthOutcome(outcome);
}

interface Task493ProjectionInput {
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly screenshots: SmokeAdapterResult["screenshots"];
  readonly cleanup: Task493CleanupOutput;
  readonly proof: Task493ProofOutput;
  readonly workers: WorkerPool;
  readonly repositorySnapshots: number;
}

interface Task493WorkspaceParentDirectory {
  readonly path: string;
  readonly dev: number | bigint;
  readonly ino: number | bigint;
  readonly uid: number | bigint;
  readonly mode: number | bigint;
}

interface Task493WorkspaceParent {
  readonly path: string;
  readonly created: readonly Task493WorkspaceParentDirectory[];
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function workspaceParentDirectory(
  path: string,
  info: Awaited<ReturnType<typeof lstat>>
): Task493WorkspaceParentDirectory {
  return Object.freeze({
    path,
    dev: info.dev,
    ino: info.ino,
    uid: info.uid,
    mode: info.mode,
  });
}

function isSameWorkspaceParentDirectory(
  expected: Task493WorkspaceParentDirectory,
  actual: Awaited<ReturnType<typeof lstat>>
): boolean {
  return (
    expected.dev === actual.dev &&
    expected.ino === actual.ino &&
    expected.uid === actual.uid &&
    expected.mode === actual.mode
  );
}

async function removeCreatedTask493WorkspaceParents(
  root: string,
  created: readonly Task493WorkspaceParentDirectory[]
): Promise<void> {
  for (const expected of [...created].reverse()) {
    const info = await lstat(expected.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info === null) continue;
    const canonical = await realpath(expected.path).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-493 workspace parent changed", {
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
      throw new SmokeError("smoke_repository_invalid", "TASK-493 workspace parent changed");
    }
    if ((await readdir(expected.path)).length > 0) continue;
    try {
      await rmdir(expected.path);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTEMPTY") continue;
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 workspace parent cleanup failed", {
        cause: error,
      });
    }
  }
}

async function createTask493WorkspaceParent(root: string): Promise<Task493WorkspaceParent> {
  let directory = root;
  const processUid = typeof process.getuid === "function" ? process.getuid() : null;
  const created: Task493WorkspaceParentDirectory[] = [];
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
          throw new SmokeError("smoke_repository_invalid", "TASK-493 workspace parent is invalid", {
            cause: error,
          });
        });
        wasCreated = true;
        info = await lstat(candidate).catch((error: unknown) => {
          throw new SmokeError("smoke_repository_invalid", "TASK-493 workspace parent is invalid", {
            cause: error,
          });
        });
      }
      const canonical = await realpath(candidate).catch((error: unknown) => {
        throw new SmokeError("smoke_repository_invalid", "TASK-493 workspace parent is invalid", {
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
        throw new SmokeError("smoke_repository_invalid", "TASK-493 workspace parent is invalid");
      }
      if (wasCreated) created.push(workspaceParentDirectory(candidate, info));
      directory = candidate;
    }
    return Object.freeze({ path: directory, created: Object.freeze(created) });
  } catch (error) {
    try {
      await removeCreatedTask493WorkspaceParents(root, created);
    } catch (cleanupError) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 workspace setup cleanup failed", {
        cause: new AggregateError([error, cleanupError]),
      });
    }
    throw error;
  }
}

export class Task493Workspace implements LifecycleResource {
  readonly name: string;
  readonly path: string;
  readonly #root: string;
  readonly #createdParents: readonly Task493WorkspaceParentDirectory[];
  #closed = false;

  private constructor(
    session: string,
    path: string,
    root: string,
    createdParents: readonly Task493WorkspaceParentDirectory[]
  ) {
    this.name = `task493-workspace-${session}`;
    this.path = path;
    this.#root = root;
    this.#createdParents = createdParents;
  }

  static async create(context: RuntimeSmokeContext): Promise<Task493Workspace> {
    context.lifecycle.assertAccepting();
    const root = await realpath(context.root).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-493 workspace root is unavailable", {
        cause: error,
      });
    });
    resolveInsideRoot(root, ".tmp/runtime-smoke", "TASK-493 workspace root");
    const parent = await createTask493WorkspaceParent(root);
    const parentInfo = await lstat(parent.path);
    const uid = typeof process.getuid === "function" ? process.getuid() : parentInfo.uid;
    if (
      !isWithin(root, parent.path) ||
      parentInfo.isSymbolicLink() ||
      !parentInfo.isDirectory() ||
      parentInfo.uid !== uid ||
      (parentInfo.mode & 0o777) !== 0o700
    ) {
      throw new SmokeError("smoke_repository_invalid", "TASK-493 workspace parent is invalid");
    }
    let candidate: string | null = null;
    try {
      candidate = await mkdtemp(join(parent.path, `${context.input.session}-task493-`));
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
        throw new SmokeError("smoke_repository_invalid", "TASK-493 workspace is not private");
      }
      const workspace = new Task493Workspace(
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
        await removeCreatedTask493WorkspaceParents(root, parent.created);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      if (cleanupErrors.length > 0) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-493 workspace setup cleanup failed", {
          cause: new AggregateError([error, ...cleanupErrors]),
        });
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    await rm(this.path, { recursive: true, force: true });
    await removeCreatedTask493WorkspaceParents(this.#root, this.#createdParents);
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

export function createTask493PrivateWorkspace(
  context: RuntimeSmokeContext
): Promise<Task493Workspace> {
  return Task493Workspace.create(context);
}

class Task493FixtureCleanup implements LifecycleResource {
  readonly name = "task493-fixture-cleanup";
  readonly #workers: WorkerPool;
  readonly #authority: Task493RecoveryAuthority;
  #output: Task493CleanupOutput | null = null;
  #closed: Promise<void> | null = null;

  constructor(workers: WorkerPool, authority: Task493RecoveryAuthority) {
    this.#workers = workers;
    this.#authority = authority;
  }

  output(): Task493CleanupOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closed ??= this.#closeOnce();
    return this.#closed;
  }

  async #closeOnce(): Promise<void> {
    const output = await this.#workers.dispatch(
      TASK493_WORKER_DESCRIPTORS.cleanup,
      this.#authority
    );
    this.#output = output as Task493CleanupOutput;
    this.#workers.recordDatabaseBatch(this.#output.statements, this.#output.rows);
    if (
      this.#output.preIdentityAbsenceProved !== true ||
      this.#output.identityAbsenceProved !== true ||
      this.#output.settingsRestored !== true
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 fixture cleanup proof is incomplete");
    }
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#output?.preIdentityAbsenceProved === true && this.#output.identityAbsenceProved === true
    );
  }
}

function adminCredentials(): Readonly<{ readonly email: string; readonly password: string }> {
  return Object.freeze({
    email:
      process.env.CODERSO_PLAYWRIGHT_EMAIL ??
      process.env.PLAYWRIGHT_ADMIN_EMAIL ??
      process.env.ADMIN_EMAIL ??
      "",
    password:
      process.env.CODERSO_PLAYWRIGHT_PASSWORD ??
      process.env.PLAYWRIGHT_ADMIN_PASSWORD ??
      process.env.ADMIN_PASSWORD ??
      "",
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

/**
 * The front host is up as soon as it answers. The ambient DB has no published
 * homepage (`site.homepageId` points at a missing page and the pages table is
 * empty), so `/` legitimately renders the site's 404 view for the whole run.
 * The scored scenarios exercise the real sitemap and admin flows themselves,
 * so a 404 on `/` is ambient state, not a readiness failure. Admin readiness
 * still requires a real 200.
 */
async function frontReady(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    await response.body?.cancel();
    return response.status === 200 || response.status === 404;
  } catch {
    return false;
  }
}

function task493Host(context: RuntimeSmokeContext): Promise<SupervisedServerResource> {
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
      Object.freeze({ id: "task493-front-ready", check: () => frontReady(`${FRONT_ORIGIN}/`) }),
      Object.freeze({ id: "task493-admin-ready", check: () => ready(`${ADMIN_ORIGIN}/admin/`) }),
    ]),
    family: "task493-dev-host",
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
    throw new SmokeError("smoke_output_invalid", "TASK-493 browser action failed");
  }
  return frame.output;
}

function fixtureKey(scenarioId: string, variantId: string): string {
  return `${scenarioId}/${variantId}`;
}

function assertTask493CompletedReceipts(
  profile: "fast" | "certification",
  completed: readonly Readonly<{ readonly scenarioId: string; readonly variantId: string }>[]
): void {
  const expected = buildTask493FixtureSpecs(profile);
  if (
    completed.length !== expected.length ||
    completed.some(
      (receipt, index) =>
        receipt.scenarioId !== expected[index]?.scenarioId ||
        receipt.variantId !== expected[index]?.variantId
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 browser receipt matrix is incomplete");
  }
}

function assertTask493ReadProjection(output: unknown, fixture: Task493BrowserFixture): void {
  if (
    output === null ||
    typeof output !== "object" ||
    Array.isArray(output) ||
    (output as { url?: unknown }).url !== fixture.url ||
    (output as { indexingState?: unknown }).indexingState !== "INDEXED" ||
    !Number.isSafeInteger((output as { impressions?: unknown }).impressions) ||
    ((output as { impressions: number }).impressions ?? 0) < 1 ||
    !Number.isSafeInteger((output as { clicks?: unknown }).clicks) ||
    ((output as { clicks: number }).clicks ?? 0) < 1 ||
    typeof (output as { query?: unknown }).query !== "string" ||
    !/^task493 /u.test((output as { query: string }).query) ||
    typeof (output as { sitemapUrl?: unknown }).sitemapUrl !== "string" ||
    !(output as { sitemapUrl: string }).sitemapUrl.startsWith("/") ||
    (output as { rows?: unknown }).rows !== 2
  )
    throw new SmokeError("smoke_output_invalid", "TASK-493 SEO projection drifted");
}

export function assertTask493SafeProjection(
  result: SmokeAdapterResult,
  privateValues: readonly string[]
): void {
  const encoded = JSON.stringify(result);
  if (privateValues.some((value) => value.length > 0 && encoded.includes(value))) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 report leaked private material");
  }
}

export function projectTask493AdapterResult(input: Task493ProjectionInput): SmokeAdapterResult {
  if (input.cleanup.settingsRestored !== true || input.proof.settingsRestored !== true) {
    throw new SmokeError(
      "smoke_cleanup_failed",
      "TASK-493 admin path restoration proof is incomplete"
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
      seoIndexedPagesRemoved: input.cleanup.seoIndexedPagesRemoved,
      seoSearchMetricsRemoved: input.cleanup.seoSearchMetricsRemoved,
      seoSearchQueriesRemoved: input.cleanup.seoSearchQueriesRemoved,
      seoSitemapSubmissionsRemoved: input.cleanup.seoSitemapSubmissionsRemoved,
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

export async function runTask493Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask493Invocation(context.input);
  const manifest = buildExactTask493ScreenshotManifest(context.input);
  assertExactTask493ScreenshotManifest(context.input, manifest);
  const before = await context.timing.measure("snapshot", "task493-before", () =>
    context.repository.snapshot(manifest.paths)
  );
  const marker = randomBytes(12).toString("hex");
  const recoveryKey = randomBytes(32).toString("base64url");
  const recoveryAuthority = createTask493RecoveryAuthority({
    profile: context.input.profile,
    runMarker: marker,
    recoveryKey,
  });
  const credentials = adminCredentials();
  let workers: WorkerPool | null = null;
  let install: Task493InstallOutput | null = null;
  let cleanup: Task493FixtureCleanup | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Task493Workspace | null = null;
  let transport: BrowserTransport | null = null;
  let dispatcher: PlaywrightCliDispatcher | null = null;
  let primary: unknown | null = null;
  let scenarios: readonly SmokeScenarioResult[] | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let terminal: Task493ProofOutput | null = null;

  try {
    workers = await createTask493WorkerPool(context, createTask493WorkerRegistry());
    cleanup = new Task493FixtureCleanup(workers, recoveryAuthority);
    context.lifecycle.register(cleanup);
    install = (await workers.dispatch(
      TASK493_WORKER_DESCRIPTORS.install,
      createTask493InstallInput({
        profile: context.input.profile,
        runMarker: marker,
        recoveryKey,
      })
    )) as Task493InstallOutput;
    assertTask493FixtureMatrix(context.input.profile, install.fixtures);
    workers.recordDatabaseBatch(install.statements, install.rows);
    server = await task493Host(context);
    workspace = await Task493Workspace.create(context);
    const fixtureMap = new Map(
      install.fixtures.map((fixture) => [
        fixtureKey(fixture.scenarioId, fixture.variantId),
        fixture,
      ])
    );
    const planActions = install.fixtures.map((fixture, index) =>
      Object.freeze({
        id: `task493-action-${String(index + 1).padStart(2, "0")}`,
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
      // the supervised dev host compiles the admin modules on first load
      // (30-60s), and in-page waits alone do not extend the process budget.
      // Set to the shared maximum (300s); the scenario assertions still
      // fail closed.
      runCodeTimeoutMs: 300_000,
    });
    transport = new BrowserTransport(context.input.session, dispatcher);
    context.lifecycle.register(transport);
    const authPaths = new Map<Task493ActorKind, string>();
    const authEnvironment = Object.freeze({
      CODERSO_PLAYWRIGHT_EMAIL: credentials.email,
      CODERSO_PLAYWRIGHT_PASSWORD: credentials.password,
    });
    for (const kind of ["viewer", "manager"] as const) {
      const path = join(workspace.path, `${kind}-auth.json`);
      await awaitTask493AdminAuthentication(
        createAdminAuthStorageState({
          adminUrl: `${ADMIN_ORIGIN}/admin`,
          workspace: workspace.path,
          storageStatePath: path,
          environment: authEnvironment,
        }),
        server.waitForUnexpectedExit()
      );
      authPaths.set(kind, path);
    }
    // Warm up the supervised dev host's first-load module compilation before
    // the scored scenarios: a fresh vite re-optimizes dependencies on first
    // load (30-60s+), which would otherwise consume the first scenario's
    // bounded waits. The warmup opens the SEO Manager and waits for the
    // "Indexed pages" stat row; the compile happens once, then every
    // scenario runs warm. The warmup frame is not a scored receipt.
    const warmupFixture = install.fixtures[0];
    const warmupDescriptor =
      warmupFixture === undefined
        ? undefined
        : TASK493_SCENARIOS.find(({ id }) => id === warmupFixture.scenarioId);
    const warmupAuth =
      warmupDescriptor === undefined ? undefined : authPaths.get(warmupDescriptor.actor);
    const warmupSegment = segments[0];
    if (
      warmupFixture !== undefined &&
      warmupDescriptor !== undefined &&
      warmupAuth !== undefined &&
      warmupSegment !== undefined
    ) {
      await dispatcher.loadStorageState(warmupAuth);
      const warmupActionId = warmupSegment.actionIds[0];
      if (warmupActionId === undefined)
        throw new SmokeError("smoke_output_invalid", "TASK-493 warmup segment is empty");
      const warmupSource = `async (page) => {
        await page.goto("${ADMIN_ORIGIN}/admin/seo", { waitUntil: "domcontentloaded", timeout: 180000 });
        const statRow = page.getByText("Indexed pages", { exact: true });
        await statRow.waitFor({ state: "visible", timeout: 120000 });
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
          scenarioId: warmupDescriptor.id,
          segmentId: warmupSegment.segmentId,
          actionIds: warmupSegment.actionIds,
        })
      );
      if (warmupFrames.length !== 1 || warmupFrames[0]!.status !== "success") {
        // The first Playwright dispatch after the dev-host start can crash
        // transiently (cold browser process); the warmup is read-only, so one
        // bounded retry is safe and keeps the scored scenarios authoritative.
        const retryFrames = await transport
          .runSegment(
            Object.freeze({
              segment: warmupSegment,
              actions: Object.freeze([{ actionId: warmupActionId, source: warmupSource }]),
            }),
            Object.freeze({
              runId: marker,
              manifestSha256: manifestDigest(manifest),
              scenarioId: warmupDescriptor.id,
              segmentId: warmupSegment.segmentId,
              actionIds: warmupSegment.actionIds,
            })
          )
          .catch(() => []);
        if (retryFrames.length !== 1 || retryFrames[0]!.status !== "success") {
          throw new SmokeError("smoke_output_invalid", "TASK-493 warmup could not converge");
        }
      }
    }
    const scenarioTimes = new Map(TASK493_SCENARIOS.map(({ id }) => [id, 0]));
    const completedReceipts: Array<
      Readonly<{ readonly scenarioId: string; readonly variantId: string }>
    > = [];
    let loadedActor: Task493ActorKind | null = null;
    for (const [index, fixture] of install.fixtures.entries()) {
      const descriptor = TASK493_SCENARIOS.find(({ id }) => id === fixture.scenarioId);
      const variant = TASK493_VARIANTS.find(({ id }) => id === fixture.variantId);
      const segment = segments[index];
      if (
        descriptor === undefined ||
        variant === undefined ||
        segment === undefined ||
        segment.actionIds.length !== 1
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-493 browser plan drifted");
      }
      if (loadedActor !== descriptor.actor) {
        const authPath = authPaths.get(descriptor.actor);
        if (authPath === undefined)
          throw new SmokeError("smoke_output_invalid", "TASK-493 actor storage state is absent");
        await dispatcher.loadStorageState(authPath);
        loadedActor = descriptor.actor;
      }
      const resolved = fixtureMap.get(fixtureKey(fixture.scenarioId, fixture.variantId));
      if (resolved === undefined)
        throw new SmokeError("smoke_output_invalid", "TASK-493 browser fixture is absent");
      const browserFixture: Task493BrowserFixture = Object.freeze({
        scenarioId: resolved.scenarioId,
        variantId: resolved.variantId,
        url: resolved.url,
      });
      const screenshot = manifest.entries.find(
        ({ scenarioId }) => scenarioId === descriptor.id
      )?.path;
      const screenshotPath =
        context.input.profile === "certification" && variant.id !== descriptor.canonicalVariant
          ? null
          : (screenshot ?? null);
      const started = performance.now();
      const source = materializeTask493BrowserAction({
        scenarioId: descriptor.id,
        fixtureUrl: browserFixture.url,
        variant,
        fixtureSitemapPath: browserFixture.url.replace(/^https?:\/\/[^/]+/u, ""),
        minIndexedPages: install.fixtures.length,
        minImpressions: install.fixtures.length * FIXTURE_IMPRESSIONS_PER_PAGE,
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
          "TASK-493 browser frame cardinality is invalid"
        );
      assertTask493BrowserReceipt(sourceReceipt(frames[0]!), descriptor, browserFixture, variant, {
        minIndexedPages: install.fixtures.length,
        minImpressions: install.fixtures.length * FIXTURE_IMPRESSIONS_PER_PAGE,
      });
      const projection = await workers.dispatch(
        TASK493_WORKER_DESCRIPTORS.read,
        Object.freeze({ url: browserFixture.url })
      );
      workers.recordDatabaseBatch(
        (projection as { statements: number }).statements,
        (projection as { rows: number }).rows
      );
      assertTask493ReadProjection(projection, browserFixture);
      completedReceipts.push(
        Object.freeze({ scenarioId: fixture.scenarioId, variantId: fixture.variantId })
      );
      scenarioTimes.set(
        descriptor.id,
        (scenarioTimes.get(descriptor.id) ?? 0) + Math.ceil(performance.now() - started)
      );
    }
    assertTask493CompletedReceipts(context.input.profile, completedReceipts);
    scenarios = Object.freeze(
      TASK493_SCENARIOS.map(({ id }) =>
        Object.freeze({ id, pass: true, elapsedMs: scenarioTimes.get(id) ?? 0 })
      )
    );
    screenshots = await validateTask493ScreenshotOutputs(context.root, context.input, manifest);
  } catch (error) {
    primary = error;
    const diagLines: string[] = [
      `=== TASK-493 adapter failure ${new Date().toISOString()} ===`,
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
    // A failed session must contain only report.json for the workflow's
    // failure-code reader; remove this run's screenshot PNGs best-effort
    // (bounded owned paths under the session directory). Evidence-set
    // validation failures keep the PNGs so the failure stays inspectable.
    const evidenceSetFailure =
      primary instanceof SmokeError &&
      primary.message.includes("screenshot evidence set is invalid");
    if (!evidenceSetFailure) {
      for (const relativePath of manifest.paths) {
        const pngPath = resolveInsideRoot(context.root, relativePath, "task_493_failed_png");
        await unlink(pngPath).catch(() => undefined);
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
        TASK493_WORKER_DESCRIPTORS.prove,
        recoveryAuthority
      )) as Task493ProofOutput;
      workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (
        terminal.fixturesAbsent !== true ||
        terminal.identitiesAbsent !== true ||
        terminal.settingsRestored !== true
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-493 terminal proof is incomplete");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null) {
    try {
      await workers.close();
      if (!(await workers.proveAbsent()))
        throw new SmokeError("smoke_cleanup_failed", "TASK-493 worker remained active");
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  let afterFailure: unknown | null = null;
  try {
    const after = await context.timing.measure("snapshot", "task493-after", () =>
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
      "TASK-493 adapter failed",
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
    throw new SmokeError("smoke_output_invalid", "TASK-493 adapter execution is incomplete");
  }
  const result = projectTask493AdapterResult({
    scenarios,
    screenshots,
    cleanup: cleanupOutput,
    proof: terminal,
    workers,
    repositorySnapshots: context.repository.count(),
  });
  assertTask493SafeProjection(result, [
    credentials.email,
    credentials.password,
    process.env.AUTH_PASSWORD_PEPPER ?? "",
    recoveryKey,
    context.root,
    workspace?.path ?? "",
  ]);
  return result;
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-493",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask493Adapter,
  evidenceDirectory(input: SmokeInput, root: string) {
    return resolveInsideRoot(root, `${EVIDENCE_ROOT}/${input.session}`, "task_493_evidence");
  },
});

export default adapter;
