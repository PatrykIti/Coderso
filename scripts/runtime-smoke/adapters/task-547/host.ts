import { SmokeError, type SmokeProfileId } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import {
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
  startSupervisedServer,
  type SupervisedServerReadinessProbe,
  type SupervisedServerResource,
  type SupervisedServerSpec,
} from "../../server/supervised-server";

export interface Task547TimingPolicy {
  readonly healthTimeoutMs: number;
  readonly authTimeoutMs: number;
  readonly browserDispatchTimeoutMs: number;
}

export function task547TimingPolicy(profile: SmokeProfileId): Task547TimingPolicy {
  if (profile === "fast") {
    return Object.freeze({
      healthTimeoutMs: 120_000,
      authTimeoutMs: 15_000,
      browserDispatchTimeoutMs: 90_000,
    });
  }
  if (profile === "certification") {
    return Object.freeze({
      healthTimeoutMs: 240_000,
      authTimeoutMs: 30_000,
      browserDispatchTimeoutMs: 120_000,
    });
  }
  throw new SmokeError("smoke_argument_invalid", "TASK-547 timing profile is unsupported");
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

export function task547Readiness(
  fetchImpl: typeof globalThis.fetch = globalThis.fetch
): readonly SupervisedServerReadinessProbe[] {
  return Object.freeze([
    Object.freeze({
      id: "task547-front-ready",
      // The public root exercises the complete SSR read model. A freshly
      // installed site can legitimately need a few seconds on its first render,
      // so do not apply the lightweight Vite probe timeout to this request.
      check: () => exactHttpReady("http://127.0.0.1:3000/", fetchImpl, 15_000),
    }),
    Object.freeze({
      id: "task547-admin-ready",
      check: () => exactHttpReady("http://127.0.0.1:5173/admin/", fetchImpl),
    }),
    Object.freeze({
      id: "task547-site-vite-ready",
      check: () => exactHttpReady("http://127.0.0.1:5174/site/main.ts", fetchImpl),
    }),
  ]);
}

export function createTask547HostSpec(input: {
  readonly context: RuntimeSmokeContext;
  readonly environment: NodeJS.ProcessEnv;
  readonly timing: Task547TimingPolicy;
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
    readiness: task547Readiness(input.fetch),
    readinessTimeoutMs: input.timing.healthTimeoutMs,
    family: "task547-dev-host",
  });
}

export function startTask547DevHost(
  context: RuntimeSmokeContext,
  input: {
    readonly environment?: NodeJS.ProcessEnv;
    readonly timing?: Task547TimingPolicy;
    readonly fetch?: typeof globalThis.fetch;
    readonly start?: typeof startSupervisedServer;
  } = {}
): Promise<SupervisedServerResource> {
  const timing = input.timing ?? task547TimingPolicy(context.input.profile);
  return (input.start ?? startSupervisedServer)(
    context,
    createTask547HostSpec({
      context,
      environment: input.environment ?? process.env,
      timing,
      fetch: input.fetch,
    })
  );
}
