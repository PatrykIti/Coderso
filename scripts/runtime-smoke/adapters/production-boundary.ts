import { readFile, realpath, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import {
  assertExactKeys,
  assertOwnedPort,
  isPlainObject,
  resolveInsideRoot,
  SmokeError,
} from "../contracts";
import type { RuntimeSmokeContext } from "../lifecycle";
import { resolveExecutableOnPath, type ProcessResult } from "../process-supervisor";
import {
  allocateLoopbackPort,
  canConnectToLoopbackPort,
  isLoopbackPortAvailable,
  startSupervisedServer,
  type SupervisedServerEnvironmentPolicy,
} from "../server/supervised-server";
import type { SmokeAdapter, SmokeAdapterResult, SmokeScenarioResult } from "./types";

const LOOPBACK_HOST = "127.0.0.1";
const RESPONSE_LIMIT_BYTES = 1024 * 1024;
const MANIFEST_LIMIT_BYTES = 512 * 1024;
const SERVER_LOG_LIMIT_BYTES = 64 * 1024;
const BUILD_TIMEOUT_MS = 5 * 60_000;
const READINESS_TIMEOUT_MS = 30_000;
const PORT_RELEASE_TIMEOUT_MS = 5_000;
const ANSI_COLOR_SEQUENCE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "gu");

const OPTIONAL_PRODUCTION_ENVIRONMENT_KEYS = Object.freeze([
  "ANALYTICS_BEACON_NONCE_SECRET",
  "ANALYTICS_BEACON_NONCE_TTL_MINUTES",
  "ANALYTICS_IP_HASH_SECRET",
  "AUTH_PASSWORD_PEPPER",
  "CORE_VERSION",
  "FORM_SUBMIT_NONCE_SECRET",
  "FORM_SUBMIT_NONCE_TTL_MINUTES",
  "MEDIA_ALLOWED_MIME",
  "MEDIA_BASE_URL",
  "MEDIA_DIR",
  "MEDIA_MAX_SIZE_BYTES",
  "MEDIA_SECRET_MASTER_KEY",
  "MEDIA_STORAGE",
  "PII_ENC_KEY",
  "PII_HASH_KEY",
  "PLUGINS_RUNTIME_DIR",
  "PLUGINS_SAFE_MODE",
  "PLUGIN_ERROR_THRESHOLD",
  "PLUGIN_TIMEOUT_MS",
  "THEMES_DIR",
] as const);

export interface ProductionBuiltAsset {
  readonly path: string;
  readonly contentType: "css" | "javascript";
}

export interface ProductionBoundaryDependencies {
  readonly environment?: NodeJS.ProcessEnv;
  readonly resolveBunExecutable?: (pathValue: string) => Promise<string>;
  readonly allocatePort?: () => Promise<number>;
  readonly canConnect?: (port: number) => Promise<boolean>;
  readonly isPortAvailable?: (port: number) => Promise<boolean>;
  readonly fetch?: typeof globalThis.fetch;
  readonly loadBuiltAsset?: (root: string) => Promise<ProductionBuiltAsset>;
  readonly now?: () => number;
  readonly readinessTimeoutMs?: number;
  readonly portReleaseTimeoutMs?: number;
}

interface LogSnapshot {
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
  readonly stdout: string;
  readonly stderr: string;
}

export const allocateProductionPort = allocateLoopbackPort;
export const isProductionPortAvailable = isLoopbackPortAvailable;
export const canConnectToProductionPort = canConnectToLoopbackPort;

function errorCode(error: unknown): string | null {
  if (error === null || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function normalizeAssetPath(value: string): string {
  if (
    value.length === 0 ||
    value.length > 512 ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
    !value.startsWith("assets/")
  ) {
    throw new SmokeError("smoke_output_invalid", "production manifest asset path is invalid");
  }
  const extension = extname(value).toLowerCase();
  if (extension !== ".css" && extension !== ".js" && extension !== ".mjs") {
    throw new SmokeError("smoke_output_invalid", "production manifest asset type is unsupported");
  }
  return value;
}

function parseManifestAsset(value: unknown): ProductionBuiltAsset {
  if (
    !isPlainObject(value) ||
    Object.keys(value).length === 0 ||
    Object.keys(value).length > 4_096
  ) {
    throw new SmokeError("smoke_output_invalid", "production site manifest is invalid");
  }
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  const entry = entries.find(([, record]) => isPlainObject(record) && record.isEntry === true)?.[1];
  if (!isPlainObject(entry)) {
    throw new SmokeError("smoke_output_invalid", "production site manifest entry is missing");
  }
  const css = Array.isArray(entry.css) && typeof entry.css[0] === "string" ? entry.css[0] : null;
  const file = typeof entry.file === "string" ? entry.file : null;
  const asset = normalizeAssetPath(css ?? file ?? "");
  const extension = extname(asset).toLowerCase();
  return Object.freeze({
    path: `/site/${asset}`,
    contentType: extension === ".css" ? "css" : "javascript",
  });
}

export async function loadProductionBuiltAsset(root: string): Promise<ProductionBuiltAsset> {
  const candidates = [
    resolve(root, "core/dist/site/.vite/manifest.json"),
    resolve(root, "core/dist/site/manifest.json"),
  ];
  for (const candidate of candidates) {
    try {
      const canonical = await realpath(candidate);
      resolveInsideRoot(root, canonical, "production site manifest");
      const metadata = await stat(canonical);
      if (!metadata.isFile() || metadata.size <= 0 || metadata.size > MANIFEST_LIMIT_BYTES) {
        throw new SmokeError("smoke_output_invalid", "production site manifest is unbounded");
      }
      const encoded = await readFile(canonical, "utf8");
      return parseManifestAsset(JSON.parse(encoded) as unknown);
    } catch (error) {
      if (errorCode(error) === "ENOENT") continue;
      if (error instanceof SmokeError) throw error;
      throw new SmokeError("smoke_output_invalid", "production site manifest cannot be read", {
        cause: error,
      });
    }
  }
  throw new SmokeError("smoke_output_invalid", "production site manifest is missing");
}

function requireEnvironmentValue(environment: NodeJS.ProcessEnv, key: string): string {
  const value = environment[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new SmokeError("smoke_argument_invalid", "production environment is incomplete");
  }
  return value;
}

export function buildProductionBoundaryEnvironment(
  environment: NodeJS.ProcessEnv,
  port: number
): Readonly<Record<string, string>> {
  const projected: Record<string, string> = {};
  for (const key of OPTIONAL_PRODUCTION_ENVIRONMENT_KEYS) {
    const value = environment[key];
    if (typeof value === "string" && value.length > 0) projected[key] = value;
  }
  return Object.freeze({
    ...projected,
    PATH: requireEnvironmentValue(environment, "PATH"),
    DATABASE_URL: requireEnvironmentValue(environment, "DATABASE_URL"),
    NODE_ENV: "production",
    PORT: String(assertOwnedPort(port)),
    PUBLIC_BASE_URL: `http://${LOOPBACK_HOST}:${port}`,
    DB_POOL_MAX: "1",
    COOKIE_SECURE: "false",
    BACKUP_SCHEDULER_ENABLED: "0",
    EMAIL_TRANSPORT: "mock",
    NO_COLOR: "1",
  });
}

function productionServerEnvironmentPolicy(port: number): SupervisedServerEnvironmentPolicy {
  return Object.freeze({
    id: "production-boundary",
    required: Object.freeze(["DATABASE_URL"]),
    optional: OPTIONAL_PRODUCTION_ENVIRONMENT_KEYS,
    inherited: Object.freeze([]),
    fixed: Object.freeze({
      NODE_ENV: "production",
      PORT: String(assertOwnedPort(port)),
      PUBLIC_BASE_URL: `http://${LOOPBACK_HOST}:${port}`,
      DB_POOL_MAX: "1",
      COOKIE_SECURE: "false",
      BACKUP_SCHEDULER_ENABLED: "0",
      EMAIL_TRANSPORT: "mock",
      NO_COLOR: "1",
    }),
  });
}

function buildEnvironment(environment: NodeJS.ProcessEnv): Readonly<Record<string, string>> {
  return Object.freeze({
    PATH: requireEnvironmentValue(environment, "PATH"),
    NODE_ENV: "production",
    NO_COLOR: "1",
  });
}

async function readBoundedText(response: Response): Promise<string> {
  const declared = response.headers.get("content-length");
  if (
    declared !== null &&
    (!/^[0-9]+$/u.test(declared) || Number(declared) > RESPONSE_LIMIT_BYTES)
  ) {
    await response.body?.cancel();
    throw new SmokeError("smoke_output_invalid", "production response is unbounded");
  }
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > RESPONSE_LIMIT_BYTES) {
      await reader.cancel();
      throw new SmokeError("smoke_output_invalid", "production response exceeded its bound");
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "production response is not UTF-8", {
      cause: error,
    });
  }
}

function assertContentType(
  response: Response,
  expected: "html" | "json" | "css" | "javascript"
): void {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const valid =
    expected === "html"
      ? contentType.startsWith("text/html")
      : expected === "json"
        ? contentType.startsWith("application/json")
        : expected === "css"
          ? contentType.startsWith("text/css")
          : /^(?:application|text)\/javascript\b/u.test(contentType);
  if (!valid) throw new SmokeError("smoke_output_invalid", "production content type drifted");
}

async function request(
  fetchImpl: typeof globalThis.fetch,
  origin: string,
  path: string
): Promise<Response> {
  try {
    return await fetchImpl(`${origin}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    throw new SmokeError("smoke_process_failed", "production HTTP probe failed", {
      cause: error,
    });
  }
}

function assertStatus(response: Response, expected: number): void {
  if (response.status !== expected) {
    void response.body?.cancel();
    throw new SmokeError("smoke_output_invalid", "production response status drifted");
  }
}

function assertHtmlBody(body: string): void {
  if (body.length === 0 || !/<html\b/iu.test(body)) {
    throw new SmokeError("smoke_output_invalid", "production HTML response is invalid");
  }
}

function normalizeLogLines(value: string): readonly string[] {
  const withoutAnsi = value.replace(ANSI_COLOR_SEQUENCE, "");
  if (withoutAnsi.includes("\0")) {
    throw new SmokeError("smoke_output_invalid", "production server logs are invalid");
  }
  return Object.freeze(
    withoutAnsi
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );
}

function assertCleanServerLogs(logs: LogSnapshot, port: number): void {
  const startup = `Core HTTP server listening on http://0.0.0.0:${port}`;
  const script =
    "$ bun --config=../bunfig.toml --preload=./server/productionReactRuntime.ts run server/prod.ts";
  const lines = [...normalizeLogLines(logs.stdout), ...normalizeLogLines(logs.stderr)];
  if (
    lines.filter((line) => line === startup).length !== 1 ||
    lines.some((line) => line !== startup && line !== script) ||
    lines.filter((line) => line === script).length > 1
  ) {
    throw new SmokeError("smoke_output_invalid", "production server logs are not clean");
  }
}

async function measureScenario(
  context: RuntimeSmokeContext,
  id: string,
  now: () => number,
  operation: () => Promise<void>
): Promise<SmokeScenarioResult> {
  const started = now();
  await context.timing.measure("scenario", id, operation);
  const elapsed = now() - started;
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    throw new SmokeError("smoke_output_invalid", "production scenario timing is invalid");
  }
  return Object.freeze({ id, pass: true, elapsedMs: Math.ceil(elapsed) });
}

async function runBuild(
  context: RuntimeSmokeContext,
  executable: string,
  environment: Readonly<Record<string, string>>,
  script: "build:admin" | "build:site",
  family: string
): Promise<ProcessResult> {
  return context.timing.measure("process", family, () =>
    context.processes.run({
      executable,
      args: ["--no-env-file", "run", script],
      cwd: resolveInsideRoot(context.root, "core", "Core working directory"),
      env: environment,
      timeoutMs: BUILD_TIMEOUT_MS,
      maxOutputBytes: 1024 * 1024,
      allowStderr: true,
      family,
    })
  );
}

export async function runProductionBoundaryAdapter(
  context: RuntimeSmokeContext,
  dependencies: ProductionBoundaryDependencies = {}
): Promise<SmokeAdapterResult> {
  if (context.input.profile !== "certification") {
    throw new SmokeError(
      "smoke_argument_invalid",
      "production boundary requires certification profile"
    );
  }
  context.lifecycle.assertAccepting();
  const environment = dependencies.environment ?? process.env;
  const pathValue = requireEnvironmentValue(environment, "PATH");
  const executable = await (
    dependencies.resolveBunExecutable ?? ((path) => resolveExecutableOnPath("bun", path))
  )(pathValue);
  const port = assertOwnedPort(await (dependencies.allocatePort ?? allocateProductionPort)());
  const isPortAvailable = dependencies.isPortAvailable ?? isProductionPortAvailable;
  if (!(await isPortAvailable(port))) {
    throw new SmokeError("smoke_process_spawn_failed", "allocated production port is unavailable");
  }

  const coreBuildEnvironment = buildEnvironment(environment);
  await runBuild(
    context,
    executable,
    coreBuildEnvironment,
    "build:admin",
    "production-build-admin"
  );
  await runBuild(context, executable, coreBuildEnvironment, "build:site", "production-build-site");
  const asset = await (dependencies.loadBuiltAsset ?? loadProductionBuiltAsset)(context.root);
  const canConnect = dependencies.canConnect ?? canConnectToProductionPort;
  const server = await context.timing.measure("phase", "production-readiness", () =>
    startSupervisedServer(context, {
      executable: { kind: "absolute", path: executable },
      args: ["--no-env-file", "run", "start:prod"],
      cwd: resolveInsideRoot(context.root, "core", "Core working directory"),
      environment: {
        source: environment,
        policy: productionServerEnvironmentPolicy(port),
      },
      ports: [port],
      readiness: [
        {
          id: "production-http",
          check: async () => canConnect(port),
        },
      ],
      family: "production-server",
      readinessTimeoutMs: dependencies.readinessTimeoutMs ?? READINESS_TIMEOUT_MS,
      portReleaseTimeoutMs: dependencies.portReleaseTimeoutMs ?? PORT_RELEASE_TIMEOUT_MS,
      maximumLogBytes: SERVER_LOG_LIMIT_BYTES,
      isPortAvailable,
    })
  );

  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now ?? performance.now.bind(performance);
  const origin = `http://${LOOPBACK_HOST}:${port}`;
  const scenarios: SmokeScenarioResult[] = [];

  scenarios.push(
    await measureScenario(context, "install-status", now, async () => {
      const response = await request(fetchImpl, origin, "/admin/api/auth/install/status");
      assertStatus(response, 200);
      assertContentType(response, "json");
      let decoded: unknown;
      try {
        decoded = JSON.parse(await readBoundedText(response)) as unknown;
      } catch (error) {
        if (error instanceof SmokeError) throw error;
        throw new SmokeError("smoke_output_invalid", "production install status is invalid", {
          cause: error,
        });
      }
      if (!isPlainObject(decoded)) {
        throw new SmokeError("smoke_output_invalid", "production install status is invalid");
      }
      assertExactKeys(decoded, ["available"], "production install status");
      if (typeof decoded.available !== "boolean") {
        throw new SmokeError("smoke_output_invalid", "production install status is invalid");
      }
    })
  );
  scenarios.push(
    await measureScenario(context, "public-root", now, async () => {
      const response = await request(fetchImpl, origin, "/");
      assertStatus(response, 200);
      assertContentType(response, "html");
      assertHtmlBody(await readBoundedText(response));
    })
  );
  scenarios.push(
    await measureScenario(context, "admin-redirect", now, async () => {
      const response = await request(fetchImpl, origin, "/admin");
      assertStatus(response, 307);
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (location === null || new URL(location, origin).href !== `${origin}/admin/`) {
        throw new SmokeError("smoke_output_invalid", "production Admin redirect drifted");
      }
    })
  );
  scenarios.push(
    await measureScenario(context, "admin-shell", now, async () => {
      const response = await request(fetchImpl, origin, "/admin/");
      assertStatus(response, 200);
      assertContentType(response, "html");
      assertHtmlBody(await readBoundedText(response));
    })
  );
  scenarios.push(
    await measureScenario(context, "manifest-asset", now, async () => {
      const response = await request(fetchImpl, origin, asset.path);
      assertStatus(response, 200);
      assertContentType(response, asset.contentType);
      await response.body?.cancel();
    })
  );
  scenarios.push(
    await measureScenario(context, "exact-unknown-route", now, async () => {
      const response = await request(fetchImpl, origin, "/peri");
      assertStatus(response, 404);
      if ((await readBoundedText(response)) !== "Not Found") {
        throw new SmokeError("smoke_output_invalid", "production unknown route body drifted");
      }
    })
  );
  scenarios.push(
    await measureScenario(context, "root-recovery", now, async () => {
      const response = await request(fetchImpl, origin, "/");
      assertStatus(response, 200);
      assertContentType(response, "html");
      assertHtmlBody(await readBoundedText(response));
    })
  );
  scenarios.push(
    await measureScenario(context, "clean-stop", now, async () => {
      await server.close();
      assertCleanServerLogs(server.logs(), port);
      if (!(await server.proveAbsent())) {
        throw new SmokeError("smoke_cleanup_failed", "production server or port remains active");
      }
    })
  );

  const logSnapshot = server.logs();
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: Object.freeze(scenarios),
    screenshots: Object.freeze([]),
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      builds: 2,
      probes: 7,
      productionProcessStopped: true,
      productionPortReleased: true,
      productionPort: port,
      serverPid: server.pid() ?? 0,
      stdoutBytes: logSnapshot.stdoutBytes,
      stderrBytes: logSnapshot.stderrBytes,
      builtAsset: asset.path,
    }),
  });
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "production-boundary",
  supportedProfiles: Object.freeze(["certification"] as const),
  run: runProductionBoundaryAdapter,
});

export default adapter;
