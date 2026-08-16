import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { resolveInsideRoot, SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { resolveExecutableOnPath } from "../../process-supervisor";
import type { WorkerProfileSpec } from "../../workers/pool";
import { WorkerPool } from "../../workers/pool";
import type {
  Task488AuthPrepareInput,
  Task488AuthPrepareOutput,
  Task488AuthRestoreInput,
  Task488AuthRestoreOutput,
  Task488CleanupInput,
  Task488CleanupOutput,
  Task488InstallInput,
  Task488InstallOutput,
  Task488ProofInput,
  Task488ProofOutput,
  Task488WorkerHandlers,
} from "./worker-operations";
import {
  TASK_488_AUTH_FAST_WINDOW_SECONDS,
  TASK_488_AUTH_MINIMUM_REQUESTS,
} from "./worker-operations";

/**
 * TASK-488 fixture contract. The product and collection rows are created
 * THROUGH the real admin API (the suite's own adapter-side fetch with the
 * admin session, and the browser UI flows respectively); the DB worker only
 * derives the admin path, proves pre-run absence, deletes residual marker rows
 * defensively, and proves post-run absence. Everything is scoped by a unique
 * per-run marker so cleanup can never touch rows the suite did not create.
 */

const MARKER = /^[a-f0-9]{12}$/u;

export function task488ProductSlug(marker: string): string {
  return `wf488-${marker}-product`;
}

export function task488CollectionSlug(marker: string): string {
  return `wf488-${marker}-collection`;
}

export function task488ProductTitle(marker: string): string {
  return `WF488 ${marker.toUpperCase()} Product`;
}

export function task488CollectionName(marker: string): string {
  return `WF488 ${marker.toUpperCase()} Collection`;
}

export interface Task488FixtureSpec {
  readonly schemaVersion: 1;
  readonly marker: string;
  readonly adminPath: string;
  readonly productSlug: string;
  readonly productTitle: string;
  readonly productPriceAmount: number;
  readonly productCurrency: string;
  readonly collectionName: string;
  readonly collectionSlug: string;
  readonly collectionDescription: string;
  readonly variantTitle: string;
  readonly variantSku: string;
  readonly fixtureDigest: string;
}

export function createTask488FixtureSpec(marker: string, adminPath: string): Task488FixtureSpec {
  if (!MARKER.test(marker)) {
    throw new SmokeError("smoke_argument_invalid", "TASK-488 fixture marker is invalid");
  }
  if (
    typeof adminPath !== "string" ||
    adminPath.length === 0 ||
    !adminPath.startsWith("/") ||
    adminPath.includes("\0") ||
    adminPath.includes("..")
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-488 admin path is invalid");
  }
  const upper = marker.toUpperCase();
  const spec = Object.freeze({
    schemaVersion: 1 as const,
    marker,
    adminPath,
    productSlug: task488ProductSlug(marker),
    productTitle: task488ProductTitle(marker),
    productPriceAmount: 450_000,
    productCurrency: "USD",
    collectionName: task488CollectionName(marker),
    collectionSlug: task488CollectionSlug(marker),
    collectionDescription: `TASK-488 smoke collection created by run ${marker}.`,
    variantTitle: `WF488 ${upper} Variant`,
    variantSku: `WF488-${upper}-V1`,
  });
  return Object.freeze({
    ...spec,
    fixtureDigest: createHash("sha256").update(JSON.stringify(spec)).digest("hex"),
  });
}

const REQUIRED_WORKER_ENVIRONMENT = Object.freeze(["DATABASE_URL"] as const);

const OPTIONAL_WORKER_ENVIRONMENT = Object.freeze(["DATABASE_DIRECT_URL"] as const);

function environmentValue(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new SmokeError("smoke_argument_invalid", "TASK-488 worker environment is incomplete");
  }
  return value;
}

export function projectTask488WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const output: Record<string, string> = {
    PATH: environmentValue(source, "PATH"),
    DB_POOL_MAX: "1",
  };
  for (const key of REQUIRED_WORKER_ENVIRONMENT) {
    output[key] = environmentValue(source, key);
  }
  for (const key of OPTIONAL_WORKER_ENVIRONMENT) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && !value.includes("\0")) {
      output[key] = value;
    }
  }
  return Object.freeze(output);
}

function browserEnvironmentValue(source: NodeJS.ProcessEnv, key: string): string | null {
  const value = source[key];
  if (
    value !== null &&
    value !== undefined &&
    (value.length === 0 || value.includes("\0") || !value.startsWith("/"))
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-488 browser environment is invalid");
  }
  return value ?? null;
}

export function projectTask488BrowserEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const output: Record<string, string> = {
    PATH: environmentValue(source, "PATH"),
  };
  for (const key of ["PLAYWRIGHT_MCP_CONFIG", "PLAYWRIGHT_BROWSERS_PATH"] as const) {
    const value = browserEnvironmentValue(source, key);
    if (value !== null) output[key] = value;
  }
  return Object.freeze(output);
}

function normalizeAdminPath(value: string | null): string {
  if (!value) return "/admin";
  const trimmed = value.trim();
  if (!trimmed) return "/admin";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
}

/**
 * DB-backed worker operations. The database client is imported lazily inside
 * each handler so the Node-owned adapter never pulls the runtime pool into
 * module scope; the worker process (Bun) owns the connection lifecycle.
 */
const SECURITY_SETTINGS_KEY = "security.settings";

interface Task488SettingsSnapshot {
  readonly exists: boolean;
  readonly value: unknown;
  readonly updatedAt: Date | null;
}

export class Task488ProductionHandlers implements Task488WorkerHandlers {
  #closed = false;
  #closePromise: Promise<void> | null = null;
  #marker: string | null = null;
  #authSnapshot: Task488SettingsSnapshot | null = null;
  #authPrepared = false;
  #authRestored = false;
  #authChanged = false;

  async install(input: Task488InstallInput): Promise<Task488InstallOutput> {
    const { db } = await import("../../../../core/db/client");
    const { settings, commerceProducts, commerceCollections } =
      await import("../../../../core/db/schema");
    let statements = 0;
    let rows = 0;
    const adminPathRow = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "site.adminPath"));
    statements += 1;
    rows += adminPathRow.length;
    const adminPath = normalizeAdminPath(
      typeof adminPathRow[0]?.value === "string" ? adminPathRow[0].value : null
    );
    const productSlug = task488ProductSlug(input.marker);
    const collectionSlug = task488CollectionSlug(input.marker);
    const productRows = await db
      .select({ id: commerceProducts.id })
      .from(commerceProducts)
      .where(eq(commerceProducts.slug, productSlug))
      .limit(1);
    statements += 1;
    rows += productRows.length;
    const collectionRows = await db
      .select({ id: commerceCollections.id })
      .from(commerceCollections)
      .where(eq(commerceCollections.slug, collectionSlug))
      .limit(1);
    statements += 1;
    rows += collectionRows.length;
    if (productRows.length !== 0 || collectionRows.length !== 0) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-488 fixture rows already exist");
    }
    return Object.freeze({
      schemaVersion: 1,
      adminPath,
      marker: input.marker,
      productSlug,
      collectionSlug,
      productTitle: task488ProductTitle(input.marker),
      collectionName: task488CollectionName(input.marker),
      statements,
      rows,
    });
  }

  async cleanup(input: Task488CleanupInput): Promise<Task488CleanupOutput> {
    const { db } = await import("../../../../core/db/client");
    const { commerceProducts, commerceCollections } = await import("../../../../core/db/schema");
    let statements = 0;
    let rows = 0;
    const deletedProducts = await db
      .delete(commerceProducts)
      .where(eq(commerceProducts.slug, input.productSlug))
      .returning({ id: commerceProducts.id });
    statements += 1;
    rows += deletedProducts.length;
    const deletedCollections = await db
      .delete(commerceCollections)
      .where(eq(commerceCollections.slug, input.collectionSlug))
      .returning({ id: commerceCollections.id });
    statements += 1;
    rows += deletedCollections.length;
    return Object.freeze({
      schemaVersion: 1,
      deletedProducts: deletedProducts.length,
      deletedCollections: deletedCollections.length,
      statements,
      rows,
    });
  }

  async prove(input: Task488ProofInput): Promise<Task488ProofOutput> {
    const { db } = await import("../../../../core/db/client");
    const { settings, commerceProducts, commerceCollections } =
      await import("../../../../core/db/schema");
    let statements = 0;
    let rows = 0;
    const productRows = await db
      .select({ id: commerceProducts.id })
      .from(commerceProducts)
      .where(eq(commerceProducts.slug, input.productSlug))
      .limit(1);
    statements += 1;
    rows += productRows.length;
    const collectionRows = await db
      .select({ id: commerceCollections.id })
      .from(commerceCollections)
      .where(eq(commerceCollections.slug, input.collectionSlug))
      .limit(1);
    statements += 1;
    rows += collectionRows.length;
    const adminPathRow = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "site.adminPath"));
    statements += 1;
    rows += adminPathRow.length;
    const adminPath = normalizeAdminPath(
      typeof adminPathRow[0]?.value === "string" ? adminPathRow[0].value : null
    );
    return Object.freeze({
      schemaVersion: 1,
      productAbsent: productRows.length === 0,
      collectionAbsent: collectionRows.length === 0,
      adminPathUnchanged: adminPath === input.adminPath,
      adminPath,
      statements,
      rows,
    });
  }

  async prepareAuthWindow(input: Task488AuthPrepareInput): Promise<Task488AuthPrepareOutput> {
    if (this.#authPrepared || this.#authSnapshot !== null) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-488 auth window was prepared more than once"
      );
    }
    const { db } = await import("../../../../core/db/client");
    const { settings } = await import("../../../../core/db/schema");
    const securitySettings = await import("../../../../core/services/settings/securitySettings");
    const rows = await db
      .select({ value: settings.value, updatedAt: settings.updatedAt })
      .from(settings)
      .where(eq(settings.key, SECURITY_SETTINGS_KEY))
      .limit(2);
    if (rows.length > 1) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-488 auth settings cardinality drifted");
    }
    const row = rows[0];
    this.#marker = input.marker;
    this.#authSnapshot = Object.freeze({
      exists: row !== undefined,
      value: row?.value ?? null,
      updatedAt: row?.updatedAt ?? null,
    });
    securitySettings.resetSecuritySettingsCache();
    const current = await securitySettings.getSecuritySettings();
    const auth = current.rateLimit.buckets.auth;
    // Rate limiting disabled means the auth bucket cannot 429 the suite, so
    // there is nothing to patch and restore becomes a no-op.
    if (!current.rateLimit.enabled) {
      this.#authPrepared = true;
      this.#authChanged = false;
      return Object.freeze({
        schemaVersion: 1,
        prepared: true,
        changed: false,
        windowSeconds: auth.windowSeconds,
        maxRequests: auth.maxRequests,
      });
    }
    const targetWindow = TASK_488_AUTH_FAST_WINDOW_SECONDS;
    const targetRequests = Math.max(auth.maxRequests, TASK_488_AUTH_MINIMUM_REQUESTS);
    this.#authPrepared = true;
    this.#authChanged = true;
    try {
      await securitySettings.setSecuritySettings({
        rateLimit: {
          buckets: {
            auth: { windowSeconds: targetWindow, maxRequests: targetRequests },
          },
        },
      });
      securitySettings.resetSecuritySettingsCache();
      const after = await securitySettings.getSecuritySettings();
      const afterAuth = after.rateLimit.buckets.auth;
      if (afterAuth.windowSeconds !== targetWindow || afterAuth.maxRequests !== targetRequests) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-488 fast auth window did not persist");
      }
      return Object.freeze({
        schemaVersion: 1,
        prepared: true,
        changed: true,
        windowSeconds: afterAuth.windowSeconds,
        maxRequests: afterAuth.maxRequests,
      });
    } catch (error) {
      try {
        await this.restoreAuthWindow(input);
      } catch {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "TASK-488 fast auth window failed and could not restore",
          { cause: error }
        );
      }
      throw error;
    }
  }

  async restoreAuthWindow(input: Task488AuthRestoreInput): Promise<Task488AuthRestoreOutput> {
    if (
      !this.#authPrepared ||
      this.#authSnapshot === null ||
      this.#authRestored ||
      this.#marker === null ||
      this.#marker !== input.marker
    ) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-488 auth window restore authority is absent"
      );
    }
    if (!this.#authChanged) {
      this.#authRestored = true;
      return Object.freeze({ schemaVersion: 1, restored: true });
    }
    const { db } = await import("../../../../core/db/client");
    const { settings } = await import("../../../../core/db/schema");
    const securitySettings = await import("../../../../core/services/settings/securitySettings");
    const snapshot = this.#authSnapshot;
    await db.transaction(async (transaction) => {
      if (!snapshot.exists) {
        await transaction.delete(settings).where(eq(settings.key, SECURITY_SETTINGS_KEY));
        return;
      }
      if (snapshot.updatedAt === null) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-488 auth settings timestamp is absent");
      }
      await transaction
        .insert(settings)
        .values({
          key: SECURITY_SETTINGS_KEY,
          value: snapshot.value,
          updatedAt: snapshot.updatedAt,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: snapshot.value, updatedAt: snapshot.updatedAt },
        });
    });
    securitySettings.resetSecuritySettingsCache();
    const restoredRows = await db
      .select({ value: settings.value, updatedAt: settings.updatedAt })
      .from(settings)
      .where(eq(settings.key, SECURITY_SETTINGS_KEY))
      .limit(1);
    const restored = restoredRows[0];
    if (!snapshot.exists) {
      if (restored !== undefined) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-488 auth settings restore left a row");
      }
    } else if (
      restored === undefined ||
      restored.updatedAt === null ||
      snapshot.updatedAt === null ||
      restored.updatedAt.getTime() !== snapshot.updatedAt.getTime() ||
      JSON.stringify(restored.value) !== JSON.stringify(snapshot.value)
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-488 auth settings restore drifted");
    }
    this.#authRestored = true;
    return Object.freeze({ schemaVersion: 1, restored: true });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#closePromise ??= this.#closeOnce();
    await this.#closePromise;
  }

  async #closeOnce(): Promise<void> {
    // Safety net for hard teardown paths: the adapter dispatches the explicit
    // restore, but if the worker is closed without it (crash recovery, pool
    // shutdown ordering), put the settings row back before closing the pool.
    if (this.#authPrepared && !this.#authRestored && this.#marker !== null) {
      try {
        await this.restoreAuthWindow({ marker: this.#marker });
      } catch {
        // Best-effort during close; the adapter already recorded the failure.
      }
    }
    const { closeDatabase } = await import("../../../../core/db/client");
    await closeDatabase();
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed && this.#closePromise !== null;
  }
}

export function task488WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: "task-488-db",
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-488/worker-operations.ts",
        "TASK-488 worker entry"
      ),
      cwd: root,
      family: "task488-worker-db",
      requestTimeoutMs: 9 * 60_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask488WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask488WorkerPool(
  context: RuntimeSmokeContext,
  source: NodeJS.ProcessEnv = process.env
): Promise<WorkerPool> {
  const pathValue = environmentValue(source, "PATH");
  const { createTask488WorkerRegistry } = await import("./worker-operations");
  return WorkerPool.create({
    root: context.root,
    executable: await resolveExecutableOnPath("bun", pathValue),
    supervisor: context.processes,
    registry: createTask488WorkerRegistry(),
    profiles: task488WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}
