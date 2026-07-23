import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";

import { db } from "../../../core/db/client";
import { media, mediaFolders } from "../../../core/db/schema";
import {
  createMediaFolder,
  deleteMediaFolder,
  isMediaFolderSlugConflict,
  listMediaFolders,
  mapOwnedFolderConstraint,
  normalizeMediaFolderInput,
  reorderMediaFolders,
  updateMediaFolder,
} from "../../../core/services/media/mediaFoldersService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const createdFolders: string[] = [];
const createdMedia: string[] = [];

function uniqueName(prefix = "Folder") {
  return `${prefix} ${crypto.randomUUID()}`;
}

async function track(folder: { id: string }) {
  createdFolders.push(folder.id);
  return folder;
}

type WriteKind = "insert" | "update";

type WriteWaitObservation = {
  waiter_pid: number;
  statement: string;
  blocking_pids: number[];
  waiting_transaction_id: string;
  blocker_transaction_id: string;
  waiting_mode: string;
  blocker_mode: string;
  blocker_pid: number;
};

type SlugRaceResult = {
  blockerPid: number;
  observation: WriteWaitObservation;
  operationError: unknown;
};

const requireDatabaseUrl = (): string => {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for media folder race tests");
  return value;
};

const statementMatchesWrite = (statement: string, kind: WriteKind): boolean => {
  const normalized = statement.trim().replace(/\s+/g, " ").toLowerCase();
  return kind === "insert"
    ? normalized.startsWith('insert into "media_folders"')
    : normalized.startsWith('update "media_folders" set');
};

async function waitForWriteBarrier(
  inspector: ReturnType<typeof postgres>,
  blockerPid: number,
  kind: WriteKind,
  operationSettled: () => boolean
): Promise<WriteWaitObservation> {
  const deadline = Date.now() + 6_000;
  while (Date.now() < deadline) {
    if (operationSettled()) {
      throw new Error(`media folder ${kind} settled before the PostgreSQL write-wait barrier`);
    }

    const rows = await inspector<WriteWaitObservation[]>`
      select
        waiter.pid::int as waiter_pid,
        waiter.query as statement,
        pg_blocking_pids(waiter.pid)::int[] as blocking_pids,
        waiting_lock.transactionid::text as waiting_transaction_id,
        blocker_lock.transactionid::text as blocker_transaction_id,
        waiting_lock.mode as waiting_mode,
        blocker_lock.mode as blocker_mode,
        blocker_lock.pid::int as blocker_pid
      from pg_stat_activity as waiter
      join pg_locks as waiting_lock
        on waiting_lock.pid = waiter.pid
       and waiting_lock.locktype = 'transactionid'
       and waiting_lock.granted = false
      join pg_locks as blocker_lock
        on blocker_lock.pid = ${blockerPid}
       and blocker_lock.locktype = 'transactionid'
       and blocker_lock.granted = true
       and blocker_lock.transactionid = waiting_lock.transactionid
      where waiter.datname = current_database()
        and waiter.wait_event_type = 'Lock'
        and ${blockerPid} = any(pg_blocking_pids(waiter.pid))
    `;
    const observation = rows.find(
      (row) =>
        row.blocker_pid === blockerPid &&
        row.blocking_pids.includes(blockerPid) &&
        statementMatchesWrite(row.statement, kind)
    );
    if (observation) return observation;

    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for the blocked media folder ${kind}`);
}

async function runSlugRace(
  kind: WriteKind,
  slug: string,
  startOperation: () => Promise<unknown>
): Promise<SlugRaceResult> {
  const blockerId = crypto.randomUUID();
  const databaseUrl = requireDatabaseUrl();
  let blockerClient: ReturnType<typeof postgres> | null = null;
  let inspector: ReturnType<typeof postgres> | null = null;
  let blocker: Awaited<ReturnType<ReturnType<typeof postgres>["reserve"]>> | null = null;
  let transactionOpen = false;
  let operation: Promise<unknown> | null = null;
  let result: SlugRaceResult | null = null;
  let primaryFailed = false;
  let primaryError: unknown;

  try {
    blockerClient = postgres(databaseUrl, { max: 1 });
    inspector = postgres(databaseUrl, { max: 1 });
    blocker = await blockerClient.reserve();
    await blocker`begin`;
    transactionOpen = true;
    const [pidRow] = await blocker<{ pid: number }[]>`select pg_backend_pid()::int as pid`;
    const blockerPid = pidRow.pid;
    await blocker`
      insert into media_folders (id, name, slug, order_index)
      values (${blockerId}::uuid, ${`Blocker ${blockerId}`}, ${slug}, 0)
    `;

    operation = startOperation();
    let operationSettled = false;
    void operation.then(
      () => {
        operationSettled = true;
      },
      () => {
        operationSettled = true;
      }
    );
    const observation = await waitForWriteBarrier(
      inspector,
      blockerPid,
      kind,
      () => operationSettled
    );

    await blocker`commit`;
    transactionOpen = false;

    let operationError: unknown = null;
    try {
      await operation;
    } catch (error) {
      operationError = error;
    }
    result = { blockerPid, observation, operationError };
  } catch (error) {
    primaryFailed = true;
    primaryError = error;
  }

  const cleanupErrors: unknown[] = [];
  if (transactionOpen && blocker) {
    try {
      await blocker`rollback`;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (blocker) {
    try {
      await blocker.release();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  for (const client of [blockerClient, inspector]) {
    if (!client) continue;
    try {
      await client.end({ timeout: 1 });
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (operation && primaryFailed) {
    const settlement = await Promise.race([
      operation.then(
        () => ({ settled: true as const, error: null }),
        (error: unknown) => ({ settled: true as const, error })
      ),
      new Promise<{ settled: false; error: null }>((resolve) =>
        setTimeout(() => resolve({ settled: false, error: null }), 2_000)
      ),
    ]);
    if (!settlement.settled) {
      cleanupErrors.push(new Error("media folder race operation did not settle during cleanup"));
    } else if (settlement.error !== null) {
      cleanupErrors.push(settlement.error);
    }
  }
  try {
    await db.delete(mediaFolders).where(eq(mediaFolders.slug, slug));
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (primaryFailed) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [primaryError, ...cleanupErrors],
        "media folder race and cleanup failed",
        { cause: primaryError }
      );
    }
    throw primaryError;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "media folder race cleanup failed");
  }
  if (!result) throw new Error("media folder race completed without a result");
  return result;
}

const expectOwnedConflictResult = (result: SlugRaceResult, kind: WriteKind) => {
  const { blockerPid, observation, operationError } = result;
  expect(observation.blocker_pid).toBe(blockerPid);
  expect(observation.blocking_pids).toContain(blockerPid);
  expect(observation.waiter_pid).not.toBe(blockerPid);
  expect(statementMatchesWrite(observation.statement, kind)).toBe(true);
  expect(observation.waiting_transaction_id).toBe(observation.blocker_transaction_id);
  expect(observation.waiting_transaction_id).toMatch(/^\d+$/);
  expect(observation.waiting_mode).toBe("ShareLock");
  expect(observation.blocker_mode).toBe("ExclusiveLock");
  expect(operationError).toBeInstanceOf(Error);
  expect((operationError as Error).message).toBe("media_folder_slug_conflict");
  expect(Object.prototype.hasOwnProperty.call(operationError, "cause")).toBe(false);
};

afterEach(async () => {
  if (!hasDb) return;
  for (const id of createdMedia.splice(0)) {
    await db.delete(media).where(eq(media.id, id));
  }
  // Delete children first is unnecessary (self-ref set null), but clear all tracked.
  for (const id of createdFolders.splice(0)) {
    await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
  }
});

// ---- pure normalizeMediaFolderInput coverage (no DB) ----

test("normalizeMediaFolderInput trims name and requires it", () => {
  expect(normalizeMediaFolderInput({ name: "  Photos  " }).name).toBe("Photos");
  expect(() => normalizeMediaFolderInput({ name: "   " })).toThrow("media_folder_name_required");
});

test("normalizeMediaFolderInput derives slug from name when omitted", () => {
  expect(normalizeMediaFolderInput({ name: "My Cool Photos!" }).slug).toBe("my-cool-photos");
});

test("normalizeMediaFolderInput coerces orderIndex to a non-negative int", () => {
  expect(normalizeMediaFolderInput({ name: "x", orderIndex: 3.9 }).orderIndex).toBe(3);
  expect(normalizeMediaFolderInput({ name: "x", orderIndex: -5 }).orderIndex).toBe(0);
});

test("normalizeMediaFolderInput is present-only for parentId/orderIndex", () => {
  const out = normalizeMediaFolderInput({ name: "x" });
  expect(Object.prototype.hasOwnProperty.call(out, "parentId")).toBe(false);
  expect(Object.prototype.hasOwnProperty.call(out, "orderIndex")).toBe(false);
});

// ---- pure owned PostgreSQL constraint coverage (no DB) ----

const expectUnmatchedConstraintIdentity = (candidate: unknown) => {
  expect(isMediaFolderSlugConflict(candidate)).toBe(false);
  let caught: unknown;
  try {
    mapOwnedFolderConstraint(candidate);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBe(candidate);
};

test("isMediaFolderSlugConflict accepts only direct or bounded wrapped owned errors", () => {
  const owned = { code: "23505", constraint_name: "media_folders_slug_idx" };
  const overDepth = { cause: { cause: { cause: owned } } };
  expect(isMediaFolderSlugConflict(owned)).toBe(true);
  expect(isMediaFolderSlugConflict({ cause: owned })).toBe(true);
  expect(isMediaFolderSlugConflict({ cause: { cause: owned } })).toBe(true);
  expectUnmatchedConstraintIdentity(overDepth);
  expect(() => mapOwnedFolderConstraint(owned)).toThrow("media_folder_slug_conflict");
});

test("isMediaFolderSlugConflict rejects aliases, unrelated constraints, codes, and inherited data", () => {
  const inherited = Object.create({
    code: "23505",
    constraint_name: "media_folders_slug_idx",
  }) as object;
  const nonMatches: unknown[] = [
    { code: "23505", constraint_name: "unrelated_unique_idx" },
    { code: "22000", constraint_name: "media_folders_slug_idx" },
    { code: "23505", constraint: "media_folders_slug_idx" },
    { code: 23505, constraint_name: "media_folders_slug_idx" },
    inherited,
  ];

  for (const candidate of nonMatches) {
    expectUnmatchedConstraintIdentity(candidate);
  }
});

test("isMediaFolderSlugConflict never invokes cause, code, or constraint accessors", () => {
  let getterCalls = 0;
  const causeAccessor = {};
  Object.defineProperty(causeAccessor, "cause", {
    get: () => {
      getterCalls += 1;
      return { code: "23505", constraint_name: "media_folders_slug_idx" };
    },
  });
  const codeAccessor = { constraint_name: "media_folders_slug_idx" };
  Object.defineProperty(codeAccessor, "code", {
    get: () => {
      getterCalls += 1;
      return "23505";
    },
  });
  const constraintAccessor = { code: "23505" };
  Object.defineProperty(constraintAccessor, "constraint_name", {
    get: () => {
      getterCalls += 1;
      return "media_folders_slug_idx";
    },
  });

  expectUnmatchedConstraintIdentity(causeAccessor);
  expectUnmatchedConstraintIdentity(codeAccessor);
  expectUnmatchedConstraintIdentity(constraintAccessor);
  expect(getterCalls).toBe(0);
});

test("isMediaFolderSlugConflict fails closed for cycles and descriptor-trapping proxies", () => {
  const cyclic: { cause?: unknown } = {};
  cyclic.cause = cyclic;
  const throwingProxy = new Proxy(
    {},
    {
      getOwnPropertyDescriptor: () => {
        throw new Error("descriptor trap");
      },
    }
  );
  const revocable = Proxy.revocable({}, {});
  revocable.revoke();

  expectUnmatchedConstraintIdentity(cyclic);
  expect(() => isMediaFolderSlugConflict(throwingProxy)).not.toThrow();
  expectUnmatchedConstraintIdentity(throwingProxy);
  expect(() => isMediaFolderSlugConflict(revocable.proxy)).not.toThrow();
  expectUnmatchedConstraintIdentity(revocable.proxy);
});

// ---- DB coverage ----

testIfDb("createMediaFolder + listMediaFolders round-trip", async () => {
  const folder = await track(await createMediaFolder({ name: uniqueName() }));
  const all = await listMediaFolders();
  expect(all.some((f) => f.id === folder.id)).toBe(true);
});

testIfDb("createMediaFolder rejects a duplicate slug", async () => {
  const slug = `dup-${crypto.randomUUID()}`;
  await track(await createMediaFolder({ name: "First", slug }));
  await expect(createMediaFolder({ name: "Second", slug })).rejects.toThrow(
    "media_folder_slug_conflict"
  );
});

testIfDb(
  "createMediaFolder maps the owned constraint after an observed blocked INSERT",
  async () => {
    const slug = `race-create-${crypto.randomUUID()}`;
    const result = await runSlugRace("insert", slug, () =>
      createMediaFolder({ name: uniqueName("Create race"), slug })
    );
    expectOwnedConflictResult(result, "insert");
  }
);

testIfDb("updateMediaFolder renames and returns the row", async () => {
  const folder = await track(await createMediaFolder({ name: uniqueName() }));
  const updated = await updateMediaFolder(folder.id, { name: "Renamed" });
  expect(updated?.name).toBe("Renamed");
});

testIfDb("updateMediaFolder returns null for a missing id", async () => {
  expect(await updateMediaFolder(crypto.randomUUID(), { name: "x" })).toBeNull();
});

testIfDb(
  "updateMediaFolder maps the owned constraint after an observed blocked UPDATE",
  async () => {
    const target = await createMediaFolder({
      name: uniqueName("Update race target"),
      slug: `race-update-source-${crypto.randomUUID()}`,
    });
    const slug = `race-update-destination-${crypto.randomUUID()}`;
    try {
      const result = await runSlugRace("update", slug, () =>
        updateMediaFolder(target.id, { slug })
      );
      expectOwnedConflictResult(result, "update");
    } finally {
      await db.delete(mediaFolders).where(eq(mediaFolders.id, target.id));
    }
  }
);

testIfDb("updateMediaFolder rejects self-parent (cycle)", async () => {
  const folder = await track(await createMediaFolder({ name: uniqueName() }));
  await expect(updateMediaFolder(folder.id, { parentId: folder.id })).rejects.toThrow(
    "media_folder_cycle"
  );
});

testIfDb("updateMediaFolder rejects a cycle across two folders", async () => {
  const a = await track(await createMediaFolder({ name: uniqueName("A") }));
  const b = await track(await createMediaFolder({ name: uniqueName("B"), parentId: a.id }));
  // Making A a child of B would create A -> B -> A.
  await expect(updateMediaFolder(a.id, { parentId: b.id })).rejects.toThrow("media_folder_cycle");
});

testIfDb("createMediaFolder rejects nesting beyond MAX_DEPTH (5)", async () => {
  let parentId: string | null = null;
  for (let depth = 1; depth <= 5; depth += 1) {
    const folder = await track(
      await createMediaFolder({ name: uniqueName(`D${depth}`), parentId })
    );
    parentId = folder.id;
  }
  await expect(createMediaFolder({ name: uniqueName("D6"), parentId })).rejects.toThrow(
    "media_folder_depth_exceeded"
  );
});

testIfDb("reorderMediaFolders updates orderIndex", async () => {
  const a = await track(await createMediaFolder({ name: uniqueName("A"), orderIndex: 0 }));
  const b = await track(await createMediaFolder({ name: uniqueName("B"), orderIndex: 1 }));
  await reorderMediaFolders([
    { id: a.id, orderIndex: 5 },
    { id: b.id, orderIndex: 2 },
  ]);
  const all = await listMediaFolders();
  expect(all.find((f) => f.id === a.id)?.orderIndex).toBe(5);
  expect(all.find((f) => f.id === b.id)?.orderIndex).toBe(2);
});

testIfDb("deleteMediaFolder un-files media (folderId -> null), never deletes media", async () => {
  const folder = await track(await createMediaFolder({ name: uniqueName() }));
  const [asset] = await db
    .insert(media)
    .values({
      key: `test/${crypto.randomUUID()}.png`,
      url: "http://localhost/media/x.png",
      type: "image",
      mimeType: "image/png",
      size: 10,
      folderId: folder.id,
    })
    .returning();
  createdMedia.push(asset.id);

  await deleteMediaFolder(folder.id);
  // folder is gone; do not double-delete in teardown
  createdFolders.splice(createdFolders.indexOf(folder.id), 1);

  const [after] = await db.select().from(media).where(eq(media.id, asset.id));
  expect(after).toBeDefined();
  expect(after.folderId).toBeNull();
});
