import { afterAll, afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { listingQueries } from "../../../core/db/schema";
import {
  createListingQuery,
  deleteListingQuery,
  listListingQueries,
  updateListingQuery,
} from "../../../core/services/content/listingQueriesService";
import {
  getSetting,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import {
  buildSiteCacheKey,
  clearSiteCache,
  configureSiteCache,
  getSiteCacheEntry,
  setSiteCacheEntry,
} from "../../../core/site/cache/siteCache";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const createdIds = new Set<string>();
let originalContentRoutes: ContentRouteSetting[] | null = null;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function ensureListingQueriesTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "listing_queries" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "description" text,
      "query" jsonb NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "listing_queries_name_idx" ON "listing_queries" ("name")`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "listing_queries_updated_at_idx" ON "listing_queries" ("updated_at")`
  );
}

afterAll(async () => {
  clearSiteCache();
  if (originalContentRoutes) {
    await setSetting("site.contentRoutes", originalContentRoutes);
    originalContentRoutes = null;
  }
  if (!hasDb || createdIds.size === 0) return;
  for (const id of createdIds) {
    await db.delete(listingQueries).where(eq(listingQueries.id, id));
  }
});

afterEach(async () => {
  clearSiteCache();
  if (originalContentRoutes) {
    await setSetting("site.contentRoutes", originalContentRoutes);
    originalContentRoutes = null;
  }
});

const enableLinkedDetailRouteCache = async () => {
  originalContentRoutes =
    originalContentRoutes ??
    ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ??
    [];
  await setSetting("site.contentRoutes", [
    {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
      detailPageId: "14d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    } satisfies ContentRouteSetting,
  ]);
  configureSiteCache(300);
  const key = buildSiteCacheKey("profile-1", "/products/example");
  setSiteCacheEntry(key, "<html>cached</html>", 300, 0);
  expect(getSiteCacheEntry(key, 1)).toBe("<html>cached</html>");
  return key;
};

testIfDb("listing query CRUD flow", async () => {
  await ensureListingQueriesTable();
  const suffix = randomUUID();

  const created = await createListingQuery({
    name: `Homepage query ${suffix}`,
    description: "Main homepage query",
    query: {
      source: "users",
      sourceConfig: {},
      filters: [{ field: "status", op: "eq", value: "active" }],
      sort: [{ field: "updatedAt", dir: "desc" }],
      pagination: { limit: 20, offset: 0 },
      fields: ["id", "name", "status"],
    },
  });
  createdIds.add(created.id);
  expect(created.name).toContain("Homepage query");
  expect(created.query.source).toBe("users");

  const listed = await listListingQueries();
  expect(listed.some((item) => item.id === created.id)).toBe(true);

  const updated = await updateListingQuery(created.id, {
    name: `Homepage query updated ${suffix}`,
    query: {
      source: "users",
      sourceConfig: {},
      filters: [],
      sort: [{ field: "updatedAt", dir: "desc" }],
      pagination: { limit: 10, offset: 0 },
      fields: ["id", "name"],
    },
  });

  expect(updated?.name).toContain("updated");
  expect(updated?.query.pagination.limit).toBe(10);

  const removed = await deleteListingQuery(created.id);
  expect(removed?.id).toBe(created.id);
  createdIds.delete(created.id);
});

testIfDb(
  "listing query owner seam invalidates linked detail-route cache on update and delete",
  async () => {
    await ensureListingQueriesTable();
    const cacheKey = await enableLinkedDetailRouteCache();
    const created = await createListingQuery({
      name: `Cached query ${randomUUID()}`,
      query: {
        source: "users",
        sourceConfig: {},
        filters: [],
        sort: [{ field: "updatedAt", dir: "desc" }],
        pagination: { limit: 10, offset: 0 },
        fields: ["id", "name"],
      },
    });
    createdIds.add(created.id);

    await updateListingQuery(created.id, {
      name: `${created.name} Updated`,
    });
    expect(getSiteCacheEntry(cacheKey, 1)).toBeNull();

    setSiteCacheEntry(cacheKey, "<html>cached</html>", 300, 0);
    expect(getSiteCacheEntry(cacheKey, 1)).toBe("<html>cached</html>");

    await deleteListingQuery(created.id);
    expect(getSiteCacheEntry(cacheKey, 1)).toBeNull();
    createdIds.delete(created.id);
  }
);
