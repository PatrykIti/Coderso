// TASK-580-03-L07 detail-page-v2 dev-host composition.
// Reuses the shared supervised server (single lifecycle owner) with the
// standard dev host launcher and readiness probes for front/admin/site-vite.
import { SmokeError, type SmokeProfileId } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import {
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
  startSupervisedServer,
  type SupervisedServerReadinessProbe,
  type SupervisedServerResource,
  type SupervisedServerSpec,
} from "../../server/supervised-server";

export interface DetailPageV2TimingPolicy {
  readonly healthTimeoutMs: number;
}

export function detailPageV2TimingPolicy(profile: SmokeProfileId): DetailPageV2TimingPolicy {
  if (profile === "fast") {
    return Object.freeze({ healthTimeoutMs: 120_000 });
  }
  if (profile === "certification") {
    return Object.freeze({ healthTimeoutMs: 240_000 });
  }
  throw new SmokeError("smoke_argument_invalid", "detail-page-v2 timing profile is unsupported");
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

export function detailPageV2Readiness(
  fetchImpl: typeof globalThis.fetch = globalThis.fetch
): readonly SupervisedServerReadinessProbe[] {
  return Object.freeze([
    Object.freeze({
      id: "detail-page-v2-front-ready",
      // The public root exercises the complete SSR read model. A freshly
      // installed site with no home page yet legitimately answers 404 while
      // the detail-page runtime itself is healthy; the scenarios then assert
      // 200 on real detail URLs. Accept either live response, never a
      // connection error.
      check: async () => {
        const status = await httpStatus("http://127.0.0.1:3000/", fetchImpl, 15_000);
        return status === 200 || status === 404;
      },
    }),
    Object.freeze({
      id: "detail-page-v2-admin-ready",
      check: () => exactHttpReady("http://127.0.0.1:5173/admin/", fetchImpl),
    }),
    Object.freeze({
      id: "detail-page-v2-site-vite-ready",
      check: () => exactHttpReady("http://127.0.0.1:5174/site/main.ts", fetchImpl),
    }),
  ]);
}

async function httpStatus(
  url: string,
  fetchImpl: typeof globalThis.fetch,
  requestTimeoutMs: number
): Promise<number | null> {
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    await response.body?.cancel();
    return response.status;
  } catch {
    return null;
  }
}

export function createDetailPageV2HostSpec(input: {
  readonly context: RuntimeSmokeContext;
  readonly environment: NodeJS.ProcessEnv;
  readonly timing: DetailPageV2TimingPolicy;
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
    readiness: detailPageV2Readiness(input.fetch),
    readinessTimeoutMs: input.timing.healthTimeoutMs,
    family: "detail-page-v2-dev-host",
  });
}

export function startDetailPageV2DevHost(
  context: RuntimeSmokeContext,
  input: {
    readonly environment?: NodeJS.ProcessEnv;
    readonly timing?: DetailPageV2TimingPolicy;
    readonly fetch?: typeof globalThis.fetch;
    readonly start?: typeof startSupervisedServer;
  } = {}
): Promise<SupervisedServerResource> {
  const timing = input.timing ?? detailPageV2TimingPolicy(context.input.profile);
  return (input.start ?? startSupervisedServer)(
    context,
    createDetailPageV2HostSpec({
      context,
      environment: input.environment ?? process.env,
      timing,
      fetch: input.fetch,
    })
  );
}
