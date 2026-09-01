import { createHash } from "node:crypto";
import { lstat, readFile, readlink, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { SmokeError } from "./contracts";
import type { ProcessSupervisor } from "./process-supervisor";

const textDecoder = new TextDecoder("utf-8", { fatal: true });

export interface RepositoryFileIdentity {
  readonly path: string;
  readonly kind: "absent" | "directory" | "file" | "symlink";
  readonly sha256: string;
}

export interface RepositorySnapshot {
  readonly files: readonly RepositoryFileIdentity[];
  readonly sha256: string;
}

type StatusRunner = () => Promise<Uint8Array>;

function normalizePath(value: string): string {
  if (!value || value.includes("\0") || isAbsolute(value)) {
    throw new SmokeError("smoke_repository_invalid", "repository path is invalid");
  }
  const normalized = value.replaceAll("\\", "/");
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new SmokeError("smoke_repository_invalid", "repository path escapes root");
  }
  const segments = normalized.split("/");
  if (segments.includes(".git") || segments.includes("node_modules")) {
    throw new SmokeError("smoke_repository_invalid", "repository path enters a forbidden root");
  }
  return normalized;
}

function fieldPath(record: string, fieldsBeforePath: number): string {
  let index = 0;
  for (let field = 0; field < fieldsBeforePath; field += 1) {
    index = record.indexOf(" ", index);
    if (index < 0)
      throw new SmokeError("smoke_repository_invalid", "porcelain record is malformed");
    index += 1;
  }
  return normalizePath(record.slice(index));
}

export function parsePorcelainV2(bytes: Uint8Array): readonly string[] {
  let text: string;
  try {
    text = textDecoder.decode(bytes);
  } catch (error) {
    throw new SmokeError("smoke_repository_invalid", "porcelain output is not UTF-8", {
      cause: error,
    });
  }
  if (text === "") return Object.freeze([]);
  if (!text.endsWith("\0"))
    throw new SmokeError("smoke_repository_invalid", "porcelain output is truncated");
  const records = text.slice(0, -1).split("\0");
  const paths = new Set<string>();
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index] as string;
    if (record.startsWith("1 ")) paths.add(fieldPath(record, 8));
    else if (record.startsWith("2 ")) {
      paths.add(fieldPath(record, 9));
      const original = records[++index];
      if (original === undefined) {
        throw new SmokeError("smoke_repository_invalid", "rename source is missing");
      }
      paths.add(normalizePath(original));
    } else if (record.startsWith("u ")) paths.add(fieldPath(record, 10));
    else if (record.startsWith("? ") || record.startsWith("! "))
      paths.add(normalizePath(record.slice(2)));
    else if (record.startsWith("# ")) continue;
    else throw new SmokeError("smoke_repository_invalid", "unknown porcelain record");
  }
  return Object.freeze([...paths].sort());
}

function isWithin(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

async function identity(root: string, repositoryPath: string): Promise<RepositoryFileIdentity> {
  const path = resolve(root, repositoryPath);
  if (!isWithin(root, path)) throw new SmokeError("smoke_repository_invalid", "path escapes root");
  const before = await lstat(path, { bigint: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (before === null)
    return Object.freeze({ path: repositoryPath, kind: "absent", sha256: "absent" });
  if (before.isSymbolicLink()) {
    const target = await readlink(path);
    return Object.freeze({
      path: repositoryPath,
      kind: "symlink",
      sha256: createHash("sha256").update(target).digest("hex"),
    });
  }
  if (before.isDirectory())
    return Object.freeze({ path: repositoryPath, kind: "directory", sha256: "directory" });
  if (!before.isFile())
    throw new SmokeError("smoke_repository_invalid", "special file is not allowed");
  const bytes = await readFile(path);
  const after = await lstat(path, { bigint: true });
  if (
    !after.isFile() ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeNs !== after.mtimeNs
  ) {
    throw new SmokeError("smoke_repository_invalid", "file changed while hashing");
  }
  return Object.freeze({
    path: repositoryPath,
    kind: "file",
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

export class RepositoryGuard {
  readonly #root: string;
  readonly #status: StatusRunner;
  #snapshotCount = 0;
  #knownRehashCount = 0;

  constructor(root: string, status: StatusRunner) {
    this.#root = root;
    this.#status = status;
  }

  static async create(root: string, processes: ProcessSupervisor): Promise<RepositoryGuard> {
    const canonicalRoot = await realpath(root);
    const { resolveExecutableOnPath } = await import("./process-supervisor");
    const git = await resolveExecutableOnPath("git");
    return new RepositoryGuard(canonicalRoot, async () => {
      const result = await processes.run({
        executable: git,
        args: ["status", "--porcelain=v2", "-z", "--untracked-files=all"],
        cwd: canonicalRoot,
        env: {},
        family: "git",
      });
      return result.stdout;
    });
  }

  count(): number {
    return this.#snapshotCount;
  }

  knownRehashCount(): number {
    return this.#knownRehashCount;
  }

  async snapshotKnown(paths: readonly string[]): Promise<RepositorySnapshot> {
    if (!Array.isArray(paths) || paths.length > 1024) {
      throw new SmokeError("smoke_repository_invalid", "known repository path set is invalid");
    }
    const normalized = [...new Set(paths.map(normalizePath))].sort();
    if (normalized.length !== paths.length) {
      throw new SmokeError("smoke_repository_invalid", "known repository path is duplicated");
    }
    const files: RepositoryFileIdentity[] = [];
    for (const path of normalized) files.push(await identity(this.#root, path));
    this.#knownRehashCount += 1;
    return Object.freeze({
      files: Object.freeze(files),
      sha256: createHash("sha256").update(JSON.stringify(files)).digest("hex"),
    });
  }

  async snapshot(additionalPaths: readonly string[] = []): Promise<RepositorySnapshot> {
    const statusPaths = parsePorcelainV2(await this.#status());
    const paths = [...new Set([...statusPaths, ...additionalPaths.map(normalizePath)])].sort();
    const files: RepositoryFileIdentity[] = [];
    for (const path of paths) files.push(await identity(this.#root, path));
    const canonical = JSON.stringify(files);
    this.#snapshotCount += 1;
    return Object.freeze({
      files: Object.freeze(files),
      sha256: createHash("sha256").update(canonical).digest("hex"),
    });
  }

  assertUnchanged(
    before: RepositorySnapshot,
    after: RepositorySnapshot,
    allowedPaths: readonly string[] = []
  ): void {
    const allowed = [...new Set(allowedPaths.map(normalizePath))].sort();
    // An allowlist entry covers itself exactly and, when it is a directory
    // entry, everything beneath it. Directory subtrees must be allowlistable
    // because `_docs/_workflows/**` is un-ignored (.gitignore negation), so
    // smoke-written workspace children (screenshot candidates) reach the
    // porcelain snapshot even though parent patterns ignore images.
    const isAllowed = (path: string): boolean =>
      allowed.some((entry) => path === entry || path.startsWith(`${entry}/`));
    const beforeMap = new Map(before.files.map((file) => [file.path, file]));
    const afterMap = new Map(after.files.map((file) => [file.path, file]));
    for (const path of new Set([...beforeMap.keys(), ...afterMap.keys()])) {
      if (isAllowed(path)) continue;
      if (JSON.stringify(beforeMap.get(path)) !== JSON.stringify(afterMap.get(path))) {
        throw new SmokeError("smoke_repository_changed", "repository changed during smoke");
      }
    }
  }
}

export async function resolveCanonicalRepositoryRoot(start: string): Promise<string> {
  let candidate = await realpath(start);
  while (true) {
    const gitMarker = await lstat(resolve(candidate, ".git")).catch(() => null);
    const packageMarker = await lstat(resolve(candidate, "package.json")).catch(() => null);
    if (gitMarker !== null && packageMarker?.isFile()) return candidate;
    const parent = dirname(candidate);
    if (parent === candidate) {
      throw new SmokeError("smoke_repository_invalid", "canonical repository root is unavailable");
    }
    candidate = parent;
  }
}
