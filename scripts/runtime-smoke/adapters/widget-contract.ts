import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { BrowserTransport } from "../browser/transport";
import type {
  BrowserSuccessFrame,
  BrowserTransportDispatch,
  BrowserTransportDispatcher,
} from "../browser/contracts";
import { assertExactKeys, isPlainObject, resolveInsideRoot, SmokeError } from "../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../lifecycle";
import { resolveExecutableOnPath } from "../process-supervisor";
import type { PlainJsonValue } from "../workers/contracts";
import type {
  SmokeAdapter,
  SmokeAdapterResult,
  SmokeScenarioResult,
  SmokeScreenshotResult,
} from "./types";

const ADMIN_URL = "http://localhost:5173/admin";
const FRONT_URL = "http://localhost:3000";
const GALLERY_PUBLIC_PATH = "/gallery-mosaic-test-0516";
const GALLERY_WIDGET_TYPE = "gallery-mosaic";
const LEGACY_SCREENSHOT_PATH =
  ".tmp/playwright-widget-contract-smoke/screenshots/public-gallery-mosaic.png";
const LEGACY_TIMEOUT_MS = 5 * 60 * 1_000;
const MAX_REPORT_BYTES = 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 16 * 1024 * 1024;
const PNG_SIGNATURE = "89504e470d0a1a0a";

type EditorMode = "wizard" | "visual" | "advanced";
type CssCheck = "body-overflow" | "card-overflow" | "empty-fixture";

export interface WidgetContractInventoryOverlay {
  readonly version: 1;
  readonly expectedWidgetCount: 1;
  readonly excludedScreenOnlyWidgets: readonly string[];
  readonly widgets: readonly [
    {
      readonly widgetType: "gallery-mosaic";
      readonly title: string;
      readonly adminInsertLabel: string;
      readonly adminFixtureSlug: string;
      readonly publicPath: string;
      readonly publicFixtureStatus?: "published" | "draft-only" | "missing" | "shared-page";
      readonly requiredModes: readonly EditorMode[];
      readonly cssChecks?: readonly CssCheck[];
      readonly priority: "P0";
      readonly notes?: string;
      readonly allowedDuplicateWritablePaths?: readonly {
        readonly path: string;
        readonly reason: string;
        readonly expiresWithTask: string;
      }[];
    },
  ];
}

export interface WidgetContractReportProof {
  readonly screenshotPath: typeof LEGACY_SCREENSHOT_PATH;
  readonly adminPassed: true;
  readonly publicPassed: true;
  readonly mediaPassed: true;
}

export interface WidgetPublicProbeProof {
  readonly statusCode: 200;
  readonly galleryRootCount: number;
  readonly rootVisible: true;
  readonly consoleErrorCount: 0;
  readonly pageErrorCount: 0;
}

interface WidgetWorkspacePaths {
  readonly root: string;
  readonly inventory: string;
  readonly reportJson: string;
  readonly reportMarkdown: string;
  readonly probeSource: string;
}

interface WidgetLegacyExecution {
  readonly proof: WidgetContractReportProof;
  readonly elapsedMs: number;
}

interface WidgetProbeExecution {
  readonly proof: WidgetPublicProbeProof;
  readonly elapsedMs: number;
  readonly clientProcesses: number;
  readonly frames: number;
}

function invalid(message: string, cause?: unknown): never {
  throw new SmokeError(
    "smoke_output_invalid",
    message,
    cause === undefined ? undefined : { cause }
  );
}

function boundedString(value: unknown, label: string, maximum = 512): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value.includes("\0")
  ) {
    return invalid(`${label} is invalid`);
  }
  return value;
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !(key in value)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    invalid(`${label} has unknown or missing fields`);
  }
}

function stringArray(
  value: unknown,
  label: string,
  allowed?: ReadonlySet<string>,
  maximum = 32
): readonly string[] {
  if (!Array.isArray(value) || value.length > maximum) invalid(`${label} is invalid`);
  const output = value.map((item) => boundedString(item, label, 128));
  if (
    new Set(output).size !== output.length ||
    (allowed !== undefined && output.some((item) => !allowed.has(item)))
  ) {
    invalid(`${label} is invalid`);
  }
  return Object.freeze(output);
}

function optionalString(value: unknown, label: string, maximum = 512): string | undefined {
  return value === undefined ? undefined : boundedString(value, label, maximum);
}

function optionalDuplicatePaths(
  value: unknown
): WidgetContractInventoryOverlay["widgets"][0]["allowedDuplicateWritablePaths"] {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 32)
    invalid("widget duplicate-path allowlist is invalid");
  return Object.freeze(
    value.map((entry) => {
      if (!isPlainObject(entry)) invalid("widget duplicate-path entry is invalid");
      assertExactKeys(entry, ["path", "reason", "expiresWithTask"], "widget duplicate-path entry");
      return Object.freeze({
        path: boundedString(entry.path, "widget duplicate path", 256),
        reason: boundedString(entry.reason, "widget duplicate reason", 512),
        expiresWithTask: boundedString(entry.expiresWithTask, "widget duplicate expiry", 128),
      });
    })
  );
}

export function buildWidgetContractInventoryOverlay(
  canonicalInventory: unknown
): WidgetContractInventoryOverlay {
  if (!isPlainObject(canonicalInventory)) invalid("widget inventory is invalid");
  if (canonicalInventory.version !== 1 || !Array.isArray(canonicalInventory.widgets)) {
    invalid("widget inventory version or widgets are invalid");
  }
  if (canonicalInventory.widgets.length === 0 || canonicalInventory.widgets.length > 256) {
    invalid("widget inventory cardinality is invalid");
  }
  const galleryCandidates = canonicalInventory.widgets.filter(
    (entry) => isPlainObject(entry) && entry.widgetType === GALLERY_WIDGET_TYPE
  );
  if (galleryCandidates.length !== 1 || !isPlainObject(galleryCandidates[0])) {
    invalid("gallery-mosaic inventory entry is absent or duplicated");
  }
  const gallery = galleryCandidates[0];
  const modeValues = new Set<string>(["wizard", "visual", "advanced"]);
  const checkValues = new Set<string>(["body-overflow", "card-overflow", "empty-fixture"]);
  const requiredModes = stringArray(
    gallery.requiredModes,
    "gallery required modes",
    modeValues
  ).map((mode) => mode as EditorMode);
  if (!requiredModes.includes("visual") || !requiredModes.includes("advanced")) {
    invalid("gallery required modes drifted");
  }
  const publicPath = boundedString(gallery.publicPath, "gallery public path", 256);
  if (publicPath !== GALLERY_PUBLIC_PATH) invalid("gallery public path drifted");
  const publicFixtureStatus = gallery.publicFixtureStatus;
  if (
    publicFixtureStatus !== undefined &&
    !new Set(["published", "draft-only", "missing", "shared-page"]).has(
      publicFixtureStatus as string
    )
  ) {
    invalid("gallery public fixture status is invalid");
  }
  const cssChecks =
    gallery.cssChecks === undefined
      ? undefined
      : stringArray(gallery.cssChecks, "gallery CSS checks", checkValues).map(
          (check) => check as CssCheck
        );
  const excluded = stringArray(
    canonicalInventory.excludedScreenOnlyWidgets ?? [],
    "excluded screen-only widgets",
    undefined,
    64
  );
  const widget = Object.freeze({
    widgetType: GALLERY_WIDGET_TYPE,
    title: boundedString(gallery.title, "gallery title"),
    adminInsertLabel: boundedString(gallery.adminInsertLabel, "gallery insert label"),
    adminFixtureSlug: boundedString(gallery.adminFixtureSlug, "gallery fixture slug", 256),
    publicPath,
    ...(publicFixtureStatus === undefined ? {} : { publicFixtureStatus }),
    requiredModes: Object.freeze(requiredModes),
    ...(cssChecks === undefined ? {} : { cssChecks: Object.freeze(cssChecks) }),
    priority: "P0" as const,
    ...(gallery.notes === undefined
      ? {}
      : { notes: optionalString(gallery.notes, "gallery notes", 2_048) }),
    ...(gallery.allowedDuplicateWritablePaths === undefined
      ? {}
      : {
          allowedDuplicateWritablePaths: optionalDuplicatePaths(
            gallery.allowedDuplicateWritablePaths
          ),
        }),
  });
  return Object.freeze({
    version: 1,
    expectedWidgetCount: 1,
    excludedScreenOnlyWidgets: excluded,
    widgets: Object.freeze([widget]),
  }) as WidgetContractInventoryOverlay;
}

function assertLegacyEnvironment(value: unknown): void {
  if (!isPlainObject(value)) invalid("widget report environment is invalid");
  assertExactKeys(
    value,
    [
      "adminUrl",
      "frontUrl",
      "resolvedPlaywrightSession",
      "adminReachable",
      "frontReachable",
      "playwrightCliAvailable",
    ],
    "widget report environment"
  );
  if (
    value.adminUrl !== ADMIN_URL ||
    value.frontUrl !== FRONT_URL ||
    value.adminReachable !== true ||
    value.frontReachable !== true ||
    value.playwrightCliAvailable !== true
  ) {
    invalid("widget report environment did not prove readiness");
  }
  boundedString(value.resolvedPlaywrightSession, "widget Playwright session", 64);
}

function assertLegacyAdmin(value: unknown): void {
  if (!isPlainObject(value)) invalid("widget admin report is invalid");
  assertAllowedKeys(
    value,
    ["skipped", "loginAttempted", "authenticated", "results"],
    ["error"],
    "widget admin report"
  );
  if (
    value.skipped !== false ||
    value.loginAttempted !== true ||
    value.authenticated !== true ||
    value.error !== undefined ||
    !Array.isArray(value.results) ||
    value.results.length !== 1 ||
    !isPlainObject(value.results[0])
  ) {
    invalid("widget admin contract failed");
  }
  const result = value.results[0];
  assertAllowedKeys(
    result,
    [
      "widgetType",
      "status",
      "pageId",
      "adminPath",
      "modes",
      "duplicateWritablePaths",
      "mediaProof",
    ],
    [
      "contentProof",
      "postsProof",
      "entryTeaserProof",
      "productGalleryProof",
      "productCompareProof",
      "productTableProof",
      "error",
    ],
    "widget admin result"
  );
  if (
    result.widgetType !== GALLERY_WIDGET_TYPE ||
    result.status !== "passed" ||
    result.error !== undefined ||
    !Array.isArray(result.duplicateWritablePaths) ||
    result.duplicateWritablePaths.length !== 0 ||
    !Array.isArray(result.modes) ||
    result.modes.length < 2
  ) {
    invalid("widget admin result did not pass");
  }
  const modes = new Map<string, Record<string, unknown>>();
  for (const mode of result.modes) {
    if (!isPlainObject(mode) || typeof mode.mode !== "string" || modes.has(mode.mode)) {
      invalid("widget admin mode result is invalid");
    }
    modes.set(mode.mode, mode);
  }
  for (const expected of ["visual", "advanced"]) {
    const mode = modes.get(expected);
    if (
      mode === undefined ||
      mode.status !== "passed" ||
      mode.rootCount !== 1 ||
      typeof mode.visibleSectionCount !== "number" ||
      mode.visibleSectionCount <= 0 ||
      mode.controlsWithoutPath !== 0
    ) {
      invalid(`widget ${expected} mode did not pass`);
    }
  }
  if (!isPlainObject(result.mediaProof)) invalid("widget media proof is absent");
  const media = result.mediaProof;
  assertAllowedKeys(
    media,
    [
      "status",
      "adminHasImage",
      "publicHasImage",
      "publicPath",
      "adminAlt",
      "publicAlt",
      "publicLightboxOpened",
      "publicLightboxClosed",
    ],
    ["adminSrc", "publicSrc", "error"],
    "widget media proof"
  );
  if (
    media.status !== "passed" ||
    media.adminHasImage !== true ||
    media.publicHasImage !== true ||
    media.publicPath !== GALLERY_PUBLIC_PATH ||
    media.publicLightboxOpened !== true ||
    media.publicLightboxClosed !== true ||
    media.error !== undefined
  ) {
    invalid("widget media proof did not pass");
  }
}

function assertLegacyPublic(value: unknown): void {
  if (!isPlainObject(value)) invalid("widget public report is invalid");
  assertAllowedKeys(value, ["skipped", "results"], ["error"], "widget public report");
  if (
    value.skipped !== false ||
    value.error !== undefined ||
    !Array.isArray(value.results) ||
    value.results.length !== 1 ||
    !isPlainObject(value.results[0])
  ) {
    invalid("widget public contract failed");
  }
  const result = value.results[0];
  assertAllowedKeys(
    result,
    [
      "widgetType",
      "publicPath",
      "statusCode",
      "status",
      "emptyFixture",
      "bodyOverflow",
      "viewportWidth",
      "documentWidth",
      "screenshotPath",
      "unmarkedOverflowOwners",
    ],
    ["error"],
    "widget public result"
  );
  if (
    result.widgetType !== GALLERY_WIDGET_TYPE ||
    result.publicPath !== GALLERY_PUBLIC_PATH ||
    result.statusCode !== 200 ||
    result.status !== "passed" ||
    result.emptyFixture !== false ||
    result.bodyOverflow !== false ||
    result.screenshotPath !== LEGACY_SCREENSHOT_PATH ||
    !Array.isArray(result.unmarkedOverflowOwners) ||
    result.unmarkedOverflowOwners.length !== 0 ||
    result.error !== undefined
  ) {
    invalid("widget public result did not pass");
  }
}

export function validateWidgetContractReport(value: unknown): WidgetContractReportProof {
  if (!isPlainObject(value)) invalid("widget contract report is invalid");
  assertExactKeys(
    value,
    ["generatedAt", "command", "dryRun", "inventory", "environment", "admin", "public", "summary"],
    "widget contract report"
  );
  boundedString(value.generatedAt, "widget report timestamp", 64);
  boundedString(value.command, "widget report command", 16_384);
  if (value.dryRun !== false || !isPlainObject(value.inventory) || !isPlainObject(value.summary)) {
    invalid("widget contract report header is invalid");
  }
  assertExactKeys(
    value.inventory,
    [
      "expectedWidgetCount",
      "actualWidgetCount",
      "excludedScreenOnlyWidgets",
      "selectedWidgetTypes",
    ],
    "widget report inventory"
  );
  if (
    value.inventory.expectedWidgetCount !== 1 ||
    value.inventory.actualWidgetCount !== 1 ||
    !Array.isArray(value.inventory.selectedWidgetTypes) ||
    value.inventory.selectedWidgetTypes.length !== 1 ||
    value.inventory.selectedWidgetTypes[0] !== GALLERY_WIDGET_TYPE
  ) {
    invalid("widget report inventory drifted");
  }
  assertExactKeys(
    value.summary,
    ["adminFailures", "publicFailures", "fixtureGaps", "metadataGaps"],
    "widget report summary"
  );
  if (Object.values(value.summary).some((count) => count !== 0)) {
    invalid("widget report summary contains a failure");
  }
  assertLegacyEnvironment(value.environment);
  assertLegacyAdmin(value.admin);
  assertLegacyPublic(value.public);
  return Object.freeze({
    screenshotPath: LEGACY_SCREENSHOT_PATH,
    adminPassed: true,
    publicPassed: true,
    mediaPassed: true,
  });
}

export function validateWidgetPublicProbe(value: PlainJsonValue): WidgetPublicProbeProof {
  if (!isPlainObject(value)) invalid("widget public error probe is invalid");
  assertExactKeys(
    value,
    ["statusCode", "galleryRootCount", "rootVisible", "consoleErrorCount", "pageErrorCount"],
    "widget public error probe"
  );
  if (
    value.statusCode !== 200 ||
    !Number.isSafeInteger(value.galleryRootCount) ||
    (value.galleryRootCount as number) <= 0 ||
    (value.galleryRootCount as number) > 16 ||
    value.rootVisible !== true ||
    value.consoleErrorCount !== 0 ||
    value.pageErrorCount !== 0
  ) {
    invalid("widget public error probe failed");
  }
  return Object.freeze(value) as unknown as WidgetPublicProbeProof;
}

export function projectWidgetContractEnvironment(
  environment: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const path = environment.PATH;
  const email = environment.CODERSO_PLAYWRIGHT_EMAIL ?? environment.ADMIN_EMAIL;
  const password = environment.CODERSO_PLAYWRIGHT_PASSWORD ?? environment.ADMIN_PASSWORD;
  if (!path || !email || !password) {
    throw new SmokeError("smoke_argument_invalid", "widget smoke credentials are incomplete");
  }
  return Object.freeze({
    PATH: path,
    CODERSO_PLAYWRIGHT_EMAIL: email,
    CODERSO_PLAYWRIGHT_PASSWORD: password,
  });
}

export function resolveWidgetProbeSession(session: string): string {
  const suffix = "-widget-public";
  const candidate = `${session}${suffix}`;
  if (candidate.length <= 64) return candidate;
  const digest = createHash("sha256").update(candidate).digest("hex").slice(0, 10);
  return `${session.slice(0, 64 - digest.length - 1)}-${digest}`;
}

export function buildWidgetPublicProbeSource(): string {
  return `async (page) => {
    let consoleErrorCount = 0;
    let pageErrorCount = 0;
    const onConsole = (message) => {
      if (message.type() === "error") consoleErrorCount += 1;
    };
    const onPageError = () => {
      pageErrorCount += 1;
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    try {
      const response = await page.goto(${JSON.stringify(`${FRONT_URL}${GALLERY_PUBLIC_PATH}`)}, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      const roots = page.locator('[data-widget-type="gallery-mosaic"] [data-gallery-mosaic-count]');
      const galleryRootCount = await roots.count();
      const rootVisible = galleryRootCount > 0 && await roots.first().isVisible();
      return {
        statusCode: response ? response.status() : null,
        galleryRootCount,
        rootVisible,
        consoleErrorCount,
        pageErrorCount,
      };
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
  }`;
}

class WidgetWorkspace implements LifecycleResource {
  readonly name = "widget-contract-workspace";
  readonly paths: WidgetWorkspacePaths;
  #closed = false;

  private constructor(root: string) {
    this.paths = Object.freeze({
      root,
      inventory: join(root, "inventory.json"),
      reportJson: join(root, "report.json"),
      reportMarkdown: join(root, "report.md"),
      probeSource: join(root, "public-probe.js"),
    });
  }

  static async create(context: RuntimeSmokeContext): Promise<WidgetWorkspace> {
    const parent = resolveInsideRoot(context.root, ".tmp/runtime-smoke", "widget workspace root");
    await mkdir(parent, { recursive: true });
    const root = await mkdtemp(join(parent, `${context.input.session}-widget-`));
    return new WidgetWorkspace(root);
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    await rm(this.paths.root, { recursive: true, force: true });
    this.#closed = true;
  }

  async proveAbsent(): Promise<boolean> {
    const entry = await lstat(this.paths.root).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    return this.#closed && entry === null;
  }
}

class WidgetPlaywrightDispatcher implements BrowserTransportDispatcher {
  readonly #context: RuntimeSmokeContext;
  readonly #executable: string;
  readonly #session: string;
  readonly #sourcePath: string;
  readonly #environment: Readonly<Record<string, string>>;
  #opened = false;
  #closed = false;
  #absent = false;
  #dispatches = 0;

  constructor(input: {
    readonly context: RuntimeSmokeContext;
    readonly executable: string;
    readonly session: string;
    readonly sourcePath: string;
    readonly path: string;
  }) {
    this.#context = input.context;
    this.#executable = input.executable;
    this.#session = input.session;
    this.#sourcePath = input.sourcePath;
    this.#environment = Object.freeze({ PATH: input.path });
  }

  async dispatch(request: BrowserTransportDispatch): Promise<Uint8Array> {
    if (
      this.#closed ||
      request.session !== this.#session ||
      request.segmentId !== "gallery-public-probe" ||
      this.#dispatches !== 0 ||
      Buffer.byteLength(request.source) > 1024 * 1024
    ) {
      invalid("widget Playwright dispatch is invalid");
    }
    await this.#ensureOpen();
    await writeFile(this.#sourcePath, request.source, { encoding: "utf8", mode: 0o600 });
    const result = await this.#context.processes.run({
      executable: this.#executable,
      args: ["--raw", `-s=${this.#session}`, "run-code", "--filename", this.#sourcePath],
      cwd: this.#context.root,
      env: this.#environment,
      family: "widget-playwright-probe",
      timeoutMs: 30_000,
      maxOutputBytes: request.maximumOutputBytes,
      allowStderr: true,
    });
    this.#dispatches += 1;
    const text = new TextDecoder("utf-8", { fatal: true }).decode(result.stdout);
    if (!text.endsWith("\n") || text.slice(0, -1).includes("\n") || text.includes("\r")) {
      invalid("widget Playwright output is malformed");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.slice(0, -1));
    } catch (error) {
      return invalid("widget Playwright output is not JSON", error);
    }
    if (typeof parsed !== "string" || `${JSON.stringify(parsed)}\n` !== text) {
      invalid("widget Playwright output is not canonical");
    }
    return result.stdout;
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    if (!this.#opened) {
      this.#absent = true;
      return;
    }
    await this.#context.processes.run({
      executable: this.#executable,
      args: [`-s=${this.#session}`, "close"],
      cwd: this.#context.root,
      env: this.#environment,
      family: "widget-playwright-close",
      timeoutMs: 15_000,
      maxOutputBytes: 64 * 1024,
      allowStderr: true,
    });
    this.#absent = true;
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed && this.#absent;
  }

  async #ensureOpen(): Promise<void> {
    if (this.#opened) return;
    await this.#context.processes.run({
      executable: this.#executable,
      args: [`-s=${this.#session}`, "open", "about:blank"],
      cwd: this.#context.root,
      env: this.#environment,
      family: "widget-playwright-open",
      timeoutMs: 30_000,
      maxOutputBytes: 128 * 1024,
      allowStderr: true,
    });
    this.#opened = true;
  }
}

async function readBoundedJson(path: string): Promise<unknown> {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size <= 0 || metadata.size > MAX_REPORT_BYTES) {
    invalid("widget report file is invalid");
  }
  const bytes = await readFile(path);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    return invalid("widget report file is malformed", error);
  }
}

async function runLegacyWidgetContract(
  context: RuntimeSmokeContext,
  paths: WidgetWorkspacePaths
): Promise<WidgetLegacyExecution> {
  const bun = await resolveExecutableOnPath("bun");
  const environment = projectWidgetContractEnvironment(process.env);
  const result = await context.timing.measure("scenario", "gallery-mosaic-contract", () =>
    context.processes.run({
      executable: bun,
      args: [
        resolveInsideRoot(
          context.root,
          "scripts/playwright-widget-contract-smoke.ts",
          "widget runner path"
        ),
        "--session",
        context.input.session,
        "--admin",
        ADMIN_URL,
        "--front",
        FRONT_URL,
        "--inventory",
        paths.inventory,
        "--output-json",
        paths.reportJson,
        "--output-md",
        paths.reportMarkdown,
        "--widget",
        GALLERY_WIDGET_TYPE,
        "--strict",
      ],
      cwd: paths.root,
      env: environment,
      family: "widget-contract-legacy",
      timeoutMs: LEGACY_TIMEOUT_MS,
      maxOutputBytes: 256 * 1024,
      allowStderr: true,
    })
  );
  return Object.freeze({
    proof: validateWidgetContractReport(await readBoundedJson(paths.reportJson)),
    elapsedMs: result.receipt.elapsedMs,
  });
}

async function runFreshPublicProbe(
  context: RuntimeSmokeContext,
  paths: WidgetWorkspacePaths
): Promise<WidgetProbeExecution> {
  const executable = await resolveExecutableOnPath("playwright-cli");
  const path = process.env.PATH;
  if (!path) throw new SmokeError("smoke_argument_invalid", "PATH is unavailable");
  const session = resolveWidgetProbeSession(context.input.session);
  const dispatcher = new WidgetPlaywrightDispatcher({
    context,
    executable,
    session,
    sourcePath: paths.probeSource,
    path,
  });
  const transport = new BrowserTransport(session, dispatcher);
  context.lifecycle.register(transport);
  const actionId = "gallery-public-console-pageerror";
  const segmentId = "gallery-public-probe";
  const source = buildWidgetPublicProbeSource();
  const started = performance.now();
  let frames: readonly import("../browser/contracts").BrowserActionFrame[];
  try {
    frames = await context.timing.measure("scenario", "gallery-public-error-probe", () =>
      transport.runSegment(
        {
          segment: {
            schemaVersion: 1,
            kind: "run-code",
            segmentId,
            scenarioId: "gallery-mosaic",
            actionIds: Object.freeze([actionId]),
            estimatedSourceBytes: Buffer.byteLength(source),
          },
          actions: Object.freeze([{ actionId, source }]),
        },
        {
          runId: `${context.input.session}-widget`,
          manifestSha256: createHash("sha256").update(source).digest("hex"),
          scenarioId: "gallery-mosaic",
          segmentId,
          actionIds: Object.freeze([actionId]),
        }
      )
    );
  } finally {
    await context.timing.measure("cleanup", "widget-public-session", () => transport.close());
  }
  const frame = frames[0];
  if (frames.length !== 1 || frame?.status !== "success") {
    invalid("widget public error probe frame failed");
  }
  const proof = validateWidgetPublicProbe((frame as BrowserSuccessFrame).output);
  const counters = transport.counters();
  if (
    counters.clientProcesses !== 1 ||
    counters.frames !== 1 ||
    counters.segments !== 1 ||
    counters.fallbacks !== 0 ||
    counters.retries !== 0
  ) {
    invalid("widget public browser transport counters drifted");
  }
  return Object.freeze({
    proof,
    elapsedMs: Math.ceil(performance.now() - started),
    clientProcesses: counters.clientProcesses,
    frames: counters.frames,
  });
}

async function persistScreenshot(
  context: RuntimeSmokeContext,
  paths: WidgetWorkspacePaths,
  report: WidgetContractReportProof
): Promise<SmokeScreenshotResult> {
  const source = resolveInsideRoot(paths.root, report.screenshotPath, "widget screenshot source");
  const bytes = await readFile(source);
  if (
    bytes.byteLength <= PNG_SIGNATURE.length / 2 ||
    bytes.byteLength > MAX_SCREENSHOT_BYTES ||
    bytes.subarray(0, PNG_SIGNATURE.length / 2).toString("hex") !== PNG_SIGNATURE
  ) {
    invalid("widget screenshot is not a bounded PNG");
  }
  const relativeEvidencePath = `_docs/_workflows/_smoke/task-552-${context.input.session}-gallery-mosaic.png`;
  const evidencePath = resolveInsideRoot(
    context.root,
    relativeEvidencePath,
    "widget evidence path"
  );
  await mkdir(dirname(evidencePath), { recursive: true });
  const staged = resolve(paths.root, "gallery-mosaic-evidence.png");
  await writeFile(staged, bytes, { mode: 0o600 });
  await rename(staged, evidencePath);
  return Object.freeze({
    path: relativeEvidencePath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

export async function runWidgetContractAdapter(
  context: RuntimeSmokeContext
): Promise<SmokeAdapterResult> {
  if (context.input.suite !== "widget-contract" || context.input.profile !== "fast") {
    throw new SmokeError("smoke_argument_invalid", "widget smoke supports only the fast profile");
  }
  context.lifecycle.assertAccepting();
  const workspace = await WidgetWorkspace.create(context);
  context.lifecycle.register(workspace);
  const canonicalInventoryPath = resolveInsideRoot(
    context.root,
    "_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json",
    "widget inventory path"
  );
  const overlay = buildWidgetContractInventoryOverlay(
    await readBoundedJson(canonicalInventoryPath)
  );
  await writeFile(workspace.paths.inventory, `${JSON.stringify(overlay, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  const legacy = await runLegacyWidgetContract(context, workspace.paths);
  const probe = await runFreshPublicProbe(context, workspace.paths);
  const screenshot = await context.timing.measure("phase", "widget-screenshot-evidence", () =>
    persistScreenshot(context, workspace.paths, legacy.proof)
  );
  const scenarios: readonly SmokeScenarioResult[] = Object.freeze([
    Object.freeze({ id: "gallery-mosaic-contract", pass: true, elapsedMs: legacy.elapsedMs }),
    Object.freeze({ id: "gallery-public-error-probe", pass: true, elapsedMs: probe.elapsedMs }),
  ]);
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios,
    screenshots: Object.freeze([screenshot]),
    // This empty result is derived from the pre-navigation listeners validated above.
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      taskScopedOverlay: true,
      legacyChildProcesses: 1,
      publicProbeClientProcesses: probe.clientProcesses,
      publicProbeFrames: probe.frames,
      consoleErrorCount: probe.proof.consoleErrorCount,
      pageErrorCount: probe.proof.pageErrorCount,
      workspaceRegistered: true,
    }),
  });
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "widget-contract",
  supportedProfiles: Object.freeze(["fast"] as const),
  run: runWidgetContractAdapter,
});

export default adapter;
