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
      // The shared dev host starts both vite instances with --force, so every
      // boot re-optimizes the admin dep graph in the background; the launcher
      // can also spend a long time resolving its DB admin-path fetch first.
      // Give the readiness phase the same budget as the certification profile
      // so a genuinely slow first boot is not mistaken for a dead server.
      healthTimeoutMs: 240_000,
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

// The dev host starts both vite instances with `--force`, so every boot the
// admin dep graph is re-scanned and re-bundled in the background. The SPA HTML
// and the non-dep entry module are served immediately, but the browser's
// requests for the pre-bundled dep modules (`.vite/deps/*.js?v=...`) only
// succeed after that optimization commits. If a browser scenario starts before
// then, the admin page cannot hydrate and the login flow races the optimizer.
// This probe waits for the real commit: it transforms the entry module, finds
// the pre-bundled dep URL it points at, and requires that dep to actually serve.
// The dep cache may live at `node_modules/.vite/deps` or — since the
// TASK-105-08-08-L07 cacheDir split — at `node_modules/.vite/task105-admin/deps`
// served via `/@fs/`; both forms must match.
const ADMIN_DEP_URL =
  /\/[^"'\s]+?node_modules\/\.vite\/(?:[\w.-]+\/)?deps\/[^"'\s]+?\.js\?v=[a-f0-9]+/u;

async function adminSpaWarmReady(
  adminPath: string,
  fetchImpl: typeof globalThis.fetch
): Promise<boolean> {
  const normalized = adminPath.length > 1 ? adminPath : "";
  const entryUrl = `http://127.0.0.1:5173${normalized}/main.tsx`;
  try {
    const entryResponse = await fetchImpl(entryUrl, {
      method: "GET",
      signal: AbortSignal.timeout(2_000),
    });
    if (entryResponse.status !== 200) {
      await entryResponse.body?.cancel();
      return false;
    }
    const source = await entryResponse.text();
    const match = source.match(ADMIN_DEP_URL);
    if (match === null) return false;
    return exactHttpReady(`http://127.0.0.1:5173${match[0]}`, fetchImpl);
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
    // The dev backend redirects every admin HTML request to the vite dev
    // server (307) when `adminDevUrl` is set, so `{adminPath}/` can never
    // return 200. Probe the real admin API router instead: the auth install
    // status endpoint is an always-200 backend route (mirrors TASK-540) and
    // proves the API surface is actually serving on this admin path.
    Object.freeze({
      id: "task488-api-ready",
      check: () =>
        exactHttpReady(`http://127.0.0.1:3000${normalized}/api/auth/install/status`, fetchImpl),
    }),
    // Wait for the forced-optimization commit so browser scenarios never race
    // the background dep bundling (see adminSpaWarmReady above).
    Object.freeze({
      id: "task488-admin-spa-warm",
      check: () => adminSpaWarmReady(adminPath, fetchImpl),
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
