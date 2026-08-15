import { createHash, randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

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
import type { WorkerPool } from "../workers/pool";
import type { SmokeAdapter, SmokeAdapterResult, SmokeScenarioResult } from "./types";
import {
  TASK487_SCENARIOS,
  TASK487_VARIANTS,
  buildTask487FixtureSpecs,
} from "./task-487/descriptors";
import {
  assertTask487BrowserReceipt,
  materializeTask487BrowserAction,
  type Task487BrowserFixture,
  type Task487BootstrapSpec,
} from "./task-487/browser-actions";
import {
  assertExactTask487Invocation,
  assertExactTask487ScreenshotManifest,
  buildExactTask487ScreenshotManifest,
  validateTask487ScreenshotOutputs,
  EVIDENCE_ROOT,
} from "./task-487/output-manifest";
import {
  TASK487_WORKER_DESCRIPTORS,
  createTask487InstallInput,
  createTask487RecoveryAuthority,
  createTask487WorkerPool,
  createTask487WorkerRegistry,
  type Task487ActorCredentials,
  type Task487CleanupOutput,
  type Task487InstallOutput,
  type Task487ProofOutput,
  type Task487RecoveryAuthority,
} from "./task-487/worker-operations";
import { createTask487PrivateWorkspace, Task487Workspace } from "./task-487/workspace";

export { assertExactTask487Invocation } from "./task-487/output-manifest";

const ADMIN_ORIGIN = "http://127.0.0.1:5173";
const FRONT_ORIGIN = "http://127.0.0.1:3000";
const ADMIN_AUTH_FAILURE =
  /^(?:credentials_missing|login_network_failed|login_failed:[3-5]\d{2}|session_cookie_(?:missing|invalid))$/u;

const SEO = Object.freeze({
  title: "TASK-487 SEO receipt",
  description: "TASK-487 SEO meta description",
  canonicalUrl: "https://example.com/task487-entry",
  robots: "index,follow",
});

const FIRST_BODY = "First body";
const SECOND_BODY = "Second body";

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

export function assertTask487AdminAuthOutcome(
  outcome: unknown
): asserts outcome is AdminAuthStorageStateResult {
  if (outcome === null || typeof outcome !== "object" || Array.isArray(outcome)) {
    throw new SmokeError("smoke_output_invalid", "TASK-487 authentication output is invalid");
  }
  const value = outcome as Record<string, unknown>;
  if (value.attempted !== true) {
    throw new SmokeError("smoke_output_invalid", "TASK-487 authentication output is invalid");
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
    throw new SmokeError("smoke_authentication_failed", "TASK-487 authentication failed");
  }
  throw new SmokeError("smoke_output_invalid", "TASK-487 authentication output is invalid");
}

export async function awaitTask487AdminAuthentication(
  authentication: Promise<AdminAuthStorageStateResult>,
  unexpectedServerExit: Promise<never>
): Promise<void> {
  const outcome = await Promise.race([authentication, unexpectedServerExit]);
  assertTask487AdminAuthOutcome(outcome);
}

function actorCredentials(marker: string): Task487ActorCredentials {
  return Object.freeze({
    email: `task487-${marker}-admin@smoke.invalid`,
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

function task487Host(
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
      Object.freeze({ id: "task487-front-ready", check: () => ready(`${FRONT_ORIGIN}/`) }),
      Object.freeze({
        id: "task487-admin-ready",
        check: () => ready(`${ADMIN_ORIGIN}${adminPath}/`),
      }),
    ]),
    family: "task487-dev-host",
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
    throw new SmokeError("smoke_output_invalid", "TASK-487 browser action failed");
  }
  return frame.output;
}

function bootstrapSpecs(marker: string): readonly Task487BootstrapSpec[] {
  return TASK487_SCENARIOS.map((descriptor) =>
    Object.freeze({
      scenarioId: descriptor.id,
      slug: `task487-${marker}-entry-${descriptor.id}`,
      title: `TASK-487 ${descriptor.id} (${descriptor.title})`,
    })
  );
}

function fixtureKey(scenarioId: string, variantId: string): string {
  return `${scenarioId}/${variantId}`;
}

function assertTask487CompletedReceipts(
  profile: "fast" | "certification",
  completed: readonly Readonly<{ readonly scenarioId: string; readonly variantId: string }>[]
): void {
  const expected = buildTask487FixtureSpecs(profile);
  if (
    completed.length !== expected.length ||
    completed.some(
      (receipt, index) =>
        receipt.scenarioId !== expected[index]?.scenarioId ||
        receipt.variantId !== expected[index]?.variantId
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-487 browser receipt matrix is incomplete");
  }
}

export function assertTask487SafeProjection(
  result: SmokeAdapterResult,
  privateValues: readonly string[]
): void {
  const encoded = JSON.stringify(result);
  if (privateValues.some((value) => value.length > 0 && encoded.includes(value))) {
    throw new SmokeError("smoke_output_invalid", "TASK-487 report leaked private material");
  }
}

function projectTask487AdapterResult(input: {
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly screenshots: SmokeAdapterResult["screenshots"];
  readonly cleanup: Task487CleanupOutput;
  readonly proof: Task487ProofOutput;
  readonly workers: WorkerPool;
  readonly repositorySnapshots: number;
  readonly adminPath: string;
  readonly typeSlug: string;
}): SmokeAdapterResult {
  const counters = input.workers.counters();
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: input.scenarios,
    screenshots: input.screenshots,
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      revisionsRemoved: input.cleanup.revisionsRemoved,
      entriesRemoved: input.cleanup.entriesRemoved,
      typesRemoved: input.cleanup.typesRemoved,
      sessionsRemoved: input.cleanup.sessionsRemoved,
      userRolesRemoved: input.cleanup.userRolesRemoved,
      usersRemoved: input.cleanup.usersRemoved,
      workerStarts: counters.starts,
      workerRequests: counters.requests,
      databaseBatches: counters.databaseBatches,
      statements: counters.statements,
      rows: counters.rows,
      pageErrors: 0,
      repositorySnapshots: input.repositorySnapshots,
      adminPath: input.adminPath,
      typeSlug: input.typeSlug,
      fixturesAbsent: input.proof.fixturesAbsent,
      actorAbsent: input.proof.actorAbsent,
    }),
  });
}

class Task487FixtureCleanup implements LifecycleResource {
  readonly name = "task487-fixture-cleanup";
  readonly #workers: WorkerPool;
  readonly #authority: Task487RecoveryAuthority;
  #output: Task487CleanupOutput | null = null;
  #closed: Promise<void> | null = null;

  constructor(workers: WorkerPool, authority: Task487RecoveryAuthority) {
    this.#workers = workers;
    this.#authority = authority;
  }

  output(): Task487CleanupOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closed ??= this.#closeOnce();
    return this.#closed;
  }

  async #closeOnce(): Promise<void> {
    const output = (await this.#workers.dispatch(
      TASK487_WORKER_DESCRIPTORS.cleanup,
      this.#authority
    )) as Task487CleanupOutput;
    this.#output = output;
    this.#workers.recordDatabaseBatch(output.statements, output.rows);
    if (output.absenceProved !== true) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-487 fixture cleanup proof is incomplete");
    }
  }

  async proveAbsent(): Promise<boolean> {
    return this.#output?.absenceProved === true;
  }
}

async function closeAndProve(resource: LifecycleResource | null): Promise<void> {
  if (resource === null) return;
  await resource.close();
  if (!(await resource.proveAbsent())) {
    throw new SmokeError("smoke_cleanup_failed", `${resource.name} remained active`);
  }
}

export async function runTask487Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask487Invocation(context.input);
  const manifest = buildExactTask487ScreenshotManifest(context.input);
  assertExactTask487ScreenshotManifest(context.input, manifest);
  const before = await context.timing.measure("snapshot", "task487-before", () =>
    context.repository.snapshot(manifest.paths)
  );
  const marker = randomBytes(12).toString("hex");
  const recoveryKey = randomBytes(32).toString("base64url");
  const recoveryAuthority = createTask487RecoveryAuthority({
    profile: context.input.profile,
    runMarker: marker,
    recoveryKey,
  });
  const credentials = actorCredentials(marker);
  let workers: WorkerPool | null = null;
  let install: Task487InstallOutput | null = null;
  let cleanup: Task487FixtureCleanup | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Task487Workspace | null = null;
  let transport: BrowserTransport | null = null;
  let dispatcher: PlaywrightCliDispatcher | null = null;
  let authPath: string | null = null;
  let primary: unknown | null = null;
  let scenarios: readonly SmokeScenarioResult[] | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let terminal: Task487ProofOutput | null = null;

  try {
    workers = await createTask487WorkerPool(context, createTask487WorkerRegistry());
    cleanup = new Task487FixtureCleanup(workers, recoveryAuthority);
    context.lifecycle.register(cleanup);
    install = (await workers.dispatch(
      TASK487_WORKER_DESCRIPTORS.install,
      createTask487InstallInput({
        profile: context.input.profile,
        runMarker: marker,
        recoveryKey,
        actor: credentials,
      })
    )) as Task487InstallOutput;
    workers.recordDatabaseBatch(install.statements, install.rows);
    server = await task487Host(context, install.adminPath);
    workspace = await createTask487PrivateWorkspace(context);
    const fixtures = bootstrapSpecs(marker);
    const specPlan = buildTask487FixtureSpecs(context.input.profile);
    const planActions = specPlan.map((spec, index) =>
      Object.freeze({
        id: `task487-action-${String(index + 1).padStart(2, "0")}`,
        scenarioId: spec.scenarioId,
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
      // The supervised dev host compiles the admin modules on first load
      // (30-60s); the in-page waits alone do not extend the process budget.
      runCodeTimeoutMs: 300_000,
    });
    transport = new BrowserTransport(context.input.session, dispatcher);
    const activeTransport = transport;
    context.lifecycle.register(transport);
    authPath = join(workspace.path, "admin-auth.json");
    await awaitTask487AdminAuthentication(
      createAdminAuthStorageState({
        adminUrl: `${ADMIN_ORIGIN}/admin`,
        workspace: workspace.path,
        storageStatePath: authPath,
        environment: Object.freeze({
          CODERSO_PLAYWRIGHT_EMAIL: credentials.email,
          CODERSO_PLAYWRIGHT_PASSWORD: credentials.password,
        }),
      }),
      server.waitForUnexpectedExit()
    );
    // Scenario 1 (admin-login) doubles as the session warmup: it is the
    // first browser dispatch, so a fresh Playwright process could crash
    // transiently, and the admin SPA re-optimizes dependencies on first
    // load. It logs in in-page and therefore intentionally runs WITHOUT
    // storage state; the auth storage state is loaded right after it so
    // scenarios 2-6 start authenticated. The loop below gives scenario 1
    // one bounded retry; all other scenarios stay single-shot.
    const scenarioTimes = new Map(TASK487_SCENARIOS.map(({ id }) => [id, 0]));
    const completedReceipts: Array<
      Readonly<{ readonly scenarioId: string; readonly variantId: string }>
    > = [];
    const fixtureMap = new Map<string, Task487BrowserFixture>();
    let loadedStorageState = false;
    for (const [index, spec] of buildTask487FixtureSpecs(context.input.profile).entries()) {
      const descriptor = TASK487_SCENARIOS.find(({ id }) => id === spec.scenarioId);
      const variant = TASK487_VARIANTS.find(({ id }) => id === spec.variantId);
      const segment = segments[index];
      if (descriptor === undefined || variant === undefined || segment === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-487 browser plan drifted");
      }
      if (spec.scenarioId !== "admin-login" && !loadedStorageState) {
        await dispatcher.loadStorageState(authPath);
        loadedStorageState = true;
      }
      const fixture = fixtureMap.get(spec.scenarioId) ?? null;
      const screenshot = manifest.entries.find(
        ({ scenarioId }) => scenarioId === descriptor.id
      )?.path;
      const screenshotPath =
        variant.id !== descriptor.canonicalVariant ? null : (screenshot ?? null);
      const started = performance.now();
      const source = materializeTask487BrowserAction({
        descriptor,
        fixture,
        variant,
        screenshotPath,
        config: {
          entryTitle: `TASK-487 ${descriptor.id} (${descriptor.title})`,
          adminOrigin: ADMIN_ORIGIN,
          adminPath: install.adminPath,
          typeSlug: install.typeSlug,
          actorEmail: credentials.email,
          actorPassword: credentials.password,
          dataA: Object.freeze({
            title: `TASK-487 ${descriptor.id} A`,
            body: FIRST_BODY,
          }),
          dataB: Object.freeze({
            title: `TASK-487 ${descriptor.id} B`,
            body: SECOND_BODY,
          }),
          expectedBody: variant.id === "dark-1440x900" ? SECOND_BODY : FIRST_BODY,
          restoreVersion: variant.id === "dark-1440x900" ? "Version 2" : "Version 1",
          seo: SEO,
          fixtures,
        },
      });
      const runOnce = async (): Promise<readonly BrowserActionFrame[]> =>
        activeTransport.runSegment(
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
      let frames: readonly BrowserActionFrame[] = await runOnce();
      // Scenario 1 is the first browser dispatch of the session; a fresh
      // Playwright process can crash transiently on its first run, so give
      // the in-page login/bootstrap one bounded retry. Scenarios 2-6 run on
      // the warmed session and stay single-shot.
      if (
        spec.scenarioId === "admin-login" &&
        (frames.length !== 1 || frames[0]?.status !== "success")
      ) {
        frames = await runOnce().catch(() => []);
      }
      if (frames.length !== 1) {
        throw new SmokeError(
          "smoke_output_invalid",
          "TASK-487 browser frame cardinality is invalid"
        );
      }
      const receipt = sourceReceipt(frames[0]!);
      assertTask487BrowserReceipt(receipt, descriptor, fixture, variant, {
        expectedBody: variant.id === "dark-1440x900" ? SECOND_BODY : FIRST_BODY,
        restoreVersion: variant.id === "dark-1440x900" ? "Version 2" : "Version 1",
      });
      if (spec.scenarioId === "admin-login") {
        const bootstrapped = receipt.bootstrappedFixtures;
        for (const entry of bootstrapped) {
          fixtureMap.set(
            entry.scenarioId,
            Object.freeze({ scenarioId: entry.scenarioId, entryId: entry.entryId })
          );
        }
      }
      const resolvedFixture = fixtureMap.get(spec.scenarioId);
      if (spec.scenarioId !== "admin-login" && resolvedFixture === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-487 browser fixture is absent");
      }
      completedReceipts.push(
        Object.freeze({ scenarioId: spec.scenarioId, variantId: spec.variantId })
      );
      scenarioTimes.set(
        descriptor.id,
        (scenarioTimes.get(descriptor.id) ?? 0) + Math.ceil(performance.now() - started)
      );
    }
    assertTask487CompletedReceipts(context.input.profile, completedReceipts);
    scenarios = Object.freeze(
      TASK487_SCENARIOS.map(({ id }) =>
        Object.freeze({ id, pass: true, elapsedMs: scenarioTimes.get(id) ?? 0 })
      )
    );
    screenshots = await validateTask487ScreenshotOutputs(context.root, context.input, manifest);
  } catch (error) {
    primary = error;
    const diagLines: string[] = [
      `=== TASK-487 adapter failure ${new Date().toISOString()} ===`,
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
    // A failed session must contain only report.json for the workflow's
    // failure-code reader; remove this run's screenshot PNGs best-effort.
    // Evidence-set validation failures keep the PNGs so the failure stays
    // inspectable.
    const evidenceSetFailure =
      primary instanceof SmokeError &&
      primary.message.includes("screenshot evidence set is invalid");
    if (!evidenceSetFailure) {
      for (const relativePath of manifest.paths) {
        const pngPath = resolveInsideRoot(context.root, relativePath, "task_487_failed_png");
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
        TASK487_WORKER_DESCRIPTORS.prove,
        recoveryAuthority
      )) as Task487ProofOutput;
      workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (terminal.fixturesAbsent !== true || terminal.actorAbsent !== true) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-487 terminal proof is incomplete");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null) {
    try {
      await workers.close();
      if (!(await workers.proveAbsent()))
        throw new SmokeError("smoke_cleanup_failed", "TASK-487 worker remained active");
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  let afterFailure: unknown | null = null;
  try {
    const after = await context.timing.measure("snapshot", "task487-after", () =>
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
      "TASK-487 adapter failed",
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
    throw new SmokeError("smoke_output_invalid", "TASK-487 adapter execution is incomplete");
  }
  const result = projectTask487AdapterResult({
    scenarios,
    screenshots,
    cleanup: cleanupOutput,
    proof: terminal,
    workers,
    repositorySnapshots: context.repository.count(),
    adminPath: install.adminPath,
    typeSlug: install.typeSlug,
  });
  assertTask487SafeProjection(result, [
    credentials.password,
    credentials.email,
    process.env.AUTH_PASSWORD_PEPPER ?? "",
    recoveryKey,
    context.root,
    workspace?.path ?? "",
  ]);
  return result;
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-487",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask487Adapter,
  evidenceDirectory(input: SmokeInput, root: string) {
    return resolveInsideRoot(root, `${EVIDENCE_ROOT}/${input.session}`, "task_487_evidence");
  },
});

export default adapter;
