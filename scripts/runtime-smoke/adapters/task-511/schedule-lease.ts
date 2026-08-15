import { eq, sql } from "drizzle-orm";

import { SmokeError } from "../../contracts";

/**
 * TASK-511 owned `backup_schedules` row lease.
 *
 * The Update Schedule scenario PATCHes the ambient singleton schedule row
 * through the real admin UI, and the create/import flows read it. The suite
 * snapshots the row at install, restores the exact snapshot (or deletes the
 * row it created) at cleanup, and proves byte-equality at prove time.
 *
 * Unlike the settings lease, the schedule row is intentionally mutated by the
 * run itself (the update-schedule scenario), so restoration is owned by row
 * identity rather than xmin: the singleton row id is stable for the run, and
 * the restore fails closed if the expected row id is missing or a second row
 * appears. Core database modules load lazily so the import graph stays
 * DB-free for the pure A lane.
 */

export type Task511ScheduleSnapshot = Readonly<{
  readonly id: string;
  readonly enabled: boolean;
  readonly frequency: string;
  readonly retentionDays: number;
  readonly storageDriver: string;
  readonly includeJson: string;
  readonly nextRunAt: string | null;
  readonly lastRunAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}>;

type DbTransaction = Parameters<
  Parameters<typeof import("../../../../core/db/client").db.transaction>[0]
>[0];

interface Task511ScheduleCoreHandles {
  readonly acquireNativeCmsWriterFence: (tx: DbTransaction) => Promise<void>;
  readonly db: typeof import("../../../../core/db/client").db;
  readonly backupSchedules: typeof import("../../../../core/db/schema").backupSchedules;
  readonly getBackupSchedule: () => Promise<unknown>;
}

async function task511ScheduleCore(): Promise<Task511ScheduleCoreHandles> {
  const [{ db }, { acquireNativeCmsWriterFence }, { backupSchedules }, backupService] =
    await Promise.all([
      import("../../../../core/db/client"),
      import("../../../../core/db/nativeCmsWriterFence"),
      import("../../../../core/db/schema"),
      import("../../../../core/services/backups/backupService"),
    ]);
  return Object.freeze({
    acquireNativeCmsWriterFence,
    db,
    backupSchedules,
    getBackupSchedule: backupService.getBackupSchedule,
  });
}

function cleanupFailure(message: string): never {
  throw new SmokeError("smoke_cleanup_failed", message);
}

type Task511ScheduleRow = Readonly<{
  readonly id: string;
  readonly enabled: boolean;
  readonly frequency: string;
  readonly retentionDays: number;
  readonly storageDriver: string;
  readonly includeJson: string;
  readonly nextRunAt: string | null;
  readonly lastRunAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}>;

function freezeRow(input: Task511ScheduleRow): Task511ScheduleSnapshot {
  if (
    typeof input.id !== "string" ||
    input.id.length === 0 ||
    typeof input.enabled !== "boolean" ||
    typeof input.frequency !== "string" ||
    typeof input.retentionDays !== "number" ||
    typeof input.storageDriver !== "string" ||
    typeof input.includeJson !== "string" ||
    typeof input.createdAt !== "string" ||
    typeof input.updatedAt !== "string"
  ) {
    cleanupFailure("task-511 backup schedule row is invalid");
  }
  return Object.freeze({
    id: input.id,
    enabled: input.enabled,
    frequency: input.frequency,
    retentionDays: input.retentionDays,
    storageDriver: input.storageDriver,
    includeJson: input.includeJson,
    nextRunAt: input.nextRunAt,
    lastRunAt: input.lastRunAt,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  });
}

function rowMatches(
  current: Task511ScheduleSnapshot | null,
  expected: Task511ScheduleSnapshot
): boolean {
  return (
    current !== null &&
    current.id === expected.id &&
    current.enabled === expected.enabled &&
    current.frequency === expected.frequency &&
    current.retentionDays === expected.retentionDays &&
    current.storageDriver === expected.storageDriver &&
    current.includeJson === expected.includeJson &&
    current.nextRunAt === expected.nextRunAt &&
    current.lastRunAt === expected.lastRunAt &&
    current.createdAt === expected.createdAt &&
    current.updatedAt === expected.updatedAt
  );
}

async function readScheduleRows(
  core: Task511ScheduleCoreHandles
): Promise<readonly Task511ScheduleRow[]> {
  return await core.db
    .select({
      id: core.backupSchedules.id,
      enabled: core.backupSchedules.enabled,
      frequency: core.backupSchedules.frequency,
      retentionDays: core.backupSchedules.retentionDays,
      storageDriver: core.backupSchedules.storageDriver,
      includeJson: sql<string>`${core.backupSchedules.include}::text`.as("include_json"),
      nextRunAt: sql<string | null>`${core.backupSchedules.nextRunAt}::text`.as("next_run_at"),
      lastRunAt: sql<string | null>`${core.backupSchedules.lastRunAt}::text`.as("last_run_at"),
      createdAt: sql<string>`${core.backupSchedules.createdAt}::text`.as("created_at"),
      updatedAt: sql<string>`${core.backupSchedules.updatedAt}::text`.as("updated_at"),
    })
    .from(core.backupSchedules)
    .orderBy(sql`${core.backupSchedules.id}`);
}

export class Task511ScheduleLease {
  #snapshot: Task511ScheduleSnapshot | null = null;
  #createdId: string | null = null;
  #applied = false;

  get snapshot(): Task511ScheduleSnapshot | null {
    return this.#snapshot;
  }

  async apply(): Promise<void> {
    const core = await task511ScheduleCore();
    await core.db.transaction(async (tx) => {
      await core.acquireNativeCmsWriterFence(tx);
      const rows = await readScheduleRows(core);
      if (rows.length > 1) cleanupFailure("task-511 backup schedule is not a singleton");
      if (rows[0] !== undefined) {
        this.#snapshot = freezeRow(rows[0]);
        this.#createdId = null;
      } else {
        // No ambient row: create the canonical default through the app's own
        // service (same values the admin page GET would create) and own it.
        await core.getBackupSchedule();
        const createdRows = await readScheduleRows(core);
        if (createdRows.length !== 1 || createdRows[0] === undefined) {
          cleanupFailure("task-511 backup schedule could not be created");
        }
        this.#snapshot = freezeRow(createdRows[0]);
        this.#createdId = createdRows[0].id;
      }
      this.#applied = true;
    });
  }

  async restore(): Promise<void> {
    if (!this.#applied || this.#snapshot === null) return;
    const core = await task511ScheduleCore();
    await core.db.transaction(async (tx) => {
      await core.acquireNativeCmsWriterFence(tx);
      const rows = await readScheduleRows(core);
      if (rows.length > 1) cleanupFailure("task-511 backup schedule is not a singleton");
      if (this.#createdId !== null) {
        const current = rows[0];
        if (current === undefined || current.id !== this.#createdId) {
          cleanupFailure("task-511 backup schedule lease drifted");
        }
        const [deleted] = await tx
          .delete(core.backupSchedules)
          .where(eq(core.backupSchedules.id, this.#createdId))
          .returning({ id: core.backupSchedules.id });
        if (deleted === undefined || deleted.id !== this.#createdId) {
          cleanupFailure("task-511 backup schedule removal drifted");
        }
        return;
      }
      const snapshot = this.#snapshot!;
      const current = rows[0];
      if (current === undefined || current.id !== snapshot.id) {
        cleanupFailure("task-511 backup schedule row is missing");
      }
      const [updated] = await tx
        .update(core.backupSchedules)
        .set({
          enabled: snapshot.enabled,
          frequency: snapshot.frequency,
          retentionDays: snapshot.retentionDays,
          storageDriver: snapshot.storageDriver,
          include: sql`${snapshot.includeJson}::jsonb`,
          nextRunAt: snapshot.nextRunAt === null ? null : sql`${snapshot.nextRunAt}::timestamptz`,
          lastRunAt: snapshot.lastRunAt === null ? null : sql`${snapshot.lastRunAt}::timestamptz`,
          createdAt: sql`${snapshot.createdAt}::timestamptz`,
          updatedAt: sql`${snapshot.updatedAt}::timestamptz`,
        })
        .where(eq(core.backupSchedules.id, snapshot.id))
        .returning({ id: core.backupSchedules.id });
      if (updated === undefined || updated.id !== snapshot.id) {
        cleanupFailure("task-511 backup schedule restoration drifted");
      }
    });
  }

  async verify(): Promise<boolean> {
    if (!this.#applied || this.#snapshot === null) return false;
    const core = await task511ScheduleCore();
    const rows = await readScheduleRows(core);
    if (rows.length > 1) return false;
    if (this.#createdId !== null) return rows.length === 0;
    const current = rows[0];
    return current === undefined ? false : rowMatches(freezeRow(current), this.#snapshot);
  }
}
