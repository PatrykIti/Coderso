import { createHash } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeSync,
  type Stats,
} from "node:fs";
import {
  parseTask551FreezeCandidateGenerationBootstrapV2,
  TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2,
  type Task551FreezeCandidateGenerationBootstrapV2,
} from "./freezeCandidateGenerationBootstrap";
import type { Task551LowercaseSha256 } from "./digestContract";
import { extractTask551DatabaseFreezeReceiptObjectSpan } from "./reviewedPairReceiptSource";
import {
  computeTask551ActiveGenerationStateDigestV2,
  initialTask551FreezeCandidateGenerationStateV2,
  parseTask551FreezeCandidateGenerationStateV2,
  TASK551_FREEZE_CANDIDATE_GENERATION_ID_V2,
  TASK551_FREEZE_CANDIDATE_GENERATION_STATE_SCHEMA_V2,
  type Task551ActiveGenerationStateDigestV2,
  type Task551FreezeCandidateGenerationStateV2,
} from "../../tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState";

// The single private storage authority of the active v2 freeze-candidate
// generation. Every active-state read, verify, lock, atomic write, and re-read
// goes through this module; no caller may supply, normalize, or join a path.

export const TASK551_ACTIVE_GENERATION_PARENT =
  ".tmp/task-551/freeze-candidate-generation-v2" as const;
export const TASK551_ACTIVE_GENERATION_STATE_PATH =
  ".tmp/task-551/freeze-candidate-generation-v2/state.json" as const;
export const TASK551_ACTIVE_GENERATION_LOCK_PATH =
  ".tmp/task-551/freeze-candidate-generation-v2/state.lock" as const;
export const TASK551_ACTIVE_GENERATION_TEMP_PATH =
  ".tmp/task-551/freeze-candidate-generation-v2/state.json.tmp" as const;
export const TASK551_ACTIVE_GENERATION_ARCHIVE_PATH =
  "tests/perf/task551DatabaseBaseline/freezeReceipts.ts" as const;

const MIGRATION_ERROR_MESSAGE = "l02_active_generation_migration_required";
const KNOWN_STATE_CHILD_NAMES = new Set<string>(["state.json", "state.lock", "state.json.tmp"]);

type Task551ActiveGenerationStoreErrorCode =
  "database_baseline_invalid" | "l02_active_generation_migration_required";

class Task551ActiveGenerationStoreError extends Error {
  readonly code: Task551ActiveGenerationStoreErrorCode;

  constructor(code: Task551ActiveGenerationStoreErrorCode) {
    super(code);
    this.name = "Task551ActiveGenerationStoreError";
    this.code = code;
  }
}

function invalid(): never {
  throw new Task551ActiveGenerationStoreError("database_baseline_invalid");
}

function migrationRequired(): never {
  throw new Task551ActiveGenerationStoreError(MIGRATION_ERROR_MESSAGE);
}

export function isTask551ActiveGenerationStoreError(
  error: unknown
): error is Task551ActiveGenerationStoreError {
  return error instanceof Task551ActiveGenerationStoreError;
}

export type Task551ActiveGenerationFileStatus = Readonly<{
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
}>;

export type Task551ActiveGenerationWriteHandle = Readonly<{
  write: (bytes: Uint8Array) => void;
  flush: () => void;
  close: () => void;
}>;

export type Task551ActiveGenerationFilesystemOps = Readonly<{
  lstatSync: (path: string) => Task551ActiveGenerationFileStatus;
  readFileSync: (path: string) => Uint8Array;
  readTextSync: (path: string) => string;
  readChildNamesSync: (path: string) => readonly string[];
  openExclusiveWriteSync: (path: string) => Task551ActiveGenerationWriteHandle;
  renameSync: (from: string, to: string) => void;
  unlinkSync: (path: string) => void;
}>;

function defaultStatus(stats: Stats): Task551ActiveGenerationFileStatus {
  return {
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    isSymbolicLink: stats.isSymbolicLink(),
  };
}

function defaultFilesystemOps(): Task551ActiveGenerationFilesystemOps {
  return {
    lstatSync: (path) => defaultStatus(lstatSync(path)),
    readFileSync: (path) => readFileSync(path),
    readTextSync: (path) => readFileSync(path, "utf8"),
    readChildNamesSync: (path) => readdirSync(path),
    openExclusiveWriteSync: (path) => {
      const descriptor = openSync(path, "wx");
      return {
        write: (bytes) => writeSync(descriptor, bytes),
        flush: () => fsyncSync(descriptor),
        close: () => closeSync(descriptor),
      };
    },
    renameSync: (from, to) => renameSync(from, to),
    unlinkSync: (path) => unlinkSync(path),
  };
}

type Task551MemoryNode =
  | Readonly<{ kind: "directory"; children: Map<string, Task551MemoryNode> }>
  | Readonly<{ kind: "file"; bytes: Uint8Array }>;

interface Task551MemoryFilesystem {
  root: Map<string, Task551MemoryNode>;
}

function missingError(): Error {
  return Object.assign(new Error("ENOENT"), { code: "ENOENT" });
}

let memoryFilesystem: Task551MemoryFilesystem | undefined;
let focusedFilesystem: Task551ActiveGenerationFilesystemOps | undefined;

function memoryLookup(path: string): Task551MemoryNode | undefined {
  const filesystem = memoryFilesystem;
  if (filesystem === undefined) return undefined;
  const parts = path.split("/").filter((part) => part.length > 0 && part !== ".");
  let level = filesystem.root;
  let node: Task551MemoryNode | undefined;
  for (const part of parts) {
    const found = level.get(part);
    if (found === undefined) return undefined;
    node = found;
    if (found.kind === "directory") level = found.children;
    else return found;
  }
  return node;
}

function memoryParentLevel(path: string): Map<string, Task551MemoryNode> {
  const filesystem = memoryFilesystem;
  if (filesystem === undefined) throw new Error("memory filesystem missing");
  const parts = path.split("/").filter((part) => part.length > 0 && part !== ".");
  let level = filesystem.root;
  for (const part of parts.slice(0, -1)) {
    const found = level.get(part);
    if (found === undefined || found.kind !== "directory") invalid();
    level = found.children;
  }
  return level;
}

function memoryFinalName(path: string): string {
  const parts = path.split("/").filter((part) => part.length > 0 && part !== ".");
  const name = parts[parts.length - 1];
  if (name === undefined) invalid();
  return name;
}

function memoryFilesystemOps(): Task551ActiveGenerationFilesystemOps {
  return {
    lstatSync: (path) => {
      const found = memoryLookup(path);
      if (found === undefined) throw missingError();
      return found.kind === "directory"
        ? { isDirectory: true, isFile: false, isSymbolicLink: false }
        : { isDirectory: false, isFile: true, isSymbolicLink: false };
    },
    readFileSync: (path) => {
      const found = memoryLookup(path);
      if (found === undefined || found.kind !== "file") throw missingError();
      return found.bytes;
    },
    readTextSync: (path) => new TextDecoder().decode(memoryFilesystemOps().readFileSync(path)),
    readChildNamesSync: (path) => {
      const found = memoryLookup(path);
      if (found === undefined || found.kind !== "directory") throw missingError();
      return [...found.children.keys()];
    },
    openExclusiveWriteSync: (path) => {
      const filesystem = memoryFilesystem;
      if (filesystem === undefined) throw new Error("memory filesystem missing");
      const level = memoryParentLevel(path);
      const name = memoryFinalName(path);
      if (level.has(name)) throw new Error("EEXIST");
      const chunks: Uint8Array[] = [];
      const node: Task551MemoryNode = { kind: "file", bytes: new Uint8Array() };
      level.set(name, node);
      return {
        write: (bytes) => {
          chunks.push(bytes);
        },
        flush: () => undefined,
        close: () => {
          let length = 0;
          for (const chunk of chunks) length += chunk.length;
          const bytes = new Uint8Array(length);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          level.set(name, { kind: "file", bytes });
        },
      };
    },
    renameSync: (from, to) => {
      const fromLevel = memoryParentLevel(from);
      const fromName = memoryFinalName(from);
      const found = fromLevel.get(fromName);
      if (found === undefined) throw missingError();
      fromLevel.delete(fromName);
      memoryParentLevel(to).set(memoryFinalName(to), found);
    },
    unlinkSync: (path) => {
      const level = memoryParentLevel(path);
      const name = memoryFinalName(path);
      if (!level.delete(name)) throw missingError();
    },
  };
}

// Focused tests may replace only the active-state authority with an in-memory
// cell. A conforming state is stored as exactly its canonical durable bytes;
// any other value is stored as its own raw durable bytes so that the store's
// strict read path — never this seam — owns the rejection.
export type Task551ActiveGenerationFocusedStateInputV2 =
  Task551FreezeCandidateGenerationStateV2 | "absent" | Readonly<Record<string, unknown>>;

function focusedDurableStateBytes(
  initial: Exclude<Task551ActiveGenerationFocusedStateInputV2, "absent">
): Uint8Array {
  if (initial === undefined || initial === null) invalid();
  const canonical = JSON.stringify(initial);
  if (typeof canonical !== "string") invalid();
  return new TextEncoder().encode(`${canonical}\n`);
}

export function installTask551ActiveGenerationMemoryStateForFocusedTest(
  initial: Task551ActiveGenerationFocusedStateInputV2
): void {
  if (memoryFilesystem !== undefined) invalid();
  const root = new Map<string, Task551MemoryNode>();
  const tmp = new Map<string, Task551MemoryNode>();
  const task551 = new Map<string, Task551MemoryNode>([
    ["task-551", { kind: "directory", children: tmp }],
  ]);
  root.set(".tmp", { kind: "directory", children: task551 });
  if (initial !== "absent") {
    tmp.set("freeze-candidate-generation-v2", {
      kind: "directory",
      children: new Map<string, Task551MemoryNode>([
        ["state.json", { kind: "file", bytes: focusedDurableStateBytes(initial) }],
      ]),
    });
  } else {
    tmp.set("freeze-candidate-generation-v2", { kind: "directory", children: new Map() });
  }
  memoryFilesystem = { root };
}

export function installTask551ActiveGenerationFilesystemForFocusedTest(
  ops: Task551ActiveGenerationFilesystemOps
): void {
  if (focusedFilesystem !== undefined || memoryFilesystem !== undefined) invalid();
  focusedFilesystem = ops;
}

export function resetTask551ActiveGenerationFilesystemForFocusedTest(): void {
  focusedFilesystem = undefined;
  memoryFilesystem = undefined;
}

function filesystemOps(): Task551ActiveGenerationFilesystemOps {
  if (focusedFilesystem !== undefined) return focusedFilesystem;
  if (memoryFilesystem !== undefined) return memoryFilesystemOps();
  return defaultFilesystemOps();
}

function isMissing(error: unknown): boolean {
  return (
    error instanceof Error && "code" in error && (error as { code?: unknown }).code === "ENOENT"
  );
}

export function sha256Task551ActiveGenerationBytesForStore(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// The accepted L04 bootstrap identity is validated before any active read.
export function assertTask551ActiveGenerationBootstrapIdentityForStore(): void {
  parseTask551FreezeCandidateGenerationBootstrapV2(
    TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2
  );
}

// The literal archive is verified as a regular non-symlink file with its exact
// raw SHA-256 and exactly one canonical receipt declaration. The verification
// always reads the real checked-in repository bytes: no focused seam, memory
// cell, or injected filesystem can substitute for them. It is never written:
// this module exposes no archive writer at all.
export function verifyTask551ActiveGenerationArchiveForStore(): void {
  assertTask551ActiveGenerationBootstrapIdentityForStore();
  const ops = defaultFilesystemOps();
  let status: Task551ActiveGenerationFileStatus;
  let source: string;
  try {
    status = ops.lstatSync(TASK551_ACTIVE_GENERATION_ARCHIVE_PATH);
    source = ops.readTextSync(TASK551_ACTIVE_GENERATION_ARCHIVE_PATH);
  } catch {
    invalid();
  }
  if (!status.isFile || status.isSymbolicLink) invalid();
  let bytes: Uint8Array;
  try {
    bytes = ops.readFileSync(TASK551_ACTIVE_GENERATION_ARCHIVE_PATH);
  } catch {
    invalid();
  }
  if (
    sha256Task551ActiveGenerationBytesForStore(bytes) !==
    TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2.archive.sha256
  ) {
    invalid();
  }
  extractTask551DatabaseFreezeReceiptObjectSpan(source);
}

// Every existing ancestor and the parent itself must be a non-symlink
// directory; the parent must contain only the three known state children.
function assertParentForStore(ops: Task551ActiveGenerationFilesystemOps): void {
  const parts = TASK551_ACTIVE_GENERATION_PARENT.split("/");
  let prefix = "";
  for (const part of parts) {
    prefix = prefix.length === 0 ? part : `${prefix}/${part}`;
    let status: Task551ActiveGenerationFileStatus;
    try {
      status = ops.lstatSync(prefix);
    } catch (error) {
      if (prefix === TASK551_ACTIVE_GENERATION_PARENT || !isMissing(error)) invalid();
      throw error;
    }
    if (status.isSymbolicLink || !status.isDirectory) invalid();
  }
  let children: readonly string[];
  try {
    children = ops.readChildNamesSync(TASK551_ACTIVE_GENERATION_PARENT);
  } catch {
    invalid();
  }
  if (children.some((name) => !KNOWN_STATE_CHILD_NAMES.has(name))) invalid();
}

function assertRegularFileForStore(ops: Task551ActiveGenerationFilesystemOps, path: string): void {
  let status: Task551ActiveGenerationFileStatus;
  try {
    status = ops.lstatSync(path);
  } catch {
    invalid();
  }
  if (status.isSymbolicLink || !status.isFile) invalid();
}

export type Task551ActiveGenerationStoreReadResult = Readonly<{
  state: Task551FreezeCandidateGenerationStateV2;
  stateDigest: Task551ActiveGenerationStateDigestV2;
  absent: boolean;
}>;

function parseStateBytesForStore(
  bytes: Uint8Array,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551FreezeCandidateGenerationStateV2 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    migrationRequired();
  }
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    if (
      record.schema !== TASK551_FREEZE_CANDIDATE_GENERATION_STATE_SCHEMA_V2 ||
      record.generationId !== TASK551_FREEZE_CANDIDATE_GENERATION_ID_V2
    ) {
      // A durable non-v2 state is a legacy generation: it is never repaired
      // in-band and never recovered by a different generation.
      migrationRequired();
    }
  } else {
    migrationRequired();
  }
  return parseTask551FreezeCandidateGenerationStateV2(parsed, sha256Bytes);
}

export function serializeTask551ActiveGenerationStateV2(
  state: Task551FreezeCandidateGenerationStateV2
): Uint8Array {
  const canonical = JSON.stringify({
    schema: state.schema,
    version: state.version,
    generationId: state.generationId,
    archive: { path: state.archive.path, sha256: state.archive.sha256 },
    state: state.state,
    receipts: state.receipts.map((slot) => ({ profile: slot.profile, receipt: slot.receipt })),
  });
  return new TextEncoder().encode(`${canonical}\n`);
}

function defaultSha256(bytes: Uint8Array): string {
  return sha256Task551ActiveGenerationBytesForStore(bytes);
}

// Reads the durable active state. Before the first small freeze only, an
// absent state file semantically means awaiting-small; every later absence,
// stale temp/lock, foreign child, symlink, nonregular file, or parent drift
// fails closed.
export function readTask551ActiveGenerationStateForStore(
  options: Readonly<{ allowAbsent: boolean }> = { allowAbsent: false }
): Task551ActiveGenerationStoreReadResult {
  assertTask551ActiveGenerationBootstrapIdentityForStore();
  verifyTask551ActiveGenerationArchiveForStore();
  const ops = filesystemOps();
  assertParentForStore(ops);
  let stateBytes: Uint8Array | undefined;
  let stateAbsent = false;
  try {
    ops.lstatSync(TASK551_ACTIVE_GENERATION_STATE_PATH);
  } catch (error) {
    if (!isMissing(error)) invalid();
    stateAbsent = true;
  }
  if (!stateAbsent) {
    assertRegularFileForStore(ops, TASK551_ACTIVE_GENERATION_STATE_PATH);
    try {
      stateBytes = ops.readFileSync(TASK551_ACTIVE_GENERATION_STATE_PATH);
    } catch (error) {
      if (!isMissing(error)) invalid();
      stateAbsent = true;
    }
  }
  for (const path of [TASK551_ACTIVE_GENERATION_LOCK_PATH, TASK551_ACTIVE_GENERATION_TEMP_PATH]) {
    try {
      ops.lstatSync(path);
    } catch (error) {
      if (!isMissing(error)) invalid();
      continue;
    }
    // The lock this store itself holds for an in-flight mutation is owned, not
    // stale: internal reads under `withTask551ActiveGenerationStoreLock` must
    // still succeed. A leftover lock, or any temp file at all, fails closed.
    if (path === TASK551_ACTIVE_GENERATION_LOCK_PATH && activeStoreLockDepth > 0) continue;
    invalid();
  }
  if (stateAbsent || stateBytes === undefined) {
    if (!options.allowAbsent) invalid();
    return Object.freeze({
      state: initialTask551FreezeCandidateGenerationStateV2,
      stateDigest: "absent" as const,
      absent: true,
    });
  }
  const state = parseStateBytesForStore(stateBytes, defaultSha256);
  return Object.freeze({
    state,
    stateDigest: computeTask551ActiveGenerationStateDigestV2(state, defaultSha256),
    absent: false,
  });
}

export function computeTask551ActiveGenerationDigestForStore(
  state: Task551FreezeCandidateGenerationStateV2
): Task551ActiveGenerationStateDigestV2 {
  return computeTask551ActiveGenerationStateDigestV2(state, defaultSha256);
}

const TASK551_ACTIVE_GENERATION_BOOTSTRAP_SOURCE_PATH =
  "scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts" as const;

// The closed L02 source set whose bytes bind every state transition receipt.
// It is path-sorted and contains no archive, state, lock, temp, or doc path.
const TASK551_ACTIVE_GENERATION_L02_CLOSURE_PATHS = [
  "scripts/task-551-database-baseline.ts",
  "scripts/task551DatabaseBaseline/catalog.ts",
  "scripts/task551DatabaseBaseline/digestContract.ts",
  "scripts/task551DatabaseBaseline/fixtureTarget.ts",
  "scripts/task551DatabaseBaseline/fixtureValidation.ts",
  "scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts",
  "scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts",
  "scripts/task551DatabaseBaseline/metrics.ts",
  "scripts/task551DatabaseBaseline/postgresTransport.ts",
  "scripts/task551DatabaseBaseline/receiptContract.ts",
  "scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts",
  "scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts",
  "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts",
  "scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts",
  "scripts/task551DatabaseBaseline/reviewedPairTransition.ts",
  "scripts/task551DatabaseBaseline/runner.ts",
  "scripts/task551DatabaseBaseline/runtimeProvenance.ts",
] as const;

export type Task551ActiveGenerationClosureBindingsV2 = Readonly<{
  archiveSha256: Task551FreezeCandidateGenerationBootstrapV2["archive"]["sha256"];
  bootstrapSourceSha256: Task551LowercaseSha256;
  l02ClosureSha256: Task551LowercaseSha256;
}>;

// Repository-only binding material: raw source bytes and their digests. No
// environment, database, archive write, or mutable state participates.
export function computeTask551ActiveGenerationClosureBindingsForStore(): Task551ActiveGenerationClosureBindingsV2 {
  const bootstrapBytes = readFileSync(TASK551_ACTIVE_GENERATION_BOOTSTRAP_SOURCE_PATH);
  const encoder = new TextEncoder();
  let closure = "";
  for (const path of TASK551_ACTIVE_GENERATION_L02_CLOSURE_PATHS) {
    const pathDigest = sha256Task551ActiveGenerationBytesForStore(readFileSync(path));
    closure += `${path}\n${pathDigest}\n`;
  }
  return Object.freeze({
    archiveSha256: TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2.archive.sha256,
    bootstrapSourceSha256: sha256Task551ActiveGenerationBytesForStore(
      bootstrapBytes
    ) as Task551LowercaseSha256,
    l02ClosureSha256: sha256Task551ActiveGenerationBytesForStore(
      encoder.encode(closure)
    ) as Task551LowercaseSha256,
  });
}

// One exclusive regular non-symlink lock file guards every mutation. The lock
// is released and the exact temp path removed on every outcome. While this
// process holds the lock, its own internal reads are not "stale lock" states:
// only a lock left behind by nobody in flight fails closed.
let activeStoreLockDepth = 0;

export function withTask551ActiveGenerationStoreLock<T>(callback: () => T): T {
  const ops = filesystemOps();
  assertParentForStore(ops);
  try {
    ops.openExclusiveWriteSync(TASK551_ACTIVE_GENERATION_LOCK_PATH).close();
  } catch {
    invalid();
  }
  try {
    assertRegularFileForStore(ops, TASK551_ACTIVE_GENERATION_LOCK_PATH);
    activeStoreLockDepth += 1;
    try {
      return callback();
    } finally {
      activeStoreLockDepth -= 1;
    }
  } finally {
    try {
      ops.unlinkSync(TASK551_ACTIVE_GENERATION_LOCK_PATH);
    } catch {
      invalid();
    }
  }
}

// One private atomic write: exclusive temp, fsync, rename over the state file,
// then an atomic re-read. The temp path is removed in `finally` on every
// outcome and the re-read must reproduce exactly the written state digest.
export function writeTask551ActiveGenerationStateForStore(
  next: Task551FreezeCandidateGenerationStateV2
): Task551ActiveGenerationStoreReadResult {
  assertTask551ActiveGenerationBootstrapIdentityForStore();
  const ops = filesystemOps();
  assertParentForStore(ops);
  const nextBytes = serializeTask551ActiveGenerationStateV2(next);
  parseTask551FreezeCandidateGenerationStateV2(
    JSON.parse(new TextDecoder().decode(nextBytes)),
    defaultSha256
  );
  let previousBytes: Uint8Array | undefined;
  try {
    previousBytes = ops.readFileSync(TASK551_ACTIVE_GENERATION_STATE_PATH);
  } catch (error) {
    if (!isMissing(error)) invalid();
    previousBytes = undefined;
  }
  let handle: Task551ActiveGenerationWriteHandle | undefined;
  try {
    try {
      handle = ops.openExclusiveWriteSync(TASK551_ACTIVE_GENERATION_TEMP_PATH);
      handle.write(nextBytes);
      handle.flush();
      handle.close();
      handle = undefined;
    } catch {
      invalid();
    }
    let currentBytes: Uint8Array | undefined;
    try {
      currentBytes = ops.readFileSync(TASK551_ACTIVE_GENERATION_STATE_PATH);
    } catch (error) {
      if (!isMissing(error)) invalid();
      currentBytes = undefined;
    }
    if (
      (previousBytes === undefined) !== (currentBytes === undefined) ||
      (previousBytes !== undefined &&
        currentBytes !== undefined &&
        Buffer.compare(Buffer.from(previousBytes), Buffer.from(currentBytes)) !== 0)
    ) {
      invalid();
    }
    try {
      ops.renameSync(TASK551_ACTIVE_GENERATION_TEMP_PATH, TASK551_ACTIVE_GENERATION_STATE_PATH);
    } catch {
      invalid();
    }
  } finally {
    try {
      ops.unlinkSync(TASK551_ACTIVE_GENERATION_TEMP_PATH);
    } catch (error) {
      if (!isMissing(error)) invalid();
    }
  }
  const reread = readTask551ActiveGenerationStateForStore({ allowAbsent: false });
  if (
    new TextDecoder().decode(serializeTask551ActiveGenerationStateV2(reread.state)) !==
    new TextDecoder().decode(nextBytes)
  ) {
    invalid();
  }
  return reread;
}

export type Task551BaselineActiveEntryMode = "freeze" | "check";
export type Task551BaselineActiveEntryProfile = "small" | "large";

// The only legal active edges for a runner entry. `--freeze --profile small`
// accepts awaiting-small only, `--freeze --profile large` awaiting-large only,
// and `--check` the exact reviewed pair. Everything else fails before any
// fixture source, database, archive-write, or scenario dispatch.
export function requireTask551ActiveGenerationStateForBaselineEntry(
  input: Readonly<{
    mode: Task551BaselineActiveEntryMode;
    profile: Task551BaselineActiveEntryProfile;
  }>
): Task551ActiveGenerationStoreReadResult {
  if (input.mode !== "freeze" && input.mode !== "check") invalid();
  if (input.profile !== "small" && input.profile !== "large") invalid();
  const read = readTask551ActiveGenerationStateForStore({
    allowAbsent: input.mode === "freeze" && input.profile === "small",
  });
  const expected = (() => {
    if (input.mode === "check") return "reviewed" as const;
    return input.profile === "small" ? ("awaiting-small" as const) : ("awaiting-large" as const);
  })();
  if (read.state.state !== expected) invalid();
  return read;
}

// The permanent legacy-write guard: an archive write handle or a legacy pair
// storage is never an active input. Presentation of either fails with the
// fixed migration code before any state or fixture activity.
export function refuseTask551LegacyActiveInputForStore(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const legacyKeys = ["withLock", "readSnapshot", "writeExactPair", "writeCandidateReceipt"];
  if (legacyKeys.some((key) => typeof record[key] === "function")) migrationRequired();
}
