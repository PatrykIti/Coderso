import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { media, mediaFolders } from "../../../core/db/schema";
import {
  getMediaById,
  normalizeMediaMeta,
  updateMedia,
} from "../../../core/services/media/mediaService";
import { createMediaFolder } from "../../../core/services/media/mediaFoldersService";

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

const createdMedia: string[] = [];
const createdFolders: string[] = [];

async function insertMedia(overrides: Partial<typeof media.$inferInsert> = {}) {
  const [row] = await db
    .insert(media)
    .values({
      key: `test/${crypto.randomUUID()}.png`,
      url: "http://localhost/media/test.png",
      type: "image",
      mimeType: "image/png",
      size: 123,
      ...overrides,
    })
    .returning();
  createdMedia.push(row.id);
  return row;
}

afterEach(async () => {
  if (!hasDb) return;
  for (const id of createdMedia.splice(0)) {
    await db.delete(media).where(eq(media.id, id));
  }
  for (const id of createdFolders.splice(0)) {
    await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
  }
});

// ---- pure normalizeMediaMeta coverage (no DB) ----

test("normalizeMediaMeta clamps focal to [0,1]", () => {
  expect(normalizeMediaMeta({ focalX: 2, focalY: -1 })).toEqual({ focalX: 1, focalY: 0 });
  expect(normalizeMediaMeta({ focalX: 0.25 })).toEqual({ focalX: 0.25 });
});

test("normalizeMediaMeta rejects NaN / non-number focal", () => {
  expect(() => normalizeMediaMeta({ focalX: Number.NaN })).toThrow("media_focal_invalid");
  expect(() => normalizeMediaMeta({ focalY: "x" as unknown as number })).toThrow(
    "media_focal_invalid"
  );
});

test("normalizeMediaMeta null focal clears", () => {
  expect(normalizeMediaMeta({ focalX: null, focalY: null })).toEqual({
    focalX: null,
    focalY: null,
  });
});

test("normalizeMediaMeta dedupes, trims, and caps tags", () => {
  const out = normalizeMediaMeta({ tags: ["  A ", "a", "b", "b", ""] });
  expect(out.tags).toEqual(["A", "b"]);
});

test("normalizeMediaMeta caps tag count at 30 and length at 40", () => {
  const many = Array.from({ length: 50 }, (_, i) => `tag${i}`);
  const out = normalizeMediaMeta({ tags: many });
  expect(out.tags?.length).toBe(30);
  const long = "x".repeat(100);
  const capped = normalizeMediaMeta({ tags: [long] });
  expect(capped.tags?.[0]?.length).toBe(40);
});

test("normalizeMediaMeta rejects non-array tags", () => {
  expect(() => normalizeMediaMeta({ tags: "nope" as unknown as string[] })).toThrow(
    "media_tags_invalid"
  );
});

test("normalizeMediaMeta coerces null tags to []", () => {
  expect(normalizeMediaMeta({ tags: null as unknown as string[] })).toEqual({ tags: [] });
});

test("normalizeMediaMeta caps description and credit length", () => {
  const out = normalizeMediaMeta({
    description: "d".repeat(5000),
    credit: "c".repeat(1000),
  });
  expect(out.description?.length).toBe(2000);
  expect(out.credit?.length).toBe(300);
});

test("normalizeMediaMeta rejects a non-uuid folderId", () => {
  expect(() => normalizeMediaMeta({ folderId: "not-a-uuid" })).toThrow("media_folder_not_found");
});

test("normalizeMediaMeta keeps key set a SUBSET of input (no default injection)", () => {
  expect(normalizeMediaMeta({ alt: "hi" })).toEqual({ alt: "hi" });
  expect(Object.keys(normalizeMediaMeta({ alt: "hi" }))).toEqual(["alt"]);
});

// ---- DB round-trip coverage ----

testIfDb("updateMedia persists new fields and round-trips", async () => {
  const row = await insertMedia();
  const updated = await updateMedia(row.id, {
    tags: ["photo", "hero"],
    focalX: 0.4,
    focalY: 0.6,
    description: "A hero image",
    credit: "Jane Doe",
  });
  expect(updated?.tags).toEqual(["photo", "hero"]);
  expect(updated?.focalX).toBeCloseTo(0.4, 5);
  expect(updated?.focalY).toBeCloseTo(0.6, 5);
  expect(updated?.description).toBe("A hero image");
  expect(updated?.credit).toBe("Jane Doe");
});

testIfDb("updateMedia is present-only: patching {alt} leaves other fields untouched", async () => {
  const row = await insertMedia();
  await updateMedia(row.id, {
    tags: ["keep"],
    focalX: 0.3,
    description: "keep-desc",
    credit: "keep-credit",
  });
  await updateMedia(row.id, { alt: "new alt" });
  const after = await getMediaById(row.id);
  expect(after?.alt).toBe("new alt");
  expect(after?.tags).toEqual(["keep"]);
  expect(after?.focalX).toBeCloseTo(0.3, 5);
  expect(after?.description).toBe("keep-desc");
  expect(after?.credit).toBe("keep-credit");
});

testIfDb("updateMedia assigns an existing folder and clears it", async () => {
  const folder = await createMediaFolder({ name: `Meta ${crypto.randomUUID()}` });
  createdFolders.push(folder.id);
  const row = await insertMedia();

  const assigned = await updateMedia(row.id, { folderId: folder.id });
  expect(assigned?.folderId).toBe(folder.id);

  const cleared = await updateMedia(row.id, { folderId: null });
  expect(cleared?.folderId).toBeNull();
});

testIfDb("updateMedia rejects a non-existent folderId", async () => {
  const row = await insertMedia();
  await expect(updateMedia(row.id, { folderId: crypto.randomUUID() })).rejects.toThrow(
    "media_folder_not_found"
  );
});
