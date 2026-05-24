import { chmod, mkdir, rm } from "node:fs/promises";

type EditorMode = "wizard" | "visual" | "advanced";
type CssCheck = "body-overflow" | "card-overflow" | "empty-fixture";
type SmokeStatus = "passed" | "failed" | "fixture-gap" | "metadata-gap" | "skipped";

type WidgetSmokeCase = {
  widgetType: string;
  title: string;
  adminInsertLabel: string;
  adminFixtureSlug: string;
  publicPath?: string | null;
  publicFixtureStatus?: "published" | "draft-only" | "missing" | "shared-page";
  requiredModes: EditorMode[];
  cssChecks?: CssCheck[];
  priority?: "P0" | "P1" | "P2";
  notes?: string;
  allowedDuplicateWritablePaths?: Array<{
    path: string;
    reason: string;
    expiresWithTask: string;
  }>;
};

type SmokeInventory = {
  version: 1;
  expectedWidgetCount: number;
  excludedScreenOnlyWidgets: string[];
  widgets: WidgetSmokeCase[];
};

const APPROVED_INTENTIONAL_OVERFLOW_SELECTORS: Record<string, string[]> = {
  "pricing-plans": ['[data-pricing-comparison-scroll="true"]'],
  "product-compare": ['[data-product-compare-scroll-region="table"]'],
  "product-table": ['[data-product-table-scroll-region="table"]'],
  testimonials: ['[data-testimonials-list="slider-static"]'],
};

type ParsedArgs = {
  session: string;
  adminUrl: string;
  frontUrl: string;
  inventoryPath: string;
  outputJsonPath: string;
  outputMarkdownPath: string;
  widgetType?: string;
  limit?: number;
  dryRun: boolean;
  skipAdmin: boolean;
  skipFront: boolean;
  strict: boolean;
  keepOpen: boolean;
};

type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type AdminAuthStateResult = {
  attempted: boolean;
  authenticated: boolean;
  error?: string;
};

type AdminModeResult = {
  mode: EditorMode;
  status: SmokeStatus;
  rootCount: number;
  sectionCount: number;
  visibleSectionCount: number;
  writablePaths: string[];
  controlsWithoutPath: number;
  error?: string;
};

type AdminWidgetResult = {
  widgetType: string;
  status: SmokeStatus;
  adminPath?: string;
  pageId?: string;
  modes: AdminModeResult[];
  duplicateWritablePaths: string[];
  error?: string;
};

type PublicWidgetResult = {
  widgetType: string;
  status: SmokeStatus;
  publicPath?: string | null;
  statusCode?: number | null;
  emptyFixture?: boolean;
  bodyOverflow?: boolean;
  viewportWidth?: number;
  documentWidth?: number;
  screenshotPath?: string;
  unmarkedOverflowOwners?: Array<{
    tag: string;
    className: string;
    text: string;
    scrollWidth: number;
    clientWidth: number;
  }>;
  error?: string;
};

type SmokeReport = {
  generatedAt: string;
  command: string;
  dryRun: boolean;
  inventory: {
    expectedWidgetCount: number;
    actualWidgetCount: number;
    excludedScreenOnlyWidgets: string[];
    selectedWidgetTypes: string[];
  };
  environment: {
    adminUrl: string;
    frontUrl: string;
    adminReachable: boolean | null;
    frontReachable: boolean | null;
    playwrightCliAvailable: boolean;
  };
  admin: {
    skipped: boolean;
    loginAttempted: boolean;
    authenticated: boolean | null;
    results: AdminWidgetResult[];
    error?: string;
  };
  public: {
    skipped: boolean;
    results: PublicWidgetResult[];
    error?: string;
  };
  summary: {
    adminFailures: number;
    publicFailures: number;
    fixtureGaps: number;
    metadataGaps: number;
  };
};

const defaultInventoryPath = "_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json";
const defaultOutputJsonPath = "_docs/PLAYWRIGHT/widget-contract-smoke-results.json";
const defaultOutputMarkdownPath = "_docs/PLAYWRIGHT/widget-contract-smoke-results.md";
const defaultModes: EditorMode[] = ["visual", "advanced"];
const screenOnlyWidgets = new Set([
  "screen-record-header",
  "screen-field-value",
  "screen-field-group",
  "screen-two-column",
]);

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`missing_value:${flag}`);
  }
  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    session: "widget-contract-smoke",
    adminUrl: "http://localhost:5173/admin",
    frontUrl: "http://localhost:3000",
    inventoryPath: defaultInventoryPath,
    outputJsonPath: defaultOutputJsonPath,
    outputMarkdownPath: defaultOutputMarkdownPath,
    dryRun: false,
    skipAdmin: false,
    skipFront: false,
    strict: false,
    keepOpen: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--session") parsed.session = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--session=")) parsed.session = arg.slice("--session=".length);
    else if (arg === "--admin") parsed.adminUrl = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--admin=")) parsed.adminUrl = arg.slice("--admin=".length);
    else if (arg === "--front") parsed.frontUrl = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--front=")) parsed.frontUrl = arg.slice("--front=".length);
    else if (arg === "--inventory") parsed.inventoryPath = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--inventory=")) {
      parsed.inventoryPath = arg.slice("--inventory=".length);
    } else if (arg === "--output-json") parsed.outputJsonPath = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--output-json=")) {
      parsed.outputJsonPath = arg.slice("--output-json=".length);
    } else if (arg === "--output-md") {
      parsed.outputMarkdownPath = readFlagValue(argv, index++, arg);
    } else if (arg.startsWith("--output-md=")) {
      parsed.outputMarkdownPath = arg.slice("--output-md=".length);
    } else if (arg === "--widget") parsed.widgetType = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--widget=")) parsed.widgetType = arg.slice("--widget=".length);
    else if (arg === "--limit") parsed.limit = Number(readFlagValue(argv, index++, arg));
    else if (arg.startsWith("--limit=")) parsed.limit = Number(arg.slice("--limit=".length));
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--skip-admin") parsed.skipAdmin = true;
    else if (arg === "--skip-front") parsed.skipFront = true;
    else if (arg === "--strict") parsed.strict = true;
    else if (arg === "--keep-open") parsed.keepOpen = true;
    else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  if (parsed.limit !== undefined && (!Number.isInteger(parsed.limit) || parsed.limit <= 0)) {
    throw new Error("invalid_limit");
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isEditorMode(value: unknown): value is EditorMode {
  return value === "wizard" || value === "visual" || value === "advanced";
}

async function readInventory(path: string): Promise<SmokeInventory> {
  const value = JSON.parse(await Bun.file(path).text()) as unknown;
  if (!isRecord(value)) throw new Error("inventory_invalid");
  const widgets = Array.isArray(value.widgets) ? value.widgets : [];
  const excluded = Array.isArray(value.excludedScreenOnlyWidgets)
    ? value.excludedScreenOnlyWidgets.filter((item): item is string => typeof item === "string")
    : [];

  return {
    version: 1,
    expectedWidgetCount:
      typeof value.expectedWidgetCount === "number" ? value.expectedWidgetCount : widgets.length,
    excludedScreenOnlyWidgets: excluded,
    widgets: widgets.map((item) => {
      if (!isRecord(item)) throw new Error("inventory_widget_invalid");
      const requiredModes = Array.isArray(item.requiredModes)
        ? item.requiredModes.filter(isEditorMode)
        : defaultModes;
      return {
        widgetType: String(item.widgetType ?? "").trim(),
        title: String(item.title ?? item.widgetType ?? "").trim(),
        adminInsertLabel: String(
          item.adminInsertLabel ?? item.title ?? item.widgetType ?? ""
        ).trim(),
        adminFixtureSlug: String(item.adminFixtureSlug ?? "").trim(),
        publicPath:
          typeof item.publicPath === "string"
            ? item.publicPath.trim()
            : item.publicPath === null
              ? null
              : undefined,
        publicFixtureStatus: item.publicFixtureStatus as WidgetSmokeCase["publicFixtureStatus"],
        requiredModes: requiredModes.length > 0 ? requiredModes : defaultModes,
        cssChecks: Array.isArray(item.cssChecks)
          ? item.cssChecks.filter(
              (entry): entry is CssCheck =>
                entry === "body-overflow" || entry === "card-overflow" || entry === "empty-fixture"
            )
          : undefined,
        priority: item.priority as WidgetSmokeCase["priority"],
        notes: typeof item.notes === "string" ? item.notes : undefined,
        allowedDuplicateWritablePaths: Array.isArray(item.allowedDuplicateWritablePaths)
          ? item.allowedDuplicateWritablePaths
              .filter((entry): entry is Record<string, unknown> => isRecord(entry))
              .map((entry) => ({
                path: String(entry.path ?? "").trim(),
                reason: String(entry.reason ?? "").trim(),
                expiresWithTask: String(entry.expiresWithTask ?? "").trim(),
              }))
              .filter((entry) => entry.path && entry.reason && entry.expiresWithTask)
          : undefined,
      };
    }),
  };
}

function validateInventory(inventory: SmokeInventory) {
  const seen = new Set<string>();
  for (const widget of inventory.widgets) {
    if (!widget.widgetType) throw new Error("inventory_widget_type_missing");
    if (seen.has(widget.widgetType))
      throw new Error(`inventory_widget_duplicate:${widget.widgetType}`);
    if (screenOnlyWidgets.has(widget.widgetType)) {
      throw new Error(`inventory_screen_only_included:${widget.widgetType}`);
    }
    if (!widget.adminFixtureSlug) {
      throw new Error(`inventory_admin_fixture_slug_missing:${widget.widgetType}`);
    }
    seen.add(widget.widgetType);
  }
  if (inventory.widgets.length !== inventory.expectedWidgetCount) {
    throw new Error(
      `inventory_widget_count_mismatch:${inventory.widgets.length}:${inventory.expectedWidgetCount}`
    );
  }
}

function selectCases(inventory: SmokeInventory, args: ParsedArgs): WidgetSmokeCase[] {
  let cases = inventory.widgets;
  if (args.widgetType) {
    cases = cases.filter((item) => item.widgetType === args.widgetType);
    if (cases.length === 0) throw new Error(`widget_not_found:${args.widgetType}`);
  }
  if (args.limit !== undefined) {
    cases = cases.slice(0, args.limit);
  }
  return cases;
}

async function runCommand(command: string[], env?: Record<string, string>): Promise<CommandResult> {
  const proc = Bun.spawn(command, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "GET", redirect: "manual" });
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}

async function ensureDirForFile(path: string) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) await mkdir(dir, { recursive: true });
}

async function writeCodeFile(path: string, code: string) {
  await ensureDirForFile(path);
  await Bun.write(path, code);
}

function getSetCookie(headers: Headers, cookieName: string): string | null {
  const headerApi = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headerApi.getSetCookie?.();
  if (cookies?.length) {
    return cookies.find((cookie) => cookie.startsWith(`${cookieName}=`)) ?? null;
  }
  const header = headers.get("set-cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|,\\s*)${cookieName}=([^;]+)[^,]*`, "i"));
  return match?.[0] ?? null;
}

function getCookieValue(setCookie: string, cookieName: string): string | null {
  const match = setCookie.match(new RegExp(`(?:^|,\\s*)${cookieName}=([^;]+)`, "i"));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function getCookieMaxAge(setCookie: string): number | null {
  const match = setCookie.match(/;\s*Max-Age=(\d+)/i);
  return match?.[1] ? Number(match[1]) : null;
}

async function writeAdminAuthState(
  adminUrl: string,
  authStatePath: string
): Promise<AdminAuthStateResult> {
  const email = process.env.CODERSO_PLAYWRIGHT_EMAIL || process.env.PLAYWRIGHT_ADMIN_EMAIL || "";
  const password =
    process.env.CODERSO_PLAYWRIGHT_PASSWORD || process.env.PLAYWRIGHT_ADMIN_PASSWORD || "";
  if (!email || !password) {
    return { attempted: true, authenticated: false, error: "credentials_missing" };
  }

  const adminBase = adminUrl.replace(/\/$/, "");
  const response = await fetch(`${adminBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);
  if (!response) return { attempted: true, authenticated: false, error: "login_network_failed" };
  if (!response.ok) {
    return { attempted: true, authenticated: false, error: `login_failed:${response.status}` };
  }

  const sessionCookie = getSetCookie(response.headers, "session");
  if (!sessionCookie) {
    return { attempted: true, authenticated: false, error: "session_cookie_missing" };
  }
  const sessionValue = getCookieValue(sessionCookie, "session");
  if (!sessionValue) {
    return { attempted: true, authenticated: false, error: "session_cookie_invalid" };
  }

  const maxAge = getCookieMaxAge(sessionCookie);
  const expires = maxAge ? Math.floor(Date.now() / 1000) + maxAge : -1;
  const url = new URL(adminUrl);
  await ensureDirForFile(authStatePath);
  await Bun.write(
    authStatePath,
    `${JSON.stringify(
      {
        cookies: [
          {
            name: "session",
            value: sessionValue,
            domain: url.hostname,
            path: "/",
            expires,
            httpOnly: true,
            secure: url.protocol === "https:",
            sameSite: "Strict",
          },
        ],
        origins: [],
      },
      null,
      2
    )}\n`
  );
  await chmodAuthState(authStatePath);
  return { attempted: true, authenticated: true };
}

async function chmodAuthState(authStatePath: string) {
  await chmod(authStatePath, 0o600).catch(() => undefined);
}

function installAuthStateSignalCleanup(getPath: () => string | null) {
  const cleanupAndExit = async (signal: NodeJS.Signals) => {
    const authStatePath = getPath();
    if (authStatePath) await rm(authStatePath, { force: true }).catch(() => undefined);
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  process.once("SIGINT", () => {
    void cleanupAndExit("SIGINT");
  });
  process.once("SIGTERM", () => {
    void cleanupAndExit("SIGTERM");
  });
}

function extractCliJson<T>(stdout: string): T {
  const marker = "### Result";
  const markerIndex = stdout.indexOf(marker);
  let raw = stdout.trim();
  if (markerIndex >= 0) {
    const afterMarker = stdout.slice(markerIndex + marker.length).trimStart();
    const nextSectionIndex = afterMarker.search(/\r?\n###\s/);
    raw = (nextSectionIndex >= 0 ? afterMarker.slice(0, nextSectionIndex) : afterMarker).trim();
  } else {
    throw new Error("playwright_cli_result_missing");
  }
  const first = JSON.parse(raw) as unknown;
  const parsed = typeof first === "string" ? (JSON.parse(first) as unknown) : first;
  return parsed as T;
}

async function runPlaywrightCode<T>(
  session: string,
  filename: string,
  env?: Record<string, string>
): Promise<T> {
  const result = await runCommand(
    ["playwright-cli", `-s=${session}`, "run-code", "--filename", filename],
    env
  );
  if (result.exitCode !== 0) {
    throw new Error(`playwright_cli_failed:${result.stderr || result.stdout}`);
  }
  return extractCliJson<T>(result.stdout);
}

function buildAdminProbeCode(adminUrl: string, cases: WidgetSmokeCase[]) {
  return `async (page) => {
  const adminUrl = ${JSON.stringify(adminUrl.replace(/\/$/, ""))};
  const cases = ${JSON.stringify(cases)};
  const requiredLogin = { attempted: false, authenticated: null, error: null };
  page.on("dialog", async (dialog) => {
    await dialog.accept().catch(() => undefined);
  });
  async function settle() {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  }
  async function verifyAuthenticated() {
    await page.goto(adminUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await settle();
    const pagesResponse = await fetchPages();
    if (pagesResponse.ok) {
      requiredLogin.authenticated = true;
      return;
    }
    requiredLogin.authenticated = false;
    requiredLogin.error = "auth_state_invalid:" + pagesResponse.status;
  }
  async function fetchPages() {
    return await page.evaluate(async () => {
      const response = await fetch("/admin/api/pages", { credentials: "include" });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text };
    });
  }
  function duplicatePaths(modes, allowedDuplicateWritablePaths) {
    const allowed = new Set((allowedDuplicateWritablePaths || []).map((entry) => entry.path));
    const owners = new Map();
    for (const mode of modes) {
      for (const path of mode.writablePaths || []) {
        const current = owners.get(path) || [];
        current.push(mode.mode);
        owners.set(path, current);
      }
    }
    return Array.from(owners.entries())
      .filter(([path, owners]) => owners.length > 1 && !allowed.has(path))
      .map(([path]) => path);
  }
  async function dismissCustomDirtyDialog() {
    const candidates = [
      /discard/i,
      /leave/i,
      /continue/i,
      /porzuc/i,
      /opuść/i
    ];
    for (const pattern of candidates) {
      const button = page.getByRole("button", { name: pattern }).first();
      if ((await button.count()) > 0 && await button.isVisible().catch(() => false)) {
        await button.click().catch(() => undefined);
        await settle();
        return;
      }
    }
  }
  async function selectFixtureBlock(item) {
    const typedBlocks = page.locator('[data-block-select][data-block-widget-type="' + item.widgetType + '"]');
    await typedBlocks.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    if ((await typedBlocks.count()) > 0) {
      await typedBlocks.first().click().catch(() => undefined);
      await settle();
      return { ok: true, matchedExpectedBlock: true };
    }
    const blocks = page.locator("[data-block-select]");
    await blocks.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    const blockCount = await blocks.count();
    if (blockCount === 0) return { ok: false, error: "block_select_missing", matchedExpectedBlock: false };
    const expectedLabels = [item.title, item.adminInsertLabel, item.widgetType]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    for (let index = 0; index < blockCount; index += 1) {
      const block = blocks.nth(index);
      const label = ((await block.innerText().catch(() => "")) || "").toLowerCase();
      if (expectedLabels.some((expected) => label.includes(expected))) {
        await block.click().catch(() => undefined);
        await settle();
        return { ok: true, matchedExpectedBlock: true };
      }
    }
    return { ok: false, error: "widget_block_type_missing", matchedExpectedBlock: false };
  }
  async function openFixtureAndSelect(item, pageRow, adminPath) {
    await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(async () => {
      await dismissCustomDirtyDialog();
    });
    await settle();
    await dismissCustomDirtyDialog();
    return await selectFixtureBlock(item);
  }
  async function inspectMode(widgetType, mode) {
    const tab = page.getByRole("tab", { name: new RegExp("^" + mode + "$", "i") }).first();
    if ((await tab.count()) > 0) {
      await tab.click().catch(() => undefined);
      await settle();
    } else if (mode !== "wizard") {
      const complete = page
        .getByRole("button", { name: /finish setup and open visual|continue to layout and styling/i })
        .first();
      if ((await complete.count()) > 0) {
        await complete.click().catch(() => undefined);
        await settle();
        const nextTab = page.getByRole("tab", { name: new RegExp("^" + mode + "$", "i") }).first();
        if ((await nextTab.count()) > 0) {
          await nextTab.click().catch(() => undefined);
          await settle();
        }
      }
    }
    const root = page.locator('[data-widget-editor="' + widgetType + '"][data-widget-editor-mode="' + mode + '"]');
    const rootCount = await root.count();
    const firstRoot = root.first();
    const sectionCount = rootCount > 0 ? await firstRoot.locator("[data-widget-editor-section]").count() : 0;
    const visibleSectionCount = rootCount > 0
      ? await firstRoot.locator("[data-widget-editor-section]").evaluateAll((nodes) =>
          nodes.filter((node) => {
            if (!(node instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          }).length
        )
      : 0;
    const writablePaths = rootCount > 0
      ? await firstRoot.locator('[data-widget-control-path]:not([data-widget-control-readonly="true"])').evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-widget-control-path")).filter(Boolean)
        )
      : [];
    const controlsWithoutPath = rootCount > 0
      ? await firstRoot.locator("[data-widget-control]").evaluateAll((nodes) =>
          nodes.filter((node) => {
            if (node.hasAttribute("data-widget-control-path")) return false;
            const ownership = node.getAttribute("data-widget-control-ownership");
            return ownership !== "action" && ownership !== "preview" && ownership !== "readonly";
          }).length
        )
      : 0;
    return {
      mode,
      status: rootCount === 1 && visibleSectionCount > 0 ? "passed" : "failed",
      rootCount,
      sectionCount,
      visibleSectionCount,
      writablePaths,
      controlsWithoutPath,
      error: rootCount === 1 && visibleSectionCount > 0 ? undefined : "mode_root_or_visible_section_missing",
    };
  }
  await verifyAuthenticated();
  if (!requiredLogin.authenticated) {
    return JSON.stringify({ login: requiredLogin, results: [], error: requiredLogin.error || "login_failed" });
  }
  const pagesResponse = await fetchPages();
  if (!pagesResponse.ok) {
    return JSON.stringify({ login: requiredLogin, results: [], error: "pages_api_failed:" + pagesResponse.status });
  }
  const pages = JSON.parse(pagesResponse.text);
  const results = [];
  for (const item of cases) {
    const pageRow = pages.find((page) => page.slug === item.adminFixtureSlug);
    if (!pageRow) {
      results.push({ widgetType: item.widgetType, status: "fixture-gap", modes: [], duplicateWritablePaths: [], error: "admin_fixture_not_found" });
      continue;
    }
    const adminPath = adminUrl + "/pages/" + encodeURIComponent(pageRow.id);
    const modes = [];
    let selectError = null;
    for (const mode of item.requiredModes) {
      const selected = await openFixtureAndSelect(item, pageRow, adminPath);
      if (!selected.ok) {
        selectError = selected.error || "block_select_missing";
        break;
      }
      modes.push(await inspectMode(item.widgetType, mode));
    }
    if (selectError) {
      results.push({ widgetType: item.widgetType, status: "failed", pageId: pageRow.id, adminPath, modes, duplicateWritablePaths: [], error: selectError });
      continue;
    }
    const hasMetadataGap = modes.some((mode) => mode.controlsWithoutPath > 0);
    const duplicates = hasMetadataGap ? [] : duplicatePaths(modes, item.allowedDuplicateWritablePaths || []);
    const hasFailure = modes.some((mode) => mode.status === "failed") || duplicates.length > 0;
    results.push({
      widgetType: item.widgetType,
      status: hasFailure ? "failed" : hasMetadataGap ? "metadata-gap" : "passed",
      pageId: pageRow.id,
      adminPath,
      modes,
      duplicateWritablePaths: duplicates,
    });
  }
  return JSON.stringify({ login: requiredLogin, results });
}`;
}

function buildPublicProbeCode(frontUrl: string, cases: WidgetSmokeCase[], screenshotDir: string) {
  return `async (page) => {
  const frontUrl = ${JSON.stringify(frontUrl.replace(/\/$/, ""))};
  const cases = ${JSON.stringify(cases)};
  const screenshotDir = ${JSON.stringify(screenshotDir)};
  const approvedIntentionalOverflowSelectors = ${JSON.stringify(APPROVED_INTENTIONAL_OVERFLOW_SELECTORS)};
  const results = [];
  async function settle() {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  }
  function shouldCaptureScreenshot(item) {
    const checks = Array.isArray(item.cssChecks) ? item.cssChecks : [];
    return Boolean(item.priority) || checks.includes("card-overflow") || checks.includes("empty-fixture");
  }
  function safeScreenshotName(widgetType) {
    return String(widgetType).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  }
  for (const item of cases) {
    if (!item.publicPath) {
      results.push({ widgetType: item.widgetType, status: "fixture-gap", publicPath: item.publicPath || null, error: "public_fixture_missing" });
      continue;
    }
    const url = frontUrl + item.publicPath;
    let response = null;
    try {
      response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const overflow = await page.evaluate(({ widgetType, approvedIntentionalOverflowSelectors }) => {
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        function hasApprovedIntentionalOverflowAncestor(element) {
          const intentional = element.closest('[data-overflow-intentional="true"]');
          if (!intentional) return false;
          const selectors = approvedIntentionalOverflowSelectors[String(widgetType)] || [];
          return selectors.some((selector) => {
            try {
              return intentional.matches(selector) || Boolean(intentional.querySelector(selector));
            } catch {
              return false;
            }
          });
        }
        const unmarkedOverflowOwners = Array.from(document.body.querySelectorAll("*"))
          .filter((element) => {
            if (!(element instanceof HTMLElement)) return false;
            if (hasApprovedIntentionalOverflowAncestor(element)) return false;
            if (element.closest('[aria-hidden="true"], [hidden]')) return false;
            if (element.getAttribute("aria-hidden") === "true" || element.hidden) return false;
            const className = typeof element.className === "string" ? element.className : "";
            if (/\\bsr-only\\b/.test(className)) return false;
            const style = window.getComputedStyle(element);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const rect = element.getBoundingClientRect();
            if (rect.width <= 1 || rect.height <= 1) return false;
            if (style.clip === "rect(0px, 0px, 0px, 0px)" || style.clipPath === "inset(50%)") return false;
            return element.scrollWidth > element.clientWidth + 1 && element.clientWidth > 0;
          })
          .slice(0, 12)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: element.className ? String(element.className).slice(0, 180) : "",
            text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 120),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          }));
        return {
          bodyOverflow: documentWidth > viewportWidth + 1,
          viewportWidth,
          documentWidth,
          unmarkedOverflowOwners,
        };
      }, { widgetType: item.widgetType, approvedIntentionalOverflowSelectors });
      const emptyFixture = await page.evaluate((checks) => {
        if (!Array.isArray(checks) || !checks.includes("empty-fixture")) return false;
        const text = (document.body.innerText || "").replace(/\\s+/g, " ").trim();
        const emptyTextPatterns = [
          /empty stack/i,
          /no items found/i,
          /no products found/i,
          /no products to compare/i,
          /brak produkt/i,
          /nothing to show/i,
          /no entries/i
        ];
        return emptyTextPatterns.some((pattern) => pattern.test(text));
      }, item.cssChecks || []);
      let screenshotPath = undefined;
      if (shouldCaptureScreenshot(item)) {
        screenshotPath = screenshotDir + "/public-" + safeScreenshotName(item.widgetType) + ".png";
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      }
      const statusCode = response ? response.status() : null;
      const checks = Array.isArray(item.cssChecks) ? item.cssChecks : [];
      const hasHttpFailure = !statusCode || statusCode < 200 || statusCode >= 400;
      const hasBodyOverflowFailure = checks.includes("body-overflow") && overflow.bodyOverflow && overflow.unmarkedOverflowOwners.length > 0;
      const hasCardOverflowFailure = checks.includes("card-overflow") && overflow.unmarkedOverflowOwners.length > 0;
      const status = emptyFixture
        ? "fixture-gap"
        : !hasHttpFailure && !hasBodyOverflowFailure && !hasCardOverflowFailure
          ? "passed"
          : "failed";
      const error = emptyFixture
        ? "public_fixture_empty"
        : hasHttpFailure
          ? "public_http_failed"
          : hasBodyOverflowFailure
            ? "body_overflow_unmarked"
            : hasCardOverflowFailure
              ? "card_overflow_unmarked"
              : undefined;
      results.push({ widgetType: item.widgetType, publicPath: item.publicPath, statusCode, status, emptyFixture, screenshotPath, ...overflow, error });
    } catch (error) {
      results.push({ widgetType: item.widgetType, publicPath: item.publicPath, status: "failed", statusCode: response ? response.status() : null, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return JSON.stringify({ results });
}`;
}

function summarize(report: SmokeReport): SmokeReport["summary"] {
  const adminFailures =
    report.admin.results.filter((item) => item.status === "failed").length +
    (report.admin.error ? 1 : 0);
  const publicFailures =
    report.public.results.filter((item) => item.status === "failed").length +
    (report.public.error ? 1 : 0);
  const fixtureGaps =
    report.admin.results.filter(
      (item) =>
        item.status === "fixture-gap" || item.modes.some((mode) => mode.status === "fixture-gap")
    ).length + report.public.results.filter((item) => item.status === "fixture-gap").length;
  const metadataGaps = report.admin.results.filter(
    (item) =>
      item.status === "metadata-gap" || item.modes.some((mode) => mode.controlsWithoutPath > 0)
  ).length;
  return { adminFailures, publicFailures, fixtureGaps, metadataGaps };
}

function renderMarkdown(report: SmokeReport): string {
  const lines = [
    "# Widget Contract Smoke Results",
    "",
    `- **Generated:** ${report.generatedAt}`,
    `- **Dry run:** ${report.dryRun ? "yes" : "no"}`,
    `- **Inventory:** ${report.inventory.actualWidgetCount}/${report.inventory.expectedWidgetCount} widgets`,
    `- **Admin:** ${report.admin.skipped ? "skipped" : report.environment.adminUrl}`,
    `- **Frontend:** ${report.public.skipped ? "skipped" : report.environment.frontUrl}`,
    "",
    "## Run Health",
    "",
    `- Playwright CLI: ${report.environment.playwrightCliAvailable ? "available" : "unavailable"}`,
    `- Admin reachable: ${report.environment.adminReachable === null ? "not checked" : report.environment.adminReachable ? "yes" : "no"}`,
    `- Frontend reachable: ${report.environment.frontReachable === null ? "not checked" : report.environment.frontReachable ? "yes" : "no"}`,
    `- Admin auth: ${report.admin.authenticated === null ? "not checked" : report.admin.authenticated ? "authenticated" : "failed"}`,
    "",
    "## Summary",
    "",
    `- Admin failures: ${report.summary.adminFailures}`,
    `- Public failures: ${report.summary.publicFailures}`,
    `- Fixture gaps: ${report.summary.fixtureGaps}`,
    `- Metadata gaps: ${report.summary.metadataGaps}`,
    "",
    "## Admin Mode Contract",
    "",
    "| Widget | Status | Modes | Duplicate paths | Notes |",
    "|---|---|---|---|---|",
    ...report.admin.results.map((item) => {
      const modes = item.modes
        .map((mode) => {
          const error = mode.error ? ` (${mode.error})` : "";
          return `${mode.mode}:${mode.status} r${mode.rootCount}/s${mode.sectionCount}/v${mode.visibleSectionCount}${error}`;
        })
        .join("<br>");
      return `| \`${item.widgetType}\` | ${item.status} | ${modes || "-"} | ${item.duplicateWritablePaths.join(", ") || "-"} | ${item.error ?? "-"} |`;
    }),
    "",
    "## Public CSS Smoke",
    "",
    "| Widget | Status | Path | HTTP | Overflow | Notes |",
    "|---|---|---|---|---|---|",
    ...report.public.results.map((item) => {
      const overflow = item.bodyOverflow === undefined ? "-" : item.bodyOverflow ? "yes" : "no";
      const notes = [
        item.error,
        item.emptyFixture ? "empty fixture" : undefined,
        item.screenshotPath ? `screenshot: ${item.screenshotPath}` : undefined,
      ]
        .filter(Boolean)
        .join("; ");
      return `| \`${item.widgetType}\` | ${item.status} | ${item.publicPath ?? "-"} | ${item.statusCode ?? "-"} | ${overflow} | ${notes || "-"} |`;
    }),
  ];
  return `${lines.join("\n")}\n`;
}

function createFailedAdminMode(mode: EditorMode, error: string): AdminModeResult {
  return {
    mode,
    status: "failed",
    rootCount: 0,
    sectionCount: 0,
    visibleSectionCount: 0,
    writablePaths: [],
    controlsWithoutPath: 0,
    error,
  };
}

function createAdminFixtureGapMode(mode: EditorMode, error: string): AdminModeResult {
  return {
    mode,
    status: "fixture-gap",
    rootCount: 0,
    sectionCount: 0,
    visibleSectionCount: 0,
    writablePaths: [],
    controlsWithoutPath: 0,
    error: `admin_fixture_unopenable:${error}`,
  };
}

function isAdminFixtureUnopenableError(error: string | undefined): boolean {
  return error === "block_select_missing" || error === "widget_block_type_missing";
}

function findDuplicateWritablePaths(
  modes: AdminModeResult[],
  allowedDuplicateWritablePaths: WidgetSmokeCase["allowedDuplicateWritablePaths"] = []
): string[] {
  const allowed = new Set(allowedDuplicateWritablePaths.map((entry) => entry.path));
  const owners = new Map<string, EditorMode[]>();
  for (const mode of modes) {
    for (const path of mode.writablePaths) {
      const current = owners.get(path) ?? [];
      current.push(mode.mode);
      owners.set(path, current);
    }
  }
  return Array.from(owners.entries())
    .filter(([path, modeOwners]) => modeOwners.length > 1 && !allowed.has(path))
    .map(([path]) => path);
}

function finalizeAdminResult(
  item: WidgetSmokeCase,
  partial: Omit<AdminWidgetResult, "status" | "duplicateWritablePaths">
): AdminWidgetResult {
  if (partial.modes.length === 0 && !partial.error) {
    return {
      ...partial,
      status: "failed",
      duplicateWritablePaths: [],
      error: "admin_modes_missing",
    };
  }
  if (partial.error) {
    return {
      ...partial,
      status: "failed",
      duplicateWritablePaths: [],
    };
  }
  const hasMetadataGap = partial.modes.some((mode) => mode.controlsWithoutPath > 0);
  const hasFixtureGap = partial.modes.some((mode) => mode.status === "fixture-gap");
  const duplicates =
    hasMetadataGap || hasFixtureGap
      ? []
      : findDuplicateWritablePaths(partial.modes, item.allowedDuplicateWritablePaths);
  const hasFailure =
    partial.modes.some((mode) => mode.status === "failed") || duplicates.length > 0;
  return {
    ...partial,
    status: hasFailure
      ? "failed"
      : hasFixtureGap
        ? "fixture-gap"
        : hasMetadataGap
          ? "metadata-gap"
          : "passed",
    duplicateWritablePaths: duplicates,
  };
}

function classifyPublicStatus(input: {
  cssChecks: CssCheck[];
  statusCode: number | null;
  emptyFixture: boolean;
  bodyOverflow: boolean;
  unmarkedOverflowOwnerCount: number;
}): Pick<PublicWidgetResult, "status" | "error"> {
  const hasHttpFailure = !input.statusCode || input.statusCode < 200 || input.statusCode >= 400;
  const hasBodyOverflowFailure =
    input.cssChecks.includes("body-overflow") &&
    input.bodyOverflow &&
    input.unmarkedOverflowOwnerCount > 0;
  const hasCardOverflowFailure =
    input.cssChecks.includes("card-overflow") && input.unmarkedOverflowOwnerCount > 0;
  if (input.emptyFixture) return { status: "fixture-gap", error: "public_fixture_empty" };
  if (hasHttpFailure) return { status: "failed", error: "public_http_failed" };
  if (hasBodyOverflowFailure) return { status: "failed", error: "body_overflow_unmarked" };
  if (hasCardOverflowFailure) return { status: "failed", error: "card_overflow_unmarked" };
  return { status: "passed", error: undefined };
}

function shouldCountOverflowOwner(input: {
  className?: string;
  ariaHidden?: string | null;
  hidden?: boolean;
  hasIntentionalOverflowAncestor?: boolean;
  hasApprovedIntentionalOverflowAncestor?: boolean;
  display?: string;
  visibility?: string;
  width?: number;
  height?: number;
  clip?: string;
  clipPath?: string;
  scrollWidth: number;
  clientWidth: number;
}): boolean {
  if (input.hasApprovedIntentionalOverflowAncestor) return false;
  if (input.ariaHidden === "true" || input.hidden) return false;
  if (input.className && /\bsr-only\b/.test(input.className)) return false;
  if (input.display === "none" || input.visibility === "hidden") return false;
  if ((input.width ?? 0) <= 1 || (input.height ?? 0) <= 1) return false;
  if (input.clip === "rect(0px, 0px, 0px, 0px)" || input.clipPath === "inset(50%)") {
    return false;
  }
  return input.scrollWidth > input.clientWidth + 1 && input.clientWidth > 0;
}

function hasStrictFailure(report: SmokeReport): boolean {
  return (
    report.summary.adminFailures > 0 ||
    report.summary.publicFailures > 0 ||
    report.summary.fixtureGaps > 0 ||
    report.summary.metadataGaps > 0 ||
    Boolean(report.admin.error || report.public.error)
  );
}

async function main() {
  const args = parseArgs(Bun.argv.slice(2));
  const inventory = await readInventory(args.inventoryPath);
  validateInventory(inventory);
  const selectedCases = selectCases(inventory, args);
  const command = `bun scripts/playwright-widget-contract-smoke.ts ${Bun.argv.slice(2).join(" ")}`;
  const report: SmokeReport = {
    generatedAt: new Date().toISOString(),
    command,
    dryRun: args.dryRun,
    inventory: {
      expectedWidgetCount: inventory.expectedWidgetCount,
      actualWidgetCount: inventory.widgets.length,
      excludedScreenOnlyWidgets: inventory.excludedScreenOnlyWidgets,
      selectedWidgetTypes: selectedCases.map((item) => item.widgetType),
    },
    environment: {
      adminUrl: args.adminUrl,
      frontUrl: args.frontUrl,
      adminReachable: args.dryRun || args.skipAdmin ? null : await checkUrl(args.adminUrl),
      frontReachable: args.dryRun || args.skipFront ? null : await checkUrl(args.frontUrl),
      playwrightCliAvailable: false,
    },
    admin: {
      skipped: args.skipAdmin || args.dryRun,
      loginAttempted: false,
      authenticated: null,
      results: [],
    },
    public: { skipped: args.skipFront || args.dryRun, results: [] },
    summary: { adminFailures: 0, publicFailures: 0, fixtureGaps: 0, metadataGaps: 0 },
  };

  const cliCheck = await runCommand(["playwright-cli", "--version"]);
  report.environment.playwrightCliAvailable = cliCheck.exitCode === 0;

  if (!args.dryRun && !report.environment.playwrightCliAvailable) {
    if (!args.skipAdmin) report.admin.error = "playwright_cli_unavailable";
    if (!args.skipFront) report.public.error = "playwright_cli_unavailable";
  }
  if (!args.dryRun && !args.skipAdmin && report.environment.adminReachable === false) {
    report.admin.error = "admin_unreachable";
  }
  if (!args.dryRun && !args.skipFront && report.environment.frontReachable === false) {
    report.public.error = "front_unreachable";
  }

  if (!args.dryRun && report.environment.playwrightCliAvailable) {
    const scratchDir = ".tmp/playwright-widget-contract-smoke";
    const screenshotDir = `${scratchDir}/screenshots`;
    let authStatePath: string | null = null;
    installAuthStateSignalCleanup(() => authStatePath);
    await mkdir(scratchDir, { recursive: true });
    await mkdir(screenshotDir, { recursive: true });
    await runCommand(["playwright-cli", `-s=${args.session}`, "open", "about:blank"]);
    try {
      if (!args.skipAdmin && report.environment.adminReachable && !report.admin.error) {
        authStatePath = `${scratchDir}/admin-auth-state.json`;
        const authState = await writeAdminAuthState(args.adminUrl, authStatePath);
        report.admin.loginAttempted = authState.attempted;
        report.admin.authenticated = authState.authenticated;
        if (!authState.authenticated) {
          report.admin.error = authState.error ?? "login_failed";
        }
      }
      if (
        !args.skipAdmin &&
        report.environment.adminReachable &&
        !report.admin.error &&
        authStatePath
      ) {
        for (const item of selectedCases) {
          const merged: Omit<AdminWidgetResult, "status" | "duplicateWritablePaths"> = {
            widgetType: item.widgetType,
            modes: [],
          };
          let directResult: AdminWidgetResult | null = null;
          for (const mode of item.requiredModes) {
            await runCommand(["playwright-cli", `-s=${args.session}`, "close"]);
            await runCommand(["playwright-cli", `-s=${args.session}`, "open", "about:blank"]);
            const stateLoad = await runCommand([
              "playwright-cli",
              `-s=${args.session}`,
              "state-load",
              authStatePath,
            ]);
            if (stateLoad.exitCode !== 0) {
              merged.modes.push(createFailedAdminMode(mode, "auth_state_load_failed"));
              continue;
            }
            const adminCodePath = `${scratchDir}/admin-probe-${item.widgetType}-${mode}.js`;
            const modeCase: WidgetSmokeCase = { ...item, requiredModes: [mode] };
            await writeCodeFile(adminCodePath, buildAdminProbeCode(args.adminUrl, [modeCase]));
            try {
              const adminResult = await runPlaywrightCode<{
                login: { attempted: boolean; authenticated: boolean | null; error?: string | null };
                results: AdminWidgetResult[];
                error?: string;
              }>(args.session, adminCodePath);
              report.admin.loginAttempted =
                report.admin.loginAttempted || adminResult.login.attempted;
              report.admin.authenticated =
                report.admin.authenticated === false ? false : adminResult.login.authenticated;
              if (adminResult.error) {
                merged.modes.push(createFailedAdminMode(mode, adminResult.error));
                continue;
              }
              const [modeResult] = adminResult.results;
              if (!modeResult) {
                merged.modes.push(createFailedAdminMode(mode, "admin_probe_result_missing"));
                continue;
              }
              if (modeResult.status === "fixture-gap") {
                directResult = modeResult;
                break;
              }
              if (modeResult.error && modeResult.modes.length === 0) {
                merged.pageId = modeResult.pageId;
                merged.adminPath = modeResult.adminPath;
                merged.modes.push(
                  isAdminFixtureUnopenableError(modeResult.error)
                    ? createAdminFixtureGapMode(mode, modeResult.error)
                    : createFailedAdminMode(mode, modeResult.error)
                );
                continue;
              }
              merged.pageId = merged.pageId ?? modeResult.pageId;
              merged.adminPath = merged.adminPath ?? modeResult.adminPath;
              merged.modes.push(...modeResult.modes);
            } catch (error) {
              merged.modes.push(
                createFailedAdminMode(mode, error instanceof Error ? error.message : String(error))
              );
            }
          }
          report.admin.results.push(directResult ?? finalizeAdminResult(item, merged));
        }
      }
      if (!args.skipFront && report.environment.frontReachable && !report.public.error) {
        await runCommand(["playwright-cli", `-s=${args.session}`, "close"]);
        await runCommand(["playwright-cli", `-s=${args.session}`, "open", "about:blank"]);
        const publicCodePath = `${scratchDir}/public-probe.js`;
        await writeCodeFile(
          publicCodePath,
          buildPublicProbeCode(args.frontUrl, selectedCases, screenshotDir)
        );
        try {
          const publicResult = await runPlaywrightCode<{ results: PublicWidgetResult[] }>(
            args.session,
            publicCodePath
          );
          report.public.results = publicResult.results;
        } catch (error) {
          report.public.error = error instanceof Error ? error.message : String(error);
        }
      }
      if (!args.keepOpen) {
        await runCommand(["playwright-cli", `-s=${args.session}`, "close"]);
      }
    } finally {
      if (authStatePath) {
        await rm(authStatePath, { force: true });
      }
    }
  }

  report.summary = summarize(report);
  await ensureDirForFile(args.outputJsonPath);
  await Bun.write(args.outputJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await ensureDirForFile(args.outputMarkdownPath);
  await Bun.write(args.outputMarkdownPath, renderMarkdown(report));

  if (args.strict && hasStrictFailure(report)) {
    throw new Error("widget_contract_smoke_failed");
  }
  console.log(
    JSON.stringify(
      {
        dryRun: report.dryRun,
        selected: report.inventory.selectedWidgetTypes.length,
        summary: report.summary,
        outputJson: args.outputJsonPath,
        outputMarkdown: args.outputMarkdownPath,
      },
      null,
      2
    )
  );
}

export {
  parseArgs,
  readInventory,
  validateInventory,
  selectCases,
  extractCliJson,
  createFailedAdminMode,
  createAdminFixtureGapMode,
  findDuplicateWritablePaths,
  finalizeAdminResult,
  classifyPublicStatus,
  shouldCountOverflowOwner,
  isAdminFixtureUnopenableError,
  hasStrictFailure,
  summarize,
  renderMarkdown,
};
export type { AdminModeResult, SmokeInventory, SmokeReport, WidgetSmokeCase };

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
