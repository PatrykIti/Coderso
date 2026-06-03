import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, media, pages, users } from "../../../core/db/schema";
import {
  getAnalyticsOverview,
  getTopContent,
  serializeTopContentCsv,
} from "../../../core/services/analytics/analyticsService";

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

const ids: {
  pageId?: string;
  oldPageId?: string;
  entryId?: string;
  mediaId?: string;
  userId?: string;
  typeId?: string;
} = {};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

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

  const [oldPage] = await db
    .insert(pages)
    .values({
      title: "Analytics Old Page",
      slug: `analytics-old-${randomUUID()}`,
      currentData: { schemaVersion: 1, blocks: [] },
      status: "published",
      updatedAt: daysAgo(45),
    })
    .returning();
  ids.oldPageId = oldPage?.id;

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
  if (ids.oldPageId) await db.delete(pages).where(eq(pages.id, ids.oldPageId));
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
  const items = await getTopContent({ limit: 1, rangeDays: 30 });
  expect(items.length).toBeLessThanOrEqual(1);
});

testIfDb("getTopContent applies the selected range", async () => {
  const items = await getTopContent({ limit: 50, rangeDays: 30, type: "page" });
  expect(items.some((item) => item.id === ids.pageId)).toBe(true);
  expect(items.some((item) => item.id === ids.oldPageId)).toBe(false);
});

test("serializeTopContentCsv escapes cells and guards formulas", () => {
  const csv = serializeTopContentCsv([
    {
      id: "item-1",
      type: "page",
      title: '=HYPERLINK("https://example.com")',
      slug: "/pricing,plans",
      updatedAt: "2026-06-01T00:00:00.000Z",
      score: 100,
    },
  ]);

  expect(csv).toContain("type,title,slug,updatedAt,score");
  expect(csv).toContain('page,"\'=HYPERLINK(""https://example.com"")","/pricing,plans"');
});
