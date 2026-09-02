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
import { SmokeError } from "../../contracts";

/**
 * TASK-105 L08 fixed-entry dev-host policy derivation
 * (contract: TASK-105-08-08-L07).
 *
 * The suite derives a distinct immutable `task-105-l08-dev-host` policy from
 * the shared `CODERSO_DEV_HOST_ENVIRONMENT_POLICY`, preserving its allowlisted
 * input sets and fixed values except for the exact fixed
 * `VITE_ADMIN_BASE_PATH: "${adminBase}/"`. It never mutates the shared policy
 * nor reads an ambient `VITE_ADMIN_BASE_PATH`. The shared supervisor resolves
 * an absolute Bun executable and launches the fixed entry with only this
 * projected environment.
 */

export interface Task105L08HostPolicy {
  readonly id: "task-105-l08-dev-host";
  readonly required: readonly string[];
  readonly optional: readonly string[];
  readonly inherited: readonly string[];
  readonly fixed: Readonly<Record<string, string>>;
}

const ADMIN_BASE = /^\/[a-z0-9][a-z0-9-]{2,63}$/u;

/** Validates the session-derived, non-default task-local admin base path. */
export function validateTask105L08AdminBase(session: string, candidate: string): string {
  const expected = `/${session}-admin`;
  if (
    typeof candidate !== "string" ||
    candidate !== expected ||
    !ADMIN_BASE.test(candidate) ||
    candidate.includes(".") ||
    candidate.includes("%") ||
    candidate.includes("?") ||
    candidate.includes("#") ||
    candidate === "/admin"
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L08 admin base path is invalid");
  }
  return expected;
}

export function deriveTask105L08HostPolicy(adminBase: string): Task105L08HostPolicy {
  const shared = CODERSO_DEV_HOST_ENVIRONMENT_POLICY;
  return Object.freeze({
    id: "task-105-l08-dev-host" as const,
    required: shared.required,
    optional: shared.optional,
    inherited: shared.inherited,
    fixed: Object.freeze({
      ...shared.fixed,
      VITE_ADMIN_BASE_PATH: `${adminBase}/`,
    }),
  });
}

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

export const TASK_105_L08_PUBLIC_ORIGIN = "http://127.0.0.1:3000";
export const TASK_105_L08_ADMIN_ORIGIN = "http://127.0.0.1:5173";

export function task105L08Readiness(input: {
  readonly adminBase: string;
  readonly fetch?: typeof globalThis.fetch;
}): readonly SupervisedServerReadinessProbe[] {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  return Object.freeze([
    Object.freeze({
      // The core server answers the public site only for configured site hosts,
      // so a loopback Host on `/` is a permanent 404. The direct-core admin API
      // route — mounted at `resolveAdminPath()/api`, which the applied fixture
      // pins to this suite's `adminBase` — is the core liveness signal (same
      // route the task-540 host probes as `api-front`).
      id: "task105-l08-front-ready",
      check: () =>
        exactHttpReady(
          `${TASK_105_L08_PUBLIC_ORIGIN}${input.adminBase}/api/auth/install/status`,
          fetchImpl,
          15_000
        ),
    }),
    Object.freeze({
      id: "task105-l08-admin-ready",
      // Derived from the validated dynamic base; never assumes /admin.
      check: () => exactHttpReady(`${TASK_105_L08_ADMIN_ORIGIN}${input.adminBase}/`, fetchImpl),
    }),
    Object.freeze({
      id: "task105-l08-admin-api-ready",
      check: () =>
        exactHttpReady(
          `${TASK_105_L08_ADMIN_ORIGIN}${input.adminBase}/api/auth/install/status`,
          fetchImpl
        ),
    }),
    Object.freeze({
      id: "task105-l08-site-vite-ready",
      check: () => exactHttpReady("http://127.0.0.1:5174/site/main.ts", fetchImpl),
    }),
  ]);
}

export function createTask105L08HostSpec(input: {
  readonly context: RuntimeSmokeContext;
  readonly adminBase: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly readinessTimeoutMs?: number;
}): SupervisedServerSpec {
  validateTask105L08AdminBase(input.context.input.session, input.adminBase);
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
      policy: deriveTask105L08HostPolicy(input.adminBase),
    }),
    ports: Object.freeze([3000, 5173, 5174]),
    readiness: task105L08Readiness({ adminBase: input.adminBase }),
    // Cold vite optimizeDeps plus the first core-server compile can exceed the
    // L05 default on a loaded host; five minutes bounds a boot that is making
    // progress without masking a crashed child (an unexpected exit fails the
    // poll immediately through the shared supervisor).
    readinessTimeoutMs: input.readinessTimeoutMs ?? 300_000,
    family: "task-105-l08-dev-host",
  });
}

export function startTask105L08DevHost(
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
    createTask105L08HostSpec({
      context,
      adminBase: input.adminBase,
      environment: input.environment,
    })
  );
}
