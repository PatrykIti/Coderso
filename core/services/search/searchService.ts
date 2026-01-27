import { sql } from "drizzle-orm";

import { db } from "../../db/client";
import { contentEntries, media, pages } from "../../db/schema";

export type SearchItemType = "page" | "entry" | "media";

export type SearchItem = {
  id: string;
  title: string;
  slug?: string | null;
  type: SearchItemType;
  updatedAt: string;
};

export type SearchOptions = {
  limit?: number;
};

export function normalizeSearchQuery(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export function resolveSearchLimit(input?: number, fallback = 20) {
  if (!input || Number.isNaN(input)) return fallback;
  return Math.min(Math.max(Math.floor(input), 1), 50);
}

function toIso(value: Date | string | null) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}

export async function searchAll(query: string, options: SearchOptions = {}) {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length < 2) return [] as SearchItem[];

  const limit = resolveSearchLimit(options.limit);
  const perType = Math.max(1, Math.ceil(limit / 3));

  const pagesRows = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(
      sql`to_tsvector('simple', ${pages.title} || ' ' || ${pages.slug}) @@ plainto_tsquery('simple', ${normalized})`
    )
    .limit(perType);

  const entryRows = await db
    .select({
      id: contentEntries.id,
      title: contentEntries.title,
      slug: contentEntries.slug,
      updatedAt: contentEntries.updatedAt,
    })
    .from(contentEntries)
    .where(
      sql`to_tsvector('simple', ${contentEntries.title} || ' ' || ${contentEntries.slug}) @@ plainto_tsquery('simple', ${normalized})`
    )
    .limit(perType);

  const mediaRows = await db
    .select({
      id: media.id,
      title: sql<string>`coalesce(${media.title}, ${media.key})`.as("title"),
      updatedAt: media.createdAt,
    })
    .from(media)
    .where(
      sql`to_tsvector('simple', coalesce(${media.title}, '') || ' ' || coalesce(${media.alt}, '') || ' ' || coalesce(${media.caption}, '')) @@ plainto_tsquery('simple', ${normalized})`
    )
    .limit(perType);

  const results: SearchItem[] = [
    ...pagesRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      type: "page" as const,
      updatedAt: toIso(row.updatedAt),
    })),
    ...entryRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      type: "entry" as const,
      updatedAt: toIso(row.updatedAt),
    })),
    ...mediaRows.map((row) => ({
      id: row.id,
      title: row.title,
      type: "media" as const,
      updatedAt: toIso(row.updatedAt),
    })),
  ];

  results.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return results.slice(0, limit);
}
