// TASK-512-07 (§A) — DB-level schema/migration guard for migration 0067
// (media_folders table + media metadata columns). Asserts the schema-level
// contracts that the route lanes exercise indirectly, at the storage layer:
//   - media_folders round-trips (name/slug/orderIndex default, self-ref nesting)
//   - media.tags backfills to [] when a legacy-style insert omits it (byte-safe)
//   - slug uniqueness is enforced at the DB (unique index media_folders_slug_idx)
//   - deleting a folder sets media.folder_id → null (onDelete:"set null"),
//     NEVER cascade-deleting the asset row
// Lives under tests/integration/server (a test:bun-globbed dir) so it runs in
// the standard Bun lane; skips cleanly when no DB is reachable.
import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { media, mediaFolders } from "../../../core/db/schema";

process.env.DATABASE_URL ??= "postgres://localhost/nextless_test";

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

const uniqueName = (prefix = "Folder") => `${prefix} ${crypto.randomUUID()}`;
const uniqueSlug = (prefix = "f") => `${prefix}-${crypto.randomUUID()}`;

const createdFolders: string[] = [];
const createdMedia: string[] = [];

const insertMedia = async (overrides: Partial<typeof media.$inferInsert> = {}) => {
  const [row] = await db
    .insert(media)
    .values({
      key: `k-${crypto.randomUUID()}`,
      url: `https://example.test/${crypto.randomUUID()}.png`,
      type: "image",
      mimeType: "image/png",
      size: 1234,
      ...overrides,
    })
    .returning();
  createdMedia.push(row.id);
  return row;
};

const insertFolder = async (overrides: Partial<typeof mediaFolders.$inferInsert> = {}) => {
  const [row] = await db
    .insert(mediaFolders)
    .values({ name: uniqueName(), slug: uniqueSlug(), ...overrides })
    .returning();
  createdFolders.push(row.id);
  return row;
};

afterEach(async () => {
  if (!hasDb) return;
  for (const id of createdMedia.splice(0)) {
    await db.delete(media).where(eq(media.id, id));
  }
  for (const id of createdFolders.splice(0)) {
    await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
  }
});

testIfDb("media_folders round-trips with orderIndex default and self-ref nesting", async () => {
  const parent = await insertFolder({ name: "Parent", orderIndex: 5 });
  expect(parent.orderIndex).toBe(5);
  expect(parent.parentId).toBeNull();

  const child = await insertFolder({ name: "Child", parentId: parent.id });
  expect(child.parentId).toBe(parent.id);
  // Default orderIndex is 0 when omitted.
  expect(child.orderIndex).toBe(0);
});

testIfDb("media.tags backfills to [] when a legacy-style insert omits it", async () => {
  const row = await insertMedia();
  expect(Array.isArray(row.tags)).toBe(true);
  expect(row.tags).toEqual([]);
  // New optional metadata columns default to null on a bare insert (byte-safe legacy read).
  expect(row.folderId).toBeNull();
  expect(row.focalX).toBeNull();
  expect(row.focalY).toBeNull();
  expect(row.description).toBeNull();
  expect(row.credit).toBeNull();
});

testIfDb("media_folders slug uniqueness is enforced at the DB", async () => {
  const slug = uniqueSlug("dup");
  await insertFolder({ slug });
  let threw = false;
  try {
    await insertFolder({ slug });
  } catch {
    threw = true;
  }
  expect(threw).toBe(true);
});

testIfDb(
  "deleting a folder sets media.folder_id null (never cascade-deletes the asset)",
  async () => {
    const folder = await insertFolder();
    const asset = await insertMedia({ folderId: folder.id });
    expect(asset.folderId).toBe(folder.id);

    await db.delete(mediaFolders).where(eq(mediaFolders.id, folder.id));
    // The folder is gone; the asset must survive with folder_id nulled.
    const [after] = await db.select().from(media).where(eq(media.id, asset.id));
    expect(after).toBeDefined();
    expect(after.folderId).toBeNull();
  }
);
