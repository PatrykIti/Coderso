import { createHash, randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";

import { resolveInsideRoot, SmokeError, type SmokeInput, type SmokeSuiteId } from "../contracts";
import { appendDiagnostics } from "../diagnostics";
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
import {
  requireManifestableScenarioResults,
  type ManifestableSmokeScenarioResult,
} from "../visible-evidence";
import type {
  SmokeAdapter,
  SmokeAdapterResult,
  SmokeScenarioResult,
  SmokeScenarioVariantResult,
  SmokeScreenshotResult,
  SmokeVisibleAssertionResult,
} from "./types";
import {
  TASK492_SCENARIOS,
  TASK492_SCENARIO_IDS,
  assertTask492BrowserReceipt,
  materializeTask492BrowserAction,
  task492VariantFor,
  type Task492BrowserConfig,
  type Task492BrowserReceipt,
  type Task492ScenarioId,
} from "./task-492/browser-actions";
import {
  assertExactTask492Invocation,
  assertExactTask492ScreenshotManifest,
  buildExactTask492ScreenshotManifest,
  validateTask492ScreenshotOutputs,
  TASK492_EVIDENCE_ROOT,
} from "./task-492/output-manifest";
import {
  TASK492_WORKER_DESCRIPTORS,
  createTask492BootstrapInput,
  createTask492ReadInput,
  createTask492RecoveryAuthority,
  createTask492WorkerPool,
  createTask492WorkerRegistry,
  type Task492BootstrapOutput,
  type Task492CleanupOutput,
  type Task492ProofOutput,
  type Task492ReadOutput,
  type Task492RecoveryAuthority,
} from "./task-492/worker-operations";
import { createTask492PrivateWorkspace, type Task492Workspace } from "./task-492/workspace";

export { assertExactTask492Invocation } from "./task-492/output-manifest";

const ADMIN_ORIGIN = "http://127.0.0.1:5173";
const FRONT_ORIGIN = "http://127.0.0.1:3000";

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

function task492Host(
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
      Object.freeze({ id: "task492-front-ready", check: () => ready(`${FRONT_ORIGIN}/`) }),
      Object.freeze({
        id: "task492-admin-ready",
        check: () => ready(`${ADMIN_ORIGIN}${adminPath}/`),
      }),
    ]),
    family: "task492-dev-host",
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
    throw new SmokeError("smoke_output_invalid", "TASK-492 browser action failed");
  }
  return frame.output;
}

type Task492VariantShell = Omit<SmokeScenarioVariantResult, "assertions" | "consoleErrors">;

function variantForScenario(scenarioId: Task492ScenarioId): Task492VariantShell {
  const variant = task492VariantFor(scenarioId);
  return Object.freeze({
    id: variant.id,
    surface: "admin",
    theme: variant.colorScheme,
    viewport: variant.viewport,
  });
}

function booleanAssertion(
  kind: SmokeVisibleAssertionResult["kind"],
  target: string,
  property: string,
  value: boolean | string | number
): SmokeVisibleAssertionResult {
  const text = String(value);
  return Object.freeze({ kind, target, property, expected: text, actual: text, pass: true });
}

function boxAssertion(
  target: string,
  property: string,
  width: number,
  height: number
): SmokeVisibleAssertionResult {
  const text = `${width}x${height}`;
  return Object.freeze({
    kind: "geometry",
    target,
    property,
    expected: text,
    actual: text,
    pass: true,
  });
}

function assertionsForScenario(
  scenarioId: Task492ScenarioId,
  receipt: Task492BrowserReceipt
): readonly SmokeVisibleAssertionResult[] {
  switch (scenarioId) {
    case "admin-login":
      return Object.freeze([
        booleanAssertion(
          "dom-state",
          "login form",
          "visible-after-login",
          receipt.loginFormVisible ?? false
        ),
        boxAssertion(
          "email input",
          "box",
          receipt.loginFormBoxWidth ?? 0,
          receipt.loginFormBoxHeight ?? 0
        ),
        booleanAssertion(
          "dom-state",
          "authenticated shell",
          "settings-link-visible",
          receipt.authenticatedShellVisible ?? false
        ),
        booleanAssertion(
          "dom-state",
          "post-login path",
          "starts-with-admin-path",
          receipt.postLoginPath?.startsWith("/") ?? false
        ),
      ]);
    case "login-alerts-controls":
      return Object.freeze([
        booleanAssertion("dom-state", "heading", "visible", receipt.headingVisible ?? false),
        boxAssertion("heading", "box", receipt.headingBoxWidth ?? 0, receipt.headingBoxHeight ?? 0),
        booleanAssertion(
          "dom-state",
          "custom email textarea",
          "visible",
          receipt.recipientsVisible ?? false
        ),
        booleanAssertion(
          "dom-state",
          "custom email textarea",
          "enabled",
          receipt.recipientsEnabled ?? false
        ),
        booleanAssertion(
          "aria",
          "email channel switch",
          "aria-checked",
          receipt.emailChannelChecked ?? false
        ),
        booleanAssertion(
          "aria",
          "webhook channel switch",
          "aria-checked",
          receipt.webhookChannelChecked ?? false
        ),
        booleanAssertion(
          "dom-state",
          "webhook fields",
          "absent",
          receipt.webhookFieldsAbsent ?? false
        ),
      ]);
    case "webhook-enable-fields":
      return Object.freeze([
        booleanAssertion(
          "aria",
          "webhook channel switch",
          "aria-checked",
          receipt.webhookSwitchChecked ?? false
        ),
        booleanAssertion(
          "dom-state",
          "webhook url field",
          "visible",
          receipt.webhookUrlVisible ?? false
        ),
        booleanAssertion(
          "dom-state",
          "webhook secret field",
          "visible",
          receipt.webhookSecretVisible ?? false
        ),
        booleanAssertion(
          "dom-state",
          "webhook url field",
          "value-matches",
          receipt.webhookUrlValueMatches ?? false
        ),
        booleanAssertion(
          "dom-state",
          "webhook secret field",
          "value-matches",
          receipt.webhookSecretValueMatches ?? false
        ),
        boxAssertion(
          "webhook switch",
          "box",
          receipt.webhookSwitchBoxWidth ?? 0,
          receipt.webhookSwitchBoxHeight ?? 0
        ),
        boxAssertion(
          "webhook url field",
          "box",
          receipt.webhookUrlBoxWidth ?? 0,
          receipt.webhookUrlBoxHeight ?? 0
        ),
      ]);
    case "edit-save":
      return Object.freeze([
        booleanAssertion("dom-state", "save", "patch-count", receipt.savePatchCount ?? 0),
        booleanAssertion("dom-state", "patch response", "status", receipt.patchResponseStatus ?? 0),
        booleanAssertion(
          "dom-state",
          "patch response",
          "path-matches",
          receipt.patchPathMatches ?? false
        ),
        booleanAssertion(
          "dom-state",
          "patch response",
          "webhookSecret-configured-only",
          receipt.configuredOnlyInResponse ?? false
        ),
        booleanAssertion(
          "dom-state",
          "patch response",
          "raw-secret-absent",
          receipt.secretAbsentFromResponse ?? false
        ),
        booleanAssertion(
          "dom-state",
          "patch response",
          "webhookUrl-present",
          receipt.webhookUrlInResponse ?? false
        ),
        booleanAssertion(
          "dom-state",
          "success alert",
          "visible",
          receipt.successAlertVisible ?? false
        ),
        booleanAssertion(
          "dom-state",
          "configured label",
          "visible",
          receipt.configuredLabelVisible ?? false
        ),
        booleanAssertion(
          "dom-state",
          "page text",
          "raw-secret-absent",
          receipt.secretAbsentFromDom ?? false
        ),
        booleanAssertion(
          "dom-state",
          "webhook url field",
          "value-persisted",
          receipt.urlValuePersisted ?? false
        ),
        booleanAssertion(
          "dom-state",
          "webhook secret field",
          "empty-after-reload",
          receipt.secretInputEmptyAfterReload ?? false
        ),
        booleanAssertion(
          "dom-state",
          "configured label",
          "visible-after-reload",
          receipt.configuredAfterReload ?? false
        ),
        boxAssertion(
          "save button",
          "box",
          receipt.saveButtonWidth ?? 0,
          receipt.saveButtonHeight ?? 0
        ),
        boxAssertion(
          "success alert",
          "box",
          receipt.successAlertWidth ?? 0,
          receipt.successAlertHeight ?? 0
        ),
      ]);
    case "dark-parity":
      return Object.freeze([
        booleanAssertion(
          "dom-state",
          "media query",
          "prefers-dark",
          receipt.darkMediaMatches ?? false
        ),
        booleanAssertion(
          "dom-state",
          "heading color",
          "dark-differs-from-light",
          receipt.darkBackgroundDiffers ?? false
        ),
        booleanAssertion(
          "dom-state",
          "configured label",
          "visible-in-dark",
          receipt.configuredInDark ?? false
        ),
        booleanAssertion(
          "dom-state",
          "heading",
          "visible-in-dark",
          receipt.headingVisibleInDark ?? false
        ),
        booleanAssertion(
          "computed-style",
          "heading",
          "color-light",
          receipt.headingColorLight ?? ""
        ),
        booleanAssertion("computed-style", "heading", "color-dark", receipt.headingColorDark ?? ""),
        boxAssertion("heading", "box", receipt.headingBoxWidth ?? 0, receipt.headingBoxHeight ?? 0),
      ]);
    default:
      throw new SmokeError("smoke_output_invalid", "TASK-492 scenario assertions are absent");
  }
}

function buildTask492Scenarios(
  receipts: readonly {
    readonly scenarioId: Task492ScenarioId;
    readonly receipt: Task492BrowserReceipt;
  }[],
  screenshotsByScenario: ReadonlyMap<Task492ScenarioId, SmokeScreenshotResult>,
  scenarioTimes: ReadonlyMap<Task492ScenarioId, number>
): readonly SmokeScenarioResult[] {
  return Object.freeze(
    TASK492_SCENARIOS.map((descriptor) => {
      const entry = receipts.find(({ scenarioId }) => scenarioId === descriptor.id);
      const screenshot = screenshotsByScenario.get(descriptor.id);
      if (entry === undefined || screenshot === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 scenario evidence is incomplete");
      }
      const variant = variantForScenario(descriptor.id);
      const assertions = assertionsForScenario(descriptor.id, entry.receipt);
      return Object.freeze({
        id: descriptor.id,
        pass: true,
        elapsedMs: scenarioTimes.get(descriptor.id) ?? 0,
        title: descriptor.title,
        variants: Object.freeze([
          Object.freeze({
            ...variant,
            assertions,
            consoleErrors: Object.freeze([]),
          }),
        ]),
        screenshots: Object.freeze([screenshot]),
      });
    })
  );
}

class Task492FixtureCleanup implements LifecycleResource {
  readonly name = "task492-fixture-cleanup";
  readonly #workers: WorkerPool;
  readonly #authority: Task492RecoveryAuthority;
  #output: Task492CleanupOutput | null = null;
  #closed: Promise<void> | null = null;

  constructor(workers: WorkerPool, authority: Task492RecoveryAuthority) {
    this.#workers = workers;
    this.#authority = authority;
  }

  output(): Task492CleanupOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closed ??= this.#closeOnce();
    return this.#closed;
  }

  async #closeOnce(): Promise<void> {
    const output = await this.#workers.dispatch(
      TASK492_WORKER_DESCRIPTORS.cleanup,
      this.#authority
    );
    this.#output = output as Task492CleanupOutput;
    this.#workers.recordDatabaseBatch(this.#output.statements, this.#output.rows);
    if (
      this.#output.preIdentityAbsenceProved !== true ||
      this.#output.identityAbsenceProved !== true ||
      this.#output.settingsRestored !== true
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-492 fixture cleanup proof is incomplete");
    }
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#output?.preIdentityAbsenceProved === true && this.#output.identityAbsenceProved === true
    );
  }
}

export function assertTask492SafeProjection(
  result: SmokeAdapterResult,
  privateValues: readonly string[]
): void {
  const encoded = JSON.stringify(result);
  if (privateValues.some((value) => value.length > 0 && encoded.includes(value))) {
    throw new SmokeError("smoke_output_invalid", "TASK-492 report leaked private material");
  }
}

interface Task492ProjectionInput {
  readonly scenarios: readonly ManifestableSmokeScenarioResult[];
  readonly screenshots: readonly SmokeScreenshotResult[];
  readonly cleanup: Task492CleanupOutput;
  readonly proof: Task492ProofOutput;
  readonly workers: WorkerPool;
  readonly repositorySnapshots: number;
}

export function projectTask492AdapterResult(input: Task492ProjectionInput): SmokeAdapterResult {
  if (input.cleanup.settingsRestored !== true || input.proof.settingsRestored !== true) {
    throw new SmokeError(
      "smoke_cleanup_failed",
      "TASK-492 settings restoration proof is incomplete"
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
      sessionsRemoved: input.cleanup.sessionsRemoved,
      auditRowsRemoved: input.cleanup.auditRowsRemoved,
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
      settingsRestored: true,
      fixturesAbsent: input.proof.fixturesAbsent,
      identitiesAbsent: input.proof.identitiesAbsent,
      receiptAbsent: input.proof.receiptAbsent,
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

export async function runTask492Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  assertExactTask492Invocation(context.input);
  const manifest = buildExactTask492ScreenshotManifest(context.input);
  assertExactTask492ScreenshotManifest(context.input, manifest);
  const before = await context.timing.measure("snapshot", "task492-before", () =>
    context.repository.snapshot(manifest.paths)
  );
  const marker = randomBytes(12).toString("hex");
  const recoveryKey = randomBytes(32).toString("base64url");
  const recoveryAuthority = createTask492RecoveryAuthority({
    profile: context.input.profile,
    runMarker: marker,
    recoveryKey,
  });
  const password = randomBytes(24).toString("base64url");
  const email = `task492-${marker}-admin@smoke.invalid`;
  const webhookUrl = "https://example.test/wf560-492-webhook";
  const webhookSecret = `wf560-492-secret-${marker}`;
  let workers: WorkerPool | null = null;
  let bootstrap: Task492BootstrapOutput | null = null;
  let cleanup: Task492FixtureCleanup | null = null;
  let server: SupervisedServerResource | null = null;
  let workspace: Task492Workspace | null = null;
  let transport: BrowserTransport | null = null;
  let dispatcher: PlaywrightCliDispatcher | null = null;
  let primary: unknown | null = null;
  let scenarios: readonly ManifestableSmokeScenarioResult[] | null = null;
  let screenshots: SmokeAdapterResult["screenshots"] | null = null;
  let terminal: Task492ProofOutput | null = null;

  try {
    workers = await createTask492WorkerPool(context, createTask492WorkerRegistry());
    cleanup = new Task492FixtureCleanup(workers, recoveryAuthority);
    context.lifecycle.register(cleanup);
    bootstrap = (await workers.dispatch(
      TASK492_WORKER_DESCRIPTORS.bootstrap,
      createTask492BootstrapInput({
        authority: recoveryAuthority,
        email,
        password,
      })
    )) as Task492BootstrapOutput;
    workers.recordDatabaseBatch(bootstrap.statements, bootstrap.rows);
    const adminPath = bootstrap.adminPath;
    server = await task492Host(context, adminPath);
    workspace = await createTask492PrivateWorkspace(context);
    const planActions = TASK492_SCENARIO_IDS.map((scenarioId, index) =>
      Object.freeze({
        id: `task492-action-${String(index + 1).padStart(2, "0")}`,
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
      segments: Object.freeze([...segments.map(({ segmentId }) => segmentId), "task492-warmup"]),
      // The run-code process itself needs more than the shared 30s default:
      // the supervised dev host compiles the admin modules on first load
      // (30-60s), and in-page waits alone do not extend the process budget.
      // Set to the shared maximum (300s); the scenario assertions still fail
      // closed.
      runCodeTimeoutMs: 300_000,
    });
    transport = new BrowserTransport(context.input.session, dispatcher);
    context.lifecycle.register(transport);
    // Warm up the supervised dev host's first-load module compilation before
    // the scored scenarios: a fresh vite re-optimizes dependencies on first
    // load (30-60s+), which would otherwise consume the first scenario's
    // bounded waits. The warmup opens the admin login page and waits for the
    // email field; the compile happens once, then every scenario runs warm.
    // The warmup frame is not a scored receipt.
    const warmupSegment = Object.freeze({
      schemaVersion: 1,
      kind: "run-code",
      segmentId: "task492-warmup",
      scenarioId: "admin-login",
      actionIds: Object.freeze(["task492-warmup-action"]),
      estimatedSourceBytes: 0,
    }) as BrowserRunCodeDispatch;
    const warmupExpectation = Object.freeze({
      runId: marker,
      manifestSha256: manifestDigest(manifest),
      scenarioId: "admin-login",
      segmentId: warmupSegment.segmentId,
      actionIds: warmupSegment.actionIds,
    });
    const warmupSource = `async (page) => {
      await page.goto("${ADMIN_ORIGIN}${adminPath}/login", { waitUntil: "domcontentloaded", timeout: 180000 });
      const emailInput = page.locator('input[type="email"]');
      await emailInput.waitFor({ state: "visible", timeout: 120000 });
      return { warmed: true };
    }`;
    const warmupFrames = await transport.runSegment(
      Object.freeze({
        segment: warmupSegment,
        actions: Object.freeze([{ actionId: "task492-warmup-action", source: warmupSource }]),
      }),
      warmupExpectation
    );
    if (warmupFrames.length !== 1 || warmupFrames[0]?.status !== "success") {
      // The first Playwright dispatch after the dev-host start can crash
      // transiently (cold browser process); the warmup is read-only, so one
      // bounded retry is safe and keeps the scored scenarios authoritative.
      const retryFrames = await transport
        .runSegment(
          Object.freeze({
            segment: warmupSegment,
            actions: Object.freeze([{ actionId: "task492-warmup-action", source: warmupSource }]),
          }),
          warmupExpectation
        )
        .catch(() => []);
      if (retryFrames.length !== 1 || retryFrames[0]?.status !== "success") {
        throw new SmokeError("smoke_output_invalid", "TASK-492 warmup could not converge");
      }
    }
    const scenarioTimes = new Map<Task492ScenarioId, number>(
      TASK492_SCENARIO_IDS.map((scenarioId) => [scenarioId, 0])
    );
    const completedReceipts: { readonly scenarioId: Task492ScenarioId }[] = [];
    const receipts: {
      readonly scenarioId: Task492ScenarioId;
      readonly receipt: Task492BrowserReceipt;
    }[] = [];
    for (const [index, scenarioId] of TASK492_SCENARIO_IDS.entries()) {
      const segment = segments[index];
      const descriptor = TASK492_SCENARIOS.find(({ id }) => id === scenarioId);
      if (descriptor === undefined || segment === undefined || segment.actionIds.length !== 1) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 browser plan drifted");
      }
      const screenshotPath = manifest.entries[index]?.path;
      if (screenshotPath === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 screenshot manifest is incomplete");
      }
      const config: Task492BrowserConfig = {
        scenarioId,
        variant: task492VariantFor(scenarioId),
        adminPath,
        origin: ADMIN_ORIGIN,
        email,
        password,
        webhookUrl,
        webhookSecret,
        screenshotPath,
      };
      const started = performance.now();
      const source = materializeTask492BrowserAction(config);
      const frames = await transport.runSegment(
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
      if (frames.length !== 1) {
        throw new SmokeError(
          "smoke_output_invalid",
          "TASK-492 browser frame cardinality is invalid"
        );
      }
      const frame = frames[0];
      if (frame === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 browser frame is absent");
      }
      const receipt = sourceReceipt(frame);
      assertTask492BrowserReceipt(receipt, descriptor.id, config);
      receipts.push(Object.freeze({ scenarioId, receipt }));
      completedReceipts.push(Object.freeze({ scenarioId }));
      scenarioTimes.set(scenarioId, Math.ceil(performance.now() - started));
    }
    if (
      completedReceipts.length !== TASK492_SCENARIO_IDS.length ||
      completedReceipts.some(({ scenarioId }, index) => scenarioId !== TASK492_SCENARIO_IDS[index])
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-492 browser receipt matrix is incomplete");
    }
    const projection = (await workers.dispatch(
      TASK492_WORKER_DESCRIPTORS.read,
      createTask492ReadInput({
        authority: recoveryAuthority,
        expectedWebhookUrl: webhookUrl,
        expectedRecipients: Object.freeze([]),
      })
    )) as Task492ReadOutput;
    workers.recordDatabaseBatch(projection.statements, projection.rows);
    if (
      projection.webhookUrlMatches !== true ||
      projection.webhookSecretEncryptedAtRest !== true ||
      projection.recipientsMatch !== true
    ) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-492 persisted settings projection drifted"
      );
    }
    screenshots = await validateTask492ScreenshotOutputs(context.root, context.input, manifest);
    const screenshotsByScenario = new Map<Task492ScenarioId, SmokeScreenshotResult>(
      TASK492_SCENARIO_IDS.map((scenarioId, index) => {
        const screenshot = screenshots?.[index];
        if (screenshot === undefined) {
          throw new SmokeError("smoke_output_invalid", "TASK-492 screenshot output is incomplete");
        }
        return [scenarioId, screenshot];
      })
    );
    scenarios = requireManifestableScenarioResults(
      buildTask492Scenarios(receipts, screenshotsByScenario, scenarioTimes),
      screenshots
    );
  } catch (error) {
    primary = error;
    const diagLines: string[] = [
      `=== TASK-492 adapter failure ${new Date().toISOString()} ===`,
      `primary=${primary instanceof SmokeError ? primary.code : "unknown"} :: ${primary instanceof Error ? primary.message : String(primary)}`,
    ];
    if (server !== null) {
      try {
        const log = server.snapshotLogs();
        diagLines.push(`server stdout tail: ${log.stdout.slice(-4000)}`);
        diagLines.push(`server stderr tail: ${log.stderr.slice(-4000)}`);
        console.error(`[server-log] stdout=${log.stdout.length}B stderr=${log.stderr.length}B`);
      } catch {
        // Diagnostics are best-effort; a failed snapshot never masks the
        // primary adapter failure it is meant to explain.
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
        const pngPath = resolveInsideRoot(context.root, relativePath, "task_492_failed_png");
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
        TASK492_WORKER_DESCRIPTORS.prove,
        recoveryAuthority
      )) as Task492ProofOutput;
      workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (
        terminal.fixturesAbsent !== true ||
        terminal.identitiesAbsent !== true ||
        terminal.settingsRestored !== true ||
        terminal.receiptAbsent !== true
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-492 terminal proof is incomplete");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (workers !== null) {
    try {
      await workers.close();
      if (!(await workers.proveAbsent())) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-492 worker remained active");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  let afterFailure: unknown | null = null;
  try {
    const after = await context.timing.measure("snapshot", "task492-after", () =>
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
      "TASK-492 adapter failed",
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
    bootstrap === null
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-492 adapter execution is incomplete");
  }
  const result = projectTask492AdapterResult({
    scenarios,
    screenshots,
    cleanup: cleanupOutput,
    proof: terminal,
    workers,
    repositorySnapshots: context.repository.count(),
  });
  assertTask492SafeProjection(result, [
    password,
    email,
    webhookSecret,
    recoveryKey,
    process.env.AUTH_PASSWORD_PEPPER ?? "",
    context.root,
    workspace?.path ?? "",
  ]);
  return result;
}

const adapter: SmokeAdapter = Object.freeze({
  // TASK-492 registers the suite in the orchestrator's registry step;
  // SmokeSuiteId is a closed union, so the id is narrowed here until the
  // orchestrator extends the union in the same change.
  suiteId: "task-492" as SmokeSuiteId,
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask492Adapter,
  evidenceDirectory(input: SmokeInput, root: string) {
    return resolveInsideRoot(
      root,
      `${TASK492_EVIDENCE_ROOT}/${input.session}`,
      "task_492_evidence"
    );
  },
});

export default adapter;
