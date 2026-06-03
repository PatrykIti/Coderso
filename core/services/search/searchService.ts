import { and, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";

import { hashEmail, isLikelyEmail, normalizeEmail, resolveEmailValue } from "../security/piiEmail";
import {
  normalizeSearchDateRange,
  resolveSearchDateRangeSince,
  type SearchDateRange,
  type SearchResponseMeta,
} from "./searchContract";

export {
  DEFAULT_SEARCH_DATE_RANGE,
  isSearchDateRange,
  normalizeSearchDateRange,
  resolveSearchDateRangeSince,
  searchDateRanges,
  type SearchDateRange,
  type SearchResponseMeta,
} from "./searchContract";

export type SearchItemType = "page" | "entry" | "media" | "user";

export type SearchItem = {
  id: string;
  title: string;
  slug?: string | null;
  type: SearchItemType;
  updatedAt: string;
  categoryId?: string;
  categoryLabel?: string;
  entryTypeSlug?: string;
};

export type SearchOptions = {
  limit?: number;
  dateRange?: SearchDateRange;
};

export type SearchCategory = {
  id: string;
  label: string;
  count: number;
};

export function normalizeSearchQuery(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export function buildPrefixQuery(input: string) {
  const normalized = input.replace(/[^\p{L}\p{N}_-]+/gu, " ").trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((term) => `${term}:*`).join(" & ");
}

export function resolveSearchLimit(input?: number, fallback = 20) {
  if (!input || Number.isNaN(input)) return fallback;
  return Math.min(Math.max(Math.floor(input), 1), 50);
}

function toIso(value: Date | string | null) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}

function withDateFilter(searchCondition: SQL | undefined, dateCondition: SQL | undefined) {
  if (searchCondition && dateCondition) return and(searchCondition, dateCondition);
  return searchCondition ?? dateCondition;
}

export async function searchAll(query: string, options: SearchOptions = {}) {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length < 2) return [] as SearchItem[];
  const tsQuery = buildPrefixQuery(normalized);
  if (!tsQuery) return [] as SearchItem[];
  const likeQuery = `%${normalized}%`;
  const [{ db }, { contentEntries, contentTypes, media, pages, users }] = await Promise.all([
    import("../../db/client"),
    import("../../db/schema"),
  ]);

  const emailQuery = isLikelyEmail(normalized) ? normalizeEmail(normalized) : null;
  const emailHash = emailQuery ? hashEmail(emailQuery) : null;

  const limit = resolveSearchLimit(options.limit);
  const perType = Math.max(1, Math.ceil(limit / 4));
  const dateRange = normalizeSearchDateRange(options.dateRange);
  const since = resolveSearchDateRangeSince(dateRange);

  const pagesRows = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(
      withDateFilter(
        or(
          sql`to_tsvector('simple', ${pages.title} || ' ' || ${pages.slug}) @@ to_tsquery('simple', ${tsQuery})`,
          ilike(pages.title, likeQuery),
          ilike(pages.slug, likeQuery)
        ),
        since ? gte(pages.updatedAt, since) : undefined
      )
    )
    .limit(perType);

  const entryRows = await db
    .select({
      id: contentEntries.id,
      title: sql<string>`coalesce(${contentEntries.title}, ${contentEntries.data} ->> 'title')`.as(
        "title"
      ),
      slug: contentEntries.slug,
      updatedAt: contentEntries.updatedAt,
      typeSlug: contentTypes.slug,
      typeName: contentTypes.name,
    })
    .from(contentEntries)
    .innerJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id))
    .where(
      withDateFilter(
        or(
          sql`to_tsvector('simple', coalesce(${contentEntries.title}, '') || ' ' || coalesce(${contentEntries.data} ->> 'title', '') || ' ' || ${contentEntries.slug} || ' ' || coalesce(${contentEntries.tags}::text, '')) @@ to_tsquery('simple', ${tsQuery})`,
          ilike(contentEntries.title, likeQuery),
          ilike(sql`${contentEntries.data} ->> 'title'`, likeQuery),
          ilike(contentEntries.slug, likeQuery),
          ilike(sql`${contentEntries.tags}::text`, likeQuery)
        ),
        since ? gte(contentEntries.updatedAt, since) : undefined
      )
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
      withDateFilter(
        or(
          sql`to_tsvector('simple', coalesce(${media.title}, '') || ' ' || coalesce(${media.alt}, '') || ' ' || coalesce(${media.caption}, '') || ' ' || ${media.key}) @@ to_tsquery('simple', ${tsQuery})`,
          ilike(media.title, likeQuery),
          ilike(media.alt, likeQuery),
          ilike(media.caption, likeQuery),
          ilike(media.key, likeQuery)
        ),
        since ? gte(media.createdAt, since) : undefined
      )
    )
    .limit(perType);

  const userConditions = [
    sql`to_tsvector('simple', coalesce(${users.name}, '')) @@ to_tsquery('simple', ${tsQuery})`,
    ilike(users.name, likeQuery),
  ];
  if (emailHash) {
    userConditions.push(eq(users.emailHash, emailHash));
    if (emailQuery) {
      userConditions.push(eq(users.email, emailQuery));
    }
  }

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailEncrypted: users.emailEncrypted,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(withDateFilter(or(...userConditions), since ? gte(users.updatedAt, since) : undefined))
    .limit(perType);

  const results: SearchItem[] = [
    ...pagesRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      type: "page" as const,
      updatedAt: toIso(row.updatedAt),
      categoryId: "page",
      categoryLabel: "Pages",
    })),
    ...entryRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      type: "entry" as const,
      updatedAt: toIso(row.updatedAt),
      categoryId: row.typeSlug ? `entry:${row.typeSlug}` : "entry",
      categoryLabel: row.typeName ?? "Entries",
      entryTypeSlug: row.typeSlug ?? undefined,
    })),
    ...mediaRows.map((row) => ({
      id: row.id,
      title: row.title,
      type: "media" as const,
      updatedAt: toIso(row.updatedAt),
      categoryId: "media",
      categoryLabel: "Media",
    })),
    ...userRows.map((row) => {
      const resolvedEmail = resolveEmailValue({
        emailEncrypted: row.emailEncrypted,
        email: row.email,
      });
      return {
        id: row.id,
        title: row.name ?? resolvedEmail ?? row.email,
        slug: resolvedEmail ?? row.email,
        type: "user" as const,
        updatedAt: toIso(row.updatedAt),
        categoryId: "user",
        categoryLabel: "Users",
      };
    }),
  ];

  results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return results.slice(0, limit);
}

export async function hasSearchableContent() {
  const [{ db }, { contentEntries, media, pages, users }] = await Promise.all([
    import("../../db/client"),
    import("../../db/schema"),
  ]);

  const [pageRows, entryRows, mediaRows, userRows] = await Promise.all([
    db.select({ id: pages.id }).from(pages).limit(1),
    db.select({ id: contentEntries.id }).from(contentEntries).limit(1),
    db.select({ id: media.id }).from(media).limit(1),
    db.select({ id: users.id }).from(users).limit(1),
  ]);

  return pageRows.length > 0 || entryRows.length > 0 || mediaRows.length > 0 || userRows.length > 0;
}

export async function buildSearchResponseMeta(
  query: string,
  options: SearchOptions & { items?: SearchItem[] } = {}
): Promise<SearchResponseMeta> {
  const dateRange = normalizeSearchDateRange(options.dateRange);
  const normalized = normalizeSearchQuery(query);
  const searchableContent = await hasSearchableContent();
  const currentItems = options.items;
  const hasRunnableQuery = normalized.length >= 2 && Boolean(buildPrefixQuery(normalized));
  const returnedItems =
    currentItems?.length ??
    (hasRunnableQuery ? (await searchAll(normalized, { limit: 1, dateRange })).length : 0);

  if (!hasRunnableQuery) {
    return {
      dateRange,
      hasSearchableContent: searchableContent,
      hasQueryMatches: false,
      hasMatchesOutsideDateRange: false,
      returnedItems,
    };
  }

  if (returnedItems > 0) {
    return {
      dateRange,
      hasSearchableContent: searchableContent,
      hasQueryMatches: true,
      hasMatchesOutsideDateRange: false,
      returnedItems,
    };
  }

  const allTimeItems =
    dateRange === "all-time"
      ? []
      : await searchAll(normalized, {
          limit: 1,
          dateRange: "all-time",
        });
  const hasQueryMatches = dateRange === "all-time" ? false : allTimeItems.length > 0;

  return {
    dateRange,
    hasSearchableContent: searchableContent,
    hasQueryMatches,
    hasMatchesOutsideDateRange: dateRange !== "all-time" && hasQueryMatches,
    returnedItems,
  };
}

type CategoryOverride = { label?: string; hidden?: boolean };
type CategoryOverrides = Record<string, CategoryOverride>;

async function getCategoryOverrides(): Promise<CategoryOverrides> {
  try {
    const { getSetting } = await import("../settings/settingsService");
    const value = await getSetting("search.categoryOverrides");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as CategoryOverrides;
  } catch {
    return {};
  }
}

export async function buildSearchCategories(items: SearchItem[]): Promise<SearchCategory[]> {
  const map = new Map<string, SearchCategory>();
  for (const item of items) {
    if (!item.categoryId) continue;
    const existing = map.get(item.categoryId);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(item.categoryId, {
        id: item.categoryId,
        label: item.categoryLabel ?? item.categoryId,
        count: 1,
      });
    }
  }

  const overrides = await getCategoryOverrides();

  const categories = Array.from(map.values()).flatMap((category) => {
    const override = overrides[category.id];
    if (override?.hidden) return [];
    return [
      {
        ...category,
        label: override?.label ?? category.label,
      },
    ];
  });

  categories.sort((a, b) => a.label.localeCompare(b.label));
  return categories;
}
