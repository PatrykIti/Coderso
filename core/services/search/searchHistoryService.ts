import { desc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { searchHistory } from "../../db/schema";
import { normalizeSearchQuery } from "./searchService";

export type SearchHistoryItem = {
  query: string;
  createdAt: Date;
};

const DEFAULT_LIMIT = 10;
const FETCH_WINDOW = 50;

async function pruneHistory(userId: string, limit = DEFAULT_LIMIT) {
  const rows = await db
    .select({ id: searchHistory.id })
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.createdAt))
    .offset(limit);

  if (rows.length === 0) return;

  await db
    .delete(searchHistory)
    .where(inArray(searchHistory.id, rows.map((row) => row.id)));
}

export async function recordSearch(
  userId: string,
  query: string,
  filters?: Record<string, unknown>
) {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length < 2) return null;

  const [latest] = await db
    .select({ query: searchHistory.query })
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.createdAt))
    .limit(1);

  if (latest?.query === normalized) {
    return null;
  }

  const [row] = await db
    .insert(searchHistory)
    .values({
      userId,
      query: normalized,
      filters: filters ?? null,
    })
    .returning();

  await pruneHistory(userId, DEFAULT_LIMIT);

  return row ?? null;
}

export async function listRecentSearches(userId: string, limit = DEFAULT_LIMIT) {
  const rows = await db
    .select({ query: searchHistory.query, createdAt: searchHistory.createdAt })
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.createdAt))
    .limit(FETCH_WINDOW);

  const seen = new Set<string>();
  const items: SearchHistoryItem[] = [];
  for (const row of rows) {
    if (seen.has(row.query)) continue;
    seen.add(row.query);
    items.push({ query: row.query, createdAt: row.createdAt });
    if (items.length >= limit) break;
  }

  return items;
}
