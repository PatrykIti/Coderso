import { chmod, lstat, mkdir, mkdtemp, realpath, readdir, rmdir, rm } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

import { resolveInsideRoot, SmokeError } from "../../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../../lifecycle";

interface WorkspaceParentDirectory {
  readonly path: string;
  readonly dev: number | bigint;
  readonly ino: number | bigint;
  readonly uid: number | bigint;
  readonly mode: number | bigint;
}

interface WorkspaceParent {
  readonly path: string;
  readonly created: readonly WorkspaceParentDirectory[];
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function parentDirectory(
  path: string,
  info: Awaited<ReturnType<typeof lstat>>
): WorkspaceParentDirectory {
  return Object.freeze({
    path,
    dev: info.dev,
    ino: info.ino,
    uid: info.uid,
    mode: info.mode,
  });
}

function isSameParentDirectory(
  expected: WorkspaceParentDirectory,
  actual: Awaited<ReturnType<typeof lstat>>
): boolean {
  return (
    expected.dev === actual.dev &&
    expected.ino === actual.ino &&
    expected.uid === actual.uid &&
    expected.mode === actual.mode
  );
}

async function removeCreatedParents(
  root: string,
  created: readonly WorkspaceParentDirectory[]
): Promise<void> {
  for (const expected of [...created].reverse()) {
    const info = await lstat(expected.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info === null) continue;
    const canonical = await realpath(expected.path).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-487 workspace parent changed", {
        cause: error,
      });
    });
    if (
      info.isSymbolicLink() ||
      !info.isDirectory() ||
      canonical !== expected.path ||
      !isWithin(root, canonical) ||
      !isSameParentDirectory(expected, info)
    ) {
      throw new SmokeError("smoke_repository_invalid", "TASK-487 workspace parent changed");
    }
    if ((await readdir(expected.path)).length > 0) continue;
    try {
      await rmdir(expected.path);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTEMPTY") continue;
      throw new SmokeError("smoke_cleanup_failed", "TASK-487 workspace parent cleanup failed", {
        cause: error,
      });
    }
  }
}

async function createWorkspaceParent(root: string): Promise<WorkspaceParent> {
  let directory = root;
  const processUid = typeof process.getuid === "function" ? process.getuid() : null;
  const created: WorkspaceParentDirectory[] = [];
  try {
    for (const [index, component] of [".tmp", "runtime-smoke"].entries()) {
      const candidate = join(directory, component);
      let info = await lstat(candidate).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      let wasCreated = false;
      if (info === null) {
        await mkdir(candidate, { mode: 0o700 }).catch((error: unknown) => {
          throw new SmokeError("smoke_repository_invalid", "TASK-487 workspace parent is invalid", {
            cause: error,
          });
        });
        wasCreated = true;
        info = await lstat(candidate).catch((error: unknown) => {
          throw new SmokeError("smoke_repository_invalid", "TASK-487 workspace parent is invalid", {
            cause: error,
          });
        });
      }
      const canonical = await realpath(candidate).catch((error: unknown) => {
        throw new SmokeError("smoke_repository_invalid", "TASK-487 workspace parent is invalid", {
          cause: error,
        });
      });
      const expectedUid = processUid ?? info.uid;
      if (
        info.isSymbolicLink() ||
        !info.isDirectory() ||
        canonical !== candidate ||
        !isWithin(root, canonical) ||
        (index === 1 && (info.uid !== expectedUid || (info.mode & 0o777) !== 0o700))
      ) {
        throw new SmokeError("smoke_repository_invalid", "TASK-487 workspace parent is invalid");
      }
      if (wasCreated) created.push(parentDirectory(candidate, info));
      directory = candidate;
    }
    return Object.freeze({ path: directory, created: Object.freeze(created) });
  } catch (error) {
    try {
      await removeCreatedParents(root, created);
    } catch (cleanupError) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-487 workspace setup cleanup failed", {
        cause: new AggregateError([error, cleanupError]),
      });
    }
    throw error;
  }
}

export class Task487Workspace implements LifecycleResource {
  readonly name: string;
  readonly path: string;
  readonly #root: string;
  readonly #createdParents: readonly WorkspaceParentDirectory[];
  #closed = false;

  private constructor(
    session: string,
    path: string,
    root: string,
    createdParents: readonly WorkspaceParentDirectory[]
  ) {
    this.name = `task487-workspace-${session}`;
    this.path = path;
    this.#root = root;
    this.#createdParents = createdParents;
  }

  static async create(context: RuntimeSmokeContext): Promise<Task487Workspace> {
    context.lifecycle.assertAccepting();
    const root = await realpath(context.root).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-487 workspace root is unavailable", {
        cause: error,
      });
    });
    resolveInsideRoot(root, ".tmp/runtime-smoke", "TASK-487 workspace root");
    const parent = await createWorkspaceParent(root);
    const parentInfo = await lstat(parent.path);
    const uid = typeof process.getuid === "function" ? process.getuid() : parentInfo.uid;
    if (
      !isWithin(root, parent.path) ||
      parentInfo.isSymbolicLink() ||
      !parentInfo.isDirectory() ||
      parentInfo.uid !== uid ||
      (parentInfo.mode & 0o777) !== 0o700
    ) {
      throw new SmokeError("smoke_repository_invalid", "TASK-487 workspace parent is invalid");
    }
    let candidate: string | null = null;
    try {
      candidate = await mkdtemp(join(parent.path, `${context.input.session}-task487-`));
      await chmod(candidate, 0o700);
      const [canonical, info] = await Promise.all([realpath(candidate), lstat(candidate)]);
      if (
        canonical !== candidate ||
        !isWithin(root, canonical) ||
        info.isSymbolicLink() ||
        !info.isDirectory() ||
        info.uid !== uid ||
        (info.mode & 0o777) !== 0o700
      ) {
        throw new SmokeError("smoke_repository_invalid", "TASK-487 workspace is not private");
      }
      const workspace = new Task487Workspace(
        context.input.session,
        canonical,
        root,
        parent.created
      );
      context.lifecycle.register(workspace);
      return workspace;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      if (candidate !== null) {
        try {
          await rm(candidate, { recursive: true, force: true });
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      try {
        await removeCreatedParents(root, parent.created);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      if (cleanupErrors.length > 0) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-487 workspace setup cleanup failed", {
          cause: new AggregateError([error, ...cleanupErrors]),
        });
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    await rm(this.path, { recursive: true, force: true });
    await removeCreatedParents(this.#root, this.#createdParents);
    this.#closed = true;
  }

  async proveAbsent(): Promise<boolean> {
    const entry = await lstat(this.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    return this.#closed && entry === null;
  }
}

export function createTask487PrivateWorkspace(
  context: RuntimeSmokeContext
): Promise<Task487Workspace> {
  return Task487Workspace.create(context);
}
