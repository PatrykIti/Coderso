import { expect, test } from "bun:test";

import type { RuntimeSmokeContext } from "../../../scripts/runtime-smoke/lifecycle";
import {
  createTask488HostSpec,
  task488Readiness,
  task488TimingPolicy,
} from "../../../scripts/runtime-smoke/adapters/task-488/host";
import { CODERSO_DEV_HOST_ENVIRONMENT_POLICY } from "../../../scripts/runtime-smoke/server/supervised-server";

function context(root = process.cwd()): RuntimeSmokeContext {
  return {
    input: {
      command: "run",
      suite: "task-488",
      profile: "fast",
      session: "wf488-host",
    },
    root,
  } as RuntimeSmokeContext;
}

test("TASK-488 host uses the shared dev host with a readiness budget that tolerates the slow forced-optimization boot", () => {
  const spec = createTask488HostSpec({
    context: context(),
    environment: { PATH: process.env.PATH },
    adminPath: "/admin-panel",
    timing: task488TimingPolicy("fast"),
  });
  expect(spec.executable).toEqual({ kind: "path-literal", name: "coderso-dev-core-host" });
  expect(spec.args).toEqual([process.cwd()]);
  expect(spec.cwd).toBe(process.cwd());
  expect(spec.ports).toEqual([3000, 5173]);
  expect(spec.readiness.map(({ id }) => id)).toEqual([
    "task488-admin-ready",
    "task488-api-ready",
    "task488-admin-spa-warm",
  ]);
  expect(spec.readinessTimeoutMs).toBe(240_000);
  expect(spec.environment.policy).toBe(CODERSO_DEV_HOST_ENVIRONMENT_POLICY);
  expect(task488TimingPolicy("fast").healthTimeoutMs).toBe(240_000);
  expect(task488TimingPolicy("fast").browserDispatchTimeoutMs).toBe(90_000);
});

const ENTRY_BODY =
  'import __vite__cjsImport0_react from "/admin-panel/@fs/home/coder/project/core/node_modules/.vite/deps/react.js?v=36d5beee";';

function entryAwareFetch(visited: string[], depStatus = 200) {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    visited.push(url);
    if (url.endsWith("/admin-panel/main.tsx")) {
      return { status: 200, body: null, text: async () => ENTRY_BODY } as unknown as Response;
    }
    return { status: url.includes("?v=") ? depStatus : 200, body: null } as Response;
  };
}

test("TASK-488 readiness probes the vite admin page, the real backend admin API, and the warm pre-bundled SPA", async () => {
  const visited: string[] = [];
  const probes = task488Readiness("/admin-panel", entryAwareFetch(visited));
  expect(await Promise.all(probes.map(({ check }) => check()))).toEqual([true, true, true]);
  expect(visited).toEqual([
    "http://127.0.0.1:5173/admin-panel/",
    "http://127.0.0.1:3000/admin-panel/api/auth/install/status",
    "http://127.0.0.1:5173/admin-panel/main.tsx",
    "http://127.0.0.1:5173/admin-panel/@fs/home/coder/project/core/node_modules/.vite/deps/react.js?v=36d5beee",
  ]);
});

test("TASK-488 readiness stays exact-200 even when the backend dev redirect (307) would have answered the old HTML probe", async () => {
  // Regression guard: the dev backend 307-redirects every admin HTML request
  // to the vite dev server, so the API probe must target a real 200 route
  // (auth install status) instead of the redirectable HTML URL.
  const visited: string[] = [];
  const probes = task488Readiness("/admin-panel", async (input) => {
    visited.push(String(input));
    return { status: 307, body: null } as Response;
  });
  expect(await Promise.all(probes.map(({ check }) => check()))).toEqual([false, false, false]);
  expect(visited).toContain("http://127.0.0.1:3000/admin-panel/api/auth/install/status");
  expect(visited).not.toContain("http://127.0.0.1:3000/admin-panel/");
});

test("TASK-488 SPA-warm probe stays false until the pre-bundled dep actually serves", async () => {
  // The optimizer commit is the gating signal: the entry module transforms
  // immediately, but the dep URL it points at only returns 200 after the
  // forced re-optimization has written the bundle.
  const visited: string[] = [];
  const probes = task488Readiness("/admin-panel", entryAwareFetch(visited, 404));
  expect(await Promise.all(probes.map(({ check }) => check()))).toEqual([true, true, false]);
  expect(visited).toContain(
    "http://127.0.0.1:5173/admin-panel/@fs/home/coder/project/core/node_modules/.vite/deps/react.js?v=36d5beee"
  );
});
