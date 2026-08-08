import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { assertLocalOrigin, resolveInsideRoot, SmokeError } from "../../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../../lifecycle";

const DISPATCHER_SESSION_MAX_LENGTH = 48;

export interface WidgetWorkspacePaths {
  readonly root: string;
  readonly authState: string;
  readonly screenshots: string;
}

export class WidgetWorkspace implements LifecycleResource {
  readonly name: string;
  readonly paths: WidgetWorkspacePaths;
  #closed = false;

  private constructor(session: string, root: string) {
    this.name = `widget-workspace-${session}`;
    this.paths = Object.freeze({
      root,
      authState: join(root, "admin-auth-state.json"),
      screenshots: join(root, "screenshots"),
    });
  }

  static async create(context: RuntimeSmokeContext): Promise<WidgetWorkspace> {
    const parent = resolveInsideRoot(context.root, ".tmp/runtime-smoke", "widget workspace root");
    await mkdir(parent, { recursive: true });
    const session = resolvePlaywrightCliSessionName(context.input.session);
    const root = await mkdtemp(join(parent, `${session}-widget-`));
    await mkdir(join(root, "screenshots"), { mode: 0o700 });
    return new WidgetWorkspace(session, root);
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    await rm(this.paths.root, { recursive: true, force: true });
    this.#closed = true;
  }

  async proveAbsent(): Promise<boolean> {
    const entry = await lstat(this.paths.root).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    return this.#closed && entry === null;
  }
}

export function projectWidgetContractEnvironment(
  environment: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const path = environment.PATH;
  const email = environment.CODERSO_PLAYWRIGHT_EMAIL ?? environment.ADMIN_EMAIL;
  const password = environment.CODERSO_PLAYWRIGHT_PASSWORD ?? environment.ADMIN_PASSWORD;
  if (!path || !email || !password) {
    throw new SmokeError("smoke_argument_invalid", "widget smoke credentials are incomplete");
  }
  return Object.freeze({
    PATH: path,
    CODERSO_PLAYWRIGHT_EMAIL: email,
    CODERSO_PLAYWRIGHT_PASSWORD: password,
  });
}

export function resolvePlaywrightCliSessionName(session: string): string {
  const normalized = session
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "-")
    .replace(/^[^a-z0-9]+/u, "")
    .replace(/-+$/u, "");
  const safeSession = normalized.length >= 3 ? normalized : `wf-${normalized || "widget"}`;
  if (safeSession.length <= DISPATCHER_SESSION_MAX_LENGTH) return safeSession;
  const digest = createHash("sha256").update(safeSession).digest("hex").slice(0, 10);
  return `${safeSession.slice(0, DISPATCHER_SESSION_MAX_LENGTH - digest.length - 1)}-${digest}`;
}

export function resolveWidgetProbeSession(session: string): string {
  return resolvePlaywrightCliSessionName(`${session}-widget-public`);
}

export function resolveWidgetAdminSession(session: string, widgetType: string): string {
  return resolvePlaywrightCliSessionName(`${session}-${widgetType}`);
}

export async function checkWidgetUrl(
  value: string,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch
): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new SmokeError("smoke_argument_invalid", "widget URL is invalid", { cause: error });
  }
  assertLocalOrigin(url.origin);
  if (url.username || url.password || url.search || url.hash) {
    throw new SmokeError("smoke_argument_invalid", "widget URL credentials or query are invalid");
  }
  try {
    const response = await fetchImpl(url.href, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    await response.body?.cancel();
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}
