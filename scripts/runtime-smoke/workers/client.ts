import { realpath } from "node:fs/promises";
import { isAbsolute, relative } from "node:path";
import { SmokeError } from "../contracts";
import type { ManagedProcessHandle, ProcessSupervisor } from "../process-supervisor";
import {
  DEFAULT_WORKER_FRAME_BYTES,
  MAX_WORKER_FRAME_BYTES,
  WORKER_PROTOCOL_VERSION,
  WorkerDispatchError,
  WorkerProtocolError,
  assertPlainJson,
  assertWorkerToken,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationDescriptor,
  type WorkerResponseFrame,
} from "./contracts";
import type { WorkerOperationRegistry } from "./operation-registry";
import { createWorkerResponseDecoder, encodeWorkerFrame } from "./protocol";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const MAX_REQUEST_TIMEOUT_MS = 540_000;
const GRACEFUL_CLOSE_TIMEOUT_MS = 2_000;

export interface WorkerClientSpec {
  readonly root: string;
  readonly executable: string;
  readonly entryFile: string;
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly profileId: string;
  readonly family?: string;
  readonly requestTimeoutMs?: number;
  readonly maximumFrameBytes?: number;
}

export interface WorkerDispatchBoundary {
  readonly requestId: number;
  readonly dispatched: boolean;
}

interface PendingResponse {
  readonly requestId: number;
  readonly resolve: (response: WorkerResponseFrame) => void;
  readonly reject: (error: unknown) => void;
}

function isWithin(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function validateTimeout(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_REQUEST_TIMEOUT_MS) {
    throw new SmokeError("smoke_argument_invalid", "worker request timeout is invalid");
  }
}

export class WorkerClient {
  readonly #handle: ManagedProcessHandle;
  readonly #profileId: string;
  readonly #registry: WorkerOperationRegistry;
  readonly #maximumFrameBytes: number;
  readonly #requestTimeoutMs: number;
  #requestId = 0;
  #pending: PendingResponse | null = null;
  #terminalError: unknown = null;
  #closed = false;
  #gracefulClose = false;
  #exitOutcome: { exitCode: number; signal: NodeJS.Signals | null } | null = null;
  #serial: Promise<void> = Promise.resolve();
  #requests = 0;

  private constructor(
    handle: ManagedProcessHandle,
    registry: WorkerOperationRegistry,
    spec: WorkerClientSpec
  ) {
    this.#handle = handle;
    this.#registry = registry;
    this.#profileId = spec.profileId;
    this.#maximumFrameBytes = spec.maximumFrameBytes ?? DEFAULT_WORKER_FRAME_BYTES;
    this.#requestTimeoutMs = spec.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    void this.#readStdout();
    void this.#watchStderr();
    void this.#watchExit();
  }

  static async start(
    supervisor: ProcessSupervisor,
    registry: WorkerOperationRegistry,
    spec: WorkerClientSpec
  ): Promise<WorkerClient> {
    const requestTimeoutMs = spec.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const maximumFrameBytes = spec.maximumFrameBytes ?? DEFAULT_WORKER_FRAME_BYTES;
    validateTimeout(requestTimeoutMs);
    assertWorkerToken(spec.profileId, "worker profile ID");
    if (
      !Number.isSafeInteger(maximumFrameBytes) ||
      maximumFrameBytes <= 0 ||
      maximumFrameBytes > MAX_WORKER_FRAME_BYTES
    ) {
      throw new SmokeError("smoke_argument_invalid", "worker frame bound is invalid");
    }
    const [root, entryFile] = await Promise.all([realpath(spec.root), realpath(spec.entryFile)]);
    if (!isWithin(root, entryFile)) {
      throw new SmokeError("smoke_argument_invalid", "worker entry escapes repository root");
    }
    const handle = await supervisor.start({
      executable: spec.executable,
      args: ["--no-env-file", entryFile, "--profile", spec.profileId],
      cwd: spec.cwd,
      env: spec.environment,
      family: spec.family ?? `smoke-worker-${spec.profileId}`,
      allowStderr: false,
    });
    return new WorkerClient(handle, registry, spec);
  }

  get pid(): number {
    return this.#handle.pid;
  }

  get profileId(): string {
    return this.#profileId;
  }

  get requests(): number {
    return this.#requests;
  }

  async dispatch(
    descriptor: WorkerOperationDescriptor,
    input: PlainJsonObject,
    executionBoundaryObserver: (() => void | Promise<void>) | null = null
  ): Promise<PlainJsonValue> {
    const previous = this.#serial;
    let release: () => void = () => undefined;
    this.#serial = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await this.#dispatchExclusive(descriptor, input, executionBoundaryObserver);
    } finally {
      release();
    }
  }

  async #dispatchExclusive(
    descriptor: WorkerOperationDescriptor,
    input: PlainJsonObject,
    executionBoundaryObserver: (() => void | Promise<void>) | null
  ): Promise<PlainJsonValue> {
    if (this.#closed || this.#terminalError !== null) {
      throw new WorkerDispatchError("worker is unavailable", false, {
        cause: this.#terminalError ?? undefined,
      });
    }
    const definition = this.#registry.validateDescriptor(descriptor);
    if (definition.profileId !== this.#profileId) {
      throw new WorkerProtocolError("worker profile does not own this operation");
    }
    const validatedInput = definition.validateInput(input);
    assertPlainJson(validatedInput, "worker dispatch input");
    const requestId = this.#requestId + 1;
    const frame = encodeWorkerFrame(
      {
        protocol: WORKER_PROTOCOL_VERSION,
        requestId,
        operationId: definition.operationId,
        inputSchemaId: definition.inputSchemaId,
        sourceSha256: definition.sourceSha256,
        input: validatedInput,
      },
      Math.min(definition.maxInputBytes ?? this.#maximumFrameBytes, this.#maximumFrameBytes)
    );
    try {
      await executionBoundaryObserver?.();
    } catch (error) {
      throw new WorkerDispatchError("worker dispatch stopped before delivery", false, {
        cause: error,
      });
    }
    let resolveResponse: (response: WorkerResponseFrame) => void = () => undefined;
    let rejectResponse: (error: unknown) => void = () => undefined;
    const responsePromise = new Promise<WorkerResponseFrame>((resolve, reject) => {
      resolveResponse = resolve;
      rejectResponse = reject;
    });
    this.#pending = { requestId, resolve: resolveResponse, reject: rejectResponse };
    this.#requestId = requestId;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      this.#requests += 1;
      await this.#handle.write(frame);
      const response = await Promise.race([
        responsePromise,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new WorkerDispatchError("worker request timed out", true)),
            this.#requestTimeoutMs
          );
        }),
      ]);
      if (response.requestId !== requestId) {
        throw new WorkerProtocolError("worker response ID does not match its request");
      }
      if (!response.ok) {
        throw new WorkerDispatchError(`worker operation failed: ${response.code}`, true);
      }
      encodeWorkerFrame(
        response,
        Math.min(definition.maxOutputBytes ?? this.#maximumFrameBytes, this.#maximumFrameBytes)
      );
      const output = definition.validateOutput(response.output);
      assertPlainJson(output, "worker dispatch output");
      return output;
    } catch (error) {
      const dispatched =
        error instanceof WorkerDispatchError ? error.dispatched : this.#requestId >= requestId;
      await this.invalidate();
      if (error instanceof WorkerDispatchError) throw error;
      throw new WorkerDispatchError("worker dispatch failed", dispatched, { cause: error });
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      if (this.#pending?.requestId === requestId) this.#pending = null;
    }
  }

  async #readStdout(): Promise<void> {
    const decoder = createWorkerResponseDecoder(this.#maximumFrameBytes);
    try {
      for await (const raw of this.#handle.stdout as AsyncIterable<Uint8Array | string>) {
        for (const response of decoder.push(raw)) {
          const pending = this.#pending;
          if (pending === null || response.requestId !== pending.requestId) {
            throw new WorkerProtocolError("worker emitted an unsolicited or reordered response");
          }
          this.#pending = null;
          pending.resolve(response);
        }
      }
      decoder.finish();
      if (!this.#closed) throw new WorkerProtocolError("worker stdout ended unexpectedly");
    } catch (error) {
      this.#fail(error);
    }
  }

  async #watchStderr(): Promise<void> {
    try {
      for await (const raw of this.#handle.stderr as AsyncIterable<Uint8Array | string>) {
        if (Buffer.byteLength(raw) > 0) {
          throw new WorkerProtocolError("worker wrote unexpected stderr");
        }
      }
    } catch (error) {
      this.#fail(error);
    }
  }

  async #watchExit(): Promise<void> {
    try {
      const exit = await this.#handle.wait();
      this.#exitOutcome = { exitCode: exit.exitCode, signal: exit.signal };
      if (!this.#closed && (exit.exitCode !== 0 || exit.signal !== null)) {
        this.#fail(new WorkerProtocolError("worker exited unexpectedly"));
      }
    } catch (error) {
      this.#fail(error);
    }
  }

  #fail(error: unknown): void {
    if (this.#terminalError === null) this.#terminalError = error;
    const pending = this.#pending;
    this.#pending = null;
    pending?.reject(error);
  }

  async invalidate(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#fail(new WorkerProtocolError("worker was invalidated"));
    await this.#handle.terminate();
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#gracefulClose = true;
    this.#handle.endInput();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const outcome = await Promise.race([
      this.#handle.wait().then((exit) => ({ exited: true as const, exit })),
      new Promise<{ readonly exited: false }>((resolveTimeout) => {
        timeout = setTimeout(() => resolveTimeout({ exited: false }), GRACEFUL_CLOSE_TIMEOUT_MS);
      }),
    ]).finally(() => {
      if (timeout !== undefined) clearTimeout(timeout);
    });
    if (!outcome.exited) {
      await this.#handle.terminate();
      throw new SmokeError(
        "smoke_cleanup_failed",
        "worker did not close its registry within the graceful deadline"
      );
    }
    this.#exitOutcome = {
      exitCode: outcome.exit.exitCode,
      signal: outcome.exit.signal,
    };
    if (outcome.exit.exitCode !== 0 || outcome.exit.signal !== null) {
      throw new SmokeError("smoke_cleanup_failed", "worker registry close failed");
    }
  }

  async proveAbsent(): Promise<boolean> {
    if (!this.#closed) return false;
    const exit = this.#exitOutcome ?? (await this.#handle.wait().catch(() => null));
    if (exit === null) return false;
    return !this.#gracefulClose || (exit.exitCode === 0 && exit.signal === null);
  }
}
