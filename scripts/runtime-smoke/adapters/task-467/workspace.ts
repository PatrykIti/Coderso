// TASK-467 private workspace: a mode-0700 scratch directory under the shared
// .tmp/runtime-smoke tree, owned by this suite's lifecycle. It holds the
// admin storage state and the staged screenshot files.
import { chmod, lstat, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

import { resolveInsideRoot, SmokeError } from "../../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../../lifecycle";

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export class Task467Workspace implements LifecycleResource {
  readonly name: string;
  readonly path: string;
  readonly authStatePath: string;
  readonly stagedScreenshotDirectory: string;
  #closed = false;

  private constructor(session: string, path: string) {
    this.name = `task467-workspace-${session}`;
    this.path = path;
    this.authStatePath = join(path, "admin-auth-state.json");
    this.stagedScreenshotDirectory = join(path, "screenshots");
  }

  static async create(context: RuntimeSmokeContext): Promise<Task467Workspace> {
    context.lifecycle.assertAccepting();
    const root = await realpath(context.root).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-467 workspace root is unavailable", {
        cause: error,
      });
    });
    resolveInsideRoot(root, ".tmp/runtime-smoke", "TASK-467 workspace root");
    const parent = resolveInsideRoot(root, ".tmp/runtime-smoke", "TASK-467 workspace parent");
    await mkdir(parent, { recursive: true, mode: 0o700 });
    const parentInfo = await lstat(parent);
    if (
      parentInfo.isSymbolicLink() ||
      !parentInfo.isDirectory() ||
      !isWithin(root, parent) ||
      (parentInfo.mode & 0o777) !== 0o700
    ) {
      throw new SmokeError("smoke_repository_invalid", "TASK-467 workspace parent is invalid");
    }
    let candidate: string | null = null;
    try {
      candidate = await mkdtemp(join(parent, `${context.input.session}-task467-`));
      await chmod(candidate, 0o700);
      await mkdir(join(candidate, "screenshots"), { mode: 0o700 });
      const canonical = await realpath(candidate);
      if (canonical !== candidate || !isWithin(root, canonical) || candidate.includes("\0")) {
        throw new SmokeError("smoke_repository_invalid", "TASK-467 workspace is not private");
      }
      const workspace = new Task467Workspace(context.input.session, canonical);
      context.lifecycle.register(workspace);
      return workspace;
    } catch (error) {
      if (candidate !== null) {
        await rm(candidate, { recursive: true, force: true }).catch(() => undefined);
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    await rm(this.path, { recursive: true, force: true });
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

export function createTask467PrivateWorkspace(
  context: RuntimeSmokeContext
): Promise<Task467Workspace> {
  return Task467Workspace.create(context);
}
