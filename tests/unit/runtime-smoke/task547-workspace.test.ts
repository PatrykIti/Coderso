import { expect, test } from "bun:test";
import { lstat, mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createTask547PrivateWorkspace } from "../../../scripts/runtime-smoke/adapters/task-547/workspace";
import {
  RuntimeLifecycle,
  type RuntimeSmokeContext,
} from "../../../scripts/runtime-smoke/lifecycle";

test("TASK-547 workspace is private, registered immediately, idempotent, and absent at close", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-task547-workspace-"));
  const lifecycle = new RuntimeLifecycle();
  const context = {
    input: {
      command: "run",
      suite: "task-547",
      profile: "fast",
      session: "wf547-workspace",
    },
    root,
    lifecycle,
  } as RuntimeSmokeContext;
  try {
    const workspace = await createTask547PrivateWorkspace(context);
    expect((await stat(workspace.path)).mode & 0o777).toBe(0o700);
    expect(workspace.path.startsWith(`${root}/.tmp/runtime-smoke/`)).toBe(true);
    expect(await workspace.proveAbsent()).toBe(false);
    await workspace.close();
    await workspace.close();
    expect(await lstat(workspace.path).catch(() => null)).toBeNull();
    expect(await workspace.proveAbsent()).toBe(true);
    expect(await lifecycle.closeAllNeverThrow()).toEqual({ pass: true, failures: [] });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
