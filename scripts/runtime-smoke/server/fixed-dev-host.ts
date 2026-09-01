import { connect } from "node:net";
import { resolve } from "node:path";

type ViteDevServer = import("vite").ViteDevServer;

interface FixedCoreServer {
  stop(closeActiveConnections?: boolean): void;
}

/**
 * Fixed, programmatic development host for the TASK-105 L05 smoke.
 *
 * The shared supervisor starts this exact entry through an absolute Bun
 * executable. It deliberately has no command-wrapper, package-script, or
 * environment-file loading path: both Vite instances have that loading
 * disabled and the supervisor supplies the complete allowlisted environment.
 */

export const TASK105_L05_FIXED_DEV_HOST_ENTRY =
  "scripts/runtime-smoke/server/fixed-dev-host.ts" as const;

const ADMIN_BASE_PATH = /^\/[a-z0-9][a-z0-9-]{2,63}-admin\/$/u;
const ADMIN_VITE_PORT = 5173;
const CORE_PORT = 3000;
const SITE_VITE_PORT = 5174;

const FORBIDDEN_SOURCE_FORMS = Object.freeze([
  new RegExp(["\\b", "Bun", "\\s*\\.\\s*", "spawn", "\\b"].join(""), "u"),
  /\bBun\s*\.\s*spawnSync\s*\(/u,
  /\bBun\s*\.\s*\$\s*/u,
  new RegExp(["\\b", "bun", "x", "\\b"].join(""), "iu"),
  new RegExp(["\\b", "bun", "\\s+", "run", "\\b"].join(""), "iu"),
  new RegExp(["\\b", "dot", "env", "\\b"].join(""), "iu"),
  new RegExp(["\\b", "load", "Env", "\\b"].join(""), "u"),
  /\bprocess\s*\.\s*loadEnvFile\s*\(/u,
  /\benvFile\s*:\s*true\b/u,
]);

function fail(message: string): never {
  throw new Error(`task105_l05_fixed_dev_host_${message}`);
}

/**
 * The supervisor invokes this before spawning the entry. Keeping the source
 * inventory close to the entry makes prohibited launch forms fail closed even
 * if a future edit accidentally reintroduces one.
 */
export function assertTask105L05FixedDevHostSourceInventory(source: string): void {
  if (
    typeof source !== "string" ||
    source.length === 0 ||
    Buffer.byteLength(source, "utf8") > 64 * 1024
  ) {
    fail("source_invalid");
  }
  if (FORBIDDEN_SOURCE_FORMS.some((pattern) => pattern.test(source))) {
    fail("source_forbidden");
  }
  const envFileFalseCount = source.match(/\benvFile\s*:\s*false\b/gu)?.length ?? 0;
  if (envFileFalseCount < 1) fail("source_env_file_policy_invalid");
}

function assertFixedEnvironment(): string {
  const adminBase = process.env.VITE_ADMIN_BASE_PATH;
  if (
    typeof adminBase !== "string" ||
    !ADMIN_BASE_PATH.test(adminBase) ||
    adminBase === "/admin/" ||
    process.env.PORT !== String(CORE_PORT) ||
    process.env.VITE_DEV_SERVER_URL !== `http://127.0.0.1:${ADMIN_VITE_PORT}` ||
    process.env.VITE_SITE_DEV_SERVER_URL !== `http://127.0.0.1:${SITE_VITE_PORT}` ||
    process.env.VITE_API_ORIGIN !== `http://127.0.0.1:${CORE_PORT}`
  ) {
    fail("environment_invalid");
  }
  return adminBase;
}

function assertNoArguments(): void {
  const argv = typeof Bun === "undefined" ? process.argv.slice(2) : Bun.argv.slice(2);
  if (argv.length !== 0) fail("arguments_invalid");
}

/**
 * Bun's node-compatible `listen` can resolve without the loopback socket ever
 * becoming reachable (observed on bun 1.4.0 with Vite dev servers: the listen
 * promise settles while nothing is bound on the port). The supervisor's
 * readiness probes would then poll a dead port for the whole readiness window
 * and the run would be reported failed with no server-side signal at all.
 * Every Vite open is therefore verified by an actual loopback connection and
 * retried a bounded number of times before the entry fails loudly.
 */
async function loopbackPortAccepts(port: number): Promise<boolean> {
  return new Promise<boolean>((resolveProbe) => {
    const socket = connect({ host: "127.0.0.1", port });
    const settle = (accepted: boolean): void => {
      socket.destroy();
      resolveProbe(accepted);
    };
    socket.once("connect", () => settle(true));
    socket.once("error", () => settle(false));
    setTimeout(() => settle(false), 1_200);
  });
}

async function waitForLoopbackListener(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await loopbackPortAccepts(port)) return true;
    await new Promise<void>((resolveWait) => setTimeout(resolveWait, 250));
  }
  return loopbackPortAccepts(port);
}

async function closeWithTimeout(server: ViteDevServer, timeoutMs: number): Promise<void> {
  await Promise.race([
    server.close().catch(() => undefined),
    new Promise<void>((resolveClose) => setTimeout(resolveClose, timeoutMs)),
  ]);
}

async function createFixedViteServer(input: {
  readonly configFile: string;
  readonly port: number;
  readonly label: string;
}): Promise<ViteDevServer> {
  const { createServer } = await import("vite");
  // The same Bun flake has a second mode where `listen()` never settles at all;
  // a healthy dev server binds in well under a second, so a hung listen is
  // abandoned quickly and retried instead of burning the whole start budget.
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const server = await createServer({
      configFile: input.configFile,
      envFile: false,
      server: {
        host: "127.0.0.1",
        port: input.port,
        strictPort: true,
      },
    });
    try {
      await Promise.race([
        server.listen(),
        new Promise<never>((_, rejectListen) =>
          setTimeout(() => rejectListen(new Error("vite listen timeout")), 8_000)
        ),
      ]);
    } catch {
      await closeWithTimeout(server, 3_000);
      continue;
    }
    if (await waitForLoopbackListener(input.port, 4_000)) return server;
    await closeWithTimeout(server, 3_000);
    await new Promise<void>((resolveWait) => setTimeout(resolveWait, 300));
  }
  return fail(`${input.label}_listen_failed_attempts_exhausted`);
}

async function closeServers(input: {
  readonly admin: ViteDevServer | null;
  readonly site: ViteDevServer | null;
  readonly core: FixedCoreServer | null;
}): Promise<void> {
  await Promise.allSettled([input.admin?.close(), input.site?.close()]);
  input.core?.stop(true);
}

export async function runTask105L05FixedDevHost(): Promise<void> {
  assertNoArguments();
  assertFixedEnvironment();

  const root = process.cwd();
  const coreRoot = resolve(root, "core");
  let admin: ViteDevServer | null = null;
  let site: ViteDevServer | null = null;
  let core: FixedCoreServer | null = null;
  let closing = false;

  const close = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    await closeServers({ admin, site, core });
  };
  const terminate = (): void => {
    void close().finally(() => {
      process.exitCode = 0;
    });
  };

  try {
    admin = await createFixedViteServer({
      configFile: resolve(coreRoot, "vite.config.ts"),
      port: ADMIN_VITE_PORT,
      label: "admin_vite",
    });
    site = await createFixedViteServer({
      configFile: resolve(coreRoot, "vite.site.config.ts"),
      port: SITE_VITE_PORT,
      label: "site_vite",
    });
    const { startHttpServer } = await import("../../../core/server/httpServer");
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      core = startHttpServer({
        port: CORE_PORT,
        adminDevUrl: `http://127.0.0.1:${ADMIN_VITE_PORT}`,
      });
      if (await waitForLoopbackListener(CORE_PORT, 4_000)) break;
      core.stop(true);
      core = null;
      await new Promise<void>((resolveWait) => setTimeout(resolveWait, 300));
      if (attempt === 4) fail("core_listen_failed");
    }
    process.once("SIGINT", terminate);
    process.once("SIGTERM", terminate);
  } catch (error) {
    await close();
    throw error;
  }

  await new Promise<void>(() => {});
}

if (import.meta.main) {
  void runTask105L05FixedDevHost().catch((error: unknown) => {
    // The generic line keeps the supervisor's stable marker; the reason line
    // names the exact stage (`task105_l05_fixed_dev_host_<label>_listen_failed`)
    // so a start failure is diagnosable from the captured server log alone.
    process.stderr.write("task105_l05_fixed_dev_host_failed\n");
    process.stderr.write(
      `task105_l05_fixed_dev_host_reason: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
}
