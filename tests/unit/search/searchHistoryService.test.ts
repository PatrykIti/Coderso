import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { searchHistory, users } from "../../../core/db/schema";
import {
  listRecentSearches,
  recordSearch,
} from "../../../core/services/search/searchHistoryService";

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

let userId: string | null = null;
const cleanupHistoryIds: string[] = [];

async function ensureUser() {
  if (userId) return userId;
  const [row] = await db
    .insert(users)
    .values({
      email: `search-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Search Tester",
      status: "active",
    })
    .returning();
  userId = row?.id ?? null;
  return userId as string;
}

afterAll(async () => {
  if (!hasDb) return;
  if (cleanupHistoryIds.length > 0) {
    await db
      .delete(searchHistory)
      .where(inArray(searchHistory.id, cleanupHistoryIds));
  }
  if (userId) {
    await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
    await db.delete(users).where(inArray(users.id, [userId]));
  }
});

testIfDb("recordSearch stores and listRecentSearches returns unique items", async () => {
  const uid = await ensureUser();

  const first = await recordSearch(uid, "hello world");
  if (first?.id) cleanupHistoryIds.push(first.id);

  const duplicate = await recordSearch(uid, "hello world");
  if (duplicate?.id) cleanupHistoryIds.push(duplicate.id);

  for (let i = 0; i < 8; i += 1) {
    const entry = await recordSearch(uid, `query-${i}`);
    if (entry?.id) cleanupHistoryIds.push(entry.id);
  }

  const latest = await recordSearch(uid, "hello world");
  if (latest?.id) cleanupHistoryIds.push(latest.id);

  const recent = await listRecentSearches(uid, 10);
  expect(recent.length).toBeLessThanOrEqual(10);
  expect(recent.some((item) => item.query === "hello world")).toBe(true);
  expect(new Set(recent.map((item) => item.query)).size).toBe(recent.length);
});
