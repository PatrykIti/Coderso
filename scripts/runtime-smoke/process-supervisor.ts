import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { basename, delimiter, isAbsolute, relative, resolve } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { SmokeError } from "./contracts";
import type { LifecycleResource } from "./lifecycle";

const DEFAULT_OUTPUT_LIMIT = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ARGS = 128;
const MAX_ARG_BYTES = 16 * 1024;

export interface ProcessSpec {
  readonly executable: string;
  readonly args?: readonly string[];
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly input?: Uint8Array | string;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly allowStderr?: boolean;
  readonly family?: string;
}

export interface ProcessReceipt {
  readonly family: string;
  readonly pid: number;
  readonly exitCode: number;
  readonly signal: NodeJS.Signals | null;
  readonly elapsedMs: number;
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
  readonly stdoutSha256: string;
  readonly stderrSha256: string;
  readonly absent: true;
}

export interface ProcessResult {
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
  readonly receipt: ProcessReceipt;
}

export interface ManagedProcessHandle {
  readonly pid: number;
  readonly stdout: NodeJS.ReadableStream;
  readonly stderr: NodeJS.ReadableStream;
  write(bytes: Uint8Array | string): Promise<void>;
  endInput(): void;
  wait(): Promise<{ exitCode: number; signal: NodeJS.Signals | null; elapsedMs: number }>;
  terminate(): Promise<void>;
}

interface InternalHandle extends ManagedProcessHandle {
  readonly child: ChildProcessWithoutNullStreams;
  readonly family: string;
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function validateArgs(args: readonly string[]): void {
  if (args.length > MAX_ARGS) throw new SmokeError("smoke_argument_invalid", "too many arguments");
  let bytes = 0;
  for (const argument of args) {
    if (argument.includes("\0"))
      throw new SmokeError("smoke_argument_invalid", "argument contains NUL");
    bytes += Buffer.byteLength(argument);
  }
  if (bytes > MAX_ARG_BYTES)
    throw new SmokeError("smoke_argument_invalid", "arguments are too large");
}

function validateEnvironment(env: Readonly<Record<string, string>>): void {
  for (const [key, value] of Object.entries(env)) {
    if (!/^[A-Z_][A-Z0-9_]{0,63}$/u.test(key) || value.includes("\0")) {
      throw new SmokeError("smoke_argument_invalid", "process environment is invalid");
    }
  }
}

async function collect(stream: NodeJS.ReadableStream, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const raw of stream) {
    const chunk = Buffer.isBuffer(raw)
      ? raw
      : typeof raw === "string"
        ? Buffer.from(raw)
        : Buffer.from(raw as Uint8Array);
    size += chunk.byteLength;
    if (size > limit) throw new SmokeError("smoke_output_invalid", "process output exceeded limit");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

type CapturedOutput =
  { readonly ok: true; readonly bytes: Buffer } | { readonly ok: false; readonly error: unknown };

function capture(stream: NodeJS.ReadableStream, limit: number): Promise<CapturedOutput> {
  return collect(stream, limit).then(
    (bytes) => ({ ok: true, bytes }),
    (error: unknown) => ({ ok: false, error })
  );
}

async function killOwnedGroup(
  child: ChildProcessWithoutNullStreams,
  signal: NodeJS.Signals
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform !== "win32" && child.pid !== undefined) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fall through to the exact child when the process group already exited.
    }
  }
  child.kill(signal);
}

export async function resolveExecutableOnPath(
  name: string,
  pathValue = process.env.PATH ?? ""
): Promise<string> {
  if (!/^[A-Za-z0-9._-]+$/u.test(name)) {
    throw new SmokeError("smoke_argument_invalid", "executable name is invalid");
  }
  for (const directory of pathValue.split(delimiter)) {
    if (!directory || !isAbsolute(directory)) continue;
    const candidate = resolve(directory, name);
    try {
      await access(candidate, constants.X_OK);
      const canonical = await realpath(candidate);
      if ((await stat(canonical)).isFile()) return canonical;
    } catch {
      // Continue through the bounded PATH entries.
    }
  }
  throw new SmokeError("smoke_process_spawn_failed", `${name} executable is unavailable`);
}

export class ProcessSupervisor implements LifecycleResource {
  readonly name = "process-supervisor";
  readonly #root: string;
  readonly #active = new Map<number, InternalHandle>();
  readonly #starts = new Map<string, number>();

  constructor(root: string) {
    this.#root = root;
  }

  counters(): Readonly<Record<string, number>> {
    return Object.freeze(Object.fromEntries([...this.#starts.entries()].sort()));
  }

  async start(spec: ProcessSpec): Promise<ManagedProcessHandle> {
    if (!isAbsolute(spec.executable)) {
      throw new SmokeError("smoke_argument_invalid", "process executable must be absolute");
    }
    const executable = await realpath(spec.executable).catch((error: unknown) => {
      throw new SmokeError("smoke_process_spawn_failed", "process executable is unavailable", {
        cause: error,
      });
    });
    if (!(await stat(executable)).isFile()) {
      throw new SmokeError("smoke_process_spawn_failed", "process executable is not a file");
    }
    const cwd = await realpath(spec.cwd).catch((error: unknown) => {
      throw new SmokeError("smoke_process_spawn_failed", "process cwd is unavailable", {
        cause: error,
      });
    });
    if (!isWithin(this.#root, cwd)) {
      throw new SmokeError("smoke_argument_invalid", "process cwd escapes repository root");
    }
    const args = spec.args ?? [];
    const env = spec.env ?? {};
    validateArgs(args);
    validateEnvironment(env);
    const family = spec.family ?? basename(executable);
    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(family)) {
      throw new SmokeError("smoke_argument_invalid", "process family is invalid");
    }

    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(executable, args, {
        cwd,
        env: { ...env },
        shell: false,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      throw new SmokeError("smoke_process_spawn_failed", "process spawn failed", { cause: error });
    }
    if (child.pid === undefined) {
      throw new SmokeError("smoke_process_spawn_failed", "process pid is unavailable");
    }
    const started = performance.now();
    const exit = new Promise<{
      exitCode: number;
      signal: NodeJS.Signals | null;
      elapsedMs: number;
    }>((resolveExit, rejectExit) => {
      child.once("error", (error) =>
        rejectExit(new SmokeError("smoke_process_failed", "process failed", { cause: error }))
      );
      child.once("exit", (exitCode, signal) => {
        this.#active.delete(child.pid as number);
        resolveExit({
          exitCode: exitCode ?? -1,
          signal,
          elapsedMs: Math.ceil(performance.now() - started),
        });
      });
    });
    const terminate = async (): Promise<void> => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      await killOwnedGroup(child, "SIGTERM");
      const exited = await Promise.race([
        exit.then(() => true),
        new Promise<false>((resolveWait) => setTimeout(() => resolveWait(false), 250)),
      ]);
      if (!exited) await killOwnedGroup(child, "SIGKILL");
      await exit.catch(() => undefined);
    };
    const handle: InternalHandle = {
      pid: child.pid,
      child,
      family,
      stdout: child.stdout,
      stderr: child.stderr,
      async write(bytes): Promise<void> {
        await new Promise<void>((resolveWrite, rejectWrite) => {
          child.stdin.write(bytes, (error) => (error ? rejectWrite(error) : resolveWrite()));
        });
      },
      endInput(): void {
        child.stdin.end();
      },
      wait: () => exit,
      terminate,
    };
    this.#active.set(child.pid, handle);
    this.#starts.set(family, (this.#starts.get(family) ?? 0) + 1);
    return handle;
  }

  async run(spec: ProcessSpec): Promise<ProcessResult> {
    const timeoutMs = spec.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const limit = spec.maxOutputBytes ?? DEFAULT_OUTPUT_LIMIT;
    if (
      !Number.isFinite(timeoutMs) ||
      timeoutMs <= 0 ||
      !Number.isSafeInteger(limit) ||
      limit <= 0
    ) {
      throw new SmokeError("smoke_argument_invalid", "process bounds are invalid");
    }
    const handle = (await this.start(spec)) as InternalHandle;
    const stdoutPromise = capture(handle.stdout, limit);
    const stderrPromise = capture(handle.stderr, limit);
    if (spec.input !== undefined) await handle.write(spec.input);
    handle.endInput();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const outcome = await Promise.race([
        handle.wait(),
        new Promise<never>((_, rejectTimeout) => {
          timeout = setTimeout(
            () => rejectTimeout(new SmokeError("smoke_process_timeout", "process timed out")),
            timeoutMs
          );
        }),
      ]);
      const [stdoutCapture, stderrCapture] = await Promise.all([stdoutPromise, stderrPromise]);
      if (!stdoutCapture.ok) throw stdoutCapture.error;
      if (!stderrCapture.ok) throw stderrCapture.error;
      const stdout = stdoutCapture.bytes;
      const stderr = stderrCapture.bytes;
      if (outcome.exitCode !== 0 || outcome.signal !== null) {
        throw new SmokeError("smoke_process_failed", "process exited unsuccessfully");
      }
      if (!spec.allowStderr && stderr.byteLength > 0) {
        throw new SmokeError("smoke_process_failed", "process wrote unexpected stderr");
      }
      return Object.freeze({
        stdout,
        stderr,
        receipt: Object.freeze({
          family: handle.family,
          pid: handle.pid,
          exitCode: outcome.exitCode,
          signal: outcome.signal,
          elapsedMs: outcome.elapsedMs,
          stdoutBytes: stdout.byteLength,
          stderrBytes: stderr.byteLength,
          stdoutSha256: createHash("sha256").update(stdout).digest("hex"),
          stderrSha256: createHash("sha256").update(stderr).digest("hex"),
          absent: true,
        }),
      });
    } catch (error) {
      await handle.terminate();
      await Promise.allSettled([stdoutPromise, stderrPromise]);
      throw error;
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  async close(): Promise<void> {
    await Promise.all([...this.#active.values()].map((handle) => handle.terminate()));
  }

  async proveAbsent(): Promise<boolean> {
    return this.#active.size === 0;
  }
}
