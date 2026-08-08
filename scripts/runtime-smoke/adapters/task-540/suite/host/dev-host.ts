import { SmokeError } from "../../../../contracts";
import type { RuntimeSmokeContext } from "../../../../lifecycle";
import {
  startSupervisedServer,
  TASK540_DEV_HOST_ENVIRONMENT_POLICY,
  type SupervisedServerResource,
} from "../../../../server/supervised-server";

const READINESS = Object.freeze([
  Object.freeze({ id: "admin", url: "http://127.0.0.1:5173/admin" }),
  Object.freeze({
    id: "api-front",
    url: "http://127.0.0.1:3000/admin/api/auth/install/status",
  }),
  Object.freeze({ id: "site", url: "http://127.0.0.1:5174/" }),
]);

async function probeLoopback(url: string, fetchImpl: typeof globalThis.fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(1_000),
    });
    await response.body?.cancel();
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

export async function startTask540DevHost(
  context: RuntimeSmokeContext,
  input: {
    readonly environment?: NodeJS.ProcessEnv;
    readonly fetch?: typeof globalThis.fetch;
    readonly isPortAvailable?: (port: number) => Promise<boolean>;
  } = {}
): Promise<SupervisedServerResource> {
  if (context.input.suite !== "task-540") {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 host has the wrong suite");
  }
  const fetchImpl = input.fetch ?? globalThis.fetch;
  return startSupervisedServer(context, {
    executable: { kind: "path-literal", name: "coderso-dev-core-host" },
    args: [context.root],
    cwd: context.root,
    environment: {
      source: input.environment ?? process.env,
      policy: TASK540_DEV_HOST_ENVIRONMENT_POLICY,
    },
    ports: [3000, 5173, 5174],
    readiness: READINESS.map(({ id, url }) =>
      Object.freeze({ id, check: () => probeLoopback(url, fetchImpl) })
    ),
    family: "task540-dev-host",
    readinessTimeoutMs: context.input.profile === "fast" ? 180_000 : 360_000,
    portReleaseTimeoutMs: 15_000,
    maximumLogBytes: 4 * 1024 * 1024,
    ...(input.isPortAvailable === undefined ? {} : { isPortAvailable: input.isPortAvailable }),
  });
}
