import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, users } from "../../../core/db/schema";
import {
  getEntry,
  getEntryAccessPasswordHash,
  getEntryBySlug,
} from "../../../core/services/content/entryReadService";
import { createEntry, updateEntryMetadata } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";

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

const trackedUserIds = new Set<string>();
const trackedEntryIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `entry-hash-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (!actor?.id) throw new Error("missing_entry_hash_actor");
  trackedUserIds.add(actor.id);
  return actor;
};

const seedEntry = async (visibility: "public" | "password", accessPassword?: string) => {
  const actor = await createActor();
  const token = randomUUID().slice(0, 8);
  const contentType = await createContentType({
    name: `Entry hash ${token}`,
    slug: `entry-hash-${token}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { body: { type: "string" } },
    },
  });
  trackedContentTypeIds.add(contentType.id);

  const entry = await createEntry(contentType.id, {
    title: `Entry hash fixture ${token}`,
    slug: `entry-hash-fixture-${token}`,
    authorId: actor.id,
    data: { body: `Body ${token}` },
  });
  if (!entry) throw new Error("missing_entry_hash_fixture");
  trackedEntryIds.add(entry.id);

  await updateEntryMetadata(
    entry.id,
    {
      status: "published",
      visibility,
      ...(accessPassword !== undefined ? { accessPassword } : {}),
    },
    actor.id
  );
  return { actor, contentType, entry, token };
};

const cleanupTrackedRows = async () => {
  const entryIds = [...trackedEntryIds];
  const contentTypeIds = [...trackedContentTypeIds];
  const userIds = [...trackedUserIds];

  if (entryIds.length > 0) {
    await db.delete(contentEntries).where(inArray(contentEntries.id, entryIds));
  }
  if (contentTypeIds.length > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.id, contentTypeIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedEntryIds.clear();
  trackedContentTypeIds.clear();
  trackedUserIds.clear();
};

afterEach(async () => {
  if (!hasDb) return;
  await cleanupTrackedRows();
});

testIfDb(
  "returns the hashed access_password for a password entry, never the plaintext",
  async () => {
    const plaintext = `correct-horse-${randomUUID().slice(0, 8)}`;
    const { entry } = await seedEntry("password", plaintext);

    const hash = await getEntryAccessPasswordHash(entry.id);
    expect(hash).not.toBeNull();
    expect(hash).not.toBe(plaintext);
    expect(hash?.startsWith("$argon2id$")).toBe(true);
  }
);

testIfDb("returns null for a public entry with no password", async () => {
  const { entry } = await seedEntry("public");

  expect(await getEntryAccessPasswordHash(entry.id)).toBeNull();
});

testIfDb("returns null for a missing entry id", async () => {
  // Invalid UUID format → guarded, returns null without querying.
  expect(await getEntryAccessPasswordHash("does-not-exist")).toBeNull();
  // Valid UUID format that does not exist → DB null path, still null.
  expect(await getEntryAccessPasswordHash(randomUUID())).toBeNull();
});

testIfDb("returns null for an empty entry id", async () => {
  expect(await getEntryAccessPasswordHash("")).toBeNull();
});

testIfDb("read projections stay hash-free (grep-guard against widening)", async () => {
  const { entry } = await seedEntry("password", "guarded-plaintext");

  const viaId = await getEntry(entry.id);
  expect(viaId).not.toBeNull();
  expect("accessPassword" in viaId!).toBe(false);

  const viaSlug = await getEntryBySlug(entry.typeId, entry.slug);
  expect(viaSlug).not.toBeNull();
  expect("accessPassword" in viaSlug!).toBe(false);
});
