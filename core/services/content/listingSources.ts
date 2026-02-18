import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { contentTaxonomies, contentTerms } from "../../db/schema";
import { listUsers } from "../admin/usersService";
import { listEntries } from "./entryService";
import { getContentTypeBySlug } from "./typeService";
import type { ListingSource, ListingSourceConfig, ListingSort } from "./queryBuilderService";

export type ListingSourceRow = Record<string, unknown>;

export type ListingSourceDefinition = {
  id: ListingSource;
  fieldAllowlist: readonly string[];
  fieldPrefixAllowlist: readonly string[];
  defaultFields: readonly string[];
  defaultSort: readonly ListingSort[];
  fetchRows: (config: ListingSourceConfig) => Promise<ListingSourceRow[]>;
};

const POSTS_TYPE_SLUGS = ["post", "posts"] as const;

const entryFieldAllowlist = [
  "id",
  "typeId",
  "title",
  "slug",
  "status",
  "tags",
  "publishedAt",
  "scheduledAt",
  "createdAt",
  "updatedAt",
  "author.id",
  "author.name",
  "author.email",
] as const;

const fetchEntriesRows = async (config: ListingSourceConfig) => {
  const typeId = config.contentTypeId?.trim();
  if (!typeId) return [];

  const rows = await listEntries(typeId);
  const includeDrafts = config.includeDrafts === true;
  const filtered = includeDrafts
    ? rows
    : rows.filter((row) => row.status === "published" && Boolean(row.publishedAt));

  return filtered.map((row) => ({
    id: row.id,
    typeId: row.typeId,
    title: row.title,
    slug: row.slug,
    status: row.status,
    tags: row.tags,
    data: row.data,
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.author,
  }));
};

const resolvePostsTypeId = async () => {
  for (const slug of POSTS_TYPE_SLUGS) {
    const postType = await getContentTypeBySlug(slug);
    if (postType) return postType.id;
  }
  return undefined;
};

const fetchPostsRows = async (config: ListingSourceConfig) => {
  const typeId = await resolvePostsTypeId();
  if (!typeId) return [];
  return fetchEntriesRows({
    contentTypeId: typeId,
    includeDrafts: config.includeDrafts,
  });
};

const fetchUsersRows = async () => {
  const rows = await listUsers();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status,
    roleIds: row.roleIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt,
  }));
};

const fetchTaxonomiesRows = async (config: ListingSourceConfig) => {
  const taxonomyId = config.taxonomyId?.trim();

  const rows = await db
    .select({
      id: contentTaxonomies.id,
      typeId: contentTaxonomies.typeId,
      name: contentTaxonomies.name,
      slug: contentTaxonomies.slug,
      kind: contentTaxonomies.kind,
      createdAt: contentTaxonomies.createdAt,
      updatedAt: contentTaxonomies.updatedAt,
      termsCount: sql<number>`count(${contentTerms.id})`
        .mapWith(Number)
        .as("termsCount"),
    })
    .from(contentTaxonomies)
    .leftJoin(contentTerms, eq(contentTerms.taxonomyId, contentTaxonomies.id))
    .where(taxonomyId ? and(eq(contentTaxonomies.id, taxonomyId)) : undefined)
    .groupBy(
      contentTaxonomies.id,
      contentTaxonomies.typeId,
      contentTaxonomies.name,
      contentTaxonomies.slug,
      contentTaxonomies.kind,
      contentTaxonomies.createdAt,
      contentTaxonomies.updatedAt
    )
    .orderBy(desc(contentTaxonomies.updatedAt), asc(contentTaxonomies.name));

  return rows.map((row) => ({
    id: row.id,
    typeId: row.typeId,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    termsCount: row.termsCount,
  }));
};

export const LISTING_SOURCE_DEFINITIONS: Record<ListingSource, ListingSourceDefinition> = {
  entries: {
    id: "entries",
    fieldAllowlist: entryFieldAllowlist,
    fieldPrefixAllowlist: ["data."],
    defaultFields: ["id", "title", "slug", "status", "updatedAt"],
    defaultSort: [
      { field: "updatedAt", dir: "desc" },
      { field: "id", dir: "asc" },
    ],
    fetchRows: fetchEntriesRows,
  },
  posts: {
    id: "posts",
    fieldAllowlist: entryFieldAllowlist,
    fieldPrefixAllowlist: ["data."],
    defaultFields: ["id", "title", "slug", "status", "updatedAt"],
    defaultSort: [
      { field: "updatedAt", dir: "desc" },
      { field: "id", dir: "asc" },
    ],
    fetchRows: fetchPostsRows,
  },
  users: {
    id: "users",
    fieldAllowlist: [
      "id",
      "name",
      "email",
      "status",
      "roleIds",
      "createdAt",
      "updatedAt",
      "lastLoginAt",
    ],
    fieldPrefixAllowlist: [],
    defaultFields: ["id", "name", "email", "status", "updatedAt"],
    defaultSort: [
      { field: "updatedAt", dir: "desc" },
      { field: "id", dir: "asc" },
    ],
    fetchRows: fetchUsersRows,
  },
  taxonomies: {
    id: "taxonomies",
    fieldAllowlist: [
      "id",
      "typeId",
      "name",
      "slug",
      "kind",
      "createdAt",
      "updatedAt",
      "termsCount",
    ],
    fieldPrefixAllowlist: [],
    defaultFields: ["id", "name", "slug", "kind", "updatedAt"],
    defaultSort: [
      { field: "updatedAt", dir: "desc" },
      { field: "id", dir: "asc" },
    ],
    fetchRows: fetchTaxonomiesRows,
  },
};

export function getListingSourceDefinition(source: ListingSource): ListingSourceDefinition {
  return LISTING_SOURCE_DEFINITIONS[source];
}

export function isListingFieldAllowed(
  sourceDefinition: ListingSourceDefinition,
  field: string
) {
  if (sourceDefinition.fieldAllowlist.includes(field)) {
    return true;
  }
  return sourceDefinition.fieldPrefixAllowlist.some((prefix) => field.startsWith(prefix));
}

export async function fetchListingSourceRows(
  source: ListingSource,
  config: ListingSourceConfig
) {
  const definition = getListingSourceDefinition(source);
  return definition.fetchRows(config);
}
