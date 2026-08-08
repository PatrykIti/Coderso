import { expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import type { RuntimeSmokeContext } from "../../../scripts/runtime-smoke/lifecycle";
import { RuntimeLifecycle } from "../../../scripts/runtime-smoke/lifecycle";
import type {
  ManagedProcessHandle,
  ProcessReceipt,
  ProcessSpec,
  ProcessSupervisor,
} from "../../../scripts/runtime-smoke/process-supervisor";
import type { RepositoryGuard } from "../../../scripts/runtime-smoke/repository-guard";
import {
  buildProductionBoundaryEnvironment,
  loadProductionBuiltAsset,
  runProductionBoundaryAdapter,
} from "../../../scripts/runtime-smoke/adapters/production-boundary";
import { TimingRecorder } from "../../../scripts/runtime-smoke/timing";

const TEST_PORT = 41_321;
const STARTUP_LOG = `Core HTTP server listening on http://0.0.0.0:${TEST_PORT}\n`;

class FakeProcesses {
  readonly specs: ProcessSpec[] = [];
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  terminateCalls = 0;
  readonly #serverStderr: string;
  #resolveExit:
    | ((value: { exitCode: number; signal: NodeJS.Signals | null; elapsedMs: number }) => void)
    | null = null;
  readonly #exit = new Promise<{
    exitCode: number;
    signal: NodeJS.Signals | null;
    elapsedMs: number;
  }>((resolveExit) => {
    this.#resolveExit = resolveExit;
  });

  constructor(serverStderr = "") {
    this.#serverStderr = serverStderr;
  }

  async run(spec: ProcessSpec) {
    this.specs.push(spec);
    const receipt: ProcessReceipt = Object.freeze({
      family: spec.family ?? "build",
      pid: 100 + this.specs.length,
      exitCode: 0,
      signal: null,
      elapsedMs: 1,
      stdoutBytes: 0,
      stderrBytes: 0,
      stdoutSha256: "a".repeat(64),
      stderrSha256: "b".repeat(64),
      absent: true,
    });
    return Object.freeze({ stdout: new Uint8Array(), stderr: new Uint8Array(), receipt });
  }

  async start(spec: ProcessSpec): Promise<ManagedProcessHandle> {
    this.specs.push(spec);
    this.stdout.write(STARTUP_LOG);
    if (this.#serverStderr) this.stderr.write(this.#serverStderr);
    return {
      pid: 4242,
      stdout: this.stdout,
      stderr: this.stderr,
      async write() {},
      endInput() {},
      wait: () => this.#exit,
      terminate: async () => {
        if (this.terminateCalls > 0) return;
        this.terminateCalls += 1;
        this.stdout.end();
        this.stderr.end();
        this.#resolveExit?.({ exitCode: -1, signal: "SIGTERM", elapsedMs: 2 });
      },
    };
  }
}

function makeContext(processes: FakeProcesses): RuntimeSmokeContext {
  return {
    input: {
      command: "run",
      suite: "production-boundary",
      profile: "certification",
      session: "wf552-prod",
    },
    root: process.cwd(),
    lifecycle: new RuntimeLifecycle(),
    timing: new TimingRecorder(),
    processes: processes as unknown as ProcessSupervisor,
    repository: {} as RepositoryGuard,
  };
}

function productionResponses(assetPath: string): typeof globalThis.fetch {
  return async (input) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input : input.url
    );
    if (url.pathname === "/admin/api/auth/install/status") {
      return Response.json({ available: false });
    }
    if (url.pathname === "/admin") {
      return new Response(null, { status: 307, headers: { location: "/admin/" } });
    }
    if (url.pathname === "/admin/") {
      return new Response("<!doctype html><html><body>Admin</body></html>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname === assetPath) {
      return new Response("body{}", { headers: { "content-type": "text/css" } });
    }
    if (url.pathname === "/peri") return new Response("Not Found", { status: 404 });
    if (url.pathname === "/") {
      return new Response("<!doctype html><html><body>Site</body></html>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response("unexpected", { status: 500 });
  };
}

const environment = Object.freeze({
  PATH: "/usr/local/bin:/usr/bin",
  DATABASE_URL: "postgres://test.invalid/coderso",
  PII_HASH_KEY: "test-hash-key",
  VITE_DEV_SERVER_URL: "http://localhost:5173",
  UNRELATED_SECRET: "must-not-cross-boundary",
});

test("production adapter composes builds, exact probes, bounded logs, and owned cleanup", async () => {
  const processes = new FakeProcesses();
  const context = makeContext(processes);
  const assetPath = "/site/assets/site.css";
  const result = await runProductionBoundaryAdapter(context, {
    environment,
    resolveBunExecutable: async () => "/usr/local/bin/bun",
    allocatePort: async () => TEST_PORT,
    canConnect: async () => true,
    isPortAvailable: async () => true,
    fetch: productionResponses(assetPath),
    loadBuiltAsset: async () => ({ path: assetPath, contentType: "css" }),
  });

  expect(result.pass).toBe(true);
  expect(result.serverUp).toBe(true);
  expect(result.scenarios.map(({ id }) => id)).toEqual([
    "install-status",
    "public-root",
    "admin-redirect",
    "admin-shell",
    "manifest-asset",
    "exact-unknown-route",
    "root-recovery",
    "clean-stop",
  ]);
  expect(result.cleanup).toMatchObject({
    builds: 2,
    probes: 7,
    productionProcessStopped: true,
    productionPortReleased: true,
    builtAsset: assetPath,
  });
  expect(processes.specs.map(({ args }) => args)).toEqual([
    ["--no-env-file", "run", "build:admin"],
    ["--no-env-file", "run", "build:site"],
    ["--no-env-file", "run", "start:prod"],
  ]);
  const serverEnvironment = processes.specs[2]?.env;
  expect(serverEnvironment).toMatchObject({
    NODE_ENV: "production",
    PORT: String(TEST_PORT),
    PUBLIC_BASE_URL: `http://127.0.0.1:${TEST_PORT}`,
    DB_POOL_MAX: "1",
    BACKUP_SCHEDULER_ENABLED: "0",
    PII_HASH_KEY: "test-hash-key",
  });
  expect(serverEnvironment).not.toHaveProperty("VITE_DEV_SERVER_URL");
  expect(serverEnvironment).not.toHaveProperty("UNRELATED_SECRET");
  expect(processes.terminateCalls).toBe(1);
  expect(await context.lifecycle.closeAllNeverThrow()).toEqual({ pass: true, failures: [] });
});

test("production adapter fails closed on a non-exact 404 body and still owns cleanup", async () => {
  const processes = new FakeProcesses();
  const context = makeContext(processes);
  const baseFetch = productionResponses("/site/assets/site.css");
  const fetchWithDrift: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input : input.url
    );
    if (url.pathname === "/peri") return new Response("not found", { status: 404 });
    return baseFetch(input, init);
  };

  await expect(
    runProductionBoundaryAdapter(context, {
      environment,
      resolveBunExecutable: async () => "/usr/local/bin/bun",
      allocatePort: async () => TEST_PORT,
      canConnect: async () => true,
      isPortAvailable: async () => true,
      fetch: fetchWithDrift,
      loadBuiltAsset: async () => ({ path: "/site/assets/site.css", contentType: "css" }),
    })
  ).rejects.toMatchObject({ code: "smoke_output_invalid" });
  expect(processes.terminateCalls).toBe(0);
  expect(await context.lifecycle.closeAllNeverThrow()).toEqual({ pass: true, failures: [] });
  expect(processes.terminateCalls).toBe(1);
});

test("production adapter rejects server warnings after an exact stop", async () => {
  const processes = new FakeProcesses("unexpected warning\n");
  const context = makeContext(processes);
  await expect(
    runProductionBoundaryAdapter(context, {
      environment,
      resolveBunExecutable: async () => "/usr/local/bin/bun",
      allocatePort: async () => TEST_PORT,
      canConnect: async () => true,
      isPortAvailable: async () => true,
      fetch: productionResponses("/site/assets/site.css"),
      loadBuiltAsset: async () => ({ path: "/site/assets/site.css", contentType: "css" }),
    })
  ).rejects.toMatchObject({ code: "smoke_output_invalid" });
  expect(processes.terminateCalls).toBe(1);
  expect(await context.lifecycle.closeAllNeverThrow()).toEqual({ pass: true, failures: [] });
});

test("manifest loader selects a confined entry asset without running a build", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-production-adapter-"));
  try {
    const manifestDirectory = join(root, "core/dist/site");
    await mkdir(manifestDirectory, { recursive: true });
    await writeFile(
      join(manifestDirectory, "manifest.json"),
      JSON.stringify({
        "main.ts": { file: "assets/main.js", css: ["assets/main.css"], isEntry: true },
      })
    );
    expect(await loadProductionBuiltAsset(root)).toEqual({
      path: "/site/assets/main.css",
      contentType: "css",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production environment is fixed, least-privilege, and rejects missing database access", () => {
  const projected = buildProductionBoundaryEnvironment(environment, TEST_PORT);
  expect(projected.UNRELATED_SECRET).toBeUndefined();
  expect(projected.VITE_DEV_SERVER_URL).toBeUndefined();
  expect(projected.DATABASE_URL).toBe(environment.DATABASE_URL);
  expect(() => buildProductionBoundaryEnvironment({ PATH: "/usr/bin" }, TEST_PORT)).toThrow();
});

test("production boundary delegates server ownership to the shared supervised resource", async () => {
  const source = await readFile(
    join(process.cwd(), "scripts/runtime-smoke/adapters/production-boundary.ts"),
    "utf8"
  );
  expect(source).toContain("startSupervisedServer(context");
  expect(source).not.toContain("class OwnedProductionServer");
  expect(source).not.toContain("context.processes.start(");
  expect(source).not.toContain("createServer(");
  expect(source).not.toMatch(/setTimeout\s*\(/u);
});
