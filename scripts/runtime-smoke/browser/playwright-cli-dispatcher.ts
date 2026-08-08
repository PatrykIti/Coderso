import { constants } from "node:fs";
import { access, lstat, open, realpath, stat, unlink, type FileHandle } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { SmokeError } from "../contracts";
import type { RuntimeSmokeContext } from "../lifecycle";
import { resolveExecutableOnPath, type ProcessResult } from "../process-supervisor";
import type { BrowserTransportDispatch, BrowserTransportDispatcher } from "./contracts";

const SESSION = /^[a-z0-9][a-z0-9_-]{2,47}$/u;
const SEGMENT = /^[a-z0-9][a-z0-9._/-]{0,159}$/u;
const DEFAULT_MAXIMUM_SOURCE_BYTES = 1024 * 1024;
const MAXIMUM_SOURCE_BYTES = 4 * 1024 * 1024;
const MAXIMUM_DISPATCHES = 4_096;
const DEFAULT_RUN_CODE_TIMEOUT_MS = 30_000;
const MAXIMUM_RUN_CODE_TIMEOUT_MS = 5 * 60_000;
const MAXIMUM_STORAGE_STATE_BYTES = 1024 * 1024;
const MAXIMUM_PLAYWRIGHT_CONFIG_BYTES = 256 * 1024;
const OPEN_OUTPUT_BYTES = 128 * 1024;
const CLOSE_OUTPUT_BYTES = 64 * 1024;

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function validatePlaywrightConfig(value: unknown): void {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !hasExactKeys(value, ["browser"])
  ) {
    invalid("Playwright runtime configuration is invalid");
  }
  const browser = Reflect.get(value, "browser") as unknown;
  if (
    browser === null ||
    typeof browser !== "object" ||
    Array.isArray(browser) ||
    !hasExactKeys(browser, ["browserName", "launchOptions"])
  ) {
    invalid("Playwright runtime configuration is invalid");
  }
  const launchOptions = Reflect.get(browser, "launchOptions") as unknown;
  if (
    Reflect.get(browser, "browserName") !== "chromium" ||
    launchOptions === null ||
    typeof launchOptions !== "object" ||
    Array.isArray(launchOptions) ||
    !hasExactKeys(launchOptions, ["args"])
  ) {
    invalid("Playwright runtime configuration is invalid");
  }
  const args = Reflect.get(launchOptions, "args") as unknown;
  if (!Array.isArray(args) || args.length !== 1 || args[0] !== "--no-sandbox") {
    invalid("Playwright runtime configuration is invalid");
  }
}

export type PlaywrightCliNativeCommand =
  | { readonly operation: "tab-new"; readonly url: string }
  | { readonly operation: "tab-select"; readonly index: number }
  | { readonly operation: "tab-close"; readonly index: number }
  | { readonly operation: "route-list" };

export interface PlaywrightCliDispatcherOptions {
  readonly context: RuntimeSmokeContext;
  readonly session: string;
  readonly workspace: string;
  readonly segments: readonly string[];
  readonly maximumSourceBytes?: number;
  readonly runCodeTimeoutMs?: number;
  readonly environmentPath?: string;
  readonly runtimeEnvironment?: NodeJS.ProcessEnv;
  readonly resolveExecutable?: (pathValue: string) => Promise<string>;
}

function invalid(message: string, cause?: unknown): never {
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

function validateBound(value: number | undefined): number {
  const maximum = value ?? DEFAULT_MAXIMUM_SOURCE_BYTES;
  if (!Number.isSafeInteger(maximum) || maximum <= 0 || maximum > MAXIMUM_SOURCE_BYTES) {
    return invalid("Playwright source byte bound is invalid");
  }
  return maximum;
}

function validateRunCodeTimeout(value: number | undefined): number {
  const timeoutMs = value ?? DEFAULT_RUN_CODE_TIMEOUT_MS;
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > MAXIMUM_RUN_CODE_TIMEOUT_MS
  ) {
    return invalid("Playwright run-code timeout is invalid");
  }
  return timeoutMs;
}

function validateCanonicalRunCodeOutput(stdout: Uint8Array, maximumOutputBytes: number): void {
  if (stdout.byteLength === 0 || stdout.byteLength > maximumOutputBytes) {
    throw new SmokeError("smoke_output_invalid", "Playwright output exceeded its bound");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(stdout);
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "Playwright output is not UTF-8", {
      cause: error,
    });
  }
  if (
    !text.endsWith("\n") ||
    text.slice(0, -1).includes("\n") ||
    text.includes("\r") ||
    text.includes("\0")
  ) {
    throw new SmokeError("smoke_output_invalid", "Playwright output frame is malformed");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(text.slice(0, -1));
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "Playwright output frame is not JSON", {
      cause: error,
    });
  }
  if (
    typeof decoded !== "string" ||
    decoded.includes("\0") ||
    decoded.includes("\r") ||
    !decoded.endsWith("\n") ||
    `${JSON.stringify(decoded)}\n` !== text
  ) {
    throw new SmokeError("smoke_output_invalid", "Playwright output frame is not canonical");
  }
}

function preservePrimaryFailure(primary: unknown, cleanup: unknown): unknown {
  if (primary === undefined) return cleanup;
  if (primary instanceof SmokeError) {
    return new SmokeError(primary.code, primary.message, {
      cause: new AggregateError([primary, cleanup], "Playwright primary and cleanup failures"),
    });
  }
  return new SmokeError("smoke_process_failed", "Playwright dispatch and cleanup failed", {
    cause: new AggregateError([primary, cleanup]),
  });
}

export class PlaywrightCliDispatcher implements BrowserTransportDispatcher {
  readonly #context: RuntimeSmokeContext;
  readonly #session: string;
  readonly #workspaceInput: string;
  readonly #segments: ReadonlySet<string>;
  readonly #maximumSourceBytes: number;
  readonly #runCodeTimeoutMs: number;
  readonly #pathValue: string;
  readonly #playwrightConfigInput: string | null;
  readonly #playwrightBrowsersInput: string | null;
  readonly #resolveExecutable: (pathValue: string) => Promise<string>;
  readonly #sourceFiles = new Set<string>();
  #workspace: string | null = null;
  #executable: string | null = null;
  #runtimeEnvironment: Readonly<Record<string, string>> | null = null;
  #opened = false;
  #openAttempted = false;
  #activeChildren = 0;
  #busy = false;
  #dispatches = 0;
  #closed = false;
  #closeProof = false;
  #closePromise: Promise<void> | null = null;

  readonly name: string;

  constructor(options: PlaywrightCliDispatcherOptions) {
    if (!SESSION.test(options.session)) invalid("Playwright session is invalid");
    if (
      !Array.isArray(options.segments) ||
      options.segments.length === 0 ||
      options.segments.length > MAXIMUM_DISPATCHES ||
      options.segments.some((segment) => !SEGMENT.test(segment)) ||
      new Set(options.segments).size !== options.segments.length
    ) {
      invalid("Playwright segment allowlist is invalid");
    }
    const pathValue = options.environmentPath ?? process.env.PATH;
    if (typeof pathValue !== "string" || pathValue.length === 0 || pathValue.includes("\0")) {
      invalid("Playwright PATH is unavailable");
    }
    const runtimeSource = options.runtimeEnvironment ?? process.env;
    const playwrightConfigInput = runtimeSource.PLAYWRIGHT_MCP_CONFIG ?? null;
    const playwrightBrowsersInput = runtimeSource.PLAYWRIGHT_BROWSERS_PATH ?? null;
    for (const value of [playwrightConfigInput, playwrightBrowsersInput]) {
      if (
        value !== null &&
        (typeof value !== "string" ||
          value.length === 0 ||
          value.includes("\0") ||
          !isAbsolute(value))
      ) {
        invalid("Playwright runtime path is invalid");
      }
    }
    if (!isAbsolute(options.workspace)) invalid("Playwright workspace must be absolute");
    this.#context = options.context;
    this.#session = options.session;
    this.#workspaceInput = options.workspace;
    this.#segments = new Set(options.segments);
    this.#maximumSourceBytes = validateBound(options.maximumSourceBytes);
    this.#runCodeTimeoutMs = validateRunCodeTimeout(options.runCodeTimeoutMs);
    this.#pathValue = pathValue;
    this.#playwrightConfigInput = playwrightConfigInput;
    this.#playwrightBrowsersInput = playwrightBrowsersInput;
    this.#resolveExecutable =
      options.resolveExecutable ?? ((path) => resolveExecutableOnPath("playwright-cli", path));
    this.name = `playwright-cli-${options.session}`;
  }

  async dispatch(request: BrowserTransportDispatch): Promise<Uint8Array> {
    if (
      this.#closed ||
      this.#busy ||
      request.session !== this.#session ||
      !this.#segments.has(request.segmentId) ||
      !SEGMENT.test(request.segmentId) ||
      this.#dispatches >= MAXIMUM_DISPATCHES ||
      typeof request.source !== "string" ||
      request.source.length === 0 ||
      request.source.includes("\0") ||
      Buffer.byteLength(request.source) > this.#maximumSourceBytes ||
      !Number.isSafeInteger(request.maximumOutputBytes) ||
      request.maximumOutputBytes <= 0
    ) {
      invalid("Playwright dispatch is invalid");
    }
    this.#busy = true;
    try {
      await this.#ensureOpen();
      const sourcePath = await this.#writeSource(request.segmentId, request.source);
      let output: Uint8Array | undefined;
      let primary: unknown;
      try {
        const result = await this.#run({
          args: ["--raw", `-s=${this.#session}`, "run-code", "--filename", sourcePath],
          family: "playwright-run-code",
          timeoutMs: this.#runCodeTimeoutMs,
          maximumOutputBytes: request.maximumOutputBytes,
        });
        validateCanonicalRunCodeOutput(result.stdout, request.maximumOutputBytes);
        output = result.stdout;
        this.#dispatches += 1;
      } catch (error) {
        primary = error;
      }
      try {
        await this.#removePrivateFile(sourcePath);
      } catch (error) {
        primary = preservePrimaryFailure(primary, error);
      }
      if (primary !== undefined) throw primary;
      if (output === undefined) {
        throw new SmokeError("smoke_output_invalid", "Playwright dispatch produced no output");
      }
      return output;
    } finally {
      this.#busy = false;
    }
  }

  async dispatchNative(command: PlaywrightCliNativeCommand): Promise<Uint8Array> {
    if (this.#closed || this.#busy || this.#dispatches >= MAXIMUM_DISPATCHES) {
      invalid("Playwright native dispatch is unavailable");
    }
    const args = this.#nativeArgs(command);
    this.#busy = true;
    try {
      await this.#ensureOpen();
      const result = await this.#run({
        args: [`-s=${this.#session}`, "--raw", ...args],
        family: `playwright-${command.operation}`,
        timeoutMs: 30_000,
        maximumOutputBytes: OPEN_OUTPUT_BYTES,
      });
      if (
        result.stdout.byteLength > OPEN_OUTPUT_BYTES ||
        result.stdout.includes(0) ||
        result.stderr.byteLength !== 0
      ) {
        throw new SmokeError("smoke_output_invalid", "Playwright native output is malformed");
      }
      this.#dispatches += 1;
      return result.stdout;
    } finally {
      this.#busy = false;
    }
  }

  async loadStorageState(path: string): Promise<void> {
    if (this.#closed || this.#busy) invalid("Playwright storage-state load is unavailable");
    this.#busy = true;
    try {
      const canonical = await this.#prepareOwnedStorageState(path);
      let primary: unknown;
      try {
        await this.#ensureOpen();
        await this.#run({
          args: [`-s=${this.#session}`, "state-load", canonical],
          family: "playwright-state-load",
          timeoutMs: 15_000,
          maximumOutputBytes: CLOSE_OUTPUT_BYTES,
        });
      } catch (error) {
        primary = error;
      }
      try {
        await this.#removePrivateFile(canonical);
      } catch (error) {
        primary = preservePrimaryFailure(primary, error);
      }
      if (primary !== undefined) throw primary;
    } finally {
      this.#busy = false;
    }
  }

  close(): Promise<void> {
    this.#closePromise ??= this.#closeOnce();
    return this.#closePromise;
  }

  async #closeOnce(): Promise<void> {
    this.#closed = true;
    let primary: unknown;
    if (this.#busy) {
      primary = new SmokeError("smoke_cleanup_failed", "Playwright dispatch is still active");
    } else if (this.#openAttempted) {
      try {
        await this.#run({
          args: [`-s=${this.#session}`, "close"],
          family: "playwright-close",
          timeoutMs: 15_000,
          maximumOutputBytes: CLOSE_OUTPUT_BYTES,
        });
        this.#closeProof = true;
      } catch (error) {
        primary = error;
      }
    } else {
      this.#closeProof = true;
    }
    for (const sourcePath of this.#sourceFiles) {
      try {
        await unlink(sourcePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT" && primary === undefined) {
          primary = error;
        }
      }
    }
    this.#sourceFiles.clear();
    if (primary !== undefined) throw primary;
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#closed && this.#closeProof && this.#activeChildren === 0 && this.#sourceFiles.size === 0
    );
  }

  async #ensureOpen(): Promise<void> {
    if (this.#opened) return;
    this.#openAttempted = true;
    await this.#run({
      args: [`-s=${this.#session}`, "open", "about:blank"],
      family: "playwright-open",
      timeoutMs: 30_000,
      maximumOutputBytes: OPEN_OUTPUT_BYTES,
    });
    this.#opened = true;
  }

  #nativeArgs(command: PlaywrightCliNativeCommand): readonly string[] {
    if (command.operation === "route-list") return Object.freeze(["route-list"]);
    if (command.operation === "tab-new") {
      let parsed: URL;
      try {
        parsed = new URL(command.url);
      } catch (error) {
        return invalid("Playwright tab URL is invalid", error);
      }
      if (
        (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
        parsed.username.length > 0 ||
        parsed.password.length > 0 ||
        parsed.hash.length > 0 ||
        command.url.length > 8_192 ||
        command.url.includes("\0") ||
        parsed.href !== command.url
      ) {
        invalid("Playwright tab URL is invalid");
      }
      return Object.freeze(["tab-new", command.url]);
    }
    if (!Number.isSafeInteger(command.index) || command.index < 0 || command.index > 31) {
      invalid("Playwright tab index is invalid");
    }
    return Object.freeze([command.operation, String(command.index)]);
  }

  async #resolveWorkspace(): Promise<string> {
    if (this.#workspace !== null) return this.#workspace;
    const [root, workspace] = await Promise.all([
      realpath(this.#context.root),
      realpath(this.#workspaceInput),
    ]).catch((error: unknown) => invalid("Playwright workspace is unavailable", error));
    const metadata = await stat(workspace);
    const uid = typeof process.getuid === "function" ? process.getuid() : metadata.uid;
    if (
      !isWithin(root, workspace) ||
      !metadata.isDirectory() ||
      metadata.uid !== uid ||
      (metadata.mode & 0o077) !== 0
    ) {
      invalid("Playwright workspace escapes the task root");
    }
    this.#workspace = workspace;
    return workspace;
  }

  async #resolveCli(): Promise<string> {
    if (this.#executable !== null) return this.#executable;
    const executable = await this.#resolveExecutable(this.#pathValue);
    if (!isAbsolute(executable)) invalid("Playwright executable is not absolute");
    const canonical = await realpath(executable).catch((error: unknown) =>
      invalid("Playwright executable is unavailable", error)
    );
    await access(canonical, constants.X_OK).catch((error: unknown) =>
      invalid("Playwright executable is not executable", error)
    );
    if (!(await stat(canonical)).isFile()) invalid("Playwright executable is not a file");
    this.#executable = canonical;
    return canonical;
  }

  async #projectRuntimeEnvironment(): Promise<Readonly<Record<string, string>>> {
    if (this.#runtimeEnvironment !== null) return this.#runtimeEnvironment;
    const projected: Record<string, string> = { PATH: this.#pathValue };
    if (this.#playwrightConfigInput !== null) {
      const configured = this.#playwrightConfigInput;
      let handle: FileHandle | undefined;
      try {
        const metadata = await lstat(configured);
        const canonical = await realpath(configured);
        if (
          canonical !== configured ||
          metadata.isSymbolicLink() ||
          !metadata.isFile() ||
          metadata.size <= 0 ||
          metadata.size > MAXIMUM_PLAYWRIGHT_CONFIG_BYTES
        ) {
          invalid("Playwright runtime configuration is invalid");
        }
        handle = await open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW);
        const bytes = await handle.readFile();
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        validatePlaywrightConfig(JSON.parse(text) as unknown);
        projected.PLAYWRIGHT_MCP_CONFIG = canonical;
      } catch (error) {
        if (error instanceof SmokeError) throw error;
        return invalid("Playwright runtime configuration is unavailable", error);
      } finally {
        await handle?.close();
      }
    }
    if (this.#playwrightBrowsersInput !== null) {
      const configured = this.#playwrightBrowsersInput;
      try {
        const metadata = await lstat(configured);
        const canonical = await realpath(configured);
        if (canonical !== configured || metadata.isSymbolicLink() || !metadata.isDirectory()) {
          invalid("Playwright browser path is invalid");
        }
        projected.PLAYWRIGHT_BROWSERS_PATH = canonical;
      } catch (error) {
        if (error instanceof SmokeError) throw error;
        return invalid("Playwright browser path is unavailable", error);
      }
    }
    this.#runtimeEnvironment = Object.freeze(projected);
    return this.#runtimeEnvironment;
  }

  async #writeSource(segment: string, source: string): Promise<string> {
    const workspace = await this.#resolveWorkspace();
    const sourcePath = resolve(
      workspace,
      `playwright-${this.#session}-${String(this.#dispatches + 1).padStart(4, "0")}-${segment.replaceAll("/", "-")}.mjs`
    );
    if (!isWithin(workspace, sourcePath)) invalid("Playwright source path escapes its workspace");
    let handle: FileHandle | undefined;
    try {
      handle = await open(sourcePath, "wx", 0o600);
      await handle.writeFile(source, { encoding: "utf8" });
      await handle.sync();
    } catch (error) {
      throw new SmokeError("smoke_process_failed", "Playwright source could not be written", {
        cause: error,
      });
    } finally {
      await handle?.close();
    }
    const metadata = await lstat(sourcePath);
    if (!metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o777) !== 0o600) {
      await unlink(sourcePath).catch(() => undefined);
      invalid("Playwright source ownership is invalid");
    }
    this.#sourceFiles.add(sourcePath);
    return sourcePath;
  }

  async #prepareOwnedStorageState(path: string): Promise<string> {
    if (!isAbsolute(path)) invalid("Playwright storage-state path must be absolute");
    const workspace = await this.#resolveWorkspace();
    const inputMetadata = await lstat(path).catch((error: unknown) =>
      invalid("Playwright storage-state file is unavailable", error)
    );
    if (inputMetadata.isSymbolicLink() || !inputMetadata.isFile()) {
      invalid("Playwright storage-state file is not regular");
    }
    const canonical = await realpath(path);
    let handle: FileHandle | undefined;
    try {
      handle = await open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW);
    } catch (error) {
      return invalid("Playwright storage-state file could not be opened", error);
    }
    const metadata = await handle.stat();
    const uid = typeof process.getuid === "function" ? process.getuid() : metadata.uid;
    if (
      !isWithin(workspace, canonical) ||
      !metadata.isFile() ||
      metadata.uid !== uid ||
      (metadata.mode & 0o777) !== 0o600 ||
      metadata.size <= 0 ||
      metadata.size > MAXIMUM_STORAGE_STATE_BYTES
    ) {
      await handle.close();
      invalid("Playwright storage-state ownership is invalid");
    }
    let bytes: Buffer;
    try {
      bytes = await handle.readFile();
    } finally {
      await handle.close();
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const decoded = JSON.parse(text) as unknown;
      if (decoded === null || typeof decoded !== "object" || Array.isArray(decoded)) {
        invalid("Playwright storage-state JSON is invalid");
      }
    } catch (error) {
      if (error instanceof SmokeError) throw error;
      return invalid("Playwright storage-state is not bounded UTF-8 JSON", error);
    }
    const privatePath = resolve(
      workspace,
      `playwright-${this.#session}-state-${String(this.#dispatches + 1).padStart(4, "0")}.json`
    );
    let privateHandle: FileHandle | undefined;
    try {
      privateHandle = await open(privatePath, "wx", 0o600);
      await privateHandle.writeFile(bytes);
      await privateHandle.sync();
      const privateMetadata = await privateHandle.stat();
      if (
        !privateMetadata.isFile() ||
        privateMetadata.uid !== uid ||
        (privateMetadata.mode & 0o777) !== 0o600
      ) {
        invalid("private Playwright storage-state ownership is invalid");
      }
    } catch (error) {
      await unlink(privatePath).catch(() => undefined);
      throw new SmokeError(
        "smoke_process_failed",
        "private Playwright storage-state could not be prepared",
        { cause: error }
      );
    } finally {
      await privateHandle?.close();
    }
    this.#sourceFiles.add(privatePath);
    return privatePath;
  }

  async #removePrivateFile(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    } finally {
      this.#sourceFiles.delete(path);
    }
  }

  async #run(input: {
    readonly args: readonly string[];
    readonly family: string;
    readonly timeoutMs: number;
    readonly maximumOutputBytes: number;
  }): Promise<ProcessResult> {
    const [executable, environment] = await Promise.all([
      this.#resolveCli(),
      this.#projectRuntimeEnvironment(),
    ]);
    this.#activeChildren += 1;
    try {
      return await this.#context.processes.run({
        executable,
        args: input.args,
        cwd: this.#context.root,
        env: environment,
        family: input.family,
        timeoutMs: input.timeoutMs,
        maxOutputBytes: input.maximumOutputBytes,
        allowStderr: false,
      });
    } finally {
      this.#activeChildren -= 1;
    }
  }
}
