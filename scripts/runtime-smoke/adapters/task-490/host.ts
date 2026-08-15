import { SmokeError, type SmokeProfileId } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import {
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
  startSupervisedServer,
  type SupervisedServerReadinessProbe,
  type SupervisedServerResource,
  type SupervisedServerSpec,
} from "../../server/supervised-server";

export interface Task490TimingPolicy {
  readonly healthTimeoutMs: number;
  readonly browserDispatchTimeoutMs: number;
}

export function task490TimingPolicy(profile: SmokeProfileId): Task490TimingPolicy {
  if (profile === "fast") {
    return Object.freeze({
      healthTimeoutMs: 120_000,
      browserDispatchTimeoutMs: 180_000,
    });
  }
  if (profile === "certification") {
    return Object.freeze({
      healthTimeoutMs: 240_000,
      browserDispatchTimeoutMs: 300_000,
    });
  }
  throw new SmokeError("smoke_argument_invalid", "TASK-490 timing profile is unsupported");
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

export function task490Readiness(
  fetchImpl: typeof globalThis.fetch = globalThis.fetch
): readonly SupervisedServerReadinessProbe[] {
  return Object.freeze([
    Object.freeze({
      id: "task490-front-ready",
      // The public root exercises the complete SSR read model. A freshly
      // installed site can legitimately need a few seconds on its first render.
      check: () => exactHttpReady("http://127.0.0.1:3000/", fetchImpl, 15_000),
    }),
    Object.freeze({
      id: "task490-admin-ready",
      check: () => exactHttpReady("http://127.0.0.1:5173/admin/", fetchImpl),
    }),
    Object.freeze({
      id: "task490-site-vite-ready",
      check: () => exactHttpReady("http://127.0.0.1:5174/site/main.ts", fetchImpl),
    }),
  ]);
}

export function createTask490HostSpec(input: {
  readonly context: RuntimeSmokeContext;
  readonly environment: NodeJS.ProcessEnv;
  readonly timing: Task490TimingPolicy;
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
    ports: Object.freeze([3000, 5173, 5174]),
    readiness: task490Readiness(input.fetch),
    readinessTimeoutMs: input.timing.healthTimeoutMs,
    family: "task490-dev-host",
  });
}

export function startTask490DevHost(
  context: RuntimeSmokeContext,
  input: {
    readonly environment?: NodeJS.ProcessEnv;
    readonly timing?: Task490TimingPolicy;
    readonly fetch?: typeof globalThis.fetch;
    readonly start?: typeof startSupervisedServer;
  } = {}
): Promise<SupervisedServerResource> {
  const timing = input.timing ?? task490TimingPolicy(context.input.profile);
  return (input.start ?? startSupervisedServer)(
    context,
    createTask490HostSpec({
      context,
      environment: input.environment ?? process.env,
      timing,
      fetch: input.fetch,
    })
  );
}
