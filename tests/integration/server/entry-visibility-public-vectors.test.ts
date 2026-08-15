import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, users } from "../../../core/db/schema";
import { createEntry, updateEntryMetadata } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import { searchPublicIndex } from "../../../core/services/search/searchIndexService";
import { fetchListingSourceRows } from "../../../core/services/content/listingSources";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsContracts";

// No import-time DB probe (pages-runtime lane pattern): test bodies fail
// loudly if the DB is down instead of a postgres.js pool 'error' killing the
// whole bun process during an eager select 1.
const hasDb = Boolean(process.env.DATABASE_URL);
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

const trackedUserIds = new Set<string>();
const trackedEntryIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `public-vector-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (!actor?.id) throw new Error("missing_public_vector_actor");
  trackedUserIds.add(actor.id);
  return actor;
};

const seedVectorFixture = async () => {
  const actor = await createActor();
  const token = randomUUID().slice(0, 8);
  const contentType = await createContentType({
    name: `Vis vectors ${token}`,
    slug: `vis-vectors-${token}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { body: { type: "string" } },
    },
  });
  trackedContentTypeIds.add(contentType.id);

  const seed = async (visibility: "public" | "private" | "password", accessPassword?: string) => {
    const entry = await createEntry(contentType.id, {
      title: `Vector ${visibility} ${token}`,
      slug: `vector-${visibility}-${token}`,
      authorId: actor.id,
      data: { body: `Vector body ${visibility} ${token}` },
    });
    if (!entry) throw new Error("missing_public_vector_entry");
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
    return entry;
  };

  const publicEntry = await seed("public");
  const privateEntry = await seed("private");
  const passwordEntry = await seed("password", "vector-password");

  const contentRoutes: ContentRouteSetting[] = [
    {
      type: contentType.slug,
      listPath: `/${contentType.slug}`,
      detailPath: `/${contentType.slug}/:slug`,
      enabled: true,
      detailPageId: null,
    },
  ];

  return { actor, contentType, publicEntry, privateEntry, passwordEntry, contentRoutes, token };
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

testIfDbWithOptions(
  "anonymous public search omits private and password entries",
  async () => {
    const { publicEntry, privateEntry, passwordEntry, contentRoutes, token } =
      await seedVectorFixture();

    const result = await searchPublicIndex(`Vector ${token}`, {
      sources: "entries",
      contentRoutes,
    });

    const entryIds = result.items.map((item) => item.id);
    expect(entryIds).toContain(publicEntry.id);
    expect(entryIds).not.toContain(privateEntry.id);
    expect(entryIds).not.toContain(passwordEntry.id);

    const entrySlugs = result.items.map((item) => item.slug);
    expect(entrySlugs).toContain(publicEntry.slug);
    expect(entrySlugs).not.toContain(privateEntry.slug);
    expect(entrySlugs).not.toContain(passwordEntry.slug);
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "static-page listing blocks omit private and password entries",
  async () => {
    const { contentType, publicEntry, privateEntry, passwordEntry } = await seedVectorFixture();

    const rows = await fetchListingSourceRows("entries", {
      contentTypeId: contentType.id,
      includeDrafts: false,
    });

    const rowIds = rows.map((row) => row.id);
    expect(rowIds).toContain(publicEntry.id);
    expect(rowIds).not.toContain(privateEntry.id);
    expect(rowIds).not.toContain(passwordEntry.id);
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "legacy out-of-enum visibility entries never appear in listing blocks (fail-closed)",
  async () => {
    const { contentType, token } = await seedVectorFixture();
    const actor = await createActor();
    const legacyEntry = await createEntry(contentType.id, {
      title: `Vector legacy ${token}`,
      slug: `vector-legacy-${token}`,
      authorId: actor.id,
      data: { body: "Legacy" },
    });
    if (!legacyEntry) throw new Error("missing_legacy_vector_entry");
    trackedEntryIds.add(legacyEntry.id);
    await updateEntryMetadata(legacyEntry.id, { status: "published" }, actor.id);
    // The column is NOT NULL (default 'public'), so a legacy row is simulated by
    // an out-of-enum value — treated as non-public (fail-closed).
    await db
      .update(contentEntries)
      .set({ visibility: "legacy-unknown" })
      .where(inArray(contentEntries.id, [legacyEntry.id]));

    const rows = await fetchListingSourceRows("entries", {
      contentTypeId: contentType.id,
      includeDrafts: false,
    });
    expect(rows.map((row) => row.id)).not.toContain(legacyEntry.id);
  },
  { timeout: 30_000 }
);

testIfDb("grep-guard: search and listing surfaces carry the visibility predicate", async () => {
  const searchSource = await Bun.file(
    new URL("../../../core/services/search/searchIndexService.ts", import.meta.url).pathname
  ).text();
  expect(searchSource).toContain('eq(contentEntries.visibility, "public")');

  const listingSource = await Bun.file(
    new URL("../../../core/services/content/listingSources.ts", import.meta.url).pathname
  ).text();
  expect(listingSource).toContain('row.visibility === "public"');
});
