import { and, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { contentEntries, contentTypes, pages } from "../../db/schema";
import type { ContentRouteSetting } from "../settings/settingsService";
import { buildPrefixQuery, normalizeSearchQuery, resolveSearchLimit } from "./searchService";

export type PublicSearchSource = "pages" | "entries" | "posts";

export type PublicSearchItem = {
  id: string;
  source: PublicSearchSource;
  title: string;
  slug: string;
  href: string;
  updatedAt: string;
  typeSlug?: string;
};

export type PublicSearchResult = {
  query: string;
  sources: PublicSearchSource[];
  items: PublicSearchItem[];
};

type PublicPageSearchRow = {
  id: string;
  title: string;
  slug: string;
  updatedAt: Date | string | null;
};

type PublicContentSearchRow = {
  id: string;
  title: string;
  slug: string;
  updatedAt: Date | string | null;
  typeSlug: string;
};

const POST_TYPE_SLUGS = ["post", "posts"] as const;

const publicSources: PublicSearchSource[] = ["pages", "entries", "posts"];

const resolveIso = (value: Date | string | null) => {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
};

const normalizeSources = (input: string | undefined): PublicSearchSource[] => {
  if (!input) return [...publicSources];

  const tokens = input
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return [...publicSources];

  const resolved = Array.from(
    new Set(
      tokens.filter(
        (token): token is PublicSearchSource =>
          token === "pages" || token === "entries" || token === "posts"
      )
    )
  );

  return resolved.length > 0 ? resolved : [...publicSources];
};

const resolveEntryHref = (
  typeSlug: string,
  slug: string,
  id: string,
  routes: ContentRouteSetting[]
) => {
  const route = routes.find((entry) => entry.type === typeSlug && entry.enabled);
  const pattern = route?.detailPath ?? `/${typeSlug}/:slug`;
  if (pattern.includes(":slug")) {
    return pattern.replace(":slug", encodeURIComponent(slug));
  }
  if (pattern.includes(":id")) {
    return pattern.replace(":id", encodeURIComponent(id));
  }
  return pattern;
};

const resolvePageHref = (slug: string) => {
  const normalized = slug.trim().replace(/^\/+/, "");
  if (!normalized) return "/";
  return `/${normalized}`;
};

export type SearchPublicIndexOptions = {
  limit?: number;
  sources?: string;
  contentRoutes?: ContentRouteSetting[];
};

export type SearchPublicIndexDeps = {
  listPages: (input: {
    tsQuery: string;
    likeQuery: string;
    limit: number;
  }) => Promise<PublicPageSearchRow[]>;
  listContent: (input: {
    tsQuery: string;
    likeQuery: string;
    limit: number;
    includeEntries: boolean;
    includePosts: boolean;
  }) => Promise<PublicContentSearchRow[]>;
};

const defaultDeps: SearchPublicIndexDeps = {
  listPages: ({ tsQuery, likeQuery, limit }) =>
    db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(
        and(
          eq(pages.status, "published"),
          or(
            sql`to_tsvector('simple', ${pages.title} || ' ' || ${pages.slug}) @@ to_tsquery('simple', ${tsQuery})`,
            ilike(pages.title, likeQuery),
            ilike(pages.slug, likeQuery)
          )
        )
      )
      .limit(limit),
  listContent: ({ tsQuery, likeQuery, limit, includeEntries, includePosts }) =>
    db
      .select({
        id: contentEntries.id,
        title: sql<string>`coalesce(${contentEntries.title}, ${contentEntries.data} ->> 'title')`.as(
          "title"
        ),
        slug: contentEntries.slug,
        updatedAt: contentEntries.updatedAt,
        typeSlug: contentTypes.slug,
      })
      .from(contentEntries)
      .innerJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id))
      .where(
        and(
          eq(contentEntries.status, "published"),
          includeEntries && !includePosts
            ? notInArray(contentTypes.slug, [...POST_TYPE_SLUGS])
            : includePosts && !includeEntries
              ? inArray(contentTypes.slug, [...POST_TYPE_SLUGS])
              : undefined,
          or(
            sql`to_tsvector('simple', coalesce(${contentEntries.title}, '') || ' ' || ${contentEntries.slug} || ' ' || coalesce(${contentEntries.data} ->> 'title', '')) @@ to_tsquery('simple', ${tsQuery})`,
            ilike(contentEntries.title, likeQuery),
            ilike(contentEntries.slug, likeQuery),
            ilike(sql`${contentEntries.data} ->> 'title'`, likeQuery)
          )
        )
      )
      .limit(limit),
};

export function parsePublicSearchSources(input: string | undefined) {
  return normalizeSources(input);
}

export async function searchPublicIndex(
  query: string,
  options: SearchPublicIndexOptions = {},
  deps: SearchPublicIndexDeps = defaultDeps
): Promise<PublicSearchResult> {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedSources = normalizeSources(options.sources);
  const limit = resolveSearchLimit(options.limit, 20);

  if (normalizedQuery.length < 2) {
    return {
      query: normalizedQuery,
      sources: normalizedSources,
      items: [],
    };
  }

  const tsQuery = buildPrefixQuery(normalizedQuery);
  if (!tsQuery) {
    return {
      query: normalizedQuery,
      sources: normalizedSources,
      items: [],
    };
  }

  const perSource = Math.max(1, Math.ceil(limit / Math.max(normalizedSources.length, 1)));
  const likeQuery = `%${normalizedQuery}%`;
  const routes = options.contentRoutes ?? [];
  const includePages = normalizedSources.includes("pages");
  const includeEntries = normalizedSources.includes("entries");
  const includePosts = normalizedSources.includes("posts");

  const pageRows = includePages
    ? await deps.listPages({
        tsQuery,
        likeQuery,
        limit: perSource,
      })
    : [];

  const contentRows = includeEntries || includePosts
    ? await deps.listContent({
        tsQuery,
        likeQuery,
        limit,
        includeEntries,
        includePosts,
      })
    : [];

  const entryItems = contentRows
    .map((row): PublicSearchItem => {
      const isPost = POST_TYPE_SLUGS.includes(row.typeSlug as (typeof POST_TYPE_SLUGS)[number]);
      return {
        id: row.id,
        source: isPost ? "posts" : "entries",
        title: row.title,
        slug: row.slug,
        href: resolveEntryHref(row.typeSlug, row.slug, row.id, routes),
        updatedAt: resolveIso(row.updatedAt),
        typeSlug: row.typeSlug,
      };
    })
    .filter((item) => normalizedSources.includes(item.source));

  const pageItems: PublicSearchItem[] = pageRows.map((row) => ({
    id: row.id,
    source: "pages",
    title: row.title,
    slug: row.slug,
    href: resolvePageHref(row.slug),
    updatedAt: resolveIso(row.updatedAt),
  }));

  const items = [...pageItems, ...entryItems]
    .sort((left, right) => {
      const delta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      if (delta !== 0) return delta;
      return left.title.localeCompare(right.title, "en", { sensitivity: "base" });
    })
    .slice(0, limit);

  return {
    query: normalizedQuery,
    sources: normalizedSources,
    items,
  };
}
