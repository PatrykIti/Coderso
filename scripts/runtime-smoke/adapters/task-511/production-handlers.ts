import { stat, unlink } from "node:fs/promises";
import path from "node:path";

import { eq, inArray, sql } from "drizzle-orm";

import { SmokeError } from "../../contracts";
import { Task511ScheduleLease } from "./schedule-lease";
import { Task511SettingsLease } from "./settings-lease";
import type {
  Task511CleanupInput,
  Task511CleanupOutput,
  Task511InstallInput,
  Task511InstallOutput,
  Task511ProofInput,
  Task511ProofOutput,
  Task511WorkerHandlers,
} from "./worker-operations";

type DbTransaction = Parameters<
  Parameters<typeof import("../../../../core/db/client").db.transaction>[0]
>[0];

interface Task511CoreHandles {
  readonly acquireNativeCmsWriterFence: (tx: DbTransaction) => Promise<void>;
  readonly closeDatabase: () => Promise<void>;
  readonly db: typeof import("../../../../core/db/client").db;
  readonly accessLogs: typeof import("../../../../core/db/schema").accessLogs;
  readonly auditLogs: typeof import("../../../../core/db/schema").auditLogs;
  readonly backups: typeof import("../../../../core/db/schema").backups;
  readonly roles: typeof import("../../../../core/db/schema").roles;
  readonly settings: typeof import("../../../../core/db/schema").settings;
  readonly userRoles: typeof import("../../../../core/db/schema").userRoles;
  readonly users: typeof import("../../../../core/db/schema").users;
  readonly buildEmailFields: (email: string) => {
    readonly email: string;
    readonly emailHash: string;
    readonly emailEncrypted: unknown;
  };
  readonly hashPassword: (password: string) => Promise<string>;
}

async function task511Core(): Promise<Task511CoreHandles> {
  const [
    { closeDatabase, db },
    { acquireNativeCmsWriterFence },
    { accessLogs, auditLogs, backups, roles, settings, userRoles, users },
    { buildEmailFields },
    { hashPassword },
  ] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/nativeCmsWriterFence"),
    import("../../../../core/db/schema"),
    import("../../../../core/services/security/piiEmail"),
    import("../../../../core/services/auth/password"),
  ]);
  return Object.freeze({
    acquireNativeCmsWriterFence,
    closeDatabase,
    db,
    accessLogs,
    auditLogs,
    backups,
    roles,
    settings,
    userRoles,
    users,
    buildEmailFields,
    hashPassword,
  });
}

function cleanupFailure(message: string): never {
  throw new SmokeError("smoke_cleanup_failed", message);
}

class Task511Counters {
  #statements = 0;
  #rows = 0;

  record(statements: number, rows: number): void {
    this.#statements += statements;
    this.#rows += rows;
  }

  snapshot(): Readonly<{ readonly statements: number; readonly rows: number }> {
    return Object.freeze({ statements: this.#statements, rows: this.#rows });
  }
}

const TASK511_ADMIN_PATH = /^\/[a-z0-9][a-z0-9._-]{0,127}$/u;
const TASK511_ARTIFACT_FILE =
  /^coderso-backup-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.cbk$/u;
const TASK511_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

function resolveLocalArtifactPath(stored: string): string | null {
  // The DB worker runs with the repository root as cwd, while the dev host
  // runs the core server with the `core` directory as cwd, so the app writes
  // v2 archives under `<root>/core/storage/backups` (or a configured
  // BACKUP_DIR resolved from either cwd). Accept both candidate bases.
  const configured = process.env.BACKUP_DIR ?? "storage/backups";
  const baseDirs = [
    path.resolve(process.cwd(), configured),
    path.resolve(process.cwd(), "core", configured),
  ];
  const normalized = path.normalize(stored);
  const baseDir = baseDirs.find(
    (candidate) => normalized === candidate || normalized.startsWith(`${candidate}${path.sep}`)
  );
  if (
    baseDir === undefined ||
    path.basename(normalized) !== normalized.slice(baseDir.length + path.sep.length)
  ) {
    return null;
  }
  if (!TASK511_ARTIFACT_FILE.test(path.basename(normalized))) return null;
  return normalized;
}

async function exists(pathValue: string): Promise<boolean> {
  try {
    await stat(pathValue);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return false;
    throw error;
  }
}

async function removeIfExists(pathValue: string): Promise<boolean> {
  try {
    await unlink(pathValue);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return false;
    throw error;
  }
}

async function readAdminPath(core: Task511CoreHandles, counts: Task511Counters): Promise<string> {
  const rows = await core.db
    .select({ value: sql<string>`${core.settings.value}::text`.as("value") })
    .from(core.settings)
    .where(eq(core.settings.key, "site.adminPath"))
    .limit(1);
  counts.record(1, rows.length);
  let adminPath = "/admin";
  const raw = rows[0]?.value;
  if (raw !== undefined) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "string" && TASK511_ADMIN_PATH.test(parsed)) {
        adminPath = parsed;
      }
    } catch {
      // Invalid ambient admin path falls back to the canonical default.
    }
  }
  return adminPath;
}

export class Task511ProductionHandlers implements Task511WorkerHandlers {
  readonly #settingsLease = new Task511SettingsLease();
  readonly #scheduleLease = new Task511ScheduleLease();
  #actor: Readonly<{ readonly userId: string; readonly roleId: string }> | null = null;
  #installed = false;
  #closed = false;
  #artifactPaths: readonly string[] = [];

  async install(input: Task511InstallInput): Promise<Task511InstallOutput> {
    const core = await task511Core();
    const counts = new Task511Counters();
    await this.#settingsLease.apply();
    await this.#scheduleLease.apply();
    const adminPath = await readAdminPath(core, counts);
    const passwordHash = await core.hashPassword(input.actor.password);
    const actor = await core.db.transaction(async (tx) => {
      await core.acquireNativeCmsWriterFence(tx);
      const insertedRoles = await tx
        .insert(core.roles)
        .values({
          name: `task511-${input.authority.runMarker}-admin`,
          description: "TASK-511 synthetic runtime smoke role",
          permissions: ["*"],
        })
        .returning({ id: core.roles.id });
      counts.record(1, insertedRoles.length);
      const roleId = insertedRoles[0]?.id;
      if (roleId === undefined) cleanupFailure("task-511 fixture role was not created");
      const fields = core.buildEmailFields(input.actor.email);
      const insertedUsers = await tx
        .insert(core.users)
        .values({
          email: fields.email,
          emailHash: fields.emailHash,
          emailEncrypted: fields.emailEncrypted,
          name: "TASK-511 smoke admin",
          passwordHash,
          status: "active",
        })
        .returning({ id: core.users.id });
      counts.record(1, insertedUsers.length);
      const userId = insertedUsers[0]?.id;
      if (userId === undefined) cleanupFailure("task-511 fixture user was not created");
      const joined = await tx
        .insert(core.userRoles)
        .values({ userId, roleId })
        .returning({ userId: core.userRoles.userId });
      counts.record(1, joined.length);
      if (joined.length !== 1 || joined[0]?.userId !== userId) {
        cleanupFailure("task-511 fixture join was not created");
      }
      return Object.freeze({ userId, roleId });
    });
    this.#actor = actor;
    this.#installed = true;
    const snapshot = this.#scheduleLease.snapshot;
    const counters = counts.snapshot();
    const output: Task511InstallOutput = Object.freeze({
      schemaVersion: 1,
      runMarker: input.authority.runMarker,
      adminPath,
      scheduleEnabled: snapshot === null ? true : Boolean(snapshot.enabled),
      actor,
      statements: counters.statements,
      rows: counters.rows,
    });
    return output;
  }

  async cleanup(input: Task511CleanupInput): Promise<Task511CleanupOutput> {
    if (!this.#installed) cleanupFailure("task-511 install state is absent");
    const core = await task511Core();
    const counts = new Task511Counters();
    const backupIds = input.backupIds.filter((id) => TASK511_UUID.test(id));
    if (backupIds.length !== input.backupIds.length) {
      cleanupFailure("task-511 cleanup backup ids are invalid");
    }
    const rows = await core.db
      .select({
        id: core.backups.id,
        artifactPath: core.backups.artifactPath,
      })
      .from(core.backups)
      .where(inArray(core.backups.id, backupIds));
    counts.record(1, rows.length);
    const artifactPaths = rows.flatMap((row) => {
      if (row.artifactPath === null) return [];
      const resolved = resolveLocalArtifactPath(row.artifactPath);
      if (resolved === null) {
        cleanupFailure("task-511 backup artifact path is not a local v2 archive");
      }
      return [resolved];
    });
    const preArtifactsPresent = (await Promise.all(artifactPaths.map(exists))).every(Boolean);
    const preAbsenceProved = rows.length === backupIds.length && preArtifactsPresent;
    const removed = await core.db
      .delete(core.backups)
      .where(inArray(core.backups.id, backupIds))
      .returning({ id: core.backups.id });
    counts.record(1, removed.length);
    let artifactFilesRemoved = 0;
    for (const filePath of artifactPaths) {
      if (await removeIfExists(filePath)) artifactFilesRemoved += 1;
    }
    const actor = this.#actor;
    if (actor === null) cleanupFailure("task-511 fixture actor is absent");
    const removedAudit = await core.db
      .delete(core.auditLogs)
      .where(eq(core.auditLogs.actorId, actor.userId))
      .returning({ id: core.auditLogs.id });
    counts.record(1, removedAudit.length);
    const removedAccess = await core.db
      .delete(core.accessLogs)
      .where(eq(core.accessLogs.userId, actor.userId))
      .returning({ id: core.accessLogs.id });
    counts.record(1, removedAccess.length);
    await this.#scheduleLease.restore();
    await this.#settingsLease.restore();
    const removedJoins = await core.db
      .delete(core.userRoles)
      .where(eq(core.userRoles.userId, actor.userId))
      .returning({ id: core.userRoles.userId });
    counts.record(1, removedJoins.length);
    const removedUsers = await core.db
      .delete(core.users)
      .where(eq(core.users.id, actor.userId))
      .returning({ id: core.users.id });
    counts.record(1, removedUsers.length);
    const removedRoles = await core.db
      .delete(core.roles)
      .where(eq(core.roles.id, actor.roleId))
      .returning({ id: core.roles.id });
    counts.record(1, removedRoles.length);
    const remaining = await core.db
      .select({ id: core.backups.id })
      .from(core.backups)
      .where(inArray(core.backups.id, backupIds));
    counts.record(1, remaining.length);
    const postArtifactsPresent = (await Promise.all(artifactPaths.map(exists))).some(Boolean);
    const postAbsenceProved = remaining.length === 0 && !postArtifactsPresent;
    this.#artifactPaths = artifactPaths;
    const counters = counts.snapshot();
    const output: Task511CleanupOutput = Object.freeze({
      schemaVersion: 1,
      backupRowsRemoved: removed.length,
      artifactFilesRemoved,
      scheduleRestored: await this.#scheduleLease.verify(),
      avatarSettingsRestored: await this.#settingsLease.verify(),
      rateLimitRestored: await this.#settingsLease.verify(),
      userRolesRemoved: removedJoins.length,
      usersRemoved: removedUsers.length,
      rolesRemoved: removedRoles.length,
      preAbsenceProved,
      postAbsenceProved,
      statements: counters.statements,
      rows: counters.rows,
    });
    return output;
  }

  async prove(input: Task511ProofInput): Promise<Task511ProofOutput> {
    if (!this.#installed) cleanupFailure("task-511 install state is absent");
    const core = await task511Core();
    const counts = new Task511Counters();
    const backupIds = input.backupIds.filter((id) => TASK511_UUID.test(id));
    if (backupIds.length !== input.backupIds.length) {
      cleanupFailure("task-511 prove backup ids are invalid");
    }
    const rows = await core.db
      .select({ id: core.backups.id })
      .from(core.backups)
      .where(inArray(core.backups.id, backupIds));
    counts.record(1, rows.length);
    const artifactsPresent = (await Promise.all(this.#artifactPaths.map(exists))).some(Boolean);
    const actor = this.#actor;
    let actorAbsent = false;
    if (actor !== null) {
      const usersFound = await core.db
        .select({ id: core.users.id })
        .from(core.users)
        .where(eq(core.users.id, actor.userId));
      const rolesFound = await core.db
        .select({ id: core.roles.id })
        .from(core.roles)
        .where(eq(core.roles.id, actor.roleId));
      counts.record(2, usersFound.length + rolesFound.length);
      actorAbsent = usersFound.length === 0 && rolesFound.length === 0;
    }
    const counters = counts.snapshot();
    return Object.freeze({
      schemaVersion: 1,
      backupsAbsent: rows.length === 0,
      artifactsAbsent: !artifactsPresent,
      scheduleRestored: await this.#scheduleLease.verify(),
      avatarSettingsRestored: await this.#settingsLease.verify(),
      rateLimitRestored: await this.#settingsLease.verify(),
      actorAbsent,
      statements: counters.statements,
      rows: counters.rows,
    });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    const { closeDatabase } = await import("../../../../core/db/client");
    await closeDatabase();
    this.#closed = true;
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed;
  }
}
