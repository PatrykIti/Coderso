import { afterEach, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { auditLogs, backups, backupSchedules } from "../../../core/db/schema";
import { ApiError } from "../../../core/server/errorHandler";
import { mapBackupError, registerBackupRoutes } from "../../../core/server/routes/backupRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";
import {
  createBackup,
  deleteBackup,
  getBackupSchedule,
  markBackupComplete,
  setBackupSchedule,
} from "../../../core/services/backups/backupService";
import type {
  BackupArtifact,
  BackupIncludeOption,
} from "../../../core/services/backups/backupTypes";
import { getSetting, setSetting } from "../../../core/services/settings/settingsService";

// 02's MIN_BACKUP_PASSPHRASE floor — every v2 `.cbk` create needs a passphrase.
const TEST_PASSPHRASE = "test-backup-passphrase-511";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  headers?: Record<string, string | undefined>;
  user?: { id: string };
  ip?: string;
  userAgent?: string;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
      patch: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
      delete: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

test("registerBackupRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /backups",
      "POST /backups",
      "POST /backups/:id/restore",
      "POST /backups/import",
      "GET /backups/:id/download",
      "DELETE /backups/:id",
      "POST /backups/prune",
      "GET /backups/usage",
      "GET /backups/schedule",
      "PATCH /backups/schedule",
    ])
  );
});

test("GET /backups/usage is gated on backups:read", () => {
  const { router, routes } = makeRouter();
  const permByHandler = new Map<RouteHandler, string>();

  registerBackupRoutes(router, {
    requirePermission: (permission) => {
      const guard: RouteHandler = async () => undefined;
      permByHandler.set(guard, permission);
      return guard;
    },
    validate: () => undefined,
  });

  const route = routes.find((r) => r.method === "GET" && r.path === "/backups/usage");
  expect(route).toBeDefined();
  expect(permByHandler.get(route!.handlers[0]!)).toBe("backups:read");
});

test("backup create route validates include payload", async () => {
  const { router, routes } = makeRouter();
  const validations: Array<{ schema: unknown; payload: unknown }> = [];

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validations.push({ schema, payload });
      throw new Error("validation_stop");
    },
  });

  const handler = routes
    .find((route) => route.method === "POST" && route.path === "/backups")
    ?.handlers.at(-1);
  await expect(
    handler?.({
      params: {},
      query: {},
      body: { kind: "manual", include: ["database", "media"] },
    })
  ).rejects.toThrow("validation_stop");

  expect(validations[0]?.payload).toEqual({ kind: "manual", include: ["database", "media"] });
});

test("backup routes reject invalid include and unknown list query params", async () => {
  const { router, routes } = makeRouter();

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const createHandler = routes
    .find((route) => route.method === "POST" && route.path === "/backups")
    ?.handlers.at(-1);
  await expect(
    createHandler?.({
      params: {},
      query: {},
      body: { kind: "manual", include: ["unknown"] },
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);

  const listHandler = routes
    .find((route) => route.method === "GET" && route.path === "/backups")
    ?.handlers.at(-1);
  await expect(
    listHandler?.({
      params: {},
      query: { page: "1", limit: "10", extra: "nope" },
      body: undefined,
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
});

test("backup list route validates parsed pagination before service access", async () => {
  const { router, routes } = makeRouter();
  const validations: Array<{ schema: unknown; payload: unknown }> = [];

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validations.push({ schema, payload });
      throw new Error("validation_stop");
    },
  });

  const handler = routes
    .find((route) => route.method === "GET" && route.path === "/backups")
    ?.handlers.at(-1);
  await expect(
    handler?.({
      params: {},
      query: { page: "2", limit: "25", query: "queued" },
      body: undefined,
    })
  ).rejects.toThrow("validation_stop");

  expect(validations[0]?.payload).toEqual({ page: 2, limit: 25, query: "queued" });
});

// --- POST /backups create path (TASK-511-06 owned). ---

test("POST /backups schema REQUIRES a passphrase (mandatory encryption)", async () => {
  const { router, routes } = makeRouter();
  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const handler = routes
    .find((route) => route.method === "POST" && route.path === "/backups")
    ?.handlers.at(-1);

  // A create body without `passphrase` is rejected 400 at the boundary, and an
  // unknown field is rejected (reject-unknown).
  await expect(
    handler?.({ params: {}, query: {}, body: { kind: "manual", include: ["database"] } })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
  await expect(
    handler?.({
      params: {},
      query: {},
      body: { kind: "manual", include: ["database"], passphrase: TEST_PASSPHRASE, extra: "nope" },
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
});

// Minimal VALID v1 `.json` artifact (legacy in-place restore fixture).
const buildV1Artifact = (overrides: Partial<BackupArtifact> = {}): BackupArtifact => ({
  version: 1,
  id: "fixture",
  createdAt: new Date().toISOString(),
  include: ["media"],
  storageDriver: "local",
  database: {
    pages: [],
    contentTypes: [],
    contentEntries: [],
    posts: [],
    media: [],
    menus: [],
    menuItems: [],
    themeProfiles: [],
    themeRoutes: [],
    redirects: [],
    pageRevisions: [],
    detailPageDocuments: [],
    detailPageRevisions: [],
    customScreens: [],
    customScreenEntryPresentationOverrides: [],
    contentRevisions: [],
    contentTaxonomies: [],
    contentTerms: [],
    contentTermAssignments: [],
    postRevisions: [],
    postPreviewTokens: [],
    postTermAssignments: [],
  },
  settings: null,
  media: null,
  ...overrides,
});

// Write a v1 artifact to disk and point a fresh complete row at it.
const seedV1ArtifactRow = async (artifact: BackupArtifact): Promise<string> => {
  const [row] = await db
    .insert(backups)
    .values({ status: "running", kind: "manual", storageDriver: "local" })
    .returning();
  if (!row) throw new Error("backup_create_failed");
  const filePath = path.join(
    process.cwd(),
    process.env.BACKUP_DIR ?? "storage/backups",
    `coderso-backup-${row.id}.json`
  );
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(artifact), "utf8");
  await markBackupComplete(row.id, filePath, null, Buffer.byteLength(JSON.stringify(artifact)));
  return row.id;
};

test("mapBackupError returns stable API errors", () => {
  expect(mapBackupError(new Error("backup_not_found"))).toMatchObject({
    code: "backup_not_found",
    status: 404,
  } satisfies Partial<ApiError>);
  expect(mapBackupError(new Error("backup_not_ready"))).toMatchObject({
    code: "backup_not_ready",
    status: 409,
  } satisfies Partial<ApiError>);
  expect(mapBackupError(new Error("backup_restore_unsupported"))).toMatchObject({
    code: "backup_restore_unsupported",
    status: 409,
  } satisfies Partial<ApiError>);
  expect(mapBackupError(new Error("backup_artifact_invalid"))).toMatchObject({
    code: "backup_artifact_invalid",
    status: 400,
  } satisfies Partial<ApiError>);
});

// --- POST /backups/:id/restore (TASK-484-04-L02). ---

test("mapBackupError maps the new restore domain codes", () => {
  expect(mapBackupError(new Error("backup_restore_confirmation_required"))).toMatchObject({
    code: "backup_restore_confirmation_required",
    status: 400,
  } satisfies Partial<ApiError>);
  expect(mapBackupError(new Error("backup_restore_invalid_artifact"))).toMatchObject({
    code: "backup_restore_invalid_artifact",
    status: 422,
  } satisfies Partial<ApiError>);
  expect(mapBackupError(new Error("backup_restore_superseded"))).toMatchObject({
    code: "backup_restore_superseded",
    status: 422,
  } satisfies Partial<ApiError>);
  expect(mapBackupError(new Error("backup_artifact_unreadable"))).toMatchObject({
    code: "backup_artifact_unreadable",
    status: 502,
  } satisfies Partial<ApiError>);
});

test("POST /backups/:id/restore is gated on backups:write", () => {
  const { router, routes } = makeRouter();
  const permByHandler = new Map<RouteHandler, string>();

  registerBackupRoutes(router, {
    requirePermission: (permission) => {
      const guard: RouteHandler = async () => undefined;
      permByHandler.set(guard, permission);
      return guard;
    },
    validate: () => undefined,
  });

  const route = routes.find((r) => r.method === "POST" && r.path === "/backups/:id/restore");
  expect(route).toBeDefined();
  expect(permByHandler.get(route!.handlers[0]!)).toBe("backups:write");
});

test("POST /backups/:id/restore requires confirm:true and rejects unknown keys", async () => {
  const { router, routes } = makeRouter();

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const handler = routes
    .find((r) => r.method === "POST" && r.path === "/backups/:id/restore")
    ?.handlers.at(-1);

  // Missing confirm → validation error (never reaches the service).
  await expect(handler?.({ params: { id: "x" }, query: {}, body: {} })).rejects.toMatchObject({
    code: "validation_error",
    status: 400,
  } satisfies Partial<ApiError>);
  // confirm:false is rejected (schema requires const true).
  await expect(
    handler?.({ params: { id: "x" }, query: {}, body: { confirm: false } })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
  // Unknown body key → additionalProperties.
  await expect(
    handler?.({ params: { id: "x" }, query: {}, body: { confirm: true, extra: "nope" } })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
});

// --- POST /backups/prune (TASK-484-03-L02). ---

test("POST /backups/prune is gated on backups:write", () => {
  const { router, routes } = makeRouter();
  const permByHandler = new Map<RouteHandler, string>();

  registerBackupRoutes(router, {
    requirePermission: (permission) => {
      const guard: RouteHandler = async () => undefined;
      permByHandler.set(guard, permission);
      return guard;
    },
    validate: () => undefined,
  });

  const route = routes.find((r) => r.method === "POST" && r.path === "/backups/prune");
  expect(route).toBeDefined();
  expect(permByHandler.get(route!.handlers[0]!)).toBe("backups:write");
});

test("POST /backups/prune rejects unknown body keys", async () => {
  const { router, routes } = makeRouter();

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const handler = routes
    .find((r) => r.method === "POST" && r.path === "/backups/prune")
    ?.handlers.at(-1);
  await expect(handler?.({ params: {}, query: {}, body: { extra: "nope" } })).rejects.toMatchObject(
    { code: "validation_error", status: 400 } satisfies Partial<ApiError>
  );
});

// --- DB-backed prune integration under the shared-remote-DB isolation pattern. ---
// The route prunes with the persisted singleton schedule's `retentionDays` against
// the ONE shared remote Postgres. To keep NO real data eligible, snapshot the
// schedule, widen `retentionDays` to the max (3650 ≈ 10yr cutoff), seed fixtures
// with `createdAt` older than that cutoff, assert only on seeded ids, then restore
// the schedule and delete leftover fixtures per id.
async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

// --- POST /backups create path, DB-backed (TASK-511-06 owned). ---
const createPathFixtureIds: string[] = [];

afterEach(async () => {
  if (!hasDb || createPathFixtureIds.length === 0) return;
  for (const id of [...createPathFixtureIds]) {
    await deleteBackup(id).catch(async () => {
      await db.delete(backups).where(inArray(backups.id, [id]));
    });
  }
  createPathFixtureIds.length = 0;
});

testIfDb(
  "POST /backups forwards the passphrase into createBackup and never audits it",
  async () => {
    const { router, routes } = makeRouter();
    registerBackupRoutes(router, {
      requirePermission: () => async () => undefined,
      validate,
    });
    const handler = routes
      .find((route) => route.method === "POST" && route.path === "/backups")
      ?.handlers.at(-1);

    const before = new Date();
    const result = (await handler?.({
      params: {},
      query: {},
      body: { kind: "manual", include: ["database"], passphrase: TEST_PASSPHRASE },
      ip: "127.0.0.1",
      userAgent: "create-test",
    })) as { id: string; status: string; artifactPath: string | null };

    expect(result.id).toBeTruthy();
    createPathFixtureIds.push(result.id);
    expect(result.status).toBe("complete");

    // The passphrase reached the service and produced an encrypted archive; the
    // audit metadata stays { kind, include } — no passphrase value anywhere.
    const audits = await db
      .select({ id: auditLogs.id, targetId: auditLogs.targetId, metadata: auditLogs.metadata })
      .from(auditLogs)
      .where(and(eq(auditLogs.action, "backups.create"), gte(auditLogs.createdAt, before)));
    const audit = audits.find((a) => a.targetId === result.id);
    expect(audit).toBeTruthy();
    const metadata = audit!.metadata as Record<string, unknown>;
    expect(metadata.kind).toBe("manual");
    expect(metadata.include).toEqual(["database"]);
    const serializedAudit = JSON.stringify(audit);
    expect(serializedAudit).not.toContain(TEST_PASSPHRASE);

    if (audits.length > 0) {
      await db.delete(auditLogs).where(
        inArray(
          auditLogs.id,
          audits.map((a) => a.id)
        )
      );
    }
  },
  60000
);

testIfDb(
  "POST /backups with no passphrase self-marks failed when validation is bypassed",
  async () => {
    // UI-bypassing client: registration uses a NO-OP validate so the schema
    // requirement is skipped and the request reaches the service.
    const { router, routes } = makeRouter();
    registerBackupRoutes(router, {
      requirePermission: () => async () => undefined,
      validate: () => undefined,
    });
    const handler = routes
      .find((route) => route.method === "POST" && route.path === "/backups")
      ?.handlers.at(-1);

    const result = (await handler?.({
      params: {},
      query: {},
      body: { kind: "manual", include: ["database"] },
      ip: "127.0.0.1",
      userAgent: "create-test",
    })) as { id: string; status: string; error: string | null; artifactPath: string | null };

    expect(result.id).toBeTruthy();
    createPathFixtureIds.push(result.id);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("backup_passphrase_required");
    expect(result.artifactPath).toBeNull(); // no `.cbk` bytes written
  }
);

testIfDb(
  "POST /backups with users include but no passphrase self-marks failed with the users code",
  async () => {
    const { router, routes } = makeRouter();
    registerBackupRoutes(router, {
      requirePermission: () => async () => undefined,
      validate: () => undefined,
    });
    const handler = routes
      .find((route) => route.method === "POST" && route.path === "/backups")
      ?.handlers.at(-1);

    const result = (await handler?.({
      params: {},
      query: {},
      body: { kind: "manual", include: ["database", "users"] },
      ip: "127.0.0.1",
      userAgent: "create-test",
    })) as { id: string; status: string; error: string | null; artifactPath: string | null };

    expect(result.id).toBeTruthy();
    createPathFixtureIds.push(result.id);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("backup_users_requires_encryption");
    expect(result.artifactPath).toBeNull();
  }
);

// --- PATCH /backups/schedule include (TASK-511-06 owned). ---

test("PATCH /backups/schedule rejects unknown keys and bad include enum values", async () => {
  const { router, routes } = makeRouter();
  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const handler = routes
    .find((r) => r.method === "PATCH" && r.path === "/backups/schedule")
    ?.handlers.at(-1);

  // Out-of-enum include item → validation_error 400.
  await expect(
    handler?.({ params: {}, query: {}, body: { include: ["unknown"] } })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
  // Unknown body key → reject-unknown 400.
  await expect(
    handler?.({ params: {}, query: {}, body: { include: ["database"], extra: "nope" } })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
  // Empty include → minItems 400.
  await expect(handler?.({ params: {}, query: {}, body: { include: [] } })).rejects.toMatchObject({
    code: "validation_error",
    status: 400,
  } satisfies Partial<ApiError>);
});

testIfDb("PATCH /backups/schedule accepts include and audits key names only", async () => {
  const prior = await getBackupSchedule();
  const before = new Date();
  try {
    const { router, routes } = makeRouter();
    registerBackupRoutes(router, {
      requirePermission: () => async () => undefined,
      validate,
    });
    const handler = routes
      .find((r) => r.method === "PATCH" && r.path === "/backups/schedule")
      ?.handlers.at(-1);

    const updated = (await handler?.({
      params: {},
      query: {},
      body: { include: ["database", "media"] },
      ip: "127.0.0.1",
      userAgent: "schedule-test",
    })) as { include: BackupIncludeOption[] };

    expect(updated.include).toEqual(["database", "media"]);

    // Audit metadata carries KEY NAMES only — never include values.
    const audits = await db
      .select({ id: auditLogs.id, metadata: auditLogs.metadata })
      .from(auditLogs)
      .where(
        and(eq(auditLogs.action, "backups.schedule.update"), gte(auditLogs.createdAt, before))
      );
    const audit = audits.at(-1);
    expect(audit).toBeTruthy();
    const metadata = audit!.metadata as Record<string, unknown>;
    expect(Array.isArray(metadata.keys)).toBe(true);
    expect((metadata.keys as string[]).includes("include")).toBe(true);
    const serializedAudit = JSON.stringify(audit);
    expect(serializedAudit).not.toContain('"database","media"');
    expect(serializedAudit).not.toContain("database");
    expect(serializedAudit).not.toContain("media");

    if (audits.length > 0) {
      await db.delete(auditLogs).where(
        inArray(
          auditLogs.id,
          audits.map((a) => a.id)
        )
      );
    }
  } finally {
    await setBackupSchedule({ include: prior.include });
  }
});
const MAX_RETENTION_DAYS = 3650;
const pruneFixtureIds: string[] = [];
let priorPruneSchedule: typeof backupSchedules.$inferSelect | undefined;

afterEach(async () => {
  if (!hasDb) return;
  if (priorPruneSchedule) {
    await db
      .update(backupSchedules)
      .set({
        enabled: priorPruneSchedule.enabled,
        frequency: priorPruneSchedule.frequency,
        retentionDays: priorPruneSchedule.retentionDays,
        storageDriver: priorPruneSchedule.storageDriver,
        nextRunAt: priorPruneSchedule.nextRunAt,
        lastRunAt: priorPruneSchedule.lastRunAt,
        updatedAt: priorPruneSchedule.updatedAt,
      })
      .where(eq(backupSchedules.id, priorPruneSchedule.id));
    priorPruneSchedule = undefined;
  }
  if (pruneFixtureIds.length > 0) {
    await db.delete(backups).where(inArray(backups.id, pruneFixtureIds));
    pruneFixtureIds.length = 0;
  }
});

testIfDb(
  "POST /backups/prune runs server-owned retention, returns the summary, and audits",
  async () => {
    // Snapshot then widen the shared singleton schedule so no real data is eligible.
    await getBackupSchedule(); // ensure the singleton exists
    [priorPruneSchedule] = await db.select().from(backupSchedules).limit(1);
    await setBackupSchedule({ retentionDays: MAX_RETENTION_DAYS });

    // Seed fixtures: an expired terminal row (older than the ~10yr cutoff) and an
    // in-window control (created "now", after the cutoff).
    const ancient = new Date("2000-01-01T00:00:00.000Z");
    const [expiredRow] = await db
      .insert(backups)
      .values({ status: "complete", kind: "manual", storageDriver: "local", createdAt: ancient })
      .returning();
    const [inWindowRow] = await db
      .insert(backups)
      .values({ status: "complete", kind: "manual", storageDriver: "local" })
      .returning();
    if (!expiredRow || !inWindowRow) throw new Error("fixture_seed_failed");
    pruneFixtureIds.push(expiredRow.id, inWindowRow.id);

    const { router, routes } = makeRouter();
    registerBackupRoutes(router, {
      requirePermission: () => async () => undefined,
      validate,
    });
    const handler = routes
      .find((r) => r.method === "POST" && r.path === "/backups/prune")
      ?.handlers.at(-1);

    const before = new Date();
    const result = (await handler?.({
      params: {},
      query: {},
      body: {},
      ip: "127.0.0.1",
      userAgent: "prune-test",
    })) as { prunedCount: number; prunedIds: string[] };

    // Summary shape + per-id membership (never table-global counts).
    expect(Array.isArray(result.prunedIds)).toBe(true);
    expect(result.prunedCount).toBe(result.prunedIds.length);
    expect(result.prunedIds).toContain(expiredRow.id);
    expect(result.prunedIds).not.toContain(inWindowRow.id);

    // The in-window fixture survives.
    const survivor = await db
      .select({ id: backups.id })
      .from(backups)
      .where(eq(backups.id, inWindowRow.id));
    expect(survivor.length).toBe(1);

    // An audit entry was written for this prune.
    const audits = await db
      .select({ id: auditLogs.id, targetId: auditLogs.targetId })
      .from(auditLogs)
      .where(and(eq(auditLogs.action, "backups.prune"), gte(auditLogs.createdAt, before)));
    expect(audits.some((a) => a.targetId === "retention")).toBe(true);

    // Clean up only the audit rows this test created.
    if (audits.length > 0) {
      await db.delete(auditLogs).where(
        inArray(
          auditLogs.id,
          audits.map((a) => a.id)
        )
      );
    }
  }
);

// --- Restore happy path under the shared-remote-DB isolation pattern. ---
// A media-only backup has no database/settings sections, so restore is a genuine
// but EMPTY (no-op) transaction — safe to run committed against the shared DB while
// still exercising the real route -> restoreBackup -> read+parse -> audit chain.
const restoreFixtureIds: string[] = [];

afterEach(async () => {
  if (!hasDb || restoreFixtureIds.length === 0) return;
  for (const id of [...restoreFixtureIds]) {
    await deleteBackup(id).catch(async () => {
      await db.delete(backups).where(inArray(backups.id, [id]));
    });
  }
  restoreFixtureIds.length = 0;
});

testIfDb(
  "POST /backups/:id/restore restores (no-op media artifact), returns the record, and audits",
  async () => {
    // v2 `.cbk` rows cannot be restored by id; the in-place restore chain is the
    // legacy v1 path, so drive it with a hand-written v1 media-only artifact.
    const id = await seedV1ArtifactRow(buildV1Artifact());
    restoreFixtureIds.push(id);

    const { router, routes } = makeRouter();
    registerBackupRoutes(router, {
      requirePermission: () => async () => undefined,
      validate,
    });
    const handler = routes
      .find((r) => r.method === "POST" && r.path === "/backups/:id/restore")
      ?.handlers.at(-1);

    const before = new Date();
    const result = (await handler?.({
      params: { id },
      query: {},
      body: { confirm: true },
      ip: "127.0.0.1",
      userAgent: "restore-test",
    })) as { id: string; status: string };

    expect(result.id).toBe(id);
    expect(result.status).toBe("complete");

    const audits = await db
      .select({ id: auditLogs.id, targetId: auditLogs.targetId })
      .from(auditLogs)
      .where(and(eq(auditLogs.action, "backups.restore"), gte(auditLogs.createdAt, before)));
    expect(audits.some((a) => a.targetId === id)).toBe(true);

    if (audits.length > 0) {
      await db.delete(auditLogs).where(
        inArray(
          auditLogs.id,
          audits.map((a) => a.id)
        )
      );
    }
  }
);

// --- GET /backups/usage (TASK-484-06-L01). ---
// Returns the numeric aggregate shape with NO secret fields (no artifact paths,
// keys, or credentials). Safe to run against the shared DB: it only reads.
const usageFixtureIds: string[] = [];

afterEach(async () => {
  if (!hasDb || usageFixtureIds.length === 0) return;
  await db.delete(backups).where(inArray(backups.id, usageFixtureIds));
  usageFixtureIds.length = 0;
});

testIfDb("GET /backups/usage returns the usage shape with no secret fields", async () => {
  // Seed a uniquely-scoped completed row so the aggregate is non-trivial.
  const [row] = await db
    .insert(backups)
    .values({
      status: "complete",
      kind: "manual",
      storageDriver: "s3",
      artifactPath: "https://backups.example.test/artifact.json",
      artifactKey: "backups/secret-object-key.json",
      sizeBytes: 4242,
    })
    .returning();
  if (!row) throw new Error("fixture_seed_failed");
  usageFixtureIds.push(row.id);

  const { router, routes } = makeRouter();
  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const handler = routes
    .find((r) => r.method === "GET" && r.path === "/backups/usage")
    ?.handlers.at(-1);

  const usage = (await handler?.({ params: {}, query: {}, body: undefined })) as Record<
    string,
    unknown
  >;

  // Shape.
  expect(typeof usage.totalBytes).toBe("number");
  expect(typeof usage.backupCount).toBe("number");
  expect(usage.byStatus).toBeDefined();
  expect(usage.byDriver).toBeDefined();
  expect(usage.activeDriver).toBeDefined();
  expect("quotaBytes" in usage).toBe(true);
  expect("overQuota" in usage).toBe(true);

  // No secret fields leak into the payload.
  const serialized = JSON.stringify(usage);
  expect(serialized).not.toContain("secret-object-key");
  expect(serialized).not.toContain("artifact.json");
  expect(serialized).not.toContain("artifactKey");
  expect(serialized).not.toContain("artifactPath");
});

// --- POST /backups/import (TASK-511-05). ---

test("mapBackupError maps the TASK-511-05 import codes", () => {
  const cases: Array<[string, number]> = [
    ["backup_maintenance_required", 409],
    ["backup_decrypt_failed", 422],
    ["backup_archive_unsupported", 422],
    ["backup_passphrase_required", 400],
    ["backup_passphrase_invalid", 400],
    ["backup_import_too_large", 413],
    ["backup_import_invalid_file", 400],
    ["backup_manifest_invalid", 422],
    ["backup_checksum_mismatch", 422],
    ["backup_restore_fk_violation", 422],
    ["backup_media_key_unsafe", 422],
    ["backup_media_write_failed", 500],
  ];
  for (const [code, status] of cases) {
    expect(mapBackupError(new Error(code))).toMatchObject({
      code,
      status,
    } satisfies Partial<ApiError>);
  }
});

test("POST /backups/import is gated on backups:write", () => {
  const { router, routes } = makeRouter();
  const permByHandler = new Map<RouteHandler, string>();

  registerBackupRoutes(router, {
    requirePermission: (permission) => {
      const guard: RouteHandler = async () => undefined;
      permByHandler.set(guard, permission);
      return guard;
    },
    validate: () => undefined,
  });

  const route = routes.find((r) => r.method === "POST" && r.path === "/backups/import");
  expect(route).toBeDefined();
  expect(permByHandler.get(route!.handlers[0]!)).toBe("backups:write");
});

testIfDb("POST /backups/import refuses (409) while maintenance mode is OFF", async () => {
  const prior = await getSetting("site.maintenanceMode");
  await setSetting("site.maintenanceMode", false);
  try {
    const { router, routes } = makeRouter();
    registerBackupRoutes(router, {
      requirePermission: () => async () => undefined,
      validate,
    });
    const handler = routes
      .find((r) => r.method === "POST" && r.path === "/backups/import")
      ?.handlers.at(-1);
    // The gate runs BEFORE validation, so even a malformed body must 409.
    await expect(
      handler?.({ params: {}, query: {}, body: { file: "nope" } })
    ).rejects.toMatchObject({ code: "backup_maintenance_required", status: 409 });
  } finally {
    await setSetting("site.maintenanceMode", prior);
  }
});

testIfDb(
  "POST /backups/import proceeds when maintenance is ON (gate passes, then validates/decrypts)",
  async () => {
    const prior = await getSetting("site.maintenanceMode");
    await setSetting("site.maintenanceMode", true);
    try {
      const { router, routes } = makeRouter();
      registerBackupRoutes(router, {
        requirePermission: () => async () => undefined,
        validate,
      });
      const handler = routes
        .find((r) => r.method === "POST" && r.path === "/backups/import")
        ?.handlers.at(-1);

      // The maintenance gate passed (no 409): a schema-invalid confirm is now a
      // validation_error like 484's restore route (absent/false are rejected).
      await expect(
        handler?.({
          params: {},
          query: {},
          body: { file: fakeUpload(), passphrase: "bkp-511-05-pass", confirm: "maybe" },
        })
      ).rejects.toMatchObject({ code: "validation_error", status: 400 });

      // And a confirm:"false" is rejected by the strict schema (mirrors 484).
      await expect(
        handler?.({
          params: {},
          query: {},
          body: { file: fakeUpload(), passphrase: "bkp-511-05-pass", confirm: "false" },
        })
      ).rejects.toMatchObject({ code: "validation_error", status: 400 });

      // A well-formed request with a non-.cbk file reaches decrypt and fails closed
      // with the coded 422 — proving the route proceeded past the maintenance gate.
      await expect(
        handler?.({
          params: {},
          query: {},
          body: {
            file: fakeUpload("garbage.cbk"),
            passphrase: "bkp-511-05-pass",
            confirm: "true",
          },
          headers: { "content-length": "7" },
        })
      ).rejects.toMatchObject({ code: "backup_decrypt_failed", status: 422 });
    } finally {
      await setSetting("site.maintenanceMode", prior);
    }
  }
);

// Streaming Web File shape from req.formData() (guarded by isImportUploadFile).
const fakeUpload = (name = "backup.cbk") => ({
  name,
  type: "application/octet-stream",
  size: 7,
  stream: () =>
    new ReadableStream<Uint8Array>({
      pull(ctrl) {
        ctrl.enqueue(new Uint8Array([1, 2, 3, 4, 5, 6, 7]));
        ctrl.close();
      },
    }),
});
