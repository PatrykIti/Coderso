import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { pages } from "../../../core/db/schema";
import { searchAll } from "../../../core/services/search/searchService";

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

const cleanupSlugs: string[] = [];

afterAll(async () => {
  if (!hasDb || cleanupSlugs.length === 0) return;
  await db.delete(pages).where(inArray(pages.slug, cleanupSlugs));
});

testIfDb("searchAll applies dateRange to page updatedAt", async () => {
  const token = `dateproof-${randomUUID().slice(0, 8)}`;
  const recentSlug = `${token}-recent`;
  const oldSlug = `${token}-old`;
  cleanupSlugs.push(recentSlug, oldSlug);

  await db.insert(pages).values([
    {
      slug: recentSlug,
      title: `Dateproof ${token} recent`,
      status: "published",
      currentData: {},
      updatedAt: new Date(),
    },
    {
      slug: oldSlug,
      title: `Dateproof ${token} old`,
      status: "published",
      currentData: {},
      updatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
  ]);

  const recentResults = await searchAll(token, {
    limit: 10,
    dateRange: "last-7-days",
  });
  expect(recentResults.map((item) => item.slug)).toContain(recentSlug);
  expect(recentResults.map((item) => item.slug)).not.toContain(oldSlug);

  const allTimeResults = await searchAll(token, {
    limit: 10,
    dateRange: "all-time",
  });
  expect(allTimeResults.map((item) => item.slug)).toEqual(
    expect.arrayContaining([recentSlug, oldSlug])
  );
});
