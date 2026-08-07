import { resolveInsideRoot, SmokeError } from "../../../../contracts";
import type { RuntimeSmokeContext } from "../../../../lifecycle";
import { resolveExecutableOnPath } from "../../../../process-supervisor";
import { WorkerPool, type WorkerProfileSpec } from "../../../../workers/pool";
import { TASK540_OPERATION_PROFILE_IDS } from "../../operations/contracts";
import { createTask540WorkerRegistry } from "../../worker-entry";

const DATABASE_KEYS = Object.freeze([
  "DATABASE_URL",
  "PII_HASH_KEY",
  "PII_ENC_KEY",
  "MEDIA_SECRET_MASTER_KEY",
]);

const OPTIONAL_KEYS = Object.freeze([
  "AUTH_PASSWORD_PEPPER",
  "MEDIA_BASE_URL",
  "MEDIA_ALLOWED_MIME",
  "MEDIA_MAX_SIZE_BYTES",
  "THEMES_DIR",
  "PLUGINS_RUNTIME_DIR",
]);

function requireEnvironment(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 worker environment is incomplete");
  }
  return value;
}

function databaseEnvironment(
  source: NodeJS.ProcessEnv,
  profileId: (typeof TASK540_OPERATION_PROFILE_IDS)[number]
): Readonly<Record<string, string>> {
  const output: Record<string, string> = {
    PATH: requireEnvironment(source, "PATH"),
    DB_POOL_MAX: "1",
  };
  for (const key of DATABASE_KEYS) output[key] = requireEnvironment(source, key);
  for (const key of OPTIONAL_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && !value.includes("\0")) output[key] = value;
  }
  if (profileId === "user-provisioning") {
    output.ADMIN_PASSWORD = requireEnvironment(source, "ADMIN_PASSWORD");
  }
  if (profileId === "bootstrap-preflight") {
    output.ADMIN_EMAIL = requireEnvironment(source, "ADMIN_EMAIL");
  }
  return Object.freeze(output);
}

function profiles(root: string, source: NodeJS.ProcessEnv): readonly WorkerProfileSpec[] {
  const entryFile = resolveInsideRoot(
    root,
    "scripts/runtime-smoke/adapters/task-540/worker-entry.ts",
    "TASK-540 worker entry"
  );
  return Object.freeze(
    TASK540_OPERATION_PROFILE_IDS.map((profileId) =>
      Object.freeze({
        profileId,
        databaseBearing: profileId !== "schema-only",
        privileged: profileId === "user-identity-proof" || profileId === "user-provisioning",
        entryFile,
        cwd: root,
        family: `task540-worker-${profileId}`,
        requestTimeoutMs: 90_000,
        environment:
          profileId === "schema-only"
            ? Object.freeze({ PATH: requireEnvironment(source, "PATH") })
            : () => databaseEnvironment(source, profileId),
      })
    )
  );
}

export async function createTask540NativeWorkerPool(
  context: RuntimeSmokeContext,
  source: NodeJS.ProcessEnv = process.env
): Promise<WorkerPool> {
  const executable = await resolveExecutableOnPath("bun", requireEnvironment(source, "PATH"));
  return WorkerPool.create({
    root: context.root,
    executable,
    supervisor: context.processes,
    registry: createTask540WorkerRegistry("schema-only"),
    profiles: profiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}
