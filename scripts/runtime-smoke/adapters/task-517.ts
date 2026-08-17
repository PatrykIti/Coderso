import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rmdir,
  chmod,
  unlink,
} from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { resolveInsideRoot, SmokeError, type SmokeInput, type SmokeSuiteId } from "../contracts";
import { appendDiagnostics } from "../diagnostics";
import type { LifecycleResource, RuntimeSmokeContext } from "../lifecycle";
import type { BrowserActionFrame, BrowserRunCodeDispatch } from "../browser/contracts";
import { PlaywrightCliDispatcher } from "../browser/playwright-cli-dispatcher";
import { compileBrowserDispatchPlan } from "../browser/segment-compiler";
import { BrowserTransport } from "../browser/transport";
import {
  startSupervisedServer,
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
  type SupervisedServerResource,
} from "../server/supervised-server";
import type { WorkerPool } from "../workers/pool";
import { requireManifestableScenarioResults } from "../visible-evidence";
import type {
  SmokeAdapter,
  SmokeAdapterResult,
  SmokeScenarioResult,
  SmokeScreenshotResult,
} from "./types";
import {
  TASK517_SCENARIOS,
  TASK517_SCENARIO_IDS,
  buildTask517BrowserActionConfig,
  deriveTask517FixtureSpec,
  materializeTask517BrowserAction,
  assertTask517BrowserReceipt,
  buildTask517ScenarioAssertions,
  type Task517ScenarioId,
  type Task517FixtureSpec,
} from "./task-517/browser-actions";
import {
  EVIDENCE_ROOT,
  assertExactTask517Invocation,
  assertExactTask517ScreenshotManifest,
  buildExactTask517ScreenshotManifest,
  manifestDigest,
  validateTask517ScreenshotOutputs,
  type Task517ScreenshotManifest,
} from "./task-517/evidence-manifest";
import {
  TASK517_WORKER_DESCRIPTORS,
  assertTask517WorkerDescriptorParity,
  createTask517InstallInput,
  createTask517RecoveryAuthority,
  createTask517RunMarker,
  createTask517WorkerPool,
  createTask517WorkerRegistry,
  type Task517CleanupOutput,
  type Task517InstallOutput,
  type Task517ProofOutput,
  type Task517RecoveryAuthority,
} from "./task-517/worker-operations";

const ADMIN_ORIGIN = "http://127.0.0.1:5173";
const FRONT_ORIGIN = "http://127.0.0.1:3000";

interface Task517ProjectionInput {
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly screenshots: SmokeAdapterResult["screenshots"];
  readonly cleanup: Task517CleanupOutput;
  readonly proof: Task517ProofOutput;
  readonly workers: WorkerPool;
  readonly repositorySnapshots: number;
}

function adminCredential(marker: string): { email: string; password: string } {
  return Object.freeze({
    email: `task517-${marker}-admin@smoke.invalid`,
    password: randomBytes(24).toString("base64url"),
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
 * The scored scenarios exercise the real content URLs themselves, so a 404 on
 * `/` is ambient state, not a readiness failure.
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

async function requireEntryUnlockSecret(root: string): Promise<void> {
  const envPath = resolveInsideRoot(root, ".env", "task_517_env");
  const text = await readFile(envPath, "utf8").catch((error: unknown) => {
    throw new SmokeError(
      "smoke_argument_invalid",
      "task-517 requires ENTRY_UNLOCK_SECRET in the repository .env for the password-gate flows (the shared dev host sources .env at startup and the unlock API 500s without it)",
      { cause: error }
    );
  });
  const hasSecret = text.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("ENTRY_UNLOCK_SECRET=")) return false;
    return trimmed.slice("ENTRY_UNLOCK_SECRET=".length).trim().length > 0;
  });
  if (!hasSecret) {
    throw new SmokeError(
      "smoke_argument_invalid",
      "task-517 requires a non-empty ENTRY_UNLOCK_SECRET in the repository .env for the password-gate flows; add it (gitignored) before scheduling the suite"
    );
  }
}

function task517Host(
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
      Object.freeze({ id: "task517-front-ready", check: () => frontReady(`${FRONT_ORIGIN}/`) }),
      Object.freeze({
        id: "task517-admin-ready",
        check: () => ready(`${ADMIN_ORIGIN}${adminPath}/`),
      }),
    ]),
    family: "task517-dev-host",
    readinessTimeoutMs: context.input.profile === "fast" ? 120_000 : 240_000,
  });
}

function sourceReceipt(frame: BrowserActionFrame): unknown {
  if (frame.status !== "success") {
    console.error(
      `[DIAG] frame failure actionId=${frame.actionId} code=${frame.failureCode ?? "none"}`
    );
    throw new SmokeError("smoke_output_invalid", "TASK-517 browser action failed");
  }
  return frame.output;
}

interface Task517WorkspaceParentDirectory {
  readonly path: string;
  readonly dev: number | bigint;
  readonly ino: number | bigint;
  readonly uid: number | bigint;
  readonly mode: number | bigint;
}

interface Task517WorkspaceParent {
  readonly path: string;
  readonly created: readonly Task517WorkspaceParentDirectory[];
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function workspaceParentDirectory(
  path: string,
  info: Awaited<ReturnType<typeof lstat>>
): Task517WorkspaceParentDirectory {
  return Object.freeze({
    path,
    dev: info.dev,
    ino: info.ino,
    uid: info.uid,
    mode: info.mode,
  });
}

function isSameWorkspaceParentDirectory(
  expected: Task517WorkspaceParentDirectory,
  actual: Awaited<ReturnType<typeof lstat>>
): boolean {
  return (
    expected.dev === actual.dev &&
    expected.ino === actual.ino &&
    expected.uid === actual.uid &&
    expected.mode === actual.mode
  );
}

async function removeCreatedTask517WorkspaceParents(
  root: string,
  created: readonly Task517WorkspaceParentDirectory[]
): Promise<void> {
  for (const expected of [...created].reverse()) {
    const info = await lstat(expected.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info === null) continue;
    const canonical = await realpath(expected.path).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-517 workspace parent changed", {
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
      throw new SmokeError("smoke_repository_invalid", "TASK-517 workspace parent changed");
    }
    if ((await readdir(expected.path)).length > 0) continue;
    try {
      await rmdir(expected.path);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTEMPTY") continue;
      throw new SmokeError("smoke_cleanup_failed", "TASK-517 workspace parent cleanup failed", {
        cause: error,
      });
    }
  }
}

async function createTask517WorkspaceParent(root: string): Promise<Task517WorkspaceParent> {
  let directory = root;
  const processUid = typeof process.getuid === "function" ? process.getuid() : null;
  const created: Task517WorkspaceParentDirectory[] = [];
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
          throw new SmokeError("smoke_repository_invalid", "TASK-517 workspace parent is invalid", {
            cause: error,
          });
        });
        wasCreated = true;
        info = await lstat(candidate).catch((error: unknown) => {
          throw new SmokeError("smoke_repository_invalid", "TASK-517 workspace parent is invalid", {
            cause: error,
          });
        });
      }
      const canonical = await realpath(candidate).catch((error: unknown) => {
        throw new SmokeError("smoke_repository_invalid", "TASK-517 workspace parent is invalid", {
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
        throw new SmokeError("smoke_repository_invalid", "TASK-517 workspace parent is invalid");
      }
      if (wasCreated) created.push(workspaceParentDirectory(candidate, info));
      directory = candidate;
    }
    return Object.freeze({ path: directory, created: Object.freeze(created) });
  } catch (error) {
    try {
      await removeCreatedTask517WorkspaceParents(root, created);
    } catch (cleanupError) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-517 workspace setup cleanup failed", {
        cause: new AggregateError([error, cleanupError]),
      });
    }
    throw error;
  }
}

class Task517Workspace implements LifecycleResource {
  readonly name: string;
  readonly path: string;
  readonly #root: string;
  readonly #createdParents: readonly Task517WorkspaceParentDirectory[];
  #closed = false;

  private constructor(
    session: string,
    path: string,
    root: string,
    createdParents: readonly Task517WorkspaceParentDirectory[]
  ) {
    this.name = `task517-workspace-${session}`;
    this.path = path;
    this.#root = root;
    this.#createdParents = createdParents;
  }

  static async create(context: RuntimeSmokeContext): Promise<Task517Workspace> {
    context.lifecycle.assertAccepting();
    const root = await realpath(context.root).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-517 workspace root is unavailable", {
        cause: error,
      });
    });
    resolveInsideRoot(root, ".tmp/runtime-smoke", "TASK-517 workspace root");
    const parent = await createTask517WorkspaceParent(root);
    const parentInfo = await lstat(parent.path);
    const uid = typeof process.getuid === "function" ? process.getuid() : parentInfo.uid;
    if (
      !isWithin(root, parent.path) ||
      parentInfo.isSymbolicLink() ||
      !parentInfo.isDirectory() ||
      parentInfo.uid !== uid ||
      (parentInfo.mode & 0o777) !== 0o700
    ) {
      throw new SmokeError("smoke_repository_invalid", "TASK-517 workspace parent is invalid");
    }
    let candidate: string | null = null;
    try {
      candidate = await mkdtemp(join(parent.path, `${context.input.session}-task517-`));
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
        throw new SmokeError("smoke_repository_invalid", "TASK-517 workspace is not private");
      }
      const workspace = new Task517Workspace(
        context.input.session,
        canonical,
        root,
        parent.created
      );
      context.lifecycle.register(workspace);
      return workspace;
    } catch (error) {
      if (candidate !== null) {
        await rmdir(candidate).catch(() => undefined);
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await removeCreatedTask517WorkspaceParents(this.#root, this.#createdParents);
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed;
  }
}

class Task517FixtureCleanup implements LifecycleResource {
  readonly name = "task517-fixture-cleanup";
  readonly #workers: WorkerPool;
  readonly #authority: Task517RecoveryAuthority;
  #output: Task517CleanupOutput | null = null;
  #closed: Promise<void> | null = null;

  constructor(workers: WorkerPool, authority: Task517RecoveryAuthority) {
    this.#workers = workers;
    this.#authority = authority;
  }

  output(): Task517CleanupOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closed ??= this.#closeOnce();
    return this.#closed;
  }

  async #closeOnce(): Promise<void> {
    const output = (await this.#workers.dispatch(
      TASK517_WORKER_DESCRIPTORS.cleanup,
      this.#authority
    )) as Task517CleanupOutput;
    this.#output = output;
    this.#workers.recordDatabaseBatch(output.statements, output.rows);
    if (
      output.preIdentityAbsenceProved !== true ||
      output.identityAbsenceProved !== true ||
      output.settingsRestored !== true
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-517 fixture cleanup proof is incomplete");
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

export function assertTask517SafeProjection(
  result: SmokeAdapterResult,
  privateValues: readonly string[]
): void {
  const encoded = JSON.stringify(result);
  if (privateValues.some((value) => value.length > 0 && encoded.includes(value))) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 report leaked private material");
  }
}

export function projectTask517AdapterResult(input: Task517ProjectionInput): SmokeAdapterResult {
  if (input.cleanup.settingsRestored !== true || input.proof.settingsRestored !== true) {
    throw new SmokeError(
      "smoke_cleanup_failed",
      "TASK-517 contentRoutes restoration proof is incomplete"
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
      accessLogsRemoved: input.cleanup.accessLogsRemoved,
      loginAuditRowsRemoved: input.cleanup.loginAuditRowsRemoved,
      sessionsRemoved: input.cleanup.sessionsRemoved,
      userRolesRemoved: input.cleanup.userRolesRemoved,
      entriesRemoved: input.cleanup.entriesRemoved,
      contentTypesRemoved: input.cleanup.contentTypesRemoved,
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

export async function runTask517Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask517Invocation(context.input);
  await requireEntryUnlockSecret(context.root);
  const manifest = buildExactTask517ScreenshotManifest(context.input);
  assertExactTask517ScreenshotManifest(context.input, manifest);
  const before = await context.timing.measure("snapshot", "task517-before", () =>
    context.repository.snapshot(manifest.paths)
  );
  const marker = createTask517RunMarker();
  const recoveryKey = randomBytes(32).toString("base64url");
  const recoveryAuthority = createTask517RecoveryAuthority({
    profile: context.input.profile,
    runMarker: marker,
    recoveryKey,
  });
  const admin = adminCredential(marker);
  let fixtures: Readonly<{
    readonly public: Task517FixtureSpec;
    readonly private: Task517FixtureSpec;
    readonly passA: Task517FixtureSpec;
    readonly passB: Task517FixtureSpec;
  }> | null = null;
  let workers: WorkerPool | null = null;
  let install: Task517InstallOutput | null = null;
  let cleanup: Task517FixtureCleanup | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Task517Workspace | null = null;
  let transport: BrowserTransport | null = null;
  let dispatcher: PlaywrightCliDispatcher | null = null;
  let primary: unknown | null = null;
  let scenarios: readonly SmokeScenarioResult[] | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let terminal: Task517ProofOutput | null = null;

  try {
    const registry = createTask517WorkerRegistry();
    assertTask517WorkerDescriptorParity(Object.values(TASK517_WORKER_DESCRIPTORS));
    workers = await createTask517WorkerPool(context, registry);
    cleanup = new Task517FixtureCleanup(workers, recoveryAuthority);
    context.lifecycle.register(cleanup);
    install = (await workers.dispatch(
      TASK517_WORKER_DESCRIPTORS.install,
      createTask517InstallInput({
        profile: context.input.profile,
        runMarker: marker,
        recoveryKey,
        admin,
      })
    )) as Task517InstallOutput;
    workers.recordDatabaseBatch(install.statements, install.rows);
    const specs = Object.fromEntries(
      install.fixtures.map((fixture) => [fixture.fixtureId, fixture])
    );
    const publicFixture = specs["task-517-fixture-1"];
    const privateFixture = specs["task-517-fixture-2"];
    const passAFixture = specs["task-517-fixture-3"];
    const passBFixture = specs["task-517-fixture-4"];
    if (
      publicFixture === undefined ||
      privateFixture === undefined ||
      passAFixture === undefined ||
      passBFixture === undefined
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-517 fixture set is incomplete");
    }
    const fixturesValue = {
      public: deriveTask517FixtureSpec(marker, publicFixture.fixtureId),
      private: deriveTask517FixtureSpec(marker, privateFixture.fixtureId),
      passA: deriveTask517FixtureSpec(marker, passAFixture.fixtureId),
      passB: deriveTask517FixtureSpec(marker, passBFixture.fixtureId),
    };
    fixtures = fixturesValue;
    const entryIds = Object.freeze({
      public: publicFixture.entryId,
      private: privateFixture.entryId,
      passA: passAFixture.entryId,
      passB: passBFixture.entryId,
    });
    const adminPath = install.adminPath;
    server = await task517Host(context, adminPath);
    workspace = await Task517Workspace.create(context);
    const planActions = TASK517_SCENARIO_IDS.map((scenarioId, index) =>
      Object.freeze({
        id: `task517-action-${String(index + 1).padStart(2, "0")}`,
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
    if (segments.length !== TASK517_SCENARIO_IDS.length) {
      throw new SmokeError("smoke_output_invalid", "TASK-517 browser plan drifted");
    }
    dispatcher = new PlaywrightCliDispatcher({
      context,
      session: context.input.session,
      workspace: workspace.path,
      segments: segments.map(({ segmentId }) => segmentId),
      runCodeTimeoutMs: 300_000,
    });
    transport = new BrowserTransport(context.input.session, dispatcher);
    context.lifecycle.register(transport);

    // Warm the admin SPA login page and the front homepage so the first scored
    // scenario does not pay the initial vite re-optimization (30-60s). The
    // warmup frame is not a scored receipt and tolerates one bounded retry.
    const warmupSegment = segments[0];
    if (warmupSegment !== undefined && warmupSegment.actionIds.length === 1) {
      const warmupSource = `async (page) => {
        await page.goto("${ADMIN_ORIGIN}${adminPath}/login", { waitUntil: "domcontentloaded", timeout: 180000 });
        await page.waitForSelector('input[name="email"]', { state: "visible", timeout: 120000 });
        await page.goto("${FRONT_ORIGIN}/", { waitUntil: "domcontentloaded", timeout: 180000 });
        return { warmed: true };
      }`;
      const warmupRun = Object.freeze({
        runId: marker,
        manifestSha256: manifestDigest(manifest),
        scenarioId: "anon-public-cached-render",
        segmentId: warmupSegment.segmentId,
        actionIds: warmupSegment.actionIds,
      });
      const warmupFrames = await transport.runSegment(
        Object.freeze({
          segment: warmupSegment,
          actions: Object.freeze([{ actionId: warmupSegment.actionIds[0]!, source: warmupSource }]),
        }),
        warmupRun
      );
      if (warmupFrames.length !== 1 || warmupFrames[0]!.status !== "success") {
        const retryFrames = await transport
          .runSegment(
            Object.freeze({
              segment: warmupSegment,
              actions: Object.freeze([
                { actionId: warmupSegment.actionIds[0]!, source: warmupSource },
              ]),
            }),
            warmupRun
          )
          .catch(() => []);
        if (retryFrames.length !== 1 || retryFrames[0]!.status !== "success") {
          throw new SmokeError("smoke_output_invalid", "TASK-517 warmup could not converge");
        }
      }
    }

    const scenarioTimes = new Map<Task517ScenarioId, number>(
      TASK517_SCENARIOS.map(({ id }) => [id, 0])
    );
    const receipts = new Map<Task517ScenarioId, unknown>();
    for (const [index, scenario] of TASK517_SCENARIOS.entries()) {
      const segment = segments[index];
      if (segment === undefined || segment.actionIds.length !== 1) {
        throw new SmokeError("smoke_output_invalid", "TASK-517 browser segment drifted");
      }
      const screenshot = manifest.entries.find(({ scenarioId }) => scenarioId === scenario.id);
      const cfg = buildTask517BrowserActionConfig({
        scenarioId: scenario.id,
        theme: "light",
        runMarker: marker,
        fixtures: fixturesValue,
        contentTypeSlug: install.contentTypeSlug,
        contentTypeName: `TASK-517 ${marker}`,
        entryIds,
        adminPath,
        adminEmail: admin.email,
        adminPassword: admin.password,
        screenshotPath: screenshot?.path ?? null,
      });
      const started = performance.now();
      const source = materializeTask517BrowserAction(cfg);
      const frames = await transport.runSegment(
        Object.freeze({
          segment,
          actions: Object.freeze([{ actionId: segment.actionIds[0]!, source }]),
        }),
        Object.freeze({
          runId: marker,
          manifestSha256: manifestDigest(manifest),
          scenarioId: scenario.id,
          segmentId: segment.segmentId,
          actionIds: segment.actionIds,
        })
      );
      if (frames.length !== 1) {
        throw new SmokeError(
          "smoke_output_invalid",
          "TASK-517 browser frame cardinality is invalid"
        );
      }
      const receipt = sourceReceipt(frames[0]!);
      assertTask517BrowserReceipt(receipt, cfg);
      receipts.set(scenario.id, receipt);
      scenarioTimes.set(
        scenario.id,
        (scenarioTimes.get(scenario.id) ?? 0) + Math.ceil(performance.now() - started)
      );
    }

    const readProjection = (await workers.dispatch(
      TASK517_WORKER_DESCRIPTORS.read,
      Object.freeze({ authority: recoveryAuthority, fixtureIds: Object.keys(specs) })
    )) as {
      fixtures?: readonly {
        fixtureId?: string;
        kind?: string;
        status?: string;
        published?: boolean;
        hasAccessPassword?: boolean;
      }[];
      statements?: number;
      rows?: number;
    };
    workers.recordDatabaseBatch(readProjection.statements ?? 0, readProjection.rows ?? 0);
    const readFixtures = readProjection.fixtures ?? [];
    if (
      readFixtures.length !== 4 ||
      readFixtures.some(
        (entry) =>
          entry.status !== "published" ||
          entry.published !== true ||
          (entry.fixtureId === "task-517-fixture-3" || entry.fixtureId === "task-517-fixture-4"
            ? entry.hasAccessPassword !== true
            : entry.hasAccessPassword !== false)
      )
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-517 persisted fixture projection drifted");
    }

    screenshots = await validateTask517ScreenshotOutputs(context.root, context.input, manifest);
    const screenshotByScenario = new Map(
      screenshots.map((screenshot, index) => [TASK517_SCENARIO_IDS[index]!, screenshot])
    );
    scenarios = Object.freeze(
      TASK517_SCENARIOS.map(({ id, title }) => {
        const receipt = receipts.get(id);
        const screenshot = screenshotByScenario.get(id);
        if (receipt === undefined || screenshot === undefined) {
          throw new SmokeError("smoke_output_invalid", "TASK-517 scenario evidence is incomplete");
        }
        return Object.freeze({
          id,
          pass: true,
          elapsedMs: scenarioTimes.get(id) ?? 0,
          title,
          variants: buildTask517ScenarioAssertions(
            id,
            receipt as Parameters<typeof buildTask517ScenarioAssertions>[1]
          ),
          screenshots: Object.freeze([screenshot]),
        });
      })
    );
    requireManifestableScenarioResults(scenarios, screenshots);
  } catch (error) {
    primary = error;
    const diagLines: string[] = [
      `=== TASK-517 adapter failure ${new Date().toISOString()} ===`,
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
      } catch {}
    }
    appendDiagnostics(context.root, context.input.session, diagLines);
    const evidenceSetFailure =
      primary instanceof SmokeError &&
      primary.message.includes("screenshot evidence set is invalid");
    if (!evidenceSetFailure) {
      for (const relativePath of manifest.paths) {
        const pngPath = resolveInsideRoot(context.root, relativePath, "task_517_failed_png");
        await unlinkPng(pngPath);
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
        TASK517_WORKER_DESCRIPTORS.prove,
        recoveryAuthority
      )) as Task517ProofOutput;
      workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (
        terminal.fixturesAbsent !== true ||
        terminal.identitiesAbsent !== true ||
        terminal.settingsRestored !== true
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-517 terminal proof is incomplete");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null) {
    try {
      await workers.close();
      if (!(await workers.proveAbsent())) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-517 worker remained active");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  let afterFailure: unknown | null = null;
  try {
    const after = await context.timing.measure("snapshot", "task517-after", () =>
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
      "TASK-517 adapter failed",
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
    throw new SmokeError("smoke_output_invalid", "TASK-517 adapter execution is incomplete");
  }
  const result = projectTask517AdapterResult({
    scenarios,
    screenshots,
    cleanup: cleanupOutput,
    proof: terminal,
    workers,
    repositorySnapshots: context.repository.count(),
  });
  assertTask517SafeProjection(result, [
    admin.password,
    admin.email,
    fixtures?.passA.accessPassword ?? "",
    fixtures?.passB.accessPassword ?? "",
    process.env.AUTH_PASSWORD_PEPPER ?? "",
    recoveryKey,
    context.root,
    workspace?.path ?? "",
  ]);
  return result;
}

async function unlinkPng(path: string): Promise<void> {
  try {
    const info = await lstat(path).catch(() => null);
    if (info !== null && info.isFile() && info.nlink === 1 && !info.isSymbolicLink()) {
      await unlink(path);
    }
  } catch {
    // Best-effort removal of failed-session PNGs.
  }
}

const adapter: SmokeAdapter = Object.freeze({
  // TASK-517 registers the suite in the orchestrator's registry step;
  // SmokeSuiteId is a closed union, so the id is narrowed here until the
  // orchestrator extends the union in the same change.
  suiteId: "task-517" as SmokeSuiteId,
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask517Adapter,
  evidenceDirectory(input: SmokeInput, root: string) {
    return resolveInsideRoot(root, `${EVIDENCE_ROOT}/${input.session}`, "task_517_evidence");
  },
});

export default adapter;
