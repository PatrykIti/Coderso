import { constants } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { createServer, connect, type Server } from "node:net";
import { delimiter, isAbsolute, relative, resolve } from "node:path";
import { assertExactKeys, assertOwnedPort, isPlainObject, SmokeError } from "../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../lifecycle";
import { pollUntil } from "../polling";
import type { ManagedProcessHandle } from "../process-supervisor";
import { redactString } from "../redaction";

const LOOPBACK_HOST = "127.0.0.1";
const MAXIMUM_PATH_ENTRIES = 64;
const MAXIMUM_PATH_ENTRY_BYTES = 4_096;
const MAXIMUM_PATH_BYTES = 32 * 1_024;
const MAXIMUM_ENVIRONMENT_KEYS = 128;
const MAXIMUM_ENVIRONMENT_BYTES = 256 * 1_024;
const DEFAULT_LOG_BYTES = 256 * 1_024;
const MAXIMUM_LOG_BYTES = 4 * 1024 * 1024;
const DEFAULT_READINESS_TIMEOUT_MS = 30_000;
const DEFAULT_RELEASE_TIMEOUT_MS = 5_000;
const ENVIRONMENT_KEY = /^[A-Z_][A-Z0-9_]{0,63}$/u;
const RESOURCE_NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
const FORBIDDEN_DEV_HOST_KEYS = new Set([
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "MEDIA_STORAGE",
  "MEDIA_DIR",
]);

export type SupervisedServerExecutable =
  | { readonly kind: "path-literal"; readonly name: "coderso-dev-core-host" }
  | { readonly kind: "absolute"; readonly path: string };

export interface SupervisedServerEnvironmentPolicy {
  readonly id: string;
  readonly required: readonly string[];
  readonly optional: readonly string[];
  readonly inherited: readonly string[];
  readonly fixed: Readonly<Record<string, string>>;
}

export interface SupervisedServerReadinessProbe {
  readonly id: string;
  check(): Promise<boolean>;
}

export interface SupervisedServerSpec {
  readonly executable: SupervisedServerExecutable;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly environment: {
    readonly source: NodeJS.ProcessEnv;
    readonly policy: SupervisedServerEnvironmentPolicy;
  };
  readonly ports: readonly number[];
  readonly readiness: readonly SupervisedServerReadinessProbe[];
  readonly family: string;
  readonly readinessTimeoutMs?: number;
  readonly portReleaseTimeoutMs?: number;
  readonly maximumLogBytes?: number;
  readonly isPortAvailable?: (port: number) => Promise<boolean>;
}

export interface SupervisedServerLogSnapshot {
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
  readonly stdout: string;
  readonly stderr: string;
}

const DEV_HOST_REQUIRED_REPOSITORY_KEYS = Object.freeze([
  "DATABASE_URL",
  "PII_HASH_KEY",
  "PII_ENC_KEY",
  "MEDIA_SECRET_MASTER_KEY",
]);

const DEV_HOST_OPTIONAL_REPOSITORY_KEYS = Object.freeze([
  "CORE_VERSION",
  "DB_POOL_MAX",
  "AUTH_PASSWORD_PEPPER",
  "ANALYTICS_IP_HASH_SECRET",
  "FORM_SUBMIT_NONCE_SECRET",
  "FORM_SUBMIT_NONCE_TTL_MINUTES",
  "ANALYTICS_BEACON_NONCE_SECRET",
  "ANALYTICS_BEACON_NONCE_TTL_MINUTES",
  "MEDIA_BASE_URL",
  "MEDIA_ALLOWED_MIME",
  "MEDIA_MAX_SIZE_BYTES",
  "EMAIL_TRANSPORT",
  "THEMES_DIR",
  "PLUGINS_RUNTIME_DIR",
  "PLUGINS_SAFE_MODE",
  "PLUGIN_UPDATE_MODE",
  "PLUGIN_ERROR_THRESHOLD",
  "PLUGIN_TIMEOUT_MS",
  "PLUGIN_DOWNLOAD_TIMEOUT_MS",
  "PLUGIN_MAX_SIZE_MB",
  "STORE_BASE_URL",
  "STORE_PUBLIC_KEY",
]);

const DEV_HOST_OPTIONAL_INHERITED_KEYS = Object.freeze([
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TMPDIR",
  "TMP",
  "TEMP",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "COLORTERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "XDG_CONFIG_HOME",
  "XDG_CACHE_HOME",
  "XDG_DATA_HOME",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "XAUTHORITY",
  "DBUS_SESSION_BUS_ADDRESS",
]);

export const CODERSO_DEV_HOST_ENVIRONMENT_POLICY: SupervisedServerEnvironmentPolicy = Object.freeze(
  {
    id: "coderso-dev-host",
    required: DEV_HOST_REQUIRED_REPOSITORY_KEYS,
    optional: DEV_HOST_OPTIONAL_REPOSITORY_KEYS,
    inherited: DEV_HOST_OPTIONAL_INHERITED_KEYS,
    fixed: Object.freeze({
      PORT: "3000",
      PUBLIC_BASE_URL: "http://coderso-a.localhost:3000",
      NODE_ENV: "development",
      COOKIE_SECURE: "false",
      VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
      VITE_SITE_DEV_SERVER_URL: "http://127.0.0.1:5174",
      VITE_API_ORIGIN: "http://127.0.0.1:3000",
      VITE_ADMIN_STRICT_MODE: "false",
      CODERSO_PUBLIC_VITE_DEV_URL: "http://coderso-a.localhost:5173",
      BUN_CONFIG_SKIP_INSTALL_PACKAGES: "1",
      CI: "true",
    }),
  }
);

/** @deprecated Prefer the suite-neutral CODERSO_DEV_HOST_ENVIRONMENT_POLICY export. */
export const TASK540_DEV_HOST_ENVIRONMENT_POLICY = CODERSO_DEV_HOST_ENVIRONMENT_POLICY;

function failArgument(message: string, cause?: unknown): never {
  throw new SmokeError(
    "smoke_argument_invalid",
    message,
    cause === undefined ? undefined : { cause }
  );
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function boundedPositive(value: number | undefined, fallback: number, maximum: number): number {
  const output = value ?? fallback;
  if (!Number.isSafeInteger(output) || output <= 0 || output > maximum) {
    failArgument("supervised server bound is invalid");
  }
  return output;
}

async function canonicalPath(pathValue: string): Promise<string> {
  if (pathValue.length === 0 || pathValue.length > MAXIMUM_PATH_BYTES || pathValue.includes("\0")) {
    failArgument("server PATH is invalid");
  }
  const entries = pathValue.split(delimiter);
  if (entries.length === 0 || entries.length > MAXIMUM_PATH_ENTRIES) {
    failArgument("server PATH entry set is invalid");
  }
  const canonicalEntries: string[] = [];
  for (const entry of entries) {
    if (
      !isAbsolute(entry) ||
      Buffer.byteLength(entry) === 0 ||
      Buffer.byteLength(entry) > MAXIMUM_PATH_ENTRY_BYTES
    ) {
      failArgument("server PATH entry is invalid");
    }
    const canonical = await realpath(entry).catch((error: unknown) =>
      failArgument("server PATH entry is unavailable", error)
    );
    if (!(await stat(canonical)).isDirectory())
      failArgument("server PATH entry is not a directory");
    // Keep the first canonical entry. Common Linux environments expose both
    // /usr/bin and its /bin alias; projecting the canonical path removes that
    // ambiguity without rejecting an otherwise valid developer host.
    if (canonicalEntries.includes(canonical)) continue;
    canonicalEntries.push(canonical);
  }
  const projected = canonicalEntries.join(delimiter);
  if (projected.length === 0 || Buffer.byteLength(projected) > MAXIMUM_PATH_BYTES) {
    failArgument("projected server PATH is invalid");
  }
  return projected;
}

function validatePolicy(policy: SupervisedServerEnvironmentPolicy): readonly string[] {
  if (
    !isPlainObject(policy) ||
    !RESOURCE_NAME.test(policy.id) ||
    !Array.isArray(policy.required) ||
    !Array.isArray(policy.optional) ||
    !Array.isArray(policy.inherited) ||
    !isPlainObject(policy.fixed)
  ) {
    failArgument("server environment policy is invalid");
  }
  const keys = [
    ...policy.required,
    ...policy.optional,
    ...policy.inherited,
    ...Object.keys(policy.fixed),
  ];
  if (
    keys.length > MAXIMUM_ENVIRONMENT_KEYS ||
    new Set(keys).size !== keys.length ||
    keys.some((key) => !ENVIRONMENT_KEY.test(key) || key === "PATH")
  ) {
    failArgument("server environment policy keys are invalid");
  }
  for (const value of Object.values(policy.fixed)) {
    if (typeof value !== "string" || value.includes("\0")) {
      failArgument("server fixed environment is invalid");
    }
  }
  if (
    policy.id === CODERSO_DEV_HOST_ENVIRONMENT_POLICY.id &&
    (keys.some((key) => FORBIDDEN_DEV_HOST_KEYS.has(key)) ||
      JSON.stringify(policy.required) !==
        JSON.stringify(CODERSO_DEV_HOST_ENVIRONMENT_POLICY.required) ||
      JSON.stringify(policy.optional) !==
        JSON.stringify(CODERSO_DEV_HOST_ENVIRONMENT_POLICY.optional) ||
      JSON.stringify(policy.inherited) !==
        JSON.stringify(CODERSO_DEV_HOST_ENVIRONMENT_POLICY.inherited) ||
      JSON.stringify(policy.fixed) !== JSON.stringify(CODERSO_DEV_HOST_ENVIRONMENT_POLICY.fixed))
  ) {
    failArgument("Coderso dev-host server environment policy drifted");
  }
  return keys;
}

export function readOwnEnvironmentString(
  source: NodeJS.ProcessEnv,
  key: string,
  options: { readonly required?: boolean } = {}
): string | null {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined) {
    if (options.required === true) failArgument("required server environment is incomplete");
    return null;
  }
  let value: unknown;
  if (Object.hasOwn(descriptor, "value")) {
    value = descriptor.value;
  } else {
    if (source !== process.env || typeof descriptor.get !== "function") {
      failArgument("server environment accessor is invalid");
    }
    value = descriptor.get.call(source);
  }
  if (value === undefined || (value === "" && options.required !== true)) return null;
  if (
    typeof value !== "string" ||
    value.includes("\0") ||
    (options.required === true && value.length === 0)
  ) {
    failArgument(
      options.required === true
        ? "required server environment is incomplete"
        : "server environment value is invalid"
    );
  }
  return value;
}

function requireSourceValue(source: NodeJS.ProcessEnv, key: string): string {
  return readOwnEnvironmentString(source, key, { required: true })!;
}

export async function projectSupervisedServerEnvironment(input: {
  readonly source: NodeJS.ProcessEnv;
  readonly policy: SupervisedServerEnvironmentPolicy;
}): Promise<Readonly<Record<string, string>>> {
  validatePolicy(input.policy);
  const output: Record<string, string> = {
    PATH: await canonicalPath(requireSourceValue(input.source, "PATH")),
  };
  for (const key of input.policy.required) output[key] = requireSourceValue(input.source, key);
  for (const key of [...input.policy.optional, ...input.policy.inherited]) {
    const value = readOwnEnvironmentString(input.source, key);
    if (value !== null) output[key] = value;
  }
  Object.assign(output, input.policy.fixed);
  const bytes = Object.entries(output).reduce(
    (total, [key, value]) => total + Buffer.byteLength(key) + Buffer.byteLength(value) + 2,
    0
  );
  if (Object.keys(output).length > MAXIMUM_ENVIRONMENT_KEYS || bytes > MAXIMUM_ENVIRONMENT_BYTES) {
    failArgument("server environment exceeds its bound");
  }
  return Object.freeze(output);
}

async function resolveServerExecutable(
  executable: SupervisedServerExecutable,
  pathValue: string
): Promise<string> {
  if (!isPlainObject(executable)) failArgument("server executable is invalid");
  let selected: string;
  if (executable.kind === "path-literal") {
    assertExactKeys(executable, ["kind", "name"], "server literal executable");
    if (executable.name !== "coderso-dev-core-host") {
      failArgument("server literal executable is unsupported");
    }
    selected = "";
    for (const directory of pathValue.split(delimiter)) {
      const candidate = resolve(directory, executable.name);
      try {
        await access(candidate, constants.X_OK);
        const canonical = await realpath(candidate);
        if ((await stat(canonical)).isFile()) {
          selected = canonical;
          break;
        }
      } catch {
        // Continue only through the already validated bounded PATH projection.
      }
    }
    if (selected.length === 0) {
      throw new SmokeError("smoke_process_spawn_failed", "server executable is unavailable");
    }
  } else if (executable.kind === "absolute") {
    assertExactKeys(executable, ["kind", "path"], "server absolute executable");
    if (!isAbsolute(executable.path)) failArgument("server executable must be absolute");
    selected = await realpath(executable.path).catch((error: unknown) =>
      failArgument("server executable is unavailable", error)
    );
  } else {
    return failArgument("server executable kind is unsupported");
  }
  await access(selected, constants.X_OK).catch((error: unknown) =>
    failArgument("server executable is not executable", error)
  );
  if (!(await stat(selected)).isFile()) failArgument("server executable is not a file");
  return selected;
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise<void>((resolveListen, rejectListen) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      rejectListen(error);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolveListen();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen({ host: LOOPBACK_HOST, port, exclusive: true });
  });
}

function closeListener(server: Server): Promise<void> {
  return new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}

export async function allocateLoopbackPort(): Promise<number> {
  const server = createServer();
  server.unref();
  try {
    await listen(server, 0);
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new SmokeError("smoke_process_spawn_failed", "loopback port is unavailable");
    }
    return assertOwnedPort(address.port);
  } finally {
    if (server.listening) await closeListener(server);
  }
}

function errorCode(error: unknown): string | null {
  if (error === null || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export async function isLoopbackPortAvailable(port: number): Promise<boolean> {
  assertOwnedPort(port);
  const server = createServer();
  server.unref();
  try {
    await listen(server, port);
    return true;
  } catch (error) {
    if (errorCode(error) === "EADDRINUSE") return false;
    throw new SmokeError("smoke_process_failed", "loopback port probe failed", { cause: error });
  } finally {
    if (server.listening) await closeListener(server);
  }
}

export async function canConnectToLoopbackPort(port: number): Promise<boolean> {
  assertOwnedPort(port);
  return new Promise<boolean>((resolveConnection) => {
    const socket = connect({ host: LOOPBACK_HOST, port });
    socket.unref();
    let settled = false;
    const finish = (value: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      resolveConnection(value);
    };
    const timeout = setTimeout(() => finish(false), 250);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

class BoundedUtf8Capture {
  readonly #limit: number;
  readonly #chunks: Buffer[] = [];
  readonly #settled: Promise<void>;
  #bytes = 0;
  #invalid = false;
  #ended = false;

  constructor(stream: NodeJS.ReadableStream, limit: number) {
    this.#limit = limit;
    const readableState = stream as NodeJS.ReadableStream & {
      readonly readableEnded?: boolean;
      readonly destroyed?: boolean;
    };
    this.#ended = readableState.readableEnded === true || readableState.destroyed === true;
    this.#settled = new Promise<void>((resolveSettled) => {
      let done = false;
      const settle = (): void => {
        if (done) return;
        done = true;
        this.#ended = true;
        resolveSettled();
      };
      if (this.#ended) {
        settle();
        return;
      }
      stream.on("data", (value: unknown) => this.#append(value));
      stream.once("end", settle);
      stream.once("close", settle);
      stream.once("error", () => {
        this.#invalid = true;
        settle();
      });
    });
  }

  #append(value: unknown): void {
    const chunk =
      typeof value === "string"
        ? Buffer.from(value)
        : Buffer.isBuffer(value)
          ? value
          : value instanceof Uint8Array
            ? Buffer.from(value)
            : null;
    if (chunk === null) {
      this.#invalid = true;
      return;
    }
    this.#bytes += chunk.byteLength;
    if (this.#bytes > this.#limit) {
      this.#invalid = true;
      return;
    }
    this.#chunks.push(chunk);
  }

  async settle(): Promise<void> {
    await pollUntil({
      timeoutMs: 2_000,
      intervalMs: 10,
      check: async () => (this.#ended ? true : null),
    });
    await this.#settled;
  }

  snapshot(redact: (value: string) => string): { readonly bytes: number; readonly text: string } {
    if (this.#invalid) throw new SmokeError("smoke_output_invalid", "server logs are unbounded");
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(this.#chunks));
    } catch (error) {
      throw new SmokeError("smoke_output_invalid", "server logs are not UTF-8", { cause: error });
    }
    return Object.freeze({ bytes: this.#bytes, text: redact(text) });
  }
}

export class SupervisedServerResource implements LifecycleResource {
  readonly name: string;
  readonly #ports: readonly number[];
  readonly #isPortAvailable: (port: number) => Promise<boolean>;
  readonly #releaseTimeoutMs: number;
  readonly #redact: (value: string) => string;
  #handle: ManagedProcessHandle | null = null;
  #stdout: BoundedUtf8Capture | null = null;
  #stderr: BoundedUtf8Capture | null = null;
  #closePromise: Promise<void> | null = null;
  #closeFinished = false;

  constructor(input: {
    readonly name: string;
    readonly ports: readonly number[];
    readonly isPortAvailable: (port: number) => Promise<boolean>;
    readonly releaseTimeoutMs: number;
    readonly secretValues: readonly string[];
  }) {
    this.name = input.name;
    this.#ports = input.ports;
    this.#isPortAvailable = input.isPortAvailable;
    this.#releaseTimeoutMs = input.releaseTimeoutMs;
    const secrets = [...new Set(input.secretValues)].filter((value) => value.length >= 6);
    this.#redact = (value) => {
      let output = redactString(value);
      for (const secret of secrets) output = output.replaceAll(secret, "[REDACTED]");
      return output;
    };
  }

  attach(handle: ManagedProcessHandle, maximumLogBytes: number): void {
    if (this.#handle !== null || this.#closePromise !== null) {
      throw new SmokeError("smoke_cleanup_failed", "server resource attachment drifted");
    }
    this.#handle = handle;
    this.#stdout = new BoundedUtf8Capture(handle.stdout, maximumLogBytes);
    this.#stderr = new BoundedUtf8Capture(handle.stderr, maximumLogBytes);
  }

  pid(): number | null {
    return this.#handle?.pid ?? null;
  }

  waitForUnexpectedExit(): Promise<never> {
    if (this.#handle === null) {
      return Promise.reject(
        new SmokeError("smoke_process_failed", "server process was not attached")
      );
    }
    return this.#handle.wait().then(() => {
      throw new SmokeError("smoke_server_unexpected_exit", "server exited unexpectedly");
    });
  }

  close(): Promise<void> {
    this.#closePromise ??= this.#closeOnce();
    return this.#closePromise;
  }

  async #closeOnce(): Promise<void> {
    let primary: unknown;
    if (this.#handle !== null) {
      try {
        await this.#handle.terminate();
      } catch (error) {
        primary = error;
      }
      try {
        await this.#handle.wait();
      } catch (error) {
        primary ??= error;
      }
      try {
        await Promise.all([this.#stdout?.settle(), this.#stderr?.settle()]);
      } catch (error) {
        primary ??= error;
      }
    }
    try {
      await pollUntil({
        timeoutMs: this.#releaseTimeoutMs,
        intervalMs: Math.min(25, this.#releaseTimeoutMs),
        check: async () =>
          (await Promise.all(this.#ports.map((port) => this.#isPortAvailable(port)))).every(Boolean)
            ? true
            : null,
      });
    } catch (error) {
      primary ??= error;
    }
    this.#closeFinished = primary === undefined;
    if (primary !== undefined) throw primary;
  }

  logs(): SupervisedServerLogSnapshot {
    if (!this.#closeFinished || this.#stdout === null || this.#stderr === null) {
      throw new SmokeError("smoke_output_invalid", "server logs are not settled");
    }
    const stdout = this.#stdout.snapshot(this.#redact);
    const stderr = this.#stderr.snapshot(this.#redact);
    return Object.freeze({
      stdoutBytes: stdout.bytes,
      stderrBytes: stderr.bytes,
      stdout: stdout.text,
      stderr: stderr.text,
    });
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#closeFinished &&
      (await Promise.all(this.#ports.map((port) => this.#isPortAvailable(port)))).every(Boolean)
    );
  }
}

function validateSpec(spec: SupervisedServerSpec): {
  readonly ports: readonly number[];
  readonly readinessTimeoutMs: number;
  readonly releaseTimeoutMs: number;
  readonly maximumLogBytes: number;
} {
  if (!RESOURCE_NAME.test(spec.family)) failArgument("server family is invalid");
  if (
    !Array.isArray(spec.ports) ||
    spec.ports.length === 0 ||
    spec.ports.length > 16 ||
    new Set(spec.ports).size !== spec.ports.length
  ) {
    failArgument("server port set is invalid");
  }
  const ports = Object.freeze(spec.ports.map(assertOwnedPort));
  if (
    !Array.isArray(spec.readiness) ||
    spec.readiness.length === 0 ||
    spec.readiness.length > 16 ||
    spec.readiness.some(
      (probe) => !RESOURCE_NAME.test(probe.id) || typeof probe.check !== "function"
    ) ||
    new Set(spec.readiness.map(({ id }) => id)).size !== spec.readiness.length
  ) {
    failArgument("server readiness probes are invalid");
  }
  return Object.freeze({
    ports,
    readinessTimeoutMs: boundedPositive(
      spec.readinessTimeoutMs,
      DEFAULT_READINESS_TIMEOUT_MS,
      10 * 60_000
    ),
    releaseTimeoutMs: boundedPositive(
      spec.portReleaseTimeoutMs,
      DEFAULT_RELEASE_TIMEOUT_MS,
      60_000
    ),
    maximumLogBytes: boundedPositive(spec.maximumLogBytes, DEFAULT_LOG_BYTES, MAXIMUM_LOG_BYTES),
  });
}

function secretEnvironmentValues(
  source: NodeJS.ProcessEnv,
  policy: SupervisedServerEnvironmentPolicy
): readonly string[] {
  const sensitive = /(?:DATABASE_URL|PASSWORD|SECRET|TOKEN|PII_.*KEY|MASTER_KEY)$/u;
  return Object.freeze(
    [...policy.required, ...policy.optional]
      .filter((key) => sensitive.test(key))
      .map((key) => source[key])
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  );
}

export async function startSupervisedServer(
  context: RuntimeSmokeContext,
  spec: SupervisedServerSpec
): Promise<SupervisedServerResource> {
  context.lifecycle.assertAccepting();
  const bounds = validateSpec(spec);
  const isPortAvailable = spec.isPortAvailable ?? isLoopbackPortAvailable;
  if (!(await Promise.all(bounds.ports.map((port) => isPortAvailable(port)))).every(Boolean)) {
    throw new SmokeError("smoke_process_spawn_failed", "server port is already occupied");
  }
  const resource = new SupervisedServerResource({
    name: spec.family,
    ports: bounds.ports,
    isPortAvailable,
    releaseTimeoutMs: bounds.releaseTimeoutMs,
    secretValues: secretEnvironmentValues(spec.environment.source, spec.environment.policy),
  });
  context.lifecycle.register(resource);

  try {
    const environment = await projectSupervisedServerEnvironment(spec.environment);
    const executable = await resolveServerExecutable(spec.executable, environment.PATH!);
    const [root, cwd] = await Promise.all([realpath(context.root), realpath(spec.cwd)]);
    if (!isWithin(root, cwd)) failArgument("server cwd escapes the repository root");
    const handle = await context.processes.start({
      executable,
      args: spec.args,
      cwd,
      env: environment,
      family: spec.family,
      maxOutputBytes: bounds.maximumLogBytes,
    });
    resource.attach(handle, bounds.maximumLogBytes);
    await Promise.race([
      pollUntil({
        timeoutMs: bounds.readinessTimeoutMs,
        intervalMs: Math.min(50, bounds.readinessTimeoutMs),
        check: async () =>
          (await Promise.all(spec.readiness.map(({ check }) => check()))).every(Boolean)
            ? true
            : null,
      }),
      resource.waitForUnexpectedExit(),
    ]);
    return resource;
  } catch (error) {
    await resource.close().catch(() => undefined);
    throw error;
  }
}
