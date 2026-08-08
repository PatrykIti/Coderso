import { expect, test } from "bun:test";

import type { RuntimeSmokeContext } from "../../../scripts/runtime-smoke/lifecycle";
import {
  createTask547HostSpec,
  task547Readiness,
  task547TimingPolicy,
} from "../../../scripts/runtime-smoke/adapters/task-547/host";
import { CODERSO_DEV_HOST_ENVIRONMENT_POLICY } from "../../../scripts/runtime-smoke/server/supervised-server";

function context(root = process.cwd()): RuntimeSmokeContext {
  return {
    input: {
      command: "run",
      suite: "task-547",
      profile: "fast",
      session: "wf547-host",
    },
    root,
  } as RuntimeSmokeContext;
}

test("TASK-547 host uses the shared three-port developer host with profile readiness bounds", () => {
  const spec = createTask547HostSpec({
    context: context(),
    environment: { PATH: process.env.PATH },
    timing: task547TimingPolicy("fast"),
  });
  expect(spec.executable).toEqual({ kind: "path-literal", name: "coderso-dev-core-host" });
  expect(spec.args).toEqual([process.cwd()]);
  expect(spec.cwd).toBe(process.cwd());
  expect(spec.ports).toEqual([3000, 5173, 5174]);
  expect(spec.readiness.map(({ id }) => id)).toEqual([
    "task547-front-ready",
    "task547-admin-ready",
    "task547-site-vite-ready",
  ]);
  expect(spec.readinessTimeoutMs).toBe(120_000);
  expect(spec.environment.policy).toBe(CODERSO_DEV_HOST_ENVIRONMENT_POLICY);
  expect(task547TimingPolicy("fast").browserDispatchTimeoutMs).toBe(90_000);
  expect(task547TimingPolicy("certification").healthTimeoutMs).toBe(240_000);
  expect(task547TimingPolicy("certification").browserDispatchTimeoutMs).toBe(120_000);
});

test("TASK-547 readiness accepts only exact HTTP 200 responses", async () => {
  const statuses = [200, 204, 200];
  const visited: string[] = [];
  const probes = task547Readiness(async (input) => {
    visited.push(String(input));
    const status = statuses.shift() ?? 500;
    return { status, body: null } as Response;
  });
  expect(await Promise.all(probes.map(({ check }) => check()))).toEqual([true, false, true]);
  expect(visited).toEqual([
    "http://127.0.0.1:3000/",
    "http://127.0.0.1:5173/admin/",
    "http://127.0.0.1:5174/site/main.ts",
  ]);
});
