import { SmokeError, assertExactKeys, isPlainObject } from "../../contracts";
import {
  MAX_WORKER_FRAME_BYTES,
  assertPlainJson,
  assertPlainJsonObject,
  type PlainJsonValue,
} from "../../workers/contracts";
import {
  TASK540_SOURCE_INPUT_SLOT_KEY,
  compileTask540BridgeSource,
  type CompiledTask540Source,
} from "./source-compiler";
import {
  TASK540_SOURCE_CATALOG,
  type Task540SourceCatalog,
  type Task540SourceEntry,
  type Task540SourceRequest,
} from "./source-catalog";

const INPUT_SLOT = Symbol.for(TASK540_SOURCE_INPUT_SLOT_KEY);
const DATABASE_END_TIMEOUT_SECONDS = 5;
const MAX_EXECUTIONS = 2_048;

export interface Task540SourceExecutorCounters {
  readonly executions: number;
  readonly blobModuleExecutions: number;
  readonly compiledSources: number;
  readonly databaseModuleLoads: number;
  readonly databaseModuleReuseHits: number;
  readonly databaseCloseCalls: number;
  readonly maximumConcurrentExecutions: number;
}

export type Task540DatabaseEndHook = () => Promise<void>;

interface DatabaseClientLike {
  end(options?: { readonly timeout?: number }): Promise<void>;
}

function canonicalize(value: PlainJsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((nested) => canonicalize(nested)).join(",")}]`;
  const object = value as Readonly<Record<string, PlainJsonValue>>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key] as PlainJsonValue)}`)
    .join(",")}}`;
}

function validateRequest(value: unknown): Task540SourceRequest {
  if (!isPlainObject(value)) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source request is invalid");
  }
  assertExactKeys(
    value,
    ["operationId", "profileId", "sourceSha256", "input"],
    "TASK-540 source request"
  );
  if (
    typeof value.operationId !== "string" ||
    typeof value.profileId !== "string" ||
    typeof value.sourceSha256 !== "string"
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source request authority is invalid");
  }
  assertPlainJsonObject(value.input, "TASK-540 source input");
  return value as unknown as Task540SourceRequest;
}

function decodeCanonicalOutput(value: unknown): PlainJsonValue {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value) > MAX_WORKER_FRAME_BYTES ||
    value.includes("\0") ||
    value.includes("\r") ||
    value.includes("\n")
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source output is invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source output is not JSON");
  }
  assertPlainJson(parsed, "TASK-540 source output");
  if (canonicalize(parsed) !== value) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source output is not canonical");
  }
  return parsed;
}

export function resolveTask540DatabaseEndHook(moduleNamespace: unknown): Task540DatabaseEndHook {
  if (
    !isPlainObject(moduleNamespace) &&
    (moduleNamespace === null || typeof moduleNamespace !== "object")
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 database module is invalid");
  }
  const db = Reflect.get(moduleNamespace as object, "db") as unknown;
  if (db === null || typeof db !== "object") {
    throw new SmokeError("smoke_output_invalid", "TASK-540 database export is absent");
  }
  const client = Reflect.get(db, "$client") as DatabaseClientLike | undefined;
  if (client === undefined || typeof client.end !== "function") {
    throw new SmokeError("smoke_output_invalid", "TASK-540 database close hook is absent");
  }
  let ended = false;
  return async () => {
    if (ended) return;
    ended = true;
    await client.end({ timeout: DATABASE_END_TIMEOUT_SECONDS });
  };
}

async function importBlobModule(moduleSource: string): Promise<unknown> {
  const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
  try {
    return await import(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

export class Task540SourceExecutor {
  readonly #coreRoot: string;
  readonly #catalog: Task540SourceCatalog;
  readonly #compiled = new Map<string, Promise<CompiledTask540Source>>();
  #tail: Promise<void> = Promise.resolve();
  #closed = false;
  #executions = 0;
  #blobModuleExecutions = 0;
  #activeExecutions = 0;
  #maximumConcurrentExecutions = 0;
  #databaseModuleIdentity: object | null = null;
  #databaseEndHook: Task540DatabaseEndHook | null = null;
  #databaseModuleLoads = 0;
  #databaseModuleReuseHits = 0;
  #databaseCloseCalls = 0;

  constructor(coreRoot: string, catalog: Task540SourceCatalog = TASK540_SOURCE_CATALOG) {
    this.#coreRoot = coreRoot;
    this.#catalog = catalog;
  }

  counters(): Task540SourceExecutorCounters {
    return Object.freeze({
      executions: this.#executions,
      blobModuleExecutions: this.#blobModuleExecutions,
      compiledSources: this.#compiled.size,
      databaseModuleLoads: this.#databaseModuleLoads,
      databaseModuleReuseHits: this.#databaseModuleReuseHits,
      databaseCloseCalls: this.#databaseCloseCalls,
      maximumConcurrentExecutions: this.#maximumConcurrentExecutions,
    });
  }

  databaseEndHook(): Task540DatabaseEndHook | null {
    return this.#databaseEndHook;
  }

  async execute(requestValue: Task540SourceRequest): Promise<PlainJsonValue> {
    const previous = this.#tail;
    let release: () => void = () => undefined;
    this.#tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await this.#executeExclusive(validateRequest(requestValue));
    } finally {
      release();
    }
  }

  async #executeExclusive(request: Task540SourceRequest): Promise<PlainJsonValue> {
    if (this.#closed || this.#executions >= MAX_EXECUTIONS) {
      throw new SmokeError("smoke_process_failed", "TASK-540 source executor is unavailable");
    }
    const entry = this.#catalog.require(
      request.operationId,
      request.profileId,
      request.sourceSha256
    );
    const rawInput = `${canonicalize(request.input)}\n`;
    if (Buffer.byteLength(rawInput) > MAX_WORKER_FRAME_BYTES) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 source input exceeds its bound");
    }
    const compiled = await this.#compiledSource(entry);
    this.#activeExecutions += 1;
    this.#maximumConcurrentExecutions = Math.max(
      this.#maximumConcurrentExecutions,
      this.#activeExecutions
    );
    try {
      if (entry.profileId !== "schema-only") await this.#observeDatabaseModule(compiled);
      if (Reflect.has(globalThis, INPUT_SLOT)) {
        throw new SmokeError("smoke_process_failed", "TASK-540 source input slot is occupied");
      }
      Reflect.set(globalThis, INPUT_SLOT, rawInput);
      let moduleNamespace: unknown;
      try {
        moduleNamespace = await importBlobModule(compiled.moduleSource);
      } catch {
        throw new SmokeError("smoke_process_failed", "TASK-540 source execution failed");
      } finally {
        Reflect.deleteProperty(globalThis, INPUT_SLOT);
      }
      if (Reflect.has(globalThis, INPUT_SLOT)) {
        throw new SmokeError("smoke_process_failed", "TASK-540 source input slot was not cleared");
      }
      if (
        moduleNamespace === null ||
        typeof moduleNamespace !== "object" ||
        Object.keys(moduleNamespace).join(",") !== "default"
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 source module output drifted");
      }
      this.#executions += 1;
      this.#blobModuleExecutions += 1;
      return decodeCanonicalOutput(Reflect.get(moduleNamespace, "default"));
    } finally {
      this.#activeExecutions -= 1;
      Reflect.deleteProperty(globalThis, INPUT_SLOT);
    }
  }

  #compiledSource(entry: Task540SourceEntry): Promise<CompiledTask540Source> {
    const existing = this.#compiled.get(entry.sourceSha256);
    if (existing !== undefined) return existing;
    const compilation = compileTask540BridgeSource(entry, this.#coreRoot).catch((error) => {
      this.#compiled.delete(entry.sourceSha256);
      throw error;
    });
    this.#compiled.set(entry.sourceSha256, compilation);
    return compilation;
  }

  async #observeDatabaseModule(compiled: CompiledTask540Source): Promise<void> {
    let moduleNamespace: unknown;
    try {
      moduleNamespace = await import(compiled.databaseClientUrl);
    } catch {
      throw new SmokeError("smoke_process_failed", "TASK-540 database module failed to load");
    }
    if (moduleNamespace === null || typeof moduleNamespace !== "object") {
      throw new SmokeError("smoke_output_invalid", "TASK-540 database module identity is invalid");
    }
    if (this.#databaseModuleIdentity === null) {
      this.#databaseModuleIdentity = moduleNamespace;
      this.#databaseEndHook = resolveTask540DatabaseEndHook(moduleNamespace);
      this.#databaseModuleLoads = 1;
      return;
    }
    if (this.#databaseModuleIdentity !== moduleNamespace) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 database module was re-instantiated");
    }
    this.#databaseModuleReuseHits += 1;
  }

  async closeDatabaseClient(): Promise<void> {
    await this.#tail;
    if (this.#databaseEndHook === null || this.#databaseCloseCalls > 0) return;
    await this.#databaseEndHook();
    this.#databaseCloseCalls = 1;
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#tail;
    await this.closeDatabaseClient();
  }
}
