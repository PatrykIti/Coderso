import { lstat, mkdir, mkdtemp, chmod, realpath, rm, stat } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

import { resolveInsideRoot, SmokeError } from "../../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../../lifecycle";

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export class Task547PrivateWorkspace implements LifecycleResource {
  readonly name: string;
  readonly path: string;
  readonly authStatePath: string;
  #closed = false;

  private constructor(session: string, path: string) {
    this.name = `task547-workspace-${session}`;
    this.path = path;
    this.authStatePath = join(path, "admin-auth-state.json");
  }

  static async create(context: RuntimeSmokeContext): Promise<Task547PrivateWorkspace> {
    context.lifecycle.assertAccepting();
    const root = await realpath(context.root).catch((error: unknown) => {
      throw new SmokeError("smoke_repository_invalid", "TASK-547 root is unavailable", {
        cause: error,
      });
    });
    const parentInput = resolveInsideRoot(root, ".tmp/runtime-smoke", "TASK-547 workspace root");
    await mkdir(parentInput, { recursive: true, mode: 0o700 });
    const parent = await realpath(parentInput);
    if (parent !== parentInput || !isWithin(root, parent) || !(await stat(parent)).isDirectory()) {
      throw new SmokeError("smoke_repository_invalid", "TASK-547 workspace parent is redirected");
    }

    let candidate: string | null = null;
    try {
      candidate = await mkdtemp(join(parent, `${context.input.session}-task547-`));
      await chmod(candidate, 0o700);
      const [canonical, metadata] = await Promise.all([realpath(candidate), lstat(candidate)]);
      const uid = typeof process.getuid === "function" ? process.getuid() : metadata.uid;
      if (
        canonical !== candidate ||
        !isWithin(root, canonical) ||
        metadata.isSymbolicLink() ||
        !metadata.isDirectory() ||
        metadata.uid !== uid ||
        (metadata.mode & 0o777) !== 0o700
      ) {
        throw new SmokeError(
          "smoke_repository_invalid",
          "TASK-547 private workspace ownership is invalid"
        );
      }
      const workspace = new Task547PrivateWorkspace(context.input.session, canonical);
      context.lifecycle.register(workspace);
      return workspace;
    } catch (error) {
      if (candidate !== null) await rm(candidate, { recursive: true, force: true });
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

export function createTask547PrivateWorkspace(
  context: RuntimeSmokeContext
): Promise<Task547PrivateWorkspace> {
  return Task547PrivateWorkspace.create(context);
}
