import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { media, mediaFolders } from "../../../core/db/schema";
import {
  createMediaFolder,
  deleteMediaFolder,
  listMediaFolders,
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

testIfDb("updateMediaFolder renames and returns the row", async () => {
  const folder = await track(await createMediaFolder({ name: uniqueName() }));
  const updated = await updateMediaFolder(folder.id, { name: "Renamed" });
  expect(updated?.name).toBe("Renamed");
});

testIfDb("updateMediaFolder returns null for a missing id", async () => {
  expect(await updateMediaFolder(crypto.randomUUID(), { name: "x" })).toBeNull();
});

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
