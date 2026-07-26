import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

export const STARTUP_ASSISTANT_DOCS_ENV = "CODERSO_ASSISTANT_DOCS_REINDEX_ON_START";
export const STARTUP_ASSISTANT_DOCS_SOURCE_ROOT_ENV = "CODERSO_ASSISTANT_DOCS_SOURCE_ROOT";
export const STARTUP_ASSISTANT_DOCS_IMAGE_VERSION_ENV = "CODERSO_IMAGE_VERSION";

const DISABLED_STARTUP_ASSISTANT_DOCS_VALUES = new Set([
  "0",
  "false",
  "no",
  "off",
  "skip",
  "disabled",
]);
const DEFAULT_STARTUP_ASSISTANT_DOCS_SOURCE_ROOT = "docs/guide";
const STARTUP_ASSISTANT_DOCS_STATE_KEY = "assistant.docs.startupReindexState";
const STARTUP_ASSISTANT_DOCS_LOCK_NAMESPACE = 20260604;
const STARTUP_ASSISTANT_DOCS_LOCK_KEY = 403;

/**
 * Session-lock purpose id (see `core/db/connectionTargets.ts`).
 *
 * This lock CANNOT become `pg_advisory_xact_lock`: the guarded region reads the
 * reindex state, walks the docs tree off disk and upserts hundreds of rows
 * through the shared pooled client, then writes the state — many transactions,
 * not one. Collapsing it into a single transaction would also hold a write
 * transaction open for the entire boot.
 */
export const STARTUP_ASSISTANT_DOCS_SESSION_PURPOSE = "startup assistant docs reindex";

type EnvMap = Record<string, string | undefined>;

export type StartupAssistantDocsDecision = {
  enabled: boolean;
  reason: string;
};

export type StartupAssistantDocsState = {
  imageVersion: string;
  sourceRoot: string;
  docsFingerprint: string;
  completedAt: string;
};

export type StartupAssistantDocsReindexInput = {
  sourceRoot: string;
  cwd: string;
};

export type StartupAssistantDocsReindexResult = {
  status: "success" | "partial" | "failed";
  docsUpserted: number;
  chunksUpserted: number;
};

export type StartupAssistantDocsResult =
  | {
      ran: false;
      reason: string;
      imageVersion?: string;
      docsFingerprint?: string;
    }
  | {
      ran: true;
      sourceRoot: string;
      imageVersion: string;
      docsFingerprint: string;
      docsUpserted: number;
      chunksUpserted: number;
    };

export type StartupAssistantDocsLogger = Pick<Console, "error" | "log">;

export type StartupAssistantDocsDeps = {
  computeFingerprint: (input: StartupAssistantDocsReindexInput) => Promise<string>;
  readState: () => Promise<StartupAssistantDocsState | null>;
  writeState: (state: StartupAssistantDocsState) => Promise<void>;
  reindex: (input: StartupAssistantDocsReindexInput) => Promise<StartupAssistantDocsReindexResult>;
  withLock: <T>(action: () => Promise<T>) => Promise<T>;
};

export type RunStartupAssistantDocsOptions = {
  cwd?: string;
  env?: EnvMap;
  logger?: StartupAssistantDocsLogger;
  deps?: Partial<StartupAssistantDocsDeps>;
};

const toUnixPath = (value: string) => value.replace(/\\/g, "/");

const normalizeOptionalString = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

export function resolveStartupAssistantDocsDecision(
  env: EnvMap = process.env
): StartupAssistantDocsDecision {
  const rawValue = env[STARTUP_ASSISTANT_DOCS_ENV]?.trim().toLowerCase();
  if (rawValue && DISABLED_STARTUP_ASSISTANT_DOCS_VALUES.has(rawValue)) {
    return {
      enabled: false,
      reason: `${STARTUP_ASSISTANT_DOCS_ENV}=${rawValue}`,
    };
  }
  return {
    enabled: true,
    reason: rawValue ? `${STARTUP_ASSISTANT_DOCS_ENV}=${rawValue}` : "default_enabled",
  };
}

export function resolveStartupAssistantDocsSourceRoot(env: EnvMap = process.env): string {
  return (
    normalizeOptionalString(env[STARTUP_ASSISTANT_DOCS_SOURCE_ROOT_ENV]) ??
    DEFAULT_STARTUP_ASSISTANT_DOCS_SOURCE_ROOT
  );
}

export function resolveStartupAssistantDocsImageVersion(env: EnvMap = process.env): string {
  return (
    normalizeOptionalString(env[STARTUP_ASSISTANT_DOCS_IMAGE_VERSION_ENV]) ??
    normalizeOptionalString(env.CORE_VERSION) ??
    normalizeOptionalString(env.APP_VERSION) ??
    "dev"
  );
}

export function isStartupAssistantDocsState(value: unknown): value is StartupAssistantDocsState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.imageVersion === "string" &&
    typeof record.sourceRoot === "string" &&
    typeof record.docsFingerprint === "string" &&
    typeof record.completedAt === "string"
  );
}

const collectMarkdownFiles = async (targetPath: string): Promise<string[]> => {
  const targetStat = await stat(targetPath);
  if (targetStat.isFile()) {
    return targetPath.toLowerCase().endsWith(".md") ? [targetPath] : [];
  }
  if (!targetStat.isDirectory()) return [];

  const files: string[] = [];
  const entries = await readdir(targetPath, { withFileTypes: true });
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of sortedEntries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const entryPath = resolve(targetPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(entryPath);
    }
  }
  return files;
};

const resolveAssistantDocsRootPath = async (sourceRoot: string, cwd: string) => {
  const candidates = [resolve(cwd, sourceRoot), resolve(cwd, "..", sourceRoot)];
  for (const candidate of candidates) {
    try {
      await stat(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error("assistant_startup_docs_source_missing");
};

export async function computeAssistantDocsFingerprint({
  sourceRoot,
  cwd,
}: StartupAssistantDocsReindexInput): Promise<string> {
  const absoluteRoot = await resolveAssistantDocsRootPath(sourceRoot, cwd);
  const files = await collectMarkdownFiles(absoluteRoot);
  const hash = createHash("sha256");
  hash.update(toUnixPath(sourceRoot));
  for (const file of files) {
    const relativePath = toUnixPath(file.slice(absoluteRoot.length + 1));
    hash.update("\n");
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}

async function readStartupAssistantDocsState(): Promise<StartupAssistantDocsState | null> {
  const [{ db }, { settings }] = await Promise.all([
    import("../db/client"),
    import("../db/schema"),
  ]);
  const { eq } = await import("drizzle-orm");
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, STARTUP_ASSISTANT_DOCS_STATE_KEY));
  return isStartupAssistantDocsState(row?.value) ? row.value : null;
}

async function writeStartupAssistantDocsState(state: StartupAssistantDocsState): Promise<void> {
  const [{ db }, { settings }] = await Promise.all([
    import("../db/client"),
    import("../db/schema"),
  ]);
  const now = new Date();
  await db
    .insert(settings)
    .values({
      key: STARTUP_ASSISTANT_DOCS_STATE_KEY,
      value: state,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: state,
        updatedAt: now,
      },
    });
}

async function runDefaultAssistantDocsReindex(
  input: StartupAssistantDocsReindexInput
): Promise<StartupAssistantDocsReindexResult> {
  const { ingestInternalDocsToDb } = await import("../services/assistant/docsIngestService");
  return ingestInternalDocsToDb({
    sourceRoot: input.sourceRoot,
    cwd: input.cwd,
    triggeredByUserId: null,
  });
}

/**
 * Hold the reindex lock on a dedicated DIRECT session for the whole action.
 *
 * The lock used to be taken on the shared drizzle client, which is a pool: even
 * before the transaction pooler, lock and unlock could land on different pooled
 * connections and leak the lock. Behind the pooler it is guaranteed to. The
 * guarded work itself stays on the shared pooled client — only the lock needs
 * session semantics.
 */
async function withDefaultStartupAssistantDocsLock<T>(action: () => Promise<T>): Promise<T> {
  const { withSessionDatabaseClient } = await import("../db/sessionClient");

  return withSessionDatabaseClient(STARTUP_ASSISTANT_DOCS_SESSION_PURPOSE, async (client) => {
    await client`select pg_advisory_lock(${STARTUP_ASSISTANT_DOCS_LOCK_NAMESPACE}, ${STARTUP_ASSISTANT_DOCS_LOCK_KEY})`;
    try {
      return await action();
    } finally {
      await client`select pg_advisory_unlock(${STARTUP_ASSISTANT_DOCS_LOCK_NAMESPACE}, ${STARTUP_ASSISTANT_DOCS_LOCK_KEY})`;
    }
  });
}

const defaultDeps: StartupAssistantDocsDeps = {
  computeFingerprint: computeAssistantDocsFingerprint,
  readState: readStartupAssistantDocsState,
  writeState: writeStartupAssistantDocsState,
  reindex: runDefaultAssistantDocsReindex,
  withLock: withDefaultStartupAssistantDocsLock,
};

export async function runStartupAssistantDocsReindex(
  options: RunStartupAssistantDocsOptions = {}
): Promise<StartupAssistantDocsResult> {
  const env = options.env ?? process.env;
  const logger = options.logger ?? console;
  const decision = resolveStartupAssistantDocsDecision(env);
  if (!decision.enabled) {
    logger.log(`[startup] Assistant docs reindex skipped (${decision.reason})`);
    return { ran: false, reason: decision.reason };
  }

  const cwd = options.cwd ?? process.cwd();
  const sourceRoot = resolveStartupAssistantDocsSourceRoot(env);
  const imageVersion = resolveStartupAssistantDocsImageVersion(env);
  const deps: StartupAssistantDocsDeps = {
    ...defaultDeps,
    ...(options.deps ?? {}),
  };
  const docsFingerprint = await deps.computeFingerprint({ sourceRoot, cwd });

  return deps.withLock(async () => {
    const currentState = await deps.readState();
    if (
      currentState?.imageVersion === imageVersion &&
      currentState.sourceRoot === sourceRoot &&
      currentState.docsFingerprint === docsFingerprint
    ) {
      logger.log("[startup] Assistant docs reindex skipped (already current)");
      return {
        ran: false,
        reason: "already_current",
        imageVersion,
        docsFingerprint,
      };
    }

    logger.log(`[startup] Running assistant docs reindex from ${sourceRoot}`);
    try {
      const result = await deps.reindex({ sourceRoot, cwd });
      if (result.status !== "success") {
        throw new Error(`assistant_startup_docs_reindex_${result.status}`);
      }
      await deps.writeState({
        imageVersion,
        sourceRoot,
        docsFingerprint,
        completedAt: new Date().toISOString(),
      });
      logger.log("[startup] Assistant docs reindex completed");
      return {
        ran: true,
        sourceRoot,
        imageVersion,
        docsFingerprint,
        docsUpserted: result.docsUpserted,
        chunksUpserted: result.chunksUpserted,
      };
    } catch (error) {
      logger.error(
        `[startup] Assistant docs reindex failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  });
}
