import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, media, pages, users } from "../../../core/db/schema";
import { getAnalyticsOverview, getTopContent } from "../../../core/services/analytics/analyticsService";

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

const ids: { pageId?: string; entryId?: string; mediaId?: string; userId?: string; typeId?: string } = {};

beforeAll(async () => {
  if (!hasDb) return;
  const email = `analytics-${randomUUID()}@example.com`;
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  ids.userId = user?.id;

  const [page] = await db
    .insert(pages)
    .values({
      title: "Analytics Page",
      slug: `analytics-${randomUUID()}`,
      currentData: { schemaVersion: 1, blocks: [] },
      status: "published",
    })
    .returning();
  ids.pageId = page?.id;

  const [type] = await db
    .insert(contentTypes)
    .values({
      name: `Analytics Type ${randomUUID()}`,
      slug: `analytics-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    })
    .returning();
  ids.typeId = type?.id;

  const [entry] = await db
    .insert(contentEntries)
    .values({
      title: "Analytics Entry",
      slug: `entry-${randomUUID()}`,
      typeId: type?.id ?? sql`(select id from content_types limit 1)`,
      data: { title: "Analytics Entry" },
    })
    .returning();
  ids.entryId = entry?.id;

  const [mediaRow] = await db
    .insert(media)
    .values({
      key: `file-${randomUUID()}.jpg`,
      url: "https://example.com/file.jpg",
      type: "image",
      mimeType: "image/jpeg",
      size: 123,
    })
    .returning();
  ids.mediaId = mediaRow?.id;
});

afterAll(async () => {
  if (!hasDb) return;
  if (ids.pageId) await db.delete(pages).where(eq(pages.id, ids.pageId));
  if (ids.entryId) await db.delete(contentEntries).where(eq(contentEntries.id, ids.entryId));
  if (ids.typeId) await db.delete(contentTypes).where(eq(contentTypes.id, ids.typeId));
  if (ids.mediaId) await db.delete(media).where(eq(media.id, ids.mediaId));
  if (ids.userId) await db.delete(users).where(eq(users.id, ids.userId));
});

testIfDb("getAnalyticsOverview returns totals and trend", async () => {
  const overview = await getAnalyticsOverview(7);
  expect(overview.totals.pages).toBeGreaterThanOrEqual(1);
  expect(overview.trend.length).toBe(7);
});

testIfDb("getTopContent respects limit", async () => {
  const items = await getTopContent(1);
  expect(items.length).toBeLessThanOrEqual(1);
});
