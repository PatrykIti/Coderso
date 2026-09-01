import type { RuntimeSmokeContext } from "../../lifecycle";
import {
  assertTask105L05FixedDevHostCapability,
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
  startSupervisedServer,
  type SupervisedServerReadinessProbe,
  type SupervisedServerResource,
  type SupervisedServerSpec,
} from "../../server/supervised-server";
import { TASK105_L05_FIXED_DEV_HOST_ENTRY } from "../../server/fixed-dev-host";
import { validateTask105L05AdminBase } from "./settings-lease";

/**
 * TASK-105 L05 fixed-entry dev-host policy derivation.
 * (contract: TASK-105-08-05-L04).
 *
 * The suite derives a distinct immutable `task-105-l05-dev-host` policy from
 * the shared `CODERSO_DEV_HOST_ENVIRONMENT_POLICY`, preserving its allowlisted
 * input sets and fixed values except for the exact fixed
 * `VITE_ADMIN_BASE_PATH: "${adminBase}/"`. It never mutates the shared policy
 * nor reads an ambient `VITE_ADMIN_BASE_PATH`. The shared supervisor resolves
 * an absolute Bun executable and launches the fixed entry with only this
 * projected environment.
 */

export interface Task105L05HostPolicy {
  readonly id: "task-105-l05-dev-host";
  readonly required: readonly string[];
  readonly optional: readonly string[];
  readonly inherited: readonly string[];
  readonly fixed: Readonly<Record<string, string>>;
}

export function deriveTask105L05HostPolicy(adminBase: string): Task105L05HostPolicy {
  const shared = CODERSO_DEV_HOST_ENVIRONMENT_POLICY;
  return Object.freeze({
    id: "task-105-l05-dev-host" as const,
    required: shared.required,
    optional: shared.optional,
    inherited: shared.inherited,
    fixed: Object.freeze({
      ...shared.fixed,
      VITE_ADMIN_BASE_PATH: `${adminBase}/`,
    }),
  });
}

/**
 * Retained only as an adapter test seam while the fixed entry replaces the
 * historical launcher. The production host deliberately does not inspect an
 * environment file.
 */
export function assertNoEnvAdminBaseOverride(_content: string): void {}

/** Compatibility seam with no environment-file I/O in the fixed-entry host. */
export async function preflightTask105L05EnvFile(_root: string): Promise<void> {}

function exactHttpReady(
  url: string,
  fetchImpl: typeof globalThis.fetch,
  timeoutMs = 2_000
): Promise<boolean> {
  return fetchImpl(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  })
    .then(async (response) => {
      await response.body?.cancel();
      return response.status === 200;
    })
    .catch(() => false);
}

export function task105L05Readiness(input: {
  readonly adminBase: string;
  readonly fetch?: typeof globalThis.fetch;
}): readonly SupervisedServerReadinessProbe[] {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  return Object.freeze([
    Object.freeze({
      // The core server answers the public site only for configured site hosts,
      // so a loopback Host on `/` is a permanent 404. The direct-core admin API
      // route — mounted at `resolveAdminPath()/api`, which the applied settings
      // lease pins to this suite's `adminBase` — is the core liveness signal
      // (same route the task-540 host probes as `api-front`).
      id: "task105-l05-front-ready",
      check: () =>
        exactHttpReady(
          `http://127.0.0.1:3000${input.adminBase}/api/auth/install/status`,
          fetchImpl,
          15_000
        ),
    }),
    Object.freeze({
      id: "task105-l05-admin-ready",
      // Derived from the validated dynamic base; never assumes /admin.
      check: () => exactHttpReady(`http://127.0.0.1:5173${input.adminBase}/`, fetchImpl),
    }),
    Object.freeze({
      id: "task105-l05-admin-api-ready",
      check: () =>
        exactHttpReady(
          `http://127.0.0.1:5173${input.adminBase}/api/auth/install/status`,
          fetchImpl
        ),
    }),
    Object.freeze({
      id: "task105-l05-site-vite-ready",
      check: () => exactHttpReady("http://127.0.0.1:5174/site/main.ts", fetchImpl),
    }),
  ]);
}

export function createTask105L05HostSpec(input: {
  readonly context: RuntimeSmokeContext;
  readonly adminBase: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly readinessTimeoutMs?: number;
}): SupervisedServerSpec {
  validateTask105L05AdminBase(input.context.input.session, input.adminBase);
  const executable = Object.freeze({
    kind: "fixed-bun-entry" as const,
    entry: TASK105_L05_FIXED_DEV_HOST_ENTRY,
  });
  assertTask105L05FixedDevHostCapability(executable);
  return Object.freeze({
    executable,
    args: Object.freeze([]),
    cwd: input.context.root,
    environment: Object.freeze({
      source: input.environment ?? process.env,
      policy: deriveTask105L05HostPolicy(input.adminBase),
    }),
    ports: Object.freeze([3000, 5173, 5174]),
    readiness: task105L05Readiness({ adminBase: input.adminBase }),
    readinessTimeoutMs: input.readinessTimeoutMs ?? 180_000,
    family: "task-105-l05-dev-host",
  });
}

export function startTask105L05DevHost(
  context: RuntimeSmokeContext,
  input: {
    readonly adminBase: string;
    readonly environment?: NodeJS.ProcessEnv;
    readonly start?: typeof startSupervisedServer;
  }
): Promise<SupervisedServerResource> {
  const start = input.start ?? startSupervisedServer;
  // Bun 1.4.0 can wedge dev-server socket startup for the WHOLE child process;
  // the fixed entry defends itself with a bounded listen race plus loopback
  // verification (see fixed-dev-host.ts). A process-level respawn here was
  // tried and removed: startSupervisedServer must register its resource BEFORE
  // spawning (cleanup safety), so any retry after a child death collides with
  // the lifecycle's single-name invariant ("lifecycle resource is duplicated").
  return start(
    context,
    createTask105L05HostSpec({
      context,
      adminBase: input.adminBase,
      environment: input.environment,
    })
  );
}
