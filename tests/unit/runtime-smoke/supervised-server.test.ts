import { expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { PassThrough } from "node:stream";
import type {
  RuntimeSmokeContext,
  LifecycleResource,
} from "../../../scripts/runtime-smoke/lifecycle";
import type {
  ManagedProcessHandle,
  ProcessSpec,
  ProcessSupervisor,
} from "../../../scripts/runtime-smoke/process-supervisor";
import type { RepositoryGuard } from "../../../scripts/runtime-smoke/repository-guard";
import {
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
  projectSupervisedServerEnvironment,
  startSupervisedServer,
  TASK540_DEV_HOST_ENVIRONMENT_POLICY,
  type SupervisedServerEnvironmentPolicy,
  type SupervisedServerSpec,
} from "../../../scripts/runtime-smoke/server/supervised-server";
import { TimingRecorder } from "../../../scripts/runtime-smoke/timing";

class RecordingLifecycle {
  readonly resources: LifecycleResource[] = [];

  assertAccepting(): void {}

  register(resource: LifecycleResource): void {
    this.resources.push(resource);
  }

  async closeAllNeverThrow(): Promise<{
    readonly pass: boolean;
    readonly failures: readonly { readonly resource: string; readonly phase: string }[];
  }> {
    const failures: { resource: string; phase: string }[] = [];
    for (const resource of [...this.resources].reverse()) {
      try {
        await resource.close();
      } catch {
        failures.push({ resource: resource.name, phase: "close" });
      }
      try {
        if (!(await resource.proveAbsent())) {
          failures.push({ resource: resource.name, phase: "absence" });
        }
      } catch {
        failures.push({ resource: resource.name, phase: "absence" });
      }
    }
    return { pass: failures.length === 0, failures };
  }
}

class FakeHandle implements ManagedProcessHandle {
  readonly pid = 4242;
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  terminateCalls = 0;
  terminated = false;
  readonly #exit: Promise<{ exitCode: number; signal: NodeJS.Signals | null; elapsedMs: number }>;
  #resolveExit!: (value: {
    exitCode: number;
    signal: NodeJS.Signals | null;
    elapsedMs: number;
  }) => void;

  constructor(alreadyDestroyed = false, immediateExit = false) {
    this.#exit = new Promise((resolveExit) => {
      this.#resolveExit = resolveExit;
    });
    if (alreadyDestroyed) {
      this.stdout.destroy();
      this.stderr.destroy();
    }
    if (immediateExit) {
      queueMicrotask(() => {
        this.#resolveExit({ exitCode: 1, signal: null, elapsedMs: 1 });
      });
    }
  }

  async write(): Promise<void> {}

  endInput(): void {}

  wait(): Promise<{ exitCode: number; signal: NodeJS.Signals | null; elapsedMs: number }> {
    return this.#exit;
  }

  exitUnexpectedly(): void {
    this.terminated = true;
    this.stdout.end();
    this.stderr.end();
    this.#resolveExit({ exitCode: 1, signal: null, elapsedMs: 1 });
  }

  async terminate(): Promise<void> {
    this.terminateCalls += 1;
    if (this.terminated) return;
    this.terminated = true;
    this.stdout.end();
    this.stderr.end();
    this.#resolveExit({ exitCode: 0, signal: null, elapsedMs: 1 });
  }
}

class FakeProcesses {
  readonly handle: FakeHandle;
  readonly lifecycle: RecordingLifecycle;
  startCalls = 0;
  registrationCountAtStart = 0;
  spec: ProcessSpec | null = null;

  constructor(lifecycle: RecordingLifecycle, alreadyDestroyed = false, immediateExit = false) {
    this.lifecycle = lifecycle;
    this.handle = new FakeHandle(alreadyDestroyed, immediateExit);
  }

  async start(spec: ProcessSpec): Promise<ManagedProcessHandle> {
    this.startCalls += 1;
    this.registrationCountAtStart = this.lifecycle.resources.length;
    this.spec = spec;
    const databaseUrl = spec.env?.DATABASE_URL;
    if (databaseUrl) this.handle.stdout.write(`ready ${databaseUrl}\n`);
    return this.handle;
  }
}

function context(
  root: string,
  lifecycle: RecordingLifecycle,
  processes: FakeProcesses
): RuntimeSmokeContext {
  return {
    input: {
      command: "run",
      suite: "task-540",
      profile: "fast",
      session: "wf552-server",
    },
    root,
    lifecycle: lifecycle as unknown as RuntimeSmokeContext["lifecycle"],
    timing: new TimingRecorder(),
    processes: processes as unknown as ProcessSupervisor,
    repository: {} as RepositoryGuard,
  };
}

function productionPolicy(port: number): SupervisedServerEnvironmentPolicy {
  return Object.freeze({
    id: "production-boundary",
    required: Object.freeze(["DATABASE_URL"]),
    optional: Object.freeze(["PII_HASH_KEY"]),
    inherited: Object.freeze([]),
    fixed: Object.freeze({ NODE_ENV: "production", PORT: String(port) }),
  });
}

async function createLiteralFixture(): Promise<{
  readonly root: string;
  readonly bin: string;
  readonly executable: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "coderso-supervised-server-"));
  const bin = join(root, "bin");
  await mkdir(bin);
  const executable = join(bin, "coderso-dev-core-host");
  await writeFile(executable, "#!/bin/sh\nexit 0\n");
  await chmod(executable, 0o755);
  return { root, bin: await realpath(bin), executable: await realpath(executable) };
}

function devHostSource(path: string): NodeJS.ProcessEnv {
  return {
    PATH: path,
    DATABASE_URL: "postgres://smoke:private-password@localhost/smoke",
    PII_HASH_KEY: "private-hash-value",
    PII_ENC_KEY: "private-encryption-value",
    MEDIA_SECRET_MASTER_KEY: "private-media-value",
    DB_POOL_MAX: "1",
    ADMIN_EMAIL: "must-not-pass@example.test",
    ADMIN_PASSWORD: "must-not-pass",
    MEDIA_STORAGE: "local",
    MEDIA_DIR: "/private/media",
    UNRELATED_SECRET: "must-not-pass-either",
  };
}

function literalSpec(
  fixture: Awaited<ReturnType<typeof createLiteralFixture>>,
  source: NodeJS.ProcessEnv,
  isPortAvailable: (port: number) => Promise<boolean>,
  readiness = async (): Promise<boolean> => true
): SupervisedServerSpec {
  return {
    executable: { kind: "path-literal", name: "coderso-dev-core-host" },
    args: [fixture.root],
    cwd: fixture.root,
    environment: { source, policy: CODERSO_DEV_HOST_ENVIRONMENT_POLICY },
    ports: [3000, 5173, 5174],
    readiness: [{ id: "task540-ready", check: readiness }],
    family: "task540-dev-host",
    readinessTimeoutMs: 20,
    portReleaseTimeoutMs: 20,
    isPortAvailable,
  };
}

test("supervised literal server registers before spawn and projects the exact shared dev-host environment", async () => {
  const fixture = await createLiteralFixture();
  try {
    const lifecycle = new RecordingLifecycle();
    const processes = new FakeProcesses(lifecycle);
    const available = async (): Promise<boolean> =>
      processes.startCalls === 0 || processes.handle.terminated;
    const server = await startSupervisedServer(
      context(fixture.root, lifecycle, processes),
      literalSpec(fixture, devHostSource(fixture.bin), available)
    );
    expect(processes.registrationCountAtStart).toBe(1);
    expect(processes.spec?.executable).toBe(fixture.executable);
    expect(processes.spec?.args).toEqual([fixture.root]);
    expect(Object.keys(processes.spec?.env ?? {}).sort()).toEqual(
      [
        "PATH",
        ...CODERSO_DEV_HOST_ENVIRONMENT_POLICY.required,
        "DB_POOL_MAX",
        ...Object.keys(CODERSO_DEV_HOST_ENVIRONMENT_POLICY.fixed),
      ].sort()
    );
    expect(processes.spec?.env).not.toHaveProperty("ADMIN_EMAIL");
    expect(processes.spec?.env).not.toHaveProperty("ADMIN_PASSWORD");
    expect(processes.spec?.env).not.toHaveProperty("MEDIA_STORAGE");
    expect(processes.spec?.env).not.toHaveProperty("MEDIA_DIR");
    expect(processes.spec?.env).not.toHaveProperty("UNRELATED_SECRET");
    expect(processes.spec?.env?.BUN_CONFIG_SKIP_INSTALL_PACKAGES).toBe("1");
    expect(TASK540_DEV_HOST_ENVIRONMENT_POLICY).toBe(CODERSO_DEV_HOST_ENVIRONMENT_POLICY);
    await server.close();
    await server.close();
    expect(processes.handle.terminateCalls).toBe(1);
    expect(server.logs().stdout).toBe("ready [REDACTED]\n");
    expect(await server.proveAbsent()).toBe(true);
    expect(await lifecycle.closeAllNeverThrow()).toEqual({ pass: true, failures: [] });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("supervised server accepts a validated absolute production executable", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-supervised-absolute-"));
  try {
    const lifecycle = new RecordingLifecycle();
    const processes = new FakeProcesses(lifecycle, true);
    const executable = await realpath(process.execPath);
    const port = 41_321;
    const available = async (): Promise<boolean> =>
      processes.startCalls === 0 || processes.handle.terminated;
    const server = await startSupervisedServer(context(root, lifecycle, processes), {
      executable: { kind: "absolute", path: executable },
      args: ["server.js"],
      cwd: root,
      environment: {
        source: {
          PATH: await realpath(dirname(executable)),
          DATABASE_URL: "postgres://smoke:private@localhost/db",
          PII_HASH_KEY: "optional-private",
          UNRELATED_SECRET: "not-projected",
        },
        policy: productionPolicy(port),
      },
      ports: [port],
      readiness: [{ id: "production-ready", check: async () => true }],
      family: "production-server",
      isPortAvailable: available,
    });
    expect(processes.spec?.executable).toBe(executable);
    expect(processes.spec?.env).toMatchObject({ NODE_ENV: "production", PORT: String(port) });
    expect(processes.spec?.env).not.toHaveProperty("UNRELATED_SECRET");
    await server.close();
    expect(await server.proveAbsent()).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("server environment canonicalizes PATH aliases and rejects missing required values", async () => {
  const fixture = await createLiteralFixture();
  try {
    const alias = join(fixture.root, "bin-alias");
    await symlink(fixture.bin, alias);
    const projected = await projectSupervisedServerEnvironment({
      source: devHostSource(`${fixture.bin}:${alias}`),
      policy: CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
    });
    expect(projected.PATH).toBe(fixture.bin);

    const lifecycle = new RecordingLifecycle();
    const processes = new FakeProcesses(lifecycle);
    const source = devHostSource(fixture.bin);
    delete source.PII_ENC_KEY;
    await expect(
      startSupervisedServer(
        context(fixture.root, lifecycle, processes),
        literalSpec(fixture, source, async () => true)
      )
    ).rejects.toThrow("required server environment is incomplete");
    expect(processes.startCalls).toBe(0);
    expect(lifecycle.resources).toHaveLength(1);
    expect(await lifecycle.closeAllNeverThrow()).toEqual({ pass: true, failures: [] });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("readiness failure preserves the primary error while lifecycle exposes port cleanup failure", async () => {
  const fixture = await createLiteralFixture();
  try {
    const lifecycle = new RecordingLifecycle();
    const processes = new FakeProcesses(lifecycle);
    const available = async (): Promise<boolean> => processes.startCalls === 0;
    await expect(
      startSupervisedServer(
        context(fixture.root, lifecycle, processes),
        literalSpec(fixture, devHostSource(fixture.bin), available, async () => false)
      )
    ).rejects.toMatchObject({ code: "smoke_poll_timeout" });
    expect(processes.handle.terminateCalls).toBe(1);
    const cleanup = await lifecycle.closeAllNeverThrow();
    expect(cleanup.pass).toBe(false);
    expect(cleanup.failures.map(({ phase }) => phase)).toEqual(["close", "absence"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("supervised server classifies an attached unexpected exit and still closes its resource", async () => {
  const fixture = await createLiteralFixture();
  try {
    const lifecycle = new RecordingLifecycle();
    const processes = new FakeProcesses(lifecycle, false, true);
    const available = async (): Promise<boolean> =>
      processes.startCalls === 0 || processes.handle.terminated;
    await expect(
      startSupervisedServer(
        context(fixture.root, lifecycle, processes),
        literalSpec(fixture, devHostSource(fixture.bin), available, async () => false)
      )
    ).rejects.toMatchObject({ code: "smoke_server_unexpected_exit" });
    expect(processes.handle.terminateCalls).toBe(1);
    expect(await lifecycle.closeAllNeverThrow()).toEqual({ pass: true, failures: [] });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("supervised server reports an unexpected exit after readiness", async () => {
  const fixture = await createLiteralFixture();
  try {
    const lifecycle = new RecordingLifecycle();
    const processes = new FakeProcesses(lifecycle);
    const available = async (): Promise<boolean> =>
      processes.startCalls === 0 || processes.handle.terminated;
    const server = await startSupervisedServer(
      context(fixture.root, lifecycle, processes),
      literalSpec(fixture, devHostSource(fixture.bin), available)
    );
    const unexpectedExit = server.waitForUnexpectedExit();
    processes.handle.exitUnexpectedly();
    await expect(unexpectedExit).rejects.toMatchObject({ code: "smoke_server_unexpected_exit" });
    await server.close();
    expect(await server.proveAbsent()).toBe(true);
    expect(await lifecycle.closeAllNeverThrow()).toEqual({ pass: true, failures: [] });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
