import { SmokeError, type SmokeProfileId } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import {
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
  startSupervisedServer,
  type SupervisedServerReadinessProbe,
  type SupervisedServerResource,
  type SupervisedServerSpec,
} from "../../server/supervised-server";

export interface Task488TimingPolicy {
  readonly healthTimeoutMs: number;
  readonly browserDispatchTimeoutMs: number;
}

export function task488TimingPolicy(profile: SmokeProfileId): Task488TimingPolicy {
  if (profile === "fast") {
    return Object.freeze({
      healthTimeoutMs: 120_000,
      browserDispatchTimeoutMs: 90_000,
    });
  }
  throw new SmokeError("smoke_argument_invalid", "TASK-488 timing profile is unsupported");
}

async function exactHttpReady(
  url: string,
  fetchImpl: typeof globalThis.fetch,
  requestTimeoutMs = 2_000
): Promise<boolean> {
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    await response.body?.cancel();
    return response.status === 200;
  } catch {
    return false;
  }
}

export function task488Readiness(
  adminPath: string,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch
): readonly SupervisedServerReadinessProbe[] {
  const normalized = adminPath.length > 1 ? adminPath : "";
  return Object.freeze([
    Object.freeze({
      id: "task488-admin-ready",
      check: () => exactHttpReady(`http://127.0.0.1:5173${normalized}/`, fetchImpl),
    }),
    Object.freeze({
      id: "task488-api-ready",
      check: () => exactHttpReady(`http://127.0.0.1:3000${normalized}/`, fetchImpl),
    }),
  ]);
}

export function createTask488HostSpec(input: {
  readonly context: RuntimeSmokeContext;
  readonly environment: NodeJS.ProcessEnv;
  readonly adminPath: string;
  readonly timing: Task488TimingPolicy;
  readonly fetch?: typeof globalThis.fetch;
}): SupervisedServerSpec {
  return Object.freeze({
    executable: Object.freeze({ kind: "path-literal" as const, name: "coderso-dev-core-host" }),
    args: Object.freeze([input.context.root]),
    cwd: input.context.root,
    environment: Object.freeze({
      source: input.environment,
      policy: CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
    }),
    ports: Object.freeze([3000, 5173]),
    readiness: task488Readiness(input.adminPath, input.fetch),
    readinessTimeoutMs: input.timing.healthTimeoutMs,
    family: "task488-dev-host",
  });
}

export function startTask488DevHost(
  context: RuntimeSmokeContext,
  input: {
    readonly environment?: NodeJS.ProcessEnv;
    readonly adminPath: string;
    readonly timing?: Task488TimingPolicy;
    readonly fetch?: typeof globalThis.fetch;
    readonly start?: typeof startSupervisedServer;
  }
): Promise<SupervisedServerResource> {
  const timing = input.timing ?? task488TimingPolicy(context.input.profile);
  return (input.start ?? startSupervisedServer)(
    context,
    createTask488HostSpec({
      context,
      environment: input.environment ?? process.env,
      adminPath: input.adminPath,
      timing,
      fetch: input.fetch,
    })
  );
}
